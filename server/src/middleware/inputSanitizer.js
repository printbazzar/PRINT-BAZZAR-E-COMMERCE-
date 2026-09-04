/**
 * Input Sanitization & Server-Side Validation Middleware
 * Protects against XSS, script injection, and malformed payloads
 * while preserving legitimate printing text, dimensions, and regional languages.
 */

// Regex patterns to strip malicious executable scripts and handler attributes
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const JS_PROTOCOL_REGEX = /javascript\s*:/gi;
const DANGEROUS_HANDLERS_REGEX = /\bon\w+\s*=\s*(['"]).*?\1|\bon\w+\s*=\s*[^>\s]+/gi;
const DANGEROUS_TAGS_REGEX = /<\/?(script|iframe|object|embed|applet|meta|link|style)\b[^>]*>/gi;

/**
 * Sanitize a single string safely
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .replace(SCRIPT_TAG_REGEX, '')
    .replace(JS_PROTOCOL_REGEX, '')
    .replace(DANGEROUS_HANDLERS_REGEX, '')
    .replace(DANGEROUS_TAGS_REGEX, '')
    .trim();
};

/**
 * Deeply and recursively sanitize objects, arrays, and strings
 */
export const deepSanitize = (data) => {
  if (!data) return data;

  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => deepSanitize(item));
  }

  if (typeof data === 'object') {
    // Do not alter binary Buffers
    if (Buffer.isBuffer(data)) return data;

    const sanitizedObj = {};
    for (const [key, value] of Object.entries(data)) {
      sanitizedObj[key] = deepSanitize(value);
    }
    return sanitizedObj;
  }

  return data;
};

/**
 * Global Express Middleware to automatically sanitize all incoming body payloads
 */
export const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = deepSanitize(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = deepSanitize(req.params);
  }
  next();
};

/**
 * Strict Order Creation Validator Middleware
 */
export const validateOrderCreation = (req, res, next) => {
  const { customerName, customerMobile, customerEmail, shippingAddress, items, deliveryMethod } = req.body;

  if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_CUSTOMER_NAME',
      message: 'Please provide a valid customer name (minimum 2 characters).',
    });
  }

  if (customerName.length > 100) {
    return res.status(400).json({
      success: false,
      errorCode: 'CUSTOMER_NAME_TOO_LONG',
      message: 'Customer name cannot exceed 100 characters.',
    });
  }

  const cleanMobile = String(customerMobile || '').replace(/\D/g, '');
  if (cleanMobile.length !== 10) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_MOBILE_NUMBER',
      message: 'Please provide a valid 10-digit Indian mobile number.',
    });
  }

  if (customerEmail && typeof customerEmail === 'string' && customerEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim()) || customerEmail.length > 100) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_EMAIL_FORMAT',
        message: 'Please provide a valid email address.',
      });
    }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      errorCode: 'EMPTY_ORDER_ITEMS',
      message: 'Order must contain at least one item.',
    });
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.productId || typeof item.productId !== 'string') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_ORDER_ITEM',
        message: `Item #${i + 1} is missing a valid Product ID.`,
      });
    }
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_QUANTITY',
        message: `Item #${i + 1} must have a positive quantity.`,
      });
    }
  }

  // Address validation if courier delivery
  if (deliveryMethod !== 'STORE_PICKUP') {
    const addr = typeof shippingAddress === 'string' ? JSON.parse(shippingAddress || '{}') : shippingAddress;
    if (addr && addr.pincode) {
      const cleanPin = String(addr.pincode).replace(/\D/g, '');
      if (cleanPin.length !== 6) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_PINCODE',
          message: 'Please enter a valid 6-digit postal pincode.',
        });
      }
    }
  }

  next();
};

export default {
  sanitizeString,
  deepSanitize,
  sanitizeRequestBody,
  validateOrderCreation,
};
