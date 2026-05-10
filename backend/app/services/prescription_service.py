import base64
import json
import logging
import re
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from google.cloud.firestore import AsyncClient

from app.config import get_settings
from app.core.enums import MedicineCategory, MedicineFrequency, PrescriptionStatus
from app.core.exceptions import ConflictError, NotFoundError
from app.core.firebase import get_storage_bucket
from app.models.medicines import DoseTime, MedicineCreateRequest
from app.models.prescriptions import (
    ExtractedMedicine,
    PrescriptionCorrectionRequest,
    PrescriptionListResponse,
    PrescriptionMedicineImportRequest,
    PrescriptionMedicineImportResponse,
    PrescriptionOCRStatusResponse,
    PrescriptionResponse,
)
from app.services.openrouter_service import openrouter_vision_json

logger = logging.getLogger(__name__)

_FREQUENCY_PATTERNS: list[tuple[str, str]] = [
    (r"\b(once daily|od|1-0-0|daily)\b", "once_daily"),
    (r"\b(twice daily|bd|bid|1-0-1|1-1-0)\b", "twice_daily"),
    (r"\b(thrice daily|tds|tid|1-1-1)\b", "thrice_daily"),
    (r"\b(weekly|once a week|1\/week)\b", "weekly"),
    (r"\b(every\s+\d+\s*hours?|q\d+h|q\s*\d+\s*h)\b", "every_x_hours"),
    (r"\b(night|hs|bedtime)\b", "night"),
    (r"\b(morning|empty stomach)\b", "morning"),
    (r"\b(as needed|sos|prn)\b", "as_needed"),
]

_PRESCRIPTION_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "raw_text": {"type": "string"},
        "doctor_name": {"type": ["string", "null"]},
        "hospital_name": {"type": ["string", "null"]},
        "medicines": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "generic_name": {"type": ["string", "null"]},
                    "dosage": {"type": "string"},
                    "frequency": {
                        "type": "string",
                        "enum": [
                            "once_daily",
                            "twice_daily",
                            "thrice_daily",
                            "every_x_hours",
                            "as_needed",
                            "weekly",
                        ],
                    },
                    "every_x_hours": {"type": ["integer", "null"]},
                    "duration": {"type": ["string", "null"]},
                    "category": {
                        "type": "string",
                        "enum": [category.value for category in MedicineCategory],
                    },
                    "dose_times": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "time": {"type": "string"},
                                "dose_amount": {"type": "number"},
                                "dose_unit": {"type": "string"},
                            },
                            "required": ["time", "dose_amount", "dose_unit"],
                        },
                    },
                    "instructions": {"type": ["string", "null"]},
                    "confidence": {"type": ["number", "null"]},
                },
                "required": [
                    "name",
                    "generic_name",
                    "dosage",
                    "frequency",
                    "every_x_hours",
                    "duration",
                    "category",
                    "dose_times",
                    "instructions",
                    "confidence",
                ],
            },
        },
        "warnings": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["raw_text", "doctor_name", "hospital_name", "medicines", "warnings"],
}

_PRESCRIPTION_PROMPT = """
Extract medicines from this prescription for a patient medicine cabinet.
Return only JSON that matches the schema.

Rules:
- Do not invent medicines. If a medicine name is unreadable, omit that medicine and add a warning.
- Keep medicine strength in dosage, for example "500 mg" or "5 ml".
- dose_times are schedule doses, not drug strength. Use dose_amount 1 and dose_unit "tablet" for tablets/capsules unless the prescription says otherwise.
- Convert OD/daily/1-0-0 to once_daily, BD/BID/1-0-1 to twice_daily, TDS/TID/1-1-1 to thrice_daily, PRN/SOS to as_needed.
- Infer practical 24-hour dose times from the prescription: morning 08:00, afternoon 14:00, evening 20:00, bedtime 21:00.
- Use the closest category from the provided enum values.
- confidence is 0 to 1 for each medicine extraction.
- raw_text should be a concise transcription of the relevant prescription text.
"""


def _is_prescription_valid(prescribed_date: date) -> bool:
    return prescribed_date >= date.today() - timedelta(days=365)


