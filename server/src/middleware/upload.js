import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Strict extension to MIME-type mapping
const ALLOWED_MIME_TYPES = {
  // Raster & Vector Images
  jpg: ['image/jpeg', 'image/pjpeg'],
  jpeg: ['image/jpeg', 'image/pjpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  svg: ['image/svg+xml', 'text/xml', 'application/xml', 'text/plain'],
  tiff: ['image/tiff', 'image/x-tiff'],
  
  // Documents & Print Files
  pdf: ['application/pdf'],
  ai: ['application/postscript', 'application/illustrator', 'application/pdf', 'application/octet-stream'],
  eps: ['application/postscript', 'image/x-eps', 'application/octet-stream'],
  psd: ['image/vnd.adobe.photoshop', 'image/x-photoshop', 'application/x-photoshop', 'application/octet-stream'],
  cdr: ['application/x-cdr', 'application/coreldraw', 'application/octet-stream'],
  zip: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream', 'multipart/x-zip'],

  // Media & Video proofings
  mp4: ['video/mp4', 'application/octet-stream'],
  webm: ['video/webm'],
  mov: ['video/quicktime', 'application/octet-stream'],
  mkv: ['video/x-matroska', 'application/octet-stream'],
  avi: ['video/x-msvideo', 'application/octet-stream'],
  ogg: ['video/ogg', 'audio/ogg', 'application/ogg'],
};

// Dangerous extensions that must never be allowed under any circumstance
const DANGEROUS_EXTENSIONS = new Set([
  'php', 'phtml', 'php3', 'php4', 'php5', 'phps', 'phar',
  'html', 'htm', 'xhtml', 'shtml', 'asp', 'aspx', 'jsp', 'cgi',
  'exe', 'bat', 'sh', 'bin', 'cmd', 'ps1', 'vbs', 'scr', 'dll',
  'js', 'mjs', 'ts', 'jsx', 'tsx', 'py', 'rb', 'pl', 'jar'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  // 1. Immediate rejection of dangerous executable extensions
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    const err = new Error(`Security Violation: Executable or script files (.${ext}) are strictly forbidden.`);
    err.status = 400;
    return cb(err);
  }

  // 2. Validate against allowed extensions list
  const allowedMimes = ALLOWED_MIME_TYPES[ext];
  if (!allowedMimes) {
    const err = new Error(`File format .${ext} is not supported. Please upload a valid image, document or design artwork.`);
    err.status = 400;
    return cb(err);
  }

  // 3. Validate MIME type if provided by client
  if (file.mimetype) {
    const clientMime = file.mimetype.toLowerCase();
    const mimeMatch = allowedMimes.some((m) => clientMime === m || clientMime.startsWith(m));
    if (!mimeMatch && clientMime !== 'application/octet-stream') {
      const err = new Error(`MIME type mismatch: Provided content-type ${file.mimetype} is invalid for .${ext} file.`);
      err.status = 400;
      return cb(err);
    }
  }

  cb(null, true);
};

// SVG Sanitizer Helper: strips dangerous script and event tags
export const sanitizeSvgContent = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*(["'])[\s\S]*?\1/gi, '')
      .replace(/\bjavascript:\s*[\s\S]*?(?=["'\s>])/gi, '');
    fs.writeFileSync(filePath, sanitized, 'utf8');
  } catch (err) {
    console.error('Error sanitizing SVG content:', err);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max (supports HD print files)
  },
  fileFilter,
});

