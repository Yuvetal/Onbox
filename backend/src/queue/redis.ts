import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Shared Redis connection instance for BullMQ and atomic rate limiting.
 * `maxRetriesPerRequest: null` is required by BullMQ.
 */
export const redisConnection = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  console.log('🔴 Connected to Redis');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err);
});

/**
 * Helper to compute current hour key string in YYYYMMDDHH format.
 */
export function getHourKeyString(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}`;
}

/**
 * Computes the Unix timestamp (ms) for the start of the next UTC hour window.
 */
export function getNextHourTimestamp(date = new Date()): number {
  const nextHour = new Date(date);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return nextHour.getTime();
}

/**
 * Redis-backed atomic rate limiter keyed by sender + current hour window.
 * Uses INCR + EXPIRE to ensure safety across multiple worker processes.
 */
export async function checkAndIncrementSenderHourlyRateLimit(
  senderId: string,
  limit: number
): Promise<{ allowed: boolean; currentCount: number; nextHourTimestamp: number }> {
  const effectiveLimit = limit > 0 ? limit : env.maxEmailsPerHour;
  const hourKeyStr = getHourKeyString();
  const redisKey = `ratelimit:${senderId}:${hourKeyStr}`;

  // Execute INCR atomically
  const currentCount = await redisConnection.incr(redisKey);

  // Set TTL of 1 hour (3600 seconds) on key creation
  if (currentCount === 1) {
    await redisConnection.expire(redisKey, 3600);
  }

  const nextHourTimestamp = getNextHourTimestamp();

  if (currentCount > effectiveLimit) {
    return {
      allowed: false,
      currentCount,
      nextHourTimestamp,
    };
  }

  return {
    allowed: true,
    currentCount,
    nextHourTimestamp,
  };
}
