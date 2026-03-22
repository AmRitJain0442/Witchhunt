from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.responses import RedirectResponse

from app.core.enums import WearablePlatform
from app.dependencies import DB, CurrentUserDep
from app.models.common import MessageResponse
from app.models.wearable import (
    WearableConnectResponse,
    WearableDataResponse,
    WearableStatusResponse,
    WearableSyncRequest,
    WearableSyncResponse,
)
from app.services import wearable_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Static routes must come before dynamic /{platform} routes
# ---------------------------------------------------------------------------

@router.get("/status", response_model=WearableStatusResponse)
async def get_status(current_user: CurrentUserDep, db: DB):
    return await wearable_service.get_status(current_user.uid, db)


@router.get("/data", response_model=WearableDataResponse)
async def get_wearable_data(
    current_user: CurrentUserDep,
    db: DB,
    start_date: Annotated[date, Query()],
    end_date: Annotated[date, Query()],
    metrics: Annotated[list[str] | None, Query()] = None,
):
    return await wearable_service.get_wearable_data(
        current_user.uid, start_date, end_date, metrics, db
    )


@router.get("/callback/google_fit")
async def google_fit_callback(
    current_user: CurrentUserDep,
    db: DB,
    code: Annotated[str, Query()],
    state: Annotated[str, Query()],
):
    redirect_url = await wearable_service.handle_google_fit_callback(
        current_user.uid, code, state, db
    )
    return RedirectResponse(url=redirect_url)


@router.get("/connect/{platform}", response_model=WearableConnectResponse)
async def get_connect_info(
    platform: WearablePlatform,
    current_user: CurrentUserDep,
    db: DB,
):
    return await wearable_service.get_connect_info(current_user.uid, platform, db)


@router.post("/sync/{platform}", response_model=WearableSyncResponse)
async def sync_wearable(
    platform: WearablePlatform,
    req: WearableSyncRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await wearable_service.sync_wearable(current_user.uid, req, db)


@router.delete("/disconnect/{platform}", response_model=MessageResponse)
async def disconnect_platform(
    platform: WearablePlatform,
    current_user: CurrentUserDep,
    db: DB,
):
    await wearable_service.disconnect_platform(current_user.uid, platform, db)
    return MessageResponse(message=f"{platform.value} disconnected successfully")
