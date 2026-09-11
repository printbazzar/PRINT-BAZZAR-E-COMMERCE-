import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { signToken, verifyToken } from '../config/jwt.js';
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
import { toCustomerSafeOrder } from '../utils/projections.js';
import { getOtpConfig } from '../config/otpConfig.js';
export { authenticateCustomer } from '../middleware/auth.js';

const prisma = new PrismaClient();

// Google ID-token verifier. GOOGLE_CLIENT_ID is loaded by the time this module
// evaluates because customerAuthController.js imports config/jwt.js above,
// which calls dotenv.config() as a side effect during its own module init.
const googleOAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: Generate Customer JWT Token
const generateCustomerToken = (customer) => {
  return signToken(
    {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      accountType: customer.accountType,
      isCustomer: true,
    },
    { expiresIn: '30d' }
  );
};

// POST /api/v1/customer/auth/signup - Register B2C or B2B Corporate Company
export const customerSignup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      mobile,
      whatsapp,
      accountType = 'B2C_RETAIL',
      companyName,
      gstNumber,
      businessPan,
      address,
      city,
      state = 'Tamil Nadu',
      pincode,
    } = req.body;

    if (!name || !email || !password || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and mobile number are required.',
      });
    }

    // Check if customer email already exists
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [{ email: email.trim().toLowerCase() }, { mobile: mobile.trim() }],
      },
    });

    if (existing && existing.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email or mobile already exists. Please login instead.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const isB2B = accountType === 'B2B_CORPORATE';

    let customer;
    if (existing) {
      // Upgrade existing guest customer record to full registered account
      customer = await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name,
          email: email.trim().toLowerCase(),
          passwordHash,
          mobile: mobile.trim(),
          whatsapp: whatsapp || mobile.trim(),
          accountType,
          companyName: isB2B ? (companyName || name) : null,
          gstNumber: isB2B ? gstNumber : null,
          businessPan: isB2B ? businessPan : null,
          corporateDiscountPct: isB2B ? 10.0 : 0,
          isVerifiedCorporate: isB2B,
          address,
          city,
          state,
          pincode,
        },
      });
    } else {
      // Create fresh customer
      customer = await prisma.customer.create({
        data: {
          name,
          email: email.trim().toLowerCase(),
          passwordHash,
          mobile: mobile.trim(),
          whatsapp: whatsapp || mobile.trim(),
          accountType,
          companyName: isB2B ? (companyName || name) : null,
          gstNumber: isB2B ? gstNumber : null,
          businessPan: isB2B ? businessPan : null,
          corporateDiscountPct: isB2B ? 10.0 : 0,
          isVerifiedCorporate: isB2B,
          address,
          city,
          state,
          pincode,
          savedAddresses: address
            ? {
                create: {
                  label: isB2B ? 'Head Office' : 'Primary Residence',
                  recipientName: name,
                  mobile: mobile.trim(),
                  street: address,
                  city: city || 'Tiruchirappalli',
                  state: state || 'Tamil Nadu',
                  pincode: pincode || '620001',
                  isDefault: true,
                },
              }
            : undefined,
        },
      });
    }

    // Create server-tracked AuthSession (15m Access Token + 7d Refresh Token)
    const { accessToken, refreshToken, session } = await createSession({
      userType: 'CUSTOMER',
      customerId: customer.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      payload: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        accountType: customer.accountType,
        isCustomer: true,
      },
    });

    setAuthCookies(res, {
      accessToken,
      refreshToken,
      userType: 'CUSTOMER',
    });

    return res.status(201).json({
      success: true,
      message: isB2B
        ? 'Corporate Company Account registered successfully! Wholesale 10% discount enabled.'
        : 'Customer Account registered successfully!',
      token: accessToken,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        accountType: customer.accountType,
        companyName: customer.companyName,
        gstNumber: customer.gstNumber,
        corporateDiscountPct: customer.corporateDiscountPct,
      },
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Customer signup error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create customer account.' });
  }
};

