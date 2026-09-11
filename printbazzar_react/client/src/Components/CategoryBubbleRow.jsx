import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { categories as fallbackCategories } from '../assets/data/categories.js';
import LazyImage from './LazyImage';

// Phase 2B visual polish: homepage "Categories" discovery section.
//   - Renamed heading, dropped the eyebrow badge (decorative, redundant with heading)
//   - Rectangular/rounded tiles with a consistent image ratio, replacing the
//     circular "bubble" avatar row (per spec: no oversized bubbles)
//   - Grid layout instead of horizontal scroll (fixes overflow, works better
//     for scanability on tablet/mobile)
//   - Dropped "Explore"/item-count subtext per spec (image + name only)
//   - No hard 1-line name truncation; line-clamp-2 only as a long-name safety net
//   - Uses the existing LazyImage component (CDN optimization + skeleton +
//     3-tier fallback) instead of a plain <img>, fixing any broken/missing
//     category image instead of showing a broken-image icon
//   - Subtler hover (single border/shadow lift + small image scale) instead
//     of the previous simultaneous border+ring-glow+scale combo
// Category data/fetching itself is untouched (same api.getCategories() call,
// same fallback import) — no new API calls, no new data source.
export default function CategoryBubbleRow() {
  const [categories, setCategories] = useState(fallbackCategories);

  useEffect(() => {
    api
      .getCategories()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setCategories(res.data);
        }
      })
      .catch(() => setCategories(fallbackCategories));
  }, []);

  return (
    <section className="pt-6 sm:pt-8 pb-4 sm:pb-5 max-w-7xl mx-auto px-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
          Shop by Category
        </h2>
        <Link
          to="/shop"
          className="text-xs sm:text-sm font-black text-gray-800 hover:text-black flex items-center gap-1 group"
        >
          <span>View All</span>
          <span className="group-hover:translate-x-1 transition-transform duration-200">➔</span>
        </Link>
      </div>

      {/* Category Tiles - clean rectangular cards, consistent image ratio */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
        {categories.slice(0, 10).map((cat, idx) => {
          const slug = cat.slug || encodeURIComponent(cat.name || cat.title);
          const name = cat.name || cat.title;
          const image = cat.imageUrl || cat.image || '/default-image.png';

          return (
            <Link
              key={cat.id || idx}
              to={`/category/${slug}`}
              className="group flex flex-col items-center text-center focus:outline-none"
            >
              <LazyImage
                src={image}
                alt={name}
                fallbackSrc="/default-image.png"
                priority={idx < 6}
                width={200}
                height={150}
                containerClassName="w-full aspect-[4/3] rounded-2xl bg-[#f8f9fa] border border-gray-200/80 group-hover:border-yellow-400 group-hover:shadow-md transition-all duration-200"
                className="w-full h-full object-contain p-3 sm:p-4 transition-transform duration-200 group-hover:scale-[1.04]"
              />

              <span className="mt-2.5 text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                {name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
