import { PrismaClient } from '@prisma/client';
import { DEFAULT_FOOTER_SETTINGS } from '../utils/footerDefaults.js';
import { validateAndSanitizeFooterPayload } from '../utils/footerValidator.js';

const prisma = new PrismaClient();

// In-memory cache for public footer (TTL: 60 seconds)
let cachedPublicFooter = null;
let cacheExpiry = 0;

const invalidateFooterCache = () => {
  cachedPublicFooter = null;
  cacheExpiry = 0;
};

// Helper for audit logs
const recordAudit = async (userId, action, oldValues, newValues, req) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityName: 'FooterSettings',
        entityId: 'WEBSITE_FOOTER_SETTINGS',
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ipAddress: req?.ip || req?.headers['x-forwarded-for'] || null,
      },
    });
  } catch (err) {
    console.error('Failed to log footer audit:', err);
  }
};

/**
 * 1. Public Footer Endpoint: GET /api/v1/settings/footer
 * Returns complete, structured footer data merged with live categories from the DB.
 */
export const getPublicFooter = async (req, res) => {
  try {
    const now = Date.now();
    if (cachedPublicFooter && now < cacheExpiry) {
      return res.json({ success: true, data: cachedPublicFooter, cached: true });
    }

    // 1. Fetch raw footer settings from StoreSetting
    const storedSetting = await prisma.storeSetting.findUnique({
      where: { key: 'WEBSITE_FOOTER_SETTINGS' },
    });

    let settings = { ...DEFAULT_FOOTER_SETTINGS };
    if (storedSetting?.value) {
      try {
        const parsed = JSON.parse(storedSetting.value);
        settings = {
          ...DEFAULT_FOOTER_SETTINGS,
          ...parsed,
          brand: { ...DEFAULT_FOOTER_SETTINGS.brand, ...(parsed.brand || {}) },
          contact: { ...DEFAULT_FOOTER_SETTINGS.contact, ...(parsed.contact || {}) },
          whatsapp: { ...DEFAULT_FOOTER_SETTINGS.whatsapp, ...(parsed.whatsapp || {}) },
          categorySettings: { ...DEFAULT_FOOTER_SETTINGS.categorySettings, ...(parsed.categorySettings || {}) },
          seo: { ...DEFAULT_FOOTER_SETTINGS.seo, ...(parsed.seo || {}) },
          copyright: { ...DEFAULT_FOOTER_SETTINGS.copyright, ...(parsed.copyright || {}) },
        };
      } catch (e) {
        console.error('Error parsing stored footer settings:', e);
      }
    }

    // 2. Dynamically fetch active categories from the database
    const dbCategories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        displayOrder: true,
      },
    });

    // 3. Process category list based on admin overrides & maxCategories
    const overrides = settings.categorySettings?.categoryOverrides || [];
    const maxCount = settings.categorySettings?.maxCategories || 8;

    const processedCategories = dbCategories
      .map((cat) => {
        const override = overrides.find((o) => o.slug === cat.slug);
        if (override && override.isEnabled === false) {
          return null; // explicitly hidden by admin
        }
        return {
          id: cat.id,
          name: override?.customLabel?.trim() || cat.name,
          slug: cat.slug,
          url: `/category/${cat.slug}`,
          order: override?.order !== undefined ? override.order : cat.displayOrder,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order)
      .slice(0, maxCount);

    // 4. Construct complete response payload
    const footerData = {
      brand: settings.brand,
      contact: settings.contact,
      whatsapp: settings.whatsapp,
      categories: {
        title: settings.categorySettings?.title || 'SHOP BY CATEGORY',
        items: processedCategories,
        showAllLink: settings.categorySettings?.showAllLink !== false,
        allLinkText: settings.categorySettings?.allLinkText || 'Browse All Collections ➔',
        allLinkUrl: settings.categorySettings?.allLinkUrl || '/shop',
      },
      supportLinks: (settings.supportLinks || [])
        .filter((l) => l.isEnabled)
        .sort((a, b) => a.order - b.order),
      businessLinks: (settings.businessLinks || [])
        .filter((l) => l.isEnabled)
        .sort((a, b) => a.order - b.order),
      legalLinks: (settings.legalLinks || [])
        .filter((l) => l.isEnabled)
        .sort((a, b) => a.order - b.order),
      trustBadges: (settings.trustBadges || [])
        .filter((b) => b.isEnabled)
        .sort((a, b) => a.order - b.order),
      paymentMethods: (settings.paymentMethods || [])
        .filter((p) => p.isEnabled)
        .sort((a, b) => a.order - b.order),
      seo: settings.seo,
      copyright: {
        ...settings.copyright,
        currentYear: new Date().getFullYear(),
      },
    };

    // Cache for 60 seconds
    cachedPublicFooter = footerData;
    cacheExpiry = now + 60 * 1000;

    return res.json({ success: true, data: footerData });
  } catch (error) {
    console.error('Error fetching public footer:', error);
    // Graceful fallback to default footer
    return res.json({
      success: true,
      data: {
        ...DEFAULT_FOOTER_SETTINGS,
        categories: {
          title: 'SHOP BY CATEGORY',
          items: [
            { name: 'Business Cards', slug: 'business-cards', url: '/category/business-cards' },
            { name: 'Stickers & Labels', slug: 'stickers-and-labels', url: '/category/stickers-and-labels' },
            { name: 'Marketing Collateral', slug: 'marketing-and-promotionals-items', url: '/category/marketing-and-promotionals-items' },
            { name: 'Business Stationery', slug: 'business-essentials', url: '/category/business-essentials' },
            { name: 'Invitations', slug: 'invitations', url: '/category/invitations' },
            { name: 'Packaging', slug: 'packaging-items', url: '/category/packaging-items' },
          ],
          showAllLink: true,
          allLinkText: 'Browse All Collections ➔',
          allLinkUrl: '/shop',
        },
        copyright: {
          ...DEFAULT_FOOTER_SETTINGS.copyright,
          currentYear: new Date().getFullYear(),
        },
      },
      fallback: true,
    });
  }
};

