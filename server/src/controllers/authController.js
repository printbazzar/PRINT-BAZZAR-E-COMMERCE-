import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import {
  createSession,
  rotateRefreshSession,
  revokeSession,
} from '../services/sessionService.js';
import {
  setAuthCookies,
  clearAuthCookies,
  COOKIE_NAMES,
} from '../config/cookies.js';

import { PASSWORD_LOGIN_MAX_ATTEMPTS, PASSWORD_LOGIN_LOCKOUT_SECONDS } from '../config/envValidator.js';

const DUMMY_HASH = '$2a$10$wE8Z9R11WvA3k5K/H9zXk.2L1M4k4S4S4S4S4S4S4S4S4S4S4S4S';

/**
 * Admin / Staff Login
 * Issues dual tokens: HttpOnly cookies + response token for transition compatibility
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
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

    if (!user) {
      // Timing attack protection against non-existent email enumeration
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // 1. Account Lockout Check (Pre-bcrypt CPU protection - advisory)
    const now = new Date();
    if (user.loginBlockedUntil && now < new Date(user.loginBlockedUntil)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw`
          SELECT "id", "failedLoginAttempts", "loginBlockedUntil"
          FROM "User"
          WHERE "id" = ${user.id}
          FOR UPDATE
        `;
        const dbUser = (rows && rows[0]) || user;
        const txNow = new Date();

        // Re-check lockout state
        if (dbUser.loginBlockedUntil && txNow < new Date(dbUser.loginBlockedUntil)) {
          return;
        }

        // Handle expired lockout
        let currentAttempts = dbUser.failedLoginAttempts || 0;
        if (dbUser.loginBlockedUntil && txNow >= new Date(dbUser.loginBlockedUntil)) {
          currentAttempts = 0;
        }

        let newAttempts = currentAttempts + 1;
        let newBlockedUntil = null;

        if (newAttempts >= PASSWORD_LOGIN_MAX_ATTEMPTS) {
          newAttempts = PASSWORD_LOGIN_MAX_ATTEMPTS;
          newBlockedUntil = new Date(txNow.getTime() + PASSWORD_LOGIN_LOCKOUT_SECONDS * 1000);
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            loginBlockedUntil: newBlockedUntil,
          },
        });
      }, { maxWait: 15000, timeout: 30000 });

      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Successful match path - execute transactional row lock re-check and reset
    const successResult = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`
        SELECT "id", "failedLoginAttempts", "loginBlockedUntil"
        FROM "User"
        WHERE "id" = ${user.id}
        FOR UPDATE
      `;
      const dbUser = (rows && rows[0]) || user;
      const txNow = new Date();

      if (dbUser.loginBlockedUntil && txNow < new Date(dbUser.loginBlockedUntil)) {
        return { success: false };
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: txNow,
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
        },
      });

      return { success: true };
    }, { maxWait: 15000, timeout: 30000 });

    if (!successResult.success) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }


    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    // Create server-tracked AuthSession (15m Access Token + 7d Refresh Token)
    const { accessToken, refreshToken, session } = await createSession({
      userType: 'STAFF',
      userId: user.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      payload: {
        userId: user.id,
        email: user.email,
        role: user.role.name,
        department: user.department || 'ALL',
        permissions,
      },
    });

    // Attach secure HttpOnly cookies (pb_admin_access, pb_admin_refresh)
    setAuthCookies(res, {
      accessToken,
      refreshToken,
      userType: 'STAFF',
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token: accessToken, // Temporary transition backward compatibility
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department || 'ALL',
        role: user.role.name,
        permissions,
      },
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

/**
 * Rotate Staff Refresh Token & Issue New Access Token
 * POST /api/v1/admin/auth/refresh
 */
export const adminRefreshToken = async (req, res) => {
  try {
    const rawRefreshToken =
      req.cookies?.[COOKIE_NAMES.STAFF_REFRESH] ||
      req.body?.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        code: 'NO_REFRESH_TOKEN',
        message: 'No refresh token provided. Please log in again.',
      });
    }

    const { accessToken, refreshToken, user } = await rotateRefreshSession({
      rawRefreshToken,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Set rotated cookies
    setAuthCookies(res, {
      accessToken,
      refreshToken,
      userType: 'STAFF',
    });

    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department || 'ALL',
        role: user.role.name,
        permissions,
      },
    });
  } catch (error) {
    clearAuthCookies(res, 'STAFF');
    return res.status(401).json({
      success: false,
      code: 'REFRESH_FAILED',
      message: error.message || 'Failed to refresh session. Please login again.',
    });
  }
};

/**
 * Staff Logout - Revoke Active Session in DB and Clear Cookies
 * POST /api/v1/admin/auth/logout
 */
export const adminLogout = async (req, res) => {
  try {
    const sessionId = req.sessionId || req.body?.sessionId;
    if (sessionId) {
      await revokeSession(sessionId, 'USER_LOGOUT');
    }

    clearAuthCookies(res, 'STAFF');

    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    clearAuthCookies(res, 'STAFF');
    return res.status(500).json({ success: false, message: 'Error during logout.' });
  }
};

/**
 * Fetch Current Staff Profile
 * GET /api/v1/admin/auth/me
 */
export const getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch current profile.' });
  }
};

export default {
  adminLogin,
  adminRefreshToken,
  adminLogout,
  getMe,
};
