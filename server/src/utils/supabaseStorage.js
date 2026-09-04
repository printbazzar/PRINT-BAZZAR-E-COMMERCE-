import fs from 'fs';
import path from 'path';

/**
 * Supabase Storage & Media Asset Service
 * Supports direct upload to Supabase Storage bucket 'product-media'
 * with seamless fallback to local disk storage.
 */
export async function uploadToStorage(arg, maybeFolder = 'products', maybeBucket = 'product-media') {
  const file = arg && arg.file ? arg.file : arg;
  const bucket = (arg && arg.bucket) || maybeBucket || 'product-media';
  const folder = (arg && arg.folder) || (typeof maybeFolder === 'string' ? maybeFolder : 'products');

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  const filename = file.filename || file.originalname || `upload-${Date.now()}`;
  const localUrl = `/uploads/${file.filename || filename}`;

  // If Supabase credentials are configured, upload to Supabase Storage REST endpoint
  if (supabaseKey && file.path && fs.existsSync(file.path)) {
    try {
      const fileBuffer = fs.readFileSync(file.path);
      const ext = path.extname(filename).toLowerCase();
      const storagePath = `${folder}/${Date.now()}-${path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`;

      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': file.mimetype || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: fileBuffer,
      });

      if (res.ok) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
        return {
          success: true,
          url: publicUrl,
          imageUrl: publicUrl,
          filename,
          storageType: 'SUPABASE_STORAGE',
          bucket,
          path: storagePath,
        };
      } else {
        const errText = await res.text();
        console.warn('Supabase storage upload returned error, using local fallback:', errText);
      }
    } catch (storageErr) {
      console.warn('Supabase storage upload failed, using local fallback:', storageErr.message);
    }
  }

  // Graceful local fallback
  return {
    success: true,
    url: localUrl,
    imageUrl: localUrl,
    filename: file.filename || filename,
    storageType: 'LOCAL_DISK',
  };
}
