from fastapi import APIRouter

from app.dependencies import DB, CurrentUserDep
from app.models.common import MessageResponse
from app.models.family import (
    AddFamilyMemberRequest,
    FamilyMember,
    FamilyMemberDashboard,
    FamilyMemberListResponse,
    UpdateFamilyMemberRequest,
)
from app.services import family_service

router = APIRouter()


@router.get("/", response_model=FamilyMemberListResponse)
async def list_family_members(current_user: CurrentUserDep, db: DB):
    return await family_service.list_family_members(current_user.uid, db)


@router.post("/", response_model=FamilyMember, status_code=201)
async def add_family_member(
    req: AddFamilyMemberRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await family_service.add_family_member(current_user.uid, req, db)


@router.get("/{member_id}", response_model=FamilyMember)
async def get_family_member(
    member_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await family_service.get_family_member(current_user.uid, member_id, db)


@router.patch("/{member_id}", response_model=FamilyMember)
async def update_family_member(
    member_id: str,
    req: UpdateFamilyMemberRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await family_service.update_family_member(
        current_user.uid, member_id, req, db
    )


@router.delete("/{member_id}", response_model=MessageResponse)
async def remove_family_member(
    member_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    await family_service.remove_family_member(current_user.uid, member_id, db)
    return MessageResponse(message="Family member removed successfully")


@router.post("/invites/{invite_id}/accept", response_model=FamilyMember)
async def accept_invite(
    invite_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await family_service.accept_invite(
        invite_id,
        current_user.uid,
        current_user.phone_number or "",
        db,
    )


@router.post("/invites/{invite_id}/decline", response_model=MessageResponse)
async def decline_invite(
    invite_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    await family_service.decline_invite(
        invite_id,
        current_user.uid,
        current_user.phone_number or "",
        db,
    )
    return MessageResponse(message="Invite declined")


@router.get("/{member_id}/dashboard", response_model=FamilyMemberDashboard)
async def get_family_dashboard(
    member_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await family_service.get_family_dashboard(
        current_user.uid, member_id, current_user.uid, db
    )
