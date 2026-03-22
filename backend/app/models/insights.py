from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.core.enums import OrganType, InsightSeverity, InsightType, MedicineCategory


class ActiveMedicineContext(BaseModel):
    medicine_id: str
    name: str
    generic_name: str | None = None
    category: MedicineCategory
    dose_times: list[str]
    doses_per_day: float
    start_date: date
    end_date: date | None = None
    adherence_pct_30d: float
    days_supply_remaining: float


class PastMedicineContext(BaseModel):
    name: str
    generic_name: str | None = None
    category: MedicineCategory
    start_date: date
    end_date: date
    reason_stopped: str | None = None


class FlaggedBiomarker(BaseModel):
    name: str
    latest_value: float
    unit: str
    status: str
    report_date: date


class HealthContext(BaseModel):
    uid: str
    age: int
    gender: str
    blood_group: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    bmi: float | None = None
    chronic_conditions: list[str] = []
    allergies: list[str] = []
    active_medicines: list[ActiveMedicineContext] = []
    past_medicines: list[PastMedicineContext] = []
    organ_scores: dict[str, float] = {}
    score_trends: dict[str, str] = {}
    recent_symptoms: list[str] = []
    avg_sleep_hours_7d: float | None = None
    avg_stress_level_7d: float | None = None
    avg_pain_level_7d: float | None = None
    avg_energy_level_7d: float | None = None
    avg_water_intake_ml_7d: float | None = None
    latest_vitals: dict[str, float] = {}
    flagged_biomarkers: list[FlaggedBiomarker] = []
    avg_steps_7d: int | None = None
    avg_resting_hr_7d: float | None = None
    data_completeness_pct: float = 0.0
    context_built_at: datetime


# ── Exercise ─────────────────────────────────────────────────────────────────

class ExerciseItem(BaseModel):
    name: str
    category: Literal["cardio", "strength", "flexibility", "breathing", "balance", "yoga", "rest"]
    intensity: Literal["very_low", "low", "moderate", "high"]
    duration_minutes: int
    frequency_per_week: int
    instructions: str
    benefits_for_user: list[str] = []
    precautions: list[str] = []
    avoid_if: list[str] = []


class ExerciseContraindication(BaseModel):
    reason: str
    restricted_categories: list[str]
    temporary: bool
    suggested_alternative: str


class ExerciseSuggestionResponse(BaseModel):
    uid: str
    generated_at: datetime
    cache_hit: bool
    context_summary: str
    recommended: list[ExerciseItem]
    avoid_entirely: list[str] = []
    contraindications: list[ExerciseContraindication] = []
    weekly_plan: dict[str, list[ExerciseItem]] = {}
    notes_from_context: list[str] = []
    should_consult_doctor: bool = False
    consult_reason: str | None = None


class SaveExercisePlanRequest(BaseModel):
    exercises: list[ExerciseItem]
    start_date: date
    reminder_times: list[str] = []


class SavedExercisePlanResponse(BaseModel):
    plan_id: str
    saved_at: datetime
    reminder_scheduled: bool


# ── Medicine Interactions ─────────────────────────────────────────────────────

class DrugDrugInteraction(BaseModel):
    with_medicine: str
    with_generic: str | None = None
    severity: Literal["mild", "moderate", "severe", "contraindicated"]
    interaction_type: str
    effect: str
    mechanism: str | None = None
    recommendation: Literal[
        "monitor", "adjust_dose", "use_with_caution",
        "avoid", "consult_doctor_before_use"
    ]
    recommendation_detail: str


class DrugConditionWarning(BaseModel):
    condition: str
    warning: str
    severity: Literal["mild", "moderate", "severe", "contraindicated"]
    recommendation: str


class DrugAllergyAlert(BaseModel):
    allergy: str
    alert: str
    severity: Literal["possible_cross_reaction", "definite_contraindication"]


class DrugLabWarning(BaseModel):
    biomarker: str
    current_value: float
    unit: str
    warning: str
    recommendation: str


class FoodDrugInteraction(BaseModel):
    food_item: str
    effect: str
    severity: Literal["mild", "moderate", "severe"]
    avoid: bool
    timing_note: str | None = None


class InteractionCheckRequest(BaseModel):
    medicine_name: str
    generic_name: str | None = None
    category: MedicineCategory
    dose_amount: float
    dose_unit: str
    doses_per_day: float


class InteractionCheckResponse(BaseModel):
    check_id: str
    checked_at: datetime
    proposed_medicine: str
    context_summary: str
    drug_interactions: list[DrugDrugInteraction] = []
    worst_drug_severity: str | None = None
    condition_warnings: list[DrugConditionWarning] = []
    allergy_alerts: list[DrugAllergyAlert] = []
    lab_warnings: list[DrugLabWarning] = []
    food_interactions: list[FoodDrugInteraction] = []
    overall_risk: Literal["safe", "caution", "avoid", "contraindicated"]
    safe_to_add: bool
    must_consult_doctor: bool
    summary: str
    disclaimer: str


class DosageAlert(BaseModel):
    medicine_id: str
    medicine_name: str
    alert_type: Literal[
        "exceeding_end_date", "double_dose_risk", "missed_dose_pattern",
        "low_adherence", "high_dose_for_age", "renal_caution", "hepatic_caution"
    ]
    description: str
    severity: Literal["info", "warning", "urgent"]
    action_required: str


class MedicineCabinetAuditResponse(BaseModel):
    audited_at: datetime
    active_medicine_count: int
    pairwise_interactions: list[DrugDrugInteraction] = []
    worst_active_interaction: str | None = None
    dosage_alerts: list[DosageAlert] = []
    combined_food_warnings: list[FoodDrugInteraction] = []
    cabinet_risk_level: Literal["low", "moderate", "high"]
    urgent_action_count: int
    summary: str
    disclaimer: str


class FoodWarning(BaseModel):
    food_item: str
    affects_medicines: list[str]
    combined_effect: str
    severity: Literal["mild", "moderate", "severe"]
    avoid_entirely: bool
    safe_amount: str | None = None
    timing_note: str | None = None


class MealTimingAdvice(BaseModel):
    medicine_name: str
    take_with_food: bool | None = None
    best_meal_timing: str
    avoid_empty_stomach: bool = False
    avoid_after_fatty_meals: bool = False


class FoodInteractionSummaryResponse(BaseModel):
    generated_at: datetime
    active_medicine_count: int
    avoid_entirely: list[FoodWarning] = []
    consume_with_caution: list[FoodWarning] = []
    meal_timing_advice: list[MealTimingAdvice] = []
    condition_food_advice: list[dict] = []
    top_3_avoid: list[str] = []
    disclaimer: str


# ── Advisories ────────────────────────────────────────────────────────────────

class Advisory(BaseModel):
    advisory_id: str
    type: InsightType
    severity: InsightSeverity
    title: str
    body: str
    evidence: list[str] = []
    suggested_actions: list[str] = []
    related_organ: OrganType | None = None
    related_medicine_id: str | None = None
    expires_at: datetime
    is_dismissed: bool = False


class HealthAdvisoryResponse(BaseModel):
    generated_at: datetime
    cache_hit: bool
    urgent_count: int
    advisories: list[Advisory]
    context_data_used: list[str] = []
