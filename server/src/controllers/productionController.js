import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/v1/admin/production/jobs - List production jobs with filters
export const getProductionJobs = async (req, res) => {
  try {
    const { status, priority, machine, search } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }
    if (machine) {
      where.machineNumber = machine;
    }
    if (search) {
      const q = search.trim();
      where.OR = [
        { jobNumber: { contains: q, mode: 'insensitive' } },
        { productNameSnapshot: { contains: q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
        { order: { customerName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const jobs = await prisma.productionJob.findMany({
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
            currentDepartment: true,
            estimatedDeliveryDate: true,
            proofStatus: true,
          },
        },
        orderItem: {
          select: {
            skuSnapshot: true,
            unitPriceSnapshot: true,
            totalPriceSnapshot: true,
            artworkFileUrl: true,
            artworkOption: true,
            designJobNumber: true,
          },
        },
        qualityChecks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Summary KPIs
    const totalJobs = jobs.length;
    const queuedCount = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'READY_FOR_PRODUCTION').length;
    const printingCount = jobs.filter((j) => j.status === 'PRINTING').length;
    const finishingCount = jobs.filter((j) => j.status === 'FINISHING' || j.status === 'PRINTING_COMPLETED').length;
    const qcCount = jobs.filter((j) => j.status === 'SENT_TO_QC').length;
    const waitingDesignCount = jobs.filter((j) => j.status === 'WAITING_FOR_DESIGN_APPROVAL').length;

    return res.json({
      success: true,
      data: jobs,
      summary: {
        totalJobs,
        queuedCount,
        printingCount,
        finishingCount,
        qcCount,
        waitingDesignCount,
      },
    });
  } catch (error) {
    console.error('getProductionJobs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch production jobs.' });
  }
};

// GET /api/v1/admin/production/jobs/:id - Single Job Card details
export const getProductionJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await prisma.productionJob.findFirst({
      where: {
        OR: [{ id }, { jobNumber: id }],
      },
      include: {
        order: {
          include: {
            items: true,
            statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
            shipments: { take: 1 },
          },
        },
        orderItem: true,
        qualityChecks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Production Job Card not found.' });
    }

    return res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('getProductionJobById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch job card details.' });
  }
};

// PUT /api/v1/admin/production/jobs/:id/stage - Update production milestone
export const updateProductionJobStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, assignedStaffName, machineNumber, notes, priority } = req.body;

    const job = await prisma.productionJob.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Production Job not found.' });
    }

    // Design Lock Enforcement (Critical Requirement #20)
    if (
      job.status === 'WAITING_FOR_DESIGN_APPROVAL' &&
      job.artworkStatus !== 'APPROVED' &&
      ['PRINTING', 'FINISHING', 'SENT_TO_QC'].includes(stage)
    ) {
      return res.status(400).json({
        success: false,
        message: 'DESIGN LOCK: Cannot advance production until customer or prepress approves the design proof!',
      });
    }

    const updateData = {};
    if (stage) updateData.status = stage;
    if (assignedStaffName) updateData.assignedStaffName = assignedStaffName;
    if (machineNumber) updateData.machineNumber = machineNumber;
    if (priority) updateData.priority = priority;
    if (notes) updateData.notes = notes;

    if (stage === 'PRINTING' && !job.startedAt) {
      updateData.startedAt = new Date();
    }
    if (stage === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updatedJob = await prisma.productionJob.update({
      where: { id },
      data: updateData,
    });

    // Mirror to parent order status & department
    let orderStatusUpdate = null;
    let deptUpdate = null;
    let historyNote = `Job ${job.jobNumber} updated to ${stage}.`;

    if (stage === 'PRINTING') {
      orderStatusUpdate = 'PRINTING';
      deptUpdate = 'PRODUCTION';
      historyNote = `Press run started on machine ${machineNumber || job.machineNumber || 'Digital Press'}. Operator: ${assignedStaffName || job.assignedStaffName || 'Press Team'}.`;
    } else if (stage === 'FINISHING' || stage === 'PRINTING_COMPLETED') {
      orderStatusUpdate = 'FINISHING';
      deptUpdate = 'FINISHING_QC';
      historyNote = `Printing completed. Transferred to Finishing (Lamination, Die-cutting, Corner rounding).`;
    } else if (stage === 'SENT_TO_QC') {
      orderStatusUpdate = 'QC';
      deptUpdate = 'FINISHING_QC';
      historyNote = `Finishing completed. Transferred to Quality Inspection Desk.`;

      // Auto-instantiate Quality Check Ticket if none exists for this job
      const currentYear = new Date().getFullYear();
      const qcCount = await prisma.qualityCheck.count();
      const qcNumber = `PB-QC-${currentYear}-${String(qcCount + 1).padStart(5, '0')}`;

      await prisma.qualityCheck.create({
        data: {
          qcNumber,
          orderId: job.orderId,
          productionJobId: job.id,
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

    if (orderStatusUpdate || deptUpdate) {
      await prisma.order.update({
        where: { id: job.orderId },
        data: {
          ...(orderStatusUpdate ? { orderStatus: orderStatusUpdate } : {}),
          ...(deptUpdate ? { currentDepartment: deptUpdate } : {}),
          statusHistory: {
            create: {
              newStatus: orderStatusUpdate || job.order.orderStatus,
              note: historyNote,
              changedByUserId: req.user?.id || null,
            },
          },
        },
      });
    }

    return res.json({
      success: true,
      message: `Production Job ${job.jobNumber} successfully transitioned to ${stage}.`,
      job: updatedJob,
    });
  } catch (error) {
    console.error('updateProductionJobStage error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update production milestone.' });
  }
};
