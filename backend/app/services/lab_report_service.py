from datetime import date, datetime, timezone
from uuid import uuid4

from google.cloud.firestore import AsyncClient

from app.core.enums import LabReportStatus
from app.core.exceptions import NotFoundError, ValidationError
from app.core.firebase import get_storage_bucket
from app.models.lab_reports import (
    BiomarkerDataPoint,
    BiomarkerTrendResponse,
    LabBiomarker,
    LabReportCorrectionRequest,
    LabReportListResponse,
    LabReportResponse,
    OCRStatusResponse,
)

NORMAL_RANGES: dict[str, dict] = {
    "Hemoglobin": {"low": 12.0, "high": 17.5, "unit": "g/dL"},
    "Glucose": {"low": 70, "high": 99, "unit": "mg/dL"},
    "HbA1c": {"low": 4.0, "high": 5.6, "unit": "%"},
    "Creatinine": {"low": 0.6, "high": 1.3, "unit": "mg/dL"},
    "TSH": {"low": 0.4, "high": 4.0, "unit": "mIU/L"},
    "LDL": {"low": 0, "high": 100, "unit": "mg/dL"},
    "HDL": {"low": 40, "high": 999, "unit": "mg/dL"},
    "Triglycerides": {"low": 0, "high": 150, "unit": "mg/dL"},
    "Platelets": {"low": 150000, "high": 400000, "unit": "/μL"},
    "WBC": {"low": 4000, "high": 11000, "unit": "/μL"},
}

# Biomarkers where a high value is considered bad (used for trend direction)
_HIGH_IS_BAD = {"Glucose", "HbA1c", "Creatinine", "TSH", "LDL", "Triglycerides", "WBC"}


def _evaluate_biomarker_status(
    name: str,
    value: float,
    ref_low: float | None,
    ref_high: float | None,
) -> tuple[str, bool]:
    """Return (status, flag) for a biomarker value."""
    low = ref_low
    high = ref_high

    # Fall back to NORMAL_RANGES if no per-report range supplied
    if low is None or high is None:
        nr = NORMAL_RANGES.get(name)
        if nr:
            low = low if low is not None else nr["low"]
            high = high if high is not None else nr["high"]

    if low is None or high is None:
        return "normal", False

    range_span = high - low if high > low else 1.0
    critical_low = low - 0.2 * range_span
    critical_high = high + 0.2 * range_span

    if value < critical_low:
        return "critical_low", True
    if value > critical_high:
        return "critical_high", True
    if value < low:
        return "low", True
    if value > high:
        return "high", True
    return "normal", False


def _doc_to_report_response(data: dict) -> LabReportResponse:
    biomarkers_raw = data.get("biomarkers", [])
    biomarkers = [
        LabBiomarker(
            name=b["name"],
            value=b["value"],
            unit=b["unit"],
            reference_range_low=b.get("reference_range_low"),
            reference_range_high=b.get("reference_range_high"),
            status=b["status"],
            flag=b.get("flag", False),
        )
        for b in biomarkers_raw
    ]

    report_date_raw = data.get("report_date")
    if isinstance(report_date_raw, str):
        report_date_val = date.fromisoformat(report_date_raw)
    elif isinstance(report_date_raw, datetime):
        report_date_val = report_date_raw.date()
    else:
        report_date_val = report_date_raw

    uploaded_at = data["uploaded_at"]
    if isinstance(uploaded_at, str):
        uploaded_at = datetime.fromisoformat(uploaded_at)

    parsed_at = data.get("parsed_at")
    if isinstance(parsed_at, str):
        parsed_at = datetime.fromisoformat(parsed_at)

    return LabReportResponse(
        report_id=data["report_id"],
        uid=data["uid"],
        report_date=report_date_val,
        report_type=data["report_type"],
        lab_name=data.get("lab_name"),
        doctor_name=data.get("doctor_name"),
        file_url=data["file_url"],
        status=LabReportStatus(data["status"]),
        ocr_job_id=data.get("ocr_job_id"),
        biomarkers=biomarkers,
        ocr_confidence_score=data.get("ocr_confidence_score"),
        raw_ocr_text=data.get("raw_ocr_text"),
        notes=data.get("notes"),
        flagged_biomarkers=data.get("flagged_biomarkers", []),
        manually_corrected=data.get("manually_corrected", False),
        uploaded_at=uploaded_at,
        parsed_at=parsed_at,
    )


