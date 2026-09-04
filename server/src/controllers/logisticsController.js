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

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipments: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isPickup = order.deliveryMethod === 'STORE_PICKUP';
    const nextStatus = 'READY_FOR_DELIVERY';
    const nextDept = isPickup ? 'DELIVERY' : 'DELIVERY';
    const packingWeightText = `${packageWeightKg || 0.5} kg (${packageCount} parcel${packageCount > 1 ? 's' : ''})`;

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
    const { verifiedCustomerName, handoverStaffName } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipments: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const now = new Date();

    // Complete order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: 'DELIVERED',
        currentDepartment: 'COMPLETED',
        pickedUpAt: now,
        pickupVerifiedBy: handoverStaffName || req.user?.name || 'Store Manager',
        statusHistory: {
          create: {
            newStatus: 'DELIVERED',
            note: `Store Pickup Complete. Handed over to customer (${verifiedCustomerName || order.customerName}) at Trichy facility.`,
            changedByUserId: req.user?.id || null,
          },
        },
      },
    });

    // Update shipment
    if (order.shipments?.length > 0) {
      await prisma.shipment.update({
        where: { id: order.shipments[0].id },
        data: {
          status: 'PICKED_UP',
          pickedUpAt: now,
          handoverStaffName: handoverStaffName || req.user?.name || 'Store Manager',
          verifiedCustomerName: verifiedCustomerName || order.customerName,
          deliveredAt: now,
        },
      });
    }

    return res.json({
      success: true,
      message: 'Store pickup handed over successfully. Order marked COMPLETED!',
      order: updatedOrder,
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
