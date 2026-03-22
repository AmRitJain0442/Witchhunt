from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from google.cloud.firestore import AsyncClient

from app.core.enums import OrganType, ScoreTrend
from app.core.exceptions import NotFoundError, RateLimitError
from app.models.health import (
    HealthScoreHistoryResponse,
    HealthScoresResponse,
    ManualVitalRequest,
    OrganScore,
    RecomputeResponse,
    ScoreComparisonResponse,
    ScoreDataPoint,
    VitalEntryResponse,
    VitalsResponse,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def _trend(current: float, previous: float) -> ScoreTrend:
    diff = current - previous
    if diff > 3:
        return ScoreTrend.IMPROVING
    if diff < -3:
        return ScoreTrend.DECLINING
    return ScoreTrend.STABLE


def _is_normal_range(vital_type: str, primary: float, secondary: float | None) -> tuple[bool, str | None]:
    """Return (is_normal, note)."""
    if vital_type == "blood_pressure":
        sys_ok = 90 <= primary <= 120
        dia_ok = secondary is not None and 60 <= secondary <= 80
        normal = sys_ok and dia_ok
        if not sys_ok:
            note = f"Systolic {primary} outside normal 90-120 mmHg"
        elif not dia_ok:
            note = f"Diastolic {secondary} outside normal 60-80 mmHg"
        else:
            note = "Blood pressure within normal range"
        return normal, note
    if vital_type == "heart_rate":
        normal = 60 <= primary <= 100
        note = None if normal else f"Heart rate {primary} bpm outside normal 60-100 bpm"
        return normal, note
    if vital_type == "spo2":
        normal = primary > 95
        note = None if normal else f"SpO2 {primary}% below normal >95%"
        return normal, note
    if vital_type == "blood_sugar":
        # Treat as fasting range by default
        normal = 70 <= primary <= 99
        note = None if normal else f"Blood sugar {primary} mg/dL outside fasting normal 70-99 mg/dL"
        return normal, note
    # weight, temperature — no universal range
    return True, None


def _avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def _compute_heart_score(checkins: list[dict], vitals_docs: list[dict]) -> tuple[float, list[str], list[str]]:
    score = 70.0
    factors: list[str] = []
    recs: list[str] = []

    hr_values = [
        v["value_primary"]
        for v in vitals_docs
        if v.get("vital_type") == "heart_rate"
    ]
    if hr_values:
        avg_hr = _avg(hr_values)
        if not (60 <= avg_hr <= 80):
            score -= 5
            factors.append(f"Avg resting HR {avg_hr:.0f} bpm outside ideal 60-80")
            recs.append("Aim for resting heart rate between 60-80 bpm through regular aerobic exercise")
        else:
            factors.append(f"Avg resting HR {avg_hr:.0f} bpm within ideal range")

    bp_values = [v for v in vitals_docs if v.get("vital_type") == "blood_pressure"]
    if bp_values:
        avg_sys = _avg([v["value_primary"] for v in bp_values])
        if avg_sys < 120:
            score += 10
            factors.append(f"Avg systolic {avg_sys:.0f} mmHg — optimal")
        elif avg_sys < 130:
            factors.append(f"Avg systolic {avg_sys:.0f} mmHg — elevated")
        elif avg_sys < 140:
            score -= 10
            factors.append(f"Avg systolic {avg_sys:.0f} mmHg — stage 1 hypertension")
            recs.append("Reduce sodium intake and monitor blood pressure regularly")
        else:
            score -= 20
            factors.append(f"Avg systolic {avg_sys:.0f} mmHg — stage 2 hypertension")
            recs.append("Consult a cardiologist about your blood pressure levels")

    stress_values = [c.get("stress_level") for c in checkins if c.get("stress_level") is not None]
    if stress_values:
        avg_stress = _avg([float(s) for s in stress_values])
        if avg_stress > 7:
            score -= 10
            factors.append(f"High avg stress level {avg_stress:.1f}/10")
            recs.append("Practice stress reduction techniques such as meditation or deep breathing")

    cardiac_symptoms = {"chest_pain", "palpitations", "shortness_of_breath"}
    for c in checkins:
        syms = set(c.get("symptoms", []))
        if syms & cardiac_symptoms:
            score -= 15
            factors.append("Cardiac symptoms reported in recent check-ins")
            recs.append("Seek medical evaluation for cardiac symptoms")
            break

    return _clamp(score), factors, recs


def _compute_brain_score(checkins: list[dict]) -> tuple[float, list[str], list[str]]:
    score = 70.0
    factors: list[str] = []
    recs: list[str] = []

    sleep_hours = [float(c["sleep_hours"]) for c in checkins if c.get("sleep_hours") is not None]
    if sleep_hours:
        avg_sleep = _avg(sleep_hours)
        if 7 <= avg_sleep <= 9:
            score += 15
            factors.append(f"Avg sleep {avg_sleep:.1f} hrs — optimal")
        elif 6 <= avg_sleep < 7:
            factors.append(f"Avg sleep {avg_sleep:.1f} hrs — slightly low")
            recs.append("Try to get 7-9 hours of sleep per night")
        elif avg_sleep < 6:
            score -= 15
            factors.append(f"Avg sleep {avg_sleep:.1f} hrs — insufficient")
            recs.append("Sleep deprivation is affecting brain health; prioritize 7-9 hours")
        else:  # > 9
            score -= 5
            factors.append(f"Avg sleep {avg_sleep:.1f} hrs — excessive sleep")
            recs.append("Excessive sleep may indicate an underlying issue; consult a doctor")

    sleep_quality = [float(c["sleep_quality"]) for c in checkins if c.get("sleep_quality") is not None]
    if sleep_quality:
        avg_quality = _avg(sleep_quality)
        if avg_quality >= 4:
            score += 10
            factors.append(f"Avg sleep quality {avg_quality:.1f}/5 — good")
        elif avg_quality >= 3:
            factors.append(f"Avg sleep quality {avg_quality:.1f}/5 — fair")
        else:
            score -= 10
            factors.append(f"Avg sleep quality {avg_quality:.1f}/5 — poor")
            recs.append("Improve sleep hygiene: consistent sleep schedule, dark room, no screens before bed")

    stress_values = [float(c["stress_level"]) for c in checkins if c.get("stress_level") is not None]
    if stress_values:
        avg_stress = _avg(stress_values)
        if avg_stress > 7:
            score -= 10
            factors.append(f"High avg stress level {avg_stress:.1f}/10")
            recs.append("High stress is impacting brain health; consider mindfulness or therapy")

    for c in checkins:
        if "headache" in c.get("symptoms", []):
            score -= 10
            factors.append("Headaches reported in recent check-ins")
            recs.append("Track headache triggers and discuss with a doctor if persistent")
            break

    return _clamp(score), factors, recs


def _compute_gut_score(checkins: list[dict]) -> tuple[float, list[str], list[str]]:
    score = 70.0
    factors: list[str] = []
    recs: list[str] = []

    bowel_days = sum(1 for c in checkins if c.get("bowel_movement") is True)
    if bowel_days >= 5:
        score += 10
        factors.append(f"Regular bowel movements ({bowel_days}/7 days)")
    else:
        factors.append(f"Infrequent bowel movements ({bowel_days}/7 days)")
        recs.append("Increase fiber and water intake to improve bowel regularity")

    water_values = [float(c["water_intake_ml"]) for c in checkins if c.get("water_intake_ml") is not None]
    if water_values:
        avg_water = _avg(water_values)
        if avg_water > 2000:
            score += 10
            factors.append(f"Good avg hydration {avg_water:.0f} ml/day")
        else:
            factors.append(f"Low avg hydration {avg_water:.0f} ml/day")
            recs.append("Aim for at least 2000 ml of water per day")

    gut_symptoms = {"nausea", "bloating", "vomiting", "abdominal_pain"}
    for c in checkins:
        syms = set(c.get("symptoms", []))
        if syms & gut_symptoms:
            score -= 15
            factors.append("Digestive symptoms (nausea/bloating) reported")
            recs.append("Consider a food diary to identify digestive triggers")
            break

    meal_days = sum(1 for c in checkins if c.get("meals") and len(c.get("meals", [])) >= 2)
    if len(checkins) > 0 and meal_days < len(checkins) * 0.7:
        score -= 10
        factors.append("Irregular meal patterns detected")
        recs.append("Maintain consistent meal times for better gut health")

    return _clamp(score), factors, recs


def _compute_lungs_score(checkins: list[dict], vitals_docs: list[dict], wearable_docs: list[dict]) -> tuple[float, list[str], list[str]]:
    score = 70.0
    factors: list[str] = []
    recs: list[str] = []

    spo2_vitals = [v["value_primary"] for v in vitals_docs if v.get("vital_type") == "spo2"]
    spo2_wearable = []
    for w in wearable_docs:
        val = w.get("spo2_avg")
        if val is not None:
            spo2_wearable.append(float(val))

    all_spo2 = spo2_vitals + spo2_wearable
    if all_spo2:
        avg_spo2 = _avg(all_spo2)
        if avg_spo2 > 97:
            score += 15
            factors.append(f"Excellent avg SpO2 {avg_spo2:.1f}%")
        elif avg_spo2 >= 94:
            factors.append(f"Acceptable avg SpO2 {avg_spo2:.1f}%")
        else:
            score -= 25
            factors.append(f"Low avg SpO2 {avg_spo2:.1f}% — concerning")
            recs.append("Low blood oxygen requires urgent medical attention")

    lung_symptoms = {"breathlessness", "cough", "wheezing", "chest_tightness"}
    for c in checkins:
        syms = set(c.get("symptoms", []))
        if syms & lung_symptoms:
            score -= 15
            factors.append("Respiratory symptoms reported in recent check-ins")
            recs.append("Consult a pulmonologist if breathing symptoms persist")
            break

    steps_values = []
    for w in wearable_docs:
        val = w.get("steps")
        if val is not None:
            steps_values.append(float(val))
    if steps_values:
        avg_steps = _avg(steps_values)
        if avg_steps > 8000:
            score += 10
            factors.append(f"Active lifestyle — avg {avg_steps:.0f} steps/day")
        else:
            factors.append(f"Low activity — avg {avg_steps:.0f} steps/day")
            recs.append("Aim for 8000+ daily steps to strengthen lung capacity")

    return _clamp(score), factors, recs


async def _fetch_last_7d_checkins(uid: str, db: AsyncClient) -> list[dict]:
    seven_days_ago = (date.today() - timedelta(days=7)).isoformat()
    ref = db.collection("users").document(uid).collection("checkins")
    query = ref.where("checkin_date", ">=", seven_days_ago)
    docs = [doc async for doc in query.stream()]
    return [doc.to_dict() for doc in docs]


async def _fetch_recent_vitals(uid: str, db: AsyncClient) -> list[dict]:
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    ref = db.collection("users").document(uid).collection("vitals")
    docs = [doc async for doc in ref.stream()]
    result = []
    for doc in docs:
        data = doc.to_dict()
        recorded_at = data.get("recorded_at")
        if recorded_at is not None:
            if hasattr(recorded_at, "tzinfo") and recorded_at.tzinfo is None:
                recorded_at = recorded_at.replace(tzinfo=timezone.utc)
            if recorded_at >= seven_days_ago:
                result.append(data)
    return result


async def _fetch_recent_wearable(uid: str, db: AsyncClient) -> list[dict]:
    seven_days_ago = (date.today() - timedelta(days=7)).isoformat()
    ref = db.collection("users").document(uid).collection("wearable_data")
    docs = [doc async for doc in ref.stream()]
    result = []
    for doc in docs:
        data = doc.to_dict()
        date_str = data.get("date", "")
        if isinstance(date_str, date):
            date_str = date_str.isoformat()
        if date_str >= seven_days_ago:
            result.append(data)
    return result


def _compute_all_scores(
    checkins: list[dict],
    vitals: list[dict],
    wearable: list[dict],
) -> dict[OrganType, tuple[float, list[str], list[str]]]:
    return {
        OrganType.HEART: _compute_heart_score(checkins, vitals),
        OrganType.BRAIN: _compute_brain_score(checkins),
        OrganType.GUT: _compute_gut_score(checkins),
        OrganType.LUNGS: _compute_lungs_score(checkins, vitals, wearable),
    }


def _overall(scores: dict[OrganType, float]) -> float:
    weights = {
        OrganType.HEART: 0.30,
        OrganType.BRAIN: 0.25,
        OrganType.GUT: 0.25,
        OrganType.LUNGS: 0.20,
    }
    return sum(scores[organ] * w for organ, w in weights.items())


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

async def get_scores(uid: str, db: AsyncClient) -> HealthScoresResponse:
    today = date.today()
    today_str = today.isoformat()

    checkins = await _fetch_last_7d_checkins(uid, db)
    vitals = await _fetch_recent_vitals(uid, db)
    wearable = await _fetch_recent_wearable(uid, db)

    computed = _compute_all_scores(checkins, vitals, wearable)

    # Fetch previous scores (7 days ago) for trend
    seven_days_ago_str = (today - timedelta(days=7)).isoformat()
    prev_score_doc = await (
        db.collection("users")
        .document(uid)
        .collection("health_scores")
        .document(seven_days_ago_str)
        .get()
    )
    prev_data: dict = prev_score_doc.to_dict() if prev_score_doc.exists else {}
    prev_organs: dict = prev_data.get("organs", {})

    now = datetime.now(timezone.utc)
    organ_scores: list[OrganScore] = []
    score_map: dict[OrganType, float] = {}

    for organ, (score, factors, recs) in computed.items():
        prev_score = float(prev_organs.get(organ.value, score))
        change = score - prev_score
        organ_scores.append(
            OrganScore(
                organ=organ,
                score=round(score, 1),
                trend=_trend(score, prev_score),
                change_7d=round(change, 1),
                last_updated=now,
                contributing_factors=factors,
                recommendations=recs,
            )
        )
        score_map[organ] = score

    overall = round(_overall(score_map), 1)

    # data completeness
    checkin_count = len(checkins)  # expected 7
    vital_types_present = len({v.get("vital_type") for v in vitals})  # expected 3
    wearable_types_present = len(wearable)  # expected 2 distinct days as proxy
    fields_with_data = checkin_count + vital_types_present + min(wearable_types_present, 2)
    total_expected = 7 + 3 + 2
    completeness = round((fields_with_data / total_expected) * 100, 1)
    completeness = min(100.0, completeness)

    # Save today's scores
    save_data = {
        "uid": uid,
        "overall_score": overall,
        "organs": {organ.value: score for organ, score in score_map.items()},
        "scored_at": now,
    }
    await (
        db.collection("users")
        .document(uid)
        .collection("health_scores")
        .document(today_str)
        .set(save_data, merge=True)
    )

    next_checkin = datetime.now(timezone.utc).replace(
        hour=20, minute=0, second=0, microsecond=0
    )
    if next_checkin <= datetime.now(timezone.utc):
        next_checkin += timedelta(days=1)

    return HealthScoresResponse(
        uid=uid,
        overall_score=overall,
        organs=organ_scores,
        score_date=today,
        data_completeness_pct=completeness,
        next_recommended_checkin=next_checkin,
    )


async def get_score_history(
    uid: str,
    organ: OrganType | None,
    period: str,
    granularity: str,
    db: AsyncClient,
) -> HealthScoreHistoryResponse:
    period_map = {"7d": 7, "30d": 30, "90d": 90}
    days = period_map.get(period, 30)
    start = date.today() - timedelta(days=days)
    start_str = start.isoformat()

    scores_ref = db.collection("users").document(uid).collection("health_scores")
    docs = [doc async for doc in scores_ref.stream()]

    data_points: list[ScoreDataPoint] = []

    for doc in docs:
        data = doc.to_dict()
        doc_date_str = doc.id  # "2026-03-21"
        if doc_date_str < start_str:
            continue
        try:
            doc_date = date.fromisoformat(doc_date_str)
        except ValueError:
            continue

        if organ is not None:
            organs_data = data.get("organs", {})
            score_val = organs_data.get(organ.value)
            if score_val is not None:
                data_points.append(ScoreDataPoint(date=doc_date, score=float(score_val), organ=organ))
        else:
            overall = data.get("overall_score")
            if overall is not None:
                # Use HEART as a proxy organ label for overall when organ=None
                data_points.append(ScoreDataPoint(date=doc_date, score=float(overall), organ=OrganType.HEART))

    data_points.sort(key=lambda dp: dp.date)

    if data_points:
        scores = [dp.score for dp in data_points]
        avg = round(_avg(scores), 1)
        min_s = round(min(scores), 1)
        max_s = round(max(scores), 1)
    else:
        avg = 0.0
        min_s = 0.0
        max_s = 0.0

    return HealthScoreHistoryResponse(
        organ=organ,
        period=period,
        data_points=data_points,
        average_score=avg,
        min_score=min_s,
        max_score=max_s,
    )


async def get_comparison(
    uid: str,
    target_uid: str,
    organ: OrganType | None,
    db: AsyncClient,
) -> ScoreComparisonResponse:
    async def _load_organ_scores(user_uid: str) -> list[OrganScore]:
        today_str = date.today().isoformat()
        doc = await (
            db.collection("users")
            .document(user_uid)
            .collection("health_scores")
            .document(today_str)
            .get()
        )
        now = datetime.now(timezone.utc)
        if not doc.exists:
            return []
        data = doc.to_dict()
        organs_data: dict = data.get("organs", {})
        result: list[OrganScore] = []
        for o in OrganType:
            if organ is not None and o != organ:
                continue
            score_val = organs_data.get(o.value)
            if score_val is not None:
                result.append(
                    OrganScore(
                        organ=o,
                        score=float(score_val),
                        trend=ScoreTrend.STABLE,
                        change_7d=0.0,
                        last_updated=now,
                    )
                )
        return result

    my_scores = await _load_organ_scores(uid)
    their_scores = await _load_organ_scores(target_uid)

    notes: list[str] = []
    my_map = {s.organ: s.score for s in my_scores}
    their_map = {s.organ: s.score for s in their_scores}

    for o in OrganType:
        my_val = my_map.get(o)
        their_val = their_map.get(o)
        if my_val is not None and their_val is not None:
            diff = my_val - their_val
            if abs(diff) > 10:
                direction = "higher" if diff > 0 else "lower"
                notes.append(
                    f"Your {o.value} score is {abs(diff):.0f} points {direction} than theirs"
                )

    return ScoreComparisonResponse(
        my_scores=my_scores,
        their_scores=their_scores,
        comparison_notes=notes,
    )


async def trigger_recompute(uid: str, db: AsyncClient) -> RecomputeResponse:
    user_ref = db.collection("users").document(uid)
    user_doc = await user_ref.get()

    previous_overall = 0.0
    if user_doc.exists:
        user_data = user_doc.to_dict() or {}
        last_recompute = user_data.get("last_recompute_at")
        if last_recompute is not None:
            if hasattr(last_recompute, "tzinfo") and last_recompute.tzinfo is None:
                last_recompute = last_recompute.replace(tzinfo=timezone.utc)
            elapsed = (datetime.now(timezone.utc) - last_recompute).total_seconds()
            if elapsed < 3600:
                remaining = int(3600 - elapsed)
                raise RateLimitError(
                    f"Score recompute is rate-limited. Try again in {remaining} seconds."
                )

        today_str = date.today().isoformat()
        score_doc = await (
            db.collection("users")
            .document(uid)
            .collection("health_scores")
            .document(today_str)
            .get()
        )
        if score_doc.exists:
            previous_overall = float(score_doc.to_dict().get("overall_score", 0.0))

    job_id = str(uuid4())
    now = datetime.now(timezone.utc)

    await user_ref.set({"last_recompute_at": now}, merge=True)

    return RecomputeResponse(
        job_id=job_id,
        estimated_completion_sec=5,
        previous_overall_score=previous_overall,
    )


async def recompute_scores(uid: str, db: AsyncClient) -> None:
    """Background task: recompute and persist scores for the given user."""
    checkins = await _fetch_last_7d_checkins(uid, db)
    vitals = await _fetch_recent_vitals(uid, db)
    wearable = await _fetch_recent_wearable(uid, db)

    computed = _compute_all_scores(checkins, vitals, wearable)
    score_map = {organ: score for organ, (score, _, _) in computed.items()}
    overall = round(_overall(score_map), 1)

    now = datetime.now(timezone.utc)
    today_str = date.today().isoformat()

    save_data = {
        "uid": uid,
        "overall_score": overall,
        "organs": {organ.value: round(score, 1) for organ, score in score_map.items()},
        "scored_at": now,
    }
    await (
        db.collection("users")
        .document(uid)
        .collection("health_scores")
        .document(today_str)
        .set(save_data, merge=True)
    )


async def get_vitals(uid: str, db: AsyncClient) -> VitalsResponse:
    ref = db.collection("users").document(uid).collection("vitals")
    docs = [doc async for doc in ref.stream()]
    vitals_data = [doc.to_dict() for doc in docs]

    # Sort by recorded_at descending to get latest per type
    vitals_data.sort(
        key=lambda v: v.get("recorded_at") or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    latest: dict[str, dict] = {}
    for v in vitals_data:
        vtype = v.get("vital_type", "")
        if vtype and vtype not in latest:
            latest[vtype] = v

    hr = latest.get("heart_rate")
    bp = latest.get("blood_pressure")
    spo2 = latest.get("spo2")
    weight = latest.get("weight")

    # Steps and sleep from wearable
    today_str = date.today().isoformat()
    wearable_doc = await (
        db.collection("users")
        .document(uid)
        .collection("wearable_data")
        .document(today_str)
        .get()
    )
    wearable_today: dict = wearable_doc.to_dict() if wearable_doc.exists else {}

    weight_kg = float(weight["value_primary"]) if weight else None
    height_m: float | None = None
    user_doc = await db.collection("users").document(uid).get()
    if user_doc.exists:
        ud = user_doc.to_dict() or {}
        h = ud.get("height_cm")
        if h:
            height_m = float(h) / 100.0

    bmi: float | None = None
    if weight_kg and height_m and height_m > 0:
        bmi = round(weight_kg / (height_m ** 2), 1)

    source: dict = {}
    for vtype, doc in latest.items():
        source[vtype] = doc.get("notes") or "manual"

    return VitalsResponse(
        heart_rate_bpm=float(hr["value_primary"]) if hr else None,
        heart_rate_updated_at=hr.get("recorded_at") if hr else None,
        blood_pressure_systolic=int(bp["value_primary"]) if bp else None,
        blood_pressure_diastolic=int(bp["value_secondary"]) if bp and bp.get("value_secondary") is not None else None,
        bp_updated_at=bp.get("recorded_at") if bp else None,
        spo2_pct=float(spo2["value_primary"]) if spo2 else None,
        spo2_updated_at=spo2.get("recorded_at") if spo2 else None,
        steps_today=int(wearable_today["steps"]) if wearable_today.get("steps") is not None else None,
        sleep_last_night_hours=float(wearable_today["sleep_hours"]) if wearable_today.get("sleep_hours") is not None else None,
        weight_kg=weight_kg,
        weight_updated_at=weight.get("recorded_at") if weight else None,
        bmi=bmi,
        source=source,
    )


async def log_vital(uid: str, req: ManualVitalRequest, db: AsyncClient) -> VitalEntryResponse:
    vital_id = str(uuid4())
    is_normal, note = _is_normal_range(req.vital_type, req.value_primary, req.value_secondary)

    data: dict = {
        "vital_id": vital_id,
        "uid": uid,
        "vital_type": req.vital_type,
        "value_primary": req.value_primary,
        "value_secondary": req.value_secondary,
        "unit": req.unit,
        "recorded_at": req.recorded_at,
        "notes": req.notes,
        "created_at": datetime.now(timezone.utc),
    }
    await (
        db.collection("users")
        .document(uid)
        .collection("vitals")
        .document(vital_id)
        .set(data)
    )

    return VitalEntryResponse(
        vital_id=vital_id,
        vital_type=req.vital_type,
        value_primary=req.value_primary,
        value_secondary=req.value_secondary,
        unit=req.unit,
        recorded_at=req.recorded_at,
        is_in_normal_range=is_normal,
        normal_range_note=note,
    )


async def get_vital_history(
    uid: str,
    vital_type: str,
    start_date: date,
    end_date: date,
    limit: int,
    db: AsyncClient,
) -> list[VitalEntryResponse]:
    start_dt = datetime(start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc)
    end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc)

    ref = db.collection("users").document(uid).collection("vitals")
    query = (
        ref.where("vital_type", "==", vital_type)
        .where("recorded_at", ">=", start_dt)
        .where("recorded_at", "<=", end_dt)
        .order_by("recorded_at", direction="DESCENDING")
        .limit(limit)
    )
    docs = [doc async for doc in query.stream()]

    results: list[VitalEntryResponse] = []
    for doc in docs:
        data = doc.to_dict()
        is_normal, note = _is_normal_range(
            data["vital_type"],
            data["value_primary"],
            data.get("value_secondary"),
        )
        results.append(
            VitalEntryResponse(
                vital_id=data["vital_id"],
                vital_type=data["vital_type"],
                value_primary=data["value_primary"],
                value_secondary=data.get("value_secondary"),
                unit=data["unit"],
                recorded_at=data["recorded_at"],
                is_in_normal_range=is_normal,
                normal_range_note=note,
            )
        )
    return results
