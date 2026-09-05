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

    const keyId = config.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
    const keySecret = config.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_SECRET || '';
    const provider = config.PAYMENT_GATEWAY_PROVIDER || (keyId ? 'RAZORPAY' : 'SIMULATOR');
    const enableOnline = config.ENABLE_ONLINE_PAYMENTS !== false;
    const enableCod = config.ENABLE_COD !== false;
    const designSplit = config.DESIGN_SPLIT_PAYMENT !== false;

    return {
      keyId,
      keySecret,
      provider,
      enableOnline,
      enableCod,
      designSplit,
    };
  } catch (err) {
    return {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_SECRET || '',
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

    if (hasDesign && config.designSplit) {
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
      (hasDesign && config.designSplit && order.paymentStatus === 'PENDING') ||
      paymentStage === 'DESIGN';

    let targetPaymentStatus = 'CONFIRMED';
    let targetOrderStatus = 'PRODUCTION_QUEUE';
    let targetDept = 'PRODUCTION';
    let staffName = 'Press Supervisor';
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
    } else {
      // Stage 2 Balance Payment or Regular Full Payment
      targetPaymentStatus = 'CONFIRMED';
      targetOrderStatus = 'PRODUCTION_QUEUE';
      targetDept = 'PRODUCTION';
      staffName = 'Press Supervisor';
      newTotalPaid = order.grandTotal;
      newBalanceDue = 0;
      historyNote =
        order.paymentStatus === 'PARTIALLY_PAID'
          ? `Stage 2 Printing Balance payment of ₹${order.invoices?.[0]?.balanceDue || (order.grandTotal - designFeeTotal)} verified (${paymentMethod} Ref: ${effectiveTxnRef}). Digital proof confirmed. Order released to Press Production queue!`
          : `Full payment of ₹${order.grandTotal} verified successfully (${paymentMethod} Ref: ${effectiveTxnRef}). Order released to Press Production queue.`;
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
          proofStatus: isStage1 ? 'PENDING' : 'APPROVED',
          proofApprovedAt: isStage1 ? null : new Date(),
        },
      });

      // 2. Create or Update Payment Record
      const paymentMetadata = JSON.stringify({
        verifiedAt: new Date().toISOString(),
        paymentId,
        gatewayOrderId,
        paymentStage: isStage1 ? 'DESIGN_FEE' : 'FULL_OR_BALANCE',
        signatureVerified: Boolean(config.keySecret && signature),
      });

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

      // 3. Record in Order Status History
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.orderStatus,
          newStatus: targetOrderStatus,
          note: historyNote,
          customerNote: isStage1
            ? 'Design service fee confirmed. Our design team has started working on your custom artwork.'
            : 'Payment confirmed successfully! Your order has been scheduled for printing.',
          changedByUserId: null,
        },
      });

      // 4. Update Linked Production Jobs
      for (const job of order.productionJobs) {
        if (isStage1) {
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
              status: 'QUEUED',
              artworkStatus: 'APPROVED',
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

    if (config.keySecret && signature) {
      const shasum = crypto.createHmac('sha256', config.keySecret);
      shasum.update(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const digest = shasum.digest('hex');
      if (digest !== signature) {
        console.warn('[WEBHOOK SECURITY] Invalid webhook signature detected');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity || {};
      const orderEntity = payload?.order?.entity || {};
      const orderNumber = paymentEntity.notes?.orderNumber || orderEntity.notes?.orderNumber;

      if (orderNumber) {
        const order = await prisma.order.findUnique({
          where: { orderNumber: orderNumber.trim() },
          include: { items: true, productionJobs: true, payments: true },
        });

        if (order && order.paymentStatus !== 'CONFIRMED') {
          const paymentId = paymentEntity.id || `webhook_${Date.now()}`;
          const amountPaid = paymentEntity.amount ? paymentEntity.amount / 100 : order.grandTotal;

          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'CONFIRMED',
                orderStatus: 'PRODUCTION_QUEUE',
                currentDepartment: 'PRODUCTION',
                assignedStaffName: 'Press Supervisor',
                proofStatus: 'APPROVED',
                proofApprovedAt: new Date(),
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
                  verifiedAt: new Date().toISOString(),
                }),
              },
            });

            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                previousStatus: order.orderStatus,
                newStatus: 'PRODUCTION_QUEUE',
                note: `Payment of ₹${amountPaid} verified asynchronously via Webhook (${paymentId}). Released to Press Production.`,
                customerNote: 'Your payment was successfully verified. Your order is confirmed and queued for printing!',
              },
            });

            for (const job of order.productionJobs) {
              await tx.productionJob.update({
                where: { id: job.id },
                data: { status: 'QUEUED', artworkStatus: 'APPROVED' },
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
                }),
              },
            });
          });

          sendOrderNotification({
            order: { ...order, orderStatus: 'PRODUCTION_QUEUE', paymentStatus: 'CONFIRMED' },
            eventType: 'ORDER_CONFIRMED',
          }).catch((err) => console.error('[WEBHOOK NOTIFICATION FAILED]', err.message));
        }
      }
    }

    return res.json({ status: 'ok', received: true });
  } catch (webhookErr) {
    console.error('Payment webhook error:', webhookErr);
    return res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
};


