import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try loading root .env, then server/.env if DATABASE_URL is missing
dotenv.config();
if (!process.env.DATABASE_URL) {
  const serverEnvPath = path.resolve(process.cwd(), 'server/.env');
  if (fs.existsSync(serverEnvPath)) {
    dotenv.config({ path: serverEnvPath });
  }
}

/**
 * Enterprise Environment Variable Validator
 * Validates required, optional, and security-critical environment variables at application boot.
 * Strictly conceals secret values — only variable names are logged during errors or warnings.
 */

// Environment variable categories
export const ENV_SPECS = {
  REQUIRED: ['DATABASE_URL'],
  PRODUCTION_REQUIRED: ['JWT_SECRET'],
  OPTIONAL: [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'PORT',
    'NODE_ENV',
    'ALLOWED_ORIGINS',
    'CORS_ORIGIN',
    'CLIENT_URL',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_CLIENT_ID',
    'MOBILE_OTP_ENABLED',
    'MOBILE_OTP_REQUIRED',
    'OTP_PROVIDER',
    'SMS_GATEWAY_URL',
    'DIRECT_URL',
    'REFRESH_TOKEN_ROTATION_GRACE_SECONDS',
    'OTP_HASH_SECRET',
    'OTP_RATE_LIMIT_SECRET',
    'PASSWORD_LOGIN_MAX_ATTEMPTS',
    'PASSWORD_LOGIN_LOCKOUT_SECONDS',
    'CRON_SECRET',
  ],
};

export const PASSWORD_LOGIN_MAX_ATTEMPTS = Math.max(1, parseInt(process.env.PASSWORD_LOGIN_MAX_ATTEMPTS || '5', 10));
export const PASSWORD_LOGIN_LOCKOUT_SECONDS = Math.max(60, parseInt(process.env.PASSWORD_LOGIN_LOCKOUT_SECONDS || '900', 10));


/**
 * Validates environment variables according to environment specification rules
 * @param {Object} customEnv Optional custom environment object for testing
 * @returns {Object} { isValid: boolean, missingRequired: string[], warnings: string[] }
 */
export const validateEnv = (customEnv = process.env, options = {}) => {
  const env = customEnv || {};
  const nodeEnv = env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  const isTestMode = options.isTest !== undefined ? options.isTest : (process.env.NODE_ENV === 'test');

  const missingRequired = [];
  const warnings = [];

  // Provide fallback test DATABASE_URL in test mode if none supplied via process.env
  if (isTestMode && customEnv === process.env && (!env.DATABASE_URL || !env.DATABASE_URL.trim())) {
    env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test_db';
  }

  // 1. Validate Core Required Variables
  for (const varName of ENV_SPECS.REQUIRED) {
    const val = env[varName];
    if (!val || (typeof val === 'string' && !val.trim())) {
      missingRequired.push(varName);
    }
  }

  // 2. Validate Production-Required Security Variables
  if (isProd) {
    const hasAccessSecret = Boolean((env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET.trim()) || (env.JWT_SECRET && env.JWT_SECRET.trim()));
    const hasRefreshSecret = Boolean((env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.trim()) || (env.JWT_SECRET && env.JWT_SECRET.trim()));

    if (!hasAccessSecret || !hasRefreshSecret) {
      missingRequired.push('JWT_SECRET or (JWT_ACCESS_SECRET and JWT_REFRESH_SECRET)');
    }

    if (env.MOBILE_OTP_ENABLED === 'true') {
      if (!env.OTP_HASH_SECRET) missingRequired.push('OTP_HASH_SECRET');
      if (!env.OTP_RATE_LIMIT_SECRET) missingRequired.push('OTP_RATE_LIMIT_SECRET');
    }

    if (!env.CRON_SECRET || !env.CRON_SECRET.trim()) {
      missingRequired.push('CRON_SECRET');
    }

  } else if (!isTestMode) {
    // In dev, warn if JWT secrets are not explicitly set
    if (!env.JWT_ACCESS_SECRET && !env.JWT_REFRESH_SECRET && !env.JWT_SECRET) {
      warnings.push('JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / JWT_SECRET not explicitly set in environment. Dev temporary fallback key will be used.');
    }
  }

  // 3. Optional Diagnostics & Warnings
  if (isProd) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      warnings.push('Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing in production.');
    }
    if (!env.ALLOWED_ORIGINS && !env.CORS_ORIGIN) {
      warnings.push('ALLOWED_ORIGINS is not set. Defaulting to trusted production domain whitelist.');
    }
  }

  const isValid = missingRequired.length === 0;

  // 4. Handle Output & Errors (Never print secret values)
  if (!isValid) {
    const errorMessage = `❌ [ENV VALIDATION ERROR] Missing required environment variable(s): ${missingRequired.join(', ')}. Please check your .env configuration.`;

    if (!isTestMode) {
      console.error(`===========================================`);
      console.error(`❌ FATAL: ENVIRONMENT STARTUP VALIDATION FAILED`);
      console.error(`Missing Variable(s): ${missingRequired.join(', ')}`);
      console.error(`Environment: ${nodeEnv}`);
      console.error(`===========================================`);
      console.error(errorMessage);
    }

    if (isTestMode || options.throwOnError) {
      throw new Error(errorMessage);
    } else if (isProd) {
      process.exit(1);
    }
  }

  if (warnings.length > 0 && !isTestMode) {
    console.warn(`⚠️ [ENV VALIDATION WARNINGS]`);
    for (const warn of warnings) {
      console.warn(`   - ${warn}`);
    }
  }

  return {
    isValid,
    nodeEnv,
    missingRequired,
    warnings,
  };
};

export default validateEnv;
