import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from anthropic import AsyncAnthropic
from google.cloud.firestore import AsyncClient

from app.models.insights import (
    Advisory,
    DrugAllergyAlert,
    DrugConditionWarning,
    DrugDrugInteraction,
    DrugLabWarning,
    ExerciseContraindication,
    ExerciseItem,
    ExerciseSuggestionResponse,
    FoodDrugInteraction,
    FoodInteractionSummaryResponse,
    HealthAdvisoryResponse,
    InteractionCheckRequest,
    InteractionCheckResponse,
    MedicineCabinetAuditResponse,
)
from app.services.health_context_service import build_health_context

_anthropic_client = AsyncAnthropic()

SYSTEM_PROMPT = """You are a clinical health assistant AI for the Kutumb health app serving Indian families.
You receive a structured HealthContext JSON containing the user's full medical profile.
Rules:
- Always respond in valid JSON matching the requested schema exactly.
- Always include a disclaimer that this is not a substitute for medical advice.
- Flag must_consult_doctor=True for severity "severe" or "contraindicated" findings.
- Never invent drug interactions not grounded in pharmacology.
- When uncertain, err on caution and recommend doctor consultation.
- Be culturally sensitive to Indian dietary patterns and healthcare context."""

HARD_CONTRAINDICATIONS: dict[str, list[str]] = {
    "hypertension": ["high_intensity"],
    "heart_failure": ["high_intensity", "moderate"],
    "pain_level_severe": ["strength", "high_intensity"],
    "spo2_low": ["cardio", "high_intensity"],
    "low_energy": ["high_intensity"],
}

_MODEL = "claude-sonnet-4-6"
_CACHE_TTL_HOURS = 24


async def _get_cached_insight(uid: str, cache_key: str, db: AsyncClient) -> dict | None:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("insight_cache")
        .document(cache_key)
        .get()
    )
    if not doc.exists:
        return None
    data = doc.to_dict()
    cached_at: datetime | None = data.get("cached_at")
    if cached_at is None:
        return None
    if isinstance(cached_at, str):
        cached_at = datetime.fromisoformat(cached_at)
    if cached_at.tzinfo is None:
        cached_at = cached_at.replace(tzinfo=timezone.utc)
    if (datetime.now(timezone.utc) - cached_at) > timedelta(hours=_CACHE_TTL_HOURS):
        return None
    return data.get("payload")


async def _set_cached_insight(
    uid: str, cache_key: str, payload: dict, db: AsyncClient
) -> None:
    now = datetime.now(timezone.utc)
    await (
        db.collection("users")
        .document(uid)
        .collection("insight_cache")
        .document(cache_key)
        .set({"cached_at": now, "payload": payload})
    )


