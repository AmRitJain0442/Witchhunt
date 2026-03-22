from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Query

from app.dependencies import DB, CurrentUserDep
from app.models.common import MessageResponse
from app.models.insights import (
    ExerciseSuggestionResponse,
    FoodInteractionSummaryResponse,
    HealthAdvisoryResponse,
    InteractionCheckRequest,
    InteractionCheckResponse,
    MedicineCabinetAuditResponse,
    SavedExercisePlanResponse,
    SaveExercisePlanRequest,
)
from app.services import ai_insight_service
from app.services.health_context_service import build_health_context

router = APIRouter()


@router.get("/exercises", response_model=ExerciseSuggestionResponse)
async def generate_exercise_suggestions(
    current_user: CurrentUserDep,
    db: DB,
    force_refresh: bool = Query(default=False),
):
    return await ai_insight_service.generate_exercise_suggestions(
        current_user.uid, db, force_refresh=force_refresh
    )


@router.post("/exercises/save", response_model=SavedExercisePlanResponse, status_code=201)
async def save_exercise_plan(
    req: SaveExercisePlanRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    plan_id = str(uuid4())
    now = datetime.now(timezone.utc)

    plan_data = {
        "plan_id": plan_id,
        "uid": current_user.uid,
        "exercises": [e.model_dump() for e in req.exercises],
        "start_date": req.start_date.isoformat(),
        "reminder_times": req.reminder_times,
        "saved_at": now,
    }

    await (
        db.collection("users")
        .document(current_user.uid)
        .collection("exercise_plans")
        .document(plan_id)
        .set(plan_data)
    )

    reminder_scheduled = len(req.reminder_times) > 0

    return SavedExercisePlanResponse(
        plan_id=plan_id,
        saved_at=now,
        reminder_scheduled=reminder_scheduled,
    )


@router.post("/medicines/check-interactions", response_model=InteractionCheckResponse)
async def check_interactions(
    req: InteractionCheckRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await ai_insight_service.check_interactions(current_user.uid, req, db)


@router.get("/medicines/warnings", response_model=MedicineCabinetAuditResponse)
async def get_cabinet_warnings(
    current_user: CurrentUserDep,
    db: DB,
):
    return await ai_insight_service.get_cabinet_warnings(current_user.uid, db)


@router.get("/medicines/food-interactions", response_model=FoodInteractionSummaryResponse)
async def get_food_interactions(
    current_user: CurrentUserDep,
    db: DB,
):
    return await ai_insight_service.get_food_interactions(current_user.uid, db)


@router.get("/medicines/interaction-history")
async def list_interaction_history(
    current_user: CurrentUserDep,
    db: DB,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    query = (
        db.collection("users")
        .document(current_user.uid)
        .collection("interaction_checks")
        .order_by("checked_at", direction="DESCENDING")
    )
    all_docs = [doc async for doc in query.stream()]
    total = len(all_docs)
    page = all_docs[offset : offset + limit]

    items = []
    for doc in page:
        data = doc.to_dict()
        items.append(
            {
                "check_id": data.get("check_id", doc.id),
                "checked_at": data.get("checked_at"),
                "proposed_medicine": data.get("proposed_medicine", ""),
                "overall_risk": data.get("overall_risk", "caution"),
                "safe_to_add": data.get("safe_to_add", False),
                "must_consult_doctor": data.get("must_consult_doctor", False),
                "summary": data.get("summary", ""),
            }
        )

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total,
    }


@router.get("/advisories", response_model=HealthAdvisoryResponse)
async def generate_advisories(
    current_user: CurrentUserDep,
    db: DB,
    force_refresh: bool = Query(default=False),
):
    return await ai_insight_service.generate_advisories(
        current_user.uid, db, force_refresh=force_refresh
    )


@router.patch("/advisories/{advisory_id}/dismiss", response_model=MessageResponse)
async def dismiss_advisory(
    advisory_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    cache_ref = (
        db.collection("users")
        .document(current_user.uid)
        .collection("insight_cache")
        .document("advisories")
    )
    doc = await cache_ref.get()
    if doc.exists:
        data = doc.to_dict()
        payload: dict = data.get("payload", {})
        advisories: list[dict] = payload.get("advisories", [])
        updated = False
        for advisory in advisories:
            if advisory.get("advisory_id") == advisory_id:
                advisory["is_dismissed"] = True
                updated = True
                break
        if updated:
            payload["advisories"] = advisories
            await cache_ref.update({"payload": payload})

    return MessageResponse(message="Advisory dismissed successfully")


@router.get("/context")
async def get_health_context(
    current_user: CurrentUserDep,
    db: DB,
    include_medicine_details: bool = Query(default=True),
    days_of_checkins: int = Query(default=14, ge=1, le=90),
):
    context = await build_health_context(current_user.uid, db)
    result = context.model_dump(mode="json")

    if not include_medicine_details:
        result["active_medicines"] = [
            {"name": m["name"], "category": m["category"]}
            for m in result.get("active_medicines", [])
        ]
        result["past_medicines"] = [
            {"name": m["name"]}
            for m in result.get("past_medicines", [])
        ]

    return result
