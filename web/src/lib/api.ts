import axios from 'axios';
import { auth } from './firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export const api = axios.create({ baseURL: API_BASE, timeout: 30_000 });

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.detail ?? err.message ?? 'Something went wrong';
    return Promise.reject(new Error(msg));
  },
);

const todayIso = () => new Date().toISOString().slice(0, 10);

const moodToBackend = (value?: number | string) => {
  if (typeof value === 'string') return value;
  return ['terrible', 'bad', 'neutral', 'good', 'great'][(value ?? 3) - 1] ?? 'neutral';
};

const moodFromBackend = (value?: string) => {
  const map: Record<string, number> = { terrible: 1, bad: 2, neutral: 3, good: 4, great: 5 };
  return value ? map[value] ?? 3 : undefined;
};

const painToBackend = (value?: number) => {
  if (!value) return undefined;
  return [0, 3, 5, 7, 10][Math.max(1, Math.min(5, value)) - 1];
};

const painFromBackend = (value?: number) => {
  const map: Record<number, number> = { 0: 1, 3: 2, 5: 3, 7: 4, 10: 5 };
  return value === undefined || value === null ? undefined : map[value] ?? Math.ceil(value / 2);
};

const scale5To10 = (value?: number) => value === undefined ? undefined : Math.max(1, Math.min(10, value * 2));
const scale10To5 = (value?: number) => value === undefined ? undefined : Math.max(1, Math.min(5, Math.ceil(value / 2)));

type NormalizedCheckin = Record<string, unknown> & {
  id: unknown;
  date: unknown;
  mood?: number;
  energy_level?: number;
  pain_level?: number;
  stress_level?: number;
  hydration_glasses?: number;
  sleep_hours?: number;
  symptoms?: string[];
  notes?: string;
};

function normalizeAuth(payload: Record<string, unknown>) {
  const fb = auth.currentUser;
  const displayName = String(payload.display_name ?? fb?.displayName ?? fb?.email ?? 'Kutumb User');
  return {
    access_token: '',
    token_type: 'Bearer',
    user: {
      uid: String(payload.uid ?? fb?.uid ?? ''),
      name: displayName,
      display_name: displayName,
      email: fb?.email ?? '',
      phone: String(payload.phone_number ?? ''),
      date_of_birth: typeof payload.date_of_birth === 'string' ? payload.date_of_birth : undefined,
      family_count: Number(payload.family_count ?? 0),
      active_medicine_count: payload.has_active_medicines ? 1 : 0,
      is_profile_complete: Boolean(payload.is_profile_complete),
      created_at: String(payload.created_at ?? new Date().toISOString()),
    },
  };
}

function normalizeCheckin(raw: Record<string, unknown> | null): NormalizedCheckin | null {
  if (!raw) return null;
  const waterMl = typeof raw.water_intake_ml === 'number' ? raw.water_intake_ml : undefined;
  return {
    ...raw,
    id: raw.checkin_id,
    date: raw.checkin_date,
    sleep_hours: typeof raw.sleep_hours === 'number' ? raw.sleep_hours : undefined,
    symptoms: Array.isArray(raw.symptoms) ? raw.symptoms as string[] : [],
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    mood: moodFromBackend(raw.mood as string),
    energy_level: scale10To5(raw.energy_level as number | undefined),
    pain_level: painFromBackend(raw.pain_level as number | undefined),
    stress_level: scale10To5(raw.stress_level as number | undefined),
    hydration_glasses: waterMl ? Math.round(waterMl / 250) : undefined,
  };
}

function toBackendCheckin(input: Record<string, unknown>) {
  const painLevel = painToBackend(input.pain_level as number | undefined);
  return {
    checkin_date: input.checkin_date ?? input.date ?? todayIso(),
    mood: moodToBackend(input.mood as number | string | undefined),
    energy_level: scale5To10(input.energy_level as number | undefined) ?? 5,
    pain_present: painLevel !== undefined && painLevel > 0,
    pain_level: painLevel,
    pain_locations: input.pain_location ? [input.pain_location] : [],
    sleep_hours: input.sleep_hours,
    sleep_quality: input.sleep_quality,
    stress_level: scale5To10(input.stress_level as number | undefined),
    symptoms: input.symptoms ?? [],
    water_intake_ml: typeof input.hydration_glasses === 'number' ? input.hydration_glasses * 250 : undefined,
    notes: input.notes,
  };
}

