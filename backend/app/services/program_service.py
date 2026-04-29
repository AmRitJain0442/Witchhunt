from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from google.cloud.firestore import AsyncClient

from app.core.exceptions import ConflictError, NotFoundError
from app.models.programs import (
    DiabetesProgramResponse,
    DiabetesProgramStartRequest,
    ProgramProgressResponse,
    ProgramTask,
    ProgramTaskCompleteRequest,
)

_DIABETES_FOCUS = [
    "Baseline: log fasting glucose and medicines consistently.",
    "Meal rhythm: reduce long gaps and pair carbs with protein.",
    "Walking habit: build a reliable post-meal walk.",
    "Medication adherence: identify missed-dose patterns.",
    "Sleep and glucose: track poor sleep days against sugar readings.",
    "Portion tuning: reduce refined carbs without skipping meals.",
    "Lab cadence: plan HbA1c and lipid follow-up.",
    "Stress response: add a short breathing or yoga practice.",
    "Foot care: daily foot check and comfortable footwear.",
    "Sick-day readiness: know when to call a doctor.",
    "Family support: share progress and blockers.",
    "Maintenance: lock in the habits that worked.",
]


def _week_from_start(start_date: date) -> int:
    return min(12, max(1, ((date.today() - start_date).days // 7) + 1))


def _program_doc_to_response(data: dict, completed_task_ids: set[str]) -> DiabetesProgramResponse:
    start_raw = data["start_date"]
    start_date = date.fromisoformat(start_raw) if isinstance(start_raw, str) else start_raw
    current_week = _week_from_start(start_date)
    targets = data.get("targets", {})
    walk_minutes = int(targets.get("preferred_walk_minutes", 20))
    task_templates = [
        ("fasting_glucose", "Log fasting glucose", f"Target: below {targets.get('fasting_glucose_target', 110)} mg/dL unless your doctor set a different goal.", "vitals"),
        ("diabetes_meds", "Confirm diabetes medicines", "Mark every scheduled diabetes medicine as taken or skipped.", "medicine"),
        ("post_meal_walk", "Post-meal walk", f"Walk for {walk_minutes} minutes after a main meal.", "activity"),
        ("balanced_plate", "Balanced plate", "Include protein and vegetables with your largest carb meal.", "diet"),
        ("weekly_learning", "Week focus", _DIABETES_FOCUS[current_week - 1], "education"),
    ]
    tasks = [
        ProgramTask(
            task_id=f"{date.today().isoformat()}_{task_id}",
            title=title,
            description=description,
            category=category,  # type: ignore[arg-type]
            completed=f"{date.today().isoformat()}_{task_id}" in completed_task_ids,
        )
        for task_id, title, description, category in task_templates
    ]
    return DiabetesProgramResponse(
        program_id=data["program_id"],
        status=data.get("status", "active"),
        start_date=start_date,
        current_week=current_week,
        focus=_DIABETES_FOCUS[current_week - 1],
        tasks_today=tasks,
        targets=targets,
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


async def _get_active_diabetes_program(uid: str, db: AsyncClient) -> dict | None:
    query = (
        db.collection("users")
        .document(uid)
        .collection("programs")
        .where("condition", "==", "diabetes")
        .where("status", "==", "active")
        .limit(1)
    )
    docs = [doc async for doc in query.stream()]
    return docs[0].to_dict() if docs else None


async def _completed_task_ids(uid: str, program_id: str, db: AsyncClient, start: date | None = None) -> set[str]:
    ref = (
        db.collection("users")
        .document(uid)
        .collection("programs")
        .document(program_id)
        .collection("task_logs")
    )
    query = ref
    if start:
        query = query.where("completed_date", ">=", start.isoformat())
    docs = [doc async for doc in query.stream()]
    return {doc.id for doc in docs}


async def start_diabetes_program(
    uid: str,
    req: DiabetesProgramStartRequest,
    db: AsyncClient,
) -> DiabetesProgramResponse:
    existing = await _get_active_diabetes_program(uid, db)
    if existing:
        raise ConflictError("An active diabetes program already exists")

    now = datetime.now(timezone.utc)
    program_id = str(uuid4())
    data = {
        "program_id": program_id,
        "condition": "diabetes",
        "status": "active",
        "start_date": date.today().isoformat(),
        "targets": {
            "target_hba1c": req.target_hba1c,
            "fasting_glucose_target": req.fasting_glucose_target,
            "preferred_walk_minutes": req.preferred_walk_minutes,
            "language": req.language,
        },
        "created_at": now,
        "updated_at": now,
    }
    await (
        db.collection("users")
        .document(uid)
        .collection("programs")
        .document(program_id)
        .set(data)
    )
    return _program_doc_to_response(data, set())


async def get_diabetes_today(uid: str, db: AsyncClient) -> DiabetesProgramResponse:
    program = await _get_active_diabetes_program(uid, db)
    if not program:
        raise NotFoundError("Active diabetes program")
    completed = await _completed_task_ids(uid, program["program_id"], db, start=date.today())
    return _program_doc_to_response(program, completed)


async def complete_program_task(
    uid: str,
    program_id: str,
    task_id: str,
    req: ProgramTaskCompleteRequest,
    db: AsyncClient,
) -> dict:
    program_ref = db.collection("users").document(uid).collection("programs").document(program_id)
    program_doc = await program_ref.get()
    if not program_doc.exists:
        raise NotFoundError("Program")
    now = datetime.now(timezone.utc)
    task_data = {
        "task_id": task_id,
        "completed_date": date.today().isoformat(),
        "completed_at": now,
        "notes": req.notes,
    }
    await program_ref.collection("task_logs").document(task_id).set(task_data)
    await program_ref.update({"updated_at": now})
    return task_data


def _trend(values: list[float]) -> str:
    if len(values) < 2:
        return "insufficient_data"
    if values[-1] < values[0] - 5:
        return "improving"
    if values[-1] > values[0] + 5:
        return "declining"
    return "stable"


async def get_diabetes_progress(uid: str, db: AsyncClient) -> ProgramProgressResponse:
    program = await _get_active_diabetes_program(uid, db)
    if not program:
        raise NotFoundError("Active diabetes program")
    program_id = program["program_id"]
    start_raw = program["start_date"]
    start_date = date.fromisoformat(start_raw) if isinstance(start_raw, str) else start_raw
    completed_total = await _completed_task_ids(uid, program_id, db)
    completed_7d = await _completed_task_ids(uid, program_id, db, start=date.today() - timedelta(days=7))

    vitals_ref = db.collection("users").document(uid).collection("vitals")
    vitals_docs = [doc async for doc in vitals_ref.where("vital_type", "==", "blood_sugar").stream()]
    glucose_values = [
        float(doc.to_dict().get("value"))
        for doc in sorted(vitals_docs, key=lambda d: d.to_dict().get("recorded_at", datetime.min.replace(tzinfo=timezone.utc)))
        if doc.to_dict().get("value") is not None
    ]

    labs_ref = db.collection("users").document(uid).collection("lab_reports")
    lab_docs = [doc async for doc in labs_ref.where("status", "==", "parsed").stream()]
    hba1c_values: list[float] = []
    for doc in lab_docs:
        for biomarker in doc.to_dict().get("biomarkers", []):
            if str(biomarker.get("name", "")).lower() == "hba1c":
                hba1c_values.append(float(biomarker["value"]))

    return ProgramProgressResponse(
        program_id=program_id,
        current_week=_week_from_start(start_date),
        completed_tasks_7d=len(completed_7d),
        completed_tasks_total=len(completed_total),
        fasting_glucose_latest=glucose_values[-1] if glucose_values else None,
        fasting_glucose_trend=_trend(glucose_values),  # type: ignore[arg-type]
        hba1c_latest=hba1c_values[-1] if hba1c_values else None,
        adherence_summary={
            "task_completion_7d": len(completed_7d),
            "task_completion_total": len(completed_total),
        },
    )
