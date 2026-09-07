import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, Select, TextInput, Textarea, Spinner, Badge } from 'flowbite-react';
import {
  HiOutlineRefresh,
  HiOutlineArrowRight,
  HiOutlineUser,
  HiOutlinePhotograph,
  HiOutlineTruck,
  HiOutlineEye,
  HiOutlinePrinter,
  HiOutlineSparkles,
  HiOutlineFilter,
} from 'react-icons/hi';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PreProductionQCModal from '../Components/PreProductionQCModal';
import OrderSourceBadge from '../Components/OrderSourceBadge';

const DEPARTMENTS = [
  {
    key: 'DESIGN',
    title: '🎨 1. Design & Prepress',
    desc: 'Artwork inspection & proofing',
    color: 'border-purple-300 bg-purple-50/50 text-purple-900',
    headerBg: 'bg-purple-100 text-purple-900',
  },
  {
    key: 'PRODUCTION',
    title: '🖨️ 2. Press Production',
    desc: 'Offset / Digital printing',
    color: 'border-yellow-300 bg-yellow-50/50 text-yellow-900',
    headerBg: 'bg-yellow-100 text-yellow-900',
  },
  {
    key: 'FINISHING_QC',
    title: '✂️ 3. Finishing & QC',
    desc: 'Lamination, cutting & inspection',
    color: 'border-indigo-300 bg-indigo-50/50 text-indigo-900',
    headerBg: 'bg-indigo-100 text-indigo-900',
  },
  {
    key: 'PACKING',
    title: '📦 4. Packaging Desk',
    desc: 'Box packing & shipping label',
    color: 'border-orange-300 bg-orange-50/50 text-orange-900',
    headerBg: 'bg-orange-100 text-orange-900',
  },
  {
    key: 'DELIVERY',
    title: '🚚 5. Logistics & Delivery',
    desc: 'Courier tracking & local dispatch',
    color: 'border-blue-300 bg-blue-50/50 text-blue-900',
    headerBg: 'bg-blue-100 text-blue-900',
  },
  {
    key: 'COMPLETED',
    title: '✅ 6. Completed',
    desc: 'Delivered orders',
    color: 'border-green-300 bg-green-50/50 text-green-900',
    headerBg: 'bg-green-100 text-green-900',
  },
];

const PRESS_MACHINES = [
  'Heidelberg Speedmaster 4-Color Offset',
  'Konica Minolta AccurioPress C4080',
  'Roland TrueVIS Eco-Solvent Large Format',
  'Polar High-Speed Programmable Cutter',
  'Autobond Thermal Lamination Machine',
  'Duplo Semi-Automatic Creaser & Folder',
];

const STAFF_LIST = [
  'Arun (Prepress Designer)',
  'Karthik (Graphic Designer)',
  'Suresh (Offset Master)',
  'Murugan (Digital Press Operator)',
  'Ramesh (Finishing & QC)',
  'Vicky (Packing Supervisor)',
  'Saravanan (Local Delivery Boy)',
];

