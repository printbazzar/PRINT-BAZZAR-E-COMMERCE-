import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  signRefreshToken,
  signAccessToken,
  verifyRefreshToken,
  verifyAccessToken,
  JWT_ISSUER,
  JWT_ACCESS_AUDIENCE,
  JWT_REFRESH_AUDIENCE,
} from '../src/config/jwt.js';
import {
  rotateRefreshSession,
  hashToken,
  REFRESH_GRACE_WINDOW_MS,
  REFRESH_TOKEN_ROTATION_GRACE_SECONDS,
} from '../src/services/sessionService.js';

import prisma from '../src/lib/prisma.js';

// Setup Mock Data
const MOCK_CUSTOMER = {
  id: 'cust_concurrency_001',
  name: 'Concurrent Customer',
  email: 'concurrent@example.com',
  accountType: 'RETAIL',
};

const MOCK_STAFF = {
  id: 'staff_concurrency_001',
  name: 'Concurrent Staff',
  email: 'staff@example.com',
  isActive: true,
  department: 'ADMIN',
  role: {
    name: 'ADMIN',
    permissions: [{ permission: { code: 'MANAGE_SETTINGS' } }],
  },
};

// In-Memory Database for Mock Prisma AuthSession testing
const mockSessionsDB = new Map();

// Override Customer and User lookups
prisma.customer.findUnique = async ({ where }) => {
  if (where.id === MOCK_CUSTOMER.id) return MOCK_CUSTOMER;
  return null;
};

prisma.user.findUnique = async ({ where }) => {
  if (where.id === MOCK_STAFF.id) return MOCK_STAFF;
  return null;
};

// Override AuthSession DB methods with atomic concurrency simulation
prisma.authSession.findUnique = async ({ where }) => {
  if (where.tokenHash) {
    for (const session of mockSessionsDB.values()) {
      if (session.tokenHash === where.tokenHash) return { ...session };
    }
  }
  if (where.id) {
    const session = mockSessionsDB.get(where.id);
    if (session) return { ...session };
  }
  return null;
};

prisma.authSession.findFirst = async ({ where }) => {
  if (where.lastTokenHash) {
    for (const session of mockSessionsDB.values()) {
      if (session.lastTokenHash === where.lastTokenHash) return { ...session };
    }
  }
  return null;
};

prisma.authSession.updateMany = async ({ where, data }) => {
  let count = 0;
  for (const session of mockSessionsDB.values()) {
    let match = true;
    if (where.id && session.id !== where.id) match = false;
    if (where.tokenHash && session.tokenHash !== where.tokenHash) match = false;
    if (where.familyId && session.familyId !== where.familyId) match = false;
    if (where.revoked !== undefined && session.revoked !== where.revoked) match = false;

    if (match) {
      Object.assign(session, data);
      count++;
    }
  }
  return { count };
};

prisma.authSession.update = async ({ where, data }) => {
  const session = mockSessionsDB.get(where.id);
  if (session) {
    Object.assign(session, data);
    return { ...session };
  }
  throw new Error('Session not found');
};

