import React, { useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Breadcrumb } from 'flowbite-react';
import {
  HiHome,
  HiOutlineDocumentText,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineRefresh,
  HiOutlineExclamation,
  HiOutlinePhone,
  HiOutlineMail,
} from 'react-icons/hi';
import { BsWhatsapp } from 'react-icons/bs';
import { useBusinessInfo } from '../context/BusinessInfoContext';

const POLICY_DATA = {
  'terms': {
    title: 'Terms & Conditions',
    subtitle: 'Standard Service & Production Terms for Print Bazzar Custom Printing',
    lastUpdated: 'September 2026',
    icon: HiOutlineDocumentText,
    sections: [
      {
        heading: '1. Order Acceptance & Prepress Verification',
        content: `All orders submitted through Print Bazzar are subject to prepress review. We reserve the right to decline or request modifications for files with insufficient resolution (<300 DPI), incorrect color profile (non-CMYK), missing bleeds, or content that violates copyright laws. Production begins only after payment confirmation and digital proof approval.`,
      },
      {
        heading: '2. Artwork Responsibility & Customer Approval',
        content: `Customers providing "Print-Ready Files" are solely responsible for layout accuracy, spelling, grammar, dimensions, and image quality. Print Bazzar conducts preflight analysis to check technical specs (DPI, trim box), but does not proofread text. Once a digital proof is approved by the customer, no further changes can be made once plates are cast or digital presses run.`,
      },
      {
        heading: '3. Color Matching & Print Tolerance',
        content: `While we employ calibrated four-color digital offset presses and high-grade European paper stocks, slight color variations (within industry standard delta-E tolerance of 5%) may occur between screen RGB representations and physical CMYK ink on coated/uncoated substrates. Exact pantone matching is available for custom corporate orders upon request.`,
      },
      {
        heading: '4. Quantity Variance & Turnaround Times',
        content: `Commercial printing is subject to a production tolerance of ±2% in quantity due to setup sheets and post-press trimming. Stated turnaround times (e.g. 24-48 hours for standard cards) represent production time at our Trichy press facility and exclude transit time via third-party couriers.`,
      },
      {
        heading: '5. Limitation of Liability',
        content: `Print Bazzar’s maximum liability for any defective or damaged merchandise is strictly limited to the reprint of the affected order items or refund of the purchase price. We are not liable for consequential damages, missed event deadlines caused by courier transit delays, or third-party commercial losses.`,
      },
    ],
  },
  'privacy': {
    title: 'Privacy Policy',
    subtitle: 'How Print Bazzar protects your customer data, design files, and payment information',
    lastUpdated: 'September 2026',
    icon: HiOutlineShieldCheck,
    sections: [
      {
        heading: '1. Information We Collect',
        content: `We collect essential information required to fulfill your custom printing orders: customer name, delivery address, phone number, email address, company details, GSTIN for B2B billing, and artwork/logo files uploaded for production.`,
      },
      {
        heading: '2. Payment Security & Zero Card Storage',
        content: `We never store, log, or process raw credit card, debit card numbers, or UPI PINs on our servers. All online transactions are processed through RBI-authorized payment gateways (such as Razorpay) utilizing 256-bit SSL encryption and strict PCI-DSS Level 1 compliance.`,
      },
      {
        heading: '3. Artwork File Confidentiality',
        content: `Your proprietary design files, visiting card contacts, brand trademarks, and proprietary templates are treated with strict commercial confidentiality. Artwork uploaded to Print Bazzar is accessed strictly by authorized prepress technicians and automated RIP engines solely for the purpose of fulfilling your order. We never sell, share, or repurpose your design assets.`,
      },
      {
        heading: '4. Cookies & Session Storage',
        content: `We utilize secure, HttpOnly session cookies to maintain customer authentication and cart items. Cookies are not used to track your behavior across third-party websites or for invasive ad-retargeting.`,
      },
    ],
  },
  'shipping-policy': {
    title: 'Shipping & Delivery Policy',
    subtitle: 'Doorstep Delivery, Store Pickup & Transit Guidelines across India',
    lastUpdated: 'September 2026',
    icon: HiOutlineTruck,
    sections: [
      {
        heading: '1. Dispatch Timeline',
        content: `Standard printing products (business cards, flyers, stickers) are dispatched within 24 to 48 business hours following artwork approval. Specialized finishes (Spot UV, Gold Foil, Die-Cutting, Hardcover packaging) require 3 to 5 business days for precision curing and manual finishing.`,
      },
      {
        heading: '2. Courier Partners & Pan-India Coverage',
        content: `We ship to over 19,000 pincodes across India via reliable express logistics partners including DTDC, ST Courier, Professional Couriers, and Delhivery. Local Trichy deliveries are dispatched via express local couriers.`,
      },
      {
        heading: '3. Store Pickup (Trichy Main Press)',
        content: `Customers in and around Tiruchirappalli may select "Store Pickup" at checkout at zero shipping cost. You will receive an SMS and WhatsApp notification once your job passes Quality Inspection and is packed at our counter: 12 A, Allimal Street, Big Bazzar St, Trichy.`,
      },
      {
        heading: '4. Tracking & Delivery Inspection',
        content: `Once dispatched, a live tracking number and URL are sent via SMS and email. You can also track your shipment status anytime on our website at /track-order. Please inspect external parcels upon delivery and report any transit damage within 24 hours.`,
      },
    ],
  },
  'refund-policy': {
    title: 'Return & Refund Policy',
    subtitle: 'Our 100% Quality Commitment and Reprint Policy',
    lastUpdated: 'September 2026',
    icon: HiOutlineRefresh,
    sections: [
      {
        heading: '1. Quality Guarantee & Free Reprints',
        content: `We take immense pride in our print precision. If your delivered order has manufacturing defects attributable to Print Bazzar — such as miscuts greater than 2mm, incorrect lamination, severe ink smudging, or paper stock errors — we will immediately issue a priority 100% FREE REPRINT at no additional cost.`,
      },
      {
        heading: '2. Custom Merchandise Return Limitations',
        content: `Because printed items (business cards, personalized letterheads, custom stickers) are customized specifically to your artwork and text, they cannot be returned or resold to other customers. Therefore, returns for reasons unrelated to manufacturing defects (e.g., customer typos, low-resolution original image supplied, wrong size selected by customer) cannot be accepted.`,
      },
      {
        heading: '3. How to File a Claim',
        content: `To request a reprint or refund for defective items, please notify our Quality Control desk within 48 hours of delivery by sending photos of the defect and your Order Number to printbazzar.online@gmail.com or WhatsApp +91 96290 98565. Approved reprints are prioritized in our production queue within 24 hours.`,
      },
    ],
  },
  'cancellation-policy': {
    title: 'Cancellation Policy',
    subtitle: 'Cancellation conditions for customized print orders',
    lastUpdated: 'September 2026',
    icon: HiOutlineExclamation,
    sections: [
      {
        heading: '1. Before Plate Making / Printing',
        content: `Orders can be cancelled with a full refund if requested before the job enters the "PRODUCTION_QUEUE" / Plate Making stage. For orders with graphic design support, the design service fee is non-refundable once designer briefing and drafts have commenced.`,
      },
      {
        heading: '2. After Production Commences',
        content: `Once printing, paper cutting, or laminating has started for your job, cancellations cannot be accepted as paper stock and raw materials have already been irreversibly committed.`,
      },
    ],
  },
  'file-requirements': {
    title: 'File Requirements & Bleed Guidelines',
    subtitle: 'Prepress specifications to ensure flawless print results',
    lastUpdated: 'September 2026',
    icon: HiOutlineDocumentText,
    sections: [
      {
        heading: '1. Preferred File Formats',
        content: `For optimal sharpness and vector fidelity, we recommend: PDF (Print-Ready PDF/X-1a), Adobe Illustrator (.AI), CorelDraw (.CDR), or Adobe Photoshop (.PSD). High-resolution TIFF and PNG (minimum 300 DPI) are also accepted.`,
      },
      {
        heading: '2. Color Mode & Resolution',
        content: `Always design in CMYK color mode. RGB files will automatically be converted to CMYK by our RIP processor, which may cause slight shifts in ultra-bright neon tones. Ensure all raster artwork is at least 300 DPI at 100% finished size.`,
      },
      {
        heading: '3. Bleed, Trim & Safe Margins',
        content: `Include 2mm (0.08 inches) bleed on all four sides of your document. Keep all critical text, logos, and borders at least 3mm (0.12 inches) inside the trim line to prevent accidental clipping during industrial guillotining.`,
      },
      {
        heading: '4. Fonts & Outlines',
        content: `Convert all text to curves / outlines (Ctrl+Shift+O in Illustrator, Ctrl+Q in CorelDraw) or embed all font subsets before exporting your PDF. This prevents missing font substitutions on our RIP servers.`,
      },
    ],
  },
  'cookie-policy': {
    title: 'Cookie Policy',
    subtitle: 'Information regarding cookies and session management on Print Bazzar',
    lastUpdated: 'September 2026',
    icon: HiOutlineShieldCheck,
    sections: [
      {
        heading: '1. Essential Cookies Only',
        content: `Print Bazzar uses only essential functional cookies required for core website operation: maintaining your active shopping cart items, authenticating customer account sessions, and securing checkout forms against CSRF attacks.`,
      },
      {
        heading: '2. No Third-Party Tracking',
        content: `We do not deploy invasive third-party ad network tracking cookies or cross-site fingerprinting scripts. Your browsing history remains private.`,
      },
    ],
  },
};

