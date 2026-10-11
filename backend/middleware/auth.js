import crypto from 'crypto';

/**
 * Simple API key authentication for admin operations
 * In production, this should be replaced with proper OAuth2/JWT authentication
 */
export const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide an API key in the X-API-Key header.',
      hint: 'This endpoint requires authentication to prevent unauthorized modifications.'
    });
  }

  // Verify API key against environment variable with fallback
  const validApiKey = (process.env.ADMIN_API_KEY || 'aquawatch_admin').trim();
  const trimmedProvided = (apiKey || '').trim();

  // Use constant-time comparison to prevent timing attacks
  // Create fixed-length buffers for comparison
  const providedKeyBuffer = Buffer.from(trimmedProvided, 'utf-8');
  const validKeyBuffer = Buffer.from(validApiKey, 'utf-8');

  // Ensure both buffers are the same length
  if (providedKeyBuffer.length !== validKeyBuffer.length) {
    return res.status(403).json({
      success: false,
      message: 'Invalid API key. Access denied.'
    });
  }

  // Use timing-safe comparison
  try {
    if (!crypto.timingSafeEqual(providedKeyBuffer, validKeyBuffer)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid API key. Access denied.'
      });
    }
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid API key. Access denied.'
    });
  }

  // Authentication successful
  next();
};

/**
 * Optional auth middleware - allows access with or without authentication
 * Useful for endpoints that have different behavior for authenticated users
 */
export const optionalAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    const validApiKey = (process.env.ADMIN_API_KEY || 'aquawatch_admin').trim();
    const trimmedProvided = apiKey.trim();

    if (trimmedProvided.length === validApiKey.length) {
      try {
        const providedKeyBuffer = Buffer.from(trimmedProvided, 'utf-8');
        const validKeyBuffer = Buffer.from(validApiKey, 'utf-8');

        if (crypto.timingSafeEqual(providedKeyBuffer, validKeyBuffer)) {
          req.isAuthenticated = true;
        }
      } catch (err) {
        // Invalid key format, proceed without authentication
      }
    }
  }

  next();
};

/**
 * Rate limit authentication attempts to prevent brute force attacks
 */
export const authRateLimiter = {
  attempts: new Map(),
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes

  check(identifier) {
    const now = Date.now();
    const record = this.attempts.get(identifier) || { count: 0, resetAt: now + this.windowMs };

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + this.windowMs;
    } else {
      record.count++;
    }

    this.attempts.set(identifier, record);

    if (record.count > this.maxAttempts) {
      return false;
    }

    return true;
  },

  middleware(req, res, next) {
    const identifier = req.ip;

    if (!authRateLimiter.check(identifier)) {
      return res.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again later.'
      });
    }

    next();
  }
};
