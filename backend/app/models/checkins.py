from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, field_validator

from app.core.enums import MoodLevel, PainLevel


class MealEntry(BaseModel):
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    description: str
    calories_estimate: int | None = None
    photo_url: str | None = None


class CheckinCreateRequest(BaseModel):
    checkin_date: date
    mood: MoodLevel
    energy_level: int                           # 1–10
    pain_present: bool
    pain_level: PainLevel | None = None
    pain_locations: list[str] | None = None     # ["lower_back", "knee"]
    sleep_hours: float | None = None
    sleep_quality: int | None = None            # 1–5
    stress_level: int | None = None             # 1–10
    meals: list[MealEntry] = []
    medicine_adherence_ids: list[str] = []      # medicine IDs taken today
    symptoms: list[str] = []
    voice_note_url: str | None = None
    water_intake_ml: int | None = None
    bowel_movement: bool | None = None
    notes: str | None = None

    @field_validator("energy_level")
    @classmethod
    def validate_energy(cls, v: int) -> int:
        if not 1 <= v <= 10:
            raise ValueError("energy_level must be between 1 and 10")
        return v

    @field_validator("sleep_quality")
    @classmethod
    def validate_sleep_quality(cls, v: int | None) -> int | None:
        if v is not None and not 1 <= v <= 5:
            raise ValueError("sleep_quality must be between 1 and 5")
        return v

    @field_validator("stress_level")
    @classmethod
    def validate_stress(cls, v: int | None) -> int | None:
        if v is not None and not 1 <= v <= 10:
            raise ValueError("stress_level must be between 1 and 10")
        return v


class CheckinUpdateRequest(BaseModel):
    mood: MoodLevel | None = None
    energy_level: int | None = None
    pain_present: bool | None = None
    pain_level: PainLevel | None = None
    pain_locations: list[str] | None = None
    sleep_hours: float | None = None
    sleep_quality: int | None = None
    stress_level: int | None = None
    meals: list[MealEntry] | None = None
    medicine_adherence_ids: list[str] | None = None
    symptoms: list[str] | None = None
    water_intake_ml: int | None = None
    bowel_movement: bool | None = None
    notes: str | None = None


class CheckinResponse(BaseModel):
    checkin_id: str
    uid: str
    checkin_date: date
    mood: MoodLevel
    energy_level: int
    pain_present: bool
    pain_level: PainLevel | None = None
    pain_locations: list[str] = []
    sleep_hours: float | None = None
    sleep_quality: int | None = None
    stress_level: int | None = None
    meals: list[MealEntry] = []
    medicine_adherence_ids: list[str] = []
    symptoms: list[str] = []
    voice_note_url: str | None = None
    voice_transcription: str | None = None
    water_intake_ml: int | None = None
    bowel_movement: bool | None = None
    notes: str | None = None
    organ_scores_snapshot: dict = {}
    created_at: datetime
    updated_at: datetime


class CheckinListResponse(BaseModel):
    checkins: list[CheckinResponse]
    total: int
    has_more: bool


class StreakResponse(BaseModel):
    current_streak_days: int
    longest_streak_days: int
    last_checkin_date: date | None = None
    total_checkins: int


class VoiceUploadResponse(BaseModel):
    voice_note_url: str
    transcription_job_id: str
    estimated_duration_sec: int


class TranscriptionStatusResponse(BaseModel):
    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    transcription: str | None = None
    parsed_symptoms: list[str] = []
    parsed_mood: MoodLevel | None = None
