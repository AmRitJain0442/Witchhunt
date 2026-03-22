"""
AI session router — main conversation endpoint powered by Claude.
The client sends the decrypted .kutumb memory file + user message.
Claude returns an AI response + structured memory patches.
"""
import json
import logging
import time
import uuid
from datetime import datetime, timezone

from anthropic import AsyncAnthropic
from fastapi import APIRouter

from app.config import get_settings
from app.dependencies import CurrentUserDep
from app.models.session import (
    AIResponseContent,
    FiredTrigger,
    SessionRequest,
    SessionResponse,
    TriggerEvaluateRequest,
    TriggerEvaluateResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()

_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are Kutumb, a trusted AI health companion for Indian families.
You receive the user's complete health memory as a JSON object (HealthContext) and their message.

Your responsibilities:
1. Answer health questions warmly, clearly, and in culturally appropriate language.
2. Return memory patches so the app can update the user's local health file.
3. Evaluate trigger rules from the memory file against any new data mentioned.

CRITICAL OUTPUT FORMAT — you MUST respond with ONLY this JSON structure:
{
  "ai_response": {
    "text": "<your response in plain conversational language>",
    "follow_up_questions": ["<optional follow-up>"],
    "suggested_actions": ["<concrete action>"],
    "urgency_level": "routine" | "moderate" | "urgent" | "emergency"
  },
  "memory_patches": {
    "patch_sequence": <current_sequence + 1>,
    "operations": [
      {
        "op": "update" | "append_to_array" | "add" | "remove" | "merge",
        "path": "<dot.notation.path>",
        "value": <new value>,
        "confidence": <0.0-1.0>,
        "source": "user_stated" | "inferred" | "derived_from_checkin",
        "reason": "<why this patch>"
      }
    ],
    "trigger_evaluations": [
      {
        "trigger_id": "<id>",
        "fired": true|false,
        "action": "<action>",
        "message": "<message with {value} substituted>"
      }
    ],
    "new_triggers": []
  }
}

Rules:
- Always include disclaimer about not being a substitute for medical advice when discussing health conditions.
- Flag urgency_level="urgent" or "emergency" only when genuinely warranted.
- Only create memory patches for information clearly stated or strongly implied by the user.
- Patches with confidence < 0.6 should NOT be included.
- Never fabricate drug interactions not grounded in real pharmacology.
- Be conversational, warm, and practical — avoid overly clinical language.
- Support Hindi-mixed responses if the user writes in Hindi or Hinglish."""


def _build_user_prompt(req: SessionRequest) -> str:
    memory_summary = json.dumps(req.memory_file, default=str, indent=None)
    history_text = ""
    if req.conversation_history:
        history_lines = []
        for turn in req.conversation_history[-6:]:  # Last 3 exchanges
            role = turn.get("role", "user")
            content = turn.get("content", "")
            history_lines.append(f"{role.upper()}: {content}")
        history_text = "\nConversation so far:\n" + "\n".join(history_lines) + "\n"

    return (
        f"Current date: {datetime.now(timezone.utc).date().isoformat()}\n"
        f"Current patch_sequence: {req.memory_file.get('_meta', {}).get('patch_sequence', 0)}\n\n"
        f"Patient's Health Memory:\n{memory_summary}\n"
        f"{history_text}\n"
        f"Patient's message: {req.message}"
    )


def _evaluate_triggers(memory_file: dict, patches: dict) -> list[FiredTrigger]:
    """
    Fast local trigger evaluation for vital_threshold triggers.
    The full evaluation is done by Claude, but we re-check critical ones here
    as a safety net in case Claude misses them.
    """
    fired: list[FiredTrigger] = []
    triggers = memory_file.get("trigger_rules", [])

    # Extract any new vitals from the patches
    new_vitals: dict[str, float] = {}
    for op in patches.get("operations", []):
        path: str = op.get("path", "")
        if "vitals_log" in path and isinstance(op.get("value"), dict):
            val = op["value"]
            if "value" in val:
                metric = path.split(".")[1] if "." in path else "unknown"
                new_vitals[metric] = float(val["value"])

    for trigger in triggers:
        if not trigger.get("enabled", True):
            continue
        if trigger.get("condition_type") != "vital_threshold":
            continue

        condition = trigger.get("condition", {})
        vital_key = condition.get("vital", "")
        if vital_key not in new_vitals:
            continue

        value = new_vitals[vital_key]
        threshold = condition.get("threshold", 0)
        operator = condition.get("operator", "gte")

        fired_flag = (
            (operator == "gte" and value >= threshold) or
            (operator == "lte" and value <= threshold) or
            (operator == "gt" and value > threshold) or
            (operator == "lt" and value < threshold)
        )
        if fired_flag:
            msg = trigger.get("message", "").replace("{value}", str(value))
            escalation = trigger.get("escalation", {})
            sos_active = False
            if escalation:
                sos_thresh = escalation.get("sos_threshold")
                if sos_thresh and (
                    (operator in ("gte", "gt") and value >= sos_thresh) or
                    (operator in ("lte", "lt") and value <= sos_thresh)
                ):
                    sos_active = True
                    msg = escalation.get("sos_message", msg).replace("{value}", str(value))

            fired.append(FiredTrigger(
                trigger_id=trigger["id"],
                trigger_name=trigger.get("name", ""),
                fired=True,
                action="sos" if sos_active else trigger.get("action", "warn"),
                severity=trigger.get("severity", "medium"),
                message=msg,
                sos_active=sos_active,
            ))

    return fired


@router.post("", response_model=SessionResponse)
async def run_session(req: SessionRequest, current_user: CurrentUserDep):
    start_ms = int(time.time() * 1000)

    try:
        response = await _client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _build_user_prompt(req)}],
        )
        raw = response.content[0].text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error("Claude returned invalid JSON in session %s: %s", req.session_id, e)
        result = {
            "ai_response": {
                "text": "I encountered an issue processing your request. Please try again.",
                "follow_up_questions": [],
                "suggested_actions": [],
                "urgency_level": "routine",
            },
            "memory_patches": {
                "patch_sequence": req.memory_file.get("_meta", {}).get("patch_sequence", 0),
                "operations": [],
                "trigger_evaluations": [],
                "new_triggers": [],
            },
        }
    except Exception as e:
        logger.error("Claude API error in session %s: %s", req.session_id, e)
        raise

    ai_resp = result.get("ai_response", {})
    patches = result.get("memory_patches", {})

    # Add session metadata to patches
    patches["session_id"] = req.session_id
    patches["generated_at"] = datetime.now(timezone.utc).isoformat()

    # Safety-net trigger evaluation
    extra_triggers = _evaluate_triggers(req.memory_file, patches)

    # Merge Claude's trigger evaluations with our safety-net ones
    claude_trigger_ids = {t.get("trigger_id") for t in patches.get("trigger_evaluations", [])}
    for t in extra_triggers:
        if t.trigger_id not in claude_trigger_ids:
            patches.setdefault("trigger_evaluations", []).append({
                "trigger_id": t.trigger_id,
                "fired": True,
                "action": t.action,
                "message": t.message,
            })

    elapsed_ms = int(time.time() * 1000) - start_ms

    return SessionResponse(
        session_id=req.session_id,
        ai_response=AIResponseContent(
            text=ai_resp.get("text", ""),
            follow_up_questions=ai_resp.get("follow_up_questions", []),
            suggested_actions=ai_resp.get("suggested_actions", []),
            urgency_level=ai_resp.get("urgency_level", "routine"),
        ),
        memory_patches=patches,
        triggered_alerts=extra_triggers,
        processing_time_ms=elapsed_ms,
    )
