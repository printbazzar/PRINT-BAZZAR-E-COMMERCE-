import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { INITIAL_PRODUCTS_BY_CATEGORY } from '../assets/data/initialCatalog';
import ProductCard from './ProductCard';
import ProductCardSkeletonGrid from './ProductCardSkeleton';

export default function FeaturedProductsGrid() {
  // Aggregate initial products across categories for instant frame-1 render
  const initialFeatured = [
    ...(INITIAL_PRODUCTS_BY_CATEGORY['business-cards'] || []).slice(0, 2),
    ...(INITIAL_PRODUCTS_BY_CATEGORY['stickers-and-labels'] || []).slice(0, 2),
    ...(INITIAL_PRODUCTS_BY_CATEGORY['marketing-and-promotionals-items'] || []).slice(0, 2),
    ...(INITIAL_PRODUCTS_BY_CATEGORY['business-essentials'] || []).slice(0, 2),
  ];

  const [products, setProducts] = useState(initialFeatured);
  const [loading, setLoading] = useState(initialFeatured.length === 0);

  useEffect(() => {
    api
      .getProducts({ featured: 'true', limit: 8 })
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setProducts(res.data);
        }
      })
      .catch((err) => {
        console.warn('Featured products fetch notice:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-6 sm:py-8 max-w-7xl mx-auto px-4">
      {/* Section Header with Consistent Typography */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-2 border-b border-gray-200 gap-2">
        <div>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-black bg-yellow-400 px-2.5 py-0.5 rounded-md inline-block mb-1">
            ★ HANDCRAFTED QUALITY
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
            Featured Print Products
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Our most popular custom visiting cards, waterproof labels, and business collaterals.
          </p>
        </div>

        <Link
          to="/shop"
          className="text-xs sm:text-sm font-black text-gray-800 hover:text-black flex items-center gap-1 group whitespace-nowrap self-start sm:self-auto"
        >
          <span>View All Catalogue</span>
          <span className="group-hover:translate-x-1 transition-transform">➔</span>
        </Link>
      </div>

      {loading && products.length === 0 ? (
        <ProductCardSkeletonGrid count={8} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product, index) => (
            <ProductCard key={product.id || index} product={product} index={index} priority={index < 4} />
          ))}
        </div>
      )}
    </section>
  );
}
