/**
 * Standard Default Footer Settings for Print Bazzar
 * Used for initial store configuration and reset fallbacks.
 */

export const DEFAULT_FOOTER_SETTINGS = {
  // 1. Brand Information
  brand: {
    companyName: 'PRINT BAZZAR',
    tagline: 'Custom Printing & Graphic Design Hub',
    description:
      'Your one-stop destination for custom printing, branding, signage, packaging, graphic design and personalized gifts. Industrial high-definition digital offset technology in Tamil Nadu.',
    logoUrl: '/assets/images/logo_white.png',
    socialLinks: [
      {
        platform: 'whatsapp',
        label: 'WhatsApp Desk',
        url: 'https://wa.me/919629098565',
        isEnabled: true,
      },
      {
        platform: 'instagram',
        label: 'Instagram',
        url: 'https://instagram.com/print_bazzar',
        isEnabled: true,
      },
      {
        platform: 'facebook',
        label: 'Facebook',
        url: 'https://www.facebook.com/printbazzartry?mibextid=ZbWKwL',
        isEnabled: true,
      },
      {
        platform: 'youtube',
        label: 'YouTube',
        url: '',
        isEnabled: false,
      },
      {
        platform: 'linkedin',
        label: 'LinkedIn',
        url: '',
        isEnabled: false,
      },
    ],
  },

  // 2. Contact Information
  contact: {
    companyName: 'Print Bazzar',
    address: '12 A, Allimal Street, Big Bazzar St',
    city: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    country: 'India',
    pincode: '620008',
    primaryPhone: '+91 96290 98565',
    secondaryPhone: '+91 90802 85852',
    supportEmail: 'printbazzar.online@gmail.com',
    salesEmail: 'orders@printbazzar.online',
    workingDays: 'Monday – Saturday',
    openingTime: '9:30 AM',
    closingTime: '8:30 PM',
    sundayHours: '10:00 AM – 2:00 PM',
    googleMapsUrl: 'https://maps.google.com/?q=Print+Bazzar+Trichy',
  },

  // 3. WhatsApp Support Section
  whatsapp: {
    isEnabled: true,
    phoneNumber: '+91 96290 98565',
    displayNumber: '+91 96290 98565',
    buttonText: 'Need Help? Chat with us on WhatsApp',
    defaultMessage: 'Hello Print Bazzar, I need help with my order.',
    contextualMessages: {
      orderSupport: 'Hello Print Bazzar, I need an update on my order.',
      productEnquiry: 'Hello Print Bazzar, I have a question about your printing products.',
      bulkOrder: 'Hello Print Bazzar, I would like to inquire about bulk printing discounts.',
      corporate: 'Hello Print Bazzar, I am looking for corporate branding solutions.',
    },
  },

  // 4. Shop by Category Settings
  categorySettings: {
    title: 'SHOP BY CATEGORY',
    maxCategories: 8,
    showAllLink: true,
    allLinkText: 'Browse All Collections ➔',
    allLinkUrl: '/shop',
    categoryOverrides: [], // [{ slug: 'business-cards', customLabel: 'Visiting & Business Cards', isEnabled: true }]
  },

  // 5. Customer Support Links
  supportLinks: [
    { id: 'supp-1', label: 'Track My Order', url: '/track-order', isEnabled: true, order: 1 },
    { id: 'supp-2', label: 'Customer & B2B Portal', url: '/account/login', isEnabled: true, order: 2 },
    { id: 'supp-3', label: 'My Account Dashboard', url: '/account/dashboard', isEnabled: true, order: 3 },
    { id: 'supp-4', label: 'Upload Artwork & Brief', url: '/account/dashboard', isEnabled: true, order: 4 },
    { id: 'supp-5', label: 'File Requirements & Bleed', url: '/policy/file-requirements', isEnabled: true, order: 5 },
    { id: 'supp-6', label: 'Shipping & Delivery Info', url: '/policy/shipping-policy', isEnabled: true, order: 6 },
    { id: 'supp-7', label: 'Returns & Refund Policy', url: '/policy/refund-policy', isEnabled: true, order: 7 },
    { id: 'supp-8', label: 'Cancellation Policy', url: '/policy/cancellation-policy', isEnabled: true, order: 8 },
    { id: 'supp-9', label: 'Frequently Asked Questions', url: '/contact-us#faq', isEnabled: true, order: 9 },
    { id: 'supp-10', label: 'Contact Help Desk', url: '/contact-us', isEnabled: true, order: 10 },
  ],

  // 6. Business Services (B2B Lead Generation) Links
  businessLinks: [
    { id: 'biz-1', label: 'Corporate & Bulk Orders', url: '/quote?type=corporate', isEnabled: true, order: 1 },
    { id: 'biz-2', label: 'Wholesale Commercial Printing', url: '/quote?type=bulk', isEnabled: true, order: 2 },
    { id: 'biz-3', label: 'Business Brand Identity', url: '/quote?type=branding', isEnabled: true, order: 3 },
    { id: 'biz-4', label: 'Custom Packaging & Boxes', url: '/category/packaging-items', isEnabled: true, order: 4 },
    { id: 'biz-5', label: 'Signage & Outdoor Banners', url: '/category/signages', isEnabled: true, order: 5 },
    { id: 'biz-6', label: 'Reseller & Partner Program', url: '/contact-us?subject=partner', isEnabled: true, order: 6 },
    { id: 'biz-7', label: 'Become a Print Vendor', url: '/contact-us?subject=vendor', isEnabled: true, order: 7 },
    { id: 'biz-8', label: 'Request a Custom Quotation', url: '/quote', isEnabled: true, order: 8 },
  ],

  // 7. Legal & Policy Links
  legalLinks: [
    { id: 'leg-1', label: 'Terms & Conditions', url: '/terms', isEnabled: true, order: 1 },
    { id: 'leg-2', label: 'Privacy Policy', url: '/privacy', isEnabled: true, order: 2 },
    { id: 'leg-3', label: 'Shipping Policy', url: '/shipping-policy', isEnabled: true, order: 3 },
    { id: 'leg-4', label: 'Return & Refund Policy', url: '/refund-policy', isEnabled: true, order: 4 },
    { id: 'leg-5', label: 'Cancellation Policy', url: '/cancellation-policy', isEnabled: true, order: 5 },
    { id: 'leg-6', label: 'Payment Terms Policy', url: '/policy/payment-policy', isEnabled: true, order: 6 },
    { id: 'leg-7', label: 'Cookie Policy', url: '/cookie-policy', isEnabled: true, order: 7 },
  ],

  // 8. Trust & Assurance Badges
  trustBadges: [
    {
      id: 'trust-1',
      icon: 'HiOutlineShieldCheck',
      title: '100% Quality Guaranteed',
      description: 'Industrial precision offset & digital printing',
      isEnabled: true,
      order: 1,
    },
    {
      id: 'trust-2',
      icon: 'HiOutlineTruck',
      title: 'Express All India Delivery',
      description: 'Carefully packed doorstep dispatch',
      isEnabled: true,
      order: 2,
    },
    {
      id: 'trust-3',
      icon: 'HiOutlineClock',
      title: 'Live Order Tracking',
      description: 'Real-time production & courier tracking',
      isEnabled: true,
      order: 3,
    },
    {
      id: 'trust-4',
      icon: 'BsWhatsapp',
      title: 'WhatsApp Order Desk',
      description: 'Direct assistance with prepress experts',
      isEnabled: true,
      order: 4,
    },
  ],

  // 9. Payment Methods Display
  paymentMethods: [
    { id: 'pay-1', code: 'UPI', label: 'Instant UPI', isEnabled: true, order: 1 },
    { id: 'pay-2', code: 'GPAY', label: 'Google Pay', isEnabled: true, order: 2 },
    { id: 'pay-3', code: 'PHONEPE', label: 'PhonePe', isEnabled: true, order: 3 },
    { id: 'pay-4', code: 'PAYTM', label: 'Paytm', isEnabled: true, order: 4 },
    { id: 'pay-5', code: 'CARDS', label: 'Visa / Mastercard / RuPay', isEnabled: true, order: 5 },
    { id: 'pay-6', code: 'NETBANKING', label: 'Net Banking (50+ Banks)', isEnabled: true, order: 6 },
    { id: 'pay-7', code: 'COD', label: 'Cash on Delivery', isEnabled: true, order: 7 },
  ],

  // 10. SEO Footer Content
  seo: {
    isEnabled: true,
    text:
      'Print Bazzar provides professional online printing, custom printing, business cards, flyers, brochures, stickers, banners, signage, packaging, branding solutions, graphic design and personalized corporate gifts across India with fast doorstep dispatch.',
    maxCharLimit: 500,
  },

  // 11. Bottom Copyright Bar
  copyright: {
    text: 'Print Bazzar. All Rights Reserved.',
    madeInIndiaText: 'Proudly Made with ❤️ in India',
    showGstin: true,
    gstin: '33AAAAA0000A1Z5',
    companyRegNumber: 'UDYAM-TN-27-0000000',
    poweredByText: '',
  },
};
