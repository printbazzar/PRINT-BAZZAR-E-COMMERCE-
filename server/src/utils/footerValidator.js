/**
 * Security & Input Validation for Footer Settings
 * Enforces URL protocol safety and sanitizes text inputs against XSS.
 */

// Disallowed dangerous URL schemes
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'blob:',
];

/**
 * Validates whether a URL is safe.
 * Safe URLs:
 * - Relative URLs starting with '/' or '#' (e.g. '/track-order', '/contact-us#faq')
 * - Full URLs starting with http://, https://, mailto:, tel:, whatsapp://
 */
export function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return true; // empty string allowed if optional
  const trimmed = url.trim().toLowerCase();

  for (const proto of DANGEROUS_PROTOCOLS) {
    if (trimmed.startsWith(proto)) {
      return false;
    }
  }

  // Check for encoded or spaced attempts (e.g. "java script:", "jav&#x09;ascript:")
  const normalized = trimmed.replace(/[\s\r\n\t]/g, '');
  for (const proto of DANGEROUS_PROTOCOLS) {
    if (normalized.startsWith(proto)) {
      return false;
    }
  }

  // Must start with '/' or '#', or valid protocol
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('whatsapp:')
  ) {
    return true;
  }

  // Reject anything else
  return false;
}

/**
 * Basic HTML / script tag sanitizer for plain text fields.
 * Prevents stored XSS in descriptions, titles, and labels.
 */
export function sanitizeText(str, maxLength = 1000) {
  if (!str || typeof str !== 'string') return '';
  let clean = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .trim();

  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  return clean;
}

/**
 * Validates and cleans the entire footer payload submitted by Admin.
 * Throws an Error with descriptive message if validation fails.
 */
export function validateAndSanitizeFooterPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Footer settings must be an object.');
  }

  const sanitized = {};

  // 1. Brand
  if (payload.brand) {
    sanitized.brand = {
      companyName: sanitizeText(payload.brand.companyName || 'PRINT BAZZAR', 100),
      tagline: sanitizeText(payload.brand.tagline || '', 150),
      description: sanitizeText(payload.brand.description || '', 500),
      logoUrl: isSafeUrl(payload.brand.logoUrl) ? payload.brand.logoUrl : '/assets/images/logo_white.png',
      socialLinks: Array.isArray(payload.brand.socialLinks)
        ? payload.brand.socialLinks.map((item) => {
            if (!isSafeUrl(item.url)) {
              throw new Error(`Unsafe URL detected in social media link: "${item.platform}". JavaScript and data URLs are strictly forbidden.`);
            }
            return {
              platform: sanitizeText(item.platform, 30),
              label: sanitizeText(item.label, 50),
              url: item.url ? item.url.trim() : '',
              isEnabled: Boolean(item.isEnabled),
            };
          })
        : [],
    };
  }

  // 2. Contact
  if (payload.contact) {
    if (payload.contact.googleMapsUrl && !isSafeUrl(payload.contact.googleMapsUrl)) {
      throw new Error('Unsafe Google Maps URL detected. Please provide a valid http or https link.');
    }
    sanitized.contact = {
      companyName: sanitizeText(payload.contact.companyName, 100),
      address: sanitizeText(payload.contact.address, 200),
      city: sanitizeText(payload.contact.city, 60),
      state: sanitizeText(payload.contact.state, 60),
      country: sanitizeText(payload.contact.country, 60),
      pincode: sanitizeText(payload.contact.pincode, 20),
      primaryPhone: sanitizeText(payload.contact.primaryPhone, 30),
      secondaryPhone: sanitizeText(payload.contact.secondaryPhone, 30),
      supportEmail: sanitizeText(payload.contact.supportEmail, 100),
      salesEmail: sanitizeText(payload.contact.salesEmail, 100),
      workingDays: sanitizeText(payload.contact.workingDays, 60),
      openingTime: sanitizeText(payload.contact.openingTime, 30),
      closingTime: sanitizeText(payload.contact.closingTime, 30),
      sundayHours: sanitizeText(payload.contact.sundayHours, 60),
      googleMapsUrl: payload.contact.googleMapsUrl ? payload.contact.googleMapsUrl.trim() : '',
    };
  }

  // 3. WhatsApp
  if (payload.whatsapp) {
    sanitized.whatsapp = {
      isEnabled: Boolean(payload.whatsapp.isEnabled),
      phoneNumber: sanitizeText(payload.whatsapp.phoneNumber, 30),
      displayNumber: sanitizeText(payload.whatsapp.displayNumber, 30),
      buttonText: sanitizeText(payload.whatsapp.buttonText || 'Chat with us on WhatsApp', 100),
      defaultMessage: sanitizeText(payload.whatsapp.defaultMessage || '', 300),
      contextualMessages: payload.whatsapp.contextualMessages
        ? {
            orderSupport: sanitizeText(payload.whatsapp.contextualMessages.orderSupport || '', 300),
            productEnquiry: sanitizeText(payload.whatsapp.contextualMessages.productEnquiry || '', 300),
            bulkOrder: sanitizeText(payload.whatsapp.contextualMessages.bulkOrder || '', 300),
            corporate: sanitizeText(payload.whatsapp.contextualMessages.corporate || '', 300),
          }
        : {},
    };
  }

  // 4. Category Settings
  if (payload.categorySettings) {
    if (payload.categorySettings.allLinkUrl && !isSafeUrl(payload.categorySettings.allLinkUrl)) {
      throw new Error('Unsafe URL in category settings allLinkUrl.');
    }
    sanitized.categorySettings = {
      title: sanitizeText(payload.categorySettings.title || 'SHOP BY CATEGORY', 60),
      maxCategories: Math.max(1, Math.min(parseInt(payload.categorySettings.maxCategories, 10) || 8, 24)),
      showAllLink: Boolean(payload.categorySettings.showAllLink),
      allLinkText: sanitizeText(payload.categorySettings.allLinkText || 'Browse All Collections ➔', 50),
      allLinkUrl: payload.categorySettings.allLinkUrl ? payload.categorySettings.allLinkUrl.trim() : '/shop',
      categoryOverrides: Array.isArray(payload.categorySettings.categoryOverrides)
        ? payload.categorySettings.categoryOverrides.map((ov) => ({
            slug: sanitizeText(ov.slug, 100),
            customLabel: sanitizeText(ov.customLabel, 80),
            isEnabled: Boolean(ov.isEnabled),
            order: parseInt(ov.order, 10) || 0,
          }))
        : [],
    };
  }

  // Helper for Link Groups (supportLinks, businessLinks, legalLinks)
  const sanitizeLinkGroup = (links, groupName) => {
    if (!Array.isArray(links)) return [];
    return links.map((link, idx) => {
      if (!isSafeUrl(link.url)) {
        throw new Error(`Unsafe URL detected in ${groupName} link: "${link.label}". JavaScript and data URLs are forbidden.`);
      }
      return {
        id: link.id || `${groupName.substring(0, 4)}-${Date.now()}-${idx}`,
        label: sanitizeText(link.label, 80),
        url: link.url ? link.url.trim() : '/',
        isEnabled: Boolean(link.isEnabled),
        order: parseInt(link.order, 10) || idx + 1,
        isExternal: Boolean(link.isExternal),
      };
    });
  };

  if (payload.supportLinks) {
    sanitized.supportLinks = sanitizeLinkGroup(payload.supportLinks, 'supportLinks');
  }

  if (payload.businessLinks) {
    sanitized.businessLinks = sanitizeLinkGroup(payload.businessLinks, 'businessLinks');
  }

  if (payload.legalLinks) {
    sanitized.legalLinks = sanitizeLinkGroup(payload.legalLinks, 'legalLinks');
  }

  // 8. Trust Badges
  if (Array.isArray(payload.trustBadges)) {
    sanitized.trustBadges = payload.trustBadges.map((badge, idx) => ({
      id: badge.id || `trust-${idx + 1}`,
      icon: sanitizeText(badge.icon, 40),
      title: sanitizeText(badge.title, 60),
      description: sanitizeText(badge.description, 120),
      isEnabled: Boolean(badge.isEnabled),
      order: parseInt(badge.order, 10) || idx + 1,
    }));
  }

  // 9. Payment Methods
  if (Array.isArray(payload.paymentMethods)) {
    sanitized.paymentMethods = payload.paymentMethods.map((pay, idx) => ({
      id: pay.id || `pay-${idx + 1}`,
      code: sanitizeText(pay.code, 30),
      label: sanitizeText(pay.label, 60),
      isEnabled: Boolean(pay.isEnabled),
      order: parseInt(pay.order, 10) || idx + 1,
    }));
  }

  // 10. SEO
  if (payload.seo) {
    sanitized.seo = {
      isEnabled: Boolean(payload.seo.isEnabled),
      text: sanitizeText(payload.seo.text, 600),
      maxCharLimit: parseInt(payload.seo.maxCharLimit, 10) || 500,
    };
  }

  // 11. Copyright
  if (payload.copyright) {
    sanitized.copyright = {
      text: sanitizeText(payload.copyright.text || 'Print Bazzar. All Rights Reserved.', 120),
      madeInIndiaText: sanitizeText(payload.copyright.madeInIndiaText || '', 100),
      showGstin: Boolean(payload.copyright.showGstin),
      gstin: sanitizeText(payload.copyright.gstin, 30),
      companyRegNumber: sanitizeText(payload.copyright.companyRegNumber, 50),
      poweredByText: sanitizeText(payload.copyright.poweredByText || '', 100),
    };
  }

  return sanitized;
}
