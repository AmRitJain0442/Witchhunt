import uuid
from datetime import datetime, timezone

from google.cloud.firestore import AsyncClient

from app.core.exceptions import NotFoundError
from app.core.firebase import get_storage_bucket
from app.models.users import UserProfileResponse, UserProfileUpdateRequest


_REQUIRED_FIELDS = {
    "date_of_birth", "gender", "blood_group",
    "height_cm", "weight_kg", "chronic_conditions",
}


def _check_profile_complete(data: dict) -> bool:
    return all(data.get(f) not in (None, [], "") for f in _REQUIRED_FIELDS)


def _compute_bmi(height_cm: float | None, weight_kg: float | None) -> float | None:
    if height_cm and weight_kg and height_cm > 0:
        return round(weight_kg / ((height_cm / 100) ** 2), 1)
    return None


def _doc_to_profile(data: dict) -> UserProfileResponse:
    return UserProfileResponse(
        uid=data["uid"],
        display_name=data.get("display_name", ""),
        phone_number=data.get("phone_number", ""),
        date_of_birth=data.get("date_of_birth"),
        gender=data.get("gender"),
        language_preference=data.get("language_preference", "en"),
        profile_photo_url=data.get("profile_photo_url"),
        blood_group=data.get("blood_group"),
        height_cm=data.get("height_cm"),
        weight_kg=data.get("weight_kg"),
        bmi=data.get("bmi"),
        chronic_conditions=data.get("chronic_conditions", []),
        allergies=data.get("allergies", []),
        emergency_contact_name=data.get("emergency_contact_name"),
        emergency_contact_phone=data.get("emergency_contact_phone"),
        is_profile_complete=data.get("is_profile_complete", False),
        fcm_token=data.get("fcm_token"),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


async def get_profile(uid: str, db: AsyncClient) -> UserProfileResponse:
    doc = await db.collection("users").document(uid).get()
    if not doc.exists:
        raise NotFoundError("User")
    return _doc_to_profile(doc.to_dict())


async def update_profile(
    uid: str,
    req: UserProfileUpdateRequest,
    db: AsyncClient,
) -> UserProfileResponse:
    user_ref = db.collection("users").document(uid)
    doc = await user_ref.get()
    if not doc.exists:
        raise NotFoundError("User")

    existing = doc.to_dict()
    updates: dict = {"updated_at": datetime.now(timezone.utc)}

    # Apply only provided (non-None) fields
    for field, value in req.model_dump(exclude_none=True).items():
        updates[field] = value

    # Recompute BMI if height or weight changed
    height = updates.get("height_cm", existing.get("height_cm"))
    weight = updates.get("weight_kg", existing.get("weight_kg"))
    bmi = _compute_bmi(height, weight)
    if bmi is not None:
        updates["bmi"] = bmi

    # Check profile completeness with merged data
    merged = {**existing, **updates}
    updates["is_profile_complete"] = _check_profile_complete(merged)

    await user_ref.update(updates)
    merged_doc = await user_ref.get()
    return _doc_to_profile(merged_doc.to_dict())


async def upload_profile_photo(
    uid: str,
    file_bytes: bytes,
    content_type: str,
    db: AsyncClient,
) -> str:
    bucket = get_storage_bucket()
    blob = bucket.blob(f"profile_photos/{uid}/avatar.jpg")
    blob.upload_from_string(file_bytes, content_type=content_type)
    blob.make_public()
    photo_url = blob.public_url

    user_ref = db.collection("users").document(uid)
    await user_ref.update({
        "profile_photo_url": photo_url,
        "updated_at": datetime.now(timezone.utc),
    })
    return photo_url


async def soft_delete_user(uid: str, db: AsyncClient) -> None:
    from firebase_admin import auth
    user_ref = db.collection("users").document(uid)
    doc = await user_ref.get()
    if not doc.exists:
        raise NotFoundError("User")

    now = datetime.now(timezone.utc)
    await user_ref.update({
        "is_deleted": True,
        "deleted_at": now,
        "updated_at": now,
        "fcm_token": None,
    })
    auth.revoke_refresh_tokens(uid)
