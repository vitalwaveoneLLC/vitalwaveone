// api/middleware/rate-limiter.js
// Redis-based rate limiting middleware for OTP and auth endpoints
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Rate limiter: max N attempts within time window
 * @param {string} key - Unique identifier (e.g., phone number, IP address)
 * @param {number} maxAttempts - Max attempts allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
export async function checkRateLimit(key, maxAttempts = 5, windowSeconds = 900) {
  const redisKey = `ratelimit:${key}`;

  try {
    const current = await redis.incr(redisKey);

    // Set expiration on first increment
    if (current === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    const ttl = await redis.ttl(redisKey);
    const remaining = Math.max(0, maxAttempts - current);
    const resetAt = Math.floor(Date.now() / 1000) + ttl;

    return {
      allowed: current <= maxAttempts,
      attempts: current,
      remaining,
      resetAt,
      retryAfter: ttl,
    };
  } catch (error) {
    console.error('[rate-limiter]', error.message);
    // Fail open: allow request if Redis is down
    return { allowed: true, remaining: maxAttempts, resetAt: 0 };
  }
}

/**
 * Reset rate limit for a key (after successful auth)
 */
export async function resetRateLimit(key) {
  try {
    await redis.del(`ratelimit:${key}`);
  } catch (error) {
    console.error('[resetRateLimit]', error.message);
  }
}

/**
 * Middleware wrapper for Express
 */
export function rateLimitMiddleware(keyFn, maxAttempts = 5, windowSeconds = 900) {
  return async (req, res, next) => {
    const key = keyFn(req);
    const limit = await checkRateLimit(key, maxAttempts, windowSeconds);

    // Set headers
    res.setHeader('X-RateLimit-Limit', maxAttempts);
    res.setHeader('X-RateLimit-Remaining', limit.remaining);
    res.setHeader('X-RateLimit-Reset', limit.resetAt);

    if (!limit.allowed) {
      return res.status(429).json({
        error: 'Too many attempts. Please try again later.',
        retryAfter: limit.retryAfter,
        resetAt: limit.resetAt,
      });
    }

    // Attach limit info to request
    req.rateLimit = limit;
    next();
  };
}

export default checkRateLimit;
