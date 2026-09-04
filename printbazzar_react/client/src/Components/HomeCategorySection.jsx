import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button, Spinner } from "flowbite-react";
import { api } from "../services/api";

export function HomeCategorySection({ categoryName, categorySlug, title, buttonText = "Explore More" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProducts({ category: categorySlug || categoryName, limit: 8 })
      .then((res) => {
        if (res.success && res.data) {
          setProducts(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [categoryName, categorySlug]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-8 max-w-7xl mx-auto px-4">
      {/* Sleek Reference-Style Header with Divider Lines */}
      <div className="relative flex items-center justify-between mb-8">
        <div className="hidden sm:block flex-1 border-t border-gray-200"></div>
        <h2 className="sm:px-6 text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight text-center">
          {title || categoryName}
        </h2>
        <div className="hidden sm:block flex-1 border-t border-gray-200"></div>
        <Link
          to={`/category/${categorySlug || encodeURIComponent(categoryName)}`}
          className="ml-3 whitespace-nowrap text-xs font-bold text-gray-600 hover:text-black hover:underline"
        >
          {buttonText} ➔
        </Link>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.slug}`}
              className="flex flex-col justify-between text-center bg-white rounded-2xl border-0 shadow-xs hover:shadow-xl transition-all duration-300 group p-2.5 sm:p-3 overflow-hidden"
            >
              <div>
                {/* Full-View Image Container - Clean, Borderless & Stroke-Free */}
                <div className="relative w-full aspect-square bg-[#f8f9fa] rounded-2xl overflow-hidden flex items-center justify-center p-3 sm:p-4 group-hover:bg-[#f1f3f5] transition-colors">
                  <img
                    src={product.thumbnailUrl || (product.images?.[0]?.imageUrl) || "/default-image.png"}
                    alt={product.name}
                    className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-500 transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {product.isBestSeller && (
                    <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                      Best Seller
                    </span>
                  )}
                </div>

                {/* Clean, Bold Product Title */}
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 line-clamp-1 mt-3 group-hover:text-yellow-600 transition-colors px-1">
                  {product.name}
                </h3>
                <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 font-medium px-1">
                  {product.shortDescription || "Custom print specifications"}
                </p>
              </div>

              <div className="mt-3 pt-2 flex items-center justify-between text-left px-1">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold block">Starting at</span>
                  <span className="text-sm sm:text-base font-extrabold text-red-600">
                    ₹{product.startingPrice}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-gray-700 bg-gray-100 group-hover:bg-yellow-400 group-hover:text-black px-2.5 py-1 rounded-lg transition-colors">
                  Customize ➔
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
