import { Queue, JobsOptions } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { logger } from '../utils/logger';

export const EMAIL_QUEUE_NAME = 'reachinbox-email-queue';

// Shared Redis connection for BullMQ
const redisConnection = createRedisConnection();

export interface EmailJobData {
  emailJobId: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const scheduleBullJob = async (
  emailJobId: string,
  scheduledAt: Date
): Promise<string> => {
  const now = Date.now();
  const scheduledTime = scheduledAt.getTime();
  const delay = Math.max(0, scheduledTime - now);

  const options: JobsOptions = {
    jobId: emailJobId, // Deterministic Job ID to guarantee idempotency across crashes
    delay,
  };

  const job = await emailQueue.add(
    'send-scheduled-email',
    { emailJobId },
    options
  );

  logger.info(`[BullMQ] Enqueued Job ${job.id} for EmailJob ${emailJobId} with delay ${delay}ms`);
  return job.id || emailJobId;
};

export const rescheduleBullJob = async (
  emailJobId: string,
  delayMs: number
): Promise<void> => {
  const uniqueJobId = `${emailJobId}:rescheduled:${Date.now()}`;

  await emailQueue.add(
    'send-scheduled-email',
    { emailJobId },
    {
      jobId: uniqueJobId,
      delay: Math.max(1000, delayMs),
    }
  );

  logger.info(`[BullMQ] Rescheduled Job ${emailJobId} with delay ${delayMs}ms (New JobId: ${uniqueJobId})`);
};
