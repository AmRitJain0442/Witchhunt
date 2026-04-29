from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class DiabetesProgramStartRequest(BaseModel):
    target_hba1c: float = 7.0
    fasting_glucose_target: float = 110.0
    preferred_walk_minutes: int = 20
    language: str = "en"


class ProgramTask(BaseModel):
    task_id: str
    title: str
    description: str
    category: Literal["vitals", "medicine", "activity", "diet", "education"]
    completed: bool = False


class DiabetesProgramResponse(BaseModel):
    program_id: str
    status: Literal["active", "completed", "paused"]
    start_date: date
    current_week: int
    total_weeks: int = 12
    focus: str
    tasks_today: list[ProgramTask]
    targets: dict
    created_at: datetime
    updated_at: datetime


class ProgramTaskCompleteRequest(BaseModel):
    notes: str | None = None


class ProgramProgressResponse(BaseModel):
    program_id: str
    current_week: int
    completed_tasks_7d: int
    completed_tasks_total: int
    fasting_glucose_latest: float | None = None
    fasting_glucose_trend: Literal["improving", "stable", "declining", "insufficient_data"]
    hba1c_latest: float | None = None
    adherence_summary: dict
