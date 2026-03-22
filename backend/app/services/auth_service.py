from datetime import datetime, timezone

from firebase_admin import auth
from google.cloud.firestore import AsyncClient

from app.core.exceptions import AlreadyExistsError, NotFoundError, UnauthorizedError
from app.core.security import verify_firebase_token, invalidate_token_cache
from app.models.auth import (
    AuthRegisterRequest,
    AuthRegisterResponse,
    AuthLoginRequest,
    AuthLoginResponse,
)


async def register_user(
    req: AuthRegisterRequest,
    db: AsyncClient,
) -> AuthRegisterResponse:
    # Verify Firebase token and extract uid
    current_user = verify_firebase_token(req.firebase_token)
    uid = current_user.uid

    # Check if user doc already exists
    user_ref = db.collection("users").document(uid)
    doc = await user_ref.get()
    if doc.exists:
        raise AlreadyExistsError("User")

    now = datetime.now(timezone.utc)
    user_data = {
        "uid": uid,
        "display_name": req.display_name,
        "phone_number": req.phone_number,
        "date_of_birth": req.date_of_birth.isoformat(),
        "gender": req.gender,
        "language_preference": req.language_preference,
        "fcm_token": req.fcm_token,
        "is_profile_complete": False,
        "chronic_conditions": [],
        "allergies": [],
        "created_at": now,
        "updated_at": now,
        "is_deleted": False,
    }
    await user_ref.set(user_data)

    # Set custom Firebase Auth claims
    auth.set_custom_user_claims(uid, {"role": "user"})

    return AuthRegisterResponse(
        uid=uid,
        display_name=req.display_name,
        phone_number=req.phone_number,
        created_at=now,
        is_profile_complete=False,
    )


async def login_user(
    req: AuthLoginRequest,
    db: AsyncClient,
) -> AuthLoginResponse:
    current_user = verify_firebase_token(req.firebase_token)
    uid = current_user.uid

    user_ref = db.collection("users").document(uid)
    doc = await user_ref.get()
    if not doc.exists:
        raise NotFoundError("User")

    user_data = doc.to_dict()

    # Upsert FCM token if provided
    if req.fcm_token:
        await user_ref.update({"fcm_token": req.fcm_token, "updated_at": datetime.now(timezone.utc)})

    # Count family members
    family_ref = user_ref.collection("family_members")
    family_count = len([d async for d in family_ref.stream()])

    # Check for active medicines
    medicines_ref = user_ref.collection("medicines")
    active_query = medicines_ref.where("is_active", "==", True).limit(1)
    active_docs = [d async for d in active_query.stream()]

    return AuthLoginResponse(
        uid=uid,
        display_name=user_data.get("display_name", ""),
        is_profile_complete=user_data.get("is_profile_complete", False),
        family_count=family_count,
        has_active_medicines=len(active_docs) > 0,
    )


async def logout_user(uid: str, token: str, db: AsyncClient) -> None:
    # Revoke all Firebase refresh tokens for this user
    auth.revoke_refresh_tokens(uid)

    # Clear FCM token from Firestore
    user_ref = db.collection("users").document(uid)
    await user_ref.update({"fcm_token": None, "updated_at": datetime.now(timezone.utc)})

    # Remove token from local verification cache
    invalidate_token_cache(token)
