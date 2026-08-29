import Redis, { RedisOptions } from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

/**
 * Returns base ioredis connection options compatible with BullMQ and hosted Redis instances (Railway/Upstash/etc.)
 */
export const getRedisOptions = (): RedisOptions => {
  const commonOptions: RedisOptions = {
    maxRetriesPerRequest: null, // Required by BullMQ for workers and queues
    enableReadyCheck: false,
    retryStrategy(times: number) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // Reconnect when Redis instance is in READONLY state
        return true;
      }
      return false;
    },
  };

  return commonOptions;
};

/**
 * Factory function to create and configure a new ioredis connection instance.
 * Priority:
 *  1. REDIS_URL / REDISPRIVATE_URL / REDIS_TLS_URL (Railway / cloud production)
 *  2. REDIS_HOST + REDIS_PORT + REDIS_PASSWORD (local development)
 */
export const createRedisConnection = (connectionName = 'default'): Redis => {
  const commonOptions = getRedisOptions();
  let redis: Redis;

  if (config.redis.url) {
    logger.info(`[Redis:${connectionName}] Initializing connection using REDIS_URL`);
    const isTls = config.redis.url.startsWith('rediss://');
    redis = new Redis(config.redis.url, {
      ...commonOptions,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    });
  } else {
    logger.info(
      `[Redis:${connectionName}] Initializing connection using host=${config.redis.host}, port=${config.redis.port}`
    );
    redis = new Redis({
      ...commonOptions,
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
    });
  }

  redis.on('connect', () => {
    logger.info(`[Redis:${connectionName}] Connected successfully`);
  });

  redis.on('ready', () => {
    logger.info(`[Redis:${connectionName}] Connection ready to receive commands`);
  });

  redis.on('error', (err: Error) => {
    logger.error(`[Redis:${connectionName}] Connection error:`, err.message || err);
  });

  redis.on('close', () => {
    logger.warn(`[Redis:${connectionName}] Connection closed`);
  });

  redis.on('reconnecting', () => {
    logger.info(`[Redis:${connectionName}] Reconnecting...`);
  });

  return redis;
};

/**
 * Shared singleton Redis client for general key-value operations and distributed rate limiting.
 */
let sharedRedisClient: Redis | null = null;

export const getSharedRedisClient = (): Redis => {
  if (!sharedRedisClient) {
    sharedRedisClient = createRedisConnection('shared');
  }
  return sharedRedisClient;
};

/**
 * Health check helper to verify Redis connectivity.
 */
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const client = getSharedRedisClient();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (error: any) {
    logger.error('[Redis:health] Ping failed:', error?.message || error);
    return false;
  }
};

