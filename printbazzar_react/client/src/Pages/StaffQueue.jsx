import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Badge,
  Modal,
  Spinner,
  TextInput,
  Textarea,
  Checkbox,
  Label,
  Select,
} from 'flowbite-react';
import {
  HiOutlineRefresh,
  HiOutlineClipboardCheck,
  HiOutlinePrinter,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineTruck,
  HiOutlinePhotograph,
  HiOutlineArrowRight,
  HiOutlineTag,
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineClock,
  HiOutlineBan,
  HiOutlineCurrencyRupee,
  HiOutlineSearch,
  HiOutlineEye,
  HiOutlineUser,
} from 'react-icons/hi';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ShippingLabelModal from '../Components/ShippingLabelModal';
import JobCardModal from '../Components/JobCardModal';
import PreProductionQCModal from '../Components/PreProductionQCModal';

const DEPARTMENTS = [
  {
    key: 'DESIGN',
    label: '🎨 Prepress Hub',
    badgeColor: 'purple',
    desc: 'Artwork inspection, client proofing & Pre-Production QC gate',
  },
  {
    key: 'PRODUCTION',
    label: '🖨️ Press Room',
    badgeColor: 'warning',
    desc: 'Machine assignment, digital/offset printing & Job Cards',
  },
  {
    key: 'FINISHING_QC',
    label: '✂️ Finishing & QC',
    badgeColor: 'purple',
    desc: 'Lamination, cutting, folding & quality control inspection',
  },
  {
    key: 'PACKING',
    label: '📦 Packing Desk',
    badgeColor: 'indigo',
    desc: 'Box packing, parcel weighing & 4x6 thermal shipping labels',
  },
  {
    key: 'DELIVERY',
    label: '🚚 Logistics & Dispatch',
    badgeColor: 'blue',
    desc: 'Doorstep courier dispatch & Trichy Store Pickup Counter',
  },
];

const PRESS_MACHINES = [
  'Konica Minolta AccurioPress C4070 (Digital Color)',
  'Heidelberg Speedmaster SM 74 (4-Color Offset)',
  'Roland TrueVIS SG3-540 (Eco-Solvent Large Format)',
  'Komori Lithrone G40 (Bulk Offset Press)',
  'Polar High-Speed Programmable Paper Cutter',
  'Autobond Thermal Lamination Machine',
];

const COURIER_PARTNERS = [
  'DTDC Express',
  'ST Courier (Tamil Nadu Express)',
  'The Professional Couriers',
  'Blue Dart Express',
  'Delhivery',
  'India Post / Speed Post',
  'Local Express Runner (Trichy)',
];

