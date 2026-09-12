import React, { useState, useEffect, useRef } from "react";
import { TextInput, Spinner } from "flowbite-react";
import { Link, useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { IoSearch } from "react-icons/io5";
import { api } from "../services/api";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [matchingProducts, setMatchingProducts] = useState([]);
  const [matchingCategories, setMatchingCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getCategories()
      .then((res) => {
        if (res.success) setAllCategories(res.data || []);
      })
      .catch(console.error);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsDropdownVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatchingProducts([]);
      setMatchingCategories([]);
      setIsDropdownVisible(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const q = searchQuery.toLowerCase().trim();

        // Filter matching categories locally
        const matchedCats = allCategories.filter((c) =>
          c.name.toLowerCase().includes(q) || c.slug.includes(q)
        );
        setMatchingCategories(matchedCats.slice(0, 3));

        // Query products via API
        const res = await api.getProducts({ search: q, limit: 6 });
        if (res.success) {
          setMatchingProducts(res.data || []);
        }
        setIsDropdownVisible(true);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, allCategories]);

  const clearSearch = () => {
    setSearchQuery("");
    setMatchingProducts([]);
    setMatchingCategories([]);
    setIsDropdownVisible(false);
  };

  const handleSelect = () => {
    clearSearch();
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setIsDropdownVisible(false);
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <TextInput
          id="storefront-search-input"
          type="text"
          placeholder="Search products, visiting cards, stickers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchSubmit(e);
            }
          }}
          onFocus={() => {
            if (searchQuery.trim()) setIsDropdownVisible(true);
          }}
          className="w-full text-sm"
          icon={IoSearch}
        />

        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 text-xs"
            title="Clear search"
          >
            <FaTimes />
          </button>
        )}
      </form>

      {/* Floating Results Dropdown */}
      {isDropdownVisible && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <Spinner size="sm" /> Searching catalogue...
            </div>
          ) : matchingCategories.length === 0 && matchingProducts.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">
              No matching products or categories found for "{searchQuery}".
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Category Matches */}
              {matchingCategories.length > 0 && (
                <div className="p-2.5 bg-gray-50/70">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-2 block mb-1">
                    Matching Categories
                  </span>
                  <div className="space-y-1">
                    {matchingCategories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.slug}`}
                        onClick={handleSelect}
                        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-yellow-100 rounded-xl text-xs font-bold text-gray-800 transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                        <span>{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Matches */}
              {matchingProducts.length > 0 && (
                <div className="p-2.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-2 block mb-1">
                    Products & Stationery
                  </span>
                  <div className="space-y-1">
                    {matchingProducts.map((prod) => (
                      <Link
                        key={prod.id}
                        to={`/product/${prod.slug}`}
                        onClick={handleSelect}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors group"
                      >
                        <img
                          src={prod.thumbnailUrl || (prod.images?.[0]?.imageUrl || prod.images?.[0]?.url) || "/default-image.png"}
                          alt={prod.name}
                          width={40}
                          height={40}
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 object-cover rounded-lg border bg-white flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-gray-900 truncate group-hover:text-yellow-600 transition-colors">
                            {prod.name}
                          </h4>
                          <p className="text-[11px] text-gray-500 truncate">
                            {prod.category?.name} • SKU: {prod.sku}
                          </p>
                        </div>
                        <span className="text-xs font-black text-red-600 flex-shrink-0">
                          ₹{prod.startingPrice}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* View All Results Button */}
              <div className="p-2 bg-gray-50 text-center">
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="w-full py-1.5 text-xs font-black text-black hover:text-yellow-600 transition-colors"
                >
                  View all results for "{searchQuery}" in Shop ➔
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
