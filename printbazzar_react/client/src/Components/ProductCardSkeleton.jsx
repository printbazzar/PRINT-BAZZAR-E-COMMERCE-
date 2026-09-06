import React from 'react';

/**
 * Modern Responsive Product Card Skeleton Grid
 * Matches exact aspect ratio, card borders, margins, and typography of live product cards.
 * Prevents layout shift (CLS = 0) during initial data load.
 */
export function ProductCardSkeletonItem() {
  return (
    <div className="flex flex-col justify-between text-center bg-white rounded-2xl border-0 shadow-xs p-2.5 sm:p-3 overflow-hidden animate-pulse">
      <div>
        {/* Aspect-square image container placeholder */}
        <div className="relative w-full aspect-square bg-gray-100/90 rounded-2xl flex items-center justify-center p-3 sm:p-4">
          <div className="w-16 h-16 rounded-xl bg-gray-200/70"></div>
        </div>

        {/* Title skeleton */}
        <div className="mt-3 px-1 space-y-1.5">
          <div className="h-4 bg-gray-200/80 rounded-md w-4/5 mx-auto"></div>
          <div className="h-3 bg-gray-100 rounded-md w-3/5 mx-auto"></div>
        </div>
      </div>

      {/* Footer / Price row skeleton */}
      <div className="mt-4 pt-2 border-t border-gray-50 flex items-center justify-between px-1">
        <div className="space-y-1 text-left">
          <div className="h-2.5 bg-gray-200/60 rounded w-10"></div>
          <div className="h-4 bg-gray-200 rounded w-14"></div>
        </div>
        <div className="h-6 w-20 bg-gray-200/70 rounded-lg"></div>
      </div>
    </div>
  );
}

export default function ProductCardSkeletonGrid({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeletonItem key={idx} />
      ))}
    </div>
  );
}
