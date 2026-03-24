# Kutumb API Catalog — Complete Endpoint Reference

> All routes prefixed with `/api/v1/`.  
> **Auth**: Firebase Bearer token via `CurrentUserDep`. Marked "public" if no token is required.  
> **DB**: Async Firestore `AsyncClient` injected via `DB` dependency.  
> Service calls listed as `module.function`.

---

## 1. Auth — `/api/v1/auth`

| Method | Path | Auth | Request Body | Response Model | Status | Service |
|--------|------|------|--------------|----------------|--------|---------|
| POST | `/register` | public | `AuthRegisterRequest` | `AuthRegisterResponse` | 201 | `auth_service.register_user` |
| POST | `/login` | public | `AuthLoginRequest` | `AuthLoginResponse` | 200 | `auth_service.login_user` |
| POST | `/logout` | ✓ | — (reads `Authorization` header) | `MessageResponse` | 200 | `auth_service.logout_user` |
| POST | `/refresh` | public | `AuthRefreshRequest` | `AuthLoginResponse` | 200 | `auth_service.login_user` |

**Notes:**
- Register and login are public (no `CurrentUserDep`).
- Logout extracts raw Bearer token from request header to call `invalidate_token_cache`.
- Refresh reuses `login_user`; `AuthRefreshRequest` presumably carries a refresh token credential.

---

## 2. Users — `/api/v1/users`

| Method | Path | Auth | Request | Response Model | Status | Service |
|--------|------|------|---------|----------------|--------|---------|
| GET | `/me` | ✓ | — | `UserProfileResponse` | 200 | `user_service.get_profile` |
| PATCH | `/me` | ✓ | `UserProfileUpdateRequest` (JSON) | `UserProfileResponse` | 200 | `user_service.update_profile` |
| POST | `/me/photo` | ✓ | multipart `UploadFile` (JPEG/PNG/WebP ≤ 5 MB) | `PhotoUploadResponse` | 200 | `user_service.upload_profile_photo` |
| DELETE | `/me` | ✓ | — | `MessageResponse` | 200 | `user_service.soft_delete_user` |

**Notes:**
- Photo validation: content_type in `{image/jpeg, image/png, image/webp}`, size ≤ 5 MB (HTTP 415/413 otherwise).
- DELETE is a soft-delete; response says "scheduled for deletion in 30 days".

---

## 3. Family — `/api/v1/family`

| Method | Path | Auth | Request Body | Response Model | Status | Service |
|--------|------|------|--------------|----------------|--------|---------|
| GET | `/` | ✓ | — | `FamilyMemberListResponse` | 200 | `family_service.list_family_members` |
| POST | `/` | ✓ | `AddFamilyMemberRequest` | `FamilyMember` | 201 | `family_service.add_family_member` |
| GET | `/{member_id}` | ✓ | — | `FamilyMember` | 200 | `family_service.get_family_member` |
| PATCH | `/{member_id}` | ✓ | `UpdateFamilyMemberRequest` | `FamilyMember` | 200 | `family_service.update_family_member` |
| DELETE | `/{member_id}` | ✓ | — | `MessageResponse` | 200 | `family_service.remove_family_member` |
| POST | `/invites/{invite_id}/accept` | ✓ | — | `FamilyMember` | 200 | `family_service.accept_invite` |
| POST | `/invites/{invite_id}/decline` | ✓ | — | `MessageResponse` | 200 | `family_service.decline_invite` |
| GET | `/{member_id}/dashboard` | ✓ | — | `FamilyMemberDashboard` | 200 | `family_service.get_family_dashboard` |

**Notes:**
- Accept/decline pass `current_user.phone_number` to service for invite matching.
- Dashboard passes `current_user.uid` as both `requester_uid` and the third positional arg; service likely enforces family permission check internally.

---

## 4. Checkins — `/api/v1/checkins`

