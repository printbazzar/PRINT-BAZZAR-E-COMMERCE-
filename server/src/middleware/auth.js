import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../config/jwt.js';
import { isSessionActive } from '../services/sessionService.js';
import { COOKIE_NAMES } from '../config/cookies.js';

const prisma = new PrismaClient();

/**
 * Extract token from either Authorization header or cookies
 */
const extractToken = (req, cookieName) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }
  return null;
};

/**
 * Admin / Staff Authentication Middleware
 * Supports: Authorization: Bearer <token> OR HttpOnly cookie pb_admin_access
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = extractToken(req, COOKIE_NAMES.STAFF_ACCESS);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please login.' });
    }

    const decoded = verifyToken(token);

    // Validate active session in database if token has a sessionId
    if (decoded.sessionId) {
      const active = await isSessionActive(decoded.sessionId);
      if (!active) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_REVOKED',
          message: 'Your session has been revoked or expired. Please login again.',
        });
      }
    }

    const userId = decoded.userId || decoded.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user || !user.isActive) {
      return res.status(403).json({ success: false, message: 'User account is inactive or unauthorized.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department || 'ALL',
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.code),
    };
    req.sessionId = decoded.sessionId || null;

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication session.' });
  }
};

/**
 * Customer Authentication Middleware (B2C & B2B)
 * Supports: Authorization: Bearer <token> OR HttpOnly cookie pb_cust_access
 */
export const authenticateCustomer = async (req, res, next) => {
  try {
    const token = extractToken(req, COOKIE_NAMES.CUSTOMER_ACCESS);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Customer authentication required.' });
    }

    const decoded = verifyToken(token);

    // Validate active session in database if token has a sessionId
    if (decoded.sessionId) {
      const active = await isSessionActive(decoded.sessionId);
      if (!active) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_REVOKED',
          message: 'Your session has been revoked or expired. Please login again.',
        });
      }
    }

    const customerId = decoded.id || decoded.customerId;
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { savedAddresses: true },
    });

    if (!customer) {
      return res.status(401).json({ success: false, message: 'Customer not found.' });
    }

    req.customer = customer;
    req.sessionId = decoded.sessionId || null;

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired customer session token.' });
  }
};

/**
 * Role-Based Access Control (RBAC) Guard
 */
export const requirePermission = (permissionCode) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.role === 'Super Admin') {
      return next();
    }

    if (!req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You lack the required permission (${permissionCode}) to perform this action.`,
      });
    }

    next();
  };
};

/**
 * Unified Authenticator: Accepts either Customer Token OR Admin Token
 * Supports both Bearer headers and HttpOnly cookies
 */
export const authenticateCustomerOrAdmin = async (req, res, next) => {
  try {
    let token = null;

    // 1. Bearer Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Cookie Fallback
    if (!token && req.cookies) {
      token = req.cookies[COOKIE_NAMES.STAFF_ACCESS] || req.cookies[COOKIE_NAMES.CUSTOMER_ACCESS];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please login.' });
    }

    const decoded = verifyToken(token);

    // Validate active session in database if token has a sessionId
    if (decoded.sessionId) {
      const active = await isSessionActive(decoded.sessionId);
      if (!active) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_REVOKED',
          message: 'Your session has been revoked or expired. Please login again.',
        });
      }
    }

    if (decoded.userId || (decoded.userType === 'STAFF' && decoded.id)) {
      // Admin/Staff Session
      const userId = decoded.userId || decoded.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          department: user.department || 'ALL',
          permissions: user.role.permissions.map((rp) => rp.permission.code),
        };
        req.sessionId = decoded.sessionId || null;
        return next();
      }
    } else if (decoded.id || decoded.customerId || decoded.userType === 'CUSTOMER') {
      // Customer Session
      const customerId = decoded.id || decoded.customerId;
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (customer) {
        req.customer = customer;
        req.sessionId = decoded.sessionId || null;
        return next();
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid or unauthorized session token.' });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication session.' });
  }
};

export default {
  authenticateAdmin,
  authenticateCustomer,
  authenticateCustomerOrAdmin,
  requirePermission,
};
