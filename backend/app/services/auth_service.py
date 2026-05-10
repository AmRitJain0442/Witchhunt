from datetime import datetime, timezone

from firebase_admin import auth
from google.cloud.firestore import AsyncClient

from app.core.security import verify_firebase_token, invalidate_token_cache
from app.models.auth import (
    AuthRegisterRequest,
    AuthRegisterResponse,
    AuthLoginRequest,
    AuthLoginResponse,
)


def _profile_response_from_doc(uid: str, user_data: dict) -> AuthLoginResponse:
    return AuthLoginResponse(
        uid=uid,
        display_name=user_data.get("display_name", ""),
        is_profile_complete=user_data.get("is_profile_complete", False),
        family_count=0,
        has_active_medicines=False,
    )


async def _create_user_profile(
    uid: str,
    req: AuthRegisterRequest | AuthLoginRequest,
    db: AsyncClient,
) -> dict:
    now = datetime.now(timezone.utc)
    firebase_user = auth.get_user(uid)
    date_of_birth = getattr(req, "date_of_birth", None)
    display_name = (
        getattr(req, "display_name", None)
        or firebase_user.display_name
        or firebase_user.email
        or firebase_user.phone_number
        or "Kutumb User"
    )
    phone_number = getattr(req, "phone_number", None) or firebase_user.phone_number or ""
    user_data = {
        "uid": uid,
        "display_name": display_name,
        "phone_number": phone_number,
        "date_of_birth": date_of_birth.isoformat() if date_of_birth else None,
        "gender": getattr(req, "gender", "prefer_not_to_say"),
        "language_preference": getattr(req, "language_preference", "en"),
        "fcm_token": req.fcm_token,
        "is_profile_complete": False,
        "chronic_conditions": [],
        "allergies": [],
        "created_at": now,
        "updated_at": now,
        "is_deleted": False,
    }
    await db.collection("users").document(uid).set(user_data)
    auth.set_custom_user_claims(uid, {"role": "user"})
    return user_data


async def register_user(
    req: AuthRegisterRequest,
    db: AsyncClient,
) -> AuthRegisterResponse:
    # Verify Firebase token and extract uid
    current_user = verify_firebase_token(req.firebase_token or "")
    uid = current_user.uid

    # Check if user doc already exists
    user_ref = db.collection("users").document(uid)
    doc = await user_ref.get()
    if doc.exists:
        user_data = doc.to_dict() or {}
        if req.fcm_token:
            await user_ref.update({"fcm_token": req.fcm_token, "updated_at": datetime.now(timezone.utc)})
        return AuthRegisterResponse(
            uid=uid,
            display_name=user_data.get("display_name", req.display_name or current_user.email or "Kutumb User"),
            phone_number=user_data.get("phone_number"),
            created_at=user_data.get("created_at", datetime.now(timezone.utc)),
            is_profile_complete=user_data.get("is_profile_complete", False),
        )

    user_data = await _create_user_profile(uid, req, db)

    return AuthRegisterResponse(
        uid=uid,
        display_name=user_data["display_name"],
        phone_number=user_data["phone_number"],
        created_at=user_data["created_at"],
        is_profile_complete=False,
    )


async def login_user(
    req: AuthLoginRequest,
    db: AsyncClient,
) -> AuthLoginResponse:
    current_user = verify_firebase_token(req.firebase_token or "")
    uid = current_user.uid

    user_ref = db.collection("users").document(uid)
    doc = await user_ref.get()
    if not doc.exists:
        user_data = await _create_user_profile(uid, req, db)
        return _profile_response_from_doc(uid, user_data)

    user_data = doc.to_dict() or {}

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
