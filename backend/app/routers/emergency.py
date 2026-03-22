from typing import Annotated

from fastapi import APIRouter, Query

from app.dependencies import DB, CurrentUserDep
from app.models.emergency import (
    EmergencyContactsResponse,
    SOSListResponse,
    SOSRequest,
    SOSResolveRequest,
    SOSResponse,
)
from app.services import emergency_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Static routes before dynamic /{event_id} routes
# ---------------------------------------------------------------------------

@router.get("/contacts", response_model=EmergencyContactsResponse)
async def get_emergency_contacts(current_user: CurrentUserDep, db: DB):
    return await emergency_service.get_emergency_contacts(current_user.uid, db)


@router.get("/sos", response_model=SOSListResponse)
async def list_sos_events(
    current_user: CurrentUserDep,
    db: DB,
    include_family: Annotated[bool, Query()] = True,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return await emergency_service.list_sos_events(
        current_user.uid, include_family, limit, db
    )


@router.post("/sos", response_model=SOSResponse, status_code=201)
async def trigger_sos(
    req: SOSRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await emergency_service.trigger_sos(current_user.uid, req, db)


@router.get("/sos/{event_id}", response_model=SOSResponse)
async def get_sos_event(event_id: str, current_user: CurrentUserDep, db: DB):
    return await emergency_service.get_sos_event(current_user.uid, event_id, db)


@router.patch("/sos/{event_id}/resolve", response_model=SOSResponse)
async def resolve_sos(
    event_id: str,
    req: SOSResolveRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await emergency_service.resolve_sos(current_user.uid, event_id, req, db)
