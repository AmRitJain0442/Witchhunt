from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.core.enums import LabReportStatus


class LabBiomarker(BaseModel):
    name: str
    value: float
    unit: str
    reference_range_low: float | None = None
    reference_range_high: float | None = None
    status: Literal["normal", "low", "high", "critical_low", "critical_high"]
    flag: bool = False


class LabReportResponse(BaseModel):
    report_id: str
    uid: str
    report_date: date
    report_type: str
    lab_name: str | None = None
    doctor_name: str | None = None
    file_url: str
    status: LabReportStatus
    ocr_job_id: str | None = None
    biomarkers: list[LabBiomarker] = []
    ocr_confidence_score: float | None = None
    raw_ocr_text: str | None = None
    notes: str | None = None
    flagged_biomarkers: list[str] = []
    manually_corrected: bool = False
    uploaded_at: datetime
    parsed_at: datetime | None = None


class LabReportListResponse(BaseModel):
    reports: list[LabReportResponse]
    total: int
    flagged_count: int


class OCRStatusResponse(BaseModel):
    report_id: str
    status: LabReportStatus
    ocr_job_id: str | None = None
    progress_pct: int = 0
    biomarkers_found: int = 0
    flagged_count: int = 0
    error_message: str | None = None


class BiomarkerCorrection(BaseModel):
    name: str
    value: float
    unit: str
    reference_range_low: float | None = None
    reference_range_high: float | None = None


class LabReportCorrectionRequest(BaseModel):
    corrections: list[BiomarkerCorrection]
    notes: str | None = None


class BiomarkerDataPoint(BaseModel):
    date: date
    report_id: str
    value: float
    unit: str
    status: str
    reference_range_low: float | None = None
    reference_range_high: float | None = None


class BiomarkerTrendResponse(BaseModel):
    biomarker_name: str
    data_points: list[BiomarkerDataPoint]
    trend: Literal["improving", "stable", "declining", "insufficient_data"]
    latest_value: float | None = None
    latest_status: str | None = None
    average_value: float | None = None
