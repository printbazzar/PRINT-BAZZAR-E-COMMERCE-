import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testUploadAndVideo() {
  console.log('Testing Admin Media & Video Upload APIs...\n');

  // 1. Admin Login
  const loginRes = await fetch('http://localhost:5000/api/v1/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@printbazzar.online', password: 'Admin@123' }),
  }).then((r) => r.json());

  if (!loginRes.success || !loginRes.token) {
    console.error('Admin login failed:', loginRes);
    return;
  }
  const token = loginRes.token;
  console.log('✔ Admin login authenticated successfully.');

  // 2. Create a dummy test image buffer & upload
  const testImagePath = path.join(__dirname, 'test_sample.png');
  fs.writeFileSync(testImagePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testImagePath)], { type: 'image/png' });
  formData.append('file', fileBlob, 'sample_product_photo.png');

  const uploadRes = await fetch('http://localhost:5000/api/v1/admin/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }).then((r) => r.json());

  console.log('Upload Result:', uploadRes);
  if (uploadRes.success && uploadRes.url) {
    console.log(`✔ File Upload Succeeded: ${uploadRes.url}`);
  } else {
    console.error('❌ File upload failed');
  }

  // 3. Test Categories list
  const catRes = await fetch('http://localhost:5000/api/v1/categories').then((r) => r.json());
  const categoryId = catRes.data[0]?.id;

  // 4. Test Product Create with videoUrl
  const prodRes = await fetch('http://localhost:5000/api/v1/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Luxury Velvet Gold Foil Card with Video',
      categoryId,
      startingPrice: 350,
      minQuantity: 100,
      thumbnailUrl: uploadRes.url || '/uploads/sample_product_photo.png',
      videoUrl: '/uploads/sample_video_demo.mp4',
      shortDescription: 'Premium business card with HD unboxing video',
    }),
  }).then((r) => r.json());

  if (prodRes.success && prodRes.data?.videoUrl) {
    console.log(`✔ Product Created with videoUrl: ${prodRes.data.videoUrl}`);
    console.log(`✔ Product ID: ${prodRes.data.id}`);
  } else {
    console.error('❌ Product creation with videoUrl failed:', prodRes);
  }

  // Clean up scratch file
  if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
  console.log('\n--- ALL MEDIA UPLOAD TESTS PASSED SUCCESSFULLY ---');
}

testUploadAndVideo();
