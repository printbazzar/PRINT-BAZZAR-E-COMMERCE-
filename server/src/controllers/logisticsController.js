import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/v1/admin/logistics/queue - Get orders in packing & dispatch queue
export const getLogisticsQueue = async (req, res) => {
  try {
    const { mode = 'ALL', deliveryMethod } = req.query;

    const where = {};
    if (deliveryMethod) {
      where.deliveryMethod = deliveryMethod;
    }

    if (mode === 'PACKING') {
      where.currentDepartment = 'PACKING';
    } else if (mode === 'DISPATCH') {
      where.currentDepartment = { in: ['PACKING', 'DELIVERY'] };
      where.orderStatus = { in: ['PACKED', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'] };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { name: true, thumbnailUrl: true } },
          },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        productionJobs: {
          select: { jobNumber: true, status: true },
        },
        qualityChecks: {
          where: { status: 'PASSED' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      success: true,
      data: orders,
      summary: {
        total: orders.length,
        storePickup: orders.filter((o) => o.deliveryMethod === 'STORE_PICKUP').length,
        courier: orders.filter((o) => o.deliveryMethod !== 'STORE_PICKUP').length,
        readyForPickup: orders.filter((o) => o.orderStatus === 'READY_FOR_DELIVERY' && o.deliveryMethod === 'STORE_PICKUP').length,
        readyForDispatch: orders.filter((o) => o.orderStatus === 'READY_FOR_DELIVERY' && o.deliveryMethod !== 'STORE_PICKUP').length,
      },
    });
  } catch (error) {
    console.error('getLogisticsQueue error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch logistics queue.' });
  }
};

// POST /api/v1/admin/logistics/orders/:orderId/pack - Complete packing
export const completePacking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      packageCount = 1,
      packageWeightKg,
      boxDimensions,
      packingStaffName,
      packingChecklist,
    } = req.body;

    const parsedWeight = parseFloat(packageWeightKg);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid parcel weight (in kg, e.g. 0.5) is required.',
      });
    }

    if (!boxDimensions || typeof boxDimensions !== 'string' || !boxDimensions.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Box dimensions (e.g. 30x20x10 cm) are required.',
      });
    }

    const parsedCount = parseInt(packageCount, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Package count must be at least 1.',
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipments: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isPickup = order.deliveryMethod === 'STORE_PICKUP';
    const nextStatus = 'READY_FOR_DELIVERY';
    const nextDept = 'DELIVERY';
    const packingWeightText = `${parsedWeight} kg (${parsedCount} parcel${parsedCount > 1 ? 's' : ''})`;

    // Update parent order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: nextStatus,
        currentDepartment: nextDept,
        packingWeight: packingWeightText,
        pickupReadyAt: isPickup ? new Date() : null,
        statusHistory: {
          create: {
            newStatus: nextStatus,
            note: isPickup
              ? `Packing completed. Order boxed, labeled, and marked READY FOR STORE PICKUP at Trichy press facility.`
              : `Packing completed (${packingWeightText}). Order boxed and marked READY FOR COURIER DISPATCH.`,
            changedByUserId: req.user?.id || null,
          },
        },
      },
    });

    // Update or create linked Shipment
    let shipment = order.shipments?.[0];
    const shipmentData = {
      packageCount: parseInt(packageCount, 10) || 1,
      packageWeightKg: parseFloat(packageWeightKg) || null,
      boxDimensions: boxDimensions || null,
      status: isPickup ? 'READY_FOR_PICKUP' : 'READY_FOR_DISPATCH',
      pickupReadyAt: isPickup ? new Date() : null,
    };

    if (shipment) {
      shipment = await prisma.shipment.update({
        where: { id: shipment.id },
        data: shipmentData,
      });
    } else {
      const year = new Date().getFullYear();
      const count = await prisma.shipment.count();
      const shipmentNumber = `PB-SHIP-${year}-${String(count + 1).padStart(5, '0')}`;
      const addr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress || '{}') : order.shippingAddress || {};

      shipment = await prisma.shipment.create({
        data: {
          shipmentNumber,
          orderId,
          deliveryMethod: order.deliveryMethod || 'COURIER',
          recipientName: addr.recipientName || order.customerName,
          mobile: addr.mobile || order.customerMobile,
          fullAddress: addr.street || 'Store Pickup - Trichy Press Facility',
          city: addr.city || 'Tiruchirappalli',
          state: addr.state || 'Tamil Nadu',
          pincode: addr.pincode || '620008',
          ...shipmentData,
        },
      });
    }

    return res.json({
      success: true,
      message: isPickup ? 'Order packed and ready for customer pickup!' : 'Order packed and queued for courier dispatch!',
      shipment,
    });
  } catch (error) {
    console.error('completePacking error:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete packing.' });
  }
};

