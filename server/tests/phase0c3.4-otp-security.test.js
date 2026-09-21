import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import {
  sendCustomerOtp,
  verifyCustomerOtp,
} from '../src/controllers/customerAuthController.js';
import {
  computeOtpHmac,
  getOtpConfig,
  getOtpHmacSecret,
} from '../src/config/otpConfig.js';
import {
  verifyAccessToken,
  verifyRefreshToken,
  JWT_ISSUER,
  JWT_ACCESS_AUDIENCE,
  JWT_REFRESH_AUDIENCE,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
} from '../src/config/jwt.js';

import prisma from '../src/lib/prisma.js';

// Setup Mock Data
const MOCK_MOBILE = '9876543210';
const MOCK_CUSTOMER_ID = 'cust_otp_test_001';

// In-Memory Database for Mock Prisma Customer & AuthSession testing
const mockCustomerDB = new Map();
const mockAuthSessionsDB = new Map();

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
      }
      if (!orMatch) match = false;
    }
    if (match) {
      if (data.otpHash !== undefined) cust.otpHash = data.otpHash;
      if (data.otpCode !== undefined) cust.otpCode = data.otpCode;
      if (data.otpExpiresAt !== undefined) cust.otpExpiresAt = data.otpExpiresAt;
      if (data.otpAttempts !== undefined) cust.otpAttempts = data.otpAttempts;
      if (data.otpBlockedUntil !== undefined) cust.otpBlockedUntil = data.otpBlockedUntil;
      if (data.name !== undefined) cust.name = data.name;
      count++;
    }
  }
  return { count };
};

prisma.authSession.create = async ({ data }) => {
  const id = data.id || `sess_${Math.random()}`;
  const session = { ...data, id };
  mockAuthSessionsDB.set(id, session);
  return session;
};

