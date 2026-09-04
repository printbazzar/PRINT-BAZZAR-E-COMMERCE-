import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineTruck, HiOutlineShieldCheck, HiOutlinePhone, HiOutlineLocationMarker } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { useBusinessInfo } from '../context/BusinessInfoContext';

export default function TopAnnouncementBar() {
  const { businessInfo, getWhatsAppLink, getPhoneLink } = useBusinessInfo();

  const primaryPhone = businessInfo.contact?.primaryPhone || '+91 96290 98565';
  const city = businessInfo.address?.city || 'Trichy';
  const streetShort = businessInfo.address?.street?.split('/')[0]?.trim() || 'Big Bazzar St';

  return (
    <div className="bg-[#0f0f0f] text-gray-300 text-[11px] sm:text-xs py-2 px-4 border-b border-gray-800/80">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Left: Trust & Delivery Perks */}
        <div className="flex items-center gap-4 sm:gap-6 text-gray-300">
          <span className="flex items-center gap-1.5 font-medium text-white">
            <HiOutlineTruck className="w-3.5 h-3.5 text-yellow-400" />
            <span>FREE Delivery on ₹1500+</span>
          </span>
          <span className="hidden md:inline-block text-gray-700">|</span>
          <span className="hidden md:flex items-center gap-1.5 text-gray-300">
            <HiOutlineShieldCheck className="w-3.5 h-3.5 text-green-400" />
            <span>100% Quality Guaranteed</span>
          </span>
          <span className="hidden lg:inline-block text-gray-700">|</span>
          <span className="hidden lg:flex items-center gap-1.5 text-gray-300">
            <HiOutlineLocationMarker className="w-3.5 h-3.5 text-yellow-400" />
            <span>Press Unit: {streetShort}, {city}</span>
          </span>
        </div>

        {/* Right: Direct Helpline & Order Tracking */}
        <div className="flex items-center gap-3 sm:gap-5">
          <a
            href={getPhoneLink()}
            className="flex items-center gap-1.5 text-gray-200 hover:text-yellow-400 transition-colors font-medium"
          >
            <HiOutlinePhone className="w-3.5 h-3.5 text-yellow-400" />
            <span>{primaryPhone}</span>
          </a>

          <span className="text-gray-700">|</span>

          <a
            href={getWhatsAppLink(`Hello ${businessInfo.brand?.brandName || 'Print Bazzar'} team, I have an inquiry regarding custom printing.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-green-400 hover:text-green-300 font-semibold"
          >
            <FaWhatsapp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp Help</span>
          </a>

          <span className="hidden sm:inline text-gray-700">|</span>

          <Link
            to="/track-order"
            className="hidden sm:inline font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            Track Order ➔
          </Link>
        </div>
      </div>
    </div>
  );
}
