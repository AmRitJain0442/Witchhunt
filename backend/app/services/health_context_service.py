import asyncio
from datetime import datetime, timedelta, timezone

from cachetools import TTLCache
from google.cloud.firestore import AsyncClient

from app.models.insights import (
    ActiveMedicineContext,
    FlaggedBiomarker,
    HealthContext,
    PastMedicineContext,
)
from app.core.enums import MedicineCategory

_context_cache: TTLCache = TTLCache(maxsize=500, ttl=1800)  # 30 min


def _safe_avg(values: list[float | int]) -> float | None:
    non_null = [v for v in values if v is not None]
    if not non_null:
        return None
    return sum(non_null) / len(non_null)


def _safe_avg_int(values: list[int | None]) -> int | None:
    non_null = [v for v in values if v is not None]
    if not non_null:
        return None
    return int(sum(non_null) / len(non_null))


def _compute_age(date_of_birth: str | None) -> int:
    if not date_of_birth:
        return 0
    try:
        from datetime import date

        dob_parts = date_of_birth.split("-")
        dob = date(int(dob_parts[0]), int(dob_parts[1]), int(dob_parts[2]))
        today = date.today()
        return (
            today.year
            - dob.year
            - ((today.month, today.day) < (dob.month, dob.day))
        )
    except Exception:
        return 0


def _data_completeness(ctx: dict) -> float:
    """Compute ratio of non-None, non-empty fields."""
    fields_to_check = [
        ctx.get("age"),
        ctx.get("gender"),
        ctx.get("blood_group"),
        ctx.get("height_cm"),
        ctx.get("weight_kg"),
        ctx.get("bmi"),
        ctx.get("chronic_conditions"),
        ctx.get("allergies"),
        ctx.get("active_medicines"),
        ctx.get("avg_sleep_hours_7d"),
        ctx.get("avg_stress_level_7d"),
        ctx.get("avg_pain_level_7d"),
        ctx.get("avg_energy_level_7d"),
        ctx.get("avg_water_intake_ml_7d"),
        ctx.get("latest_vitals"),
        ctx.get("flagged_biomarkers"),
        ctx.get("avg_steps_7d"),
        ctx.get("avg_resting_hr_7d"),
        ctx.get("organ_scores"),
    ]
    total = len(fields_to_check)
    present = sum(
        1
        for f in fields_to_check
        if f is not None and f != [] and f != {} and f != 0
    )
    return round(present / total, 2) if total > 0 else 0.0