export default function PolicyPage() {
  const { slug } = useParams();
  const location = useLocation();

  // Determine policy key from URL path or param
  let policyKey = slug || 'terms';
  const path = location.pathname.replace(/^\//, '');
  if (path === 'terms' || path === 'terms-and-conditions') policyKey = 'terms';
  else if (path === 'privacy' || path === 'privacy-policy') policyKey = 'privacy';
  else if (path === 'shipping-policy') policyKey = 'shipping-policy';
  else if (path === 'refund-policy' || path === 'returns') policyKey = 'refund-policy';
  else if (path === 'cancellation-policy') policyKey = 'cancellation-policy';
  else if (path === 'cookie-policy') policyKey = 'cookie-policy';
  else if (path === 'file-requirements') policyKey = 'file-requirements';

  const policy = POLICY_DATA[policyKey] || POLICY_DATA['terms'];
  const IconComponent = policy.icon || HiOutlineDocumentText;
  const { businessInfo, getWhatsAppLink, getPhoneLink, getEmailLink } = useBusinessInfo();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = `${policy.title} | ${businessInfo.brand?.brandName || 'Print Bazzar'} Legal & Policy`;
  }, [policyKey, policy.title, businessInfo.brand?.brandName]);

  const allPolicyLinks = [
    { key: 'terms', label: 'Terms & Conditions', path: '/terms' },
    { key: 'privacy', label: 'Privacy Policy', path: '/privacy' },
    { key: 'shipping-policy', label: 'Shipping & Delivery', path: '/shipping-policy' },
    { key: 'refund-policy', label: 'Returns & Refunds', path: '/refund-policy' },
    { key: 'cancellation-policy', label: 'Cancellation Policy', path: '/cancellation-policy' },
    { key: 'file-requirements', label: 'File Requirements', path: '/policy/file-requirements' },
    { key: 'cookie-policy', label: 'Cookie Policy', path: '/cookie-policy' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <Breadcrumb className="text-xs sm:text-sm mb-6">
          <Breadcrumb.Item icon={HiHome}>
            <Link to="/" className="hover:underline text-gray-700">Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <span className="text-gray-500">Legal & Policies</span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <span className="font-semibold text-gray-900">{policy.title}</span>
          </Breadcrumb.Item>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Quick Navigation Sidebar */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs sticky top-24">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 pb-3 border-b border-gray-100">
                Policies & Guidelines
              </h3>
              <nav className="mt-3 space-y-1">
                {allPolicyLinks.map((item) => {
                  const isActive = item.key === policyKey;
                  return (
                    <Link
                      key={item.key}
                      to={item.path}
                      className={`block px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isActive
                          ? 'bg-yellow-400 text-black shadow-xs font-black'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Contact Help Box */}
              <div className="mt-6 pt-4 border-t border-gray-100 text-xs space-y-2">
                <span className="text-[11px] font-black uppercase text-gray-400 block">Need Clarification?</span>
                <p className="text-gray-500 text-[11px]">Contact our prepress compliance desk for assistance.</p>
                <div className="space-y-1.5 pt-1">
                  <a href={getPhoneLink()} className="flex items-center gap-2 text-gray-800 hover:text-yellow-600 font-bold font-mono">
                    <HiOutlinePhone className="w-4 h-4 text-yellow-500" />
                    <span>{businessInfo.contact?.primaryPhone || '+91 96290 98565'}</span>
                  </a>
                  <a href={getEmailLink('support')} className="flex items-center gap-2 text-gray-800 hover:text-yellow-600 font-medium">
                    <HiOutlineMail className="w-4 h-4 text-yellow-500" />
                    <span>{businessInfo.contact?.supportEmail || 'printbazzar.online@gmail.com'}</span>
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Policy Document Content */}
          <main className="lg:col-span-9">
            <article className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10 shadow-xs space-y-6">
              {/* Header */}
              <div className="border-b border-gray-200 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-600">
                    <IconComponent className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                      {policy.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{policy.subtitle}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <span>Print Bazzar Official Policy</span>
                  <span>Last Verified: {policy.lastUpdated}</span>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
                {policy.sections.map((sec, idx) => (
                  <section key={idx} className="space-y-2">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      {sec.heading}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {sec.content}
                    </p>
                  </section>
                ))}
              </div>

              {/* Customer Assurance Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200 bg-gray-50 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Have Questions Regarding This Policy?</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Our support team is available during operating hours: {businessInfo.operatingHours?.weekdays || 'Monday through Saturday 9:30 AM to 8:30 PM'}.</p>
                </div>
                <a
                  href={getWhatsAppLink(`Hello ${businessInfo.brand?.brandName || 'Print Bazzar'}, I have a question regarding your policies.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all flex-shrink-0"
                >
                  <BsWhatsapp className="w-4 h-4" />
                  <span>Chat with Support</span>
                </a>
              </div>
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}
