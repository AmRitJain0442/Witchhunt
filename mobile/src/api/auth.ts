import client from './client';
import { AuthResponse, User } from '../types';

export const register = (idToken: string, fcmToken?: string) =>
  client.post<AuthResponse>('/auth/register', { id_token: idToken, fcm_token: fcmToken }).then((r) => r.data);

export const login = (idToken: string, fcmToken?: string) =>
  client.post<AuthResponse>('/auth/login', { id_token: idToken, fcm_token: fcmToken }).then((r) => r.data);

export const logout = () =>
  client.post('/auth/logout').then((r) => r.data);

export const getMe = () =>
  client.get<User>('/users/me').then((r) => r.data);

export const updateProfile = (data: Partial<User>) =>
  client.patch<User>('/users/me', data).then((r) => r.data);
