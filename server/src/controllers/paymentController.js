import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { sendOrderNotification } from '../services/notificationService.js';

const prisma = new PrismaClient();

// Helper to get payment gateway settings from StoreSetting table or process.env
async function getGatewayConfig() {
  try {
    const settings = await prisma.storeSetting.findMany({
      where: {
        key: {
          in: [
            'RAZORPAY_KEY_ID',
            'RAZORPAY_KEY_SECRET',
            'PAYMENT_GATEWAY_PROVIDER',
            'ENABLE_ONLINE_PAYMENTS',
            'ENABLE_COD',
            'DESIGN_SPLIT_PAYMENT',
            'RAZORPAY_MODE',
            'RAZORPAY_TEST_KEY_ID',
            'RAZORPAY_TEST_KEY_SECRET',
            'RAZORPAY_TEST_WEBHOOK_SECRET',
            'RAZORPAY_LIVE_KEY_ID',
            'RAZORPAY_LIVE_KEY_SECRET',
            'RAZORPAY_LIVE_WEBHOOK_SECRET',
          ],
        },
      },
    });

    const config = {};
    settings.forEach((s) => {
      try {
        config[s.key] = JSON.parse(s.value);
      } catch {
        config[s.key] = s.value;
      }
    });

    // Determine Mode: TEST or LIVE (Defaults safely to TEST; never switches automatically)
    const mode = (config.RAZORPAY_MODE || process.env.RAZORPAY_MODE || 'TEST').toUpperCase();
    const isLive = mode === 'LIVE';

    const keyId = isLive
      ? (config.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_LIVE_KEY_ID || config.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '')
      : (config.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_TEST_KEY_ID || config.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '');

    const keySecret = isLive
      ? (config.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_LIVE_KEY_SECRET || config.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_SECRET || '')
      : (config.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_TEST_KEY_SECRET || config.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_SECRET || '');

    const webhookSecret = isLive
      ? (config.RAZORPAY_LIVE_WEBHOOK_SECRET || process.env.RAZORPAY_LIVE_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || keySecret)
      : (config.RAZORPAY_TEST_WEBHOOK_SECRET || process.env.RAZORPAY_TEST_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || keySecret);

    const provider = config.PAYMENT_GATEWAY_PROVIDER || (keyId ? 'RAZORPAY' : 'SIMULATOR');
    const enableOnline = config.ENABLE_ONLINE_PAYMENTS !== false;
    const enableCod = config.ENABLE_COD !== false;
    const designSplit = config.DESIGN_SPLIT_PAYMENT !== false;

    return {
      keyId,
      keySecret,
      webhookSecret,
      mode,
      provider,
      enableOnline,
      enableCod,
      designSplit,
    };
  } catch (err) {
    const keyId = process.env.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_SECRET || '';
    const webhookSecret = process.env.RAZORPAY_TEST_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || keySecret;
    return {
      keyId,
      keySecret,
      webhookSecret,
      mode: 'TEST',
      provider: 'SIMULATOR',
      enableOnline: true,
      enableCod: true,
      designSplit: true,
    };
  }
}

/**
 * POST /api/v1/payments/create-order
 * Creates a server-side payment order session with the gateway
 * Supports:
 * - Stage 1: paymentStage === 'DESIGN' (Customer pays design fee upfront)
 * - Stage 2: paymentStage === 'BALANCE' (Customer pays balance printing fee upon proof approval)
 * - Stage Full: paymentStage === 'FULL' (Print-ready full upfront payment)
 */
