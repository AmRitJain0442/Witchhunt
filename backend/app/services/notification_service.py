"""
Notification service — FCM push + SMS (Twilio).
All notification calls are fire-and-forget; failures are logged but never
bubble up to block the caller (SOS, medicine alerts, etc.).
"""
import logging
from dataclasses import dataclass

from firebase_admin import messaging

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class NotificationContact:
    name: str
    phone_number: str
    fcm_token: str | None = None


def _send_fcm(token: str, title: str, body: str, data: dict | None = None) -> bool:
    try:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=token,
            android=messaging.AndroidConfig(priority="high"),
            apns=messaging.APNSConfig(
                headers={"apns-priority": "10"},
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default", badge=1)
                ),
            ),
        )
        messaging.send(message)
        return True
    except Exception as e:
        logger.warning("FCM send failed for token %s: %s", token[:20], e)
        return False


def _send_sms(phone_number: str, body: str) -> bool:
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.info("Twilio not configured — skipping SMS to %s", phone_number)
        return False
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=body,
            from_=settings.twilio_from_number,
            to=phone_number,
        )
        return True
    except Exception as e:
        logger.warning("SMS send failed to %s: %s", phone_number, e)
        return False


def send_sos_alert(
    contacts: list[NotificationContact],
    patient_name: str,
    message: str | None,
    severity: str,
    maps_link: str | None = None,
) -> dict[str, str]:
    """
    Send SOS alert to all contacts. Returns dict of {contact_name: "push"|"sms"|"failed"}.
    Never raises.
    """
    results: dict[str, str] = {}
    body_parts = [f"🚨 SOS from {patient_name}"]
    if message:
        body_parts.append(message)
    if maps_link:
        body_parts.append(f"Location: {maps_link}")
    body_parts.append(f"Severity: {severity.upper()}")
    full_body = " | ".join(body_parts)

    for contact in contacts:
        sent = False
        if contact.fcm_token:
            sent = _send_fcm(
                contact.fcm_token,
                title=f"🚨 SOS Alert — {patient_name}",
                body=full_body,
                data={"type": "sos", "severity": severity},
            )
            if sent:
                results[contact.name] = "push"
                continue

        # Fallback to SMS
        sent = _send_sms(contact.phone_number, full_body)
        results[contact.name] = "sms" if sent else "failed"

    return results


def send_all_clear(
    contacts: list[NotificationContact],
    patient_name: str,
    resolution: str,
) -> None:
    """Send all-clear after SOS resolved. Never raises."""
    body = f"✅ All clear — {patient_name}'s SOS has been marked as {resolution}."
    for contact in contacts:
        if contact.fcm_token:
            _send_fcm(contact.fcm_token, title="✅ All Clear", body=body)
        else:
            _send_sms(contact.phone_number, body)


def send_refill_alert(fcm_token: str | None, phone: str, medicine_name: str, days_remaining: float) -> None:
    """Medicine refill reminder. Never raises."""
    body = f"💊 Refill needed: {medicine_name} has ~{days_remaining:.0f} days of stock left."
    if fcm_token:
        _send_fcm(fcm_token, title="Medicine Refill Alert", body=body)
    else:
        _send_sms(phone, body)


def send_family_invite(phone_number: str, inviter_name: str, invite_id: str) -> None:
    """SMS invite to join Kutumb. Never raises."""
    body = (
        f"👨‍👩‍👧 {inviter_name} has invited you to join their Kutumb family health circle. "
        f"Download the app and use code {invite_id} to accept."
    )
    _send_sms(phone_number, body)
