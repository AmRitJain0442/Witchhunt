import client from './client';
import { AuthResponse, User } from '../types';
import { auth } from '../lib/firebase';

function normalizeAuth(payload: Record<string, unknown>): AuthResponse {
  const fb = auth.currentUser;
  const displayName = String(payload.display_name ?? fb?.displayName ?? fb?.email ?? 'Kutumb User');
  return {
    access_token: '',
    token_type: 'Bearer',
    user: {
      uid: String(payload.uid ?? fb?.uid ?? ''),
      email: fb?.email ?? '',
      name: displayName,
      phone: String(payload.phone_number ?? ''),
      created_at: String(payload.created_at ?? new Date().toISOString()),
      family_count: Number(payload.family_count ?? 0),
      active_medicine_count: payload.has_active_medicines ? 1 : 0,
    } as User,
  };
}

export const register = (idToken: string, fcmToken?: string, displayName?: string) =>
  client
    .post<Record<string, unknown>>('/auth/register', {
      firebase_token: idToken,
      display_name: displayName,
      fcm_token: fcmToken,
    })
    .then((r) => normalizeAuth(r.data));

export const login = (idToken: string, fcmToken?: string) =>
  client
    .post<Record<string, unknown>>('/auth/login', { firebase_token: idToken, fcm_token: fcmToken })
    .then((r) => normalizeAuth(r.data));

export const logout = () =>
  client.post('/auth/logout').then((r) => r.data);

export const getMe = () =>
  client.get<User>('/users/me').then((r) => {
    const user = r.data as User & { display_name?: string };
    return { ...user, name: user.name ?? user.display_name ?? '' };
  });

export const updateProfile = (data: Partial<User>) =>
  client.patch<User>('/users/me', data).then((r) => r.data);
