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

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Returns the full backend Google OAuth initiation URL dynamically based on environment configuration.
 */
export const getGoogleAuthUrl = (): string => {
  const base = API_BASE_URL.replace(/\/+$/, '');
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
