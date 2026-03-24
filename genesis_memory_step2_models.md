## Backend Pydantic Models (step-2)

### `models/common.py`
| Model | Fields |
|-------|--------|
| `MessageResponse` | `message: str` |
| `PaginationMeta` | `total: int`, `limit: int`, `offset: int`, `has_more: bool` |

---

### `models/auth.py`
| Model | Fields / Notes |
|-------|----------------|
| `AuthRegisterRequest` | `firebase_token`, `display_name`, `phone_number` (E.164, validator), `date_of_birth: date`, `gender` (literal 4-way), `language_preference="en"`, `fcm_token?` |
| `AuthRegisterResponse` | `uid`, `display_name`, `phone_number`, `created_at: datetime`, `is_profile_complete: bool` |
| `AuthLoginRequest` | `firebase_token`, `fcm_token?` |
| `AuthLoginResponse` | `uid`, `display_name`, `is_profile_complete: bool`, `family_count: int`, `has_active_medicines: bool` |
| `AuthRefreshRequest` | `firebase_token`, `fcm_token?` |

---

### `models/users.py`
| Model | Fields / Notes |
|-------|----------------|
| `UserProfileResponse` | `uid`, `display_name`, `phone_number`, `date_of_birth?`, `gender?`, `language_preference="en"`, `profile_photo_url?`, `blood_group?`, `height_cm?`, `weight_kg?`, `bmi?`, `chronic_conditions: list[str]=[]`, `allergies: list[str]=[]`, `emergency_contact_name?`, `emergency_contact_phone?`, `is_profile_complete=False`, `fcm_token?`, `created_at`, `updated_at` |
| `UserProfileUpdateRequest` | All above optional fields (excluding uid/timestamps/fcm_token) — all `| None = None` |
| `PhotoUploadResponse` | `profile_photo_url: str` |

---

### `models/family.py`
| Model | Fields / Notes |
|-------|----------------|
| `FamilyMember` | `member_id`, `target_uid?` (registered user uid), `display_name`, `relationship`, `phone_number`, `permissions: list[FamilyPermission]`, `is_registered=False`, `avatar_url?`, `added_at: datetime` |
| `AddFamilyMemberRequest` | `phone_number`, `display_name`, `relationship`, `permissions: list[FamilyPermission]` |
| `UpdateFamilyMemberRequest` | `relationship?`, `display_name?`, `permissions?` |
| `FamilyMemberListResponse` | `members: list[FamilyMember]`, `total: int` |
| `FamilyMemberDashboard` | `member_id`, `target_uid`, `display_name`, `permissions`, `latest_checkin: dict?`, `medicine_adherence_pct?`, `health_scores: dict?`, `sos_events_count?` |

**Relationships:** `FamilyMember.target_uid` → `users/{uid}` (nullable — set only when member is a registered user). Permissions stored in `users/{target_uid}/family_members` Firestore subcollection.

---

### `models/checkins.py`
| Model | Fields / Notes |
|-------|----------------|
| `MealEntry` | `meal_type` (breakfast/lunch/dinner/snack), `description`, `calories_estimate?`, `photo_url?` |
| `CheckinCreateRequest` | `checkin_date: date`, `mood: MoodLevel`, `energy_level: int` (1-10, validated), `pain_present: bool`, `pain_level: PainLevel?`, `pain_locations: list[str]?`, `sleep_hours?`, `sleep_quality: int?` (1-5, validated), `stress_level: int?` (1-10, validated), `meals: list[MealEntry]=[]`, `medicine_adherence_ids: list[str]=[]`, `symptoms: list[str]=[]`, `voice_note_url?`, `water_intake_ml?`, `bowel_movement?`, `notes?` |
| `CheckinUpdateRequest` | All create fields optional, no date |
| `CheckinResponse` | All create fields + `checkin_id`, `uid`, `voice_transcription?`, `organ_scores_snapshot: dict={}`, `created_at`, `updated_at` |
| `CheckinListResponse` | `checkins: list[CheckinResponse]`, `total`, `has_more` |
| `StreakResponse` | `current_streak_days`, `longest_streak_days`, `last_checkin_date?`, `total_checkins` |
| `VoiceUploadResponse` | `voice_note_url`, `transcription_job_id`, `estimated_duration_sec` |
| `TranscriptionStatusResponse` | `job_id`, `status` (pending/processing/completed/failed), `transcription?`, `parsed_symptoms: list[str]`, `parsed_mood: MoodLevel?` |