const mockOtpRequestLog34 = [];
prisma.otpRequestLog = {
  create: async ({ data }) => {
    const entry = { id: `log_${Math.random()}`, ...data, createdAt: data.createdAt || new Date() };
    mockOtpRequestLog34.push(entry);
    return entry;
  },
  count: async ({ where }) => {
    return mockOtpRequestLog34.filter((log) => {
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

describe('Phase 0C.3.4 — Customer Mobile OTP Security Remediation Suite', () => {

  beforeEach(() => {
    mockCustomerDB.clear();
    mockAuthSessionsDB.clear();
    mockOtpRequestLog34.length = 0;
  });


  // 1. HMAC Challenge Binding & Cryptographic Hashing
  it('1. computeOtpHmac generates secure 64-character SHA-256 HMAC bound to canonical mobile', () => {
    const hmac1 = computeOtpHmac('9876543210', '123456');
    const hmac2 = computeOtpHmac('9876543210', '123456');
    const hmacDifferentMobile = computeOtpHmac('9999999999', '123456');
    const hmacDifferentOtp = computeOtpHmac('9876543210', '654321');

    assert.equal(hmac1.length, 64, 'HMAC must be a 64-character hex string');
    assert.equal(hmac1, hmac2, 'Identical inputs must yield identical HMAC');
    assert.notEqual(hmac1, hmacDifferentMobile, 'HMAC must be bound to specific mobile number');
    assert.notEqual(hmac1, hmacDifferentOtp, 'HMAC must be bound to specific OTP code');
  });

  // 2. Plaintext OTP Avoidance in Storage
  it('2. sendCustomerOtp generates secure OTP and stores ONLY otpHash (otpCode remains null)', async () => {
    const req = { body: { mobile: MOCK_MOBILE } };
    const res = createMockRes();

    await sendCustomerOtp(req, res);

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.success);
    assert.ok(res.body.devOtp, 'Development / simulator returns devOtp code');

    const customer = Array.from(mockCustomerDB.values())[0];
    assert.ok(customer, 'Customer record created in DB');
    assert.equal(customer.otpCode, null, 'Plaintext otpCode MUST NEVER be stored in DB');
    assert.ok(customer.otpHash, 'otpHash MUST be populated in DB');
    assert.equal(customer.otpHash.length, 64);
    assert.ok(customer.otpLastSentAt, 'otpLastSentAt MUST be populated');
  });

  // 3. 60-Second Per-Mobile Resend Cooldown
  it('3. 60-second per-mobile resend cooldown blocks rapid OTP generation (HTTP 429)', async () => {
    const req = { body: { mobile: MOCK_MOBILE } };
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
  });

  // 4. Failed Attempt Counter & 15-Minute Account Lockout (5 Attempts Limit)
  it('4. Failed attempts increment counter and trigger 15-minute lockout at 5 failed attempts', async () => {
    const reqSend = { body: { mobile: MOCK_MOBILE } };
    const resSend = createMockRes();
    await sendCustomerOtp(reqSend, resSend);
    const validOtp = resSend.body.devOtp;

    // Send 4 wrong attempts
    for (let i = 1; i <= 4; i++) {
      const reqVerify = { body: { mobile: MOCK_MOBILE, otp: '999999' } };
      const resVerify = createMockRes();
      await verifyCustomerOtp(reqVerify, resVerify);

      assert.equal(resVerify.statusCode, 400);
      assert.match(resVerify.body.message, /Invalid verification OTP code/i);
    }

    const customerInDb = Array.from(mockCustomerDB.values())[0];
    assert.equal(customerInDb.otpAttempts, 4);

    // 5th wrong attempt triggers 15-minute lockout (HTTP 429)
    const reqVerify5 = { body: { mobile: MOCK_MOBILE, otp: '999999' } };
    const resVerify5 = createMockRes();
    await verifyCustomerOtp(reqVerify5, resVerify5);

    assert.equal(resVerify5.statusCode, 429);
    assert.equal(resVerify5.body.code, 'TOO_MANY_FAILED_ATTEMPTS');
    assert.match(resVerify5.body.message, /Account locked for 15 minutes/i);

    const lockedCustomer = Array.from(mockCustomerDB.values())[0];
    assert.ok(lockedCustomer.otpBlockedUntil);
    assert.equal(lockedCustomer.otpHash, null, 'OTP hash must be invalidated upon lockout');

    // Subsequent sendCustomerOtp during lockout is blocked (HTTP 429)
    const resSendBlocked = createMockRes();
    await sendCustomerOtp(reqSend, resSendBlocked);
    assert.equal(resSendBlocked.statusCode, 429);
    assert.equal(resSendBlocked.body.code, 'TOO_MANY_FAILED_ATTEMPTS');
  });

  // 5. Server-Side OTP Expiry Enforcement
  it('5. Server-side OTP expiry (>10 mins) denies verification (HTTP 400)', async () => {
    const reqSend = { body: { mobile: MOCK_MOBILE } };
    const resSend = createMockRes();
    await sendCustomerOtp(reqSend, resSend);
    const validOtp = resSend.body.devOtp;

    // Fast forward customer.otpExpiresAt to past
    const customer = Array.from(mockCustomerDB.values())[0];
    customer.otpExpiresAt = new Date(Date.now() - 1000); // 1 sec in past

    const reqVerify = { body: { mobile: MOCK_MOBILE, otp: validOtp } };
    const resVerify = createMockRes();
    await verifyCustomerOtp(reqVerify, resVerify);

    assert.equal(resVerify.statusCode, 400);
    assert.match(resVerify.body.message, /OTP has expired/i);
  });

  // 6. Atomic One-Time Consumption & Replay Prevention
  it('6. Verification with valid OTP succeeds and atomically consumes the code to prevent replay', async () => {
    const reqSend = { body: { mobile: MOCK_MOBILE } };
    const resSend = createMockRes();
    await sendCustomerOtp(reqSend, resSend);
    const validOtp = resSend.body.devOtp;

    const reqVerify1 = { body: { mobile: MOCK_MOBILE, otp: validOtp } };
    const resVerify1 = createMockRes();
    await verifyCustomerOtp(reqVerify1, resVerify1);

    assert.equal(resVerify1.statusCode, 200);
    assert.ok(resVerify1.body.token);
    assert.ok(resVerify1.body.customer);

    const customerInDb = Array.from(mockCustomerDB.values())[0];
    assert.equal(customerInDb.otpHash, null, 'otpHash must be nullified after consumption');
    assert.equal(customerInDb.otpAttempts, 0, 'otpAttempts reset to 0');

    // Replay attempt with same OTP must fail
    const reqVerify2 = { body: { mobile: MOCK_MOBILE, otp: validOtp } };
    const resVerify2 = createMockRes();
    await verifyCustomerOtp(reqVerify2, resVerify2);

    assert.equal(resVerify2.statusCode, 400);
    assert.match(resVerify2.body.message, /No OTP requested/i);
  });

  // 7. System Auth Security Boundary Integrations (Phase 0C.3.1, 0C.3.2, 0C.3.3)
  it('7. OTP authentication produces tokens complying with Phase 0C.3.1, 0C.3.2 & 0C.3.3 standards', async () => {
    const reqSend = { body: { mobile: MOCK_MOBILE } };
    const resSend = createMockRes();
    await sendCustomerOtp(reqSend, resSend);
    const validOtp = resSend.body.devOtp;

    const reqVerify = { body: { mobile: MOCK_MOBILE, otp: validOtp } };
    const resVerify = createMockRes();
    await verifyCustomerOtp(reqVerify, resVerify);

    assert.equal(resVerify.statusCode, 200);
    const accessToken = resVerify.body.token;
    const accessCookie = resVerify.cookies['pb_cust_access'];
    const refreshCookie = resVerify.cookies['pb_cust_refresh'];

    assert.ok(accessToken);
    assert.ok(accessCookie);
    assert.ok(refreshCookie);

    // Verify Access Token claims
    const decodedAccess = verifyAccessToken(accessToken);
    assert.equal(decodedAccess.tokenType, 'ACCESS');
    assert.equal(decodedAccess.iss, JWT_ISSUER);
    assert.equal(decodedAccess.aud, JWT_ACCESS_AUDIENCE);
    assert.equal(decodedAccess.isCustomer, true);

    // Verify Refresh Token claims
    const decodedRefresh = verifyRefreshToken(refreshCookie.val);
    assert.equal(decodedRefresh.tokenType, 'REFRESH');
    assert.equal(decodedRefresh.iss, JWT_ISSUER);
    assert.equal(decodedRefresh.aud, JWT_REFRESH_AUDIENCE);
    assert.equal(decodedRefresh.userType, 'CUSTOMER');
  });

  // 8. Blocker 2: Independent Keying Verification
  it('8. BLOCKER 2: OTP_HASH_SECRET produces HMAC independent of JWT access/refresh secrets', () => {
    const mobile = '9876543210';
    const otp = '123456';
    const challengeInput = `${mobile}:${otp}`;

    const otpHmac = computeOtpHmac(mobile, otp);
    const accessHmac = crypto.createHmac('sha256', JWT_ACCESS_SECRET).update(challengeInput).digest('hex');
    const refreshHmac = crypto.createHmac('sha256', JWT_REFRESH_SECRET).update(challengeInput).digest('hex');

    assert.notEqual(otpHmac, accessHmac, 'OTP HMAC must not equal access secret HMAC');
    assert.notEqual(otpHmac, refreshHmac, 'OTP HMAC must not equal refresh secret HMAC');
  });

  // 9. Blocker 3: Production Fail-Closed Missing Secret Test
  it('9. BLOCKER 3: Production fails closed when OTP_HASH_SECRET is missing', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevOtpSecret = process.env.OTP_HASH_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.OTP_HASH_SECRET;

      let exited = false;
      const originalExit = process.exit;
      process.exit = (code) => {
        exited = true;
        throw new Error(`Process.exit called with code ${code}`);
      };

      assert.throws(
        () => getOtpHmacSecret(),
        /Process.exit called with code 1/
      );

      process.exit = originalExit;
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevOtpSecret !== undefined) process.env.OTP_HASH_SECRET = prevOtpSecret;
    }
  });

  // 10. Blocker 4: Atomic Failed Attempt Counter Test
  it('10. BLOCKER 4: Failed attempt counter uses database atomic increment without losing count', async () => {
    const reqSend = { body: { mobile: MOCK_MOBILE } };
    const resSend = createMockRes();
    await sendCustomerOtp(reqSend, resSend);

    // Perform two wrong OTP requests concurrently
    const [resWrong1, resWrong2] = await Promise.all([
      verifyCustomerOtp({ body: { mobile: MOCK_MOBILE, otp: '000001' } }, createMockRes()),
      verifyCustomerOtp({ body: { mobile: MOCK_MOBILE, otp: '000002' } }, createMockRes()),
    ]);

    const customerInDb = Array.from(mockCustomerDB.values())[0];
    assert.equal(customerInDb.otpAttempts, 2, 'Database otpAttempts must equal 2 after two concurrent failures');
  });

  // 11. Blocker 5: Concurrent Correct OTP Verification Test
  it('11. BLOCKER 5: Concurrent verification requests with correct OTP result in exactly 1 success and 1 consumption failure', async () => {
    const reqSend = { body: { mobile: MOCK_MOBILE } };
    const resSend = createMockRes();
    await sendCustomerOtp(reqSend, resSend);
    const validOtp = resSend.body.devOtp;

    // Perform two concurrent verification requests with the SAME valid OTP
    const [resA, resB] = await Promise.all([
      verifyCustomerOtp({ body: { mobile: MOCK_MOBILE, otp: validOtp } }, createMockRes()),
      verifyCustomerOtp({ body: { mobile: MOCK_MOBILE, otp: validOtp } }, createMockRes()),
    ]);

    const statuses = [resA.statusCode, resB.statusCode].sort();
    assert.deepEqual(statuses, [200, 400], 'Exactly 1 request must return 200 OK and 1 must return 400 Bad Request');
  });

});
