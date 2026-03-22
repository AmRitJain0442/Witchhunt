from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from google.cloud.firestore import AsyncClient

from app.core.enums import PrescriptionStatus
from app.core.exceptions import ConflictError, NotFoundError
from app.core.firebase import get_storage_bucket
from app.models.prescriptions import (
    ExtractedMedicine,
    PrescriptionCorrectionRequest,
    PrescriptionListResponse,
    PrescriptionOCRStatusResponse,
    PrescriptionResponse,
)


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
        error_message=data.get("error_message"),
    )
