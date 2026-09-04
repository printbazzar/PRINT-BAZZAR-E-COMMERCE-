import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/v1/admin/qc/queue - Fetch QC inspection tickets
export const getQCQueue = async (req, res) => {
  try {
    const { status = 'ALL' } = req.query;

    const where = {};
    if (status !== 'ALL') {
      where.status = status;
    }

    const tickets = await prisma.qualityCheck.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerMobile: true,
            deliveryType: true,
            deliveryMethod: true,
            orderStatus: true,
          },
        },
        productionJob: {
          select: {
            jobNumber: true,
            productNameSnapshot: true,
            quantity: true,
            specsSnapshotJson: true,
            customizationSnapshotJson: true,
            approvedArtworkUrl: true,
            approvedArtworkVersion: true,
            assignedStaffName: true,
            machineNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      success: true,
      data: tickets,
      summary: {
        total: tickets.length,
        pending: tickets.filter((t) => t.status === 'PENDING').length,
        passed: tickets.filter((t) => t.status === 'PASSED').length,
        failed: tickets.filter((t) => t.status === 'FAILED').length,
      },
    });
  } catch (error) {
    console.error('getQCQueue error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch QC queue.' });
  }
};

// POST /api/v1/admin/qc/:id/inspect - Submit QC inspection result
export const submitQCInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, checklist, inspectorName, failureReason, failureNotes } = req.body;

    if (!['PASSED', 'FAILED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'QC status must be PASSED or FAILED.' });
    }

    if (status === 'FAILED' && !failureReason) {
      return res.status(400).json({ success: false, message: 'Failure reason is required when rejecting a print job.' });
    }

    const qcTicket = await prisma.qualityCheck.findUnique({
      where: { id },
      include: {
        order: true,
        productionJob: true,
      },
    });

    if (!qcTicket) {
      return res.status(404).json({ success: false, message: 'QC ticket not found.' });
    }

    // Update QC record
    const updatedQC = await prisma.qualityCheck.update({
      where: { id },
      data: {
        status,
        inspectorName: inspectorName || req.user?.name || 'QC Lead',
        checklistJson: checklist ? JSON.stringify(checklist) : qcTicket.checklistJson,
        failureReason: status === 'FAILED' ? failureReason : null,
        failureNotes: status === 'FAILED' ? failureNotes : null,
        inspectedAt: new Date(),
      },
    });

    if (status === 'PASSED') {
      // 1. Mark Production Job as COMPLETED
      if (qcTicket.productionJobId) {
        await prisma.productionJob.update({
          where: { id: qcTicket.productionJobId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }

      // 2. Transfer Parent Order to PACKING Department
      await prisma.order.update({
        where: { id: qcTicket.orderId },
        data: {
          currentDepartment: 'PACKING',
          orderStatus: 'PACKED',
          statusHistory: {
            create: {
              newStatus: 'PACKED',
              note: `Quality Check Passed by ${inspectorName || 'QC Officer'}. Transferred to Packaging Desk for box wrapping and label placement.`,
              changedByUserId: req.user?.id || null,
            },
          },
        },
      });

      // 3. Auto-instantiate or update Shipment
      const existingShipment = await prisma.shipment.findFirst({
        where: { orderId: qcTicket.orderId },
      });

      if (existingShipment) {
        await prisma.shipment.update({
          where: { id: existingShipment.id },
          data: { status: 'PACKED' },
        });
      }
    } else {
      // FAILED QC Routing: Send back to PRODUCTION or DESIGN
      const targetDept = failureReason === 'WRONG_ARTWORK' ? 'DESIGN' : 'PRODUCTION';
      const targetStatus = failureReason === 'WRONG_ARTWORK' ? 'ARTWORK_REQUIRED' : 'PRODUCTION_QUEUE';

      if (qcTicket.productionJobId) {
        await prisma.productionJob.update({
          where: { id: qcTicket.productionJobId },
          data: { status: 'REJECTED', notes: `QC REJECTED: ${failureReason} - ${failureNotes || ''}` },
        });
      }

      await prisma.order.update({
        where: { id: qcTicket.orderId },
        data: {
          currentDepartment: targetDept,
          orderStatus: targetStatus,
          statusHistory: {
            create: {
              newStatus: targetStatus,
              note: `QC FAILED: Defect identified [${failureReason}]. Returned to ${targetDept} for reprint/correction. Inspector Notes: ${failureNotes || 'None'}`,
              changedByUserId: req.user?.id || null,
            },
          },
        },
      });
    }

    return res.json({
      success: true,
      message: status === 'PASSED' ? 'QC Passed! Order transferred to Packaging.' : 'QC Failed. Order routed back for resolution.',
      qc: updatedQC,
    });
  } catch (error) {
    console.error('submitQCInspection error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit QC inspection.' });
  }
};
