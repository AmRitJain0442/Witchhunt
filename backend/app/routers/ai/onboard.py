"""
Onboarding router — 7-stage conversation that builds the local .kutumb memory
file from scratch through a guided chat.
"""
import json
import logging
import time

from anthropic import AsyncAnthropic
from fastapi import APIRouter

from app.config import get_settings
from app.dependencies import CurrentUserDep
from app.models.session import AIResponseContent, OnboardRequest, OnboardResponse

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()
_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

STAGES = [
    "welcome",
    "demographics",
    "medical_history",
    "medications",
    "allergies",
    "lifestyle",
    "family_goals",
    "finalize",
]

STAGE_SYSTEM_PROMPTS: dict[str, str] = {
    "welcome": """You are Kutumb, a warm and friendly health companion. This is the user's first time.
Welcome them briefly and ask for their language preference and preferred name.
Be warm, not clinical. Keep it short (2-3 sentences max).""",

    "demographics": """You are collecting basic demographic information for a health profile.
Ask naturally about: full name, age/date of birth, gender, height, weight, city, occupation, marital status.
Don't ask all at once — have a natural conversation. Extract what you can from each response.
When you have name, age, gender, city collected, mark stage_complete: true.""",

    "medical_history": """You are collecting medical history.
Ask about: known diagnosed conditions (diabetes, hypertension, thyroid, etc.), past surgeries or hospitalizations,
current vaccination status, and any ongoing health screenings (like HbA1c checks).
Be empathetic. When you have a clear picture of conditions and major history, mark stage_complete: true.""",

    "medications": """You are collecting medication information.
Ask about: current medicines (name, dose, how often), supplements and vitamins, medicines taken as needed (like paracetamol),
any past medicines they stopped and why. Also ask about adherence — do they ever miss doses?
When you have their medicine list, mark stage_complete: true.""",

    "allergies": """You are collecting allergy information.
Ask about: drug allergies (especially antibiotics, NSAIDs, sulfa drugs), food allergies (shellfish, peanuts, dairy, etc.),
and environmental allergies (dust, pollen, pets). For each, ask what the reaction was and how severe.
When you have a clear allergy picture, mark stage_complete: true.""",

    "lifestyle": """You are collecting lifestyle information.
Ask about: diet (vegetarian? what do they eat regularly?), exercise habits, sleep (hours, quality, problems),
stress levels and sources, water intake, caffeine, alcohol, tobacco use.
Make it feel like a friendly conversation, not a questionnaire.
When you have a solid lifestyle picture, mark stage_complete: true.""",

    "family_goals": """You are collecting family medical history and health goals.
Ask about: parents' health conditions, grandparents' causes of death if known, siblings' health issues.
Also ask: what health goals do they have? What do they want the app to help them with?
When you have family history and at least one goal, mark stage_complete: true.""",

    "finalize": """You are finalizing the health profile.
Summarize what you've learned about the user in 3-4 sentences.
Tell them their initial trigger rules have been set up based on their profile.
Welcome them to Kutumb and tell them they can start their daily health check-ins.
Always mark stage_complete: true and all_stages_complete: true.""",
}

