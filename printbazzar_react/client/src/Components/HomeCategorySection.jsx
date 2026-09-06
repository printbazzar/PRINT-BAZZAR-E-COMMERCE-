import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { getInitialProducts } from "../assets/data/initialCatalog";
import ProductCard from "./ProductCard";
import ProductCardSkeletonGrid from "./ProductCardSkeleton";

export function HomeCategorySection({ categoryName, categorySlug, title, buttonText = "Explore All" }) {
  const initial = getInitialProducts(categorySlug || categoryName);
  const [products, setProducts] = useState(initial);
  const [loading, setLoading] = useState(initial.length === 0);

  useEffect(() => {
    api
      .getProducts({ category: categorySlug || categoryName, limit: 8 })
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setProducts(res.data);
        }
      })
      .catch((err) => {
        console.warn(`Background fetch notice for ${categorySlug}:`, err.message);
      })
      .finally(() => setLoading(false));
  }, [categoryName, categorySlug]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-6 sm:py-8 max-w-7xl mx-auto px-4">
      {/* Sleek Reference-Style Header */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            {title || categoryName}
          </h2>
        </div>
        <Link
          to={`/category/${categorySlug || encodeURIComponent(categoryName)}`}
          className="text-xs sm:text-sm font-black text-gray-800 hover:text-black flex items-center gap-1 group whitespace-nowrap"
        >
          <span>{buttonText}</span>
          <span className="group-hover:translate-x-1 transition-transform">➔</span>
        </Link>
      </div>

      {loading && products.length === 0 ? (
        <ProductCardSkeletonGrid count={4} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product, index) => (
            <ProductCard key={product.id || index} product={product} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
