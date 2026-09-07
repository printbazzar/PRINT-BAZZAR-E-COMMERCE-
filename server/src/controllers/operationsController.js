import { PrismaClient } from '@prisma/client';
import { calculateJobSLA } from '../utils/slaCalculator.js';
import { createStaffNotification } from './staffNotificationController.js';
import {
  validateJobTransition,
  validateOrderTransition,
  validateDepartmentAuthorization,
} from '../services/workflowStateService.js';

const prisma = new PrismaClient();

// Helper to check if user has manager/admin privileges
function isManagerOrAdmin(user) {
  const role = (user?.role?.name || user?.role || '').toLowerCase();
  const dept = (user?.department || 'ALL').toUpperCase();
  return role.includes('super') || role.includes('manager') || role.includes('lead') || dept === 'ALL';
}

// Helper to sanitize job for client
function sanitizeJobForClient(job, isFrontOffice = false) {
  const sla = calculateJobSLA(job, job.order);

  // Parse specs if string
  let specs = {};
  try {
    specs = typeof job.specsSnapshotJson === 'string' ? JSON.parse(job.specsSnapshotJson || '{}') : job.specsSnapshotJson || {};
  } catch {
    specs = {};
  }

  // Parse customization if string
  let customization = {};
  try {
    customization = typeof job.customizationSnapshotJson === 'string' ? JSON.parse(job.customizationSnapshotJson || '{}') : job.customizationSnapshotJson || {};
  } catch {
    customization = {};
  }

  // Parse options from orderItem if present
  let options = {};
  try {
    const rawOptions = job.orderItem?.optionsSnapshot || job.orderItem?.selectedOptions || '{}';
    options = typeof rawOptions === 'string' ? JSON.parse(rawOptions) : rawOptions;
  } catch {
    options = {};
  }

  return {
    id: job.id,
    jobNumber: job.jobNumber,
    orderId: job.orderId,
    orderNumber: job.order?.orderNumber || 'N/A',
    orderSource: job.order?.orderSource || 'WEBSITE',
    branch: job.order?.branch || 'TRICHY_MAIN',
    customerName: job.order?.customerName || 'N/A',
    customerMobile: job.order?.customerMobile || '',
    productName: job.productNameSnapshot || job.product?.name || 'Custom Print Job',
    quantity: job.quantity,
    size: specs.size || specs.Size || options.Size || options.Dimensions || 'Standard',
    material: specs.material || specs.paperStock || specs.Material || options.Material || options.Paper || options.GSM || 'Art Card',
    printType: specs.printingSide || specs['Printing Location'] || options['Printing Location'] || options.Printing || 'Single Side',
    color: specs.color || options.Color || 'Full Color CMYK',
    lamination: specs.lamination || options.Lamination || 'None',
    finishing: specs.finishing || options.Finishing || 'Standard Cut',
    specialInstructions: job.notes || job.order?.items?.[0]?.requirementNotes || customization.notes || 'None',
    priority: job.priority || 'NORMAL',
    deliveryDeadline: job.deadline || job.order?.estimatedDeliveryDate || null,
    slaStatus: sla.status,
    slaLabel: sla.label,
    slaColor: sla.color,
    hoursRemaining: sla.hoursRemaining,
    hoursDelayed: sla.hoursDelayed,
    paymentStatus: job.order?.paymentStatus || 'PENDING',
    grandTotal: isFrontOffice ? job.order?.grandTotal : undefined,
    balanceDue: isFrontOffice ? (job.order?.invoices?.[0]?.balanceDue ?? 0) : undefined,
    workflowStatus: job.status,
    orderStatus: job.order?.orderStatus || 'N/A',
    currentDepartment: job.assignedDepartment || job.order?.currentDepartment || 'PRODUCTION',
    assignedStaffId: job.assignedStaffId,
    assignedStaffName: job.assignedStaffName || 'Unassigned',
    assignedByName: job.assignedByName,
    assignedAt: job.assignedAt,
    machineNumber: job.machineNumber || 'Unassigned',
    approvedArtworkUrl: job.approvedArtworkUrl || job.order?.proofFileUrl || job.orderItem?.artworkFileUrl || null,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    isPaused: job.isPaused,
    pausedAt: job.pausedAt,
    pauseReason: job.pauseReason,
    openIssuesCount: job.issues?.filter((i) => i.resolutionStatus !== 'RESOLVED' && i.resolutionStatus !== 'DISMISSED').length || 0,
    issues: job.issues || [],
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

/**
 * GET /api/v1/admin/operations/queue
 * Central Department-Wise Staff Queue & Live Production Queue
 */
export const getDepartmentQueue = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = (user?.role?.name || user?.role || '').toLowerCase().includes('super');
    const userDept = (user?.department || 'ALL').toUpperCase();

    const {
      department = userDept !== 'ALL' ? userDept : 'PRODUCTION',
      tab = 'ALL',
      priority = 'ALL',
      status = 'ALL',
      search = '',
      page = 1,
      limit = 50,
    } = req.query;

    const targetDept = department.toUpperCase();

    // 1. Backend-Level Department Security Check
    if (!isSuperAdmin && userDept !== 'ALL' && userDept !== targetDept) {
      return res.status(403).json({
        success: false,
        code: 'DEPARTMENT_UNAUTHORIZED',
        message: `FORBIDDEN: You do not have permission to view the ${targetDept} queue. Your assigned department is ${userDept}.`,
      });
    }

    // Build Prisma query
    const where = {};

    // Department mapping
    if (targetDept !== 'ALL') {
      if (targetDept === 'PRODUCTION') {
        where.OR = [
          { assignedDepartment: 'PRODUCTION' },
          { order: { currentDepartment: 'PRODUCTION' } },
        ];
      } else if (targetDept === 'FINISHING' || targetDept === 'FINISHING_QC') {
        where.OR = [
          { assignedDepartment: { in: ['FINISHING', 'FINISHING_QC'] } },
          { order: { currentDepartment: 'FINISHING_QC' } },
        ];
      } else if (targetDept === 'DESIGN' || targetDept === 'PREPRESS') {
        where.OR = [
          { assignedDepartment: { in: ['DESIGN', 'PREPRESS'] } },
          { order: { currentDepartment: 'DESIGN' } },
        ];
      } else {
        where.assignedDepartment = targetDept;
      }
    }

    // Priority filter
    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    // Status filter
    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Search filter
    if (search && search.trim()) {
      const q = search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { jobNumber: { contains: q, mode: 'insensitive' } },
            { productNameSnapshot: { contains: q, mode: 'insensitive' } },
            { assignedStaffName: { contains: q, mode: 'insensitive' } },
            { machineNumber: { contains: q, mode: 'insensitive' } },
            { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
            { order: { customerName: { contains: q, mode: 'insensitive' } } },
            { order: { customerMobile: { contains: q } } },
          ],
        },
      ];
    }

    // Fetch matching jobs
    const rawJobs = await prisma.productionJob.findMany({
      where,
      include: {
        order: {
          include: {
            items: { take: 1 },
            invoices: { select: { balanceDue: true, paymentStatus: true } },
          },
        },
        orderItem: true,
        issues: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: Math.min(100, Number(limit)),
    });

    const isFrontOffice = userDept === 'FRONT_OFFICE';
    let formattedJobs = rawJobs.map((j) => sanitizeJobForClient(j, isFrontOffice));

    // 2. Personal Staff Workspace Tabs & Production Tabs Filter
    const upperTab = tab.toUpperCase();
    const todayStr = new Date().toISOString().split('T')[0];

    if (upperTab === 'MY_PENDING' || upperTab === 'ASSIGNED_TO_ME') {
      formattedJobs = formattedJobs.filter(
        (j) =>
          (j.assignedStaffId === user.id || (user.name && j.assignedStaffName?.toLowerCase() === user.name.toLowerCase())) &&
          !['COMPLETED', 'DELIVERED'].includes(j.workflowStatus)
      );
    } else if (upperTab === 'MY_IN_PROGRESS') {
      formattedJobs = formattedJobs.filter(
        (j) =>
          (j.assignedStaffId === user.id || (user.name && j.assignedStaffName?.toLowerCase() === user.name.toLowerCase())) &&
          ['PRINTING', 'FINISHING', 'IN_PROGRESS', 'DESIGNING'].includes(j.workflowStatus)
      );
    } else if (upperTab === 'WAITING' || upperTab === 'WAITING_FOR_ME') {
      formattedJobs = formattedJobs.filter(
        (j) =>
          (['QUEUED', 'WAITING_FOR_DESIGN_APPROVAL', 'ASSIGNED'].includes(j.workflowStatus) || !j.assignedStaffId) &&
          !['COMPLETED', 'DELIVERED', 'ON_HOLD'].includes(j.workflowStatus)
      );
    } else if (upperTab === 'IN_PROGRESS') {
      formattedJobs = formattedJobs.filter((j) =>
        ['PRINTING', 'FINISHING', 'IN_PROGRESS', 'MACHINE_ASSIGNED'].includes(j.workflowStatus)
      );
    } else if (upperTab === 'ON_HOLD') {
      formattedJobs = formattedJobs.filter(
        (j) => j.workflowStatus === 'ON_HOLD' || j.isPaused || j.openIssuesCount > 0
      );
    } else if (upperTab === 'QC_PENDING') {
      formattedJobs = formattedJobs.filter((j) =>
        ['SENT_TO_QC', 'QC_PENDING', 'PRE_PRODUCTION_QC'].includes(j.workflowStatus)
      );
    } else if (upperTab === 'COMPLETED_TODAY' || upperTab === 'COMPLETED') {
      formattedJobs = formattedJobs.filter(
        (j) =>
          ['COMPLETED', 'DELIVERED'].includes(j.workflowStatus) ||
          (j.completedAt && new Date(j.completedAt).toISOString().split('T')[0] === todayStr)
      );
    } else if (upperTab === 'DELAYED') {
      formattedJobs = formattedJobs.filter((j) => j.slaStatus === 'DELAYED');
    } else if (upperTab === 'PRIORITY' || upperTab === 'PRIORITY_JOBS') {
      formattedJobs = formattedJobs.filter((j) => j.priority === 'HIGH' || j.priority === 'URGENT');
    } else if (upperTab === 'UNASSIGNED') {
      formattedJobs = formattedJobs.filter(
        (j) => !j.assignedStaffId || j.assignedStaffName === 'Unassigned'
      );
    }

    // Dynamic queue summary counts
    const allQueueJobs = rawJobs.map((j) => sanitizeJobForClient(j, isFrontOffice));
    const summary = {
      total: allQueueJobs.length,
      waiting: allQueueJobs.filter((j) => ['QUEUED', 'ASSIGNED', 'WAITING_FOR_DESIGN_APPROVAL'].includes(j.workflowStatus)).length,
      assignedToMe: allQueueJobs.filter((j) => j.assignedStaffId === user.id || (user.name && j.assignedStaffName?.toLowerCase() === user.name.toLowerCase())).length,
      inProgress: allQueueJobs.filter((j) => ['PRINTING', 'FINISHING', 'IN_PROGRESS'].includes(j.workflowStatus)).length,
      onHold: allQueueJobs.filter((j) => j.workflowStatus === 'ON_HOLD' || j.isPaused || j.openIssuesCount > 0).length,
      qcPending: allQueueJobs.filter((j) => ['SENT_TO_QC', 'QC_PENDING', 'PRE_PRODUCTION_QC'].includes(j.workflowStatus)).length,
      completedToday: allQueueJobs.filter((j) => ['COMPLETED', 'DELIVERED'].includes(j.workflowStatus) || (j.completedAt && new Date(j.completedAt).toISOString().split('T')[0] === todayStr)).length,
      delayed: allQueueJobs.filter((j) => j.slaStatus === 'DELAYED').length,
      urgent: allQueueJobs.filter((j) => j.priority === 'URGENT' || j.priority === 'HIGH').length,
      unassigned: allQueueJobs.filter((j) => !j.assignedStaffId || j.assignedStaffName === 'Unassigned').length,
    };

    return res.json({
      success: true,
      department: targetDept,
      tab: upperTab,
      summary,
      jobs: formattedJobs,
    });
  } catch (err) {
    console.error('getDepartmentQueue error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch department queue.' });
  }
};