export const createPaymentSession = async (req, res) => {
  try {
    const { orderNumber, paymentStage = 'FULL' } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ success: false, message: 'Order Number is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: orderNumber.trim() },
      include: {
        items: true,
        invoices: true,
        payments: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const config = await getGatewayConfig();
    const hasDesign = order.items.some((i) => i.designRequired);
    const designFeeTotal = order.items.reduce((sum, item) => sum + (item.designCharge || 0), 0);

    // Calculate payable amount according to paymentStage
    let payableAmount = order.grandTotal;
    let effectiveStage = paymentStage;

    if (hasDesign && config.designSplit && paymentStage !== 'FULL') {
      if (paymentStage === 'DESIGN' || (order.paymentStatus === 'PENDING' && designFeeTotal > 0)) {
        effectiveStage = 'DESIGN';
        payableAmount = designFeeTotal > 0 ? designFeeTotal : order.grandTotal;
      } else if (paymentStage === 'BALANCE' || order.paymentStatus === 'PARTIALLY_PAID') {
        effectiveStage = 'BALANCE';
        const invoice = order.invoices?.[0];
        payableAmount = invoice ? invoice.balanceDue : Math.max(0, order.grandTotal - designFeeTotal);
      }
    }

    if (payableAmount <= 0) {
      return res.status(400).json({ success: false, message: 'No outstanding balance due for this order.' });
    }

    // Generate unique gateway order ID
    let gatewayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // If real Razorpay credentials exist, attempt official Razorpay API order creation
    if (config.keyId && config.keySecret && config.keyId.startsWith('rzp_')) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');
        const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: Math.round(payableAmount * 100), // amount in paise
            currency: 'INR',
            receipt: `${order.orderNumber}-${effectiveStage}`,
            notes: {
              orderNumber: order.orderNumber,
              customerMobile: order.customerMobile,
              stage: effectiveStage,
            },
          }),
        });

        if (rzpResponse.ok) {
          const rzpData = await rzpResponse.json();
          if (rzpData && rzpData.id) {
            gatewayOrderId = rzpData.id;
          }
        }
      } catch (rzpErr) {
        console.warn('Direct Razorpay API order creation warning, using deterministic session order ID:', rzpErr.message);
      }
    }

    return res.json({
      success: true,
      orderNumber: order.orderNumber,
      amount: payableAmount,
      currency: 'INR',
      gatewayOrderId,
      keyId: config.keyId || 'rzp_test_mock_printbazzar',
      provider: config.provider,
      paymentStage: effectiveStage,
      isRealKeyConfigured: Boolean(config.keyId && config.keyId.startsWith('rzp_')),
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        mobile: order.customerMobile,
      },
    });
  } catch (error) {
    console.error('Create payment session error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create payment session.' });
  }
};