// POST /api/v1/customer/auth/login - Authenticate Customer (B2C & B2B)
export const customerLogin = async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = (identifier || email || '').trim().toLowerCase();

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Email/Mobile and password are required.' });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ email: loginId }, { mobile: loginId }],
      },
      include: {
        savedAddresses: true,
      },
    });

    if (!customer || !customer.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. If you placed guest orders before, please click "Sign Up" to activate your password.',
      });
    }

    const isMatch = await bcrypt.compare(password, customer.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please retry.' });
    }

    // Create server-tracked AuthSession (15m Access Token + 7d Refresh Token)
    const { accessToken, refreshToken, session } = await createSession({
      userType: 'CUSTOMER',
      customerId: customer.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      payload: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        accountType: customer.accountType,
        isCustomer: true,
      },
    });

    setAuthCookies(res, {
      accessToken,
      refreshToken,
      userType: 'CUSTOMER',
    });

    return res.json({
      success: true,
      message: `Welcome back, ${customer.name}!`,
      token: accessToken,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        whatsapp: customer.whatsapp,
        accountType: customer.accountType,
        companyName: customer.companyName,
        gstNumber: customer.gstNumber,
        businessPan: customer.businessPan,
        corporateDiscountPct: customer.corporateDiscountPct,
        creditLimit: customer.creditLimit,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        savedAddresses: customer.savedAddresses,
      },
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Customer login error:', error);
    return res.status(500).json({ success: false, message: 'Authentication failed.' });
  }
};

/**
 * POST /api/v1/customer/auth/google
 * 1-Click "Continue with Google" Authentication (Zero SMS Gateway Cost)
 * 
 * Supports:
 * - Google Identity Services (GIS) signed JWT credential
 * - Direct validated OAuth profile payload { email, name, googleId, avatarUrl }
 */
export const customerGoogleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required.',
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('[Google Auth] GOOGLE_CLIENT_ID is not configured on the server.');
      return res.status(503).json({
        success: false,
        message: 'Google Sign-In is temporarily unavailable. Please use email or mobile sign-in.',
      });
    }

    // Cryptographically verify the Google ID token: signature, issuer, audience,
    // and expiry are all checked by verifyIdToken() against Google's published keys.
    let payload;
    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.warn('Google ID token verification failed:', verifyErr.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Google authentication token.',
      });
    }

    if (!payload || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({
        success: false,
        message: 'Google account email is not verified.',
      });
    }

    const googleUser = {
      email: payload.email.toLowerCase().trim(),
      name: payload.name || payload.given_name || payload.email.split('@')[0],
      googleId: payload.sub,
      avatarUrl: payload.picture || null,
    };

    // Look up customer by googleId or email
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          ...(googleUser.googleId ? [{ googleId: googleUser.googleId }] : []),
          { email: googleUser.email },
        ],
      },
      include: { savedAddresses: true },
    });

    if (customer) {
      // Update Google metadata if newly linked or avatar changed
      const updateData = {};
      if (!customer.googleId && googleUser.googleId) updateData.googleId = googleUser.googleId;
      if (!customer.avatarUrl && googleUser.avatarUrl) updateData.avatarUrl = googleUser.avatarUrl;
      if (!customer.name && googleUser.name) updateData.name = googleUser.name;

      if (Object.keys(updateData).length > 0) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: updateData,
          include: { savedAddresses: true },
        });
      }
    } else {
      // Create fresh customer account with zero SMS fee
      customer = await prisma.customer.create({
        data: {
          name: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.googleId,
          avatarUrl: googleUser.avatarUrl,
          mobile: '', // Filled during checkout or in profile
          accountType: 'B2C_RETAIL',
        },
        include: { savedAddresses: true },
      });
    }

    // Create server-tracked AuthSession (15m Access Token + 7d Refresh Token)
    const { accessToken, refreshToken, session } = await createSession({
      userType: 'CUSTOMER',
      customerId: customer.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      payload: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        accountType: customer.accountType,
        isCustomer: true,
      },
    });

    setAuthCookies(res, {
      accessToken,
      refreshToken,
      userType: 'CUSTOMER',
    });

    return res.json({
      success: true,
      message: `Welcome, ${customer.name}! Successfully signed in with Google.`,
      token: accessToken,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        whatsapp: customer.whatsapp,
        avatarUrl: customer.avatarUrl,
        accountType: customer.accountType,
        companyName: customer.companyName,
        gstNumber: customer.gstNumber,
        corporateDiscountPct: customer.corporateDiscountPct,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        savedAddresses: customer.savedAddresses || [],
      },
      sessionId: session?.id,
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ success: false, message: 'Google authentication failed.' });
  }
};

/**
 * Rotate Customer Refresh Token & Issue New Access Token
 * POST /api/v1/customer/auth/refresh
 */
export const customerRefreshToken = async (req, res) => {
  try {
    const rawRefreshToken =
      req.cookies?.[COOKIE_NAMES.CUSTOMER_REFRESH] ||
      req.body?.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        code: 'NO_REFRESH_TOKEN',
        message: 'No refresh token provided. Please log in again.',
      });
    }

    const { accessToken, refreshToken, customer } = await rotateRefreshSession({
      rawRefreshToken,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    setAuthCookies(res, {
      accessToken,
      refreshToken,
      userType: 'CUSTOMER',
    });

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: accessToken,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        accountType: customer.accountType,
        companyName: customer.companyName,
      },
    });
  } catch (error) {
    clearAuthCookies(res, 'CUSTOMER');
    return res.status(401).json({
      success: false,
      code: 'REFRESH_FAILED',
      message: error.message || 'Failed to refresh session. Please login again.',
    });
  }
};

