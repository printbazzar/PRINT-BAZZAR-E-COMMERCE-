import React, { useRef } from 'react';
import { Modal, Button, Badge } from 'flowbite-react';
import { HiOutlinePrinter, HiOutlinePhotograph, HiOutlineExternalLink } from 'react-icons/hi';

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

  // Parse specifications
  let parsedOptions = {};
  try {
    if (primaryItem.selectedOptionsJson) {
      parsedOptions =
        typeof primaryItem.selectedOptionsJson === 'string'
          ? JSON.parse(primaryItem.selectedOptionsJson)
          : primaryItem.selectedOptionsJson;
    } else if (primaryItem.selectedOptions) {
      parsedOptions = primaryItem.selectedOptions;
    }
  } catch (_) {}

  const size = parsedOptions.Size || parsedOptions.size || parsedOptions.Dimensions || 'Standard (3.5" x 2.0")';
  const paper = parsedOptions.Paper || parsedOptions.paper || parsedOptions.Material || parsedOptions.GSM || '350 GSM Art Card';
  const printing = parsedOptions.Printing || parsedOptions.printing || parsedOptions.Sides || 'Front & Back (Double Side 4-Color CMYK)';
  const lamination = parsedOptions.Lamination || parsedOptions.lamination || parsedOptions.Finish || 'Thermal Matte Lamination';
  const specialFinishing = parsedOptions.Finishing || parsedOptions.finishing || parsedOptions['Special Finishing'] || parsedOptions['Spot UV'] || 'Standard Square Cut';

  const isUrgent = order.deliveryType === 'SAME_DAY' || currentJob.priority === 'URGENT' || currentJob.priority === 'HIGH';

  return (
    <Modal show={show} onClose={onClose} size="3xl">
      <Modal.Header className="print:hidden">
        <span className="font-bold text-gray-900">🖨️ Factory Production Job Card — {jobNumber}</span>
      </Modal.Header>
      <Modal.Body className="p-4 sm:p-6 print:p-0">
        {/* Printable Production Ticket (Clean A4 / A5 layout) */}
        <div
          ref={printRef}
          className="max-w-[700px] mx-auto bg-white border-2 border-black p-6 text-black font-sans shadow-xs print:border-2 print:border-black print:shadow-none print:max-w-none print:w-full print:p-4"
        >
          {/* Header Banner */}
          <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black uppercase tracking-tight">PRINT BAZZAR</h1>
                <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded">
                  Press Job Ticket
                </span>
              </div>
              <p className="text-xs text-gray-600 font-semibold mt-0.5">
                Digital & Offset Production Division — Trichy Press
              </p>
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-wider rounded ${
                  isUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 text-gray-900'
                }`}
              >
                {isUrgent ? '🔥 URGENT PRIORITY' : 'STANDARD PRODUCTION'}
              </span>
              <p className="text-xs font-mono font-bold mt-1 text-gray-700">
                Fulfillment: {order.deliveryMethod === 'STORE_PICKUP' ? '🏪 STORE PICKUP' : '🚚 EXPRESS COURIER'}
              </p>
            </div>
          </div>

          {/* Job & Order Identifiers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-100 p-3 rounded-lg border border-gray-300 mb-4 font-mono text-xs">
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-bold">Job Card Number</span>
              <span className="font-black text-sm text-blue-700">{jobNumber}</span>
            </div>
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-bold">Master Order ID</span>
              <span className="font-black text-sm">{order.orderNumber}</span>
            </div>
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-bold">Date Received</span>
              <span className="font-bold">
                {new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-bold">Target Due Date</span>
              <span className="font-bold text-red-600">
                {order.estimatedDeliveryDate
                  ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : 'Same / Next Day'}
              </span>
            </div>
          </div>

          {/* Product & Quantity Highlight */}
          <div className="border-2 border-black bg-yellow-50 p-4 rounded-lg mb-4 flex flex-wrap justify-between items-center gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">Product</span>
              <h2 className="text-lg font-black text-gray-950">
                {primaryItem.productNameSnapshot || primaryItem.product?.name || 'Commercial Print Item'}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">Exact Quantity</span>
              <span className="text-2xl font-black text-red-600 bg-white px-3 py-1 rounded border border-red-300 inline-block">
                {primaryItem.quantity} <span className="text-xs font-bold text-black">{primaryItem.quantityUnit || 'pcs'}</span>
              </span>
            </div>
          </div>

          {/* Core Technical Specifications Table */}
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 border-b pb-1">
              ⚙️ Technical Production Specifications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Paper Stock / GSM</span>
                <span className="font-black text-gray-900 text-sm mt-0.5 block">{paper}</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Finished Cut Size</span>
                <span className="font-black text-gray-900 text-sm mt-0.5 block">{size}</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Printing Sides & Color</span>
                <span className="font-black text-gray-900 text-sm mt-0.5 block">{printing}</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Lamination / Coating</span>
                <span className="font-black text-gray-900 text-sm mt-0.5 block">{lamination}</span>
              </div>
            </div>

            {/* Special Finishing Banner */}
            <div className="mt-3 bg-purple-50 p-2.5 rounded border border-purple-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-purple-700 uppercase text-[10px] block">Special Post-Press Finishing</span>
                <span className="font-black text-purple-950 text-sm">{specialFinishing}</span>
              </div>
              <span className="text-xl">✂️</span>
            </div>
          </div>

          {/* Machine Assignment & Artwork Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
            <div className="border border-gray-300 p-3 rounded-lg">
              <span className="font-bold text-gray-500 uppercase text-[10px] block">Machine Assignment</span>
              <p className="font-bold text-gray-900 mt-1">
                Press: <span className="font-black">{order.machineNumber || currentJob.machineNumber || 'Digital Color Press C4070'}</span>
              </p>
              <p className="text-gray-700 mt-0.5">
                Operator: <span className="font-bold">{order.assignedStaffName || currentJob.assignedStaffName || 'Press Operator'}</span>
              </p>
            </div>

            <div className="border border-gray-300 p-3 rounded-lg">
              <span className="font-bold text-gray-500 uppercase text-[10px] block">Prepress & Artwork File</span>
              <p className="font-bold text-green-700 mt-1">
                Status: {primaryItem.artworkOption === 'DESIGN_SUPPORT' ? '🎨 Custom Designed & Approved' : '✔ Print-Ready PDF Provided'}
              </p>
              {primaryItem.artworkFileUrl ? (
                <a
                  href={primaryItem.artworkFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline mt-1 print:hidden"
                >
                  <HiOutlinePhotograph className="w-3.5 h-3.5" /> Download / View Print File
                </a>
              ) : (
                <span className="text-gray-500 text-[11px] block mt-1">Artwork linked in prepress server</span>
              )}
            </div>
          </div>

          {/* Special Operator Notes (if any) */}
          <div className="border border-dashed border-gray-400 p-2.5 rounded-lg mb-4 text-xs bg-gray-50">
            <span className="font-bold uppercase text-[10px] text-gray-600 block">Operator Notes:</span>
            <p className="text-gray-800 italic mt-0.5">
              {primaryItem.requirementNotes || order.statusHistory?.[0]?.note || 'Ensure clean cut margins. Pack in 100-pc bundles with moisture-proof wrapping.'}
            </p>
          </div>

          {/* Physical Operator Quality Sign-Off Checklist (Printed on Ticket) */}
          <div className="border-t-2 border-black pt-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 block mb-2">
              📋 Floor Operator Quality Sign-Off (Initial upon completion)
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
              <div className="border border-black p-2 rounded">
                <span className="block font-bold">1. Press Run</span>
                <span className="text-gray-400 block mt-2">Sign: ________</span>
              </div>
              <div className="border border-black p-2 rounded">
                <span className="block font-bold">2. Lamination</span>
                <span className="text-gray-400 block mt-2">Sign: ________</span>
              </div>
              <div className="border border-black p-2 rounded">
                <span className="block font-bold">3. Cut & QC</span>
                <span className="text-gray-400 block mt-2">Sign: ________</span>
              </div>
              <div className="border border-black p-2 rounded">
                <span className="block font-bold">4. Packed</span>
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
          <HiOutlinePrinter className="w-4 h-4 mr-1" /> Print Clean Job Card
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
