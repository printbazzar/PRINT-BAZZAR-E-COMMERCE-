import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BsFacebook,
  BsInstagram,
  BsWhatsapp,
  BsYoutube,
  BsLinkedin,
} from "react-icons/bs";
import {
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineSparkles,
  HiOutlineExternalLink,
} from "react-icons/hi";
import logo from "../assets/images/logo_white.png";
import { api } from "../services/api";

// Embedded default fallback so the footer renders instantly with zero layout shift
const DEFAULT_STORE_DATA = {
  brand: {
    companyName: "PRINT BAZZAR",
    description:
      "Your one-stop destination for custom printing, branding, signage, packaging, graphic design and personalized gifts. Industrial high-definition digital offset technology in Tamil Nadu.",
    socialLinks: [
      { platform: "whatsapp", label: "WhatsApp", url: "https://wa.me/919629098565", isEnabled: true },
      { platform: "instagram", label: "Instagram", url: "https://instagram.com/print_bazzar", isEnabled: true },
      { platform: "facebook", label: "Facebook", url: "https://www.facebook.com/printbazzartry?mibextid=ZbWKwL", isEnabled: true },
    ],
  },
  contact: {
    companyName: "Print Bazzar",
    address: "12 A, Allimal Street, Big Bazzar St",
    city: "Tiruchirappalli",
    state: "Tamil Nadu",
    country: "India",
    pincode: "620008",
    primaryPhone: "+91 96290 98565",
    secondaryPhone: "+91 90802 85852",
    supportEmail: "printbazzar.online@gmail.com",
    salesEmail: "orders@printbazzar.online",
    workingDays: "Monday – Saturday",
    openingTime: "9:30 AM",
    closingTime: "8:30 PM",
    sundayHours: "10:00 AM – 2:00 PM",
    googleMapsUrl: "https://maps.google.com/?q=Print+Bazzar+Trichy",
  },
  whatsapp: {
    isEnabled: true,
    phoneNumber: "+91 96290 98565",
    buttonText: "Need Help? Chat with us on WhatsApp",
    defaultMessage: "Hello Print Bazzar, I need help with my order.",
  },
  categories: {
    title: "SHOP BY CATEGORY",
    items: [
      { name: "Business Cards", url: "/category/business-cards" },
      { name: "Stickers & Labels", url: "/category/stickers-and-labels" },
      { name: "Flyers & Brochures", url: "/category/marketing-and-promotionals-items" },
      { name: "Letterheads & Essentials", url: "/category/business-essentials" },
      { name: "Invitations & Cards", url: "/category/invitations" },
      { name: "Custom Packaging", url: "/category/packaging-items" },
    ],
    showAllLink: true,
    allLinkText: "Browse All Collections ➔",
    allLinkUrl: "/shop",
  },
  supportLinks: [
    { id: "supp-1", label: "Track My Order", url: "/track-order" },
    { id: "supp-2", label: "Customer & B2B Portal", url: "/account/login" },
    { id: "supp-3", label: "My Account Dashboard", url: "/account/dashboard" },
    { id: "supp-4", label: "File Requirements & Bleed", url: "/policy/file-requirements" },
    { id: "supp-5", label: "Shipping & Delivery Info", url: "/shipping-policy" },
    { id: "supp-6", label: "Returns & Refund Policy", url: "/refund-policy" },
    { id: "supp-7", label: "Cancellation Policy", url: "/cancellation-policy" },
    { id: "supp-8", label: "Frequently Asked Questions", url: "/contact-us#faq" },
    { id: "supp-9", label: "Contact Help Desk", url: "/contact-us" },
  ],
  businessLinks: [
    { id: "biz-1", label: "Corporate & Bulk Orders", url: "/quote?type=corporate" },
    { id: "biz-2", label: "Wholesale Commercial Printing", url: "/quote?type=bulk" },
    { id: "biz-3", label: "Business Brand Identity", url: "/quote?type=branding" },
    { id: "biz-4", label: "Custom Packaging & Boxes", url: "/category/packaging-items" },
    { id: "biz-5", label: "Signage & Outdoor Banners", url: "/category/signages" },
    { id: "biz-6", label: "Reseller & Partner Program", url: "/contact-us?subject=partner" },
    { id: "biz-7", label: "Become a Print Vendor", url: "/contact-us?subject=vendor" },
    { id: "biz-8", label: "Request a Custom Quotation", url: "/quote" },
  ],
  legalLinks: [
    { id: "leg-1", label: "Terms & Conditions", url: "/terms" },
    { id: "leg-2", label: "Privacy Policy", url: "/privacy" },
    { id: "leg-3", label: "Shipping Policy", url: "/shipping-policy" },
    { id: "leg-4", label: "Return & Refund Policy", url: "/refund-policy" },
    { id: "leg-5", label: "Cancellation Policy", url: "/cancellation-policy" },
    { id: "leg-6", label: "Cookie Policy", url: "/cookie-policy" },
  ],
  trustBadges: [
    { id: "trust-1", icon: "HiOutlineShieldCheck", title: "100% Quality Guaranteed", description: "Industrial precision offset printing" },
    { id: "trust-2", icon: "HiOutlineTruck", title: "Express All India Delivery", description: "Fast & reliable doorstep dispatch" },
    { id: "trust-3", icon: "HiOutlineClock", title: "Live Order Tracking", description: "Track production stage 24/7" },
    { id: "trust-4", icon: "BsWhatsapp", title: "WhatsApp Order Desk", description: "Instant prepress assistance" },
  ],
  paymentMethods: [
    { id: "pay-1", code: "UPI", label: "UPI" },
    { id: "pay-2", code: "GPAY", label: "GPay" },
    { id: "pay-3", code: "PHONEPE", label: "PhonePe" },
    { id: "pay-4", code: "CARDS", label: "Cards / NetBanking" },
    { id: "pay-5", code: "COD", label: "COD" },
  ],
  seo: {
    isEnabled: true,
    text: "Print Bazzar provides professional online printing, custom printing, business cards, flyers, brochures, stickers, banners, signage, packaging, branding solutions, graphic design and personalized corporate gifts across India.",
  },
  copyright: {
    text: "Print Bazzar. All Rights Reserved.",
    madeInIndiaText: "Proudly Made with ❤️ in India",
    showGstin: true,
    gstin: "33AAAAA0000A1Z5",
    companyRegNumber: "UDYAM-TN-27-0000000",
  },
};

