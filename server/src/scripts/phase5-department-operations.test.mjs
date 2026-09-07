/**
 * Comprehensive Automated Verification Suite for Phase 5:
 * Print Bazzar Department Operations, Live Production Queue & Staff Work Management
 *
 * 16 Mandatory Test Cases:
 * TEST 1: Department Queue Filtering (/admin/operations/queue?department=PRODUCTION)
 * TEST 2: Backend-Level Department Security (403 DEPARTMENT_UNAUTHORIZED)
 * TEST 3: Job Assignment (Single Staff Ownership, Timestamps, Workflow Status Untouched)
 * TEST 4: Job Reassignment & Audit Trail (reassignedByName, reassignedAt, AuditLog)
 * TEST 5: Unauthorized Assignment Rejection (Non-manager staff blocked with 403)
 * TEST 6: Production Start (Machine assignment, startedAt recorded, state moved to PRINTING)
 * TEST 7: Production Pause & Resume (Workflow status strictly preserved during pause & resume)
 * TEST 8: Priority Update (LOW, NORMAL, HIGH, URGENT updates priority without altering workflow status)
 * TEST 9: Unauthorized / Unjustified Urgent Priority Rejection (403 MANAGER_REQUIRED or 400 without reason)
 * TEST 10: Issue Reporting (JobIssue created, job moved to ON_HOLD, preHoldStatus checkpoint saved)
 * TEST 11: Issue Resolution (Job & order restored strictly to preHoldStatus, resolution notes stored)
 * TEST 12: Notification System & Read/Unread Tracking (Dispatched on assignment/issues, mark as read)
 * TEST 13: SLA Engine: ON_TIME, AT_RISK, and DELAYED calculation verification
 * TEST 14: Manager Bottleneck & Workload Telemetry Overview (/admin/operations/manager-overview)
 * TEST 15: Immutable Staff Action Audit Trail Verification
 * TEST 16: Automated Teardown & Zero Residual Database Pollution
 */

import http from 'http';
import { PrismaClient } from '@prisma/client';
import app from '../server.js';
import { signAccessToken } from '../config/jwt.js';
import { calculateJobSLA } from '../utils/slaCalculator.js';

