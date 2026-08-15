import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Base URL for the FastAPI backend.
 *
 * - Physical phone running Expo Go: your PC and phone must be on the SAME
 *   WiFi network. Replace this with your PC's LAN IP, e.g. http://192.168.1.5:8000
 *   (find it on Windows with `ipconfig` -> "IPv4 Address").
 * - Android emulator: use http://10.0.2.2:8000 to reach your PC's localhost.
 * - iOS simulator / web: http://localhost:8000 works directly.
 *
 * Easiest: set EXPO_PUBLIC_API_BASE_URL in a .env file (see .env.example)
 * so you don't have to edit code.
 */
const FALLBACK_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || FALLBACK_URL;

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Unwraps the backend's {success, data, message} / {success, error} envelope. */
export function unwrap<T = any>(response: any): T {
  const body = response.data;
  if (body?.success) return body.data as T;
  throw new ApiError(
    body?.error?.code || 'UNKNOWN_ERROR',
    body?.error?.message || 'Something went wrong. Please try again.',
    response.status
  );
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  const anyErr = err as any;
  if (anyErr?.response?.data?.error?.message) return anyErr.response.data.error.message;
  if (anyErr?.message === 'Network Error') {
    return `Can't reach the server at ${API_BASE_URL}. Check that the backend is running and your phone is on the same WiFi network as your PC.`;
  }
  return anyErr?.message || 'Something went wrong. Please try again.';
}