| Method | Path | Auth | Request | Response Model | Status | Service |
|--------|------|------|---------|----------------|--------|---------|
| POST | `/` | ✓ | `CheckinCreateRequest` (JSON) | `CheckinResponse` | 201 | `checkin_service.create_checkin` |
| POST | `/voice` | ✓ | Form(`checkin_date`) + `UploadFile` (M4A/AAC/MP3/MP4 ≤ 25 MB) | `VoiceUploadResponse` | 201 | `checkin_service.save_voice_note` |
| GET | `/voice/transcription/{job_id}` | ✓ | — | `TranscriptionStatusResponse` | 200 | `checkin_service.get_transcription_status` |
| POST | `/meal-photo` | ✓ | `UploadFile` (JPEG/PNG/WebP ≤ 10 MB) | `dict {photo_url}` | 200 | `checkin_service.save_meal_photo` |
| GET | `/` | ✓ | Query: `start_date?`, `end_date?`, `limit=30`, `offset=0` | `CheckinListResponse` | 200 | `checkin_service.list_checkins` |
| GET | `/streak` | ✓ | — | `StreakResponse` | 200 | `checkin_service.get_streak` |
| GET | `/{checkin_id}` | ✓ | — | `CheckinResponse` | 200 | `checkin_service.get_checkin` |
| PATCH | `/{checkin_id}` | ✓ | `CheckinUpdateRequest` | `CheckinResponse` | 200 | `checkin_service.update_checkin` |
| DELETE | `/{checkin_id}` | ✓ | — | `MessageResponse` | 200 | `checkin_service.delete_checkin` |

**Notes:**
- `/streak` declared before `/{checkin_id}` to avoid path conflict.
- `/voice` uses multipart form data, not JSON.
- `/meal-photo` response model is raw `dict` (no Pydantic wrapper).
- Allowed audio types: `audio/m4a`, `audio/mp4`, `audio/x-m4a`, `audio/aac`, `audio/mpeg`.

---

## 5. Medicines — `/api/v1/medicines`

### 5a. Prescription Sub-endpoints (declared first to avoid conflicts with `/{medicine_id}`)

| Method | Path | Auth | Request | Response Model | Status | Service |
|--------|------|------|---------|----------------|--------|---------|
| POST | `/prescriptions/upload` | ✓ | Form(`prescribed_date`, `doctor_name?`, `hospital_name?`, `notes?`) + `UploadFile` (JPEG/PNG/WebP/PDF ≤ 20 MB) | `PrescriptionResponse` | 201 | `prescription_service.upload_prescription` |
| GET | `/prescriptions/ocr-status/{job_id}` | ✓ | — | `PrescriptionOCRStatusResponse` | 200 | `prescription_service.get_ocr_status` |
| GET | `/prescriptions` | ✓ | Query: `is_valid?`, `limit=20`, `offset=0` | `PrescriptionListResponse` | 200 | `prescription_service.list_prescriptions` |
| GET | `/prescriptions/{prescription_id}` | ✓ | — | `PrescriptionResponse` | 200 | `prescription_service.get_prescription` |
| PATCH | `/prescriptions/{prescription_id}` | ✓ | `PrescriptionCorrectionRequest` | `PrescriptionResponse` | 200 | `prescription_service.correct_prescription` |
| DELETE | `/prescriptions/{prescription_id}` | ✓ | — | `MessageResponse` | 200 | `prescription_service.delete_prescription` |

### 5b. Static Medicine Endpoints (before `/{medicine_id}`)

| Method | Path | Auth | Request | Response Model | Status | Service |
|--------|------|------|---------|----------------|--------|---------|
| GET | `/today` | ✓ | — | `TodayScheduleResponse` | 200 | `medicine_service.get_today_schedule` |
| GET | `/adherence/summary` | ✓ | Query: `period="30d"` | `AdherenceSummaryResponse` | 200 | `medicine_service.get_adherence_summary` |

### 5c. Medicine CRUD

| Method | Path | Auth | Request | Response Model | Status | Service |
|--------|------|------|---------|----------------|--------|---------|
| POST | `/` | ✓ | `MedicineCreateRequest` | `MedicineResponse` | 201 | `medicine_service.create_medicine` |
| GET | `/` | ✓ | Query: `is_active?`, `category?` (MedicineCategory), `is_emergency?` | `MedicineListResponse` | 200 | `medicine_service.list_medicines` |
| GET | `/{medicine_id}` | ✓ | — | `MedicineResponse` | 200 | `medicine_service.get_medicine` |
| PATCH | `/{medicine_id}` | ✓ | `MedicineUpdateRequest` | `MedicineResponse` | 200 | `medicine_service.update_medicine` |
| DELETE | `/{medicine_id}` | ✓ | — | `MessageResponse` | 200 | `medicine_service.delete_medicine` |
| POST | `/{medicine_id}/log` | ✓ | `DoseLogRequest` | `DoseLogResponse` | 201 | `medicine_service.log_dose` |
| GET | `/{medicine_id}/logs` | ✓ | Query: `start_date?`, `end_date?`, `limit=30` | `DoseLogListResponse` | 200 | `medicine_service.list_dose_logs` |
| POST | `/{medicine_id}/refill` | ✓ | `RefillRequest` | `MedicineResponse` | 201 | `medicine_service.record_refill` |

