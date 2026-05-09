import asyncio
import html
import secrets
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from statistics import mean
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


def _esc(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    if isinstance(value, date):
        return value.isoformat()
    return html.escape(str(value))


def _items(value: object) -> list[object]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return list(value)
    return [value]


def _to_float(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _list(items: object, empty: str = "None reported") -> str:
    values = [str(item).strip() for item in _items(items) if str(item).strip()]
    if not values:
        return _esc(empty)
    return ", ".join(_esc(item) for item in values)


def _table(headers: list[str], rows: list[list[object]]) -> str:
    if not rows:
        return '<p class="muted">No data recorded.</p>'
    head = "".join(f"<th>{_esc(header)}</th>" for header in headers)
    body = "".join(
        "<tr>" + "".join(f"<td>{_esc(cell)}</td>" for cell in row) + "</tr>"
        for row in rows
    )
    return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def _section(title: str, body: str) -> str:
    return f"<section><h2>{_esc(title)}</h2>{body}</section>"


def _date_from(value: object) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _summarize_checkins(checkins: list[dict]) -> dict:
    symptoms = Counter()
    meals = Counter()
    notes: list[str] = []
    sleep_values: list[float] = []
    stress_values: list[float] = []
    energy_values: list[float] = []
    water_values: list[float] = []
    bowel_yes = 0

    for item in checkins:
        symptoms.update(str(s).strip() for s in _items(item.get("symptoms", [])) if str(s).strip())
        notes.extend(str(item.get("notes") or "").splitlines())
        for meal in _items(item.get("meals", [])):
            if not isinstance(meal, dict):
                continue
            desc = str(meal.get("description") or "").strip()
            if desc:
                meals.update([desc.lower()])
        if (value := _to_float(item.get("sleep_hours"))) is not None:
            sleep_values.append(value)
        if (value := _to_float(item.get("stress_level"))) is not None:
            stress_values.append(value)
        if (value := _to_float(item.get("energy_level"))) is not None:
            energy_values.append(value)
        if (value := _to_float(item.get("water_intake_ml"))) is not None:
            water_values.append(value)
        if item.get("bowel_movement") is True:
            bowel_yes += 1

    return {
        "top_symptoms": symptoms.most_common(8),
        "top_meals": meals.most_common(8),
        "recent_notes": [note.strip() for note in notes if note.strip()][:8],
        "avg_sleep": round(mean(sleep_values), 1) if sleep_values else None,
        "avg_stress": round(mean(stress_values), 1) if stress_values else None,
        "avg_energy": round(mean(energy_values), 1) if energy_values else None,
        "avg_water": round(mean(water_values), 0) if water_values else None,
        "bowel_days": bowel_yes,
    }


def _build_html(
    req: ReferralCreateRequest,
    profile: dict,
    vitals: list[dict],
    active_medicines: list[dict],
    past_medicines: list[dict],
    prescriptions: list[dict],
    health_scores: dict | None,
    recent_checkins: list[dict],
    lab_reports: list[dict],
    wearable: list[dict],
    generated_at: datetime,
) -> str:
    patient_name = profile.get("display_name") or profile.get("name") or "Patient"
    checkin_summary = _summarize_checkins(recent_checkins)
    chronic_conditions = _items(profile.get("chronic_conditions", []))
    allergies = _items(profile.get("allergies", []))
    flagged_biomarkers = []
    for report in lab_reports:
        for marker in report.get("flagged_biomarkers", []):
            flagged_biomarkers.append(marker)

    clinical_flags = []
    if chronic_conditions:
        clinical_flags.append(f"Known conditions: {_list(chronic_conditions)}")
    if allergies:
        clinical_flags.append(f"Allergies: {_list(allergies)}")
    if flagged_biomarkers:
        clinical_flags.append(f"Recent abnormal/flagged biomarkers: {_list(sorted(set(flagged_biomarkers)))}")
    if checkin_summary["top_symptoms"]:
        clinical_flags.append(
            "Frequently logged symptoms: "
            + ", ".join(f"{_esc(name)} ({count})" for name, count in checkin_summary["top_symptoms"][:5])
        )
    if not clinical_flags:
        clinical_flags.append("No major conditions, allergies, symptoms, or biomarker flags are recorded in Kutumb yet.")

    sections: list[str] = []

    sections.append(_section(
        "Doctor Snapshot",
        f"""
        <div class="snapshot">
          <div><strong>Patient</strong><br>{_esc(patient_name)}</div>
          <div><strong>DOB</strong><br>{_esc(profile.get("date_of_birth") or "Not recorded")}</div>
          <div><strong>Gender</strong><br>{_esc(profile.get("gender") or "Not recorded")}</div>
          <div><strong>Blood group</strong><br>{_esc(profile.get("blood_group") or "Not recorded")}</div>
          <div><strong>BMI</strong><br>{_esc(profile.get("bmi") or "Not recorded")}</div>
          <div><strong>Context window</strong><br>{_esc(req.checkin_days)} days</div>
        </div>
        <h3>Clinical flags to review</h3>
        <ul>{"".join(f"<li>{flag}</li>" for flag in clinical_flags)}</ul>
        """,
    ))

    sections.append(_section(
        "Medical History and Allergies",
        _table(
            ["Field", "Value"],
            [
                ["Chronic conditions", _list(chronic_conditions)],
                ["Allergies", _list(allergies)],
                ["Emergency contact", f"{profile.get('emergency_contact_name') or ''} {profile.get('emergency_contact_phone') or ''}".strip() or "Not recorded"],
                ["Height / weight", f"{profile.get('height_cm') or 'NA'} cm / {profile.get('weight_kg') or 'NA'} kg"],
            ],
        ),
    ))

    medicine_rows = []
    for med in active_medicines:
        dose_times = ", ".join(
            f"{dose.get('time', '')} {dose.get('dose_amount', '')} {dose.get('dose_unit', '')}".strip()
            for dose in med.get("dose_times", [])
        )
        medicine_rows.append([
            med.get("name", ""),
            med.get("generic_name", ""),
            med.get("category", ""),
            med.get("frequency", ""),
            dose_times,
            med.get("start_date", ""),
            med.get("prescribed_by", ""),
            med.get("adherence_pct_30d", ""),
            med.get("notes", ""),
        ])
    sections.append(_section(
        "Current Medications",
        _table(
            ["Medicine", "Generic", "Category", "Frequency", "Dose times", "Started", "Prescriber", "30d adherence", "Notes"],
            medicine_rows,
        ),
    ))

    past_rows = [
        [
            med.get("name", ""),
            med.get("category", ""),
            med.get("start_date", ""),
            med.get("end_date", ""),
            med.get("notes", ""),
        ]
        for med in past_medicines
    ]
    sections.append(_section("Past or Stopped Medications", _table(["Medicine", "Category", "Start", "End", "Notes"], past_rows)))

    prescription_rows = [
        [
            item.get("prescribed_date", ""),
            item.get("doctor_name", ""),
            item.get("hospital_name", ""),
            item.get("status", ""),
            ", ".join(m.get("name", "") for m in item.get("extracted_medicines", [])),
        ]
        for item in prescriptions
    ]
    sections.append(_section("Prescription History", _table(["Date", "Doctor", "Hospital", "Status", "Extracted medicines"], prescription_rows)))

    vitals_rows = [
        [
            v.get("recorded_at", ""),
            f"{v.get('systolic_bp', '')}/{v.get('diastolic_bp', '')}".strip("/"),
            v.get("heart_rate", ""),
            v.get("spo2", ""),
            v.get("blood_sugar", ""),
            v.get("temperature_c", ""),
            v.get("weight_kg", ""),
            v.get("source", ""),
        ]
        for v in vitals
    ]
    sections.append(_section("Recent Vitals", _table(["Recorded", "BP", "HR", "SpO2", "Sugar", "Temp C", "Weight", "Source"], vitals_rows)))

    if health_scores:
        organ_scores = health_scores.get("organ_scores", {})
        trends = health_scores.get("trends", {}) or health_scores.get("score_trends", {})
        score_rows = [
            [organ.title(), score, trends.get(organ, "")]
            for organ, score in organ_scores.items()
        ]
        sections.append(_section("Latest Organ Health Scores", _table(["Organ", "Score", "Trend"], score_rows)))

    lab_rows = []
    for report in lab_reports:
        biomarkers = report.get("biomarkers", [])
        flagged = []
        for marker in biomarkers:
            if marker.get("flag"):
                flagged.append(f"{marker.get('name')} {marker.get('value')} {marker.get('unit', '')} ({marker.get('status')})")
        lab_rows.append([
            report.get("report_date", ""),
            report.get("report_type", ""),
            report.get("lab_name", ""),
            report.get("status", ""),
            "; ".join(flagged) or _list(report.get("flagged_biomarkers", []), "None"),
        ])
    sections.append(_section("Reports and Abnormal Biomarkers", _table(["Date", "Type", "Lab", "Status", "Flagged findings"], lab_rows)))

    daily_rows = [
        [
            c.get("checkin_date", ""),
            c.get("mood", ""),
            c.get("energy_level", ""),
            c.get("pain_level", ""),
            c.get("sleep_hours", ""),
            c.get("stress_level", ""),
            c.get("water_intake_ml", ""),
            ", ".join(str(symptom) for symptom in _items(c.get("symptoms", []))),
            c.get("notes", ""),
        ]
        for c in recent_checkins[:30]
    ]
    daily_summary = f"""
      <p><strong>Averages:</strong>
      sleep {_esc(checkin_summary["avg_sleep"] or "NA")} h,
      stress {_esc(checkin_summary["avg_stress"] or "NA")}/10,
      energy {_esc(checkin_summary["avg_energy"] or "NA")}/10,
      water {_esc(checkin_summary["avg_water"] or "NA")} ml/day,
      bowel movement logged on {_esc(checkin_summary["bowel_days"])} day(s).</p>
    """
    sections.append(_section("Daily Updates and Symptom Pattern", daily_summary + _table(
        ["Date", "Mood", "Energy", "Pain", "Sleep", "Stress", "Water", "Symptoms", "Notes"],
        daily_rows,
    )))

    eating_rows = [[name, count] for name, count in checkin_summary["top_meals"]]
    sections.append(_section("Eating Habits From Logged Meals", _table(["Food or meal note", "Times logged"], eating_rows)))

    wearable_rows = [
        [
            w.get("date", ""),
            w.get("steps", ""),
            w.get("resting_heart_rate", ""),
            w.get("avg_heart_rate", ""),
            w.get("spo2_avg", ""),
            w.get("sleep_hours", ""),
            w.get("source", ""),
        ]
        for w in wearable
    ]
    sections.append(_section("Wearable Context", _table(["Date", "Steps", "Resting HR", "Avg HR", "SpO2", "Sleep h", "Source"], wearable_rows)))

    if req.notes_for_doctor:
        sections.append(_section("Patient Notes for Doctor", f"<p>{_esc(req.notes_for_doctor)}</p>"))

    doctor_info = ""
    if req.doctor_name:
        doctor_info += f"<p><strong>Doctor:</strong> {_esc(req.doctor_name)}"
        if req.doctor_specialty:
            doctor_info += f" ({_esc(req.doctor_specialty)})"
        doctor_info += "</p>"
    if req.clinic_name:
        doctor_info += f"<p><strong>Clinic / hospital:</strong> {_esc(req.clinic_name)}</p>"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Doctor Context Report - {_esc(patient_name)}</title>
  <style>
    @page {{ margin: 24mm 18mm; }}
    body {{ font-family: Arial, sans-serif; color: #1f2933; font-size: 12px; line-height: 1.45; }}
    h1 {{ color: #1B4332; font-size: 26px; margin: 0 0 8px; border-bottom: 3px solid #2D6A4F; padding-bottom: 8px; }}
    h2 {{ color: #1B4332; font-size: 17px; margin: 24px 0 8px; }}
    h3 {{ color: #2D6A4F; font-size: 13px; margin: 14px 0 6px; }}
    p {{ margin: 4px 0 8px; }}
    table {{ border-collapse: collapse; width: 100%; margin-top: 8px; page-break-inside: auto; }}
    tr {{ page-break-inside: avoid; page-break-after: auto; }}
    th, td {{ border: 1px solid #b8c2cc; padding: 5px 7px; vertical-align: top; }}
    th {{ background: #D8F3DC; color: #1B4332; text-align: left; font-weight: 700; }}
    section {{ margin-bottom: 18px; }}
    ul {{ margin-top: 6px; }}
    .meta {{ color: #52606d; margin-bottom: 18px; }}
    .snapshot {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0 12px; }}
    .snapshot div {{ border: 1px solid #b8c2cc; border-radius: 8px; padding: 8px; background: #f8faf9; }}
    .muted {{ color: #7b8794; font-style: italic; }}
    .footer {{ margin-top: 28px; padding-top: 8px; border-top: 1px solid #b8c2cc; color: #7b8794; font-size: 10px; }}
  </style>
</head>
<body>
  <h1>Doctor Context Report</h1>
  <div class="meta">
    <p><strong>Generated:</strong> {_esc(generated_at.strftime("%Y-%m-%d %H:%M UTC"))}</p>
    <p><strong>Reason for visit:</strong> {_esc(req.reason_for_visit)}</p>
    {doctor_info}
  </div>
  {"".join(sections)}
  <div class="footer">
    Generated by Kutumb from patient-entered app data, uploaded reports, medicines, check-ins, and connected device data.
    This report is for clinical context only and should be verified during consultation.
  </div>
</body>
</html>"""


async def _fetch_limit(ref, field: str, limit: int) -> list[dict]:
    query = ref.order_by(field, direction="DESCENDING").limit(limit)
    return [doc.to_dict() async for doc in query.stream()]


async def _fetch_medicines(uid: str, active: bool, db: AsyncClient) -> list[dict]:
    query = (
        db.collection("users")
        .document(uid)
        .collection("medicines")
        .where("is_active", "==", active)
        .limit(50)
    )
    return [doc.to_dict() async for doc in query.stream()]


async def _fetch_checkins(uid: str, days: int, db: AsyncClient) -> list[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    query = (
        db.collection("users")
        .document(uid)
        .collection("checkins")
        .where("checkin_date", ">=", cutoff)
        .order_by("checkin_date", direction="DESCENDING")
        .limit(max(30, min(days, 180)))
    )
    return [doc.to_dict() async for doc in query.stream()]


async def _fetch_latest_health_score(uid: str, db: AsyncClient) -> dict | None:
    ref = db.collection("users").document(uid).collection("health_scores")
    docs = [doc async for doc in ref.order_by("computed_at", direction="DESCENDING").limit(1).stream()]
    return docs[0].to_dict() if docs else None


async def create_referral(uid: str, req: ReferralCreateRequest, db: AsyncClient) -> ReferralResponse:
    from weasyprint import HTML  # type: ignore[import]

    now = datetime.now(timezone.utc)
    referral_id = str(uuid4())
    user_ref = db.collection("users").document(uid)

    (
        profile_doc,
        vitals,
        active_medicines,
        past_medicines,
        prescriptions,
        health_scores,
        checkins,
        lab_reports,
        wearable,
    ) = await asyncio.gather(
        user_ref.get(),
        _fetch_limit(user_ref.collection("vitals"), "recorded_at", 20),
        _fetch_medicines(uid, True, db),
        _fetch_medicines(uid, False, db),
        _fetch_limit(user_ref.collection("prescriptions"), "uploaded_at", 20),
        _fetch_latest_health_score(uid, db),
        _fetch_checkins(uid, req.checkin_days, db),
        _fetch_limit(user_ref.collection("lab_reports"), "report_date", 20),
        _fetch_limit(user_ref.collection("wearable_data"), "date", 30),
    )

    profile = profile_doc.to_dict() if profile_doc.exists else {}
    html_content = _build_html(
        req=req,
        profile=profile,
        vitals=vitals,
        active_medicines=active_medicines,
        past_medicines=past_medicines,
        prescriptions=prescriptions,
        health_scores=health_scores,
        recent_checkins=checkins,
        lab_reports=lab_reports,
        wearable=wearable,
        generated_at=now,
    )

    pdf_bytes: bytes = HTML(string=html_content).write_pdf()
    pdf_size = len(pdf_bytes)
    page_count = max(1, round(pdf_size / 18000))

    storage_path = f"referrals/{uid}/{referral_id}.pdf"
    bucket = get_storage_bucket()
    blob = bucket.blob(storage_path)
    blob.upload_from_string(pdf_bytes, content_type="application/pdf")

    try:
        pdf_url = blob.generate_signed_url(expiration=timedelta(days=7), method="GET", version="v4")
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
        "report_type": "doctor_context",
        "shareable_link": None,
    }

    await user_ref.collection("referrals").document(referral_id).set(referral_data)
    return _doc_to_referral_response(referral_data)


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
    doc = await db.collection("users").document(uid).collection("referrals").document(referral_id).get()
    if not doc.exists:
        raise NotFoundError("Referral")
    return _doc_to_referral_response(doc.to_dict())


async def delete_referral(uid: str, referral_id: str, db: AsyncClient) -> None:
    ref = db.collection("users").document(uid).collection("referrals").document(referral_id)
    doc = await ref.get()
    if not doc.exists:
        raise NotFoundError("Referral")

    try:
        get_storage_bucket().blob(f"referrals/{uid}/{referral_id}.pdf").delete()
    except Exception:
        pass

    await ref.delete()
    share_query = db.collection("referral_shares").where("referral_id", "==", referral_id).where("uid", "==", uid)
    share_docs = [d async for d in share_query.stream()]
    for share_doc in share_docs:
        await share_doc.reference.delete()


async def create_share_link(uid: str, referral_id: str, db: AsyncClient) -> ShareLinkResponse:
    doc = await db.collection("users").document(uid).collection("referrals").document(referral_id).get()
    if not doc.exists:
        raise NotFoundError("Referral")

    token = secrets.token_urlsafe(16)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)

    await db.collection("referral_shares").document(token).set({
        "token": token,
        "referral_id": referral_id,
        "uid": uid,
        "created_at": now,
        "expires_at": expires_at,
    })

    shareable_link = f"/api/v1/public/referrals/{token}"
    await db.collection("users").document(uid).collection("referrals").document(referral_id).update({
        "shareable_link": shareable_link
    })
    return ShareLinkResponse(shareable_link=shareable_link, expires_at=expires_at)


async def get_public_referral_url(token: str, db: AsyncClient) -> str:
    share_doc = await db.collection("referral_shares").document(token).get()
    if not share_doc.exists:
        raise NotFoundError("Referral share")
    share = share_doc.to_dict() or {}

    expires_at = share.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise NotFoundError("Referral share")

    referral_doc = await (
        db.collection("users")
        .document(share["uid"])
        .collection("referrals")
        .document(share["referral_id"])
        .get()
    )
    if not referral_doc.exists:
        raise NotFoundError("Referral")
    referral = referral_doc.to_dict() or {}
    return referral["pdf_url"]


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