function normalizeScheduleItem(item: Record<string, unknown>) {
  const taken = Boolean(item.taken);
  const skipped = Boolean(item.skipped);
  const overdue = Boolean(item.overdue);
  const status = taken ? 'taken' : skipped ? 'skipped' : overdue ? 'overdue' : 'pending';
  return {
    ...item,
    medicine_id: String(item.medicine_id ?? ''),
    medicine_name: String(item.medicine_name ?? ''),
    dose_time: String(item.dose_time ?? ''),
    status,
    dosage: `${item.dose_amount ?? 1} ${item.dose_unit ?? 'dose'}`,
  };
}

function normalizeTodaySchedule(raw: Record<string, unknown>) {
  const schedule = Array.isArray(raw.schedule) ? raw.schedule.map((s) => normalizeScheduleItem(s as Record<string, unknown>)) : [];
  return {
    ...raw,
    schedule,
    schedules: schedule,
    adherence_pct: Number(raw.adherence_pct_today ?? 0),
  };
}

function normalizeMedicine(raw: Record<string, unknown>) {
  const dose = Array.isArray(raw.dose_times) ? raw.dose_times[0] as Record<string, unknown> | undefined : undefined;
  return {
    ...raw,
    id: raw.medicine_id,
    dosage: dose ? `${dose.dose_amount ?? 1} ${dose.dose_unit ?? 'dose'}` : 'as directed',
  };
}

const permissionToBackend = (permission?: string) => {
  if (permission === 'manage') return ['full_access'];
  if (permission === 'emergency_only') return ['receive_sos'];
  return ['view_checkins', 'view_medicines', 'view_health_scores', 'view_lab_reports'];
};

function normalizeMember(raw: Record<string, unknown>) {
  const permissions = Array.isArray(raw.permissions) ? raw.permissions as string[] : [];
  const permission = permissions.includes('full_access')
    ? 'manage'
    : permissions.length === 1 && permissions[0] === 'receive_sos'
      ? 'emergency_only'
      : 'view';
  return {
    ...raw,
    id: raw.member_id,
    name: raw.display_name,
    relation: raw.relationship,
    phone: raw.phone_number,
    permission,
    is_linked: Boolean(raw.is_registered),
  };
}

function normalizeHealthScores(raw: Record<string, unknown>) {
  const emptyOrgan = { score: 0, trend: 'stable', factors: [] as string[], recommendations: [] as string[] };
  const organMap: Record<string, typeof emptyOrgan> = {};
  const computedAt =
    typeof raw.computed_at === 'string'
      ? raw.computed_at
      : typeof raw.score_date === 'string'
        ? raw.score_date
        : new Date().toISOString();

  if (Array.isArray(raw.organs)) {
    for (const item of raw.organs) {
      const organ = item as Record<string, unknown>;
      const key = String(organ.organ ?? '');
      if (!key) continue;
      organMap[key] = {
        score: Number(organ.score ?? 0),
        trend: String(organ.trend ?? 'stable'),
        factors: Array.isArray(organ.contributing_factors) ? organ.contributing_factors as string[] : [],
        recommendations: Array.isArray(organ.recommendations) ? organ.recommendations as string[] : [],
      };
    }
  } else if (raw.organs && typeof raw.organs === 'object') {
    for (const [key, score] of Object.entries(raw.organs as Record<string, unknown>)) {
      organMap[key] = { ...emptyOrgan, score: Number(score ?? 0) };
    }
  }

  return {
    ...raw,
    overall: Number(raw.overall ?? raw.overall_score ?? 0),
    computed_at: computedAt,
    heart: organMap.heart ?? emptyOrgan,
    brain: organMap.brain ?? emptyOrgan,
    gut: organMap.gut ?? emptyOrgan,
    lungs: organMap.lungs ?? emptyOrgan,
  };
}

