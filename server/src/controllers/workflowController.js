import { PrismaClient } from '@prisma/client';
import { sendOrderNotification } from '../services/notificationService.js';
import {
  validateOrderTransition,
  validateJobTransition,
  validateDepartmentAuthorization,
  validatePreProductionChecklist,
  MANDATORY_PRE_PRODUCTION_CHECKLIST,
} from '../services/workflowStateService.js';

const prisma = new PrismaClient();

// Department Definitions
export const DEPARTMENTS = {
  DESIGN: {
    key: 'DESIGN',
    title: '1. Design & Prepress Hub',
    description: 'Artwork inspection, bleed validation & customer proofing',
    color: 'purple',
    statuses: [
      'ORDER_CREATED',
      'PAYMENT_PENDING',
      'PAYMENT_CONFIRMED',
      'ORDER_REVIEW',
      'ARTWORK_REVIEW',
      'DESIGN_QUEUE',
      'DESIGN_REQUIRED',
      'ARTWORK_APPROVED',
      'CUSTOMER_APPROVAL_REQUIRED',
      'CUSTOMER_APPROVAL',
      'ORDER_RECEIVED',
      'PROCESSING',
      'Processing',
      'ARTWORK_REQUIRED',
      'DESIGN_IN_PROGRESS',
      'DESIGN_REVIEW',
      'DESIGN_APPROVED',
      'DRAFT_READY',
      'SENT_TO_CUSTOMER',
      'REVISION',
      'REVISION_REQUESTED',
    ],
  },
  PRODUCTION: {
    key: 'PRODUCTION',
    title: '2. Print Room & Production',
    description: 'Pre-production QC, press queue & machine printing',
    color: 'yellow',
    statuses: ['PRE_PRODUCTION_QC', 'PRODUCTION_QUEUE', 'MACHINE_ASSIGNED', 'PRINTING', 'PRINTING_COMPLETED'],
  },
  FINISHING_QC: {
    key: 'FINISHING_QC',
    title: '3. Finishing & Quality Control',
    description: 'Lamination, die-cutting, folding & inspection pass',
    color: 'indigo',
    statuses: ['FINISHING', 'FINISHING_COMPLETED', 'QUALITY_CHECK', 'QC'],
  },
  PACKING: {
    key: 'PACKING',
    title: '4. Packaging & Dispatch Desk',
    description: 'Box packing, bubble wrapping, weighing & dispatch preparation',
    color: 'orange',
    statuses: ['PACKING', 'PACKED', 'READY', 'READY_FOR_DISPATCH', 'READY_FOR_DELIVERY', 'READY_FOR_PICKUP'],
  },
  DELIVERY: {
    key: 'DELIVERY',
    title: '5. Logistics & Delivery',
    description: 'Trichy local express delivery boy & All-India courier tracking',
    color: 'blue',
    statuses: ['DISPATCHED', 'OUT_FOR_DELIVERY'],
  },
  COMPLETED: {
    key: 'COMPLETED',
    title: '6. Delivered & Completed',
    description: 'Order handed over to customer',
    color: 'green',
    statuses: ['DELIVERED', 'COMPLETED', 'PICKED_UP'],
  },
};

