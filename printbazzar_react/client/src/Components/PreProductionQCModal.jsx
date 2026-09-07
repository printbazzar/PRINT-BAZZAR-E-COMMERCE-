import React, { useState } from 'react';
import { Modal, Button, TextInput } from 'flowbite-react';
import {
  HiOutlineShieldCheck,
  HiOutlineDownload,
  HiOutlineExclamation,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import { api } from '../services/api';

const MANDATORY_QC_ITEMS = [
  { key: 'correctArtwork', label: '1. Correct Artwork: Final approved design file verified', alias: 'correctArtworkVersion' },
  { key: 'correctSize', label: '2. Correct Size: Finished cut dimensions match order spec', alias: 'correctSize' },
  { key: 'correctQuantity', label: '3. Correct Quantity: Press sheet count matches requested qty', alias: 'correctQuantity' },
  { key: 'correctMaterial', label: '4. Correct Material / GSM: Paper stock verified for press run', alias: 'correctMaterial' },
  { key: 'colorModeCmyk', label: '5. CMYK / Color Mode: 4-color CMYK profile verified (no RGB)', alias: 'colorModeCmyk' },
  { key: 'bleedMarginVerification', label: '6. Bleed & Safe Margin: 2-3mm cutting clearance verified', alias: 'bleedMarginVerification' },
  { key: 'spellingContentVerification', label: '7. Spelling & Content: Customer text & proofing verified', alias: 'spellingContentVerification' },
  { key: 'finishingVerification', label: '8. Finishing Verification: Lamination, die-cut & coating verified', alias: 'finishingVerification' },
  { key: 'customerApprovedArtwork', label: '9. Customer Approval: Explicit customer proof approval confirmed', alias: 'customerApprovedArtwork' },
];

export default function PreProductionQCModal({ show, onClose, order, onSuccess }) {
  if (!order) return null;

  const [checklist, setChecklist] = useState({
    correctArtwork: false,
    correctArtworkVersion: false,
    correctSize: false,
    correctQuantity: false,
    correctMaterial: false,
    correctGsm: false,
    colorModeCmyk: false,
    resolutionVerification: false,
    bleedMarginVerification: false,
    laminationVerification: false,
    cuttingFinishingVerification: false,
    spellingContentVerification: false,
    finishingVerification: false,
    customerApprovedArtwork: false,
    specialInstructionsVerification: false,
  });

  const [inspectorName, setInspectorName] = useState('Prepress Lead');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentJob = order.productionJobs?.[0] || {};
  const primaryItem = order.items?.[0] || {};

  const handleToggleCheck = (key) => {
    setChecklist((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };
      // Also sync complementary aliases
      if (key === 'correctArtwork') updated.correctArtworkVersion = nextVal;
      if (key === 'correctMaterial') updated.correctGsm = nextVal;
      if (key === 'finishingVerification') {
        updated.laminationVerification = nextVal;
        updated.cuttingFinishingVerification = nextVal;
      }
      if (key === 'customerApprovedArtwork') {
        updated.specialInstructionsVerification = nextVal;
      }
      if (key === 'spellingContentVerification') {
        updated.resolutionVerification = nextVal;
      }
      return updated;
    });
  };

  const handleSelectAll = () => {
    const allChecked = {};
    Object.keys(checklist).forEach((k) => {
      allChecked[k] = true;
    });
    setChecklist(allChecked);
  };

  const allMandatoryChecked = MANDATORY_QC_ITEMS.every(
    (item) => checklist[item.key] === true || checklist[item.alias] === true
  );

  // 1. Approve for Production
  const handleApprove = async () => {
    if (!allMandatoryChecked) {
      setErrorMessage('All 9 mandatory checklist items must be verified before approving for production.');
      return;
    }
    setErrorMessage('');
    setIsProcessing(true);
    try {
      const res = await api.submitPreProductionQC(order.id, {
        status: 'PASSED',
        action: 'APPROVE_FOR_PRODUCTION',
        checklist,
        inspectorName,
        notes: notes || 'Pre-Production QC PASSED. 12-point prepress checklist verified. Released to press.',
      });
      if (res.success) {
        if (onSuccess) onSuccess('Pre-Production QC Passed! Released to Press Production Queue.');
        onClose();
      } else {
        setErrorMessage(res.message || 'Failed to submit QC approval');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit QC approval');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Return to Design
  const handleReturnToDesign = async () => {
    if (!notes.trim()) {
      setErrorMessage('Please enter remarks explaining why this order is being returned to Design.');
      return;
    }
    setErrorMessage('');
    setIsProcessing(true);
    try {
      const res = await api.submitPreProductionQC(order.id, {
        status: 'FAILED',
        action: 'RETURN_TO_DESIGN',
        returnTarget: 'DESIGN',
        checklist,
        inspectorName,
        notes: `Returned to Design Team: ${notes.trim()}`,
      });
      if (res.success) {
        if (onSuccess) onSuccess('Order returned to Design Queue for revision.');
        onClose();
      } else {
        setErrorMessage(res.message || 'Failed to return order to Design');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to return order to Design');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Return to Artwork Review
  const handleReturnToArtworkReview = async () => {
    if (!notes.trim()) {
      setErrorMessage('Please enter remarks explaining why artwork review is needed.');
      return;
    }
    setErrorMessage('');
    setIsProcessing(true);
    try {
      const res = await api.submitPreProductionQC(order.id, {
        status: 'FAILED',
        action: 'RETURN_TO_ARTWORK_REVIEW',
        returnTarget: 'ARTWORK_REVIEW',
        checklist,
        inspectorName,
        notes: `Returned to Artwork Review: ${notes.trim()}`,
      });
      if (res.success) {
        if (onSuccess) onSuccess('Order returned to Prepress Artwork Review.');
        onClose();
      } else {
        setErrorMessage(res.message || 'Failed to return order to Artwork Review');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to return order to Artwork Review');
    } finally {
      setIsProcessing(false);
    }
  };

  const artworkUrl = currentJob.approvedArtworkUrl || primaryItem.artworkFileUrl || order.proofFileUrl;

  return (
    <Modal show={show} onClose={onClose} size="3xl">
      <Modal.Header>
        <div className="flex items-center gap-2">
          <HiOutlineShieldCheck className="w-6 h-6 text-yellow-500" />
          <span className="font-black text-gray-900">
            Mandatory Pre-Production QC Gate — {order.orderNumber}
          </span>
        </div>
      </Modal.Header>
      <Modal.Body className="p-5 space-y-4">
        {/* Order Summary Strip */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Customer</span>
            <span className="font-bold text-gray-900">{order.customerName}</span>
            <span className="text-gray-500 block">{order.customerMobile}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Product / Qty</span>
            <span className="font-bold text-gray-900">{primaryItem.productNameSnapshot || 'Print Item'}</span>
            <span className="text-red-600 font-black block">{primaryItem.quantity} pcs</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Job Card Number</span>
            <span className="font-mono font-bold text-blue-700">{currentJob.jobNumber || 'PB-JOB-...'}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Approved Artwork</span>
            {artworkUrl ? (
              <a
                href={artworkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline mt-0.5"
              >
                <HiOutlineDownload className="w-3.5 h-3.5" /> View File
              </a>
            ) : (
              <span className="text-gray-400">No file uploaded</span>
            )}
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
          <HiOutlineExclamation className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Strict Prepress Gating Rule</p>
            <p className="text-amber-800 mt-0.5">
              Physical printing cannot begin until all 9 checklist items below are physically verified by the Prepress QC Lead.
            </p>
          </div>
        </div>

        {/* Checklist */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b">
            <h4 className="font-black text-xs uppercase tracking-wider text-gray-800">
              Prepress 9-Point Inspection Checklist:
            </h4>
            <Button size="xs" color="light" onClick={handleSelectAll} className="text-[11px] font-bold">
              ✓ Select All / Verify All
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {MANDATORY_QC_ITEMS.map((item) => (
              <label
                key={item.key}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                  checklist[item.key] || checklist[item.alias]
                    ? 'bg-green-50/60 border-green-300 text-green-900 font-bold'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(checklist[item.key] || checklist[item.alias])}
                  onChange={() => handleToggleCheck(item.key)}
                  className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-[11px] leading-tight">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Inspector & Notes Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-gray-700 font-bold block mb-1">Prepress QC Inspector:</label>
            <TextInput
              size="sm"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="e.g. Arun (Prepress Lead)"
              className="text-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-gray-700 font-bold block mb-1">Remarks / Action Notes:</label>
            <TextInput
              size="sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks (or reason for return)"
              className="text-xs"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-lg font-semibold">
            {errorMessage}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
        {/* Return Actions */}
        <div className="flex gap-2">
          <Button
            color="failure"
            size="sm"
            onClick={handleReturnToDesign}
            disabled={isProcessing}
            className="text-xs font-bold"
          >
            ↩ Return to Design
          </Button>
          <Button
            color="warning"
            size="sm"
            onClick={handleReturnToArtworkReview}
            disabled={isProcessing}
            className="text-xs font-bold"
          >
            ↩ Return to Artwork Review
          </Button>
        </div>

        {/* Approve Action */}
        <div className="flex gap-2 justify-end">
          <Button color="gray" size="sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            color="success"
            size="sm"
            onClick={handleApprove}
            disabled={isProcessing || !allMandatoryChecked}
            className="bg-green-600 hover:bg-green-700 text-white font-black text-xs flex items-center gap-1.5"
          >
            <HiOutlineCheckCircle className="w-4 h-4 mr-1" />
            APPROVE FOR PRODUCTION
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
