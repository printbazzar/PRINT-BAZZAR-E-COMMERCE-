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
    <section className="pt-2 sm:pt-3 pb-6 sm:pb-8 max-w-7xl mx-auto px-4">
      {/* Section Header - simplified, products appear immediately below */}
      <div className="flex items-center justify-between mb-4 sm:mb-5 pb-2 border-b border-gray-200">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
          Featured Products
        </h2>

        <Link
          to="/shop"
          className="text-xs sm:text-sm font-black text-gray-800 hover:text-black flex items-center gap-1 group whitespace-nowrap"
        >
          <span>View All</span>
          <span className="group-hover:translate-x-1 transition-transform duration-200">➔</span>
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
