import nodemailer, { Transporter } from 'nodemailer';
import { config, isProductionEnv } from '../config';
import { logger } from '../utils/logger';

export interface SendEmailOptions {
  to: string;
  from?: string;
  fromName?: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  previewUrl?: string | false;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isInitializing: boolean = false;

  constructor() {
    this.initTransporter().catch((err) => {
      logger.error('[EmailService] Error during initial transporter setup:', err?.message || err);
    });
  }

  private async initTransporter(): Promise<Transporter | null> {
    if (this.transporter) {
      return this.transporter;
    }

    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (this.transporter) return this.transporter;
    }

    this.isInitializing = true;

    try {
      const hasCredentials = Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

      if (hasCredentials) {
        this.transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
        });

        logger.info(
          `[EmailService] ✅ SMTP Transporter configured: host=${config.smtp.host}, port=${config.smtp.port}, secure=${config.smtp.secure}, user=${config.smtp.user}`
        );
      } else if (isProductionEnv()) {
        // Production: DO NOT fallback to ephemeral Ethereal accounts
        logger.error(
          '[EmailService] ❌ CRITICAL: SMTP credentials are not configured in production! Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and optionally SMTP_SECURE, SMTP_FROM in Railway environment variables.'
        );
        this.transporter = null;
      } else {
        // Local development ONLY: Optional Ethereal test account fallback
        logger.info('[EmailService] [Dev] No SMTP credentials provided. Creating ephemeral Ethereal test account...');
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
        });
        logger.info(`[EmailService] [Dev] Ethereal test account created: User=${testAccount.user}`);
      }
    } catch (error: any) {
      logger.error('[EmailService] Failed to initialize email transporter:', error?.message || error);
      this.transporter = null;
    } finally {
      this.isInitializing = false;
    }

    return this.transporter;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const transporter = await this.initTransporter();

    if (!transporter) {
      const errorMsg = isProductionEnv()
        ? 'SMTP credentials are not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in Railway environment variables.'
        : 'Email transporter is not available. Please configure SMTP credentials in .env.';
      logger.error(`[EmailService] ❌ Cannot send email to ${options.to}: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const senderEmail = options.from || config.smtp.fromEmail || config.smtp.user;
    if (!senderEmail) {
      throw new Error('Sender email address is missing. Please provide a "from" address or configure SMTP_FROM / SMTP_USER.');
    }

    const senderName = options.fromName || config.smtp.fromName || 'ReachInbox Scheduler';
    const fromHeader = senderName ? `"${senderName}" <${senderEmail}>` : senderEmail;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
          <span style="font-weight: 700; font-size: 16px; color: #0369a1;">ReachInbox Mail Dispatch</span>
        </div>
        <div style="font-size: 15px; white-space: pre-wrap;">${options.body}</div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
          Sent by ReachInbox Email Scheduler • Sent to: ${options.to}
        </div>
      </div>
    `;

    const mailOptions = {
      from: fromHeader,
      to: options.to,
      subject: options.subject,
      text: options.body,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    logger.info(`[EmailService] ✅ Email dispatched to ${options.to} [MessageID: ${info.messageId}]`);
    if (previewUrl) {
      logger.info(`[EmailService] 📬 Preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || false,
    };
  }
}

export const emailService = new EmailService();

