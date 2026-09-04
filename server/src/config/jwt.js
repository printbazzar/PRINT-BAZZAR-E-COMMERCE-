import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const rawSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';

if (!rawSecret) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production!');
    process.exit(1);
  } else {
    console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing. Please set it in server/.env.');
  }
}

export const JWT_SECRET = rawSecret || 'dev_temporary_jwt_fallback_secret_key_needs_env_setting_98565';

export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Sign short-lived access token (15 minutes)
 */
export const signAccessToken = (payload, options = {}) => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
    ...options,
  });
};

/**
 * Sign long-lived refresh token (7 days)
 */
export const signRefreshToken = (payload, options = {}) => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: REFRESH_TOKEN_EXPIRY,
    ...options,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
};

/**
 * Legacy / Backward compatibility signToken
 */
export const signToken = (payload, options = {}) => {
  const opts = typeof options === 'string' ? { expiresIn: options } : options;
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: opts.expiresIn || '15m',
    ...opts,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
};

export default {
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  signToken,
  verifyToken,
};