function normalizeLabReport(raw: Record<string, unknown>) {
  const statusMap: Record<string, string> = {
    parsed: 'completed',
    uploaded: 'pending_ocr',
  };
  const biomarkersRaw = raw.biomarkers;
  let biomarkers: Record<string, unknown> = {};

  if (Array.isArray(biomarkersRaw)) {
    biomarkers = Object.fromEntries(
      biomarkersRaw
        .map((item) => item as Record<string, unknown>)
        .filter((item) => item.name)
        .map((item) => [String(item.name), item.value]),
    );
  } else if (biomarkersRaw && typeof biomarkersRaw === 'object') {
    biomarkers = biomarkersRaw as Record<string, unknown>;
  }

  const status = String(raw.status ?? '');
  return {
    ...raw,
    id: raw.id ?? raw.report_id,
    created_at: raw.created_at ?? raw.uploaded_at,
    status: statusMap[status] ?? status,
    biomarkers,
  };
}

export const authApi = {
  register: (idToken: string, displayName?: string) =>
    api.post('/auth/register', { firebase_token: idToken, display_name: displayName }).then(r => normalizeAuth(r.data)),
  login: (idToken: string) =>
    api.post('/auth/login', { firebase_token: idToken }).then(r => normalizeAuth(r.data)),
  logout: () => api.post('/auth/logout').then(r => r.data),
};

export const userApi = {
  me: () => api.get('/users/me').then(r => {
    const u = r.data;
    return { ...u, name: u.display_name, email: auth.currentUser?.email ?? '' };
  }),
  update: (d: unknown) => api.patch('/users/me', d).then(r => r.data),
};

export const healthApi = {
  scores: () => api.get('/health/scores').then(r => normalizeHealthScores(r.data)),
  history: (days = 30) => api.get('/health/scores/history', { params: { period: `${days}d` } }).then(r => r.data),
};

export const checkinApi = {
  today: () => api.get('/checkins/today').then(r => normalizeCheckin(r.data)),
  list: (p?: unknown) => api.get('/checkins/', { params: p }).then(r => ({
    ...r.data,
    checkins: r.data.checkins?.map((c: Record<string, unknown>) => normalizeCheckin(c)),
  })),
  create: async (d: unknown) => {
    const payload = toBackendCheckin(d as Record<string, unknown>);
    try {
      const res = await api.post('/checkins/', payload);
      return normalizeCheckin(res.data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        const res = await api.patch(`/checkins/${payload.checkin_date}`, payload);
        return normalizeCheckin(res.data);
      }
      throw err;
    }
  },
  update: (id: string, d: unknown) => api.patch(`/checkins/${id}`, toBackendCheckin(d as Record<string, unknown>)).then(r => normalizeCheckin(r.data)),
};

