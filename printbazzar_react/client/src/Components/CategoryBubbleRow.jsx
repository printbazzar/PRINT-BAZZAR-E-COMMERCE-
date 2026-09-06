import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { categories as fallbackCategories } from '../assets/data/categories.js';

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
    <section className="py-6 sm:py-8 max-w-7xl mx-auto px-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-black bg-yellow-400 px-2.5 py-0.5 rounded-md inline-block mb-1">
            SHOP BY DEPARTMENT
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
            Explore Print Categories
          </h2>
        </div>
        <Link
          to="/shop"
          className="text-xs sm:text-sm font-black text-gray-800 hover:text-black flex items-center gap-1 group"
        >
          <span>All Categories</span>
          <span className="group-hover:translate-x-1 transition-transform">➔</span>
        </Link>
      </div>

      {/* Prominent Category Bubble Row (Horizontal Scroll on Mobile, Flex/Grid on Desktop) */}
      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.slice(0, 10).map((cat, idx) => {
          const slug = cat.slug || encodeURIComponent(cat.name || cat.title);
          const name = cat.name || cat.title;
          const image = cat.imageUrl || cat.image || '/default-image.png';

          return (
            <Link
              key={cat.id || idx}
              to={`/category/${slug}`}
              className="flex-shrink-0 flex flex-col items-center text-center group w-20 sm:w-24 md:w-28 focus:outline-none"
            >
              {/* Circular Avatar Container with Yellow Ring on Hover */}
              <div className="w-18 h-18 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-full bg-white p-1.5 border-2 border-gray-200/90 shadow-sm group-hover:border-yellow-400 group-hover:ring-4 group-hover:ring-yellow-400/40 group-hover:scale-105 transition-all duration-300 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full rounded-full bg-[#f8f9fa] flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-contain filter drop-shadow-xs group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Bold Category Label */}
              <span className="mt-2.5 text-xs sm:text-xs font-black text-gray-800 group-hover:text-black group-hover:underline line-clamp-1 max-w-[100px] leading-tight">
                {name}
              </span>
              <span className="text-[10px] font-semibold text-gray-400 mt-0.5">
                {cat._count?.products ? `${cat._count.products} Items` : 'Explore'}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
