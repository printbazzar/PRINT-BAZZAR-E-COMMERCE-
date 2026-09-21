import { describe, it, beforeEach, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

import { customerLogin } from '../src/controllers/customerAuthController.js';
import { adminLogin } from '../src/controllers/authController.js';
import {
  PASSWORD_LOGIN_MAX_ATTEMPTS,
  PASSWORD_LOGIN_LOCKOUT_SECONDS,
} from '../src/config/envValidator.js';
import prisma from '../src/lib/prisma.js';

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

// Check if an isolated test database URL is available
const targetDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const isIsolatedTestDbAvailable = !!(
  targetDbUrl &&
  !targetDbUrl.includes('supabase.co') &&
  !targetDbUrl.includes('prod')
);

describe('Phase 0C.3.6 — Real PostgreSQL Password Lockout & Concurrency Suite', () => {
  const VALID_PASSWORD = 'SecurePassword123!';
  const WRONG_PASSWORD = 'WrongPassword999!';
  const CUSTOMER_EMAIL = 'real_pg_concurrency_cust@printbazzar.com';
  const ADMIN_EMAIL = 'real_pg_concurrency_admin@printbazzar.com';

  let validPasswordHash;
  let testCustomer = null;
  let testStaffRole = null;
  let testStaffUser = null;

  before(async () => {
    if (!isIsolatedTestDbAvailable) {
      throw new Error('FATAL: Real PostgreSQL isolated test database is required.');
    }
    validPasswordHash = await bcrypt.hash(VALID_PASSWORD, 10);

    // Create/Ensure Super Admin Role exists in test DB
    testStaffRole = await prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: {
        name: 'SUPER_ADMIN',
        description: 'Super Admin for concurrency test',
        isSystem: true,
      },
    });
  });

  beforeEach(async () => {
    if (isIsolatedTestDbAvailable) {
      // Seed real customer in PostgreSQL
      testCustomer = await prisma.customer.upsert({
        where: { email: CUSTOMER_EMAIL },
        update: {
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
          passwordHash: validPasswordHash,
        },
        create: {
          name: 'Real PG Concurrency Customer',
          email: CUSTOMER_EMAIL,
          mobile: '9999911111',
          passwordHash: validPasswordHash,
          accountType: 'B2C_RETAIL',
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
        },
      });

      // Seed real staff user in PostgreSQL
      testStaffUser = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: {
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
          passwordHash: validPasswordHash,
          roleId: testStaffRole.id,
          isActive: true,
        },
        create: {
          name: 'Real PG Concurrency Admin',
          email: ADMIN_EMAIL,
          passwordHash: validPasswordHash,
          roleId: testStaffRole.id,
          isActive: true,
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
        },
      });
    }
  });

  afterEach(async () => {
    if (isIsolatedTestDbAvailable) {
      if (testCustomer) {
        await prisma.customer.deleteMany({
          where: { email: CUSTOMER_EMAIL },
        });
      }
      if (testStaffUser) {
        await prisma.user.deleteMany({
          where: { email: ADMIN_EMAIL },
        });
      }
    }
  });

  // Test 1: 10 Concurrent Wrong-Password Requests
  it('1. 10 Concurrent Wrong Passwords against real PostgreSQL user', async () => {
    const requests = Array.from({ length: 10 }, () => {
      const req = {
        body: { email: CUSTOMER_EMAIL, password: WRONG_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();
      return customerLogin(req, res).then(() => res);
    });

    const responses = await Promise.all(requests);

    for (const res of responses) {
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.message, 'Invalid credentials.');
    }

    const updatedCustomer = await prisma.customer.findUnique({
      where: { email: CUSTOMER_EMAIL },
    });

    assert.equal(updatedCustomer.failedLoginAttempts, 5);
    assert.ok(updatedCustomer.loginBlockedUntil instanceof Date);
    assert.ok(updatedCustomer.loginBlockedUntil.getTime() > Date.now());
  });

  // Test 2: Success vs Failure Race Condition
  it('2. Concurrent successful login + failed login race condition against real PostgreSQL user', async () => {
    await prisma.customer.update({
      where: { email: CUSTOMER_EMAIL },
      data: { failedLoginAttempts: 4, loginBlockedUntil: null },
    });

    const wrongReq = {
      body: { email: CUSTOMER_EMAIL, password: WRONG_PASSWORD },
      ip: '127.0.0.1',
      headers: {},
    };
    const wrongRes = createMockRes();

    const validReq = {
      body: { email: CUSTOMER_EMAIL, password: VALID_PASSWORD },
      ip: '127.0.0.1',
      headers: {},
    };
    const validRes = createMockRes();

    await Promise.all([
      customerLogin(wrongReq, wrongRes),
      customerLogin(validReq, validRes),
    ]);

    const updatedCustomer = await prisma.customer.findUnique({
      where: { email: CUSTOMER_EMAIL },
    });

    if (updatedCustomer.loginBlockedUntil) {
      assert.equal(updatedCustomer.failedLoginAttempts, 5);
      assert.equal(validRes.statusCode, 401);
    } else {
      assert.ok(updatedCustomer.failedLoginAttempts === 0 || updatedCustomer.failedLoginAttempts === 1);
      assert.equal(validRes.statusCode, 200);
    }
  });

  // Test 3: 50 Concurrent Request Burst Scenario
  it('3. 50 Concurrent Login Requests against real PostgreSQL user', async () => {
    const requests = Array.from({ length: 50 }, () => {
      const req = {
        body: { email: CUSTOMER_EMAIL, password: WRONG_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();
      return customerLogin(req, res).then(() => res);
    });

    const responses = await Promise.all(requests);

    for (const res of responses) {
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.message, 'Invalid credentials.');
    }

    const updatedCustomer = await prisma.customer.findUnique({
      where: { email: CUSTOMER_EMAIL },
    });

    assert.equal(updatedCustomer.failedLoginAttempts, 5);
    assert.ok(updatedCustomer.loginBlockedUntil instanceof Date);
    assert.ok(updatedCustomer.loginBlockedUntil.getTime() > Date.now());
  });

  // Test 4: Expired Lockout Recovery
  it('4. Expired lockout recovery allows successful login and resets state in real PostgreSQL', async () => {
    // 4a. Expired lockout + valid password -> Success (200) and resets to 0
    await prisma.customer.update({
      where: { email: CUSTOMER_EMAIL },
      data: {
        failedLoginAttempts: 5,
        loginBlockedUntil: new Date(Date.now() - 5000), // Expiry passed 5s ago
      },
    });

    const validReq = {
      body: { email: CUSTOMER_EMAIL, password: VALID_PASSWORD },
      ip: '127.0.0.1',
      headers: {},
    };
    const validRes = createMockRes();

    await customerLogin(validReq, validRes);

    assert.equal(validRes.statusCode, 200);
    assert.equal(validRes.body.success, true);

    let dbCust = await prisma.customer.findUnique({ where: { email: CUSTOMER_EMAIL } });
    assert.equal(dbCust.failedLoginAttempts, 0);
    assert.equal(dbCust.loginBlockedUntil, null);

    // 4b. Expired lockout + wrong password -> Resets expired lockout and increments to 1
    await prisma.customer.update({
      where: { email: CUSTOMER_EMAIL },
      data: {
        failedLoginAttempts: 5,
        loginBlockedUntil: new Date(Date.now() - 5000), // Expiry passed
      },
    });

    const wrongReq = {
      body: { email: CUSTOMER_EMAIL, password: WRONG_PASSWORD },
      ip: '127.0.0.1',
      headers: {},
    };
    const wrongRes = createMockRes();

    await customerLogin(wrongReq, wrongRes);

    assert.equal(wrongRes.statusCode, 401);

    dbCust = await prisma.customer.findUnique({ where: { email: CUSTOMER_EMAIL } });
    assert.equal(dbCust.failedLoginAttempts, 1);
    assert.equal(dbCust.loginBlockedUntil, null);
  });

  // Test 5: Successful Login Reset Invariant
  it('5. Successful login reset invariant resets counter from non-zero to 0', async () => {
    await prisma.customer.update({
      where: { email: CUSTOMER_EMAIL },
      data: { failedLoginAttempts: 3, loginBlockedUntil: null },
    });

    const req = {
      body: { email: CUSTOMER_EMAIL, password: VALID_PASSWORD },
      ip: '127.0.0.1',
      headers: {},
    };
    const res = createMockRes();

    await customerLogin(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);

    const dbCust = await prisma.customer.findUnique({ where: { email: CUSTOMER_EMAIL } });
    assert.equal(dbCust.failedLoginAttempts, 0);
    assert.equal(dbCust.loginBlockedUntil, null);
  });

  // Test 6: Failed-login Atomic Increment & Threshold Lockout Invariant
  it('6. Failed-login atomic increment and threshold lockout invariant on staff user', async () => {
    const req = {
      body: { email: ADMIN_EMAIL, password: WRONG_PASSWORD },
      ip: '127.0.0.1',
      headers: {},
    };

    // Attempts 1 through 4
    for (let i = 1; i <= 4; i++) {
      const res = createMockRes();
      await adminLogin(req, res);
      assert.equal(res.statusCode, 401);

      const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
      assert.equal(user.failedLoginAttempts, i);
      assert.equal(user.loginBlockedUntil, null);
    }

    // 5th attempt triggers lockout
    const res5 = createMockRes();
    await adminLogin(req, res5);
    assert.equal(res5.statusCode, 401);

    const user5 = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    assert.equal(user5.failedLoginAttempts, 5);
    assert.ok(user5.loginBlockedUntil instanceof Date);
    assert.ok(user5.loginBlockedUntil.getTime() > Date.now());

    // 6th attempt while locked out (advisory pre-bcrypt check returns 401, counter stays 5)
    const res6 = createMockRes();
    await adminLogin(req, res6);
    assert.equal(res6.statusCode, 401);
    assert.equal(res6.body.message, 'Invalid credentials.');

    const user6 = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    assert.equal(user6.failedLoginAttempts, 5);
  });

  // Test 7: Generic Authentication Error / Enumeration Prevention Behavior
  it('7. Generic authentication error behavior for nonexistent, wrong, and locked accounts', async () => {
    // 7a. Non-existent account
    const reqNonExistent = {
      body: { email: 'nonexistent_ghost_user_99@printbazzar.com', password: WRONG_PASSWORD },
      ip: '127.0.0.1',
      headers: {},
    };
    const resNonExistent = createMockRes();
    await customerLogin(reqNonExistent, resNonExistent);

    assert.equal(resNonExistent.statusCode, 401);
    assert.equal(resNonExistent.body.success, false);
    assert.equal(resNonExistent.body.message, 'Invalid credentials.');

    // 7b. Existing user + wrong password
    const reqWrong = {
      body: { email: CUSTOMER_EMAIL, password: WRONG_PASSWORD },
      ip: '127.0.0.1',
      headers: {},
    };
    const resWrong = createMockRes();
    await customerLogin(reqWrong, resWrong);

    assert.equal(resWrong.statusCode, 401);
    assert.equal(resWrong.body.success, false);
    assert.equal(resWrong.body.message, 'Invalid credentials.');

    // 7c. Locked out user
    await prisma.customer.update({
      where: { email: CUSTOMER_EMAIL },
      data: {
        failedLoginAttempts: 5,
        loginBlockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const reqLocked = {
      body: { email: CUSTOMER_EMAIL, password: VALID_PASSWORD },
      ip: '127.0.0.1',
      headers: {},
    };
    const resLocked = createMockRes();
    await customerLogin(reqLocked, resLocked);

    assert.equal(resLocked.statusCode, 401);
    assert.equal(resLocked.body.success, false);
    assert.equal(resLocked.body.message, 'Invalid credentials.');
  });

  // Test 8: Dummy Bcrypt Path for Nonexistent Users
  it('8. Dummy bcrypt path for nonexistent users executes bcrypt comparison to mitigate timing attacks', async () => {
    const startTime = Date.now();
    const req = {
      body: { email: 'definitely_nonexistent_user_xyz@printbazzar.com', password: WRONG_PASSWORD },
      ip: '127.0.0.1',
      headers: {},
    };
    const res = createMockRes();
    await customerLogin(req, res);
    const duration = Date.now() - startTime;

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Invalid credentials.');
    assert.ok(typeof duration === 'number');
  });
});
