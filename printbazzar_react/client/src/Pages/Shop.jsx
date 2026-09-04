import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Breadcrumb, Spinner, Badge } from "flowbite-react";
import { HiHome, HiOutlineSparkles, HiOutlineArrowRight } from "react-icons/hi";
import Feedback from "../Components/Feedback";
import { api } from "../services/api";
import { categories as fallbackCategories } from "../assets/data/categories";

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [categories, setCategories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const res = await api.getProducts({ search: searchQuery.trim(), limit: 50 });
        if (res.success && res.data) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } else {
        const res = await api.getCategories();
        if (res.success && res.data && res.data.length > 0) {
          setCategories(res.data);
        } else {
          setCategories(fallbackCategories);
        }
      }
    } catch (err) {
      console.error("Shop load error:", err);
      if (!searchQuery.trim()) setCategories(fallbackCategories);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Breadcrumb className="text-sm mb-4">
        <Breadcrumb.Item icon={HiHome}>
          <Link to="/" className="hover:underline text-gray-700">Home</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          {searchQuery ? `Search Results: "${searchQuery}"` : "Categories & Products"}
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* Header Banner */}
      <div className="text-center my-6">
        {searchQuery ? (
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-yellow-800 bg-yellow-100 px-3 py-1 rounded-full inline-block mb-2">
              CATALOGUE SEARCH
            </span>
            <h1 className="text-3xl lg:text-4xl text-black font-black mt-1">
              Search Results for "{searchQuery}"
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm max-w-xl mx-auto mt-2">
              Found <strong>{searchResults.length} matching printing products</strong>. Click any product to customize paper GSM, sides, and quantities.
            </p>
            <button
              onClick={clearSearch}
              className="mt-3 inline-flex items-center gap-1 text-xs font-black text-red-600 hover:underline"
            >
              ✕ Clear Search & Browse All Categories
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-xs md:text-sm text-red-600 font-bold uppercase tracking-wider">
              Browse All Printing Collections
            </h3>
            <h1 className="text-3xl lg:text-5xl text-black font-extrabold mt-1">
              Print Bazzar Categories
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm max-w-xl mx-auto mt-2">
              Select a category to customize visiting cards, marketing collaterals, stickers, packaging, invitations, and corporate gifts.
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="xl" />
          <p className="mt-3 text-sm text-gray-500 font-bold">
            {searchQuery ? `Searching products for "${searchQuery}"...` : "Loading catalogue..."}
          </p>
        </div>
      ) : searchQuery ? (
        /* PRODUCT SEARCH RESULTS GRID */
        <div>
          {searchResults.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-200 my-6">
              <span className="text-4xl block mb-2">🔍</span>
              <h3 className="text-lg font-black text-gray-800">No Products Found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto mb-5">
                We couldn't find any products matching "{searchQuery}". Try searching for keywords like "visiting card", "laminated", "sticker", "flyer", or "bill book".
              </p>
              <Button onClick={clearSearch} color="dark" size="xs" className="mx-auto font-black">
                Browse All Categories ➔
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {searchResults.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="bg-white rounded-2xl border-0 p-2.5 sm:p-3 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group overflow-hidden"
                >
                  <div>
                    {/* Full-View Image Container - Clean, Borderless & Stroke-Free */}
                    <div className="relative w-full aspect-square bg-[#f8f9fa] rounded-2xl overflow-hidden mb-3 flex items-center justify-center p-3 sm:p-4 group-hover:bg-[#f1f3f5] transition-colors">
                      <img
                        src={product.thumbnailUrl || "/default-image.png"}
                        alt={product.name}
                        className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
                      />
                      {product.isBestSeller && (
                        <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-xs">
                          Best Seller
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-extrabold uppercase text-gray-400 block tracking-wider px-1">
                      {product.category?.name || "Print Product"}
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-gray-900 line-clamp-1 mt-0.5 group-hover:text-yellow-600 transition-colors px-1">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 font-medium px-1">
                      {product.shortDescription || "High quality offset and digital print custom options available."}
                    </p>
                  </div>

                  <div className="pt-2 mt-3 flex justify-between items-center px-1">
                    <div>
                      <span className="text-[9px] text-gray-400 block font-bold uppercase">Price</span>
                      <span className="font-black text-red-600 text-xs sm:text-sm">Starts ₹{product.startingPrice}</span>
                    </div>
                    <span className="text-[10px] bg-gray-100 group-hover:bg-yellow-400 group-hover:text-black font-extrabold px-2.5 py-1 rounded-lg transition-colors">
                      Customize ➔
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* CATEGORIES GRID */
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {categories.map((category, index) => {
            const catSlug = category.slug || encodeURIComponent(category.name || category.title);
            const catName = category.name || category.title;
            const catImg = category.imageUrl || category.image || "/default-category-image.png";

            return (
              <Link
                key={category.id || index}
                to={`/category/${catSlug}`}
                aria-label={`Explore ${catName}`}
                className="flex flex-col justify-between text-center p-3 sm:p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-xl transition-all duration-300 group"
              >
                <div>
                  <div className="relative w-full aspect-square bg-[#f8f9fa] rounded-2xl overflow-hidden mb-3 flex items-center justify-center p-3 sm:p-5 group-hover:bg-[#f3f4f6] transition-colors">
                    <img
                      src={catImg}
                      alt={catName}
                      className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <h4 className="text-xs sm:text-sm text-black font-extrabold group-hover:text-yellow-600 transition-colors line-clamp-1">
                    {catName}
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {category._count?.products ? `${category._count.products} products available` : "Explore catalogue"}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-center gap-1 text-[11px] text-gray-700 font-extrabold group-hover:text-black">
                  <span>View Items</span>
                  <HiOutlineArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Customer Feedback section */}
      <div className="mt-16">
        <Feedback />
      </div>
    </div>
  );
}
