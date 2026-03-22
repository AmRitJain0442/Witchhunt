from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from google.cloud.firestore import AsyncClient

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.firebase import get_storage_bucket
from app.models.checkins import (
    CheckinCreateRequest,
    CheckinListResponse,
    CheckinResponse,
    CheckinUpdateRequest,
    MealEntry,
    StreakResponse,
    TranscriptionStatusResponse,
    VoiceUploadResponse,
)
from app.core.enums import MoodLevel


def _doc_to_checkin_response(data: dict) -> CheckinResponse:
    meals_raw = data.get("meals", [])
    meals = [
        MealEntry(
            meal_type=m["meal_type"],
            description=m["description"],
            calories_estimate=m.get("calories_estimate"),
            photo_url=m.get("photo_url"),
        )
        for m in meals_raw
    ]

    pain_level_raw = data.get("pain_level")
    from app.core.enums import PainLevel
    pain_level = PainLevel(pain_level_raw) if pain_level_raw is not None else None

    checkin_date = data.get("checkin_date")
    if isinstance(checkin_date, str):
        checkin_date = date.fromisoformat(checkin_date)

    return CheckinResponse(
        checkin_id=data["checkin_id"],
        uid=data["uid"],
        checkin_date=checkin_date,
        mood=MoodLevel(data["mood"]),
        energy_level=data["energy_level"],
        pain_present=data["pain_present"],
        pain_level=pain_level,
        pain_locations=data.get("pain_locations", []),
        sleep_hours=data.get("sleep_hours"),
        sleep_quality=data.get("sleep_quality"),
        stress_level=data.get("stress_level"),
        meals=meals,
        medicine_adherence_ids=data.get("medicine_adherence_ids", []),
        symptoms=data.get("symptoms", []),
        voice_note_url=data.get("voice_note_url"),
        voice_transcription=data.get("voice_transcription"),
        water_intake_ml=data.get("water_intake_ml"),
        bowel_movement=data.get("bowel_movement"),
        notes=data.get("notes"),
        organ_scores_snapshot=data.get("organ_scores_snapshot", {}),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


async def create_checkin(
    uid: str,
    req: CheckinCreateRequest,
    db: AsyncClient,
) -> CheckinResponse:
    doc_id = req.checkin_date.isoformat()
    checkin_ref = (
        db.collection("users").document(uid).collection("checkins").document(doc_id)
    )
    existing = await checkin_ref.get()
    if existing.exists:
        raise ConflictError(f"A check-in for {doc_id} already exists")

    now = datetime.now(timezone.utc)
    meals_data = [m.model_dump() for m in req.meals]

    data: dict = {
        "checkin_id": doc_id,
        "uid": uid,
        "checkin_date": doc_id,
        "mood": req.mood.value,
        "energy_level": req.energy_level,
        "pain_present": req.pain_present,
        "pain_level": req.pain_level.value if req.pain_level is not None else None,
        "pain_locations": req.pain_locations or [],
        "sleep_hours": req.sleep_hours,
        "sleep_quality": req.sleep_quality,
        "stress_level": req.stress_level,
        "meals": meals_data,
        "medicine_adherence_ids": req.medicine_adherence_ids,
        "symptoms": req.symptoms,
        "voice_note_url": req.voice_note_url,
        "voice_transcription": None,
        "water_intake_ml": req.water_intake_ml,
        "bowel_movement": req.bowel_movement,
        "notes": req.notes,
        "organ_scores_snapshot": {},
        "created_at": now,
        "updated_at": now,
    }
    await checkin_ref.set(data)

    # Update last_adherence_date on each medicine that was marked taken
    if req.medicine_adherence_ids:
        medicines_ref = db.collection("users").document(uid).collection("medicines")
        for med_id in req.medicine_adherence_ids:
            med_ref = medicines_ref.document(med_id)
            med_doc = await med_ref.get()
            if med_doc.exists:
                await med_ref.update({"last_adherence_date": doc_id})

    return _doc_to_checkin_response(data)


async def list_checkins(
    uid: str,
    start_date: date | None,
    end_date: date | None,
    limit: int,
    offset: int,
    db: AsyncClient,
) -> CheckinListResponse:
    checkins_ref = db.collection("users").document(uid).collection("checkins")
    query = checkins_ref.order_by("checkin_date", direction="DESCENDING")

    if start_date is not None:
        query = query.where("checkin_date", ">=", start_date.isoformat())
    if end_date is not None:
        query = query.where("checkin_date", "<=", end_date.isoformat())

    all_docs = [doc async for doc in query.stream()]
    total = len(all_docs)
    page = all_docs[offset : offset + limit]
    checkins = [_doc_to_checkin_response(doc.to_dict()) for doc in page]
    has_more = (offset + limit) < total
    return CheckinListResponse(checkins=checkins, total=total, has_more=has_more)


async def get_checkin(
    uid: str,
    checkin_id: str,
    db: AsyncClient,
) -> CheckinResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("checkins")
        .document(checkin_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("Check-in")
    return _doc_to_checkin_response(doc.to_dict())


async def update_checkin(
    uid: str,
    checkin_id: str,
    req: CheckinUpdateRequest,
    db: AsyncClient,
) -> CheckinResponse:
    checkin_ref = (
        db.collection("users")
        .document(uid)
        .collection("checkins")
        .document(checkin_id)
    )
    doc = await checkin_ref.get()
    if not doc.exists:
        raise NotFoundError("Check-in")

    existing = doc.to_dict()
    created_at: datetime = existing["created_at"]
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    if (now - created_at) > timedelta(hours=24):
        raise ForbiddenError("Check-ins can only be edited within 24 hours of creation")

    updates: dict = {"updated_at": now}

    if req.mood is not None:
        updates["mood"] = req.mood.value
    if req.energy_level is not None:
        updates["energy_level"] = req.energy_level
    if req.pain_present is not None:
        updates["pain_present"] = req.pain_present
    if req.pain_level is not None:
        updates["pain_level"] = req.pain_level.value
    if req.pain_locations is not None:
        updates["pain_locations"] = req.pain_locations
    if req.sleep_hours is not None:
        updates["sleep_hours"] = req.sleep_hours
    if req.sleep_quality is not None:
        updates["sleep_quality"] = req.sleep_quality
    if req.stress_level is not None:
        updates["stress_level"] = req.stress_level
    if req.meals is not None:
        updates["meals"] = [m.model_dump() for m in req.meals]
    if req.medicine_adherence_ids is not None:
        updates["medicine_adherence_ids"] = req.medicine_adherence_ids
        medicines_ref = db.collection("users").document(uid).collection("medicines")
        for med_id in req.medicine_adherence_ids:
            med_ref = medicines_ref.document(med_id)
            med_doc = await med_ref.get()
            if med_doc.exists:
                await med_ref.update({"last_adherence_date": checkin_id})
    if req.symptoms is not None:
        updates["symptoms"] = req.symptoms
    if req.water_intake_ml is not None:
        updates["water_intake_ml"] = req.water_intake_ml
    if req.bowel_movement is not None:
        updates["bowel_movement"] = req.bowel_movement
    if req.notes is not None:
        updates["notes"] = req.notes

    await checkin_ref.update(updates)
    updated_doc = await checkin_ref.get()
    return _doc_to_checkin_response(updated_doc.to_dict())


async def delete_checkin(
    uid: str,
    checkin_id: str,
    db: AsyncClient,
) -> None:
    checkin_ref = (
        db.collection("users")
        .document(uid)
        .collection("checkins")
        .document(checkin_id)
    )
    doc = await checkin_ref.get()
    if not doc.exists:
        raise NotFoundError("Check-in")

    data = doc.to_dict()
    medicine_ids: list[str] = data.get("medicine_adherence_ids", [])
    await checkin_ref.delete()

    # Mark any medicine_logs for this date as not taken
    if medicine_ids:
        med_logs_ref = db.collection("users").document(uid).collection("medicine_logs")
        logs_query = med_logs_ref.where("log_date", "==", checkin_id)
        log_docs = [d async for d in logs_query.stream()]
        for log_doc in log_docs:
            log_data = log_doc.to_dict()
            if log_data.get("medicine_id") in medicine_ids:
                await log_doc.reference.update({"taken": False})


async def get_streak(uid: str, db: AsyncClient) -> StreakResponse:
    checkins_ref = db.collection("users").document(uid).collection("checkins")
    query = checkins_ref.order_by("checkin_date", direction="DESCENDING")
    all_docs = [doc async for doc in query.stream()]

    total_checkins = len(all_docs)
    if total_checkins == 0:
        return StreakResponse(
            current_streak_days=0,
            longest_streak_days=0,
            last_checkin_date=None,
            total_checkins=0,
        )

    checkin_dates: list[date] = []
    for doc in all_docs:
        raw = doc.to_dict().get("checkin_date")
        if isinstance(raw, str):
            checkin_dates.append(date.fromisoformat(raw))
        elif isinstance(raw, date):
            checkin_dates.append(raw)

    # Sort descending (should already be, but ensure it)
    checkin_dates.sort(reverse=True)
    last_checkin_date = checkin_dates[0]

    # Current streak: count consecutive days from today (or yesterday) backwards
    today = date.today()
    current_streak = 0
    expected = today
    # Allow streak to start from today OR yesterday (if no check-in yet today)
    if checkin_dates[0] == today:
        expected = today
    elif checkin_dates[0] == today - timedelta(days=1):
        expected = today - timedelta(days=1)
    else:
        expected = None  # streak already broken

    if expected is not None:
        for d in checkin_dates:
            if d == expected:
                current_streak += 1
                expected = expected - timedelta(days=1)
            else:
                break

    # Longest streak: scan all dates sorted ascending
    sorted_asc = sorted(checkin_dates)
    longest_streak = 1
    run = 1
    for i in range(1, len(sorted_asc)):
        if (sorted_asc[i] - sorted_asc[i - 1]).days == 1:
            run += 1
            if run > longest_streak:
                longest_streak = run
        else:
            run = 1

    return StreakResponse(
        current_streak_days=current_streak,
        longest_streak_days=longest_streak,
        last_checkin_date=last_checkin_date,
        total_checkins=total_checkins,
    )


async def save_voice_note(
    uid: str,
    checkin_date: date,
    file_bytes: bytes,
    content_type: str,
    db: AsyncClient,
) -> VoiceUploadResponse:
    date_str = checkin_date.isoformat()
    bucket = get_storage_bucket()
    blob = bucket.blob(f"voice_notes/{uid}/{date_str}.m4a")
    blob.upload_from_string(file_bytes, content_type=content_type)
    blob.make_public()
    voice_note_url = blob.public_url

    # Estimate duration: rough heuristic — m4a at ~32kbps ≈ 4000 bytes/sec
    estimated_duration_sec = max(1, len(file_bytes) // 4000)

    job_id = str(uuid4())
    now = datetime.now(timezone.utc)
    job_data: dict = {
        "job_id": job_id,
        "uid": uid,
        "checkin_date": date_str,
        "voice_note_url": voice_note_url,
        "status": "pending",
        "transcription": None,
        "parsed_symptoms": [],
        "parsed_mood": None,
        "created_at": now,
        "updated_at": now,
    }
    await (
        db.collection("users")
        .document(uid)
        .collection("transcription_jobs")
        .document(job_id)
        .set(job_data)
    )

    return VoiceUploadResponse(
        voice_note_url=voice_note_url,
        transcription_job_id=job_id,
        estimated_duration_sec=estimated_duration_sec,
    )


async def get_transcription_status(
    uid: str,
    job_id: str,
    db: AsyncClient,
) -> TranscriptionStatusResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("transcription_jobs")
        .document(job_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("Transcription job")

    data = doc.to_dict()
    parsed_mood_raw = data.get("parsed_mood")
    parsed_mood = MoodLevel(parsed_mood_raw) if parsed_mood_raw is not None else None

    return TranscriptionStatusResponse(
        job_id=job_id,
        status=data["status"],
        transcription=data.get("transcription"),
        parsed_symptoms=data.get("parsed_symptoms", []),
        parsed_mood=parsed_mood,
    )


async def save_meal_photo(
    uid: str,
    file_bytes: bytes,
    content_type: str,
) -> str:
    photo_id = str(uuid4())
    bucket = get_storage_bucket()
    blob = bucket.blob(f"meal_photos/{uid}/{photo_id}.jpg")
    blob.upload_from_string(file_bytes, content_type=content_type)
    blob.make_public()
    return blob.public_url
