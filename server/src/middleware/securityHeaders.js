import helmet from 'helmet';

/**
 * Enterprise-grade Helmet HTTP Security Headers
 * Carefully tailored for Print Bazzar's printing workflow, Supabase storage, and payment gateways.
 */
export const configureSecurityHeaders = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          ...(isProduction ? [] : ["'unsafe-eval'"]),
          'https://checkout.razorpay.com',
          'https://*.razorpay.com',
          'https://accounts.google.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'data:',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.supabase.co',
          'https://images.unsplash.com',
          'https://*.razorpay.com',
        ],
        mediaSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.supabase.co',
        ],
        connectSrc: [
          "'self'",
          'http://localhost:*',
          'https://*.supabase.co',
          'https://api.razorpay.com',
          'https://lumberjack.razorpay.com',
          'https://*.razorpay.com',
          'https://wa.me',
          'https://accounts.google.com',
        ],
        frameSrc: [
          "'self'",
          'https://api.razorpay.com',
          'https://checkout.razorpay.com',
          'https://*.razorpay.com',
          'https://accounts.google.com',
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },

    // Allow cross-origin image & asset embedding from localhost:5000 to localhost:5173 / production
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    // Disable COEP to allow loading external images from Supabase and CDNs
    crossOriginEmbedderPolicy: false,

    // Clickjacking protection: allow same-origin frames (e.g. invoice preview modal)
    frameguard: { action: 'sameorigin' },

    // Prevent MIME-sniffing
    noSniff: true,

    // Strict Transport Security (HSTS) in production
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,

    // Referrer Policy: Send full referrer on same origin, strip path across origins
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // DNS prefetch control
    dnsPrefetchControl: { allow: false },
  });
};

export default configureSecurityHeaders;
