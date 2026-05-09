import client from './client';
import {
  DiabetesProgramResponse,
  EmergencyContactsResponse,
  ProgramProgressResponse,
  ReferralCreateRequest,
  ReferralListResponse,
  ReferralResponse,
  ShareLinkResponse,
  SOSListResponse,
  SOSResponse,
  WearableConnectResponse,
  WearableStatusResponse,
  WearableSyncResponse,
} from '../types';

const todayIso = () => new Date().toISOString().slice(0, 10);

export const getEmergencyContacts = () =>
  client.get<EmergencyContactsResponse>('/emergency/contacts').then((r) => r.data);

export const listSosEvents = () =>
  client.get<SOSListResponse>('/emergency/sos', { params: { include_family: true, limit: 20 } }).then((r) => r.data);

export const triggerSos = (message?: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'high') =>
  client.post<SOSResponse>('/emergency/sos', { message, severity }).then((r) => r.data);

export const resolveSos = (eventId: string, resolution: 'resolved' | 'false_alarm', notes?: string) =>
  client.patch<SOSResponse>(`/emergency/sos/${eventId}/resolve`, { resolution, notes }).then((r) => r.data);

export const getWearableStatus = () =>
  client.get<WearableStatusResponse>('/wearable/status').then((r) => r.data);

export const connectWearable = (platform: 'apple_health' | 'google_fit') =>
  client.get<WearableConnectResponse>(`/wearable/connect/${platform}`).then((r) => r.data);

export const syncGoogleFit = (syncDate = todayIso()) =>
  client.post<WearableSyncResponse>('/wearable/sync/google_fit', {
    platform: 'google_fit',
    sync_date: syncDate,
    data_points: [],
  }).then((r) => r.data);

export const listReferrals = () =>
  client.get<ReferralListResponse>('/referrals/').then((r) => r.data);

export const createReferral = (payload: ReferralCreateRequest) =>
  client.post<ReferralResponse>('/referrals/', payload).then((r) => r.data);

export const createReferralShareLink = (referralId: string) =>
  client.post<ShareLinkResponse>(`/referrals/${referralId}/share`).then((r) => r.data);

export const startDiabetesProgram = () =>
  client.post<DiabetesProgramResponse>('/programs/diabetes/start', {
    target_hba1c: 7.0,
    fasting_glucose_target: 110,
    preferred_walk_minutes: 20,
    language: 'en',
  }).then((r) => r.data);

export const getDiabetesToday = () =>
  client.get<DiabetesProgramResponse>('/programs/diabetes/today').then((r) => r.data);

export const getDiabetesProgress = () =>
  client.get<ProgramProgressResponse>('/programs/diabetes/progress').then((r) => r.data);

export const completeProgramTask = (programId: string, taskId: string, notes?: string) =>
  client.post(`/programs/${programId}/tasks/${taskId}/complete`, { notes }).then((r) => r.data);

export const getDueReminders = () =>
  client.get<{ reminders: Array<Record<string, unknown>> }>('/medicines/reminders/due').then((r) => r.data);

export const sendDueReminders = () =>
  client.post('/medicines/reminders/send-due').then((r) => r.data);
