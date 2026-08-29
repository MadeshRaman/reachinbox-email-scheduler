import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { scheduleBullJob } from '../queues/email.queue';
import { elasticsearchService } from '../services/elasticsearch.service';
import { config } from '../config';
import { logger } from '../utils/logger';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to get or create the active user (supports demo user out-of-the-box)
export const getOrCreateDefaultUser = async (req: Request) => {
  const userEmail = (req as any).user?.email || 'user@reachinbox.ai';
  const userName = (req as any).user?.name || 'ReachInbox Demo User';

  let user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: userEmail,
        name: userName,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
    });
  }

  return user;
};

/**
 * POST /api/emails/schedule
 * Schedules batch email jobs with staggered delays and unique idempotency keys
 */
export const scheduleEmails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      senderEmail,
      senderName,
      recipients,
      subject,
      body,
      startTime,
      delayBetweenEmails = 0,
      hourlyLimit,
    } = req.body;

    // 1. Validation
    if (!senderEmail || !EMAIL_REGEX.test(senderEmail)) {
      res.status(400).json({ success: false, message: 'Valid senderEmail is required.' });
      return;
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Email subject is required.' });
      return;
    }

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Email body is required.' });
      return;
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ success: false, message: 'Recipients must be a non-empty array of email strings.' });
      return;
    }

    // Filter valid emails and remove duplicates
    const cleanedRecipients = Array.from(
      new Set(
        recipients
          .map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
          .filter((r) => EMAIL_REGEX.test(r))
      )
    );

    if (cleanedRecipients.length === 0) {
      res.status(400).json({ success: false, message: 'No valid recipient email addresses provided.' });
      return;
    }

    const user = await getOrCreateDefaultUser(req);

    // 2. Find or create EmailSender for this user
    let sender = await prisma.emailSender.findFirst({
      where: {
        userId: user.id,
        email: senderEmail.trim().toLowerCase(),
      },
    });

    if (!sender) {
      sender = await prisma.emailSender.create({
        data: {
          userId: user.id,
          email: senderEmail.trim().toLowerCase(),
          displayName: senderName?.trim() || null,
        },
      });
    }

    // 3. Compute base scheduled start time
    let baseTime = startTime ? new Date(startTime) : new Date();
    if (isNaN(baseTime.getTime()) || baseTime.getTime() < Date.now()) {
      baseTime = new Date(); // default to immediate dispatch sequence
    }

    const delayMs = Math.max(0, Number(delayBetweenEmails) * 1000);
    const createdJobs = [];

    // 4. Create EmailJob records and enqueue BullMQ delayed jobs
    for (let i = 0; i < cleanedRecipients.length; i++) {
      const recipientEmail = cleanedRecipients[i];
      const scheduledAt = new Date(baseTime.getTime() + i * delayMs);

      // Deterministic idempotency key to prevent double scheduling
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(`${user.id}:${sender.id}:${recipientEmail}:${subject}:${scheduledAt.getTime()}`)
        .digest('hex');

      // Check if job with this idempotency key already exists
      let emailJob = await prisma.emailJob.findUnique({
        where: { idempotencyKey },
      });

      if (!emailJob) {
        emailJob = await prisma.emailJob.create({
          data: {
            userId: user.id,
            senderId: sender.id,
            recipientEmail,
            subject: subject.trim(),
            body: body.trim(),
            scheduledAt,
            status: 'SCHEDULED',
            idempotencyKey,
          },
        });

        // Enqueue BullMQ delayed job
        const bullJobId = await scheduleBullJob(emailJob.id, scheduledAt);

        // Update with BullMQ job ID
        emailJob = await prisma.emailJob.update({
          where: { id: emailJob.id },
          data: { bullJobId },
        });

        // Index in Elasticsearch (non-blocking)
        elasticsearchService.indexJob({
          id: emailJob.id,
          userId: user.id,
          senderId: sender.id,
          senderEmail: sender.email,
          recipientEmail: emailJob.recipientEmail,
          subject: emailJob.subject,
          body: emailJob.body,
          status: emailJob.status,
          scheduledAt: emailJob.scheduledAt,
        }).catch(() => {});
      }

      createdJobs.push(emailJob);
    }

    logger.info(`[EmailController] Successfully scheduled ${createdJobs.length} email jobs for user ${user.email}`);

    res.status(201).json({
      success: true,
      message: `Successfully scheduled ${createdJobs.length} email(s).`,
      count: createdJobs.length,
      firstScheduledAt: createdJobs[0]?.scheduledAt,
      lastScheduledAt: createdJobs[createdJobs.length - 1]?.scheduledAt,
      jobs: createdJobs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/emails/scheduled
 * Fetches scheduled, processing, and rate-limited email jobs
 */
export const getScheduledEmails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getOrCreateDefaultUser(req);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.emailJob.findMany({
        where: {
          userId: user.id,
          status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] },
        },
        include: {
          sender: true,
        },
        orderBy: {
          scheduledAt: 'asc',
        },
        skip,
        take: limit,
      }),
      prisma.emailJob.count({
        where: {
          userId: user.id,
          status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] },
        },
      }),
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      jobs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/emails/sent
 * Fetches sent and failed email jobs with timestamps
 */
export const getSentEmails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getOrCreateDefaultUser(req);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.emailJob.findMany({
        where: {
          userId: user.id,
          status: { in: ['SENT', 'FAILED'] },
        },
        include: {
          sender: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.emailJob.count({
        where: {
          userId: user.id,
          status: { in: ['SENT', 'FAILED'] },
        },
      }),
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      jobs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/emails/search?q=
 * Full-text search across recipient email, subject, body, and status
 * Prioritizes Elasticsearch with seamless database fallback
 */
export const searchEmails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getOrCreateDefaultUser(req);
    const q = (req.query.q as string || '').trim();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const status = req.query.status as string | undefined;

    // 1. Try Elasticsearch
    const esResult = await elasticsearchService.searchJobs(q, {
      userId: user.id,
      status,
      page,
      limit,
    });

    if (esResult) {
      res.json({
        success: true,
        source: 'elasticsearch',
        page,
        limit,
        total: esResult.total,
        totalPages: Math.ceil(esResult.total / limit),
        jobs: esResult.hits,
      });
      return;
    }

    // 2. Graceful Fallback to MySQL Database
    const skip = (page - 1) * limit;
    const whereClause: any = {
      userId: user.id,
    };

    if (status) {
      whereClause.status = status;
    }

    if (q) {
      whereClause.OR = [
        { recipientEmail: { contains: q } },
        { subject: { contains: q } },
        { body: { contains: q } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.emailJob.findMany({
        where: whereClause,
        include: { sender: true },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.emailJob.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      source: 'database',
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      jobs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/emails/stats
 * Dashboard aggregated metric counters
 */
export const getEmailStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getOrCreateDefaultUser(req);

    const [total, scheduled, processing, sent, rateLimited, failed] = await Promise.all([
      prisma.emailJob.count({ where: { userId: user.id } }),
      prisma.emailJob.count({ where: { userId: user.id, status: 'SCHEDULED' } }),
      prisma.emailJob.count({ where: { userId: user.id, status: 'PROCESSING' } }),
      prisma.emailJob.count({ where: { userId: user.id, status: 'SENT' } }),
      prisma.emailJob.count({ where: { userId: user.id, status: 'RATE_LIMITED' } }),
      prisma.emailJob.count({ where: { userId: user.id, status: 'FAILED' } }),
    ]);

    res.json({
      success: true,
      stats: {
        total,
        scheduled,
        processing,
        sent,
        rateLimited,
        failed,
      },
    });
  } catch (error) {
    next(error);
  }
};
