import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData, rescheduleBullJob } from '../queues/email.queue';
import { createRedisConnection } from '../config/redis';
import { config } from '../config';
import { prisma } from '../config/prisma';
import { emailService } from '../services/email.service';
import { RateLimiterService } from '../services/rateLimiter.service';
import { elasticsearchService } from '../services/elasticsearch.service';
import { slackService } from '../services/slack.service';
import { logger } from '../utils/logger';

const redisConnection = createRedisConnection();
const rateLimiter = new RateLimiterService(redisConnection);

let emailWorker: Worker<EmailJobData> | null = null;

export const initEmailWorker = (): Worker<EmailJobData> => {
  if (emailWorker) {
    return emailWorker;
  }

  logger.info(
    `[BullMQ Worker] Initializing worker on queue '${EMAIL_QUEUE_NAME}' with concurrency ${config.worker.concurrency}`
  );

  emailWorker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailJobId } = job.data;
      logger.info(`[Worker] Processing BullMQ Job ${job.id} (EmailJob ID: ${emailJobId})`);

      // 1. Fetch EmailJob record from MySQL
      const emailJob = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
        include: {
          sender: true,
          user: true,
        },
      });

      if (!emailJob) {
        logger.warn(`[Worker] EmailJob ${emailJobId} not found in database. Skipping.`);
        return;
      }

      // 2. Strict Idempotency Check: if already sent, safely exit
      if (emailJob.status === 'SENT') {
        logger.info(`[Worker] EmailJob ${emailJobId} is already marked as SENT. Skipping.`);
        return;
      }

      // 3. Distributed Redis Rate Limiting (Hourly limit per sender)
      const rateLimitResult = await rateLimiter.checkAndIncrement(
        emailJob.senderId,
        config.rateLimit.maxEmailsPerHourPerSender
      );

      if (!rateLimitResult.allowed) {
        logger.warn(
          `[Worker] Rate limit reached for sender ${emailJob.sender.email} (${rateLimitResult.currentCount}/${rateLimitResult.limit}). Rescheduling job...`
        );

        // Update status to RATE_LIMITED in DB
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'RATE_LIMITED',
            error: `Hourly rate limit of ${rateLimitResult.limit} emails reached. Delayed to ${rateLimitResult.nextWindowDate.toLocaleTimeString()}`,
          },
        });

        // Trigger Slack notification if connected for user
        await slackService.sendRateLimitAlert(emailJob.userId, {
          senderEmail: emailJob.sender.email,
          hourlyLimit: rateLimitResult.limit,
          timeWindow: new Date().toLocaleString(),
          rescheduledTo: rateLimitResult.nextWindowDate.toLocaleTimeString(),
        });

        // Reschedule BullMQ delayed job for the next hour window
        await rescheduleBullJob(emailJobId, rateLimitResult.retryAfterMs);
        return;
      }

      // 4. Apply minimum delay between email sends (EMAIL_DELAY_MS)
      await rateLimiter.applyThrottleDelay(config.rateLimit.emailDelayMs);

      // 5. Safely mark as PROCESSING in DB
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
        },
      });

      try {
        // 6. Send email via Nodemailer
        const sendResult = await emailService.sendEmail({
          to: emailJob.recipientEmail,
          from: emailJob.sender.email,
          fromName: emailJob.sender.displayName || undefined,
          subject: emailJob.subject,
          body: emailJob.body,
        });

        // 7. Update DB on Success
        const updatedJob = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            error: null,
          },
        });

        // 8. Index document in Elasticsearch
        await elasticsearchService.indexJob({
          id: updatedJob.id,
          userId: updatedJob.userId,
          senderId: updatedJob.senderId,
          senderEmail: emailJob.sender.email,
          recipientEmail: updatedJob.recipientEmail,
          subject: updatedJob.subject,
          body: updatedJob.body,
          status: updatedJob.status,
          scheduledAt: updatedJob.scheduledAt,
          sentAt: updatedJob.sentAt,
          createdAt: updatedJob.createdAt,
        });

        logger.info(`[Worker] ✅ Successfully dispatched email to ${emailJob.recipientEmail}`);
      } catch (err: any) {
        logger.error(`[Worker] ❌ Error sending email to ${emailJob.recipientEmail}:`, err);

        const currentAttempts = (emailJob.attempts || 0) + 1;
        const isFinalAttempt = currentAttempts >= 3;

        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: isFinalAttempt ? 'FAILED' : 'SCHEDULED',
            error: err?.message || 'Email dispatch failed',
          },
        });

        // Re-throw so BullMQ can handle backoff retries if attempts remain
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: config.worker.concurrency,
    }
  );

  emailWorker.on('completed', (job) => {
    logger.info(`[Worker] Job ${job.id} completed successfully.`);
  });

  emailWorker.on('failed', (job, err) => {
    logger.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  emailWorker.on('error', (err) => {
    logger.error('[Worker] Worker internal error:', err);
  });

  return emailWorker;
};

export const closeEmailWorker = async (): Promise<void> => {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    logger.info('[BullMQ Worker] Worker stopped.');
  }
};
