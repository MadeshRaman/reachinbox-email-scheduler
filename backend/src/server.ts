import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import apiRoutes from './routes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { connectDatabase, prisma } from './config/prisma';
import { initEmailWorker, closeEmailWorker } from './workers/email.worker';
import { elasticsearchService } from './services/elasticsearch.service';
import { logger } from './utils/logger';

const app = express();

// Global Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins in dev or matching CORS_ORIGIN
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Base route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'ReachInbox Email Scheduler API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      scheduleEmails: 'POST /api/emails/schedule',
      scheduledEmails: 'GET /api/emails/scheduled',
      sentEmails: 'GET /api/emails/sent',
      searchEmails: 'GET /api/emails/search?q=',
      slackStatus: 'GET /api/slack/status',
    },
  });
});

// API Routes (Mounted under /api)
app.use('/api', apiRoutes);

// BullMQ Dashboard (Mounted under /admin/queues)
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './queues/email.queue';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

// Error Handling Middleware
app.use(errorHandler);

// Initialize Services and Workers
const startServer = async () => {
  // 1. Connect to MySQL Database via Prisma
  await connectDatabase();

  // 2. Initialize Elasticsearch Index & Check Cluster Health
  elasticsearchService.checkHealthAndInit().catch(() => {});

  // 3. Initialize BullMQ Background Worker
  try {
    initEmailWorker();
  } catch (err) {
    logger.error('[Worker] Failed to start BullMQ worker:', err);
  }

  // 4. Start HTTP Server
  const server = app.listen(config.port, () => {
    logger.info(`🚀 ReachInbox Email Scheduler Backend is running on port ${config.port} (env: ${config.nodeEnv})`);
    logger.info(`🔍 Health check available at /api/health`);
    logger.info(`ACTIVE_GOOGLE_REDIRECT_URI=${config.google.redirectUri}`);
    logger.info(`🔐 Google OAuth Callback configured: ${config.google.redirectUri}`);
    logger.info(`🌐 Google OAuth Frontend redirect: ${config.google.frontendRedirectUri}`);
  });

  // Graceful Shutdown
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    try {
      await closeEmailWorker();
      await prisma.$disconnect();
    } catch (err) {
      logger.error('Error during shutdown:', err);
    }
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error('Critical failure starting server:', err);
});

export default app;
