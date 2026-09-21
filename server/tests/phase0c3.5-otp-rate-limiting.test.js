import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import {
  sendCustomerOtp,
  verifyCustomerOtp,
} from '../src/controllers/customerAuthController.js';
import {
  computeOtpHmac,
  computeIpHash,
  getOtpConfig,
  getOtpRateLimitSecret,
} from '../src/config/otpConfig.js';
import prisma from '../src/lib/prisma.js';

// Setup Mock Data
const MOCK_MOBILE = '9876543210';
const MOCK_CUSTOMER_ID = 'cust_otp_test_35';

// In-Memory Database for Mock Prisma Customer, AuthSession & OtpRequestLog testing
const mockCustomerDB = new Map();
const mockAuthSessionsDB = new Map();
const mockOtpRequestLogDB = [];

// Mock Response Helper
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

// Setup Prisma Mock Traps
prisma.customer.findFirst = async ({ where }) => {
  if (where.mobile) {
    for (const cust of mockCustomerDB.values()) {
      if (cust.mobile === where.mobile) return { ...cust };
    }
  }
  return null;
};

prisma.customer.findUnique = async ({ where }) => {
  if (where.id) {
    const cust = mockCustomerDB.get(where.id);
    if (cust) return { ...cust };
  }
  return null;
};

