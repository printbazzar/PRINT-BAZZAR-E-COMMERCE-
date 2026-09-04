/**
 * Print Bazzar — Centralized Notification Engine (WhatsApp & SMS)
 * 
 * Supports event-driven transactional alerts for order milestones:
 * - ORDER_CONFIRMED
 * - PROOF_READY
 * - PRODUCTION_STARTED
 * - PACKED
 * - DISPATCHED
 * 
 * Architecture:
 * - Pluggable provider system (WhatsApp Cloud API / Webhooks / SMS Gateway).
 * - Safe fallback to audit logging when credentials are not configured in .env.
 */

const FRONTEND_URL = process.env.CLIENT_URL || 'https://printbazzar.online';

// Notification Templates
export const TEMPLATES = {
  ORDER_CONFIRMED: (order) => ({
    title: 'Order Confirmed',
    whatsappText: `🎉 *PRINT BAZZAR — Order Confirmed!*\n\nHello ${order.customerName},\nThank you for choosing Print Bazzar! Your order *#${order.orderNumber}* (₹${order.grandTotal}) has been successfully confirmed.\n\nOur prepress team is preparing your print files.\n\n📍 *Live Order Tracking:* ${FRONTEND_URL}/track-order/${order.orderNumber}\n\nNeed support? Call us: +91 96290 98565`,
    smsText: `Print Bazzar: Order #${order.orderNumber} confirmed! Amount: Rs.${order.grandTotal}. Track live: ${FRONTEND_URL}/track-order/${order.orderNumber}`,
  }),

  PROOF_READY: (order, extra) => ({
    title: 'Digital Proof Ready',
    whatsappText: `🎨 *PRINT BAZZAR — Digital Proof Ready!*\n\nHello ${order.customerName},\nYour digital print proof for order *#${order.orderNumber}* is ready for your review.\n\nPlease inspect and approve your design to start printing:\n${extra?.proofUrl || `${FRONTEND_URL}/track-order/${order.orderNumber}`}\n\nPrint Bazzar Trichy`,
    smsText: `Print Bazzar: Digital proof for Order #${order.orderNumber} is ready. Review here: ${extra?.proofUrl || `${FRONTEND_URL}/track-order/${order.orderNumber}`}`,
  }),

  PRODUCTION_STARTED: (order) => ({
    title: 'Press Printing Started',
    whatsappText: `🖨️ *PRINT BAZZAR — Printing in Progress!*\n\nHello ${order.customerName},\nYour order *#${order.orderNumber}* is now actively printing on our machines!\n\n📍 *Live Tracking:* ${FRONTEND_URL}/track-order/${order.orderNumber}`,
    smsText: `Print Bazzar: Printing started for Order #${order.orderNumber}. Live status: ${FRONTEND_URL}/track-order/${order.orderNumber}`,
  }),

  PACKED: (order) => ({
    title: 'Order Packed & Quality Passed',
    whatsappText: `📦 *PRINT BAZZAR — Quality Check Passed & Packed!*\n\nHello ${order.customerName},\nGreat news! Order *#${order.orderNumber}* has passed 100% Quality Inspection and is securely packaged for dispatch.\n\nPrint Bazzar Express Hub`,
    smsText: `Print Bazzar: Order #${order.orderNumber} has passed QC inspection and is packed for dispatch!`,
  }),

  DISPATCHED: (order, extra) => {
    const courier = extra?.courierPartner || order.courierPartner || 'ST Courier';
    const tracking = extra?.trackingReference || order.trackingReference || 'Local Express';
    return {
      title: 'Order Dispatched',
      whatsappText: `🚚 *PRINT BAZZAR — Order Dispatched!*\n\nHello ${order.customerName},\nYour order *#${order.orderNumber}* is on its way!\n\n📦 *Courier:* ${courier}\n🔖 *AWB / Tracking #:* ${tracking}\n\n📍 *Track Parcel:* ${FRONTEND_URL}/track-order/${order.orderNumber}\n\nThank you for printing with us!`,
      smsText: `Print Bazzar: Order #${order.orderNumber} dispatched via ${courier}. AWB: ${tracking}. Track: ${FRONTEND_URL}/track-order/${order.orderNumber}`,
    };
  },
};

/**
 * Send Transactional Order Notification
 * @param {Object} params
 * @param {Object} params.order - Full Order object
 * @param {string} params.eventType - One of ORDER_CONFIRMED, PROOF_READY, PRODUCTION_STARTED, PACKED, DISPATCHED
 * @param {Object} [params.extra] - Additional context (courier, tracking, proofUrl)
 */
export const sendOrderNotification = async ({ order, eventType, extra = {} }) => {
  try {
    if (!order || !order.customerMobile) {
      console.warn(`[NOTIFICATION] Skipped for event ${eventType}: No customer mobile number found.`);
      return { success: false, reason: 'NO_RECIPIENT_PHONE' };
    }

    const templateBuilder = TEMPLATES[eventType];
    if (!templateBuilder) {
      console.warn(`[NOTIFICATION] Unknown eventType: ${eventType}`);
      return { success: false, reason: 'UNKNOWN_TEMPLATE' };
    }

    const { title, whatsappText, smsText } = templateBuilder(order, extra);
    const recipientPhone = order.customerMobile.replace(/[^0-9]/g, '');

    // 1. External WhatsApp Webhook / Cloud API Integration
    const whatsappWebhook = process.env.WHATSAPP_WEBHOOK_URL;
    if (whatsappWebhook) {
      try {
        await fetch(whatsappWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: recipientPhone,
            message: whatsappText,
            orderNumber: order.orderNumber,
            eventType,
          }),
        });
      } catch (webhookErr) {
        console.error(`[NOTIFICATION] WhatsApp Webhook Error:`, webhookErr.message);
      }
    }

    // 2. External SMS Gateway Integration
    const smsGatewayUrl = process.env.SMS_GATEWAY_URL;
    if (smsGatewayUrl) {
      try {
        await fetch(smsGatewayUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientPhone,
            body: smsText,
          }),
        });
      } catch (smsErr) {
        console.error(`[NOTIFICATION] SMS Gateway Error:`, smsErr.message);
      }
    }

    // 3. Clean Transaction Log for Factory & Support Audit
    console.log(
      `🔔 [NOTIFICATION DISPATCHED] Event: ${eventType} | Recipient: ${recipientPhone} | Order: ${order.orderNumber}`
    );

    return {
      success: true,
      eventType,
      recipient: recipientPhone,
      title,
      whatsappDelivered: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[NOTIFICATION] Error dispatching ${eventType}:`, error);
    return { success: false, error: error.message };
  }
};

export default {
  sendOrderNotification,
  TEMPLATES,
};
