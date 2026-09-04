import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { TextInput, Button, Spinner, Breadcrumb, Modal, Textarea } from 'flowbite-react';
import {
  HiHome,
  HiSearch,
  HiCheckCircle,
  HiClock,
  HiOutlineTruck,
  HiOutlineEye,
  HiOutlineSparkles,
  HiOutlineDocumentDownload,
  HiOutlineDocumentText,
  HiOutlineExternalLink,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { api } from '../services/api';
import { useBusinessInfo } from '../context/BusinessInfoContext';
import Feedback from '../Components/Feedback';
import PaymentGatewayModal from '../Components/PaymentGatewayModal';

const WORKFLOW_STAGES = [
  { key: 'RECEIVED', label: '1. Order Verified', icon: '📥', desc: 'Order logged & payment checked' },
  { key: 'DESIGN', label: '2. Design & Prepress', icon: '🎨', desc: 'Artwork bleed & digital proof check' },
  { key: 'PRODUCTION', label: '3. Press Production', icon: '🖨️', desc: 'Digital / Offset machine printing' },
  { key: 'FINISHING_QC', label: '4. Finishing & QC', icon: '✂️', desc: 'Lamination, cutting & QC passed' },
  { key: 'PACKING', label: '5. Packaging Desk', icon: '📦', desc: 'Weighed, boxed & labeled' },
  { key: 'DELIVERY', label: '6. Out for Delivery', icon: '🚚', desc: 'In transit to your address' },
  { key: 'COMPLETED', label: '7. Delivered', icon: '✅', desc: 'Order delivered successfully' },
];

export default function TrackOrder() {
  const { businessInfo, getWhatsAppLink } = useBusinessInfo();
  const { orderIdentifier } = useParams();
  const [searchParams] = useSearchParams();
  const initialId = orderIdentifier || searchParams.get('id') || '';

  const [orderQuery, setOrderQuery] = useState(initialId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Proof Approval & Milestone Payment state
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofFeedback, setProofFeedback] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [balancePaymentData, setBalancePaymentData] = useState(null);

  useEffect(() => {
    if (initialId) {
      setOrderQuery(initialId);
      handleSearch(initialId);
    }
  }, [initialId]);

  const handleSearch = async (queryToSearch) => {
    const q = queryToSearch || orderQuery;
    if (!q || !q.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await api.trackOrder(q.trim());
      if (res.success && res.order) {
        setOrder(res.order);
      }
    } catch (err) {
      setError(err.message || 'No order found with the provided Order ID or Phone Number.');
    } finally {
      setLoading(false);
    }
  };

  const getStageStatus = (stageKey) => {
    if (!order) return 'upcoming';
    const dept = order.currentDepartment || 'PRODUCTION';
    const status = order.orderStatus;

    if (status === 'CANCELLED') return 'cancelled';

    const stageOrder = ['RECEIVED', 'DESIGN', 'PRODUCTION', 'FINISHING_QC', 'PACKING', 'DELIVERY', 'COMPLETED'];
    let currentStageIndex = 0;

    if (dept === 'DESIGN' || ['ARTWORK_REQUIRED', 'DESIGN_IN_PROGRESS', 'DESIGN_REVIEW'].includes(status)) {
      currentStageIndex = 1;
    } else if (dept === 'PRODUCTION' || ['PRODUCTION_QUEUE', 'PRINTING'].includes(status)) {
      currentStageIndex = 2;
    } else if (dept === 'FINISHING_QC' || ['FINISHING', 'QC'].includes(status)) {
      currentStageIndex = 3;
    } else if (dept === 'PACKING' || ['PACKED', 'READY_FOR_DELIVERY'].includes(status)) {
      currentStageIndex = 4;
    } else if (dept === 'DELIVERY' || ['OUT_FOR_DELIVERY'].includes(status)) {
      currentStageIndex = 5;
    } else if (dept === 'COMPLETED' || ['DELIVERED', 'COMPLETED'].includes(status)) {
      currentStageIndex = 6;
    }

    const thisStageIndex = stageOrder.indexOf(stageKey);
    if (currentStageIndex > thisStageIndex) return 'completed';
    if (currentStageIndex === thisStageIndex) return 'current';
    return 'upcoming';
  };

  const handleProofAction = async (action) => {
    if (!order) return;
    setIsSubmittingProof(true);
    try {
      const res = await api.approveCustomerProof(order.orderNumber, {
        action,
        customerComment: revisionNote,
      });
      if (res.success) {
        if (res.requiresBalancePayment) {
          // Open Payment Gateway for Stage 2 Printing Balance!
          setProofModalOpen(false);
          setBalancePaymentData({
            orderNumber: order.orderNumber,
            amount: res.balanceDue,
            paymentStage: 'BALANCE',
            customer: {
              name: order.customerName,
              email: order.customerEmail,
              mobile: order.customerMobile,
            },
          });
          setPaymentModalOpen(true);
        } else {
          setProofFeedback(res.message);
          setProofModalOpen(false);
          handleSearch(order.orderNumber);
        }
      } else {
        alert(res.message || 'Proof action failed');
      }
    } catch (err) {
      alert(err.message || 'Failed to submit proof action');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb className="text-xs mb-4">
        <Breadcrumb.Item icon={HiHome}>
          <Link to="/" className="hover:underline text-gray-700">Home</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Live Order Tracking</Breadcrumb.Item>
      </Breadcrumb>

      <div className="text-center max-w-xl mx-auto mb-8">
        <span className="text-[11px] font-black uppercase tracking-wider text-yellow-800 bg-yellow-100 px-3 py-1 rounded-full">
          LIVE WORKFLOW TRACKER
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mt-2">
          Track Your Print Job
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Enter your Order Number (e.g. <strong className="text-black">PB-ORD-2026-000001</strong>) or Registered Mobile Number.
        </p>

        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="mt-6 flex gap-2"
        >
          <TextInput
            type="text"
            placeholder="Enter Order ID or Mobile Number"
            value={orderQuery}
            onChange={(e) => setOrderQuery(e.target.value)}
            className="flex-1"
            size="md"
            required
          />
          <Button
            type="submit"
            color="dark"
            disabled={loading}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold px-6"
          >
            {loading ? <Spinner size="sm" /> : <HiSearch className="w-5 h-5 mr-1" />}
            Track
          </Button>
        </form>
      </div>

      {error && (
        <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center text-xs font-semibold">
          {error}
        </div>
      )}

      {proofFeedback && (
        <div className="max-w-2xl mx-auto mb-8 bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-center text-xs font-semibold">
          ✔ {proofFeedback}
        </div>
      )}

      {order && (
        <div className="bg-white border rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
          {/* Order Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-gray-900">{order.orderNumber}</h2>
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                  {order.currentDepartment || 'PRODUCTION'} DEPT
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })} by{' '}
                <strong className="text-gray-800">{order.customerName}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] uppercase tracking-wider text-gray-400 block font-bold">
                Current Status
              </span>
              <span className="text-lg font-black text-red-600 uppercase tracking-wide">
                {order.orderStatus?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Master Order & Linked Tracking Identifiers */}
          <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-700 gap-3">
              <div>
                <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-wider block">Unified Order Tracking System</span>
                <span className="text-sm font-bold text-gray-200">Single Source of Truth across Operations</span>
              </div>
              <Link
                to={`/invoice/${order.orderNumber}`}
                target="_blank"
                className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <HiOutlineDocumentText className="w-4 h-4" /> View & Print Tax Invoice
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Master Order</span>
                <span className="font-mono font-bold text-yellow-400">{order.orderNumber}</span>
              </div>

              {order.designOrders && order.designOrders.length > 0 && (
                <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Design Job</span>
                  <span className="font-mono font-bold text-purple-400">{order.designOrders[0].designJobNumber}</span>
                </div>
              )}

              {order.productionJobs && order.productionJobs.length > 0 && (
                <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Production Job Card</span>
                  <span className="font-mono font-bold text-blue-400">{order.productionJobs[0].jobNumber}</span>
                </div>
              )}

              {order.shipments && order.shipments.length > 0 && (
                <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Shipment / Dispatch</span>
                  <span className="font-mono font-bold text-green-400">{order.shipments[0].shipmentNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Intelligence & Fulfillment Card */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 text-xs text-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="inline-block font-extrabold text-xs uppercase px-2.5 py-1 rounded bg-amber-200 text-amber-950 mb-2">
                  {order.deliveryMethod === 'STORE_PICKUP' ? '🏪 Direct Store Self-Pickup' : '🚚 Doorstep Courier Delivery'}
                </span>
                <h4 className="font-bold text-gray-900 text-sm">
                  {order.deliveryMethod === 'STORE_PICKUP'
                    ? (businessInfo?.address?.pressFacilityAddress || 'Print Bazzar Press Unit, No. 42 Big Bazzar Street, Singarathope, Trichy - 620008')
                    : `Delivering to: ${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''} - ${order.shippingAddress?.pincode || ''}`}
                </h4>
                {order.deliveryMethod === 'STORE_PICKUP' && order.pickupReadyAt && (
                  <p className="text-green-700 font-bold mt-1">
                    🟢 Ready for Pickup! You can visit our store to collect your order.
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right bg-white p-3 rounded-lg border border-amber-200 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Estimated Delivery / Collection</span>
                <span className="font-black text-sm text-gray-900">
                  {order.estimatedDeliveryDate
                    ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '2-4 Business Days'}
                </span>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Track on {order.courierPartner || 'Courier'} <HiOutlineExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Digital Proof Approval Alert if Proof is Uploaded */}
          {order.proofFileUrl && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 text-purple-900">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-black text-sm flex items-center gap-2">
                    <HiOutlineSparkles className="w-5 h-5 text-purple-600" /> Digital Proof Ready for Your Approval!
                  </h3>
                  <p className="text-xs text-purple-700 mt-1">
                    Our design team has uploaded your custom proof. Please inspect the layout and confirm to begin printing.
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={order.proofFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-white border border-purple-300 hover:bg-purple-100 text-purple-900 font-bold px-3 py-1.5 rounded-lg text-xs"
                  >
                    <HiOutlineEye className="w-4 h-4" /> View Proof
                  </a>
                  {order.proofStatus !== 'APPROVED' && (
                    <Button
                      size="xs"
                      onClick={() => setProofModalOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      Approve / Request Revision
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Visual Progress Stepper (7 Stages) */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">
              Department Workflow Progression
            </h3>

            {/* Mobile Vertical Connected Stepper */}
            <div className="sm:hidden relative border-l-2 border-yellow-300 ml-4 pl-4 space-y-3">
              {WORKFLOW_STAGES.map((step, idx) => {
                const status = getStageStatus(step.key);
                return (
                  <div key={step.key} className="relative pb-1">
                    <div
                      className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-black ${
                        status === 'completed'
                          ? 'bg-green-600 text-white'
                          : status === 'current'
                          ? 'bg-yellow-400 text-black ring-2 ring-yellow-400/50'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {status === 'completed' ? '✓' : idx + 1}
                    </div>
                    <div
                      className={`p-3 rounded-xl border text-left transition-all ${
                        status === 'completed'
                          ? 'bg-green-50/70 border-green-200 text-green-950'
                          : status === 'current'
                          ? 'bg-yellow-100/90 border-yellow-400 text-black font-extrabold shadow-sm ring-2 ring-yellow-400/40'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl flex-shrink-0">{step.icon}</span>
                        <div>
                          <h4 className="text-xs font-black">{step.label}</h4>
                          <span className={`text-[10px] uppercase font-extrabold ${
                            status === 'completed' ? 'text-green-700' : status === 'current' ? 'text-amber-800' : 'text-gray-400'
                          }`}>
                            {status === 'completed' ? '✔ Completed' : status === 'current' ? '● In Progress' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] mt-1.5 text-gray-600 leading-snug">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop Horizontal Stepper Grid */}
            <div className="hidden sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {WORKFLOW_STAGES.map((step) => {
                const status = getStageStatus(step.key);
                return (
                  <div
                    key={step.key}
                    className={`p-3 rounded-xl border text-center flex flex-col justify-between transition-all ${
                      status === 'completed'
                        ? 'bg-green-50 border-green-300 text-green-900'
                        : status === 'current'
                        ? 'bg-yellow-100 border-yellow-400 text-black font-extrabold shadow-sm scale-105 ring-2 ring-yellow-400/50'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    <div>
                      <div className="text-xl mb-1">{step.icon}</div>
                      <h4 className="text-xs font-bold leading-tight">{step.label}</h4>
                    </div>
                    <p className="text-[10px] mt-2 leading-snug opacity-80">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tracking History Changelog */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">
                Live Status Updates & Notes
              </h3>
              <div className="space-y-4 border-l-2 border-yellow-400 ml-4 pl-4">
                {order.statusHistory.map((hist) => (
                  <div key={hist.id} className="relative">
                    <div className="absolute -left-[23px] top-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                    <p className="text-xs font-bold text-gray-900">
                      {hist.newStatus?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">{hist.note}</p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      {new Date(hist.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ordered Products Snapshot */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
              Ordered Products ({order.items?.length || 0})
            </h3>
            <div className="divide-y text-xs">
              {order.items?.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-900">{item.productNameSnapshot || item.name}</h4>
                    <p className="text-gray-500 text-[11px]">
                      Quantity: <strong className="text-gray-800">{item.quantity} pieces</strong> | SKU: {item.skuSnapshot || item.sku}
                    </p>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">₹{item.totalPriceSnapshot || item.totalPrice}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-3 border-t mt-3 text-sm font-bold">
              <span>Total Paid / Payable:</span>
              <span className="text-red-600 text-xl font-black">₹{order.grandTotal}</span>
            </div>
          </div>

          {/* Direct Help Button */}
          <div className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">
              Need assistance regarding this order? Our team is active {businessInfo?.operatingHours?.weekdays || 'Mon-Sat 9:30 AM - 8:30 PM'}.
            </p>
            <a
              href={getWhatsAppLink(`Hello ${businessInfo?.brand?.brandName || 'Print Bazzar'} team, I would like to check on my order ${order.orderNumber}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl text-xs"
            >
              <FaWhatsapp className="w-4 h-4" /> WhatsApp Order Support
            </a>
          </div>
        </div>
      )}

      {/* Customer Proof Modal */}
      <Modal show={proofModalOpen} onClose={() => setProofModalOpen(false)}>
        <Modal.Header>Digital Proof Inspection & Approval</Modal.Header>
        <Modal.Body className="space-y-4 text-xs">
          <p className="text-gray-600">
            Please verify all spelling, phone numbers, colors, and layout in your digital proof. Approving will automatically send the job to the Printing Press.
          </p>
          <div>
            <label className="font-bold text-gray-700 block mb-1">Feedback / Revision Note (Optional)</label>
            <Textarea
              rows="3"
              placeholder="If you need changes, describe them clearly here (e.g. Change address font size)..."
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              className="text-xs"
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="flex justify-between">
          <Button
            color="failure"
            size="xs"
            disabled={isSubmittingProof}
            onClick={() => handleProofAction('REVISION_REQUESTED')}
          >
            Request Changes
          </Button>
          <Button
            color="success"
            size="xs"
            disabled={isSubmittingProof}
            onClick={() => handleProofAction('APPROVED')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            {order?.paymentStatus === 'PARTIALLY_PAID'
              ? `✔ Approve Proof & Pay Balance (₹${order?.invoices?.[0]?.balanceDue || Math.max(0, order?.grandTotal - (order?.items?.reduce((s, i) => s + (i.designCharge || 0), 0)))})`
              : '✔ Approve Proof & Start Printing'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Payment Gateway Modal (Stage 2 Balance Payment) */}
      {balancePaymentData && (
        <PaymentGatewayModal
          show={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          orderNumber={balancePaymentData.orderNumber}
          amount={balancePaymentData.amount}
          paymentStage="BALANCE"
          customer={balancePaymentData.customer}
          onSuccess={(verifyRes) => {
            setPaymentModalOpen(false);
            setProofFeedback('Printing balance payment verified! Your order has been released to Press Production.');
            handleSearch(balancePaymentData.orderNumber);
          }}
        />
      )}

      <div className="mt-12">
        <Feedback />
      </div>
    </div>
  );
}