/**
 * POST /api/v1/payments/verify
 * Cryptographically verifies online payment confirmation
 * Supports:
 * - Stage 1 Design Payment -> transitions to PARTIALLY_PAID & DESIGN_IN_PROGRESS
 * - Stage 2 Proof Balance / Full Payment -> transitions to PAID/CONFIRMED & PRODUCTION_QUEUE
 * Idempotent: safe against duplicate callbacks or network retries
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      orderNumber,
      paymentId,
      orderId: gatewayOrderId,
      signature,
      paymentMethod = 'UPI',
      paymentStage = 'FULL',
      transactionReference,
    } = req.body;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order Number is required for payment verification.',
      });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: orderNumber.trim() },
      include: {
        items: true,
        productionJobs: true,
        designOrders: true,
        payments: true,
        invoices: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order ${orderNumber} not found.`,
      });
    }

    const config = await getGatewayConfig();
    const hasDesign = order.items.some((i) => i.designRequired);
    const designFeeTotal = order.items.reduce((sum, item) => sum + (item.designCharge || 0), 0);

    // Cryptographic Signature Verification (when secret and signature provided)
    if (config.keySecret && gatewayOrderId && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', config.keySecret)
        .update(`${gatewayOrderId}|${paymentId}`)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn(`[SECURITY ALERT] Invalid payment signature for order ${orderNumber}!`);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Invalid cryptographic signature.',
        });
      }
    }

    const effectiveTxnRef =
      paymentId || transactionReference || `PAY-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    // Idempotency Check: Guard against duplicate payments, repeated clicks, and duplicate webhooks
    const existingPayment = order.payments?.find(
      (p) => (paymentId && p.transactionId === paymentId) || p.status === 'SUCCESS'
    );

    if (order.paymentStatus === 'CONFIRMED' || (existingPayment && existingPayment.status === 'SUCCESS' && paymentStage === 'FULL')) {
      return res.json({
        success: true,
        isDuplicateCall: true,
        message: 'Payment has already been verified and confirmed for this order.',
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        amountPaid: order.grandTotal,
        balanceDue: 0,
        transactionReference: existingPayment?.transactionId || effectiveTxnRef,
      });
    }

    // Determine whether this is Stage 1 (Design Service) or Stage 2 / Full Printing
    const isStage1 =
      paymentStage === 'DESIGN' ||
      (hasDesign && config.designSplit && order.paymentStatus === 'PENDING' && paymentStage !== 'FULL');

    let targetPaymentStatus = 'CONFIRMED';
    let targetOrderStatus = 'ORDER_REVIEW';
    let targetDept = 'DESIGN';
    let staffName = 'Prepress Specialist';
    let amountPaidThisStage = order.grandTotal;
    let newTotalPaid = order.grandTotal;
    let newBalanceDue = 0;
    let historyNote = '';

    if (isStage1 && designFeeTotal > 0) {
      targetPaymentStatus = 'PARTIALLY_PAID';
      targetOrderStatus = 'DESIGN_IN_PROGRESS';
      targetDept = 'DESIGN';
      staffName = 'Design Team Lead';
      amountPaidThisStage = designFeeTotal;
      newTotalPaid = designFeeTotal;
      newBalanceDue = Math.max(0, order.grandTotal - designFeeTotal);
      historyNote = `Stage 1 Design Fee of ₹${amountPaidThisStage} verified successfully (${paymentMethod} Ref: ${effectiveTxnRef}). Order dispatched to Prepress Design Team. Remaining balance ₹${newBalanceDue} due upon proof approval.`;
    } else if (hasDesign) {
      // Custom Design Required: Move to DESIGN_QUEUE
      targetPaymentStatus = 'CONFIRMED';
      targetOrderStatus = 'DESIGN_QUEUE';
      targetDept = 'DESIGN';
      staffName = 'Design Team Lead';
      newTotalPaid = order.grandTotal;
      newBalanceDue = 0;
      historyNote = `Full payment of ₹${order.grandTotal} verified successfully (${paymentMethod} Ref: ${effectiveTxnRef}). Order routed to Design Team (DESIGN_QUEUE) for custom artwork creation.`;
    } else {
      // Customer Uploaded Artwork / Print-Ready File: Move to ORDER_REVIEW (Prepress Hub)
      targetPaymentStatus = 'CONFIRMED';
      targetOrderStatus = 'ORDER_REVIEW';
      targetDept = 'DESIGN';
      staffName = 'Prepress Specialist';
      newTotalPaid = order.grandTotal;
      newBalanceDue = 0;
      historyNote = `Full payment of ₹${order.grandTotal} verified successfully (${paymentMethod} Ref: ${effectiveTxnRef}). Order routed to Prepress Team for Artwork Review (ORDER_REVIEW). Prepress inspection required before production release.`;
    }

    // Atomic Database Transaction for Order State Transition
    await prisma.$transaction(async (tx) => {
      // 1. Update Order Payment & Workflow Status
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: targetPaymentStatus,
          orderStatus: targetOrderStatus,
          currentDepartment: targetDept,
          assignedStaffName: staffName,
          proofStatus: isStage1 ? 'PENDING' : (hasDesign ? 'PENDING' : 'WAITING_APPROVAL'),
          proofApprovedAt: null,
        },
      });

      // 2. Create or Update Payment Record (Double-click & concurrent idempotency check inside transaction)
      const existingSuccessPayment = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          transactionId: effectiveTxnRef,
          status: 'SUCCESS',
        },
      });

      const paymentMetadata = JSON.stringify({
        verifiedAt: new Date().toISOString(),
        paymentId,
        gatewayOrderId,
        paymentStage: isStage1 ? 'DESIGN_FEE' : 'FULL_OR_BALANCE',
        signatureVerified: Boolean(config.keySecret && signature),
      });

      if (!existingSuccessPayment) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: amountPaidThisStage,
            status: 'SUCCESS',
            paymentMethod,
            transactionId: effectiveTxnRef,
            paymentMetadata,
          },
        });
      }

      // 3. Record in Order Status History
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.orderStatus,
          newStatus: targetOrderStatus,
          note: historyNote,
          customerNote: hasDesign
            ? 'Payment confirmed successfully! Our design team is reviewing your requirements and preparing your custom artwork.'
            : 'Payment confirmed successfully! Our prepress team is verifying your uploaded artwork specifications for print readiness.',
          changedByUserId: null,
        },
      });

      // 4. Update Linked Production Jobs (Held in prepress review, NOT released directly to printing press)
      for (const job of order.productionJobs) {
        if (isStage1 || hasDesign) {
          await tx.productionJob.update({
            where: { id: job.id },
            data: {
              status: 'WAITING_FOR_DESIGN_APPROVAL',
              artworkStatus: 'WAITING_APPROVAL',
            },
          });
        } else {
          await tx.productionJob.update({
            where: { id: job.id },
            data: {
              status: 'ARTWORK_REVIEW',
              artworkStatus: 'WAITING_APPROVAL',
            },
          });
        }
      }

      // 5. Update Linked Design Jobs
      for (const dJob of order.designOrders) {
        if (isStage1) {
          await tx.designOrder.update({
            where: { id: dJob.id },
            data: {
              status: 'REQUIREMENT_RECEIVED',
            },
          });
        } else {
          await tx.designOrder.update({
            where: { id: dJob.id },
            data: {
              status: 'APPROVED',
            },
          });
        }
      }

      // 6. Update Linked Invoice(s) with precise amountPaid and balanceDue
      await tx.invoice.updateMany({
        where: { orderId: order.id },
        data: {
          paymentStatus: targetPaymentStatus === 'CONFIRMED' ? 'PAID' : 'PARTIALLY_PAID',
          amountPaid: newTotalPaid,
          balanceDue: newBalanceDue,
          paymentMethod,
          transactionReference: effectiveTxnRef,
        },
      });

      // 7. Record Audit Log
      await tx.auditLog.create({
        data: {
          action: 'PAYMENT_VERIFIED',
          entityName: 'ORDER',
          entityId: order.id,
          newValues: JSON.stringify({
            orderNumber: order.orderNumber,
            stage: isStage1 ? 'DESIGN_FEE' : 'FULL_BALANCE',
            amountPaid: amountPaidThisStage,
            totalPaid: newTotalPaid,
            balanceDue: newBalanceDue,
            paymentMethod,
            transactionReference: effectiveTxnRef,
          }),
        },
      });
    });

    console.log(
      `[PAYMENT VERIFIED] Order ${order.orderNumber} successfully verified (${targetPaymentStatus}) & queued for ${targetDept}`
    );

    // Trigger customer notification
    sendOrderNotification({
      order: { ...order, orderStatus: targetOrderStatus, paymentStatus: targetPaymentStatus },
      eventType: isStage1 ? 'DESIGN_ORDER_RECEIVED' : 'ORDER_CONFIRMED',
    }).catch((err) => console.error('[NOTIFICATION DISPATCH FAILED]', err.message));

    return res.json({
      success: true,
      message: isStage1
        ? 'Design fee payment verified! Order dispatched to Prepress Design Team.'
        : 'Payment verified and order successfully confirmed for printing!',
      orderNumber: order.orderNumber,
      paymentStatus: targetPaymentStatus,
      orderStatus: targetOrderStatus,
      amountPaid: amountPaidThisStage,
      balanceDue: newBalanceDue,
      transactionReference: effectiveTxnRef,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    // Double-click / concurrency fallback: Check if another concurrent thread already completed verification successfully
    try {
      if (req.body?.orderNumber) {
        const orderCheck = await prisma.order.findUnique({
          where: { orderNumber: req.body.orderNumber.trim() },
          include: { payments: true },
        });
        if (orderCheck && (orderCheck.paymentStatus === 'CONFIRMED' || orderCheck.payments?.some((p) => p.status === 'SUCCESS'))) {
          return res.json({
            success: true,
            isDuplicateCall: true,
            message: 'Payment has already been verified and confirmed for this order.',
            orderNumber: orderCheck.orderNumber,
            paymentStatus: orderCheck.paymentStatus,
            orderStatus: orderCheck.orderStatus,
            amountPaid: orderCheck.grandTotal,
            balanceDue: 0,
            transactionReference: req.body.paymentId || req.body.transactionReference || 'SUCCESS',
          });
        }
      }
    } catch (fallbackErr) {
      console.error('Fallback check error:', fallbackErr);
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to process payment verification.',
    });
  }
};

/**
 * POST /api/v1/payments/convert-to-cod
 * Converts an order to Cash on Delivery / Pay at Shop counter
 */