// POST /api/v1/admin/logistics/orders/:orderId/dispatch-courier - Dispatch via Courier Partner
export const dispatchCourier = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      courierPartner, // DTDC, ST Courier, Professional, Blue Dart, Delhivery, etc.
      trackingNumber,
      trackingUrl,
      expectedDeliveryDate,
      dispatchStaffName,
    } = req.body;

    if (!courierPartner || !trackingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Courier partner name and tracking/waybill number are required.',
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipments: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Auto-resolve tracking URL if partner is known and tracking URL is omitted
    let computedTrackingUrl = trackingUrl;
    if (!computedTrackingUrl) {
      const lower = courierPartner.toLowerCase();
      if (lower.includes('dtdc')) {
        computedTrackingUrl = `https://www.dtdc.in/tracking/tracking_results.asp?trkType=AWB&strAwNo=${trackingNumber}`;
      } else if (lower.includes('st courier')) {
        computedTrackingUrl = `https://stcourier.com/track/search?awb=${trackingNumber}`;
      } else if (lower.includes('professional')) {
        computedTrackingUrl = `https://www.tpcindia.com/tracking.aspx?strawbno=${trackingNumber}`;
      } else if (lower.includes('blue dart') || lower.includes('bluedart')) {
        computedTrackingUrl = `https://www.bluedart.com/tracking?trackNumber=${trackingNumber}`;
      } else if (lower.includes('delhivery')) {
        computedTrackingUrl = `https://www.delhivery.com/track/package/${trackingNumber}`;
      } else if (lower.includes('speed post') || lower.includes('india post')) {
        computedTrackingUrl = `https://www.indiapost.gov.in/_layouts/15/dpt.cpt.application/trackconsignment.aspx`;
      }
    }

    // Update parent order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: 'OUT_FOR_DELIVERY',
        currentDepartment: 'DELIVERY',
        courierPartner,
        trackingReference: trackingNumber,
        trackingUrl: computedTrackingUrl,
        estimatedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : order.estimatedDeliveryDate,
        statusHistory: {
          create: {
            newStatus: 'OUT_FOR_DELIVERY',
            note: `Dispatched via ${courierPartner} (AWB: ${trackingNumber}). Transit started for doorstep delivery.`,
            changedByUserId: req.user?.id || null,
          },
        },
      },
    });

    // Update or create linked Shipment
    let shipment = order.shipments?.[0];
    const shipmentData = {
      courierPartner,
      trackingNumber,
      trackingUrl: computedTrackingUrl,
      dispatchDate: new Date(),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      dispatchStaffName: dispatchStaffName || req.user?.name || 'Dispatch Executive',
      status: 'SHIPPED',
    };

    if (shipment) {
      shipment = await prisma.shipment.update({
        where: { id: shipment.id },
        data: shipmentData,
      });
    }

    return res.json({
      success: true,
      message: `Courier dispatch recorded. Tracking ${trackingNumber} logged.`,
      order: updatedOrder,
      shipment,
    });
  } catch (error) {
    console.error('dispatchCourier error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record courier dispatch.' });
  }
};

