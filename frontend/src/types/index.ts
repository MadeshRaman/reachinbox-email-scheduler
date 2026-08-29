export type EmailJobStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';

export interface EmailSender {
  id: string;
  userId: string;
  email: string;
  displayName?: string | null;
}

export interface EmailJob {
  id: string;
  userId: string;
  senderId: string;
  sender?: EmailSender;
  senderEmail?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailJobStatus;
  attempts: number;
  idempotencyKey: string;
  bullJobId?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailStats {
  total: number;
  scheduled: number;
  processing: number;
  sent: number;
  rateLimited: number;
  failed: number;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  googleId?: string | null;
}

export interface SlackStatus {
  connected: boolean;
  teamName?: string | null;
  channelId?: string | null;
  configured: boolean;
}

export interface ScheduleEmailPayload {
  senderEmail: string;
  senderName?: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime?: string;
  delayBetweenEmails: number;
  hourlyLimit?: number;
}

export interface SearchResponse {
  success: boolean;
  source: 'elasticsearch' | 'database';
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  jobs: EmailJob[];
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  service: string;
  version: string;
  environment: string;
}

export interface ServiceItem {
  name: string;
  category: 'Backend' | 'Frontend' | 'Infrastructure' | 'Database';
  description: string;
  iconName: string;
  status: 'configured' | 'pending' | 'ready';
  tag: string;
}