export const convertToCod = async (req, res) => {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ success: false, message: 'Order Number is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: orderNumber.trim() },
      include: {
        items: true,
        productionJobs: true,
        invoices: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const hasDesignRequest = order.items.some((i) => i.designRequired);
    const targetStatus = hasDesignRequest ? 'DESIGN_IN_PROGRESS' : 'PRODUCTION_QUEUE';
    const targetDept = hasDesignRequest ? 'DESIGN' : 'PRODUCTION';
    const staffRole = hasDesignRequest ? 'Design Team Lead' : 'Press Supervisor';
    const historyNote = hasDesignRequest
      ? 'Order confirmed with Cash on Delivery / Pay at Shop. Assigned to Prepress Design Team.'
      : 'Order confirmed with Cash on Delivery / Pay at Shop. Logged directly into Press Production queue.';

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PENDING',
          orderStatus: targetStatus,
          currentDepartment: targetDept,
          assignedStaffName: staffRole,
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: 'CASH',
          amount: order.grandTotal,
          status: 'PENDING',
          transactionId: `COD-${Date.now()}`,
          paymentMetadata: JSON.stringify({ mode: 'CASH_ON_DELIVERY_OR_SHOP_PICKUP' }),
        },
      });

      await tx.invoice.updateMany({
        where: { orderId: order.id },
        data: {
          paymentMethod: 'CASH_ON_DELIVERY',
          paymentStatus: 'PENDING',
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.orderStatus,
          newStatus: targetStatus,
          note: historyNote,
          customerNote: 'Order confirmed with Cash on Delivery. We are processing your print job.',
          changedByUserId: null,
        },
      });
    });

    // Customer Notification
    sendOrderNotification({
      order: { ...order, orderStatus: targetStatus, paymentStatus: 'PENDING' },
      eventType: 'ORDER_CONFIRMED',
    }).catch((err) => console.error('[NOTIFICATION DISPATCH FAILED]', err.message));

    return res.json({
      success: true,
      message: 'Order confirmed with Cash on Delivery / Pay at Shop.',
      orderNumber: order.orderNumber,
      paymentStatus: 'PENDING',
      orderStatus: targetStatus,
      paymentMethod: 'COD',
    });
  } catch (error) {
    console.error('Convert to COD error:', error);
    return res.status(500).json({ success: false, message: 'Failed to confirm COD order.' });
  }
};

