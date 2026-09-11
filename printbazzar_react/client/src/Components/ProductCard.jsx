import React from 'react';
import { Link } from 'react-router-dom';
import { HiStar } from 'react-icons/hi';
import LazyImage from './LazyImage';

/**
 * Modern Reference-Style Product Card
 * Yellow / Black / White theme with clear pricing, discounts, and ratings.
 */
export default function ProductCard({ product, index = 0, priority = false }) {
  if (!product) return null;

  // Only ever use genuine backend-provided rating/review/discount data.
  // No fabricated/derived values — if the product has no real data, the
  // corresponding UI (rating row, discount badge, strikethrough price) is
  // simply omitted below rather than showing a synthetic number.
  const rating = product.rating || null;
  const reviewsCount = product.reviewsCount || null;
  const startingPrice = Number(product.startingPrice || product.price || 0);
  const originalPrice = product.originalPrice && Number(product.originalPrice) > startingPrice
    ? Number(product.originalPrice)
    : null;
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - startingPrice) / originalPrice) * 100)
    : 0;

  const imageUrl =
    product.thumbnailUrl ||
    (product.images && product.images[0] && (product.images[0].imageUrl || product.images[0].url)) ||
    '/default-image.png';

  const categoryName = product.category?.name || product.categoryName || 'Custom Print';

  return (
    <Link
      to={`/product/${product.slug}`}
      className="bg-white rounded-2xl border border-gray-200/80 hover:border-yellow-400 p-2.5 sm:p-3.5 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group overflow-hidden relative"
    >
      <div>
        {/* Full-View Image Container with Clean Neutral Background */}
        <div className="relative w-full aspect-square bg-[#f8f9fa] rounded-2xl overflow-hidden mb-3 flex items-center justify-center p-3 sm:p-4 group-hover:bg-[#f1f3f5] transition-colors">
          <LazyImage
            src={imageUrl}
            alt={product.name}
            priority={priority || index < 4}
            width={300}
            height={300}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            containerClassName="w-full h-full flex items-center justify-center"
            className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-500 transform group-hover:scale-105"
          />

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
            {discountPercent > 0 && (
              <span className="bg-yellow-400 text-black text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs uppercase tracking-tight">
                {discountPercent}% OFF
              </span>
            )}
            {product.isBestSeller && (
              <span className="bg-black text-yellow-400 text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs uppercase tracking-tight">
                ★ BESTSELLER
              </span>
            )}
          </div>

          {product.isFeatured && !product.isBestSeller && (
            <span className="absolute top-2.5 right-2.5 bg-black/85 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs uppercase">
              Featured
            </span>
          )}
        </div>

        {/* Category Label */}
        <span className="text-[10px] font-extrabold uppercase text-gray-400 block tracking-wider px-1">
          {categoryName}
        </span>

        {/* Product Title */}
        <h3 className="text-xs sm:text-sm font-black text-gray-900 line-clamp-1 mt-0.5 group-hover:text-yellow-600 transition-colors px-1">
          {product.name}
        </h3>

        {/* Short Description */}
        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5 font-medium px-1">
          {product.shortDescription || 'Custom GSM paper, double-side options & instant tier rates.'}
        </p>

        {/* Rating & Review Counter — only shown when the backend supplies a real rating */}
        {rating && (
          <div className="flex items-center gap-1.5 px-1 mt-2">
            <div className="flex items-center text-yellow-400">
              <HiStar className="w-3.5 h-3.5" />
              <span className="text-[11px] font-black text-gray-800 ml-0.5">{rating}</span>
            </div>
            {reviewsCount && (
              <span className="text-[10px] text-gray-400 font-medium">({reviewsCount})</span>
            )}
          </div>
        )}
      </div>

      {/* Pricing & CTA Section */}
      <div className="pt-2.5 mt-3 flex items-end justify-between px-1 border-t border-gray-100">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs sm:text-sm font-black text-gray-900">
              ₹{startingPrice}
            </span>
            {originalPrice && (
              <span className="text-[11px] text-gray-400 line-through font-medium">
                ₹{originalPrice}
              </span>
            )}
          </div>
          <span className="text-[9px] text-gray-400 block font-semibold uppercase -mt-0.5">
            Starting Price
          </span>
        </div>

        {/* Customize / Order Button */}
        <span className="text-[11px] bg-yellow-400 group-hover:bg-yellow-500 text-black font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition-transform duration-200 active:scale-95 flex items-center gap-1">
          <span>Customize</span>
          <span className="text-xs">➔</span>
        </span>
      </div>
    </Link>
  );
}
