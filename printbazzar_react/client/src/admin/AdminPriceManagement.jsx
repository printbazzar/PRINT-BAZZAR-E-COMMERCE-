import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  TextInput,
  Select,
  Spinner,
  Badge,
  Modal,
  Table,
  Toast,
} from 'flowbite-react';
import {
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineCurrencyRupee,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineExternalLink,
  HiOutlinePencilAlt,
  HiOutlineAdjustments,
  HiOutlineShieldCheck,
  HiOutlineCollection,
} from 'react-icons/hi';
import { api } from '../services/api';

export default function AdminPriceManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPricingType, setSelectedPricingType] = useState('ALL');

  // Inline Editing State: { [productId]: { startingPrice, minQuantity, quantityUnit, pricingType, gstPercentage, isDirty, isSaving } }
  const [editedPrices, setEditedPrices] = useState({});
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Slabs Modal State
  const [selectedProductForSlabs, setSelectedProductForSlabs] = useState(null);
  const [isSlabsModalOpen, setIsSlabsModalOpen] = useState(false);
  const [modalSlabs, setModalSlabs] = useState([]);

  useEffect(() => {
    fetchPricingMaster();
    fetchCategories();
  }, [selectedCategory, selectedPricingType]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchPricingMaster = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/pricing', {
        params: {
          categoryId: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          pricingType: selectedPricingType !== 'ALL' ? selectedPricingType : undefined,
          search: search.trim() || undefined,
        },
      });
      if (res.data.success) {
        setProducts(res.data.data);
        setStats(res.data.stats);

        // Initialize local edit state
        const initialEdits = {};
        res.data.data.forEach((p) => {
          initialEdits[p.id] = {
            startingPrice: p.startingPrice,
            minQuantity: p.minQuantity,
            quantityUnit: p.quantityUnit || 'Pieces',
            pricingType: p.pricingType || 'TIERED',
            gstPercentage: p.gstPercentage || 18,
            productionDays: p.productionDays || 1,
            singleSideDesignCharge: p.singleSideDesignCharge || 200,
            doubleSideDesignCharge: p.doubleSideDesignCharge || 400,
            isDirty: false,
            isSaving: false,
          };
        });
        setEditedPrices(initialEdits);
      }
    } catch (err) {
      console.error('Failed to load pricing master', err);
      showToast('Failed to load pricing database', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleFieldChange = (productId, field, value) => {
    setEditedPrices((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
        isDirty: true,
      },
    }));
  };

  const handleSaveSinglePrice = async (product) => {
    const editData = editedPrices[product.id];
    if (!editData) return;

    setEditedPrices((prev) => ({
      ...prev,
      [product.id]: { ...prev[product.id], isSaving: true },
    }));

    try {
      const res = await api.put(`/admin/pricing/${product.id}`, {
        startingPrice: parseFloat(editData.startingPrice),
        minQuantity: parseInt(editData.minQuantity, 10),
        quantityUnit: editData.quantityUnit,
        pricingType: editData.pricingType,
        gstPercentage: parseFloat(editData.gstPercentage),
        productionDays: parseInt(editData.productionDays, 10),
        singleSideDesignCharge: parseFloat(editData.singleSideDesignCharge) || 200,
        doubleSideDesignCharge: parseFloat(editData.doubleSideDesignCharge) || 400,
        reason: 'Price updated via Live Pricing Master table',
      });

      if (res.data.success) {
        showToast(`✔ Updated ${product.name} (Price: ₹${editData.startingPrice}, Design: ₹${editData.singleSideDesignCharge} / ₹${editData.doubleSideDesignCharge})`);
        setEditedPrices((prev) => ({
          ...prev,
          [product.id]: { ...prev[product.id], isDirty: false, isSaving: false },
        }));
      }
    } catch (err) {
      console.error('Failed to save price', err);
      showToast(`❌ Failed to update price for ${product.name}`, 'error');
      setEditedPrices((prev) => ({
        ...prev,
        [product.id]: { ...prev[product.id], isSaving: false },
      }));
    }
  };

  const openSlabsModal = (product) => {
    setSelectedProductForSlabs(product);
    setModalSlabs(product.priceSlabs ? [...product.priceSlabs] : []);
    setIsSlabsModalOpen(true);
  };

  const handleSaveSlabs = async () => {
    if (!selectedProductForSlabs) return;
    try {
      const res = await api.put(`/admin/pricing/${selectedProductForSlabs.id}`, {
        priceSlabs: modalSlabs,
        reason: 'Updated volume pricing slabs in Pricing Master',
      });
      if (res.data.success) {
        showToast(`✔ Saved ${modalSlabs.length} quantity tier slabs for ${selectedProductForSlabs.name}`);
        setIsSlabsModalOpen(false);
        fetchPricingMaster();
      }
    } catch (err) {
      console.error('Failed to save slabs', err);
      showToast('Failed to save quantity slabs', 'error');
    }
  };

  const filteredProducts = products.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50">
          <Toast>
            <div className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              toastType === 'success' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'
            }`}>
              {toastType === 'success' ? <HiOutlineCheckCircle className="h-5 w-5" /> : <HiOutlineExclamationCircle className="h-5 w-5" />}
            </div>
            <div className="ml-3 text-sm font-bold text-gray-900">{toastMessage}</div>
          </Toast>
        </div>
      )}

      {/* Header & Source Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900">Live Product Pricing Master</h1>
            <span className="bg-green-100 text-green-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <HiOutlineShieldCheck className="w-3.5 h-3.5" /> SOURCE: CURRENT_PRINTBAZZAR_WEBSITE
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Centralized database pricing control. Update base prices, quantity units, models, and volume slabs without developer assistance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" color="light" onClick={fetchPricingMaster} disabled={loading}>
            <HiOutlineRefresh className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button as={Link} to="/admin/products/new" size="sm" color="dark" className="bg-black text-white font-bold">
            + New Product
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-gray-400 block">Total Catalog</span>
            <span className="text-2xl font-black text-gray-900">{stats.total}</span>
            <span className="text-[10px] text-gray-500 block mt-0.5">Active Products</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-blue-500 block">Volume Tiered</span>
            <span className="text-2xl font-black text-blue-600">{stats.tiered}</span>
            <span className="text-[10px] text-gray-500 block mt-0.5">Quantity Slabs</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-purple-500 block">Per-Piece</span>
            <span className="text-2xl font-black text-purple-600">{stats.perPiece}</span>
            <span className="text-[10px] text-gray-500 block mt-0.5">Unit Based</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-amber-500 block">Per Sq.ft</span>
            <span className="text-2xl font-black text-amber-600">{stats.perSqft}</span>
            <span className="text-[10px] text-gray-500 block mt-0.5">Large Format</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-teal-500 block">Fixed Pack</span>
            <span className="text-2xl font-black text-teal-600">{stats.fixedQty}</span>
            <span className="text-[10px] text-gray-500 block mt-0.5">Boxes & Sets</span>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-green-700 block">Live Confirmed</span>
            <span className="text-2xl font-black text-green-700">{stats.liveConfirmed}</span>
            <span className="text-[10px] text-green-800 block mt-0.5">Website Live Sync</span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <HiOutlineSearch className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <TextInput
            placeholder="Search product by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7"
            size="sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-48">
            <Select
              size="sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-full sm:w-44">
            <Select
              size="sm"
              value={selectedPricingType}
              onChange={(e) => setSelectedPricingType(e.target.value)}
            >
              <option value="ALL">All Pricing Types</option>
              <option value="TIERED">Tiered Slabs</option>
              <option value="PER_PIECE">Per Piece</option>
              <option value="PER_SQFT">Per Sq.ft</option>
              <option value="FIXED_QTY">Fixed Pack Qty</option>
              <option value="CUSTOM_QUOTE">Custom Quote</option>
            </Select>
          </div>

          {(selectedCategory !== 'ALL' || selectedPricingType !== 'ALL' || search) && (
            <Button
              size="xs"
              color="light"
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedPricingType('ALL');
                setSearch('');
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Pricing Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <Spinner size="xl" />
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading Live Pricing Database...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <HiOutlineCollection className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-bold text-gray-700">No products found matching filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 border-b">
                <tr>
                  <th className="p-3">Product / SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 w-32">Pricing Model</th>
                  <th className="p-3 w-28">Min Qty</th>
                  <th className="p-3 w-28">Unit</th>
                  <th className="p-3 w-32">Base Price (₹)</th>
                  <th className="p-3 w-20">GST %</th>
                  <th className="p-3">Slabs & Finishes</th>
                  <th className="p-3 text-right">Quick Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const edit = editedPrices[p.id] || {
                    startingPrice: p.startingPrice,
                    minQuantity: p.minQuantity,
                    quantityUnit: p.quantityUnit || 'Pieces',
                    pricingType: p.pricingType || 'TIERED',
                    gstPercentage: p.gstPercentage || 18,
                    productionDays: p.productionDays || 1,
                    isDirty: false,
                    isSaving: false,
                  };

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        edit.isDirty ? 'bg-yellow-50/40' : ''
                      }`}
                    >
                      {/* Product Name & SKU */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <Link
                              to={`/product/${p.slug}`}
                              target="_blank"
                              className="font-bold text-gray-900 hover:text-yellow-600 flex items-center gap-1 group"
                            >
                              <span>{p.name}</span>
                              <HiOutlineExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-yellow-600" />
                            </Link>
                            <span className="text-[10px] text-gray-400 block font-mono">{p.sku}</span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        <span className="font-semibold text-gray-700">{p.category?.name || 'Unassigned'}</span>
                      </td>

                      {/* Pricing Model Dropdown */}
                      <td className="p-3">
                        <Select
                          size="sm"
                          value={edit.pricingType}
                          onChange={(e) => handleFieldChange(p.id, 'pricingType', e.target.value)}
                        >
                          <option value="TIERED">Tiered</option>
                          <option value="PER_PIECE">Per Piece</option>
                          <option value="PER_SQFT">Per Sq.ft</option>
                          <option value="FIXED_QTY">Fixed Pack</option>
                          <option value="CUSTOM_QUOTE">Custom Quote</option>
                        </Select>
                      </td>

                      {/* Min Qty */}
                      <td className="p-3">
                        <TextInput
                          type="number"
                          value={edit.minQuantity}
                          onChange={(e) => handleFieldChange(p.id, 'minQuantity', e.target.value)}
                          size="sm"
                          className="font-bold"
                        />
                      </td>

                      {/* Quantity Unit */}
                      <td className="p-3">
                        <Select
                          size="sm"
                          value={edit.quantityUnit}
                          onChange={(e) => handleFieldChange(p.id, 'quantityUnit', e.target.value)}
                        >
                          <option value="Pieces">Pieces</option>
                          <option value="Cards">Cards</option>
                          <option value="Sheets">Sheets</option>
                          <option value="Sq.ft">Sq.ft</option>
                          <option value="Pairs">Pairs</option>
                          <option value="Boxes">Boxes</option>
                          <option value="Sets">Sets</option>
                        </Select>
                      </td>

                      {/* Base Price Input */}
                      <td className="p-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-xs text-gray-400 font-bold">₹</span>
                          <TextInput
                            type="number"
                            value={edit.startingPrice}
                            onChange={(e) => handleFieldChange(p.id, 'startingPrice', e.target.value)}
                            size="sm"
                            className="pl-5 font-black text-red-600"
                          />
                        </div>
                      </td>

                      {/* GST Percentage */}
                      <td className="p-3">
                        <TextInput
                          type="number"
                          value={edit.gstPercentage}
                          onChange={(e) => handleFieldChange(p.id, 'gstPercentage', e.target.value)}
                          size="sm"
                        />
                      </td>

                      {/* Slabs & Finishes Count */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openSlabsModal(p)}
                            className="text-[11px] font-bold bg-gray-100 hover:bg-yellow-400 hover:text-black text-gray-700 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                            title="Edit Volume Slabs"
                          >
                            <HiOutlineAdjustments className="w-3.5 h-3.5" />
                            <span>{p.priceSlabs?.length || 0} Slabs</span>
                          </button>

                          <Link
                            to={`/admin/products`}
                            className="text-gray-400 hover:text-gray-700 p-1"
                            title="Full Product Editor"
                          >
                            <HiOutlinePencilAlt className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="p-3 text-right">
                        <Button
                          size="xs"
                          color={edit.isDirty ? 'warning' : 'light'}
                          disabled={!edit.isDirty || edit.isSaving}
                          onClick={() => handleSaveSinglePrice(p)}
                          className={edit.isDirty ? 'bg-yellow-400 text-black font-extrabold shadow-sm' : ''}
                        >
                          {edit.isSaving ? 'Saving...' : edit.isDirty ? 'Save Changes' : 'Saved'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Volume Pricing Slabs Modal */}
      <Modal show={isSlabsModalOpen} onClose={() => setIsSlabsModalOpen(false)} size="3xl">
        <div className="p-6 bg-white rounded-2xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b">
            <div>
              <h3 className="font-extrabold text-base text-gray-900">
                Quantity Tier Slabs: {selectedProductForSlabs?.name}
              </h3>
              <p className="text-xs text-gray-500">
                Configure quantity breakpoints, single side vs double side rates for this product.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSlabsModalOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700">Volume Discount Tiers</span>
              <Button
                size="xs"
                color="light"
                onClick={() =>
                  setModalSlabs([
                    ...modalSlabs,
                    {
                      minQty: 100,
                      singleSidePrice: 0,
                      doubleSidePrice: 0,
                      singleSideDesignCharge: 200,
                      doubleSideDesignCharge: 400,
                    },
                  ])
                }
              >
                + Add Tier
              </Button>
            </div>

            {modalSlabs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No quantity tier slabs defined.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 uppercase text-[10px] text-gray-400 border-b">
                    <tr>
                      <th className="p-2">Min Qty</th>
                      <th className="p-2">Single Side Print (₹)</th>
                      <th className="p-2">Double Side Print (₹)</th>
                      <th className="p-2 text-purple-700">1-Side Design (₹)</th>
                      <th className="p-2 text-purple-700">2-Side Design (₹)</th>
                      <th className="p-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modalSlabs.map((s, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <TextInput
                            type="number"
                            value={s.minQty}
                            onChange={(e) => {
                              const updated = [...modalSlabs];
                              updated[idx].minQty = parseInt(e.target.value, 10) || 1;
                              setModalSlabs(updated);
                            }}
                            size="sm"
                          />
                        </td>
                        <td className="p-2">
                          <TextInput
                            type="number"
                            value={s.singleSidePrice}
                            onChange={(e) => {
                              const updated = [...modalSlabs];
                              updated[idx].singleSidePrice = parseFloat(e.target.value) || 0;
                              setModalSlabs(updated);
                            }}
                            size="sm"
                          />
                        </td>
                        <td className="p-2">
                          <TextInput
                            type="number"
                            value={s.doubleSidePrice}
                            onChange={(e) => {
                              const updated = [...modalSlabs];
                              updated[idx].doubleSidePrice = parseFloat(e.target.value) || 0;
                              setModalSlabs(updated);
                            }}
                            size="sm"
                          />
                        </td>
                        <td className="p-2">
                          <TextInput
                            type="number"
                            value={s.singleSideDesignCharge ?? s.designCharge ?? 200}
                            onChange={(e) => {
                              const updated = [...modalSlabs];
                              updated[idx].singleSideDesignCharge = parseFloat(e.target.value) || 0;
                              setModalSlabs(updated);
                            }}
                            size="sm"
                            className="text-purple-700 font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <TextInput
                            type="number"
                            value={s.doubleSideDesignCharge ?? ((s.singleSideDesignCharge || s.designCharge || 200) * 2)}
                            onChange={(e) => {
                              const updated = [...modalSlabs];
                              updated[idx].doubleSideDesignCharge = parseFloat(e.target.value) || 0;
                              setModalSlabs(updated);
                            }}
                            size="sm"
                            className="text-purple-700 font-bold"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => setModalSlabs(modalSlabs.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 text-xs font-bold"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button size="sm" color="light" onClick={() => setIsSlabsModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" color="dark" onClick={handleSaveSlabs} className="bg-black text-white font-bold">
              Save Tier Slabs
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
