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

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (idToken: string) => api.post('/auth/register', { id_token: idToken }).then(r => r.data),
  login:    (idToken: string) => api.post('/auth/login',    { id_token: idToken }).then(r => r.data),
  logout:   ()               => api.post('/auth/logout').then(r => r.data),
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const userApi = {
  me:     ()     => api.get('/users/me').then(r => r.data),
  update: (d: unknown) => api.patch('/users/me', d).then(r => r.data),
};

// ── Health Scores ──────────────────────────────────────────────────────────────
export const healthApi = {
  scores:      ()          => api.get('/health/me/scores').then(r => r.data),
  history:     (days = 30) => api.get('/health/me/scores/history', { params: { days } }).then(r => r.data),
};

// ── Check-ins ──────────────────────────────────────────────────────────────────
export const checkinApi = {
  today:  ()    => api.get('/checkins/today').then(r => r.data),
  list:   (p?: unknown) => api.get('/checkins/', { params: p }).then(r => r.data),
  create: (d: unknown) => api.post('/checkins/', d).then(r => r.data),
  update: (id: string, d: unknown) => api.patch(`/checkins/${id}`, d).then(r => r.data),
};

// ── Medicines ──────────────────────────────────────────────────────────────────
export const medicineApi = {
  today:   ()                                => api.get('/medicines/today').then(r => r.data),
  list:    ()                                => api.get('/medicines/').then(r => r.data),
  create:  (d: unknown)                     => api.post('/medicines/', d).then(r => r.data),
  logDose: (id: string, action: string, time: string) =>
    api.post(`/medicines/${id}/log`, { action, scheduled_time: time }).then(r => r.data),
  adherence: () => api.get('/medicines/adherence/summary').then(r => r.data),
};

// ── Family ──────────────────────────────────────────────────────────────────────
export const familyApi = {
  list:   ()              => api.get('/family/members').then(r => r.data),
  add:    (d: unknown)    => api.post('/family/members', d).then(r => r.data),
  update: (id: string, d: unknown) => api.patch(`/family/members/${id}`, d).then(r => r.data),
  delete: (id: string)    => api.delete(`/family/members/${id}`).then(r => r.data),
  invite: (id: string)    => api.post(`/family/members/${id}/invite`).then(r => r.data),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  message:  (d: unknown) => api.post('/ai/session/message', d).then(r => r.data),
  onboard:  (d: unknown) => api.post('/ai/session/onboard', d).then(r => r.data),
  validate: (d: unknown) => api.post('/ai/memory/validate', d).then(r => r.data),
};

// ── Insights ──────────────────────────────────────────────────────────────────
export const insightApi = {
  advisories:  () => api.get('/insights/advisories').then(r => r.data),
  exercise:    () => api.get('/insights/exercise').then(r => r.data),
  interactions:(ids: string[]) => api.post('/insights/interactions/check', { medicine_ids: ids }).then(r => r.data),
  audit:       () => api.get('/insights/cabinet/audit').then(r => r.data),
};

// ── Lab Reports ───────────────────────────────────────────────────────────────
export const labApi = {
  list:   (p?: unknown) => api.get('/lab_reports/', { params: p }).then(r => r.data),
  upload: (fd: FormData) => api.post('/lab_reports/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  get:    (id: string)  => api.get(`/lab_reports/${id}`).then(r => r.data),
  trends: (biomarker: string) => api.get('/lab_reports/biomarkers/trends', { params: { biomarker_name: biomarker } }).then(r => r.data),
};
