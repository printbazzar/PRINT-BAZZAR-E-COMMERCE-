import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculatePricing } from '../utils/pricingEngine.js';
import { getStoredBusinessInfo } from './businessInfoController.js';
import { sendOrderNotification } from '../services/notificationService.js';
import { toCustomerSafeOrder } from '../utils/projections.js';

const prisma = new PrismaClient();

/**
 * GET /api/v1/admin/pos/customers/search
 * Search customers by mobile number (exact or partial) or name
 * Returns customer profile, previous orders with item snapshots, artworks, and total outstanding balance due
 */
export const searchCustomers = async (req, res) => {
  try {
    const cleanQuery = String(req.query.query || req.query.q || '').trim();

    if (!cleanQuery || cleanQuery.length < 2) {
      return res.json({
        success: true,
        customers: [],
        message: 'Please enter at least 2 characters to search.',
      });
    }

    const digitsOnly = cleanQuery.replace(/\D/g, '');

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          ...(digitsOnly ? [{ mobile: { contains: digitsOnly } }] : []),
          { name: { contains: cleanQuery, mode: 'insensitive' } },
          { email: { contains: cleanQuery, mode: 'insensitive' } },
          { companyName: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      include: {
        savedAddresses: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true, thumbnailUrl: true } },
              },
            },
            invoices: {
              select: {
                invoiceNumber: true,
                grandTotal: true,
                amountPaid: true,
                balanceDue: true,
                paymentStatus: true,
              },
            },
            payments: {
              select: {
                paymentMethod: true,
                amount: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
      take: 20,
    });

    const enrichedCustomers = customers.map((cust) => {
      const orders = cust.orders || [];
      const totalOrdersCount = orders.length;
      const totalSpent = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

      // Compute outstanding balance due across all active orders
      const outstandingBalance = orders.reduce((sum, o) => {
        const inv = o.invoices?.[0];
        if (inv && inv.balanceDue > 0) {
          return sum + inv.balanceDue;
        }
        if (o.paymentStatus !== 'CONFIRMED' && o.paymentStatus !== 'PAID' && o.orderStatus !== 'CANCELLED') {
          return sum + (o.grandTotal || 0);
        }
        return sum;
      }, 0);

      // Extract unique previous products
      const previousProductsSet = new Set();
      const previousArtworks = [];

      orders.forEach((o) => {
        (o.items || []).forEach((item) => {
          if (item.productNameSnapshot) {
            previousProductsSet.add(item.productNameSnapshot);
          }
          if (item.artworkFileUrl) {
            previousArtworks.push({
              orderNumber: o.orderNumber,
              productName: item.productNameSnapshot,
              url: item.artworkFileUrl,
              createdAt: o.createdAt,
            });
          }
        });
      });

      return {
        id: cust.id,
        name: cust.name,
        mobile: cust.mobile,
        email: cust.email,
        whatsapp: cust.whatsapp,
        companyName: cust.companyName,
        gstNumber: cust.gstNumber,
        accountType: cust.accountType,
        address: cust.address,
        city: cust.city,
        state: cust.state,
        pincode: cust.pincode,
        savedAddresses: cust.savedAddresses || [],
        totalOrdersCount,
        totalSpent,
        outstandingBalance,
        previousProducts: Array.from(previousProductsSet),
        previousArtworks: previousArtworks.slice(0, 5),
        recentOrders: orders.slice(0, 5).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          createdAt: o.createdAt,
          grandTotal: o.grandTotal,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
          orderSource: o.orderSource || 'WEBSITE',
          deliveryMethod: o.deliveryMethod || 'STORE_PICKUP',
          balanceDue: o.invoices?.[0]?.balanceDue ?? (o.paymentStatus === 'CONFIRMED' ? 0 : o.grandTotal),
          items: (o.items || []).map((it) => ({
            id: it.id,
            productId: it.productId,
            productName: it.productNameSnapshot,
            sku: it.skuSnapshot,
            quantity: it.quantity,
            unitPrice: it.unitPriceSnapshot,
            totalPrice: it.totalPriceSnapshot,
            optionsSnapshot: it.optionsSnapshot,
            artworkFileUrl: it.artworkFileUrl,
            designRequired: it.designRequired,
            requirementNotes: it.requirementNotes,
          })),
        })),
      };
    });

    return res.json({
      success: true,
      customers: enrichedCustomers,
    });
  } catch (error) {
    console.error('searchCustomers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search customers.' });
  }
};

/**
 * POST /api/v1/admin/pos/customers
 * Fast customer registration for walk-in counter
 * Performs duplicate detection: if mobile exists, returns existing customer
 */
