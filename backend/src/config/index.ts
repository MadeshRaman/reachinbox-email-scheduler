import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'mysql://reachinbox_user:reachinbox_password@localhost:3307/reachinbox_email_scheduler',
  
  jwtSecret: process.env.JWT_SECRET || 'reachinbox-scheduler-super-secret-jwt-key-2025',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',
    frontendRedirectUri: process.env.GOOGLE_FRONTEND_REDIRECT_URI || 'http://localhost:5173/?token=',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
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
    redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback',
    frontendRedirectUri: process.env.SLACK_FRONTEND_REDIRECT_URI || 'http://localhost:5173/dashboard?slack=connected',
  },
};