def _doc_to_prescription_response(data: dict) -> PrescriptionResponse:
    prescribed_date = data["prescribed_date"]
    if isinstance(prescribed_date, str):
        prescribed_date = date.fromisoformat(prescribed_date)

    expires_at = data.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = date.fromisoformat(expires_at)

    parsed_at = data.get("parsed_at")
    uploaded_at = data["uploaded_at"]

    extracted_raw = data.get("extracted_medicines", [])
    extracted = [ExtractedMedicine(**m) for m in extracted_raw]

    return PrescriptionResponse(
        prescription_id=data["prescription_id"],
        uid=data["uid"],
        prescribed_date=prescribed_date,
        doctor_name=data.get("doctor_name"),
        hospital_name=data.get("hospital_name"),
        file_url=data["file_url"],
        status=PrescriptionStatus(data["status"]),
        ocr_job_id=data.get("ocr_job_id"),
        extracted_medicines=extracted,
        ocr_confidence_score=data.get("ocr_confidence_score"),
        raw_ocr_text=data.get("raw_ocr_text"),
        is_valid=data.get("is_valid", True),
        expires_at=expires_at,
        notes=data.get("notes"),
        uploaded_at=uploaded_at,
        parsed_at=parsed_at,
    )


async def upload_prescription(
    uid: str,
    file_bytes: bytes,
    content_type: str,
    prescribed_date: date,
    doctor_name: str | None,
    hospital_name: str | None,
    notes: str | None,
    db: AsyncClient,
) -> PrescriptionResponse:
    prescription_id = str(uuid4())
    job_id = str(uuid4())

    # Determine file extension from content_type
    ext_map = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf",
    }
    ext = ext_map.get(content_type, "bin")

    storage_path = f"prescriptions/{uid}/{prescription_id}/original.{ext}"
    bucket = get_storage_bucket()
    blob = bucket.blob(storage_path)
    blob.upload_from_string(file_bytes, content_type=content_type)
    blob.make_public()
    file_url = blob.public_url

    now = datetime.now(timezone.utc)
    is_valid = _is_prescription_valid(prescribed_date)
    expires_at = prescribed_date + timedelta(days=365)

    prescription_data: dict = {
        "prescription_id": prescription_id,
        "uid": uid,
        "prescribed_date": prescribed_date.isoformat(),
        "doctor_name": doctor_name,
        "hospital_name": hospital_name,
        "file_url": file_url,
        "status": PrescriptionStatus.UPLOADED.value,
        "ocr_job_id": job_id,
        "extracted_medicines": [],
        "ocr_confidence_score": None,
        "raw_ocr_text": None,
        "is_valid": is_valid,
        "expires_at": expires_at.isoformat(),
        "notes": notes,
        "uploaded_at": now,
        "parsed_at": None,
    }

    await (
        db.collection("users")
        .document(uid)
        .collection("prescriptions")
        .document(prescription_id)
        .set(prescription_data)
    )

    ocr_job_data: dict = {
        "job_id": job_id,
        "uid": uid,
        "type": "prescription",
        "engine": get_settings().openrouter_vision_model,
        "target_id": prescription_id,
        "status": "pending",
        "progress_pct": 0,
        "medicines_found": 0,
        "error_message": None,
        "created_at": now,
        "updated_at": now,
    }

    await (
        db.collection("users")
        .document(uid)
        .collection("ocr_jobs")
        .document(job_id)
        .set(ocr_job_data)
    )

    return _doc_to_prescription_response(prescription_data)


