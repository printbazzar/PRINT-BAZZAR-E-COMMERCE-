import prisma from '../lib/prisma.js';
import { verifyToken } from '../config/jwt.js';
import { isSessionActive } from '../services/sessionService.js';
import { COOKIE_NAMES } from '../config/cookies.js';

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

    // 1. Enforce Token Type: Must be ACCESS token
    if (decoded.tokenType && decoded.tokenType !== 'ACCESS') {
      return res.status(401).json({ success: false, message: 'Invalid token type for access.' });
    }

    // 2. Enforce Domain Boundary: Must be STAFF userType
    if (decoded.userType && decoded.userType !== 'STAFF') {
      return res.status(401).json({ success: false, message: 'Invalid token domain for staff authentication.' });
    }
    if (decoded.isCustomer || (decoded.customerId && !decoded.userId)) {
      return res.status(401).json({ success: false, message: 'Invalid token domain for staff authentication.' });
    }

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

    // 1. Enforce Token Type: Must be ACCESS token
    if (decoded.tokenType && decoded.tokenType !== 'ACCESS') {
      return res.status(401).json({ success: false, message: 'Invalid token type for access.' });
    }

    // 2. Enforce Domain Boundary: Must be CUSTOMER userType
    if (decoded.userType && decoded.userType !== 'CUSTOMER') {
      return res.status(401).json({ success: false, message: 'Invalid token domain for customer authentication.' });
    }
    if (decoded.userId && !decoded.customerId && !decoded.isCustomer && decoded.userType !== 'CUSTOMER') {
      return res.status(401).json({ success: false, message: 'Invalid token domain for customer authentication.' });
    }

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

    // 1. Enforce Token Type: Must be ACCESS token
    if (decoded.tokenType && decoded.tokenType !== 'ACCESS') {
      return res.status(401).json({ success: false, message: 'Invalid token type for access.' });
    }

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

    const isStaffToken = decoded.userType === 'STAFF' || (decoded.userId && !decoded.isCustomer && decoded.userType !== 'CUSTOMER');
    const isCustomerToken = decoded.userType === 'CUSTOMER' || decoded.isCustomer || (decoded.customerId && decoded.userType !== 'STAFF');

    if (isStaffToken && decoded.userType !== 'CUSTOMER') {
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
    } else if (isCustomerToken && decoded.userType !== 'STAFF') {
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

/**
 * Optional Authenticator: Populates req.user or req.customer if valid token exists,
 * but allows unauthenticated guest requests to proceed.
 */
export const optionalCustomerOrAdmin = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token && req.cookies) {
      token = req.cookies[COOKIE_NAMES.STAFF_ACCESS] || req.cookies[COOKIE_NAMES.CUSTOMER_ACCESS];
    }

    if (!token) return next();

    const decoded = verifyToken(token);

    // Enforce Token Type: Must be ACCESS token
    if (decoded.tokenType && decoded.tokenType !== 'ACCESS') {
      return next();
    }

    const isStaffToken = decoded.userType === 'STAFF' || (decoded.userId && !decoded.isCustomer && decoded.userType !== 'CUSTOMER');
    const isCustomerToken = decoded.userType === 'CUSTOMER' || decoded.isCustomer || (decoded.customerId && decoded.userType !== 'STAFF');

    if (isStaffToken && decoded.userType !== 'CUSTOMER') {
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
      }
    } else if (isCustomerToken && decoded.userType !== 'STAFF') {
      const customerId = decoded.id || decoded.customerId;
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (customer) {
        req.customer = customer;
      }
    }
  } catch {
    // Ignore invalid/expired tokens for optional authentication
  }
  return next();
};

/**
 * Helper to verify whether an order belongs to a customer.
 * Security Invariant: If order.customerId is present, ownership is strictly order.customerId === customer.id.
 * Mobile/email fallback is ONLY evaluated for guest orders (order.customerId == null).
 */
export const isCustomerOrderOwner = (order, customer) => {
  if (!order || !customer) return false;

  // Authoritative ownership rule: If order has an assigned customerId, it MUST match customer.id.
  if (order.customerId) {
    return order.customerId === customer.id;
  }

  // Guest order fallback (order.customerId is null/undefined): Match mobile or email
  const isPhoneMatch = Boolean(order.customerMobile && customer.mobile && order.customerMobile.trim() === customer.mobile.trim());
  const isEmailMatch = Boolean(order.customerEmail && customer.email && order.customerEmail.trim().toLowerCase() === customer.email.trim().toLowerCase());
  return isPhoneMatch || isEmailMatch;
};

export default {
  authenticateAdmin,
  authenticateCustomer,
  authenticateCustomerOrAdmin,
  optionalCustomerOrAdmin,
  requirePermission,
  isCustomerOrderOwner,
};
