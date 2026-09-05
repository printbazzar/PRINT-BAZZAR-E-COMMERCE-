import React, { useState } from 'react';
import { Modal, Button } from 'flowbite-react';
import {
  HiOutlineZoomIn,
  HiOutlinePlay,
  HiOutlineSparkles,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiX,
} from 'react-icons/hi';
import { FaYoutube } from 'react-icons/fa';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, isDirectVideoFile } from '../utils/videoUtils';

export default function ProductMediaGallery({
  productName,
  mainThumbnail,
  images = [],
  videoUrl,
  isBestSeller,
  onOpenVideoTab,
}) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Consolidate images list
  const mediaList = images && images.length > 0
    ? images.map((img) => img.imageUrl)
    : [mainThumbnail || '/default-image.png'];

  const currentMediaUrl = mediaList[activeMediaIndex] || mainThumbnail || '/default-image.png';

  const handleNext = () => {
    setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  const handlePrev = () => {
    setActiveMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  return (
    <div className="space-y-4">
      {/* 1. Main Large View Display - Borderless & Clear Full View */}
      <div className="relative border-0 rounded-2xl overflow-hidden bg-white shadow-sm group">
        {/* Main Product Image */}
        <div
          className="aspect-square sm:aspect-auto sm:h-[480px] lg:h-[540px] w-full flex items-center justify-center bg-[#f8f9fa] overflow-hidden cursor-zoom-in p-3 sm:p-6 transition-colors"
          onClick={() => setIsLightboxOpen(true)}
        >
          <img
            src={currentMediaUrl}
            alt={productName}
            className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-102 transition-transform duration-500"
          />
        </div>

        {/* Best Seller Badge */}
        {isBestSeller && (
          <span className="absolute top-3.5 left-3.5 bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase shadow-md flex items-center gap-1">
            <HiOutlineSparkles className="w-3.5 h-3.5" /> Best Seller
          </span>
        )}

        {/* Top Right Actions: Fullscreen Lightbox Zoom & Video */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
          {videoUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsVideoModalOpen(true);
                if (onOpenVideoTab) onOpenVideoTab();
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <HiOutlinePlay className="w-4 h-4 text-white" />
              <span>Watch Demo Video</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-md backdrop-blur-sm transition-all"
            title="Click for Full View Zoom"
          >
            <HiOutlineZoomIn className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Gallery Navigation Arrows (if multiple images) */}
        {mediaList.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <HiOutlineChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <HiOutlineChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* 2. Thumbnail Perspective Switcher (Including Video Showcase) */}
      {(mediaList.length > 1 || videoUrl) && (
        <div className="flex flex-wrap gap-2.5">
          {mediaList.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveMediaIndex(idx)}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden transition-all bg-[#f8f9fa] p-1 border shadow-xs ${
                activeMediaIndex === idx
                  ? 'ring-2 ring-yellow-400 border-yellow-400 scale-105'
                  : 'border-gray-200 opacity-80 hover:opacity-100'
              }`}
            >
              <img src={url} alt={`${productName} Angle ${idx + 1}`} className="w-full h-full object-contain" />
            </button>
          ))}

          {/* Video Showcase Thumbnail */}
          {videoUrl && (
            <button
              type="button"
              onClick={() => {
                setIsVideoModalOpen(true);
                if (onOpenVideoTab) onOpenVideoTab();
              }}
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden transition-all bg-gray-900 border-2 border-red-500 shadow-xs group flex items-center justify-center cursor-pointer hover:scale-105"
              title="Play Product Showcase Video"
            >
              <img
                src={getYouTubeThumbnailUrl(videoUrl) || currentMediaUrl}
                alt="Video Showcase Demo"
                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <span className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <HiOutlinePlay className="w-3.5 h-3.5 ml-0.5 text-white" />
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider mt-0.5 text-white bg-black/70 px-1.5 py-0.5 rounded">
                  Video
                </span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* 4. Full View Zoom / Lightbox Modal */}
      <Modal show={isLightboxOpen} onClose={() => setIsLightboxOpen(false)} size="5xl">
        <div className="relative bg-black text-white p-4 rounded-2xl flex flex-col items-center">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-yellow-400 text-2xl font-bold z-50 p-2"
          >
            ✕
          </button>

          <div className="w-full text-center pb-2 border-b border-gray-800">
            <h3 className="text-sm sm:text-base font-black text-white">{productName} — High Definition Full View</h3>
            <p className="text-xs text-gray-400 mt-0.5">Use buttons below or scroll to inspect paper texture & print detail</p>
          </div>

          {/* Large Image Container */}
          <div className="my-6 max-h-[70vh] overflow-auto flex items-center justify-center p-2">
            <img
              src={currentMediaUrl}
              alt={productName}
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-h-[65vh] max-w-full object-contain rounded-lg transition-transform duration-200"
            />
          </div>

          {/* Zoom Controls & Navigation */}
          <div className="w-full flex flex-wrap justify-between items-center gap-4 pt-3 border-t border-gray-800 text-xs">
            <div className="flex items-center gap-2">
              <Button size="xs" color="light" onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}>
                Zoom Out (-)
              </Button>
              <span className="font-mono text-yellow-400 font-bold">{Math.round(zoomLevel * 100)}%</span>
              <Button size="xs" color="light" onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}>
                Zoom In (+)
              </Button>
              <Button size="xs" color="gray" onClick={() => setZoomLevel(1)}>
                Reset
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button size="xs" color="dark" onClick={handlePrev} disabled={mediaList.length <= 1}>
                ◀ Previous View
              </Button>
              <Button size="xs" color="dark" onClick={handleNext} disabled={mediaList.length <= 1}>
                Next View ▶
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 5. In-Page High Definition Video Modal */}
      {videoUrl && (
        <Modal show={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} size="4xl">
          <div className="relative bg-slate-950 text-white p-4 sm:p-6 rounded-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <FaYoutube className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                    {productName} — Material, Finish & Size Demonstration
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    High Definition in-website video player • Zero external redirects
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="text-gray-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-video w-full my-4 rounded-xl overflow-hidden bg-black shadow-2xl border border-gray-800">
              {(() => {
                const ytUrl = getYouTubeEmbedUrl(videoUrl, { autoplay: true });
                if (ytUrl) {
                  return (
                    <iframe
                      src={ytUrl}
                      title={`${productName} Video Showcase`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  );
                } else {
                  return (
                    <video src={videoUrl} autoPlay controls playsInline className="w-full h-full object-contain" />
                  );
                }
              })()}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-gray-800 text-xs">
              <span className="text-gray-400 text-[11px]">
                ✔ Playing directly inside Print Bazzar website without redirecting to YouTube.
              </span>
              <Button size="xs" color="light" onClick={() => setIsVideoModalOpen(false)}>
                Close Video
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
