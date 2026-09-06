import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

// CSRF Cookie Options (Readable by Frontend JavaScript)
export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';

export const getCsrfCookieOptions = () => ({
  httpOnly: false, // Must be readable by client JS to attach in request headers
  secure: isProd,
  sameSite: 'lax',
  path: '/',
});

/**
 * Generate a cryptographically secure CSRF token
 */
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Endpoint Handler: Issue a CSRF token
 * GET /api/csrf-token
 */
export const getCsrfTokenEndpoint = (req, res) => {
  const csrfToken = req.cookies?.[CSRF_COOKIE_NAME] || generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());
  return res.json({
    success: true,
    csrfToken,
  });
};

/**
 * Paths strictly exempt from CSRF checks:
 * 1. Cryptographically verified payment webhooks (HMAC-SHA256 signature verified)
 * 2. Unauthenticated public logins & registration
 * 3. Health check
 */
const EXEMPT_PATHS = [
  '/api/payments/verify',
  '/api/v1/payments/verify',
  '/payments/verify',
  '/api/payments/webhook',
  '/api/v1/payments/webhook',
  '/payments/webhook',
  '/api/health',
  '/health',
  '/api/admin/auth/login',
  '/api/v1/admin/auth/login',
  '/admin/auth/login',
  '/api/customer/auth/login',
  '/api/v1/customer/auth/login',
  '/customer/auth/login',
  '/api/customer/auth/signup',
  '/api/v1/customer/auth/signup',
  '/customer/auth/signup',
];

/**
 * CSRF Protection Middleware
 * Protects cookie-authenticated state-changing operations (POST, PUT, PATCH, DELETE)
 */
export const csrfProtection = (req, res, next) => {
  // Always attach/ensure XSRF-TOKEN cookie on safe requests if missing
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      const token = generateCsrfToken();
      res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
    }
    return next();
  }

  // 1. Check path exemption
  const normalizedPath = req.originalUrl?.split('?')[0] || req.path;
  const isExemptPath = EXEMPT_PATHS.some((path) => normalizedPath.endsWith(path) || normalizedPath === path);
  if (isExemptPath) {
    return next();
  }

  // 2. Compatibility Exemption: Authorization Bearer header
  // Requests carrying an explicit Bearer token in the header are not vulnerable to browser cross-site ambient credentials
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // 3. Check if request is using authentication cookies
  const hasAuthCookies = !!(
    req.cookies?.pb_admin_access ||
    req.cookies?.pb_cust_access ||
    req.cookies?.pb_admin_refresh ||
    req.cookies?.pb_cust_refresh
  );

  // If the request is not authenticated via cookies (e.g. guest order or public mutation), pass through
  if (!hasAuthCookies) {
    return next();
  }

  // 4. Double-Submit CSRF Verification for Cookie-Authenticated Requests
  const clientToken =
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    req.body?._csrf;

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!clientToken || !cookieToken) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'Forbidden: Missing CSRF protection token. Please refresh the page and retry.',
    });
  }

  // Constant-time comparison to prevent timing attacks
  const clientBuf = Buffer.from(clientToken);
  const cookieBuf = Buffer.from(cookieToken);

  if (clientBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(clientBuf, cookieBuf)) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'Forbidden: Invalid CSRF token.',
    });
  }

  next();
};

export default {
  CSRF_COOKIE_NAME,
  getCsrfCookieOptions,
  generateCsrfToken,
  getCsrfTokenEndpoint,
  csrfProtection,
};
