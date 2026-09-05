import { PrismaClient } from '@prisma/client';
import { calculatePricing } from '../utils/pricingEngine.js';
import { getStoredBusinessInfo } from './businessInfoController.js';
import { toCustomerSafeOrder } from '../utils/projections.js';

const prisma = new PrismaClient();

// Create new customer order with full item snapshots
export const createOrder = async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerMobile,
      customerWhatsapp,
      shippingAddress, // { street, city, state, pincode, landmark }
      billingAddress,
      gstNumber,
      deliveryType = 'LOCAL_DELIVERY',
      deliveryMethod = 'COURIER', // COURIER, STORE_PICKUP
      paymentMethod = 'UPI',
      items, // array of items: [{ productId, quantity, selectedOptions, designRequired, artworkFileUrl }]
    } = req.body;

    if (!customerName || !customerMobile || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, mobile number, and at least one order item are required.',
      });
    }

    // Mandatory Authentication Gate: Customer must be authenticated
    const authenticatedCustomer = req.customer;
    let customerId = authenticatedCustomer?.id || req.body.customerId;

    if (!authenticatedCustomer && !customerId) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { mobile: customerMobile.trim() },
      });
      if (!existingCustomer) {
        return res.status(401).json({
          success: false,
          requireAuth: true,
          message: 'Please login or verify your mobile number with OTP before placing an order.',
        });
      }
      customerId = existingCustomer.id;
    }

    const isStorePickup = deliveryMethod === 'STORE_PICKUP' || deliveryType === 'PICKUP';
    const effectiveDeliveryMethod = isStorePickup ? 'STORE_PICKUP' : 'COURIER';

    // 1. Fetch store settings for GST and shipping
    const gstSetting = await prisma.storeSetting.findUnique({ where: { key: 'GST_RATE' } });
    const gstRate = gstSetting ? JSON.parse(gstSetting.value) : 18;

    const shipThresholdSetting = await prisma.storeSetting.findUnique({ where: { key: 'FREE_SHIPPING_THRESHOLD' } });
    const shippingThreshold = shipThresholdSetting ? JSON.parse(shipThresholdSetting.value) : 1500;

    const defaultShipSetting = await prisma.storeSetting.findUnique({ where: { key: 'DEFAULT_SHIPPING_CHARGE' } });
    const defaultShipping = defaultShipSetting ? JSON.parse(defaultShipSetting.value) : 80;

    // 2. Fetch and calculate each item snapshot authoritatively
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          options: { include: { values: true } },
          optionMappings: {
            where: { isEnabled: true },
            include: {
              master: true,
              valueMappings: {
                where: { isEnabled: true },
                include: { masterValue: true },
              },
            },
          },
          pricingMatrices: true,
          priceSlabs: true,
          compatibilityRules: { where: { isActive: true } },
          specifications: true,
        },
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.productId} was not found.`,
        });
      }

      const pricing = calculatePricing({
        product,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions || {},
        designOption: item.designRequired ? 'Yes Please' : 'No Thank You',
        artworkOption: item.artworkOption,
        designPackage: item.designPackage,
        selectedAddons: item.selectedAddons || [],
        gstRate,
        shippingThreshold,
        defaultShipping,
      });

      if (!pricing.isAvailable) {
        return res.status(400).json({
          success: false,
          message: pricing.unavailableReason || 'Selected product configuration is currently unavailable.',
        });
      }

      calculatedSubtotal += pricing.subtotal;

      validatedItems.push({
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        quantity: pricing.quantity,
        unitPriceSnapshot: pricing.subtotal / pricing.quantity,
        totalPriceSnapshot: pricing.subtotal,
        designRequired: item.artworkOption === 'DESIGN_SUPPORT' || !!item.designRequired,
        artworkFileUrl: item.artworkFileUrl || null,
        artworkOption: item.artworkOption || (item.designRequired ? 'DESIGN_SUPPORT' : 'PRINT_READY_FILE'),
        designPackageId: item.designPackageId || (item.designPackage && item.designPackage.id) || null,
        designPackageName: item.designPackageName || (item.designPackage && (item.designPackage.packageName || item.designPackage.name)) || (pricing.designPackageName || null),
        designCharge: pricing.designFee || 0,
        selectedAddons: item.selectedAddons ? (typeof item.selectedAddons === 'string' ? item.selectedAddons : JSON.stringify(item.selectedAddons)) : null,
        preferredStyle: item.preferredStyle || null,
        preferredColor: item.preferredColor || null,
        requirementNotes: item.requirementNotes || null,
        designBriefResponses: item.designBriefResponses ? (typeof item.designBriefResponses === 'string' ? item.designBriefResponses : JSON.stringify(item.designBriefResponses)) : null,
        designAssets: item.designAssets ? (typeof item.designAssets === 'string' ? item.designAssets : JSON.stringify(item.designAssets)) : null,
        termsAccepted: Boolean(item.termsAccepted),
        termsAcceptedAt: item.termsAcceptedAt ? new Date(item.termsAcceptedAt) : (item.termsAccepted ? new Date() : null),
        specificationsSnapshot: JSON.stringify(product.specifications || []),
        optionsSnapshot: JSON.stringify({
          ...(item.selectedOptions || {}),
          ...(item.artworkVersion ? { _artworkVersion: item.artworkVersion } : {}),
          ...(item.artworkAcknowledged !== undefined ? { _artworkAcknowledged: item.artworkAcknowledged } : {}),
          ...(item.preflightReport ? { _preflight: item.preflightReport } : {}),
        }),
        configurationSnapshot: JSON.stringify({
          selectedOptions: item.selectedOptions || {},
          pricingBreakdown: pricing.breakdown || {},
          appliedModifiers: pricing.appliedModifiers || [],
          appliedAddons: pricing.appliedAddons || [],
          pricingMethod: pricing.pricingMethod,
        }),
      });
    }

    // 3. Compute tax and grand totals
    const shippingCharge = isStorePickup ? 0 : (calculatedSubtotal >= shippingThreshold ? 0 : defaultShipping);
    const totalTax = Math.round((calculatedSubtotal * gstRate) / 100);
    const cgstAmount = Math.round(totalTax / 2);
    const sgstAmount = totalTax - cgstAmount;
    const grandTotal = calculatedSubtotal + shippingCharge;

    // 4. Generate unique human-readable Order Number (e.g. PB-ORD-2026-000001)
    const currentYear = new Date().getFullYear();
    const orderCount = await prisma.order.count();
    const orderSequence = String(orderCount + 1).padStart(6, '0');
    const orderNumber = `PB-ORD-${currentYear}-${orderSequence}`;

    // Delivery & Production timeline calculation (Requirements #10, #32)
    const hasDesignRequest = validatedItems.some((i) => i.designRequired);
    const hasUploadedArtwork = validatedItems.some((i) => i.artworkFileUrl);
    const productionDays = hasDesignRequest ? 4 : 3;
    const isLocalTamilNadu = shippingAddress?.pincode ? String(shippingAddress.pincode).startsWith('6') : true;
    const transitDays = isStorePickup ? 0 : (isLocalTamilNadu ? 2 : 4);

    const now = new Date();
    const estimatedDispatchDate = new Date(now);
    estimatedDispatchDate.setDate(estimatedDispatchDate.getDate() + productionDays);
    if (estimatedDispatchDate.getDay() === 0) estimatedDispatchDate.setDate(estimatedDispatchDate.getDate() + 1);

    const estimatedDeliveryDate = new Date(estimatedDispatchDate);
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + transitDays);
    if (estimatedDeliveryDate.getDay() === 0) estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 1);

    // 5. Link to Authenticated Customer Record
    let customer = null;
    if (authenticatedCustomer) {
      customer = authenticatedCustomer;
    } else if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
    }

    if (!customer) {
      customer = await prisma.customer.findFirst({
        where: { mobile: customerMobile.trim() },
      });
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          email: customerEmail || null,
          mobile: customerMobile.trim(),
          whatsapp: customerWhatsapp || customerMobile.trim(),
          address: shippingAddress ? (typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress)) : null,
          city: shippingAddress?.city || null,
          state: shippingAddress?.state || 'Tamil Nadu',
          pincode: shippingAddress?.pincode || null,
        },
      });
    }

    // Determine Initial Department & Workflow Status based on payment method and design requirement
    const isOfflinePayment = paymentMethod === 'COD' || paymentMethod === 'CASH';
    const isOnlinePayment = !isOfflinePayment;

    let initialDepartment = 'PRODUCTION';
    let initialStatus = 'PRODUCTION_QUEUE';
    let initialStatusNote = 'Order received and logged into Printing Press queue.';
    let initialStaffRole = 'Press Supervisor';

    if (isOnlinePayment) {
      initialDepartment = 'PAYMENT';
      initialStatus = 'PAYMENT_PENDING';
      initialStatusNote = 'Order created. Awaiting online payment confirmation from payment gateway.';
      initialStaffRole = 'Payment Gateway';
    } else if (hasDesignRequest) {
      initialDepartment = 'DESIGN';
      initialStatus = 'DESIGN_IN_PROGRESS';
      initialStatusNote = 'COD/Cash order received. Assigned to Prepress Design Team for customer briefing and proof creation.';
      initialStaffRole = 'Design Team Lead';
    } else {
      // Print-ready artwork routes directly to Press Production queue
      initialDepartment = 'PRODUCTION';
      initialStatus = 'PRODUCTION_QUEUE';
      initialStatusNote = 'COD/Cash order received with print-ready artwork. Logged directly into Press Production queue.';
      initialStaffRole = 'Press Supervisor';
    }

    // 6. Create Order, items, invoice, shipment, and production/design jobs in an atomic transaction
    const bizInfo = await getStoredBusinessInfo();
    const {
      newOrder,
      invoiceNumber,
      shipmentNumber,
      createdProductionJobs,
      createdDesignJobs,
    } = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerName,
          customerEmail: customerEmail || '',
          customerMobile: customerMobile.trim(),
          customerWhatsapp: customerWhatsapp || customerMobile.trim(),
          shippingAddress: typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress || {}),
          billingAddress: billingAddress ? (typeof billingAddress === 'string' ? billingAddress : JSON.stringify(billingAddress)) : null,
          gstNumber: gstNumber || null,
          subtotal: calculatedSubtotal,
          discountAmount: 0,
          shippingCharge,
          cgstAmount,
          sgstAmount,
          igstAmount: 0,
          totalTax,
          grandTotal,
          paymentStatus: 'PENDING',
          orderStatus: initialStatus,
          deliveryType: deliveryType || 'LOCAL_DELIVERY',
          deliveryMethod: effectiveDeliveryMethod,
          pickupLocation: isStorePickup ? (bizInfo.address?.pressFacilityAddress || 'Print Bazzar Press Facility, No. 42 Big Bazzar St, Trichy - 620008') : null,
          productionDays,
          transitDays,
          estimatedDispatchDate,
          estimatedDeliveryDate,
          currentDepartment: initialDepartment,
          assignedStaffName: initialStaffRole,
          proofStatus: hasDesignRequest ? 'PENDING' : 'APPROVED',
          items: {
            create: validatedItems,
          },
          statusHistory: {
            create: {
              previousStatus: null,
              newStatus: initialStatus,
              note: initialStatusNote,
              customerNote: 'Order received. We are verifying your print specifications and preparing your job.',
            },
          },
          payments: {
            create: {
              paymentMethod,
              amount: grandTotal,
              status: 'PENDING',
            },
          },
        },
        include: {
          items: true,
          statusHistory: true,
        },
      });

      // 7. Auto-Generate Linked Order Receipt / Invoice (Requirement #11, #12, #37)
      const generatedInvoiceNumber = `PB-INV-${currentYear}-${orderSequence}`;
      const cleanShippingAddr = typeof shippingAddress === 'string' ? JSON.parse(shippingAddress || '{}') : shippingAddress || {};

      await tx.invoice.create({
        data: {
          invoiceNumber: generatedInvoiceNumber,
          orderId: createdOrder.id,
          invoiceType: 'ORDER_RECEIPT',
          companyDetailsJson: JSON.stringify({
            companyName: bizInfo.brand?.legalName || bizInfo.brand?.brandName || 'Print Bazzar',
            tradeName: bizInfo.brand?.brandName || 'Print Bazzar',
            address: bizInfo.address?.fullDisplayAddress || '12 A, Allimal Street, Big Bazzar St, Singarathope, Tiruchirappalli - 620008, Tamil Nadu, India',
            gstin: bizInfo.tax?.gstin || '33AAAAA0000A1Z5',
            email: bizInfo.contact?.supportEmail || 'printbazzar.online@gmail.com',
            phone: bizInfo.contact?.primaryPhone || '+91 96290 98565',
            website: 'https://printbazzar.online',
          }),
          billToSnapshotJson: JSON.stringify({
            name: customerName,
            email: customerEmail,
            mobile: customerMobile,
            gstin: gstNumber || null,
            address: cleanShippingAddr,
          }),
          shipToSnapshotJson: JSON.stringify({
            deliveryMethod: effectiveDeliveryMethod,
            address: isStorePickup ? (bizInfo.address?.pressFacilityAddress || 'Store Pickup - Print Bazzar Trichy Facility') : cleanShippingAddr,
          }),
          itemsSnapshotJson: JSON.stringify(
            createdOrder.items.map((i) => ({
              name: i.productNameSnapshot,
              sku: i.skuSnapshot,
              quantity: i.quantity,
              unitPrice: i.unitPriceSnapshot,
              totalPrice: i.totalPriceSnapshot,
              designRequired: i.designRequired,
              designPackageName: i.designPackageName,
              designCharge: i.designCharge,
            }))
          ),
          subtotal: calculatedSubtotal,
          taxableAmount: calculatedSubtotal,
          cgst: cgstAmount,
          sgst: sgstAmount,
          igst: 0,
          totalTax,
          shippingCharge,
          grandTotal,
          amountPaid: 0,
          balanceDue: grandTotal,
          paymentStatus: 'PENDING',
          paymentMethod,
        },
      });

      // 8. Auto-Generate Linked Shipment Record (Requirement #24, #25, #37)
      const generatedShipmentNumber = `PB-SHIP-${currentYear}-${orderSequence}`;
      await tx.shipment.create({
        data: {
          shipmentNumber: generatedShipmentNumber,
          orderId: createdOrder.id,
          deliveryMethod: effectiveDeliveryMethod,
          recipientName: cleanShippingAddr.recipientName || customerName,
          mobile: cleanShippingAddr.mobile || customerMobile,
          altMobile: cleanShippingAddr.altMobile || null,
          companyName: cleanShippingAddr.companyName || null,
          fullAddress: isStorePickup ? (bizInfo.address?.pressFacilityAddress || 'Store Pickup - Print Bazzar Press Facility') : (cleanShippingAddr.street || ''),
          landmark: cleanShippingAddr.landmark || null,
          city: isStorePickup ? (bizInfo.address?.city || 'Tiruchirappalli') : (cleanShippingAddr.city || 'Tiruchirappalli'),
          state: cleanShippingAddr.state || 'Tamil Nadu',
          pincode: isStorePickup ? (bizInfo.address?.pincode || '620008') : (cleanShippingAddr.pincode || '620001'),
          status: 'PENDING',
          expectedDeliveryDate: estimatedDeliveryDate,
        },
      });

      // 9. Auto-Generate Linked Production Job Cards for each order item (Requirement #17, #18, #19, #20)
      const productionJobsList = [];
      for (let idx = 0; idx < createdOrder.items.length; idx++) {
        const item = createdOrder.items[idx];
        const jobSuffix = createdOrder.items.length > 1 ? `-${idx + 1}` : '';
        const jobNumber = `PB-JOB-${currentYear}-${orderSequence}${jobSuffix}`;

        // Online payments hold job in WAITING_FOR_PAYMENT until verified
        const prodJobStatus = isOnlinePayment
          ? 'WAITING_FOR_PAYMENT'
          : (item.designRequired ? 'WAITING_FOR_DESIGN_APPROVAL' : 'QUEUED');

        const prodJob = await tx.productionJob.create({
          data: {
            jobNumber,
            orderId: createdOrder.id,
            orderItemId: item.id,
            productId: item.productId,
            productNameSnapshot: item.productNameSnapshot,
            quantity: item.quantity,
            priority: 'STANDARD',
            status: prodJobStatus,
            specsSnapshotJson: item.specificationsSnapshot,
            customizationSnapshotJson: item.optionsSnapshot,
            approvedArtworkUrl: item.artworkFileUrl || null,
            approvedArtworkVersion: item.artworkFileUrl ? 'V1 - Customer File' : null,
            artworkStatus: item.designRequired ? 'WAITING_APPROVAL' : 'APPROVED',
            deadline: estimatedDispatchDate,
          },
        });
        productionJobsList.push(prodJob);
      }

      // 10. Instantiate Linked Design Jobs for any item requiring design support
      const designItems = createdOrder.items.filter((i) => i.designRequired);
      const designJobsList = [];

      if (designItems.length > 0) {
        const prefixSetting = await tx.storeSetting.findUnique({ where: { key: 'DESIGN_JOB_PREFIX' } });
        const jobPrefix = prefixSetting ? prefixSetting.value.trim() : 'PB-DES';
        const year = new Date().getFullYear();

        for (let idx = 0; idx < designItems.length; idx++) {
          const dItem = designItems[idx];
          const designCount = await tx.designOrder.count();
          const designJobNumber = `${jobPrefix}-${year}-${String(designCount + 1).padStart(5, '0')}`;

          let packageId = dItem.designPackageId;
          if (!packageId) {
            const defaultPkg = await tx.designPackage.findFirst({ where: { isDefault: true } });
            packageId = defaultPkg ? defaultPkg.id : null;
          }

          // Online payments hold design job in WAITING_FOR_PAYMENT
          const designJobStatus = isOnlinePayment ? 'WAITING_FOR_PAYMENT' : 'REQUIREMENT_RECEIVED';

          const designJob = await tx.designOrder.create({
            data: {
              designJobNumber,
              orderId: createdOrder.id,
              orderItemId: dItem.id,
              productId: dItem.productId,
              packageId,
              packageNameSnapshot: dItem.designPackageName || 'Custom Graphic Design Package',
              packagePriceSnapshot: dItem.designCharge || 0,
              packageSnapshotJson: JSON.stringify({
                packageName: dItem.designPackageName,
                designCharge: dItem.designCharge,
              }),
              addonsSnapshotJson: dItem.selectedAddons || '[]',
              requirementNotes: dItem.requirementNotes || null,
              preferredStyle: dItem.preferredStyle || null,
              preferredColor: dItem.preferredColor || null,
              briefResponsesJson: dItem.designBriefResponses,
              uploadedAssetsJson: dItem.designAssets,
              status: designJobStatus,
              priority: 'NORMAL',
              deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            },
          });

          await tx.orderItem.update({
            where: { id: dItem.id },
            data: { designJobNumber },
          });

          designJobsList.push(designJob);
        }
      }

      return {
        newOrder: createdOrder,
        invoiceNumber: generatedInvoiceNumber,
        shipmentNumber: generatedShipmentNumber,
        createdProductionJobs: productionJobsList,
        createdDesignJobs: designJobsList,
      };
    }, {
      timeout: 30000,
    });

    const designFeeTotal = validatedItems.reduce((acc, it) => acc + (it.designCharge || 0), 0);
    const initialPayableAmount = isOnlinePayment && hasDesignRequest && designFeeTotal > 0 ? designFeeTotal : grandTotal;
    const balanceDue = isOnlinePayment && hasDesignRequest && designFeeTotal > 0 ? Math.max(0, grandTotal - designFeeTotal) : 0;

    const safeOrder = toCustomerSafeOrder(newOrder, { isOwner: true });

    return res.status(201).json({
      success: true,
      message: isOnlinePayment
        ? 'Order created. Please complete payment to confirm your order.'
        : 'Order confirmed and registered across operations, production & delivery!',
      orderNumber: newOrder.orderNumber,
      order: safeOrder,
      isOnlinePayment,
      hasDesignRequest,
      designFeeTotal,
      initialPayableAmount,
      balanceDue,
      invoiceNumber,
      shipmentNumber,
    });
  } catch (error) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.error(`[${requestId}] Order creation error:`, error);
    return res.status(500).json({
      success: false,
      errorCode: 'ORDER_CREATION_FAILED',
      message: 'Failed to create order. Please try again.',
      requestId,
    });
  }
};

// Track order status by human-readable order number or phone
export const trackOrder = async (req, res) => {
  try {
    const { orderIdentifier } = req.params;
    const cleanId = orderIdentifier.trim();

    // Anti-Scraping Guard: If user provides a pure phone number, require matching orderNumber query or customer auth
    const isPurePhoneNumber = /^[0-9]{10}$/.test(cleanId);
    if (isPurePhoneNumber) {
      const queryOrderNumber = (req.query.orderNumber || '').trim();
      const authCustomer = req.customer;
      if (!queryOrderNumber && (!authCustomer || authCustomer.mobile !== cleanId)) {
        return res.status(400).json({
          success: false,
          message: 'For customer privacy, tracking requires your Order Number (e.g. PB-ORD-2026-000001). Please enter your Order Number.',
        });
      }
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: cleanId },
          { id: cleanId },
          ...(isPurePhoneNumber && req.query.orderNumber ? [{ orderNumber: req.query.orderNumber.trim(), customerMobile: cleanId }] : []),
        ],
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, thumbnailUrl: true, slug: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: {
            previousStatus: true,
            newStatus: true,
            note: true,
            customerNote: true,
            createdAt: true,
          },
        },
        productionJobs: {
          select: {
            id: true,
            jobNumber: true,
            status: true,
            deadline: true,
            priority: true,
          },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            shipmentNumber: true,
            courierPartner: true,
            trackingNumber: true,
            trackingUrl: true,
            status: true,
            expectedDeliveryDate: true,
          },
        },
        designOrders: {
          select: {
            designJobNumber: true,
            status: true,
            revisions: { orderBy: { revisionNumber: 'desc' } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `No order found with Order ID "${orderIdentifier}". Please check your order confirmation details.`,
      });
    }

    // Authorization check: If a logged-in customer attempts to access another customer's order, block it
    if (req.customer && order.customerId && order.customerId !== req.customer.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this order.',
      });
    }

    const isCustomerLoggedIn = !!req.customer && req.customer.id === order.customerId;
    const safeOrder = toCustomerSafeOrder(order, { isOwner: isCustomerLoggedIn });

    return res.json({
      success: true,
      order: safeOrder,
    });
  } catch (error) {
    console.error('Order tracking error:', error);
    return res.status(500).json({ success: false, message: 'Failed to track order.' });
  }
};

// Upload Artwork File Endpoint
export const uploadArtwork = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    return res.json({
      success: true,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (error) {
    console.error('Artwork upload error:', error);
    return res.status(500).json({ success: false, message: 'File upload failed.' });
  }
};
