import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi';
import LazyImage from './LazyImage';
import { api } from '../services/api';

export default function RelatedProductsSection({ currentProductId, categorySlug, categoryName }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelated();
  }, [currentProductId, categorySlug]);

  const fetchRelated = async () => {
    try {
      const res = await api.getProducts({ category: categorySlug, limit: 6 });
      if (res.success && res.data) {
        // Filter out current product
        const filtered = res.data.filter((p) => p.id !== currentProductId).slice(0, 4);
        setProducts(filtered);
      }
    } catch (err) {
      console.error('Failed to load related products:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <div className="mt-14 pt-8 border-t border-gray-200">
      {/* Task #30: this section lists other products in the same category —
          api.getProducts({ category: categorySlug }) — not a personalization or
          "frequently bought together" algorithm. The heading says exactly that,
          per the brief's explicit instruction not to claim AI/personalized
          recommendations the underlying data doesn't back up. */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900">
            Related Products
          </h3>
        </div>

        <Link
          to={`/category/${categorySlug || 'business-cards'}`}
          className="text-xs font-extrabold text-black hover:text-yellow-600 flex items-center gap-1 transition-colors"
        >
          <span>View All in {categoryName || 'Category'}</span>
          <HiOutlineArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {products.map((item, index) => (
          <Link
            key={item.id}
            to={`/product/${item.slug}`}
            className="group bg-white border-0 rounded-2xl p-2.5 sm:p-3 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div>
              {/* Full-View Image Container - Borderless & Stroke-Free */}
              <div className="relative w-full aspect-square bg-[#f8f9fa] rounded-2xl overflow-hidden mb-3 flex items-center justify-center p-3 sm:p-4 group-hover:bg-[#f1f3f5] transition-colors">
                <LazyImage
                  src={item.thumbnailUrl || (item.images?.[0]?.imageUrl || item.images?.[0]?.url) || '/default-image.png'}
                  alt={item.name}
                  priority={index < 2}
                  width={300}
                  height={300}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  containerClassName="w-full h-full flex items-center justify-center"
                  className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-500"
                />
                {item.isBestSeller && (
                  <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-xs">
                    Popular
                  </span>
                )}
              </div>

              <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm line-clamp-1 group-hover:text-yellow-600 transition-colors px-1">
                {item.name}
              </h4>
              <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 font-medium px-1">{item.shortDescription || "Custom options available"}</p>
            </div>

            <div className="pt-2 mt-3 flex justify-between items-center text-left px-1">
              <div>
                <span className="text-[9px] text-gray-400 block font-bold uppercase">Price</span>
                <span className="font-black text-red-600 text-xs sm:text-sm">Starts ₹{item.startingPrice}</span>
              </div>
              <span className="text-[10px] bg-gray-100 group-hover:bg-yellow-400 group-hover:text-black font-extrabold px-2.5 py-1 rounded-lg transition-colors">
                Configure ➔
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