**Validators:** `energy_level` 1-10, `sleep_quality` 1-5, `stress_level` 1-10.
**Relationships:** `medicine_adherence_ids` → `medicines/{medicine_id}` (which medicines taken today). `organ_scores_snapshot` is a computed dict from health scoring.

---

### `models/medicines.py`
| Model | Fields / Notes |
|-------|----------------|
| `DoseTime` | `time: str` (HH:MM 24h), `dose_amount: float`, `dose_unit: str` (tablet/ml/mg/drops/puff) |
| `MedicineCreateRequest` | `name`, `generic_name?`, `category: MedicineCategory`, `prescription_id?` (required unless emergency category), `frequency: MedicineFrequency`, `dose_times: list[DoseTime]`, `every_x_hours?` (required if EVERY_X_HOURS), `start_date`, `end_date?`, `current_stock`, `reorder_threshold=7`, `prescribed_by?`, `color?`, `photo_url?`, `notes?` |
| `MedicineUpdateRequest` | `name?`, `dose_times?`, `end_date?`, `current_stock?`, `reorder_threshold?`, `is_active?`, `notes?`, `every_x_hours?`, `prescription_id?` |
| `MedicineResponse` | All create fields + `medicine_id`, `uid`, `is_emergency: bool`, `prescription_valid?`, `is_active`, `doses_per_day: float`, `days_supply_remaining: float`, `refill_alert: bool`, `adherence_pct_7d=0.0`, `adherence_pct_30d=0.0`, `next_dose_time?`, `created_at`, `updated_at` |
| `MedicineListResponse` | `medicines: list[MedicineResponse]`, `total_active`, `refill_alerts_count`, `emergency_medicines_count`, `prescription_required_count`, `expired_prescriptions: list[str]` |
| `DoseScheduleItem` | `medicine_id`, `medicine_name`, `dose_time`, `dose_amount`, `dose_unit`, `taken=False`, `taken_at?`, `skipped=False`, `skip_reason?`, `overdue=False` |
| `TodayScheduleResponse` | `date`, `schedule: list[DoseScheduleItem]`, `total_doses`, `taken_count`, `missed_count`, `pending_count`, `adherence_pct_today` |
| `DoseLogRequest` | `scheduled_time: str` (HH:MM), `action` (taken/skipped/delayed), `actual_time?`, `skip_reason?` (required if skipped), `notes?` |
| `DoseLogResponse` | `log_id`, `medicine_id`, `medicine_name`, `action`, `scheduled_time`, `actual_time?`, `skip_reason?`, `notes?`, `created_at`, `updated_stock: int` |
| `DoseLogListResponse` | `logs: list[DoseLogResponse]`, `adherence_pct`, `total_scheduled`, `total_taken`, `total_skipped` |
| `RefillRequest` | `quantity_added`, `purchase_date`, `cost?`, `pharmacy_name?`, `notes?` |
| `AdherenceSummaryResponse` | `period`, `overall_adherence_pct`, `by_medicine: list[dict]`, `best_day_of_week?`, `worst_day_of_week?`, `streak_days` |

**Validators (model_validator):** `prescription_id` required if non-emergency category; `every_x_hours` required if `EVERY_X_HOURS` frequency; at least one `dose_time`.

**Relationships:** `MedicineCreateRequest.prescription_id` → `prescriptions/{prescription_id}`. `MedicineResponse.uid` → `users/{uid}`.

---

### `models/prescriptions.py`
| Model | Fields / Notes |
|-------|----------------|
| `ExtractedMedicine` | `name`, `generic_name?`, `dosage`, `frequency`, `duration?`, `instructions?`, `matched_to_medicine_id?` |
| `PrescriptionResponse` | `prescription_id`, `uid`, `prescribed_date: date`, `doctor_name?`, `hospital_name?`, `file_url`, `status: PrescriptionStatus`, `ocr_job_id?`, `extracted_medicines: list[ExtractedMedicine]=[]`, `ocr_confidence_score?`, `raw_ocr_text?`, `is_valid=True`, `expires_at: date?`, `notes?`, `uploaded_at`, `parsed_at?` |
| `PrescriptionListResponse` | `prescriptions: list[PrescriptionResponse]`, `total`, `valid_count`, `expired_count` |
| `PrescriptionCorrectionRequest` | `doctor_name?`, `hospital_name?`, `prescribed_date?`, `extracted_medicines?`, `notes?` |
| `PrescriptionOCRStatusResponse` | `job_id`, `prescription_id`, `status`, `progress_pct=0`, `medicines_found=0`, `error_message?` |