/**
 * POST /api/v1/admin/operations/jobs/:id/assign
 * Assign or reassign a ProductionJob to a primary staff member
 * Separated from workflow status (Does NOT alter workflow status)
 */
export const assignJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId, staffName, department, priority, estimatedCompletionTime } = req.body;

    const job = await prisma.productionJob.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Production Job not found.' });
    }

    // Role check: Only Manager/Admin or Department Lead can assign
    if (!isManagerOrAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ASSIGNMENT',
        message: 'Only Managers, Leads, and Admins are authorized to assign or reassign production jobs.',
      });
    }

    let targetStaffName = staffName;
    if (staffId && !targetStaffName) {
      const staffUser = await prisma.user.findUnique({ where: { id: staffId } });
      if (staffUser) targetStaffName = staffUser.name;
    }

    if (!targetStaffName) {
      return res.status(400).json({ success: false, message: 'Staff name or ID is required for assignment.' });
    }

    const isReassignment = Boolean(job.assignedStaffId || job.assignedStaffName);
    const prevStaff = job.assignedStaffName || 'Unassigned';

    const updateData = {
      assignedStaffId: staffId || null,
      assignedStaffName: targetStaffName,
      assignedDepartment: department || job.assignedDepartment || 'PRODUCTION',
    };

    if (isReassignment) {
      updateData.reassignedByUserId = req.user.id;
      updateData.reassignedByName = req.user.name;
      updateData.reassignedAt = new Date();
    } else {
      updateData.assignedByUserId = req.user.id;
      updateData.assignedByName = req.user.name;
      updateData.assignedAt = new Date();
    }

    if (priority) updateData.priority = priority;
    if (estimatedCompletionTime) updateData.estimatedCompletionTime = new Date(estimatedCompletionTime);

    const updatedJob = await prisma.productionJob.update({
      where: { id },
      data: updateData,
      include: { order: true },
    });

    // Mirror assigned staff to parent order
    await prisma.order.update({
      where: { id: job.orderId },
      data: { assignedStaffName: targetStaffName },
    });

    // Record immutable AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: isReassignment ? 'JOB_REASSIGNED' : 'JOB_ASSIGNED',
        entityName: 'ProductionJob',
        entityId: job.id,
        oldValues: JSON.stringify({ assignedStaff: prevStaff, priority: job.priority }),
        newValues: JSON.stringify({
          assignedStaff: targetStaffName,
          assignedStaffId: staffId,
          assignedBy: req.user.name,
          priority: updateData.priority || job.priority,
        }),
      },
    });

    // Dispatch in-app staff notification
    await createStaffNotification({
      userId: staffId || null,
      department: updateData.assignedDepartment,
      title: isReassignment ? 'Job Reassigned to You' : 'New Job Assigned',
      message: `Job ${job.jobNumber} (${job.productNameSnapshot}, Qty: ${job.quantity}) has been assigned to you by ${req.user.name}.`,
      type: isReassignment ? 'JOB_REASSIGNED' : 'NEW_JOB_ASSIGNED',
      orderId: job.orderId,
      productionJobId: job.id,
    });

    return res.json({
      success: true,
      message: `Job ${job.jobNumber} successfully assigned to ${targetStaffName}.`,
      job: sanitizeJobForClient(updatedJob),
    });
  } catch (err) {
    console.error('assignJob error:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign production job.' });
  }
};

