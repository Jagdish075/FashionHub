/**
 * Rate Limiting Middleware
 * 
 * Prevents brute force attacks and API abuse by limiting
 * the number of requests from a single IP address.
 */

/**
 * Simple in-memory rate limiter store
 * Note: In production, use Redis for distributed rate limiting
 */
const rateLimitStore = new Map();

/**
 * Clean up expired entries periodically (every 5 minutes)
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.windowStart + data.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

/**
 * Create a rate limiting middleware
 * 
 * @param {object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.maxRequests - Maximum requests per window (default: 100)
 * @param {string} options.message - Error message when rate limited
 * @param {boolean} options.skipFailedRequests - Don't count failed requests
 * @returns {function} Express middleware function
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = 'Too many requests, please try again later.',
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip || req.connection.remoteAddress
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let rateLimitData = rateLimitStore.get(key);

    if (!rateLimitData || now > rateLimitData.windowStart + windowMs) {
      // Start a new window
      rateLimitData = {
        count: 1,
        windowStart: now,
        windowMs: windowMs,
        firstRequest: now
      };
      rateLimitStore.set(key, rateLimitData);
    } else {
      rateLimitData.count++;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimitData.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((rateLimitData.windowStart + windowMs) / 1000));

    // Check if over limit
    if (rateLimitData.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    next();
  };
};

/**
 * Strict rate limiter for authentication endpoints
 * Lower limits to prevent brute force attacks
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 15,
  message: 'Too many login attempts. Please try again after 15 minutes.'
});

/**
 * Payment rate limiter
 * Very strict limits for payment endpoints
 */
const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 payment attempts per hour
  message: 'Too many payment attempts. Please try again after an hour.'
});

/**
 * API general rate limiter
 * Standard limits for general API endpoints
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many requests. Please try again later.'
});

/**
 * Upload rate limiter
 * Strict limits for file uploads
 */
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 uploads per hour
  message: 'Too many file uploads. Please try again later.'
});

export {
  createRateLimiter,
  authRateLimiter,
  paymentRateLimiter,
  apiRateLimiter,
  uploadRateLimiter
};
