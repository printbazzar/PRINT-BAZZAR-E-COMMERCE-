import assert from 'assert';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';

async function testArtworkUpload() {
  console.log('🧪 Testing Artwork Upload & File Management API...');

  // Create a dummy print-ready PDF file
  const testFilePath = path.join(process.cwd(), 'temp_test_artwork.pdf');
  fs.writeFileSync(testFilePath, '%PDF-1.4 %PRINT_BAZZAR_TEST_ARTWORK');

  try {
    // 1. Upload the file
    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(testFilePath)], { type: 'application/pdf' });
    formData.append('file', fileBlob, 'client_business_card_artwork.pdf');
    formData.append('purpose', 'PRINT_READY_FILE');

    const res = await fetch(`${API_BASE}/artwork/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (res.status !== 201) {
      console.error('  [Server Error Response]:', data);
    }
    assert.strictEqual(res.status, 201, `Upload status 201, got ${res.status}`);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.upload.originalName, 'client_business_card_artwork.pdf');
    assert.strictEqual(data.upload.fileType, 'application/pdf');
    assert.ok(data.upload.fileUrl.includes('client_business_card_artwork') || data.upload.fileUrl.includes('.pdf'));
    const uploadId = data.upload.id;
    console.log('  ✔ PASS: File upload succeeded with metadata tracking. ID:', uploadId);

    // 2. Fetch upload metadata
    const getRes = await fetch(`${API_BASE}/artwork/${uploadId}`);
    const getData = await getRes.json();
    assert.strictEqual(getData.success, true);
    assert.strictEqual(getData.data.id, uploadId);
    console.log('  ✔ PASS: GET /artwork/:id resolved uploaded file metadata');

    // 3. Delete the uploaded file
    const delRes = await fetch(`${API_BASE}/artwork/${uploadId}`, {
      method: 'DELETE',
    });
    const delData = await delRes.json();
    assert.strictEqual(delData.success, true);
    console.log('  ✔ PASS: DELETE /artwork/:id deleted upload record cleanly');

    // 4. Test format validation rejection
    const invalidFilePath = path.join(process.cwd(), 'temp_test_script.exe');
    fs.writeFileSync(invalidFilePath, 'MZ_EXECUTABLE_TEST');
    const badFormData = new FormData();
    const badFileBlob = new Blob([fs.readFileSync(invalidFilePath)], { type: 'application/x-msdownload' });
    badFormData.append('file', badFileBlob, 'malware.exe');

    const badRes = await fetch(`${API_BASE}/artwork/upload`, {
      method: 'POST',
      body: badFormData,
    });
    const badData = await badRes.json();
    assert.strictEqual(badRes.status, 400);
    assert.strictEqual(badData.success, false);
    assert.ok(badData.message.toLowerCase().includes('not supported') || badData.message.toLowerCase().includes('not accepted'));
    console.log('  ✔ PASS: Invalid file format (.exe) properly rejected with 400 error');
    fs.unlinkSync(invalidFilePath);

    console.log('\n===========================================');
    console.log('🎉 ALL ARTWORK UPLOAD & VALIDATION TESTS PASSED!');
    console.log('===========================================\n');
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testArtworkUpload().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
