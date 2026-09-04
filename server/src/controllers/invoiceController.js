import { PrismaClient } from '@prisma/client';
import { getStoredBusinessInfo } from './businessInfoController.js';

const prisma = new PrismaClient();

export async function getSellerDetails() {
  try {
    const biz = await getStoredBusinessInfo();
    return {
      companyName: biz.brand?.legalName || biz.brand?.brandName || 'Print Bazzar',
      tradeName: biz.brand?.brandName || 'Print Bazzar',
      address: biz.address?.fullDisplayAddress || '12 A, Allimal Street, Big Bazzar St, Singarathope, Tiruchirapalli, Tamil Nadu - 620008',
      gstin: biz.tax?.gstin || '33AAAAA0000A1Z5',
      email: biz.contact?.supportEmail || 'printbazzar.online@gmail.com',
      phone: biz.contact?.primaryPhone || '+91 96290 98565',
      website: 'https://printbazzar.online',
      pan: biz.tax?.pan || '',
      stateCode: biz.tax?.stateCode || '33',
    };
  } catch (err) {
    return {
      companyName: 'Print Bazzar',
      tradeName: 'Print Bazzar Digital Printing Solutions',
      address: '12 A, Allimal Street, Big Bazzar St, Singarathope, Tiruchirapalli, Tamil Nadu - 620008',
      gstin: '33AAAAA0000A1Z5',
      email: 'printbazzar.online@gmail.com',
      phone: '+91 96290 98565',
      website: 'https://printbazzar.online',
      pan: '',
    };
  }
}

// GET /api/v1/orders/:orderId/invoice - Get or generate printable invoice
export const getOrderInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true, category: { select: { name: true } } } },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        payments: true,
        shipments: { take: 1 },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Ownership & Authorization Check
    const isAdmin = !!req.user;
    const isCustomer = !!req.customer;

    if (isAdmin) {
      const hasPerm = req.user.role === 'Super Admin' || req.user.permissions?.includes('ORDER_VIEW');
      if (!hasPerm) {
        return res.status(403).json({ success: false, message: 'Forbidden: You lack permission to view this invoice.' });
      }
    } else if (isCustomer && order.customerId) {
      const isOwner = order.customerId === req.customer.id;
      const isPhoneMatch = order.customerMobile && req.customer.mobile && order.customerMobile.trim() === req.customer.mobile.trim();
      const isEmailMatch = order.customerEmail && req.customer.email && order.customerEmail.trim().toLowerCase() === req.customer.email.trim().toLowerCase();
      if (!isOwner && !isPhoneMatch && !isEmailMatch) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to access this invoice.' });
      }
    }
    // Guest orders or customers navigating via direct receipt / order confirmation link with valid orderNumber or UUID are permitted to view and print their invoice

    const sellerDetails = await getSellerDetails();
    let invoice = order.invoices?.[0];

    // If invoice record doesn't exist yet, generate it on the fly
    if (!invoice) {
      const year = new Date().getFullYear();
      const count = await prisma.invoice.count();
      const invoiceNumber = `PB-INV-${year}-${String(count + 1).padStart(5, '0')}`;
      const shippingAddr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress || '{}') : order.shippingAddress || {};

      invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          invoiceType: 'ORDER_RECEIPT',
          companyDetailsJson: JSON.stringify(sellerDetails),
          billToSnapshotJson: JSON.stringify({
            name: order.customerName,
            email: order.customerEmail,
            mobile: order.customerMobile,
            gstin: order.gstNumber || null,
            address: shippingAddr,
          }),
          shipToSnapshotJson: JSON.stringify({
            deliveryMethod: order.deliveryMethod || 'COURIER',
            address: shippingAddr,
          }),
          itemsSnapshotJson: JSON.stringify(
            order.items.map((i) => ({
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
          subtotal: order.subtotal,
          taxableAmount: order.subtotal,
          cgst: order.cgstAmount,
          sgst: order.sgstAmount,
          igst: order.igstAmount,
          totalTax: order.totalTax,
          shippingCharge: order.shippingCharge,
          grandTotal: order.grandTotal,
          amountPaid: order.grandTotal,
          balanceDue: 0,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.payments?.[0]?.paymentMethod || 'UPI',
          transactionReference: order.payments?.[0]?.transactionId || null,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        invoice,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          deliveryMethod: order.deliveryMethod,
          shippingAddress: typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress || '{}') : order.shippingAddress,
          items: order.items,
        },
        company: sellerDetails,
      },
    });
  } catch (error) {
    console.error('getOrderInvoice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve invoice.' });
  }
};

// POST /api/v1/admin/orders/:orderId/generate-tax-invoice - Convert to official GST Tax Invoice
export const generateTaxInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'No invoice record found for this order.' });
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        invoiceType: 'TAX_INVOICE',
      },
    });

    return res.json({
      success: true,
      message: 'Tax invoice generated successfully!',
      invoice: updated,
    });
  } catch (error) {
    console.error('generateTaxInvoice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate tax invoice.' });
  }
};
