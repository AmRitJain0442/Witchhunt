# Backend Services Map

_Generated: step-4 — 2026-03-24_

## Overview

14 service files covering all business domains. Firestore is the single data store (no SQL); Anthropic Claude is the only AI API for insight generation; Firebase Storage for binary uploads; Twilio for SMS; Firebase Messaging (FCM) for push.

---

## 1. `auth_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}` | Read (existence check), Write (create) |
| `users/{uid}/family_members` | Read (stream, count) |
| `users/{uid}/medicines` | Read (active query, limit 1) |

### External APIs
- **Firebase Auth** (`auth.set_custom_user_claims`, `auth.revoke_refresh_tokens`)

### Key Business Rules
1. **Register**: verifies Firebase token → checks user doc doesn't already exist → creates user doc with `is_profile_complete=False` → sets custom claim `role=user`.
2. **Login**: verifies token → upserts FCM token → returns family_count + has_active_medicines flag (used for mobile app onboarding state).
3. **Logout**: revokes ALL Firebase refresh tokens for the uid, clears FCM token from Firestore, invalidates local TTLCache entry.

---

## 2. `user_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}` | Read, Update |

### External APIs
- **Firebase Storage** — profile photo upload to `profile_photos/{uid}/avatar.jpg` (made public)

### Key Business Rules
1. **Profile completeness check** (`_check_profile_complete`): requires all 6 fields non-null/non-empty: `date_of_birth`, `gender`, `blood_group`, `height_cm`, `weight_kg`, `chronic_conditions`.
2. **BMI auto-recompute**: whenever `height_cm` or `weight_kg` changes, BMI is recomputed and stored: `weight / (height_m)²`, rounded to 1 decimal.
3. **Soft delete**: sets `is_deleted=True`, clears FCM token, revokes Firebase refresh tokens — does NOT hard-delete the Firestore document.

---

## 3. `family_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}/family_members` | Read (stream, query), Write, Delete |
| `users/{target_uid}/family_members` | Write (mirror record), Delete (reverse) |
| `family_invites/{invite_id}` | Write, Read, Update |
| `users` | Read (phone number lookup) |
| `users/{target_uid}/checkins` | Read (dashboard) |
| `users/{target_uid}/medicines` | Read (dashboard) |
| `users/{target_uid}/health_scores` | Read (dashboard) |
| `users/{target_uid}/sos_events` | Read (dashboard) |

### Key Business Rules
1. **Phone-based lookup**: when adding a family member, the backend queries `users` collection for matching `phone_number` to determine if the invitee is already registered.
2. **Bidirectional mirror**: when adding a registered invitee, a mirror record is immediately created in their `family_members` subcollection with only `RECEIVE_SOS` permission and `invite_status=pending`.
3. **Invite lifecycle** (7-day expiry): pending → accepted/declined. On accept, both sides are updated to link `target_uid` and grant full permissions. On decline, the pending mirror record is deleted.
4. **Dashboard respects permissions** (`get_family_dashboard`): each of checkins/medicines/health_scores/SOS is fetched only if the corresponding `FamilyPermission` is granted (or `full_access`).
5. **Medicine adherence in dashboard**: computed inline as `taken_count / (active_count × 30)` across last 30 days of checkins, capped at 100%.
6. **Remove cascades**: deleting a family member also deletes the reverse mirror record from the target's `family_members`.

---