export default function StaffQueue() {
  const { adminUser } = useAuth();
  const [selectedDept, setSelectedDept] = useState(
    adminUser?.department && adminUser.department !== 'ALL' ? adminUser.department : 'PRODUCTION'
  );

  const [orders, setOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Pre-Production QC Modal State (Prepress Gate)
  const [preQcModalOpen, setPreQcModalOpen] = useState(false);
  const [selectedPreQcOrder, setSelectedPreQcOrder] = useState(null);

  // 2. Job Card Modal State
  const [jobCardModalOpen, setJobCardModalOpen] = useState(false);
  const [jobCardOrder, setJobCardOrder] = useState(null);

  // 3. Shipping Label Modal State
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [shippingLabelOrder, setShippingLabelOrder] = useState(null);

  // 4. Press Room Machine Assignment Modal State
  const [pressModalOpen, setPressModalOpen] = useState(false);
  const [pressOrder, setPressOrder] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(PRESS_MACHINES[0]);
  const [operatorName, setOperatorName] = useState(adminUser?.name || 'Press Operator');
  const [pressPriority, setPressPriority] = useState('STANDARD');

  // 5. Finishing & Quality Control (QC) Modal State
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [selectedQcJob, setSelectedQcJob] = useState(null);
  const [qcInspectorName, setQcInspectorName] = useState(adminUser?.name || 'QC Lead');
  const [qcChecklist, setQcChecklist] = useState({
    correctQuantity: true,
    correctSize: true,
    correctMaterial: true,
    correctColour: true,
    correctLamination: true,
    correctFinishing: true,
    noDamage: true,
    matchesApprovedArtwork: true,
  });
  const [qcActionType, setQcActionType] = useState('PASS'); // 'PASS' | 'REJECT'
  const [qcFailureReason, setQcFailureReason] = useState('COLOUR_ISSUE');
  const [qcFailureNotes, setQcFailureNotes] = useState('');

  // 6. Packing & Box Weighing Modal State
  const [packingModalOpen, setPackingModalOpen] = useState(false);
  const [packingOrder, setPackingOrder] = useState(null);
  const [packageCount, setPackageCount] = useState(1);
  const [packageWeightKg, setPackageWeightKg] = useState('0.50');
  const [boxDimensions, setBoxDimensions] = useState('30x20x10 cm');
  const [packingChecklist, setPackingChecklist] = useState({
    bubbleWrapApplied: true,
    invoiceEnclosed: true,
    tapeSecured: true,
  });

  // 7. Doorstep Courier Dispatch Modal State
  const [courierModalOpen, setCourierModalOpen] = useState(false);
  const [courierOrder, setCourierOrder] = useState(null);
  const [courierPartner, setCourierPartner] = useState(COURIER_PARTNERS[1]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  // 8. Store Pickup Handover & Counter Balance Modal State
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pickupOrder, setPickupOrder] = useState(null);
  const [pickupCustomerName, setPickupCustomerName] = useState('');
  const [pickupStaffName, setPickupStaffName] = useState(adminUser?.name || 'Store Manager');
  const [collectBalanceAtCounter, setCollectBalanceAtCounter] = useState(true);
  const [counterPaymentMethod, setCounterPaymentMethod] = useState('CASH');
  const [counterPaymentReference, setCounterPaymentReference] = useState('');
  const [counterPaymentNotes, setCounterPaymentNotes] = useState('');

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.getWorkflowBoard();
      if (res.success && res.data && res.data.columns) {
        setOrders(res.data.columns);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load department queue.' });
    } finally {
      setLoading(false);
    }
  };

  // Filter queue by search query
  const rawList = orders[selectedDept] || [];
  const currentList = rawList.filter((ord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      ord.orderNumber?.toLowerCase().includes(q) ||
      ord.customerName?.toLowerCase().includes(q) ||
      ord.customerMobile?.includes(q) ||
      ord.items?.some((it) => it.productNameSnapshot?.toLowerCase().includes(q))
    );
  });

  // Quick Handover helper
  const handleQuickAdvance = async (order, targetDept, targetStatus, note) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const payload = {
        targetDepartment: targetDept,
        newStatus: targetStatus,
        assignedStaffName: adminUser?.name || 'Factory Staff',
        note: note || `Updated by ${adminUser?.name || 'operator'} in ${selectedDept}.`,
      };

      const res = await api.handoverOrder(order.id, payload);
      if (res.success) {
        setFeedback({ type: 'success', text: `Order #${order.orderNumber} successfully moved to ${targetDept}!` });
        await fetchQueue();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to update job status.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Server error while moving job.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 1. PRESS ROOM: Confirm machine assignment and start printing press run
  const handleStartPressRun = async () => {
    if (!pressOrder) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const job = pressOrder.productionJobs?.[0];
      if (job) {
        const res = await api.updateProductionJobStage(job.id, {
          stage: 'PRINTING',
          assignedStaffName: operatorName,
          machineNumber: selectedMachine,
          priority: pressPriority,
        });
        if (!res.success) throw new Error(res.message || 'Failed to update production job');
      } else {
        const res = await api.handoverOrder(pressOrder.id, {
          targetDepartment: 'PRODUCTION',
          newStatus: 'PRINTING',
          machineNumber: selectedMachine,
          assignedStaffName: operatorName,
          note: `Press run started on machine ${selectedMachine}. Operator: ${operatorName}.`,
        });
        if (!res.success) throw new Error(res.message || 'Failed to update order');
      }

      setFeedback({
        type: 'success',
        text: `Press run started for #${pressOrder.orderNumber} on ${selectedMachine}!`,
      });
      setPressModalOpen(false);
      setPressOrder(null);
      await fetchQueue();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to start press run.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. FINISHING & QC: Submit real QC Inspection (Pass or Reject)
  const handleSubmitQCInspection = async () => {
    if (!selectedQcJob) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const qcTicket = selectedQcJob.qualityChecks?.[0];

      if (qcActionType === 'PASS') {
        const allChecked = Object.values(qcChecklist).every(Boolean);
        if (!allChecked) {
          setFeedback({ type: 'error', text: 'All 8 QC checklist items must be verified to approve this job!' });
          setActionLoading(false);
          return;
        }

        if (qcTicket) {
          const res = await api.submitQCInspection(qcTicket.id, {
            status: 'PASSED',
            checklist: qcChecklist,
            inspectorName: qcInspectorName,
          });
          if (!res.success) throw new Error(res.message || 'QC inspection submission failed');
        } else {
          await handleQuickAdvance(
            selectedQcJob,
            'PACKING',
            'PACKED',
            `Quality inspection PASSED by ${qcInspectorName}. Transferred to Packaging Desk.`
          );
        }

        setFeedback({
          type: 'success',
          text: `QC PASSED for #${selectedQcJob.orderNumber}! Job transferred to Packaging Desk.`,
        });
      } else {
        // REJECT ACTION
        if (!qcFailureNotes.trim()) {
          setFeedback({ type: 'error', text: 'Defect notes are mandatory when rejecting a job for reprint.' });
          setActionLoading(false);
          return;
        }

        if (qcTicket) {
          const res = await api.submitQCInspection(qcTicket.id, {
            status: 'FAILED',
            failureReason: qcFailureReason,
            failureNotes: qcFailureNotes,
            inspectorName: qcInspectorName,
          });
          if (!res.success) throw new Error(res.message || 'QC reject submission failed');
        } else {
          const targetDept = qcFailureReason === 'WRONG_ARTWORK' ? 'DESIGN' : 'PRODUCTION';
          const targetStatus = qcFailureReason === 'WRONG_ARTWORK' ? 'ARTWORK_REQUIRED' : 'PRODUCTION_QUEUE';
          await handleQuickAdvance(
            selectedQcJob,
            targetDept,
            targetStatus,
            `QC FAILED [${qcFailureReason}]: ${qcFailureNotes}. Returned to ${targetDept} by ${qcInspectorName}.`
          );
        }

        setFeedback({
          type: 'error',
          text: `QC REJECTED for #${selectedQcJob.orderNumber}. Job returned for reprint/correction.`,
        });
      }

      setQcModalOpen(false);
      setSelectedQcJob(null);
      await fetchQueue();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to submit QC inspection.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 3. PACKING DESK: Complete packing with parcel weight & dimensions
  const handleCompletePacking = async () => {
    if (!packingOrder) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const weight = parseFloat(packageWeightKg);
      if (isNaN(weight) || weight <= 0) {
        setFeedback({ type: 'error', text: 'Please enter a valid parcel weight in kg (e.g. 0.85).' });
        setActionLoading(false);
        return;
      }
      if (!boxDimensions.trim()) {
        setFeedback({ type: 'error', text: 'Box dimensions are required.' });
        setActionLoading(false);
        return;
      }

      const res = await api.completePacking(packingOrder.id, {
        packageCount: parseInt(packageCount, 10) || 1,
        packageWeightKg: weight,
        boxDimensions: boxDimensions.trim(),
        packingStaffName: adminUser?.name || 'Packaging Staff',
        packingChecklist,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Order #${packingOrder.orderNumber} packed securely (${weight} kg)! Moved to Logistics Dispatch.`,
        });
        setPackingModalOpen(false);
        setPackingOrder(null);
        await fetchQueue();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to complete packing.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Server error while completing packing.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. LOGISTICS: Complete Doorstep Courier Dispatch
  const handleCompleteCourierDispatch = async () => {
    if (!courierOrder) return;
    if (!trackingNumber.trim()) {
      setFeedback({ type: 'error', text: 'AWB / Tracking number is required for courier dispatch.' });
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.dispatchCourier(courierOrder.id, {
        courierPartner,
        trackingNumber: trackingNumber.trim(),
        expectedDeliveryDate: expectedDeliveryDate || null,
        dispatchStaffName: adminUser?.name || 'Dispatch Executive',
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Order #${courierOrder.orderNumber} dispatched via ${courierPartner} (AWB: ${trackingNumber})!`,
        });
        setCourierModalOpen(false);
        setCourierOrder(null);
        await fetchQueue();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to record courier dispatch.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Server error during courier dispatch.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 5. LOGISTICS: Complete Store Pickup Handover with Balance Check
  const handleCompletePickupHandover = async () => {
    if (!pickupOrder) return;
    if (!pickupCustomerName.trim()) {
      setFeedback({ type: 'error', text: 'Verified customer name is required for pickup handover.' });
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    try {
      const invoice = pickupOrder.invoices?.[0];
      const balanceDue = invoice ? invoice.balanceDue : 0;

      const payload = {
        verifiedCustomerName: pickupCustomerName.trim(),
        handoverStaffName: pickupStaffName || adminUser?.name || 'Store Manager',
        collectBalanceAtCounter: balanceDue > 0 ? collectBalanceAtCounter : false,
        counterPaymentMethod,
        counterPaymentReference: counterPaymentReference.trim(),
        counterPaymentNotes: counterPaymentNotes.trim(),
      };

      const res = await api.handoverStorePickup(pickupOrder.id, payload);

      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Store pickup completed for #${pickupOrder.orderNumber}! Handed over to ${pickupCustomerName}.`,
        });
        setPickupModalOpen(false);
        setPickupOrder(null);
        await fetchQueue();
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to complete store pickup handover.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Server error during store pickup handover.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-6">
      {/* Executive Workstation Header */}
      <div className="max-w-5xl mx-auto mb-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              PRINT BAZZAR
            </span>
            <span className="px-2.5 py-0.5 bg-yellow-400 text-black text-[10px] font-black uppercase rounded-md tracking-wider">
              Workstation Hub
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Logged in: <span className="font-bold text-gray-800">{adminUser?.name || 'Staff Member'}</span> • Department:{' '}
            <span className="font-bold text-purple-700">{adminUser?.department || 'ALL'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="xs"
            color="light"
            onClick={fetchQueue}
            disabled={loading || actionLoading}
            className="flex items-center gap-1 shadow-xs"
          >
            <HiOutlineRefresh className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button as={Link} to="/admin/dashboard" size="xs" color="dark">
            Admin Panel
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`max-w-5xl mx-auto mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="ml-2 font-black text-sm">
            ×
          </button>
        </div>
      )}

      {/* Department Tabs (Interactive Workstation Selector) */}
      <div className="max-w-5xl mx-auto mb-4 overflow-x-auto pb-1 flex gap-2 no-scrollbar">
        {DEPARTMENTS.map((dept) => {
          const count = orders[dept.key]?.length || 0;
          const isActive = selectedDept === dept.key;
          return (
            <button
              key={dept.key}
              onClick={() => setSelectedDept(dept.key)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xs ${
                isActive
                  ? 'bg-black text-white shadow-md ring-2 ring-yellow-400'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span>{dept.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Search & Filter Bar */}
      <div className="max-w-5xl mx-auto mb-4 bg-white rounded-xl border border-gray-200 p-2.5 shadow-2xs flex items-center gap-2">
        <HiOutlineSearch className="w-4 h-4 text-gray-400 ml-1" />
        <input
          type="text"
          placeholder="Filter by Order #, Customer Name, Mobile, Product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs border-0 focus:ring-0 text-gray-800 placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-gray-400 hover:text-black font-bold mr-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Queue List */}
      <div className="max-w-5xl mx-auto space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-xs border border-gray-200">
            <Spinner size="lg" />
            <p className="mt-3 text-xs text-gray-500 font-semibold">Loading department jobs...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300 shadow-xs">
            <span className="text-3xl">🎉</span>
            <h3 className="text-sm font-bold text-gray-800 mt-2">No active jobs in this workstation!</h3>
            <p className="text-xs text-gray-500 mt-1">All orders for this department are up to date.</p>
          </div>
        ) : (
          currentList.map((order) => {
            const isUrgent = order.deliveryType === 'SAME_DAY' || order.orderStatus === 'PRINTING';
            const isPickup = order.deliveryMethod === 'STORE_PICKUP';
            const invoice = order.invoices?.[0];
            const balanceDue = invoice ? invoice.balanceDue : 0;
            const productionJob = order.productionJobs?.[0];

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-5 transition-all hover:shadow-md"
              >
                {/* Header Row: Order ID, Customer & Badges */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3 mb-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-black text-gray-900">
                        {order.orderNumber}
                      </span>
                      {productionJob?.jobNumber && (
                        <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold">
                          Job: {productionJob.jobNumber}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 block mt-0.5">
                      Customer: <strong>{order.customerName}</strong> ({order.customerMobile || 'No Mobile'})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Badge color={isPickup ? 'indigo' : 'info'} size="xs">
                      {isPickup ? '🏬 Store Pickup' : '🚚 Doorstep Courier'}
                    </Badge>
                    <Badge color={isUrgent ? 'failure' : 'warning'} size="xs">
                      {order.orderStatus}
                    </Badge>
                    {balanceDue > 0 ? (
                      <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                        Due: ₹{balanceDue}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full">
                        Fully Paid
                      </span>
                    )}
                  </div>
                </div>

                {/* Items & Specifications Summary */}
                <div className="mb-3 space-y-2">
                  {order.items?.map((it, i) => (
                    <div key={i} className="text-xs bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <div className="flex justify-between font-bold text-gray-900">
                        <span>{it.productNameSnapshot || it.product?.name}</span>
                        <span className="text-amber-700 font-extrabold">Qty: {it.quantity}</span>
                      </div>
                      {it.selectedOptionsJson && (
                        <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                          {typeof it.selectedOptionsJson === 'string'
                            ? it.selectedOptionsJson
                            : JSON.stringify(it.selectedOptionsJson)}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2">
                        {it.artworkFileUrl && (
                          <a
                            href={it.artworkFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
                          >
                            <HiOutlinePhotograph className="w-3.5 h-3.5" /> Client Artwork
                          </a>
                        )}
                        {order.proofFileUrl && (
                          <a
                            href={order.proofFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-purple-600 font-bold hover:underline"
                          >
                            <HiOutlineSparkles className="w-3.5 h-3.5" /> Approved Proof
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Operational Action Bar */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  {/* Common Tools: Job Card, Shipping Label, Full Details */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setJobCardOrder(order);
                        setJobCardModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-200 transition-colors"
                    >
                      <HiOutlineDocumentText className="w-3.5 h-3.5" /> Job Card
                    </button>
                    <button
                      onClick={() => {
                        setShippingLabelOrder(order);
                        setShippingModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <HiOutlineTag className="w-3.5 h-3.5" /> Box Label
                    </button>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Order Details →
                    </Link>
                  </div>

                  {/* Department-Specific Floor Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 1. PREPRESS & DESIGN WORKSTATION ACTIONS */}
                    {selectedDept === 'DESIGN' && (
                      <Button
                        size="xs"
                        color="purple"
                        disabled={actionLoading}
                        onClick={() => {
                          setSelectedPreQcOrder(order);
                          setPreQcModalOpen(true);
                        }}
                      >
                        <HiOutlineClipboardCheck className="w-3.5 h-3.5 mr-1" />
                        Pre-Production QC Gate →
                      </Button>
                    )}

                    {/* 2. PRESS ROOM WORKSTATION ACTIONS */}
                    {selectedDept === 'PRODUCTION' && (
                      <>
                        {order.orderStatus === 'PRE_PRODUCTION_QC' ? (
                          <Button
                            size="xs"
                            color="purple"
                            disabled={actionLoading}
                            onClick={() => {
                              setSelectedPreQcOrder(order);
                              setPreQcModalOpen(true);
                            }}
                          >
                            <HiOutlineClipboardCheck className="w-3.5 h-3.5 mr-1" />
                            Prepress QC Verification
                          </Button>
                        ) : order.orderStatus === 'PRINTING' ? (
                          <Button
                            size="xs"
                            color="indigo"
                            disabled={actionLoading}
                            onClick={() =>
                              handleQuickAdvance(
                                order,
                                'FINISHING_QC',
                                'FINISHING',
                                `Printing press run completed by ${adminUser?.name || 'operator'}. Transferred to Finishing & QC.`
                              )
                            }
                          >
                            Printing Done → Handover to Finishing
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            color="warning"
                            disabled={actionLoading}
                            onClick={() => {
                              setPressOrder(order);
                              setOperatorName(adminUser?.name || 'Press Operator');
                              setPressModalOpen(true);
                            }}
                          >
                            <HiOutlinePrinter className="w-3.5 h-3.5 mr-1" />
                            ▶ Start Printing Press
                          </Button>
                        )}
                      </>
                    )}

                    {/* 3. FINISHING & QC WORKSTATION ACTIONS */}
                    {selectedDept === 'FINISHING_QC' && (
                      <>
                        {order.orderStatus === 'FINISHING' ? (
                          <Button
                            size="xs"
                            color="purple"
                            disabled={actionLoading}
                            onClick={() =>
                              handleQuickAdvance(
                                order,
                                'FINISHING_QC',
                                'QC',
                                'Finishing stage (lamination, trimming, folding) completed. Transferred to Quality Inspection.'
                              )
                            }
                          >
                            ✂️ Finishing Done → Move to QC
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            color="purple"
                            disabled={actionLoading}
                            onClick={() => {
                              setSelectedQcJob(order);
                              setQcActionType('PASS');
                              setQcModalOpen(true);
                            }}
                          >
                            <HiOutlineClipboardCheck className="w-3.5 h-3.5 mr-1" />
                            Open QC Inspection
                          </Button>
                        )}
                      </>
                    )}

                    {/* 4. PACKAGING DESK WORKSTATION ACTIONS */}
                    {selectedDept === 'PACKING' && (
                      <Button
                        size="xs"
                        color="dark"
                        disabled={actionLoading}
                        onClick={() => {
                          setPackingOrder(order);
                          setPackageCount(1);
                          setPackageWeightKg('0.50');
                          setBoxDimensions('30x20x10 cm');
                          setPackingModalOpen(true);
                        }}
                      >
                        📦 Pack Box & Weigh →
                      </Button>
                    )}

                    {/* 5. LOGISTICS & DISPATCH WORKSTATION ACTIONS */}
                    {selectedDept === 'DELIVERY' && (
                      <>
                        {isPickup ? (
                          <Button
                            size="xs"
                            color="purple"
                            disabled={actionLoading}
                            onClick={() => {
                              setPickupOrder(order);
                              setPickupCustomerName(order.customerName || '');
                              setPickupStaffName(adminUser?.name || 'Store Manager');
                              setPickupModalOpen(true);
                            }}
                          >
                            🏬 Counter Pickup Handover
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            color="blue"
                            disabled={actionLoading}
                            onClick={() => {
                              setCourierOrder(order);
                              setCourierPartner(order.courierPartner || COURIER_PARTNERS[1]);
                              setTrackingNumber(order.trackingReference || '');
                              setCourierModalOpen(true);
                            }}
                          >
                            <HiOutlineTruck className="w-3.5 h-3.5 mr-1" />
                            Dispatch Courier
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================= */}
      {/* 1. PRESS ROOM: MACHINE ASSIGNMENT & PRINT RUN MODAL     */}
      {/* ======================================================= */}
      <Modal show={pressModalOpen} onClose={() => setPressModalOpen(false)} size="md">
        <Modal.Header>
          <span className="font-bold text-gray-900">
            🖨️ Start Press Run — #{pressOrder?.orderNumber}
          </span>
        </Modal.Header>
        <Modal.Body className="space-y-3">
          <div>
            <Label htmlFor="machine" className="text-xs font-bold mb-1">
              Select Press Machine
            </Label>
            <Select
              id="machine"
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              size="sm"
            >
              {PRESS_MACHINES.map((m, idx) => (
                <option key={idx} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="operator" className="text-xs font-bold mb-1">
              Operator Name
            </Label>
            <TextInput
              id="operator"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="e.g. Suresh Kumar"
              size="sm"
            />
          </div>

          <div>
            <Label htmlFor="priority" className="text-xs font-bold mb-1">
              Job Priority
            </Label>
            <Select
              id="priority"
              value={pressPriority}
              onChange={(e) => setPressPriority(e.target.value)}
              size="sm"
            >
              <option value="STANDARD">Standard</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent (Express)</option>
            </Select>
          </div>
        </Modal.Body>
        <Modal.Footer className="flex justify-end gap-2">
          <Button color="gray" size="xs" onClick={() => setPressModalOpen(false)}>
            Cancel
          </Button>
          <Button color="warning" size="xs" onClick={handleStartPressRun} disabled={actionLoading}>
            ▶ Confirm & Start Press Run
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ======================================================= */}
      {/* 2. FINISHING & QC: QUALITY CONTROL INSPECTION MODAL     */}
      {/* ======================================================= */}
      <Modal show={qcModalOpen} onClose={() => setQcModalOpen(false)} size="lg">
        <Modal.Header>
          <span className="font-bold text-gray-900">
            🔍 Quality Control Inspection — #{selectedQcJob?.orderNumber}
          </span>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <div className="flex gap-2 border-b pb-2">
            <button
              onClick={() => setQcActionType('PASS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                qcActionType === 'PASS'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ✓ Pass QC & Approve
            </button>
            <button
              onClick={() => setQcActionType('REJECT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                qcActionType === 'REJECT'
                  ? 'bg-rose-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ✕ Reject & Return for Reprint
            </button>
          </div>

          <div>
            <Label className="text-xs font-bold mb-1">QC Inspector Name</Label>
            <TextInput
              size="sm"
              value={qcInspectorName}
              onChange={(e) => setQcInspectorName(e.target.value)}
              placeholder="e.g. Ramesh (QC Lead)"
            />
          </div>

          {qcActionType === 'PASS' ? (
            <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <p className="text-xs font-bold text-gray-700 mb-2">
                Mandatory QC Checklist (All 8 checks must pass):
              </p>
              {[
                { key: 'correctQuantity', label: '1. Exact Count & Quantity Verified' },
                { key: 'correctSize', label: '2. Size, Trimming & Dimensions Accurate' },
                { key: 'correctMaterial', label: '3. Paper Stock, GSM & Substrate Verified' },
                { key: 'correctColour', label: '4. Colors Sharp, No Banding / Smudging' },
                { key: 'correctLamination', label: '5. Lamination & UV Finish Intact' },
                { key: 'correctFinishing', label: '6. Folding / Creasing / Die-cut Clean' },
                { key: 'noDamage', label: '7. Zero Scratches / Physical Defects' },
                { key: 'matchesApprovedArtwork', label: '8. 100% Matches Approved Proof' },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <Checkbox
                    id={item.key}
                    checked={qcChecklist[item.key]}
                    onChange={(e) =>
                      setQcChecklist({ ...qcChecklist, [item.key]: e.target.checked })
                    }
                  />
                  <Label htmlFor={item.key} className="text-xs font-medium text-gray-800 cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 bg-rose-50/60 p-3.5 rounded-xl border border-rose-200">
              <div>
                <Label className="text-xs font-bold mb-1 text-rose-900">
                  Defect Classification (Reason for Rejection)
                </Label>
                <Select
                  size="sm"
                  value={qcFailureReason}
                  onChange={(e) => setQcFailureReason(e.target.value)}
                >
                  <option value="COLOUR_ISSUE">Colour Issue / Banding / Streaks</option>
                  <option value="CUTTING_ERROR">Cutting / Trimming / Alignment Error</option>
                  <option value="LAMINATION_BLEMISH">Lamination Bubbles / Peeling / Scratches</option>
                  <option value="WRONG_ARTWORK">Wrong Artwork / Design Version Mismatch</option>
                  <option value="QUANTITY_MISMATCH">Short Quantity / Missing Sheets</option>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1 text-rose-900">
                  Defect Notes & Correction Instructions
                </Label>
                <Textarea
                  rows={3}
                  value={qcFailureNotes}
                  onChange={(e) => setQcFailureNotes(e.target.value)}
                  placeholder="e.g. Front side yellow ink banding on 500 cards. Please reprint on Digital Press."
                  className="text-xs"
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="flex justify-end gap-2">
          <Button color="gray" size="xs" onClick={() => setQcModalOpen(false)}>
            Cancel
          </Button>
          {qcActionType === 'PASS' ? (
            <Button
              color="purple"
              size="xs"
              onClick={handleSubmitQCInspection}
              disabled={actionLoading}
            >
              <HiOutlineCheckCircle className="w-4 h-4 mr-1" />
              Approve & Transfer to Packing
            </Button>
          ) : (
            <Button
              color="failure"
              size="xs"
              onClick={handleSubmitQCInspection}
              disabled={actionLoading}
            >
              <HiOutlineBan className="w-4 h-4 mr-1" />
              Reject & Return for Reprint
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* ======================================================= */}
      {/* 3. PACKING DESK: PARCEL WEIGHING & PACKING MODAL        */}
      {/* ======================================================= */}
      <Modal show={packingModalOpen} onClose={() => setPackingModalOpen(false)} size="md">
        <Modal.Header>
          <span className="font-bold text-gray-900">
            📦 Complete Packaging — #{packingOrder?.orderNumber}
          </span>
        </Modal.Header>
        <Modal.Body className="space-y-3">
          <p className="text-xs text-gray-500">
            Record exact parcel weight and box dimensions to finalize package:
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold mb-1">Package Count</Label>
              <TextInput
                type="number"
                min="1"
                size="sm"
                value={packageCount}
                onChange={(e) => setPackageCount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1">Actual Weight (kg)</Label>
              <TextInput
                type="number"
                step="0.05"
                size="sm"
                value={packageWeightKg}
                onChange={(e) => setPackageWeightKg(e.target.value)}
                placeholder="e.g. 0.85"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold mb-1">Box Dimensions</Label>
            <TextInput
              size="sm"
              value={boxDimensions}
              onChange={(e) => setBoxDimensions(e.target.value)}
              placeholder="e.g. 30x20x10 cm"
            />
            <div className="flex gap-1.5 mt-1.5">
              {['25x15x10 cm', '30x20x10 cm', '35x25x15 cm', '45x35x25 cm'].map((dim) => (
                <button
                  key={dim}
                  type="button"
                  onClick={() => setBoxDimensions(dim)}
                  className="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded text-gray-700"
                >
                  {dim}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <Label className="text-xs font-bold block mb-1">Packaging Checklist:</Label>
            {[
              { key: 'bubbleWrapApplied', label: 'Bubble wrap / moisture barrier protected' },
              { key: 'invoiceEnclosed', label: 'Order invoice / packing slip enclosed' },
              { key: 'tapeSecured', label: 'High-strength box tape firmly sealed' },
            ].map((it) => (
              <div key={it.key} className="flex items-center gap-2">
                <Checkbox
                  id={it.key}
                  checked={packingChecklist[it.key]}
                  onChange={(e) =>
                    setPackingChecklist({ ...packingChecklist, [it.key]: e.target.checked })
                  }
                />
                <Label htmlFor={it.key} className="text-xs font-medium text-gray-700 cursor-pointer">
                  {it.label}
                </Label>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer className="flex justify-end gap-2">
          <Button color="gray" size="xs" onClick={() => setPackingModalOpen(false)}>
            Cancel
          </Button>
          <Button color="dark" size="xs" onClick={handleCompletePacking} disabled={actionLoading}>
            📦 Box Packed → Ready for Dispatch
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ======================================================= */}
      {/* 4. LOGISTICS: DOORSTEP COURIER DISPATCH MODAL           */}
      {/* ======================================================= */}
      <Modal show={courierModalOpen} onClose={() => setCourierModalOpen(false)} size="md">
        <Modal.Header>
          <span className="font-bold text-gray-900">
            🚚 Doorstep Courier Dispatch — #{courierOrder?.orderNumber}
          </span>
        </Modal.Header>
        <Modal.Body className="space-y-3">
          <div>
            <Label className="text-xs font-bold mb-1">Courier Partner</Label>
            <Select
              size="sm"
              value={courierPartner}
              onChange={(e) => setCourierPartner(e.target.value)}
            >
              {COURIER_PARTNERS.map((cp, idx) => (
                <option key={idx} value={cp}>
                  {cp}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold mb-1">Tracking / AWB Number</Label>
            <TextInput
              size="sm"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. ST12345678 or DTDC987654"
            />
          </div>

          <div>
            <Label className="text-xs font-bold mb-1">Expected Delivery Date (Optional)</Label>
            <TextInput
              type="date"
              size="sm"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="flex justify-end gap-2">
          <Button color="gray" size="xs" onClick={() => setCourierModalOpen(false)}>
            Cancel
          </Button>
          <Button
            color="blue"
            size="xs"
            onClick={handleCompleteCourierDispatch}
            disabled={actionLoading}
          >
            <HiOutlineTruck className="w-3.5 h-3.5 mr-1" />
            Complete Dispatch
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ======================================================= */}
      {/* 5. LOGISTICS: TRICHY STORE PICKUP HANDOVER MODAL        */}
      {/* ======================================================= */}
      <Modal show={pickupModalOpen} onClose={() => setPickupModalOpen(false)} size="md">
        <Modal.Header>
          <span className="font-bold text-gray-900">
            🏬 Store Pickup Handover — #{pickupOrder?.orderNumber}
          </span>
        </Modal.Header>
        <Modal.Body className="space-y-3">
          {/* Financial & Balance Card */}
          {(() => {
            const invoice = pickupOrder?.invoices?.[0];
            const balanceDue = invoice ? invoice.balanceDue : 0;
            const isFullyPaid = balanceDue <= 0 || pickupOrder?.paymentStatus === 'PAID';

            return (
              <div
                className={`p-3.5 rounded-xl border text-xs ${
                  isFullyPaid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex justify-between font-bold">
                  <span>Order Total: ₹{pickupOrder?.grandTotal}</span>
                  <span>Balance Due: ₹{balanceDue}</span>
                </div>

                {isFullyPaid ? (
                  <p className="mt-1 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <HiOutlineCheckCircle className="w-4 h-4" /> 100% Fully Paid. Ready for handover.
                  </p>
                ) : (
                  <div className="mt-2.5 pt-2.5 border-t border-amber-200 space-y-2">
                    <p className="text-[11px] font-bold text-amber-900">
                      ⚠️ Outstanding balance of ₹{balanceDue} must be collected at counter:
                    </p>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="collectBal"
                        checked={collectBalanceAtCounter}
                        onChange={(e) => setCollectBalanceAtCounter(e.target.checked)}
                      />
                      <Label htmlFor="collectBal" className="text-xs font-bold text-amber-900 cursor-pointer">
                        Collect Balance at Counter Now
                      </Label>
                    </div>

                    {collectBalanceAtCounter && (
                      <div className="space-y-2 pt-1">
                        <div>
                          <Label className="text-[11px] font-bold mb-1">Payment Method</Label>
                          <Select
                            size="sm"
                            value={counterPaymentMethod}
                            onChange={(e) => setCounterPaymentMethod(e.target.value)}
                          >
                            <option value="CASH">Cash at Counter</option>
                            <option value="UPI">UPI / GPay / PhonePe</option>
                            <option value="CARD">Card POS Terminal</option>
                            <option value="OTHER">Other / Bank Transfer</option>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] font-bold mb-1">Reference / UTR (Optional)</Label>
                          <TextInput
                            size="sm"
                            value={counterPaymentReference}
                            onChange={(e) => setCounterPaymentReference(e.target.value)}
                            placeholder="e.g. Cash Receipt # or UPI UTR"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] font-bold mb-1">Counter Notes (Optional)</Label>
                          <TextInput
                            size="sm"
                            value={counterPaymentNotes}
                            onChange={(e) => setCounterPaymentNotes(e.target.value)}
                            placeholder="e.g. Paid in full to manager"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div>
            <Label className="text-xs font-bold mb-1">Verified Customer / Collector Name</Label>
            <TextInput
              size="sm"
              value={pickupCustomerName}
              onChange={(e) => setPickupCustomerName(e.target.value)}
              placeholder="e.g. Karthik Selvam"
            />
          </div>

          <div>
            <Label className="text-xs font-bold mb-1">Handover Staff Sign-off</Label>
            <TextInput
              size="sm"
              value={pickupStaffName}
              onChange={(e) => setPickupStaffName(e.target.value)}
              placeholder="e.g. Store Executive"
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="flex justify-end gap-2">
          <Button color="gray" size="xs" onClick={() => setPickupModalOpen(false)}>
            Cancel
          </Button>
          <Button
            color="purple"
            size="xs"
            onClick={handleCompletePickupHandover}
            disabled={actionLoading}
          >
            🏬 Complete Handover
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ======================================================= */}
      {/* 6. MODALS: SHIPPING LABEL, JOB CARD & PRE-PRODUCTION QC */}
      {/* ======================================================= */}
      <ShippingLabelModal
        show={shippingModalOpen}
        onClose={() => {
          setShippingModalOpen(false);
          setShippingLabelOrder(null);
        }}
        order={shippingLabelOrder}
      />

      <JobCardModal
        show={jobCardModalOpen}
        onClose={() => {
          setJobCardModalOpen(false);
          setJobCardOrder(null);
        }}
        order={jobCardOrder}
        job={jobCardOrder?.productionJobs?.[0]}
      />

      <PreProductionQCModal
        show={preQcModalOpen}
        onClose={() => {
          setPreQcModalOpen(false);
          setSelectedPreQcOrder(null);
        }}
        order={selectedPreQcOrder}
        onSuccess={() => {
          setPreQcModalOpen(false);
          setSelectedPreQcOrder(null);
          setFeedback({
            type: 'success',
            text: 'Pre-Production QC Verified! Order released to Press Production Queue.',
          });
          fetchQueue();
        }}
      />
    </div>
  );
}