/**
 * Customer Logout - Revoke Active Session in DB and Clear Cookies
 * POST /api/v1/customer/auth/logout
 */
export const customerLogout = async (req, res) => {
  try {
    const sessionId = req.sessionId || req.body?.sessionId;
    if (sessionId) {
      await revokeSession(sessionId, 'CUSTOMER_LOGOUT');
    }

    clearAuthCookies(res, 'CUSTOMER');

    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    clearAuthCookies(res, 'CUSTOMER');
    return res.status(500).json({ success: false, message: 'Error during logout.' });
  }
};

// GET /api/v1/customer/account/profile - Customer Dashboard Overview
export const getCustomerProfile = async (req, res) => {
  try {
    const customer = req.customer;

    // Fetch customer's orders
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: customer.id },
          ...(customer.email ? [{ customerEmail: customer.email }] : []),
          { customerMobile: customer.mobile },
        ],
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, thumbnailUrl: true, slug: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeOrders = orders.filter((o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED');
    const totalSpend = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    return res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          mobile: customer.mobile,
          whatsapp: customer.whatsapp,
          accountType: customer.accountType,
          companyName: customer.companyName,
          gstNumber: customer.gstNumber,
          businessPan: customer.businessPan,
          corporateDiscountPct: customer.corporateDiscountPct,
          creditLimit: customer.creditLimit,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode,
          savedAddresses: customer.savedAddresses,
        },
        stats: {
          totalOrdersCount: orders.length,
          activeOrdersCount: activeOrders.length,
          totalSpend,
        },
        recentOrders: orders.slice(0, 5).map((o) => toCustomerSafeOrder(o, { isOwner: true })),
      },
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer profile.' });
  }
};

// GET /api/v1/customer/account/orders - Customer Complete Orders History
export const getCustomerOrders = async (req, res) => {
  try {
    const customer = req.customer;

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: customer.id },
          ...(customer.email ? [{ customerEmail: customer.email }] : []),
          { customerMobile: customer.mobile },
        ],
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, thumbnailUrl: true, slug: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
        shipments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const safeOrders = orders.map((o) => toCustomerSafeOrder(o, { isOwner: true }));

    return res.json({
      success: true,
      data: safeOrders,
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer orders.' });
  }
};

// POST /api/v1/customer/account/addresses - Add Saved Delivery Address
export const addCustomerAddress = async (req, res) => {
  try {
    const customer = req.customer;
    const { label, recipientName, mobile, street, city, state = 'Tamil Nadu', pincode, isDefault } = req.body;

    if (!recipientName || !street || !pincode) {
      return res.status(400).json({ success: false, message: 'Recipient name, street address, and pincode are required.' });
    }

    if (isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: label || 'Branch Address',
        recipientName,
        mobile: mobile || customer.mobile,
        street,
        city: city || 'Tiruchirappalli',
        state,
        pincode,
        isDefault: !!isDefault,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Address saved successfully!',
      address: newAddress,
    });
  } catch (error) {
    console.error('Error adding customer address:', error);
    return res.status(500).json({ success: false, message: 'Failed to save address.' });
  }
};

// POST /api/v1/customer/account/reorder/:orderId - 1-Click Repeat Order
export const reorderPreviousOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const previousOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!previousOrder) {
      return res.status(404).json({ success: false, message: 'Previous order not found.' });
    }

    // Return cart items payload ready for checkout
    const reorderItems = previousOrder.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedOptions: JSON.parse(item.optionsSnapshot || '{}'),
      designRequired: item.designRequired,
      artworkFileUrl: item.artworkFileUrl,
      productName: item.productNameSnapshot,
      sku: item.skuSnapshot,
    }));

    return res.json({
      success: true,
      message: 'Previous order items ready for 1-click repeat order!',
      items: reorderItems,
      previousOrderNumber: previousOrder.orderNumber,
    });
  } catch (error) {
    console.error('Reorder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reorder.' });
  }
};

/**
 * POST /api/v1/customer/auth/send-otp
 * Generates and sends a 6-digit OTP to customer mobile
 */