## 4. `health_score_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}/checkins` | Read (last 7 days) |
| `users/{uid}/vitals` | Read (last 7 days) |
| `users/{uid}/wearable_data` | Read (last 7 days) |
| `users/{uid}/health_scores` | Read (previous scores), Write (today's score) |
| `users/{uid}` | Read (height for BMI in vitals response) |

### Key Business Rules — Scoring Algorithm

**Base score**: 70.0 for each organ. Adjustments (clamped 0–100):

| Organ | Key Inputs | Scoring Logic |
|---|---|---|
| **Heart** | HR, BP, stress, cardiac symptoms | HR outside 60-80: −5; BP: optimal +10, elevated 0, stage-1 −10, stage-2 −20; avg stress >7: −10; cardiac symptoms: −15 |
| **Brain** | Sleep hrs, sleep quality, stress, headache | 7-9h +15, 6-7h neutral, <6h −15, >9h −5; quality ≥4 +10, <3 −10; stress >7 −10; headaches −10 |
| **Gut** | Bowel movement, water intake, gut symptoms, meals | ≥5/7 days bowel +10; >2000ml water +10; gut symptoms −15; irregular meals −10 |
| **Lungs** | SpO2 (vitals + wearable), respiratory symptoms, steps | SpO2 >97 +15, 94-97 neutral, <94 −25; respiratory symptoms −15; >8000 steps/day +10 |

**Overall score** (weighted average):
- Heart: 30%, Brain: 25%, Gut: 25%, Lungs: 20%

**Trend** (vs 7-days-ago stored score):
- diff > 3 → `improving`; diff < −3 → `declining`; else → `stable`

**Data completeness**: `(checkins_in_7d + distinct_vital_types + min(wearable_days,2)) / 12`

**Rate limit**: `trigger_recompute` enforces 1-hour cooldown per user via `users/{uid}.last_recompute_at`.

**Persistence**: scores saved as `users/{uid}/health_scores/{YYYY-MM-DD}` (one doc per day).

**Normal range validation** (`_is_normal_range`): used for manual vitals only:
- BP: systolic 90-120, diastolic 60-80
- HR: 60-100 bpm
- SpO2: >95%
- Blood sugar: 70-99 mg/dL (fasting)

**Vital source merge**: `get_vitals()` reads from `vitals` subcollection (manual) + today's `wearable_data` doc for steps/sleep.

**Biomarker trend** (`get_biomarker_trends`): uses least-squares linear regression over ≥3 data points; directional logic differs for "high is bad" markers (Glucose, HbA1c, Creatinine, TSH, LDL, Triglycerides, WBC) vs "low is bad" (HDL, Hemoglobin).

---

## 5. `health_context_service.py`

### Firestore Collections (all read, parallel via `asyncio.gather`)
| Collection | Lookback |
|---|---|
| `users/{uid}` | Profile |
| `users/{uid}/medicines` (active=True) | All active |
| `users/{uid}/medicines` (active=False) | 6 months |
| `users/{uid}/checkins` | 14 days |
| `users/{uid}/health_scores` | Latest 1 |
| `users/{uid}/lab_reports` | 6 months (flagged biomarkers only) |
| `users/{uid}/wearable_data` | 7 days |

### Key Business Rules
1. **In-memory TTLCache**: 30-minute cache (`maxsize=500, ttl=1800`) keyed by `uid`; avoids 7 concurrent Firestore queries on every AI call.
2. **HealthContext** is the AI's "world model" — assembled once and passed to all 4 AI insight functions. Contains: demographics, BMI, chronic conditions, allergies, active/past medicines, organ scores, symptom history, averages (sleep, stress, pain, energy, water, steps, resting HR), latest vitals, and flagged biomarkers from lab reports.
3. **Data completeness score**: ratio of 19 fields that are non-null/non-empty (used to indicate to AI how much context it has).
4. **Flagged biomarker deduplication**: keeps only the most recent occurrence of each biomarker name across the last 6 months of lab reports.

---

## 6. `medicine_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}/medicines` | Read, Write, Update |
| `users/{uid}/prescriptions` | Read (validation) |
| `users/{uid}/medicine_logs` | Read, Write |
| `users/{uid}/medicine_refill_logs` | Write |

### External APIs
None (pure Firestore)

### Key Business Rules
1. **Emergency vs prescribed**: medicines in `EMERGENCY_CATEGORIES` (OTC/emergency subset) do NOT require a prescription link. Prescription validation only applies to non-emergency medicines.
2. **Prescription validation** (on create): prescription must exist, have status `parsed`, and be within 365 days of `prescribed_date`.
3. **Days supply**: `current_stock / doses_per_day`. Doses per day: once=1, twice=2, thrice=3, every_x_hours=24/x, weekly=1/7, as_needed=0 (infinite supply assumed).
4. **Refill alert**: triggered when `days_supply_remaining < reorder_threshold` (default 7 days).
5. **Dose log & atomic stock decrement**: `log_dose(action=taken)` uses a **Firestore transaction** to atomically decrement `current_stock`, recompute `days_supply_remaining`, and update `refill_alert`.
6. **Today's schedule**: built by cross-referencing active medicines' dose_times against today's `medicine_logs`. Doses are marked overdue if >30 min past scheduled time and not yet logged. Adherence = taken / (taken + skipped).
7. **Delete = soft deactivate**: medicines are never hard-deleted; `is_active=False` instead.
8. **Adherence summary**: aggregates `medicine_logs` for the period, computes per-medicine %, best/worst day of week (normalized by expected doses), and current streak of consecutive days with ≥1 dose taken.

---

## 7. `prescription_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}/prescriptions` | Read, Write, Update, Delete |
| `users/{uid}/ocr_jobs` | Write, Read |
| `users/{uid}/medicines` | Read (delete guard) |

### External APIs
- **Firebase Storage** — uploads to `prescriptions/{uid}/{prescription_id}/original.{ext}` (made public)

### Key Business Rules
1. **Validity**: a prescription is valid if `prescribed_date >= today - 365 days`. This is re-evaluated live on every read (not cached).
2. **Expiry**: `expires_at = prescribed_date + 365 days`.
3. **OCR job creation**: on upload, creates a `pending` OCR job doc alongside the prescription doc. The OCR job is polled via `GET /ocr/{job_id}` — actual OCR processing is NOT in this service (presumably a cloud function or background worker updates the job).
4. **Delete guard**: a prescription with linked active medicines cannot be deleted (raises `ConflictError` listing medicine names).
5. **Correction**: allows user to manually fix OCR-extracted fields (medicines, doctor, dates) after parsing.

---

## 8. `checkin_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}/checkins` | Read, Write, Delete |
| `users/{uid}/medicines` | Update (`last_adherence_date`) |
| `users/{uid}/medicine_logs` | Update (on delete) |
| `users/{uid}/transcription_jobs` | Write, Read |

### External APIs
- **Firebase Storage** — voice notes to `voice_notes/{uid}/{date}.m4a`, meal photos to `meal_photos/{uid}/{uuid}.jpg`

### Key Business Rules
1. **One checkin per date**: doc ID = `checkin_date` ISO string. Duplicate date → `ConflictError`.
2. **24-hour edit window**: checkins can only be updated within 24 hours of creation.
3. **Medicine adherence tracking**: creating/updating a checkin with `medicine_adherence_ids` updates `last_adherence_date` on each medicine doc.
4. **Checkin delete cascade**: when a checkin is deleted, any `medicine_logs` for that date with matching medicine IDs are set to `taken=False`.
5. **Streak calculation**: current streak counts backward from today (or yesterday if no checkin today) through consecutive daily checkins. Longest streak uses a sorted ascending scan.
6. **Voice note**: saves to Storage, creates a `transcription_jobs` doc with status `pending`. Duration estimated as `bytes / 4000` (32 kbps heuristic). Actual transcription is done by a separate async process.

---

## 9. `lab_report_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}/lab_reports` | Read, Write, Update, Delete |
| `users/{uid}/ocr_jobs` | Write, Read |

### External APIs
- **Firebase Storage** — uploads to `lab_reports/{uid}/{report_id}/original.{ext}` (made public); delete on report delete

### Key Business Rules
1. **Status pipeline**: `uploaded → processing → parsed / failed`. OCR progress is inferred from status (0%, 50%, 100%).
2. **Biomarker flagging**: `_evaluate_biomarker_status` uses hardcoded `NORMAL_RANGES` for 10 biomarkers (Hemoglobin, Glucose, HbA1c, Creatinine, TSH, LDL, HDL, Triglycerides, Platelets, WBC). Critical thresholds = ±20% beyond normal range. Falls back to per-report reference_range if provided.
3. **Flagged biomarker list**: `flagged_biomarkers` field on the report stores names of flagged biomarkers (used for quick filtering).
4. **Correction**: user can patch any biomarker value; status/flag are recomputed using the same `_evaluate_biomarker_status` function.
5. **Biomarker trend**: linear regression over ≥3 data points; direction depends on `_HIGH_IS_BAD` set.
6. **Storage cleanup on delete**: best-effort blob deletion by extracting blob path from the public URL.

---

## 10. `emergency_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}/sos_events` | Write, Read, Update |
| `users/{uid}/family_members` | Read (SOS contacts) |
| `users/{target_uid}/sos_events` | Read (family SOS list) |

### External APIs
- **`notification_service`** — fire-and-forget (errors logged, never re-raised)

### Key Business Rules
1. **SOS contacts** = family members with `RECEIVE_SOS` or `FULL_ACCESS` permission.
2. **Notification method selection**: if `target_uid` exists on the family member record (app user), method is `["push", "sms"]`; otherwise `["sms"]` only.
3. **Notification is non-blocking**: called with `await _send_sos_alert_safe(...)` which catches all exceptions — SOS is persisted to Firestore before notification is attempted.
4. **Resolution**: status transitions to `resolved` or `false_alarm`. All-clear notification is sent on resolve.
5. **Family SOS list**: when `include_family=True`, fetches family members' SOS events and checks if current uid appears in `notified_contacts`.

---

## 11. `ai_insight_service.py` ⭐ Most Complex

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}/insight_cache/{cache_key}` | Read, Write |
| `users/{uid}/interaction_checks` | Write |

### External APIs
- **Anthropic Claude** (`claude-sonnet-4-6`, max_tokens=4096) — ALL 4 insight functions call Claude
- Indirectly via `health_context_service.build_health_context()` which reads 7 collections

### Claude Integration Pattern
- Single module-level `AsyncAnthropic()` client
- **System prompt**: clinical health assistant role, Indian family context, JSON-only responses, must include disclaimer, must flag `must_consult_doctor=True` for severe findings
- **JSON parsing**: `_safe_parse_json()` strips markdown fences, falls back to substring extraction, returns `{}` on total failure
- **Safe defaults**: every function has a hardcoded safe fallback response when Claude returns empty/invalid JSON
- **24-hour Firestore cache** (`insight_cache/{cache_key}`): keyed by function name

### The 4 Claude-Powered Functions

#### `check_interactions(req)` — NO cache (always fresh)
- Builds full HealthContext → sends to Claude with proposed medicine details
- Claude checks: drug-drug, drug-condition, allergy alerts, lab-based warnings, food-drug
- Result stored in `interaction_checks/{check_id}` (permanent audit trail)
- Safe default: `overall_risk=caution, safe_to_add=False, must_consult_doctor=True`

#### `generate_exercise_suggestions()` — 24h cache
- Pre-computes hard contraindications locally (hypertension, heart failure, pain≥7, SpO2<94, energy≤3) and injects them into the prompt as hard rules Claude MUST enforce
- Requests weekly plan + per-exercise precautions + contraindications
- `force_refresh=True` bypasses cache

#### `get_cabinet_warnings()` — 24h cache (no force refresh)
- Audits ALL pairwise interactions between current active medicines
- Checks dosage alerts (renal/hepatic from flagged biomarkers, age)
- Combined food warnings for all active medicines
- Returns `cabinet_risk_level: low/moderate/high`

#### `generate_advisories()` — 24h cache
- Generates personalised health advisories: trend alerts, symptom patterns, medicine timing, lab follow-up, seasonal guidance
- Advisory expiry: urgent = 2 days, others = 7 days
- Ensures each advisory has a UUID `advisory_id`
- `force_refresh=True` bypasses cache

---

## 12. `wearable_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}/wearable_connections` | Read, Write, Update |
| `users/{uid}/wearable_data` | Write, Read (stream) |

### Key Business Rules
1. **Apple Health path** (client-push): client sends raw data points → backend aggregates by metric using strategy (steps=sum, HR=avg, resting_HR=min, sleep=sum) → persists as daily snapshot doc keyed by date.
2. **Google Fit path** (server-pull): OAuth nonce stored in `wearable_connections`; actual token exchange is a stub (hackathon note in comments). `sync_wearable` for Google Fit returns 0 records.
3. **Sleep unit conversion**: raw `sleep_duration` arrives in minutes, stored as hours (`/60`).
4. **Metric field mapping**: `heart_rate → avg_heart_rate`, `spo2 → spo2_avg`, `sleep_duration → sleep_hours`, etc.
5. **Period averages**: `get_wearable_data()` computes per-metric means over the requested date range, respecting optional `metrics` filter.

---

## 13. `referral_service.py`

### Firestore Collections
| Collection | Operation |
|---|---|
| `users/{uid}` | Read (profile) |
| `users/{uid}/vitals` | Read (last 5) |
| `users/{uid}/medicines` | Read (active) |
| `users/{uid}/health_scores` | Read (latest 1) |
| `users/{uid}/checkins` | Read (configurable days) |
| `users/{uid}/lab_reports` | Read (last 3) |
| `users/{uid}/referrals` | Read, Write, Update, Delete |
| `referral_shares/{token}` | Write, Read, Delete |

### External APIs
- **WeasyPrint** — HTML-to-PDF library (not an external web API; requires WeasyPrint installed)
- **Firebase Storage** — PDF upload to `referrals/{uid}/{referral_id}.pdf`

### Key Business Rules
1. **Concurrent data fetch**: all 6 Firestore reads are done in parallel with `asyncio.gather`.
2. **Selective sections**: user chooses which sections to include (`demographics`, `vitals`, `medicines`, `health_scores`, `recent_checkins`, `lab_reports`, `symptom_history`).
3. **PDF generation**: WeasyPrint renders HTML template to PDF bytes; page count estimated as `bytes // 4096`.
4. **URL strategy**: tries V4 signed URL (7 days) first; falls back to making blob public.
5. **Referral expiry**: 7 days (`generated_at + 7d`). No automatic cleanup implemented.
6. **Share token**: cryptographically random 16-byte token (`secrets.token_urlsafe`); stored in top-level `referral_shares` collection (not user subcollection) for public lookup without auth.
7. **Symptom history**: derived inline from checkins by flattening all `symptoms` arrays.