async def upload_report(
    uid: str,
    file_bytes: bytes,
    content_type: str,
    report_date: date,
    report_type: str,
    lab_name: str | None,
    doctor_name: str | None,
    notes: str | None,
    db: AsyncClient,
) -> LabReportResponse:
    report_id = str(uuid4())
    now = datetime.now(timezone.utc)

    # Determine file extension from content_type
    ext_map = {
        "application/pdf": "pdf",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }
    ext = ext_map.get(content_type, "bin")
    storage_path = f"lab_reports/{uid}/{report_id}/original.{ext}"

    bucket = get_storage_bucket()
    blob = bucket.blob(storage_path)
    blob.upload_from_string(file_bytes, content_type=content_type)
    blob.make_public()
    file_url = blob.public_url

    # Create OCR job
    job_id = str(uuid4())
    job_data = {
        "job_id": job_id,
        "uid": uid,
        "report_id": report_id,
        "type": "lab_report",
        "file_url": file_url,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    await (
        db.collection("users")
        .document(uid)
        .collection("ocr_jobs")
        .document(job_id)
        .set(job_data)
    )

    # Create Firestore document
    report_data = {
        "report_id": report_id,
        "uid": uid,
        "report_date": report_date.isoformat(),
        "report_type": report_type,
        "lab_name": lab_name,
        "doctor_name": doctor_name,
        "file_url": file_url,
        "status": LabReportStatus.UPLOADED.value,
        "ocr_job_id": job_id,
        "biomarkers": [],
        "ocr_confidence_score": None,
        "raw_ocr_text": None,
        "notes": notes,
        "flagged_biomarkers": [],
        "manually_corrected": False,
        "uploaded_at": now,
        "parsed_at": None,
    }
    await (
        db.collection("users")
        .document(uid)
        .collection("lab_reports")
        .document(report_id)
        .set(report_data)
    )

    return _doc_to_report_response(report_data)


async def list_reports(
    uid: str,
    report_type: str | None,
    start_date: date | None,
    end_date: date | None,
    limit: int,
    db: AsyncClient,
) -> LabReportListResponse:
    ref = db.collection("users").document(uid).collection("lab_reports")
    query = ref.order_by("report_date", direction="DESCENDING")

    if report_type is not None:
        query = query.where("report_type", "==", report_type)
    if start_date is not None:
        query = query.where("report_date", ">=", start_date.isoformat())
    if end_date is not None:
        query = query.where("report_date", "<=", end_date.isoformat())

    all_docs = [doc async for doc in query.stream()]
    total = len(all_docs)
    page = all_docs[:limit]
    reports = [_doc_to_report_response(doc.to_dict()) for doc in page]
    flagged_count = sum(1 for r in reports if r.flagged_biomarkers)

    return LabReportListResponse(reports=reports, total=total, flagged_count=flagged_count)


async def get_report(uid: str, report_id: str, db: AsyncClient) -> LabReportResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("lab_reports")
        .document(report_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("Lab report")
    return _doc_to_report_response(doc.to_dict())


async def get_ocr_status(uid: str, report_id: str, db: AsyncClient) -> OCRStatusResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("lab_reports")
        .document(report_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("Lab report")

    data = doc.to_dict()
    biomarkers = data.get("biomarkers", [])
    flagged = [b for b in biomarkers if b.get("flag", False)]

    # Derive progress from status
    status_val = LabReportStatus(data["status"])
    progress_map = {
        LabReportStatus.UPLOADED: 0,
        LabReportStatus.PROCESSING: 50,
        LabReportStatus.PARSED: 100,
        LabReportStatus.FAILED: 0,
    }

    return OCRStatusResponse(
        report_id=report_id,
        status=status_val,
        ocr_job_id=data.get("ocr_job_id"),
        progress_pct=progress_map.get(status_val, 0),
        biomarkers_found=len(biomarkers),
        flagged_count=len(flagged),
        error_message=data.get("ocr_error_message"),
    )


async def delete_report(uid: str, report_id: str, db: AsyncClient) -> None:
    ref = (
        db.collection("users")
        .document(uid)
        .collection("lab_reports")
        .document(report_id)
    )
    doc = await ref.get()
    if not doc.exists:
        raise NotFoundError("Lab report")

    # Attempt to delete from storage (best-effort)
    data = doc.to_dict()
    file_url: str = data.get("file_url", "")
    if file_url:
        try:
            bucket = get_storage_bucket()
            # Extract blob name from public URL
            # public URL format: https://storage.googleapis.com/{bucket}/{blob}
            bucket_name = bucket.name
            prefix = f"https://storage.googleapis.com/{bucket_name}/"
            if file_url.startswith(prefix):
                blob_name = file_url[len(prefix):]
                blob = bucket.blob(blob_name)
                blob.delete()
        except Exception:
            pass  # Storage delete failure should not block Firestore delete

    await ref.delete()


async def get_biomarker_trends(
    uid: str,
    biomarker_name: str,
    start_date: date | None,
    end_date: date | None,
    db: AsyncClient,
) -> BiomarkerTrendResponse:
    ref = db.collection("users").document(uid).collection("lab_reports")
    query = ref.where("status", "==", LabReportStatus.PARSED.value).order_by(
        "report_date", direction="ASCENDING"
    )

    all_docs = [doc async for doc in query.stream()]
    data_points: list[BiomarkerDataPoint] = []

    biomarker_name_lower = biomarker_name.lower()

    for doc in all_docs:
        report = doc.to_dict()
        report_date_raw = report.get("report_date")
        if isinstance(report_date_raw, str):
            report_date_val = date.fromisoformat(report_date_raw)
        elif isinstance(report_date_raw, datetime):
            report_date_val = report_date_raw.date()
        else:
            continue

        if start_date and report_date_val < start_date:
            continue
        if end_date and report_date_val > end_date:
            continue

        for b in report.get("biomarkers", []):
            if b.get("name", "").lower() == biomarker_name_lower:
                data_points.append(
                    BiomarkerDataPoint(
                        date=report_date_val,
                        report_id=report["report_id"],
                        value=b["value"],
                        unit=b["unit"],
                        status=b.get("status", "normal"),
                        reference_range_low=b.get("reference_range_low"),
                        reference_range_high=b.get("reference_range_high"),
                    )
                )
                break  # only one match per report

    # Sort by date ascending
    data_points.sort(key=lambda dp: dp.date)

    latest_value: float | None = None
    latest_status: str | None = None
    average_value: float | None = None

    if data_points:
        latest_value = data_points[-1].value
        latest_status = data_points[-1].status
        average_value = sum(dp.value for dp in data_points) / len(data_points)

    trend: str = "insufficient_data"
    if len(data_points) >= 3:
        # Linear slope via least-squares (simple)
        n = len(data_points)
        xs = list(range(n))
        ys = [dp.value for dp in data_points]
        x_mean = sum(xs) / n
        y_mean = sum(ys) / n
        numerator = sum((xs[i] - x_mean) * (ys[i] - y_mean) for i in range(n))
        denominator = sum((xs[i] - x_mean) ** 2 for i in range(n))
        slope = numerator / denominator if denominator != 0 else 0.0

        # Determine if high value is bad for this biomarker
        is_high_bad = any(
            biomarker_name_lower == k.lower() for k in _HIGH_IS_BAD
        ) or biomarker_name_lower not in {k.lower() for k in {"HDL", "Hemoglobin"}}

        if abs(slope) < 1e-9:
            trend = "stable"
        elif is_high_bad:
            # Positive slope means rising (bad) → declining health
            trend = "declining" if slope > 0 else "improving"
        else:
            # Low is bad (e.g. HDL, Hemoglobin): positive slope is improving
            trend = "improving" if slope > 0 else "declining"

    return BiomarkerTrendResponse(
        biomarker_name=biomarker_name,
        data_points=data_points,
        trend=trend,  # type: ignore[arg-type]
        latest_value=latest_value,
        latest_status=latest_status,
        average_value=average_value,
    )


async def correct_report(
    uid: str,
    report_id: str,
    req: LabReportCorrectionRequest,
    db: AsyncClient,
) -> LabReportResponse:
    ref = (
        db.collection("users")
        .document(uid)
        .collection("lab_reports")
        .document(report_id)
    )
    doc = await ref.get()
    if not doc.exists:
        raise NotFoundError("Lab report")

    data = doc.to_dict()
    existing_biomarkers: list[dict] = data.get("biomarkers", [])

    # Build a lookup of existing biomarkers by name (case-insensitive)
    biomarker_map: dict[str, dict] = {
        b["name"].lower(): b for b in existing_biomarkers
    }

    for correction in req.corrections:
        key = correction.name.lower()
        ref_low = correction.reference_range_low
        ref_high = correction.reference_range_high

        # Fall back to NORMAL_RANGES
        if ref_low is None or ref_high is None:
            nr = NORMAL_RANGES.get(correction.name)
            if nr:
                ref_low = ref_low if ref_low is not None else nr["low"]
                ref_high = ref_high if ref_high is not None else nr["high"]

        status, flag = _evaluate_biomarker_status(
            correction.name, correction.value, ref_low, ref_high
        )

        updated_biomarker = {
            "name": correction.name,
            "value": correction.value,
            "unit": correction.unit,
            "reference_range_low": ref_low,
            "reference_range_high": ref_high,
            "status": status,
            "flag": flag,
        }
        biomarker_map[key] = updated_biomarker

    updated_biomarkers = list(biomarker_map.values())
    flagged_biomarkers = [b["name"] for b in updated_biomarkers if b.get("flag")]

    now = datetime.now(timezone.utc)
    updates = {
        "biomarkers": updated_biomarkers,
        "flagged_biomarkers": flagged_biomarkers,
        "manually_corrected": True,
        "updated_at": now,
    }
    if req.notes is not None:
        updates["notes"] = req.notes

    await ref.update(updates)
    updated_doc = await ref.get()
    return _doc_to_report_response(updated_doc.to_dict())