export const createQuickCustomer = async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      whatsapp,
      companyName,
      gstNumber,
      address,
      city = 'Tiruchirappalli',
      state = 'Tamil Nadu',
      pincode = '620008',
      accountType = 'B2C_RETAIL',
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }

    const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'A valid 10-digit Indian mobile number is required.' });
    }

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;

    // Check duplicate customer safely
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [
          { mobile: cleanMobile },
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      },
      include: { savedAddresses: true },
    });

    if (existing) {
      // Update customer if new details provided
      const updateData = {};
      if (companyName && !existing.companyName) updateData.companyName = companyName.trim();
      if (gstNumber && !existing.gstNumber) updateData.gstNumber = gstNumber.trim();
      if (address && !existing.address) updateData.address = address.trim();
      if (cleanEmail && !existing.email) updateData.email = cleanEmail;

      let updatedCustomer = existing;
      if (Object.keys(updateData).length > 0) {
        updatedCustomer = await prisma.customer.update({
          where: { id: existing.id },
          data: updateData,
          include: { savedAddresses: true },
        });
      }

      return res.json({
        success: true,
        isExisting: true,
        message: 'Existing customer profile found and selected.',
        customer: updatedCustomer,
      });
    }

    // Create brand new customer
    const newCustomer = await prisma.customer.create({
      data: {
        name: name.trim(),
        mobile: cleanMobile,
        email: cleanEmail,
        whatsapp: whatsapp ? whatsapp.trim() : cleanMobile,
        companyName: companyName ? companyName.trim() : null,
        gstNumber: gstNumber ? gstNumber.trim() : null,
        address: address ? address.trim() : null,
        city: city || 'Tiruchirappalli',
        state: state || 'Tamil Nadu',
        pincode: pincode || null,
        accountType: accountType || 'B2C_RETAIL',
        savedAddresses: address
          ? {
              create: {
                label: 'Counter Store Address',
                recipientName: name.trim(),
                mobile: cleanMobile,
                street: address.trim(),
                city: city || 'Tiruchirappalli',
                state: state || 'Tamil Nadu',
                pincode: pincode || '620008',
                isDefault: true,
              },
            }
          : undefined,
      },
      include: { savedAddresses: true },
    });

    return res.status(201).json({
      success: true,
      isExisting: false,
      message: 'New customer profile registered successfully.',
      customer: newCustomer,
    });
  } catch (error) {
    console.error('createQuickCustomer error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create customer profile.' });
  }
};

/**
 * POST /api/v1/admin/pos/verify-manager-pin
 * Verifies manager authorization PIN or Manager credentials for discount overrides
 */
export const verifyManagerPin = async (req, res) => {
  try {
    const { pin, email, password } = req.body;

    // Option 1: Master Store Setting POS_MANAGER_PIN
    const managerPinSetting = await prisma.storeSetting.findUnique({
      where: { key: 'POS_MANAGER_PIN' },
    });
    const expectedPin = managerPinSetting ? managerPinSetting.value.trim() : '9856';

    if (pin && String(pin).trim() === expectedPin) {
      return res.json({
        success: true,
        managerId: 'sys_store_manager',
        managerName: 'Store Manager (Authorized)',
        message: 'Manager PIN authorization verified.',
      });
    }

    // Option 2: Active User with SUPER_ADMIN role or SETTINGS_EDIT permission
    if (email && password) {
      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        include: { role: true },
      });

      if (user && user.isActive) {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        const isSuper = user.role?.name === 'SUPER_ADMIN' || user.role?.name === 'Super Admin';
        if (isMatch && isSuper) {
          return res.json({
            success: true,
            managerId: user.id,
            managerName: user.name,
            message: `Manager authorization verified: ${user.name}`,
          });
        }
      }
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid manager authorization credentials or PIN.',
    });
  } catch (error) {
    console.error('verifyManagerPin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify manager authorization.' });
  }
};

/**
 * POST /api/v1/admin/pos/orders
 * Centralized Omnichannel Order Creation for Front Office / Walk-in Store
 * Reuses the central pricing engine, customer database, invoice generation, and 16-stage workflow
 */
