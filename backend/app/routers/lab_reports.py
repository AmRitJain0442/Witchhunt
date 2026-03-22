from datetime import date

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from app.dependencies import DB, CurrentUserDep
from app.models.common import MessageResponse
from app.models.lab_reports import (
    BiomarkerTrendResponse,
    LabReportCorrectionRequest,
    LabReportListResponse,
    LabReportResponse,
    OCRStatusResponse,
)
from app.services import lab_report_service

router = APIRouter()

_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}
_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/upload", response_model=LabReportResponse, status_code=201)
async def upload_report(
    current_user: CurrentUserDep,
    db: DB,
    file: UploadFile = File(...),
    report_date: date = Form(...),
    report_type: str = Form(...),
    lab_name: str | None = Form(default=None),
    doctor_name: str | None = Form(default=None),
    notes: str | None = Form(default=None),
):
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only PDF, JPEG, PNG, and WebP files are accepted",
        )

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File must be smaller than 20 MB",
        )

    return await lab_report_service.upload_report(
        uid=current_user.uid,
        file_bytes=file_bytes,
        content_type=file.content_type,
        report_date=report_date,
        report_type=report_type,
        lab_name=lab_name,
        doctor_name=doctor_name,
        notes=notes,
        db=db,
    )


@router.get("/", response_model=LabReportListResponse)
async def list_reports(
    current_user: CurrentUserDep,
    db: DB,
    report_type: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
):
    return await lab_report_service.list_reports(
        uid=current_user.uid,
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        db=db,
    )


# NOTE: /biomarkers/trends MUST be declared before /{report_id} to avoid path conflict
@router.get("/biomarkers/trends", response_model=BiomarkerTrendResponse)
async def get_biomarker_trends(
    current_user: CurrentUserDep,
    db: DB,
    biomarker_name: str = Query(...),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    return await lab_report_service.get_biomarker_trends(
        uid=current_user.uid,
        biomarker_name=biomarker_name,
        start_date=start_date,
        end_date=end_date,
        db=db,
    )


@router.get("/{report_id}", response_model=LabReportResponse)
async def get_report(
    report_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await lab_report_service.get_report(current_user.uid, report_id, db)


@router.get("/{report_id}/ocr-status", response_model=OCRStatusResponse)
async def get_ocr_status(
    report_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await lab_report_service.get_ocr_status(current_user.uid, report_id, db)


@router.delete("/{report_id}", response_model=MessageResponse)
async def delete_report(
    report_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    await lab_report_service.delete_report(current_user.uid, report_id, db)
    return MessageResponse(message="Lab report deleted successfully")


@router.post("/{report_id}/correct", response_model=LabReportResponse)
async def correct_report(
    report_id: str,
    req: LabReportCorrectionRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await lab_report_service.correct_report(current_user.uid, report_id, req, db)
