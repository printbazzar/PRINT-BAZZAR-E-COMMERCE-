import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Select, TextInput, Textarea, Spinner, Modal } from 'flowbite-react';
import {
  HiArrowLeft,
  HiOutlineDownload,
  HiOutlinePrinter,
  HiOutlineClock,
  HiCheckCircle,
  HiOutlineUser,
  HiOutlineLocationMarker,
  HiOutlineTruck,
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineExclamationCircle,
  HiOutlineExternalLink,
  HiOutlineTag,
} from 'react-icons/hi';
import { api } from '../services/api';
import ShippingLabelModal from '../Components/ShippingLabelModal';
import JobCardModal from '../Components/JobCardModal';
import PreProductionQCModal from '../Components/PreProductionQCModal';
import OrderSourceBadge from '../Components/OrderSourceBadge';
import { useBusinessInfo } from '../context/BusinessInfoContext';

const COURIER_PARTNERS = [
  'DTDC Express',
  'ST Courier (Tamil Nadu Express)',
  'The Professional Couriers',
  'Blue Dart Express',
  'Delhivery',
  'India Post / Speed Post',
  'Local Express Runner (Trichy)',
];

const PRESS_MACHINES = [
  'Konica Minolta AccurioPress C4070 (Digital Color)',
  'Heidelberg Speedmaster SM 74 (4-Color Offset)',
  'Roland TrueVIS SG3-540 (Eco-Solvent Large Format)',
  'Komori Lithrone G40 (Bulk Offset)',
];

