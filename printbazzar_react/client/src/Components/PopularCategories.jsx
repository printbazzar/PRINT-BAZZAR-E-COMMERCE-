import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { categories as fallbackCategories } from "../assets/data/categories.js";

export function PopularCategories() {
  const [categories, setCategories] = useState(fallbackCategories);

  useEffect(() => {
    api
      .getCategories()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setCategories(res.data);
        } else {
          setCategories(fallbackCategories);
        }
      })
      .catch(() => setCategories(fallbackCategories));
  }, []);

  return (
    <section className="py-8 max-w-7xl mx-auto px-4">
      {/* Sleek Reference-Style Header with Divider Lines */}
      <div className="relative flex items-center justify-between mb-8">
        <div className="hidden sm:block flex-1 border-t border-gray-200"></div>
        <h2 className="sm:px-6 text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight text-center">
          Popular Printing Categories
        </h2>
        <div className="hidden sm:block flex-1 border-t border-gray-200"></div>
        <Link
          to="/shop"
          className="ml-3 whitespace-nowrap text-xs font-bold text-gray-600 hover:text-black hover:underline"
        >
          View All ➔
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
        {categories.slice(0, 6).map((category, index) => (
          <Link
            key={category.id || index}
            to={`/category/${category.slug || encodeURIComponent(category.name || category.title)}`}
            className="flex flex-col items-center justify-between text-center p-2 sm:p-2.5 bg-white rounded-2xl border-0 shadow-xs hover:shadow-xl transition-all duration-300 group"
          >
            <div className="w-full">
              {/* Full-View Image Container - Borderless & Clear */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2.5 flex items-center justify-center bg-[#f8f9fa] p-3 sm:p-4 group-hover:bg-[#f1f3f5] transition-colors">
                <img
                  src={category.imageUrl || category.image}
                  alt={category.name || category.title}
                  className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-500 transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 line-clamp-1 group-hover:text-yellow-600 transition-colors px-1">
                {category.name || category.title}
              </h3>
              {category._count?.products > 0 && (
                <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">
                  {category._count.products} products
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
