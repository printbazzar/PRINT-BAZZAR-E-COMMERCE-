import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_GRACE_WINDOW_MS,
  REFRESH_TOKEN_ROTATION_GRACE_SECONDS,
} from '../config/jwt.js';

export { REFRESH_GRACE_WINDOW_MS, REFRESH_TOKEN_ROTATION_GRACE_SECONDS };

/**
 * Compute SHA-256 hash of a raw token for secure database indexing
 */
export const hashToken = (token) => {
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Create a new authenticated session (Staff or Customer)
 */
export const createSession = async ({
  userType = 'STAFF',
  userId = null,
  customerId = null,
  ipAddress = null,
  userAgent = null,
  payload = {},
}) => {
  const familyId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();

  // Expiration: 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 1. Sign Refresh Token (contains session identification)
  const refreshToken = signRefreshToken({
    sessionId,
    familyId,
    userType,
    userId,
    customerId,
    tokenType: 'REFRESH',
  });

  const tokenHash = hashToken(refreshToken);

  // 2. Persist AuthSession in PostgreSQL
  const session = await prisma.authSession.create({
    data: {
      id: sessionId,
      userType,
      userId,
      customerId,
      tokenHash,
      familyId,
      ipAddress,
      userAgent,
      expiresAt,
      lastUsedAt: new Date(),
    },
  });

  // 3. Sign Short-Lived Access Token (15 minutes)
  const accessToken = signAccessToken({
    ...payload,
    sessionId: session.id,
    familyId,
    userType,
  });

  return {
    accessToken,
    refreshToken,
    session,
  };
};

/**
 * Rotate Refresh Token (Single-Use with Reuse Detection & Grace Window)
 */
export const rotateRefreshSession = async ({
  rawRefreshToken,
  ipAddress = null,
  userAgent = null,
}) => {
  if (!rawRefreshToken) {
    throw new Error('Refresh token is required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    throw new Error('Invalid or expired refresh token signature');
  }

  const currentTokenHash = hashToken(rawRefreshToken);

  // 1. Primary lookup: Find session matching active token hash
  let session = await prisma.authSession.findUnique({
    where: { tokenHash: currentTokenHash },
  });

  // 2. Concurrency Check: If token hash not active, check if it was recently rotated within the grace window
  if (!session) {
    const recentSession = await prisma.authSession.findFirst({
      where: { lastTokenHash: currentTokenHash },
    });

    if (recentSession) {
      const isWithinGrace = recentSession.rotatedAt && (Date.now() - new Date(recentSession.rotatedAt).getTime() < REFRESH_GRACE_WINDOW_MS);
      if (isWithinGrace && !recentSession.revoked) {
        // Idempotent recovery for concurrent request within grace window!
        let tokenPayload = {};
        let freshUser = null;
        let freshCustomer = null;

        if (recentSession.userType === 'STAFF' && recentSession.userId) {
          freshUser = await prisma.user.findUnique({
            where: { id: recentSession.userId },
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          });
          if (freshUser && freshUser.isActive) {
            tokenPayload = {
              userId: freshUser.id,
              email: freshUser.email,
              role: freshUser.role.name,
              department: freshUser.department || 'ALL',
              permissions: freshUser.role.permissions.map((rp) => rp.permission.code),
            };
          }
        } else if (recentSession.userType === 'CUSTOMER' && recentSession.customerId) {
          freshCustomer = await prisma.customer.findUnique({
            where: { id: recentSession.customerId },
          });
          if (freshCustomer) {
            tokenPayload = {
              id: freshCustomer.id,
              email: freshCustomer.email,
              name: freshCustomer.name,
              accountType: freshCustomer.accountType,
              isCustomer: true,
            };
          }
        }

        const accessToken = signAccessToken({
          ...tokenPayload,
          sessionId: recentSession.id,
          familyId: recentSession.familyId,
          userType: recentSession.userType,
        });

        return {
          accessToken,
          refreshToken: null,
          user: freshUser,
          customer: freshCustomer,
          userType: recentSession.userType,
          isIdempotentRecovery: true,
        };
      }
    }
  }

  // 3. Reuse Detection: If token hash not found or already revoked
  if (!session || session.revoked) {
    if (decoded && decoded.familyId) {
      // Invalidate the entire session family to neutralize attacker
      await prisma.authSession.updateMany({
        where: { familyId: decoded.familyId },
        data: {
          revoked: true,
          revokedAt: new Date(),
          revokedReason: 'SUSPECTED_TOKEN_REUSE_ATTACK',
        },
      });
    }
    throw new Error('Refresh token revoked or reused. Please log in again.');
  }

  // 4. Expiry check
  if (new Date() > new Date(session.expiresAt)) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: 'SESSION_EXPIRED',
      },
    });
    throw new Error('Session has expired. Please log in again.');
  }

  // 5. Fetch current user or customer data for the fresh access token
  let tokenPayload = {};
  let freshUser = null;
  let freshCustomer = null;

  if (session.userType === 'STAFF' && session.userId) {
    freshUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!freshUser || !freshUser.isActive) {
      await revokeSession(session.id, 'USER_INACTIVE');
      throw new Error('User account is inactive or deleted.');
    }

    const permissions = freshUser.role.permissions.map((rp) => rp.permission.code);
    tokenPayload = {
      userId: freshUser.id,
      email: freshUser.email,
      role: freshUser.role.name,
      department: freshUser.department || 'ALL',
      permissions,
    };
  } else if (session.userType === 'CUSTOMER' && session.customerId) {
    freshCustomer = await prisma.customer.findUnique({
      where: { id: session.customerId },
    });

    if (!freshCustomer) {
      await revokeSession(session.id, 'CUSTOMER_NOT_FOUND');
      throw new Error('Customer account not found.');
    }

    tokenPayload = {
      id: freshCustomer.id,
      email: freshCustomer.email,
      name: freshCustomer.name,
      accountType: freshCustomer.accountType,
      isCustomer: true,
    };
  } else {
    throw new Error('Unknown session user type');
  }

  // 6. Generate NEW rotated refresh token
  const newRefreshToken = signRefreshToken({
    sessionId: session.id,
    familyId: session.familyId,
    userType: session.userType,
    userId: session.userId,
    customerId: session.customerId,
    tokenType: 'REFRESH',
  });

  const newTokenHash = hashToken(newRefreshToken);
  const now = new Date();

  // 7. Atomic Conditional Update: Only update if tokenHash is still currentTokenHash and unrevoked
  const updateResult = await prisma.authSession.updateMany({
    where: {
      id: session.id,
      tokenHash: currentTokenHash,
      revoked: false,
    },
    data: {
      tokenHash: newTokenHash,
      lastTokenHash: currentTokenHash,
      rotatedAt: now,
      lastUsedAt: now,
      ipAddress: ipAddress || session.ipAddress,
      userAgent: userAgent || session.userAgent,
    },
  });

  // If atomic update matched 0 rows, another concurrent request completed rotation first!
  if (updateResult.count === 0) {
    const recheckedSession = await prisma.authSession.findUnique({
      where: { id: session.id },
    });

    if (
      recheckedSession &&
      recheckedSession.lastTokenHash === currentTokenHash &&
      recheckedSession.rotatedAt &&
      Date.now() - new Date(recheckedSession.rotatedAt).getTime() < REFRESH_GRACE_WINDOW_MS &&
      !recheckedSession.revoked
    ) {
      const accessToken = signAccessToken({
        ...tokenPayload,
        sessionId: recheckedSession.id,
        familyId: recheckedSession.familyId,
        userType: recheckedSession.userType,
      });

      return {
        accessToken,
        refreshToken: null,
        user: freshUser,
        customer: freshCustomer,
        userType: recheckedSession.userType,
        isIdempotentRecovery: true,
      };
    }

    if (decoded && decoded.familyId) {
      await prisma.authSession.updateMany({
        where: { familyId: decoded.familyId },
        data: {
          revoked: true,
          revokedAt: new Date(),
          revokedReason: 'SUSPECTED_TOKEN_REUSE_ATTACK',
        },
      });
    }
    throw new Error('Refresh token revoked or reused. Please log in again.');
  }

  // 8. Generate NEW short-lived access token
  const newAccessToken = signAccessToken({
    ...tokenPayload,
    sessionId: session.id,
    familyId: session.familyId,
    userType: session.userType,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: freshUser,
    customer: freshCustomer,
    userType: session.userType,
  };
};