export default function AdminOrderDetail() {
  const { businessInfo } = useBusinessInfo();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Action states
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [jobCardModalOpen, setJobCardModalOpen] = useState(false);
  const [preQcModalOpen, setPreQcModalOpen] = useState(false);

  // Production Job state
  const [selectedMachine, setSelectedMachine] = useState(PRESS_MACHINES[1]);
  const [operatorName, setOperatorName] = useState('');
  const [jobPriority, setJobPriority] = useState('STANDARD');

  // QC state
  const [qcChecklist, setQcChecklist] = useState({
    correctQuantity: true,
    correctSize: true,
    correctMaterial: true,
    correctColour: true,
    correctLamination: true,
    correctFinishing: true,
    noDamage: true,
    correctCustomization: true,
    matchesApprovedArtwork: true,
  });
  const [qcRejectReason, setQcRejectReason] = useState('COLOUR_ISSUE');
  const [qcRejectNotes, setQcRejectNotes] = useState('');
  const [qcRejectModalOpen, setQcRejectModalOpen] = useState(false);

  // Packing state
  const [packageCount, setPackageCount] = useState(1);
  const [packageWeightKg, setPackageWeightKg] = useState('0.5');
  const [boxDimensions, setBoxDimensions] = useState('30x20x10 cm');

  // Logistics state
  const [courierPartner, setCourierPartner] = useState(COURIER_PARTNERS[1]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [pickupCustomerName, setPickupCustomerName] = useState('');
  const [pickupStaffName, setPickupStaffName] = useState('');

  // Internal Note state
  const [internalNote, setInternalNote] = useState('');

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminOrderById(id);
      if (res.success && res.data) {
        const ord = res.data;
        setOrder(ord);
        if (ord.courierPartner) setCourierPartner(ord.courierPartner);
        if (ord.trackingReference) setTrackingNumber(ord.trackingReference);
        if (ord.assignedStaffName) setOperatorName(ord.assignedStaffName);
        if (ord.machineNumber) setSelectedMachine(ord.machineNumber);
        if (ord.productionJobs?.[0]) {
          setJobPriority(ord.productionJobs[0].priority || 'STANDARD');
        }
      }
    } catch (err) {
      console.error('Error loading order detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const showFeedbackMsg = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  // Production Job Action
  const handleProductionStageUpdate = async (stage) => {
    const job = order.productionJobs?.[0];
    if (!job) return alert('No production job card linked to this order.');

    setIsProcessing(true);
    try {
      const res = await api.updateProductionJobStage(job.id, {
        stage,
        assignedStaffName: operatorName,
        machineNumber: selectedMachine,
        priority: jobPriority,
      });
      if (res.success) {
        showFeedbackMsg(res.message);
        fetchOrderDetail();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message || 'Failed to update production milestone');
    } finally {
      setIsProcessing(false);
    }
  };

  // QC Submit Action
  const handleQCSubmit = async (status) => {
    const qcTicket = order.qualityChecks?.[0];
    if (!qcTicket) return alert('No active QC ticket found for this order.');

    setIsProcessing(true);
    try {
      const payload = {
        status,
        checklist: qcChecklist,
        inspectorName: operatorName || 'QC Lead',
        ...(status === 'FAILED'
          ? { failureReason: qcRejectReason, failureNotes: qcRejectNotes }
          : {}),
      };

      const res = await api.submitQCInspection(qcTicket.id, payload);
      if (res.success) {
        showFeedbackMsg(res.message);
        setQcRejectModalOpen(false);
        fetchOrderDetail();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message || 'Failed to submit QC result');
    } finally {
      setIsProcessing(false);
    }
  };

  // Complete Packing Action
  const handleCompletePacking = async () => {
    setIsProcessing(true);
    try {
      const res = await api.completePacking(order.id, {
        packageCount: parseInt(packageCount, 10),
        packageWeightKg: parseFloat(packageWeightKg),
        boxDimensions,
        packingStaffName: operatorName,
      });
      if (res.success) {
        showFeedbackMsg(res.message);
        fetchOrderDetail();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message || 'Failed to complete packing');
    } finally {
      setIsProcessing(false);
    }
  };

  // Dispatch Courier Action
  const handleCourierDispatch = async () => {
    if (!trackingNumber.trim()) return alert('Please enter tracking / waybill number.');
    setIsProcessing(true);
    try {
      const res = await api.dispatchCourier(order.id, {
        courierPartner,
        trackingNumber: trackingNumber.trim(),
        expectedDeliveryDate,
        dispatchStaffName: operatorName,
      });
      if (res.success) {
        showFeedbackMsg(res.message);
        fetchOrderDetail();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message || 'Failed to dispatch courier');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handover Store Pickup Action
  const handlePickupHandover = async () => {
    setIsProcessing(true);
    try {
      const res = await api.handoverStorePickup(order.id, {
        verifiedCustomerName: pickupCustomerName || order.customerName,
        handoverStaffName: pickupStaffName || operatorName,
      });
      if (res.success) {
        showFeedbackMsg(res.message);
        fetchOrderDetail();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message || 'Failed to record store pickup');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark Courier Delivered
  const handleMarkDelivered = async () => {
    if (!window.confirm('Confirm order marked as DELIVERED to customer doorstep?')) return;
    setIsProcessing(true);
    try {
      const res = await api.markCourierDelivered(order.id);
      if (res.success) {
        showFeedbackMsg(res.message);
        fetchOrderDetail();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message || 'Failed to mark delivery');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add Internal Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!internalNote.trim()) return;

    setIsProcessing(true);
    try {
      const res = await api.addOrderNote(id, {
        noteText: internalNote.trim(),
        isInternalOnly: true,
      });
      if (res.success) {
        setInternalNote('');
        showFeedbackMsg('Note added successfully.');
        fetchOrderDetail();
      }
    } catch (err) {
      alert(err.message || 'Failed to add internal note');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate Official Tax Invoice
  const handleGenerateTaxInvoice = async () => {
    setIsProcessing(true);
    try {
      const res = await api.generateTaxInvoice(order.id);
      if (res.success) {
        showFeedbackMsg('Converted to official GST Tax Invoice!');
        fetchOrderDetail();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message || 'Failed to generate tax invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Spinner size="xl" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Loading unified master order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
        <Link to="/admin/orders" className="text-yellow-600 font-bold hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  const shippingAddr =
    typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress || '{}')
      : order.shippingAddress || {};

  const currentJob = order.productionJobs?.[0];
  const currentQc = order.qualityChecks?.[0];
  const currentShipment = order.shipments?.[0];
  const currentInvoice = order.invoices?.[0];
  const isPickup = order.deliveryMethod === 'STORE_PICKUP';
  const hasDesign = order.designOrders && order.designOrders.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Link to="/admin/orders" className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-700">
            <HiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-gray-900 font-mono">{order.orderNumber}</h1>
              <OrderSourceBadge source={order.orderSource} size="sm" />
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                {order.orderStatus?.replace(/_/g, ' ')}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {order.currentDepartment} DEPT
              </span>
              {order.branch && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border">
                  📍 {order.branch}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Customer: <span className="font-semibold text-gray-800">{order.customerName}</span> ({order.customerMobile}) | Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              {order.createdStaffName && (
                <span className="ml-2 pl-2 border-l border-gray-300 font-medium text-indigo-700">
                  Staff: {order.createdStaffName}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/invoice/${order.orderNumber}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-xs font-bold text-gray-800 rounded-lg hover:bg-gray-50 shadow-xs"
          >
            <HiOutlinePrinter className="w-4 h-4 text-gray-500" /> Print Tax Invoice
          </Link>
          <Button
            onClick={() => setJobCardModalOpen(true)}
            color="light"
            size="sm"
            className="text-xs font-bold"
          >
            <HiOutlineDocumentText className="w-4 h-4 mr-1 text-gray-500" /> Print Job Ticket
          </Button>
          {order.orderStatus === 'PRE_PRODUCTION_QC' && (
            <Button
              onClick={() => setPreQcModalOpen(true)}
              color="warning"
              size="sm"
              className="text-xs font-black bg-yellow-400 hover:bg-yellow-500 text-black animate-pulse"
            >
              🛡️ Pre-Production QC
            </Button>
          )}
          <Button
            onClick={() => setShippingModalOpen(true)}
            color="light"
            size="sm"
            className="text-xs font-bold"
          >
            <HiOutlineTag className="w-4 h-4 mr-1 text-gray-500" /> Print Shipping Label
          </Button>
        </div>
      </div>

      {/* Pre-Production QC Mandatory Gating Banner */}
      {order.orderStatus === 'PRE_PRODUCTION_QC' && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛡️</span>
            <div>
              <h3 className="text-sm font-black text-yellow-950 uppercase tracking-wide">
                Action Required: Pre-Production QC Gate
              </h3>
              <p className="text-xs text-yellow-800">
                Customer proof is approved. Physical printing is strictly gated until all 9 prepress checklist items are verified and signed off.
              </p>
            </div>
          </div>
          <Button
            color="warning"
            size="sm"
            onClick={() => setPreQcModalOpen(true)}
            className="font-black text-black bg-yellow-400 hover:bg-yellow-500 flex-shrink-0"
          >
            🛡️ Open Pre-Production QC
          </Button>
        </div>
      )}

      {feedback && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold p-3 rounded-lg flex items-center gap-2">
          <HiCheckCircle className="w-4 h-4 text-green-600" /> {feedback}
        </div>
      )}

      {/* Linked Unified Operations Master Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center pb-2 border-b border-slate-700 text-xs text-gray-400">
          <span className="uppercase font-bold tracking-wider text-[10px] text-yellow-400">Single Source of Truth — Linked Operations Identifiers</span>
          <span>Fulfillment: <strong className="text-white">{isPickup ? '🏪 Store Pickup' : '🚚 Courier'}</strong></span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-xs font-mono">
          <div className="bg-slate-800/90 p-2 rounded border border-slate-700">
            <span className="text-[10px] font-sans text-gray-400 block">Master Order:</span>
            <span className="text-yellow-400 font-bold">{order.orderNumber}</span>
          </div>
          <div className="bg-slate-800/90 p-2 rounded border border-slate-700">
            <span className="text-[10px] font-sans text-gray-400 block">Design Job:</span>
            <span className="text-purple-400 font-bold">{order.designOrders?.[0]?.designJobNumber || 'N/A (Print-Ready)'}</span>
          </div>
          <div className="bg-slate-800/90 p-2 rounded border border-slate-700">
            <span className="text-[10px] font-sans text-gray-400 block">Production Card:</span>
            <span className="text-blue-400 font-bold">{currentJob?.jobNumber || 'PB-JOB-...'}</span>
          </div>
          <div className="bg-slate-800/90 p-2 rounded border border-slate-700">
            <span className="text-[10px] font-sans text-gray-400 block">Quality Check:</span>
            <span className="text-pink-400 font-bold">{currentQc?.qcNumber || 'Pending Press'}</span>
          </div>
          <div className="bg-slate-800/90 p-2 rounded border border-slate-700">
            <span className="text-[10px] font-sans text-gray-400 block">Shipment / Pickup:</span>
            <span className="text-green-400 font-bold">{currentShipment?.shipmentNumber || 'PB-SHIP-...'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-1 text-xs font-bold">
        {[
          { key: 'overview', label: '1. Overview' },
          { key: 'products', label: `2. Products (${order.items?.length || 0})` },
          { key: 'design', label: `3. Design Job ${hasDesign ? '🎨' : ''}` },
          { key: 'production', label: '4. Production Job Card ⭐' },
          { key: 'qc', label: '5. Quality Check (QC)' },
          { key: 'packing', label: '6. Packaging Desk' },
          { key: 'delivery', label: `7. Delivery (${isPickup ? 'Pickup' : 'Courier'})` },
          { key: 'financials', label: '8. Payment & GST' },
          { key: 'invoices', label: '9. Invoices & Docs' },
          { key: 'timeline', label: '10. Activity History' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'border-yellow-400 text-black bg-yellow-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-xl border shadow-xs">
              <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b">Executive Order Status</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">Department:</span>
                  <span className="font-bold text-gray-900 text-sm">{order.currentDepartment}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Current Milestone:</span>
                  <span className="font-bold text-red-600 text-sm">{order.orderStatus?.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Delivery Method:</span>
                  <span className="font-bold text-gray-900">{isPickup ? '🏪 Store Pickup' : '🚚 Courier'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Est. Dispatch Date:</span>
                  <span className="font-bold text-gray-900">
                    {order.estimatedDispatchDate ? new Date(order.estimatedDispatchDate).toLocaleDateString('en-IN') : 'Standard (3-4 Days)'}
                  </span>
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="mt-6 pt-4 border-t flex flex-wrap gap-2">
                <Button size="xs" color="dark" onClick={() => setActiveTab('production')}>
                  Open Production Job Card ➔
                </Button>
                <Button size="xs" color="light" onClick={() => setActiveTab('qc')}>
                  Go to Quality Check Desk ➔
                </Button>
                <Button size="xs" color="light" onClick={() => setActiveTab('packing')}>
                  Packaging Desk ➔
                </Button>
                <Button size="xs" color="light" onClick={() => setActiveTab('delivery')}>
                  Delivery / Dispatch ➔
                </Button>
              </div>
            </div>

            {/* Customer & Delivery Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border shadow-xs text-xs space-y-2">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 border-b pb-2">
                  <HiOutlineUser className="w-4 h-4 text-gray-500" /> Customer Information
                </h4>
                <p><span className="text-gray-500">Name:</span> <strong className="text-gray-900">{order.customerName}</strong></p>
                <p><span className="text-gray-500">Mobile:</span> {order.customerMobile}</p>
                <p><span className="text-gray-500">WhatsApp:</span> {order.customerWhatsapp || order.customerMobile}</p>
                <p><span className="text-gray-500">Email:</span> {order.customerEmail || 'None'}</p>
                {order.gstNumber && <p><span className="text-gray-500">GSTIN:</span> <strong className="text-blue-700">{order.gstNumber}</strong></p>}
              </div>

              <div className="bg-white p-5 rounded-xl border shadow-xs text-xs space-y-2">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 border-b pb-2">
                  <HiOutlineLocationMarker className="w-4 h-4 text-gray-500" /> Fulfillment Destination
                </h4>
                {isPickup ? (
                  <div className="bg-amber-50 p-2.5 rounded border border-amber-200 text-amber-900">
                    <p className="font-bold">Store Self-Pickup:</p>
                    <p>{businessInfo?.address?.pressFacilityAddress || 'Print Bazzar Press Unit, No. 42 Big Bazzar Street, Singarathope, Trichy - 620008'}</p>
                    <p className="text-[11px] text-amber-700 mt-1">Status: {order.pickupReadyAt ? '🟢 Ready for Pickup' : 'In Production / Packaging'}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-gray-900">{shippingAddr.street}</p>
                    <p className="text-gray-600">{shippingAddr.city}, {shippingAddr.state} - {shippingAddr.pincode}</p>
                    {shippingAddr.landmark && <p className="text-gray-500 mt-1">Landmark: {shippingAddr.landmark}</p>}
                    <p className="text-blue-600 font-semibold mt-1">Partner: {order.courierPartner || 'Not assigned yet'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer-Confirmed Order Specifications */}
            <div className="bg-white p-6 rounded-xl border shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <HiOutlineSparkles className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-gray-900 text-sm">
                    Customer-Confirmed Order Specifications
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {order.items?.length || 0} Ordered {order.items?.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              <div className="space-y-4 divide-y divide-gray-100">
                {order.items?.map((item, idx) => {
                  const confirmedSpecs = item.customerConfirmedSpecs || [];
                  return (
                    <div key={item.id || idx} className="pt-4 first:pt-0 space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-gray-900 text-sm">{item.productNameSnapshot}</span>
                          <p className="text-xs text-gray-500 font-mono">SKU: {item.skuSnapshot}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900 text-sm">₹{Number(item.totalPriceSnapshot || 0).toLocaleString('en-IN')}</span>
                          <p className="text-xs text-gray-500">Qty: {item.quantity} units</p>
                        </div>
                      </div>

                      {/* Badges of Confirmed Specifications */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Quantity: {item.quantity}
                        </span>
                        {confirmedSpecs.length > 0 ? (
                          confirmedSpecs.map((spec, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-800 border border-gray-200"
                            >
                              <strong className="mr-1 text-gray-900">{spec.label}:</strong> {spec.value}
                            </span>
                          ))
                        ) : (
                          // Fallback parsing from optionsSnapshot
                          (() => {
                            let parsed = {};
                            try {
                              parsed = JSON.parse(item.optionsSnapshot || '{}');
                            } catch {
                              parsed = {};
                            }
                            return Object.entries(parsed)
                              .filter(([k, v]) => !k.startsWith('_') && !['no', 'none', 'false', 'n/a'].includes(String(v).toLowerCase()))
                              .map(([k, v], sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-800 border border-gray-200"
                                >
                                  <strong className="mr-1 text-gray-900">{k}:</strong> {String(v)}
                                </span>
                              ));
                          })()
                        )}
                      </div>

                      {/* Artwork & File Information */}
                      {item.artworkFileUrl && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                            Print-Ready File Attached
                          </span>
                          <a
                            href={item.artworkFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            <HiOutlineDownload className="w-3.5 h-3.5" /> Download Customer File
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Internal Notes */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-xl border shadow-xs">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Internal Production Notes</h4>
              <form onSubmit={handleAddNote} className="space-y-3">
                <Textarea
                  rows={3}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add note for press operator or courier team..."
                  className="text-xs"
                />
                <Button type="submit" size="xs" color="dark" disabled={isProcessing} className="w-full">
                  Add Internal Note
                </Button>
              </form>

              <div className="divide-y mt-4 max-h-52 overflow-y-auto">
                {order.notes?.map((n) => (
                  <div key={n.id} className="py-2 text-xs">
                    <p className="text-gray-800">{n.noteText}</p>
                    <span className="text-[10px] text-gray-400">
                      {n.user?.name || 'Staff'} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS & CUSTOMIZATION */}
      {activeTab === 'products' && (
        <div className="bg-white p-6 rounded-xl border shadow-xs space-y-6">
          <h3 className="text-base font-bold text-gray-900 pb-3 border-b">
            Itemized Production Specifications ({order.items?.length || 0})
          </h3>
          <div className="divide-y">
            {order.items?.map((item) => {
              const options = JSON.parse(item.optionsSnapshot || '{}');
              const specs = JSON.parse(item.specificationsSnapshot || '[]');
              return (
                <div key={item.id} className="py-6 first:pt-0 flex flex-col md:flex-row gap-6">
                  <img
                    src={item.product?.thumbnailUrl || '/default-image.png'}
                    alt={item.productNameSnapshot}
                    className="w-24 h-24 object-cover rounded-lg border flex-shrink-0"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{item.productNameSnapshot}</h4>
                        <p className="text-xs font-mono text-gray-500">SKU: {item.skuSnapshot} | Item ID: {item.id}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-gray-900">₹{item.totalPriceSnapshot}</span>
                        <p className="text-xs text-gray-500">Qty: {item.quantity} units (₹{Number(item.unitPriceSnapshot).toFixed(2)} / unit)</p>
                      </div>
                    </div>

                    {/* Specifications Snapshot Grid */}
                    <div className="bg-gray-50 p-3 rounded-lg border text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {specs.map((s, idx) => (
                        <div key={idx}>
                          <span className="text-gray-400 text-[10px] uppercase font-bold block">{s.name}</span>
                          <span className="font-semibold text-gray-800">{s.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Customer Customization Options Snapshot */}
                    <div className="bg-yellow-50/60 p-3 rounded-lg border border-yellow-200 text-xs">
                      <span className="text-[10px] uppercase font-bold text-yellow-800 block mb-1">Customer Selections / Customization:</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(options).map(([k, v]) => {
                          if (k.startsWith('_')) return null;
                          return (
                            <span key={k} className="bg-white border border-yellow-300 px-2.5 py-1 rounded text-gray-800 font-medium">
                              <strong>{k}:</strong> {String(v)}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Artwork / Design Service Snapshot */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        {item.designRequired ? (
                          <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                            🎨 Design Service: {item.designPackageName || 'Graphic Design Package'} (+₹{item.designCharge || 0})
                          </span>
                        ) : item.artworkFileUrl ? (
                          <span className="font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded border border-green-200">
                            ✔ Customer Provided Print-Ready Artwork
                          </span>
                        ) : null}
                      </div>

                      {item.artworkFileUrl && (
                        <a
                          href={item.artworkFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                        >
                          <HiOutlineDownload className="w-4 h-4" /> Download Customer File
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DESIGN JOB */}
      {activeTab === 'design' && (
        <div className="bg-white p-6 rounded-xl border shadow-xs space-y-6">
          <div className="flex justify-between items-center pb-3 border-b">
            <div>
              <h3 className="text-base font-bold text-gray-900">Prepress & Graphic Design Operations</h3>
              <p className="text-xs text-gray-500">Design approval is strictly locked prior to offset/digital press execution.</p>
            </div>
            <Link to="/admin/design-services" className="text-xs font-bold text-yellow-600 hover:underline">
              Open Design Job Central ➔
            </Link>
          </div>

          {order.designOrders && order.designOrders.length > 0 ? (
            order.designOrders.map((dJob) => (
              <div key={dJob.id} className="p-5 rounded-xl border bg-gray-50/50 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-lg font-black text-purple-900 font-mono">{dJob.designJobNumber}</span>
                    <p className="text-xs text-gray-600 font-medium">{dJob.packageNameSnapshot} (₹{dJob.packagePriceSnapshot})</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 font-bold text-xs rounded-full">
                    {dJob.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-lg border">
                  <div>
                    <span className="text-gray-400 text-[10px] block font-bold">Assigned Designer:</span>
                    <span className="font-semibold text-gray-900">{dJob.designer?.name || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block font-bold">Revisions Done:</span>
                    <span className="font-semibold text-gray-900">{dJob.revisions?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block font-bold">Approved At:</span>
                    <span className="font-semibold text-gray-900">
                      {dJob.approvedAt ? new Date(dJob.approvedAt).toLocaleDateString('en-IN') : 'Pending Approval'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block font-bold">Priority:</span>
                    <span className="font-semibold text-gray-900">{dJob.priority}</span>
                  </div>
                </div>

                {dJob.requirementNotes && (
                  <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-900 border border-yellow-200">
                    <strong>Customer Brief:</strong> {dJob.requirementNotes}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-500 text-xs">
              No custom design service requested for this order. Customer uploaded direct print-ready artwork.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PRODUCTION JOB CARD ⭐ */}
      {activeTab === 'production' && (
        <div className="space-y-6">
          {/* Design Lock Warning Banner if unapproved */}
          {currentJob && currentJob.status === 'WAITING_FOR_DESIGN_APPROVAL' && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center gap-3 text-red-900">
              <HiOutlineExclamationCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h4 className="font-black text-sm">🔒 DESIGN LOCK ACTIVE</h4>
                <p className="text-xs text-red-700">
                  This production job cannot begin press printing until the customer or prepress approves the design proof.
                </p>
              </div>
            </div>
          )}

          {/* Printable Job Card Container */}
          <div className="bg-white rounded-2xl border border-gray-300 shadow-md p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 block">Print Bazzar Press Floor</span>
                <h2 className="text-2xl font-black text-gray-900 font-mono">
                  {currentJob?.jobNumber || 'PB-JOB-2026-00001'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Parent Master Order: <strong className="text-gray-900">{order.orderNumber}</strong> | Created: {new Date(order.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-3 py-1 bg-yellow-400 text-black rounded-lg uppercase tracking-wide">
                  {currentJob?.status?.replace(/_/g, ' ') || 'QUEUED'}
                </span>
                <Select
                  size="sm"
                  value={jobPriority}
                  onChange={(e) => setJobPriority(e.target.value)}
                  className="text-xs font-bold w-32"
                >
                  <option value="STANDARD">Standard</option>
                  <option value="EXPRESS">Express</option>
                  <option value="URGENT">Urgent ⚡</option>
                </Select>
              </div>
            </div>

            {/* Press Assignment Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border text-xs">
              <div>
                <label className="text-gray-500 font-bold block mb-1">Target Press Machine:</label>
                <Select
                  size="sm"
                  value={selectedMachine}
                  onChange={(e) => setSelectedMachine(e.target.value)}
                  className="text-xs"
                >
                  {PRESS_MACHINES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-gray-500 font-bold block mb-1">Assigned Press Master / Operator:</label>
                <TextInput
                  size="sm"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="e.g. Manikandan / Press Team"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-gray-500 font-bold block mb-1">Deadline:</label>
                <span className="font-bold text-gray-900 text-sm block mt-1">
                  {order.estimatedDispatchDate ? new Date(order.estimatedDispatchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Express Next-Day'}
                </span>
              </div>
            </div>

            {/* Approved Artwork File Block */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🖼️</span>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Final Approved Production Artwork</h4>
                  <p className="text-xs text-gray-600">
                    Version: <span className="font-bold text-green-700">{currentJob?.approvedArtworkVersion || 'V1 - Approved'}</span> | Verified CMYK 300DPI
                  </p>
                </div>
              </div>

              {currentJob?.approvedArtworkUrl ? (
                <a
                  href={currentJob.approvedArtworkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm"
                >
                  <HiOutlineDownload className="w-4 h-4" /> Download High-Res File
                </a>
              ) : (
                <span className="text-xs text-amber-700 font-bold">Waiting for final file upload</span>
              )}
            </div>

            {/* Production Specifications Table */}
            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-3 uppercase tracking-wider">Manufacturing Requirements</h4>
              <div className="border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-600 border-b">
                    <tr>
                      <th className="py-2.5 px-4">Parameter</th>
                      <th className="py-2.5 px-4">Specification Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-gray-700">Product:</td>
                      <td className="py-2.5 px-4 font-bold text-gray-900">{currentJob?.productNameSnapshot || order.items?.[0]?.productNameSnapshot}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-gray-700">Quantity to Print:</td>
                      <td className="py-2.5 px-4 font-black text-yellow-600 text-sm">{currentJob?.quantity || order.items?.[0]?.quantity} Units</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-gray-700">Options & Finishing:</td>
                      <td className="py-2.5 px-4 text-gray-800">
                        {currentJob?.customizationSnapshotJson ? (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(JSON.parse(currentJob.customizationSnapshotJson)).map(([k, v]) => (
                              <span key={k} className="bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                                {k}: <strong>{String(v)}</strong>
                              </span>
                            ))}
                          </div>
                        ) : 'Standard Finish'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Milestone Actions Buttons */}
            <div className="border-t pt-5">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Advance Production Workflow:</h4>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  color="dark"
                  onClick={() => handleProductionStageUpdate('PRINTING')}
                  disabled={isProcessing}
                >
                  ▶ Start Press Run (Printing)
                </Button>
                <Button
                  size="sm"
                  color="light"
                  onClick={() => handleProductionStageUpdate('FINISHING')}
                  disabled={isProcessing}
                >
                  ✂️ Move to Finishing (Cut / Laminate)
                </Button>
                <Button
                  size="sm"
                  color="warning"
                  onClick={() => handleProductionStageUpdate('SENT_TO_QC')}
                  disabled={isProcessing}
                  className="font-bold"
                >
                  🔍 Send to Quality Inspection Desk (QC)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: QUALITY CHECK (QC) DESK */}
      {activeTab === 'qc' && (
        <div className="bg-white p-6 rounded-xl border shadow-xs space-y-6">
          <div className="flex justify-between items-center pb-3 border-b">
            <div>
              <h3 className="text-base font-bold text-gray-900">Quality Inspection Desk (QC)</h3>
              <p className="text-xs text-gray-500">Every print job must be strictly verified against specifications prior to packing.</p>
            </div>
            <span className="font-mono text-xs font-bold px-3 py-1 rounded bg-pink-100 text-pink-800">
              {currentQc?.qcNumber || 'PB-QC-TICKET'}
            </span>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border text-xs text-gray-700">
            <h4 className="font-bold text-gray-900 mb-3">Checklist for Inspector:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'correctQuantity', label: '1. Exact Quantity Count verified' },
                { key: 'correctSize', label: '2. Dimensions, bleed & cutting margins accurate' },
                { key: 'correctMaterial', label: '3. Correct Paper Stock & GSM weight verified' },
                { key: 'correctColour', label: '4. CMYK Colour fidelity & registration sharp' },
                { key: 'correctLamination', label: '5. Lamination / Gloss / Matte coating smooth' },
                { key: 'correctFinishing', label: '6. Die-cut, Spot UV, Foil stamped correctly' },
                { key: 'noDamage', label: '7. Free of scratches, banding, smudges & offset marks' },
                { key: 'correctCustomization', label: '8. Customer customization & typography verified' },
                { key: 'matchesApprovedArtwork', label: '9. 100% matches final approved proof' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={qcChecklist[item.key]}
                    onChange={(e) => setQcChecklist({ ...qcChecklist, [item.key]: e.target.checked })}
                    className="w-5 h-5 rounded text-yellow-500 focus:ring-yellow-400 flex-shrink-0"
                  />
                  <span className="font-semibold text-xs text-gray-800">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* QC Inspection Verdict Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              color="failure"
              size="sm"
              onClick={() => setQcRejectModalOpen(true)}
              disabled={isProcessing}
            >
              ❌ Reject Job (Fail QC)
            </Button>

            <Button
              color="success"
              size="sm"
              onClick={() => handleQCSubmit('PASSED')}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-6"
            >
              ✔ Pass QC & Handover to Packaging Desk
            </Button>
          </div>
        </div>
      )}

      {/* TAB 6: PACKAGING DESK */}
      {activeTab === 'packing' && (
        <div className="bg-white p-6 rounded-xl border shadow-xs space-y-6">
          <div className="pb-3 border-b">
            <h3 className="text-base font-bold text-gray-900">Packaging & Parcel Preparation</h3>
            <p className="text-xs text-gray-500">Record package count, weight, and affix shipping labels.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-gray-700 font-bold block mb-1">Package Count:</label>
              <TextInput
                type="number"
                min="1"
                value={packageCount}
                onChange={(e) => setPackageCount(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-gray-700 font-bold block mb-1">Gross Parcel Weight (kg):</label>
              <TextInput
                type="number"
                step="0.1"
                value={packageWeightKg}
                onChange={(e) => setPackageWeightKg(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-gray-700 font-bold block mb-1">Box Dimensions (L x W x H):</label>
              <TextInput
                value={boxDimensions}
                onChange={(e) => setBoxDimensions(e.target.value)}
                placeholder="e.g. 30x20x10 cm"
                className="text-xs"
              />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900">
            <h4 className="font-bold mb-1">Fulfillment Target:</h4>
            <p>
              This order will be routed to: <strong>{isPickup ? 'Store Self-Pickup Counter' : 'Courier Dispatch Hub'}</strong>.
            </p>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button
              color="dark"
              size="sm"
              onClick={handleCompletePacking}
              disabled={isProcessing}
              className="bg-black hover:bg-yellow-400 hover:text-black font-bold"
            >
              📦 Complete Packing & Mark Ready
            </Button>
          </div>
        </div>
      )}

      {/* TAB 7: DELIVERY MANAGEMENT (COURIER / STORE PICKUP) */}
      {activeTab === 'delivery' && (
        <div className="bg-white p-6 rounded-xl border shadow-xs space-y-6">
          <div className="flex justify-between items-center pb-3 border-b">
            <div>
              <h3 className="text-base font-bold text-gray-900">Logistics & Delivery Execution</h3>
              <p className="text-xs text-gray-500">Handle courier dispatch or store pickup customer handovers.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900">
              {isPickup ? 'STORE PICKUP' : 'COURIER DISPATCH'}
            </span>
          </div>

          {isPickup ? (
            /* STORE PICKUP WORKFLOW */
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-gray-800">
                <h4 className="font-bold text-amber-950 text-sm mb-1">Trichy Press Facility Pickup Counter:</h4>
                <p>{businessInfo?.address?.pressFacilityAddress || 'No. 42, Big Bazzar Street, Singarathope, Tiruchirappalli - 620008'}</p>
                <p className="text-gray-500 mt-1">Status: {order.pickupReadyAt ? '🟢 Ready for Customer Collection' : 'Pending packaging'}</p>
              </div>

              <div className="p-4 rounded-xl border bg-gray-50 text-xs space-y-3">
                <h4 className="font-bold text-gray-900">Record Customer Handover:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-600 block mb-1">Customer / Representative Name:</label>
                    <TextInput
                      size="sm"
                      value={pickupCustomerName}
                      onChange={(e) => setPickupCustomerName(e.target.value)}
                      placeholder={order.customerName}
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 block mb-1">Staff Handover Officer:</label>
                    <TextInput
                      size="sm"
                      value={pickupStaffName}
                      onChange={(e) => setPickupStaffName(e.target.value)}
                      placeholder="e.g. Counter Staff"
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  color="success"
                  onClick={handlePickupHandover}
                  disabled={isProcessing}
                  className="font-bold mt-2"
                >
                  ✔ Confirm Handover & Complete Order
                </Button>
              </div>
            </div>
          ) : (
            /* COURIER DISPATCH WORKFLOW */
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Courier Partner:</label>
                  <Select
                    size="sm"
                    value={courierPartner}
                    onChange={(e) => setCourierPartner(e.target.value)}
                  >
                    {COURIER_PARTNERS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tracking / AWB Number:</label>
                  <TextInput
                    size="sm"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. ST12345678"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Expected Delivery Date:</label>
                  <TextInput
                    size="sm"
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  size="sm"
                  color="dark"
                  onClick={handleCourierDispatch}
                  disabled={isProcessing}
                  className="bg-black hover:bg-yellow-400 hover:text-black font-bold"
                >
                  🚀 Dispatch Parcel & Log Tracking
                </Button>

                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline px-3 py-1.5"
                  >
                    Live Courier Tracking Link <HiOutlineExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <Button
                  size="sm"
                  color="success"
                  onClick={handleMarkDelivered}
                  disabled={isProcessing}
                  className="ml-auto"
                >
                  Mark Delivered (Completed)
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: PAYMENT & FINANCIALS */}
      {activeTab === 'financials' && (
        <div className="bg-white p-6 rounded-xl border shadow-xs space-y-4 text-xs">
          <h3 className="text-base font-bold text-gray-900 pb-2 border-b">Order Financial Summary</h3>
          <div className="w-full sm:w-80 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-bold text-gray-900">₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping Fee:</span>
              <span className="font-bold text-gray-900">{order.shippingCharge === 0 ? 'FREE' : `₹${order.shippingCharge}`}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>CGST (9%):</span>
              <span className="font-semibold text-gray-900">₹{order.cgstAmount}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>SGST (9%):</span>
              <span className="font-semibold text-gray-900">₹{order.sgstAmount}</span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t">
              <span>Grand Total:</span>
              <span className="text-xl text-red-600">₹{order.grandTotal}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: INVOICES & DOCUMENTS */}
      {activeTab === 'invoices' && (
        <div className="bg-white p-6 rounded-xl border shadow-xs space-y-6">
          <div className="flex justify-between items-center pb-3 border-b">
            <div>
              <h3 className="text-base font-bold text-gray-900">Official Invoices & Receipts</h3>
              <p className="text-xs text-gray-500">View and generate GST compliant Tax Invoices and Customer Receipts.</p>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/invoice/${order.orderNumber}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-400 text-black font-bold text-xs rounded-lg hover:bg-yellow-300 shadow-sm"
              >
                <HiOutlinePrinter className="w-4 h-4" /> View / Print Official Invoice
              </Link>
              <Button
                size="xs"
                color="light"
                onClick={handleGenerateTaxInvoice}
                disabled={isProcessing}
              >
                Convert to Tax Invoice
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-gray-50 text-xs">
            <p><strong>Invoice Number:</strong> {currentInvoice?.invoiceNumber || `PB-INV-${new Date().getFullYear()}-...`}</p>
            <p className="mt-1"><strong>Invoice Type:</strong> {currentInvoice?.invoiceType || 'ORDER_RECEIPT'}</p>
            <p className="mt-1"><strong>Amount:</strong> ₹{order.grandTotal} ({order.paymentStatus})</p>
          </div>
        </div>
      )}

      {/* TAB 10: ACTIVITY HISTORY */}
      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-xl border shadow-xs space-y-4">
          <h3 className="text-base font-bold text-gray-900 pb-2 border-b">Department & Milestone Changelog</h3>
          <div className="space-y-4 border-l-2 border-yellow-400 ml-4 pl-4 text-xs">
            {order.statusHistory?.map((hist) => (
              <div key={hist.id} className="relative">
                <div className="absolute -left-[23px] top-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                <p className="font-bold text-gray-900">{hist.newStatus?.replace(/_/g, ' ')}</p>
                <p className="text-gray-600 mt-0.5">{hist.note}</p>
                <span className="text-[10px] text-gray-400">
                  {new Date(hist.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  {hist.changedBy?.name ? ` by ${hist.changedBy.name}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QC REJECT DEFECT ROUTING MODAL */}
      <Modal show={qcRejectModalOpen} onClose={() => setQcRejectModalOpen(false)}>
        <Modal.Header>QC Defect Routing & Job Rejection</Modal.Header>
        <Modal.Body className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Defect Category:</label>
            <Select
              value={qcRejectReason}
              onChange={(e) => setQcRejectReason(e.target.value)}
              className="text-xs"
            >
              <option value="COLOUR_ISSUE">Colour Issue / CMYK Variation</option>
              <option value="QUANTITY_ISSUE">Quantity Shortage</option>
              <option value="FINISHING_ISSUE">Finishing / Lamination / Cutting Defect</option>
              <option value="DAMAGE">Physical Damage / Smudge</option>
              <option value="WRONG_ARTWORK">Wrong Artwork Printed</option>
              <option value="OTHER">Other Defect</option>
            </Select>
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Inspector Notes & Rework Instructions:</label>
            <Textarea
              rows={3}
              value={qcRejectNotes}
              onChange={(e) => setQcRejectNotes(e.target.value)}
              placeholder="Detail the exact defect and required reprint corrections..."
              className="text-xs"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="failure" size="sm" onClick={() => handleQCSubmit('FAILED')}>
            Confirm Rejection & Route Job Back
          </Button>
          <Button color="gray" size="sm" onClick={() => setQcRejectModalOpen(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Printable Shipping Label Modal */}
      <ShippingLabelModal
        show={shippingModalOpen}
        onClose={() => setShippingModalOpen(false)}
        order={order}
      />

      {/* Printable Factory Job Card Modal */}
      <JobCardModal
        show={jobCardModalOpen}
        onClose={() => setJobCardModalOpen(false)}
        order={order}
        job={currentJob}
      />

      {/* Pre-Production QC Prepress Gate Modal */}
      <PreProductionQCModal
        show={preQcModalOpen}
        onClose={() => setPreQcModalOpen(false)}
        order={order}
        onSuccess={(msg) => {
          showFeedbackMsg(msg);
          fetchOrderDetail();
        }}
      />
    </div>
  );
}
