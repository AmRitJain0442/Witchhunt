from typing import Annotated

from fastapi import Depends, Request
from google.cloud.firestore import AsyncClient

from app.core.firebase import get_firestore_client
from app.core.security import CurrentUser, get_current_user_from_request
from app.core.enums import FamilyPermission
from app.core.exceptions import ForbiddenError, NotFoundError


def get_db() -> AsyncClient:
    return get_firestore_client()


async def get_current_user(request: Request) -> CurrentUser:
    return get_current_user_from_request(request)


# Shorthand annotated types for injection
DB = Annotated[AsyncClient, Depends(get_db)]
CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


async def require_family_member_access(
    target_uid: str,
    permission: FamilyPermission,
    current_user: CurrentUser,
    db: AsyncClient,
) -> None:
    """
    Ensures the current user either owns the data (target_uid == uid)
    or has been explicitly granted the named permission by target_uid.
    Raises HTTP 403 otherwise.
    """
    if current_user.uid == target_uid:
        return

    members_ref = (
        db.collection("users")
        .document(target_uid)
        .collection("family_members")
    )
    query = members_ref.where("target_uid", "==", current_user.uid).limit(1)
    docs = [doc async for doc in query.stream()]

    if not docs:
        raise ForbiddenError("You are not a family member of this user")

    member_data = docs[0].to_dict()
    granted_permissions: list[str] = member_data.get("permissions", [])

    if (
        FamilyPermission.FULL_ACCESS.value not in granted_permissions
        and permission.value not in granted_permissions
    ):
        raise ForbiddenError(f"You do not have '{permission.value}' permission")