export const createWalkInOrder = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerMobile,
      customerEmail,
      customerWhatsapp,
      companyName,
      gstNumber,
      shippingAddress,
      billingAddress,
      deliveryType = 'PICKUP',
      deliveryMethod = 'STORE_PICKUP',
      orderSource = 'WALK_IN', // WEBSITE, WALK_IN, WHATSAPP, INSTAGRAM, PHONE, B2B, STAFF_ASSISTED
      branch = 'TRICHY_MAIN',
      items, // array of items with configuration
      artworkMode = 'CUSTOMER_ARTWORK', // CUSTOMER_ARTWORK, CUSTOM_DESIGN, SEND_LATER
      discountAmount = 0,
      discountReason = '',
      managerApprovalId = null,
      managerApprovalName = null,
      payment = null, // { method: 'CASH'|'UPI'|'CARD'|'RAZORPAY'|'BANK_TRANSFER'|'CREDIT', amount: number, transactionReference?: string, notes?: string }
      notes = '',
    } = req.body;

    // Validate essentials
    if (!customerName || !customerMobile || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, mobile number, and at least one order item are required.',
      });
    }

    const cleanMobile = String(customerMobile).replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.',
      });
    }

    // 1. Identify or link Customer
    let customer = null;
    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
    }
    if (!customer) {
      customer = await prisma.customer.findFirst({
        where: { mobile: cleanMobile },
      });
    }
    if (!customer) {
      // Auto-create customer
      customer = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          mobile: cleanMobile,
          email: customerEmail ? customerEmail.trim().toLowerCase() : null,
          whatsapp: customerWhatsapp ? customerWhatsapp.trim() : cleanMobile,
          companyName: companyName ? companyName.trim() : null,
          gstNumber: gstNumber ? gstNumber.trim() : null,
          address: typeof shippingAddress === 'string' ? shippingAddress : shippingAddress?.street || null,
          city: shippingAddress?.city || 'Tiruchirappalli',
          state: shippingAddress?.state || 'Tamil Nadu',
          pincode: shippingAddress?.pincode || '620008',
        },
      });
    }

    // 2. Fetch Store Settings
    const settingsList = await prisma.storeSetting.findMany({
      where: {
        key: { in: ['GST_RATE', 'FREE_SHIPPING_THRESHOLD', 'DEFAULT_SHIPPING_CHARGE', 'DESIGN_JOB_PREFIX', 'POS_MAX_STAFF_DISCOUNT_PCT'] },
      },
    });
    const settingsMap = new Map(settingsList.map((s) => [s.key, s.value]));
    const gstRate = settingsMap.has('GST_RATE') ? JSON.parse(settingsMap.get('GST_RATE')) : 18;
    const shippingThreshold = settingsMap.has('FREE_SHIPPING_THRESHOLD') ? JSON.parse(settingsMap.get('FREE_SHIPPING_THRESHOLD')) : 1500;
    const defaultShipping = settingsMap.has('DEFAULT_SHIPPING_CHARGE') ? JSON.parse(settingsMap.get('DEFAULT_SHIPPING_CHARGE')) : 80;
    const designJobPrefix = settingsMap.has('DESIGN_JOB_PREFIX') ? settingsMap.get('DESIGN_JOB_PREFIX').trim() : 'PB-DES';
    const maxStaffDiscountPct = settingsMap.has('POS_MAX_STAFF_DISCOUNT_PCT') ? JSON.parse(settingsMap.get('POS_MAX_STAFF_DISCOUNT_PCT')) : 5.0;

    // Task #29 IGST: same canonical company-state source as orderController.js — the
    // existing BUSINESS_INFORMATION_SETTINGS store (businessInfoDefaults.js'
    // DEFAULT_BUSINESS_INFO.tax.stateName, GSTIN state code "33" = Tamil Nadu), not a
    // value invented for this task.
    const companyBusinessInfo = await getStoredBusinessInfo();
    const companyHomeState = companyBusinessInfo?.tax?.stateName || companyBusinessInfo?.address?.state || 'Tamil Nadu';
    const customerShippingState =
      (typeof shippingAddress === 'object' && shippingAddress?.state) ? shippingAddress.state : companyHomeState;
    const isInterState = String(customerShippingState).trim().toLowerCase() !== String(companyHomeState).trim().toLowerCase();

    // 3. Authoritative Pricing Calculation via Central Pricing Engine
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const productsList = await prisma.product.findMany({
      where: { id: { in: productIds } },
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
    const productMap = new Map(productsList.map((p) => [p.id, p]));

    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.productId} was not found in the catalog.`,
        });
      }

      const isDesignReq = artworkMode === 'CUSTOM_DESIGN' || item.artworkOption === 'DESIGN_SUPPORT' || !!item.designRequired;

      const pricing = calculatePricing({
        product,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions || {},
        designOption: isDesignReq ? 'Yes Please' : 'No Thank You',
        artworkOption: item.artworkOption || (isDesignReq ? 'DESIGN_SUPPORT' : 'PRINT_READY_FILE'),
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
        designRequired: isDesignReq,
        artworkFileUrl: item.artworkFileUrl || null,
        artworkOption: item.artworkOption || (isDesignReq ? 'DESIGN_SUPPORT' : 'PRINT_READY_FILE'),
        designPackageId: item.designPackageId || (item.designPackage && item.designPackage.id) || null,
        designPackageName: item.designPackageName || (item.designPackage && (item.designPackage.packageName || item.designPackage.name)) || (pricing.designPackageName || null),
        designCharge: pricing.designFee || 0,
        selectedAddons: item.selectedAddons ? (typeof item.selectedAddons === 'string' ? item.selectedAddons : JSON.stringify(item.selectedAddons)) : null,
        preferredStyle: item.preferredStyle || null,
        preferredColor: item.preferredColor || null,
        requirementNotes: item.requirementNotes || null,
        designBriefResponses: item.designBriefResponses ? (typeof item.designBriefResponses === 'string' ? item.designBriefResponses : JSON.stringify(item.designBriefResponses)) : null,
        designAssets: item.designAssets ? (typeof item.designAssets === 'string' ? item.designAssets : JSON.stringify(item.designAssets)) : null,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        specificationsSnapshot: JSON.stringify(product.specifications || []),
        optionsSnapshot: JSON.stringify(item.selectedOptions || {}),
        configurationSnapshot: JSON.stringify({
          selectedOptions: item.selectedOptions || {},
          pricingBreakdown: pricing.breakdown || {},
          appliedModifiers: pricing.appliedModifiers || [],
          appliedAddons: pricing.appliedAddons || [],
          pricingMethod: pricing.pricingMethod,
        }),
      });
    }

    // 4. Strict Discount Rule Enforcement (Rule #4)
    const numericDiscount = Math.max(0, parseFloat(discountAmount) || 0);
    const maxStaffDiscountAmount = Math.round((calculatedSubtotal * maxStaffDiscountPct) / 100);

    if (numericDiscount > maxStaffDiscountAmount + 0.5) {
      // Exceeds 5% threshold: Requires Manager Authorization
      if (!managerApprovalId && !managerApprovalName) {
        return res.status(403).json({
          success: false,
          code: 'MANAGER_APPROVAL_REQUIRED',
          message: `Discounts exceeding ${maxStaffDiscountPct}% (₹${maxStaffDiscountAmount}) require Manager Authorization. Requested discount: ₹${numericDiscount}.`,
          maxAllowedStaffDiscount: maxStaffDiscountAmount,
          requestedDiscount: numericDiscount,
        });
      }
    }

    // 5. Total and Shipping Calculation
    const isStorePickup = deliveryMethod === 'STORE_PICKUP' || deliveryType === 'PICKUP';
    const effectiveDeliveryMethod = isStorePickup ? 'STORE_PICKUP' : 'COURIER';
    const shippingCharge = isStorePickup ? 0 : (calculatedSubtotal >= shippingThreshold ? 0 : defaultShipping);
    // Discount is applied before GST (this was already correct — kept unchanged).
    const discountedSubtotal = Math.max(0, calculatedSubtotal - numericDiscount);
    // Task #29 GST fix: discountedSubtotal is GST-inclusive — the taxable value and the tax
    // actually embedded in it are recovered by division, not `amount * rate/100` (same fix
    // as orderController.js; see that file's comment for the full rationale). This does not
    // change grandTotal / what the customer is charged, only the stored tax breakdown.
    const taxableAmount = Math.round(discountedSubtotal / (1 + gstRate / 100));
    const totalTax = discountedSubtotal - taxableAmount;
    // Task #29 IGST: intra-state (customer's shipping state matches companyHomeState above)
    // splits tax into CGST+SGST; inter-state charges IGST only. Previously igstAmount was
    // hardcoded to 0 unconditionally.
    const cgstAmount = isInterState ? 0 : Math.round(totalTax / 2);
    const sgstAmount = isInterState ? 0 : totalTax - cgstAmount;
    const igstAmount = isInterState ? totalTax : 0;
    const grandTotal = discountedSubtotal + shippingCharge;

    // 6. Workflow Initial Status & Department (Rule #6)
    const hasDesignRequest = validatedItems.some((i) => i.designRequired);
    const hasArtworkProvided = validatedItems.some((i) => i.artworkFileUrl);

    let initialStatus = 'ORDER_REVIEW';
    let initialDepartment = 'DESIGN';
    let initialStatusNote = 'Order created at Front Office. Routed to Prepress Team for Artwork Review.';
    let initialStaffRole = 'Prepress Specialist';

    if (artworkMode === 'CUSTOM_DESIGN' || hasDesignRequest) {
      initialStatus = 'DESIGN_QUEUE';
      initialDepartment = 'DESIGN';
      initialStatusNote = 'Custom design service requested. Routed to Design Queue for briefing & draft creation.';
      initialStaffRole = 'Design Team Lead';
    } else if (artworkMode === 'SEND_LATER' && !hasArtworkProvided) {
      initialStatus = 'ARTWORK_REQUIRED';
      initialDepartment = 'DESIGN';
      initialStatusNote = 'Customer will send artwork later. Placed on hold in Prepress desk until file is received.';
      initialStaffRole = 'Prepress Desk';
    }

    // 7. Payment Allocation (Rule #5)
    let amountPaid = 0;
    let paymentMethodRecorded = payment?.method || 'CASH';
    let transactionRef = payment?.transactionReference || null;

    if (payment && payment.amount > 0) {
      amountPaid = Math.min(grandTotal, parseFloat(payment.amount) || 0);
    }

    const balanceDue = Math.max(0, grandTotal - amountPaid);
    let paymentStatus = 'PENDING';
    let invoicePaymentStatus = 'PENDING';

    if (amountPaid >= grandTotal) {
      paymentStatus = 'CONFIRMED';
      invoicePaymentStatus = 'PAID';
    } else if (amountPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
      invoicePaymentStatus = 'PARTIALLY_PAID';
    } else if (payment?.method === 'CREDIT') {
      paymentStatus = 'PENDING';
      invoicePaymentStatus = 'PENDING';
      paymentMethodRecorded = 'CREDIT';
    }

    // 8. Unique Collision-Proof Identifiers
    const currentYear = new Date().getFullYear();
    const nowEpoch = Date.now().toString();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderSequence = `${nowEpoch.slice(-6)}${randomSuffix}`;
    const orderNumber = `PB-ORD-${currentYear}-${orderSequence}`;
    const invoiceNumber = `PB-INV-${currentYear}-${orderSequence}`;
    const shipmentNumber = `PB-SHIP-${currentYear}-${orderSequence}`;

    const bizInfo = await getStoredBusinessInfo();
    const staffUser = req.user;
    const createdStaffId = staffUser?.id || null;
    const createdStaffName = staffUser?.name || 'Front Office Staff';

    const productionDays = hasDesignRequest ? 4 : 3;
    const transitDays = isStorePickup ? 0 : 2;
    const now = new Date();
    const estimatedDispatchDate = new Date(now);
    estimatedDispatchDate.setDate(estimatedDispatchDate.getDate() + productionDays);
    const estimatedDeliveryDate = new Date(estimatedDispatchDate);
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + transitDays);

    // 9. Atomic Transaction
    const { newOrder, createdInvoice, createdShipment, paymentRecord } = await prisma.$transaction(async (tx) => {
      // A. Create Order
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : '',
          customerMobile: cleanMobile,
          customerWhatsapp: customerWhatsapp ? customerWhatsapp.trim() : cleanMobile,
          shippingAddress: typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress || {}),
          billingAddress: billingAddress ? (typeof billingAddress === 'string' ? billingAddress : JSON.stringify(billingAddress)) : null,
          gstNumber: gstNumber || null,
          subtotal: calculatedSubtotal,
          discountAmount: numericDiscount,
          shippingCharge,
          cgstAmount,
          sgstAmount,
          igstAmount,
          totalTax,
          grandTotal,
          paymentStatus,
          orderStatus: initialStatus,
          deliveryType,
          deliveryMethod: effectiveDeliveryMethod,
          pickupLocation: isStorePickup ? (bizInfo.address?.pressFacilityAddress || 'Print Bazzar Press Facility, Trichy') : null,
          productionDays,
          transitDays,
          estimatedDispatchDate,
          estimatedDeliveryDate,
          currentDepartment: initialDepartment,
          assignedStaffName: initialStaffRole,
          proofStatus: hasDesignRequest ? 'PENDING' : 'APPROVED',

          // Phase 4 Omnichannel Order Source & Staff Accountability
          orderSource,
          branch,
          discountReason: discountReason || null,
          createdStaffId,
          createdStaffName,
          managerApprovalId: managerApprovalId || null,
          managerApprovalName: managerApprovalName || null,

          items: {
            create: validatedItems,
          },
          statusHistory: {
            create: {
              previousStatus: null,
              newStatus: initialStatus,
              note: initialStatusNote,
              customerNote: `Order registered via ${orderSource}. Print specifications prepared.`,
              changedByUserId: createdStaffId,
            },
          },
          ...(notes ? { notes: { create: { noteText: notes, userId: createdStaffId, isInternalOnly: true } } } : {}),
        },
        include: {
          items: true,
          statusHistory: true,
        },
      });

      // B. Create Linked Invoice (ORDER_RECEIPT)
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: createdOrder.id,
          invoiceType: 'ORDER_RECEIPT',
          companyDetailsJson: JSON.stringify({
            companyName: bizInfo.brand?.legalName || bizInfo.brand?.brandName || 'Print Bazzar',
            tradeName: bizInfo.brand?.brandName || 'Print Bazzar',
            address: bizInfo.address?.fullDisplayAddress || '12 A, Allimal Street, Big Bazzar St, Singarathope, Tiruchirappalli - 620008, Tamil Nadu',
            gstin: bizInfo.tax?.gstin || '33AAAAA0000A1Z5',
            email: bizInfo.contact?.supportEmail || 'printbazzar.online@gmail.com',
            phone: bizInfo.contact?.primaryPhone || '+91 96290 98565',
            website: 'https://printbazzar.online',
          }),
          billToSnapshotJson: JSON.stringify({
            name: customerName,
            email: customerEmail,
            mobile: cleanMobile,
            gstin: gstNumber || null,
            companyName: companyName || null,
          }),
          shipToSnapshotJson: JSON.stringify({
            deliveryMethod: effectiveDeliveryMethod,
            address: isStorePickup ? 'Store Pickup - Print Bazzar Press Facility' : shippingAddress,
          }),
          itemsSnapshotJson: JSON.stringify(
            createdOrder.items.map((i) => ({
              name: i.productNameSnapshot,
              sku: i.skuSnapshot,
              quantity: i.quantity,
              unitPrice: i.unitPriceSnapshot,
              totalPrice: i.totalPriceSnapshot,
              designRequired: i.designRequired,
              designCharge: i.designCharge,
            }))
          ),
          subtotal: calculatedSubtotal,
          taxableAmount,
          cgst: cgstAmount,
          sgst: sgstAmount,
          igst: igstAmount,
          totalTax,
          shippingCharge,
          grandTotal,
          amountPaid,
          balanceDue,
          paymentStatus: invoicePaymentStatus,
          paymentMethod: paymentMethodRecorded,
          transactionReference: transactionRef,
        },
      });

      // C. Create Linked Shipment Record
      const ship = await tx.shipment.create({
        data: {
          shipmentNumber,
          orderId: createdOrder.id,
          deliveryMethod: effectiveDeliveryMethod,
          recipientName: customerName,
          mobile: cleanMobile,
          companyName: companyName || null,
          fullAddress: isStorePickup ? 'Store Pickup - Print Bazzar Press Facility' : (typeof shippingAddress === 'string' ? shippingAddress : shippingAddress?.street || 'Trichy'),
          city: shippingAddress?.city || 'Tiruchirappalli',
          state: shippingAddress?.state || 'Tamil Nadu',
          pincode: shippingAddress?.pincode || '620008',
          status: 'PENDING',
          expectedDeliveryDate: estimatedDeliveryDate,
        },
      });

      // D. Create ProductionJob cards for each item
      for (let idx = 0; idx < createdOrder.items.length; idx++) {
        const item = createdOrder.items[idx];
        const jobSuffix = createdOrder.items.length > 1 ? `-${idx + 1}` : '';
        const jobNumber = `PB-JOB-${currentYear}-${orderSequence}${jobSuffix}`;

        const jobStatus = hasDesignRequest ? 'WAITING_FOR_DESIGN_APPROVAL' : 'ARTWORK_REVIEW';

        await tx.productionJob.create({
          data: {
            jobNumber,
            orderId: createdOrder.id,
            orderItemId: item.id,
            productId: item.productId,
            productNameSnapshot: item.productNameSnapshot,
            quantity: item.quantity,
            priority: 'STANDARD',
            status: jobStatus,
            specsSnapshotJson: item.specificationsSnapshot,
            customizationSnapshotJson: item.optionsSnapshot,
            approvedArtworkUrl: item.artworkFileUrl || null,
            approvedArtworkVersion: item.artworkFileUrl ? 'V1 - Walk-in Customer File' : null,
            artworkStatus: hasDesignRequest ? 'WAITING_APPROVAL' : (item.artworkFileUrl ? 'APPROVED' : 'WAITING_APPROVAL'),
            deadline: estimatedDispatchDate,
          },
        });
      }

      // E. Create DesignOrder if custom design requested
      const designItems = createdOrder.items.filter((i) => i.designRequired);
      for (let idx = 0; idx < designItems.length; idx++) {
        const dItem = designItems[idx];
        const designSuffix = designItems.length > 1 ? `-${idx + 1}` : '';
        const designJobNumber = `${designJobPrefix}-${currentYear}-${orderSequence}${designSuffix}`;

        await tx.designOrder.create({
          data: {
            designJobNumber,
            orderId: createdOrder.id,
            orderItemId: dItem.id,
            productId: dItem.productId,
            packageId: dItem.designPackageId,
            packageNameSnapshot: dItem.designPackageName || 'Custom Graphic Design',
            packagePriceSnapshot: dItem.designCharge || 0,
            requirementNotes: dItem.requirementNotes || 'Walk-in custom design request',
            preferredStyle: dItem.preferredStyle || 'Modern',
            preferredColor: dItem.preferredColor || 'Customer Choice',
            status: 'REQUIREMENT_RECEIVED',
            priority: 'NORMAL',
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          },
        });

        await tx.orderItem.update({
          where: { id: dItem.id },
          data: { designJobNumber },
        });
      }

      // F. Create Payment record if payment received
      let pRecord = null;
      if (amountPaid > 0) {
        pRecord = await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            paymentMethod: paymentMethodRecorded,
            amount: amountPaid,
            status: 'SUCCESS',
            transactionId: transactionRef || `POS-PAY-${Date.now()}`,
            paymentMetadata: JSON.stringify({
              collectedByStaffId: createdStaffId,
              collectedByStaffName: createdStaffName,
              branch,
              notes: payment?.notes || 'Front Office POS Payment Collection',
            }),
          },
        });
      }

      // G. Audit Log for Order Placement & Discount
      await tx.auditLog.create({
        data: {
          userId: createdStaffId,
          action: 'POS_ORDER_CREATED',
          entityName: 'ORDER',
          entityId: createdOrder.id,
          newValues: JSON.stringify({
            orderNumber: createdOrder.orderNumber,
            orderSource,
            branch,
            customerName,
            customerMobile: cleanMobile,
            grandTotal,
            amountPaid,
            balanceDue,
            paymentStatus,
            createdStaffName,
          }),
        },
      });

      if (numericDiscount > 0) {
        await tx.auditLog.create({
          data: {
            userId: createdStaffId,
            action: 'DISCOUNT_APPLIED',
            entityName: 'ORDER',
            entityId: createdOrder.id,
            newValues: JSON.stringify({
              orderNumber: createdOrder.orderNumber,
              subtotal: calculatedSubtotal,
              discountAmount: numericDiscount,
              discountPercentage: ((numericDiscount / calculatedSubtotal) * 100).toFixed(1) + '%',
              finalTotal: grandTotal,
              staffId: createdStaffId,
              staffName: createdStaffName,
              managerApprovalId,
              managerApprovalName,
              reason: discountReason || 'Walk-in customer concession',
              timestamp: new Date().toISOString(),
            }),
          },
        });
      }

      return {
        newOrder: createdOrder,
        createdInvoice: inv,
        createdShipment: ship,
        paymentRecord: pRecord,
      };
    }, { timeout: 15000 });

    // Send notifications
    sendOrderNotification({
      order: newOrder,
      eventType: 'ORDER_PROCESSING',
      extra: { invoiceNumber, shipmentNumber },
    }).catch((err) => console.warn('[POS NOTIFICATION]', err.message));

    return res.status(201).json({
      success: true,
      message: `Walk-in Order #${newOrder.orderNumber} successfully registered across operations & production!`,
      orderNumber: newOrder.orderNumber,
      orderId: newOrder.id,
      order: toCustomerSafeOrder(newOrder, { isOwner: true }),
      invoice: createdInvoice,
      invoiceNumber,
      shipment: createdShipment,
      shipmentNumber,
      payment: paymentRecord,
      grandTotal,
      amountPaid,
      balanceDue,
      paymentStatus,
      orderStatus: initialStatus,
      receiptData: {
        companyName: bizInfo.brand?.legalName || 'Print Bazzar',
        brandName: 'Print Bazzar',
        orderNumber: newOrder.orderNumber,
        date: new Date().toISOString(),
        customerName,
        customerMobile: cleanMobile,
        orderSource,
        branch,
        staffName: createdStaffName,
        items: validatedItems.map((i) => ({
          name: i.productNameSnapshot,
          quantity: i.quantity,
          unitPrice: i.unitPriceSnapshot,
          totalPrice: i.totalPriceSnapshot,
        })),
        subtotal: calculatedSubtotal,
        discountAmount: numericDiscount,
        shippingCharge,
        totalTax,
        grandTotal,
        amountPaid,
        balanceDue,
        paymentStatus,
        paymentMethod: paymentMethodRecorded,
        trackingUrl: `https://printbazzar.online/track-order/${newOrder.orderNumber}`,
      },
    });
  } catch (error) {
    console.error('createWalkInOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create walk-in order.' });
  }
};