async def list_prescriptions(
    uid: str,
    is_valid: bool | None,
    limit: int,
    offset: int,
    db: AsyncClient,
) -> PrescriptionListResponse:
    prescriptions_ref = (
        db.collection("users")
        .document(uid)
        .collection("prescriptions")
    )
    query = prescriptions_ref.order_by("uploaded_at", direction="DESCENDING")
    all_docs = [doc async for doc in query.stream()]

    responses: list[PrescriptionResponse] = []
    for doc in all_docs:
        data = doc.to_dict()
        # Recompute is_valid from prescribed_date to keep it fresh
        prescribed_date_raw = data["prescribed_date"]
        if isinstance(prescribed_date_raw, str):
            prescribed_date_val = date.fromisoformat(prescribed_date_raw)
        else:
            prescribed_date_val = prescribed_date_raw
        data["is_valid"] = _is_prescription_valid(prescribed_date_val)
        responses.append(_doc_to_prescription_response(data))

    total = len(responses)
    valid_count = sum(1 for r in responses if r.is_valid)
    expired_count = total - valid_count

    if is_valid is not None:
        responses = [r for r in responses if r.is_valid == is_valid]

    page = responses[offset: offset + limit]

    return PrescriptionListResponse(
        prescriptions=page,
        total=total,
        valid_count=valid_count,
        expired_count=expired_count,
    )


