import rateLimit from 'express-rate-limit';

/*
 * PRODUCTION-READY RATE LIMITERS
 *
 * For single-instance deployments: Uses in-memory store (current configuration)
 * For multi-instance deployments: Uncomment Redis configuration below
 *
 * To enable Redis-based distributed rate limiting:
 * 1. npm install rate-limit-redis ioredis
 * 2. Uncomment the Redis configuration below
 * 3. Set REDIS_HOST, REDIS_PORT, REDIS_PASSWORD in .env
 * 4. Replace store: undefined with store: redisStore in each limiter
 */

// Uncomment for Redis-based rate limiting in production
/*
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

const redisStore = new RedisStore({
  client: redis,
  prefix: 'rl:',
});
*/

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // store: redisStore, // Uncomment for Redis
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Strict rate limiter for incident creation
export const createIncidentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 incident creations per hour
  message: {
    success: false,
    message: 'Too many incident reports from this IP. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  // store: redisStore, // Uncomment for Redis
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'You have reached the maximum number of reports per hour. Please try again later.',
      retryAfter: '1 hour',
      limit: 10
    });
  }
});

// File upload rate limiter (more strict)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // store: redisStore, // Uncomment for Redis
  skipFailedRequests: true, // Don't count failed uploads
});

// Authentication rate limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth
  // store: redisStore, // Uncomment for Redis
});

// Export Redis client for cleanup (if using Redis)
// export { redis };
