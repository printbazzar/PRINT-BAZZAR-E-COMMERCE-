import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineTruck, HiOutlineShieldCheck } from 'react-icons/hi';

// Phase 2B visual polish: reduced from a busy 6-item bar (delivery perk,
// quality guarantee, press-unit address, phone number, WhatsApp link, track
// order) to the 3 highest-value items only, in a single compact centered
// row. Bar height/padding is unchanged (py-2) — content was trimmed, not
// the bar's size. Phone/WhatsApp contact are still reachable via the
// floating WhatsApp widget, so dropping them here removes duplication
// rather than losing functionality.
export default function TopAnnouncementBar() {
  return (
    <div className="bg-[#0f0f0f] text-gray-300 text-[11px] sm:text-xs py-2 px-4 border-b border-gray-800/80">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5 sm:gap-4">
        <span className="flex items-center gap-1.5 font-medium text-white">
          <HiOutlineTruck className="w-3.5 h-3.5 text-yellow-400" />
          <span>Free Delivery ₹1500+</span>
        </span>

        <span className="text-gray-700">|</span>

        <span className="hidden sm:flex items-center gap-1.5 text-gray-300">
          <HiOutlineShieldCheck className="w-3.5 h-3.5 text-green-400" />
          <span>100% Quality Guaranteed</span>
        </span>
        <span className="hidden sm:inline text-gray-700">|</span>

        <Link
          to="/track-order"
          className="font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          Track Order ➔
        </Link>
      </div>
    </div>
  );
}