async def get_prescription(
    uid: str,
    prescription_id: str,
    db: AsyncClient,
) -> PrescriptionResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("prescriptions")
        .document(prescription_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("Prescription")

    data = doc.to_dict()
    prescribed_date_raw = data["prescribed_date"]
    if isinstance(prescribed_date_raw, str):
        prescribed_date_val = date.fromisoformat(prescribed_date_raw)
    else:
        prescribed_date_val = prescribed_date_raw
    data["is_valid"] = _is_prescription_valid(prescribed_date_val)

    return _doc_to_prescription_response(data)


async def correct_prescription(
    uid: str,
    prescription_id: str,
    req: PrescriptionCorrectionRequest,
    db: AsyncClient,
) -> PrescriptionResponse:
    prescription_ref = (
        db.collection("users")
        .document(uid)
        .collection("prescriptions")
        .document(prescription_id)
    )
    doc = await prescription_ref.get()
    if not doc.exists:
        raise NotFoundError("Prescription")

    updates: dict = {"updated_at": datetime.now(timezone.utc)}

    if req.doctor_name is not None:
        updates["doctor_name"] = req.doctor_name
    if req.hospital_name is not None:
        updates["hospital_name"] = req.hospital_name
    if req.prescribed_date is not None:
        updates["prescribed_date"] = req.prescribed_date.isoformat()
        updates["is_valid"] = _is_prescription_valid(req.prescribed_date)
        updates["expires_at"] = (req.prescribed_date + timedelta(days=365)).isoformat()
    if req.extracted_medicines is not None:
        updates["extracted_medicines"] = [m.model_dump() for m in req.extracted_medicines]
    if req.notes is not None:
        updates["notes"] = req.notes

    await prescription_ref.update(updates)
    updated_doc = await prescription_ref.get()
    data = updated_doc.to_dict()

    prescribed_date_raw = data["prescribed_date"]
    if isinstance(prescribed_date_raw, str):
        prescribed_date_val = date.fromisoformat(prescribed_date_raw)
    else:
        prescribed_date_val = prescribed_date_raw
    data["is_valid"] = _is_prescription_valid(prescribed_date_val)

    return _doc_to_prescription_response(data)


async def delete_prescription(
    uid: str,
    prescription_id: str,
    db: AsyncClient,
) -> None:
    prescription_ref = (
        db.collection("users")
        .document(uid)
        .collection("prescriptions")
        .document(prescription_id)
    )
    doc = await prescription_ref.get()
    if not doc.exists:
        raise NotFoundError("Prescription")

    # Check for active medicines linked to this prescription
    medicines_ref = db.collection("users").document(uid).collection("medicines")
    query = (
        medicines_ref
        .where("prescription_id", "==", prescription_id)
        .where("is_active", "==", True)
    )
    linked_docs = [d async for d in query.stream()]
    if linked_docs:
        medicine_names = [
            d.to_dict().get("name", d.id) for d in linked_docs
        ]
        names_str = ", ".join(medicine_names)
        raise ConflictError(
            f"Cannot delete prescription: active medicines are linked to it: {names_str}"
        )

    await prescription_ref.delete()


async def get_ocr_status(
    uid: str,
    job_id: str,
    db: AsyncClient,
) -> PrescriptionOCRStatusResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("ocr_jobs")
        .document(job_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("OCR job")

    data = doc.to_dict()

    return PrescriptionOCRStatusResponse(
        job_id=job_id,
        prescription_id=data.get("target_id", ""),
        status=data.get("status", "pending"),
        progress_pct=data.get("progress_pct", 0),
        medicines_found=data.get("medicines_found", 0),
        engine=data.get("engine"),
        error_message=data.get("error_message"),
    )


def _parse_json_response(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.I).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    return json.loads(cleaned)


async def _extract_prescription_with_openrouter(file_bytes: bytes, content_type: str) -> dict:
    encoded = base64.b64encode(file_bytes).decode("ascii")
    data_url = f"data:{content_type};base64,{encoded}"
    prompt = (
        f"{_PRESCRIPTION_PROMPT}\n\n"
        f"JSON schema:\n{json.dumps(_PRESCRIPTION_SCHEMA, default=str)}"
    )
    return await openrouter_vision_json(prompt, data_url)


def _detect_frequency(text: str) -> str:
    lower = text.lower()
    for pattern, frequency in _FREQUENCY_PATTERNS:
        if re.search(pattern, lower):
            return frequency
    return "once_daily"


def _normalize_frequency(value: object, context: str = "") -> MedicineFrequency:
    if isinstance(value, MedicineFrequency):
        return value
    raw = f"{value or ''} {context}".strip().lower()
    try:
        return MedicineFrequency(str(value))
    except ValueError:
        pass
    detected = _detect_frequency(raw)
    if detected == "twice_daily":
        return MedicineFrequency.TWICE_DAILY
    if detected == "thrice_daily":
        return MedicineFrequency.THRICE_DAILY
    if detected == "every_x_hours":
        return MedicineFrequency.EVERY_X_HOURS
    if detected == "as_needed":
        return MedicineFrequency.AS_NEEDED
    if detected == "weekly":
        return MedicineFrequency.WEEKLY
    return MedicineFrequency.ONCE_DAILY


def _infer_category(name: str) -> MedicineCategory:
    lower = name.lower()
    if re.search(r"\b(metformin|insulin|glimepiride|gliclazide|sitagliptin|dapagliflozin)\b", lower):
        return MedicineCategory.ANTIDIABETIC
    if re.search(r"\b(amlodipine|telmisartan|losartan|olmesartan|lisinopril|atenolol|metoprolol)\b", lower):
        return MedicineCategory.ANTIHYPERTENSIVE
    if re.search(r"\b(amoxicillin|azithromycin|cefixime|cefuroxime|doxycycline|ciprofloxacin)\b", lower):
        return MedicineCategory.ANTIBIOTIC
    if re.search(r"\b(warfarin|apixaban|rivaroxaban|dabigatran|heparin)\b", lower):
        return MedicineCategory.ANTICOAGULANT
    if re.search(r"\b(aspirin|clopidogrel|atorvastatin|rosuvastatin|nitroglycerin)\b", lower):
        return MedicineCategory.CARDIAC
    if re.search(r"\b(paracetamol|acetaminophen|ibuprofen|diclofenac)\b", lower):
        return MedicineCategory.PAIN_RELIEVER
    if re.search(r"\b(cetirizine|levocetirizine|loratadine|fexofenadine)\b", lower):
        return MedicineCategory.ANTIHISTAMINE
    if re.search(r"\b(pantoprazole|omeprazole|rabeprazole|famotidine)\b", lower):
        return MedicineCategory.ANTACID
    return MedicineCategory.OTHER_PRESCRIBED


def _normalize_category(value: object, name: str) -> MedicineCategory:
    if isinstance(value, MedicineCategory):
        return value
    try:
        return MedicineCategory(str(value))
    except ValueError:
        return _infer_category(name)


def _clean_time(value: object) -> str | None:
    raw = str(value or "").strip()
    match = re.match(r"^([01]?\d|2[0-3]):([0-5]\d)$", raw)
    if not match:
        return None
    return f"{int(match.group(1)):02d}:{match.group(2)}"


def _default_times_for_frequency(frequency: MedicineFrequency, every_x_hours: int | None, context: str) -> list[str]:
    lower = context.lower()
    if frequency == MedicineFrequency.TWICE_DAILY:
        return ["08:00", "20:00"]
    if frequency == MedicineFrequency.THRICE_DAILY:
        return ["08:00", "14:00", "20:00"]
    if frequency == MedicineFrequency.WEEKLY:
        return ["08:00"]
    if frequency == MedicineFrequency.EVERY_X_HOURS:
        interval = every_x_hours or 8
        return [f"{hour:02d}:00" for hour in range(6, 24, max(interval, 1))]
    if "night" in lower or "bedtime" in lower or re.search(r"\bhs\b", lower):
        return ["21:00"]
    if "lunch" in lower or "afternoon" in lower:
        return ["14:00"]
    if "evening" in lower or "dinner" in lower:
        return ["20:00"]
    return ["08:00"]


def _default_dose_from_text(text: str) -> tuple[float, str]:
    lower = text.lower()
    match = re.search(r"(\d+(?:\.\d+)?)\s*(ml|drops?|puffs?)\b", lower)
    if match:
        unit = match.group(2)
        if unit.endswith("s"):
            unit = unit[:-1]
        return float(match.group(1)), unit
    if re.search(r"\b(cap|capsule)\b", lower):
        return 1.0, "capsule"
    return 1.0, "tablet"


def _normalize_dose_times(
    raw_times: object,
    frequency: MedicineFrequency,
    every_x_hours: int | None,
    dosage: str,
    instructions: str | None,
) -> list[dict]:
    context = f"{dosage} {instructions or ''}"
    default_amount, default_unit = _default_dose_from_text(context)
    normalized: list[dict] = []

    if isinstance(raw_times, list):
        for item in raw_times:
            if not isinstance(item, dict):
                continue
            clean_time = _clean_time(item.get("time"))
            if not clean_time:
                continue
            amount = item.get("dose_amount")
            unit = str(item.get("dose_unit") or default_unit).strip().lower()
            try:
                amount_float = float(amount)
            except (TypeError, ValueError):
                amount_float = default_amount
            normalized.append({
                "time": clean_time,
                "dose_amount": max(amount_float, 0.0),
                "dose_unit": unit or default_unit,
            })

    if normalized:
        return normalized

    return [
        {"time": item, "dose_amount": default_amount, "dose_unit": default_unit}
        for item in _default_times_for_frequency(frequency, every_x_hours, context)
    ]


def _normalize_every_x_hours(value: object, context: str) -> int | None:
    try:
        parsed = int(value)
        if 1 <= parsed <= 24:
            return parsed
    except (TypeError, ValueError):
        pass
    match = re.search(r"(?:every|q)\s*(\d{1,2})\s*h", context.lower())
    if match:
        return int(match.group(1))
    return None


def _clamp_confidence(value: object) -> float | None:
    try:
        return round(max(0.0, min(float(value), 1.0)), 2)
    except (TypeError, ValueError):
        return None


def _normalize_extracted_medicines(raw_medicines: object) -> list[dict]:
    if not isinstance(raw_medicines, list):
        return []

    medicines: list[dict] = []
    seen: set[str] = set()
    for item in raw_medicines:
        if not isinstance(item, dict):
            continue
        name = " ".join(str(item.get("name") or "").split())[:100]
        if not name:
            continue
        dosage = " ".join(str(item.get("dosage") or "as prescribed").split())[:80]
        instructions = " ".join(str(item.get("instructions") or "").split()) or None
        context = f"{dosage} {instructions or ''}"
        frequency = _normalize_frequency(item.get("frequency"), context)
        every_x_hours = _normalize_every_x_hours(item.get("every_x_hours"), context)
        if frequency == MedicineFrequency.EVERY_X_HOURS and not every_x_hours:
            every_x_hours = 8
        category = _normalize_category(item.get("category"), name)

        normalized_key = f"{name.lower()}:{dosage.lower()}:{frequency.value}"
        if normalized_key in seen:
            continue
        seen.add(normalized_key)

        medicines.append({
            "name": name,
            "generic_name": item.get("generic_name") or None,
            "dosage": dosage,
            "frequency": frequency.value,
            "every_x_hours": every_x_hours,
            "duration": item.get("duration") or None,
            "category": category.value,
            "dose_times": _normalize_dose_times(
                item.get("dose_times"),
                frequency,
                every_x_hours,
                dosage,
                instructions,
            ),
            "instructions": instructions,
            "confidence": _clamp_confidence(item.get("confidence")),
            "matched_to_medicine_id": None,
        })
    return medicines


async def process_prescription_extraction(
    uid: str,
    prescription_id: str,
    job_id: str,
    file_bytes: bytes,
    content_type: str,
    db: AsyncClient,
) -> None:
    job_ref = db.collection("users").document(uid).collection("ocr_jobs").document(job_id)
    prescription_ref = (
        db.collection("users")
        .document(uid)
        .collection("prescriptions")
        .document(prescription_id)
    )

    await job_ref.update({"status": "processing", "progress_pct": 20, "updated_at": datetime.now(timezone.utc)})
    await prescription_ref.update({"status": PrescriptionStatus.PROCESSING.value})

    try:
        extraction_result = await _extract_prescription_with_openrouter(file_bytes, content_type)
        raw_text = str(extraction_result.get("raw_text") or "").strip()
        extracted = _normalize_extracted_medicines(extraction_result.get("medicines"))
        confidences = [
            med["confidence"]
            for med in extracted
            if isinstance(med.get("confidence"), (int, float))
        ]
        confidence_score = round(sum(confidences) / len(confidences), 2) if confidences else (0.8 if extracted else 0.4)
        now = datetime.now(timezone.utc)
        current_doc = await prescription_ref.get()
        current_data = current_doc.to_dict() or {}
        prescription_updates = {
            "status": PrescriptionStatus.PARSED.value,
            "extracted_medicines": extracted,
            "ocr_confidence_score": confidence_score,
            "raw_ocr_text": raw_text,
            "extraction_engine": get_settings().openrouter_vision_model,
            "ai_warnings": extraction_result.get("warnings", []),
            "parsed_at": now,
        }
        if not current_data.get("doctor_name") and extraction_result.get("doctor_name"):
            prescription_updates["doctor_name"] = extraction_result["doctor_name"]
        if not current_data.get("hospital_name") and extraction_result.get("hospital_name"):
            prescription_updates["hospital_name"] = extraction_result["hospital_name"]
        await prescription_ref.update(prescription_updates)
        await job_ref.update({
            "status": "completed",
            "progress_pct": 100,
            "medicines_found": len(extracted),
            "engine": get_settings().openrouter_vision_model,
            "error_message": None,
            "updated_at": now,
        })
    except Exception as exc:  # noqa: BLE001
        message = str(exc)[:500]
        await prescription_ref.update({
            "status": PrescriptionStatus.FAILED.value,
            "raw_ocr_text": None,
            "parsed_at": datetime.now(timezone.utc),
        })
        await job_ref.update({
            "status": "failed",
            "progress_pct": 0,
            "error_message": message,
            "updated_at": datetime.now(timezone.utc),
        })


async def process_prescription_ocr(
    uid: str,
    prescription_id: str,
    job_id: str,
    file_bytes: bytes,
    content_type: str,
    db: AsyncClient,
) -> None:
    await process_prescription_extraction(
        uid=uid,
        prescription_id=prescription_id,
        job_id=job_id,
        file_bytes=file_bytes,
        content_type=content_type,
        db=db,
    )


def _normalize_medicine_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def _parse_duration_end_date(start_date: date, duration: str | None) -> date | None:
    if not duration:
        return None
    lower = duration.lower()
    match = re.search(r"(\d{1,3})\s*(day|days|week|weeks|month|months)\b", lower)
    if not match:
        return None
    amount = int(match.group(1))
    unit = match.group(2)
    if unit.startswith("week"):
        days = amount * 7
    elif unit.startswith("month"):
        days = amount * 30
    else:
        days = amount
    return start_date + timedelta(days=max(days - 1, 0))


def _medicine_notes(medicine: ExtractedMedicine) -> str | None:
    parts: list[str] = []
    if medicine.instructions:
        parts.append(medicine.instructions)
    if medicine.duration:
        parts.append(f"Duration: {medicine.duration}")
    if medicine.confidence is not None:
        parts.append(f"Extraction confidence: {medicine.confidence}")
    return "\n".join(parts) if parts else None


async def import_prescription_medicines(
    uid: str,
    prescription_id: str,
    req: PrescriptionMedicineImportRequest,
    db: AsyncClient,
) -> PrescriptionMedicineImportResponse:
    prescription_ref = (
        db.collection("users")
        .document(uid)
        .collection("prescriptions")
        .document(prescription_id)
    )
    prescription_doc = await prescription_ref.get()
    if not prescription_doc.exists:
        raise NotFoundError("Prescription")

    prescription = prescription_doc.to_dict() or {}
    if prescription.get("status") != PrescriptionStatus.PARSED.value:
        raise ConflictError(
            f"Prescription is not ready for medicine import (current status: {prescription.get('status')})."
        )

    extracted = [ExtractedMedicine(**item) for item in prescription.get("extracted_medicines", [])]
    selected = set(req.selected_indexes) if req.selected_indexes is not None else set(range(len(extracted)))

    medicines_ref = db.collection("users").document(uid).collection("medicines")
    existing_docs = [
        doc async for doc in medicines_ref.where("prescription_id", "==", prescription_id).stream()
    ]
    existing_names = {
        _normalize_medicine_name((doc.to_dict() or {}).get("name", ""))
        for doc in existing_docs
    }

    prescribed_date_raw = prescription.get("prescribed_date")
    if isinstance(prescribed_date_raw, str):
        prescribed_date = date.fromisoformat(prescribed_date_raw)
    else:
        prescribed_date = prescribed_date_raw or date.today()
    start_date = req.start_date or prescribed_date

    imported = []
    skipped: list[dict] = []

    for index in sorted(selected):
        if index < 0 or index >= len(extracted):
            skipped.append({"index": index, "reason": "index_out_of_range"})
            continue

        medicine = extracted[index]
        normalized_name = _normalize_medicine_name(medicine.name)
        if not normalized_name:
            skipped.append({"index": index, "reason": "missing_name"})
            continue
        if normalized_name in existing_names:
            skipped.append({"index": index, "name": medicine.name, "reason": "already_imported"})
            continue

        frequency = _normalize_frequency(medicine.frequency, medicine.instructions or "")
        every_x_hours = medicine.every_x_hours
        if frequency == MedicineFrequency.EVERY_X_HOURS and not every_x_hours:
            every_x_hours = 8
        dose_times = medicine.dose_times or [
            DoseTime(**item)
            for item in _normalize_dose_times(
                [],
                frequency,
                every_x_hours,
                medicine.dosage,
                medicine.instructions,
            )
        ]
        create_req = MedicineCreateRequest(
            name=medicine.name,
            generic_name=medicine.generic_name,
            category=medicine.category,
            prescription_id=prescription_id,
            frequency=frequency,
            dose_times=dose_times,
            every_x_hours=every_x_hours if frequency == MedicineFrequency.EVERY_X_HOURS else None,
            start_date=start_date,
            end_date=_parse_duration_end_date(start_date, medicine.duration),
            current_stock=req.current_stock_default,
            reorder_threshold=req.reorder_threshold_default,
            prescribed_by=prescription.get("doctor_name"),
            notes=_medicine_notes(medicine),
        )

        try:
            from app.services import medicine_service

            created = await medicine_service.create_medicine(uid=uid, req=create_req, db=db)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to import extracted medicine %s: %s", medicine.name, exc)
            skipped.append({"index": index, "name": medicine.name, "reason": str(exc)[:200]})
            continue

        imported.append(created)
        existing_names.add(normalized_name)

        extracted[index].matched_to_medicine_id = created.medicine_id

    await prescription_ref.update({
        "extracted_medicines": [item.model_dump(mode="json") for item in extracted],
        "updated_at": datetime.now(timezone.utc),
    })

    return PrescriptionMedicineImportResponse(
        prescription_id=prescription_id,
        imported=imported,
        skipped=skipped,
    )
