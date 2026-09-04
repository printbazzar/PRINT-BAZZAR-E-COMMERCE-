import crypto from 'crypto';

/**
 * Enterprise Production Error Handler
 * Sanitizes all error outputs to prevent data leakage (Prisma queries, stack traces, paths, secrets)
 */
export const errorHandler = (err, req, res, next) => {
  const requestId = `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const isProduction = process.env.NODE_ENV === 'production';

  // Server-side audit log with masked headers (never log authorization tokens or passwords)
  const safeHeaders = { ...req.headers };
  if (safeHeaders.authorization) safeHeaders.authorization = 'Bearer [REDACTED]';
  if (safeHeaders.cookie) safeHeaders.cookie = '[REDACTED]';

  console.error(`[${requestId}] Error on ${req.method} ${req.originalUrl}:`, {
    name: err.name,
    message: err.message,
    status: err.status || err.statusCode,
    stack: isProduction ? undefined : err.stack,
  });

  // 1. Specific CORS Errors
  if (err.isCorsError) {
    return res.status(403).json({
      success: false,
      errorCode: 'CORS_FORBIDDEN',
      message: 'Access denied by CORS security policy.',
      requestId,
    });
  }

  // 2. Body Parser JSON Syntax Errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_JSON',
      message: 'Malformed JSON payload provided in request.',
      requestId,
    });
  }

  // 3. Multer File Upload Errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      errorCode: 'UPLOAD_ERROR',
      message: err.message || 'File upload error occurred.',
      requestId,
    });
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      errorCode: 'INVALID_TOKEN',
      message: 'Authentication token is invalid or expired. Please login again.',
      requestId,
    });
  }

  // 5. Prisma Database Errors
  if (err.name?.startsWith('PrismaClient') || err.code?.startsWith('P')) {
    return res.status(500).json({
      success: false,
      errorCode: 'DATABASE_ERROR',
      message: 'A database operation could not be completed. Please try again.',
      requestId,
    });
  }

  // 6. Generic Fallback
  const statusCode = err.status || err.statusCode || 500;
  const clientMessage = (statusCode < 500 || !isProduction)
    ? (err.message || 'An error occurred processing your request.')
    : 'An unexpected internal error occurred. Please contact support with your Request ID.';

  return res.status(statusCode).json({
    success: false,
    errorCode: err.errorCode || 'INTERNAL_SERVER_ERROR',
    message: clientMessage,
    requestId,
  });
};

export default errorHandler;
