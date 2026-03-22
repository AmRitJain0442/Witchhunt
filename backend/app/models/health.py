from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.core.enums import OrganType, ScoreTrend


class OrganScore(BaseModel):
    organ: OrganType
    score: float
    trend: ScoreTrend
    change_7d: float
    last_updated: datetime
    contributing_factors: list[str] = []
    recommendations: list[str] = []


class HealthScoresResponse(BaseModel):
    uid: str
    overall_score: float
    organs: list[OrganScore]
    score_date: date
    data_completeness_pct: float
    next_recommended_checkin: datetime


class ScoreDataPoint(BaseModel):
    date: date
    score: float
    organ: OrganType


class HealthScoreHistoryResponse(BaseModel):
    organ: OrganType | None = None
    period: str
    data_points: list[ScoreDataPoint]
    average_score: float
    min_score: float
    max_score: float


class ScoreComparisonResponse(BaseModel):
    my_scores: list[OrganScore]
    their_scores: list[OrganScore]
    comparison_notes: list[str] = []


class RecomputeResponse(BaseModel):
    job_id: str
    estimated_completion_sec: int
    previous_overall_score: float


class VitalsResponse(BaseModel):
    heart_rate_bpm: float | None = None
    heart_rate_updated_at: datetime | None = None
    blood_pressure_systolic: int | None = None
    blood_pressure_diastolic: int | None = None
    bp_updated_at: datetime | None = None
    spo2_pct: float | None = None
    spo2_updated_at: datetime | None = None
    steps_today: int | None = None
    sleep_last_night_hours: float | None = None
    weight_kg: float | None = None
    weight_updated_at: datetime | None = None
    bmi: float | None = None
    source: dict = {}


class ManualVitalRequest(BaseModel):
    vital_type: Literal[
        "blood_pressure", "weight", "temperature",
        "blood_sugar", "spo2", "heart_rate"
    ]
    value_primary: float
    value_secondary: float | None = None    # Diastolic for BP
    unit: str
    recorded_at: datetime
    notes: str | None = None


class VitalEntryResponse(BaseModel):
    vital_id: str
    vital_type: str
    value_primary: float
    value_secondary: float | None = None
    unit: str
    recorded_at: datetime
    is_in_normal_range: bool
    normal_range_note: str | None = None