**Relationships:** `ExtractedMedicine.matched_to_medicine_id` → `medicines/{medicine_id}`. Prescription linked to medicines via `MedicineCreateRequest.prescription_id`.

---

### `models/health.py`
| Model | Fields / Notes |
|-------|----------------|
| `OrganScore` | `organ: OrganType` (heart/brain/gut/lungs), `score: float`, `trend: ScoreTrend`, `change_7d: float`, `last_updated: datetime`, `contributing_factors: list[str]=[]`, `recommendations: list[str]=[]` |
| `HealthScoresResponse` | `uid`, `overall_score`, `organs: list[OrganScore]`, `score_date: date`, `data_completeness_pct`, `next_recommended_checkin: datetime` |
| `ScoreDataPoint` | `date`, `score`, `organ: OrganType` |
| `HealthScoreHistoryResponse` | `organ: OrganType?`, `period`, `data_points: list[ScoreDataPoint]`, `average_score`, `min_score`, `max_score` |
| `ScoreComparisonResponse` | `my_scores: list[OrganScore]`, `their_scores: list[OrganScore]`, `comparison_notes: list[str]=[]` |
| `RecomputeResponse` | `job_id`, `estimated_completion_sec`, `previous_overall_score` |
| `VitalsResponse` | `heart_rate_bpm?`, `heart_rate_updated_at?`, `blood_pressure_systolic?`, `blood_pressure_diastolic?`, `bp_updated_at?`, `spo2_pct?`, `spo2_updated_at?`, `steps_today?`, `sleep_last_night_hours?`, `weight_kg?`, `weight_updated_at?`, `bmi?`, `source: dict={}` |
| `ManualVitalRequest` | `vital_type` (blood_pressure/weight/temperature/blood_sugar/spo2/heart_rate), `value_primary: float`, `value_secondary?` (diastolic for BP), `unit`, `recorded_at: datetime`, `notes?` |
| `VitalEntryResponse` | `vital_id`, `vital_type`, `value_primary`, `value_secondary?`, `unit`, `recorded_at`, `is_in_normal_range: bool`, `normal_range_note?` |

---

### `models/emergency.py`
| Model | Fields / Notes |
|-------|----------------|
| `SOSRequest` | `latitude?`, `longitude?`, `message?`, `severity: SOSSeverity=HIGH` |
| `SOSResponse` | `event_id`, `triggered_at: datetime`, `notified_contacts: list[dict]=[]`, `location_shared: bool`, `message?`, `severity: SOSSeverity`, `status: SOSStatus` |
| `SOSResolveRequest` | `resolution` (resolved/false_alarm), `notes?` |
| `SOSListResponse` | `events: list[SOSResponse]`, `total`, `active_count` |
| `EmergencyContact` | `member_id`, `display_name`, `phone_number`, `relationship`, `has_app: bool`, `notification_methods: list[push|sms]` |
| `EmergencyContactsResponse` | `contacts: list[EmergencyContact]`, `total` |

**Relationships:** `EmergencyContact.member_id` → `FamilyMember.member_id` (family members with `receive_sos` permission). SOS triggers Twilio SMS + FCM push.

---

### `models/lab_reports.py`
| Model | Fields / Notes |
|-------|----------------|
| `LabBiomarker` | `name`, `value: float`, `unit`, `reference_range_low?`, `reference_range_high?`, `status` (normal/low/high/critical_low/critical_high), `flag=False` |
| `LabReportResponse` | `report_id`, `uid`, `report_date`, `report_type`, `lab_name?`, `doctor_name?`, `file_url`, `status: LabReportStatus`, `ocr_job_id?`, `biomarkers: list[LabBiomarker]=[]`, `ocr_confidence_score?`, `raw_ocr_text?`, `notes?`, `flagged_biomarkers: list[str]=[]`, `manually_corrected: bool`, `uploaded_at`, `parsed_at?` |
| `LabReportListResponse` | `reports: list[LabReportResponse]`, `total`, `flagged_count` |
| `OCRStatusResponse` | `report_id`, `status: LabReportStatus`, `ocr_job_id?`, `progress_pct=0`, `biomarkers_found=0`, `flagged_count=0`, `error_message?` |
| `BiomarkerCorrection` | `name`, `value`, `unit`, `reference_range_low?`, `reference_range_high?` |
| `LabReportCorrectionRequest` | `corrections: list[BiomarkerCorrection]`, `notes?` |
| `BiomarkerDataPoint` | `date`, `report_id`, `value`, `unit`, `status`, `reference_range_low?`, `reference_range_high?` |
| `BiomarkerTrendResponse` | `biomarker_name`, `data_points: list[BiomarkerDataPoint]`, `trend` (improving/stable/declining/insufficient_data), `latest_value?`, `latest_status?`, `average_value?` |

