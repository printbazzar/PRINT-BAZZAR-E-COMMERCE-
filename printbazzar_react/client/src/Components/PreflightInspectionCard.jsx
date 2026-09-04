import React, { useState } from 'react';
import { Button, Badge, Checkbox, Tooltip } from 'flowbite-react';
import {
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineXCircle,
  HiOutlinePhotograph,
  HiOutlineSparkles,
  HiOutlineRefresh,
  HiOutlineEye,
  HiOutlineInformationCircle,
} from 'react-icons/hi';

export default function PreflightInspectionCard({
  report,
  onReUploadClick,
  onSwitchToDesignService,
  disclaimerAccepted,
  onToggleDisclaimer,
}) {
  const [showBleedGuide, setShowBleedGuide] = useState(true);
  const [showTrimGuide, setShowTrimGuide] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(true);

  if (!report) return null;

  const isPass = report.status === 'PASS';
  const isWarning = report.status === 'WARNING';
  const isError = report.status === 'ERROR';

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
          {isError && <HiOutlineXCircle className="w-6 h-6 text-red-600 flex-shrink-0 animate-pulse" />}

          <div>
            <h4 className="font-extrabold text-sm sm:text-base leading-tight">
              {isPass && '✔ Automated Preflight Check: 100% Print-Ready!'}
              {isWarning && '⚠️ Preflight Quality Notice (Acceptable Quality)'}
              {isError && '🚨 CRITICAL PRINT QUALITY ALERT: Issue Detected!'}
            </h4>
            <p className="text-[11px] opacity-80 mt-0.5">
              File: <strong className="font-mono">{report.fileName}</strong> ({report.fileSizeMb} MB • {report.fileType})
            </p>
          </div>
        </div>

        {/* Quality Score Pill */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">Print Fitness:</span>
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

      {/* 2. Interactive Bleed & Trim Overlay Visual Preview (if image preview available) */}
      {report.previewUrl && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2 pb-2 border-b text-[11px]">
            <span className="font-bold text-gray-700 flex items-center gap-1">
              <HiOutlineEye className="w-3.5 h-3.5 text-yellow-500" /> Interactive Bleed & Trim Guides:
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

          <div className="relative max-h-56 overflow-hidden rounded-lg bg-gray-900 flex items-center justify-center p-2">
            {/* Base Image */}
            <img
              src={report.previewUrl}
              alt="Artwork Preview"
              className="max-h-48 max-w-full object-contain rounded"
            />

            {/* Overlaid Guides */}
            <div className="absolute inset-4 pointer-events-none flex items-center justify-center">
              <div className="relative w-full h-full max-w-[85%] max-h-[85%] border-2 border-transparent">
                {/* 1. Bleed Outer Box (Red) */}
                {showBleedGuide && (
                  <div className="absolute -inset-1.5 border border-dashed border-red-500 opacity-80" />
                )}

                {/* 2. Trim Line (Black / White Dash) */}
                {showTrimGuide && (
                  <div className="absolute inset-0 border-2 border-dashed border-white shadow-xs" />
                )}

                {/* 3. Safe Zone (Green) */}
                {showSafeZone && (
                  <div className="absolute inset-2 border border-dotted border-green-400 opacity-90" />
                )}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">
            Keep all essential text inside the <span className="text-green-600 font-bold">Safe Text Zone</span> to prevent cutting during mechanical shearing.
          </p>
        </div>
      )}

      {/* 3. Preflight Checklist Diagnostics Matrix */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        {/* Check 1: Resolution / DPI */}
        <div
          className={`p-2.5 rounded-xl border flex items-start gap-2 ${
            report.dpi.status === 'PASS'
              ? 'bg-white/80 border-green-200'
              : report.dpi.status === 'WARNING'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-100/80 border-red-300'
          }`}
        >
          <span className="text-base mt-0.5">
            {report.dpi.status === 'PASS' ? '🟢' : report.dpi.status === 'WARNING' ? '🟡' : '🔴'}
          </span>
          <div>
            <span className="font-bold text-gray-900 block">
              Resolution & Sharpness: {report.dpi.effectiveDpi ? `${report.dpi.effectiveDpi} DPI` : 'Vector'}
            </span>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{report.dpi.message}</p>
          </div>
        </div>

        {/* Check 2: Dimensions & Ratio */}
        <div
          className={`p-2.5 rounded-xl border flex items-start gap-2 ${
            report.sizeCheck.status === 'PASS'
              ? 'bg-white/80 border-green-200'
              : report.sizeCheck.status === 'WARNING'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-100/80 border-red-300'
          }`}
        >
          <span className="text-base mt-0.5">
            {report.sizeCheck.status === 'PASS' ? '🟢' : report.sizeCheck.status === 'WARNING' ? '🟡' : '🔴'}
          </span>
          <div>
            <span className="font-bold text-gray-900 block">
              Dimensions & Aspect Ratio
            </span>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{report.sizeCheck.message}</p>
          </div>
        </div>

        {/* Check 3: Bleed Margin */}
        <div
          className={`p-2.5 rounded-xl border flex items-start gap-2 ${
            report.bleedCheck.status === 'PASS'
              ? 'bg-white/80 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <span className="text-base mt-0.5">{report.bleedCheck.status === 'PASS' ? '🟢' : '🟡'}</span>
          <div>
            <span className="font-bold text-gray-900 block">Bleed & Cutting Margins</span>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{report.bleedCheck.message}</p>
          </div>
        </div>

        {/* Check 4: Color Space */}
        <div className="p-2.5 rounded-xl border bg-white/80 border-gray-200 flex items-start gap-2">
          <span className="text-base mt-0.5">🎨</span>
          <div>
            <span className="font-bold text-gray-900 block">Color Profile Mode</span>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{report.colorMode.message}</p>
          </div>
        </div>
      </div>

      {/* 4. RED ALERT CRITICAL ACTION BOX (If Error) */}
      {isError && (
        <div className="mt-4 bg-red-600 text-white rounded-xl p-4 shadow-md space-y-3 text-xs">
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
            <HiOutlineExclamation className="w-5 h-5 animate-bounce" /> Attention: Output Quality at Risk
          </div>
          <p className="leading-relaxed opacity-95">
            This file does not meet the minimum print criteria ({report.dpi.effectiveDpi ? `${report.dpi.effectiveDpi} DPI` : 'Resolution issue'}). If printed as-is, logos, photos, and fine typography will look pixelated or blurry on the final physical product.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            {/* Action A: Re-upload */}
            <Button
              size="xs"
              color="light"
              onClick={onReUploadClick}
              className="flex-1 bg-white text-black font-extrabold hover:bg-gray-100"
            >
              <HiOutlineRefresh className="w-4 h-4 mr-1" /> Re-Upload High-Res (300 DPI)
            </Button>

            {/* Action B: Switch to Professional Design */}
            <Button
              size="xs"
              onClick={onSwitchToDesignService}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-black"
            >
              <HiOutlineSparkles className="w-4 h-4 mr-1 text-purple-700" /> Let Designer Fix & Recreate (+₹200)
            </Button>
          </div>

          {/* Action C: Explicit Low-Quality Consent Disclaimer */}
          <div className="pt-2 border-t border-red-400/50 flex items-start gap-2">
            <Checkbox
              id="low-quality-disclaimer"
              checked={disclaimerAccepted}
              onChange={onToggleDisclaimer}
              className="mt-0.5 focus:ring-yellow-400"
            />
            <label
              htmlFor="low-quality-disclaimer"
              className="text-[11px] text-white cursor-pointer font-medium select-none"
            >
              I understand that the uploaded file resolution is low and may produce blurred/pixelated prints. I accept full responsibility and wish to proceed anyway.
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