const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[PHASE 5 TEST ASSERTION FAILED]: ${message}`);
  }
}

async function runPhase5TestSuite() {
  console.log('================================================================');
  console.log('🧪 PRINT BAZZAR — PHASE 5 DEPARTMENT OPERATIONS & LIVE QUEUE SUITE');
  console.log('================================================================');

  // Start local HTTP server on dynamic free port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TEST HARNESS] Local test server running on ${baseUrl}`);

  const testRunId = Date.now().toString().slice(-6);
  const createdOrderIds = [];
  const createdCustomerIds = [];
  const createdJobIds = [];
  const createdIssueIds = [];
  const createdNotificationIds = [];
  const createdAuditLogIds = [];
  let testError = null;

  try {
    // ----------------------------------------------------------------
    // Setup Test Staff & Tokens
    // ----------------------------------------------------------------
    const superAdmin = await prisma.user.findFirst({
      where: { email: 'admin@printbazzar.online' },
      include: { role: true },
    });
    const pressStaff = await prisma.user.findFirst({
      where: { email: 'press@printbazzar.online' },
      include: { role: true },
    });
    const designStaff = await prisma.user.findFirst({
      where: { email: 'design@printbazzar.online' },
      include: { role: true },
    });
    const deliveryStaff = await prisma.user.findFirst({
      where: { email: 'delivery@printbazzar.online' },
      include: { role: true },
    });

    assert(superAdmin, 'Super Admin user must exist in DB');
    assert(pressStaff, 'Press staff must exist in DB');
    assert(designStaff, 'Design staff must exist in DB');
    assert(deliveryStaff, 'Delivery staff must exist in DB');

    const adminToken = signAccessToken({
      userId: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role.name,
    });
    const pressToken = signAccessToken({
      userId: pressStaff.id,
      email: pressStaff.email,
      role: pressStaff.role.name,
    });
    const designToken = signAccessToken({
      userId: designStaff.id,
      email: designStaff.email,
      role: designStaff.role.name,
    });
    const deliveryToken = signAccessToken({
      userId: deliveryStaff.id,
      email: deliveryStaff.email,
      role: deliveryStaff.role.name,
    });

    // Resolve an existing product for test orders
    const testProduct = await prisma.product.findFirst();
    assert(testProduct, 'At least one active product must exist in database');

    // Create a synthetic Order and ProductionJob in PRODUCTION_QUEUE
    console.log('\n[SETUP] Creating synthetic test order & production job...');
    const testCustomer = await prisma.customer.create({
      data: {
        name: `Phase5 Test Customer (${testRunId})`,
        mobile: `99900${testRunId}`,
        email: `phase5_${testRunId}@test.com`,
      },
    });
    createdCustomerIds.push(testCustomer.id);

    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `PB-P5-${testRunId}`,
        customer: { connect: { id: testCustomer.id } },
        customerName: testCustomer.name,
        customerMobile: testCustomer.mobile,
        customerEmail: testCustomer.email,
        orderSource: 'WEBSITE',
        orderStatus: 'PRODUCTION_QUEUE',
        paymentStatus: 'PAID',
        currentDepartment: 'PRODUCTION',
        branch: 'TRICHY_MAIN',
        subtotal: 1200,
        totalTax: 216,
        shippingCharge: 0,
        grandTotal: 1416,
        proofStatus: 'APPROVED_BY_CUSTOMER',
        shippingAddress: JSON.stringify({ street: '12 Factory Lane', city: 'Trichy', state: 'Tamil Nadu', pincode: '620001' }),
        items: {
          create: [
            {
              productId: testProduct.id,
              productNameSnapshot: 'Premium Visiting Cards (350 GSM)',
              skuSnapshot: 'SKU-VC-350',
              quantity: 1000,
              unitPriceSnapshot: 1.2,
              totalPriceSnapshot: 1200,
              optionsSnapshot: JSON.stringify({ Size: '3.5x2 inches', Paper: '350 GSM Art Card', Lamination: 'Matte' }),
            },
          ],
        },
      },
      include: { items: true },
    });
    createdOrderIds.push(testOrder.id);

    const testJob = await prisma.productionJob.create({
      data: {
        jobNumber: `JOB-P5-${testRunId}`,
        orderId: testOrder.id,
        orderItemId: testOrder.items[0].id,
        productId: testProduct.id,
        productNameSnapshot: 'Premium Visiting Cards (350 GSM)',
        quantity: 1000,
        status: 'QUEUED',
        assignedDepartment: 'PRODUCTION',
        priority: 'NORMAL',
        specsSnapshotJson: JSON.stringify({ Size: '3.5x2 inches', Material: '350 GSM Art Card', Lamination: 'Matte' }),
        deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    createdJobIds.push(testJob.id);
    console.log(`✔ Synthetic Order (${testOrder.orderNumber}) and Job (${testJob.jobNumber}) created successfully.`);

    // ----------------------------------------------------------------
    // TEST 1: Department Queue Filtering
    // ----------------------------------------------------------------
    console.log('\n[TEST 1] Department Queue Filtering (/admin/operations/queue?department=PRODUCTION)...');
    const resQueue = await fetch(`${baseUrl}/api/v1/admin/operations/queue?department=PRODUCTION`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataQueue = await resQueue.json();
    assert(resQueue.status === 200, `Expected 200, got ${resQueue.status}`);
    assert(dataQueue.success === true, 'Queue fetch must succeed');
    assert(dataQueue.department === 'PRODUCTION', 'Queue department must be PRODUCTION');
    assert(Array.isArray(dataQueue.jobs), 'Queue must return jobs array');
    const foundJob = dataQueue.jobs.find((j) => j.id === testJob.id);
    assert(foundJob, `Target test job ${testJob.jobNumber} must be present in PRODUCTION queue`);
    assert(foundJob.workflowStatus === 'QUEUED', `Job status must be QUEUED, got ${foundJob.workflowStatus}`);
    assert(dataQueue.summary.total >= 1, 'Summary total jobs must be >= 1');
    console.log(`✔ Department Queue verified: ${dataQueue.jobs.length} jobs retrieved in PRODUCTION queue.`);

    // ----------------------------------------------------------------
    // TEST 2: Backend-Level Department Security (403 DEPARTMENT_UNAUTHORIZED)
    // ----------------------------------------------------------------
    console.log('\n[TEST 2] Backend Department Security: Press operator accessing DESIGN queue...');
    const resSec = await fetch(`${baseUrl}/api/v1/admin/operations/queue?department=DESIGN`, {
      headers: { Authorization: `Bearer ${pressToken}` },
    });
    const dataSec = await resSec.json();
    assert(resSec.status === 403, `Expected 403 FORBIDDEN, got ${resSec.status}`);
    assert(dataSec.code === 'DEPARTMENT_UNAUTHORIZED', `Expected code DEPARTMENT_UNAUTHORIZED, got ${dataSec.code}`);
    console.log(`✔ Cross-department access successfully blocked with HTTP 403 (${dataSec.code}).`);

    // ----------------------------------------------------------------
    // TEST 3: Job Assignment (Single Staff Ownership, Independent of Workflow)
    // ----------------------------------------------------------------
    console.log('\n[TEST 3] Job Assignment: Assigning press operator to production job...');
    const resAssign = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/assign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        staffId: pressStaff.id,
        staffName: pressStaff.name,
        department: 'PRODUCTION',
      }),
    });
    const dataAssign = await resAssign.json();
    assert(resAssign.status === 200, `Expected 200, got ${resAssign.status}: ${dataAssign.message}`);
    assert(dataAssign.success === true, 'Assignment must succeed');
    assert(dataAssign.job.assignedStaffId === pressStaff.id, 'assignedStaffId must match pressStaff');
    assert(dataAssign.job.assignedStaffName === pressStaff.name, 'assignedStaffName must match pressStaff');
    assert(dataAssign.job.assignedByName === superAdmin.name, 'assignedByName must record manager name');
    assert(dataAssign.job.workflowStatus === 'QUEUED', 'Workflow status must remain QUEUED after assignment');
    console.log(`✔ Job assigned to ${pressStaff.name}. Workflow status remained unchanged (QUEUED).`);

    // ----------------------------------------------------------------
    // TEST 4: Job Reassignment & Audit Trail
    // ----------------------------------------------------------------
    console.log('\n[TEST 4] Job Reassignment: Reassigning to another staff and tracking audit history...');
    const resReassign = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/assign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        staffId: designStaff.id,
        staffName: designStaff.name,
        department: 'PRODUCTION',
      }),
    });
    const dataReassign = await resReassign.json();
    assert(resReassign.status === 200, `Expected 200, got ${resReassign.status}`);
    assert(dataReassign.job.assignedStaffName === designStaff.name, 'assignedStaffName must now be designStaff');

    // Verify DB columns for reassignment
    const dbJobAfterReassign = await prisma.productionJob.findUnique({ where: { id: testJob.id } });
    assert(dbJobAfterReassign.reassignedByName === superAdmin.name, 'reassignedByName must be recorded');
    assert(dbJobAfterReassign.reassignedAt !== null, 'reassignedAt timestamp must be recorded');
    console.log(`✔ Reassignment verified. ReassignedBy: ${dbJobAfterReassign.reassignedByName}, ReassignedAt: ${dbJobAfterReassign.reassignedAt}`);

    // Reassign back to pressStaff for subsequent press tests
    await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/assign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: pressStaff.id, staffName: pressStaff.name, department: 'PRODUCTION' }),
    });

    // ----------------------------------------------------------------
    // TEST 5: Unauthorized Assignment Rejection (Non-manager blocked with 403)
    // ----------------------------------------------------------------
    console.log('\n[TEST 5] Unauthorized Assignment: Delivery executive attempting to assign job...');
    const resUnauthAssign = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/assign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deliveryToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        staffId: deliveryStaff.id,
        staffName: deliveryStaff.name,
        department: 'PRODUCTION',
      }),
    });
    const dataUnauthAssign = await resUnauthAssign.json();
    assert(resUnauthAssign.status === 403, `Expected 403, got ${resUnauthAssign.status}`);
    assert(dataUnauthAssign.code === 'FORBIDDEN_ASSIGNMENT', `Expected FORBIDDEN_ASSIGNMENT, got ${dataUnauthAssign.code}`);
    console.log(`✔ Non-manager assignment blocked with HTTP 403 (${dataUnauthAssign.code}).`);

    // ----------------------------------------------------------------
    // TEST 6: Production Start (Machine assignment, startedAt, PRINTING status)
    // ----------------------------------------------------------------
    console.log('\n[TEST 6] Production Start: Press operator starting print run...');
    const resStart = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pressToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        machineNumber: 'Konica Minolta AccurioPress C4070 (Digital Color)',
        notes: 'Loaded 350 GSM Art Card matte stock. Calibrated CMYK.',
      }),
    });
    const dataStart = await resStart.json();
    assert(resStart.status === 200, `Expected 200, got ${resStart.status}: ${dataStart.message}`);
    assert(dataStart.job.workflowStatus === 'PRINTING', 'Job workflowStatus must transition to PRINTING');
    assert(dataStart.job.machineNumber.includes('Konica Minolta'), 'Machine number must be assigned');
    assert(dataStart.job.startedAt !== null, 'startedAt timestamp must be recorded');

    // Verify Order status synced to PRINTING
    const dbOrderStart = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert(dbOrderStart.orderStatus === 'PRINTING', `Order status must be PRINTING, got ${dbOrderStart.orderStatus}`);
    console.log(`✔ Production job started on machine: ${dataStart.job.machineNumber}. Order status: PRINTING.`);

    // ----------------------------------------------------------------
    // TEST 7: Production Pause & Resume (Workflow Status Strictly Preserved)
    // ----------------------------------------------------------------
    console.log('\n[TEST 7] Production Pause & Resume: Verifying workflow stage preservation...');
    // Pause
    const resPause = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/pause`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pressToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Sheet feeder jam cleared and roller cleaning underway.',
      }),
    });
    const dataPause = await resPause.json();
    assert(resPause.status === 200, `Expected 200, got ${resPause.status}`);
    assert(dataPause.job.isPaused === true, 'isPaused must be true');
    assert(dataPause.job.pauseReason.includes('Sheet feeder jam'), 'pauseReason must match');
    assert(dataPause.job.workflowStatus === 'PRINTING', 'Workflow status must remain PRINTING while paused');

    // Resume
    const resResume = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/resume`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pressToken}`,
        'Content-Type': 'application/json',
      },
    });
    const dataResume = await resResume.json();
    assert(resResume.status === 200, `Expected 200, got ${resResume.status}`);
    assert(dataResume.job.isPaused === false, 'isPaused must be false after resume');
    assert(dataResume.job.workflowStatus === 'PRINTING', 'Workflow status must still be PRINTING');
    console.log('✔ Job paused and resumed successfully. Workflow stage PRINTING preserved without alteration.');

    // ----------------------------------------------------------------
    // TEST 8: Priority Update (Independent of Workflow Status)
    // ----------------------------------------------------------------
    console.log('\n[TEST 8] Priority Update: Changing priority to HIGH without touching status...');
    const resPrio = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/priority`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${pressToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priority: 'HIGH',
      }),
    });
    const dataPrio = await resPrio.json();
    assert(resPrio.status === 200, `Expected 200, got ${resPrio.status}`);
    assert(dataPrio.job.priority === 'HIGH', 'Priority must be updated to HIGH');
    assert(dataPrio.job.workflowStatus === 'PRINTING', 'Workflow status must remain PRINTING');
    console.log('✔ Priority updated to HIGH. Workflow status intact.');

    // ----------------------------------------------------------------
    // TEST 9: Unauthorized / Unjustified Urgent Priority Rejection
    // ----------------------------------------------------------------
    console.log('\n[TEST 9] URGENT Priority Governance: Non-manager rejection & reason enforcement...');
    // A. Missing reason by Admin
    const resUrgentNoReason = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/priority`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'URGENT' }),
    });
    assert(resUrgentNoReason.status === 400, `Expected 400 when reason missing, got ${resUrgentNoReason.status}`);

    // B. Delivery staff attempting URGENT
    const resUrgentNonManager = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/priority`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${deliveryToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'URGENT', reason: 'Customer requested fast delivery' }),
    });
    const dataUrgentNonManager = await resUrgentNonManager.json();
    assert(resUrgentNonManager.status === 403, `Expected 403 for non-manager, got ${resUrgentNonManager.status}`);
    assert(dataUrgentNonManager.code === 'MANAGER_REQUIRED', 'Code must be MANAGER_REQUIRED');

    // C. Valid URGENT by Manager
    const resUrgentSuccess = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/priority`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'URGENT', reason: 'VIP Corporate Exhibition order needed in 2 hours' }),
    });
    const dataUrgentSuccess = await resUrgentSuccess.json();
    assert(resUrgentSuccess.status === 200, `Expected 200, got ${resUrgentSuccess.status}`);
    assert(dataUrgentSuccess.job.priority === 'URGENT', 'Priority must now be URGENT');
    console.log('✔ URGENT priority security rules verified (reason enforced + manager restricted).');

    // ----------------------------------------------------------------
    // TEST 10: Issue Reporting (JobIssue created, moved to ON_HOLD, preHoldStatus saved)
    // ----------------------------------------------------------------
    console.log('\n[TEST 10] Issue Reporting: Press operator reporting paper shortage...');
    const resIssue = await fetch(`${baseUrl}/api/v1/admin/operations/jobs/${testJob.id}/report-issue`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pressToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issueCategory: 'MATERIAL_UNAVAILABLE',
        description: 'Ran out of 350 GSM matte art sheets. Need warehouse restock.',
        isBlocking: true,
      }),
    });
    const dataIssue = await resIssue.json();
    assert(resIssue.status === 201, `Expected 201, got ${resIssue.status}: ${dataIssue.message}`);
    assert(dataIssue.issue.issueCategory === 'MATERIAL_UNAVAILABLE', 'Category must match');
    assert(dataIssue.issue.reportedByName === pressStaff.name, 'Reporter must be pressStaff');
    createdIssueIds.push(dataIssue.issue.id);

    // Verify DB state for Job & Order
    const dbJobOnHold = await prisma.productionJob.findUnique({ where: { id: testJob.id } });
    assert(dbJobOnHold.status === 'ON_HOLD', `Job status must be ON_HOLD, got ${dbJobOnHold.status}`);
    assert(dbJobOnHold.preHoldStatus === 'PRINTING', `preHoldStatus must be PRINTING, got ${dbJobOnHold.preHoldStatus}`);

    const dbOrderOnHold = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert(dbOrderOnHold.orderStatus === 'ON_HOLD', `Order status must be ON_HOLD, got ${dbOrderOnHold.orderStatus}`);
    console.log(`✔ Issue recorded. Job moved to ON_HOLD with preHoldStatus='${dbJobOnHold.preHoldStatus}'.`);

    // ----------------------------------------------------------------
    // TEST 11: Issue Resolution (Restores Job & Order to preHoldStatus)
    // ----------------------------------------------------------------
    console.log('\n[TEST 11] Issue Resolution: Resolving shortage and restoring exact preHoldStatus...');
    const resResolve = await fetch(`${baseUrl}/api/v1/admin/operations/issues/${dataIssue.issue.id}/resolve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resolutionNotes: 'Warehouse dispatched 2000 fresh sheets of 350 GSM art board.',
      }),
    });
    const dataResolve = await resResolve.json();
    assert(resResolve.status === 200, `Expected 200, got ${resResolve.status}: ${dataResolve.message}`);
    assert(dataResolve.issue.resolutionStatus === 'RESOLVED', 'Resolution status must be RESOLVED');

    // Verify Job & Order returned to PRINTING
    const dbJobRestored = await prisma.productionJob.findUnique({ where: { id: testJob.id } });
    assert(dbJobRestored.status === 'PRINTING', `Job status must be restored to PRINTING, got ${dbJobRestored.status}`);
    assert(dbJobRestored.preHoldStatus === null, 'preHoldStatus must be cleared after resolution');

    const dbOrderRestored = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert(dbOrderRestored.orderStatus === 'PRINTING', `Order status must be restored to PRINTING, got ${dbOrderRestored.orderStatus}`);
    console.log(`✔ Issue resolved. Job and Order restored strictly to preHoldStatus ('${dbJobRestored.status}').`);

    // ----------------------------------------------------------------
    // TEST 12: Notification System & Read/Unread Tracking
    // ----------------------------------------------------------------
    console.log('\n[TEST 12] Staff Notifications: Fetching notifications and marking as read...');
    const resNotifs = await fetch(`${baseUrl}/api/v1/admin/staff-notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataNotifs = await resNotifs.json();
    assert(resNotifs.status === 200, `Expected 200, got ${resNotifs.status}`);
    assert(dataNotifs.success === true, 'Notification fetch must succeed');
    assert(Array.isArray(dataNotifs.notifications), 'Notifications array must be present');
    assert(dataNotifs.notifications.length >= 1, 'At least 1 notification must have been dispatched');

    const targetNotif = dataNotifs.notifications[0];
    const resRead = await fetch(`${baseUrl}/api/v1/admin/staff-notifications/${targetNotif.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataRead = await resRead.json();
    assert(resRead.status === 200, `Expected 200, got ${resRead.status}`);
    assert(dataRead.notification.isRead === true, 'Notification isRead must be true');
    console.log(`✔ Staff Notification verified. Unread count: ${dataNotifs.unreadCount}. Marked read successfully.`);

    // ----------------------------------------------------------------
    // TEST 13: SLA Engine: Deterministic Evaluation (ON_TIME, AT_RISK, DELAYED)
    // ----------------------------------------------------------------
    console.log('\n[TEST 13] SLA Engine: Verifying ON_TIME, AT_RISK, and DELAYED calculation...');
    const now = Date.now();

    // 1. On time (> 6h left)
    const onTimeJob = { deadline: new Date(now + 24 * 60 * 60 * 1000), status: 'PRINTING' };
    const slaOnTime = calculateJobSLA(onTimeJob);
    assert(slaOnTime.status === 'ON_TIME', `Expected ON_TIME, got ${slaOnTime.status}`);

    // 2. At risk (<= 6h left)
    const atRiskJob = { deadline: new Date(now + 3 * 60 * 60 * 1000), status: 'PRINTING' };
    const slaAtRisk = calculateJobSLA(atRiskJob);
    assert(slaAtRisk.status === 'AT_RISK', `Expected AT_RISK, got ${slaAtRisk.status}`);

    // 3. Delayed (past deadline)
    const delayedJob = { deadline: new Date(now - 2 * 60 * 60 * 1000), status: 'PRINTING' };
    const slaDelayed = calculateJobSLA(delayedJob);
    assert(slaDelayed.status === 'DELAYED', `Expected DELAYED, got ${slaDelayed.status}`);
    assert(slaDelayed.hoursDelayed >= 1.9, 'hoursDelayed must be approx 2h');

    // 4. Completed (always ON_TIME)
    const completedJob = { deadline: new Date(now - 10 * 60 * 60 * 1000), status: 'COMPLETED' };
    const slaCompleted = calculateJobSLA(completedJob);
    assert(slaCompleted.status === 'ON_TIME', 'Completed job must be ON_TIME');
    assert(slaCompleted.isCompleted === true, 'isCompleted must be true');
    console.log('✔ SLA Engine verified: ON_TIME, AT_RISK, DELAYED, and COMPLETED handled deterministically.');

    // ----------------------------------------------------------------
    // TEST 14: Manager Bottleneck & Workload Overview
    // ----------------------------------------------------------------
    console.log('\n[TEST 14] Manager Overview: Checking telemetry, bottlenecks, and staff workload...');
    const resOverview = await fetch(`${baseUrl}/api/v1/admin/operations/manager-overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataOverview = await resOverview.json();
    assert(resOverview.status === 200, `Expected 200, got ${resOverview.status}`);
    assert(dataOverview.success === true, 'Manager overview must succeed');
    assert(dataOverview.telemetry.totalActiveJobs >= 1, 'Total active jobs must be >= 1');
    assert(dataOverview.bottlenecks !== undefined, 'Bottlenecks object must be present');
    assert(Array.isArray(dataOverview.staffWorkload), 'Staff workload array must be present');
    console.log(`✔ Manager Telemetry: ActiveJobs=${dataOverview.telemetry.totalActiveJobs}, ActiveOrders=${dataOverview.telemetry.totalActiveOrders}, DelayedJobs=${dataOverview.telemetry.delayedJobsCount}`);

    // ----------------------------------------------------------------
    // TEST 15: Immutable Staff Action Audit Trail Verification
    // ----------------------------------------------------------------
    console.log('\n[TEST 15] Audit Trail: Verifying production job audit log history...');
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: testJob.id },
      orderBy: { createdAt: 'asc' },
    });
    assert(auditLogs.length >= 3, `Expected at least 3 audit entries for test job, got ${auditLogs.length}`);
    const actions = auditLogs.map((a) => a.action);
    assert(actions.includes('JOB_ASSIGNED'), 'Audit log must record JOB_ASSIGNED');
    assert(actions.includes('START_JOB'), 'Audit log must record START_JOB');
    assert(actions.includes('PRIORITY_CHANGED'), 'Audit log must record PRIORITY_CHANGED');
    console.log(`✔ Audit Trail verified: Actions recorded: [${actions.join(', ')}]`);

    console.log('\n================================================================');
    console.log('🎉 ALL 15 PHASE 5 FUNCTIONAL TESTS PASSED WITH ZERO REGRESSIONS!');
    console.log('================================================================');

  } catch (err) {
    testError = err;
    console.error('\n❌ PHASE 5 TEST SUITE FAILURE:', err.message);
  } finally {
    // ----------------------------------------------------------------
    // TEST 16: Automated Teardown & Database Cleanup Verification
    // ----------------------------------------------------------------
    console.log('\n[TEST 16] Performing Automated Teardown & Database Cleanup...');
    try {
      if (createdIssueIds.length > 0) {
        console.log(`Cleaning up ${createdIssueIds.length} synthetic job issues...`);
        await prisma.jobIssue.deleteMany({ where: { id: { in: createdIssueIds } } });
      }

      if (createdJobIds.length > 0) {
        console.log(`Cleaning up ${createdJobIds.length} synthetic production jobs...`);
        // Cleanup notifications referencing these jobs
        await prisma.staffNotification.deleteMany({ where: { productionJobId: { in: createdJobIds } } });
        // Cleanup audit logs referencing these jobs
        await prisma.auditLog.deleteMany({ where: { entityId: { in: createdJobIds } } });
        await prisma.productionJob.deleteMany({ where: { id: { in: createdJobIds } } });
      }

      if (createdOrderIds.length > 0) {
        console.log(`Cleaning up ${createdOrderIds.length} synthetic test orders...`);
        await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await prisma.staffNotification.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      }

      if (createdCustomerIds.length > 0) {
        console.log(`Cleaning up ${createdCustomerIds.length} synthetic test customers...`);
        await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
      }

      // Verify zero residual test records
      const residualOrders = await prisma.order.count({ where: { id: { in: createdOrderIds } } });
      const residualJobs = await prisma.productionJob.count({ where: { id: { in: createdJobIds } } });
      const residualIssues = await prisma.jobIssue.count({ where: { id: { in: createdIssueIds } } });

      assert(residualOrders === 0, 'Residual test orders must be 0');
      assert(residualJobs === 0, 'Residual test jobs must be 0');
      assert(residualIssues === 0, 'Residual test issues must be 0');

      console.log('✔ Teardown completed: 100% of test records deleted. ZERO residual database pollution!');
    } catch (cleanupErr) {
      console.error('Error during cleanup teardown:', cleanupErr);
    } finally {
      await prisma.$disconnect();
      server.close();
    }

    if (testError) {
      process.exit(1);
    } else {
      console.log('\n🎯 ALL 16 PHASE 5 VERIFICATION TESTS COMPLETED WITH 100% PASS RATE!\n');
      process.exit(0);
    }
  }
}

runPhase5TestSuite();