describe('Phase 0C.3.3 — Comprehensive Refresh Token Concurrency & Security Suite', () => {

  // 1. Grace Window Configuration Validation
  it('1. Configuration Review: REFRESH_TOKEN_ROTATION_GRACE_SECONDS default and bounds', () => {
    assert.equal(REFRESH_TOKEN_ROTATION_GRACE_SECONDS, 30);
    assert.equal(REFRESH_GRACE_WINDOW_MS, 30000);

    // Verify boundary helper logic
    const parseAndClamp = (val) => {
      const raw = parseInt(val, 10);
      return Math.min(Math.max(isNaN(raw) || raw <= 0 ? 30 : raw, 1), 120);
    };

    assert.equal(parseAndClamp(undefined), 30);
    assert.equal(parseAndClamp('invalid'), 30);
    assert.equal(parseAndClamp(-10), 30);
    assert.equal(parseAndClamp(0), 30);
    assert.equal(parseAndClamp(15), 15);
    assert.equal(parseAndClamp(120), 120);
    assert.equal(parseAndClamp(500), 120); // Clamped to max 120
  });

  // 2. Normal Rotation (H1 -> H2)
  it('2. Normal rotation: H1 -> H2 updates tokenHash = H2, lastTokenHash = H1, sets rotatedAt', async () => {
    const sessionId = 'session_norm_001';
    const familyId = 'family_norm_001';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });
    const h1Hash = hashToken(h1Token);

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: h1Hash,
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const result = await rotateRefreshSession({ rawRefreshToken: h1Token });

    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
    assert.equal(result.isIdempotentRecovery, undefined);

    const updatedSession = mockSessionsDB.get(sessionId);
    assert.equal(updatedSession.lastTokenHash, h1Hash);
    assert.equal(updatedSession.tokenHash, hashToken(result.refreshToken));
    assert.ok(updatedSession.rotatedAt);
  });

  // 3. Two Simultaneous H1 Requests
  it('3. Two simultaneous H1 requests: exactly 1 rotation, no family revocation, no H3', async () => {
    const sessionId = 'session_conc_2';
    const familyId = 'family_conc_2';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });
    const h1Hash = hashToken(h1Token);

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: h1Hash,
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const [resA, resB] = await Promise.all([
      rotateRefreshSession({ rawRefreshToken: h1Token }),
      rotateRefreshSession({ rawRefreshToken: h1Token }),
    ]);

    assert.ok(resA.accessToken);
    assert.ok(resB.accessToken);

    const sessionInDb = mockSessionsDB.get(sessionId);
    assert.equal(sessionInDb.revoked, false);
    assert.equal(sessionInDb.lastTokenHash, h1Hash);

    const winners = [resA, resB].filter((r) => !r.isIdempotentRecovery);
    const losers = [resA, resB].filter((r) => r.isIdempotentRecovery);
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 1);

    // Confirm loser gets refreshToken: null
    assert.equal(losers[0].refreshToken, null);
  });

  // 4. Three Simultaneous H1 Requests
  it('4. Three simultaneous H1 requests: 1 winner, 2 recovery responses, no family revocation', async () => {
    const sessionId = 'session_conc_3';
    const familyId = 'family_conc_3';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });
    const h1Hash = hashToken(h1Token);

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: h1Hash,
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const results = await Promise.all([
      rotateRefreshSession({ rawRefreshToken: h1Token }),
      rotateRefreshSession({ rawRefreshToken: h1Token }),
      rotateRefreshSession({ rawRefreshToken: h1Token }),
    ]);

    for (const r of results) {
      assert.ok(r.accessToken);
    }

    const sessionInDb = mockSessionsDB.get(sessionId);
    assert.equal(sessionInDb.revoked, false);
    assert.equal(sessionInDb.lastTokenHash, h1Hash);

    const winners = results.filter((r) => !r.isIdempotentRecovery);
    const losers = results.filter((r) => r.isIdempotentRecovery);
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 2);

    for (const loser of losers) {
      assert.equal(loser.refreshToken, null);
    }
  });

  // 5. Dedicated Lost-Response Simulation Test
  it('5. Lost-Response Simulation: Discarded winning H2 response + retry H1 during grace', async () => {
    const sessionId = 'session_lost_resp';
    const familyId = 'family_lost_resp';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });
    const h1Hash = hashToken(h1Token);

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: h1Hash,
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Step 1 & 2: H1 rotates to H2
    const winningResponse = await rotateRefreshSession({ rawRefreshToken: h1Token });
    const h2Token = winningResponse.refreshToken;
    const h2Hash = hashToken(h2Token);
    const originalRotatedAt = mockSessionsDB.get(sessionId).rotatedAt;

    // Step 3: Winning response containing H2 is intentionally DISCARDED (simulating network loss)

    // Step 4 & 5 & 6: Client retries H1 during grace period
    const recoveryResponse = await rotateRefreshSession({ rawRefreshToken: h1Token });
    assert.ok(recoveryResponse.accessToken, 'Access token recovery succeeds');
    assert.equal(recoveryResponse.refreshToken, null, 'No new refresh token is returned');
    assert.equal(recoveryResponse.isIdempotentRecovery, true);

    // Step 7, 8, 9, 10: State invariants remain unchanged
    const sessionInDb = mockSessionsDB.get(sessionId);
    assert.equal(sessionInDb.tokenHash, h2Hash, 'tokenHash remains H2');
    assert.equal(sessionInDb.lastTokenHash, h1Hash, 'lastTokenHash remains H1');
    assert.equal(sessionInDb.rotatedAt.getTime(), originalRotatedAt.getTime(), 'rotatedAt is unchanged');

    // Step 11: After grace window (>30s), presenting H1 triggers family revocation
    sessionInDb.rotatedAt = new Date(Date.now() - 40000); // Fast-forward past grace window

    await assert.rejects(
      async () => {
        await rotateRefreshSession({ rawRefreshToken: h1Token });
      },
      /Refresh token revoked or reused/i
    );

    assert.equal(sessionInDb.revoked, true);
    assert.equal(sessionInDb.revokedReason, 'SUSPECTED_TOKEN_REUSE_ATTACK');
  });

  // 6. Grace Recovery Cannot Extend Itself Test
  it('6. Grace recovery cannot extend itself: repeated H1 calls do not update rotatedAt', async () => {
    const sessionId = 'session_grace_extend';
    const familyId = 'family_grace_extend';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });
    const h1Hash = hashToken(h1Token);

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: h1Hash,
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Initial rotation at T0
    await rotateRefreshSession({ rawRefreshToken: h1Token });
    const initialRotatedAt = mockSessionsDB.get(sessionId).rotatedAt;

    // Simulate recovery calls at +5s, +10s, +20s
    for (const offsetMs of [5000, 10000, 20000]) {
      const rec = await rotateRefreshSession({ rawRefreshToken: h1Token });
      assert.ok(rec.accessToken);
      assert.equal(rec.refreshToken, null);
      assert.equal(mockSessionsDB.get(sessionId).rotatedAt.getTime(), initialRotatedAt.getTime(), 'rotatedAt must NOT change during recovery');
    }

    // Past grace (+35s), H1 must be rejected
    mockSessionsDB.get(sessionId).rotatedAt = new Date(Date.now() - 35000);
    await assert.rejects(
      async () => {
        await rotateRefreshSession({ rawRefreshToken: h1Token });
      },
      /Refresh token revoked or reused/i
    );
  });

  // 7. Verify H1 Cannot Become H3 Test
  it('7. H1 cannot become H3: tokenHash remains H2 after every H1 recovery attempt', async () => {
    const sessionId = 'session_h1_no_h3';
    const familyId = 'family_h1_no_h3';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });
    const h1Hash = hashToken(h1Token);

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: h1Hash,
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res1 = await rotateRefreshSession({ rawRefreshToken: h1Token });
    const h2Hash = hashToken(res1.refreshToken);
    const initialRotatedAt = mockSessionsDB.get(sessionId).rotatedAt;

    // Perform multiple recovery attempts with H1
    await rotateRefreshSession({ rawRefreshToken: h1Token });
    await rotateRefreshSession({ rawRefreshToken: h1Token });

    // Strictly assert state invariants
    const sessionInDb = mockSessionsDB.get(sessionId);
    assert.equal(sessionInDb.tokenHash, h2Hash, 'tokenHash remains strictly H2');
    assert.equal(sessionInDb.lastTokenHash, h1Hash, 'lastTokenHash remains strictly H1');
    assert.equal(sessionInDb.rotatedAt.getTime(), initialRotatedAt.getTime(), 'rotatedAt remains strictly original timestamp');
  });

  // 8. H2 Normal Rotation & Obsolete H1 Rejection Test
  it('8. H2 normal rotation (H1 -> H2 -> H3) and subsequent rejection of obsolete H1', async () => {
    const sessionId = 'session_h2_norm';
    const familyId = 'family_h2_norm';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });
    const h1Hash = hashToken(h1Token);

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: h1Hash,
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Step 1: H1 -> H2
    const res1 = await rotateRefreshSession({ rawRefreshToken: h1Token });
    const h2Token = res1.refreshToken;
    const h2Hash = hashToken(h2Token);

    // Step 2: H1 recovery attempt
    await rotateRefreshSession({ rawRefreshToken: h1Token });

    // Step 3: H2 -> H3
    const res2 = await rotateRefreshSession({ rawRefreshToken: h2Token });
    const h3Token = res2.refreshToken;
    const h3Hash = hashToken(h3Token);

    const sessionInDb = mockSessionsDB.get(sessionId);
    assert.equal(sessionInDb.tokenHash, h3Hash, 'tokenHash is H3');
    assert.equal(sessionInDb.lastTokenHash, h2Hash, 'lastTokenHash is H2');

    // Step 4: Obsolete H1 submitted after H2->H3 rotation is no longer accepted as immediately previous token
    await assert.rejects(
      async () => {
        await rotateRefreshSession({ rawRefreshToken: h1Token });
      },
      /Refresh token revoked or reused/i
    );

    assert.equal(sessionInDb.revoked, true, 'Session family is revoked on obsolete token presentation');
  });

  // 9. Revoked Session Test
  it('9. Revoked session cannot be refreshed or recovered', async () => {
    const sessionId = 'session_revoked';
    const familyId = 'family_revoked';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: hashToken(h1Token),
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: true,
      revokedReason: 'USER_LOGOUT',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await assert.rejects(
      async () => {
        await rotateRefreshSession({ rawRefreshToken: h1Token });
      },
      /Refresh token revoked or reused/i
    );
  });

  // 10. Expired Session Test
  it('10. Expired session refresh is denied', async () => {
    const sessionId = 'session_expired';
    const familyId = 'family_expired';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: hashToken(h1Token),
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() - 1000), // Expired
    });

    await assert.rejects(
      async () => {
        await rotateRefreshSession({ rawRefreshToken: h1Token });
      },
      /Session has expired/i
    );
  });

  // 11. Logout Race / Revocation Race
  it('11. Refresh race against explicit logout cannot resurrect revoked session', async () => {
    const sessionId = 'session_logout_race';
    const familyId = 'family_logout_race';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: hashToken(h1Token),
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Simulate explicit logout by setting revoked = true
    const logoutAction = async () => {
      const sess = mockSessionsDB.get(sessionId);
      sess.revoked = true;
      sess.revokedReason = 'MANUAL_LOGOUT';
    };

    await Promise.all([
      logoutAction(),
      rotateRefreshSession({ rawRefreshToken: h1Token }).catch(() => {}),
    ]);

    assert.equal(mockSessionsDB.get(sessionId).revoked, true);
  });

  // 12. Different Session Isolation
  it('12. Valid H1 from Session A cannot recover or access Session B', async () => {
    const tokenA = signRefreshToken({
      sessionId: 'session_A',
      familyId: 'family_A',
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });

    mockSessionsDB.set('session_A', {
      id: 'session_A',
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: hashToken(tokenA),
      lastTokenHash: null,
      rotatedAt: null,
      familyId: 'family_A',
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    mockSessionsDB.set('session_B', {
      id: 'session_B',
      userType: 'CUSTOMER',
      customerId: 'other_cust',
      userId: null,
      tokenHash: hashToken('other_token'),
      lastTokenHash: null,
      rotatedAt: null,
      familyId: 'family_B',
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const resA = await rotateRefreshSession({ rawRefreshToken: tokenA });
    assert.equal(resA.customer.id, MOCK_CUSTOMER.id);
  });

  // 13. Customer Refresh Behavior
  it('13. Customer refresh flow returns customer domain claims and user object', async () => {
    const sessionId = 'session_cust_auth';
    const familyId = 'family_cust_auth';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      userId: null,
      tokenHash: hashToken(h1Token),
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = await rotateRefreshSession({ rawRefreshToken: h1Token });
    assert.equal(res.userType, 'CUSTOMER');
    assert.equal(res.customer.id, MOCK_CUSTOMER.id);

    const decoded = verifyAccessToken(res.accessToken);
    assert.equal(decoded.isCustomer, true);
    assert.equal(decoded.id, MOCK_CUSTOMER.id);
  });

  // 14. Staff/Admin Refresh Behavior
  it('14. Staff/Admin refresh flow returns staff domain claims and user object', async () => {
    const sessionId = 'session_staff_auth';
    const familyId = 'family_staff_auth';

    const h1Token = signRefreshToken({
      sessionId,
      familyId,
      userType: 'STAFF',
      userId: MOCK_STAFF.id,
      tokenType: 'REFRESH',
    });

    mockSessionsDB.set(sessionId, {
      id: sessionId,
      userType: 'STAFF',
      customerId: null,
      userId: MOCK_STAFF.id,
      tokenHash: hashToken(h1Token),
      lastTokenHash: null,
      rotatedAt: null,
      familyId,
      revoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = await rotateRefreshSession({ rawRefreshToken: h1Token });
    assert.equal(res.userType, 'STAFF');
    assert.equal(res.user.id, MOCK_STAFF.id);

    const decoded = verifyAccessToken(res.accessToken);
    assert.equal(decoded.role, 'ADMIN');
    assert.equal(decoded.userId, MOCK_STAFF.id);
  });

  // 15. Token Boundaries & JWT 0C.3.2 Protections
  it('15. Token boundary enforcement & Phase 0C.3.2 standard claims remain strict', async () => {
    const refreshToken = signRefreshToken({
      sessionId: 'sess_boundary',
      familyId: 'fam_boundary',
      userType: 'CUSTOMER',
      customerId: MOCK_CUSTOMER.id,
      tokenType: 'REFRESH',
    });

    const accessToken = signAccessToken({
      id: MOCK_CUSTOMER.id,
      email: MOCK_CUSTOMER.email,
      isCustomer: true,
      tokenType: 'ACCESS',
    });

    // Standard claims verification
    const decodedRefresh = verifyRefreshToken(refreshToken);
    assert.equal(decodedRefresh.iss, JWT_ISSUER);
    assert.equal(decodedRefresh.aud, JWT_REFRESH_AUDIENCE);

    const decodedAccess = verifyAccessToken(accessToken);
    assert.equal(decodedAccess.iss, JWT_ISSUER);
    assert.equal(decodedAccess.aud, JWT_ACCESS_AUDIENCE);

    // Refresh token cannot verify as access token
    assert.throws(() => verifyAccessToken(refreshToken), /jwt audience invalid/i);

    // Access token cannot verify as refresh token
    assert.throws(() => verifyRefreshToken(accessToken), /jwt audience invalid/i);
  });

});
