import React, { useState } from 'react';
import { Modal, Button, Badge, Checkbox } from 'flowbite-react';
import {
  HiOutlineZoomIn,
  HiOutlineZoomOut,
  HiOutlineRefresh,
  HiOutlineArrowsExpand,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineXCircle,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineShieldCheck,
  HiOutlineInformationCircle,
  HiOutlineDownload,
} from 'react-icons/hi';

export default function LargeArtworkPreviewModal({
  show,
  onClose,
  report,
  file,
  previewUrl,
  onReUpload,
  disclaimerAccepted,
  onToggleDisclaimer,
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showBleed, setShowBleed] = useState(true);
  const [showTrim, setShowTrim] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = report?.pageCount || 1;

  if (!show || !report) return null;

  const status = report.status === 'ERROR' ? 'BLOCK' : (report.status || 'PASS');
  const isPass = status === 'PASS';
  const isWarning = status === 'WARNING';
  const isBlock = status === 'BLOCK';

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);
  const handleFitScreen = () => setZoomLevel(0.85);

  const effectivePreview = previewUrl || report.previewUrl;
  const isPdf = report.fileType?.toLowerCase() === 'pdf' || report.fileName?.toLowerCase().endsWith('.pdf');

  return (
    <Modal show={show} onClose={onClose} size="7xl" className="backdrop-blur-sm z-50">
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex flex-wrap justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-800">
              <HiOutlineEye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900 truncate max-w-xs sm:max-w-md">
                  {report.fileName || 'Artwork Inspection'}
                </h3>
                {/* Status Badge */}
                {isPass && (
                  <Badge color="success" className="font-bold uppercase tracking-wider px-2.5 py-0.5">
                    ✓ Print Ready
                  </Badge>
                )}
                {isWarning && (
                  <Badge color="warning" className="font-bold uppercase tracking-wider px-2.5 py-0.5">
                    ⚠ Warning
                  </Badge>
                )}
                {isBlock && (
                  <Badge color="failure" className="font-bold uppercase tracking-wider px-2.5 py-0.5">
                    ❌ Action Required
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Automated Technical Preflight • {report.fileSizeMb} MB • {report.fileType || 'FILE'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {effectivePreview && (
              <a
                href={effectivePreview}
                download={report.fileName}
                className="hidden sm:flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-black border border-gray-300 rounded-lg px-3 py-1.5 bg-white transition"
              >
                <HiOutlineDownload className="w-4 h-4" /> Download
              </a>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 text-2xl font-black w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Modal Body: Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Main Inspection Canvas */}
          <div className="lg:col-span-8 bg-gray-900 flex flex-col justify-between relative overflow-hidden min-h-[420px] lg:min-h-[550px]">
            {/* Canvas Toolbar Controls */}
            <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-1.5 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg text-white text-xs">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-white/20 rounded transition"
                title="Zoom In"
              >
                <HiOutlineZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-white/20 rounded transition"
                title="Zoom Out"
              >
                <HiOutlineZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 font-bold text-[11px] hover:bg-white/20 rounded transition"
                title="Reset Zoom"
              >
                {(zoomLevel * 100).toFixed(0)}%
              </button>
              <button
                type="button"
                onClick={handleFitScreen}
                className="p-1.5 hover:bg-white/20 rounded transition"
                title="Fit to Screen"
              >
                <HiOutlineArrowsExpand className="w-4 h-4" />
              </button>

              <span className="h-4 w-px bg-white/20 mx-1" />

              {/* Guide Toggles */}
              <button
                type="button"
                onClick={() => setShowBleed(!showBleed)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                  showBleed ? 'bg-red-600/40 text-red-200 border-red-500' : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                Bleed (+3mm)
              </button>
              <button
                type="button"
                onClick={() => setShowTrim(!showTrim)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                  showTrim ? 'bg-yellow-600/40 text-yellow-200 border-yellow-500' : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                Cut Trim
              </button>
              <button
                type="button"
                onClick={() => setShowSafeZone(!showSafeZone)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                  showSafeZone ? 'bg-green-600/40 text-green-200 border-green-500' : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                Safe Zone (-3mm)
              </button>
            </div>

            {/* Central Document Display with Pan/Zoom & Print Overlay Guides */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-6 relative">
              <div
                className="relative transition-transform duration-150 ease-out shadow-2xl rounded-sm bg-white"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
              >
                {effectivePreview ? (
                  isPdf ? (
                    <iframe
                      src={`${effectivePreview}#toolbar=0&navpanes=0`}
                      title="PDF Preview"
                      className="w-[500px] h-[340px] border-0 rounded bg-white"
                    />
                  ) : (
                    <img
                      src={effectivePreview}
                      alt="Artwork Preview"
                      className="max-w-[560px] max-h-[440px] object-contain block select-none pointer-events-none"
                    />
                  )
                ) : (
                  <div className="w-[420px] h-[280px] bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-6 text-center text-gray-700">
                    <HiOutlineDocumentText className="w-16 h-16 text-gray-400 mb-2" />
                    <p className="font-extrabold text-sm uppercase">{report.fileType} Prepress File</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      High-resolution vector artwork. Scalable without pixelation on our Heidelberg / Konica press.
                    </p>
                  </div>
                )}

                {/* Print Guide Overlays */}
                {showBleed && (
                  <div
                    className="absolute -inset-2 border-2 border-dashed border-red-500 pointer-events-none z-10"
                    title="Bleed Margin: Background graphics must extend to this edge"
                  >
                    <span className="absolute -top-3 left-2 bg-red-600 text-white text-[9px] font-black px-1.5 rounded uppercase">
                      Bleed (+3mm)
                    </span>
                  </div>
                )}

                {showTrim && (
                  <div
                    className="absolute inset-0 border-2 border-yellow-400 pointer-events-none z-10 shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                    title="Final Cut Edge: Machine will trim along this line"
                  >
                    <span className="absolute -bottom-3 right-2 bg-yellow-400 text-black text-[9px] font-black px-1.5 rounded uppercase">
                      Trim Cut Line
                    </span>
                  </div>
                )}

                {showSafeZone && (
                  <div
                    className="absolute inset-2 border border-dashed border-green-500 pointer-events-none z-10"
                    title="Safe Margin: Keep text and logos inside this line"
                  >
                    <span className="absolute top-1 right-2 bg-green-600/90 text-white text-[8px] font-bold px-1 rounded uppercase">
                      Safe Zone
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Canvas Footer: Guide Legend & Multi-Page Controls */}
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 flex flex-wrap justify-between items-center text-[11px] text-gray-300 border-t border-white/10">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Bleed (+3mm)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Cut Line
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Safe Margin
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 transition"
                  >
                    Prev
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Technical Preflight Findings */}
          <div className="lg:col-span-4 p-5 sm:p-6 overflow-y-auto bg-white border-l border-gray-200 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <HiOutlineShieldCheck className="w-5 h-5 text-yellow-500" />
                  Technical Preflight Audit
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatic inspection against Print Bazzar offset & digital standards.
                </p>
              </div>

              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isPass
                    ? 'bg-green-50 border-green-200 text-green-950'
                    : isWarning
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-950'
                    : 'bg-red-50 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isPass && <HiOutlineCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                  {isWarning && <HiOutlineExclamation className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                  {isBlock && <HiOutlineXCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                  <div>
                    <h5 className="font-extrabold text-xs">
                      {isPass && '✓ Print Ready'}
                      {isWarning && '⚠ Quality Notice: Minor Discrepancy'}
                      {isBlock && '❌ Blocking Issue Detected'}
                    </h5>
                    <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                      {isPass && 'Your file meets the technical criteria for resolution, sizing, and bleed margin.'}
                      {isWarning && 'Your file can be printed, but may show slight softness or require bleed adjustment.'}
                      {isBlock && 'File dimensions or resolution cannot be printed cleanly. Please upload a corrected file.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Specification Metrics */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Effective Resolution</span>
                  <span className="font-mono font-bold text-gray-900">
                    {report.dpi?.effectiveDpi ? `${report.dpi.effectiveDpi} DPI` : 'Vector Scalable'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Trim Dimensions</span>
                  <span className="font-mono font-bold text-gray-900">
                    {report.dimensions?.targetTrim || 'Standard Size'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Pixel Canvas</span>
                  <span className="font-mono font-bold text-gray-900">
                    {report.dimensions?.widthPx ? `${report.dimensions.widthPx} × ${report.dimensions.heightPx} px` : 'Scalable Vector'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Bleed Allowance</span>
                  <span className="font-mono font-bold text-gray-900">
                    {report.bleedCheck?.status === 'PASS' ? '+3mm Detected' : 'Standard Inset'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Color Mode</span>
                  <span className="font-mono font-bold text-gray-900">
                    {report.colorMode?.mode || 'CMYK Balanced'}
                  </span>
                </div>
              </div>

              {/* Warnings / Issues List */}
              {report.issues && report.issues.length > 0 && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <h6 className="text-xs font-bold text-red-900 mb-1.5 flex items-center gap-1">
                    <HiOutlineXCircle className="w-4 h-4 text-red-600" /> Blocking Correction Required:
                  </h6>
                  <ul className="text-[11px] text-red-800 space-y-1 list-disc list-inside">
                    {report.issues.map((iss, i) => (
                      <li key={i}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}

              {report.warnings && report.warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <h6 className="text-xs font-bold text-yellow-900 mb-1.5 flex items-center gap-1">
                    <HiOutlineInformationCircle className="w-4 h-4 text-yellow-600" /> Advisory Notices:
                  </h6>
                  <ul className="text-[11px] text-yellow-800 space-y-1 list-disc list-inside">
                    {report.warnings.map((warn, w) => (
                      <li key={w}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Passed Checks */}
              {report.passedChecks && report.passedChecks.length > 0 && (
                <div>
                  <h6 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Verified Specifications:
                  </h6>
                  <div className="space-y-1">
                    {report.passedChecks.map((chk, c) => (
                      <p key={c} className="text-[11px] text-green-800 flex items-center gap-1.5 font-medium">
                        <HiOutlineCheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        {chk}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Mandatory Customer Responsibility Acknowledgement (Phase 10) */}
              {isWarning && (
                <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 text-amber-950 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="large-modal-ack"
                      checked={disclaimerAccepted}
                      onChange={onToggleDisclaimer}
                      className="text-yellow-500 focus:ring-yellow-400"
                    />
                    <label htmlFor="large-modal-ack" className="text-xs font-bold cursor-pointer">
                      I understand and want to continue with this file.
                    </label>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-tight">
                    Our automated preflight detected a potential issue with your artwork. If you continue without correction, Print Bazzar cannot guarantee print quality results caused by the detected artwork issue.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-5 border-t border-gray-200 mt-5 space-y-2">
              {isBlock ? (
                <Button
                  color="failure"
                  className="w-full font-bold"
                  onClick={() => {
                    onClose();
                    if (onReUpload) onReUpload();
                  }}
                >
                  <HiOutlineRefresh className="w-4 h-4 mr-2" />
                  Re-upload Corrected File
                </Button>
              ) : (
                <Button
                  color="dark"
                  className="w-full bg-black hover:bg-yellow-400 hover:text-black font-bold text-sm"
                  disabled={isWarning && !disclaimerAccepted}
                  onClick={onClose}
                >
                  <HiOutlineCheckCircle className="w-4 h-4 mr-1.5" />
                  {isWarning ? (disclaimerAccepted ? 'Confirm Artwork & Continue' : 'Acknowledge Notice Above') : 'Approve Artwork & Continue'}
                </Button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onReUpload) onReUpload();
                }}
                className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-900 py-1"
              >
                Upload a Different Version
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