**Notes:**
- DELETE deactivates (not hard-deletes); response: "Medicine deactivated successfully".
- `logs` defaults: end=today, start=today-30d when not provided.
- Declaration order: prescriptions → static (`/today`, `/adherence/summary`) → CRUD → `/{medicine_id}` sub-routes.

---

## 6. Health — `/api/v1/health`

| Method | Path | Auth | Request | Response Model | Status | Service |
|--------|------|------|---------|----------------|--------|---------|
| GET | `/scores` | ✓ | — | `HealthScoresResponse` | 200 | `health_score_service.get_scores` |
| GET | `/scores/history` | ✓ | Query: `organ?` (OrganType), `period="30d"`, `granularity="daily"` | `HealthScoreHistoryResponse` | 200 | `health_score_service.get_score_history` |
| GET | `/scores/compare` | ✓ | Query: `target_uid` (required), `organ?` | `ScoreComparisonResponse` | 200 | `health_score_service.get_comparison` |
| POST | `/scores/recompute` | ✓ | — | `RecomputeResponse` | 200 | `health_score_service.trigger_recompute` + background `recompute_scores` |
| GET | `/vitals` | ✓ | — | `VitalsResponse` | 200 | `health_score_service.get_vitals` |
| POST | `/vitals` | ✓ | `ManualVitalRequest` | `VitalEntryResponse` | 201 | `health_score_service.log_vital` |
| GET | `/vitals/history` | ✓ | Query: `vital_type` (required), `start_date` (required), `end_date` (required), `limit=90` (1–365) | `list[VitalEntryResponse]` | 200 | `health_score_service.get_vital_history` |

**Notes:**
- `/scores/recompute` returns immediately; actual computation runs as a `BackgroundTask`.
- `/scores/compare` is a cross-user comparison; family permission check is presumably in service layer.

---

## 7. Lab Reports — `/api/v1/lab_reports`

| Method | Path | Auth | Request | Response Model | Status | Service |
|--------|------|------|---------|----------------|--------|---------|
| POST | `/upload` | ✓ | Form(`report_date`, `report_type`, `lab_name?`, `doctor_name?`, `notes?`) + `UploadFile` (PDF/JPEG/PNG/WebP ≤ 20 MB) | `LabReportResponse` | 201 | `lab_report_service.upload_report` |
| GET | `/` | ✓ | Query: `report_type?`, `start_date?`, `end_date?`, `limit=20` (1–100) | `LabReportListResponse` | 200 | `lab_report_service.list_reports` |
| GET | `/biomarkers/trends` | ✓ | Query: `biomarker_name` (required), `start_date?`, `end_date?` | `BiomarkerTrendResponse` | 200 | `lab_report_service.get_biomarker_trends` |
| GET | `/{report_id}` | ✓ | — | `LabReportResponse` | 200 | `lab_report_service.get_report` |
| GET | `/{report_id}/ocr-status` | ✓ | — | `OCRStatusResponse` | 200 | `lab_report_service.get_ocr_status` |
| DELETE | `/{report_id}` | ✓ | — | `MessageResponse` | 200 | `lab_report_service.delete_report` |
| POST | `/{report_id}/correct` | ✓ | `LabReportCorrectionRequest` | `LabReportResponse` | 200 | `lab_report_service.correct_report` |

**Notes:**
- `/biomarkers/trends` declared before `/{report_id}` to prevent path conflict.
- OCR is async; poll `/ocr-status` after upload.

---

## 8. Emergency — `/api/v1/emergency`