/**
 * POST /api/v1/admin/operations/jobs/bulk-assign
 * Bulk assign multiple jobs to a staff member
 */
export const bulkAssignJobs = async (req, res) => {
  try {
    const { jobIds, staffId, staffName, department, priority } = req.body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ success: false, message: 'jobIds array is required.' });
    }

    if (!isManagerOrAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ASSIGNMENT',
        message: 'Only Managers and Admins can perform bulk assignment.',
      });
    }

    let targetStaffName = staffName;
    if (staffId && !targetStaffName) {
      const staffUser = await prisma.user.findUnique({ where: { id: staffId } });
      if (staffUser) targetStaffName = staffUser.name;
    }

    const results = [];
    for (const jobId of jobIds) {
      const updated = await prisma.productionJob.update({
        where: { id: jobId },
        data: {
          assignedStaffId: staffId || null,
          assignedStaffName: targetStaffName,
          assignedDepartment: department || 'PRODUCTION',
          assignedByUserId: req.user.id,
          assignedByName: req.user.name,
          assignedAt: new Date(),
          ...(priority ? { priority } : {}),
        },
      });
      results.push(updated.id);
    }

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'BULK_JOB_ASSIGNMENT',
        entityName: 'ProductionJob',
        entityId: null,
        newValues: JSON.stringify({ count: results.length, assignedStaff: targetStaffName, jobIds }),
      },
    });

    // Send notification
    await createStaffNotification({
      userId: staffId || null,
      department: department || 'PRODUCTION',
      title: 'Bulk Jobs Assigned',
      message: `${results.length} production jobs have been assigned to you by ${req.user.name}.`,
      type: 'NEW_JOB_ASSIGNED',
    });

    return res.json({
      success: true,
      message: `Successfully assigned ${results.length} jobs to ${targetStaffName}.`,
      assignedCount: results.length,
    });
  } catch (err) {
    console.error('bulkAssignJobs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to bulk assign jobs.' });
  }
};

