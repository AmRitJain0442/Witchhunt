import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '../constants';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject Firebase ID token on every request
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const user = auth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error shape
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const message =
      error.response?.data?.detail ??
      error.message ??
      'Something went wrong';
    return Promise.reject(new Error(message));
  },
);

export default client;
