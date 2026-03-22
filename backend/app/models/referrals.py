from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ReferralCreateRequest(BaseModel):
    doctor_name: str | None = None
    doctor_specialty: str | None = None
    clinic_name: str | None = None
    reason_for_visit: str
    include_sections: list[Literal[
        "demographics", "vitals", "medicines", "health_scores",
        "recent_checkins", "lab_reports", "symptom_history"
    ]] = ["demographics", "vitals", "medicines", "health_scores", "recent_checkins"]
    checkin_days: int = 30
    language: str = "en"
    notes_for_doctor: str | None = None


class ReferralResponse(BaseModel):
    referral_id: str
    pdf_url: str
    pdf_size_bytes: int
    generated_at: datetime
    expires_at: datetime
    included_sections: list[str]
    page_count: int
    shareable_link: str | None = None


class ReferralListResponse(BaseModel):
    referrals: list[ReferralResponse]
    total: int


class ShareLinkResponse(BaseModel):
    shareable_link: str
    expires_at: datetime
