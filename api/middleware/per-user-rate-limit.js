// api/middleware/per-user-rate-limit.js - Rate limit per authenticated user

/**
 * Per-user rate limiting to prevent abuse by individual users
 * Limits requests per hour per user
 * @param {number} limit - Max requests per hour (default: 100)
 */
export function perUserRateLimit(limit = 100) {
  return async (req, res, next) => {
    // Only rate limit authenticated requests
    if (!req.session?.userId) {
      return next();
    }

    try {
      const userId = req.session.userId;
      const hour = Math.floor(Date.now() / 3600000);
      const key = `user_requests:${userId}:${hour}`;

      // Use Upstash Redis for distributed rate limiting
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!url || !token) {
        console.warn('[rate-limit] Upstash not configured, skipping per-user rate limit');
        return next();
      }

      // Increment counter
      const response = await fetch(`${url}/incr/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const count = data.result;

      // Set expiry on first request of the hour
      if (count === 1) {
        await fetch(`${url}/expire/${key}/3600`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      // Check if limit exceeded
      if (count > limit) {
        const resetTime = new Date((hour + 1) * 3600000);
        return res.status(429).json({
          error: `User rate limit exceeded. Max ${limit} requests/hour. Try again at ${resetTime.toISOString()}`,
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          limit,
          current: count,
        });
      }

      // Add rate limit info to headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));

      next();
    } catch (error) {
      console.error('[rate-limit] Per-user rate limit error:', error.message);
      // Fail open - don't block on rate limiting errors
      next();
    }
  };
}
