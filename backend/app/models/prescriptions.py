from datetime import date, datetime

from pydantic import BaseModel, Field

from app.core.enums import MedicineCategory, PrescriptionStatus
from app.models.medicines import DoseTime, MedicineResponse


class ExtractedMedicine(BaseModel):
    name: str
    generic_name: str | None = None
    dosage: str
    frequency: str
    every_x_hours: int | None = None
    duration: str | None = None
    category: MedicineCategory = MedicineCategory.OTHER_PRESCRIBED
    dose_times: list[DoseTime] = Field(default_factory=list)
    instructions: str | None = None
    confidence: float | None = None
    matched_to_medicine_id: str | None = None


class PrescriptionResponse(BaseModel):
    prescription_id: str
    uid: str
    prescribed_date: date
    doctor_name: str | None = None
    hospital_name: str | None = None
    file_url: str
    status: PrescriptionStatus
    ocr_job_id: str | None = None
    extracted_medicines: list[ExtractedMedicine] = []
    ocr_confidence_score: float | None = None
    raw_ocr_text: str | None = None
    is_valid: bool = True
    expires_at: date | None = None
    notes: str | None = None
    uploaded_at: datetime
    parsed_at: datetime | None = None


class PrescriptionListResponse(BaseModel):
    prescriptions: list[PrescriptionResponse]
    total: int
    valid_count: int
    expired_count: int


class PrescriptionCorrectionRequest(BaseModel):
    doctor_name: str | None = None
    hospital_name: str | None = None
    prescribed_date: date | None = None
    extracted_medicines: list[ExtractedMedicine] | None = None
    notes: str | None = None


class PrescriptionOCRStatusResponse(BaseModel):
    job_id: str
    prescription_id: str
    status: str
    progress_pct: int = 0
    medicines_found: int = 0
    engine: str | None = None
    error_message: str | None = None


class PrescriptionMedicineImportRequest(BaseModel):
    selected_indexes: list[int] | None = None
    current_stock_default: int = Field(default=30, ge=0)
    reorder_threshold_default: int = Field(default=7, ge=0)
    start_date: date | None = None


class PrescriptionMedicineImportResponse(BaseModel):
    prescription_id: str
    imported: list[MedicineResponse] = Field(default_factory=list)
    skipped: list[dict] = Field(default_factory=list)
