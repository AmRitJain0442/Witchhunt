from datetime import datetime

from pydantic import BaseModel

from app.core.enums import FamilyPermission


class FamilyMember(BaseModel):
    member_id: str
    target_uid: str | None = None
    display_name: str
    relationship: str
    phone_number: str
    permissions: list[FamilyPermission]
    is_registered: bool = False
    avatar_url: str | None = None
    added_at: datetime


class AddFamilyMemberRequest(BaseModel):
    phone_number: str
    display_name: str
    relationship: str
    permissions: list[FamilyPermission]


class UpdateFamilyMemberRequest(BaseModel):
    relationship: str | None = None
    display_name: str | None = None
    permissions: list[FamilyPermission] | None = None


class FamilyMemberListResponse(BaseModel):
    members: list[FamilyMember]
    total: int


class FamilyMemberDashboard(BaseModel):
    member_id: str
    target_uid: str
    display_name: str
    permissions: list[FamilyPermission]
    latest_checkin: dict | None = None
    medicine_adherence_pct: float | None = None
    health_scores: dict | None = None
    sos_events_count: int | None = None