---

## 14. `notification_service.py`

### External APIs
- **Firebase Messaging** (`firebase_admin.messaging`) — FCM push
- **Twilio** (`twilio.rest.Client`) — SMS fallback

### Key Business Rules
1. **Fire-and-forget design**: all functions are synchronous (not async) and catch all exceptions internally. Never raises. Used via `await _send_..._safe()` wrappers in emergency_service.
2. **Push priority**: FCM first, SMS fallback. For SOS: if FCM fails, falls back to SMS per contact.
3. **Twilio optional**: if `twilio_account_sid` or `twilio_auth_token` not configured, SMS is skipped silently.
4. **FCM config**: Android high priority, APNS priority 10 + sound + badge.
5. **4 notification types**:
   - `send_sos_alert`: SOS with severity + optional location link
   - `send_all_clear`: after SOS resolution
   - `send_refill_alert`: medicine stock low (single recipient)
   - `send_family_invite`: SMS-only invite code

---

## Cross-Service Firestore Collection Map

| Collection | Written by | Read by |
|---|---|---|
| `users/{uid}` | auth, user, checkin(meds) | all services |
| `users/{uid}/family_members` | family | family, emergency, checkin(dashboard) |
| `family_invites` | family | family |
| `users/{uid}/checkins` | checkin | health_score, health_context, family, referral |
| `users/{uid}/medicines` | medicine | checkin, health_context, referral, family |
| `users/{uid}/medicine_logs` | medicine | medicine, checkin |
| `users/{uid}/medicine_refill_logs` | medicine | — |
| `users/{uid}/prescriptions` | prescription | medicine |
| `users/{uid}/ocr_jobs` | prescription, lab_report | prescription, lab_report |
| `users/{uid}/vitals` | health_score | health_score, referral, health_context |
| `users/{uid}/health_scores` | health_score | health_context, family, referral |
| `users/{uid}/wearable_data` | wearable | health_score, health_context |
| `users/{uid}/wearable_connections` | wearable | wearable |
| `users/{uid}/lab_reports` | lab_report | health_context, referral |
| `users/{uid}/sos_events` | emergency | emergency, family |
| `users/{uid}/insight_cache` | ai_insight | ai_insight |
| `users/{uid}/interaction_checks` | ai_insight | — |
| `users/{uid}/transcription_jobs` | checkin | checkin |
| `users/{uid}/referrals` | referral | referral |
| `referral_shares` | referral | referral (public endpoint) |

