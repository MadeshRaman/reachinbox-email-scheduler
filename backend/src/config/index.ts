import dotenv from 'dotenv';
import type { Request } from 'express';

dotenv.config();

/**
 * Universal sanitizer for environment variables.
 * Strips accidental "KEY=" prefixes, surrounding quotes, and leading/trailing whitespace.
 */
export const cleanEnv = (val?: string | null, keyName?: string): string => {
  if (!val) return '';
  let cleaned = String(val).trim();

  // If a specific key name is provided, strip "KEY=" or "KEY = " prefix
  if (keyName) {
    const keyRegex = new RegExp(`^${keyName}\\s*=\\s*`, 'i');
    cleaned = cleaned.replace(keyRegex, '').trim();
  }

  // Strip generic uppercase variable prefix (e.g., "SOME_VAR=value")
  cleaned = cleaned.replace(/^[A-Z0-9_]+\s*=\s*/, '').trim();

  // Strip surrounding quotes
  cleaned = cleaned.replace(/^['"`]|['"`]$/g, '').trim();

  return cleaned;
};

// Known live fallback production URLs for Railway deployment
export const KNOWN_PRODUCTION_BACKEND = 'https://reachinbox-email-scheduler-production-cac2.up.railway.app';
export const KNOWN_PRODUCTION_FRONTEND = 'https://disciplined-upliftment-production-1149.up.railway.app';

/**
 * Checks if the current runtime environment is production (Railway, Cloud, or NODE_ENV=production).
 */
export const isProductionEnv = (): boolean => {
  const nodeEnv = cleanEnv(process.env.NODE_ENV, 'NODE_ENV').toLowerCase();
  const googleCallback = cleanEnv(process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI, 'GOOGLE_CALLBACK_URL');
  const frontendUrl = cleanEnv(process.env.FRONTEND_URL, 'FRONTEND_URL');

  return (
    nodeEnv === 'production' ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RAILWAY_PROJECT_ID) ||
    Boolean(process.env.RAILWAY_PUBLIC_DOMAIN) ||
    Boolean(process.env.PUBLIC_URL) ||
    (Boolean(googleCallback) && !googleCallback.includes('localhost') && !googleCallback.includes('127.0.0.1')) ||
    (Boolean(frontendUrl) && !frontendUrl.includes('localhost') && !frontendUrl.includes('127.0.0.1'))
  );
};

/**
 * Resolves the public base URL for this backend service.
 * In production, it guarantees a non-localhost HTTPS URL.
 */
export const getPublicBackendUrl = (req?: Request): string => {
  const isProd = isProductionEnv();

  // 1. Check GOOGLE_CALLBACK_URL / GOOGLE_REDIRECT_URI
  const envCallback = cleanEnv(
    process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_OAUTH_CALLBACK_URL,
    'GOOGLE_CALLBACK_URL'
  );
  if (envCallback) {
    // If in production, ensure it is not a localhost address
    if (!isProd || (!envCallback.includes('localhost') && !envCallback.includes('127.0.0.1'))) {
      try {
        const u = new URL(envCallback);
        return `${u.protocol}//${u.host}`.replace(/\/+$/, '');
      } catch {}
    }
  }

  // 2. Check PUBLIC_URL
  const publicUrl = cleanEnv(process.env.PUBLIC_URL, 'PUBLIC_URL');
  if (publicUrl) {
    if (!isProd || (!publicUrl.includes('localhost') && !publicUrl.includes('127.0.0.1'))) {
      return publicUrl.replace(/\/+$/, '');
    }
  }

  // 3. Check RAILWAY_PUBLIC_DOMAIN
  const railwayDomain = cleanEnv(process.env.RAILWAY_PUBLIC_DOMAIN, 'RAILWAY_PUBLIC_DOMAIN');
  if (railwayDomain) {
    const domain = railwayDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${domain}`;
  }

  // 4. Dynamic request headers (from Express request)
  if (req) {
    const forwardedHost = req.get('x-forwarded-host');
    const directHost = req.get('host');
    const host = forwardedHost || directHost;

    if (host && (!isProd || (!host.includes('localhost') && !host.includes('127.0.0.1')))) {
      const proto = req.get('x-forwarded-proto') || (isProd ? 'https' : req.protocol) || 'https';
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }

  // 5. Fallback for production
  if (isProd) {
    return KNOWN_PRODUCTION_BACKEND;
  }

  // 6. Fallback for local development
  const port = cleanEnv(process.env.PORT, 'PORT') || '5000';
  return `http://localhost:${port}`;
};

/**
 * Resolves the Google OAuth callback redirect URI.
 * Guarantees that production never redirects to localhost.
 */
export const getGoogleCallbackUrl = (req?: Request): string => {
  const isProd = isProductionEnv();
  const envCallback = cleanEnv(
    process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_OAUTH_CALLBACK_URL,
    'GOOGLE_CALLBACK_URL'
  );

  if (envCallback) {
    // If in production and envCallback is set to localhost, ignore it and construct production URL
    if (!isProd || (!envCallback.includes('localhost') && !envCallback.includes('127.0.0.1'))) {
      return envCallback;
    }
  }

  const backendBase = getPublicBackendUrl(req);
  return `${backendBase}/api/auth/google/callback`;
};

/**
 * Resolves the frontend URL target where users should be redirected after authentication.
 */
export const getFrontendUrl = (req?: Request): string => {
  const isProd = isProductionEnv();

  // 1. FRONTEND_URL
  const envFrontend = cleanEnv(process.env.FRONTEND_URL, 'FRONTEND_URL');
  if (envFrontend) {
    if (!isProd || (!envFrontend.includes('localhost') && !envFrontend.includes('127.0.0.1'))) {
      return envFrontend.replace(/\/+$/, '');
    }
  }

  // 2. CORS_ORIGIN
  const corsOrigin = cleanEnv(process.env.CORS_ORIGIN, 'CORS_ORIGIN');
  if (corsOrigin) {
    if (!isProd || (!corsOrigin.includes('localhost') && !corsOrigin.includes('127.0.0.1'))) {
      return corsOrigin.replace(/\/+$/, '');
    }
  }

  // 3. Dynamic Referer or Origin Header
  if (req) {
    const origin = req.get('origin');
    const referer = req.get('referer');
    const target = origin || referer;
    if (target) {
      try {
        const u = new URL(target);
        if (!isProd || (!u.host.includes('localhost') && !u.host.includes('127.0.0.1'))) {
          return `${u.protocol}//${u.host}`.replace(/\/+$/, '');
        }
      } catch {}
    }
  }

  // 4. Production Fallback
  if (isProd) {
    return KNOWN_PRODUCTION_FRONTEND;
  }

  // 5. Local Dev Fallback
  return 'http://localhost:5173';
};

/**
 * Resolves the Google Frontend Redirect URI (including "?token=" parameter append)
 */
export const getGoogleFrontendRedirectUri = (req?: Request): string => {
  const isProd = isProductionEnv();
  const envFrontendRedirect = cleanEnv(
    process.env.GOOGLE_FRONTEND_REDIRECT_URI || process.env.FRONTEND_REDIRECT_URI,
    'GOOGLE_FRONTEND_REDIRECT_URI'
  );

  if (envFrontendRedirect) {
    if (!isProd || (!envFrontendRedirect.includes('localhost') && !envFrontendRedirect.includes('127.0.0.1'))) {
      return envFrontendRedirect.endsWith('token=')
        ? envFrontendRedirect
        : envFrontendRedirect.includes('?')
        ? `${envFrontendRedirect}&token=`
        : `${envFrontendRedirect.replace(/\/+$/, '')}/?token=`;
    }
  }

  const base = getFrontendUrl(req);
  return `${base}/?token=`;
};

// Redis URL retrieval helper
const getRedisUrl = (): string | undefined => {
  const url = cleanEnv(process.env.REDIS_URL || process.env.REDISPRIVATE_URL || process.env.REDIS_TLS_URL, 'REDIS_URL');
  return url.length > 0 ? url : undefined;
};

const redisUrl = getRedisUrl();

// Helper to parse boolean from env
const parseBooleanEnv = (val?: string | null, keyName?: string, defaultVal = false): boolean => {
  if (!val) return defaultVal;
  const cleaned = cleanEnv(val, keyName).toLowerCase();
  if (cleaned === 'true' || cleaned === '1' || cleaned === 'yes') return true;
  if (cleaned === 'false' || cleaned === '0' || cleaned === 'no') return false;
  return defaultVal;
};

const rawSmtpPort = parseInt(cleanEnv(process.env.SMTP_PORT, 'SMTP_PORT') || '587', 10);
const smtpPort = isNaN(rawSmtpPort) ? 587 : rawSmtpPort;
const rawSmtpSecure = cleanEnv(process.env.SMTP_SECURE, 'SMTP_SECURE');
const smtpSecure = rawSmtpSecure.length > 0
  ? parseBooleanEnv(rawSmtpSecure, 'SMTP_SECURE', smtpPort === 465)
  : smtpPort === 465;

const smtpHost = cleanEnv(process.env.SMTP_HOST, 'SMTP_HOST') || (isProductionEnv() ? '' : 'smtp.ethereal.email');
const smtpUser = cleanEnv(process.env.SMTP_USER || process.env.ETHEREAL_USER, 'SMTP_USER');
const smtpPass = cleanEnv(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.ETHEREAL_PASS, 'SMTP_PASS');
const smtpFromEmail =
  cleanEnv(process.env.SMTP_FROM || process.env.SMTP_FROM_EMAIL, 'SMTP_FROM') ||
  smtpUser ||
  (isProductionEnv() ? '' : 'reachinbox@demo.ethereal.email');
const smtpFromName = cleanEnv(process.env.SMTP_FROM_NAME, 'SMTP_FROM_NAME') || 'ReachInbox Scheduler';

export const config = {
  port: parseInt(cleanEnv(process.env.PORT, 'PORT') || '5000', 10),
  nodeEnv: isProductionEnv() ? 'production' : (cleanEnv(process.env.NODE_ENV, 'NODE_ENV') || 'development'),
  corsOrigin: cleanEnv(process.env.CORS_ORIGIN, 'CORS_ORIGIN') || getFrontendUrl(),
  databaseUrl:
    cleanEnv(process.env.DATABASE_URL || process.env.MYSQL_URL, 'DATABASE_URL') ||
    'mysql://reachinbox_user:reachinbox_password@localhost:3307/reachinbox_email_scheduler',

  jwtSecret:
    cleanEnv(process.env.JWT_SECRET, 'JWT_SECRET') ||
    'reachinbox-scheduler-super-secret-jwt-key-2025',

  google: {
    clientId: cleanEnv(process.env.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
    clientSecret: cleanEnv(process.env.GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET'),
    redirectUri: getGoogleCallbackUrl(),
    frontendRedirectUri: getGoogleFrontendRedirectUri(),
  },

  redis: {
    url: redisUrl,
    host: cleanEnv(process.env.REDIS_HOST, 'REDIS_HOST') || (isProductionEnv() && !redisUrl ? '' : 'localhost'),
    port: parseInt(cleanEnv(process.env.REDIS_PORT, 'REDIS_PORT') || '6379', 10),
    password: cleanEnv(process.env.REDIS_PASSWORD, 'REDIS_PASSWORD') || undefined,
  },

  worker: {
    concurrency: parseInt(cleanEnv(process.env.WORKER_CONCURRENCY, 'WORKER_CONCURRENCY') || '5', 10),
  },

  rateLimit: {
    maxEmailsPerHourPerSender: parseInt(
      cleanEnv(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER, 'MAX_EMAILS_PER_HOUR_PER_SENDER') || '100',
      10
    ),
    emailDelayMs: parseInt(cleanEnv(process.env.EMAIL_DELAY_MS, 'EMAIL_DELAY_MS') || '500', 10),
  },

  elasticsearch: {
    node: cleanEnv(process.env.ELASTICSEARCH_NODE, 'ELASTICSEARCH_NODE') || 'http://localhost:9200',
    username: cleanEnv(process.env.ELASTICSEARCH_USERNAME, 'ELASTICSEARCH_USERNAME') || undefined,
    password: cleanEnv(process.env.ELASTICSEARCH_PASSWORD, 'ELASTICSEARCH_PASSWORD') || undefined,
  },

  smtp: {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    user: smtpUser,
    pass: smtpPass,
    fromEmail: smtpFromEmail,
    fromName: smtpFromName,
  },

  slack: {
    clientId: cleanEnv(process.env.SLACK_CLIENT_ID, 'SLACK_CLIENT_ID'),
    clientSecret: cleanEnv(process.env.SLACK_CLIENT_SECRET, 'SLACK_CLIENT_SECRET'),
    redirectUri:
      cleanEnv(process.env.SLACK_REDIRECT_URI, 'SLACK_REDIRECT_URI') ||
      `${getPublicBackendUrl()}/api/slack/callback`,
    frontendRedirectUri:
      cleanEnv(process.env.SLACK_FRONTEND_REDIRECT_URI, 'SLACK_FRONTEND_REDIRECT_URI') ||
      `${getFrontendUrl()}/dashboard?slack=connected`,
  },
};

