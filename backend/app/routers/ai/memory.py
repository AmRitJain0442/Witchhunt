"""
Memory management endpoints — compress, validate, and evaluate triggers.
"""
import json
import logging
from datetime import datetime, timezone

from anthropic import AsyncAnthropic
from fastapi import APIRouter

from app.config import get_settings
from app.dependencies import CurrentUserDep
from app.models.session import (
    CompressRequest,
    CompressResponse,
    FiredTrigger,
    TriggerEvaluateRequest,
    TriggerEvaluateResponse,
    ValidateResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()
_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

_REQUIRED_IDENTITY_FIELDS = ["display_name", "date_of_birth", "biological_sex", "height_cm", "weight_kg"]

COMPRESS_SYSTEM = """You are a medical summarization assistant.
You receive a user's health memory file. Your job:
1. Compress the session_memory.last_10_sessions into a rich 3-5 sentence paragraph for session_memory.compressed_history.summary
2. Return ONLY JSON patches to:
   - Update session_memory.compressed_history with the new summary and version incremented
   - Trim session_memory.last_10_sessions to the most recent {keep} entries
3. Return JSON: {"patches": [{"op": ..., "path": ..., "value": ...}], "bytes_saved_estimate": <int>}"""


@router.post("/compress", response_model=CompressResponse)
async def compress_memory(req: CompressRequest, current_user: CurrentUserDep):
    session_memory = req.memory_file.get("session_memory", {})
    all_sessions = session_memory.get("last_10_sessions", [])
    old_compressed = session_memory.get("compressed_history", {}).get("summary", "")

    prompt = (
        f"Existing compressed summary:\n{old_compressed}\n\n"
        f"All sessions to compress:\n{json.dumps(all_sessions, default=str)}\n\n"
        f"Keep the most recent {req.keep_recent_sessions} sessions verbatim.\n"
        f"Compress the rest into an updated summary paragraph.\n"
        f"Return JSON: {{\"patches\": [...], \"bytes_saved_estimate\": <int>}}"
    )

    try:
        response = await _client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            system=COMPRESS_SYSTEM.format(keep=req.keep_recent_sessions),
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
        return CompressResponse(
            patches=result.get("patches", []),
            bytes_saved_estimate=result.get("bytes_saved_estimate", 0),
        )
    except Exception as e:
        logger.error("Memory compression failed: %s", e)
        return CompressResponse(patches=[], bytes_saved_estimate=0)


@router.post("/validate", response_model=ValidateResponse)
async def validate_memory(memory_file: dict, current_user: CurrentUserDep):
    errors: list[dict] = []
    warnings: list[dict] = []
    consistency_issues: list[dict] = []

    # Check required identity fields
    identity = memory_file.get("identity", {})
    for field in _REQUIRED_IDENTITY_FIELDS:
        if not identity.get(field):
            errors.append({"path": f"identity.{field}", "code": "MISSING_FIELD", "field": field})

    # Check for overdue screenings
    screenings = memory_file.get("medical_history", {}).get("screenings", [])
    from datetime import date
    today = date.today()
    for screening in screenings:
        next_due_str = screening.get("next_due")
        if next_due_str:
            try:
                next_due = date.fromisoformat(next_due_str)
                if next_due < today:
                    warnings.append({
                        "path": f"medical_history.screenings[{screening.get('test')}]",
                        "code": "OVERDUE",
                        "message": f"{screening.get('test')} is overdue (was due {next_due_str})",
                    })
            except ValueError:
                pass

    # Check allergy vs current medication conflicts
    drug_allergies = [a.get("substance", "").lower() for a in memory_file.get("allergies", {}).get("drug", [])]
    current_meds = memory_file.get("medications", {}).get("current", [])
    for med in current_meds:
        med_name = med.get("name", "").lower()
        for allergy in drug_allergies:
            if allergy in med_name or med_name in allergy:
                consistency_issues.append({
                    "code": "ALLERGY_MEDICATION_CONFLICT",
                    "message": f"Possible conflict: {med.get('name')} vs allergy to {allergy}",
                    "severity": "warning",
                })

    file_size = len(json.dumps(memory_file, default=str).encode())
    schema_version = memory_file.get("_meta", {}).get("schema_version", "unknown")

    return ValidateResponse(
        valid=len(errors) == 0,
        schema_version=schema_version,
        errors=errors,
        warnings=warnings,
        consistency_issues=consistency_issues,
        file_size_bytes=file_size,
        compression_recommended=file_size > 150_000,
    )


@router.post("/triggers/evaluate", response_model=TriggerEvaluateResponse)
async def evaluate_triggers(req: TriggerEvaluateRequest, current_user: CurrentUserDep):
    fired_triggers: list[FiredTrigger] = []
    sos_active = False
    ctx = req.evaluation_context

    triggers = req.memory_file.get("trigger_rules", [])

    for trigger in triggers:
        if not trigger.get("enabled", True):
            continue

        ctype = trigger.get("condition_type")
        condition = trigger.get("condition", {})
        fired = False
        current_value: float | None = None

        # vital_threshold
        if ctype == "vital_threshold" and ctx.new_vital:
            vital_type = condition.get("vital", "")
            if ctx.new_vital.get("type") == vital_type:
                current_value = float(ctx.new_vital.get("value", 0))
                threshold = condition.get("threshold", 0)
                operator = condition.get("operator", "gte")
                fired = (
                    (operator == "gte" and current_value >= threshold) or
                    (operator == "lte" and current_value <= threshold) or
                    (operator == "gt" and current_value > threshold) or
                    (operator == "lt" and current_value < threshold)
                )

        # food_conflict
        elif ctype == "food_conflict" and ctx.new_food_mentioned:
            trigger_foods = [f.lower() for f in condition.get("trigger_foods", [])]
            if ctx.new_food_mentioned.lower() in trigger_foods:
                fired = True

        # medicine_interaction
        elif ctype == "medicine_interaction" and ctx.new_medication_being_added:
            blocked = [d.lower() for d in condition.get("drug_classes_to_block", [])]
            med_lower = ctx.new_medication_being_added.lower()
            fired = any(b in med_lower or med_lower in b for b in blocked)

        # symptom_pattern — check if new symptom matches
        elif ctype == "symptom_pattern" and ctx.new_symptom:
            target = condition.get("symptom", "").lower()
            if target in ctx.new_symptom.lower():
                # Would need to count occurrences; for now just flag once
                fired = True

        if fired:
            val_str = str(current_value) if current_value is not None else ""
            message = trigger.get("message", "").replace("{value}", val_str)

            escalation = trigger.get("escalation", {})
            trigger_sos = False
            if escalation and current_value is not None:
                sos_thresh = escalation.get("sos_threshold")
                sos_val_thresh = escalation.get("sos_threshold_systolic")
                check_thresh = sos_thresh or sos_val_thresh
                if check_thresh:
                    operator = condition.get("operator", "gte")
                    trigger_sos = (
                        (operator in ("gte", "gt") and current_value >= check_thresh) or
                        (operator in ("lte", "lt") and current_value <= check_thresh)
                    )
                if trigger_sos:
                    message = escalation.get("sos_message", message).replace("{value}", val_str)
                    sos_active = True

            action = "sos" if trigger_sos else trigger.get("action", "warn")
            fired_triggers.append(FiredTrigger(
                trigger_id=trigger["id"],
                trigger_name=trigger.get("name", ""),
                fired=True,
                action=action,
                severity=trigger.get("severity", "medium"),
                message=message,
                sos_active=trigger_sos,
            ))

    return TriggerEvaluateResponse(
        evaluated_at=datetime.now(timezone.utc),
        fired_triggers=fired_triggers,
        sos_active=sos_active,
        all_clear=len(fired_triggers) == 0,
    )
