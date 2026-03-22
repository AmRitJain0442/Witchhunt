from fastapi import APIRouter, Request

from app.dependencies import DB, CurrentUserDep
from app.models.auth import (
    AuthLoginRequest,
    AuthLoginResponse,
    AuthRefreshRequest,
    AuthRegisterRequest,
    AuthRegisterResponse,
)
from app.models.common import MessageResponse
from app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=AuthRegisterResponse, status_code=201)
async def register(req: AuthRegisterRequest, db: DB):
    return await auth_service.register_user(req, db)


@router.post("/login", response_model=AuthLoginResponse)
async def login(req: AuthLoginRequest, db: DB):
    return await auth_service.login_user(req, db)


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, current_user: CurrentUserDep, db: DB):
    token = request.headers.get("Authorization", "").split(" ")[-1]
    await auth_service.logout_user(current_user.uid, token, db)
    return MessageResponse(message="Logged out successfully")


@router.post("/refresh", response_model=AuthLoginResponse)
async def refresh(req: AuthRefreshRequest, db: DB):
    return await auth_service.login_user(req, db)
