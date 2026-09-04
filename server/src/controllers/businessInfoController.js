import { PrismaClient } from '@prisma/client';
import { DEFAULT_BUSINESS_INFO } from '../utils/businessInfoDefaults.js';
import { validateAndSanitizeBusinessInfo } from '../utils/businessInfoValidator.js';

const prisma = new PrismaClient();

const SETTING_KEY = 'BUSINESS_INFORMATION_SETTINGS';

// In-memory cache for fast public responses
let cachedBusinessInfo = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export const clearBusinessInfoCache = () => {
  cachedBusinessInfo = null;
  lastCacheTime = 0;
};

/**
 * Retrieve raw or default business info from StoreSetting table
 */
export async function getStoredBusinessInfo() {
  try {
    const record = await prisma.storeSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (!record || !record.value) {
      return DEFAULT_BUSINESS_INFO;
    }

    const parsed = JSON.parse(record.value);
    // Merge with defaults in case new fields were added
    const validated = validateAndSanitizeBusinessInfo(parsed, DEFAULT_BUSINESS_INFO);
    return validated.data;
  } catch (err) {
    console.error('Failed to load business info from DB, using fallback defaults:', err);
    return DEFAULT_BUSINESS_INFO;
  }
}

/**
 * Public GET: /api/v1/settings/business-info
 * Returns sanitized business information suitable for public storefront display
 */
export const getPublicBusinessInfo = async (req, res) => {
  try {
    const now = Date.now();
    if (cachedBusinessInfo && now - lastCacheTime < CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT');
      return res.json({ success: true, data: cachedBusinessInfo });
    }

    const data = await getStoredBusinessInfo();
    cachedBusinessInfo = data;
    lastCacheTime = now;

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching public business info:', error);
    // Always return fallback default so public client never crashes
    return res.json({ success: true, data: DEFAULT_BUSINESS_INFO });
  }
};

/**
 * Admin GET: /api/v1/admin/settings/business-info
 * Returns full configuration including validation requirements and flags
 */
export const getAdminBusinessInfo = async (req, res) => {
  try {
    const data = await getStoredBusinessInfo();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getAdminBusinessInfo:', error);
    return res.status(500).json({ success: false, message: 'Failed to load business settings.' });
  }
};

/**
 * Admin PUT: /api/v1/admin/settings/business-info
 * Updates settings with validation, XSS sanitization, and audit logging
 */
export const updateAdminBusinessInfo = async (req, res) => {
  try {
    const current = await getStoredBusinessInfo();
    const validation = validateAndSanitizeBusinessInfo(req.body, current);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0] || 'Validation error in business information.',
        errors: validation.errors
      });
    }

    const sanitizedData = validation.data;

    // Persist to StoreSetting table
    await prisma.storeSetting.upsert({
      where: { key: SETTING_KEY },
      update: {
        value: JSON.stringify(sanitizedData),
        description: 'Print Bazzar official centralized business information and compliance profile',
      },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(sanitizedData),
        description: 'Print Bazzar official centralized business information and compliance profile',
      },
    });

    // Invalidate caches
    clearBusinessInfoCache();

    // Also sync flat legacy fields in StoreSetting for backward compatibility
    try {
      await prisma.storeSetting.upsert({
        where: { key: 'STORE_NAME' },
        update: { value: sanitizedData.brand.brandName },
        create: { key: 'STORE_NAME', value: sanitizedData.brand.brandName },
      });
      await prisma.storeSetting.upsert({
        where: { key: 'STORE_EMAIL' },
        update: { value: sanitizedData.contact.supportEmail },
        create: { key: 'STORE_EMAIL', value: sanitizedData.contact.supportEmail },
      });
      await prisma.storeSetting.upsert({
        where: { key: 'STORE_PHONE' },
        update: { value: sanitizedData.contact.primaryPhone },
        create: { key: 'STORE_PHONE', value: sanitizedData.contact.primaryPhone },
      });
      await prisma.storeSetting.upsert({
        where: { key: 'STORE_ADDRESS' },
        update: { value: sanitizedData.address.fullDisplayAddress },
        create: { key: 'STORE_ADDRESS', value: sanitizedData.address.fullDisplayAddress },
      });
      if (sanitizedData.tax.gstin) {
        await prisma.storeSetting.upsert({
          where: { key: 'GST_NUMBER' },
          update: { value: sanitizedData.tax.gstin },
          create: { key: 'GST_NUMBER', value: sanitizedData.tax.gstin },
        });
      }
    } catch (syncErr) {
      console.warn('Warning: Failed syncing flat store setting fallbacks:', syncErr);
    }

    // Record audit log
    try {
      const adminId = req.user?.id || req.admin?.id || null;
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'UPDATE_BUSINESS_INFO_SETTINGS',
          entityName: 'StoreSetting',
          entityId: SETTING_KEY,
          oldValues: JSON.stringify({ brandName: current.brand?.brandName, gstin: current.tax?.gstin }),
          newValues: JSON.stringify({ brandName: sanitizedData.brand?.brandName, gstin: sanitizedData.tax?.gstin }),
          ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        },
      });
    } catch (auditErr) {
      console.error('Audit log failed for business info update:', auditErr);
    }

    return res.json({
      success: true,
      message: 'Business information settings updated successfully.',
      data: sanitizedData,
    });
  } catch (error) {
    console.error('Error in updateAdminBusinessInfo:', error);
    return res.status(500).json({ success: false, message: 'Failed to save business settings.' });
  }
};

/**
 * Admin POST: /api/v1/admin/settings/business-info/reset
 * Resets settings back to defaults
 */
export const resetAdminBusinessInfo = async (req, res) => {
  try {
    await prisma.storeSetting.upsert({
      where: { key: SETTING_KEY },
      update: {
        value: JSON.stringify(DEFAULT_BUSINESS_INFO),
        description: 'Print Bazzar official centralized business information and compliance profile',
      },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(DEFAULT_BUSINESS_INFO),
        description: 'Print Bazzar official centralized business information and compliance profile',
      },
    });

    clearBusinessInfoCache();

    return res.json({
      success: true,
      message: 'Business information settings have been reset to defaults.',
      data: DEFAULT_BUSINESS_INFO,
    });
  } catch (error) {
    console.error('Error in resetAdminBusinessInfo:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset business settings.' });
  }
};