// GET /api/v1/admin/workflow/board - Fetch all orders grouped by department
export const getWorkflowBoard = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        orderStatus: { notIn: ['CANCELLED'] },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                thumbnailUrl: true,
                turnaroundTime: true,
              },
            },
          },
        },
        productionJobs: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
        invoices: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        shipments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        qualityChecks: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const columns = {
      DESIGN: [],
      PRODUCTION: [],
      FINISHING_QC: [],
      PACKING: [],
      DELIVERY: [],
      COMPLETED: [],
    };

    orders.forEach((order) => {
      let dept = order.currentDepartment;
      if (!columns[dept]) {
        // Fallback mapping based on status
        if (DEPARTMENTS.DESIGN.statuses.includes(order.orderStatus)) {
          dept = 'DESIGN';
        } else if (DEPARTMENTS.PRODUCTION.statuses.includes(order.orderStatus)) {
          dept = 'PRODUCTION';
        } else if (DEPARTMENTS.FINISHING_QC.statuses.includes(order.orderStatus)) {
          dept = 'FINISHING_QC';
        } else if (DEPARTMENTS.PACKING.statuses.includes(order.orderStatus)) {
          dept = 'PACKING';
        } else if (DEPARTMENTS.DELIVERY.statuses.includes(order.orderStatus)) {
          dept = 'DELIVERY';
        } else if (DEPARTMENTS.COMPLETED.statuses.includes(order.orderStatus)) {
          dept = 'COMPLETED';
        } else {
          dept = 'DESIGN';
        }
      }

      if (columns[dept]) {
        columns[dept].push(order);
      }
    });

    const summary = {
      totalActive: orders.filter((o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'COMPLETED').length,
      byDepartment: {
        DESIGN: columns.DESIGN.length,
        PRODUCTION: columns.PRODUCTION.length,
        FINISHING_QC: columns.FINISHING_QC.length,
        PACKING: columns.PACKING.length,
        DELIVERY: columns.DELIVERY.length,
        COMPLETED: columns.COMPLETED.length,
      },
    };

    return res.json({
      success: true,
      data: {
        columns,
        summary,
        meta: DEPARTMENTS,
      },
    });
  } catch (error) {
    console.error('Error fetching workflow board:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch workflow pipeline.' });
  }
};

