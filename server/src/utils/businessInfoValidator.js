/**
 * Validation & Sanitization Engine for Business Information Settings
 * Enforces XSS protection, GSTIN validation, and URL safety.
 */

const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'blob:',
];

export function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();

  for (const proto of DANGEROUS_PROTOCOLS) {
    if (trimmed.startsWith(proto)) return false;
  }

  const normalized = trimmed.replace(/[\s\r\n\t]/g, '');
  for (const proto of DANGEROUS_PROTOCOLS) {
    if (normalized.startsWith(proto)) return false;
  }

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

  return false;
}

export function sanitizeText(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

export function isValidGSTIN(gstin) {
  if (!gstin) return true; // empty is allowed if business owner has not set it yet
  const cleaned = gstin.trim().toUpperCase();
  // Standard Indian 15-character GSTIN regex
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(cleaned);
}

export function isValidPhone(phone) {
  if (!phone) return true;
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

export function isValidEmail(email) {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates and sanitizes a complete Business Information update payload
 */
export function validateAndSanitizeBusinessInfo(input, fallback) {
  const errors = [];
  const base = fallback || {};
  const current = input || {};

  // 1. Brand validation
  const brandIn = current.brand || {};
  const brandBase = base.brand || {};
  const brand = {
    brandName: sanitizeText(brandIn.brandName || brandBase.brandName || 'Print Bazzar', 100),
    legalName: sanitizeText(brandIn.legalName || brandBase.legalName || 'Print Bazzar', 150),
    tagline: sanitizeText(brandIn.tagline || brandBase.tagline || '', 250),
    foundedYear: sanitizeText(String(brandIn.foundedYear || brandBase.foundedYear || '2019'), 10),
    logoLightUrl: isSafeUrl(brandIn.logoLightUrl) ? (brandIn.logoLightUrl || brandBase.logoLightUrl || '') : brandBase.logoLightUrl,
    logoDarkUrl: isSafeUrl(brandIn.logoDarkUrl) ? (brandIn.logoDarkUrl || brandBase.logoDarkUrl || '') : brandBase.logoDarkUrl,
    faviconUrl: isSafeUrl(brandIn.faviconUrl) ? (brandIn.faviconUrl || brandBase.faviconUrl || '') : brandBase.faviconUrl
  };

  // 2. Tax & Compliance
  const taxIn = current.tax || {};
  const taxBase = base.tax || {};
  const rawGstin = (taxIn.gstin !== undefined ? taxIn.gstin : taxBase.gstin || '').trim().toUpperCase();
  if (rawGstin && !isValidGSTIN(rawGstin)) {
    errors.push('Invalid GSTIN format. Must be 15 alphanumeric characters matching Indian GSTIN format.');
  }

  const tax = {
    gstin: sanitizeText(rawGstin, 20),
    isGstinVerified: Boolean(taxIn.isGstinVerified),
    msmeRegistration: sanitizeText(taxIn.msmeRegistration || taxBase.msmeRegistration || '', 50),
    isMsmeVerified: Boolean(taxIn.isMsmeVerified),
    pan: sanitizeText(taxIn.pan || taxBase.pan || '', 20).toUpperCase(),
    stateCode: sanitizeText(taxIn.stateCode || taxBase.stateCode || '33', 5),
    stateName: sanitizeText(taxIn.stateName || taxBase.stateName || 'Tamil Nadu', 50),
    taxRatePercentage: parseFloat(taxIn.taxRatePercentage) || 18
  };

  // 3. Address
  const addrIn = current.address || {};
  const addrBase = base.address || {};
  const address = {
    buildingNumber: sanitizeText(addrIn.buildingNumber || addrBase.buildingNumber || '', 100),
    street: sanitizeText(addrIn.street || addrBase.street || '', 200),
    landmark: sanitizeText(addrIn.landmark || addrBase.landmark || '', 150),
    city: sanitizeText(addrIn.city || addrBase.city || 'Tiruchirappalli', 100),
    district: sanitizeText(addrIn.district || addrBase.district || 'Tiruchirappalli', 100),
    state: sanitizeText(addrIn.state || addrBase.state || 'Tamil Nadu', 100),
    pincode: sanitizeText(addrIn.pincode || addrBase.pincode || '620008', 10),
    country: sanitizeText(addrIn.country || addrBase.country || 'India', 50),
    fullDisplayAddress: sanitizeText(addrIn.fullDisplayAddress || addrBase.fullDisplayAddress || '', 300),
    pressFacilityAddress: sanitizeText(addrIn.pressFacilityAddress || addrBase.pressFacilityAddress || '', 300),
    googleMapsEmbedUrl: isSafeUrl(addrIn.googleMapsEmbedUrl) ? (addrIn.googleMapsEmbedUrl || addrBase.googleMapsEmbedUrl || '') : addrBase.googleMapsEmbedUrl,
    googleMapsDirectionUrl: isSafeUrl(addrIn.googleMapsDirectionUrl) ? (addrIn.googleMapsDirectionUrl || addrBase.googleMapsDirectionUrl || '') : addrBase.googleMapsDirectionUrl
  };

  // 4. Contact
  const contIn = current.contact || {};
  const contBase = base.contact || {};

  if (contIn.primaryPhone && !isValidPhone(contIn.primaryPhone)) {
    errors.push('Primary phone number appears invalid.');
  }
  if (contIn.supportEmail && !isValidEmail(contIn.supportEmail)) {
    errors.push('Support email address is invalid.');
  }
  if (contIn.salesEmail && !isValidEmail(contIn.salesEmail)) {
    errors.push('Sales email address is invalid.');
  }

  const contact = {
    primaryPhone: sanitizeText(contIn.primaryPhone || contBase.primaryPhone || '', 30),
    secondaryPhone: sanitizeText(contIn.secondaryPhone || contBase.secondaryPhone || '', 30),
    whatsappNumber: (contIn.whatsappNumber || contBase.whatsappNumber || '919629098565').replace(/[^0-9]/g, ''),
    supportEmail: sanitizeText(contIn.supportEmail || contBase.supportEmail || '', 100),
    salesEmail: sanitizeText(contIn.salesEmail || contBase.salesEmail || '', 100),
    corporateEmail: sanitizeText(contIn.corporateEmail || contBase.corporateEmail || '', 100),
    deskNotice: sanitizeText(contIn.deskNotice || contBase.deskNotice || '', 200)
  };

  // 5. Operating Hours
  const hrsIn = current.operatingHours || {};
  const hrsBase = base.operatingHours || {};
  const operatingHours = {
    weekdays: sanitizeText(hrsIn.weekdays || hrsBase.weekdays || 'Monday - Saturday: 9:30 AM - 8:30 PM', 100),
    sunday: sanitizeText(hrsIn.sunday || hrsBase.sunday || 'Sunday: Closed', 100),
    lunchBreak: sanitizeText(hrsIn.lunchBreak || hrsBase.lunchBreak || '', 100),
    turnaroundNotice: sanitizeText(hrsIn.turnaroundNotice || hrsBase.turnaroundNotice || '', 300)
  };

  // 6. Socials
  const socIn = current.socials || {};
  const socBase = base.socials || {};
  const socials = {};
  ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].forEach(plat => {
    const pIn = socIn[plat] || {};
    const pBase = socBase[plat] || {};
    const url = pIn.url !== undefined ? pIn.url : (pBase.url || '');
    socials[plat] = {
      url: isSafeUrl(url) ? sanitizeText(url, 300) : '',
      isEnabled: Boolean(pIn.isEnabled && url)
    };
  });

  // 7. Flags
  const flags = {
    gstinRequiresInput: !tax.isGstinVerified || tax.gstin === '33AAAAA0000A1Z5',
    msmeRequiresInput: !tax.isMsmeVerified || tax.msmeRegistration === 'UDYAM-TN-27-0000000',
    panRequiresInput: !tax.pan,
    corporateEmailRequiresInput: !contact.corporateEmail || contact.corporateEmail.includes('trichytech')
  };

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      brand,
      tax,
      address,
      contact,
      operatingHours,
      socials,
      flags
    }
  };
}