/**
 * Revoke an active session by Session ID
 */
export const revokeSession = async (sessionId, reason = 'LOGOUT') => {
  if (!sessionId) return false;
  try {
    await prisma.authSession.update({
      where: { id: sessionId },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Revoke all sessions for a user (e.g., password change)
 */
export const revokeAllUserSessions = async ({ userType, userId, customerId, reason = 'SECURITY_REVOCATION' }) => {
  try {
    const where = {};
    if (userType === 'STAFF' && userId) where.userId = userId;
    else if (userType === 'CUSTOMER' && customerId) where.customerId = customerId;
    else return 0;

    const result = await prisma.authSession.updateMany({
      where: { ...where, revoked: false },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
    return result.count;
  } catch (err) {
    return 0;
  }
};

/**
 * Check if a session ID is currently valid and unrevoked
 */
export const isSessionActive = async (sessionId) => {
  if (!sessionId) return true; // For legacy tokens that don't have a sessionId
  try {
    const session = await prisma.authSession.findUnique({
      where: { id: sessionId },
      select: { revoked: true, expiresAt: true },
    });
    if (!session) return false;
    if (session.revoked) return false;
    if (new Date() > new Date(session.expiresAt)) return false;
    return true;
  } catch (err) {
    return false;
  }
};

export default {
  hashToken,
  createSession,
  rotateRefreshSession,
  revokeSession,
  revokeAllUserSessions,
  isSessionActive,
};