## Services That Call Claude (Anthropic API)

| Service | Function | Cache | Schema returned |
|---|---|---|---|
| `ai_insight_service` | `check_interactions` | None (always fresh) | `InteractionCheckResponse` |
| `ai_insight_service` | `generate_exercise_suggestions` | 24h Firestore | `ExerciseSuggestionResponse` |
| `ai_insight_service` | `get_cabinet_warnings` | 24h Firestore | `MedicineCabinetAuditResponse` |
| `ai_insight_service` | `generate_advisories` | 24h Firestore | `HealthAdvisoryResponse` |

All 4 call `build_health_context()` first (itself cached 30 min in-process).

## Key Architectural Observations

1. **No background jobs in Python code**: OCR (prescriptions, lab reports) and voice transcription are submitted as Firestore jobs (status=pending) but the actual processing must be done by an external Cloud Function or worker — there is no async task runner or queue client in the backend.
2. **Transactions only in medicine stock**: The only Firestore transaction is in `log_dose(action=taken)` to atomically decrement stock — all other writes are non-transactional.
3. **AI errors degrade gracefully**: every AI function has a hardcoded safe fallback that returns a valid (cautious) response when Claude returns invalid JSON or the call fails entirely.
4. **SOS is non-blocking by design**: notification is fire-and-forget; SOS event is written to Firestore before any notification attempt.
5. **WeasyPrint dependency**: referral PDF generation requires WeasyPrint (a native PDF library), which is an unusual dependency for a cloud service.
6. **Google Fit OAuth is a stub**: the token exchange step is explicitly marked incomplete in comments; Apple Health (client-push) is fully implemented.
7. **Health context is the AI's world model**: `health_context_service.build_health_context()` is the central aggregation function that pulls from 7 collections in parallel and caches for 30 minutes. All AI features depend on it.