export const medicineApi = {
  today: () => api.get('/medicines/today').then(r => normalizeTodaySchedule(r.data)),
  list: () => api.get('/medicines/').then(r => ({
    ...r.data,
    medicines: r.data.medicines?.map((m: Record<string, unknown>) => normalizeMedicine(m)),
  })),
  create: (d: unknown) => api.post('/medicines/', d).then(r => normalizeMedicine(r.data)),
  uploadPrescription: (fd: FormData) =>
    api.post('/medicines/prescriptions/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  extractionStatus: (jobId: string) =>
    api.get(`/medicines/prescriptions/extraction-status/${jobId}`).then(r => r.data),
  importPrescriptionMedicines: (prescriptionId: string, payload?: unknown) =>
    api.post(`/medicines/prescriptions/${prescriptionId}/import-medicines`, payload ?? {}).then(r => ({
      ...r.data,
      imported: r.data.imported?.map((m: Record<string, unknown>) => normalizeMedicine(m)) ?? [],
    })),
  logDose: (id: string, action: string, time: string) =>
    api.post(`/medicines/${id}/log`, {
      action,
      scheduled_time: time,
      skip_reason: action === 'skipped' ? 'Skipped from app' : undefined,
    }).then(r => r.data),
  adherence: () => api.get('/medicines/adherence/summary').then(r => r.data),
};

export const familyApi = {
  list: () => api.get('/family/').then(r => ({
    ...r.data,
    members: r.data.members?.map((m: Record<string, unknown>) => normalizeMember(m)),
  })),
  add: (d: unknown) => {
    const member = d as Record<string, string>;
    return api.post('/family/', {
      display_name: member.name,
      relationship: member.relation,
      phone_number: member.phone ?? '',
      permissions: permissionToBackend(member.permission),
    }).then(r => normalizeMember(r.data));
  },
  update: (id: string, d: unknown) => api.patch(`/family/${id}`, d).then(r => normalizeMember(r.data)),
  delete: (id: string) => api.delete(`/family/${id}`).then(r => r.data),
  invite: (id: string) => {
    void id;
    return Promise.resolve({ message: 'Invite already created when the member was added.' });
  },
};

export const aiApi = {
  message: (d: unknown) => {
    const req = d as Record<string, unknown>;
    return api.post('/ai/session', {
      session_id: crypto.randomUUID(),
      user_id_hash: auth.currentUser?.uid ?? 'web-user',
      message: req.message,
      conversation_history: req.conversation_history ?? [],
      memory_file: req.memory_file ?? {},
      client_context: {
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        app_version: '1.0.0',
        platform: 'web',
      },
    }).then(r => ({
      reply: r.data.ai_response?.text ?? '',
      patches: r.data.memory_patches?.operations ?? [],
      fired_triggers: r.data.triggered_alerts ?? [],
      raw: r.data,
    }));
  },
  onboard: (d: unknown) => api.post('/ai/session/onboard', d).then(r => r.data),
  validate: (d: unknown) => api.post('/ai/memory/validate', d).then(r => r.data),
};

export const insightApi = {
  advisories: () => api.get('/insights/advisories').then(r => r.data),
  exercise: () => api.get('/insights/exercises').then(r => r.data),
  interactions: (ids: string[]) => api.post('/insights/medicines/check-interactions', { medicine_ids: ids }).then(r => r.data),
  audit: () => api.get('/insights/medicines/warnings').then(r => r.data),
};

export const labApi = {
  list: (p?: unknown) => api.get('/lab_reports/', { params: p }).then(r => ({
    ...r.data,
    reports: r.data.reports?.map((report: Record<string, unknown>) => normalizeLabReport(report)),
  })),
  upload: (fd: FormData) => api.post('/lab_reports/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => normalizeLabReport(r.data)),
  get: (id: string) => api.get(`/lab_reports/${id}`).then(r => normalizeLabReport(r.data)),
  trends: (biomarker: string) => api.get('/lab_reports/biomarkers/trends', { params: { biomarker_name: biomarker } }).then(r => r.data),
};

export const reportApi = {
  list: () => api.get('/referrals/').then(r => r.data),
  createDoctorContext: (payload?: {
    doctor_name?: string;
    doctor_specialty?: string;
    clinic_name?: string;
    reason_for_visit?: string;
    notes_for_doctor?: string;
    checkin_days?: number;
  }) => api.post('/referrals/', {
    reason_for_visit: payload?.reason_for_visit || 'Doctor consultation context report',
    include_sections: [
      'doctor_snapshot',
      'demographics',
      'medical_history',
      'allergies',
      'medicines',
      'past_medicines',
      'prescriptions',
      'vitals',
      'health_scores',
      'lab_reports',
      'recent_checkins',
      'symptom_history',
      'eating_habits',
      'wearables',
    ],
    checkin_days: payload?.checkin_days ?? 90,
    language: 'en',
    doctor_name: payload?.doctor_name,
    doctor_specialty: payload?.doctor_specialty,
    clinic_name: payload?.clinic_name,
    notes_for_doctor: payload?.notes_for_doctor,
  }).then(r => r.data),
  share: (id: string) => api.post(`/referrals/${id}/share`).then(r => r.data),
};
