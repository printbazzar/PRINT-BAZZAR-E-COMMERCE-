import { PrismaClient } from '@prisma/client';
import { sendOrderNotification } from '../services/notificationService.js';

const prisma = new PrismaClient();

// Department Definitions
export const DEPARTMENTS = {
  DESIGN: {
    key: 'DESIGN',
    title: '1. Design & Prepress Hub',
    description: 'Artwork inspection, bleed validation & WhatsApp digital proofing',
    color: 'purple',
    statuses: ['ORDER_RECEIVED', 'PROCESSING', 'Processing', 'ARTWORK_REQUIRED', 'DESIGN_IN_PROGRESS', 'DESIGN_REVIEW', 'DESIGN_APPROVED'],
  },
  PRODUCTION: {
    key: 'PRODUCTION',
    title: '2. Print Room & Production',
    description: 'Offset / Digital press machine printing & plate setup',
    color: 'yellow',
    statuses: ['PRODUCTION_QUEUE', 'PRINTING', 'PROCESSING', 'Processing'],
  },
  FINISHING_QC: {
    key: 'FINISHING_QC',
    title: '3. Finishing & Quality Control',
    description: 'Lamination, die-cutting, folding & quality inspection pass',
    color: 'indigo',
    statuses: ['FINISHING', 'QC'],
  },
  PACKING: {
    key: 'PACKING',
    title: '4. Packaging & Dispatch Desk',
    description: 'Box packing, bubble wrapping, weighing & dispatch slip attachment',
    color: 'orange',
    statuses: ['PACKED', 'READY_FOR_DELIVERY'],
  },
  DELIVERY: {
    key: 'DELIVERY',
    title: '5. Logistics & Delivery',
    description: 'Trichy local express delivery boy & All-India courier tracking',
    color: 'blue',
    statuses: ['OUT_FOR_DELIVERY'],
  },
  COMPLETED: {
    key: 'COMPLETED',
    title: '6. Delivered & Completed',
    description: 'Order handed over to customer',
    color: 'green',
    statuses: ['DELIVERED', 'COMPLETED'],
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
      let dept = order.currentDepartment || 'PRODUCTION';
      if (!columns[dept]) {
        // Fallback mapping based on status
        if (['ORDER_RECEIVED', 'PROCESSING', 'Processing', 'ARTWORK_REQUIRED', 'DESIGN_IN_PROGRESS', 'DESIGN_REVIEW', 'DESIGN_APPROVED'].includes(order.orderStatus)) {
          dept = order.currentDepartment || 'DESIGN';
        } else if (['PRODUCTION_QUEUE', 'PRINTING'].includes(order.orderStatus)) {
          dept = 'PRODUCTION';
        } else if (['FINISHING', 'QC'].includes(order.orderStatus)) {
          dept = 'FINISHING_QC';
        } else if (['PACKED', 'READY_FOR_DELIVERY'].includes(order.orderStatus)) {
          dept = 'PACKING';
        } else if (['OUT_FOR_DELIVERY'].includes(order.orderStatus)) {
          dept = 'DELIVERY';
        } else if (['DELIVERED', 'COMPLETED'].includes(order.orderStatus)) {
          dept = 'COMPLETED';
        }
      }

      if (columns[dept]) {
        columns[dept].push(order);
      }
    });

    const summary = {
      totalActive: orders.filter((o) => o.orderStatus !== 'DELIVERED').length,
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
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const oldStatus = order.orderStatus;
    const effectiveStatus = newStatus || oldStatus;
    const effectiveDept = targetDepartment || order.currentDepartment;

    // Generate automated customer note if none supplied
    let generatedNote = note;
    if (!generatedNote) {
      if (effectiveDept === 'PRODUCTION') {
        generatedNote = `Artwork approved. Transferred to Printing Press room on ${machineNumber || 'Digital Offset Machine'}.`;
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

    // Update order with department fields
    const updatedOrder = await prisma.order.update({
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

    // Record Audit Log
    try {
      await prisma.auditLog.create({
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
            note: generatedNote,
          }),
          ipAddress: req.ip || '127.0.0.1',
        },
      });
    } catch (auditErr) {
      console.error('Failed to log audit:', auditErr);
    }

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
      message: `Order successfully handed over to ${effectiveDept} department.`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error handing over order:', error);
    return res.status(500).json({ success: false, message: 'Failed to handover order to next department.' });
  }
};

// POST /api/v1/orders/:orderNumber/approve-proof - Customer One-Click Proof Approval
export const approveCustomerProof = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { action, customerComment } = req.body; // action: 'APPROVED' | 'REVISION_REQUESTED'

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { invoices: true, items: true },
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
          message: `Digital proof approved! Please complete the printing balance payment of ₹${balanceDue} to release order to the Press Room.`,
          order,
        });
      }

      // Auto-advance to PRODUCTION department
      const updated = await prisma.order.update({
        where: { orderNumber },
        data: {
          proofStatus: 'APPROVED',
          proofApprovedAt: new Date(),
          currentDepartment: 'PRODUCTION',
          orderStatus: 'PRODUCTION_QUEUE',
          statusHistory: {
            create: {
              previousStatus: order.orderStatus,
              newStatus: 'PRODUCTION_QUEUE',
              note: `Digital proof approved by customer online. Auto-assigned to Press Production queue. ${
                customerComment ? `Note: "${customerComment}"` : ''
              }`,
            },
          },
        },
      });

      return res.json({
        success: true,
        requiresBalancePayment: false,
        message: 'Proof approved! Your order has moved to the Printing Press production room.',
        order: updated,
      });
    } else {
      // Revision requested
      const updated = await prisma.order.update({
        where: { orderNumber },
        data: {
          proofStatus: 'REVISION_REQUESTED',
          currentDepartment: 'DESIGN',
          orderStatus: 'DESIGN_IN_PROGRESS',
          statusHistory: {
            create: {
              previousStatus: order.orderStatus,
              newStatus: 'DESIGN_IN_PROGRESS',
              note: `Customer requested design revision: "${customerComment || 'Please adjust artwork.'}"`,
            },
          },
        },
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