export default function FooterCom() {
  const [data, setData] = useState(DEFAULT_STORE_DATA);

  // Mobile Accordion open states
  const [openSections, setOpenSections] = useState({
    categories: false,
    support: false,
    business: false,
    contact: false,
  });

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  useEffect(() => {
    api
      .getPublicFooterSettings()
      .then((res) => {
        if (res && res.success && res.data) {
          setData(res.data);
        }
      })
      .catch((err) => {
        console.warn("Using fallback footer settings:", err.message);
      });
  }, []);

  const currentYear = new Date().getFullYear();

  // Clean WhatsApp Link Builder
  const cleanPhone = (data.whatsapp?.phoneNumber || data.contact?.primaryPhone || "919629098565").replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(data.whatsapp?.defaultMessage || "Hello Print Bazzar, I need assistance.")}`;

  return (
    <footer className="bg-black text-gray-300 border-t-4 border-yellow-400 select-none text-xs" role="contentinfo" aria-label="Footer">
      {/* 1. HORIZONTAL TRUST & ASSURANCE BAR */}
      {data.trustBadges && data.trustBadges.length > 0 && (
        <div className="border-b border-gray-800 py-6 bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {data.trustBadges.map((badge, idx) => (
              <div key={badge.id || idx} className="flex items-center gap-3 p-2 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 flex-shrink-0">
                  {idx === 0 && <HiOutlineShieldCheck className="w-6 h-6" />}
                  {idx === 1 && <HiOutlineTruck className="w-6 h-6" />}
                  {idx === 2 && <HiOutlineClock className="w-6 h-6" />}
                  {idx === 3 && <BsWhatsapp className="w-5 h-5 text-green-400" />}
                  {idx > 3 && <HiOutlineSparkles className="w-5 h-5" />}
                </div>
                <div>
                  <h5 className="font-extrabold text-white text-xs sm:text-sm">{badge.title}</h5>
                  {badge.description && (
                    <p className="text-gray-400 text-[10px] sm:text-[11px] mt-0.5 line-clamp-1">{badge.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. MAIN FOOTER CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">
          {/* COLUMN 1: BRAND INFORMATION & SOCIAL MEDIA (Always visible, lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-4 pr-0 lg:pr-6">
            <Link to="/" aria-label="Print Bazzar Home" className="inline-block">
              <img src={logo} alt="Print Bazzar Logo" className="h-9 sm:h-10 w-auto" />
            </Link>

            <p className="text-gray-400 leading-relaxed text-xs">
              {data.brand?.description || DEFAULT_STORE_DATA.brand.description}
            </p>

            {/* Configurable Social Media Links */}
            {data.brand?.socialLinks && data.brand.socialLinks.some((s) => s.isEnabled && s.url) && (
              <div className="pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-2">
                  Follow Our Press
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {data.brand.socialLinks
                    .filter((s) => s.isEnabled && s.url)
                    .map((s) => (
                      <a
                        key={s.platform}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Visit Print Bazzar on ${s.label || s.platform}`}
                        className="w-8 h-8 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-yellow-400 hover:border-yellow-400 hover:text-black transition-all"
                      >
                        {s.platform === "whatsapp" && <BsWhatsapp className="w-4 h-4 text-green-400" />}
                        {s.platform === "instagram" && <BsInstagram className="w-4 h-4 text-pink-400" />}
                        {s.platform === "facebook" && <BsFacebook className="w-4 h-4 text-blue-500" />}
                        {s.platform === "youtube" && <BsYoutube className="w-4 h-4 text-red-500" />}
                        {s.platform === "linkedin" && <BsLinkedin className="w-4 h-4 text-blue-400" />}
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 2: SHOP BY CATEGORY (Desktop static, Mobile collapsible accordion) */}
          <div className="lg:col-span-2 border-t border-gray-800/80 md:border-t-0 pt-4 md:pt-0">
            <button
              type="button"
              onClick={() => toggleSection("categories")}
              className="w-full md:cursor-default flex items-center justify-between text-left pb-2 md:pb-3 border-b border-gray-800"
              aria-expanded={openSections.categories}
            >
              <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                {data.categories?.title || "SHOP BY CATEGORY"}
              </h4>
              <span className="md:hidden text-gray-400">
                {openSections.categories ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <ul className={`mt-3 space-y-2 text-xs text-gray-400 ${openSections.categories ? "block" : "hidden md:block"}`}>
              {(data.categories?.items || []).map((cat, idx) => (
                <li key={cat.slug || idx}>
                  <Link
                    to={cat.url || `/category/${cat.slug}`}
                    className="hover:text-yellow-300 transition-colors py-1 block"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              {data.categories?.showAllLink !== false && (
                <li className="pt-1">
                  <Link
                    to={data.categories?.allLinkUrl || "/shop"}
                    className="text-yellow-400 hover:text-yellow-300 font-extrabold transition-colors flex items-center gap-1"
                  >
                    <span>{data.categories?.allLinkText || "View All Categories ➔"}</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* COLUMN 3: CUSTOMER SUPPORT LINKS */}
          <div className="lg:col-span-2 border-t border-gray-800/80 md:border-t-0 pt-4 md:pt-0">
            <button
              type="button"
              onClick={() => toggleSection("support")}
              className="w-full md:cursor-default flex items-center justify-between text-left pb-2 md:pb-3 border-b border-gray-800"
              aria-expanded={openSections.support}
            >
              <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                Customer Support
              </h4>
              <span className="md:hidden text-gray-400">
                {openSections.support ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <ul className={`mt-3 space-y-2 text-xs text-gray-400 ${openSections.support ? "block" : "hidden md:block"}`}>
              {(data.supportLinks || []).map((link, idx) => (
                <li key={link.id || idx}>
                  {link.isExternal ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-yellow-300 transition-colors py-1 flex items-center gap-1"
                    >
                      <span>{link.label}</span>
                      <HiOutlineExternalLink className="w-3 h-3 text-gray-500" />
                    </a>
                  ) : (
                    <Link
                      to={link.url}
                      className={`hover:text-yellow-300 transition-colors py-1 block ${
                        link.url === "/track-order" ? "text-yellow-400 font-extrabold" : ""
                      }`}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 4: BUSINESS SERVICES (B2B Lead Generation) */}
          <div className="lg:col-span-2 border-t border-gray-800/80 md:border-t-0 pt-4 md:pt-0">
            <button
              type="button"
              onClick={() => toggleSection("business")}
              className="w-full md:cursor-default flex items-center justify-between text-left pb-2 md:pb-3 border-b border-gray-800"
              aria-expanded={openSections.business}
            >
              <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                Business Services
              </h4>
              <span className="md:hidden text-gray-400">
                {openSections.business ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <ul className={`mt-3 space-y-2 text-xs text-gray-400 ${openSections.business ? "block" : "hidden md:block"}`}>
              {(data.businessLinks || []).map((link, idx) => (
                <li key={link.id || idx}>
                  {link.isExternal ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-yellow-300 transition-colors py-1 flex items-center gap-1"
                    >
                      <span>{link.label}</span>
                      <HiOutlineExternalLink className="w-3 h-3 text-gray-500" />
                    </a>
                  ) : (
                    <Link
                      to={link.url}
                      className="hover:text-yellow-300 transition-colors py-1 block"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 5: CONTACT INFORMATION & WHATSAPP SUPPORT */}
          <div className="lg:col-span-2 border-t border-gray-800/80 md:border-t-0 pt-4 md:pt-0 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection("contact")}
              className="w-full md:cursor-default flex items-center justify-between text-left pb-2 md:pb-3 border-b border-gray-800"
              aria-expanded={openSections.contact}
            >
              <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                Contact & Press
              </h4>
              <span className="md:hidden text-gray-400">
                {openSections.contact ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <div className={`space-y-3 ${openSections.contact ? "block" : "hidden md:block"}`}>
              {/* Address with Google Maps link */}
              <div className="flex items-start gap-2 text-gray-300">
                <HiOutlineLocationMarker className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                {data.contact?.googleMapsUrl ? (
                  <a
                    href={data.contact.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-yellow-300 transition-colors text-[11px]"
                  >
                    {data.contact.address}, {data.contact.city}, {data.contact.state} - {data.contact.pincode}
                  </a>
                ) : (
                  <span className="text-[11px]">
                    {data.contact?.address}, {data.contact?.city} - {data.contact?.pincode}
                  </span>
                )}
              </div>

              {/* Phone with tel: */}
              {data.contact?.primaryPhone && (
                <div className="flex items-center gap-2">
                  <HiOutlinePhone className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <a
                    href={`tel:${data.contact.primaryPhone.replace(/[^0-9+]/g, "")}`}
                    className="hover:text-yellow-300 font-bold text-xs"
                  >
                    {data.contact.primaryPhone}
                  </a>
                </div>
              )}

              {/* Email with mailto: */}
              {data.contact?.supportEmail && (
                <div className="flex items-center gap-2">
                  <HiOutlineMail className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <a
                    href={`mailto:${data.contact.supportEmail}`}
                    className="hover:text-yellow-300 text-[11px] truncate"
                  >
                    {data.contact.supportEmail}
                  </a>
                </div>
              )}

              {/* Working Hours */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-[11px] text-gray-400 space-y-1">
                <p className="flex justify-between">
                  <span>Mon - Sat:</span>
                  <span className="font-bold text-white">
                    {data.contact?.openingTime || "9:30 AM"} – {data.contact?.closingTime || "8:30 PM"}
                  </span>
                </p>
                {data.contact?.sundayHours && (
                  <p className="flex justify-between">
                    <span>Sunday:</span>
                    <span className="text-yellow-400 font-bold">{data.contact.sundayHours}</span>
                  </p>
                )}
              </div>

              {/* Prominent WhatsApp Support Button */}
              {data.whatsapp?.isEnabled !== false && (
                <div className="pt-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xs py-2.5 px-3 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all group"
                  >
                    <BsWhatsapp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>{data.whatsapp?.buttonText || "Chat on WhatsApp"}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. OPTIONAL SEO CONTENT BLOCK */}
        {data.seo?.isEnabled !== false && data.seo?.text && (
          <div className="mt-10 pt-6 border-t border-gray-800/80">
            <p className="text-[11px] text-gray-500 leading-relaxed max-w-5xl mx-auto text-center">
              {data.seo.text}
            </p>
          </div>
        )}

        {/* 4. LEGAL & POLICIES NAVIGATION ROW */}
        {data.legalLinks && data.legalLinks.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-800 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[11px] text-gray-400">
            {data.legalLinks.map((leg, idx) => (
              <Link
                key={leg.id || idx}
                to={leg.url}
                className="hover:text-yellow-300 transition-colors"
              >
                {leg.label}
              </Link>
            ))}
          </div>
        )}

        {/* 5. BOTTOM BAR: COPYRIGHT, MADE IN INDIA, GSTIN & PAYMENT BADGES */}
        <div className="mt-6 pt-6 border-t border-gray-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-gray-500">
          <div className="space-y-1 text-center sm:text-left">
            <p>
              © {currentYear} {data.copyright?.text || "Print Bazzar. All Rights Reserved."}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[10px] text-gray-400">
              {data.copyright?.madeInIndiaText && (
                <span>{data.copyright.madeInIndiaText}</span>
              )}
              {data.copyright?.showGstin && data.copyright?.gstin && (
                <span>• GSTIN: <strong className="font-mono text-gray-300">{data.copyright.gstin}</strong></span>
              )}
              {data.copyright?.companyRegNumber && (
                <span>• MSME: <strong className="font-mono text-gray-300">{data.copyright.companyRegNumber}</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
