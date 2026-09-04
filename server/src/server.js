import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import { corsOptions } from './config/cors.js';
import { configureSecurityHeaders } from './middleware/securityHeaders.js';
import { publicApiLimiter } from './middleware/rateLimiter.js';
import { sanitizeRequestBody } from './middleware/inputSanitizer.js';
import cookieParser from 'cookie-parser';
import { csrfProtection } from './middleware/csrfProtection.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Trust first proxy (critical for reverse proxies, rate limiting & real IP resolution)
app.set('trust proxy', 1);

// 1. Enterprise HTTP Security Headers (Helmet + CSP + HSTS)
app.use(configureSecurityHeaders());

// 2. Strict Whitelisted CORS (Zero wildcard with credentials)
app.use(cors(corsOptions));

// 3. Secure Cookie Parser (HttpOnly auth & session management)
app.use(cookieParser());

// 4. Body Parsers with payload limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 5. Input Sanitization (strips script injection and dangerous tags)
app.use(sanitizeRequestBody);

// 6. CSRF Protection (Validates Double-Submit token for cookie-based mutations)
app.use(csrfProtection);

// 7. General Public Storefront Rate Limiting
app.use('/api', publicApiLimiter);

// 6. Serve Uploaded Files Statically (with secure headers and attachment disposition)
const uploadDir = path.join(__dirname, '../uploads');
app.use(
  '/uploads',
  express.static(uploadDir, {
    setHeaders: (res, filePath) => {
      // Prevent MIME sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      const ext = path.extname(filePath).toLowerCase();
      // Safe previewable raster images
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        res.setHeader('Content-Disposition', 'inline');
      } else if (ext === '.svg') {
        // Enforce strict CSP on SVG and force download to prevent stored XSS
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
        res.setHeader('Content-Disposition', 'attachment');
      } else {
        // All documents, vector print files (PDF, AI, PSD, CDR, ZIP) are served as downloads
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  })
);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'PRINT BAZZAR API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// 7. Global Centralized Error Handler (No sensitive data leakage)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`🚀 PRINT BAZZAR API SERVER RUNNING (SECURED)`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📁 Uploads Directory: ${uploadDir}`);
  console.log(`🛡️  Phase 3 Session & Cookie Security Active`);
  console.log(`===========================================`);
});

export default app;
