/**
 * Centralized Mobile OTP & SMS Gateway Configuration
 * 
 * Defines feature flags and provider settings for customer mobile authentication:
 * - MOBILE_OTP_ENABLED: Whether OTP generation/dispatch is activated
 * - MOBILE_OTP_REQUIRED: Whether customer must verify mobile via OTP prior to order payment
 * - OTP_PROVIDER: Telecom SMS gateway ('NONE', 'SIMULATOR', 'TWILIO', 'MSG91', 'FAST2SMS', 'GENERIC_GATEWAY')
 */

export const getOtpConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  const isDev = !isProd && !isTest;

  // 1. Provider Resolution
  const rawProvider = (process.env.OTP_PROVIDER || '').trim().toUpperCase();
  let provider = rawProvider;
  if (!provider) {
    if (process.env.SMS_GATEWAY_URL) {
      provider = 'GENERIC_GATEWAY';
    } else if (isDev || isTest) {
      provider = 'SIMULATOR';
    } else {
      provider = 'NONE';
    }
  }

  // 2. Enabled Resolution
  // In production, disabled by default unless explicitly set to 'true' AND a provider is configured
  let enabled = false;
  if (process.env.MOBILE_OTP_ENABLED !== undefined) {
    enabled = process.env.MOBILE_OTP_ENABLED === 'true' || process.env.MOBILE_OTP_ENABLED === '1';
  } else if (isDev || isTest) {
    enabled = true; // Enabled via simulator in development/testing
  } else {
    enabled = provider !== 'NONE';
  }

  // 3. Required Resolution
  // Determines if checkout is gated behind mandatory OTP verification
  // In development & testing: Defaults to false (ensures frictionless checkout & Razorpay test flow)
  // In production: Defaults to false unless explicitly set to 'true' via MOBILE_OTP_REQUIRED
  let required = false;
  if (process.env.MOBILE_OTP_REQUIRED !== undefined) {
    required = process.env.MOBILE_OTP_REQUIRED === 'true' || process.env.MOBILE_OTP_REQUIRED === '1';
  } else {
    required = false; // Default: guest checkout permitted with zero SMS cost
  }

  // Availability check
  const isAvailable = enabled && (provider === 'SIMULATOR' || provider === 'GENERIC_GATEWAY' || Boolean(process.env.SMS_GATEWAY_URL));

  return {
    nodeEnv,
    isProd,
    isDev,
    isTest,
    enabled,
    required,
    provider,
    isAvailable,
    allowGuestCheckout: true,
  };
};

export default getOtpConfig;