| Method | Path | Auth | Request | Response Model | Status | Service |
|--------|------|------|---------|----------------|--------|---------|
| GET | `/contacts` | ✓ | — | `EmergencyContactsResponse` | 200 | `emergency_service.get_emergency_contacts` |
| GET | `/sos` | ✓ | Query: `include_family=True`, `limit=20` (1–100) | `SOSListResponse` | 200 | `emergency_service.list_sos_events` |
| POST | `/sos` | ✓ | `SOSRequest` | `SOSResponse` | 201 | `emergency_service.trigger_sos` |
| GET | `/sos/{event_id}` | ✓ | — | `SOSResponse` | 200 | `emergency_service.get_sos_event` |
| PATCH | `/sos/{event_id}/resolve` | ✓ | `SOSResolveRequest` | `SOSResponse` | 200 | `emergency_service.resolve_sos` |

**Notes:**
- `EmergencyContactsResponse` returns family members who have `receive_sos` permission (derived from user profile).
- `/sos` list with `include_family=True` returns the user's own SOS events plus events from family members.

---

## 9. Insights — `/api/v1/insights`

| Method | Path | Auth | Request | Response Model | Status | Service / Notes |
|--------|------|------|---------|----------------|--------|---------|
| GET | `/exercises` | ✓ | Query: `force_refresh=False` | `ExerciseSuggestionResponse` | 200 | `ai_insight_service.generate_exercise_suggestions` |
| POST | `/exercises/save` | ✓ | `SaveExercisePlanRequest` | `SavedExercisePlanResponse` | 201 | **Inline Firestore** — saves to `users/{uid}/exercise_plans/{plan_id}` |
| POST | `/medicines/check-interactions` | ✓ | `InteractionCheckRequest` | `InteractionCheckResponse` | 200 | `ai_insight_service.check_interactions` |
| GET | `/medicines/warnings` | ✓ | — | `MedicineCabinetAuditResponse` | 200 | `ai_insight_service.get_cabinet_warnings` |
| GET | `/medicines/food-interactions` | ✓ | — | `FoodInteractionSummaryResponse` | 200 | `ai_insight_service.get_food_interactions` |
| GET | `/medicines/interaction-history` | ✓ | Query: `limit=20` (1–100), `offset=0` | raw `dict` (no Pydantic model) | 200 | **Inline Firestore** — streams `users/{uid}/interaction_checks` |
| GET | `/advisories` | ✓ | Query: `force_refresh=False` | `HealthAdvisoryResponse` | 200 | `ai_insight_service.generate_advisories` |
| PATCH | `/advisories/{advisory_id}/dismiss` | ✓ | — | `MessageResponse` | 200 | **Inline Firestore** — updates `users/{uid}/insight_cache/advisories` |
| GET | `/context` | ✓ | Query: `include_medicine_details=True`, `days_of_checkins=14` | raw `dict` (HealthContext JSON) | 200 | `health_context_service.build_health_context` |

**Notes:**
- `/exercises/save` and `/medicines/interaction-history` and `/advisories/{id}/dismiss` perform Firestore operations directly in the router (no service layer).
- `/context` returns raw `model_dump(mode="json")` — no Pydantic `response_model` declared.
- AI-backed endpoints (`/exercises`, `/medicines/check-interactions`, `/medicines/warnings`, `/medicines/food-interactions`, `/advisories`) call Claude via `ai_insight_service`.

---

## 10. Wearable — `/api/v1/wearable`

| Method | Path | Auth | Request | Response Model | Status | Service |
|--------|------|------|---------|----------------|--------|---------|
| GET | `/status` | ✓ | — | `WearableStatusResponse` | 200 | `wearable_service.get_status` |
| GET | `/data` | ✓ | Query: `start_date` (required), `end_date` (required), `metrics?` (list[str]) | `WearableDataResponse` | 200 | `wearable_service.get_wearable_data` |
| GET | `/callback/google_fit` | ✓ | Query: `code` (required), `state` (required) | `RedirectResponse` | 307 | `wearable_service.handle_google_fit_callback` |
| GET | `/connect/{platform}` | ✓ | path: `platform` (WearablePlatform enum) | `WearableConnectResponse` | 200 | `wearable_service.get_connect_info` |
| POST | `/sync/{platform}` | ✓ | path: `platform`; body: `WearableSyncRequest` | `WearableSyncResponse` | 200 | `wearable_service.sync_wearable` |
| DELETE | `/disconnect/{platform}` | ✓ | path: `platform` | `MessageResponse` | 200 | `wearable_service.disconnect_platform` |

