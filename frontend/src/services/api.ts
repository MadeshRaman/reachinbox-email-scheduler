import axios from 'axios';
import {
  EmailJob,
  EmailStats,
  ScheduleEmailPayload,
  SearchResponse,
  SlackStatus,
  User,
  HealthCheckResponse,
} from '../types';

/**
 * Known live Railway backend base URL (used as guaranteed fallback for production deployments)
 */
const PRODUCTION_BACKEND_URL = 'https://reachinbox-email-scheduler-production-cac2.up.railway.app';

/**
 * Robustly normalizes and sanitizes the API base URL:
 * 1. Strips any accidental 'VITE_API_BASE_URL=' key prefix or surrounding quotes/spaces.
 * 2. If running in production browser on Railway (not localhost) and no env var was compiled in,
 *    falls back automatically to the live production backend Railway URL.
 * 3. Ensures the base URL always ends with '/api' without duplicate '/api/api'.
 * 4. Ensures no malformed protocol/hostname concatenation occurs.
 */
export const getNormalizedApiBaseUrl = (): string => {
  let rawUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  // Strip accidental "VITE_API_BASE_URL=" prefix or quotes if pasted verbatim
  rawUrl = rawUrl.replace(/^VITE_API_BASE_URL\s*=\s*/i, '').replace(/^['"]|['"]$/g, '').trim();

  // If in browser and not localhost, but rawUrl is empty or local, use production backend
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    (!rawUrl || rawUrl === '/api' || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1'))
  ) {
    rawUrl = PRODUCTION_BACKEND_URL;
  }

  // If still empty (local dev without env), fallback to '/api' for Vite dev proxy
  if (!rawUrl) {
    return '/api';
  }

  // Strip trailing slashes
  rawUrl = rawUrl.replace(/\/+$/, '');

  // Ensure it ends with /api (without duplicating /api/api)
  if (!rawUrl.endsWith('/api')) {
    rawUrl = `${rawUrl}/api`;
  }

  return rawUrl;
};

export const API_BASE_URL = getNormalizedApiBaseUrl();

/**
 * Returns the full backend Google OAuth initiation URL.
 * Example: "https://reachinbox-email-scheduler-production-cac2.up.railway.app/api/auth/google"
 */
export const getGoogleAuthUrl = (): string => {
  const base = getNormalizedApiBaseUrl().replace(/\/+$/, '');
  return `${base}/auth/google`;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Health check
export const checkHealth = async (): Promise<HealthCheckResponse> => {
  const response = await apiClient.get<HealthCheckResponse>('/health');
  return response.data;
};

// Emails API
export const scheduleEmailsApi = async (payload: ScheduleEmailPayload) => {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    count: number;
    jobs: EmailJob[];
  }>('/emails/schedule', payload);
  return response.data;
};

export const getScheduledEmailsApi = async (page = 1, limit = 20) => {
  const response = await apiClient.get<{
    success: boolean;
    total: number;
    totalPages: number;
    jobs: EmailJob[];
  }>(`/emails/scheduled?page=${page}&limit=${limit}`);
  return response.data;
};

export const getSentEmailsApi = async (page = 1, limit = 20) => {
  const response = await apiClient.get<{
    success: boolean;
    total: number;
    totalPages: number;
    jobs: EmailJob[];
  }>(`/emails/sent?page=${page}&limit=${limit}`);
  return response.data;
};

export const searchEmailsApi = async (q: string, status?: string, page = 1, limit = 20) => {
  let url = `/emails/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`;
  if (status) {
    url += `&status=${encodeURIComponent(status)}`;
  }
  const response = await apiClient.get<SearchResponse>(url);
  return response.data;
};

export const getEmailStatsApi = async () => {
  const response = await apiClient.get<{ success: boolean; stats: EmailStats }>('/emails/stats');
  return response.data.stats;
};

// Slack API
export const getSlackStatusApi = async () => {
  const response = await apiClient.get<SlackStatus & { success: boolean }>('/slack/status');
  return response.data;
};

export const connectSlackApi = async () => {
  const response = await apiClient.get<{ success: boolean; url: string }>('/slack/connect');
  return response.data.url;
};

export const disconnectSlackApi = async () => {
  const response = await apiClient.post<{ success: boolean; message: string }>('/slack/disconnect');
  return response.data;
};

// Auth API
export const loginApi = async (userData?: { email?: string; name?: string; avatarUrl?: string }) => {
  const response = await apiClient.post<{ success: boolean; user: User; token: string }>('/auth/login', userData || {});
  return response.data;
};

export const getMeApi = async () => {
  const response = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
  return response.data.user;
};
