import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { HiOutlineTag } from 'react-icons/hi';
import { api } from '../services/api';
// Phase 2A: consolidated onto the single shared category source of truth
// (previously this file kept its own separate hardcoded CATEGORY_SHORTCUTS
// array, duplicating the one in CategoryBubbleRow.jsx).
import { categories as CATEGORY_SHORTCUTS } from '../assets/data/categories.js';

export default function CategoryNavBar() {
  const [categories, setCategories] = useState(CATEGORY_SHORTCUTS);

  useEffect(() => {
    api.getCategories().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        const mapped = res.data.slice(0, 9).map((cat) => {
          const matched = CATEGORY_SHORTCUTS.find(
            (c) => c.slug === cat.slug || c.name.toLowerCase() === cat.name.toLowerCase()
          );
          return {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            icon: matched ? matched.icon : HiOutlineTag,
            isHot: matched ? matched.isHot : false,
          };
        });
        setCategories(mapped);
      }
    });
  }, []);

  return (
    <div className="bg-white border-b border-gray-100 shadow-xs hidden lg:block">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between py-2.5 text-xs font-semibold">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <NavLink
                  key={cat.id || idx}
                  to={`/category/${cat.slug}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                      isActive
                        ? 'text-black bg-yellow-400 font-extrabold shadow-xs'
                        : 'text-gray-600 hover:text-black hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <span>{cat.name}</span>
                  {cat.isHot && (
                    <span className="text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded uppercase">
                      HOT
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          <Link
            to="/shop"
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-black font-extrabold bg-gray-100 hover:bg-yellow-400 transition-colors whitespace-nowrap ml-2"
          >
            All Collections ➔
          </Link>
        </nav>
      </div>
    </div>
  );
}
