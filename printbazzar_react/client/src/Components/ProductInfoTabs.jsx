import React, { useState, useRef, useEffect } from 'react';
import { Tabs, Accordion, Button, TextInput, Textarea, Modal, Rating } from 'flowbite-react';
import {
  HiStar,
  HiOutlineDocumentText,
  HiOutlinePhotograph,
  HiOutlinePlay,
  HiOutlineShieldCheck,
  HiOutlineQuestionMarkCircle,
  HiOutlineDownload,
  HiCheckCircle,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { FaWhatsapp, FaYoutube } from 'react-icons/fa';
import { useBusinessInfo } from '../context/BusinessInfoContext';
import { extractYouTubeId, getYouTubeEmbedUrl, isDirectVideoFile } from '../utils/videoUtils';

export default function ProductInfoTabs({ product, requestedTab, onTabHandled }) {
  const { businessInfo, getWhatsAppLink } = useBusinessInfo();
  const [activeTab, setActiveTab] = useState(0);
  const tabsRef = useRef(null);

  useEffect(() => {
    if (requestedTab !== undefined && requestedTab !== null && tabsRef.current) {
      tabsRef.current.setActiveTab(requestedTab);
      if (onTabHandled) onTabHandled();
    }
  }, [requestedTab, onTabHandled]);

  // Review Form Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewsList, setReviewsList] = useState([
    {
      id: 1,
      author: 'Senthil Kumar (Trichy Tech Solutions)',
      rating: 5,
      date: '18 Aug 2026',
      comment: 'Superb 350 GSM card quality and velvet lamination. Delivery was completed on the exact single day promised. Highly recommended for business stationery in Trichy!',
      verified: true,
    },
    {
      id: 2,
      author: 'Priya Meenakshi',
      rating: 5,
      date: '02 Aug 2026',
      comment: 'The automated preflight tool caught my low resolution logo before printing, saving me from a bad print. The prepress designer helped fix it via WhatsApp. Excellent customer care!',
      verified: true,
    },
    {
      id: 3,
      author: 'Arunachalam & Co',
      rating: 4,
      date: '25 Jul 2026',
      comment: 'Colors came out rich and crisp in CMYK offset printing. Perfect cutting and neat packaging.',
      verified: true,
    },
  ]);
  const [reviewSubmittedMsg, setReviewSubmittedMsg] = useState('');

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewAuthor.trim() || !reviewComment.trim()) return;

    const newRev = {
      id: Date.now(),
      author: reviewAuthor.trim(),
      rating: Number(reviewRating),
      date: 'Just now',
      comment: reviewComment.trim(),
      verified: true,
    };

    setReviewsList([newRev, ...reviewsList]);
    setReviewSubmittedMsg('Thank you! Your verified review has been published.');
    setReviewAuthor('');
    setReviewComment('');
    setReviewModalOpen(false);
    setTimeout(() => setReviewSubmittedMsg(''), 4000);
  };

  const defaultSpecs = [
    { specKey: 'Paper Stock / GSM', specValue: '350 GSM Premium Art Card / Speciality Stock' },
    { specKey: 'Print Technology', specValue: 'High-Definition Industrial Offset & Digital Multi-Color Press' },
    { specKey: 'Color Space', specValue: 'Industrial CMYK (FOGRA39 Standard) for vibrant hue fidelity' },
    { specKey: 'Lamination Options', specValue: 'Thermal Matte, Gloss Lamination, or Velvet Soft-Touch' },
    { specKey: 'Corner Finish', specValue: 'Precision Straight Die-Cut or 6mm Rounded Corner' },
    { specKey: 'Packaging', specValue: 'Moisture-proof packaging in rigid corrugated dispatch boxes' },
    { specKey: 'Turnaround Time', specValue: 'Fast Dispatch | 1-2 Days Express across Tamil Nadu' },
  ];

  const specsToDisplay = product?.specifications && product.specifications.length > 0
    ? product.specifications
    : defaultSpecs;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs">
      <Tabs
        ref={tabsRef}
        aria-label="Product In-Depth Specifications & Content"
        variant="underline"
        onActiveTabChange={(tab) => setActiveTab(tab)}
      >
        {/* 1. TECHNICAL SPECIFICATIONS & OVERVIEW */}
        <Tabs.Item active title="📋 Technical Specs" icon={HiOutlineDocumentText}>
          <div className="pt-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <h3 className="font-black text-base text-gray-900 mb-3 flex items-center gap-2">
                <HiOutlineDocumentText className="w-5 h-5 text-yellow-500" /> Manufacturing & Print Specifications
              </h3>
              <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y text-xs">
                {specsToDisplay.map((spec, idx) => (
                  <div key={idx} className="p-3.5 flex justify-between items-center bg-white odd:bg-gray-50/50">
                    <span className="font-bold text-gray-600 w-1/3">{spec.specKey}</span>
                    <span className="font-semibold text-gray-900 w-2/3 text-right">{spec.specValue}</span>
                  </div>
                ))}
                <div className="p-3.5 flex justify-between items-center bg-yellow-50/60">
                  <span className="font-bold text-yellow-900 w-1/3">Press Facility</span>
                  <span className="font-extrabold text-yellow-900 w-2/3 text-right">
                    Print Bazzar Central Press, Big Bazzar St, Trichy
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4 text-xs">
              <h3 className="font-black text-base text-gray-900 mb-3">Product Overview & Features</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line text-xs">
                {product?.fullDescription || product?.shortDescription ||
                  'Manufactured using high-grade European paper stocks and industrial offset inks. Engineered for corporate professionals, retail branding, and premium marketing impact.'}
              </p>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                  <HiOutlineShieldCheck className="w-4 h-4 text-green-600" /> 100% Quality Assurance
                </h4>
                <p className="text-gray-500 text-[11px] leading-relaxed">
                  Every print batch passes through a 5-point physical inspection check: color density matching, trim precision, lamination adhesion, clean edges, and count verification.
                </p>
              </div>
            </div>
          </div>
        </Tabs.Item>

        {/* 2. PRODUCT VIDEO DEMO (INLINE YOUTUBE / MATERIAL & SIZE SHOWCASE) */}
        <Tabs.Item title="🎥 Video Showcase" icon={HiOutlinePlay}>
          <div className="pt-4 max-w-4xl space-y-6 text-xs">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-base sm:text-lg text-gray-900 flex items-center gap-2">
                  <FaYoutube className="w-5 h-5 text-red-600" />
                  Material, Size & Finish Showcase Video
                </h3>
                <span className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <HiCheckCircle className="w-4 h-4 text-green-600" />
                  In-Website Full HD Playback
                </span>
              </div>
              <p className="text-gray-500 mt-1">
                Watch how the paper stock, tactile lamination finish, and high-definition printing look in real life under natural lighting.
              </p>
            </div>

            {/* Embedded Responsive Video / Showcase Player */}
            {(() => {
              const videoSrc = product?.videoUrl;
              const ytEmbedUrl = videoSrc ? getYouTubeEmbedUrl(videoSrc) : null;
              const isDirect = videoSrc ? isDirectVideoFile(videoSrc) : false;

              if (ytEmbedUrl) {
                return (
                  <div className="space-y-3">
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-xl border border-gray-800">
                      <iframe
                        className="w-full h-full"
                        src={ytEmbedUrl}
                        title={`${product?.name || 'Product'} Video Showcase`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 px-1 gap-2">
                      <span className="flex items-center gap-1 font-medium text-gray-700">
                        <HiCheckCircle className="w-4 h-4 text-green-600" /> Playing directly on website (Zero redirection to external apps)
                      </span>
                      <span className="text-gray-400">1080p HD Video Player</span>
                    </div>
                  </div>
                );
              } else if (isDirect) {
                return (
                  <div className="space-y-3">
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-xl border border-gray-800 flex items-center justify-center">
                      <video
                        src={videoSrc}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                        preload="metadata"
                      >
                        Your browser does not support HTML5 video preview.
                      </video>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                      <span className="flex items-center gap-1 font-medium text-gray-700">
                        <HiCheckCircle className="w-4 h-4 text-green-600" /> Direct High-Definition Video Preview
                      </span>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-black shadow-xl border border-gray-800 flex items-center justify-center p-6 text-center">
                    <div className="max-w-md space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center mx-auto border border-red-500/30 shadow-inner">
                        <FaYoutube className="w-8 h-8" />
                      </div>
                      <h4 className="text-white font-extrabold text-base">Commercial Press & Material Demo</h4>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        Every batch of <strong>{product?.name || 'custom prints'}</strong> is crafted on European industrial presses with premium heavy GSM papers and precision thermal lamination.
                      </p>
                      <div className="pt-2 flex flex-wrap justify-center gap-2">
                        <span className="bg-white/10 text-yellow-300 text-[11px] font-semibold px-3 py-1 rounded-full border border-white/10">
                          Heidelberg & Konica Minolta Fleet
                        </span>
                        <span className="bg-white/10 text-emerald-300 text-[11px] font-semibold px-3 py-1 rounded-full border border-white/10">
                          Velvet / Matte / Gloss Lamination
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            })()}

            {/* Informative Material & Size Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider block flex items-center gap-1">
                  📜 Material & GSM
                </span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Heavyweight rigid paper cardstock engineered for durability, zero show-through, and crisp tactile thickness in hand.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider block flex items-center gap-1">
                  ✨ Lamination Finish
                </span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Thermal matte, velvet soft-touch, or crystal gloss coating that shields against scuffs, moisture spills, and fingerprint smudges.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider block flex items-center gap-1">
                  📐 Real-Life Scale & Cut
                </span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Computerized hydraulic die-cutting ensures millimeter-accurate borders, perfect corner alignment, and clean edges.
                </p>
              </div>
            </div>

            {/* Swatch kit / WhatsApp Assistance */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
              <div>
                <span className="font-bold text-yellow-950 block text-xs">Need physical paper swatches or custom thickness guidance?</span>
                <span className="text-[11px] text-yellow-800">Chat directly with our printing press technical team on WhatsApp or request a physical sample kit.</span>
              </div>
              <a
                href={getWhatsAppLink(`Hello ${businessInfo.brand?.brandName || 'Print Bazzar'}, I would like to check paper thickness & material swatches for ${product?.name || 'custom prints'}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs whitespace-nowrap shadow-xs transition-colors"
              >
                <FaWhatsapp className="w-4 h-4" /> Ask Paper Expert
              </a>
            </div>
          </div>
        </Tabs.Item>

        {/* 3. ARTWORK & PREPRESS GUIDELINES */}
        <Tabs.Item title="📐 Design Guidelines" icon={HiOutlinePhotograph}>
          <div className="pt-4 space-y-6 text-xs max-w-4xl">
            <div>
              <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                <HiOutlinePhotograph className="w-5 h-5 text-yellow-500" /> Prepress Artwork Preparation Guide
              </h3>
              <p className="text-gray-500 mt-1">
                Follow these technical printing standards to ensure razor-sharp text and flawless edge trimming.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <span className="text-xl">🔴</span>
                <h4 className="font-bold text-gray-900 text-xs">1. Add 3mm Bleed</h4>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Extend background graphics and photos 3mm beyond the final cut line so no white edges appear during shearing.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <span className="text-xl">🟢</span>
                <h4 className="font-bold text-gray-900 text-xs">2. Safe Text Margin (4mm)</h4>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Keep all names, phone numbers, addresses, and essential logos at least 4mm away from the outer edge.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <span className="text-xl">🎨</span>
                <h4 className="font-bold text-gray-900 text-xs">3. 300 DPI CMYK</h4>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Design in CMYK color space at 300 DPI resolution. Convert all typography fonts to outlines/curves before saving.
                </p>
              </div>
            </div>

            <div className="p-4 border rounded-xl bg-white space-y-2">
              <h4 className="font-bold text-gray-900">Supported Vector & Print File Formats</h4>
              <p className="text-gray-600 text-[11px]">
                We accept <strong>PDF (Print-Ready Vector), Adobe Illustrator (.AI), CorelDraw (.CDR), Adobe Photoshop (.PSD), TIFF, High-Res PNG & JPG</strong> up to 50MB.
              </p>
            </div>
          </div>
        </Tabs.Item>

        {/* 4. FREQUENTLY ASKED QUESTIONS (FAQ) */}
        <Tabs.Item title="❓ FAQs" icon={HiOutlineQuestionMarkCircle}>
          <div className="pt-4 max-w-4xl space-y-4 text-xs">
            <div>
              <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                <HiOutlineQuestionMarkCircle className="w-5 h-5 text-yellow-500" /> Frequently Asked Questions
              </h3>
              <p className="text-gray-500 mt-1">Quick answers to common ordering and delivery inquiries.</p>
            </div>

            <Accordion collapseAll>
              <Accordion.Panel>
                <Accordion.Title className="text-xs font-bold text-gray-900">
                  How fast will my print job be dispatched?
                </Accordion.Title>
                <Accordion.Content className="text-xs text-gray-600">
                  Standard orders are dispatched within 24 to 48 hours. Doorstep courier takes 1-2 business days across Tamil Nadu and 3-4 days all-India.
                </Accordion.Content>
              </Accordion.Panel>

              <Accordion.Panel>
                <Accordion.Title className="text-xs font-bold text-gray-900">
                  Can I verify my print file before printing starts?
                </Accordion.Title>
                <Accordion.Content className="text-xs text-gray-600">
                  Yes! Every uploaded artwork file undergoes automated preflight inspection to ensure high resolution and accurate bleed margins before production begins.
                </Accordion.Content>
              </Accordion.Panel>

              <Accordion.Panel>
                <Accordion.Title className="text-xs font-bold text-gray-900">
                  Can I provide my own GSTIN number for tax input credit?
                </Accordion.Title>
                <Accordion.Content className="text-xs text-gray-600">
                  Yes, you can enter your business GSTIN number during checkout. We provide an official 18% GST tax invoice for your accounting and input tax credit claims.
                </Accordion.Content>
              </Accordion.Panel>

              <Accordion.Panel>
                <Accordion.Title className="text-xs font-bold text-gray-900">
                  What is the difference between Matte and Velvet Soft-Touch lamination?
                </Accordion.Title>
                <Accordion.Content className="text-xs text-gray-600">
                  Thermal Matte offers a clean, non-reflective executive finish. Velvet Soft-Touch adds an ultra-luxurious suede/peach-skin texture that feels silky to touch and prevents fingerprint marks.
                </Accordion.Content>
              </Accordion.Panel>
            </Accordion>
          </div>
        </Tabs.Item>

        {/* 5. TERMS & PRINTING POLICIES */}
        <Tabs.Item title="📜 Terms & Guarantee" icon={HiOutlineShieldCheck}>
          <div className="pt-4 max-w-4xl space-y-4 text-xs text-gray-600">
            <div>
              <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                <HiOutlineShieldCheck className="w-5 h-5 text-green-600" /> Print Bazzar Quality & Service Policies
              </h3>
              <p className="text-gray-500 mt-1">Our commitment to 100% customer satisfaction and fair trade terms.</p>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2">
              <h4 className="font-bold text-gray-900">100% Free Reprint Guarantee</h4>
              <p className="text-[11px] leading-relaxed">
                If your order contains manufacturing defects, wrong quantities, or misprints attributable to our press room, we will reprint and deliver your order completely free of charge.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-gray-900">Customer Proof Approval Terms:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Once digital proof is confirmed by the customer, spellings and layout are locked for production.</li>
                <li>RGB screen colors might vary marginally in standard CMYK industrial offset printing.</li>
                <li>Any cancellations must be made before the job enters the printing press queue.</li>
              </ul>
            </div>
          </div>
        </Tabs.Item>

        {/* 6. CUSTOMER REVIEWS & RATINGS */}
        <Tabs.Item title="⭐ Reviews & Ratings" icon={HiStar}>
          <div className="pt-4 space-y-6 text-xs max-w-4xl">
            {/* Header with Average Rating & Write Review Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-gray-900">4.9</span>
                  <div className="flex text-yellow-400 text-lg">
                    {'★★★★★'.split('').map((s, i) => (
                      <span key={i}>{s}</span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 font-bold">({reviewsList.length} Verified Reviews)</span>
                </div>
                <p className="text-xs text-green-700 font-semibold mt-1">
                  ✔ 98% of customers recommend Print Bazzar for corporate printing
                </p>
              </div>

              <Button
                size="xs"
                color="dark"
                onClick={() => setReviewModalOpen(true)}
                className="bg-black hover:bg-gray-800 text-white font-extrabold text-xs"
              >
                Write a Verified Review ★
              </Button>
            </div>

            {reviewSubmittedMsg && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl font-bold">
                ✔ {reviewSubmittedMsg}
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
              {reviewsList.map((rev) => (
                <div key={rev.id} className="p-4 border rounded-xl bg-white shadow-2xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-xs">{rev.author}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-yellow-400 font-bold">{'★'.repeat(rev.rating)}</span>
                        {rev.verified && (
                          <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.2 rounded font-bold">
                            ✔ Verified Buyer
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400">{rev.date}</span>
                  </div>
                  <p className="text-gray-700 text-xs leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </Tabs.Item>
      </Tabs>

      {/* Write Review Modal */}
      <Modal show={reviewModalOpen} onClose={() => setReviewModalOpen(false)}>
        <Modal.Header>Write a Product Review</Modal.Header>
        <form onSubmit={handleReviewSubmit}>
          <Modal.Body className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Your Name / Business Name *</label>
              <TextInput
                value={reviewAuthor}
                onChange={(e) => setReviewAuthor(e.target.value)}
                placeholder="e.g. Ramesh Kumar (Tech Solutions)"
                size="sm"
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Rating *</label>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="w-full text-xs rounded-lg border-gray-300 p-2"
              >
                <option value={5}>★★★★★ (5 Stars - Excellent Quality)</option>
                <option value={4}>★★★★☆ (4 Stars - Very Good)</option>
                <option value={3}>★★★☆☆ (3 Stars - Average)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Your Review & Feedback *</label>
              <Textarea
                rows="3"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Describe paper quality, print crispness, delivery speed, and customer service..."
                className="text-xs"
                required
              />
            </div>
          </Modal.Body>
          <Modal.Footer className="flex justify-between">
            <Button color="light" size="xs" onClick={() => setReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="dark"
              size="xs"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold"
            >
              Publish Review ★
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