// POST /api/v1/admin/logistics/orders/:orderId/handover-pickup - Store Pickup Handover
export const handoverStorePickup = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      verifiedCustomerName,
      handoverStaffName,
      collectBalanceAtCounter,
      counterPaymentMethod = 'CASH', // 'CASH' | 'UPI' | 'CARD' | 'OTHER'
      counterPaymentReference,
      counterPaymentNotes,
    } = req.body;

    if (!verifiedCustomerName || !verifiedCustomerName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer verification name is mandatory to complete store pickup handover.',
      });
    }

    const staffName = handoverStaffName || req.user?.name;
    if (!staffName || !staffName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Staff handover confirmation (operator/manager name) is required.',
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipments: true,
        invoices: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const invoice = order.invoices?.[0];
    let balanceDue = 0;
    if (invoice) {
      balanceDue = typeof invoice.balanceDue === 'number' ? invoice.balanceDue : 0;
    } else if (order.paymentStatus !== 'PAID') {
      balanceDue = order.grandTotal || 0;
    }

    const isCodOrExempt = order.paymentMethod === 'COD' || order.paymentStatus === 'COD_CONFIRMED';
    const isBalanceZero = balanceDue <= 0 || order.paymentStatus === 'PAID';

    // 1. If balance is due and order is not exempt, require counter payment collection
    if (!isBalanceZero && !isCodOrExempt) {
      if (!collectBalanceAtCounter) {
        return res.status(400).json({
          success: false,
          requiresBalancePayment: true,
          balanceDue,
          message: `Cannot complete store pickup handover: Outstanding balance of ₹${balanceDue.toFixed(2)} must be collected first.`,
        });
      }

      const validMethods = ['CASH', 'UPI', 'CARD', 'OTHER'];
      const method = validMethods.includes(counterPaymentMethod?.toUpperCase())
        ? counterPaymentMethod.toUpperCase()
        : 'CASH';

      const now = new Date();
      const updated = await prisma.$transaction(async (tx) => {
        if (invoice) {
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              amountPaid: (invoice.amountPaid || 0) + balanceDue,
              balanceDue: 0,
              paymentStatus: 'PAID',
              paymentMethod: method,
              transactionReference: counterPaymentReference || `COUNTER-${method}-${Date.now()}`,
            },
          });
        }

        const ord = await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'PAID',
            orderStatus: 'DELIVERED',
            currentDepartment: 'COMPLETED',
            pickedUpAt: now,
            pickupVerifiedBy: staffName,
            statusHistory: {
              create: [
                {
                  newStatus: 'PAID',
                  note: `Outstanding balance of ₹${balanceDue.toFixed(2)} collected at Trichy pickup counter via ${method}. ${
                    counterPaymentReference ? `Ref: ${counterPaymentReference}. ` : ''
                  }${counterPaymentNotes ? `Notes: ${counterPaymentNotes}` : ''}`,
                  changedByUserId: req.user?.id || null,
                },
                {
                  newStatus: 'DELIVERED',
                  note: `Store Pickup Complete. Handed over to verified customer (${verifiedCustomerName.trim()}) by ${staffName}. All balances settled.`,
                  changedByUserId: req.user?.id || null,
                },
              ],
            },
          },
        });

        if (order.shipments?.length > 0) {
          await tx.shipment.update({
            where: { id: order.shipments[0].id },
            data: {
              status: 'PICKED_UP',
              pickedUpAt: now,
              handoverStaffName: staffName,
              verifiedCustomerName: verifiedCustomerName.trim(),
              deliveredAt: now,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action: 'COUNTER_BALANCE_COLLECTED',
            entityName: 'Order',
            entityId: orderId,
            userId: req.user?.id || null,
            oldValues: JSON.stringify({ balanceDue, paymentStatus: order.paymentStatus }),
            newValues: JSON.stringify({
              amountCollected: balanceDue,
              paymentMethod: method,
              counterPaymentReference,
              collector: staffName,
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'STORE_PICKUP_COMPLETED',
            entityName: 'Order',
            entityId: orderId,
            userId: req.user?.id || null,
            oldValues: JSON.stringify({ status: order.orderStatus, department: order.currentDepartment }),
            newValues: JSON.stringify({
              status: 'DELIVERED',
              department: 'COMPLETED',
              verifiedCustomerName: verifiedCustomerName.trim(),
              handoverStaff: staffName,
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return ord;
      });

      return res.json({
        success: true,
        message: `Outstanding balance of ₹${balanceDue.toFixed(2)} collected via ${method}. Store pickup completed successfully!`,
        order: updated,
      });
    }

    // Standard zero-balance or exempt handover
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: 'DELIVERED',
          currentDepartment: 'COMPLETED',
          pickedUpAt: now,
          pickupVerifiedBy: staffName,
          statusHistory: {
            create: {
              newStatus: 'DELIVERED',
              note: `Store Pickup Complete. Handed over to verified customer (${verifiedCustomerName.trim()}) at Trichy facility by ${staffName}.`,
              changedByUserId: req.user?.id || null,
            },
          },
        },
      });

      if (order.shipments?.length > 0) {
        await tx.shipment.update({
          where: { id: order.shipments[0].id },
          data: {
            status: 'PICKED_UP',
            pickedUpAt: now,
            handoverStaffName: staffName,
            verifiedCustomerName: verifiedCustomerName.trim(),
            deliveredAt: now,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'STORE_PICKUP_COMPLETED',
          entityName: 'Order',
          entityId: orderId,
          userId: req.user?.id || null,
          oldValues: JSON.stringify({ status: order.orderStatus, department: order.currentDepartment }),
          newValues: JSON.stringify({
            status: 'DELIVERED',
            department: 'COMPLETED',
            verifiedCustomerName: verifiedCustomerName.trim(),
            handoverStaff: staffName,
          }),
          ipAddress: req.ip || '127.0.0.1',
        },
      });

      return ord;
    });

    return res.json({
      success: true,
      message: `Store pickup handed over to ${verifiedCustomerName.trim()}. Order marked COMPLETED!`,
      order: updated,
    });
  } catch (error) {
    console.error('handoverStorePickup error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record pickup handover.' });
  }
};

// POST /api/v1/admin/logistics/orders/:orderId/mark-delivered - Mark courier shipment as delivered
export const markCourierDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;

    const now = new Date();
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: 'DELIVERED',
        currentDepartment: 'COMPLETED',
        statusHistory: {
          create: {
            newStatus: 'DELIVERED',
            note: `Courier confirmed delivered to doorstep. Order completed.`,
            changedByUserId: req.user?.id || null,
          },
        },
      },
    });

    const shipment = await prisma.shipment.findFirst({ where: { orderId } });
    if (shipment) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { status: 'DELIVERED', deliveredAt: now },
      });
    }

    return res.json({
      success: true,
      message: 'Order marked as DELIVERED & COMPLETED.',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('markCourierDelivered error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark delivery.' });
  }
};
