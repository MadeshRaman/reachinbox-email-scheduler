import { Request, Response, NextFunction } from 'express';
import { slackService } from '../services/slack.service';
import { config } from '../config';
import { extractUserIdFromToken } from './auth.controller';
import { getOrCreateDefaultUser } from './email.controller';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

/**
 * GET /api/slack/connect
 * Redirects user to Slack OAuth Authorization URL
 */
export const connectSlack = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!config.slack.clientId) {
      res.status(400).json({
        success: false,
        message: 'Slack Integration is not configured. Please supply SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in backend .env',
      });
      return;
    }

    const userId = extractUserIdFromToken(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const oauthUrl = slackService.getOAuthUrl(userId);
    res.json({ success: true, url: oauthUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/slack/callback
 * Handles OAuth return redirect from Slack
 */
export const slackCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, error, state } = req.query;

    if (error) {
      logger.error('[SlackCallback] Error received from Slack OAuth:', error);
      res.redirect(`${config.slack.frontendRedirectUri}?error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, message: 'Missing OAuth code in callback.' });
      return;
    }

    const userId = typeof state === 'string' ? state : null;
    if (!userId) {
      res.status(400).json({ success: false, message: 'Missing state (userId) in callback.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const authData = await slackService.exchangeCodeForToken(code);

    await slackService.saveConnection(user.id, {
      accessToken: authData.access_token,
      teamId: authData.team?.id,
      teamName: authData.team?.name,
      channelId: authData.incoming_webhook?.channel_id || authData.authed_user?.id,
    });

    logger.info(`[SlackCallback] Slack connected for user ${user.email} (Team: ${authData.team?.name})`);

    res.redirect(config.slack.frontendRedirectUri);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/slack/status
 * Returns current Slack connection status for the user
 */
export const getSlackStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getOrCreateDefaultUser(req);
    const connection = await slackService.getConnection(user.id);

    res.json({
      success: true,
      connected: !!connection,
      teamName: connection?.teamName || null,
      channelId: connection?.channelId || null,
      configured: !!config.slack.clientId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/slack/disconnect
 * Removes Slack connection
 */
export const disconnectSlack = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getOrCreateDefaultUser(req);
    await slackService.disconnect(user.id);

    res.json({
      success: true,
      message: 'Slack disconnected successfully.',
    });
  } catch (error) {
    next(error);
  }
};
