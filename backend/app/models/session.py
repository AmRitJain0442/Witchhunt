from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ClientContext(BaseModel):
    timestamp: datetime
    timezone: str = "Asia/Kolkata"
    app_version: str = "1.0.0"
    platform: Literal["ios", "android", "web"] = "android"


class AIResponseContent(BaseModel):
    text: str
    follow_up_questions: list[str] = []
    suggested_actions: list[str] = []
    urgency_level: Literal["routine", "moderate", "urgent", "emergency"] = "routine"


class FiredTrigger(BaseModel):
    trigger_id: str
    trigger_name: str
    fired: bool
    action: str
    severity: str
    message: str
    sos_active: bool = False


class SessionRequest(BaseModel):
    session_id: str
    user_id_hash: str               # sha256 of phone — no reversible PII on server
    memory_file: dict               # Full decrypted .kutumb contents
    message: str
    conversation_history: list[dict] = []
    client_context: ClientContext


class SessionResponse(BaseModel):
    session_id: str
    ai_response: AIResponseContent
    memory_patches: dict            # Full PatchEnvelope dict
    triggered_alerts: list[FiredTrigger] = []
    processing_time_ms: int


class OnboardRequest(BaseModel):
    onboard_session_id: str
    user_id_hash: str
    stage: str
    stage_index: int
    total_stages: int = 7
    message: str
    partial_memory: dict            # Memory built so far (empty dict on first call)
    conversation_history: list[dict] = []
    client_context: ClientContext


class OnboardResponse(BaseModel):
    onboard_session_id: str
    stage: str
    stage_complete: bool
    next_stage: str | None = None
    all_stages_complete: bool = False
    ai_response: AIResponseContent
    memory_patches: dict
    stage_progress_pct: int = 0


class CompressRequest(BaseModel):
    memory_file: dict
    keep_recent_sessions: int = 10


class CompressResponse(BaseModel):
    patches: list[dict]
    bytes_saved_estimate: int


class ValidateResponse(BaseModel):
    valid: bool
    schema_version: str
    errors: list[dict] = []
    warnings: list[dict] = []
    consistency_issues: list[dict] = []
    file_size_bytes: int
    compression_recommended: bool


class TriggerEvaluationContext(BaseModel):
    new_vital: dict | None = None
    new_symptom: str | None = None
    new_medication_being_added: str | None = None
    new_food_mentioned: str | None = None


class TriggerEvaluateRequest(BaseModel):
    memory_file: dict
    evaluation_context: TriggerEvaluationContext


class TriggerEvaluateResponse(BaseModel):
    evaluated_at: datetime
    fired_triggers: list[FiredTrigger] = []
    sos_active: bool = False
    all_clear: bool = True