/**
 * PATCH /api/v1/admin/operations/jobs/:id/priority
 * Update Job Priority (Independent from workflow status)
 * Enforces manager approval for URGENT
 */
export const updateJobPriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority, reason } = req.body;

    const allowed = ['LOW', 'NORMAL', 'HIGH', 'URGENT', 'STANDARD', 'EXPRESS'];
    if (!priority || !allowed.includes(priority.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority '${priority}'. Allowed: [LOW, NORMAL, HIGH, URGENT].`,
      });
    }

    const cleanPriority = priority.toUpperCase();

    // URGENT requires reason and manager privileges
    if (cleanPriority === 'URGENT') {
      if (!reason || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A specific operational reason is required when marking a job as URGENT.',
        });
      }
      if (!isManagerOrAdmin(req.user)) {
        return res.status(403).json({
          success: false,
          code: 'MANAGER_REQUIRED',
          message: 'Only Managers, Leads, and Admins can mark production jobs as URGENT.',
        });
      }
    }

    const job = await prisma.productionJob.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Production Job not found.' });
    }

    const prevPriority = job.priority;

    const updatedJob = await prisma.productionJob.update({
      where: { id },
      data: { priority: cleanPriority },
      include: { order: true },
    });

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PRIORITY_CHANGED',
        entityName: 'ProductionJob',
        entityId: job.id,
        oldValues: JSON.stringify({ priority: prevPriority }),
        newValues: JSON.stringify({ priority: cleanPriority, changedBy: req.user.name, reason: reason || 'Routine priority update' }),
      },
    });

    // If URGENT, dispatch high-priority alert
    if (cleanPriority === 'URGENT') {
      await createStaffNotification({
        department: job.assignedDepartment || 'PRODUCTION',
        title: 'URGENT Job Alert',
        message: `Job ${job.jobNumber} (${job.productNameSnapshot}) marked URGENT by ${req.user.name}. Reason: ${reason}`,
        type: 'URGENT_JOB',
        orderId: job.orderId,
        productionJobId: job.id,
      });
    }

    return res.json({
      success: true,
      message: `Priority for job ${job.jobNumber} updated to ${cleanPriority}. Workflow status remained unchanged.`,
      job: sanitizeJobForClient(updatedJob),
    });
  } catch (err) {
    console.error('updateJobPriority error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update job priority.' });
  }
};

/**
 * POST /api/v1/admin/operations/jobs/:id/start
 * Start printing job on press
 */
export const startProductionJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { machineNumber, notes } = req.body;

    const job = await prisma.productionJob.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Production Job not found.' });
    }

    // Role check: Only PRODUCTION or Admin can start press
    const authCheck = validateDepartmentAuthorization(req.user, 'PRODUCTION', 'STAGE_UPDATE');
    if (!authCheck.authorized) {
      return res.status(403).json({ success: false, code: 'DEPARTMENT_UNAUTHORIZED', message: authCheck.error });
    }

    // Validate transition
    const transitionCheck = validateJobTransition(job.status, 'PRINTING');
    if (!transitionCheck.isValid) {
      return res.status(400).json({ success: false, message: transitionCheck.error });
    }

    const updatedJob = await prisma.productionJob.update({
      where: { id },
      data: {
        status: 'PRINTING',
        startedAt: job.startedAt || new Date(),
        isPaused: false,
        pausedAt: null,
        machineNumber: machineNumber || job.machineNumber || 'Digital Press',
        ...(notes ? { notes } : {}),
      },
      include: { order: true },
    });

    // Update order status
    await prisma.order.update({
      where: { id: job.orderId },
      data: {
        orderStatus: 'PRINTING',
        currentDepartment: 'PRODUCTION',
        machineNumber: updatedJob.machineNumber,
        statusHistory: {
          create: {
            previousStatus: job.order.orderStatus,
            newStatus: 'PRINTING',
            note: `Production started on machine ${updatedJob.machineNumber}. Operator: ${req.user.name}.`,
            changedByUserId: req.user.id,
          },
        },
      },
    });

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'START_JOB',
        entityName: 'ProductionJob',
        entityId: job.id,
        oldValues: JSON.stringify({ status: job.status }),
        newValues: JSON.stringify({ status: 'PRINTING', machineNumber: updatedJob.machineNumber, startedAt: updatedJob.startedAt }),
      },
    });

    return res.json({
      success: true,
      message: `Production job ${job.jobNumber} successfully started on ${updatedJob.machineNumber}.`,
      job: sanitizeJobForClient(updatedJob),
    });
  } catch (err) {
    console.error('startProductionJob error:', err);
    return res.status(500).json({ success: false, message: 'Failed to start production job.' });
  }
};

/**
 * POST /api/v1/admin/operations/jobs/:id/pause
 * Pause an in-progress job (Preserves workflow stage)
 */
export const pauseProductionJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Routine pause by operator' } = req.body;

    const job = await prisma.productionJob.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Production Job not found.' });
    }

    const authCheck = validateDepartmentAuthorization(req.user, job.assignedDepartment || 'PRODUCTION', 'STAGE_UPDATE');
    if (!authCheck.authorized) {
      return res.status(403).json({ success: false, code: 'DEPARTMENT_UNAUTHORIZED', message: authCheck.error });
    }

    const updatedJob = await prisma.productionJob.update({
      where: { id },
      data: {
        isPaused: true,
        pausedAt: new Date(),
        pauseReason: reason,
      },
      include: { order: true },
    });

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PAUSE_JOB',
        entityName: 'ProductionJob',
        entityId: job.id,
        newValues: JSON.stringify({ isPaused: true, pauseReason: reason, pausedBy: req.user.name }),
      },
    });

    return res.json({
      success: true,
      message: `Job ${job.jobNumber} paused. Reason: ${reason}. Workflow stage (${job.status}) preserved.`,
      job: sanitizeJobForClient(updatedJob),
    });
  } catch (err) {
    console.error('pauseProductionJob error:', err);
    return res.status(500).json({ success: false, message: 'Failed to pause production job.' });
  }
};

/**
 * POST /api/v1/admin/operations/jobs/:id/resume
 * Resume a paused job
 */
export const resumeProductionJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await prisma.productionJob.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Production Job not found.' });
    }

    const authCheck = validateDepartmentAuthorization(req.user, job.assignedDepartment || 'PRODUCTION', 'STAGE_UPDATE');
    if (!authCheck.authorized) {
      return res.status(403).json({ success: false, code: 'DEPARTMENT_UNAUTHORIZED', message: authCheck.error });
    }

    const updatedJob = await prisma.productionJob.update({
      where: { id },
      data: {
        isPaused: false,
        pausedAt: null,
        pauseReason: null,
      },
      include: { order: true },
    });

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'RESUME_JOB',
        entityName: 'ProductionJob',
        entityId: job.id,
        newValues: JSON.stringify({ isPaused: false, resumedBy: req.user.name }),
      },
    });

    return res.json({
      success: true,
      message: `Job ${job.jobNumber} resumed. Operations continuing.`,
      job: sanitizeJobForClient(updatedJob),
    });
  } catch (err) {
    console.error('resumeProductionJob error:', err);
    return res.status(500).json({ success: false, message: 'Failed to resume production job.' });
  }
};

/**
 * POST /api/v1/admin/operations/jobs/:id/complete-printing
 * Mark printing complete and handover to Finishing
 */
export const completePrintingJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const job = await prisma.productionJob.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Production Job not found.' });
    }

    const authCheck = validateDepartmentAuthorization(req.user, 'PRODUCTION', 'STAGE_UPDATE');
    if (!authCheck.authorized) {
      return res.status(403).json({ success: false, code: 'DEPARTMENT_UNAUTHORIZED', message: authCheck.error });
    }

    const updatedJob = await prisma.productionJob.update({
      where: { id },
      data: {
        status: 'FINISHING',
        assignedDepartment: 'FINISHING_QC',
        completedAt: new Date(),
        isPaused: false,
        ...(notes ? { notes } : {}),
      },
      include: { order: true },
    });

    // Update order status to FINISHING
    await prisma.order.update({
      where: { id: job.orderId },
      data: {
        orderStatus: 'FINISHING',
        currentDepartment: 'FINISHING_QC',
        statusHistory: {
          create: {
            previousStatus: job.order.orderStatus,
            newStatus: 'FINISHING',
            note: `Printing completed. Handed over to Finishing desk. Operator: ${req.user.name}.`,
            changedByUserId: req.user.id,
          },
        },
      },
    });

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'COMPLETE_PRINTING',
        entityName: 'ProductionJob',
        entityId: job.id,
        oldValues: JSON.stringify({ status: job.status }),
        newValues: JSON.stringify({ status: 'FINISHING', completedBy: req.user.name }),
      },
    });

    // Dispatch notification to Finishing desk
    await createStaffNotification({
      department: 'FINISHING_QC',
      title: 'Job Ready for Finishing',
      message: `Job ${job.jobNumber} (${job.productNameSnapshot}, Qty: ${job.quantity}) has finished printing and is ready for finishing.`,
      type: 'READY_FOR_PRODUCTION',
      orderId: job.orderId,
      productionJobId: job.id,
    });

    return res.json({
      success: true,
      message: `Job ${job.jobNumber} printing completed. Handed over to Finishing desk.`,
      job: sanitizeJobForClient(updatedJob),
    });
  } catch (err) {
    console.error('completePrintingJob error:', err);
    return res.status(500).json({ success: false, message: 'Failed to complete printing.' });
  }
};

/**
 * POST /api/v1/admin/operations/jobs/:id/report-issue
 * Report production issue and move to ON_HOLD (Preserving preHoldStatus)
 */
export const reportJobIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { issueCategory, description, isBlocking = true } = req.body;

    const allowedCategories = [
      'ARTWORK_PROBLEM',
      'MATERIAL_UNAVAILABLE',
      'MACHINE_ISSUE',
      'COLOR_MISMATCH',
      'CUSTOMER_CLARIFICATION',
      'PAYMENT_ISSUE',
      'QUANTITY_MISMATCH',
      'DAMAGE',
      'OTHER',
    ];

    if (!issueCategory || !allowedCategories.includes(issueCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid issueCategory '${issueCategory}'. Allowed: [${allowedCategories.join(', ')}].`,
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Issue description is mandatory.' });
    }

    const job = await prisma.productionJob.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Production Job not found.' });
    }

    // 1. Create JobIssue record
    const issue = await prisma.jobIssue.create({
      data: {
        orderId: job.orderId,
        productionJobId: job.id,
        department: job.assignedDepartment || req.user.department || 'PRODUCTION',
        issueCategory,
        description: description.trim(),
        reportedByUserId: req.user.id,
        reportedByName: req.user.name,
        resolutionStatus: 'OPEN',
      },
    });

    // 2. If blocking, move to ON_HOLD preserving preHoldStatus
    let updatedJob = job;
    if (isBlocking) {
      const prevStatus = job.status;
      updatedJob = await prisma.productionJob.update({
        where: { id },
        data: {
          preHoldStatus: prevStatus, // Critical Rule 4: Preserves exact workflow stage
          status: 'ON_HOLD',
          isPaused: true,
          pausedAt: new Date(),
          pauseReason: `ON HOLD: [${issueCategory}] ${description.trim()}`,
        },
        include: { order: true, issues: true },
      });

      // Update order status to ON_HOLD (validating state machine)
      const transCheck = validateOrderTransition(job.order.orderStatus, 'ON_HOLD');
      if (transCheck.isValid) {
        await prisma.order.update({
          where: { id: job.orderId },
          data: {
            orderStatus: 'ON_HOLD',
            statusHistory: {
              create: {
                previousStatus: job.order.orderStatus,
                newStatus: 'ON_HOLD',
                note: `HOLD REPORTED: [${issueCategory}] ${description.trim()}. Reported by: ${req.user.name}.`,
                changedByUserId: req.user.id,
              },
            },
          },
        });
      }
    }

    // 3. Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ISSUE_REPORTED',
        entityName: 'JobIssue',
        entityId: issue.id,
        newValues: JSON.stringify({
          jobId: job.id,
          issueCategory,
          description,
          isBlocking,
          reportedBy: req.user.name,
        }),
      },
    });

    // 4. Alert Managers and Department
    await createStaffNotification({
      department: 'ALL',
      title: `ISSUE REPORTED: ${issueCategory}`,
      message: `Job ${job.jobNumber} put ON HOLD: ${description.trim()} (Reported by: ${req.user.name})`,
      type: 'ISSUE_REPORTED',
      orderId: job.orderId,
      productionJobId: job.id,
      metadata: { issueId: issue.id, category: issueCategory },
    });

    return res.status(201).json({
      success: true,
      message: `Issue reported successfully. Job ${job.jobNumber} moved to ON HOLD. Original stage preserved.`,
      issue,
      job: sanitizeJobForClient(updatedJob),
    });
  } catch (err) {
    console.error('reportJobIssue error:', err);
    return res.status(500).json({ success: false, message: 'Failed to report job issue.' });
  }
};