**Notes:**
- `WearablePlatform` enum: `apple_health` | `google_fit`.
- `/callback/google_fit` is the OAuth2 redirect target for Google Fit; returns `RedirectResponse` (HTTP 307 — FastAPI default for `RedirectResponse` with no explicit `status_code`). No `status_code` is set on the decorator; the 307 comes from the response object itself.
- Declaration order: `/status`, `/data`, `/callback/google_fit` (static) → `/{platform}` dynamic routes.

---

## 11. Referrals — `/api/v1/referrals`

| Method | Path | Auth | Request | Response Model | Status | Service |
|--------|------|------|---------|----------------|--------|---------|
| POST | `/` | ✓ | `ReferralCreateRequest` | `ReferralResponse` | 201 | `referral_service.create_referral` |
| GET | `/` | ✓ | — | `ReferralListResponse` | 200 | `referral_service.list_referrals` |
| GET | `/{referral_id}` | ✓ | — | `ReferralResponse` | 200 | `referral_service.get_referral` |
| DELETE | `/{referral_id}` | ✓ | — | `MessageResponse` | 200 | `referral_service.delete_referral` |
| POST | `/{referral_id}/share` | ✓ | — | `ShareLinkResponse` | 200 | `referral_service.create_share_link` |

---

## 12. AI Session — `POST /api/v1/ai/session`

| Method | Path | Auth | Request | Response Model | Status | Notes |
|--------|------|------|---------|----------------|--------|-------|
| POST | `` (empty, i.e. `/api/v1/ai/session`) | ✓ (no DB) | `SessionRequest` | `SessionResponse` | 200 | Main Claude conversation endpoint |

**`SessionRequest` fields:**
- `session_id: str`
- `message: str` — user's current message
- `memory_file: dict` — decrypted `.kutumb` local memory JSON
- `conversation_history: list[dict]` — last N `{role, content}` turns

**`SessionResponse` fields:**
- `session_id: str`
- `ai_response: AIResponseContent` — `{text, follow_up_questions, suggested_actions, urgency_level}`
- `memory_patches: dict` — Claude-generated patches (op/path/value/confidence/source/reason)
- `triggered_alerts: list[FiredTrigger]` — safety-net trigger evaluations
- `processing_time_ms: int`

**Flow:**
1. Builds user prompt embedding memory + conversation history.
2. Calls `claude-sonnet-4-6` (max_tokens=3000) with hardcoded system prompt.
3. Parses JSON response; falls back to error message on `JSONDecodeError`.
4. Runs local `_evaluate_triggers` safety net on new vitals in patches.
5. Merges Claude's trigger evaluations with safety-net ones.

**Urgency levels:** `routine | moderate | urgent | emergency`

---

## 13. AI Onboarding — `POST /api/v1/ai/session/onboard`

| Method | Path | Auth | Request | Response Model | Status | Notes |
|--------|------|------|---------|----------------|--------|-------|
| POST | `` (i.e. `/api/v1/ai/session/onboard`) | ✓ (no DB) | `OnboardRequest` | `OnboardResponse` | 200 | 7-stage onboarding flow |

**`OnboardRequest` fields:**
- `onboard_session_id: str`
- `stage: str` — current stage name
- `stage_index: int` — 0-based index
- `total_stages: int`
- `message: str` — user's message
- `partial_memory: dict` — memory built so far
- `conversation_history: list[dict]` — last N turns

**Stages (in order):**
`welcome → demographics → medical_history → medications → allergies → lifestyle → family_goals → finalize`

**`OnboardResponse` fields:**
- `onboard_session_id: str`
- `stage: str`
- `stage_complete: bool`
- `next_stage: str | None`
- `all_stages_complete: bool`
- `ai_response: AIResponseContent`
- `memory_patches: dict`
- `stage_progress_pct: int`

**Flow:**
1. Selects per-stage system prompt from `STAGE_SYSTEM_PROMPTS` dict.
2. Calls `claude-sonnet-4-6` (max_tokens=2000).
3. Advances to `next_stage` when `stage_complete=True`.
4. On `finalize` stage: Claude generates initial `trigger_rules` array.

