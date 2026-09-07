import React from 'react';

export const ORDER_SOURCES = [
  { key: 'WEBSITE', label: 'Website', icon: '🌐', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'WALK_IN', label: 'Walk-in Store', icon: '🏪', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: '💬', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'INSTAGRAM', label: 'Instagram', icon: '📸', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { key: 'PHONE', label: 'Phone Order', icon: '📞', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'B2B', label: 'B2B Corporate', icon: '🏢', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'STAFF_ASSISTED', label: 'Staff Assisted', icon: '👨‍💼', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
];

export default function OrderSourceBadge({ source = 'WEBSITE', size = 'md' }) {
  const normalized = (source || 'WEBSITE').toUpperCase();
  const meta = ORDER_SOURCES.find((s) => s.key === normalized) || {
    key: normalized,
    label: normalized.replace(/_/g, ' '),
    icon: '📦',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0.5' 
    : size === 'lg' 
    ? 'text-sm px-3 py-1.5' 
    : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-md border ${meta.color} ${sizeClasses}`}
      title={`Order Source: ${meta.label}`}
    >
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}
