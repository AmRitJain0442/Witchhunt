import asyncio
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from google.cloud.firestore import AsyncClient

from app.core.exceptions import NotFoundError
from app.core.firebase import get_storage_bucket
from app.models.referrals import (
    ReferralCreateRequest,
    ReferralListResponse,
    ReferralResponse,
    ShareLinkResponse,
)


def _build_html(
    req: ReferralCreateRequest,
    profile: dict,
    vitals: list[dict],
    medicines: list[dict],
    health_scores: dict | None,
    recent_checkins: list[dict],
    lab_reports: list[dict],
    symptom_history: list[str],
    generated_at: datetime,
) -> str:
    patient_name = profile.get("display_name") or profile.get("name") or "Patient"
    dob = profile.get("date_of_birth", "")
    gender = profile.get("gender", "")
    blood_group = profile.get("blood_group", "")
    chronic_conditions = ", ".join(profile.get("chronic_conditions", [])) or "None reported"
    allergies = ", ".join(profile.get("allergies", [])) or "None reported"

    sections_html = ""

    if "demographics" in req.include_sections:
        sections_html += f"""
        <section>
          <h2>Patient Demographics</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <tr><th>Name</th><td>{patient_name}</td></tr>
            <tr><th>Date of Birth</th><td>{dob}</td></tr>
            <tr><th>Gender</th><td>{gender}</td></tr>
            <tr><th>Blood Group</th><td>{blood_group}</td></tr>
            <tr><th>Chronic Conditions</th><td>{chronic_conditions}</td></tr>
            <tr><th>Known Allergies</th><td>{allergies}</td></tr>
          </table>
        </section>
        """

    if "vitals" in req.include_sections and vitals:
        rows = ""
        for v in vitals:
            rows += f"""
            <tr>
              <td>{v.get('recorded_at', '')}</td>
              <td>{v.get('systolic_bp', '')}/{v.get('diastolic_bp', '')} mmHg</td>
              <td>{v.get('heart_rate', '')} bpm</td>
              <td>{v.get('spo2', '')}%</td>
              <td>{v.get('temperature_c', '')} °C</td>
              <td>{v.get('weight_kg', '')} kg</td>
            </tr>
            """
        sections_html += f"""
        <section>
          <h2>Recent Vitals</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <tr>
              <th>Recorded At</th><th>Blood Pressure</th><th>Heart Rate</th>
              <th>SpO2</th><th>Temperature</th><th>Weight</th>
            </tr>
            {rows}
          </table>
        </section>
        """

    if "medicines" in req.include_sections and medicines:
        rows = ""
        for m in medicines:
            rows += f"""
            <tr>
              <td>{m.get('name', '')}</td>
              <td>{m.get('generic_name', '')}</td>
              <td>{m.get('dose_amount', '')} {m.get('dose_unit', '')}</td>
              <td>{m.get('frequency', '')}</td>
              <td>{m.get('start_date', '')}</td>
              <td>{m.get('end_date', '') or 'Ongoing'}</td>
            </tr>
            """
        sections_html += f"""
        <section>
          <h2>Current Medications</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <tr>
              <th>Medicine</th><th>Generic Name</th><th>Dose</th>
              <th>Frequency</th><th>Start Date</th><th>End Date</th>
            </tr>
            {rows}
          </table>
        </section>
        """

    if "health_scores" in req.include_sections and health_scores:
        organ_scores = health_scores.get("organ_scores", {})
        rows = "".join(
            f"<tr><td>{organ.title()}</td><td>{score}/100</td></tr>"
            for organ, score in organ_scores.items()
        )
        sections_html += f"""
        <section>
          <h2>Health Scores</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <tr><th>Organ / System</th><th>Score</th></tr>
            {rows}
          </table>
        </section>
        """

    if "recent_checkins" in req.include_sections and recent_checkins:
        rows = ""
        for c in recent_checkins[:10]:
            rows += f"""
            <tr>
              <td>{c.get('checkin_date', '')}</td>
              <td>{c.get('mood', '')}</td>
              <td>{c.get('energy_level', '')}/10</td>
              <td>{c.get('pain_level', 'None')}</td>
              <td>{c.get('sleep_hours', '')} hrs</td>
              <td>{c.get('stress_level', '')}/10</td>
              <td>{', '.join(c.get('symptoms', [])) or 'None'}</td>
            </tr>
            """
        sections_html += f"""
        <section>
          <h2>Recent Daily Check-ins</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <tr>
              <th>Date</th><th>Mood</th><th>Energy</th>
              <th>Pain</th><th>Sleep</th><th>Stress</th><th>Symptoms</th>
            </tr>
            {rows}
          </table>
        </section>
        """

    if "lab_reports" in req.include_sections and lab_reports:
        rows = ""
        for lr in lab_reports:
            flagged = ", ".join(lr.get("flagged_biomarkers", [])) or "None"
            rows += f"""
            <tr>
              <td>{lr.get('report_date', '')}</td>
              <td>{lr.get('report_type', '')}</td>
              <td>{lr.get('lab_name', '')}</td>
              <td>{flagged}</td>
            </tr>
            """
        sections_html += f"""
        <section>
          <h2>Recent Lab Reports</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <tr><th>Date</th><th>Type</th><th>Lab</th><th>Flagged Biomarkers</th></tr>
            {rows}
          </table>
        </section>
        """

    if "symptom_history" in req.include_sections and symptom_history:
        symptom_list = "".join(f"<li>{s}</li>" for s in sorted(set(symptom_history)))
        sections_html += f"""
        <section>
          <h2>Symptom History</h2>
          <ul>{symptom_list}</ul>
        </section>
        """

    doctor_info = ""
    if req.doctor_name:
        doctor_info += f"<p><strong>Referring To:</strong> {req.doctor_name}"
        if req.doctor_specialty:
            doctor_info += f" ({req.doctor_specialty})"
        doctor_info += "</p>"
    if req.clinic_name:
        doctor_info += f"<p><strong>Clinic / Hospital:</strong> {req.clinic_name}</p>"

    notes_html = ""
    if req.notes_for_doctor:
        notes_html = f"""
        <section>
          <h2>Notes for Doctor</h2>
          <p>{req.notes_for_doctor}</p>
        </section>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Patient Referral — {patient_name}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 40px; font-size: 13px; color: #222; }}
    h1 {{ color: #1a5276; border-bottom: 2px solid #1a5276; padding-bottom: 8px; }}
    h2 {{ color: #1a5276; margin-top: 24px; }}
    table {{ border-collapse: collapse; width: 100%; margin-top: 8px; }}
    th {{ background: #d6eaf8; text-align: left; }}
    th, td {{ padding: 6px 10px; border: 1px solid #aaa; }}
    section {{ margin-bottom: 24px; }}
    .header-meta {{ margin-bottom: 16px; }}
    .footer {{ margin-top: 40px; font-size: 11px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; }}
  </style>
</head>
<body>
  <h1>Patient Referral Document</h1>
  <div class="header-meta">
    <p><strong>Generated:</strong> {generated_at.strftime('%Y-%m-%d %H:%M UTC')}</p>
    <p><strong>Reason for Visit:</strong> {req.reason_for_visit}</p>
    {doctor_info}
  </div>
  {sections_html}
  {notes_html}
  <div class="footer">
    This document was generated by the Kutumb Health App. It is intended solely for the
    named healthcare provider and should not replace a full clinical evaluation.
  </div>
</body>
</html>"""
    return html