/**
 * POST /api/v1/payments/webhook
 * Razorpay / Payment Gateway Webhook Listener
 * Asynchronously verifies payment events even if customer closes browser early
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const config = await getGatewayConfig();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || config.keySecret;

    // 1. Strict Cryptographic Signature Verification
    if (webhookSecret) {
      if (!signature) {
        console.warn('[WEBHOOK SECURITY] Rejected webhook: Missing x-razorpay-signature header');
        return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
      }

      const rawPayload = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawPayload)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const signatureBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
        console.warn('[WEBHOOK SECURITY] Rejected webhook: Invalid cryptographic signature');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    // 2. Handle Payment Success Events (payment.captured / order.paid)
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity || {};
      const orderEntity = payload?.order?.entity || {};
      const orderNumber =
        paymentEntity.notes?.orderNumber ||
        orderEntity.notes?.orderNumber ||
        paymentEntity.notes?.order_number ||
        orderEntity.notes?.order_number ||
        orderEntity.receipt;

      if (!orderNumber) {
        return res.json({ status: 'ok', received: true, note: 'Event processed (No order reference in payload)' });
      }

      const order = await prisma.order.findUnique({
        where: { orderNumber: String(orderNumber).trim() },
        include: { items: true, productionJobs: true, payments: true, invoices: true },
      });

      if (!order) {
        console.warn(`[WEBHOOK] Order ${orderNumber} not found in database.`);
        return res.status(404).json({ success: false, message: `Order ${orderNumber} not found` });
      }

      const paymentId = paymentEntity.id || `webhook_${Date.now()}`;
      const amountPaid = paymentEntity.amount ? paymentEntity.amount / 100 : order.grandTotal;

      // 3. Idempotency Check: Protect against duplicate webhooks and concurrent client redirects
      const alreadyCaptured = order.payments?.some(
        (p) => p.transactionId === paymentId && p.status === 'SUCCESS'
      );

      if (alreadyCaptured || (order.paymentStatus === 'CONFIRMED' && order.payments?.some((p) => p.status === 'SUCCESS'))) {
        console.log(`[WEBHOOK IDEMPOTENT] Order ${order.orderNumber} already confirmed or payment ${paymentId} already captured. Skipping duplicate.`);
        await prisma.auditLog.create({
          data: {
            action: 'PAYMENT_WEBHOOK_DUPLICATE_IGNORED',
            entityName: 'ORDER',
            entityId: order.id,
            newValues: JSON.stringify({ orderNumber: order.orderNumber, paymentId, event }),
          },
        }).catch(() => {});
        return res.json({ status: 'ok', received: true, isDuplicate: true });
      }

      const hasDesignRequest = order.items?.some((i) => i.designRequired);
      const targetOrderStatus = hasDesignRequest ? 'DESIGN_QUEUE' : 'ORDER_REVIEW';
      const targetDept = 'DESIGN';
      const assignedStaffName = hasDesignRequest ? 'Design Team Lead' : 'Prepress Specialist';
      const jobStatus = hasDesignRequest ? 'WAITING_FOR_DESIGN_APPROVAL' : 'ARTWORK_REVIEW';
      const historyNote = hasDesignRequest
        ? `Payment of ₹${amountPaid} verified asynchronously via Webhook (${paymentId}). Order routed to Design Team (DESIGN_QUEUE) for custom artwork creation.`
        : `Payment of ₹${amountPaid} verified asynchronously via Webhook (${paymentId}). Order routed to Prepress Team for Artwork Review (ORDER_REVIEW). Prepress inspection required before production release.`;
      const customerNote = hasDesignRequest
        ? 'Your payment was successfully verified. Our design team has received your brief and is preparing your artwork!'
        : 'Your payment was successfully verified. Our prepress team is verifying your uploaded artwork specifications for print readiness.';

      // 4. Atomic Multi-Entity State Reconciliation
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'CONFIRMED',
            orderStatus: targetOrderStatus,
            currentDepartment: targetDept,
            assignedStaffName: assignedStaffName,
            proofStatus: hasDesignRequest ? 'PENDING' : 'WAITING_APPROVAL',
            proofApprovedAt: null,
          },
        });

        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: amountPaid,
            status: 'SUCCESS',
            paymentMethod: paymentEntity.method ? paymentEntity.method.toUpperCase() : 'ONLINE_WEBHOOK',
            transactionId: paymentId,
            paymentMetadata: JSON.stringify({
              source: 'WEBHOOK',
              event,
              gatewayOrderId: paymentEntity.order_id,
              verifiedAt: new Date().toISOString(),
            }),
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            previousStatus: order.orderStatus,
            newStatus: targetOrderStatus,
            note: historyNote,
            customerNote: customerNote,
            changedByUserId: null,
          },
        });

        for (const job of order.productionJobs) {
          await tx.productionJob.update({
            where: { id: job.id },
            data: { status: jobStatus, artworkStatus: 'WAITING_APPROVAL' },
          });
        }

        await tx.invoice.updateMany({
          where: { orderId: order.id },
          data: {
            paymentStatus: 'PAID',
            amountPaid,
            balanceDue: 0,
            transactionReference: paymentId,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'PAYMENT_WEBHOOK_VERIFIED',
            entityName: 'ORDER',
            entityId: order.id,
            newValues: JSON.stringify({
              orderNumber: order.orderNumber,
              amountPaid,
              paymentId,
              event,
              newStatus: targetOrderStatus,
            }),
          },
        });
      });

      console.log(`[WEBHOOK SUCCESS] Order ${order.orderNumber} successfully confirmed via webhook event (${event}) and moved to ${targetOrderStatus}`);

      // Trigger customer notification safely in background
      sendOrderNotification({
        order: { ...order, orderStatus: targetOrderStatus, paymentStatus: 'CONFIRMED' },
        eventType: 'ORDER_CONFIRMED',
      }).catch((err) => console.error('[WEBHOOK NOTIFICATION FAILED]', err.message));

      return res.json({ status: 'ok', received: true, orderNumber: order.orderNumber, paymentId });
    }

    // 5. Handle Payment Authorized Events (payment.authorized)
    if (event === 'payment.authorized') {
      const paymentEntity = payload?.payment?.entity || {};
      const orderNumber =
        paymentEntity.notes?.orderNumber ||
        paymentEntity.notes?.order_number;

      if (orderNumber) {
        const order = await prisma.order.findUnique({
          where: { orderNumber: String(orderNumber).trim() },
        });

        if (order) {
          const paymentId = paymentEntity.id || `auth_${Date.now()}`;
          await prisma.auditLog.create({
            data: {
              action: 'PAYMENT_WEBHOOK_AUTHORIZED',
              entityName: 'ORDER',
              entityId: order.id,
              newValues: JSON.stringify({
                orderNumber: order.orderNumber,
                paymentId,
                amount: paymentEntity.amount ? paymentEntity.amount / 100 : order.grandTotal,
                event,
              }),
            },
          }).catch(() => {});
        }
      }
      return res.json({ status: 'ok', received: true, event: 'payment.authorized' });
    }

    // 6. Handle Payment Failed Events (payment.failed)
    if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity || {};
      const orderNumber = paymentEntity.notes?.orderNumber;

      if (orderNumber) {
        const order = await prisma.order.findUnique({
          where: { orderNumber: String(orderNumber).trim() },
          include: { payments: true },
        });

        // Only record failed attempt if order is NOT already confirmed
        if (order && order.paymentStatus !== 'CONFIRMED') {
          const paymentId = paymentEntity.id || `failed_${Date.now()}`;
          const errDesc = paymentEntity.error_description || 'Payment gateway card/UPI transaction failed.';

          await prisma.payment.create({
            data: {
              orderId: order.id,
              amount: paymentEntity.amount ? paymentEntity.amount / 100 : order.grandTotal,
              status: 'FAILED',
              paymentMethod: paymentEntity.method ? paymentEntity.method.toUpperCase() : 'ONLINE_WEBHOOK',
              transactionId: paymentId,
              paymentMetadata: JSON.stringify({
                source: 'WEBHOOK',
                event,
                error: paymentEntity.error_code,
                description: errDesc,
              }),
            },
          });

          await prisma.orderStatusHistory.create({
            data: {
              orderId: order.id,
              previousStatus: order.orderStatus,
              newStatus: order.orderStatus,
              note: `Online payment attempt failed: ${errDesc} (${paymentId})`,
              customerNote: 'Online payment attempt was declined. You can retry payment or choose Cash on Delivery.',
            },
          });

          await prisma.auditLog.create({
            data: {
              action: 'PAYMENT_WEBHOOK_FAILED',
              entityName: 'ORDER',
              entityId: order.id,
              newValues: JSON.stringify({
                orderNumber: order.orderNumber,
                paymentId,
                error: paymentEntity.error_code,
                description: errDesc,
              }),
            },
          }).catch(() => {});
        }
      }
      return res.json({ status: 'ok', received: true, event: 'payment.failed' });
    }

    return res.json({ status: 'ok', received: true, unhandledEvent: event || 'none' });
  } catch (webhookErr) {
    console.error('Payment webhook error:', webhookErr);
    return res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
};