/**
 * POST /api/v1/admin/operations/issues/:id/resolve
 * Resolve a reported issue and restore job from ON_HOLD
 */
export const resolveJobIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const issue = await prisma.jobIssue.findUnique({
      where: { id },
      include: { productionJob: { include: { order: true } } },
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Job Issue not found.' });
    }

    // Update issue
    const updatedIssue = await prisma.jobIssue.update({
      where: { id },
      data: {
        resolutionStatus: 'RESOLVED',
        resolvedByUserId: req.user.id,
        resolvedByName: req.user.name,
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes || 'Issue resolved by staff supervisor.',
      },
    });

    // Restore job from ON_HOLD if no other open blocking issues exist
    const job = issue.productionJob;
    let restoredJob = job;

    if (job && job.status === 'ON_HOLD') {
      const restoredStatus = job.preHoldStatus || 'QUEUED';
      restoredJob = await prisma.productionJob.update({
        where: { id: job.id },
        data: {
          status: restoredStatus,
          preHoldStatus: null, // Clear hold checkpoint
          isPaused: false,
          pausedAt: null,
          pauseReason: null,
        },
        include: { order: true, issues: true },
      });

      // Restore order status
      const orderRestoredStatus = restoredStatus === 'PRINTING' ? 'PRINTING' : (restoredStatus === 'FINISHING' ? 'FINISHING' : 'PRODUCTION_QUEUE');
      await prisma.order.update({
        where: { id: job.orderId },
        data: {
          orderStatus: orderRestoredStatus,
          statusHistory: {
            create: {
              previousStatus: 'ON_HOLD',
              newStatus: orderRestoredStatus,
              note: `HOLD RELEASED: Issue [${issue.issueCategory}] resolved by ${req.user.name}. Returned to ${orderRestoredStatus}.`,
              changedByUserId: req.user.id,
            },
          },
        },
      });
    }

    // Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ISSUE_RESOLVED',
        entityName: 'JobIssue',
        entityId: issue.id,
        newValues: JSON.stringify({
          resolvedBy: req.user.name,
          resolutionNotes,
          restoredStatus: restoredJob?.status,
        }),
      },
    });

    // Notify staff
    await createStaffNotification({
      department: issue.department,
      title: 'Issue Resolved',
      message: `Issue [${issue.issueCategory}] on Job ${job?.jobNumber} resolved by ${req.user.name}. Job restored to ${restoredJob?.status}.`,
      type: 'ISSUE_RESOLVED',
      orderId: job?.orderId,
      productionJobId: job?.id,
    });

    return res.json({
      success: true,
      message: `Issue successfully resolved. Job restored to ${restoredJob?.status}.`,
      issue: updatedIssue,
      job: sanitizeJobForClient(restoredJob),
    });
  } catch (err) {
    console.error('resolveJobIssue error:', err);
    return res.status(500).json({ success: false, message: 'Failed to resolve job issue.' });
  }
};

