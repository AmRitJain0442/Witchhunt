from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.core.enums import WearablePlatform


class WearableDataPoint(BaseModel):
    metric: Literal[
        "steps", "heart_rate", "resting_heart_rate", "spo2",
        "sleep_duration", "sleep_stages", "calories_burned",
        "active_minutes", "hrv", "blood_pressure", "weight"
    ]
    value: float
    unit: str
    recorded_at: datetime
    source_device: str | None = None


class WearableSyncRequest(BaseModel):
    platform: WearablePlatform
    data_points: list[WearableDataPoint] = []   # For Apple Health push
    sync_date: date                              # Target date for Google Fit pull


class WearableSyncResponse(BaseModel):
    platform: WearablePlatform
    sync_date: date
    records_synced: int
    records_failed: int
    last_sync_at: datetime
    metrics_updated: list[str]
    triggered_score_recompute: bool


class WearablePlatformStatus(BaseModel):
    platform: WearablePlatform
    connected: bool
    last_synced_at: datetime | None = None
    sync_errors: list[str] = []
    metrics_available: list[str] = []


class WearableStatusResponse(BaseModel):
    platforms: list[WearablePlatformStatus]


class WearableConnectResponse(BaseModel):
    platform: WearablePlatform
    auth_url: str | None = None
    instructions: str
    is_sdk_based: bool


class DailyWearableData(BaseModel):
    date: date
    steps: int | None = None
    resting_heart_rate: float | None = None
    avg_heart_rate: float | None = None
    spo2_avg: float | None = None
    sleep_hours: float | None = None
    calories_burned: int | None = None
    active_minutes: int | None = None
    hrv_ms: float | None = None
    source: WearablePlatform | None = None


class WearableDataResponse(BaseModel):
    data: list[DailyWearableData]
    period_averages: dict
