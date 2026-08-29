import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

export const createRedisConnection = () => {
  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  redis.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
  });

  return redis;
};