/**
 * GET /api/v1/admin/operations/department-dashboard
 * Dashboard widgets for each of the factory & office departments
 */
export const getDepartmentDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      allOrders,
      allJobs,
      openIssues,
      staffUsers,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { orderStatus: { notIn: ['CANCELLED', 'COMPLETED'] } },
        select: { id: true, orderNumber: true, orderStatus: true, currentDepartment: true, grandTotal: true, createdAt: true, estimatedDeliveryDate: true },
      }),
      prisma.productionJob.findMany({
        where: { status: { notIn: ['CANCELLED'] } },
        include: { order: { select: { orderNumber: true, customerName: true, estimatedDeliveryDate: true } } },
      }),
      prisma.jobIssue.findMany({
        where: { resolutionStatus: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, department: true, role: { select: { name: true } } },
      }),
    ]);

    // Department widgets
    const designJobs = allJobs.filter((j) => j.assignedDepartment === 'DESIGN' || j.order?.currentDepartment === 'DESIGN');
    const prepressJobs = allJobs.filter((j) => j.status === 'ARTWORK_REVIEW' || j.status === 'PRE_PRODUCTION_QC');
    const productionJobs = allJobs.filter((j) => j.assignedDepartment === 'PRODUCTION' || j.order?.currentDepartment === 'PRODUCTION');
    const finishingJobs = allJobs.filter((j) => j.assignedDepartment === 'FINISHING_QC' || j.order?.currentDepartment === 'FINISHING_QC');
    const qcJobs = allJobs.filter((j) => j.status === 'SENT_TO_QC' || j.status === 'QC_PENDING');
    const packingOrders = allOrders.filter((o) => ['PACKING', 'PACKED'].includes(o.orderStatus) || o.currentDepartment === 'PACKING');
    const deliveryOrders = allOrders.filter((o) => ['READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'].includes(o.orderStatus) || o.currentDepartment === 'DELIVERY');

    const widgets = {
      DESIGN: {
        newJobs: designJobs.filter((j) => j.status === 'WAITING_FOR_DESIGN_APPROVAL' || j.status === 'QUEUED').length,
        inProgress: designJobs.filter((j) => j.status === 'DESIGN_IN_PROGRESS' || j.status === 'DESIGNING').length,
        customerApprovalPending: designJobs.filter((j) => j.status === 'WAITING_FOR_DESIGN_APPROVAL' || j.order?.proofStatus === 'SENT_TO_CUSTOMER').length,
        delayed: designJobs.filter((j) => calculateJobSLA(j).status === 'DELAYED').length,
      },
      PREPRESS: {
        artworkReviewPending: prepressJobs.filter((j) => j.status === 'ARTWORK_REVIEW').length,
        qcPending: prepressJobs.filter((j) => j.status === 'PRE_PRODUCTION_QC').length,
      },
      PRODUCTION: {
        queue: productionJobs.filter((j) => j.status === 'QUEUED' || j.status === 'ASSIGNED').length,
        printing: productionJobs.filter((j) => j.status === 'PRINTING').length,
        onHold: productionJobs.filter((j) => j.status === 'ON_HOLD' || j.isPaused).length,
        completedToday: productionJobs.filter((j) => j.completedAt && new Date(j.completedAt) >= today).length,
      },
      FINISHING: {
        pendingFinishing: finishingJobs.filter((j) => j.status === 'FINISHING' || j.status === 'PRINTING_COMPLETED').length,
        inProgress: finishingJobs.filter((j) => j.status === 'FINISHING').length,
        completedToday: finishingJobs.filter((j) => j.completedAt && new Date(j.completedAt) >= today).length,
      },
      QC: {
        qcPending: qcJobs.length,
      },
      PACKING: {
        pendingPacking: packingOrders.filter((o) => o.orderStatus === 'PACKING').length,
        packedToday: packingOrders.filter((o) => o.orderStatus === 'PACKED').length,
      },
      DELIVERY: {
        readyForDispatch: deliveryOrders.filter((o) => o.orderStatus === 'READY_FOR_DELIVERY').length,
        outForDelivery: deliveryOrders.filter((o) => o.orderStatus === 'OUT_FOR_DELIVERY').length,
      },
      ADMIN: {
        totalActiveOrders: allOrders.length,
        totalJobs: allJobs.length,
        delayedJobs: allJobs.filter((j) => calculateJobSLA(j).status === 'DELAYED').length,
        urgentJobs: allJobs.filter((j) => j.priority === 'URGENT').length,
        openIssuesCount: openIssues.length,
      },
    };

    return res.json({
      success: true,
      widgets,
      openIssues,
    });
  } catch (err) {
    console.error('getDepartmentDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch department dashboard.' });
  }
};

