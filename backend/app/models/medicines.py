from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, model_validator

from app.core.enums import MedicineCategory, MedicineFrequency, EMERGENCY_CATEGORIES


class DoseTime(BaseModel):
    time: str           # "HH:MM" 24h
    dose_amount: float
    dose_unit: str      # "tablet" | "ml" | "mg" | "drops" | "puff"


class MedicineCreateRequest(BaseModel):
    name: str
    generic_name: str | None = None
    category: MedicineCategory
    prescription_id: str | None = None      # Required unless emergency category
    frequency: MedicineFrequency
    dose_times: list[DoseTime]
    every_x_hours: int | None = None        # Required if frequency=EVERY_X_HOURS
    start_date: date
    end_date: date | None = None
    current_stock: int
    reorder_threshold: int = 7
    prescribed_by: str | None = None
    color: str | None = None
    photo_url: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_prescription_requirement(self) -> "MedicineCreateRequest":
        if self.category not in EMERGENCY_CATEGORIES and not self.prescription_id:
            raise ValueError(
                f"prescription_id is required for category '{self.category.value}'. "
                "Upload a prescription first via POST /medicines/prescriptions/upload"
            )
        if self.frequency == MedicineFrequency.EVERY_X_HOURS and not self.every_x_hours:
            raise ValueError("every_x_hours is required when frequency is EVERY_X_HOURS")
        if not self.dose_times:
            raise ValueError("At least one dose_time is required")
        return self


class MedicineUpdateRequest(BaseModel):
    name: str | None = None
    dose_times: list[DoseTime] | None = None
    end_date: date | None = None
    current_stock: int | None = None
    reorder_threshold: int | None = None
    is_active: bool | None = None
    notes: str | None = None
    every_x_hours: int | None = None
    prescription_id: str | None = None


class MedicineResponse(BaseModel):
    medicine_id: str
    uid: str
    name: str
    generic_name: str | None = None
    category: MedicineCategory
    is_emergency: bool
    prescription_id: str | None = None
    prescription_valid: bool | None = None
    frequency: MedicineFrequency
    dose_times: list[DoseTime]
    start_date: date
    end_date: date | None = None
    is_active: bool
    current_stock: int
    doses_per_day: float
    days_supply_remaining: float
    reorder_threshold: int
    refill_alert: bool
    adherence_pct_7d: float = 0.0
    adherence_pct_30d: float = 0.0
    next_dose_time: datetime | None = None
    prescribed_by: str | None = None
    color: str | None = None
    photo_url: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class MedicineListResponse(BaseModel):
    medicines: list[MedicineResponse]
    total_active: int
    refill_alerts_count: int
    emergency_medicines_count: int
    prescription_required_count: int
    expired_prescriptions: list[str] = []      # medicine_ids with expired prescription


class DoseScheduleItem(BaseModel):
    medicine_id: str
    medicine_name: str
    dose_time: str
    dose_amount: float
    dose_unit: str
    taken: bool = False
    taken_at: datetime | None = None
    skipped: bool = False
    skip_reason: str | None = None
    overdue: bool = False


class TodayScheduleResponse(BaseModel):
    date: date
    schedule: list[DoseScheduleItem]
    total_doses: int
    taken_count: int
    missed_count: int
    pending_count: int
    adherence_pct_today: float


class DoseLogRequest(BaseModel):
    scheduled_time: str                         # "HH:MM"
    action: Literal["taken", "skipped", "delayed"]
    actual_time: datetime | None = None
    skip_reason: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def require_skip_reason(self) -> "DoseLogRequest":
        if self.action == "skipped" and not self.skip_reason:
            raise ValueError("skip_reason is required when action is 'skipped'")
        return self


class DoseLogResponse(BaseModel):
    log_id: str
    medicine_id: str
    medicine_name: str
    action: str
    scheduled_time: str
    actual_time: datetime | None = None
    skip_reason: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_stock: int


class DoseLogListResponse(BaseModel):
    logs: list[DoseLogResponse]
    adherence_pct: float
    total_scheduled: int
    total_taken: int
    total_skipped: int


class RefillRequest(BaseModel):
    quantity_added: int
    purchase_date: date
    cost: float | None = None
    pharmacy_name: str | None = None
    notes: str | None = None


class AdherenceSummaryResponse(BaseModel):
    period: str
    overall_adherence_pct: float
    by_medicine: list[dict]
    best_day_of_week: str | None = None
    worst_day_of_week: str | None = None
    streak_days: int
