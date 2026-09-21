import crypto from 'crypto';
import prisma from '../lib/prisma.js';

const OTP_LOG_RETENTION_DAYS = 7;
const BATCH_SIZE = 500;

/**
 * Timing-safe string comparison to prevent timing attacks on CRON_SECRET verification
 */
const safeCompareSecret = (a, b) => {
  if (!a || !b) return false;
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Controller: Execute 7-Day OTP Request Log Retention Cleanup
 * Route: POST /api/v1/internal/cron/clean-otp-logs
 * Header: X-Cron-Secret: <CRON_SECRET>
 */
export const cleanOtpLogs = async (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const cronSecret = process.env.CRON_SECRET;

    // Fail closed if CRON_SECRET is missing in production or unauthorized
    if (!cronSecret || !cronSecret.trim()) {
      if (isProd) {
        console.error('[CRON CLEANUP FAILED] Mandatory CRON_SECRET missing in production environment.');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
    }

    const providedSecret =
      req.headers['x-cron-secret'] ||
      (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '');

    if (!providedSecret || !cronSecret || !safeCompareSecret(providedSecret, cronSecret)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Cutoff: 7 days ago
    const cutoffDate = new Date(Date.now() - OTP_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    console.log(`[CRON CLEANUP START] Purging OtpRequestLog records older than ${cutoffDate.toISOString()}...`);

    let totalDeleted = 0;

    // Execute chunked batch deletion to prevent lock escalation
    while (true) {
      const expiredBatch = await prisma.otpRequestLog.findMany({
        where: { createdAt: { lt: cutoffDate } },
        select: { id: true },
        take: BATCH_SIZE,
      });

      if (expiredBatch.length === 0) break;

      const deleteRes = await prisma.otpRequestLog.deleteMany({
        where: {
          id: { in: expiredBatch.map((item) => item.id) },
        },
      });

      totalDeleted += deleteRes.count;
      if (deleteRes.count < BATCH_SIZE) break;
    }

    console.log(`[CRON CLEANUP END] Successfully purged ${totalDeleted} expired OtpRequestLog records.`);
    return res.json({ success: true, deletedCount: totalDeleted });
  } catch (error) {
    console.error('[CRON CLEANUP ERROR] Error during OtpRequestLog retention cleanup:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during log cleanup.' });
  }
};

export default {
  cleanOtpLogs,
};
