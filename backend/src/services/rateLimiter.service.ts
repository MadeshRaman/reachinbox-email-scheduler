import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  retryAfterMs: number;
  nextWindowDate: Date;
}

export class RateLimiterService {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  /**
   * Generates a Redis key for the current 1-hour window for a given sender.
   * Key pattern: ratelimit:sender:{senderId}:{hourTimestamp}
   */
  private getHourlyWindowKey(senderId: string, timestamp: number = Date.now()): string {
    const hourWindow = Math.floor(timestamp / (3600 * 1000));
    return `ratelimit:sender:${senderId}:${hourWindow}`;
  }

  /**
   * Distributed atomic check and increment per sender per hourly window.
   * Safe when multiple workers execute concurrently.
   */
  async checkAndIncrement(
    senderId: string,
    hourlyLimit: number = config.rateLimit.maxEmailsPerHourPerSender
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const currentHourIndex = Math.floor(now / (3600 * 1000));
    const nextHourTimestamp = (currentHourIndex + 1) * 3600 * 1000;
    const retryAfterMs = Math.max(1000, nextHourTimestamp - now + Math.floor(Math.random() * 5000)); // slight jitter
    const nextWindowDate = new Date(nextHourTimestamp);

    const key = this.getHourlyWindowKey(senderId, now);

    try {
      // Atomic Lua script: increment and set TTL if new key
      const luaScript = `
        local count = redis.call('INCR', KEYS[1])
        if count == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return count
      `;

      const result = await this.redis.eval(luaScript, 1, key, 7200) as number; // 2 hour TTL buffer

      if (result > hourlyLimit) {
        logger.warn(
          `[RateLimit] Sender ${senderId} exceeded hourly limit (${result}/${hourlyLimit}). Rescheduling for ${nextWindowDate.toISOString()}`
        );
        return {
          allowed: false,
          currentCount: result,
          limit: hourlyLimit,
          retryAfterMs,
          nextWindowDate,
        };
      }

      return {
        allowed: true,
        currentCount: result,
        limit: hourlyLimit,
        retryAfterMs: 0,
        nextWindowDate,
      };
    } catch (error) {
      logger.error(`[RateLimit] Redis error while checking rate limit for sender ${senderId}:`, error);
      // Fallback: allow to prevent total stall, but log error
      return {
        allowed: true,
        currentCount: 1,
        limit: hourlyLimit,
        retryAfterMs: 0,
        nextWindowDate,
      };
    }
  }

  /**
   * Helper to sleep for provider delay throttling (EMAIL_DELAY_MS)
   */
  async applyThrottleDelay(ms: number = config.rateLimit.emailDelayMs): Promise<void> {
    if (ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }
}