---

### `models/insights.py`
This is the largest model file — covers AI-generated insights, exercise suggestions, drug interaction checks, and health advisories.

**AI Health Context (input to AI engine):**
| Model | Fields |
|-------|--------|
| `ActiveMedicineContext` | `medicine_id`, `name`, `generic_name?`, `category`, `dose_times: list[str]`, `doses_per_day`, `start_date`, `end_date?`, `adherence_pct_30d`, `days_supply_remaining` |
| `PastMedicineContext` | `name`, `generic_name?`, `category`, `start_date`, `end_date`, `reason_stopped?` |
| `FlaggedBiomarker` | `name`, `latest_value`, `unit`, `status`, `report_date` |
| `HealthContext` | `uid`, `age`, `gender`, `blood_group?`, `height_cm?`, `weight_kg?`, `bmi?`, `chronic_conditions`, `allergies`, `active_medicines: list[ActiveMedicineContext]`, `past_medicines: list[PastMedicineContext]`, `organ_scores: dict[str,float]`, `score_trends: dict[str,str]`, `recent_symptoms: list[str]`, `avg_sleep_hours_7d?`, `avg_stress_level_7d?`, `avg_pain_level_7d?`, `avg_energy_level_7d?`, `avg_water_intake_ml_7d?`, `latest_vitals: dict[str,float]`, `flagged_biomarkers: list[FlaggedBiomarker]`, `avg_steps_7d?`, `avg_resting_hr_7d?`, `data_completeness_pct=0.0`, `context_built_at: datetime` |

**Exercise Models:**
| Model | Fields |
|-------|--------|
| `ExerciseItem` | `name`, `category` (7 types), `intensity` (4 levels), `duration_minutes`, `frequency_per_week`, `instructions`, `benefits_for_user`, `precautions`, `avoid_if` |
| `ExerciseContraindication` | `reason`, `restricted_categories`, `temporary`, `suggested_alternative` |
| `ExerciseSuggestionResponse` | `uid`, `generated_at`, `cache_hit`, `context_summary`, `recommended: list[ExerciseItem]`, `avoid_entirely: list[str]`, `contraindications`, `weekly_plan: dict[str,list[ExerciseItem]]`, `notes_from_context`, `should_consult_doctor`, `consult_reason?` |
| `SaveExercisePlanRequest` | `exercises`, `start_date`, `reminder_times: list[str]=[]` |
| `SavedExercisePlanResponse` | `plan_id`, `saved_at`, `reminder_scheduled: bool` |

**Drug Interaction Models:**
| Model | Fields |
|-------|--------|
| `DrugDrugInteraction` | `with_medicine`, `with_generic?`, `severity` (mild/moderate/severe/contraindicated), `interaction_type`, `effect`, `mechanism?`, `recommendation` (5 options), `recommendation_detail` |
| `DrugConditionWarning` | `condition`, `warning`, `severity`, `recommendation` |
| `DrugAllergyAlert` | `allergy`, `alert`, `severity` (possible_cross_reaction/definite_contraindication) |
| `DrugLabWarning` | `biomarker`, `current_value`, `unit`, `warning`, `recommendation` |
| `FoodDrugInteraction` | `food_item`, `effect`, `severity`, `avoid: bool`, `timing_note?` |
| `InteractionCheckRequest` | `medicine_name`, `generic_name?`, `category`, `dose_amount`, `dose_unit`, `doses_per_day` |
| `InteractionCheckResponse` | `check_id`, `checked_at`, `proposed_medicine`, `context_summary`, `drug_interactions`, `worst_drug_severity?`, `condition_warnings`, `allergy_alerts`, `lab_warnings`, `food_interactions`, `overall_risk` (safe/caution/avoid/contraindicated), `safe_to_add`, `must_consult_doctor`, `summary`, `disclaimer` |
| `DosageAlert` | `medicine_id`, `medicine_name`, `alert_type` (7 types), `description`, `severity` (info/warning/urgent), `action_required` |
| `MedicineCabinetAuditResponse` | `audited_at`, `active_medicine_count`, `pairwise_interactions`, `worst_active_interaction?`, `dosage_alerts`, `combined_food_warnings`, `cabinet_risk_level` (low/moderate/high), `urgent_action_count`, `summary`, `disclaimer` |
| `FoodWarning` | `food_item`, `affects_medicines: list[str]`, `combined_effect`, `severity`, `avoid_entirely`, `safe_amount?`, `timing_note?` |
| `MealTimingAdvice` | `medicine_name`, `take_with_food?`, `best_meal_timing`, `avoid_empty_stomach=False`, `avoid_after_fatty_meals=False` |
| `FoodInteractionSummaryResponse` | `generated_at`, `active_medicine_count`, `avoid_entirely`, `consume_with_caution`, `meal_timing_advice`, `condition_food_advice: list[dict]`, `top_3_avoid: list[str]`, `disclaimer` |

