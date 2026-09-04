import rateLimit from 'express-rate-limit';

/**
 * Standard JSON response handler for rate limit exceeded (HTTP 429)
 */
const createRateLimitHandler = (message = 'Too many requests. Please try again later.') => {
  return (req, res, next, options) => {
    const retryAfter = Math.ceil((options.windowMs / 1000) || 60);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message,
      retryAfterSeconds: retryAfter,
    });
  };
};

/**
 * Skip rate limiting for trusted authenticated staff members or internal webhooks
 */
const skipIfAuthenticatedStaff = (req) => {
  // If request contains an authorization header, check if it's admin staff
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Authenticated staff are not blocked during continuous production operations
    return false; // Will be verified in standard route middleware
  }
  return false;
};

// 1. Admin Login Rate Limiter: 5 attempts per 15 minutes
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many admin login attempts from this IP. Please try again in 15 minutes.',
  handler: createRateLimitHandler('Too many admin login attempts. Account temporarily locked for 15 minutes for security.'),
});

// 2. Customer Login Rate Limiter: 10 attempts per 15 minutes
export const customerLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many customer login attempts from this IP. Please try again in 15 minutes.',
  handler: createRateLimitHandler('Too many login attempts. Please wait 15 minutes before trying again.'),
});

// 3. Customer Signup Rate Limiter: 10 registrations per 15 minutes
export const customerSignupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many account registration requests from this IP. Please wait before creating more accounts.'),
});

// 4. Password Reset Rate Limiter: 5 attempts per 15 minutes
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many password reset attempts. Please check your inbox or wait 15 minutes.'),
});

// 5. Order & Checkout Creation Rate Limiter: 20 orders per 15 minutes
export const orderCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Order creation rate limit reached. Please wait a few moments before placing another order.'),
});

// 6. Public Storefront General API Limiter: 120 requests per 15 minutes
export const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip in test environment or local development loopback
    if (process.env.NODE_ENV === 'test') return true;
    if (process.env.NODE_ENV !== 'production' && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1')) {
      return true;
    }
    // Never throttle static uploads or health checks
    if (req.path.startsWith('/uploads') || req.path === '/api/health') {
      return true;
    }
    // Never throttle payment gateway webhooks or verification
    if (req.path.startsWith('/api/payments/verify') || req.path.startsWith('/payments/verify')) {
      return true;
    }
    return false;
  },
  handler: createRateLimitHandler('High traffic detected from your connection. Please wait a moment while we process your requests.'),
});

export default {
  adminLoginLimiter,
  customerLoginLimiter,
  customerSignupLimiter,
  passwordResetLimiter,
  orderCreationLimiter,
  publicApiLimiter,
};
