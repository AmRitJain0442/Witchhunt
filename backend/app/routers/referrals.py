from fastapi import APIRouter

from app.dependencies import DB, CurrentUserDep
from app.models.common import MessageResponse
from app.models.referrals import (
    ReferralCreateRequest,
    ReferralListResponse,
    ReferralResponse,
    ShareLinkResponse,
)
from app.services import referral_service

router = APIRouter()


@router.post("/", response_model=ReferralResponse, status_code=201)
async def create_referral(
    req: ReferralCreateRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await referral_service.create_referral(current_user.uid, req, db)


@router.get("/", response_model=ReferralListResponse)
async def list_referrals(
    current_user: CurrentUserDep,
    db: DB,
):
    return await referral_service.list_referrals(current_user.uid, db)


@router.get("/{referral_id}", response_model=ReferralResponse)
async def get_referral(
    referral_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await referral_service.get_referral(current_user.uid, referral_id, db)


@router.delete("/{referral_id}", response_model=MessageResponse)
async def delete_referral(
    referral_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    await referral_service.delete_referral(current_user.uid, referral_id, db)
    return MessageResponse(message="Referral deleted successfully")


@router.post("/{referral_id}/share", response_model=ShareLinkResponse)
async def create_share_link(
    referral_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await referral_service.create_share_link(current_user.uid, referral_id, db)