**Advisory Models:**
| Model | Fields |
|-------|--------|
| `Advisory` | `advisory_id`, `type: InsightType`, `severity: InsightSeverity`, `title`, `body`, `evidence: list[str]`, `suggested_actions: list[str]`, `related_organ: OrganType?`, `related_medicine_id?`, `expires_at: datetime`, `is_dismissed=False` |
| `HealthAdvisoryResponse` | `generated_at`, `cache_hit`, `urgent_count`, `advisories: list[Advisory]`, `context_data_used: list[str]` |

---

### `models/wearable.py`
| Model | Fields |
|-------|--------|
| `WearableDataPoint` | `metric` (11 types: steps/heart_rate/resting_heart_rate/spo2/sleep_duration/sleep_stages/calories_burned/active_minutes/hrv/blood_pressure/weight), `value`, `unit`, `recorded_at`, `source_device?` |
| `WearableSyncRequest` | `platform: WearablePlatform`, `data_points: list[WearableDataPoint]=[]` (Apple Health push), `sync_date: date` (Google Fit pull) |
| `WearableSyncResponse` | `platform`, `sync_date`, `records_synced`, `records_failed`, `last_sync_at`, `metrics_updated: list[str]`, `triggered_score_recompute: bool` |
| `WearablePlatformStatus` | `platform`, `connected: bool`, `last_synced_at?`, `sync_errors: list[str]`, `metrics_available: list[str]` |
| `WearableStatusResponse` | `platforms: list[WearablePlatformStatus]` |
| `WearableConnectResponse` | `platform`, `auth_url?`, `instructions`, `is_sdk_based: bool` |
| `DailyWearableData` | `date`, `steps?`, `resting_heart_rate?`, `avg_heart_rate?`, `spo2_avg?`, `sleep_hours?`, `calories_burned?`, `active_minutes?`, `hrv_ms?`, `source: WearablePlatform?` |
| `WearableDataResponse` | `data: list[DailyWearableData]`, `period_averages: dict` |

---

### `models/referrals.py`
| Model | Fields |
|-------|--------|
| `ReferralCreateRequest` | `doctor_name?`, `doctor_specialty?`, `clinic_name?`, `reason_for_visit: str`, `include_sections: list[Literal]` (6 options, default 5), `checkin_days=30`, `language="en"`, `notes_for_doctor?` |
| `ReferralResponse` | `referral_id`, `pdf_url`, `pdf_size_bytes`, `generated_at`, `expires_at`, `included_sections: list[str]`, `page_count`, `shareable_link?` |
| `ReferralListResponse` | `referrals: list[ReferralResponse]`, `total` |
| `ShareLinkResponse` | `shareable_link`, `expires_at` |

---

### `models/session.py`
This file models the AI session / memory system (the `.kutumb` encrypted file).

