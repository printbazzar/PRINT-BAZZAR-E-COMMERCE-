import React, { useRef } from 'react';
import { Modal, Button } from 'flowbite-react';
import { HiOutlinePrinter, HiOutlinePhotograph } from 'react-icons/hi';

export default function JobCardModal({ show, onClose, order, job = null }) {
  const printRef = useRef(null);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentJob = job || order.productionJobs?.[0] || {};
  const jobNumber = currentJob.jobNumber || `PB-JOB-${order.orderNumber?.replace('PB-ORD-', '') || '001'}`;
  const items = order.items || [];
  const primaryItem = items[0] || {};

  // Financial details
  const invoice = order.invoices?.[0] || {};
  const paymentStatus = order.paymentStatus || invoice.paymentStatus || 'PENDING';
  const totalAmount = order.grandTotal !== undefined ? order.grandTotal : (invoice.totalAmount || 0);
  const amountPaid = invoice.amountPaid !== undefined ? invoice.amountPaid : (paymentStatus === 'CONFIRMED' || paymentStatus === 'PAID' ? totalAmount : 0);
  const balanceDue = invoice.balanceDue !== undefined ? invoice.balanceDue : (paymentStatus === 'CONFIRMED' || paymentStatus === 'PAID' ? 0 : totalAmount);

  // Parse specifications
  let parsedOptions = {};
  try {
    if (primaryItem.selectedOptionsJson) {
      parsedOptions =
        typeof primaryItem.selectedOptionsJson === 'string'
          ? JSON.parse(primaryItem.selectedOptionsJson)
          : primaryItem.selectedOptionsJson;
    } else if (primaryItem.selectedOptions) {
      parsedOptions = typeof primaryItem.selectedOptions === 'string' ? JSON.parse(primaryItem.selectedOptions) : primaryItem.selectedOptions;
    }
  } catch (_) {}

  const size = parsedOptions.Size || parsedOptions.size || parsedOptions.Dimensions || 'Standard (3.5" x 2.0")';
  const paper = parsedOptions.Paper || parsedOptions.paper || parsedOptions.Material || parsedOptions.GSM || '350 GSM Art Card';
  const printing = parsedOptions.Printing || parsedOptions.printing || parsedOptions.Sides || 'Front & Back (Double Side CMYK)';
  const printType = parsedOptions['Print Type'] || parsedOptions.printType || parsedOptions['Printing Type'] || 'High Definition Digital Press';
  const color = parsedOptions.Color || parsedOptions.color || (printing.toLowerCase().includes('double') ? '4/4 Full Color CMYK Both Sides' : '4/0 Full Color CMYK Front');
  const lamination = parsedOptions.Lamination || parsedOptions.lamination || parsedOptions.Finish || 'Thermal Matte Lamination';
  const specialFinishing = parsedOptions.Finishing || parsedOptions.finishing || parsedOptions['Special Finishing'] || parsedOptions['Spot UV'] || 'Standard Square Cut & Trim';

  const priority = currentJob.priority || (order.deliveryType === 'SAME_DAY' ? 'URGENT' : 'STANDARD');
  const isUrgent = priority === 'URGENT' || priority === 'HIGH';

  const deliveryDateFormatted = order.estimatedDeliveryDate
    ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Standard Production (2-3 Days)';

  const specialInstructions =
    primaryItem.requirementNotes ||
    order.notes?.[0]?.noteText ||
    order.statusHistory?.[0]?.note ||
    'Verify registration crosshairs, color calibration, and 2.5mm bleed clearance prior to die cutting.';

  return (
    <Modal show={show} onClose={onClose} size="4xl">
      <Modal.Header className="print:hidden">
        <span className="font-bold text-gray-900">🖨️ Production Job Card — {jobNumber}</span>
      </Modal.Header>
      <Modal.Body className="p-4 sm:p-6 print:p-0">
        {/* Printable Production Ticket (Clean A4 / A5 layout) */}
        <div
          ref={printRef}
          className="max-w-[780px] mx-auto bg-white border-2 border-black p-6 text-black font-sans shadow-xs print:border-2 print:border-black print:shadow-none print:max-w-none print:w-full print:p-4"
        >
          {/* 1. Header Banner */}
          <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black uppercase tracking-tight">PRINT BAZZAR</h1>
                <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded">
                  Press Job Card & Production Route Sheet
                </span>
              </div>
              <p className="text-xs text-gray-600 font-semibold mt-0.5">
                Trichy Production Facility — Digital, Offset & Prepress Division
              </p>
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-wider rounded ${
                  isUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 text-gray-900'
                }`}
              >
                {isUrgent ? '🔥 URGENT PRIORITY' : '⚡ STANDARD PRIORITY'}
              </span>
              <p className="text-[11px] font-mono font-bold mt-1 text-gray-700">
                Fulfillment: {order.deliveryMethod === 'STORE_PICKUP' ? '🏪 STORE PICKUP' : '🚚 EXPRESS COURIER'}
              </p>
            </div>
          </div>

          {/* 2. Top Identifiers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-100 p-3 rounded-lg border border-gray-300 mb-3 font-mono text-xs">
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-bold">Job Number</span>
              <span className="font-black text-sm text-blue-700">{jobNumber}</span>
            </div>
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-bold">Order Number</span>
              <span className="font-black text-sm text-gray-900">{order.orderNumber}</span>
            </div>
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-bold">Current Department</span>
              <span className="font-black text-xs text-purple-700">{order.currentDepartment || 'PRODUCTION'}</span>
            </div>
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-bold">Delivery Date</span>
              <span className="font-bold text-red-600">{deliveryDateFormatted}</span>
            </div>
          </div>

          {/* 3. Customer & Financial Status Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-lg mb-4 text-xs">
            {/* Customer Details */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">Customer Information</span>
              <p className="font-black text-gray-900 text-sm">{order.customerName}</p>
              <p className="font-mono text-gray-700">Mobile: <span className="font-bold">{order.customerMobile}</span></p>
              {order.customerEmail && <p className="text-gray-500 text-[11px] truncate">Email: {order.customerEmail}</p>}
            </div>

            {/* Financial Details */}
            <div className="space-y-1 sm:text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">Payment & Workflow Financials</span>
              <div className="flex items-center sm:justify-end gap-2">
                <span className="text-[11px] font-bold text-gray-600">Payment Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${
                    paymentStatus === 'CONFIRMED' || paymentStatus === 'PAID'
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : paymentStatus === 'PARTIALLY_PAID'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>
              <p className="font-mono text-gray-800 text-[11px]">
                Total: <span className="font-bold text-gray-950">₹{totalAmount}</span> | Paid: <span className="font-bold text-green-700">₹{amountPaid}</span> | Balance Due: <span className="font-black text-red-600">₹{balanceDue}</span>
              </p>
              <p className="text-[11px] text-gray-600">
                Order Status: <span className="font-black text-black">{order.orderStatus}</span> | Priority: <span className="font-bold">{priority}</span>
              </p>
            </div>
          </div>

          {/* 4. Product & Quantity Highlight */}
          <div className="border-2 border-black bg-yellow-50 p-3.5 rounded-lg mb-4 flex flex-wrap justify-between items-center gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">Product Name</span>
              <h2 className="text-base font-black text-gray-950">
                {primaryItem.productNameSnapshot || primaryItem.product?.name || 'Commercial Print Item'}
              </h2>
              {primaryItem.skuSnapshot && <p className="text-[10px] font-mono text-gray-500">SKU: {primaryItem.skuSnapshot}</p>}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">Exact Quantity</span>
              <span className="text-2xl font-black text-red-600 bg-white px-3 py-1 rounded border border-red-300 inline-block">
                {primaryItem.quantity} <span className="text-xs font-bold text-black">{primaryItem.quantityUnit || 'pcs'}</span>
              </span>
            </div>
          </div>

          {/* 5. Complete Technical Specifications Table */}
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 border-b pb-1">
              ⚙️ Complete Print & Finishing Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Size</span>
                <span className="font-black text-gray-900 text-xs mt-0.5 block">{size}</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Material / GSM</span>
                <span className="font-black text-gray-900 text-xs mt-0.5 block">{paper}</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Print Type</span>
                <span className="font-black text-gray-900 text-xs mt-0.5 block">{printType}</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Color</span>
                <span className="font-black text-gray-900 text-xs mt-0.5 block">{color}</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Lamination</span>
                <span className="font-black text-gray-900 text-xs mt-0.5 block">{lamination}</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Finishing</span>
                <span className="font-black text-gray-900 text-xs mt-0.5 block">{specialFinishing}</span>
              </div>
            </div>
          </div>

          {/* 6. Floor Machine, Staff & Artwork Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
            <div className="border border-gray-300 p-3 rounded-lg">
              <span className="font-bold text-gray-500 uppercase text-[10px] block">Floor & Staff Assignment</span>
              <p className="font-bold text-gray-900 mt-1">
                Press Machine: <span className="font-black">{order.machineNumber || currentJob.machineNumber || 'Digital Color Press C4080'}</span>
              </p>
              <p className="text-gray-700 mt-0.5">
                Assigned Staff: <span className="font-bold">{order.assignedStaffName || currentJob.assignedStaffName || 'Press Floor Team'}</span>
              </p>
            </div>

            <div className="border border-gray-300 p-3 rounded-lg">
              <span className="font-bold text-gray-500 uppercase text-[10px] block">Prepress & Artwork Status</span>
              <p className="font-bold text-green-700 mt-1">
                Artwork Status: <span className="font-black">{currentJob.artworkStatus || 'APPROVED'}</span>
              </p>
              <p className="text-gray-700 mt-0.5">
                Proof Status: <span className="font-bold text-blue-700">{order.proofStatus || 'APPROVED'}</span>
                {order.proofApprovedAt && (
                  <span className="text-[10px] text-gray-500 ml-1">
                    ({new Date(order.proofApprovedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
                  </span>
                )}
              </p>
              {primaryItem.artworkFileUrl ? (
                <a
                  href={primaryItem.artworkFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline mt-1 print:hidden"
                >
                  <HiOutlinePhotograph className="w-3.5 h-3.5" /> View / Download Artwork
                </a>
              ) : (
                <span className="text-gray-500 text-[11px] block mt-1">Prepress approved digital proof file</span>
              )}
            </div>
          </div>

          {/* 7. Special Instructions */}
          <div className="border border-dashed border-gray-400 p-2.5 rounded-lg mb-4 text-xs bg-gray-50">
            <span className="font-bold uppercase text-[10px] text-gray-600 block">Special Instructions:</span>
            <p className="text-gray-800 italic mt-0.5">
              {specialInstructions}
            </p>
          </div>

          {/* 8. Floor Operator Sign-Off Checklist */}
          <div className="border-t-2 border-black pt-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 block mb-2">
              📋 Floor Operator Physical Sign-Off (Mandatory Sign-off per department)
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
              <div className="border border-black p-2 rounded">
                <span className="block font-bold">1. Prepress QC</span>
                <span className="text-gray-400 block mt-2">Sign: ________</span>
              </div>
              <div className="border border-black p-2 rounded">
                <span className="block font-bold">2. Press Run</span>
                <span className="text-gray-400 block mt-2">Sign: ________</span>
              </div>
              <div className="border border-black p-2 rounded">
                <span className="block font-bold">3. Cut & Finish</span>
                <span className="text-gray-400 block mt-2">Sign: ________</span>
              </div>
              <div className="border border-black p-2 rounded">
                <span className="block font-bold">4. Packed & QC</span>
                <span className="text-gray-400 block mt-2">Sign: ________</span>
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="flex justify-end gap-3 print:hidden">
        <Button color="gray" onClick={onClose}>
          Close
        </Button>
        <Button color="dark" onClick={handlePrint} className="flex items-center gap-2">
          <HiOutlinePrinter className="w-4 h-4 mr-1" /> Print Complete Job Card
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
