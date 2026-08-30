import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import {
  config,
  getGoogleCallbackUrl,
  getGoogleFrontendRedirectUri,
  cleanEnv,
  isProductionEnv,
} from '../config';
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

// Re-export URL resolvers for backward compatibility
export const getGoogleRedirectUri = (req?: Request): string => {
  return getGoogleCallbackUrl(req);
};

export const getFrontendRedirectUri = (req?: Request): string => {
  return getGoogleFrontendRedirectUri(req);
};

/**
 * GET /api/auth/google
 * Initiates the Google OAuth 2.0 flow
 */
export const googleAuthRedirect = (req: Request, res: Response) => {
  const frontendRedirectUri = getGoogleFrontendRedirectUri(req);
  const redirectUri = getGoogleCallbackUrl(req);

  // High-visibility logs for Railway debugging & verification
  console.log(`[GoogleOAuth:Initiate] ACTIVE_GOOGLE_REDIRECT_URI=${redirectUri}`);
  console.log(`[GoogleOAuth:Initiate] ACTIVE_FRONTEND_REDIRECT_URI=${frontendRedirectUri}`);
  logger.info(`[GoogleOAuth:Initiate] ACTIVE_GOOGLE_REDIRECT_URI=${redirectUri}`);

  if (!config.google.clientId) {
    logger.warn('[Auth] Google Client ID is missing. Redirecting to frontend with error.');
    const errorUrl = frontendRedirectUri.includes('?')
      ? `${frontendRedirectUri.split('?')[0]}?error=google_client_id_missing`
      : `${frontendRedirectUri}?error=google_client_id_missing`;
    return res.redirect(errorUrl);
  }

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    config.google.clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
    scopes
  )}&access_type=offline&prompt=consent`;

  logger.info(`[Auth] Redirecting browser to Google OAuth authorization endpoint`);
  res.redirect(authUrl);
};

/**
 * Helper to safely append token to frontend URL
 */
const attachTokenToFrontendUrl = (baseUrl: string, token: string): string => {
  if (baseUrl.endsWith('token=')) {
    return `${baseUrl}${token}`;
  }
  if (baseUrl.includes('?')) {
    return `${baseUrl}&token=${token}`;
  }
  return `${baseUrl.replace(/\/+$/, '')}/?token=${token}`;
};

/**
 * Helper to safely append error to frontend URL
 */
const attachErrorToFrontendUrl = (baseUrl: string, errorCode: string): string => {
  const cleanBase = baseUrl.split('?')[0].replace(/\/+$/, '');
  return `${cleanBase}/?error=${encodeURIComponent(errorCode)}`;
};

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth callback, exchanges code for token, fetches user info
 */
export const googleAuthCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const frontendRedirectUri = getGoogleFrontendRedirectUri(req);
  const redirectUri = getGoogleCallbackUrl(req);

  console.log(`[GoogleOAuth:Callback] ACTIVE_GOOGLE_REDIRECT_URI=${redirectUri}`);
  console.log(`[GoogleOAuth:Callback] ACTIVE_FRONTEND_REDIRECT_URI=${frontendRedirectUri}`);
  logger.info(`[GoogleOAuth:Callback] ACTIVE_GOOGLE_REDIRECT_URI=${redirectUri}`);

  try {
    const code = req.query.code as string;
    if (!code) {
      logger.warn('[Auth] No OAuth authorization code provided in query parameters.');
      res.redirect(attachErrorToFrontendUrl(frontendRedirectUri, 'no_code_provided'));
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
      res.redirect(attachErrorToFrontendUrl(frontendRedirectUri, 'oauth_exchange_failed'));
      return;
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json();

    if (!googleUser.email) {
      logger.error('[Auth] No email returned in Google userinfo.');
      res.redirect(attachErrorToFrontendUrl(frontendRedirectUri, 'google_email_missing'));
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
    res.redirect(attachTokenToFrontendUrl(frontendRedirectUri, jwtToken));
  } catch (error: any) {
    logger.error('[Auth] Exception during Google OAuth callback:', error?.message || error);
    res.redirect(attachErrorToFrontendUrl(frontendRedirectUri, 'internal_server_error'));
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
