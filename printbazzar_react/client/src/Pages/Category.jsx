import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumb, Spinner, Select, TextInput } from "flowbite-react";
import { HiHome, HiSearch } from "react-icons/hi";
import Feedback from "../Components/Feedback.jsx";
import { api } from "../services/api";

export function Category() {
  const { categoryName } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    fetchCategoryData();
  }, [categoryName]);

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch category info
      const catRes = await api.getCategoryBySlug(categoryName).catch(() => null);
      if (catRes && catRes.success && catRes.data) {
        setCategory(catRes.data);
        setProducts(catRes.data.products || []);
      } else {
        // Fallback: search products by category
        const prodRes = await api.getProducts({ category: categoryName, limit: 100 });
        if (prodRes.success && prodRes.data) {
          setProducts(prodRes.data);
        }
      }
    } catch (err) {
      console.error("Error loading category:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort products
  const filteredProducts = products.filter((p) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "priceLow") return a.startingPrice - b.startingPrice;
    if (sortBy === "priceHigh") return b.startingPrice - a.startingPrice;
    if (sortBy === "nameAsc") return a.name.localeCompare(b.name);
    return 0;
  });

  const displayName = category?.name || decodeURIComponent(categoryName);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb className="text-sm mb-4">
        <Breadcrumb.Item icon={HiHome}>
          <Link to="/" className="hover:underline text-gray-700">Home</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/shop" className="hover:underline text-gray-700">Categories</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{displayName}</Breadcrumb.Item>
      </Breadcrumb>

      {/* Category Banner if available */}
      {category?.bannerUrl && (
        <div className="mb-6 rounded-2xl overflow-hidden shadow-xs relative w-full h-36 sm:h-52 md:h-60 lg:h-64 bg-gray-100">
          <img
            src={category.bannerUrl}
            alt={`${displayName} Banner`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 my-6 pb-4 border-b">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900">{displayName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Showing <span className="font-semibold text-gray-800">{sortedProducts.length}</span> custom print products
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Quick Search in category */}
          <div className="w-full sm:w-60">
            <TextInput
              type="text"
              placeholder="Search in this category..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              icon={HiSearch}
              size="sm"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="w-full sm:w-48">
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} size="sm">
              <option value="default">Sort by: Featured</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
              <option value="nameAsc">Name: A to Z</option>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="xl" />
          <p className="mt-3 text-sm text-gray-500">Loading {displayName} items...</p>
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="py-16 text-center bg-gray-50 rounded-2xl border border-dashed p-8">
          <h3 className="text-lg font-bold text-gray-800 mb-1">No products found</h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchFilter ? `No products match "${searchFilter}".` : 'Products are coming soon in this collection.'}
          </p>
          <Link
            to="/shop"
            className="inline-block bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-400 hover:text-black transition-colors"
          >
            Explore Other Categories
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {sortedProducts.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.slug}`}
              className="bg-white border-0 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group p-2.5 sm:p-3"
            >
              <div>
                {/* Full-View Image Container - Borderless & Stroke-Free */}
                <div className="relative w-full aspect-square bg-[#f8f9fa] rounded-2xl overflow-hidden mb-3 flex items-center justify-center p-3 sm:p-4 group-hover:bg-[#f1f3f5] transition-colors">
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
                  {product.isFeatured && (
                    <span className="absolute top-2.5 right-2.5 bg-yellow-400 text-black text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                      Featured
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 group-hover:text-yellow-600 transition-colors line-clamp-1 px-1">
                  {product.name}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 font-medium px-1">
                  {product.shortDescription || `High-quality custom ${product.name}`}
                </p>
              </div>

              <div className="mt-3 pt-2 flex justify-between items-center text-left px-1">
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

      <div className="mt-16">
        <Feedback />
      </div>
    </div>
  );
}
