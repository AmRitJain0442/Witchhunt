from datetime import date
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Query

from app.core.enums import OrganType
from app.dependencies import DB, CurrentUserDep
from app.models.health import (
    HealthScoreHistoryResponse,
    HealthScoresResponse,
    ManualVitalRequest,
    RecomputeResponse,
    ScoreComparisonResponse,
    VitalEntryResponse,
    VitalsResponse,
)
from app.services import health_score_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Static routes — must come before any dynamic /{param} routes
# ---------------------------------------------------------------------------

@router.get("/scores", response_model=HealthScoresResponse)
async def get_scores(current_user: CurrentUserDep, db: DB):
    return await health_score_service.get_scores(current_user.uid, db)


@router.get("/scores/history", response_model=HealthScoreHistoryResponse)
async def get_score_history(
    current_user: CurrentUserDep,
    db: DB,
    organ: Annotated[OrganType | None, Query()] = None,
    period: Annotated[str, Query()] = "30d",
    granularity: Annotated[str, Query()] = "daily",
):
    return await health_score_service.get_score_history(
        current_user.uid, organ, period, granularity, db
    )


@router.get("/scores/compare", response_model=ScoreComparisonResponse)
async def get_comparison(
    current_user: CurrentUserDep,
    db: DB,
    target_uid: Annotated[str, Query()],
    organ: Annotated[OrganType | None, Query()] = None,
):
    return await health_score_service.get_comparison(
        current_user.uid, target_uid, organ, db
    )


@router.post("/scores/recompute", response_model=RecomputeResponse)
async def trigger_recompute(
    current_user: CurrentUserDep,
    db: DB,
    background_tasks: BackgroundTasks,
):
    response = await health_score_service.trigger_recompute(current_user.uid, db)
    background_tasks.add_task(health_score_service.recompute_scores, current_user.uid, db)
    return response


@router.get("/vitals", response_model=VitalsResponse)
async def get_vitals(current_user: CurrentUserDep, db: DB):
    return await health_score_service.get_vitals(current_user.uid, db)


@router.post("/vitals", response_model=VitalEntryResponse, status_code=201)
async def log_vital(
    req: ManualVitalRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await health_score_service.log_vital(current_user.uid, req, db)


@router.get("/vitals/history", response_model=list[VitalEntryResponse])
async def get_vital_history(
    current_user: CurrentUserDep,
    db: DB,
    vital_type: Annotated[str, Query()],
    start_date: Annotated[date, Query()],
    end_date: Annotated[date, Query()],
    limit: Annotated[int, Query(ge=1, le=365)] = 90,
):
    return await health_score_service.get_vital_history(
        current_user.uid, vital_type, start_date, end_date, limit, db
    )
