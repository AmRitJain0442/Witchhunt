// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  fcm_token?: string;
  created_at: string;
  family_count?: number;
  active_medicine_count?: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ── Health Scores ──────────────────────────────────────────────────────────────

export interface OrganScore {
  score: number;
  label: string;
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  factors: string[];
}

export interface HealthScoreResponse {
  overall: number;
  heart: OrganScore;
  brain: OrganScore;
  gut: OrganScore;
  lungs: OrganScore;
  computed_at: string;
}

// ── Check-ins ──────────────────────────────────────────────────────────────────

export interface CheckinCreateRequest {
  date?: string;
  mood?: number;
  energy_level?: number;
  pain_level?: number;
  pain_location?: string;
  symptoms?: string[];
  bowel_movements?: number;
  hydration_glasses?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  stress_level?: number;
  notes?: string;
}

export interface CheckinResponse {
  id: string;
  date: string;
  mood?: number;
  energy_level?: number;
  pain_level?: number;
  pain_location?: string;
  symptoms: string[];
  bowel_movements?: number;
  hydration_glasses?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  stress_level?: number;
  notes?: string;
  created_at: string;
}

// ── Medicines ──────────────────────────────────────────────────────────────────

export interface Medicine {
  id: string;
  name: string;
  category: string;
  dosage: string;
  frequency: string;
  dose_times: string[];
  start_date: string;
  end_date?: string;
  refills_remaining?: number;
  total_stock?: number;
  current_stock?: number;
  is_emergency: boolean;
  days_supply_remaining?: number;
  refill_alert: boolean;
  notes?: string;
}

export interface ExtractedMedicine {
  name: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  every_x_hours?: number;
  duration?: string;
  category?: string;
  dose_times?: { time: string; dose_amount: number; dose_unit: string }[];
  instructions?: string;
  confidence?: number;
  matched_to_medicine_id?: string;
}

export interface Prescription {
  prescription_id: string;
  prescribed_date: string;
  doctor_name?: string;
  hospital_name?: string;
  file_url: string;
  status: 'uploaded' | 'processing' | 'parsed' | 'failed';
  ocr_job_id?: string;
  extracted_medicines: ExtractedMedicine[];
  ocr_confidence_score?: number;
  raw_ocr_text?: string;
  is_valid: boolean;
  expires_at?: string;
  notes?: string;
}

export interface PrescriptionExtractionStatus {
  job_id: string;
  prescription_id: string;
  status: string;
  progress_pct: number;
  medicines_found: number;
  engine?: string;
  error_message?: string;
}

export interface PrescriptionMedicineImportResponse {
  prescription_id: string;
  imported: Medicine[];
  skipped: Record<string, unknown>[];
}

export interface DoseSchedule {
  medicine_id: string;
  medicine_name: string;
  dosage: string;
  dose_time: string;
  status: 'pending' | 'taken' | 'skipped' | 'overdue';
  log_id?: string;
}

export interface TodayScheduleResponse {
  date: string;
  schedules: DoseSchedule[];
  adherence_pct: number;
}

// ── Family ──────────────────────────────────────────────────────────────────────

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  phone?: string;
  permission: 'view' | 'manage' | 'emergency_only';
  is_linked: boolean;
  linked_uid?: string;
}

// ── AI Session ────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionRequest {
  message: string;
  conversation_history?: ConversationMessage[];
  memory_file?: Record<string, unknown>;
}

export interface SessionResponse {
  reply: string;
  patches: PatchOperation[];
  fired_triggers: FiredTrigger[];
  conversation_history: ConversationMessage[];
}

export interface PatchOperation {
  op: 'update' | 'append_to_array' | 'add' | 'remove' | 'merge';
  path: string;
  value?: unknown;
  confidence: number;
  source: string;
}

export interface FiredTrigger {
  trigger_id: string;
  trigger_name: string;
  action: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

// ── Insights ──────────────────────────────────────────────────────────────────

export interface Advisory {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  action?: string;
}

export interface HealthAdvisoryResponse {
  advisories: Advisory[];
  generated_at: string;
}

// Care and mobility

export interface EmergencyContact {
  member_id: string;
  display_name: string;
  phone_number: string;
  relationship: string;
  has_app: boolean;
  notification_methods: Array<'push' | 'sms'>;
}

export interface EmergencyContactsResponse {
  contacts: EmergencyContact[];
  total: number;
}

export interface SOSResponse {
  event_id: string;
  triggered_at: string;
  notified_contacts: Record<string, unknown>[];
  location_shared: boolean;
  message?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'false_alarm';
}

export interface SOSListResponse {
  events: SOSResponse[];
  total: number;
  active_count: number;
}

export interface WearablePlatformStatus {
  platform: 'apple_health' | 'google_fit';
  connected: boolean;
  last_synced_at?: string | null;
  sync_errors: string[];
  metrics_available: string[];
}

export interface WearableStatusResponse {
  platforms: WearablePlatformStatus[];
}

export interface WearableConnectResponse {
  platform: 'apple_health' | 'google_fit';
  auth_url?: string | null;
  instructions: string;
  is_sdk_based: boolean;
}

export interface WearableSyncResponse {
  platform: 'apple_health' | 'google_fit';
  sync_date: string;
  records_synced: number;
  records_failed: number;
  last_sync_at: string;
  metrics_updated: string[];
  triggered_score_recompute: boolean;
}

export interface ReferralCreateRequest {
  doctor_name?: string;
  doctor_specialty?: string;
  clinic_name?: string;
  reason_for_visit: string;
  include_sections?: string[];
  checkin_days?: number;
  language?: string;
  notes_for_doctor?: string;
}

export interface ReferralResponse {
  referral_id: string;
  pdf_url: string;
  pdf_size_bytes: number;
  generated_at: string;
  expires_at: string;
  included_sections: string[];
  page_count: number;
  shareable_link?: string | null;
}

export interface ReferralListResponse {
  referrals: ReferralResponse[];
  total: number;
}

export interface ShareLinkResponse {
  shareable_link: string;
  expires_at: string;
}

export interface ProgramTask {
  task_id: string;
  title: string;
  description: string;
  category: 'vitals' | 'medicine' | 'activity' | 'diet' | 'education';
  completed: boolean;
}

export interface DiabetesProgramResponse {
  program_id: string;
  status: 'active' | 'completed' | 'paused';
  start_date: string;
  current_week: number;
  total_weeks: number;
  focus: string;
  tasks_today: ProgramTask[];
  targets: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProgramProgressResponse {
  program_id: string;
  current_week: number;
  completed_tasks_7d: number;
  completed_tasks_total: number;
  fasting_glucose_latest?: number | null;
  fasting_glucose_trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  hba1c_latest?: number | null;
  adherence_summary: Record<string, unknown>;
}

// ── Lab Reports ───────────────────────────────────────────────────────────────

export interface LabReport {
  id: string;
  report_date: string;
  report_type: string;
  lab_name?: string;
  doctor_name?: string;
  status: 'pending_ocr' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  biomarkers: Record<string, number>;
  notes?: string;
  created_at: string;
}
