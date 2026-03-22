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
