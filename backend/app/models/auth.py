from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, field_validator, model_validator


class AuthRegisterRequest(BaseModel):
    firebase_token: str | None = None
    id_token: str | None = None
    display_name: str | None = None
    phone_number: str | None = None           # E.164: +919876543210
    date_of_birth: date | None = None
    gender: Literal["male", "female", "other", "prefer_not_to_say"] = "prefer_not_to_say"
    language_preference: str = "en"
    fcm_token: str | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v and not v.startswith("+"):
            raise ValueError("phone_number must be in E.164 format (e.g. +919876543210)")
        return v

    @model_validator(mode="after")
    def validate_token(self) -> "AuthRegisterRequest":
        if self.firebase_token is None:
            self.firebase_token = self.id_token
        if not self.firebase_token:
            raise ValueError("firebase_token is required")
        return self


class AuthRegisterResponse(BaseModel):
    uid: str
    display_name: str
    phone_number: str | None = None
    created_at: datetime
    is_profile_complete: bool


class AuthLoginRequest(BaseModel):
    firebase_token: str | None = None
    id_token: str | None = None
    fcm_token: str | None = None

    @model_validator(mode="after")
    def validate_token(self) -> "AuthLoginRequest":
        if self.firebase_token is None:
            self.firebase_token = self.id_token
        if not self.firebase_token:
            raise ValueError("firebase_token is required")
        return self


class AuthLoginResponse(BaseModel):
    uid: str
    display_name: str
    is_profile_complete: bool
    family_count: int
    has_active_medicines: bool


class AuthRefreshRequest(BaseModel):
    firebase_token: str | None = None
    id_token: str | None = None
    fcm_token: str | None = None

    @model_validator(mode="after")
    def validate_token(self) -> "AuthRefreshRequest":
        if self.firebase_token is None:
            self.firebase_token = self.id_token
        if not self.firebase_token:
            raise ValueError("firebase_token is required")
        return self
