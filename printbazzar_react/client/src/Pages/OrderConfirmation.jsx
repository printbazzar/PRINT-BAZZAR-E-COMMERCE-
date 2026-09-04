import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Button, Spinner } from 'flowbite-react';
import { HiCheckCircle, HiOutlinePrinter, HiOutlineTruck, HiArrowRight } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { api } from '../services/api';
import { useBusinessInfo } from '../context/BusinessInfoContext';

export default function OrderConfirmation() {
  const { businessInfo, getWhatsAppLink } = useBusinessInfo();
  const { orderNumber } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (!order && orderNumber) {
      api
        .trackOrder(orderNumber)
        .then((res) => {
          if (res.success && res.order) {
            setOrder(res.order);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-600 font-medium">Retrieving order confirmation...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
        <p className="text-gray-600 mb-6">Could not load details for order {orderNumber}.</p>
        <Button as={Link} to="/" color="dark" className="mx-auto">
          Return Home
        </Button>
      </div>
    );
  }

  const shippingAddr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress || '{}') : order.shippingAddress || {};

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const brandName = businessInfo.brand?.brandName || 'Print Bazzar';
    const message = `Hello ${brandName} Team! 🖨️\nI have placed an order on your website.\n\n*Order Number:* ${order.orderNumber}\n*Customer:* ${order.customerName}\n*Mobile:* ${order.customerMobile}\n*Total Amount:* ₹${order.grandTotal}\n\nPlease confirm my order. Thank you!`;
    const url = getWhatsAppLink(message);
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Confirmation Header */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mb-8 shadow-sm">
        <HiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Order Confirmed!</h1>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          Thank you, <span className="font-semibold text-gray-900">{order.customerName}</span>. Your printing order has been received and logged in our system.
        </p>

        <div className="mt-6 inline-block bg-white border border-green-300 px-6 py-3 rounded-xl shadow-xs">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Your Order Number</p>
          <p className="text-2xl font-black text-gray-900 tracking-wide mt-0.5">{order.orderNumber}</p>
        </div>
      </div>

      {/* Order Details Receipt Card */}
      <div className="bg-white border rounded-2xl p-6 sm:p-8 shadow-sm print:border-none print:shadow-none">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
            <p className="text-xs text-gray-500 mt-1">
              Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
              Status: {order.orderStatus?.replace(/_/g, ' ')}
            </span>
            <span className="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              Payment: {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Ordered Items List */}
        <div className="divide-y my-6">
          {order.items?.map((item, idx) => (
            <div key={idx} className="py-4 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{item.name || item.productNameSnapshot}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  SKU: {item.sku || item.skuSnapshot} | Quantity: <span className="font-semibold text-gray-800">{item.quantity} pieces</span>
                </p>
                {item.designRequired && (
                  <span className="inline-block text-[11px] bg-yellow-50 text-yellow-700 font-medium px-2 py-0.5 rounded mt-1">
                    Design Service Requested
                  </span>
                )}
              </div>
              <span className="font-bold text-gray-900 text-lg">₹{item.totalPrice || item.totalPriceSnapshot}</span>
            </div>
          ))}
        </div>

        {/* Financial Breakdown */}
        <div className="bg-gray-50 rounded-xl p-5 border space-y-2 text-sm text-gray-600 mb-6">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-semibold text-gray-900">₹{order.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery:</span>
            <span className="font-semibold text-gray-900">
              {order.shippingCharge === 0 ? <span className="text-green-600">FREE</span> : `₹${order.shippingCharge}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>GST (18% included):</span>
            <span className="font-semibold text-gray-900">₹{order.totalTax}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
            <span>Total Paid / Payable:</span>
            <span className="text-2xl font-black text-red-600">₹{order.grandTotal}</span>
          </div>
        </div>

        {/* Delivery Method & Address Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t text-sm">
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Fulfillment & Delivery</h4>
            <div className="mb-2">
              <span className="font-bold text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                {order.deliveryMethod === 'STORE_PICKUP' ? '🏪 Direct Store Self-Pickup' : '🚚 Doorstep Courier Delivery'}
              </span>
            </div>
            {order.deliveryMethod === 'STORE_PICKUP' ? (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
                <p className="font-bold">{businessInfo.address?.city || 'Trichy'} Press Facility:</p>
                <p>{businessInfo.address?.pressFacilityAddress || businessInfo.address?.fullDisplayAddress || 'No. 42, Big Bazzar Street, Singarathope, Tiruchirappalli - 620008'}</p>
                <p className="text-[11px] text-amber-700 mt-1">Free Store Pickup. We will message you when ready.</p>
              </div>
            ) : (
              <p className="text-gray-600 leading-relaxed text-xs">
                {shippingAddr.street} <br />
                {shippingAddr.city}, {shippingAddr.state} - {shippingAddr.pincode} <br />
                {shippingAddr.landmark && <span>Landmark: {shippingAddr.landmark}</span>}
              </p>
            )}
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2">Customer Contact</h4>
            <p className="text-gray-600 text-xs leading-relaxed">
              Name: <span className="font-semibold text-gray-900">{order.customerName}</span> <br />
              Phone: <span className="font-semibold text-gray-900">{order.customerMobile}</span> <br />
              Email: {order.customerEmail || 'N/A'} <br />
              Payment: <span className="font-semibold text-gray-900">{order.paymentStatus}</span> ({order.paymentMethod || 'UPI'})
            </p>
          </div>
        </div>

        {/* Linked Operations Identifiers */}
        <div className="mt-6 pt-4 border-t bg-slate-900 text-white p-4 rounded-xl text-xs">
          <p className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-wider mb-2">Unified Order Tracking Hierarchy</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
            <div className="bg-slate-800 p-2 rounded">
              <span className="text-[10px] text-gray-400 block font-sans">Order ID:</span>
              <span className="text-yellow-400 font-bold">{order.orderNumber}</span>
            </div>
            {order.productionJobs?.[0] && (
              <div className="bg-slate-800 p-2 rounded">
                <span className="text-[10px] text-gray-400 block font-sans">Job Card:</span>
                <span className="text-blue-400 font-bold">{order.productionJobs[0].jobNumber}</span>
              </div>
            )}
            {order.invoices?.[0] && (
              <div className="bg-slate-800 p-2 rounded">
                <span className="text-[10px] text-gray-400 block font-sans">Invoice:</span>
                <span className="text-green-400 font-bold">{order.invoices[0].invoiceNumber}</span>
              </div>
            )}
            {order.shipments?.[0] && (
              <div className="bg-slate-800 p-2 rounded">
                <span className="text-[10px] text-gray-400 block font-sans">Shipment:</span>
                <span className="text-purple-400 font-bold">{order.shipments[0].shipmentNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center print:hidden">
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Button
            as={Link}
            to={`/invoice/${order.orderNumber}`}
            target="_blank"
            color="light"
            className="flex items-center gap-2 text-gray-800 font-bold w-full sm:w-auto justify-center border-gray-300"
          >
            <HiOutlinePrinter className="w-5 h-5 mr-1 text-gray-600" /> View Tax Invoice
          </Button>
          <Button
            color="success"
            onClick={handleSendWhatsApp}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <FaWhatsapp className="w-5 h-5 mr-1" /> WhatsApp Confirmation
          </Button>
        </div>

        <Button
          as={Link}
          to={`/track-order/${order.orderNumber}`}
          color="dark"
          className="bg-black hover:bg-yellow-400 hover:text-black font-bold w-full sm:w-auto justify-center"
        >
          <HiOutlineTruck className="w-5 h-5 mr-2" /> Live Order Tracking <HiArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