---

## 14. AI Memory — `/api/v1/ai/memory`

| Method | Path | Auth | Request | Response Model | Status | Notes |
|--------|------|------|---------|----------------|--------|-------|
| POST | `/compress` | ✓ (no DB) | `CompressRequest` | `CompressResponse` | 200 | Claude-powered session history compression |
| POST | `/validate` | ✓ (no DB) | raw `dict` (memory_file body) | `ValidateResponse` | 200 | Local validation (no Claude) |
| POST | `/triggers/evaluate` | ✓ (no DB) | `TriggerEvaluateRequest` | `TriggerEvaluateResponse` | 200 | Local trigger evaluation (no Claude) |

### `/compress`
**`CompressRequest`:** `{memory_file: dict, keep_recent_sessions: int}`  
**`CompressResponse`:** `{patches: list[dict], bytes_saved_estimate: int}`  
Calls `claude-sonnet-4-6` (max_tokens=1500) to condense `session_memory.last_10_sessions` into `compressed_history.summary`.

### `/validate`
**Request:** raw `dict` (body is just the memory file)  
**`ValidateResponse`:** `{valid, schema_version, errors, warnings, consistency_issues, file_size_bytes, compression_recommended}`  
Checks: required identity fields, overdue screenings, drug allergy vs. current medication conflicts. `compression_recommended=True` if file > 150 KB.

### `/triggers/evaluate`
**`TriggerEvaluateRequest`:** `{memory_file: dict, evaluation_context: TriggerEvaluationContext}`  
**`TriggerEvaluationContext` fields:** `new_vital?`, `new_food_mentioned?`, `new_medication_being_added?`, `new_symptom?`  
**`TriggerEvaluateResponse`:** `{evaluated_at, fired_triggers: list[FiredTrigger], sos_active: bool, all_clear: bool}`  

Trigger condition types evaluated:
- `vital_threshold` — numeric comparison (gte/lte/gt/lt) against `new_vital`
- `food_conflict` — match `new_food_mentioned` against trigger_foods list
- `medicine_interaction` — match `new_medication_being_added` against drug_classes_to_block
- `symptom_pattern` — substring match of `new_symptom` against condition.symptom

Escalation logic: if value exceeds `sos_threshold`/`sos_threshold_systolic`, `FiredTrigger.sos_active=True` and action becomes `"sos"`.

---

## Summary Statistics

| Domain | Router | Endpoint Count |
|--------|--------|---------------|
| auth | auth.py | 4 |
| users | users.py | 4 |
| family | family.py | 8 |
| checkins | checkins.py | 9 |
| medicines | medicines.py | 16 (6 prescription + 2 static + 8 CRUD/sub) |
| health | health.py | 7 |
| lab_reports | lab_reports.py | 7 |
| emergency | emergency.py | 5 |
| insights | insights.py | 9 |
| wearable | wearable.py | 6 |
| referrals | referrals.py | 5 |
| ai/session | ai/session.py | 1 |
| ai/onboard | ai/onboard.py | 1 |
| ai/memory | ai/memory.py | 3 |
| **Total** | | **85** |

## Key Architectural Observations

1. **No DB in AI routers** — `ai/session.py`, `ai/onboard.py`, and `ai/memory.py` receive no `DB` dependency; all state is client-managed (memory file sent each call).
2. **Stateless AI sessions** — The `.kutumb` memory file travels client→server→Claude→client each turn. Server stores nothing about the conversation.
3. **Inline Firestore in 3 endpoints** — `POST /insights/exercises/save`, `GET /insights/medicines/interaction-history`, and `PATCH /insights/advisories/{id}/dismiss` bypass the service layer and write/read Firestore directly in the router.
4. **Path ordering discipline** — All routers carefully declare static paths before dynamic `/{id}` paths (noted with comments in code).
5. **Media upload pattern** — Upload endpoints use multipart form data with explicit content-type allowlists and size limits; OCR/transcription results are polled via separate status endpoints.
6. **Public surface** — Only 3 endpoints are unauthenticated: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`.
7. **Two Claude models** — `claude-sonnet-4-6` used for all AI endpoints (session, onboard, compress). OpenAI Whisper used only as transcription fallback in `checkin_service`.