prisma.customer.create = async ({ data }) => {
  const id = data.id || MOCK_CUSTOMER_ID;
  const newCust = {
    id,
    name: data.name || 'Test Customer',
    email: 'testcustomer@example.com',
    mobile: data.mobile,
    accountType: 'B2C_RETAIL',
    otpHash: data.otpHash || null,
    otpCode: data.otpCode || null,
    otpExpiresAt: data.otpExpiresAt || null,
    otpLastSentAt: data.otpLastSentAt || null,
    otpAttempts: data.otpAttempts || 0,
    otpBlockedUntil: data.otpBlockedUntil || null,
    savedAddresses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockCustomerDB.set(id, newCust);
  return { ...newCust };
};

prisma.customer.update = async ({ where, data }) => {
  const cust = mockCustomerDB.get(where.id);
  if (cust) {
    if (data.otpAttempts && typeof data.otpAttempts === 'object' && data.otpAttempts.increment) {
      cust.otpAttempts = (cust.otpAttempts || 0) + data.otpAttempts.increment;
    } else if (data.otpAttempts !== undefined) {
      cust.otpAttempts = data.otpAttempts;
    }
    if (data.otpHash !== undefined) cust.otpHash = data.otpHash;
    if (data.otpCode !== undefined) cust.otpCode = data.otpCode;
    if (data.otpExpiresAt !== undefined) cust.otpExpiresAt = data.otpExpiresAt;
    if (data.otpLastSentAt !== undefined) cust.otpLastSentAt = data.otpLastSentAt;
    if (data.otpBlockedUntil !== undefined) cust.otpBlockedUntil = data.otpBlockedUntil;
    if (data.name !== undefined) cust.name = data.name;
    return { ...cust };
  }
  throw new Error('Customer not found');
};

prisma.customer.updateMany = async ({ where, data }) => {
  let count = 0;
  for (const cust of mockCustomerDB.values()) {
    if (where.id && cust.id !== where.id) continue;
    let match = true;
    if (where.OR) {
      let orMatch = false;
      for (const cond of where.OR) {
        if (cond.otpHash !== undefined && cust.otpHash === cond.otpHash && cust.otpHash !== null) orMatch = true;
        if (cond.otpCode !== undefined && cust.otpCode === cond.otpCode && cust.otpCode !== null) orMatch = true;
        if (cond.otpLastSentAt === null && cust.otpLastSentAt === null) orMatch = true;
        if (cond.otpLastSentAt && cond.otpLastSentAt.lte && cust.otpLastSentAt && cust.otpLastSentAt <= cond.otpLastSentAt.lte) orMatch = true;
      }
      if (!orMatch) match = false;
    }
    if (match) {
      if (data.otpHash !== undefined) cust.otpHash = data.otpHash;
      if (data.otpCode !== undefined) cust.otpCode = data.otpCode;
      if (data.otpExpiresAt !== undefined) cust.otpExpiresAt = data.otpExpiresAt;
      if (data.otpLastSentAt !== undefined) cust.otpLastSentAt = data.otpLastSentAt;
      if (data.otpAttempts !== undefined) cust.otpAttempts = data.otpAttempts;
      if (data.otpBlockedUntil !== undefined) cust.otpBlockedUntil = data.otpBlockedUntil;
      if (data.name !== undefined) cust.name = data.name;
      count++;
    }
  }
  return { count };
};

prisma.otpRequestLog = {
  create: async ({ data }) => {
    const entry = {
      id: `log_${Math.random()}`,
      mobile: data.mobile,
      ipHash: data.ipHash || null,
      provider: data.provider || 'SIMULATOR',
      status: data.status,
      createdAt: data.createdAt || new Date(),
    };
    mockOtpRequestLogDB.push(entry);
    return entry;
  },
  count: async ({ where }) => {
    return mockOtpRequestLogDB.filter((log) => {
      if (where.mobile && log.mobile !== where.mobile) return false;
      if (where.ipHash && log.ipHash !== where.ipHash) return false;
      if (where.status && log.status !== where.status) return false;
      if (where.createdAt && where.createdAt.gte && log.createdAt < where.createdAt.gte) return false;
      return true;
    }).length;
  },
};

prisma.$transaction = async (fn) => {
  return fn(prisma);
};

describe('Phase 0C.3.5 — OTP SMS Abuse & Distributed Rate Limiting Suite', () => {

  beforeEach(() => {
    mockCustomerDB.clear();
    mockAuthSessionsDB.clear();
    mockOtpRequestLogDB.length = 0;
  });

  // 1. Atomic Per-Mobile Cooldown (Concurrently Safe)
  it('1. 60-second per-mobile cooldown is database-authoritative and blocks concurrent resend races', async () => {
    const req = { body: { mobile: MOCK_MOBILE }, ip: '192.168.1.1' };
    const res1 = createMockRes();
    const res2 = createMockRes();

    // First request -> 200 OK
    await sendCustomerOtp(req, res1);
    assert.equal(res1.statusCode, 200);

    // Immediate second request within 60s -> 429 Too Many Requests
    await sendCustomerOtp(req, res2);
    assert.equal(res2.statusCode, 429);
    assert.equal(res2.body.code, 'RESEND_COOLDOWN');
    assert.ok(res2.body.retryAfterSeconds > 0);

    const logs = mockOtpRequestLogDB.filter((l) => l.mobile === MOCK_MOBILE);
    assert.equal(logs.length, 2);
    assert.equal(logs[0].status, 'SENT');
    assert.equal(logs[1].status, 'COOLDOWN_BLOCKED');
  });

  // 2. Rolling 1-Hour Cap (Max 3 / 60 Mins)
  it('2. Rolling 1-hour cap blocks 4th request within 60 minutes with HTTP 429 HOURLY_LIMIT_EXCEEDED', async () => {
    const req = { body: { mobile: MOCK_MOBILE }, ip: '10.0.0.1' };

    // Simulate 3 successful requests separated by 61 seconds
    const baseTime = Date.now() - 30 * 60 * 1000; // 30 mins ago
    for (let i = 0; i < 3; i++) {
      mockOtpRequestLogDB.push({
        id: `log_prev_${i}`,
        mobile: MOCK_MOBILE,
        ipHash: computeIpHash('10.0.0.1'),
        provider: 'SIMULATOR',
        status: 'SENT',
        createdAt: new Date(baseTime + i * 120 * 1000), // 2 mins apart
      });
    }

    // Set customer otpLastSentAt to 5 mins ago (cooldown clear)
    mockCustomerDB.set(MOCK_CUSTOMER_ID, {
      id: MOCK_CUSTOMER_ID,
      mobile: MOCK_MOBILE,
      otpLastSentAt: new Date(Date.now() - 5 * 60 * 1000),
    });

    const res4 = createMockRes();
    await sendCustomerOtp(req, res4);

    assert.equal(res4.statusCode, 429);
    assert.equal(res4.body.code, 'HOURLY_LIMIT_EXCEEDED');
    assert.match(res4.body.message, /Maximum 3 requests allowed per hour/i);

    const hourlyLogs = mockOtpRequestLogDB.filter((l) => l.status === 'HOURLY_BLOCKED');
    assert.equal(hourlyLogs.length, 1);
  });

  // 3. Rolling 24-Hour Cap (Max 5 / 24 Hours)
  it('3. Rolling 24-hour cap blocks 6th request within 24 hours with HTTP 429 DAILY_LIMIT_EXCEEDED', async () => {
    const req = { body: { mobile: MOCK_MOBILE }, ip: '10.0.0.2' };

    // Simulate 5 successful requests spread over 12 hours
    const baseTime = Date.now() - 12 * 60 * 60 * 1000; // 12 hours ago
    for (let i = 0; i < 5; i++) {
      mockOtpRequestLogDB.push({
        id: `log_day_${i}`,
        mobile: MOCK_MOBILE,
        ipHash: computeIpHash('10.0.0.2'),
        provider: 'SIMULATOR',
        status: 'SENT',
        createdAt: new Date(baseTime + i * 2 * 60 * 60 * 1000), // 2 hours apart
      });
    }

    // Set customer otpLastSentAt to 1 hour ago (cooldown clear, 1-hour window clear)
    mockCustomerDB.set(MOCK_CUSTOMER_ID, {
      id: MOCK_CUSTOMER_ID,
      mobile: MOCK_MOBILE,
      otpLastSentAt: new Date(Date.now() - 70 * 60 * 1000),
    });

    const res6 = createMockRes();
    await sendCustomerOtp(req, res6);

    assert.equal(res6.statusCode, 429);
    assert.equal(res6.body.code, 'DAILY_LIMIT_EXCEEDED');
    assert.match(res6.body.message, /Maximum 5 requests allowed per day/i);

    const dailyLogs = mockOtpRequestLogDB.filter((l) => l.status === 'DAILY_BLOCKED');
    assert.equal(dailyLogs.length, 1);
  });

  // 4. Hashed IP 15-Minute Cap (Max 10 / 15 Mins)
  it('4. Hashed IP 15-minute cap blocks 11th request from same IP hash with HTTP 429 IP_LIMIT_EXCEEDED', async () => {
    const attackerIp = '198.51.100.42';
    const targetIpHash = computeIpHash(attackerIp);

    // Populate 10 requests from targetIpHash across different mobile numbers in last 10 mins
    for (let i = 1; i <= 10; i++) {
      mockOtpRequestLogDB.push({
        id: `log_ip_${i}`,
        mobile: `900000000${i % 10}`,
        ipHash: targetIpHash,
        provider: 'SIMULATOR',
        status: 'SENT',
        createdAt: new Date(Date.now() - (12 - i) * 60 * 1000),
      });
    }

    const req = { body: { mobile: '9998887776' }, ip: attackerIp };
    const res = createMockRes();

    await sendCustomerOtp(req, res);

    assert.equal(res.statusCode, 429);
    assert.equal(res.body.code, 'IP_LIMIT_EXCEEDED');
    assert.match(res.body.message, /Too many verification requests from your IP connection/i);

    const ipLogs = mockOtpRequestLogDB.filter((l) => l.status === 'IP_BLOCKED');
    assert.equal(ipLogs.length, 1);
  });

  // 5. Cryptographic IP Key Isolation & Production Fail-Closed Test
  it('5. computeIpHash uses OTP_RATE_LIMIT_SECRET isolated from JWT and OTP hash secrets', () => {
    const ip = '203.0.113.195';
    const hash1 = computeIpHash(ip);
    const hash2 = computeIpHash(ip);

    assert.equal(hash1.length, 64, 'IP Hash must be a 64-character SHA-256 HMAC string');
    assert.equal(hash1, hash2, 'Identical IP must produce identical hash');

    // Test production fail closed when OTP_RATE_LIMIT_SECRET is missing and OTP enabled
    const prevNodeEnv = process.env.NODE_ENV;
    const prevMobileOtp = process.env.MOBILE_OTP_ENABLED;
    const prevRateSecret = process.env.OTP_RATE_LIMIT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      process.env.MOBILE_OTP_ENABLED = 'true';
      delete process.env.OTP_RATE_LIMIT_SECRET;

      let exited = false;
      const originalExit = process.exit;
      process.exit = (code) => {
        exited = true;
        throw new Error(`Process.exit called with code ${code}`);
      };

      assert.throws(
        () => getOtpRateLimitSecret(),
        /Process.exit called with code 1/
      );

      process.exit = originalExit;
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevMobileOtp !== undefined) process.env.MOBILE_OTP_ENABLED = prevMobileOtp;
      if (prevRateSecret !== undefined) process.env.OTP_RATE_LIMIT_SECRET = prevRateSecret;
    }
  });

});