// POST /api/v1/admin/orders/:id/handover - Department Handover & Milestone Transition
export const handoverOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      targetDepartment,
      newStatus,
      assignedStaffName,
      machineNumber,
      proofFileUrl,
      proofStatus,
      packingWeight,
      courierPartner,
      trackingReference,
      trackingUrl,
      note,
    } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true, productionJobs: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const oldStatus = order.orderStatus;
    const effectiveStatus = newStatus || oldStatus;
    const effectiveDept = targetDepartment || order.currentDepartment;

    // 1. Role / Department Authorization Check
    const authCheck = validateDepartmentAuthorization(req.user, effectiveDept, 'TRANSITION');
    if (!authCheck.authorized) {
      return res.status(403).json({ success: false, message: authCheck.error });
    }

    // 2. Strict State-Machine Transition Validation
    const transitionCheck = validateOrderTransition(oldStatus, effectiveStatus);
    if (!transitionCheck.isValid) {
      return res.status(400).json({ success: false, message: transitionCheck.error });
    }

    // Idempotent duplicate call handling
    if (transitionCheck.isDuplicate && effectiveDept === order.currentDepartment) {
      return res.json({
        success: true,
        isDuplicate: true,
        message: `Order is already in ${effectiveStatus} (${effectiveDept}). No state change needed.`,
        order,
      });
    }

    // Generate automated customer note if none supplied
    let generatedNote = note;
    if (!generatedNote) {
      if (effectiveDept === 'PRODUCTION') {
        generatedNote = `Transferred to Printing Press room on ${machineNumber || 'Digital Offset Press'}.`;
      } else if (effectiveDept === 'FINISHING_QC') {
        generatedNote = 'Printing completed. Job handed over to Finishing & Quality Inspection desk.';
      } else if (effectiveDept === 'PACKING') {
        generatedNote = 'Quality check passed (100% OK). Parcel packaged securely for dispatch.';
      } else if (effectiveDept === 'DELIVERY') {
        generatedNote = `Parcel dispatched via ${courierPartner || 'Local Express'}. Tracking: ${trackingReference || 'Out for Delivery'}.`;
      } else if (effectiveDept === 'COMPLETED') {
        generatedNote = 'Order successfully delivered to customer. Thank you for choosing Print Bazzar!';
      }
    }

    // Map Order Status to corresponding ProductionJob Status
    let targetJobStatus = null;
    if (effectiveStatus === 'PRE_PRODUCTION_QC') targetJobStatus = 'PRE_PRODUCTION_QC';
    else if (effectiveStatus === 'PRODUCTION_QUEUE') targetJobStatus = 'QUEUED';
    else if (effectiveStatus === 'MACHINE_ASSIGNED') targetJobStatus = 'MACHINE_ASSIGNED';
    else if (effectiveStatus === 'PRINTING') targetJobStatus = 'PRINTING';
    else if (effectiveStatus === 'FINISHING') targetJobStatus = 'FINISHING';
    else if (effectiveStatus === 'QUALITY_CHECK' || effectiveStatus === 'QC') targetJobStatus = 'SENT_TO_QC';
    else if (effectiveStatus === 'DELIVERED' || effectiveStatus === 'COMPLETED') targetJobStatus = 'COMPLETED';

    // Atomic Database Transaction for Order & ProductionJob Synchronization
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id },
        data: {
          orderStatus: effectiveStatus,
          currentDepartment: effectiveDept,
          assignedStaffName: assignedStaffName || order.assignedStaffName,
          machineNumber: machineNumber !== undefined ? machineNumber : order.machineNumber,
          proofFileUrl: proofFileUrl !== undefined ? proofFileUrl : order.proofFileUrl,
          proofStatus: proofStatus !== undefined ? proofStatus : order.proofStatus,
          packingWeight: packingWeight !== undefined ? packingWeight : order.packingWeight,
          courierPartner: courierPartner !== undefined ? courierPartner : order.courierPartner,
          trackingReference: trackingReference !== undefined ? trackingReference : order.trackingReference,
          trackingUrl: trackingUrl !== undefined ? trackingUrl : order.trackingUrl,
          statusHistory: {
            create: {
              previousStatus: oldStatus,
              newStatus: effectiveStatus,
              note: `${generatedNote} [Department: ${effectiveDept}]`,
              changedByUserId: req.user?.id || null,
            },
          },
        },
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (targetJobStatus) {
        await tx.productionJob.updateMany({
          where: { orderId: id },
          data: {
            status: targetJobStatus,
            ...(machineNumber ? { machineNumber } : {}),
            ...(assignedStaffName ? { assignedStaffName } : {}),
            ...(effectiveStatus === 'PRINTING' ? { startedAt: new Date() } : {}),
            ...(effectiveStatus === 'DELIVERED' || effectiveStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
            ...(proofStatus === 'APPROVED' ? { artworkStatus: 'APPROVED' } : {}),
          },
        });
      }

      if (targetJobStatus === 'SENT_TO_QC' || effectiveStatus === 'QC' || effectiveStatus === 'QUALITY_CHECK') {
        const existingQC = await tx.qualityCheck.findFirst({
          where: { orderId: id, status: 'PENDING' },
        });
        if (!existingQC) {
          const currentYear = new Date().getFullYear();
          const qcCount = await tx.qualityCheck.count();
          const qcNumber = `PB-QC-${currentYear}-${String(qcCount + 1).padStart(5, '0')}`;
          await tx.qualityCheck.create({
            data: {
              qcNumber,
              orderId: id,
              productionJobId: order.productionJobs?.[0]?.id || null,
              status: 'PENDING',
              checklistJson: JSON.stringify({
                correctQuantity: null,
                correctSize: null,
                correctMaterial: null,
                correctColour: null,
                correctLamination: null,
                correctFinishing: null,
                noDamage: null,
                correctCustomization: null,
                matchesApprovedArtwork: null,
              }),
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'DEPARTMENT_HANDOVER',
          entityName: 'Order',
          entityId: id,
          userId: req.user?.id || null,
          oldValues: JSON.stringify({ department: order.currentDepartment, status: oldStatus }),
          newValues: JSON.stringify({
            department: effectiveDept,
            status: effectiveStatus,
            staff: assignedStaffName,
            jobStatus: targetJobStatus,
            note: generatedNote,
          }),
          ipAddress: req.ip || '127.0.0.1',
        },
      });

      return ord;
    });

    // Asynchronously dispatch milestone notification to customer
    try {
      if (effectiveDept === 'PRODUCTION' || effectiveStatus === 'PRINTING') {
        sendOrderNotification({ order: updatedOrder, eventType: 'PRODUCTION_STARTED' }).catch(() => {});
      } else if (effectiveDept === 'PACKING' || effectiveStatus === 'PACKED') {
        sendOrderNotification({ order: updatedOrder, eventType: 'PACKED' }).catch(() => {});
      } else if (effectiveDept === 'DELIVERY' || effectiveStatus === 'OUT_FOR_DELIVERY' || trackingReference) {
        sendOrderNotification({
          order: updatedOrder,
          eventType: 'DISPATCHED',
          extra: { courierPartner: updatedOrder.courierPartner, trackingReference: updatedOrder.trackingReference },
        }).catch(() => {});
      }
    } catch (notifErr) {
      console.error('[HANDOVER NOTIFICATION ERROR]', notifErr.message);
    }

    return res.json({
      success: true,
      message: `Order successfully handed over to ${effectiveDept} department (${effectiveStatus}).`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error handing over order:', error);
    return res.status(500).json({ success: false, message: 'Failed to handover order to next department.' });
  }
};

// POST /api/v1/orders/:orderNumber/approve-proof - Customer One-Click Proof Approval
// Strict Rule #1: Customer Proof Approval MUST NEVER directly move an order to PRODUCTION_QUEUE.
// Mandatory Workflow: CUSTOMER_PROOF_APPROVED -> PRE_PRODUCTION_QC -> QC_APPROVED -> PRODUCTION_QUEUE -> PRINTING
export const approveCustomerProof = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { action, customerComment } = req.body; // action: 'APPROVED' | 'REVISION_REQUESTED'

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { invoices: true, items: true, productionJobs: true, designOrders: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (action === 'APPROVED') {
      const invoice = order.invoices?.[0];
      const designFee = order.items.reduce((s, i) => s + (i.designCharge || 0), 0);
      const balanceDue = invoice ? invoice.balanceDue : Math.max(0, order.grandTotal - designFee);

      // If order was partially paid (design fee only), require printing balance payment before press release
      if (order.paymentStatus === 'PARTIALLY_PAID' && balanceDue > 0) {
        return res.json({
          success: true,
          requiresBalancePayment: true,
          balanceDue,
          message: `Digital proof approved! Please complete the printing balance payment of ₹${balanceDue} to release order to Pre-Production QC.`,
          order,
        });
      }

      // STRICT BUSINESS RULE: Proof approval moves ONLY to PRE_PRODUCTION_QC (NEVER PRODUCTION_QUEUE directly)
      const targetStatus = 'PRE_PRODUCTION_QC';
      const targetDept = 'PRODUCTION';
      const now = new Date();

      const updated = await prisma.$transaction(async (tx) => {
        // 1. Update Order: move strictly to PRE_PRODUCTION_QC
        const ord = await tx.order.update({
          where: { orderNumber },
          data: {
            proofStatus: 'APPROVED',
            proofApprovedAt: now,
            currentDepartment: targetDept,
            orderStatus: targetStatus,
            statusHistory: {
              create: {
                previousStatus: order.orderStatus,
                newStatus: targetStatus,
                note: `Digital proof approved by customer online. Order transferred strictly to Pre-Production QC Prepress Gate. ${
                  customerComment ? `Note: "${customerComment}"` : ''
                }`,
              },
            },
          },
          include: {
            items: true,
            statusHistory: { orderBy: { createdAt: 'desc' } },
          },
        });

        // 2. Synchronize ProductionJobs: update artworkStatus to APPROVED and status to QC_PENDING
        await tx.productionJob.updateMany({
          where: { orderId: order.id },
          data: {
            status: 'QC_PENDING',
            artworkStatus: 'APPROVED',
            approvedArtworkUrl: order.proofFileUrl || order.items?.[0]?.artworkFileUrl || null,
            approvedArtworkVersion: 'Proof V1 - Approved by Customer',
          },
        });

        // 3. Synchronize DesignOrders: mark as APPROVED
        await tx.designOrder.updateMany({
          where: { orderId: order.id },
          data: {
            status: 'APPROVED',
            approvedAt: now,
          },
        });

        // 4. Record Audit Log
        await tx.auditLog.create({
          data: {
            action: 'CUSTOMER_PROOF_APPROVED',
            entityName: 'Order',
            entityId: order.id,
            oldValues: JSON.stringify({ status: order.orderStatus, proofStatus: order.proofStatus }),
            newValues: JSON.stringify({
              status: targetStatus,
              department: targetDept,
              proofStatus: 'APPROVED',
              approvedAt: now.toISOString(),
              customerComment,
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return ord;
      });

      return res.json({
        success: true,
        requiresBalancePayment: false,
        message: 'Digital proof approved! Your order has moved to Pre-Production QC for prepress verification.',
        order: updated,
      });
    } else {
      // Revision requested
      const targetStatus = 'DESIGN_IN_PROGRESS';
      const targetDept = 'DESIGN';

      const updated = await prisma.$transaction(async (tx) => {
        const ord = await tx.order.update({
          where: { orderNumber },
          data: {
            proofStatus: 'REVISION_REQUESTED',
            currentDepartment: targetDept,
            orderStatus: targetStatus,
            statusHistory: {
              create: {
                previousStatus: order.orderStatus,
                newStatus: targetStatus,
                note: `Customer requested design revision: "${customerComment || 'Please adjust artwork.'}"`,
              },
            },
          },
        });

        await tx.designOrder.updateMany({
          where: { orderId: order.id },
          data: { status: 'REVISION' },
        });

        await tx.productionJob.updateMany({
          where: { orderId: order.id },
          data: {
            status: 'WAITING_FOR_DESIGN_APPROVAL',
            artworkStatus: 'WAITING_APPROVAL',
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'CUSTOMER_PROOF_REVISION_REQUESTED',
            entityName: 'Order',
            entityId: order.id,
            oldValues: JSON.stringify({ status: order.orderStatus, proofStatus: order.proofStatus }),
            newValues: JSON.stringify({
              status: targetStatus,
              department: targetDept,
              proofStatus: 'REVISION_REQUESTED',
              customerComment,
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return ord;
      });

      return res.json({
        success: true,
        message: 'Revision request sent to the design team. We will send an updated proof shortly.',
        order: updated,
      });
    }
  } catch (error) {
    console.error('Error approving proof:', error);
    return res.status(500).json({ success: false, message: 'Failed to process proof approval.' });
  }
};

// POST /api/v1/admin/orders/:id/pre-production-qc
// Mandatory Pre-Production QC Gate: Verifies 12-point prepress checklist before releasing to PRODUCTION_QUEUE
export const submitPreProductionQC = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action, checklist = {}, inspectorName, notes, returnTarget } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { productionJobs: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Role check: Only Prepress (DESIGN), Production, or Super Admin can pass Pre-Production QC
    const authCheck = validateDepartmentAuthorization(req.user, 'PRODUCTION', 'PRE_PRODUCTION_QC');
    if (!authCheck.authorized) {
      return res.status(403).json({ success: false, message: authCheck.error });
    }

    const inspector = inspectorName || req.user?.name || 'Prepress Lead';

    // ACTION 1: APPROVE FOR PRODUCTION
    if (action === 'APPROVE_FOR_PRODUCTION' || status === 'PASSED') {
      // Validate all mandatory prepress checklist keys
      const checklistValidation = validatePreProductionChecklist(checklist);
      if (!checklistValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: `PRE-PRODUCTION QC FAILED: Mandatory checks missing: [${checklistValidation.missingKeys.join(', ')}]. All 9 prepress checks must be verified before releasing to PRODUCTION_QUEUE.`,
          missingKeys: checklistValidation.missingKeys,
        });
      }

      // Validate transition: Order must be in PRE_PRODUCTION_QC to advance to PRODUCTION_QUEUE
      const transitionCheck = validateOrderTransition(order.orderStatus, 'PRODUCTION_QUEUE');
      if (!transitionCheck.isValid) {
        return res.status(400).json({ success: false, message: transitionCheck.error });
      }

      const now = new Date();
      const qcNumber = `PB-PREQC-${now.getFullYear()}-${String(await prisma.qualityCheck.count() + 1).padStart(5, '0')}`;

      // Atomic release to PRODUCTION_QUEUE
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // 1. Advance Order to PRODUCTION_QUEUE
        const ord = await tx.order.update({
          where: { id },
          data: {
            orderStatus: 'PRODUCTION_QUEUE',
            currentDepartment: 'PRODUCTION',
            statusHistory: {
              create: {
                previousStatus: order.orderStatus,
                newStatus: 'PRODUCTION_QUEUE',
                note: `Pre-Production QC PASSED by ${inspector}. 9-point prepress checklist verified. Released to Press Production Queue. ${
                  notes ? `Notes: "${notes}"` : ''
                }`,
                changedByUserId: req.user?.id || null,
              },
            },
          },
          include: { items: true, statusHistory: { orderBy: { createdAt: 'desc' } } },
        });

        // 2. Synchronize ProductionJobs: Set status = QUEUED, artworkStatus = APPROVED
        await tx.productionJob.updateMany({
          where: { orderId: id },
          data: {
            status: 'QUEUED',
            artworkStatus: 'APPROVED',
          },
        });

        // 3. Create QualityCheck record for Pre-Production Gate
        await tx.qualityCheck.create({
          data: {
            qcNumber,
            orderId: id,
            productionJobId: order.productionJobs?.[0]?.id || null,
            inspectorName: inspector,
            status: 'PASSED',
            checklistJson: JSON.stringify(checklist),
            failureNotes: notes || null,
            inspectedAt: now,
          },
        });

        // 4. Audit Log
        await tx.auditLog.create({
          data: {
            action: 'PRE_PRODUCTION_QC_PASSED',
            entityName: 'Order',
            entityId: id,
            userId: req.user?.id || null,
            oldValues: JSON.stringify({ status: order.orderStatus }),
            newValues: JSON.stringify({
              status: 'PRODUCTION_QUEUE',
              department: 'PRODUCTION',
              qcNumber,
              inspector,
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return ord;
      });

      return res.json({
        success: true,
        message: 'Pre-Production QC PASSED! Checklist verified. Order released to Press Production Queue.',
        order: updatedOrder,
      });
    }

    // ACTION 2: RETURN TO DESIGN
    if (action === 'RETURN_TO_DESIGN' || returnTarget === 'DESIGN') {
      const now = new Date();
      const qcNumber = `PB-PREQC-${now.getFullYear()}-${String(await prisma.qualityCheck.count() + 1).padStart(5, '0')}`;

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const ord = await tx.order.update({
          where: { id },
          data: {
            orderStatus: 'DESIGN_QUEUE',
            currentDepartment: 'DESIGN',
            statusHistory: {
              create: {
                previousStatus: order.orderStatus,
                newStatus: 'DESIGN_QUEUE',
                note: `Pre-Production QC: Returned to Design Team by ${inspector}. Reason: ${notes || 'Design corrections requested.'}`,
                changedByUserId: req.user?.id || null,
              },
            },
          },
        });

        await tx.productionJob.updateMany({
          where: { orderId: id },
          data: {
            status: 'WAITING_FOR_DESIGN_APPROVAL',
            artworkStatus: 'WAITING_APPROVAL',
          },
        });

        await tx.designOrder.updateMany({
          where: { orderId: id },
          data: { status: 'REVISION' },
        });

        await tx.qualityCheck.create({
          data: {
            qcNumber,
            orderId: id,
            productionJobId: order.productionJobs?.[0]?.id || null,
            inspectorName: inspector,
            status: 'FAILED',
            checklistJson: JSON.stringify(checklist),
            failureReason: 'RETURN_TO_DESIGN',
            failureNotes: notes || 'Returned to Design.',
            inspectedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'PRE_PRODUCTION_QC_RETURNED_TO_DESIGN',
            entityName: 'Order',
            entityId: id,
            userId: req.user?.id || null,
            oldValues: JSON.stringify({ status: order.orderStatus }),
            newValues: JSON.stringify({
              status: 'DESIGN_QUEUE',
              department: 'DESIGN',
              qcNumber,
              inspector,
              notes,
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return ord;
      });

      return res.json({
        success: true,
        message: 'Order successfully returned to Design Team for revision.',
        order: updatedOrder,
      });
    }

    // ACTION 3: RETURN TO ARTWORK REVIEW
    if (action === 'RETURN_TO_ARTWORK_REVIEW' || returnTarget === 'ARTWORK_REVIEW') {
      const now = new Date();
      const qcNumber = `PB-PREQC-${now.getFullYear()}-${String(await prisma.qualityCheck.count() + 1).padStart(5, '0')}`;

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const ord = await tx.order.update({
          where: { id },
          data: {
            orderStatus: 'ORDER_REVIEW',
            currentDepartment: 'DESIGN',
            statusHistory: {
              create: {
                previousStatus: order.orderStatus,
                newStatus: 'ORDER_REVIEW',
                note: `Pre-Production QC: Returned to Artwork Review by ${inspector}. Reason: ${notes || 'Artwork review needed.'}`,
                changedByUserId: req.user?.id || null,
              },
            },
          },
        });

        await tx.productionJob.updateMany({
          where: { orderId: id },
          data: {
            status: 'ARTWORK_REVIEW',
            artworkStatus: 'WAITING_APPROVAL',
          },
        });

        await tx.qualityCheck.create({
          data: {
            qcNumber,
            orderId: id,
            productionJobId: order.productionJobs?.[0]?.id || null,
            inspectorName: inspector,
            status: 'FAILED',
            checklistJson: JSON.stringify(checklist),
            failureReason: 'RETURN_TO_ARTWORK_REVIEW',
            failureNotes: notes || 'Returned to Artwork Review.',
            inspectedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'PRE_PRODUCTION_QC_RETURNED_TO_ARTWORK_REVIEW',
            entityName: 'Order',
            entityId: id,
            userId: req.user?.id || null,
            oldValues: JSON.stringify({ status: order.orderStatus }),
            newValues: JSON.stringify({
              status: 'ORDER_REVIEW',
              department: 'DESIGN',
              qcNumber,
              inspector,
              notes,
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return ord;
      });

      return res.json({
        success: true,
        message: 'Order successfully returned to Prepress Artwork Review.',
        order: updatedOrder,
      });
    }

    // Default Fallback for status === 'FAILED'
    if (status === 'FAILED') {
      const now = new Date();
      const qcNumber = `PB-PREQC-${now.getFullYear()}-${String(await prisma.qualityCheck.count() + 1).padStart(5, '0')}`;

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const ord = await tx.order.update({
          where: { id },
          data: {
            orderStatus: 'ARTWORK_REVIEW',
            currentDepartment: 'DESIGN',
            statusHistory: {
              create: {
                previousStatus: order.orderStatus,
                newStatus: 'ARTWORK_REVIEW',
                note: `Pre-Production QC REJECTED by ${inspector}. Held in Prepress for resolution. Reason: ${notes || 'Prepress specifications did not match.'}`,
                changedByUserId: req.user?.id || null,
              },
            },
          },
        });

        await tx.productionJob.updateMany({
          where: { orderId: id },
          data: {
            status: 'ARTWORK_REVIEW',
            artworkStatus: 'WAITING_APPROVAL',
          },
        });

        await tx.qualityCheck.create({
          data: {
            qcNumber,
            orderId: id,
            productionJobId: order.productionJobs?.[0]?.id || null,
            inspectorName: inspector,
            status: 'FAILED',
            checklistJson: JSON.stringify(checklist),
            failureReason: 'PREPRESS_SPEC_MISMATCH',
            failureNotes: notes || 'Pre-Production QC rejected.',
            inspectedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'PRE_PRODUCTION_QC_FAILED',
            entityName: 'Order',
            entityId: id,
            userId: req.user?.id || null,
            oldValues: JSON.stringify({ status: order.orderStatus }),
            newValues: JSON.stringify({
              status: 'ARTWORK_REVIEW',
              qcNumber,
              inspector,
              notes,
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return ord;
      });

      return res.status(400).json({
        success: false,
        message: 'Pre-Production QC FAILED. Order held in Prepress for resolution.',
        order: updatedOrder,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid QC action or status.' });
  } catch (error) {
    console.error('submitPreProductionQC error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit Pre-Production QC.' });
  }
};

// POST /api/v1/admin/orders/:id/artwork-review
// Prepress staff inspects customer raw upload and advances to PRE_PRODUCTION_QC or requests re-upload
export const reviewArtwork = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes, printReadyUrl } = req.body; // action: 'APPROVE' | 'REJECT'

    const order = await prisma.order.findUnique({
      where: { id },
      include: { productionJobs: true, items: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Role check: Only Prepress (DESIGN) or Super Admin can perform artwork review
    const authCheck = validateDepartmentAuthorization(req.user, 'DESIGN', 'ARTWORK_REVIEW');
    if (!authCheck.authorized) {
      return res.status(403).json({ success: false, message: authCheck.error });
    }

    const reviewer = req.user?.name || 'Prepress Specialist';

    if (action === 'APPROVE') {
      const targetStatus = 'PRE_PRODUCTION_QC';
      const targetDept = 'PRODUCTION';
      const effectivePrintFile = printReadyUrl || order.proofFileUrl || order.items?.[0]?.artworkFileUrl;

      const updated = await prisma.$transaction(async (tx) => {
        const ord = await tx.order.update({
          where: { id },
          data: {
            orderStatus: targetStatus,
            currentDepartment: targetDept,
            proofStatus: 'APPROVED',
            proofApprovedAt: new Date(),
            proofFileUrl: effectivePrintFile,
            statusHistory: {
              create: {
                previousStatus: order.orderStatus,
                newStatus: targetStatus,
                note: `Prepress artwork review APPROVED by ${reviewer}. File verified print-ready. Transferred to Pre-Production QC Gate. ${
                  notes ? `Note: "${notes}"` : ''
                }`,
                changedByUserId: req.user?.id || null,
              },
            },
          },
        });

        await tx.productionJob.updateMany({
          where: { orderId: id },
          data: {
            status: 'PRE_PRODUCTION_QC',
            artworkStatus: 'APPROVED',
            approvedArtworkUrl: effectivePrintFile,
            approvedArtworkVersion: 'Prepress Approved V1',
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'ARTWORK_REVIEW_APPROVED',
            entityName: 'Order',
            entityId: id,
            userId: req.user?.id || null,
            oldValues: JSON.stringify({ status: order.orderStatus }),
            newValues: JSON.stringify({
              status: targetStatus,
              department: targetDept,
              reviewer,
              notes,
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return ord;
      });

      return res.json({
        success: true,
        message: 'Artwork approved! Order transferred to Pre-Production QC Gate.',
        order: updated,
      });
    } else {
      // Rejection: Request customer re-upload
      const targetStatus = 'ARTWORK_REVIEW';
      const updated = await prisma.$transaction(async (tx) => {
        const ord = await tx.order.update({
          where: { id },
          data: {
            orderStatus: targetStatus,
            proofStatus: 'REVISION_REQUESTED',
            statusHistory: {
              create: {
                previousStatus: order.orderStatus,
                newStatus: targetStatus,
                note: `Artwork REJECTED by Prepress (${reviewer}). Reason: ${notes || 'File resolution or dimensions insufficient.'}`,
                customerNote: `Artwork needs adjustment: ${notes || 'Please upload higher resolution file with bleed.'}`,
                changedByUserId: req.user?.id || null,
              },
            },
          },
        });

        await tx.productionJob.updateMany({
          where: { orderId: id },
          data: {
            status: 'ARTWORK_REVIEW',
            artworkStatus: 'WAITING_APPROVAL',
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'ARTWORK_REVIEW_REJECTED',
            entityName: 'Order',
            entityId: id,
            userId: req.user?.id || null,
            oldValues: JSON.stringify({ status: order.orderStatus }),
            newValues: JSON.stringify({
              status: targetStatus,
              reviewer,
              notes,
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return ord;
      });

      return res.json({
        success: true,
        message: 'Artwork rejected. Customer notified to provide updated print files.',
        order: updated,
      });
    }
  } catch (error) {
    console.error('reviewArtwork error:', error);
    return res.status(500).json({ success: false, message: 'Failed to review artwork.' });
  }
};