async def _call_claude(system: str, user_message: str) -> str:
    response = await _anthropic_client.messages.create(
        model=_MODEL,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


def _safe_parse_json(raw: str) -> dict:
    """Attempt to parse JSON from Claude response; strip markdown fences if present."""
    text = raw.strip()
    if text.startswith("```"):
        # Strip markdown code fences
        lines = text.splitlines()
        text = "\n".join(lines[1:-1]) if len(lines) > 2 else text
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try extracting the first JSON object in the response
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
    return {}


async def check_interactions(
    uid: str, req: InteractionCheckRequest, db: AsyncClient
) -> InteractionCheckResponse:
    context = await build_health_context(uid, db)
    context_json = context.model_dump_json(indent=2)

    prompt = f"""
HealthContext:
{context_json}

Proposed new medicine:
- Name: {req.medicine_name}
- Generic: {req.generic_name or "Unknown"}
- Category: {req.category.value}
- Dose: {req.dose_amount} {req.dose_unit}, {req.doses_per_day}x/day

Check for:
1. Drug-drug interactions with all active medicines
2. Drug-condition warnings based on chronic conditions
3. Allergy alerts based on known allergies
4. Lab-based warnings from flagged biomarkers
5. Food-drug interactions

Respond ONLY with valid JSON matching the exact schema. Include disclaimer field.
Schema:
{{
  "check_id": "string",
  "checked_at": "ISO datetime",
  "proposed_medicine": "string",
  "context_summary": "string",
  "drug_interactions": [...],
  "worst_drug_severity": "mild|moderate|severe|contraindicated|null",
  "condition_warnings": [...],
  "allergy_alerts": [...],
  "lab_warnings": [...],
  "food_interactions": [...],
  "overall_risk": "safe|caution|avoid|contraindicated",
  "safe_to_add": boolean,
  "must_consult_doctor": boolean,
  "summary": "string",
  "disclaimer": "string"
}}
"""

    now = datetime.now(timezone.utc)
    check_id = str(uuid4())

    raw = await _call_claude(SYSTEM_PROMPT, prompt)
    parsed = _safe_parse_json(raw)

    if not parsed:
        # Safe default on parse failure
        result = InteractionCheckResponse(
            check_id=check_id,
            checked_at=now,
            proposed_medicine=req.medicine_name,
            context_summary="Unable to complete analysis — please consult your doctor.",
            drug_interactions=[],
            worst_drug_severity=None,
            condition_warnings=[],
            allergy_alerts=[],
            lab_warnings=[],
            food_interactions=[],
            overall_risk="caution",
            safe_to_add=False,
            must_consult_doctor=True,
            summary="AI analysis failed. Please consult your doctor before adding this medicine.",
            disclaimer="This is not a substitute for medical advice. Consult a qualified doctor.",
        )
    else:
        # Normalise fields
        parsed["check_id"] = check_id
        parsed["checked_at"] = now.isoformat()
        parsed["proposed_medicine"] = req.medicine_name

        try:
            result = InteractionCheckResponse(**parsed)
        except Exception:
            result = InteractionCheckResponse(
                check_id=check_id,
                checked_at=now,
                proposed_medicine=req.medicine_name,
                context_summary=parsed.get("context_summary", ""),
                drug_interactions=[],
                worst_drug_severity=parsed.get("worst_drug_severity"),
                condition_warnings=[],
                allergy_alerts=[],
                lab_warnings=[],
                food_interactions=[],
                overall_risk=parsed.get("overall_risk", "caution"),
                safe_to_add=parsed.get("safe_to_add", False),
                must_consult_doctor=True,
                summary=parsed.get("summary", ""),
                disclaimer=parsed.get(
                    "disclaimer",
                    "This is not a substitute for medical advice. Consult a qualified doctor.",
                ),
            )

    # Store check result
    await (
        db.collection("users")
        .document(uid)
        .collection("interaction_checks")
        .document(check_id)
        .set(result.model_dump(mode="json"))
    )

    return result


async def generate_exercise_suggestions(
    uid: str, db: AsyncClient, force_refresh: bool = False
) -> ExerciseSuggestionResponse:
    cache_key = "exercise_suggestions"
    now = datetime.now(timezone.utc)

    if not force_refresh:
        cached = await _get_cached_insight(uid, cache_key, db)
        if cached:
            try:
                resp = ExerciseSuggestionResponse(**cached)
                resp = resp.model_copy(update={"cache_hit": True})
                return resp
            except Exception:
                pass

    context = await build_health_context(uid, db)
    context_json = context.model_dump_json(indent=2)

    # Determine hard contraindications
    contraindication_notes: list[str] = []
    conditions_lower = [c.lower() for c in context.chronic_conditions]

    if "hypertension" in conditions_lower or "high blood pressure" in conditions_lower:
        contraindication_notes.append(
            "hypertension: avoid high_intensity exercises"
        )
    if "heart failure" in conditions_lower or "congestive heart failure" in conditions_lower:
        contraindication_notes.append(
            "heart_failure: avoid high_intensity and moderate intensity exercises"
        )
    if context.avg_pain_level_7d is not None and context.avg_pain_level_7d >= 7:
        contraindication_notes.append(
            "pain_level_severe: avoid strength and high_intensity exercises"
        )
    if context.latest_vitals.get("spo2") is not None and context.latest_vitals["spo2"] < 94:
        contraindication_notes.append(
            "spo2_low: avoid cardio and high_intensity exercises"
        )
    if context.avg_energy_level_7d is not None and context.avg_energy_level_7d <= 3:
        contraindication_notes.append(
            "low_energy: avoid high_intensity exercises"
        )

    contraindications_str = (
        "\n".join(f"  - {c}" for c in contraindication_notes)
        if contraindication_notes
        else "  None detected"
    )

    prompt = f"""
HealthContext:
{context_json}

Hard Contraindications detected (MUST be enforced):
{contraindications_str}

Generate a personalised exercise plan for this user. Consider:
- Their chronic conditions and current health scores
- Recent symptoms, pain levels, energy levels
- Active medicines that may affect exercise tolerance
- Cultural context: Indian family setting, home-friendly exercises preferred

Respond ONLY with valid JSON matching the exact schema. Include disclaimer field.
Schema:
{{
  "uid": "string",
  "generated_at": "ISO datetime",
  "cache_hit": false,
  "context_summary": "string",
  "recommended": [
    {{
      "name": "string",
      "category": "cardio|strength|flexibility|breathing|balance|yoga|rest",
      "intensity": "very_low|low|moderate|high",
      "duration_minutes": integer,
      "frequency_per_week": integer,
      "instructions": "string",
      "benefits_for_user": ["string"],
      "precautions": ["string"],
      "avoid_if": ["string"]
    }}
  ],
  "avoid_entirely": ["string"],
  "contraindications": [
    {{
      "reason": "string",
      "restricted_categories": ["string"],
      "temporary": boolean,
      "suggested_alternative": "string"
    }}
  ],
  "weekly_plan": {{"Monday": [...], "Tuesday": [...], ...}},
  "notes_from_context": ["string"],
  "should_consult_doctor": boolean,
  "consult_reason": "string or null"
}}
"""

    raw = await _call_claude(SYSTEM_PROMPT, prompt)
    parsed = _safe_parse_json(raw)

    if not parsed:
        result = ExerciseSuggestionResponse(
            uid=uid,
            generated_at=now,
            cache_hit=False,
            context_summary="Unable to generate exercise plan. Please consult your doctor.",
            recommended=[],
            avoid_entirely=[],
            contraindications=[],
            weekly_plan={},
            notes_from_context=["AI analysis temporarily unavailable."],
            should_consult_doctor=True,
            consult_reason="Exercise plan generation failed; medical guidance recommended.",
        )
    else:
        parsed["uid"] = uid
        parsed["generated_at"] = now.isoformat()
        parsed["cache_hit"] = False
        try:
            result = ExerciseSuggestionResponse(**parsed)
        except Exception:
            result = ExerciseSuggestionResponse(
                uid=uid,
                generated_at=now,
                cache_hit=False,
                context_summary=parsed.get("context_summary", ""),
                recommended=[],
                avoid_entirely=parsed.get("avoid_entirely", []),
                contraindications=[],
                weekly_plan={},
                notes_from_context=parsed.get("notes_from_context", []),
                should_consult_doctor=True,
                consult_reason="Please verify exercise plan with your doctor.",
            )

    # Store in cache
    await _set_cached_insight(uid, cache_key, result.model_dump(mode="json"), db)

    return result


async def get_cabinet_warnings(uid: str, db: AsyncClient) -> MedicineCabinetAuditResponse:
    cache_key = "cabinet_warnings"
    now = datetime.now(timezone.utc)

    cached = await _get_cached_insight(uid, cache_key, db)
    if cached:
        try:
            return MedicineCabinetAuditResponse(**cached)
        except Exception:
            pass

    context = await build_health_context(uid, db)
    context_json = context.model_dump_json(indent=2)

    medicine_names = [m.name for m in context.active_medicines]

    prompt = f"""
HealthContext:
{context_json}

Active medicines: {', '.join(medicine_names) or 'None'}

Perform a full medicine cabinet audit:
1. Check ALL pairwise drug-drug interactions between active medicines
2. Check dosage alerts (renal/hepatic caution from flagged biomarkers, age-related dosing)
3. Combined food warnings for ALL active medicines
4. Overall cabinet risk level

Respond ONLY with valid JSON matching the exact schema. Include disclaimer field.
Schema:
{{
  "audited_at": "ISO datetime",
  "active_medicine_count": integer,
  "pairwise_interactions": [...DrugDrugInteraction objects...],
  "worst_active_interaction": "mild|moderate|severe|contraindicated|null",
  "dosage_alerts": [...DosageAlert objects...],
  "combined_food_warnings": [...FoodDrugInteraction objects...],
  "cabinet_risk_level": "low|moderate|high",
  "urgent_action_count": integer,
  "summary": "string",
  "disclaimer": "string"
}}
"""

    raw = await _call_claude(SYSTEM_PROMPT, prompt)
    parsed = _safe_parse_json(raw)

    if not parsed:
        result = MedicineCabinetAuditResponse(
            audited_at=now,
            active_medicine_count=len(context.active_medicines),
            pairwise_interactions=[],
            worst_active_interaction=None,
            dosage_alerts=[],
            combined_food_warnings=[],
            cabinet_risk_level="low",
            urgent_action_count=0,
            summary="Unable to complete audit. Please consult your doctor.",
            disclaimer="This is not a substitute for medical advice. Consult a qualified doctor.",
        )
    else:
        parsed["audited_at"] = now.isoformat()
        parsed["active_medicine_count"] = len(context.active_medicines)
        try:
            result = MedicineCabinetAuditResponse(**parsed)
        except Exception:
            result = MedicineCabinetAuditResponse(
                audited_at=now,
                active_medicine_count=len(context.active_medicines),
                pairwise_interactions=[],
                worst_active_interaction=parsed.get("worst_active_interaction"),
                dosage_alerts=[],
                combined_food_warnings=[],
                cabinet_risk_level=parsed.get("cabinet_risk_level", "low"),
                urgent_action_count=parsed.get("urgent_action_count", 0),
                summary=parsed.get("summary", ""),
                disclaimer=parsed.get(
                    "disclaimer",
                    "This is not a substitute for medical advice. Consult a qualified doctor.",
                ),
            )

    await _set_cached_insight(uid, cache_key, result.model_dump(mode="json"), db)
    return result


async def get_food_interactions(uid: str, db: AsyncClient) -> FoodInteractionSummaryResponse:
    cache_key = "food_interactions"
    now = datetime.now(timezone.utc)

    cached = await _get_cached_insight(uid, cache_key, db)
    if cached:
        try:
            return FoodInteractionSummaryResponse(**cached)
        except Exception:
            pass

    context = await build_health_context(uid, db)
    context_json = context.model_dump_json(indent=2)

    prompt = f"""
HealthContext:
{context_json}

Generate a comprehensive food interaction summary for all active medicines.
Consider Indian dietary patterns (dal, rice, roti, chai, spices, etc.).

Respond ONLY with valid JSON matching the exact schema. Include disclaimer field.
Schema:
{{
  "generated_at": "ISO datetime",
  "active_medicine_count": integer,
  "avoid_entirely": [...FoodWarning objects...],
  "consume_with_caution": [...FoodWarning objects...],
  "meal_timing_advice": [...MealTimingAdvice objects...],
  "condition_food_advice": [
    {{"condition": "string", "advice": "string", "foods_to_avoid": ["string"], "foods_to_prefer": ["string"]}}
  ],
  "top_3_avoid": ["string"],
  "disclaimer": "string"
}}
"""

    raw = await _call_claude(SYSTEM_PROMPT, prompt)
    parsed = _safe_parse_json(raw)

    if not parsed:
        result = FoodInteractionSummaryResponse(
            generated_at=now,
            active_medicine_count=len(context.active_medicines),
            avoid_entirely=[],
            consume_with_caution=[],
            meal_timing_advice=[],
            condition_food_advice=[],
            top_3_avoid=[],
            disclaimer="This is not a substitute for medical advice. Consult a qualified doctor.",
        )
    else:
        parsed["generated_at"] = now.isoformat()
        parsed["active_medicine_count"] = len(context.active_medicines)
        try:
            result = FoodInteractionSummaryResponse(**parsed)
        except Exception:
            result = FoodInteractionSummaryResponse(
                generated_at=now,
                active_medicine_count=len(context.active_medicines),
                avoid_entirely=[],
                consume_with_caution=[],
                meal_timing_advice=[],
                condition_food_advice=parsed.get("condition_food_advice", []),
                top_3_avoid=parsed.get("top_3_avoid", []),
                disclaimer=parsed.get(
                    "disclaimer",
                    "This is not a substitute for medical advice. Consult a qualified doctor.",
                ),
            )

    await _set_cached_insight(uid, cache_key, result.model_dump(mode="json"), db)
    return result


async def generate_advisories(
    uid: str, db: AsyncClient, force_refresh: bool = False
) -> HealthAdvisoryResponse:
    cache_key = "advisories"
    now = datetime.now(timezone.utc)

    if not force_refresh:
        cached = await _get_cached_insight(uid, cache_key, db)
        if cached:
            try:
                resp = HealthAdvisoryResponse(**cached)
                resp = resp.model_copy(update={"cache_hit": True})
                return resp
            except Exception:
                pass

    context = await build_health_context(uid, db)
    context_json = context.model_dump_json(indent=2)

    prompt = f"""
HealthContext:
{context_json}

Generate personalised health advisories for this user. Include advisories for:
- Concerning trends in vitals, symptoms, or lab results
- Medicine adherence or timing issues
- Lifestyle factors (sleep, stress, hydration)
- Seasonal or condition-specific guidance
- Lab follow-up recommendations

Respond ONLY with valid JSON matching the exact schema. Include disclaimer field.
Schema:
{{
  "generated_at": "ISO datetime",
  "cache_hit": false,
  "urgent_count": integer,
  "advisories": [
    {{
      "advisory_id": "string (uuid)",
      "type": "trend_alert|symptom_pattern|medicine_timing|lab_followup|condition_management|seasonal|hydration|sleep_debt|medication_review",
      "severity": "info|warning|urgent",
      "title": "string",
      "body": "string",
      "evidence": ["string"],
      "suggested_actions": ["string"],
      "related_organ": "heart|brain|gut|lungs|null",
      "related_medicine_id": "string|null",
      "expires_at": "ISO datetime (48h from now for urgent, 7d for others)",
      "is_dismissed": false
    }}
  ],
  "context_data_used": ["string"]
}}
"""

    raw = await _call_claude(SYSTEM_PROMPT, prompt)
    parsed = _safe_parse_json(raw)

    if not parsed:
        result = HealthAdvisoryResponse(
            generated_at=now,
            cache_hit=False,
            urgent_count=0,
            advisories=[],
            context_data_used=[],
        )
    else:
        parsed["generated_at"] = now.isoformat()
        parsed["cache_hit"] = False

        # Ensure each advisory has a valid advisory_id
        for advisory in parsed.get("advisories", []):
            if not advisory.get("advisory_id"):
                advisory["advisory_id"] = str(uuid4())
            if not advisory.get("expires_at"):
                days = 2 if advisory.get("severity") == "urgent" else 7
                advisory["expires_at"] = (now + timedelta(days=days)).isoformat()

        try:
            result = HealthAdvisoryResponse(**parsed)
        except Exception:
            result = HealthAdvisoryResponse(
                generated_at=now,
                cache_hit=False,
                urgent_count=0,
                advisories=[],
                context_data_used=parsed.get("context_data_used", []),
            )

    await _set_cached_insight(uid, cache_key, result.model_dump(mode="json"), db)
    return result
