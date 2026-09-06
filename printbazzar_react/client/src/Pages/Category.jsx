import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Breadcrumb, Button, TextInput, Select, Drawer } from "flowbite-react";
import {
  HiHome,
  HiSearch,
  HiFilter,
  HiX,
  HiStar,
  HiOutlineAdjustments,
} from "react-icons/hi";
import Feedback from "../Components/Feedback.jsx";
import { api } from "../services/api";
import ProductCard from "../Components/ProductCard.jsx";
import ProductCardSkeletonGrid from "../Components/ProductCardSkeleton.jsx";
import { getInitialProducts } from "../assets/data/initialCatalog.js";
import { categories as fallbackCategories } from "../assets/data/categories.js";

const PAGE_SIZE = 12;

const PRICE_RANGES = [
  { label: "All Prices", min: null, max: null },
  { label: "Under ₹299", min: 0, max: 299 },
  { label: "₹300 - ₹599", min: 300, max: 599 },
  { label: "₹600 - ₹999", min: 600, max: 999 },
  { label: "₹1,000 & Above", min: 1000, max: null },
];

export function Category() {
  const { categoryName } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters from URL
  const selectedPriceRangeIdx = searchParams.get("priceIdx") !== null ? parseInt(searchParams.get("priceIdx"), 10) : 0;
  const ratingFilter = parseFloat(searchParams.get("minRating") || "0");
  const sortBy = searchParams.get("sort") || "default";
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(urlPage) || urlPage < 1 ? 1 : urlPage;
  const bestSellerFilter = searchParams.get("bestSeller") === "true";
  const featuredFilter = searchParams.get("featured") === "true";

  // Data state
  const [allCategories, setAllCategories] = useState(fallbackCategories);
  const [category, setCategory] = useState(null);
  const initial = getInitialProducts(categoryName);
  const [rawProducts, setRawProducts] = useState(initial);
  const [loading, setLoading] = useState(initial.length === 0);
  const [searchFilter, setSearchFilter] = useState("");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");

  const gridTopRef = useRef(null);

  // Load all categories for sidebar navigation
  useEffect(() => {
    api
      .getCategories()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setAllCategories(res.data);
        }
      })
      .catch(() => setAllCategories(fallbackCategories));
  }, []);

  // Fetch category and products when categoryName or sortBy changes
  useEffect(() => {
    fetchCategoryProducts();
  }, [categoryName, sortBy]);

  const fetchCategoryProducts = async () => {
    setLoading(true);
    try {
      let sortParam = "displayOrder";
      if (sortBy === "priceLow") sortParam = "priceAsc";
      if (sortBy === "priceHigh") sortParam = "priceDesc";
      if (sortBy === "nameAsc") sortParam = "nameAsc";

      const res = await api.getCategoryBySlug(categoryName, {
        limit: 100, // Fetch cohort for instant local multi-criteria filters
        sortBy: sortParam,
      });

      if (res && res.success && res.data) {
        setCategory(res.data);
        const items = res.data.products || [];
        setRawProducts(items);
      } else {
        // Fallback: search products by category
        const prodRes = await api.getProducts({
          category: categoryName,
          limit: 100,
          sortBy: sortParam,
        });

        if (prodRes && prodRes.success && prodRes.data) {
          setRawProducts(prodRes.data);
        } else {
          setRawProducts(initial);
        }
      }
    } catch (err) {
      console.error("Error loading category products:", err);
      setRawProducts(initial);
    } finally {
      setLoading(false);
    }
  };

  // Client-side instant filter pipeline
  const filteredProducts = useMemo(() => {
    let result = [...rawProducts];

    // Search query filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    // Price range filter
    const activeRange = PRICE_RANGES[selectedPriceRangeIdx] || PRICE_RANGES[0];
    if (activeRange.min !== null || activeRange.max !== null) {
      result = result.filter((p) => {
        const price = Number(p.startingPrice || p.price || 0);
        if (activeRange.min !== null && price < activeRange.min) return false;
        if (activeRange.max !== null && price > activeRange.max) return false;
        return true;
      });
    } else if (customMin || customMax) {
      const min = customMin ? parseFloat(customMin) : 0;
      const max = customMax ? parseFloat(customMax) : Infinity;
      result = result.filter((p) => {
        const price = Number(p.startingPrice || p.price || 0);
        return price >= min && price <= max;
      });
    }

    // Rating filter
    if (ratingFilter > 0) {
      result = result.filter((p) => {
        const r = p.rating || 4.7;
        return r >= ratingFilter;
      });
    }

    // Badges filter
    if (bestSellerFilter) {
      result = result.filter((p) => p.isBestSeller);
    }
    if (featuredFilter) {
      result = result.filter((p) => p.isFeatured);
    }

    return result;
  }, [rawProducts, searchFilter, selectedPriceRangeIdx, customMin, customMax, ratingFilter, bestSellerFilter, featuredFilter]);

  // Paginate results
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalItems);

  // URL state mutators
  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === undefined || value === "" || value === 0) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const handlePriceSelect = (idx) => {
    setCustomMin("");
    setCustomMax("");
    updateParam("priceIdx", idx === 0 ? null : idx);
  };

  const handleRatingSelect = (rating) => {
    updateParam("minRating", rating === ratingFilter ? null : rating);
  };

  const toggleBadge = (key, currentVal) => {
    updateParam(key, currentVal ? null : "true");
  };

  const handleSortChange = (newSort) => {
    updateParam("sort", newSort === "default" ? null : newSort);
  };

  const clearAllFilters = () => {
    setSearchFilter("");
    setCustomMin("");
    setCustomMax("");
    setSearchParams(new URLSearchParams());
    setIsMobileFilterOpen(false);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Active filters count
  const activeFiltersCount =
    (selectedPriceRangeIdx > 0 || customMin || customMax ? 1 : 0) +
    (ratingFilter > 0 ? 1 : 0) +
    (bestSellerFilter ? 1 : 0) +
    (featuredFilter ? 1 : 0) +
    (searchFilter ? 1 : 0);

  // Category display details
  const currentCategoryData =
    category ||
    allCategories.find(
      (c) => c.slug === categoryName || c.name.toLowerCase() === categoryName.toLowerCase()
    );
  const categoryDisplayName = currentCategoryData?.name || currentCategoryData?.title || categoryName.replace(/-/g, " ");

  // Sidebar Filter Content
  const SidebarFilterContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <HiFilter className="w-5 h-5 text-yellow-500" />
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </h3>
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* 1. Category Switcher */}
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 mb-3">
          Switch Category
        </h4>
        <div className="space-y-1 max-h-64 overflow-y-auto no-scrollbar pr-1">
          <Link
            to="/shop"
            className="w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span>All Products</span>
            <span className="text-[10px] text-gray-400 font-medium">Browse</span>
          </Link>

          {allCategories.map((cat) => {
            const isCurrent =
              cat.slug === categoryName ||
              cat.name.toLowerCase() === categoryName.toLowerCase();
            return (
              <Link
                key={cat.id || cat.slug}
                to={`/category/${cat.slug}`}
                onClick={() => setIsMobileFilterOpen(false)}
                className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isCurrent
                    ? "bg-yellow-400 text-black shadow-xs font-black"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="truncate pr-2">{cat.name}</span>
                {cat._count?.products > 0 && (
                  <span className="text-[10px] text-gray-500 font-medium">
                    {cat._count.products}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. Price Range */}
      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 mb-3">
          Price Range
        </h4>
        <div className="space-y-2">
          {PRICE_RANGES.map((range, idx) => (
            <label
              key={idx}
              onClick={() => handlePriceSelect(idx)}
              className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 hover:text-black"
            >
              <input
                type="radio"
                name="priceRangeCat"
                checked={selectedPriceRangeIdx === idx && !customMin && !customMax}
                onChange={() => {}}
                className="w-4 h-4 text-yellow-400 border-gray-300 focus:ring-yellow-400"
              />
              <span>{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 3. Customer Ratings Filter */}
      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 mb-3">
          Customer Rating
        </h4>
        <div className="space-y-2">
          {[4, 3].map((stars) => (
            <button
              key={stars}
              onClick={() => handleRatingSelect(stars)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                ratingFilter === stars ? "bg-yellow-100 text-black font-black" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center text-yellow-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <HiStar
                    key={i}
                    className={`w-4 h-4 ${i < stars ? "text-yellow-400" : "text-gray-300"}`}
                  />
                ))}
              </div>
              <span>{stars}★ & Above</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Special Badges */}
      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 mb-3">
          Highlights
        </h4>
        <div className="space-y-2 text-xs font-semibold text-gray-700">
          <label
            onClick={() => toggleBadge("bestSeller", bestSellerFilter)}
            className="flex items-center gap-2 cursor-pointer hover:text-black"
          >
            <input
              type="checkbox"
              checked={bestSellerFilter}
              onChange={() => {}}
              className="w-4 h-4 rounded text-yellow-400 border-gray-300 focus:ring-yellow-400"
            />
            <span>Best Sellers Only</span>
          </label>
          <label
            onClick={() => toggleBadge("featured", featuredFilter)}
            className="flex items-center gap-2 cursor-pointer hover:text-black"
          >
            <input
              type="checkbox"
              checked={featuredFilter}
              onChange={() => {}}
              className="w-4 h-4 rounded text-yellow-400 border-gray-300 focus:ring-yellow-400"
            />
            <span>Featured Items</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="text-xs sm:text-sm mb-4">
        <Breadcrumb.Item icon={HiHome}>
          <Link to="/" className="hover:underline text-gray-700">
            Home
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/shop" className="hover:underline text-gray-700">
            Shop
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item className="capitalize">
          {categoryDisplayName}
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* Category Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 mb-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-black bg-yellow-400 px-2.5 py-0.5 rounded-md inline-block mb-1.5">
            PRINT COLLECTION
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight capitalize">
            {categoryDisplayName}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
            {currentCategoryData?.description ||
              `Custom industrial printing and finishings for ${categoryDisplayName}. Choose paper GSM, sizes, and instant dynamic bulk tier pricing.`}
          </p>
        </div>

        {/* Mobile Filter Button */}
        <div className="lg:hidden w-full sm:w-auto">
          <Button
            onClick={() => setIsMobileFilterOpen(true)}
            color="light"
            className="w-full flex items-center justify-center gap-2 font-black border-gray-300 shadow-xs"
          >
            <HiOutlineAdjustments className="w-4 h-4 text-yellow-500" />
            <span>Filter {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
          </Button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* DESKTOP SIDEBAR FILTERS (Sticky) */}
        <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0 bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs sticky top-24">
          <SidebarFilterContent />
        </aside>

        {/* RIGHT MAIN CATALOG */}
        <main className="flex-1 w-full" ref={gridTopRef}>
          {/* Top Control Bar: Search Input, Active Chips, and Sort */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <TextInput
                type="text"
                placeholder={`Search within ${categoryDisplayName}...`}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                icon={HiSearch}
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                {totalItems} Products
              </span>

              <div className="w-40 sm:w-48">
                <Select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  size="sm"
                >
                  <option value="default">Featured</option>
                  <option value="priceLow">Price: Low to High</option>
                  <option value="priceHigh">Price: High to Low</option>
                  <option value="nameAsc">Name: A to Z</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider mr-1">
                Active:
              </span>

              {searchFilter && (
                <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-900 font-bold px-2.5 py-1 rounded-full border border-yellow-300">
                  Search: "{searchFilter}"
                  <button onClick={() => setSearchFilter("")}>
                    <HiX className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {selectedPriceRangeIdx > 0 && (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-800 font-bold px-2.5 py-1 rounded-full border border-gray-200">
                  {PRICE_RANGES[selectedPriceRangeIdx].label}
                  <button onClick={() => updateParam("priceIdx", null)}>
                    <HiX className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {ratingFilter > 0 && (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-800 font-bold px-2.5 py-1 rounded-full border border-gray-200">
                  {ratingFilter}★ & Above
                  <button onClick={() => updateParam("minRating", null)}>
                    <HiX className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {bestSellerFilter && (
                <span className="inline-flex items-center gap-1 text-xs bg-black text-yellow-400 font-black px-2.5 py-1 rounded-full shadow-xs">
                  Best Sellers
                  <button onClick={() => updateParam("bestSeller", null)}>
                    <HiX className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {featuredFilter && (
                <span className="inline-flex items-center gap-1 text-xs bg-black text-white font-bold px-2.5 py-1 rounded-full shadow-xs">
                  Featured
                  <button onClick={() => updateParam("featured", null)}>
                    <HiX className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-red-600 hover:underline ml-1"
              >
                Reset All
              </button>
            </div>
          )}

          {/* Catalog Grid */}
          {loading ? (
            <div className="py-4">
              <ProductCardSkeletonGrid count={8} />
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200/80 p-8 shadow-xs">
              <span className="text-5xl block mb-3">🔍</span>
              <h3 className="text-lg font-black text-gray-900">No Products Found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto mb-6">
                No products match the selected filters in this category.
              </p>
              <Button
                onClick={clearAllFilters}
                className="mx-auto bg-yellow-400 hover:bg-yellow-500 text-black font-black border-none"
              >
                Clear Filters ➔
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {paginatedProducts.map((product, index) => (
                  <ProductCard
                    key={product.id || index}
                    product={product}
                    index={index}
                    priority={index < 4}
                  />
                ))}
              </div>

              {/* Numbered Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs text-gray-500 font-medium">
                    Showing <strong className="text-gray-900">{startItem}–{endItem}</strong> of{" "}
                    <strong className="text-gray-900">{totalItems}</strong> items
                  </span>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      size="xs"
                      color="light"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="font-bold text-xs"
                    >
                      ← Prev
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                          p === currentPage
                            ? "bg-yellow-400 text-black shadow-xs"
                            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <Button
                      size="xs"
                      color="light"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="font-bold text-xs"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MOBILE FILTER DRAWER */}
      <Drawer
        open={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        position="right"
        className="w-80 bg-white p-6 z-50 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-4 border-b mb-4">
          <div className="flex items-center gap-2">
            <HiFilter className="w-5 h-5 text-yellow-500" />
            <h3 className="font-black text-gray-900 text-sm tracking-wider uppercase">
              Filters
            </h3>
          </div>
          <button
            onClick={() => setIsMobileFilterOpen(false)}
            className="text-gray-400 hover:text-black p-1 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <SidebarFilterContent />

        <div className="mt-8 pt-4 border-t">
          <Button
            onClick={() => setIsMobileFilterOpen(false)}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black"
          >
            View {totalItems} Products
          </Button>
        </div>
      </Drawer>

      <div className="mt-12">
        <Feedback />
      </div>
    </div>
  );
}
export default Category;
