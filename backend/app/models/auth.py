from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, field_validator


class AuthRegisterRequest(BaseModel):
    firebase_token: str
    display_name: str
    phone_number: str           # E.164: +919876543210
    date_of_birth: date
    gender: Literal["male", "female", "other", "prefer_not_to_say"]
    language_preference: str = "en"
    fcm_token: str | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not v.startswith("+"):
            raise ValueError("phone_number must be in E.164 format (e.g. +919876543210)")
        return v


class AuthRegisterResponse(BaseModel):
    uid: str
    display_name: str
    phone_number: str
    created_at: datetime
    is_profile_complete: bool


class AuthLoginRequest(BaseModel):
    firebase_token: str
    fcm_token: str | None = None


class AuthLoginResponse(BaseModel):
    uid: str
    display_name: str
    is_profile_complete: bool
    family_count: int
    has_active_medicines: bool


class AuthRefreshRequest(BaseModel):
    firebase_token: str
    fcm_token: str | None = None
