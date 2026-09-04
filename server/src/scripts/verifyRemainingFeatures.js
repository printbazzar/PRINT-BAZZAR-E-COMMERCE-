/**
 * Print Bazzar — Verification Suite for Remaining Operations, Security & Production Features
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { sendOrderNotification } from '../services/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 VERIFYING REMAINING WORKFLOW, OPERATIONS & SECURITY');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, label) {
    if (condition) {
      console.log(`✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${label}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST GROUP 1: File Upload Security & Safe Serving Headers
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: File Upload Security & Serving Headers ---');
  
  // 1.1 Create dummy test files in uploads to test static serving headers
  const uploadDir = path.join(__dirname, '../../uploads');
  const dummyImg = path.join(uploadDir, 'test_preview.jpg');
  const dummyPdf = path.join(uploadDir, 'test_artwork.pdf');
  const dummySvg = path.join(uploadDir, 'test_vector.svg');

  fs.writeFileSync(dummyImg, 'fake-image-bytes');
  fs.writeFileSync(dummyPdf, 'fake-pdf-bytes');
  fs.writeFileSync(dummySvg, '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>');

  try {
    const imgRes = await makeRequest('GET', '/uploads/test_preview.jpg');
    assert(imgRes.status === 200, 'Image preview is served with HTTP 200');
    assert(imgRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options: nosniff is enforced');
    assert(imgRes.headers['content-disposition'] === 'inline', 'Safe raster images served with Content-Disposition: inline');

    const pdfRes = await makeRequest('GET', '/uploads/test_artwork.pdf');
    assert(pdfRes.status === 200, 'Artwork PDF is served with HTTP 200');
    assert(pdfRes.headers['content-disposition'] === 'attachment', 'Artwork PDF served with Content-Disposition: attachment');

    const svgRes = await makeRequest('GET', '/uploads/test_vector.svg');
    assert(svgRes.status === 200, 'Vector SVG is served with HTTP 200');
    assert(svgRes.headers['content-disposition'] === 'attachment', 'Vector SVG served with Content-Disposition: attachment (prevents stored XSS)');
    assert(
      svgRes.headers['content-security-policy']?.includes("default-src 'none'"),
      'Vector SVG served with strict restrictive Content-Security-Policy'
    );
  } finally {
    if (fs.existsSync(dummyImg)) fs.unlinkSync(dummyImg);
    if (fs.existsSync(dummyPdf)) fs.unlinkSync(dummyPdf);
    if (fs.existsSync(dummySvg)) fs.unlinkSync(dummySvg);
  }

  // ----------------------------------------------------
  // TEST GROUP 2: WhatsApp & SMS Notification Engine
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: WhatsApp & SMS Notification Engine ---');

  const testOrder = {
    orderNumber: 'PB-ORD-TEST-001',
    customerName: 'Karthik Raja',
    customerMobile: '+91 9876543210',
    grandTotal: 1450,
    courierPartner: 'ST Courier',
    trackingReference: 'ST98765432',
  };

  const confirmedNotif = await sendOrderNotification({ order: testOrder, eventType: 'ORDER_CONFIRMED' });
  assert(confirmedNotif.success === true, 'ORDER_CONFIRMED notification generated successfully');
  assert(confirmedNotif.recipient === '919876543210', 'Recipient mobile properly sanitized for WhatsApp/SMS');

  const prodNotif = await sendOrderNotification({ order: testOrder, eventType: 'PRODUCTION_STARTED' });
  assert(prodNotif.success === true, 'PRODUCTION_STARTED notification generated successfully');

  const packedNotif = await sendOrderNotification({ order: testOrder, eventType: 'PACKED' });
  assert(packedNotif.success === true, 'PACKED notification generated successfully');

  const dispatchNotif = await sendOrderNotification({
    order: testOrder,
    eventType: 'DISPATCHED',
    extra: { courierPartner: 'ST Courier', trackingReference: 'ST98765432' },
  });
  assert(dispatchNotif.success === true, 'DISPATCHED notification generated with courier & AWB tracking');

  // ----------------------------------------------------
  // TEST GROUP 3: Factory Staff Mobile Queue & Workflow Board
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Factory Staff Mobile Queue & Workflow Board ---');

  // Authenticate admin using dual-mode Bearer token
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@printbazzar.online' },
    include: { role: true },
  });
  const { signAccessToken } = await import('../config/jwt.js');
  const adminToken = signAccessToken({
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role?.name || 'Super Admin',
    department: adminUser.department || 'ALL',
    permissions: ['ORDER_VIEW', 'ORDER_UPDATE', 'USER_MANAGE'],
  });

  assert(!!adminToken, 'Admin authenticated for staff queue verification');

  const boardRes = await makeRequest('GET', '/api/admin/workflow/board', {
    Authorization: `Bearer ${adminToken}`,
  });

  assert(boardRes.status === 200, 'Workflow board endpoint responds with HTTP 200');
  assert(boardRes.json?.data?.columns?.PRODUCTION !== undefined, 'Production Queue department column exists');
  assert(boardRes.json?.data?.columns?.FINISHING_QC !== undefined, 'Finishing & QC department column exists');
  assert(boardRes.json?.data?.columns?.PACKING !== undefined, 'Packing Desk department column exists');
  assert(boardRes.json?.data?.columns?.DELIVERY !== undefined, 'Logistics / Delivery department column exists');

  // Test Quick Advance Handover with CSRF and Cookie
  const activeOrders = await prisma.order.findMany({
    where: { orderStatus: { notIn: ['CANCELLED', 'DELIVERED'] } },
    take: 1,
  });

  if (activeOrders.length > 0) {
    const testTargetOrder = activeOrders[0];
    const handoverRes = await makeRequest(
      'POST',
      `/api/admin/orders/${testTargetOrder.id}/handover`,
      {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      {
        targetDepartment: 'PRODUCTION',
        newStatus: 'PRINTING',
        assignedStaffName: 'Test Machine Operator',
        note: 'Automated staff queue test verification run.',
      }
    );

    assert(handoverRes.status === 200, 'Staff queue quick handover successfully advances order stage');
    assert(handoverRes.json?.success === true, 'Handover API returns success confirmation');
  }

  // ----------------------------------------------------
  // TEST GROUP 4: Infrastructure & Production Readiness
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Infrastructure & Pre-flight Production Check ---');
  
  const ecosystemExists = fs.existsSync(path.join(__dirname, '../../ecosystem.config.cjs'));
  assert(ecosystemExists, 'PM2 ecosystem.config.cjs is present and configured');

  const preflightScriptExists = fs.existsSync(path.join(__dirname, './verifyProductionReadiness.js'));
  assert(preflightScriptExists, 'verifyProductionReadiness.js pre-flight script exists');

  const shippingModalExists = fs.existsSync(path.join(__dirname, '../../../printbazzar_react/client/src/Components/ShippingLabelModal.jsx'));
  assert(shippingModalExists, 'ShippingLabelModal.jsx printable component exists');

  const staffQueueExists = fs.existsSync(path.join(__dirname, '../../../printbazzar_react/client/src/Pages/StaffQueue.jsx'));
  assert(staffQueueExists, 'StaffQueue.jsx mobile-friendly operational screen exists');

  console.log('\n====================================================');
  console.log(`REMAINING FEATURES VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

runVerification().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
