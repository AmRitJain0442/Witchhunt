from datetime import date, datetime

from pydantic import BaseModel


class UserProfileResponse(BaseModel):
    uid: str
    display_name: str
    phone_number: str
    date_of_birth: date | None = None
    gender: str | None = None
    language_preference: str = "en"
    profile_photo_url: str | None = None
    blood_group: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    bmi: float | None = None
    chronic_conditions: list[str] = []
    allergies: list[str] = []
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    is_profile_complete: bool = False
    fcm_token: str | None = None
    created_at: datetime
    updated_at: datetime


class UserProfileUpdateRequest(BaseModel):
    display_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    language_preference: str | None = None
    blood_group: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    chronic_conditions: list[str] | None = None
    allergies: list[str] | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None


class PhotoUploadResponse(BaseModel):
    profile_photo_url: str
