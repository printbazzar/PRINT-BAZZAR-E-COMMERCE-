/**
 * Cookie Configuration for Print Bazzar Authentication
 * Enforces HttpOnly, SameSite=Lax, and Secure flags (in production).
 */

const isProd = process.env.NODE_ENV === 'production';

// Cookie Lifetimes (in milliseconds)
export const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Cookie Names
export const COOKIE_NAMES = {
  STAFF_ACCESS: 'pb_admin_access',
  STAFF_REFRESH: 'pb_admin_refresh',
  CUSTOMER_ACCESS: 'pb_cust_access',
  CUSTOMER_REFRESH: 'pb_cust_refresh',
  CSRF_TOKEN: 'XSRF-TOKEN',
};

/**
 * Common secure cookie options
 */
export const getBaseCookieOptions = () => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
});

/**
 * Attach authentication cookies to the response
 */
export const setAuthCookies = (res, { accessToken, refreshToken, userType = 'STAFF' }) => {
  const isStaff = userType === 'STAFF';
  const accessCookieName = isStaff ? COOKIE_NAMES.STAFF_ACCESS : COOKIE_NAMES.CUSTOMER_ACCESS;
  const refreshCookieName = isStaff ? COOKIE_NAMES.STAFF_REFRESH : COOKIE_NAMES.CUSTOMER_REFRESH;

  const baseOptions = getBaseCookieOptions();

  // 1. Access Token Cookie (15 min)
  if (accessToken) {
    res.cookie(accessCookieName, accessToken, {
      ...baseOptions,
      maxAge: ACCESS_COOKIE_MAX_AGE,
    });
  }

  // 2. Refresh Token Cookie (7 days)
  if (refreshToken) {
    res.cookie(refreshCookieName, refreshToken, {
      ...baseOptions,
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });
  }
};

/**
 * Clear authentication cookies on logout
 */
export const clearAuthCookies = (res, userType = 'ALL') => {
  const baseOptions = getBaseCookieOptions();

  if (userType === 'STAFF' || userType === 'ALL') {
    res.clearCookie(COOKIE_NAMES.STAFF_ACCESS, baseOptions);
    res.clearCookie(COOKIE_NAMES.STAFF_REFRESH, baseOptions);
  }

  if (userType === 'CUSTOMER' || userType === 'ALL') {
    res.clearCookie(COOKIE_NAMES.CUSTOMER_ACCESS, baseOptions);
    res.clearCookie(COOKIE_NAMES.CUSTOMER_REFRESH, baseOptions);
  }
};

export default {
  COOKIE_NAMES,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
  getBaseCookieOptions,
  setAuthCookies,
  clearAuthCookies,
};
