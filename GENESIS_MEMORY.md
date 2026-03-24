# GENESIS MEMORY
*AI Orchestration System — Shared Project Memory*

---


## Task: Systematically read and understand the Kutumb monorepo — a family health management platform with a FastAPI backend, React Native mobile app, and Next.js web app.
*Started: 2026-03-24 11:53:00* · Task ID: `RDCBASE1`

### Plan (8 steps)

| Step | Title | Type | Agent |
|------|-------|------|-------|
| step-1 | Read backend core: config, main, dependencies, firebase | research | claude-worker |
| step-2 | Read all backend Pydantic models | research | claude-worker |
| step-3 | Read all backend routers (API endpoints) | research | claude-worker |
| step-4 | Read all backend services (business logic) | research | claude-worker |
| step-5 | Read mobile app: navigation, auth, screens | research | claude-worker |
| step-6 | Read web app: layout, pages, components, libs | research | claude-worker |
| step-7 | Read ARCHITECTURE.md and backend prompts | research | claude-worker |
| step-8 | Synthesize findings into Genesis Memory | docs | claude-worker |

### Progress

- [x] **step-1** — Backend core skeleton documented (see findings below)

---

## Backend Core Findings (step-1)

### App Boot (`main.py`)
- FastAPI 1.0.0, title "Kutumb Health API"
- Lifespan: `init_firebase()` on startup
- CORS: `CORSMiddleware`, origins from settings, all methods/headers allowed, credentials=True
- Docs/Redoc disabled in production
- 14 routers at `/api/v1/`: auth, users, family, checkins, medicines, health, emergency, referrals, wearable, lab_reports, insights, ai/session, ai/session/onboard, ai/memory
- System: `GET /health`, `GET /`

### Config (`config.py`)
- `pydantic_settings.BaseSettings` from `.env`, cached via `@lru_cache`
- Firebase: project_id, service_account_key_path (`./serviceAccountKey.json`), storage_bucket
- AI: anthropic_api_key (primary), openai_api_key (Whisper fallback only)
- SMS: Twilio (SOS alerts)
- TTL caches: token=300s, insights=86400s

### Firebase (`core/firebase.py`)
- `init_firebase()` — guarded singleton, firebase_admin + storage
- `get_firestore_client()` — `@lru_cache(1)`, returns **async** `google.cloud.firestore.AsyncClient`
- `get_auth_client()` — firebase_admin.auth module
- `get_storage_bucket()` — firebase_admin storage bucket

### Auth/Security (`core/security.py`)
- Pure Firebase ID token verification (`auth.verify_id_token(token, check_revoked=True)`)
- `Bearer` scheme; raises 401 if missing/malformed/expired/revoked
- TTLCache (maxsize=1000, ttl=300s) avoids re-verification per request
- `CurrentUser` dataclass: uid, email, phone_number, email_verified, custom_claims
- `invalidate_token_cache(token)` called on logout

### Dependency Injection (`dependencies.py`)
- `DB = Annotated[AsyncClient, Depends(get_db)]`
- `CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]`
- `require_family_member_access(target_uid, permission, current_user, db)`:
  - Own data: always allowed
  - Otherwise: queries `users/{target_uid}/family_members` Firestore subcollection
  - Checks `permissions[]` for `full_access` OR specific permission
  - Raises ForbiddenError (403) otherwise

### Enums (`core/enums.py`)
- MoodLevel (5 levels str), PainLevel (int: 0/3/5/7/10)
- FamilyPermission: view_checkins, view_medicines, view_health_scores, view_lab_reports, receive_sos, manage_medicines, full_access
- MedicineFrequency: once/twice/thrice daily, every_x_hours, as_needed, weekly
- MedicineCategory: 11 prescription + 10 OTC/emergency; `EMERGENCY_CATEGORIES` set (no Rx needed)
- OrganType: heart/brain/gut/lungs
- WearablePlatform: apple_health/google_fit
- LabReportStatus/PrescriptionStatus: uploaded→processing→parsed/failed
- SOSStatus: active/resolved/false_alarm; SOSSeverity: low/medium/high/critical
- AdherencePeriod: 7d/30d/90d; ScoreTrend: improving/stable/declining
- InsightType (9 types): trend_alert, symptom_pattern, medicine_timing, lab_followup, condition_management, seasonal, hydration, sleep_debt, medication_review
- InsightSeverity: info/warning/urgent

### Custom Exceptions (`core/exceptions.py`)
NotFoundError(404), AlreadyExistsError(409), ForbiddenError(403), UnauthorizedError(401+WWW-Authenticate), ValidationError(422), ConflictError(409), RateLimitError(429), ServiceUnavailableError(503)

### Utilities (`utils/`)
- **firestore_helpers**: `doc_exists`, `get_or_404` (injects `_id`), `stream_collection` (injects `_id`), `serialize_for_firestore` (date→ISO, datetime kept), `paginate` (in-memory)
- **date_helpers**: `IST = ZoneInfo("Asia/Kolkata")` — canonical timezone; `now_ist`, `today_ist`, `now_utc`, `to_ist`, `days_between`, `date_range`
- **storage_helpers**: `get_signed_url` (V4, 7d, fallback public), `upload_bytes` (defaults public), `delete_blob` (silent)

### Key Architectural Notes
1. Firestore is fully async (`AsyncClient`) throughout
2. No middleware-level rate limiting — RateLimitError exists but enforced per-router/service
3. Family permission model lives in Firestore subcollection, NOT Firebase custom claims
4. IST is canonical timezone for all date logic
5. Anthropic/Claude is primary AI; OpenAI only for Whisper speech transcription fallback

#### [✓] step-1: Read backend core: config, main, dependencies, firebase
- **Agent:** claude-cli-worker  **Time:** 2026-03-24 11:55:55  **Status:** approved
- Backend core skeleton fully documented: FastAPI 1.0.0 with 14 routers at /api/v1/, Firebase auth via ID token verification with TTLCache, async Firestore client, family permission model in Firestore subcollections, IST canonical timezone, and pydantic-settings config from .env.

#### [✓] step-2: Read all backend Pydantic models
- **Agent:** claude-cli-worker  **Time:** 2026-03-24 11:59:17  **Status:** approved
- Complete map of all 14 Pydantic model files produced with accurate field listings, validators, cross-model Firestore relationships, and architectural patterns (stateless AI sessions, async OCR, dual-source vitals, trigger system, 7-stage onboarding).