async def _fetch_section_vitals(uid: str, db: AsyncClient) -> list[dict]:
    query = (
        db.collection("users")
        .document(uid)
        .collection("vitals")
        .order_by("recorded_at", direction="DESCENDING")
        .limit(5)
    )
    return [doc.to_dict() async for doc in query.stream()]


async def _fetch_section_medicines(uid: str, db: AsyncClient) -> list[dict]:
    query = (
        db.collection("users")
        .document(uid)
        .collection("medicines")
        .where("is_active", "==", True)
    )
    return [doc.to_dict() async for doc in query.stream()]


async def _fetch_section_health_scores(uid: str, db: AsyncClient) -> dict | None:
    query = (
        db.collection("users")
        .document(uid)
        .collection("health_scores")
        .order_by("computed_at", direction="DESCENDING")
        .limit(1)
    )
    docs = [doc async for doc in query.stream()]
    return docs[0].to_dict() if docs else None


async def _fetch_section_checkins(uid: str, days: int, db: AsyncClient) -> list[dict]:
    from datetime import date, timedelta

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    query = (
        db.collection("users")
        .document(uid)
        .collection("checkins")
        .where("checkin_date", ">=", cutoff)
        .order_by("checkin_date", direction="DESCENDING")
    )
    return [doc.to_dict() async for doc in query.stream()]


async def _fetch_section_lab_reports(uid: str, db: AsyncClient) -> list[dict]:
    query = (
        db.collection("users")
        .document(uid)
        .collection("lab_reports")
        .order_by("report_date", direction="DESCENDING")
        .limit(3)
    )
    return [doc.to_dict() async for doc in query.stream()]


