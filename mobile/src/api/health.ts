import client from './client';
import {
  CheckinCreateRequest,
  CheckinResponse,
  HealthScoreResponse,
  HealthAdvisoryResponse,
  TodayScheduleResponse,
  Medicine,
  LabReport,
} from '../types';

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

function normalizeCheckin(raw: Record<string, unknown> | null): CheckinResponse | null {
  if (!raw) return null;
  const waterMl = typeof raw.water_intake_ml === 'number' ? raw.water_intake_ml : undefined;
  return {
    ...raw,
    id: raw.checkin_id,
    date: raw.checkin_date,
    mood: moodFromBackend(raw.mood as string),
    energy_level: scale10To5(raw.energy_level as number | undefined),
    pain_level: painFromBackend(raw.pain_level as number | undefined),
    stress_level: scale10To5(raw.stress_level as number | undefined),
    hydration_glasses: waterMl ? Math.round(waterMl / 250) : undefined,
  } as CheckinResponse;
}

function toBackendCheckin(input: CheckinCreateRequest) {
  const painLevel = painToBackend(input.pain_level);
  return {
    checkin_date: input.date ?? todayIso(),
    mood: moodToBackend(input.mood),
    energy_level: scale5To10(input.energy_level) ?? 5,
    pain_present: painLevel !== undefined && painLevel > 0,
    pain_level: painLevel,
    sleep_hours: input.sleep_hours,
    sleep_quality: input.sleep_quality,
    stress_level: scale5To10(input.stress_level),
    symptoms: input.symptoms ?? [],
    water_intake_ml: typeof input.hydration_glasses === 'number' ? input.hydration_glasses * 250 : undefined,
    bowel_movement: typeof input.bowel_movements === 'number' ? input.bowel_movements > 0 : undefined,
    notes: input.notes,
  };
}

function normalizeSchedule(raw: Record<string, unknown>): TodayScheduleResponse {
  const schedule = Array.isArray(raw.schedule)
    ? raw.schedule.map((item) => {
        const s = item as Record<string, unknown>;
        const status = s.taken ? 'taken' : s.skipped ? 'skipped' : s.overdue ? 'overdue' : 'pending';
        return {
          ...s,
          status,
          dosage: `${s.dose_amount ?? 1} ${s.dose_unit ?? 'dose'}`,
        };
      })
    : [];
  return {
    ...raw,
    schedules: schedule,
    adherence_pct: raw.adherence_pct_today ?? 0,
  } as TodayScheduleResponse;
}

function normalizeMedicine(raw: Record<string, unknown>): Medicine {
  const dose = Array.isArray(raw.dose_times) ? raw.dose_times[0] as Record<string, unknown> | undefined : undefined;
  return {
    ...raw,
    id: raw.medicine_id,
    dosage: dose ? `${dose.dose_amount ?? 1} ${dose.dose_unit ?? 'dose'}` : 'as directed',
  } as Medicine;
}

export const getHealthScores = (_uid = 'me') =>
  client.get<HealthScoreResponse>('/health/scores').then((r) => r.data);

export const createCheckin = async (data: CheckinCreateRequest) => {
  const payload = toBackendCheckin(data);
  try {
    const res = await client.post<Record<string, unknown>>('/checkins/', payload);
    return normalizeCheckin(res.data) as CheckinResponse;
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) {
      const res = await client.patch<Record<string, unknown>>(`/checkins/${payload.checkin_date}`, payload);
      return normalizeCheckin(res.data) as CheckinResponse;
    }
    throw err;
  }
};

export const listCheckins = (params?: { limit?: number; offset?: number }) =>
  client.get<{ checkins: Record<string, unknown>[]; total: number }>('/checkins/', { params }).then((r) => ({
    ...r.data,
    checkins: r.data.checkins.map((c) => normalizeCheckin(c) as CheckinResponse),
  }));

export const getTodaysCheckin = () =>
  client.get<Record<string, unknown> | null>('/checkins/today').then((r) => normalizeCheckin(r.data));

export const getTodaySchedule = () =>
  client.get<Record<string, unknown>>('/medicines/today').then((r) => normalizeSchedule(r.data));

export const listMedicines = () =>
  client.get<{ medicines: Record<string, unknown>[] }>('/medicines/').then((r) => ({
    ...r.data,
    medicines: r.data.medicines.map(normalizeMedicine),
  }));

export const logDose = (medicineId: string, action: 'taken' | 'skipped', scheduledTime: string) =>
  client.post(`/medicines/${medicineId}/log`, {
    action,
    scheduled_time: scheduledTime,
    skip_reason: action === 'skipped' ? 'Skipped from app' : undefined,
  }).then((r) => r.data);

export const getAdvisories = () =>
  client.get<HealthAdvisoryResponse>('/insights/advisories').then((r) => r.data);

export const checkInteractions = (medicineIds: string[]) =>
  client.post('/insights/medicines/check-interactions', { medicine_ids: medicineIds }).then((r) => r.data);

export const listLabReports = (params?: { limit?: number }) =>
  client.get<{ reports: LabReport[]; total: number }>('/lab_reports/', { params }).then((r) => r.data);

export const uploadLabReport = (formData: FormData) =>
  client.post<LabReport>('/lab_reports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