/**
 * 2. Admin Footer Settings Endpoint: GET /api/v1/admin/settings/footer
 * Returns raw settings along with all categories so admin can configure everything.
 */
export const getAdminFooter = async (req, res) => {
  try {
    const [storedSetting, allCategories] = await Promise.all([
      prisma.storeSetting.findUnique({
        where: { key: 'WEBSITE_FOOTER_SETTINGS' },
      }),
      prisma.category.findMany({
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          displayOrder: true,
        },
      }),
    ]);

    let settings = { ...DEFAULT_FOOTER_SETTINGS };
    if (storedSetting?.value) {
      try {
        const parsed = JSON.parse(storedSetting.value);
        settings = {
          ...DEFAULT_FOOTER_SETTINGS,
          ...parsed,
          brand: { ...DEFAULT_FOOTER_SETTINGS.brand, ...(parsed.brand || {}) },
          contact: { ...DEFAULT_FOOTER_SETTINGS.contact, ...(parsed.contact || {}) },
          whatsapp: { ...DEFAULT_FOOTER_SETTINGS.whatsapp, ...(parsed.whatsapp || {}) },
          categorySettings: { ...DEFAULT_FOOTER_SETTINGS.categorySettings, ...(parsed.categorySettings || {}) },
          seo: { ...DEFAULT_FOOTER_SETTINGS.seo, ...(parsed.seo || {}) },
          copyright: { ...DEFAULT_FOOTER_SETTINGS.copyright, ...(parsed.copyright || {}) },
        };
      } catch (e) {
        console.error('Error parsing admin footer settings:', e);
      }
    }

    return res.json({
      success: true,
      data: {
        settings,
        allCategories,
      },
    });
  } catch (error) {
    console.error('Error loading admin footer settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to load footer settings.' });
  }
};

/**
 * 3. Update Admin Footer Settings: PUT /api/v1/admin/settings/footer
 * Validates, sanitizes and updates footer configuration in StoreSetting.
 */
export const updateAdminFooter = async (req, res) => {
  try {
    // Validate and sanitize input payload
    const sanitizedSettings = validateAndSanitizeFooterPayload(req.body);

    // Get old settings for audit log
    const existing = await prisma.storeSetting.findUnique({
      where: { key: 'WEBSITE_FOOTER_SETTINGS' },
    });
    let oldValues = null;
    if (existing?.value) {
      try {
        oldValues = JSON.parse(existing.value);
      } catch {}
    }

    // Persist in DB
    const saved = await prisma.storeSetting.upsert({
      where: { key: 'WEBSITE_FOOTER_SETTINGS' },
      update: {
        value: JSON.stringify(sanitizedSettings),
      },
      create: {
        key: 'WEBSITE_FOOTER_SETTINGS',
        value: JSON.stringify(sanitizedSettings),
        description: 'Dynamic website footer navigation, brand, contact and legal settings',
      },
    });

    // Invalidate public cache
    invalidateFooterCache();

    // Record audit event
    await recordAudit(req.user?.id, 'UPDATE_FOOTER_SETTINGS', oldValues, sanitizedSettings, req);

    return res.json({
      success: true,
      message: 'Website footer settings updated successfully.',
      data: sanitizedSettings,
    });
  } catch (error) {
    console.error('Error updating footer settings:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update footer settings.',
    });
  }
};

/**
 * 4. Reset Admin Footer Settings: POST /api/v1/admin/settings/footer/reset
 * Resets footer settings back to standard Print Bazzar defaults.
 */
export const resetAdminFooter = async (req, res) => {
  try {
    const existing = await prisma.storeSetting.findUnique({
      where: { key: 'WEBSITE_FOOTER_SETTINGS' },
    });
    let oldValues = null;
    if (existing?.value) {
      try {
        oldValues = JSON.parse(existing.value);
      } catch {}
    }

    await prisma.storeSetting.upsert({
      where: { key: 'WEBSITE_FOOTER_SETTINGS' },
      update: {
        value: JSON.stringify(DEFAULT_FOOTER_SETTINGS),
      },
      create: {
        key: 'WEBSITE_FOOTER_SETTINGS',
        value: JSON.stringify(DEFAULT_FOOTER_SETTINGS),
        description: 'Dynamic website footer navigation, brand, contact and legal settings',
      },
    });

    invalidateFooterCache();

    await recordAudit(req.user?.id, 'RESET_FOOTER_SETTINGS', oldValues, DEFAULT_FOOTER_SETTINGS, req);

    return res.json({
      success: true,
      message: 'Footer settings have been reset to factory defaults.',
      data: DEFAULT_FOOTER_SETTINGS,
    });
  } catch (error) {
    console.error('Error resetting footer settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset footer settings.' });
  }
};