RESPONSE_FORMAT = """
You MUST respond with ONLY this JSON:
{
  "ai_response": {
    "text": "<your conversational message>",
    "follow_up_questions": [],
    "suggested_actions": [],
    "urgency_level": "routine"
  },
  "stage_complete": true | false,
  "stage_progress_pct": <0-100>,
  "memory_patches": {
    "patch_sequence": <number>,
    "operations": [
      {
        "op": "update" | "append_to_array" | "add",
        "path": "<dot.notation.path>",
        "value": <value>,
        "confidence": <0.0-1.0>,
        "source": "user_stated" | "inferred",
        "reason": "<brief reason>"
      }
    ],
    "trigger_evaluations": [],
    "new_triggers": <array of trigger objects, only for finalize stage>
  }
}

Memory file paths to use:
- identity.display_name, identity.date_of_birth, identity.biological_sex, identity.age_years
- identity.height_cm, identity.weight_kg, identity.occupation, identity.city
- medical_history.chronic_conditions (array of {id, name, icd10_code, status, severity})
- medical_history.surgeries (array), medical_history.hospitalizations (array)
- medications.current (array of {id, name, dose, frequency, timing, prescribed_by, condition_treated})
- medications.supplements (array), medications.prn_medications (array)
- allergies.drug (array of {id, substance, reaction_type, severity}), allergies.food, allergies.environmental
- lifestyle.diet.pattern, lifestyle.diet.regular_foods (array), lifestyle.diet.alcohol, lifestyle.diet.caffeine_cups_per_day
- lifestyle.exercise.current_routine (array), lifestyle.sleep.avg_hours_per_night, lifestyle.sleep.quality_self_rating
- lifestyle.stress.current_level, lifestyle.stress.primary_sources
- family_history.members (array), family_history.hereditary_risk_flags (array)
- health_goals (array of {id, title, category, target_date, status, strategies})
- trigger_rules (array) — only add on finalize stage based on conditions and allergies found
- session_memory.compressed_history.summary — write initial summary on finalize stage

For trigger_rules on finalize, create rules for:
- Each drug allergy → block_medicine_add trigger
- Each food allergy with anaphylaxis → sos trigger
- Each chronic condition → relevant vital_threshold or symptom_pattern triggers
- Each current medicine → missed_doses trigger"""


def _build_onboard_prompt(req: OnboardRequest) -> str:
    stage_prompt = STAGE_SYSTEM_PROMPTS.get(req.stage, "Collect health information.")
    memory_so_far = json.dumps(req.partial_memory, default=str, indent=None)

    history_text = ""
    if req.conversation_history:
        lines = []
        for turn in req.conversation_history[-8:]:
            lines.append(f"{turn.get('role','user').upper()}: {turn.get('content','')}")
        history_text = "\nConversation so far:\n" + "\n".join(lines) + "\n"

    seq = req.partial_memory.get("_meta", {}).get("patch_sequence", 0)

    return (
        f"Stage: {req.stage} (stage {req.stage_index + 1} of {req.total_stages})\n"
        f"Stage goal: {stage_prompt}\n\n"
        f"Current patch_sequence: {seq}\n"
        f"Memory built so far:\n{memory_so_far}\n"
        f"{history_text}\n"
        f"User's message: {req.message}\n\n"
        f"{RESPONSE_FORMAT}"
    )


@router.post("", response_model=OnboardResponse)
async def run_onboard_session(req: OnboardRequest, current_user: CurrentUserDep):
    system_prompt = (
        "You are Kutumb, a warm and caring health companion for Indian families. "
        "You are helping a new user build their health profile through a friendly conversation. "
        "Be warm, empathetic, and conversational — never clinical or interrogating."
    )

    try:
        response = await _client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": _build_onboard_prompt(req)}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
    except Exception as e:
        logger.error("Onboard session error stage=%s: %s", req.stage, e)
        result = {
            "ai_response": {"text": "Could you tell me more?", "follow_up_questions": [], "suggested_actions": [], "urgency_level": "routine"},
            "stage_complete": False,
            "stage_progress_pct": 0,
            "memory_patches": {"patch_sequence": 0, "operations": [], "trigger_evaluations": [], "new_triggers": []},
        }

    stage_complete = result.get("stage_complete", False)
    current_idx = req.stage_index
    all_done = stage_complete and current_idx >= len(STAGES) - 1
    next_stage = STAGES[current_idx + 1] if stage_complete and not all_done else None

    return OnboardResponse(
        onboard_session_id=req.onboard_session_id,
        stage=req.stage,
        stage_complete=stage_complete,
        next_stage=next_stage,
        all_stages_complete=all_done,
        ai_response=AIResponseContent(**result.get("ai_response", {})),
        memory_patches=result.get("memory_patches", {}),
        stage_progress_pct=result.get("stage_progress_pct", 0),
    )