async def build_health_context(uid: str, db: AsyncClient) -> HealthContext:
    # Check in-memory cache first
    if uid in _context_cache:
        return _context_cache[uid]

    now = datetime.now(timezone.utc)
    cutoff_14d = now - timedelta(days=14)
    cutoff_7d = now - timedelta(days=7)
    cutoff_6m = now - timedelta(days=180)

    async def fetch_profile() -> dict:
        doc = await db.collection("users").document(uid).get()
        return doc.to_dict() if doc.exists else {}

    async def fetch_active_medicines() -> list[dict]:
        query = (
            db.collection("users")
            .document(uid)
            .collection("medicines")
            .where("is_active", "==", True)
        )
        return [d.to_dict() async for d in query.stream()]

    async def fetch_checkins_14d() -> list[dict]:
        cutoff_str = cutoff_14d.date().isoformat()
        query = (
            db.collection("users")
            .document(uid)
            .collection("checkins")
            .where("checkin_date", ">=", cutoff_str)
            .order_by("checkin_date", direction="DESCENDING")
        )
        return [d.to_dict() async for d in query.stream()]

    async def fetch_latest_health_score() -> dict | None:
        query = (
            db.collection("users")
            .document(uid)
            .collection("health_scores")
            .order_by("computed_at", direction="DESCENDING")
            .limit(1)
        )
        docs = [d async for d in query.stream()]
        return docs[0].to_dict() if docs else None

    async def fetch_flagged_biomarkers_6m() -> list[dict]:
        """Scan last 6 months of lab reports for flagged biomarkers."""
        cutoff_str = cutoff_6m.date().isoformat()
        query = (
            db.collection("users")
            .document(uid)
            .collection("lab_reports")
            .where("report_date", ">=", cutoff_str)
            .order_by("report_date", direction="DESCENDING")
        )
        result: list[dict] = []
        async for doc in query.stream():
            data = doc.to_dict()
            report_date_raw = data.get("report_date", "")
            for b in data.get("biomarkers", []):
                if b.get("flag"):
                    result.append(
                        {
                            "name": b["name"],
                            "latest_value": b["value"],
                            "unit": b["unit"],
                            "status": b.get("status", "normal"),
                            "report_date": report_date_raw,
                        }
                    )
        return result

    async def fetch_wearable_7d() -> list[dict]:
        cutoff_str = cutoff_7d.date().isoformat()
        query = (
            db.collection("users")
            .document(uid)
            .collection("wearable_data")
            .where("date", ">=", cutoff_str)
            .order_by("date", direction="DESCENDING")
        )
        return [d.to_dict() async for d in query.stream()]

    async def fetch_past_medicines_6m() -> list[dict]:
        from datetime import date

        cutoff_str = cutoff_6m.date().isoformat()
        query = (
            db.collection("users")
            .document(uid)
            .collection("medicines")
            .where("is_active", "==", False)
            .where("end_date", ">=", cutoff_str)
        )
        return [d.to_dict() async for d in query.stream()]

    (
        profile,
        active_medicines_raw,
        checkins_14d,
        health_score_doc,
        flagged_biomarkers_raw,
        wearable_7d,
        past_medicines_raw,
    ) = await asyncio.gather(
        fetch_profile(),
        fetch_active_medicines(),
        fetch_checkins_14d(),
        fetch_latest_health_score(),
        fetch_flagged_biomarkers_6m(),
        fetch_wearable_7d(),
        fetch_past_medicines_6m(),
    )

    # Age
    age = _compute_age(profile.get("date_of_birth"))

    # BMI
    height_cm: float | None = profile.get("height_cm")
    weight_kg: float | None = profile.get("weight_kg")
    bmi: float | None = None
    if height_cm and weight_kg and height_cm > 0:
        bmi = round(weight_kg / ((height_cm / 100) ** 2), 1)

    # Active medicines context
    from datetime import date as date_type

    active_medicines: list[ActiveMedicineContext] = []
    for m in active_medicines_raw:
        start_raw = m.get("start_date")
        start_date = (
            date_type.fromisoformat(start_raw) if isinstance(start_raw, str) else start_raw
        )
        end_raw = m.get("end_date")
        end_date = (
            date_type.fromisoformat(end_raw) if isinstance(end_raw, str) else end_raw
        )
        active_medicines.append(
            ActiveMedicineContext(
                medicine_id=m.get("medicine_id", m.get("id", "")),
                name=m.get("name", ""),
                generic_name=m.get("generic_name"),
                category=MedicineCategory(m.get("category", "other_prescribed")),
                dose_times=m.get("dose_times", []),
                doses_per_day=float(m.get("doses_per_day", 1)),
                start_date=start_date or date_type.today(),
                end_date=end_date,
                adherence_pct_30d=float(m.get("adherence_pct_30d", 0.0)),
                days_supply_remaining=float(m.get("days_supply_remaining", 0.0)),
            )
        )

    # Past medicines context
    past_medicines: list[PastMedicineContext] = []
    for m in past_medicines_raw:
        start_raw = m.get("start_date")
        start_date = (
            date_type.fromisoformat(start_raw) if isinstance(start_raw, str) else start_raw
        )
        end_raw = m.get("end_date")
        end_date = (
            date_type.fromisoformat(end_raw) if isinstance(end_raw, str) else end_raw
        )
        if start_date and end_date:
            past_medicines.append(
                PastMedicineContext(
                    name=m.get("name", ""),
                    generic_name=m.get("generic_name"),
                    category=MedicineCategory(m.get("category", "other_prescribed")),
                    start_date=start_date,
                    end_date=end_date,
                    reason_stopped=m.get("reason_stopped"),
                )
            )

    # Organ scores and trends from latest health score
    organ_scores: dict[str, float] = {}
    score_trends: dict[str, str] = {}
    if health_score_doc:
        organ_scores = health_score_doc.get("organ_scores", {})
        score_trends = health_score_doc.get("score_trends", {})

    # Last 7 days checkins for averages
    today_str = now.date().isoformat()
    cutoff_7d_str = cutoff_7d.date().isoformat()
    checkins_7d = [
        c
        for c in checkins_14d
        if c.get("checkin_date", "") >= cutoff_7d_str
    ]

    avg_sleep = _safe_avg([c.get("sleep_hours") for c in checkins_7d])
    avg_stress = _safe_avg([c.get("stress_level") for c in checkins_7d])
    avg_pain = _safe_avg(
        [c.get("pain_level") for c in checkins_7d if c.get("pain_level") is not None]
    )
    avg_energy = _safe_avg([c.get("energy_level") for c in checkins_7d])
    avg_water = _safe_avg([c.get("water_intake_ml") for c in checkins_7d])

    # Recent symptoms from last 7 checkins
    recent_symptoms: list[str] = []
    for c in checkins_7d:
        recent_symptoms.extend(c.get("symptoms", []))
    recent_symptoms = list(dict.fromkeys(recent_symptoms))  # deduplicate preserving order

    # Wearable averages
    steps_list: list[int] = [
        w.get("steps") for w in wearable_7d if w.get("steps") is not None
    ]
    hr_list: list[float] = [
        w.get("resting_heart_rate") for w in wearable_7d if w.get("resting_heart_rate") is not None
    ]
    avg_steps = _safe_avg_int(steps_list) if steps_list else None
    avg_resting_hr = _safe_avg(hr_list) if hr_list else None

    # Latest vitals: from today's wearable data + any manual vital entries
    latest_vitals: dict[str, float] = {}
    if wearable_7d:
        latest = wearable_7d[0]  # already sorted descending
        for key in ("heart_rate", "spo2", "steps", "calories_burned"):
            if latest.get(key) is not None:
                latest_vitals[key] = float(latest[key])

    # Flagged biomarkers
    flagged_biomarkers: list[FlaggedBiomarker] = []
    seen_names: set[str] = set()
    for fb in flagged_biomarkers_raw:
        name = fb["name"]
        if name not in seen_names:
            seen_names.add(name)
            raw_date = fb.get("report_date", "")
            if isinstance(raw_date, str) and raw_date:
                fb_date = date_type.fromisoformat(raw_date)
            elif isinstance(raw_date, datetime):
                fb_date = raw_date.date()
            else:
                fb_date = date_type.today()
            flagged_biomarkers.append(
                FlaggedBiomarker(
                    name=name,
                    latest_value=fb["latest_value"],
                    unit=fb["unit"],
                    status=fb["status"],
                    report_date=fb_date,
                )
            )

    ctx_dict = {
        "age": age,
        "gender": profile.get("gender", ""),
        "blood_group": profile.get("blood_group"),
        "height_cm": height_cm,
        "weight_kg": weight_kg,
        "bmi": bmi,
        "chronic_conditions": profile.get("chronic_conditions", []),
        "allergies": profile.get("allergies", []),
        "active_medicines": active_medicines,
        "past_medicines": past_medicines,
        "organ_scores": organ_scores,
        "score_trends": score_trends,
        "recent_symptoms": recent_symptoms,
        "avg_sleep_hours_7d": avg_sleep,
        "avg_stress_level_7d": avg_stress,
        "avg_pain_level_7d": avg_pain,
        "avg_energy_level_7d": avg_energy,
        "avg_water_intake_ml_7d": avg_water,
        "latest_vitals": latest_vitals,
        "flagged_biomarkers": flagged_biomarkers,
        "avg_steps_7d": avg_steps,
        "avg_resting_hr_7d": avg_resting_hr,
    }

    completeness = _data_completeness(ctx_dict)

    context = HealthContext(
        uid=uid,
        age=age,
        gender=profile.get("gender", ""),
        blood_group=profile.get("blood_group"),
        height_cm=height_cm,
        weight_kg=weight_kg,
        bmi=bmi,
        chronic_conditions=profile.get("chronic_conditions", []),
        allergies=profile.get("allergies", []),
        active_medicines=active_medicines,
        past_medicines=past_medicines,
        organ_scores=organ_scores,
        score_trends=score_trends,
        recent_symptoms=recent_symptoms,
        avg_sleep_hours_7d=avg_sleep,
        avg_stress_level_7d=avg_stress,
        avg_pain_level_7d=avg_pain,
        avg_energy_level_7d=avg_energy,
        avg_water_intake_ml_7d=avg_water,
        latest_vitals=latest_vitals,
        flagged_biomarkers=flagged_biomarkers,
        avg_steps_7d=avg_steps,
        avg_resting_hr_7d=avg_resting_hr,
        data_completeness_pct=completeness,
        context_built_at=now,
    )

    _context_cache[uid] = context
    return context
