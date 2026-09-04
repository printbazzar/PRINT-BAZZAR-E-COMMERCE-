import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Badge, Modal, Spinner, TextInput, Textarea, Checkbox, Label } from 'flowbite-react';
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
} from 'react-icons/hi';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ShippingLabelModal from '../Components/ShippingLabelModal';
import JobCardModal from '../Components/JobCardModal';

const DEPARTMENTS = [
  { key: 'PRODUCTION', label: '🖨️ Press Room', badgeColor: 'warning' },
  { key: 'FINISHING_QC', label: '✂️ Finishing & QC', badgeColor: 'purple' },
  { key: 'PACKING', label: '📦 Packing Desk', badgeColor: 'indigo' },
  { key: 'DELIVERY', label: '🚚 Logistics / Dispatch', badgeColor: 'blue' },
  { key: 'DESIGN', label: '🎨 Prepress Hub', badgeColor: 'pink' },
];

export default function StaffQueue() {
  const { adminUser } = useAuth();
  const [selectedDept, setSelectedDept] = useState(
    adminUser?.department && adminUser.department !== 'ALL' ? adminUser.department : 'PRODUCTION'
  );

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // QC Checklist Modal State
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [checklist, setChecklist] = useState({
    correctQuantity: true,
    correctSize: true,
    correctMaterial: true,
    correctColour: true,
    correctLamination: true,
    noDamage: true,
  });

  // Shipping Label Modal State
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [shippingLabelOrder, setShippingLabelOrder] = useState(null);

  // Job Card Modal State
  const [jobCardModalOpen, setJobCardModalOpen] = useState(false);
  const [jobCardOrder, setJobCardOrder] = useState(null);

  // Dispatch details state
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchDetails, setDispatchDetails] = useState({
    courierPartner: 'ST Courier',
    trackingNumber: '',
  });

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

  const currentList = orders[selectedDept] || [];

  // Quick Action: Advance to Next Stage
  const handleQuickAdvance = async (order, targetDept, targetStatus, note) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const payload = {
        targetDepartment: targetDept,
        newStatus: targetStatus,
        assignedStaffName: adminUser?.name || 'Factory Staff',
        note: note || `Quick update by ${adminUser?.name || 'operator'} in ${selectedDept}.`,
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

  // QC Checklist Submission
  const handlePassQC = async () => {
    if (!selectedJob) return;
    setActionLoading(true);
    try {
      const allChecked = Object.values(checklist).every(Boolean);
      if (!allChecked) {
        setFeedback({ type: 'error', text: 'All QC checklist items must be passed to approve job!' });
        setActionLoading(false);
        return;
      }

      await handleQuickAdvance(
        selectedJob,
        'PACKING',
        'PACKED',
        'Quality inspection passed (100% OK). Transferred to packaging desk.'
      );
      setQcModalOpen(false);
      setSelectedJob(null);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to record QC pass.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Dispatch Submission
  const handleCompleteDispatch = async () => {
    if (!selectedJob) return;
    setActionLoading(true);
    try {
      const payload = {
        targetDepartment: 'COMPLETED',
        newStatus: 'DELIVERED',
        courierPartner: dispatchDetails.courierPartner,
        trackingReference: dispatchDetails.trackingNumber || 'LOCAL-DIRECT',
        note: `Dispatched via ${dispatchDetails.courierPartner}. Tracking: ${
          dispatchDetails.trackingNumber || 'Local express delivery'
        }.`,
      };

      const res = await api.handoverOrder(selectedJob.id, payload);
      if (res.success) {
        setFeedback({ type: 'success', text: `Order #${selectedJob.orderNumber} dispatched and delivered!` });
        setDispatchModalOpen(false);
        setSelectedJob(null);
        await fetchQueue();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to record dispatch.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-4 bg-white rounded-xl shadow-sm border p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-gray-900 tracking-tight">PRINT BAZZAR</span>
            <span className="px-2 py-0.5 bg-yellow-400 text-black text-[10px] font-black uppercase rounded">
              Factory Queue
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Logged in: <span className="font-bold text-gray-800">{adminUser?.name || 'Staff Member'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="xs"
            color="light"
            onClick={fetchQueue}
            disabled={loading || actionLoading}
            className="flex items-center gap-1 shadow-sm"
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
          className={`max-w-4xl mx-auto mb-4 p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-green-100 text-green-900 border border-green-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="ml-2 font-black">
            ×
          </button>
        </div>
      )}

      {/* Department Tabs (Mobile Friendly Scrollable Pills) */}
      <div className="max-w-4xl mx-auto mb-4 overflow-x-auto pb-1 flex gap-2 no-scrollbar">
        {DEPARTMENTS.map((dept) => {
          const count = orders[dept.key]?.length || 0;
          const isActive = selectedDept === dept.key;
          return (
            <button
              key={dept.key}
              onClick={() => setSelectedDept(dept.key)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
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

      {/* Queue List */}
      <div className="max-w-4xl mx-auto space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Spinner size="lg" />
            <p className="mt-3 text-xs text-gray-500 font-semibold">Loading department jobs...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-dashed border-gray-300 shadow-sm">
            <span className="text-3xl">🎉</span>
            <h3 className="text-sm font-bold text-gray-800 mt-2">No jobs waiting in this queue!</h3>
            <p className="text-xs text-gray-500 mt-1">All current orders in this department are completed.</p>
          </div>
        ) : (
          currentList.map((order) => {
            const firstItem = order.items?.[0];
            const isUrgent = order.deliveryType === 'SAME_DAY' || order.orderStatus === 'PRINTING';

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 transition-all hover:shadow-md"
              >
                {/* Top Row: Order # & Badges */}
                <div className="flex justify-between items-start border-b pb-2 mb-2.5 gap-2">
                  <div>
                    <span className="text-xs font-mono font-black text-gray-900">{order.orderNumber}</span>
                    <span className="text-[11px] text-gray-500 block">Customer: {order.customerName}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    <Badge color={isUrgent ? 'failure' : 'gray'} size="xs">
                      {order.deliveryMethod || 'COURIER'}
                    </Badge>
                    <Badge color="warning" size="xs">
                      {order.orderStatus}
                    </Badge>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="mb-3 space-y-1">
                  {order.items?.map((it, i) => (
                    <div key={i} className="text-xs bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <div className="flex justify-between font-bold text-gray-900">
                        <span>{it.productNameSnapshot || it.product?.name}</span>
                        <span className="text-yellow-600">Qty: {it.quantity}</span>
                      </div>
                      {it.selectedOptionsJson && (
                        <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                          {typeof it.selectedOptionsJson === 'string'
                            ? it.selectedOptionsJson
                            : JSON.stringify(it.selectedOptionsJson)}
                        </p>
                      )}
                      {it.artworkFileUrl && (
                        <a
                          href={it.artworkFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline mt-1"
                        >
                          <HiOutlinePhotograph className="w-3.5 h-3.5" /> View Artwork File
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Bottom Action Bar: Department-Specific Buttons */}
                <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShippingLabelOrder(order);
                        setShippingModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <HiOutlineTag className="w-3.5 h-3.5" /> Shipping Label
                    </button>
                    <button
                      onClick={() => {
                        setJobCardOrder(order);
                        setJobCardModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-200 transition-colors"
                    >
                      <HiOutlineDocumentText className="w-3.5 h-3.5" /> Job Card
                    </button>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Full Details →
                    </Link>
                  </div>

                  {/* Stage-Specific Fast Forward Buttons */}
                  <div className="flex gap-2">
                    {selectedDept === 'DESIGN' && (
                      <Button
                        size="xs"
                        color="purple"
                        disabled={actionLoading}
                        onClick={() =>
                          handleQuickAdvance(
                            order,
                            'PRODUCTION',
                            'PRODUCTION_QUEUE',
                            'Prepress design check approved. Handed over to Press Room.'
                          )
                        }
                      >
                        Approve & Send to Press →
                      </Button>
                    )}

                    {selectedDept === 'PRODUCTION' && (
                      <>
                        {order.orderStatus === 'PRINTING' ? (
                          <Button
                            size="xs"
                            color="indigo"
                            disabled={actionLoading}
                            onClick={() =>
                              handleQuickAdvance(
                                order,
                                'FINISHING_QC',
                                'FINISHING',
                                'Press printing completed. Transferred to Finishing & Lamination.'
                              )
                            }
                          >
                            Printing Done → Send to Finishing
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            color="warning"
                            disabled={actionLoading}
                            onClick={() =>
                              handleQuickAdvance(
                                order,
                                'PRODUCTION',
                                'PRINTING',
                                'Machine operator started press run.'
                              )
                            }
                          >
                            ▶ Start Printing Press
                          </Button>
                        )}
                      </>
                    )}

                    {selectedDept === 'FINISHING_QC' && (
                      <Button
                        size="xs"
                        color="purple"
                        disabled={actionLoading}
                        onClick={() => {
                          setSelectedJob(order);
                          setQcModalOpen(true);
                        }}
                      >
                        <HiOutlineClipboardCheck className="w-4 h-4 mr-1" /> Open QC Checklist
                      </Button>
                    )}

                    {selectedDept === 'PACKING' && (
                      <Button
                        size="xs"
                        color="dark"
                        disabled={actionLoading}
                        onClick={() =>
                          handleQuickAdvance(
                            order,
                            'DELIVERY',
                            'READY_FOR_DELIVERY',
                            'Packed securely with label. Ready for courier pickup.'
                          )
                        }
                      >
                        📦 Box Packed → Ready for Dispatch
                      </Button>
                    )}

                    {selectedDept === 'DELIVERY' && (
                      <Button
                        size="xs"
                        color="blue"
                        disabled={actionLoading}
                        onClick={() => {
                          setSelectedJob(order);
                          setDispatchDetails({
                            courierPartner: order.courierPartner || 'ST Courier',
                            trackingNumber: order.trackingReference || '',
                          });
                          setDispatchModalOpen(true);
                        }}
                      >
                        <HiOutlineTruck className="w-4 h-4 mr-1" /> Mark Dispatched
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QC Checklist Modal */}
      <Modal show={qcModalOpen} onClose={() => setQcModalOpen(false)} size="md">
        <Modal.Header>
          <span className="font-bold text-gray-900">
            🔍 Quality Control Checklist — {selectedJob?.orderNumber}
          </span>
        </Modal.Header>
        <Modal.Body className="space-y-3">
          <p className="text-xs text-gray-500">
            Verify every specification before approving this job for packaging:
          </p>

          <div className="space-y-2.5 bg-gray-50 p-4 rounded-xl border">
            {[
              { key: 'correctQuantity', label: '1. Exact Quantity Verified' },
              { key: 'correctSize', label: '2. Size & Dimensions Accurate' },
              { key: 'correctMaterial', label: '3. Paper Stock & GSM Checked' },
              { key: 'correctColour', label: '4. Colors Sharp & No Banding' },
              { key: 'correctLamination', label: '5. Lamination & UV Finish OK' },
              { key: 'noDamage', label: '6. Zero Scratches / Clean Cut Edge' },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <Checkbox
                  id={item.key}
                  checked={checklist[item.key]}
                  onChange={(e) =>
                    setChecklist({ ...checklist, [item.key]: e.target.checked })
                  }
                />
                <Label htmlFor={item.key} className="text-xs font-semibold text-gray-800 cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer className="flex justify-end gap-2">
          <Button color="gray" size="xs" onClick={() => setQcModalOpen(false)}>
            Cancel
          </Button>
          <Button color="purple" size="xs" onClick={handlePassQC} disabled={actionLoading}>
            <HiOutlineCheckCircle className="w-4 h-4 mr-1" /> Pass QC & Move to Packing
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Dispatch Modal */}
      <Modal show={dispatchModalOpen} onClose={() => setDispatchModalOpen(false)} size="md">
        <Modal.Header>
          <span className="font-bold text-gray-900">🚚 Dispatch Order — {selectedJob?.orderNumber}</span>
        </Modal.Header>
        <Modal.Body className="space-y-3">
          <div>
            <Label htmlFor="courier" className="text-xs font-bold mb-1">
              Courier / Runner
            </Label>
            <TextInput
              id="courier"
              value={dispatchDetails.courierPartner}
              onChange={(e) => setDispatchDetails({ ...dispatchDetails, courierPartner: e.target.value })}
              placeholder="e.g. ST Courier, DTDC, Local Express"
              size="sm"
            />
          </div>
          <div>
            <Label htmlFor="tracking" className="text-xs font-bold mb-1">
              Tracking / AWB Number
            </Label>
            <TextInput
              id="tracking"
              value={dispatchDetails.trackingNumber}
              onChange={(e) => setDispatchDetails({ ...dispatchDetails, trackingNumber: e.target.value })}
              placeholder="e.g. ST12345678"
              size="sm"
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="flex justify-end gap-2">
          <Button color="gray" size="xs" onClick={() => setDispatchModalOpen(false)}>
            Cancel
          </Button>
          <Button color="blue" size="xs" onClick={handleCompleteDispatch} disabled={actionLoading}>
            <HiOutlineTruck className="w-4 h-4 mr-1" /> Complete Dispatch
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Shipping Label Modal */}
      <ShippingLabelModal
        show={shippingModalOpen}
        onClose={() => {
          setShippingModalOpen(false);
          setShippingLabelOrder(null);
        }}
        order={shippingLabelOrder}
      />

      {/* Factory Job Card Modal */}
      <JobCardModal
        show={jobCardModalOpen}
        onClose={() => {
          setJobCardModalOpen(false);
          setJobCardOrder(null);
        }}
        order={jobCardOrder}
        job={jobCardOrder?.productionJobs?.[0]}
      />
    </div>
  );
}
