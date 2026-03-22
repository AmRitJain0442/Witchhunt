from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.core.enums import SOSStatus, SOSSeverity


class SOSRequest(BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    message: str | None = None
    severity: SOSSeverity = SOSSeverity.HIGH


class SOSResponse(BaseModel):
    event_id: str
    triggered_at: datetime
    notified_contacts: list[dict] = []
    location_shared: bool = False
    message: str | None = None
    severity: SOSSeverity
    status: SOSStatus


class SOSResolveRequest(BaseModel):
    resolution: Literal["resolved", "false_alarm"]
    notes: str | None = None


class SOSListResponse(BaseModel):
    events: list[SOSResponse]
    total: int
    active_count: int


class EmergencyContact(BaseModel):
    member_id: str
    display_name: str
    phone_number: str
    relationship: str
    has_app: bool
    notification_methods: list[Literal["push", "sms"]]


class EmergencyContactsResponse(BaseModel):
    contacts: list[EmergencyContact]
    total: int
