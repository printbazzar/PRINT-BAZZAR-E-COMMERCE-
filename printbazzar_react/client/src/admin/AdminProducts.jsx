import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TextInput, Select, Button, Spinner, Table, Modal } from 'flowbite-react';
import {
  HiPlus,
  HiSearch,
  HiOutlinePencil,
  HiOutlineDuplicate,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineExclamation,
  HiOutlineAdjustments,
  HiOutlineCollection,
} from 'react-icons/hi';
import { api } from '../services/api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  // Notification / Alert
  const [actionFeedback, setActionFeedback] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    api.getCategories().then((res) => {
      if (res.success) setCategories(res.data || []);
    });
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedStatus, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminProducts({
        search,
        category: selectedCategory,
        status: selectedStatus,
        page,
        limit: 25,
      });
      if (res.success) {
        setProducts(res.data || []);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error loading admin products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.duplicateProduct(id);
      if (res.success) {
        setActionFeedback('Product duplicated successfully as Draft!');
        fetchProducts();
        setTimeout(() => setActionFeedback(''), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to duplicate product');
    }
  };

  const handleArchive = async (id, name) => {
    if (!window.confirm(`Are you sure you want to archive "${name}"?`)) return;
    try {
      const res = await api.deleteProduct(id);
      if (res.success) {
        setActionFeedback(`Product "${name}" archived.`);
        fetchProducts();
        setTimeout(() => setActionFeedback(''), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to archive product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Product Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Total of <span className="font-bold text-gray-800">{totalCount}</span> print products in database
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/options-master"
            className="px-3 py-2 border border-purple-200 rounded-lg font-bold text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 flex items-center gap-1.5 transition-colors"
          >
            <HiOutlineCollection className="w-4 h-4 text-purple-600" />
            Option Masters
          </Link>

          <Button
            as={Link}
            to="/admin/products/new"
            color="dark"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs"
          >
            <HiPlus className="w-4 h-4 mr-1" /> Add New Product
          </Button>
        </div>
      </div>

      {actionFeedback && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold p-3 rounded-lg">
          ✔ {actionFeedback}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TextInput
          type="text"
          placeholder="Search by Product Name or SKU..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          icon={HiSearch}
          size="sm"
        />

        <Select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
          }}
          size="sm"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          size="sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </Select>
      </div>

      {/* Product Data Table */}
      <div className="bg-white rounded-xl border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Spinner size="lg" />
            <p className="mt-2 text-xs text-gray-500">Loading catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            No products found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 border-b">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Starting Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Badges</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 flex items-center gap-3">
                      <img
                        src={prod.thumbnailUrl || (prod.images?.[0]?.imageUrl) || '/default-image.png'}
                        alt={prod.name}
                        className="w-11 h-11 object-cover rounded-lg border-0 shadow-xs flex-shrink-0"
                      />
                      <div>
                        <Link
                          to={`/admin/products/edit/${prod.id}`}
                          className="font-bold text-gray-900 hover:text-yellow-600 line-clamp-1"
                        >
                          {prod.name}
                        </Link>
                        <span className="text-[10px] text-gray-400 block">{prod.slug}</span>
                      </div>
                    </td>

                    <td className="p-3 font-mono font-bold text-gray-800">{prod.sku}</td>

                    <td className="p-3 font-medium text-gray-600">{prod.category?.name}</td>

                    <td className="p-3 font-bold text-red-600 text-sm">₹{prod.startingPrice}</td>

                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          prod.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : prod.status === 'DRAFT'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {prod.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex gap-1">
                        {prod.isBestSeller && (
                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                            Best Seller
                          </span>
                        )}
                        {prod.isFeatured && (
                          <span className="text-[9px] bg-yellow-100 text-yellow-800 font-bold px-1.5 py-0.5 rounded">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/product/${prod.slug}`}
                          target="_blank"
                          className="p-1.5 text-gray-500 hover:text-gray-900 bg-gray-100 rounded"
                          title="View on Live Store"
                        >
                          <HiOutlineEye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/products/edit/${prod.id}`}
                          className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 rounded"
                          title="Edit Product Details"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/products/${prod.id}/configuration`}
                          className="px-2 py-1 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded flex items-center gap-1 font-extrabold text-[11px] transition-colors border border-purple-200"
                          title="Configure Dynamic Options & Pricing Matrix"
                        >
                          <HiOutlineAdjustments className="w-3.5 h-3.5" />
                          <span>Config & Price</span>
                        </Link>
                        <button
                          onClick={() => handleDuplicate(prod.id)}
                          className="p-1.5 text-purple-600 hover:text-purple-800 bg-purple-50 rounded"
                          title="Duplicate Product"
                        >
                          <HiOutlineDuplicate className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(prod.id, prod.name)}
                          className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 rounded"
                          title="Archive Product"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalCount > 25 && (
        <div className="flex justify-between items-center text-xs text-gray-500 pt-2">
          <span>Showing page {page} of {Math.ceil(totalCount / 25)}</span>
          <div className="flex gap-2">
            <Button
              size="xs"
              color="light"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="xs"
              color="light"
              disabled={page >= Math.ceil(totalCount / 25)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
