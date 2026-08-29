import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
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
    this.initTransporter();
  }

  private async initTransporter(): Promise<Transporter> {
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
      if (config.smtp.user && config.smtp.pass) {
        this.transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
          },
        });
        logger.info(`[EmailService] SMTP Transporter configured using provided credentials (${config.smtp.host}:${config.smtp.port})`);
      } else {
        logger.info('[EmailService] No SMTP credentials provided. Creating ephemeral Ethereal test account...');
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        logger.info(`[EmailService] Ethereal test account created: User=${testAccount.user}`);
      }
    } catch (error) {
      logger.error('[EmailService] Failed to initialize email transporter:', error);
      // Fallback in-memory transport or re-throw
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
      });
    } finally {
      this.isInitializing = false;
    }

    return this.transporter!;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const transporter = await this.initTransporter();

    const senderEmail = options.from || config.smtp.fromEmail;
    const senderName = options.fromName || config.smtp.fromName;
    const fromHeader = `"${senderName}" <${senderEmail}>`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
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

    logger.info(`[EmailService] Email dispatched to ${options.to} [MessageID: ${info.messageId}]`);
    if (previewUrl) {
      logger.info(`[EmailService] 📬 Ethereal Preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || false,
    };
  }
}

export const emailService = new EmailService();
