# Kutumb — Complete System Architecture

> Health tracking app for Indian families. Voice-first, elderly-friendly, AI-powered.
> Designed for a 2–3 week hackathon build.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Backend Project Structure](#backend-project-structure)
3. [Shared Infrastructure](#shared-infrastructure)
4. [Module 1 — Auth](#module-1--auth)
5. [Module 2 — Users](#module-2--users)
6. [Module 3 — Family](#module-3--family)
7. [Module 4 — Check-ins](#module-4--check-ins)
8. [Module 5 — Medicines & Prescriptions](#module-5--medicines--prescriptions)
9. [Module 6 — Health Scores](#module-6--health-scores)
10. [Module 7 — Emergency](#module-7--emergency)
11. [Module 8 — Referrals](#module-8--referrals)
12. [Module 9 — Wearable](#module-9--wearable)
13. [Module 10 — Lab Reports](#module-10--lab-reports)
14. [Module 11 — Health Intelligence (AI Insights)](#module-11--health-intelligence-ai-insights)
15. [Module 12 — Local Health Memory System](#module-12--local-health-memory-system)
16. [Firestore Collections Reference](#firestore-collections-reference)
17. [Implementation Order](#implementation-order)

---

## Tech Stack

### Frontend
- **React Native** — iOS + Android from single codebase
- **Redux** — state management
- **React Navigation** — routing
- **React Native Paper / Tamagui** — accessible UI kit

### Backend
- **FastAPI** — Python async REST API
- **Firebase Admin SDK** — Firestore + Auth + Storage
- **Pydantic v2** — request/response validation
- **Anthropic SDK** — Claude API for AI features

### Database & Storage
- **Firestore** — real-time document database
- **Firebase Auth** — JWT-based authentication
- **Firebase Storage** — files (prescriptions, lab reports, voice notes, referral PDFs)

### AI & Processing
- **Claude API (`claude-sonnet-4-6`)** — health intelligence, session AI, memory updates
- **Google Cloud Vision API** — OCR for prescriptions and lab reports
- **Google Cloud Speech-to-Text / OpenAI Whisper** — voice transcription
- **WeasyPrint + Jinja2** — doctor referral PDF generation

### Key Dependencies
```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
firebase-admin>=6.5.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
anthropic>=0.40.0
python-multipart>=0.0.9
httpx>=0.27.0
weasyprint>=61.0
google-cloud-vision>=3.7.0
openai>=1.30.0
python-jose[cryptography]
Pillow>=10.3.0
```

---

## Backend Project Structure

```
kutumb-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # App factory, CORS, router registration
│   ├── config.py                    # Settings via pydantic-settings
│   ├── dependencies.py              # get_current_user, get_db, require_permission
│   │
│   ├── core/
│   │   ├── firebase.py              # Firebase Admin SDK init (Firestore + Auth)
│   │   ├── security.py              # JWT verification, Bearer token extraction
│   │   ├── exceptions.py            # Custom HTTPException subclasses
│   │   └── enums.py                 # All shared enums
│   │
│   ├── models/                      # Pydantic request/response schemas
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── family.py
│   │   ├── checkins.py
│   │   ├── medicines.py
│   │   ├── prescriptions.py
│   │   ├── health.py
│   │   ├── emergency.py
│   │   ├── referrals.py
│   │   ├── wearable.py
│   │   ├── lab_reports.py
│   │   ├── insights.py
│   │   ├── session.py               # AI session request/response
│   │   ├── memory.py                # Health memory file schema
│   │   └── patches.py               # Memory patch operations
│   │
│   ├── routers/                     # FastAPI APIRouter per module
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── family.py
│   │   ├── checkins.py
│   │   ├── medicines.py
│   │   ├── health.py
│   │   ├── emergency.py
│   │   ├── referrals.py
│   │   ├── wearable.py
│   │   ├── lab_reports.py
│   │   ├── insights.py
│   │   └── ai/
│   │       ├── session.py
│   │       ├── onboard.py
│   │       └── memory.py
│   │
│   ├── services/                    # Business logic, no HTTP concerns
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── family_service.py
│   │   ├── checkin_service.py
│   │   ├── medicine_service.py
│   │   ├── prescription_service.py
│   │   ├── health_score_service.py
│   │   ├── emergency_service.py
│   │   ├── referral_service.py
│   │   ├── wearable_service.py
│   │   ├── lab_report_service.py
│   │   ├── health_context_service.py  # Builds HealthContext from Firestore
│   │   ├── ai_insight_service.py      # Claude-powered suggestions
│   │   ├── claude_service.py          # Raw Claude API calls + prompt construction
│   │   ├── prompt_builder.py          # 3-layer prompt assembly
│   │   ├── patch_validator.py         # Validates memory patches
│   │   ├── notification_service.py    # FCM push + SMS
│   │   ├── ocr_service.py             # Google Vision API
│   │   ├── voice_service.py           # STT transcription
│   │   └── pdf_service.py             # WeasyPrint PDF generation
│   │
│   ├── prompts/
│   │   ├── system_base.txt            # Base system prompt (all sessions)
│   │   ├── onboard_stages.py          # Per-stage onboarding prompts
│   │   └── compress_prompt.txt        # Memory compression instructions
│   │
│   └── utils/
│       ├── firestore_helpers.py       # Pagination, batch writes, transactions
│       ├── storage_helpers.py         # Firebase Storage signed URL generation
│       └── date_helpers.py            # IST timezone, week/month boundaries
│
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_checkins.py
│   ├── test_medicines.py
│   └── test_triggers.py
│
├── .env.example
├── requirements.txt
├── Dockerfile
└── README.md
```

### Router Registration (`app/main.py`)

```python
app.include_router(auth_router,         prefix="/api/v1/auth",         tags=["auth"])
app.include_router(users_router,        prefix="/api/v1/users",        tags=["users"])
app.include_router(family_router,       prefix="/api/v1/family",       tags=["family"])
app.include_router(checkins_router,     prefix="/api/v1/checkins",     tags=["checkins"])
app.include_router(medicines_router,    prefix="/api/v1/medicines",    tags=["medicines"])
app.include_router(health_router,       prefix="/api/v1/health",       tags=["health"])
app.include_router(emergency_router,    prefix="/api/v1/emergency",    tags=["emergency"])
app.include_router(referrals_router,    prefix="/api/v1/referrals",    tags=["referrals"])
app.include_router(wearable_router,     prefix="/api/v1/wearable",     tags=["wearable"])
app.include_router(lab_reports_router,  prefix="/api/v1/lab_reports",  tags=["lab_reports"])
app.include_router(insights_router,     prefix="/api/v1/insights",     tags=["insights"])
app.include_router(ai_session_router,   prefix="/api/v1/ai",           tags=["ai"])
app.include_router(public_router,       prefix="/api/v1/public",       tags=["public"])
```

---

## Shared Infrastructure

### Enums (`app/core/enums.py`)

```python
class MoodLevel(str, Enum):
    GREAT = "great"
    GOOD = "good"
    NEUTRAL = "neutral"
    BAD = "bad"
    TERRIBLE = "terrible"

class PainLevel(int, Enum):
    NONE = 0; MILD = 3; MODERATE = 5; SEVERE = 7; EXTREME = 10

class FamilyPermission(str, Enum):
    VIEW_CHECKINS        = "view_checkins"
    VIEW_MEDICINES       = "view_medicines"
    VIEW_HEALTH_SCORES   = "view_health_scores"
    VIEW_LAB_REPORTS     = "view_lab_reports"
    RECEIVE_SOS          = "receive_sos"
    MANAGE_MEDICINES     = "manage_medicines"
    FULL_ACCESS          = "full_access"

class MedicineFrequency(str, Enum):
    ONCE_DAILY    = "once_daily"
    TWICE_DAILY   = "twice_daily"
    THRICE_DAILY  = "thrice_daily"
    EVERY_X_HOURS = "every_x_hours"
    AS_NEEDED     = "as_needed"
    WEEKLY        = "weekly"

class MedicineCategory(str, Enum):
    # Prescription required
    ANTIHYPERTENSIVE  = "antihypertensive"
    ANTIDIABETIC      = "antidiabetic"
    ANTIBIOTIC        = "antibiotic"
    ANTIDEPRESSANT    = "antidepressant"
    ANTICOAGULANT     = "anticoagulant"
    HORMONAL          = "hormonal"
    CARDIAC           = "cardiac"
    NEUROLOGICAL      = "neurological"
    IMMUNOSUPPRESSANT = "immunosuppressant"
    ONCOLOGY          = "oncology"
    OTHER_PRESCRIBED  = "other_prescribed"

    # Emergency / First-aid — NO prescription required
    PAIN_RELIEVER     = "pain_reliever"     # Paracetamol, Ibuprofen
    ANTIHISTAMINE     = "antihistamine"     # Cetirizine, Loratadine
    ANTACID           = "antacid"           # Pantoprazole OTC
    ORS               = "ors"
    ANTISEPTIC        = "antiseptic"        # Betadine, Dettol
    EMERGENCY_CARDIAC = "emergency_cardiac" # Nitroglycerin, Aspirin
    FIRST_AID         = "first_aid"
    VITAMIN_SUPPLEMENT = "vitamin_supplement"
    ANTIDIARRHEAL     = "antidiarrheal"
    COLD_FLU          = "cold_flu"

EMERGENCY_CATEGORIES = {
    MedicineCategory.PAIN_RELIEVER, MedicineCategory.ANTIHISTAMINE,
    MedicineCategory.ANTACID, MedicineCategory.ORS,
    MedicineCategory.ANTISEPTIC, MedicineCategory.EMERGENCY_CARDIAC,
    MedicineCategory.FIRST_AID, MedicineCategory.VITAMIN_SUPPLEMENT,
    MedicineCategory.ANTIDIARRHEAL, MedicineCategory.COLD_FLU,
}

class OrganType(str, Enum):
    HEART = "heart"
    BRAIN = "brain"
    GUT   = "gut"
    LUNGS = "lungs"

class WearablePlatform(str, Enum):
    APPLE_HEALTH = "apple_health"
    GOOGLE_FIT   = "google_fit"

class LabReportStatus(str, Enum):
    UPLOADED   = "uploaded"
    PROCESSING = "processing"
    PARSED     = "parsed"
    FAILED     = "failed"
```

### Auth Middleware (`app/core/security.py`)

```python
# All endpoints (except /auth/register, /auth/login, /public/*) require:
#   Authorization: Bearer <firebase_id_token>
#
# Verification:
#   decoded = firebase_admin.auth.verify_id_token(token, check_revoked=True)
#   uid = decoded["uid"]
#
# Rate-limit revoked-token check to once per 5 minutes per uid (local TTL cache)
```

### Permission Guard Pattern

```python
async def require_permission(
    target_uid: str,
    permission: FamilyPermission,
    current_user: CurrentUser = Depends(get_current_user),
    db = Depends(get_db)
) -> None:
    if current_user.uid == target_uid:
        return  # Own data — always allowed
    # Check family_members subcollection for explicit permission grant
    # Raise HTTP 403 if not found
```

---

## Module 1 — Auth

**Prefix:** `/api/v1/auth`
**Firestore:** `users/{uid}`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Register after Firebase client signup; creates Firestore user doc |
| `POST` | `/login` | Validate Firebase token; upsert FCM token; return profile snapshot |
| `POST` | `/logout` | Revoke refresh tokens + clear FCM token |
| `POST` | `/refresh` | Re-validate token; return fresh profile |

### Key Models

```python
class AuthRegisterRequest(BaseModel):
    firebase_token: str
    display_name: str
    phone_number: str            # E.164: +919876543210
    date_of_birth: date
    gender: Literal["male","female","other","prefer_not_to_say"]
    language_preference: str = "en"
    fcm_token: str | None = None

class AuthLoginRequest(BaseModel):
    firebase_token: str
    fcm_token: str | None = None

class AuthLoginResponse(BaseModel):
    uid: str
    display_name: str
    is_profile_complete: bool
    family_count: int
    has_active_medicines: bool
```

### Business Logic
- `POST /register`: Verify Firebase token → if `users/{uid}` exists return 409 → write doc → set custom claim `role: "user"`
- `POST /login`: Verify token → fetch user doc → upsert FCM token → return snapshot
- `POST /logout`: `auth.revoke_refresh_tokens(uid)` → clear FCM token

---

## Module 2 — Users

**Prefix:** `/api/v1/users`
**Firestore:** `users/{uid}`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/me` | Full profile (blood group, BMI, conditions, allergies, etc.) |
| `PATCH` | `/me` | Partial update; auto-computes BMI; sets `is_profile_complete` flag |
| `POST` | `/me/photo` | Upload profile photo to Firebase Storage |
| `DELETE` | `/me` | Soft-delete (30-day grace period; GDPR-compliant) |

### Key Models

```python
class UserProfileResponse(BaseModel):
    uid: str
    display_name: str
    phone_number: str
    date_of_birth: date
    gender: str
    language_preference: str
    profile_photo_url: str | None
    blood_group: str | None
    height_cm: float | None
    weight_kg: float | None
    chronic_conditions: list[str]
    allergies: list[str]
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    is_profile_complete: bool
    created_at: datetime
    updated_at: datetime

class UserProfileUpdateRequest(BaseModel):
    display_name: str | None = None
    blood_group: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    chronic_conditions: list[str] | None = None
    allergies: list[str] | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    # ... all fields optional (PATCH semantics)
```

---

## Module 3 — Family

**Prefix:** `/api/v1/family`
**Firestore:** `users/{uid}/family_members/{member_id}`, `family_invites/{invite_id}`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all linked family members |
| `POST` | `/` | Add member; send SMS invite; create bidirectional links |
| `GET` | `/{member_id}` | Get single member |
| `PATCH` | `/{member_id}` | Update relationship / permissions |
| `DELETE` | `/{member_id}` | Remove link (both directions) |
| `POST` | `/invites/{invite_id}/accept` | Accept pending invite |
| `POST` | `/invites/{invite_id}/decline` | Decline invite |
| `GET` | `/{member_id}/dashboard` | View member's health data (filtered by permissions) |

### Key Models

```python
class FamilyMember(BaseModel):
    member_id: str
    target_uid: str
    display_name: str
    relationship: str            # "mother", "son", "spouse"
    phone_number: str
    permissions: list[FamilyPermission]
    is_registered: bool          # Has a Kutumb account
    avatar_url: str | None
    added_at: datetime

class AddFamilyMemberRequest(BaseModel):
    phone_number: str
    display_name: str
    relationship: str
    permissions: list[FamilyPermission]  # At least one required
```

### Business Logic
- On add: look up `users` by `phone_number` to find existing account → populate `target_uid`
- Create `family_invites/{invite_id}` with 7-day TTL → send SMS deep-link
- On accept: verify `invitee_phone` matches caller → create bidirectional `family_members` docs
- Dashboard endpoint: filter each data section based on caller's `FamilyPermission` grants

---

## Module 4 — Check-ins

**Prefix:** `/api/v1/checkins`
**Firestore:** `users/{uid}/checkins/{checkin_id}`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Submit daily check-in (mood, pain, sleep, meals, medicines, symptoms) |
| `POST` | `/voice` | Upload audio file → queue STT transcription |
| `GET` | `/voice/transcription/{job_id}` | Poll STT job status |
| `POST` | `/meal-photo` | Upload meal photo → return storage URL |
| `GET` | `/` | List check-ins with date range filter |
| `GET` | `/streak` | Current + longest streak, total check-in count |
| `GET` | `/{checkin_id}` | Single check-in by ID |
| `PATCH` | `/{checkin_id}` | Update within 24h window only |
| `DELETE` | `/{checkin_id}` | Hard delete + reverse medicine adherence |

### Key Models

```python
class MealEntry(BaseModel):
    meal_type: Literal["breakfast","lunch","dinner","snack"]
    description: str
    calories_estimate: int | None = None
    photo_url: str | None = None

class CheckinCreateRequest(BaseModel):
    checkin_date: date                       # Required. Cannot be future
    mood: MoodLevel                          # Required
    energy_level: int                        # Required. 1–10
    pain_present: bool                       # Required
    pain_level: PainLevel | None = None      # Required if pain_present=True
    pain_locations: list[str] | None = None  # ["lower_back", "knee"]
    sleep_hours: float | None = None
    sleep_quality: int | None = None         # 1–5
    stress_level: int | None = None          # 1–10
    meals: list[MealEntry] = []
    medicine_adherence_ids: list[str] = []   # medicine IDs taken today
    symptoms: list[str] = []                 # ["headache", "nausea"]
    voice_note_url: str | None = None        # Pre-uploaded audio URL
    water_intake_ml: int | None = None
    notes: str | None = None

class StreakResponse(BaseModel):
    current_streak_days: int
    longest_streak_days: int
    last_checkin_date: date | None
    total_checkins: int
```

### Business Logic
- One check-in per `checkin_date` per user → HTTP 409 if duplicate
- After write: trigger `health_score_service.recompute_scores(uid)` as background task
- `medicine_adherence_ids`: cross-reference with today's scheduled medicines → update adherence %
- `voice_note_url`: enqueue `voice_service.transcribe_and_update(checkin_id, uid, url)`
- PATCH: enforce 24h edit window

---

## Module 5 — Medicines & Prescriptions

**Prefix:** `/api/v1/medicines`
**Firestore:** `users/{uid}/prescriptions/{id}`, `users/{uid}/medicines/{id}`, `users/{uid}/medicine_logs/{id}`

### Core Rule

```
category in EMERGENCY_CATEGORIES  →  No prescription required
category NOT in EMERGENCY_CATEGORIES  →  prescription_id required + validated
```

### Prescription Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/prescriptions/upload` | Upload image/PDF → OCR extracts medicines + doctor info |
| `GET` | `/prescriptions/ocr-status/{job_id}` | Poll OCR parsing status |
| `GET` | `/prescriptions` | List all prescriptions |
| `GET` | `/prescriptions/{id}` | Single prescription with matched medicine cabinet entries |
| `PATCH` | `/prescriptions/{id}` | Manually correct OCR-parsed fields |
| `DELETE` | `/prescriptions/{id}` | Delete (blocked if active medicines link to it) |

### Medicine Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Add medicine — validates prescription for non-emergency categories |
| `GET` | `/` | List all medicines with refill alert counts |
| `GET` | `/today` | Today's schedule with taken/missed/overdue per dose |
| `GET` | `/adherence/summary` | Overall adherence stats (7d/30d/90d) |
| `GET` | `/{id}` | Single medicine with full adherence history + linked prescription |
| `PATCH` | `/{id}` | Update stock, schedule, prescription link |
| `DELETE` | `/{id}` | Soft delete (retains logs) |
| `POST` | `/{id}/log` | Log a dose (taken/skipped/delayed) |
| `GET` | `/{id}/logs` | Dose log history with adherence % |
| `POST` | `/{id}/refill` | Record a stock refill event |

### Key Models

```python
class ExtractedMedicine(BaseModel):
    name: str
    generic_name: str | None
    dosage: str
    frequency: str
    duration: str | None
    instructions: str | None
    matched_to_medicine_id: str | None    # Populated if already in cabinet

class PrescriptionResponse(BaseModel):
    prescription_id: str
    prescribed_date: date
    doctor_name: str | None
    hospital_name: str | None
    file_url: str
    status: Literal["uploaded","processing","parsed","failed"]
    extracted_medicines: list[ExtractedMedicine]
    ocr_confidence_score: float | None
    is_valid: bool                        # False if > 12 months old
    expires_at: date | None

class DoseTime(BaseModel):
    time: str              # "HH:MM" 24h
    dose_amount: float
    dose_unit: str         # "tablet" | "ml" | "mg" | "drops" | "puff"

class MedicineCreateRequest(BaseModel):
    name: str
    generic_name: str | None = None
    category: MedicineCategory
    prescription_id: str | None = None   # Required unless EMERGENCY category
    frequency: MedicineFrequency
    dose_times: list[DoseTime]
    every_x_hours: int | None = None
    start_date: date
    end_date: date | None = None
    current_stock: int
    reorder_threshold: int = 7           # Alert when this many days supply remain
    prescribed_by: str | None = None
    color: str | None = None
    notes: str | None = None

class MedicineResponse(BaseModel):
    medicine_id: str
    name: str
    category: MedicineCategory
    is_emergency: bool
    prescription_id: str | None
    prescription_valid: bool | None
    current_stock: int
    doses_per_day: float
    days_supply_remaining: float         # current_stock / doses_per_day
    refill_alert: bool
    adherence_pct_7d: float
    adherence_pct_30d: float
    next_dose_time: datetime | None
    is_active: bool
```

### Prescription → Medicine Flow

```
1. Upload prescription photo
         ↓
2. OCR parses → ExtractedMedicine[] list
         ↓
3. User reviews + corrects if needed
         ↓
4. POST /medicines with prescription_id
   (name pre-filled from ExtractedMedicine)
         ↓
5. Backend validates: exists, is_valid, not expired
         ↓
6. Medicine created with prescription_id link
         ↓
7. prescription.extracted_medicines[n].matched_to_medicine_id = new_medicine_id
```

### Dose Log Business Logic
- `action == "taken"` → Firestore transaction: `current_stock -= dose_amount`
- Recompute `days_supply_remaining` → trigger refill alert if below threshold
- Update today's adherence % on medicine doc

---

## Module 6 — Health Scores

**Prefix:** `/api/v1/health`
**Firestore:** `users/{uid}/health_scores/{date_str}`, `users/{uid}/vitals/{vital_id}`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/scores` | Latest organ scores + trend + recommendations |
| `GET` | `/scores/history` | Score history for trend charts (7d/30d/90d/1y) |
| `GET` | `/scores/compare` | Compare scores with a family member |
| `POST` | `/scores/recompute` | Manual recompute (rate-limited: once per hour) |
| `GET` | `/vitals` | Latest vitals aggregated from wearables + manual |
| `POST` | `/vitals` | Manually log BP, weight, SpO2, temperature, blood sugar |
| `GET` | `/vitals/history` | Vital reading history for charting |

### Scoring Inputs Per Organ

| Organ | Inputs | Score Range |
|-------|--------|-------------|
| ❤️ Heart | HR (wearable), BP (manual/lab), stress_level, exercise days | 0–100 |
| 🧠 Brain | sleep_hours, sleep_quality, stress_level, mood trend, headache frequency | 0–100 |
| 🫘 Gut | meal regularity, bowel_movement, water_intake_ml, digestion symptoms | 0–100 |
| 🫁 Lungs | respiratory symptoms, SpO2 (wearable), breathlessness frequency | 0–100 |

**Status thresholds:** `> 70` = Good ✓ | `40–70` = Monitor ⚠️ | `< 40` = Alert ✗

```python
class OrganScore(BaseModel):
    organ: OrganType
    score: float
    trend: Literal["improving","stable","declining"]
    change_7d: float
    contributing_factors: list[str]
    recommendations: list[str]

class HealthScoresResponse(BaseModel):
    uid: str
    overall_score: float
    organs: list[OrganScore]
    score_date: date
    data_completeness_pct: float
    next_recommended_checkin: datetime
```

---

## Module 7 — Emergency

**Prefix:** `/api/v1/emergency`
**Firestore:** `users/{uid}/sos_events/{event_id}`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sos` | Trigger SOS — push + SMS to all RECEIVE_SOS family members |
| `PATCH` | `/sos/{event_id}/resolve` | Mark resolved or false alarm; send all-clear |
| `GET` | `/sos` | List SOS events (own + received from family) |
| `GET` | `/sos/{event_id}` | Single event details |
| `GET` | `/contacts` | List emergency contacts (family with RECEIVE_SOS) |

```python
class SOSRequest(BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    message: str | None = None        # e.g. "chest pain"
    severity: Literal["low","medium","high","critical"] = "high"

class SOSResponse(BaseModel):
    event_id: str
    triggered_at: datetime
    notified_contacts: list[dict]     # [{name, phone, notification_status}]
    location_shared: bool
    severity: str
    status: Literal["active","resolved","false_alarm"]
```

### Business Logic
- Collect all `family_members` with `RECEIVE_SOS` permission
- Fire FCM push (high priority) + SMS simultaneously (background task)
- If coordinates provided: embed Google Maps deep-link in notification
- On resolve: send all-clear notification to same contacts

---

## Module 8 — Referrals

**Prefix:** `/api/v1/referrals`
**Firestore:** `users/{uid}/referrals/{referral_id}`, `referral_shares/{token}`
**Storage:** `referrals/{uid}/{referral_id}.pdf`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Generate doctor referral PDF from health history |
| `GET` | `/` | List all generated PDFs |
| `GET` | `/{referral_id}` | Get details; auto-refresh expired signed URL |
| `DELETE` | `/{referral_id}` | Delete PDF from Storage + Firestore |
| `POST` | `/{referral_id}/share` | Generate short shareable link (7-day TTL) |

```python
class ReferralCreateRequest(BaseModel):
    doctor_name: str | None = None
    doctor_specialty: str | None = None
    clinic_name: str | None = None
    reason_for_visit: str
    include_sections: list[Literal[
        "demographics","vitals","medicines","health_scores",
        "recent_checkins","lab_reports","symptom_history"
    ]] = ["demographics","vitals","medicines","health_scores","recent_checkins"]
    checkin_days: int = 30
    language: str = "en"
    notes_for_doctor: str | None = None
```

### PDF Generation
- Fetch all selected sections concurrently from Firestore
- Render via **WeasyPrint** from Jinja2 HTML template (`app/templates/referral.html`)
- Upload to Firebase Storage → signed URL valid 7 days

---

## Module 9 — Wearable

**Prefix:** `/api/v1/wearable`
**Firestore:** `users/{uid}/wearable_connections/{platform}`, `users/{uid}/wearable_data/{date_str}`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/connect/{platform}` | Start OAuth (Google Fit) or return SDK instructions (Apple Health) |
| `GET` | `/callback/google_fit` | OAuth2 code exchange; store encrypted tokens |
| `POST` | `/sync/{platform}` | Apple Health: client pushes data. Google Fit: server pulls |
| `GET` | `/status` | Connection status + last sync per platform |
| `DELETE` | `/disconnect/{platform}` | Revoke tokens + delete connection |
| `GET` | `/data` | Aggregated daily wearable data with date range |

```python
class WearableDataPoint(BaseModel):
    metric: Literal[
        "steps","heart_rate","resting_heart_rate","spo2",
        "sleep_duration","calories_burned","active_minutes","hrv","weight"
    ]
    value: float
    unit: str
    recorded_at: datetime
    source_device: str | None = None

class WearableSyncRequest(BaseModel):
    platform: WearablePlatform
    data_points: list[WearableDataPoint]   # For Apple Health (client push)
    sync_date: date                         # For Google Fit (server pull)
```

---

## Module 10 — Lab Reports

**Prefix:** `/api/v1/lab_reports`
**Firestore:** `users/{uid}/lab_reports/{report_id}`
**Storage:** `lab_reports/{uid}/{report_id}/original.{ext}`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload` | Upload PDF/image → queue Google Vision OCR |
| `GET` | `/` | List all reports with flagged count |
| `GET` | `/{report_id}` | Single report with full biomarker data |
| `GET` | `/{report_id}/ocr-status` | Poll OCR job progress |
| `DELETE` | `/{report_id}` | Delete file + Firestore metadata |
| `GET` | `/biomarkers/trends` | Track one biomarker across reports over time |
| `POST` | `/{report_id}/correct` | Manually fix OCR-parsed biomarker values |

```python
class LabBiomarker(BaseModel):
    name: str                               # "Hemoglobin", "Glucose"
    value: float
    unit: str
    reference_range_low: float | None
    reference_range_high: float | None
    status: Literal["normal","low","high","critical_low","critical_high"]
    flag: bool

class LabReportResponse(BaseModel):
    report_id: str
    report_date: date
    report_type: str
    lab_name: str | None
    file_url: str                           # Signed URL (7-day TTL)
    status: LabReportStatus
    biomarkers: list[LabBiomarker]
    ocr_confidence_score: float | None
    flagged_biomarkers: list[str]           # Names of out-of-range biomarkers
    uploaded_at: datetime
    parsed_at: datetime | None
```

### Business Logic
- OCR via Google Vision `DOCUMENT_TEXT_DETECTION`
- Post-OCR parser: regex + LLM extraction of name, value, unit, reference range
- If `critical_high`/`critical_low` found: push alert to user + RECEIVE_SOS contacts

---

## Module 11 — Health Intelligence (AI Insights)

**Prefix:** `/api/v1/insights`
**Firestore:** `users/{uid}/insight_cache/{cache_key}`, `users/{uid}/interaction_checks/{check_id}`

### HealthContext — The AI Memory Object

Every AI call is powered by a compiled `HealthContext` object built from all stored Firestore data:

```python
class HealthContext(BaseModel):
    uid: str
    age: int
    gender: str
    blood_group: str | None
    bmi: float | None
    chronic_conditions: list[str]
    allergies: list[str]
    active_medicines: list[ActiveMedicineContext]
    past_medicines: list[PastMedicineContext]
    organ_scores: dict[str, float]             # {"heart": 72, "brain": 61}
    score_trends: dict[str, str]               # {"heart": "declining"}
    recent_symptoms: list[str]                 # Last 7 days
    avg_sleep_hours_7d: float | None
    avg_stress_level_7d: float | None
    avg_pain_level_7d: float | None
    avg_energy_level_7d: float | None
    latest_vitals: dict[str, float]
    flagged_biomarkers: list[FlaggedBiomarker]
    avg_steps_7d: int | None
    avg_resting_hr_7d: float | None
    data_completeness_pct: float
    context_built_at: datetime
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/exercises` | Personalized exercise plan from full health context (cached 24h) |
| `POST` | `/exercises/save` | Save plan + schedule push reminders |
| `POST` | `/medicines/check-interactions` | Check proposed medicine vs full health memory |
| `GET` | `/medicines/warnings` | Full cabinet audit (drug interactions + dosage alerts) |
| `GET` | `/medicines/food-interactions` | All food/drink to avoid for current medicine cabinet |
| `GET` | `/medicines/interaction-history` | Past interaction check log |
| `GET` | `/advisories` | Proactive health heads-ups from trend analysis |
| `PATCH` | `/advisories/{id}/dismiss` | Dismiss an advisory |
| `GET` | `/context` | View the compiled HealthContext being used |

### Exercise Suggestion Model

```python
class ExerciseItem(BaseModel):
    name: str                          # "Brisk walking"
    category: Literal["cardio","strength","flexibility","breathing","balance","yoga","rest"]
    intensity: Literal["very_low","low","moderate","high"]
    duration_minutes: int
    frequency_per_week: int
    benefits_for_user: list[str]       # Personalized: "Helps your elevated BP"
    precautions: list[str]
    avoid_if: list[str]                # Contraindications for this user

class ExerciseSuggestionResponse(BaseModel):
    recommended: list[ExerciseItem]
    avoid_entirely: list[str]
    contraindications: list[ExerciseContraindication]
    weekly_plan: dict[str, list[ExerciseItem]]   # {"Monday": [...]}
    notes_from_context: list[str]
    should_consult_doctor: bool
```

**Hard contraindication rules (applied BEFORE AI call):**
```python
HARD_CONTRAINDICATIONS = {
    "hypertension":         ["high_intensity"],
    "heart_failure":        ["high_intensity", "moderate"],
    "pain_level_severe":    ["strength", "high_intensity"],
    "spo2 < 94":            ["cardio", "high_intensity"],
    "energy_level <= 3":    ["high_intensity", "moderate"],
}
```

### Medicine Interaction Check Model

```python
class DrugDrugInteraction(BaseModel):
    with_medicine: str
    severity: Literal["mild","moderate","severe","contraindicated"]
    interaction_type: str              # "pharmacokinetic" | "pharmacodynamic"
    effect: str
    recommendation: Literal["monitor","adjust_dose","use_with_caution","avoid","consult_doctor_before_use"]
    recommendation_detail: str

class InteractionCheckResponse(BaseModel):
    drug_interactions: list[DrugDrugInteraction]
    condition_warnings: list[DrugConditionWarning]
    allergy_alerts: list[DrugAllergyAlert]
    lab_warnings: list[DrugLabWarning]        # e.g. NSAIDs + elevated creatinine
    food_interactions: list[FoodDrugInteraction]
    overall_risk: Literal["safe","caution","avoid","contraindicated"]
    safe_to_add: bool
    must_consult_doctor: bool
    summary: str
    disclaimer: str
```

### Auto-Interaction Check on Medicine Add

```python
# routers/medicines.py — POST /medicines
interaction = await ai_insight_service.check_interactions(uid, req)

if interaction.overall_risk == "contraindicated":
    raise HTTPException(422, detail={
        "message": "Contraindicated for your health profile",
        "interaction_check": interaction.model_dump()
    })

medicine = await medicine_service.create(uid, req)

return MedicineCreateWithWarningsResponse(
    medicine=medicine,
    interaction_warnings=interaction if interaction.overall_risk != "safe" else None
)
```

### Advisory Types

```python
Literal[
    "trend_alert",          # Score declining 3 weeks straight
    "symptom_pattern",      # Recurring headaches every Monday
    "medicine_timing",      # Always missing evening dose
    "lab_followup",         # HbA1c 3 months ago — time for recheck
    "condition_management", # Diabetic — monitor carbs this week
    "seasonal",             # Monsoon = dengue risk
    "hydration",            # Water intake below 1L for 4 days
    "sleep_debt",           # Sleep average < 6h this week
    "medication_review",    # On antibiotic 10 days — no improvement?
]
```

### Claude Service Implementation

```python
from anthropic import AsyncAnthropic

client = AsyncAnthropic()

SYSTEM_PROMPT = """
You are a clinical health assistant AI for the Kutumb app.
You receive a HealthContext JSON object containing the user's full medical profile.
Rules:
- Return valid JSON matching the requested schema exactly.
- Always include disclaimer: "This is not a substitute for medical advice."
- Flag must_consult_doctor=True for severity "severe" or "contraindicated".
- Never invent drug interactions not grounded in pharmacology.
- When uncertain, err on caution and recommend doctor consultation.
"""

async def check_interactions(uid: str, proposed: InteractionCheckRequest):
    context = await health_context_service.build(uid)
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_interaction_prompt(context, proposed)}],
    )
    return InteractionCheckResponse.model_validate_json(response.content[0].text)
```

---

## Module 12 — Local Health Memory System

### Overview

The user's complete health profile is stored as an **encrypted file on their device only**. It is never stored on the server. On each AI session:

```
1. App reads + decrypts the .kutumb file
2. Sends it to FastAPI backend over HTTPS
3. Backend calls Claude with file as system context
4. Claude returns: AI response + memory update patches
5. App applies patches to the local file
6. File re-encrypted and saved back to device
```

### File Location

```
<DocumentsDir>/kutumb/health_memory.kutumb
```

### File Format — `.kutumb`

Custom binary format with AES-256-GCM encryption:

```
Bytes 0–6    : Magic bytes  "KUTUMB\x01"
Byte  7      : Format version (0x01)
Bytes 8–11   : File flags (reserved)
Bytes 12–23  : 12-byte AES-GCM nonce (fresh random on every save)
Bytes 24–39  : 16-byte AES-GCM authentication tag
Bytes 40–43  : 4-byte big-endian length of payload
Bytes 44+    : Encrypted JSON payload (AES-256-GCM ciphertext)
```

### Full Memory File Schema (Decrypted JSON)

```json
{
  "_meta": {
    "schema_version": "1.0.0",
    "file_format": "kutumb-health-memory",
    "created_at": "2026-01-01T10:00:00Z",
    "last_updated_at": "2026-03-21T14:22:00Z",
    "last_session_id": "sess_abc123",
    "patch_sequence": 47,
    "user_id_hash": "sha256_of_phone_number",
    "locale": "en-IN",
    "timezone": "Asia/Kolkata"
  },

  "identity": {
    "display_name": "Priya Sharma",
    "date_of_birth": "1988-04-15",
    "age_years": 37,
    "biological_sex": "female",
    "blood_group": "B+",
    "height_cm": 162,
    "weight_kg": 68.5,
    "bmi": 26.1,
    "weight_history": [
      { "date": "2026-03-15", "weight_kg": 68.5, "source": "user_stated" }
    ],
    "occupation": "software engineer",
    "city": "Gurugram",
    "emergency_contact": {
      "name": "Rahul Sharma",
      "relationship": "spouse",
      "phone": "ENCRYPTED_SEPARATELY"
    }
  },

  "medical_history": {
    "chronic_conditions": [
      {
        "id": "cond_001",
        "name": "Type 2 Diabetes",
        "icd10_code": "E11",
        "diagnosed_date": "2020-06-01",
        "status": "active",
        "severity": "moderate",
        "controlled": true
      }
    ],
    "past_conditions": [
      {
        "id": "cond_002",
        "name": "Iron Deficiency Anemia",
        "resolved_date": "2018-09-01",
        "treatment": "oral iron supplements 6 months"
      }
    ],
    "surgeries": [
      { "id": "surg_001", "name": "Appendectomy", "date": "2012-07-20" }
    ],
    "hospitalizations": [
      { "id": "hosp_001", "reason": "dengue fever", "admission_date": "2019-08-10", "discharge_date": "2019-08-17" }
    ],
    "immunizations": [
      { "vaccine": "COVID-19 Covishield", "doses": 2, "last_dose_date": "2021-09-01" }
    ],
    "screenings": [
      { "test": "HbA1c", "last_done": "2025-11-15", "result": "7.2%", "next_due": "2026-02-15", "overdue": true }
    ]
  },

  "current_health": {
    "overall_self_rating": 6,
    "active_conditions": [
      { "condition_id": "cond_001", "current_severity": "moderate", "flare_status": "stable" }
    ],
    "current_complaints": [
      {
        "id": "comp_001",
        "symptom": "persistent fatigue",
        "onset_date": "2026-03-10",
        "severity": 5,
        "context": "worse in afternoons, possibly blood sugar dips"
      }
    ],
    "recent_lab_values": [
      { "test": "HbA1c", "value": 7.2, "unit": "%", "date": "2025-11-15", "flag": "H" },
      { "test": "Fasting Blood Glucose", "value": 128, "unit": "mg/dL", "date": "2026-03-01", "flag": "H" }
    ]
  },

  "medications": {
    "current": [
      {
        "id": "med_001",
        "name": "Metformin",
        "brand": "Glycomet",
        "dose": "500mg",
        "frequency": "twice daily",
        "timing": ["with breakfast", "with dinner"],
        "prescribed_by": "Dr. Anita Gupta",
        "prescribed_date": "2020-06-15",
        "condition_treated": "cond_001",
        "adherence_self_rating": 8,
        "missed_doses_last_week": 1,
        "side_effects_experienced": [
          { "effect": "nausea", "severity": "mild", "resolved": true }
        ],
        "effectiveness_notes": "HbA1c improved from 8.1 to 7.2 over 18 months",
        "refill_due_date": "2026-04-01"
      }
    ],
    "past": [],
    "prn_medications": [
      { "id": "med_004", "name": "Paracetamol", "dose": "500mg", "max_per_day": 3 }
    ],
    "supplements": [
      { "id": "supp_001", "name": "Omega-3", "dose": "1000mg", "frequency": "daily" }
    ]
  },

  "allergies": {
    "drug": [
      {
        "id": "allergy_001",
        "substance": "Penicillin",
        "reaction_type": "hives",
        "severity": "moderate",
        "confirmed_by": "doctor"
      },
      {
        "id": "allergy_002",
        "substance": "NSAIDs",
        "reaction_type": "gastric bleeding",
        "severity": "severe",
        "confirmed_by": "doctor",
        "notes": "ibuprofen caused GI bleed in 2018 — avoid ALL NSAIDs"
      }
    ],
    "food": [
      {
        "id": "allergy_003",
        "substance": "Shellfish",
        "reaction_type": "anaphylaxis",
        "severity": "life-threatening",
        "epipen_prescribed": true
      }
    ],
    "environmental": [
      { "id": "allergy_005", "substance": "Dust mites", "reaction_type": "rhinitis", "seasonal": false }
    ]
  },

  "lifestyle": {
    "diet": {
      "pattern": "lacto-vegetarian",
      "regular_foods": [
        { "food": "dal", "frequency": "daily" },
        { "food": "chai with full-fat milk", "frequency": "3 cups daily" }
      ],
      "avoided_foods": [
        { "food": "deep fried foods", "reason": "blood sugar control" }
      ],
      "water_intake_liters": 2.5,
      "alcohol": "none",
      "caffeine_cups_per_day": 3
    },
    "exercise": {
      "current_routine": [
        { "activity": "walking", "frequency": "5x per week", "duration_minutes": 30, "intensity": "moderate" },
        { "activity": "yoga", "frequency": "2x per week", "duration_minutes": 45 }
      ],
      "sedentary_hours_per_day": 8,
      "steps_per_day_avg": 6500
    },
    "sleep": {
      "avg_hours_per_night": 6.5,
      "sleep_time": "23:30",
      "wake_time": "06:00",
      "quality_self_rating": 5,
      "issues": ["difficulty falling asleep", "wakes up once at night"]
    },
    "stress": {
      "current_level": 6,
      "primary_sources": ["work deadlines", "financial planning"],
      "coping_mechanisms": ["yoga", "talking to spouse"]
    },
    "substance_use": {
      "tobacco": { "status": "never" },
      "alcohol": { "status": "never" }
    }
  },

  "vitals_log": {
    "blood_pressure": [
      { "id": "bp_001", "recorded_at": "2026-03-20T08:15:00Z", "systolic": 128, "diastolic": 82, "pulse": 76 }
    ],
    "blood_glucose": [
      { "id": "bg_001", "recorded_at": "2026-03-21T07:30:00Z", "value": 118, "unit": "mg/dL", "measurement_type": "fasting" }
    ],
    "weight": [],
    "heart_rate": [],
    "spo2": [],
    "_config": { "max_entries_per_type": 90, "eviction_policy": "oldest_first" }
  },

  "symptoms_journal": [
    {
      "id": "sym_001",
      "symptom": "fatigue",
      "onset_datetime": "2026-03-10T14:00:00Z",
      "severity": 5,
      "resolved": false,
      "aggravating_factors": ["afternoon hours", "skipping lunch"],
      "relieving_factors": ["short walk"],
      "source": "user_stated"
    }
  ],

  "mental_health": {
    "current_state": { "mood_rating": 6, "anxiety_level": 5, "energy_level": 5 },
    "known_conditions": [
      { "condition": "mild generalized anxiety disorder", "current_status": "managed without medication" }
    ],
    "known_triggers": [
      { "trigger": "work deadline pressure", "response": "anxiety, sleep disturbance" }
    ],
    "protective_factors": ["strong marriage", "yoga practice"],
    "phq9_history": [
      { "date": "2023-01-15", "score": 8, "interpretation": "mild depression" }
    ]
  },

  "family_history": {
    "members": [
      {
        "id": "fam_001",
        "relationship": "father",
        "conditions": [
          { "name": "Coronary Artery Disease", "onset_age": 60 },
          { "name": "Type 2 Diabetes", "onset_age": 55 }
        ]
      }
    ],
    "hereditary_risk_flags": [
      "high cardiovascular risk (father CAD)",
      "strong diabetes predisposition (both parents)"
    ]
  },

  "health_goals": [
    {
      "id": "goal_001",
      "title": "Bring HbA1c below 7.0",
      "target_value": 7.0,
      "current_value": 7.2,
      "unit": "%",
      "target_date": "2026-06-01",
      "status": "in_progress",
      "strategies": ["reduce refined carbs", "increase daily walking", "monthly HbA1c check"]
    }
  ],

  "food_diary": {
    "dietary_pattern_summary": "lacto-vegetarian, moderate carb, low fat focus",
    "food_sensitivities": [
      { "food": "rajma", "reaction": "bloating", "severity": "mild" }
    ],
    "nutritional_concerns": [
      "high glycemic load from refined carbs",
      "insufficient protein for her weight"
    ]
  },

  "environmental_context": {
    "city": "Gurugram",
    "country": "India",
    "air_quality": { "aqi_concern": true, "avg_aqi_pm25": 145 },
    "occupation_hazards": ["prolonged screen exposure", "sedentary posture"]
  },

  "trigger_rules": [ ],

  "session_memory": {
    "total_sessions": 23,
    "last_10_sessions": [ ],
    "compressed_history": {
      "version": 3,
      "compressed_at": "2026-03-01T00:00:00Z",
      "summary": "37-year-old diabetic vegetarian woman. Key: afternoon blood sugar dips correlate with meal skipping. Anxiety spikes around work deadlines. Goal: HbA1c < 7.0 by June 2026."
    },
    "longitudinal_insights": [
      "stress directly impacts blood sugar — observed across 8 sessions",
      "user responds better to habit-based suggestions than strict rules"
    ],
    "unresolved_followups": [
      { "topic": "lipid panel not done yet", "flagged_date": "2026-01-15", "urgency": "medium" }
    ]
  },

  "relationships": [
    { "id": "rel_001", "name": "Rahul Sharma", "relationship": "spouse", "age": 40 }
  ]
}
```

---

### Trigger Rules System

Stored inside the memory file. Evaluated locally (offline) on the device and also server-side. Claude creates new triggers automatically during sessions.

#### Trigger Rule Schema

```json
{
  "id": "trig_001",
  "name": "High Fasting Blood Sugar Alert",
  "created_by": "claude",
  "created_session": "sess_abc090",
  "created_at": "2026-01-10T10:00:00Z",
  "enabled": true,
  "condition_type": "vital_threshold",
  "condition": {
    "vital": "blood_glucose",
    "measurement_type": "fasting",
    "operator": "gte",
    "threshold": 180,
    "unit": "mg/dL",
    "consecutive_readings": 1
  },
  "action": "alert",
  "severity": "high",
  "message": "Your fasting blood sugar is {value} mg/dL. Have you taken your metformin today?",
  "escalation": {
    "sos_threshold": 300,
    "sos_message": "Blood sugar critically high at {value}. This may be hyperglycemic emergency. Call your doctor NOW."
  },
  "cooldown_hours": 4,
  "last_fired": "2026-03-15T08:00:00Z",
  "fire_count": 3
}
```

#### Condition Types

| Type | What it monitors |
|------|-----------------|
| `vital_threshold` | Blood sugar, BP, SpO2 crossing a numeric boundary |
| `symptom_pattern` | Same symptom N times in X days at severity >= Y |
| `medicine_interaction` | User mentions or tries to add a conflicting drug |
| `food_conflict` | User mentions eating a food that conflicts with allergy/medicine |
| `missed_doses` | Adherence drops below threshold in a time window |
| `lab_value` | Test overdue or result outside reference range |
| `composite` | AND/OR combination of other condition types |

#### Actions

| Action | Effect |
|--------|--------|
| `warn` | Yellow banner in UI |
| `alert` | Red popup + vibration |
| `suggest_doctor` | Show "Book appointment" CTA |
| `block_medicine_add` | Prevents adding the medicine entirely |
| `sos` | Triggers emergency flow + family notifications |

#### Example Triggers Created From Profile

```json
{
  "id": "trig_002",
  "name": "NSAIDs Interaction Block",
  "condition_type": "medicine_interaction",
  "condition": {
    "drug_classes_to_block": ["NSAIDs", "ibuprofen", "diclofenac", "aspirin"],
    "allergy_id": "allergy_002"
  },
  "action": "block_medicine_add",
  "severity": "critical",
  "message": "STOP! {drug_name} is an NSAID. You have a documented allergy that caused a GI bleed."
}
```

```json
{
  "id": "trig_005",
  "name": "Shellfish Anaphylaxis Alert",
  "condition_type": "food_conflict",
  "condition": { "trigger_foods": ["shellfish", "prawns", "shrimp", "crab", "lobster"] },
  "action": "sos",
  "severity": "critical",
  "message": "You have an ANAPHYLACTIC ALLERGY to shellfish. Use EpiPen and CALL 112 if any symptoms.",
  "escalation": {
    "auto_sos_if_symptom": ["throat tightening", "breathing difficulty", "swelling"]
  }
}
```

---

### Memory Patch Format

Every Claude session returns the AI response AND structured patch instructions to update the file.

#### Full Session Response Envelope

```json
{
  "session_id": "sess_abc124",
  "ai_response": {
    "text": "Given your fatigue and the 134 fasting sugar...",
    "follow_up_questions": ["Have you noticed if fatigue is worse when you skip breakfast?"],
    "suggested_actions": ["Log blood sugar before and 2h after lunch for 3 days"],
    "urgency_level": "routine"
  },
  "memory_patches": {
    "schema_version": "1.0.0",
    "patch_sequence": 48,
    "session_id": "sess_abc124",
    "generated_at": "2026-03-21T14:22:00Z",
    "operations": [
      {
        "op": "update",
        "path": "current_health.current_complaints[id=comp_001].severity",
        "value": 5,
        "previous_value": 4,
        "confidence": 0.85,
        "source": "user_stated",
        "reason": "User explicitly said fatigue is a 5/10 today"
      },
      {
        "op": "append_to_array",
        "path": "symptoms_journal",
        "value": {
          "id": "sym_003",
          "symptom": "post-lunch dizziness",
          "onset_datetime": "2026-03-21T13:30:00Z",
          "severity": 4,
          "resolved": false,
          "source": "user_stated"
        },
        "confidence": 0.95,
        "source": "user_stated"
      },
      {
        "op": "append_to_array",
        "path": "vitals_log.blood_glucose",
        "value": {
          "id": "bg_002",
          "recorded_at": "2026-03-21T07:30:00Z",
          "value": 134,
          "unit": "mg/dL",
          "measurement_type": "fasting"
        },
        "confidence": 1.0,
        "enforce_max_entries": { "max": 90, "eviction": "oldest_first" }
      }
    ],
    "trigger_evaluations": [
      {
        "trigger_id": "trig_006",
        "fired": true,
        "action": "warn",
        "message": "HbA1c was last tested 126 days ago — overdue for recheck"
      }
    ],
    "new_triggers": [
      {
        "op": "append_to_array",
        "path": "trigger_rules",
        "value": {
          "id": "trig_008",
          "name": "Hypoglycemia Warning",
          "condition_type": "vital_threshold",
          "condition": { "vital": "blood_glucose", "operator": "lte", "threshold": 70 },
          "action": "alert",
          "severity": "high",
          "message": "Blood sugar at {value} — eat 15g fast carbs immediately. Recheck in 15 min.",
          "escalation": { "sos_threshold": 54, "sos_message": "Critically low blood sugar. Emergency." }
        },
        "confidence": 0.97,
        "source": "inferred",
        "reason": "User on metformin with fatigue symptoms consistent with hypoglycemia"
      }
    ]
  }
}
```

#### Patch Operations Reference

| Operation | Description |
|-----------|-------------|
| `add` | Add a new key at path (must not exist) |
| `update` | Update existing key at path |
| `remove` | Delete key at path |
| `append_to_array` | Push item to end of array |
| `prepend_to_array` | Unshift item to front of array |
| `merge` | Deep-merge object at path |
| `remove_from_array` | Remove item by id match |
| `update_in_array` | Update specific array item by id |

#### Path Notation

Standard dot-notation with array access by id predicate:

```
medications.current[id=med_001].missed_doses_last_week
vitals_log.blood_glucose
symptoms_journal[id=sym_001].resolved
trigger_rules[id=trig_003].enabled
_meta.patch_sequence
```

#### Confidence Scale

| Score | Meaning |
|-------|---------|
| `1.0` | User stated explicitly, zero ambiguity |
| `0.9` | User stated, minor inference |
| `0.7` | Reasonably inferred from context |
| `0.5` | Speculative — needs confirmation |
| `< 0.5` | Do not apply without asking user |

---

### Session API Endpoints

**Prefix:** `/api/v1/ai`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/session` | Main conversation; accepts decrypted memory + message; returns AI response + patches |
| `POST` | `/session/onboard` | Multi-stage onboarding conversation; builds memory file from scratch |
| `POST` | `/memory/compress` | Compress old session logs into summary (every 20 sessions or >150KB) |
| `POST` | `/memory/validate` | Validate structure + cross-field consistency |
| `POST` | `/triggers/evaluate` | Evaluate all trigger rules against a new vital/symptom/medicine event |

#### `POST /api/v1/ai/session`

```python
class SessionRequest(BaseModel):
    session_id: str
    user_id_hash: str               # sha256 of phone number — no PII stored on server
    memory_file: dict               # Full decrypted .kutumb contents
    message: str
    conversation_history: list[dict]
    client_context: dict            # {timestamp, timezone, platform, app_version}

class SessionResponse(BaseModel):
    session_id: str
    ai_response: AIResponse
    memory_patches: PatchEnvelope
    triggered_alerts: list[FiredTrigger]
    processing_time_ms: int
```

#### `POST /api/v1/ai/session/onboard`

7-stage onboarding conversation that builds the memory file from scratch:

| Stage | Topic | Turns | Memory Sections Filled |
|-------|-------|-------|----------------------|
| 0 | Welcome + language + tone | 1 | `_meta.locale` |
| 1 | Demographics | 2–3 | `identity.*` |
| 2 | Medical history | 3–5 | `medical_history.*` |
| 3 | Medications | 3–4 | `medications.*` |
| 4 | Allergies | 2–3 | `allergies.*` |
| 5 | Lifestyle | 3–4 | `lifestyle.*` |
| 6 | Family history + goals | 2–3 | `family_history`, `health_goals` |
| 7 | Finalize | 1 | `trigger_rules` (initial set auto-created) |

Stage 7 automatically generates a baseline trigger set from the full profile (e.g., diabetic → blood glucose triggers, NSAID allergy → block trigger, cardiac family history → BP trigger).

---

### Encryption — AES-256-GCM

#### Key Chain

```
User authenticates via biometric (fingerprint / FaceID)
              ↓
Android Keystore / iOS Secure Enclave (hardware-backed AES-256 key)
              ↓
File Encryption Key (FEK) — never leaves the device
              ↓
AES-256-GCM encrypt/decrypt .kutumb file
(fresh 12-byte nonce generated on every save)
```

#### Recovery (Passphrase Fallback)

```
1. User sets recovery PIN (6+ chars) during onboarding
2. PBKDF2(SHA-256, PIN, salt=random_32_bytes, iterations=600_000) → 32-byte key
3. FEK is wrapped with this passphrase key
4. Wrapped FEK + salt stored as kutumb_key_backup.enc
5. User can export kutumb_key_backup.enc to iCloud/Google Drive
   (key backup only — NOT the health data)
6. On new device: import key backup + transfer .kutumb file manually
```

#### Device Loss Scenarios

| Scenario | Recovery |
|----------|----------|
| New device, same account | Transfer .kutumb + key backup; enter recovery PIN |
| Lost device, no backup | Data is gone — by design; server holds nothing |
| Biometric changed | Enter recovery PIN → unwrap FEK → re-wrap with new biometric key |

#### What the Server NEVER Sees

```
✗ The .kutumb file at rest
✗ Any health data between requests
✗ Logs of memory contents

✓ Decrypted memory JSON during active request only (over TLS 1.3)
✓ User ID hash (sha256 of phone) — not reversible PII
```

**Privacy disclosure shown to users:**
*"Your health file is sent to our AI per session over HTTPS and used only to generate your response. It is not stored on our servers."*

---

### Claude System Prompt — 3 Layers

```
Layer 1 — IDENTITY (static)
  "You are Kutumb, a trusted health companion for Indian families..."

Layer 2 — MEMORY (dynamic, per user)
  "Here is everything you know about this patient:
   <full decrypted memory JSON>"

Layer 3 — INSTRUCTIONS (static)
  "Return ONLY valid JSON matching this exact envelope:
   { ai_response: {...}, memory_patches: {...} }
   Patch rules: confidence thresholds, source types, path notation.
   Current date: {date}.
   Never invent drug interactions. Flag must_consult_doctor=True for severe findings."
```

---

### Client-Side Services (React Native)

```
MemoryFileService.ts      — read / write / encrypt / decrypt .kutumb file
PatchApplicator.ts        — apply all 8 patch operation types with path resolution
TriggerEvaluator.ts       — evaluate triggers locally (works OFFLINE, no network needed)
SessionService.ts         — API calls to FastAPI backend
EncryptionService.ts      — AES-256-GCM + biometric key management
```

---

## Firestore Collections Reference

```
users/{uid}
users/{uid}/family_members/{member_id}
users/{uid}/checkins/{checkin_id}
users/{uid}/prescriptions/{prescription_id}
users/{uid}/medicines/{medicine_id}
users/{uid}/medicine_logs/{log_id}
users/{uid}/medicine_refill_logs/{log_id}
users/{uid}/health_scores/{date_str}
users/{uid}/vitals/{vital_id}
users/{uid}/sos_events/{event_id}
users/{uid}/referrals/{referral_id}
users/{uid}/wearable_connections/{platform}
users/{uid}/wearable_data/{date_str}
users/{uid}/lab_reports/{report_id}
users/{uid}/insight_cache/{cache_key}
users/{uid}/interaction_checks/{check_id}
users/{uid}/exercise_plans/{plan_id}

family_invites/{invite_id}
referral_shares/{token}
app_config/scoring_weights
```

---

## Implementation Order

### Phase 1 — Foundation (Days 1–2)
1. **`app/core/security.py`** — Firebase JWT verification; everything depends on this
2. **`app/core/firebase.py`** — Firestore + Storage client initialization
3. **`app/core/enums.py`** — All shared enums
4. **Auth module** — register, login, logout
5. **Users module** — profile CRUD

### Phase 2 — Core Health Data (Days 3–6)
6. **Prescriptions module** — upload + OCR parsing
7. **Medicines module** — full CRUD + prescription validation + dose logging
8. **Check-ins module** — submission + voice + streak
9. **`app/services/notification_service.py`** — shared by emergency + medicine alerts

### Phase 3 — Intelligence Layer (Days 7–10)
10. **Health scores module** — organ scoring algorithm
11. **Emergency module** — SOS + family notification
12. **`app/services/health_context_service.py`** — HealthContext builder
13. **Insights module** — interaction checks + exercise suggestions + advisories

### Phase 4 — Advanced Features (Days 11–14)
14. **Lab reports module** — OCR + biomarker parsing
15. **Referrals module** — PDF generation
16. **Wearable module** — Google Fit OAuth + Apple Health sync

### Phase 5 — AI Memory System (Days 15–17)
17. **`app/services/claude_service.py`** — 3-layer prompt construction
18. **`POST /ai/session/onboard`** — 7-stage onboarding
19. **`POST /ai/session`** — main conversation + patch generation
20. **`TriggerEvaluator.ts`** + **`PatchApplicator.ts`** (client)
21. **`MemoryFileService.ts`** + **`EncryptionService.ts`** (client)

---

*Generated: 2026-03-21 | Kutumb Hackathon Architecture Document*