export const sendCustomerOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || String(mobile).trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required.' });
    }

    const otpConfig = getOtpConfig();
    const isProduction = otpConfig.isProd;

    // Resilient Strategy: If OTP provider is disabled or unavailable
    if (!otpConfig.enabled || !otpConfig.isAvailable) {
      if (otpConfig.required) {
        // Enforce OTP only if explicitly configured as mandatory via MOBILE_OTP_REQUIRED=true
        return res.status(503).json({
          success: false,
          code: 'OTP_SERVICE_UNAVAILABLE',
          message: 'Mobile OTP verification service is currently unavailable. Please sign in using "Continue with Google" or email.',
          isOtpRequired: true,
          guestAllowed: false,
          alternativeAuth: ['GOOGLE', 'EMAIL'],
        });
      }

      // Safe temporary strategy (MOBILE_OTP_REQUIRED=false):
      // Do NOT permanently block checkout when provider is unconfigured.
      // Explain that mobile OTP is optional and allow customer to continue with details or Google/Email.
      return res.json({
        success: false,
        code: 'OTP_OPTIONAL',
        message: 'Mobile OTP verification is currently optional. You may proceed directly to checkout without OTP, or sign in with Google/Email.',
        isOtpRequired: false,
        guestAllowed: true,
        alternativeAuth: ['GOOGLE', 'EMAIL', 'GUEST'],
      });
    }

    const cleanMobile = String(mobile).trim().replace(/[^0-9]/g, '').slice(-10);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let customer = await prisma.customer.findFirst({
      where: { mobile: cleanMobile },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: `Customer ${cleanMobile.slice(-4)}`,
          mobile: cleanMobile,
          otpCode,
          otpExpiresAt,
        },
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { otpCode, otpExpiresAt },
      });
    }

    // In non-production or simulator mode, log test OTP for automated testing and dev verification
    if (!isProduction || otpConfig.provider === 'SIMULATOR') {
      console.log(`[AUTH OTP - TEST MODE] Generated OTP for mobile ${cleanMobile}: ${otpCode}`);
    }

    return res.json({
      success: true,
      message: `OTP sent successfully to +91 ${cleanMobile}`,
      mobile: cleanMobile,
      devOtp: !isProduction || otpConfig.provider === 'SIMULATOR' ? otpCode : undefined,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate verification OTP.' });
  }
};

/**
 * POST /api/v1/customer/auth/verify-otp
 * Verifies mobile OTP and issues Customer AuthSession
 */
export const verifyCustomerOtp = async (req, res) => {
  try {
    const { mobile, otp, name } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP are required.' });
    }

    const cleanMobile = String(mobile).trim().replace(/[^0-9]/g, '').slice(-10);
    const customer = await prisma.customer.findFirst({
      where: { mobile: cleanMobile },
      include: { savedAddresses: true },
    });

    if (!customer || !customer.otpCode) {
      return res.status(400).json({ success: false, message: 'No OTP requested for this mobile number.' });
    }

    if (new Date() > new Date(customer.otpExpiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const inputOtp = String(otp).trim();

    // Strict OTP validation:
    // In production, MUST match customer.otpCode strictly.
    // In non-production, allow matching customer.otpCode OR '123456' for development & automated testing.
    const isRealOtpMatch = Boolean(customer.otpCode && customer.otpCode === inputOtp);
    const isDevTestBypass = !isProduction && inputOtp === '123456';

    if (!isRealOtpMatch && !isDevTestBypass) {
      return res.status(400).json({ success: false, message: 'Invalid verification OTP code.' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        name: name && name.trim() ? name.trim() : customer.name,
      },
      include: { savedAddresses: true },
    });

    const { accessToken, refreshToken, session } = await createSession({
      userType: 'CUSTOMER',
      customerId: updatedCustomer.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      payload: {
        id: updatedCustomer.id,
        email: updatedCustomer.email,
        name: updatedCustomer.name,
        accountType: updatedCustomer.accountType,
        isCustomer: true,
      },
    });

    setAuthCookies(res, {
      accessToken,
      refreshToken,
      userType: 'CUSTOMER',
    });

    return res.json({
      success: true,
      message: `Welcome, ${updatedCustomer.name}! Verified successfully.`,
      token: accessToken,
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        mobile: updatedCustomer.mobile,
        whatsapp: updatedCustomer.whatsapp,
        accountType: updatedCustomer.accountType,
        companyName: updatedCustomer.companyName,
        gstNumber: updatedCustomer.gstNumber,
        corporateDiscountPct: updatedCustomer.corporateDiscountPct,
        address: updatedCustomer.address,
        city: updatedCustomer.city,
        state: updatedCustomer.state,
        pincode: updatedCustomer.pincode,
        savedAddresses: updatedCustomer.savedAddresses,
      },
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
  }
};

