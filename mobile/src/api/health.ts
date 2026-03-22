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

// ── Health Scores ──────────────────────────────────────────────────────────────

export const getHealthScores = (uid = 'me') =>
  client.get<HealthScoreResponse>(`/health/${uid}/scores`).then((r) => r.data);

// ── Check-ins ──────────────────────────────────────────────────────────────────

export const createCheckin = (data: CheckinCreateRequest) =>
  client.post<CheckinResponse>('/checkins/', data).then((r) => r.data);

export const listCheckins = (params?: { limit?: number; offset?: number }) =>
  client.get<{ checkins: CheckinResponse[]; total: number }>('/checkins/', { params }).then((r) => r.data);

export const getTodaysCheckin = () =>
  client.get<CheckinResponse | null>('/checkins/today').then((r) => r.data);

// ── Medicines ──────────────────────────────────────────────────────────────────

export const getTodaySchedule = () =>
  client.get<TodayScheduleResponse>('/medicines/today').then((r) => r.data);

export const listMedicines = () =>
  client.get<{ medicines: Medicine[] }>('/medicines/').then((r) => r.data);

export const logDose = (medicineId: string, action: 'taken' | 'skipped', scheduledTime: string) =>
  client.post(`/medicines/${medicineId}/log`, { action, scheduled_time: scheduledTime }).then((r) => r.data);

// ── Insights ──────────────────────────────────────────────────────────────────

export const getAdvisories = () =>
  client.get<HealthAdvisoryResponse>('/insights/advisories').then((r) => r.data);

export const checkInteractions = (medicineIds: string[]) =>
  client.post('/insights/interactions/check', { medicine_ids: medicineIds }).then((r) => r.data);

// ── Lab Reports ───────────────────────────────────────────────────────────────

export const listLabReports = (params?: { limit?: number }) =>
  client.get<{ reports: LabReport[]; total: number }>('/lab_reports/', { params }).then((r) => r.data);

export const uploadLabReport = (formData: FormData) =>
  client.post<LabReport>('/lab_reports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