/**
 * GET /api/v1/admin/operations/manager-overview
 * Operational Bottleneck Telemetry for Production Managers & Super Admins
 */
export const getManagerOverview = async (req, res) => {
  try {
    if (!isManagerOrAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        code: 'MANAGER_REQUIRED',
        message: 'Only Managers and Admins can access the Manager Operational Overview.',
      });
    }

    const now = new Date();

    const [activeJobs, activeOrders, openIssues, staffList] = await Promise.all([
      prisma.productionJob.findMany({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        include: { order: true },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
      prisma.order.findMany({
        where: { orderStatus: { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] } },
        select: { id: true, orderNumber: true, orderStatus: true, currentDepartment: true, createdAt: true, estimatedDeliveryDate: true },
      }),
      prisma.jobIssue.findMany({
        where: { resolutionStatus: 'OPEN' },
        include: { productionJob: { select: { jobNumber: true, productNameSnapshot: true } } },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, department: true, role: { select: { name: true } } },
      }),
    ]);

    // 1. Bottleneck Diagnostics
    const designStuck = activeJobs.filter(
      (j) => j.status === 'WAITING_FOR_DESIGN_APPROVAL' || j.order?.proofStatus === 'SENT_TO_CUSTOMER'
    );
    const preQcStuck = activeJobs.filter(
      (j) => j.status === 'PRE_PRODUCTION_QC' || j.order?.orderStatus === 'PRE_PRODUCTION_QC'
    );
    const printingWait = activeJobs.filter(
      (j) => j.status === 'QUEUED' && j.order?.orderStatus === 'PRODUCTION_QUEUE'
    );
    const onHoldList = activeJobs.filter(
      (j) => j.status === 'ON_HOLD' || j.isPaused
    );

    // 2. SLA Delayed Jobs
    const delayedJobs = activeJobs
      .map((j) => sanitizeJobForClient(j, false))
      .filter((j) => j.slaStatus === 'DELAYED');

    // 3. Staff Workload Distribution
    const staffWorkload = staffList.map((staff) => {
      const assigned = activeJobs.filter(
        (j) => j.assignedStaffId === staff.id || (j.assignedStaffName && j.assignedStaffName.toLowerCase() === staff.name.toLowerCase())
      );
      return {
        staffId: staff.id,
        staffName: staff.name,
        department: staff.department,
        role: staff.role?.name,
        assignedCount: assigned.length,
        inProgressCount: assigned.filter((j) => ['PRINTING', 'FINISHING', 'DESIGNING'].includes(j.status)).length,
        urgentCount: assigned.filter((j) => j.priority === 'URGENT').length,
      };
    }).sort((a, b) => b.assignedCount - a.assignedCount);

    return res.json({
      success: true,
      telemetry: {
        totalActiveOrders: activeOrders.length,
        totalActiveJobs: activeJobs.length,
        delayedJobsCount: delayedJobs.length,
        onHoldCount: onHoldList.length,
        openIssuesCount: openIssues.length,
      },
      bottlenecks: {
        waitingForDesignApproval: {
          count: designStuck.length,
          jobs: designStuck.slice(0, 5).map((j) => ({ id: j.id, jobNumber: j.jobNumber, orderNumber: j.order?.orderNumber, customerName: j.order?.customerName })),
        },
        stuckInPreProductionQC: {
          count: preQcStuck.length,
          jobs: preQcStuck.slice(0, 5).map((j) => ({ id: j.id, jobNumber: j.jobNumber, orderNumber: j.order?.orderNumber })),
        },
        waitingForPressRun: {
          count: printingWait.length,
          jobs: printingWait.slice(0, 5).map((j) => ({ id: j.id, jobNumber: j.jobNumber, priority: j.priority })),
        },
        onHoldOrPaused: {
          count: onHoldList.length,
          jobs: onHoldList.map((j) => ({ id: j.id, jobNumber: j.jobNumber, reason: j.pauseReason, preHoldStatus: j.preHoldStatus })),
        },
      },
      delayedJobs: delayedJobs.slice(0, 10),
      openIssues,
      staffWorkload,
    });
  } catch (err) {
    console.error('getManagerOverview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch manager overview.' });
  }
};
