import { config } from '../config';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export class SlackService {
  /**
   * Generates the Slack OAuth v2 Authorization URL
   */
  getOAuthUrl(userId: string): string {
    const scopes = ['chat:write', 'chat:write.public', 'channels:read'].join(',');
    return `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(
      config.slack.clientId
    )}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(
      config.slack.redirectUri
    )}&state=${encodeURIComponent(userId)}`;
  }

  /**
   * Exchanges OAuth authorization code for Bot/User Access Token
   */
  async exchangeCodeForToken(code: string): Promise<any> {
    if (!config.slack.clientId || !config.slack.clientSecret) {
      throw new Error('Slack Client ID or Secret is not configured in backend .env');
    }

    const params = new URLSearchParams({
      client_id: config.slack.clientId,
      client_secret: config.slack.clientSecret,
      code,
      redirect_uri: config.slack.redirectUri,
    });

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack OAuth exchange failed: ${data.error || 'Unknown error'}`);
    }

    return data;
  }

  /**
   * Stores or updates the Slack connection in MySQL
   */
  async saveConnection(
    userId: string,
    data: {
      accessToken: string;
      teamId?: string;
      teamName?: string;
      channelId?: string;
    }
  ) {
    return prisma.slackConnection.upsert({
      where: { userId },
      update: {
        accessToken: data.accessToken,
        teamId: data.teamId,
        teamName: data.teamName,
        channelId: data.channelId,
      },
      create: {
        userId,
        accessToken: data.accessToken,
        teamId: data.teamId,
        teamName: data.teamName,
        channelId: data.channelId,
      },
    });
  }

  /**
   * Removes Slack connection for user
   */
  async disconnect(userId: string) {
    return prisma.slackConnection.deleteMany({
      where: { userId },
    });
  }

  /**
   * Retrieves Slack connection for user
   */
  async getConnection(userId: string) {
    return prisma.slackConnection.findUnique({
      where: { userId },
    });
  }

  /**
   * Sends a real Slack message via Web API
   */
  async postMessage(accessToken: string, channelId: string, text: string, blocks?: any[]): Promise<boolean> {
    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          channel: channelId,
          text,
          blocks,
        }),
      });

      const resData = await response.json();
      if (!resData.ok) {
        logger.error('[SlackService] Post message failed:', resData.error);
        return false;
      }

      logger.info(`[SlackService] Notification successfully posted to Slack channel ${channelId}`);
      return true;
    } catch (error) {
      logger.error('[SlackService] Network error sending Slack message:', error);
      return false;
    }
  }

  /**
   * Sends a rich notification when an hourly sender rate limit is exceeded
   */
  async sendRateLimitAlert(
    userId: string,
    details: {
      senderEmail: string;
      hourlyLimit: number;
      timeWindow: string;
      rescheduledTo: string;
    }
  ): Promise<boolean> {
    const connection = await this.getConnection(userId);
    if (!connection || !connection.accessToken) {
      return false;
    }

    const channel = connection.channelId || 'general';
    const alertText = `⚠️ Rate Limit Alert: Sender ${details.senderEmail} hit hourly cap (${details.hourlyLimit} emails/hr). Outbound emails are being delayed until ${details.rescheduledTo}.`;

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ ReachInbox Rate Limit Throttling Alert',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Sender Account:*\n\`${details.senderEmail}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Hourly Cap:*\n${details.hourlyLimit} emails/hour`,
          },
          {
            type: 'mrkdwn',
            text: `*Time Window:*\n${details.timeWindow}`,
          },
          {
            type: 'mrkdwn',
            text: `*Rescheduled To:*\n${details.rescheduledTo}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'ℹ️ _Jobs have been non-destructively delayed to respect provider limits._',
          },
        ],
      },
    ];

    return this.postMessage(connection.accessToken, channel, alertText, blocks);
  }
}

export const slackService = new SlackService();
