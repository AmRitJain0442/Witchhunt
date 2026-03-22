from datetime import date

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.dependencies import DB, CurrentUserDep
from app.models.checkins import (
    CheckinCreateRequest,
    CheckinListResponse,
    CheckinResponse,
    CheckinUpdateRequest,
    StreakResponse,
    TranscriptionStatusResponse,
    VoiceUploadResponse,
)
from app.models.common import MessageResponse
from app.services import checkin_service

router = APIRouter()

_ALLOWED_AUDIO_TYPES = {"audio/m4a", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/mpeg"}
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_VOICE_SIZE_BYTES = 25 * 1024 * 1024   # 25 MB
_MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024   # 10 MB


@router.post("/", response_model=CheckinResponse, status_code=201)
async def create_checkin(
    req: CheckinCreateRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await checkin_service.create_checkin(current_user.uid, req, db)


@router.post("/voice", response_model=VoiceUploadResponse, status_code=201)
async def save_voice_note(
    current_user: CurrentUserDep,
    db: DB,
    checkin_date: date = Form(...),
    file: UploadFile = File(...),
):
    if file.content_type not in _ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only M4A / AAC / MP3 audio files are accepted",
        )
    file_bytes = await file.read()
    if len(file_bytes) > _MAX_VOICE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Audio file must be smaller than 25 MB")

    return await checkin_service.save_voice_note(
        current_user.uid, checkin_date, file_bytes, file.content_type, db
    )


@router.get("/voice/transcription/{job_id}", response_model=TranscriptionStatusResponse)
async def get_transcription_status(
    job_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await checkin_service.get_transcription_status(current_user.uid, job_id, db)


@router.post("/meal-photo", response_model=dict)
async def save_meal_photo(
    current_user: CurrentUserDep,
    file: UploadFile = File(...),
):
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only JPEG, PNG, and WebP images are accepted",
        )
    file_bytes = await file.read()
    if len(file_bytes) > _MAX_PHOTO_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Photo must be smaller than 10 MB")

    photo_url = await checkin_service.save_meal_photo(
        current_user.uid, file_bytes, file.content_type
    )
    return {"photo_url": photo_url}


@router.get("/", response_model=CheckinListResponse)
async def list_checkins(
    current_user: CurrentUserDep,
    db: DB,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 30,
    offset: int = 0,
):
    return await checkin_service.list_checkins(
        current_user.uid, start_date, end_date, limit, offset, db
    )


# /streak MUST be declared before /{checkin_id} to avoid path conflict
@router.get("/streak", response_model=StreakResponse)
async def get_streak(current_user: CurrentUserDep, db: DB):
    return await checkin_service.get_streak(current_user.uid, db)


@router.get("/{checkin_id}", response_model=CheckinResponse)
async def get_checkin(
    checkin_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    return await checkin_service.get_checkin(current_user.uid, checkin_id, db)


@router.patch("/{checkin_id}", response_model=CheckinResponse)
async def update_checkin(
    checkin_id: str,
    req: CheckinUpdateRequest,
    current_user: CurrentUserDep,
    db: DB,
):
    return await checkin_service.update_checkin(current_user.uid, checkin_id, req, db)


@router.delete("/{checkin_id}", response_model=MessageResponse)
async def delete_checkin(
    checkin_id: str,
    current_user: CurrentUserDep,
    db: DB,
):
    await checkin_service.delete_checkin(current_user.uid, checkin_id, db)
    return MessageResponse(message="Check-in deleted successfully")
