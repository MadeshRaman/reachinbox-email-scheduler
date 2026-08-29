import dotenv from 'dotenv';

dotenv.config();

// Helper to sanitize and retrieve Redis URL
const getRedisUrl = (): string | undefined => {
  const url = process.env.REDIS_URL || process.env.REDISPRIVATE_URL || process.env.REDIS_TLS_URL;
  if (url && url.trim().length > 0) {
    return url.trim();
  }
  return undefined;
};

const redisUrl = getRedisUrl();

// Helper to determine production backend and frontend URLs
const getPublicBackendUrl = (): string => {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}`;
  }
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:5000';
};

const getFrontendUrl = (): string => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.CORS_ORIGIN && !process.env.CORS_ORIGIN.includes('localhost')) {
    return process.env.CORS_ORIGIN.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:5173';
};

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'mysql://reachinbox_user:reachinbox_password@localhost:3307/reachinbox_email_scheduler',
  
  jwtSecret: process.env.JWT_SECRET || 'reachinbox-scheduler-super-secret-jwt-key-2025',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${getPublicBackendUrl()}/api/auth/google/callback`,
    frontendRedirectUri: process.env.GOOGLE_FRONTEND_REDIRECT_URI || `${getFrontendUrl()}/?token=`,
  },

  redis: {
    url: redisUrl,
    host: process.env.REDIS_HOST || (process.env.NODE_ENV === 'production' && !redisUrl ? '' : 'localhost'),
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  },

  rateLimit: {
    maxEmailsPerHourPerSender: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '100', 10),
    emailDelayMs: parseInt(process.env.EMAIL_DELAY_MS || '500', 10),
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME || undefined,
    password: process.env.ELASTICSEARCH_PASSWORD || undefined,
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.ETHEREAL_USER || process.env.SMTP_USER || '',
    pass: process.env.ETHEREAL_PASS || process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'reachinbox@demo.ethereal.email',
    fromName: process.env.SMTP_FROM_NAME || 'ReachInbox Scheduler',
  },

  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: process.env.SLACK_REDIRECT_URI || `${getPublicBackendUrl()}/api/slack/callback`,
    frontendRedirectUri: process.env.SLACK_FRONTEND_REDIRECT_URI || `${getFrontendUrl()}/dashboard?slack=connected`,
  },
};
