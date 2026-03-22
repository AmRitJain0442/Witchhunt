from datetime import date

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.dependencies import DB, CurrentUserDep
from app.models.common import MessageResponse
from app.models.medicines import (
    AdherenceSummaryResponse,
    DoseLogListResponse,
    DoseLogRequest,
    DoseLogResponse,
    MedicineCreateRequest,
    MedicineListResponse,
    MedicineResponse,
    MedicineUpdateRequest,
    RefillRequest,
    TodayScheduleResponse,
)
from app.models.prescriptions import (
    PrescriptionCorrectionRequest,
    PrescriptionListResponse,
    PrescriptionOCRStatusResponse,
    PrescriptionResponse,
)
from app.core.enums import MedicineCategory
from app.services import prescription_service, medicine_service

router = APIRouter()

_ALLOWED_PRESCRIPTION_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
}
_MAX_PRESCRIPTION_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


# ---------------------------------------------------------------------------
# Prescription endpoints — declared BEFORE dynamic /{medicine_id} routes
# ---------------------------------------------------------------------------

@router.post("/prescriptions/upload", response_model=PrescriptionResponse, status_code=201)
async def upload_prescription(
    current_user: CurrentUserDep,
    db: DB,
    file: UploadFile = File(...),
    prescribed_date: date = Form(...),
    doctor_name: str | None = Form(None),
    hospital_name: str | None = Form(None),
    notes: str | None = Form(None),
):
    if file.content_type not in _ALLOWED_PRESCRIPTION_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only JPEG, PNG, WebP images and PDF files are accepted for prescriptions",
        )
    file_bytes = await file.read()
    if len(file_bytes) > _MAX_PRESCRIPTION_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Prescription file must be smaller than 20 MB")

    return await prescription_service.upload_prescription(
        uid=current_user.uid,
        file_bytes=file_bytes,
        content_type=file.content_type,
        prescribed_date=prescribed_date,
        doctor_name=doctor_name,
        hospital_name=hospital_name,
        notes=notes,
        db=db,
    )


@router.get("/prescriptions/ocr-status/{job_id}", response_model=PrescriptionOCRStatusResponse)
async def get_ocr_status(
    job_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await prescription_service.get_ocr_status(
        uid=current_user.uid,
        job_id=job_id,
        db=db,
    )


@router.get("/prescriptions", response_model=PrescriptionListResponse)
async def list_prescriptions(
    current_user: CurrentUserDep,
    db: DB,
    is_valid: bool | None = None,
    limit: int = 20,
    offset: int = 0,
):
    return await prescription_service.list_prescriptions(
        uid=current_user.uid,
        is_valid=is_valid,
        limit=limit,
        offset=offset,
        db=db,
    )


@router.get("/prescriptions/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await prescription_service.get_prescription(
        uid=current_user.uid,
        prescription_id=prescription_id,
        db=db,
    )


@router.patch("/prescriptions/{prescription_id}", response_model=PrescriptionResponse)
async def correct_prescription(
    prescription_id: str,
    req: PrescriptionCorrectionRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await prescription_service.correct_prescription(
        uid=current_user.uid,
        prescription_id=prescription_id,
        req=req,
        db=db,
    )


@router.delete("/prescriptions/{prescription_id}", response_model=MessageResponse)
async def delete_prescription(
    prescription_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    await prescription_service.delete_prescription(
        uid=current_user.uid,
        prescription_id=prescription_id,
        db=db,
    )
    return MessageResponse(message="Prescription deleted successfully")


# ---------------------------------------------------------------------------
# Static medicine endpoints — declared BEFORE /{medicine_id} to avoid conflicts
# ---------------------------------------------------------------------------

@router.get("/today", response_model=TodayScheduleResponse)
async def get_today_schedule(
    current_user: CurrentUserDep,
    db: DB,
):
    return await medicine_service.get_today_schedule(
        uid=current_user.uid,
        db=db,
    )


@router.get("/adherence/summary", response_model=AdherenceSummaryResponse)
async def get_adherence_summary(
    current_user: CurrentUserDep,
    db: DB,
    period: str = "30d",
):
    return await medicine_service.get_adherence_summary(
        uid=current_user.uid,
        period=period,
        db=db,
    )


# ---------------------------------------------------------------------------
# Medicine CRUD endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=MedicineResponse, status_code=201)
async def create_medicine(
    req: MedicineCreateRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await medicine_service.create_medicine(
        uid=current_user.uid,
        req=req,
        db=db,
    )


@router.get("/", response_model=MedicineListResponse)
async def list_medicines(
    current_user: CurrentUserDep,
    db: DB,
    is_active: bool | None = None,
    category: MedicineCategory | None = None,
    is_emergency: bool | None = None,
):
    return await medicine_service.list_medicines(
        uid=current_user.uid,
        is_active=is_active,
        category=category,
        is_emergency=is_emergency,
        db=db,
    )


# ---------------------------------------------------------------------------
# Dynamic /{medicine_id} routes — must be AFTER all static routes
# ---------------------------------------------------------------------------

@router.get("/{medicine_id}", response_model=MedicineResponse)
async def get_medicine(
    medicine_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await medicine_service.get_medicine(
        uid=current_user.uid,
        medicine_id=medicine_id,
        db=db,
    )


@router.patch("/{medicine_id}", response_model=MedicineResponse)
async def update_medicine(
    medicine_id: str,
    req: MedicineUpdateRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await medicine_service.update_medicine(
        uid=current_user.uid,
        medicine_id=medicine_id,
        req=req,
        db=db,
    )


@router.delete("/{medicine_id}", response_model=MessageResponse)
async def delete_medicine(
    medicine_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    await medicine_service.delete_medicine(
        uid=current_user.uid,
        medicine_id=medicine_id,
        db=db,
    )
    return MessageResponse(message="Medicine deactivated successfully")


@router.post("/{medicine_id}/log", response_model=DoseLogResponse, status_code=201)
async def log_dose(
    medicine_id: str,
    req: DoseLogRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await medicine_service.log_dose(
        uid=current_user.uid,
        medicine_id=medicine_id,
        req=req,
        db=db,
    )


@router.get("/{medicine_id}/logs", response_model=DoseLogListResponse)
async def list_dose_logs(
    medicine_id: str,
    current_user: CurrentUserDep,
    db: DB,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 30,
):
    from datetime import date as _date, timedelta as _td
    today = _date.today()
    resolved_end = end_date or today
    resolved_start = start_date or (today - _td(days=30))

    return await medicine_service.list_dose_logs(
        uid=current_user.uid,
        medicine_id=medicine_id,
        start_date=resolved_start,
        end_date=resolved_end,
        limit=limit,
        db=db,
    )


@router.post("/{medicine_id}/refill", response_model=MedicineResponse, status_code=201)
async def record_refill(
    medicine_id: str,
    req: RefillRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await medicine_service.record_refill(
        uid=current_user.uid,
        medicine_id=medicine_id,
        req=req,
        db=db,
    )
