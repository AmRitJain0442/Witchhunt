from fastapi import APIRouter, UploadFile, File, HTTPException

from app.dependencies import DB, CurrentUserDep
from app.models.common import MessageResponse
from app.models.users import PhotoUploadResponse, UserProfileResponse, UserProfileUpdateRequest
from app.services import user_service

router = APIRouter()

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: CurrentUserDep, db: DB):
    return await user_service.get_profile(current_user.uid, db)


@router.patch("/me", response_model=UserProfileResponse)
async def update_my_profile(
    req: UserProfileUpdateRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await user_service.update_profile(current_user.uid, req, db)


@router.post("/me/photo", response_model=PhotoUploadResponse)
async def upload_profile_photo(
    current_user: CurrentUserDep,
    db: DB,
    photo: UploadFile = File(...),
):
    if photo.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(415, "Only JPEG, PNG, and WebP images are accepted")

    file_bytes = await photo.read()
    if len(file_bytes) > _MAX_PHOTO_SIZE_BYTES:
        raise HTTPException(413, "Photo must be smaller than 5MB")

    url = await user_service.upload_profile_photo(
        current_user.uid, file_bytes, photo.content_type, db
    )
    return PhotoUploadResponse(profile_photo_url=url)


@router.delete("/me", response_model=MessageResponse)
async def delete_my_account(current_user: CurrentUserDep, db: DB):
    await user_service.soft_delete_user(current_user.uid, db)
    return MessageResponse(message="Account scheduled for deletion in 30 days")
