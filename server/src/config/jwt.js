import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const rawAccessSecret = process.env.JWT_ACCESS_SECRET ? process.env.JWT_ACCESS_SECRET.trim() : '';
const rawRefreshSecret = process.env.JWT_REFRESH_SECRET ? process.env.JWT_REFRESH_SECRET.trim() : '';
const rawLegacySecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';

const DEV_FALLBACK_SECRET = 'dev_temporary_jwt_fallback_secret_key_needs_env_setting_98565';

if (process.env.NODE_ENV === 'production') {
  const hasAccess = Boolean(rawAccessSecret || rawLegacySecret);
  const hasRefresh = Boolean(rawRefreshSecret || rawLegacySecret);
  if (!hasAccess || !hasRefresh) {
    console.error('❌ FATAL SECURITY ERROR: Mandatory JWT signing secrets are missing in production!');
    process.exit(1);
  }
} else if (!rawAccessSecret && !rawRefreshSecret && !rawLegacySecret) {
  console.warn('⚠️ WARNING: JWT secrets missing. Dev temporary fallback secret key will be used.');
}

export const JWT_SECRET = rawLegacySecret || rawAccessSecret || rawRefreshSecret || DEV_FALLBACK_SECRET;
export const JWT_ACCESS_SECRET = rawAccessSecret || rawLegacySecret || DEV_FALLBACK_SECRET;
export const JWT_REFRESH_SECRET = rawRefreshSecret || rawLegacySecret || DEV_FALLBACK_SECRET;

export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';

const rawGraceSeconds = parseInt(process.env.REFRESH_TOKEN_ROTATION_GRACE_SECONDS, 10);
export const REFRESH_TOKEN_ROTATION_GRACE_SECONDS = Math.min(
  Math.max(isNaN(rawGraceSeconds) || rawGraceSeconds <= 0 ? 30 : rawGraceSeconds, 1),
  120
);
export const REFRESH_GRACE_WINDOW_MS = REFRESH_TOKEN_ROTATION_GRACE_SECONDS * 1000;

export const JWT_ISSUER = 'print-bazzar-api';
export const JWT_ACCESS_AUDIENCE = 'print-bazzar-access';
export const JWT_REFRESH_AUDIENCE = 'print-bazzar-refresh';
export const JWT_ALGORITHM = 'HS256';

/**
 * Sign short-lived access token (15 minutes)
 */
export const signAccessToken = (payload, options = {}) => {
  const tokenPayload = typeof payload === 'object' && payload !== null
    ? {
        tokenType: 'ACCESS',
        iss: JWT_ISSUER,
        aud: JWT_ACCESS_AUDIENCE,
        ...payload,
      }
    : payload;

  return jwt.sign(tokenPayload, JWT_ACCESS_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: ACCESS_TOKEN_EXPIRY,
    ...options,
  });
};

/**
 * Sign long-lived refresh token (7 days)
 */
export const signRefreshToken = (payload, options = {}) => {
  const tokenPayload = typeof payload === 'object' && payload !== null
    ? {
        tokenType: 'REFRESH',
        iss: JWT_ISSUER,
        aud: JWT_REFRESH_AUDIENCE,
        ...payload,
      }
    : payload;

  return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: REFRESH_TOKEN_EXPIRY,
    ...options,
  });
};

/**
 * Verify Access Token with Dedicated Secret first, then Legacy Fallback
 */
export const verifyAccessToken = (token) => {
  let decoded;
  let isLegacyFallback = false;

  try {
    decoded = jwt.verify(token, JWT_ACCESS_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch (primaryErr) {
    const legacySecret = rawLegacySecret;
    if (legacySecret && legacySecret !== JWT_ACCESS_SECRET) {
      try {
        decoded = jwt.verify(token, legacySecret, { algorithms: [JWT_ALGORITHM] });
        isLegacyFallback = true;
      } catch {
        throw primaryErr;
      }
    } else {
      throw primaryErr;
    }
  }

  const hasIssuerOrAudience = Boolean(decoded.iss || decoded.aud);
  const isDedicatedSecretUsed = Boolean(rawAccessSecret && !isLegacyFallback);

  if (isDedicatedSecretUsed || hasIssuerOrAudience) {
    if (decoded.iss !== JWT_ISSUER) {
      const err = new Error('jwt issuer invalid');
      err.name = 'JsonWebTokenError';
      throw err;
    }
    if (decoded.aud !== JWT_ACCESS_AUDIENCE) {
      const err = new Error('jwt audience invalid');
      err.name = 'JsonWebTokenError';
      throw err;
    }
  }

  return decoded;
};

/**
 * Verify Refresh Token with Dedicated Secret first, then Legacy Fallback
 */
export const verifyRefreshToken = (token) => {
  let decoded;
  let isLegacyFallback = false;

  try {
    decoded = jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch (primaryErr) {
    const legacySecret = rawLegacySecret;
    if (legacySecret && legacySecret !== JWT_REFRESH_SECRET) {
      try {
        decoded = jwt.verify(token, legacySecret, { algorithms: [JWT_ALGORITHM] });
        isLegacyFallback = true;
      } catch {
        throw primaryErr;
      }
    } else {
      throw primaryErr;
    }
  }

  const hasIssuerOrAudience = Boolean(decoded.iss || decoded.aud);
  const isDedicatedSecretUsed = Boolean(rawRefreshSecret && !isLegacyFallback);

  if (isDedicatedSecretUsed || hasIssuerOrAudience) {
    if (decoded.iss !== JWT_ISSUER) {
      const err = new Error('jwt issuer invalid');
      err.name = 'JsonWebTokenError';
      throw err;
    }
    if (decoded.aud !== JWT_REFRESH_AUDIENCE) {
      const err = new Error('jwt audience invalid');
      err.name = 'JsonWebTokenError';
      throw err;
    }
  }

  return decoded;
};

/**
 * Legacy / Backward compatibility signToken
 */
export const signToken = (payload, options = {}) => {
  const opts = typeof options === 'string' ? { expiresIn: options } : options;
  const tokenPayload = typeof payload === 'object' && payload !== null
    ? {
        tokenType: 'ACCESS',
        iss: JWT_ISSUER,
        aud: JWT_ACCESS_AUDIENCE,
        ...payload,
      }
    : payload;

  return jwt.sign(tokenPayload, JWT_ACCESS_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: opts.expiresIn || '15m',
    ...opts,
  });
};

export const verifyToken = (token) => {
  return verifyAccessToken(token);
};

export default {
  JWT_SECRET,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  JWT_ISSUER,
  JWT_ACCESS_AUDIENCE,
  JWT_REFRESH_AUDIENCE,
  JWT_ALGORITHM,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  signToken,
  verifyToken,
};
