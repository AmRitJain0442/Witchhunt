import logging
from datetime import datetime, timezone
from uuid import uuid4

from google.cloud.firestore import AsyncClient

from app.core.enums import FamilyPermission, SOSStatus
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.emergency import (
    EmergencyContact,
    EmergencyContactsResponse,
    SOSListResponse,
    SOSRequest,
    SOSResolveRequest,
    SOSResponse,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Notification stub — imported lazily so failures never block SOS
# ---------------------------------------------------------------------------

async def _send_sos_alert_safe(contacts: list[EmergencyContact], event: SOSResponse) -> None:
    """Fire-and-forget SOS notification. Errors are logged but not re-raised."""
    try:
        from app.services.notification_service import (  # type: ignore
            NotificationContact,
            send_sos_alert,
        )
        notif_contacts = [
            NotificationContact(
                name=c.display_name,
                phone_number=c.phone_number,
                fcm_token=None,  # FCM tokens stored on user docs — stub as None for now
            )
            for c in contacts
        ]
        maps_link: str | None = None
        send_sos_alert(
            contacts=notif_contacts,
            patient_name=event.event_id,
            message=event.message,
            severity=event.severity.value,
            maps_link=maps_link,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("SOS notification failed (non-fatal): %s", exc)


async def _send_all_clear_safe(contacts: list[EmergencyContact], event: SOSResponse) -> None:
    """Fire-and-forget all-clear notification."""
    try:
        from app.services.notification_service import (  # type: ignore
            NotificationContact,
            send_all_clear,
        )
        notif_contacts = [
            NotificationContact(
                name=c.display_name,
                phone_number=c.phone_number,
                fcm_token=None,
            )
            for c in contacts
        ]
        send_all_clear(
            contacts=notif_contacts,
            patient_name=event.event_id,
            resolution=event.status.value,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("All-clear notification failed (non-fatal): %s", exc)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _doc_to_sos_response(data: dict) -> SOSResponse:
    return SOSResponse(
        event_id=data["event_id"],
        triggered_at=data["triggered_at"],
        notified_contacts=data.get("notified_contacts", []),
        location_shared=data.get("location_shared", False),
        message=data.get("message"),
        severity=data["severity"],
        status=data["status"],
    )


async def _get_sos_contacts(uid: str, db: AsyncClient) -> list[EmergencyContact]:
    """Return family members that have RECEIVE_SOS permission."""
    ref = db.collection("users").document(uid).collection("family_members")
    docs = [doc async for doc in ref.stream()]

    contacts: list[EmergencyContact] = []
    for doc in docs:
        data = doc.to_dict()
        perms: list[str] = data.get("permissions", [])
        if (
            FamilyPermission.RECEIVE_SOS.value not in perms
            and FamilyPermission.FULL_ACCESS.value not in perms
        ):
            continue

        has_app = bool(data.get("target_uid"))
        notification_methods: list = ["sms"]
        if has_app:
            notification_methods = ["push", "sms"]

        contacts.append(
            EmergencyContact(
                member_id=data["member_id"],
                display_name=data["display_name"],
                phone_number=data["phone_number"],
                relationship=data.get("relationship", ""),
                has_app=has_app,
                notification_methods=notification_methods,
            )
        )
    return contacts


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

async def trigger_sos(uid: str, req: SOSRequest, db: AsyncClient) -> SOSResponse:
    event_id = str(uuid4())
    now = datetime.now(timezone.utc)

    contacts = await _get_sos_contacts(uid, db)

    notified_contacts_payload = [
        {
            "member_id": c.member_id,
            "display_name": c.display_name,
            "phone_number": c.phone_number,
            "notification_methods": c.notification_methods,
        }
        for c in contacts
    ]

    event_data: dict = {
        "event_id": event_id,
        "uid": uid,
        "triggered_at": now,
        "resolved_at": None,
        "location_shared": req.latitude is not None and req.longitude is not None,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "message": req.message,
        "severity": req.severity.value,
        "status": SOSStatus.ACTIVE.value,
        "notified_contacts": notified_contacts_payload,
        "resolution_notes": None,
    }

    await (
        db.collection("users")
        .document(uid)
        .collection("sos_events")
        .document(event_id)
        .set(event_data)
    )

    response = _doc_to_sos_response(event_data)

    # Non-blocking notification — never raises
    await _send_sos_alert_safe(contacts, response)

    return response


async def resolve_sos(
    uid: str,
    event_id: str,
    req: SOSResolveRequest,
    db: AsyncClient,
) -> SOSResponse:
    event_ref = (
        db.collection("users")
        .document(uid)
        .collection("sos_events")
        .document(event_id)
    )
    doc = await event_ref.get()
    if not doc.exists:
        raise NotFoundError("SOS event")

    data = doc.to_dict()
    if data.get("uid") != uid:
        raise ForbiddenError("You do not own this SOS event")

    now = datetime.now(timezone.utc)
    new_status = (
        SOSStatus.RESOLVED.value
        if req.resolution == "resolved"
        else SOSStatus.FALSE_ALARM.value
    )

    updates = {
        "status": new_status,
        "resolved_at": now,
        "resolution_notes": req.notes,
    }
    await event_ref.update(updates)

    updated_doc = await event_ref.get()
    response = _doc_to_sos_response(updated_doc.to_dict())

    # Send all-clear
    contacts = await _get_sos_contacts(uid, db)
    await _send_all_clear_safe(contacts, response)

    return response


async def list_sos_events(
    uid: str,
    include_family: bool,
    limit: int,
    db: AsyncClient,
) -> SOSListResponse:
    ref = db.collection("users").document(uid).collection("sos_events")
    query = ref.order_by("triggered_at", direction="DESCENDING").limit(limit)
    docs = [doc async for doc in query.stream()]
    events: list[SOSResponse] = [_doc_to_sos_response(doc.to_dict()) for doc in docs]

    if include_family:
        # Gather family members' UIDs
        family_ref = db.collection("users").document(uid).collection("family_members")
        family_docs = [doc async for doc in family_ref.stream()]

        for fdoc in family_docs:
            fdata = fdoc.to_dict()
            target_uid = fdata.get("target_uid")
            if not target_uid:
                continue

            # Query their sos_events where this uid appears in notified_contacts
            fsos_ref = (
                db.collection("users").document(target_uid).collection("sos_events")
            )
            fsos_docs = [doc async for doc in fsos_ref.stream()]
            for fsos_doc in fsos_docs:
                fsos_data = fsos_doc.to_dict()
                notified = fsos_data.get("notified_contacts", [])
                # Check if uid appears in any contact's member record
                if any(uid in str(nc) for nc in notified):
                    events.append(_doc_to_sos_response(fsos_data))

        # Sort combined and slice
        events.sort(key=lambda e: e.triggered_at, reverse=True)
        events = events[:limit]

    active_count = sum(1 for e in events if e.status == SOSStatus.ACTIVE)

    return SOSListResponse(
        events=events,
        total=len(events),
        active_count=active_count,
    )


async def get_sos_event(uid: str, event_id: str, db: AsyncClient) -> SOSResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("sos_events")
        .document(event_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("SOS event")

    data = doc.to_dict()
    if data.get("uid") != uid:
        raise ForbiddenError("You do not own this SOS event")

    return _doc_to_sos_response(data)


async def get_emergency_contacts(uid: str, db: AsyncClient) -> EmergencyContactsResponse:
    contacts = await _get_sos_contacts(uid, db)
    return EmergencyContactsResponse(contacts=contacts, total=len(contacts))
