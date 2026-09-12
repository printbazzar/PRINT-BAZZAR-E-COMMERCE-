import React, { useState } from 'react';
import { Button, Badge, Checkbox } from 'flowbite-react';
import {
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineXCircle,
  HiOutlineRefresh,
  HiOutlineEye,
  HiOutlineShieldCheck,
  HiOutlineInformationCircle,
  HiOutlineArrowsExpand,
} from 'react-icons/hi';

export default function PreflightInspectionCard({
  report,
  onReUploadClick,
  onSwitchToDesignService,
  disclaimerAccepted,
  onToggleDisclaimer,
  onOpenLargeModal,
}) {
  const [showBleedGuide, setShowBleedGuide] = useState(true);
  const [showTrimGuide, setShowTrimGuide] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!report) return null;

  const status = report.status === 'ERROR' ? 'BLOCK' : (report.status || 'PASS');
  const isPass = status === 'PASS';
  const isWarning = status === 'WARNING';
  const isBlock = status === 'BLOCK';

  return (
    <div
      className={`rounded-2xl border-2 p-4 sm:p-5 transition-all shadow-sm ${
        isPass
          ? 'border-green-300 bg-green-50/40 text-green-900'
          : isWarning
          ? 'border-yellow-300 bg-yellow-50/50 text-yellow-900'
          : 'border-red-500 bg-red-50 text-red-950 ring-2 ring-red-400/40'
      }`}
    >
      {/* 1. Header & Quality Score */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-black/10">
        <div className="flex items-center gap-2.5">
          {isPass && <HiOutlineCheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />}
          {isWarning && <HiOutlineExclamation className="w-6 h-6 text-yellow-600 flex-shrink-0" />}
          {isBlock && <HiOutlineXCircle className="w-6 h-6 text-red-600 flex-shrink-0" />}

          <div>
            <h4 className="font-extrabold text-sm sm:text-base leading-tight">
              {isPass && '✓ READY'}
              {isWarning && '⚠ WARNING'}
              {isBlock && '✕ FIX REQUIRED'}
            </h4>
            <p className="text-[11px] opacity-80 mt-0.5">
              File: <strong className="font-mono">{report.fileName}</strong> ({report.fileSizeMb} MB • {report.fileType})
            </p>
          </div>
        </div>

        {/* Action / Inspection Controls */}
        <div className="flex items-center gap-2">
          {onOpenLargeModal && (
            <button
              type="button"
              onClick={onOpenLargeModal}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-yellow-400 hover:border-black transition shadow-2xs"
            >
              <HiOutlineArrowsExpand className="w-3.5 h-3.5" /> Large Preview
            </button>
          )}
          <span
            className={`text-xs font-black px-2.5 py-1 rounded-full shadow-2xs ${
              report.score >= 85
                ? 'bg-green-600 text-white'
                : report.score >= 60
                ? 'bg-yellow-500 text-black'
                : 'bg-red-600 text-white'
            }`}
          >
            {report.score}/100
          </span>
        </div>
      </div>

      {/* 2. Interactive Bleed & Trim Visual Preview (if image preview available) */}
      {report.previewUrl && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2 pb-2 border-b text-[11px]">
            <span className="font-bold text-gray-700 flex items-center gap-1">
              <HiOutlineEye className="w-3.5 h-3.5 text-yellow-500" /> Bleed & Trim Overlay:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBleedGuide(!showBleedGuide)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  showBleedGuide ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
              >
                🔴 Bleed (+3mm)
              </button>
              <button
                type="button"
                onClick={() => setShowTrimGuide(!showTrimGuide)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  showTrimGuide ? 'bg-gray-800 text-white border-black' : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
              >
                ⬛ Trim Cut Line
              </button>
              <button
                type="button"
                onClick={() => setShowSafeZone(!showSafeZone)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  showSafeZone ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
              >
                🟢 Safe Text Zone
              </button>
            </div>
          </div>

          <div
            className="relative max-h-56 overflow-hidden rounded-lg bg-gray-900 flex items-center justify-center p-2 cursor-pointer group"
            onClick={onOpenLargeModal}
            title="Click to inspect in large full-screen modal"
          >
            <img
              src={report.previewUrl}
              alt="Artwork Preview"
              className="max-h-48 max-w-full object-contain rounded select-none"
            />

            {showBleedGuide && (
              <div className="absolute inset-2 border-2 border-dashed border-red-500 pointer-events-none" />
            )}
            {showTrimGuide && (
              <div className="absolute inset-4 border-2 border-yellow-400 pointer-events-none" />
            )}
            {showSafeZone && (
              <div className="absolute inset-6 border border-dashed border-green-500 pointer-events-none" />
            )}

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
                <HiOutlineArrowsExpand className="w-4 h-4 text-yellow-400" /> Click to Inspect Full Size
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Preflight Technical Checklist Findings — kept available but collapsed by default so
          DPI/CMYK/bleed terminology doesn't dominate the screen for a normal customer. */}
      <button
        type="button"
        onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
        className="mt-4 text-[11px] font-bold underline opacity-80 hover:opacity-100"
      >
        {showTechnicalDetails ? 'Hide Technical Details ▲' : 'View Technical Details ▼'}
      </button>

      {showTechnicalDetails && (
      <div className="mt-2 space-y-2 text-xs">
        {/* Resolution DPI */}
        <div className="flex items-start gap-2 bg-white/60 p-2.5 rounded-lg border border-black/5">
          <span className="font-bold min-w-[70px] text-gray-700">Resolution:</span>
          <span className="flex-1 leading-snug">
            {report.dpi?.message || 'Resolution verified for press output.'}
          </span>
          {report.dpi?.status === 'PASS' && (
            <Badge color="success" size="xs">
              Crisp
            </Badge>
          )}
          {report.dpi?.status === 'WARNING' && (
            <Badge color="warning" size="xs">
              Acceptable
            </Badge>
          )}
          {report.dpi?.status === 'ERROR' && (
            <Badge color="failure" size="xs">
              Low DPI
            </Badge>
          )}
        </div>

        {/* Dimensions & Proportions */}
        <div className="flex items-start gap-2 bg-white/60 p-2.5 rounded-lg border border-black/5">
          <span className="font-bold min-w-[70px] text-gray-700">Dimensions:</span>
          <span className="flex-1 leading-snug">
            {report.sizeCheck?.message || 'Dimensions match product trim size.'}
          </span>
          {report.sizeCheck?.status === 'PASS' && (
            <Badge color="success" size="xs">
              Aligned
            </Badge>
          )}
          {report.sizeCheck?.status === 'WARNING' && (
            <Badge color="warning" size="xs">
              Check
            </Badge>
          )}
          {report.sizeCheck?.status === 'ERROR' && (
            <Badge color="failure" size="xs">
              Mismatch
            </Badge>
          )}
        </div>

        {/* Bleed Allowance */}
        <div className="flex items-start gap-2 bg-white/60 p-2.5 rounded-lg border border-black/5">
          <span className="font-bold min-w-[70px] text-gray-700">Bleed (+3mm):</span>
          <span className="flex-1 leading-snug">
            {report.bleedCheck?.message || '+3mm bleed allowance available.'}
          </span>
          {report.bleedCheck?.status === 'PASS' ? (
            <Badge color="success" size="xs">
              Present
            </Badge>
          ) : (
            <Badge color="warning" size="xs">
              Notice
            </Badge>
          )}
        </div>
      </div>
      )}

      {/* 4. Blocking Issues Callout */}
      {isBlock && report.issues && report.issues.length > 0 && (
        <div className="mt-4 p-3 bg-red-100 rounded-xl border border-red-300 text-red-900">
          <h5 className="font-extrabold text-xs mb-1 flex items-center gap-1.5">
            <HiOutlineXCircle className="w-4 h-4 text-red-600" />
            Blocking Error — Please correct before proceeding:
          </h5>
          <ul className="list-disc list-inside text-[11px] space-y-0.5 mt-1">
            {report.issues.map((issue, idx) => (
              <li key={idx} className="font-medium">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Warning Advisory & Mandatory Customer Acknowledgement (Phase 10) */}
      {isWarning && (
        <div className="mt-4 p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-950 space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="preflight-ack-card"
              checked={disclaimerAccepted}
              onChange={onToggleDisclaimer}
              className="text-yellow-500 focus:ring-yellow-400"
            />
            <label htmlFor="preflight-ack-card" className="text-xs font-black cursor-pointer">
              I understand and want to continue with this file.
            </label>
          </div>
          <p className="text-[10px] text-amber-800 leading-relaxed pl-6">
            <strong>PRINT QUALITY NOTICE:</strong> Our automated preflight detected a potential issue with your artwork. If you choose to continue without correcting the file, Print Bazzar cannot guarantee the final print quality resulting from this detected artwork issue.
          </p>
        </div>
      )}

      {/* 6. Action Buttons */}
      <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-black/10">
        <Button
          size="xs"
          color="light"
          onClick={onReUploadClick}
          className="font-bold border-gray-300 hover:bg-gray-100"
        >
          <HiOutlineRefresh className="w-3.5 h-3.5 mr-1" /> Re-upload File
        </Button>

        {isBlock && onSwitchToDesignService && (
          <Button
            size="xs"
            color="warning"
            onClick={onSwitchToDesignService}
            className="font-bold bg-yellow-400 text-black hover:bg-yellow-500 border-none"
          >
            Design It For Me Instead
          </Button>
        )}

        {onOpenLargeModal && (
          <Button
            size="xs"
            color="dark"
            onClick={onOpenLargeModal}
            className="font-bold ml-auto bg-black hover:bg-yellow-400 hover:text-black"
          >
            <HiOutlineEye className="w-3.5 h-3.5 mr-1" /> Inspect Details
          </Button>
        )}
      </div>
    </div>
  );
}
