import dotenv from 'dotenv';

dotenv.config();

// Base trusted origins
const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.printbazzar.online',
  'https://printbazzar.online',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174', // Vite dev server fallback port (auto-increments when 5173 is in use)
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

// Load additional origins from environment variables if present
const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter((o) => o && o !== '*');

export const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]));

/**
 * Check if a request origin is permitted
 */
export const isOriginAllowed = (origin) => {
  // Allow non-browser requests (server-to-server, payment webhooks, curl, mobile native apps)
  if (!origin) return true;

  // Exact match against whitelist
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Allow vercel preview and production deployments
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;

  // In development, allow local network IP addresses (e.g. mobile testing on local Wi-Fi)
  if (process.env.NODE_ENV !== 'production') {
    const isLocalNetwork = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin);
    if (isLocalNetwork) return true;

    // Allow any localhost/127.0.0.1 port in development, since Vite auto-increments
    // its port (5173 -> 5174 -> 5175...) whenever the default port is already in use.
    const isLocalhostAnyPort = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    if (isLocalhostAnyPort) return true;
  }

  return false;
};

/**
 * Production-ready CORS options for Express
 */
export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      const corsError = new Error('CORS request blocked: Origin not allowed.');
      corsError.status = 403;
      corsError.isCorsError = true;
      callback(corsError);
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'X-Request-Id',
  ],
  exposedHeaders: ['Retry-After', 'Content-Disposition'],
  maxAge: 86400, // 24 hours preflight cache
};

export default corsOptions;