export default function AdminWorkflowBoard() {
  const { adminUser } = useAuth();
  const initialDept = adminUser?.department && adminUser.department !== 'ALL' ? adminUser.department : 'ALL';

  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState(initialDept);

  // Handover Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedQcOrder, setSelectedQcOrder] = useState(null);
  const [preQcModalOpen, setPreQcModalOpen] = useState(false);
  const [targetDept, setTargetDept] = useState('PRODUCTION');
  const [targetStatus, setTargetStatus] = useState('PRINTING');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [assignedMachine, setAssignedMachine] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [courierName, setCourierName] = useState('ST Courier');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [handoverNote, setHandoverNote] = useState('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchBoard();
  }, []);

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const res = await api.getWorkflowBoard();
      if (res.success && res.data) {
        setBoardData(res.data);
      }
    } catch (err) {
      console.error('Error loading workflow board:', err);
    } finally {
      setLoading(false);
    }
  };

  const openHandover = (order, currentDept) => {
    setSelectedOrder(order);

    // Predict sensible next department
    let nextDept = 'PRODUCTION';
    let nextStatus = 'PRE_PRODUCTION_QC';

    if (currentDept === 'DESIGN') {
      nextDept = 'PRODUCTION';
      nextStatus = 'PRE_PRODUCTION_QC';
    } else if (currentDept === 'PRODUCTION') {
      nextDept = 'FINISHING_QC';
      nextStatus = 'FINISHING';
    } else if (currentDept === 'FINISHING_QC') {
      nextDept = 'PACKING';
      nextStatus = 'PACKING';
    } else if (currentDept === 'PACKING') {
      nextDept = 'DELIVERY';
      nextStatus = 'OUT_FOR_DELIVERY';
    } else if (currentDept === 'DELIVERY') {
      nextDept = 'COMPLETED';
      nextStatus = 'DELIVERED';
    }

    setTargetDept(nextDept);
    setTargetStatus(nextStatus);
    setAssignedStaff(order.assignedStaffName || STAFF_LIST[0]);
    setAssignedMachine(order.machineNumber || PRESS_MACHINES[0]);
    setProofUrl(order.proofFileUrl || '');
    setTrackingNumber(order.trackingReference || '');
    setHandoverNote('');
    setHandoverModalOpen(true);
  };

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsSubmittingHandover(true);
    try {
      const res = await api.handoverOrder(selectedOrder.id, {
        targetDepartment: targetDept,
        newStatus: targetStatus,
        assignedStaffName: assignedStaff,
        machineNumber: assignedMachine,
        proofFileUrl: proofUrl,
        courierPartner: courierName,
        trackingReference: trackingNumber,
        note: handoverNote,
      });

      if (res.success) {
        setFeedback(`Order ${selectedOrder.orderNumber} handed over to ${targetDept}!`);
        setHandoverModalOpen(false);
        fetchBoard();
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      alert(err.message || 'Handover failed.');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900">In-House Department Workflow</h1>
            <span className="bg-yellow-400 text-black text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
              LIVE ERP KANBAN
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time multi-department pipeline from Design ➔ Printing Press ➔ Finishing ➔ Packing ➔ Delivery
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="xs"
            color="light"
            onClick={fetchBoard}
            className="flex items-center gap-1 font-semibold"
          >
            <HiOutlineRefresh className="w-4 h-4 mr-1" /> Refresh Pipeline
          </Button>
          <Button
            as={Link}
            to="/admin/orders"
            color="dark"
            size="xs"
            className="bg-black text-white font-bold"
          >
            Orders Table View
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-bold p-3 rounded-xl">
          ✔ {feedback}
        </div>
      )}

      {/* Department Filter Selector Pills */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="text-xs font-bold text-gray-500 flex items-center gap-1 mr-1">
          <HiOutlineFilter className="w-4 h-4" /> Filter View:
        </span>
        <button
          type="button"
          onClick={() => setSelectedDeptFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
            selectedDeptFilter === 'ALL'
              ? 'bg-black text-white shadow-xs'
              : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          All Departments (6 Columns)
        </button>
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept.key}
            type="button"
            onClick={() => setSelectedDeptFilter(dept.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              selectedDeptFilter === dept.key
                ? 'bg-yellow-400 text-black shadow-xs font-black ring-1 ring-yellow-500'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            {dept.title.split(' ')[0]} {dept.title.split(' ')[1]} ({boardData?.summary?.byDepartment[dept.key] || 0})
          </button>
        ))}
      </div>

      {/* Summary KPI Badges */}
      {boardData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DEPARTMENTS.map((d) => (
            <div
              key={d.key}
              onClick={() => setSelectedDeptFilter(d.key)}
              className={`bg-white p-3.5 rounded-xl border shadow-2xs text-center cursor-pointer transition-all ${
                selectedDeptFilter === d.key ? 'border-yellow-400 ring-2 ring-yellow-400/40 scale-102' : 'hover:border-gray-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-gray-400 block">{d.title.split(' ')[1]}</span>
              <span className="text-xl font-black text-gray-900 mt-0.5 block">
                {boardData.summary.byDepartment[d.key] || 0}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">active jobs</span>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Board Horizontal Columns */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Spinner size="xl" />
          <p className="mt-3 text-xs text-gray-500 font-medium">Loading department board...</p>
        </div>
      ) : (
        <div className={`grid gap-4 overflow-x-auto pb-4 ${
          selectedDeptFilter === 'ALL'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
            : 'grid-cols-1 max-w-2xl'
        }`}>
          {(selectedDeptFilter === 'ALL' ? DEPARTMENTS : DEPARTMENTS.filter((d) => d.key === selectedDeptFilter)).map((dept) => {
            const ordersInDept = boardData?.columns[dept.key] || [];
            return (
              <div
                key={dept.key}
                className="bg-gray-100 rounded-2xl border border-gray-200 flex flex-col min-w-[240px] max-h-[75vh]"
              >
                {/* Column Header */}
                <div className={`p-3.5 rounded-t-2xl border-b flex justify-between items-center ${dept.headerBg}`}>
                  <div>
                    <h3 className="font-extrabold text-xs leading-tight">{dept.title}</h3>
                    <p className="text-[9px] opacity-80 mt-0.5">{dept.desc}</p>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-white/90 text-gray-900 font-black text-xs flex items-center justify-center shadow-2xs">
                    {ordersInDept.length}
                  </span>
                </div>

                {/* Column Order Cards */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {ordersInDept.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-gray-400 italic">
                      No jobs in this queue
                    </div>
                  ) : (
                    ordersInDept.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs hover:shadow-md transition-all space-y-2 text-xs"
                      >
                        {/* Order Number & Status */}
                        <div className="flex justify-between items-start gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              to={`/admin/orders/${ord.id}`}
                              className="font-black text-gray-900 hover:text-yellow-600 font-mono text-xs block"
                            >
                              {ord.orderNumber}
                            </Link>
                            <OrderSourceBadge source={ord.orderSource} size="xs" />
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 flex-shrink-0">
                            {ord.orderStatus?.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Customer */}
                        <div>
                          <p className="font-bold text-gray-900 text-xs truncate">{ord.customerName}</p>
                          <p className="text-[10px] text-gray-500">{ord.customerMobile}</p>
                        </div>

                        {/* Product Items */}
                        <div className="border-t pt-1.5 space-y-1">
                          {ord.items?.slice(0, 2).map((item) => (
                            <div key={item.id} className="text-[11px] text-gray-700 truncate">
                              • <strong className="text-black">{item.quantity}x</strong> {item.productNameSnapshot}
                            </div>
                          ))}
                        </div>

                        {/* Assignee / Machine Tag */}
                        {ord.assignedStaffName && (
                          <div className="text-[10px] text-gray-500 bg-gray-50 p-1.5 rounded flex items-center gap-1 truncate">
                            <HiOutlineUser className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                            <span className="truncate">{ord.assignedStaffName}</span>
                          </div>
                        )}

                        {/* Handover / Pre-QC Button CTA */}
                        <div className="pt-2 border-t flex justify-between items-center">
                          <span className="font-black text-red-600 text-xs">₹{ord.grandTotal}</span>
                          {ord.orderStatus === 'PRE_PRODUCTION_QC' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedQcOrder(ord);
                                setPreQcModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition-colors shadow-2xs animate-pulse"
                            >
                              🛡️ Pre-QC ➔
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openHandover(ord, dept.key)}
                              className="inline-flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                            >
                              Handover ➔
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Handover Modal */}
      <Modal show={handoverModalOpen} onClose={() => setHandoverModalOpen(false)}>
        <Modal.Header>
          Department Handover: <span className="font-mono text-yellow-600">{selectedOrder?.orderNumber}</span>
        </Modal.Header>
        <form onSubmit={handleHandoverSubmit}>
          <Modal.Body className="space-y-4 text-xs">
            <div className="bg-gray-50 p-3 rounded-xl border">
              <p className="text-gray-700">
                <strong>Customer:</strong> {selectedOrder?.customerName} ({selectedOrder?.customerMobile})
              </p>
              <p className="text-gray-700 mt-1">
                <strong>Items:</strong> {selectedOrder?.items?.map((i) => `${i.quantity}x ${i.productNameSnapshot}`).join(', ')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Target Department *</label>
                <Select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  size="sm"
                  required
                >
                  <option value="DESIGN">🎨 1. Design & Prepress Hub</option>
                  <option value="PRODUCTION">🖨️ 2. Press Production</option>
                  <option value="FINISHING_QC">✂️ 3. Finishing & Quality Control</option>
                  <option value="PACKING">📦 4. Packaging Desk</option>
                  <option value="DELIVERY">🚚 5. Logistics & Delivery</option>
                  <option value="COMPLETED">✅ 6. Completed</option>
                </Select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Status Milestone *</label>
                <Select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  size="sm"
                  required
                >
                  <optgroup label="1. Design & Prepress Hub">
                    <option value="ORDER_REVIEW">ORDER_REVIEW (Prepress Review)</option>
                    <option value="ARTWORK_REVIEW">ARTWORK_REVIEW</option>
                    <option value="DESIGN_QUEUE">DESIGN_QUEUE (Design Service)</option>
                    <option value="CUSTOMER_APPROVAL_REQUIRED">CUSTOMER_APPROVAL_REQUIRED</option>
                    <option value="ARTWORK_APPROVED">ARTWORK_APPROVED</option>
                  </optgroup>
                  <optgroup label="2. Press Production">
                    <option value="PRE_PRODUCTION_QC">PRE_PRODUCTION_QC</option>
                    <option value="PRODUCTION_QUEUE">PRODUCTION_QUEUE</option>
                    <option value="PRINTING">PRINTING</option>
                  </optgroup>
                  <optgroup label="3. Finishing & Quality Control">
                    <option value="FINISHING">FINISHING</option>
                    <option value="QUALITY_CHECK">QUALITY_CHECK</option>
                  </optgroup>
                  <optgroup label="4. Packaging Desk">
                    <option value="PACKING">PACKING</option>
                    <option value="READY_FOR_DISPATCH">READY_FOR_DISPATCH</option>
                  </optgroup>
                  <optgroup label="5. Logistics & Delivery">
                    <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                  </optgroup>
                  <optgroup label="6. Completed">
                    <option value="DELIVERED">DELIVERED</option>
                  </optgroup>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Assign Staff Member</label>
                <Select
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  size="sm"
                >
                  <option value="">Select In-House Staff</option>
                  {STAFF_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </Select>
              </div>

              {targetDept === 'PRODUCTION' && (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Press Machine</label>
                  <Select
                    value={assignedMachine}
                    onChange={(e) => setAssignedMachine(e.target.value)}
                    size="sm"
                  >
                    <option value="">Select Machine</option>
                    {PRESS_MACHINES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {targetDept === 'DELIVERY' && (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Courier / Dispatch Partner</label>
                  <TextInput
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {targetDept === 'DESIGN' && (
              <div>
                <label className="font-bold text-gray-700 block mb-1">Digital Proof URL (For Customer Approval)</label>
                <TextInput
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://... or /uploads/proof.pdf"
                  size="sm"
                />
              </div>
            )}

            {targetDept === 'DELIVERY' && (
              <div>
                <label className="font-bold text-gray-700 block mb-1">Courier Tracking Code</label>
                <TextInput
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. ST-TRICHY-8921"
                  size="sm"
                />
              </div>
            )}

            <div>
              <label className="font-bold text-gray-700 block mb-1">Customer Status Update Note (Live Tracking)</label>
              <Textarea
                rows="2"
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                placeholder="Leave empty for auto-generated note..."
                className="text-xs"
              />
            </div>
          </Modal.Body>
          <Modal.Footer className="flex justify-between">
            <Button color="light" size="xs" onClick={() => setHandoverModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="dark"
              size="xs"
              disabled={isSubmittingHandover}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold"
            >
              {isSubmittingHandover ? <Spinner size="xs" /> : 'Confirm Handover ➔'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Pre-Production QC Prepress Gate Modal */}
      <PreProductionQCModal
        show={preQcModalOpen}
        onClose={() => {
          setPreQcModalOpen(false);
          setSelectedQcOrder(null);
        }}
        order={selectedQcOrder}
        onSuccess={(msg) => {
          setFeedback(msg);
          setTimeout(() => setFeedback(''), 4000);
          fetchBoard();
        }}
      />
    </div>
  );
}
