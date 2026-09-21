import { describe, it, beforeEach, afterEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import prisma from '../src/lib/prisma.js';
import { cleanOtpLogs } from '../src/controllers/cronController.js';
import { sendCustomerOtp } from '../src/controllers/customerAuthController.js';
import { validateEnv } from '../src/config/envValidator.js';

// Helper to create mock response object
const createMockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    cookie(name, val, options) {
      this.cookies[name] = { val, options };
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
  };
  return res;
};

const targetDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const isIsolatedTestDbAvailable = !!(
  targetDbUrl &&
  !targetDbUrl.includes('supabase.co') &&
  !targetDbUrl.includes('prod')
);

describe('Phase 0C.3.7 — OTP Request Log Retention & Automated Cleanup Suite', () => {
  const TEST_CRON_SECRET = 'super_secret_cron_test_key_12345';
  const TEST_MOBILE = '9876543210';
  let origCronSecret;

  before(async () => {
    if (!isIsolatedTestDbAvailable) {
      throw new Error('FATAL: Real PostgreSQL isolated test database is required.');
    }
    origCronSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = TEST_CRON_SECRET;
  });

  afterEach(async () => {
    if (isIsolatedTestDbAvailable) {
      await prisma.otpRequestLog.deleteMany({
        where: { mobile: { in: [TEST_MOBILE, '9998887776', '9990001112'] } },
      });
      await prisma.customer.deleteMany({
        where: { mobile: { in: [TEST_MOBILE, '9998887776', '9990001112'] } },
      });
    }
  });

  after(async () => {
    if (origCronSecret !== undefined) {
      process.env.CRON_SECRET = origCronSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  it('a. 8-day-old logs are deleted by cleanup', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const oldLog = await prisma.otpRequestLog.create({
      data: {
        mobile: TEST_MOBILE,
        status: 'SENT',
        provider: 'TEST_PROVIDER',
        createdAt: eightDaysAgo,
      },
    });

    const req = {
      headers: { 'x-cron-secret': TEST_CRON_SECRET },
    };
    const res = createMockRes();

    await cleanOtpLogs(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.deletedCount >= 1);

    const checkLog = await prisma.otpRequestLog.findUnique({
      where: { id: oldLog.id },
    });
    assert.equal(checkLog, null);
  });

  it('b. 5-day-old logs remain intact after cleanup', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const recentLog = await prisma.otpRequestLog.create({
      data: {
        mobile: TEST_MOBILE,
        status: 'SENT',
        provider: 'TEST_PROVIDER',
        createdAt: fiveDaysAgo,
      },
    });

    const req = {
      headers: { 'x-cron-secret': TEST_CRON_SECRET },
    };
    const res = createMockRes();

    await cleanOtpLogs(req, res);

    assert.equal(res.statusCode, 200);

    const checkLog = await prisma.otpRequestLog.findUnique({
      where: { id: recentLog.id },
    });
    assert.ok(checkLog !== null);
    assert.equal(checkLog.id, recentLog.id);
  });

  it('c. 24-hour-and-newer logs remain intact after cleanup', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);

    const log1 = await prisma.otpRequestLog.create({
      data: { mobile: TEST_MOBILE, status: 'SENT', createdAt: twoHoursAgo },
    });
    const log2 = await prisma.otpRequestLog.create({
      data: { mobile: TEST_MOBILE, status: 'SENT', createdAt: twentyThreeHoursAgo },
    });

    const req = { headers: { 'x-cron-secret': TEST_CRON_SECRET } };
    const res = createMockRes();

    await cleanOtpLogs(req, res);

    assert.equal(res.statusCode, 200);

    const checkLog1 = await prisma.otpRequestLog.findUnique({ where: { id: log1.id } });
    const checkLog2 = await prisma.otpRequestLog.findUnique({ where: { id: log2.id } });

    assert.ok(checkLog1 !== null);
    assert.ok(checkLog2 !== null);
  });

  it('d. 1,500 expired records are deleted successfully using chunked batching', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    // Create 1,500 expired logs in bulk
    const bulkData = Array.from({ length: 1500 }, (_, i) => ({
      mobile: '9998887776',
      status: 'SENT',
      provider: 'BULK_TEST',
      createdAt: tenDaysAgo,
    }));

    await prisma.otpRequestLog.createMany({ data: bulkData });

    const req = { headers: { 'x-cron-secret': TEST_CRON_SECRET } };
    const res = createMockRes();

    await cleanOtpLogs(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.deletedCount >= 1500);

    const remainingCount = await prisma.otpRequestLog.count({
      where: { mobile: '9998887776' },
    });
    assert.equal(remainingCount, 0);
  });

  it('e. Running cleanup twice is safe and idempotent', async () => {
    const nineDaysAgo = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);
    await prisma.otpRequestLog.create({
      data: { mobile: TEST_MOBILE, status: 'SENT', createdAt: nineDaysAgo },
    });

    const req1 = { headers: { 'x-cron-secret': TEST_CRON_SECRET } };
    const res1 = createMockRes();
    await cleanOtpLogs(req1, res1);

    assert.equal(res1.statusCode, 200);
    assert.ok(res1.body.deletedCount >= 1);

    // Second run
    const req2 = { headers: { 'x-cron-secret': TEST_CRON_SECRET } };
    const res2 = createMockRes();
    await cleanOtpLogs(req2, res2);

    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body.success, true);
    assert.equal(res2.body.deletedCount, 0);
  });

  it('f. Rate-limit queries still work correctly after cleanup', async () => {
    const now = new Date();
    const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Seed 2 active logs within 24h + 1 expired log 10 days old
    await prisma.otpRequestLog.create({
      data: { mobile: '9990001112', status: 'SENT', createdAt: tenMinsAgo },
    });
    await prisma.otpRequestLog.create({
      data: { mobile: '9990001112', status: 'SENT', createdAt: tenMinsAgo },
    });
    await prisma.otpRequestLog.create({
      data: { mobile: '9990001112', status: 'SENT', createdAt: tenDaysAgo },
    });

    // Run cleanup
    const reqClean = { headers: { 'x-cron-secret': TEST_CRON_SECRET } };
    const resClean = createMockRes();
    await cleanOtpLogs(reqClean, resClean);

    // Rate-limit query for mobile 9990001112 in last 24h should accurately return 2
    const activeCount = await prisma.otpRequestLog.count({
      where: {
        mobile: '9990001112',
        status: 'SENT',
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });

    assert.equal(activeCount, 2);
  });

  it('g. Missing cron secret returns 401', async () => {
    const req = { headers: {} };
    const res = createMockRes();

    await cleanOtpLogs(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Unauthorized');
  });

  it('h. Wrong cron secret returns 401', async () => {
    const req = { headers: { 'x-cron-secret': 'invalid_wrong_secret_key' } };
    const res = createMockRes();

    await cleanOtpLogs(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Unauthorized');
  });

  it('i. Correct cron secret allows cleanup', async () => {
    const req = { headers: { 'x-cron-secret': TEST_CRON_SECRET } };
    const res = createMockRes();

    await cleanOtpLogs(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.deletedCount === 'number');
  });

  it('j. Production configuration fails closed if CRON_SECRET is missing', () => {
    const customEnv = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/prod_db',
      JWT_SECRET: 'super_secret_jwt_key_32_chars_long!',
      CRON_SECRET: '', // Missing in production
    };

    assert.throws(
      () => {
        validateEnv(customEnv, { isTest: true, throwOnError: true });
      },
      (err) => {
        assert.ok(err.message.includes('CRON_SECRET'));
        return true;
      }
    );
  });

  it('k. createdAt index exists after migration', async () => {
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'OtpRequestLog' AND indexname = 'OtpRequestLog_createdAt_idx';
    `;

    assert.ok(Array.isArray(indexes));
    assert.equal(indexes.length, 1);
    assert.equal(indexes[0].indexname, 'OtpRequestLog_createdAt_idx');
  });
});