/**
 * GET /api/v1/admin/pos/dashboard
 * Aggregates Today's Front Office Metrics and Staff-wise performance
 */
export const getFrontOfficeDashboard = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch orders created on this date
    const ordersToday = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        invoices: true,
        payments: true,
        items: true,
      },
    });

    // Fetch payments created on this date
    const paymentsToday = await prisma.payment.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: 'SUCCESS',
      },
    });

    // Metrics calculations
    const totalOrdersCreated = ordersToday.length;
    const walkInOrders = ordersToday.filter((o) => o.orderSource === 'WALK_IN');
    const websiteOrders = ordersToday.filter((o) => o.orderSource === 'WEBSITE');
    const phoneOrders = ordersToday.filter((o) => o.orderSource === 'PHONE');
    const whatsappOrders = ordersToday.filter((o) => o.orderSource === 'WHATSAPP');
    const instagramOrders = ordersToday.filter((o) => o.orderSource === 'INSTAGRAM');
    const b2bOrders = ordersToday.filter((o) => o.orderSource === 'B2B');

    const totalSalesToday = ordersToday.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const walkInSalesToday = walkInOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    // Payment method breakdown based on actual Payment records
    let cashCollected = 0;
    let upiCollected = 0;
    let cardCollected = 0;
    let razorpayCollected = 0;
    let bankTransferCollected = 0;

    paymentsToday.forEach((p) => {
      const method = (p.paymentMethod || '').toUpperCase();
      if (method === 'CASH') cashCollected += p.amount;
      else if (method === 'UPI') upiCollected += p.amount;
      else if (method === 'CARD') cardCollected += p.amount;
      else if (method === 'RAZORPAY') razorpayCollected += p.amount;
      else if (method === 'BANK_TRANSFER' || method === 'NET_BANKING') bankTransferCollected += p.amount;
      else upiCollected += p.amount; // default
    });

    const totalCollected = cashCollected + upiCollected + cardCollected + razorpayCollected + bankTransferCollected;

    // Outstanding balance due on today's orders
    const balanceDueToday = ordersToday.reduce((sum, o) => {
      const inv = o.invoices?.[0];
      return sum + (inv?.balanceDue ?? (o.paymentStatus === 'CONFIRMED' ? 0 : o.grandTotal));
    }, 0);

    // Status counts
    const pendingPayments = ordersToday.filter((o) => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PARTIALLY_PAID').length;
    const pendingArtwork = ordersToday.filter((o) => o.orderStatus === 'ARTWORK_REQUIRED' || o.orderStatus === 'ORDER_REVIEW').length;
    const pendingDesignApproval = ordersToday.filter((o) => o.orderStatus === 'DESIGN_QUEUE' || o.orderStatus === 'DESIGN_IN_PROGRESS' || o.proofStatus === 'PENDING').length;
    const preProductionQcPending = ordersToday.filter((o) => o.orderStatus === 'PRE_PRODUCTION_QC').length;

    // Staff-wise breakdown
    const staffMap = {};
    ordersToday.forEach((o) => {
      const staffName = o.createdStaffName || 'Online / System';
      if (!staffMap[staffName]) {
        staffMap[staffName] = {
          staffName,
          orderCount: 0,
          totalSales: 0,
          cashCollected: 0,
          upiCollected: 0,
          pendingBalance: 0,
        };
      }
      staffMap[staffName].orderCount += 1;
      staffMap[staffName].totalSales += o.grandTotal || 0;
      const inv = o.invoices?.[0];
      staffMap[staffName].pendingBalance += inv?.balanceDue ?? (o.paymentStatus === 'CONFIRMED' ? 0 : o.grandTotal);
    });

    paymentsToday.forEach((p) => {
      try {
        const meta = typeof p.paymentMetadata === 'string' ? JSON.parse(p.paymentMetadata) : p.paymentMetadata;
        const staffName = meta?.collectedByStaffName || 'Staff';
        if (staffMap[staffName]) {
          if (p.paymentMethod === 'CASH') staffMap[staffName].cashCollected += p.amount;
          else staffMap[staffName].upiCollected += p.amount;
        }
      } catch (_) {}
    });

    return res.json({
      success: true,
      date: startOfDay.toISOString().split('T')[0],
      kpis: {
        totalOrdersCreated,
        totalSalesToday,
        walkInOrdersCount: walkInOrders.length,
        walkInSalesToday,
        websiteOrdersCount: websiteOrders.length,
        whatsappOrdersCount: whatsappOrders.length,
        instagramOrdersCount: instagramOrders.length,
        phoneOrdersCount: phoneOrders.length,
        b2bOrdersCount: b2bOrders.length,
        cashCollected,
        upiCollected,
        cardCollected,
        razorpayCollected,
        bankTransferCollected,
        totalCollected,
        balanceDueToday,
        pendingPayments,
        pendingArtwork,
        pendingDesignApproval,
        preProductionQcPending,
      },
      staffPerformance: Object.values(staffMap),
    });
  } catch (error) {
    console.error('getFrontOfficeDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load front office dashboard.' });
  }
};