async def create_referral(
    uid: str, req: ReferralCreateRequest, db: AsyncClient
) -> ReferralResponse:
    from weasyprint import HTML  # type: ignore[import]

    now = datetime.now(timezone.utc)
    referral_id = str(uuid4())

    # Fetch profile and requested sections concurrently
    profile_task = db.collection("users").document(uid).get()
    vitals_task = _fetch_section_vitals(uid, db)
    medicines_task = _fetch_section_medicines(uid, db)
    health_scores_task = _fetch_section_health_scores(uid, db)
    checkins_task = _fetch_section_checkins(uid, req.checkin_days, db)
    lab_reports_task = _fetch_section_lab_reports(uid, db)

    (
        profile_doc,
        vitals,
        medicines,
        health_scores,
        checkins,
        lab_reports,
    ) = await asyncio.gather(
        profile_task,
        vitals_task,
        medicines_task,
        health_scores_task,
        checkins_task,
        lab_reports_task,
    )

    profile = profile_doc.to_dict() if profile_doc.exists else {}

    # Derive symptom history from checkins
    symptom_history: list[str] = []
    for c in checkins:
        symptom_history.extend(c.get("symptoms", []))

    html_content = _build_html(
        req=req,
        profile=profile,
        vitals=vitals,
        medicines=medicines,
        health_scores=health_scores,
        recent_checkins=checkins,
        lab_reports=lab_reports,
        symptom_history=symptom_history,
        generated_at=now,
    )

    # Convert HTML to PDF bytes
    pdf_bytes: bytes = HTML(string=html_content).write_pdf()
    pdf_size = len(pdf_bytes)

    # Rough page count estimate: ~4KB per page for simple PDFs
    page_count = max(1, pdf_size // 4096)

    # Upload PDF to Storage
    storage_path = f"referrals/{uid}/{referral_id}.pdf"
    bucket = get_storage_bucket()
    blob = bucket.blob(storage_path)
    blob.upload_from_string(pdf_bytes, content_type="application/pdf")

    # Try signed URL (requires service account); fall back to public URL
    try:
        pdf_url = blob.generate_signed_url(
            expiration=timedelta(days=7),
            method="GET",
            version="v4",
        )
    except Exception:
        blob.make_public()
        pdf_url = blob.public_url

    expires_at = now + timedelta(days=7)

    referral_data = {
        "referral_id": referral_id,
        "uid": uid,
        "pdf_url": pdf_url,
        "pdf_size_bytes": pdf_size,
        "generated_at": now,
        "expires_at": expires_at,
        "included_sections": list(req.include_sections),
        "page_count": page_count,
        "doctor_name": req.doctor_name,
        "doctor_specialty": req.doctor_specialty,
        "clinic_name": req.clinic_name,
        "reason_for_visit": req.reason_for_visit,
        "shareable_link": None,
    }

    await (
        db.collection("users")
        .document(uid)
        .collection("referrals")
        .document(referral_id)
        .set(referral_data)
    )

    return ReferralResponse(
        referral_id=referral_id,
        pdf_url=pdf_url,
        pdf_size_bytes=pdf_size,
        generated_at=now,
        expires_at=expires_at,
        included_sections=list(req.include_sections),
        page_count=page_count,
        shareable_link=None,
    )


async def list_referrals(uid: str, db: AsyncClient) -> ReferralListResponse:
    query = (
        db.collection("users")
        .document(uid)
        .collection("referrals")
        .order_by("generated_at", direction="DESCENDING")
    )
    docs = [doc async for doc in query.stream()]
    referrals = [_doc_to_referral_response(doc.to_dict()) for doc in docs]
    return ReferralListResponse(referrals=referrals, total=len(referrals))


async def get_referral(uid: str, referral_id: str, db: AsyncClient) -> ReferralResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("referrals")
        .document(referral_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("Referral")
    return _doc_to_referral_response(doc.to_dict())


async def delete_referral(uid: str, referral_id: str, db: AsyncClient) -> None:
    ref = (
        db.collection("users")
        .document(uid)
        .collection("referrals")
        .document(referral_id)
    )
    doc = await ref.get()
    if not doc.exists:
        raise NotFoundError("Referral")

    data = doc.to_dict()
    # Attempt storage deletion best-effort
    try:
        bucket = get_storage_bucket()
        blob = bucket.blob(f"referrals/{uid}/{referral_id}.pdf")
        blob.delete()
    except Exception:
        pass

    await ref.delete()

    # Clean up any share tokens pointing to this referral
    share_query = (
        db.collection("referral_shares")
        .where("referral_id", "==", referral_id)
        .where("uid", "==", uid)
    )
    share_docs = [d async for d in share_query.stream()]
    for share_doc in share_docs:
        await share_doc.reference.delete()


async def create_share_link(
    uid: str, referral_id: str, db: AsyncClient
) -> ShareLinkResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("referrals")
        .document(referral_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("Referral")

    token = secrets.token_urlsafe(16)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)

    share_data = {
        "token": token,
        "referral_id": referral_id,
        "uid": uid,
        "created_at": now,
        "expires_at": expires_at,
    }
    await db.collection("referral_shares").document(token).set(share_data)

    shareable_link = f"/api/v1/public/referrals/{token}"

    # Also update the referral doc with the shareable link
    await (
        db.collection("users")
        .document(uid)
        .collection("referrals")
        .document(referral_id)
        .update({"shareable_link": shareable_link})
    )

    return ShareLinkResponse(shareable_link=shareable_link, expires_at=expires_at)


def _doc_to_referral_response(data: dict) -> ReferralResponse:
    generated_at = data["generated_at"]
    if isinstance(generated_at, str):
        generated_at = datetime.fromisoformat(generated_at)

    expires_at = data["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)

    return ReferralResponse(
        referral_id=data["referral_id"],
        pdf_url=data["pdf_url"],
        pdf_size_bytes=data["pdf_size_bytes"],
        generated_at=generated_at,
        expires_at=expires_at,
        included_sections=data.get("included_sections", []),
        page_count=data.get("page_count", 1),
        shareable_link=data.get("shareable_link"),
    )
