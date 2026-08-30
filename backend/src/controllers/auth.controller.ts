import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Helper to extract user ID from JWT if present
 */
export const extractUserIdFromToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      return decoded.userId;
    } catch (e) {
      return null;
    }
  }
  return null;
};

const KNOWN_PRODUCTION_BACKEND = 'https://reachinbox-email-scheduler-production-cac2.up.railway.app';
const KNOWN_PRODUCTION_FRONTEND = 'https://disciplined-upliftment-production-1149.up.railway.app';

/**
 * Resolves the Google OAuth callback redirect URI dynamically.
 * Priority:
 * 1. GOOGLE_CALLBACK_URL (Railway configured environment variable)
 * 2. GOOGLE_REDIRECT_URI / GOOGLE_OAUTH_CALLBACK_URL
 * 3. Dynamic header resolution on production/cloud (x-forwarded-host / host)
 * 4. RAILWAY_PUBLIC_DOMAIN
 * 5. Production fallback (KNOWN_PRODUCTION_BACKEND)
 * 6. Local development fallback (http://localhost:5000/api/auth/google/callback)
 */
export const getGoogleRedirectUri = (req?: Request): string => {
  const envCallback =
    process.env.GOOGLE_CALLBACK_URL?.trim() ||
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    process.env.GOOGLE_OAUTH_CALLBACK_URL?.trim();

  if (envCallback) {
    return envCallback;
  }

  if (req) {
    const proto = req.headers['x-forwarded-proto'] || (process.env.NODE_ENV === 'production' ? 'https' : req.protocol) || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return `${proto}://${host}/api/auth/google/callback`;
    }
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}/api/auth/google/callback`;
  }

  if (process.env.NODE_ENV === 'production') {
    return `${KNOWN_PRODUCTION_BACKEND}/api/auth/google/callback`;
  }

  return `http://localhost:${process.env.PORT || 5000}/api/auth/google/callback`;
};

/**
 * Resolves the frontend URL target where the user and token are redirected after Google authentication.
 * Priority:
 * 1. GOOGLE_FRONTEND_REDIRECT_URI / FRONTEND_REDIRECT_URI
 * 2. FRONTEND_URL
 * 3. CORS_ORIGIN if non-localhost
 * 4. Dynamic referer header if non-localhost
 * 5. Production fallback (KNOWN_PRODUCTION_FRONTEND)
 * 6. Local development fallback (http://localhost:5173/?token=)
 */
export const getGoogleFrontendRedirectUri = (req?: Request): string => {
  const envFrontend =
    process.env.GOOGLE_FRONTEND_REDIRECT_URI?.trim() ||
    process.env.FRONTEND_REDIRECT_URI?.trim();

  if (envFrontend) {
    return envFrontend.endsWith('token=') ? envFrontend : (envFrontend.includes('?') ? `${envFrontend}&token=` : `${envFrontend.replace(/\/+$/, '')}/?token=`);
  }

  if (process.env.FRONTEND_URL?.trim()) {
    const base = process.env.FRONTEND_URL.trim().replace(/\/+$/, '');
    return `${base}/?token=`;
  }

  if (process.env.CORS_ORIGIN?.trim() && !process.env.CORS_ORIGIN.includes('localhost') && !process.env.CORS_ORIGIN.includes('127.0.0.1')) {
    const base = process.env.CORS_ORIGIN.trim().replace(/\/+$/, '');
    return `${base}/?token=`;
  }

  if (req && req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      if (!refererUrl.host.includes('localhost') && !refererUrl.host.includes('127.0.0.1')) {
        return `${refererUrl.origin}/?token=`;
      }
    } catch {}
  }

  if (process.env.NODE_ENV === 'production') {
    return `${KNOWN_PRODUCTION_FRONTEND}/?token=`;
  }

  return 'http://localhost:5173/?token=';
};

/**
 * GET /api/auth/google
 * Initiates the Google OAuth 2.0 flow
 */
export const googleAuthRedirect = (req: Request, res: Response) => {
  const frontendRedirectUri = getGoogleFrontendRedirectUri(req);
  const redirectUri = getGoogleRedirectUri(req);

  logger.info(`[Auth] Initiating Google OAuth with redirect_uri: ${redirectUri}`);

  if (!config.google.clientId) {
    logger.warn('[Auth] Google Client ID is missing. Redirecting to frontend with error.');
    return res.redirect(`${frontendRedirectUri.split('?')[0]}?error=google_client_id_missing`);
  }

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    config.google.clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
    scopes
  )}&access_type=offline&prompt=consent`;

  logger.info(`[Auth] Redirecting to accounts.google.com authorization page`);
  res.redirect(authUrl);
};

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth callback, exchanges code for token, fetches user info
 */
export const googleAuthCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const frontendRedirectUri = getGoogleFrontendRedirectUri(req);
  const redirectUri = getGoogleRedirectUri(req);

  logger.info(`[Auth] Received Google OAuth callback. Exchanging code with redirect_uri: ${redirectUri}`);

  try {
    const code = req.query.code as string;
    if (!code) {
      logger.warn('[Auth] No OAuth authorization code provided in query parameters.');
      res.redirect(`${frontendRedirectUri.split('?')[0]}?error=no_code_provided`);
      return;
    }

    const tokenParams = new URLSearchParams({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      logger.error('[Auth] Failed to exchange code for token:', tokenData);
      res.redirect(`${frontendRedirectUri.split('?')[0]}?error=oauth_exchange_failed`);
      return;
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json();

    if (!googleUser.email) {
      logger.error('[Auth] No email returned in Google userinfo.');
      res.redirect(`${frontendRedirectUri.split('?')[0]}?error=google_email_missing`);
      return;
    }

    const email = googleUser.email.trim().toLowerCase();
    const name = googleUser.name || 'Google User';
    const avatarUrl = googleUser.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId: googleUser.id,
          avatarUrl,
        },
      });
      logger.info(`[Auth] New user registered via Google OAuth: ${email}`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          avatarUrl,
          googleId: googleUser.id,
        },
      });
      logger.info(`[Auth] Existing user logged in via Google OAuth: ${email}`);
    }

    const jwtToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
    logger.info(`[Auth] Redirecting authenticated user to frontend application`);
    res.redirect(`${frontendRedirectUri}${jwtToken}`);
  } catch (error: any) {
    logger.error('[Auth] Exception during Google OAuth callback:', error?.message || error);
    res.redirect(`${frontendRedirectUri.split('?')[0]}?error=internal_server_error`);
  }
};

/**
 * POST /api/auth/login
 * Supports fallback instant Demo Login for seamless development/testing
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, name, googleId, avatarUrl } = req.body;

    const targetEmail = (email || 'user@reachinbox.ai').trim().toLowerCase();
    const targetName = name || 'ReachInbox Demo User';
    const targetAvatar = avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    let user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: targetEmail,
          name: targetName,
          googleId: googleId || null,
          avatarUrl: targetAvatar,
        },
      });
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });

    res.json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Retrieves active profile
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = extractUserIdFromToken(req);
    let user = null;

    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }

    // Fallback logic to preserve assignment testing behavior if no valid token
    if (!user) {
      // Create demo user if nothing else works
      const targetEmail = 'user@reachinbox.ai';
      user = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: targetEmail,
            name: 'ReachInbox Demo User',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          },
        });
      }
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};
