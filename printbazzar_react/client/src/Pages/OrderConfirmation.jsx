import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Button, Spinner } from 'flowbite-react';
import {
  HiCheckCircle,
  HiOutlinePrinter,
  HiOutlineTruck,
  HiArrowRight,
  HiShoppingBag,
  HiOutlineClipboardCopy,
  HiOutlinePhone,
  HiOutlineLocationMarker,
  HiOutlineClock,
  HiOutlineCheck,
  HiOutlineColorSwatch,
  HiOutlineDocumentText,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { api } from '../services/api';
import { useBusinessInfo } from '../context/BusinessInfoContext';
import { fireCelebrationPopper } from '../utils/confettiPopper';

export default function OrderConfirmation() {
  const { businessInfo, getWhatsAppLink, getPhoneLink } = useBusinessInfo();
  const { orderNumber } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [copied, setCopied] = useState(false);
  const hasCelebrated = useRef(false);

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

  // Trigger celebration popper after order confirmed
  useEffect(() => {
    if (order && !hasCelebrated.current) {
      const isConfirmed =
        order.paymentStatus === 'CONFIRMED' ||
        order.paymentStatus === 'PAID' ||
        order.orderStatus === 'CONFIRMED' ||
        order.orderStatus === 'PRODUCTION_QUEUE' ||
        order.orderStatus === 'Processing' ||
        order.orderStatus === 'PROCESSING';

      if (isConfirmed) {
        hasCelebrated.current = true;
        setTimeout(() => {
          fireCelebrationPopper();
        }, 150);
      }
    }
  }, [order]);

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-700 font-bold text-sm">Retrieving your order confirmation...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          🔍
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Order Not Found</h2>
        <p className="text-gray-500 text-sm mb-6">Could not load details for order {orderNumber}.</p>
        <Button as={Link} to="/" className="mx-auto bg-yellow-400 hover:bg-yellow-500 text-black font-black border-none">
          Return to Storefront
        </Button>
      </div>
    );
  }

  const shippingAddr =
    typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress || '{}')
      : order.shippingAddress || {};

  const handleSendWhatsApp = () => {
    const brandName = businessInfo.brand?.brandName || 'Print Bazzar';
    const message = `Hello ${brandName} Team! 🖨️\nI have placed an order on your website.\n\n*Order Number:* ${order.orderNumber}\n*Customer:* ${order.customerName}\n*Mobile:* ${order.customerMobile}\n*Total Amount:* ₹${order.grandTotal}\n\nPlease confirm my order. Thank you!`;
    const url = getWhatsAppLink(message);
    window.open(url, '_blank');
  };

  // Timeline Tracker Steps Computation
  const currentStatus = (order.orderStatus || 'CONFIRMED').toUpperCase();
  const isPickup = order.deliveryMethod === 'STORE_PICKUP';

  const steps = [
    {
      id: 1,
      title: 'Order Confirmed',
      desc: 'Payment logged & verified',
      icon: HiCheckCircle,
      isDone: true,
      isCurrent: currentStatus === 'CONFIRMED' || currentStatus === 'PROCESSING',
    },
    {
      id: 2,
      title: 'Artwork & Preflight',
      desc: 'Proof inspection & layout',
      icon: HiOutlineColorSwatch,
      isDone: ['PRODUCTION_QUEUE', 'PRINTING', 'READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED'].includes(currentStatus),
      isCurrent: currentStatus === 'PRODUCTION_QUEUE',
    },
    {
      id: 3,
      title: 'Ready to Print',
      desc: 'Digital offset press queue',
      icon: HiOutlineDocumentText,
      isDone: ['PRINTING', 'READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED'].includes(currentStatus),
      isCurrent: currentStatus === 'PRINTING',
    },
    {
      id: 4,
      title: isPickup ? 'Ready for Pickup' : 'Dispatched',
      desc: isPickup ? 'Trichy Press Facility' : 'Doorstep courier transit',
      icon: HiOutlineTruck,
      isDone: ['SHIPPED', 'DELIVERED'].includes(currentStatus),
      isCurrent: currentStatus === 'SHIPPED' || currentStatus === 'READY_FOR_DISPATCH',
    },
    {
      id: 5,
      title: 'Delivered',
      desc: 'Completed order',
      icon: HiOutlineCheck,
      isDone: currentStatus === 'DELIVERED',
      isCurrent: currentStatus === 'DELIVERED',
    },
  ];

  const primaryPhone = businessInfo.contact?.primaryPhone || '+91 96290 98565';
  const streetShort = businessInfo.address?.street?.split('/')[0]?.trim() || 'Big Bazzar St';
  const city = businessInfo.address?.city || 'Trichy';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* 1. HERO CELEBRATION BANNER */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-10 text-center mb-8 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-1 bg-yellow-400"></div>

        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-400 text-black rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
          <HiCheckCircle className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        <span className="text-[11px] uppercase font-black tracking-widest text-black bg-yellow-400/30 px-3 py-1 rounded-md inline-block mb-2">
          ORDER CONFIRMED & LOGGED
        </span>

        <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Thank You, {order.customerName}!
        </h1>

        <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto mt-2">
          Your custom printing order has been received and scheduled for production at our Trichy press facility.
        </p>

        {/* Highlighted Order Number Pill with Copy Button */}
        <div className="mt-6 inline-flex items-center gap-3 bg-black text-white px-5 py-3 rounded-2xl shadow-sm border border-gray-800">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-yellow-400 font-bold block text-left">
              Order Reference
            </span>
            <span className="text-lg sm:text-xl font-black tracking-wide">
              {order.orderNumber}
            </span>
          </div>
          <button
            onClick={copyOrderNumber}
            className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-yellow-400"
            title="Copy Order Number"
          >
            {copied ? (
              <span className="text-[10px] font-bold text-green-400">Copied!</span>
            ) : (
              <HiOutlineClipboardCopy className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. TIMELINE PROGRESS TRACKER */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 mb-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900">
              Live Production & Delivery Timeline
            </h2>
            <p className="text-xs text-gray-500">
              Track the journey of your prints from press setup to delivery.
            </p>
          </div>
          {order.estimatedDeliveryDate && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Est. Delivery</span>
              <span className="text-xs sm:text-sm font-black text-black">
                {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Stepper Steps (Horizontal on Desktop, Stacked on Mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex sm:flex-col items-center sm:items-center text-left sm:text-center relative">
                {/* Connecting Line (Desktop) */}
                {idx < steps.length - 1 && (
                  <div
                    className={`hidden sm:block absolute top-5 left-1/2 w-full h-1 -z-0 transition-colors ${
                      step.isDone ? 'bg-yellow-400' : 'bg-gray-200'
                    }`}
                  ></div>
                )}

                {/* Circle Icon Badge */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold relative z-10 transition-all shadow-xs mr-3 sm:mr-0 mb-0 sm:mb-2.5 flex-shrink-0 ${
                    step.isDone
                      ? 'bg-yellow-400 text-black ring-4 ring-yellow-400/20'
                      : step.isCurrent
                      ? 'bg-black text-yellow-400 ring-4 ring-black/20 animate-pulse'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Label & Description */}
                <div>
                  <h4
                    className={`text-xs font-black leading-tight ${
                      step.isDone || step.isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. ORDER DETAILS SUMMARY BOX & FINANCIAL RECEIPT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column: Purchased Items (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">
                Purchased Print Items
              </h3>
              <p className="text-xs text-gray-500">
                {order.items?.length || 1} custom product specifications
              </p>
            </div>
            <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-yellow-100 text-yellow-900 border border-yellow-300">
              {order.orderStatus?.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Items List */}
          <div className="divide-y divide-gray-100">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-black text-gray-900 text-sm sm:text-base">
                    {item.name || item.productNameSnapshot}
                  </h4>
                  <p className="text-xs text-gray-600 font-medium">
                    Quantity: <strong className="text-black">{item.quantity} units</strong> | SKU: {item.sku || item.skuSnapshot || 'PB-ITEM'}
                  </p>

                  {/* Confirmed Custom Specifications Badges */}
                  {item.customerSpecifications && item.customerSpecifications.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.customerSpecifications.map((spec, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center text-[11px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md border border-gray-200 font-medium"
                        >
                          <strong className="mr-1 text-black font-black">{spec.label}:</strong> {spec.value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Graphic Design Service Add-on */}
                  {item.designRequired && (
                    <div className="inline-flex items-center gap-1 text-[11px] bg-yellow-50 text-yellow-900 font-bold px-2.5 py-0.5 rounded-md border border-yellow-200 mt-1">
                      <span>🎨 Design Service: {item.designPackageName || 'Graphic Proofing Included'}</span>
                    </div>
                  )}
                </div>

                <span className="font-black text-gray-900 text-base sm:text-lg flex-shrink-0">
                  ₹{item.totalPrice || item.totalPriceSnapshot}
                </span>
              </div>
            ))}
          </div>

          {/* Delivery & Customer Info Card */}
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <h5 className="font-black text-gray-900 mb-1.5 uppercase tracking-wider text-[11px]">
                Fulfillment Method
              </h5>
              <span className="inline-block font-bold text-xs px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-900 border border-yellow-300 mb-2">
                {isPickup ? '🏪 Direct Store Self-Pickup' : '🚚 Doorstep Courier Delivery'}
              </span>

              {isPickup ? (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-gray-700">
                  <p className="font-black text-black">{businessInfo.brand?.brandName || 'Print Bazzar'} Press Unit:</p>
                  <p className="mt-0.5">{businessInfo.address?.pressFacilityAddress || 'No. 42, Big Bazzar Street, Singarathope, Tiruchirappalli - 620008'}</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-gray-700 leading-relaxed">
                  <p className="font-bold text-black">{order.customerName}</p>
                  <p>{shippingAddr.street}</p>
                  <p>{shippingAddr.city}, {shippingAddr.state} - {shippingAddr.pincode}</p>
                  {shippingAddr.landmark && <p className="text-gray-500 mt-0.5">Landmark: {shippingAddr.landmark}</p>}
                </div>
              )}
            </div>

            <div>
              <h5 className="font-black text-gray-900 mb-1.5 uppercase tracking-wider text-[11px]">
                Customer Contact
              </h5>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-gray-700 space-y-1">
                <p><span className="text-gray-400 font-semibold">Name:</span> <strong className="text-black">{order.customerName}</strong></p>
                <p><span className="text-gray-400 font-semibold">Phone:</span> <strong className="text-black">+91 {order.customerMobile}</strong></p>
                <p><span className="text-gray-400 font-semibold">Email:</span> {order.customerEmail || 'Provided via form'}</p>
                <p><span className="text-gray-400 font-semibold">Payment:</span> <span className="text-green-600 font-black">{order.paymentStatus}</span> ({order.paymentMethod || 'Online'})</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Summary Receipt Box */}
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-gray-900 pb-4 border-b border-gray-100 mb-4">
              Payment Summary
            </h3>

            <div className="space-y-3 text-xs sm:text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-bold text-gray-900">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping & Handling:</span>
                <span className="font-bold text-gray-900">
                  {order.shippingCharge === 0 ? (
                    <span className="text-green-600 font-black bg-green-50 px-2 py-0.5 rounded">FREE</span>
                  ) : (
                    `₹${order.shippingCharge}`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST (18% included):</span>
                <span className="font-bold text-gray-900">₹{order.totalTax}</span>
              </div>

              {/* Highlighted Total Box in Yellow/Black */}
              <div className="mt-4 pt-4 border-t border-gray-200 bg-yellow-400/20 border border-yellow-400 p-4 rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-gray-900">Total Amount Paid</span>
                  <span className="text-2xl font-black text-black">₹{order.grandTotal}</span>
                </div>
                <span className="text-[10px] text-gray-600 block mt-1">
                  Includes all printing, finishing, and government taxes.
                </span>
              </div>
            </div>
          </div>

          {/* Quick Invoice & Print Button */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              to={`/invoice/${order.orderNumber}`}
              target="_blank"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-black transition-colors"
            >
              <HiOutlinePrinter className="w-4 h-4 text-gray-600" />
              <span>Download Official Tax Invoice</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. ORGANIZED SHOP INFORMATION SECTION */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-yellow-800 bg-yellow-100 px-2.5 py-0.5 rounded-md inline-block mb-1">
              TRICHY PRODUCTION DESK
            </span>
            <h3 className="text-lg font-black text-gray-900">
              Print Bazzar Industrial Facility & Support
            </h3>
            <p className="text-xs text-gray-500">
              Need assistance or artwork revisions? Our printing specialists are on standby.
            </p>
          </div>

          {/* Direct WhatsApp Confirmation Button */}
          <button
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-sm transition-transform active:scale-95"
          >
            <FaWhatsapp className="w-4 h-4" />
            <span>Confirm Order on WhatsApp</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-xs text-gray-600">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-yellow-100 text-black rounded-xl flex items-center justify-center flex-shrink-0">
              <HiOutlineLocationMarker className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h5 className="font-black text-gray-900 mb-0.5">Press Facility</h5>
              <p>{businessInfo.address?.pressFacilityAddress || `${streetShort}, Singarathope, ${city} - 620008`}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-yellow-100 text-black rounded-xl flex items-center justify-center flex-shrink-0">
              <HiOutlinePhone className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h5 className="font-black text-gray-900 mb-0.5">Helpline Support</h5>
              <p><a href={getPhoneLink()} className="text-black font-bold hover:underline">{primaryPhone}</a></p>
              <p className="text-[11px] text-gray-400">Direct call to production manager</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-yellow-100 text-black rounded-xl flex items-center justify-center flex-shrink-0">
              <HiOutlineClock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h5 className="font-black text-gray-900 mb-0.5">Operating Hours</h5>
              <p>Mon – Sat: 9:30 AM – 8:30 PM</p>
              <p className="text-[11px] text-gray-400">Sunday: 10:00 AM – 2:00 PM</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ACTION BUTTONS STRIP */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center print:hidden">
        <Link
          to="/shop"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-black text-xs rounded-2xl transition-colors shadow-xs"
        >
          <HiShoppingBag className="w-4 h-4 text-gray-500" />
          <span>Continue Shopping</span>
        </Link>

        <Link
          to={`/track-order/${order.orderNumber}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 bg-black hover:bg-yellow-400 hover:text-black text-white font-black text-xs rounded-2xl transition-all shadow-md active:scale-95"
        >
          <HiOutlineTruck className="w-4 h-4" />
          <span>Live Order Tracking</span>
          <HiArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}