| Model | Fields |
|-------|--------|
| `ClientContext` | `timestamp`, `timezone="Asia/Kolkata"`, `app_version="1.0.0"`, `platform` (ios/android/web, default android) |
| `AIResponseContent` | `text`, `follow_up_questions: list[str]=[]`, `suggested_actions: list[str]=[]`, `urgency_level` (routine/moderate/urgent/emergency, default routine) |
| `FiredTrigger` | `trigger_id`, `trigger_name`, `fired: bool`, `action`, `severity`, `message`, `sos_active=False` |
| `SessionRequest` | `session_id`, `user_id_hash` (sha256 of phone — no reversible PII), `memory_file: dict` (full decrypted .kutumb), `message`, `conversation_history: list[dict]=[]`, `client_context` |
| `SessionResponse` | `session_id`, `ai_response: AIResponseContent`, `memory_patches: dict` (full PatchEnvelope), `triggered_alerts: list[FiredTrigger]=[]`, `processing_time_ms` |
| `OnboardRequest` | `onboard_session_id`, `user_id_hash`, `stage: str`, `stage_index: int`, `total_stages=7`, `message`, `partial_memory: dict`, `conversation_history: list[dict]=[]`, `client_context` |
| `OnboardResponse` | `onboard_session_id`, `stage`, `stage_complete: bool`, `next_stage?`, `all_stages_complete=False`, `ai_response`, `memory_patches: dict`, `stage_progress_pct=0` |
| `CompressRequest` | `memory_file: dict`, `keep_recent_sessions=10` |
| `CompressResponse` | `patches: list[dict]`, `bytes_saved_estimate: int` |
| `ValidateResponse` | `valid: bool`, `schema_version`, `errors: list[dict]`, `warnings: list[dict]`, `consistency_issues: list[dict]`, `file_size_bytes`, `compression_recommended: bool` |
| `TriggerEvaluationContext` | `new_vital: dict?`, `new_symptom: str?`, `new_medication_being_added: str?`, `new_food_mentioned: str?` |
| `TriggerEvaluateRequest` | `memory_file: dict`, `evaluation_context: TriggerEvaluationContext` |
| `TriggerEvaluateResponse` | `evaluated_at`, `fired_triggers: list[FiredTrigger]=[]`, `sos_active=False`, `all_clear=True` |

---

## Cross-Model Relationships

```
users/{uid}
  └─ family_members/{member_id}     ← FamilyMember (Firestore subcollection)
       └─ target_uid → users/{uid}  (if registered user)

users/{uid}/checkins/{checkin_id}  ← CheckinResponse
  └─ medicine_adherence_ids[] → medicines/{medicine_id}
  └─ organ_scores_snapshot: dict   (snapshot of HealthScores at checkin time)

users/{uid}/medicines/{medicine_id}  ← MedicineResponse
  └─ prescription_id → prescriptions/{prescription_id}
  └─ dose_logs/                     ← DoseLogResponse

users/{uid}/prescriptions/{prescription_id}  ← PrescriptionResponse
  └─ extracted_medicines[].matched_to_medicine_id → medicines/{id}

users/{uid}/lab_reports/{report_id}  ← LabReportResponse
  └─ biomarkers[] ← LabBiomarker (embedded)

users/{uid}/health_scores  ← HealthScoresResponse
  └─ organs[] ← OrganScore (heart/brain/gut/lungs)
  └─ driven by: checkins + wearable + lab_reports + vitals

users/{uid}/wearable/  ← WearableDataPoint (daily)
  └─ platforms[] ← WearablePlatformStatus

users/{uid}/sos/{event_id}  ← SOSResponse
  └─ notifies: family_members with receive_sos permission

users/{uid}/referrals/{referral_id}  ← ReferralResponse (PDF)
  └─ pulls from: vitals + medicines + checkins + lab_reports

HealthContext (built at insight generation time)
  └─ active_medicines[] ← ActiveMedicineContext (from medicines)
  └─ flagged_biomarkers[] ← FlaggedBiomarker (from lab_reports)
  └─ organ_scores, avg_* (from checkins)

SessionRequest.memory_file  ← .kutumb file (client-side encrypted JSON)
  └─ user_id_hash = sha256(phone_number)  — no PII on server
  └─ triggers → FiredTrigger → may set sos_active=True
```

## Key Patterns Observed

1. **No server-side session storage** — `session.py` models pass `memory_file` (full `.kutumb` JSON) on every call; server stateless for AI.
2. **OCR async pattern** — both prescriptions and lab_reports have: upload → job_id → poll OCRStatus (progress_pct).
3. **Adherence computed fields** — `MedicineResponse` includes `adherence_pct_7d`, `adherence_pct_30d`, `days_supply_remaining`, `refill_alert` (computed, not stored raw).
4. **HealthContext** is a rich aggregation model used as AI prompt context — built fresh per insight request from all data sources.
5. **Vitals dual-source** — `VitalsResponse` merges wearable data (Apple Health/Google Fit) + manual entries (`ManualVitalRequest`).
6. **Family dashboard** — `FamilyMemberDashboard` embeds summary metrics (`latest_checkin`, `medicine_adherence_pct`, `health_scores`) for the family monitoring view.
7. **Trigger system** — `TriggerEvaluateRequest/Response` lets the AI engine evaluate `.kutumb` memory triggers without a full session, useful for background push notifications.
8. **Onboarding flow** — 7-stage onboarding tracked via `OnboardRequest.stage_index`, incrementally building `partial_memory`.
