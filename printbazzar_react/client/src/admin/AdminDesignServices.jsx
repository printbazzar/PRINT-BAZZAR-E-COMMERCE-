import React, { useState, useEffect } from 'react';
import {
  Button,
  Spinner,
  Badge,
  Modal,
  Label,
  TextInput,
  Textarea,
  Select,
  Checkbox,
  Card,
  Tooltip,
} from 'flowbite-react';
import {
  HiOutlineSparkles,
  HiOutlineColorSwatch,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineDuplicate,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineEye,
  HiOutlineCloudUpload,
  HiOutlineArrowRight,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineUserGroup,
  HiOutlineDownload,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineSearch,
  HiOutlineExternalLink,
} from 'react-icons/hi';
import { api } from '../services/api';

export default function AdminDesignServices() {
  const [activeTab, setActiveTab] = useState('packages'); // 'packages' | 'addons' | 'mapping' | 'orders' | 'settings'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <HiOutlineSparkles className="w-3.5 h-3.5" /> Design Services Master
            </span>
            <span className="text-xs text-gray-500">• In-House Prepress & Creative Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Design Package & Service Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage reusable design tiers, custom product mappings, add-on rates, and customer design job workflows.
          </p>
        </div>

        {/* Live Quick Links */}
        <div className="flex items-center gap-2">
          <Button
            as="a"
            href="/product/standard-card"
            target="_blank"
            color="light"
            size="sm"
            className="text-xs font-bold"
          >
            <HiOutlineExternalLink className="w-4 h-4 mr-1 text-purple-600" />
            Preview on Product
          </Button>
        </div>
      </div>

      {/* Primary Sub-Navigation Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-2xs flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('packages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'packages'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <HiOutlineColorSwatch className="w-4 h-4" />
          A. Design Packages
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('addons')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'addons'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <HiOutlineSparkles className="w-4 h-4" />
          B. Design Add-ons
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mapping')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'mapping'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <HiOutlineClipboardList className="w-4 h-4" />
          C. Product Design Mapping
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'orders'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <HiOutlineClock className="w-4 h-4" />
          D. Design Orders (Job Hub)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <HiOutlineCog className="w-4 h-4" />
          E. Design Settings
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'packages' && <DesignPackagesTab />}
      {activeTab === 'addons' && <DesignAddonsTab />}
      {activeTab === 'mapping' && <ProductMappingTab />}
      {activeTab === 'orders' && <DesignOrdersTab />}
      {activeTab === 'settings' && <DesignSettingsTab />}
    </div>
  );
}

// =========================================================================
// TAB A: DESIGN PACKAGES
// =========================================================================
function DesignPackagesTab() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    badge: '',
    shortDescription: '',
    detailedDescription: '',
    basePrice: 299,
    doubleSidePrice: 499,
    offerPrice: '',
    concepts: 1,
    revisions: 1,
    deliveryDays: 2,
    deliveryTimeText: '2 Working Days',
    expressDeliveryTime: '24 Hours',
    expressDeliveryCharge: 250,
    features: ['1 Initial Concept', '1 Revision Included', 'Print-ready PDF'],
    sortOrder: 0,
    isActive: true,
    isDefault: false,
    mapToAllProducts: false,
  });

  const [newFeatureInput, setNewFeatureInput] = useState('');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDesignPackages();
      if (res.success && res.data) {
        setPackages(res.data);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPkg(null);
    setFormData({
      name: '',
      badge: '',
      shortDescription: '',
      detailedDescription: '',
      basePrice: 299,
      doubleSidePrice: 499,
      offerPrice: '',
      concepts: 1,
      revisions: 1,
      deliveryDays: 2,
      deliveryTimeText: '2 Working Days',
      expressDeliveryTime: '24 Hours',
      expressDeliveryCharge: 250,
      features: ['2 Initial Concepts', '2 Revisions Included', 'Print-ready PDF', 'CMYK Color Profile'],
      sortOrder: packages.length + 1,
      isActive: true,
      isDefault: false,
      mapToAllProducts: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingPkg(pkg);
    setFormData({
      name: pkg.name || '',
      badge: pkg.badge || '',
      shortDescription: pkg.shortDescription || '',
      detailedDescription: pkg.detailedDescription || '',
      basePrice: pkg.basePrice || 0,
      doubleSidePrice: pkg.doubleSidePrice || 0,
      offerPrice: pkg.offerPrice || '',
      concepts: pkg.concepts || 1,
      revisions: pkg.revisions || 1,
      deliveryDays: pkg.deliveryDays || 2,
      deliveryTimeText: pkg.deliveryTimeText || '2 Working Days',
      expressDeliveryTime: pkg.expressDeliveryTime || '24 Hours',
      expressDeliveryCharge: pkg.expressDeliveryCharge || 250,
      features: Array.isArray(pkg.features) ? pkg.features : [],
      sortOrder: pkg.sortOrder || 0,
      isActive: pkg.isActive ?? true,
      isDefault: pkg.isDefault ?? false,
      mapToAllProducts: false,
    });
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    if (!newFeatureInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, newFeatureInput.trim()],
    }));
    setNewFeatureInput('');
  };

  const handleRemoveFeature = (index) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPkg) {
        await api.updateDesignPackage(editingPkg.id, formData);
      } else {
        await api.createDesignPackage(formData);
      }
      setIsModalOpen(false);
      await loadPackages();
    } catch (err) {
      alert(err.message || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.duplicateDesignPackage(id);
      await loadPackages();
    } catch (err) {
      alert(err.message || 'Duplicate failed');
    }
  };

  const handleToggleActive = async (pkg) => {
    try {
      await api.updateDesignPackage(pkg.id, { isActive: !pkg.isActive });
      await loadPackages();
    } catch (err) {
      alert(err.message || 'Toggle failed');
    }
  };

  const handleDelete = async (pkg) => {
    if (!window.confirm(`Are you sure you want to delete or archive package "${pkg.name}"?`)) return;
    try {
      const res = await api.deleteDesignPackage(pkg.id);
      alert(res.message || 'Package processed');
      await loadPackages();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">Reusable Design Packages Catalog</h2>
          <p className="text-xs text-gray-500">Master package tiers that can be reused and mapped across all printing products.</p>
        </div>
        <Button onClick={handleOpenCreate} color="dark" size="sm" className="bg-black hover:bg-yellow-400 hover:text-black font-bold text-xs">
          <HiOutlinePlus className="w-4 h-4 mr-1" />
          + Add Design Package
        </Button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center bg-white rounded-2xl border border-gray-200">
          <Spinner size="xl" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase font-black text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3.5">Package</th>
                  <th className="px-4 py-3.5">Pricing</th>
                  <th className="px-4 py-3.5">Concepts</th>
                  <th className="px-4 py-3.5">Revisions</th>
                  <th className="px-4 py-3.5">Delivery</th>
                  <th className="px-4 py-3.5 text-center">Products</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-gray-900">{pkg.name}</span>
                            {pkg.badge && (
                              <span className="text-[9px] font-black uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                {pkg.badge}
                              </span>
                            )}
                            {pkg.isDefault && (
                              <span className="text-[9px] font-black uppercase bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          {pkg.shortDescription && (
                            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 max-w-xs">{pkg.shortDescription}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-black text-sm text-gray-900 block">₹{pkg.basePrice}</span>
                      <span className="text-[10px] text-gray-400 block">Double: ₹{pkg.doubleSidePrice || (pkg.basePrice * 1.6)}</span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-gray-800">
                      {pkg.concepts} Concept(s)
                    </td>
                    <td className="px-4 py-3.5 font-bold text-gray-800">
                      {pkg.revisions === -1 ? 'Unlimited' : `${pkg.revisions} Rounds`}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-gray-800 block">{pkg.deliveryTimeText || `${pkg.deliveryDays} Days`}</span>
                      <span className="text-[10px] text-purple-600 font-semibold block">Rush: {pkg.expressDeliveryTime || '24h'} (+₹{pkg.expressDeliveryCharge || 250})</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="bg-gray-100 text-gray-800 font-bold px-2 py-1 rounded-md text-xs">
                        {pkg.mappedProductsCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(pkg)}
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full cursor-pointer transition ${
                          pkg.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {pkg.isActive ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="xs" color="light" onClick={() => handleOpenEdit(pkg)} title="Edit Package">
                          <HiOutlinePencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="xs" color="light" onClick={() => handleDuplicate(pkg.id)} title="Duplicate Package">
                          <HiOutlineDuplicate className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="xs" color="failure" onClick={() => handleDelete(pkg)} title="Delete / Archive Package">
                          <HiOutlineTrash className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Package Modal */}
      <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
        <Modal.Header>{editingPkg ? `Edit Package: ${editingPkg.name}` : '+ Create New Design Package'}</Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label value="Package Name *" />
                <TextInput
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Standard Design"
                  required
                />
              </div>

              <div>
                <Label value="Marketing Badge (Optional)" />
                <TextInput
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="e.g. MOST POPULAR, BEST VALUE"
                />
              </div>
            </div>

            <div>
              <Label value="Short Tagline Description" />
              <TextInput
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="e.g. 2 concepts, print-ready file, senior designer..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label value="Base Price (Single Side) ₹ *" />
                <TextInput
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label value="Double Side Price ₹" />
                <TextInput
                  type="number"
                  value={formData.doubleSidePrice}
                  onChange={(e) => setFormData({ ...formData, doubleSidePrice: e.target.value })}
                />
              </div>
              <div>
                <Label value="Offer Price ₹ (Optional)" />
                <TextInput
                  type="number"
                  value={formData.offerPrice}
                  onChange={(e) => setFormData({ ...formData, offerPrice: e.target.value })}
                  placeholder="e.g. 399"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label value="Initial Concepts" />
                <TextInput
                  type="number"
                  value={formData.concepts}
                  onChange={(e) => setFormData({ ...formData, concepts: e.target.value })}
                />
              </div>
              <div>
                <Label value="Revisions (-1 for unlimited)" />
                <TextInput
                  type="number"
                  value={formData.revisions}
                  onChange={(e) => setFormData({ ...formData, revisions: e.target.value })}
                />
              </div>
              <div>
                <Label value="Delivery Days" />
                <TextInput
                  type="number"
                  value={formData.deliveryDays}
                  onChange={(e) => setFormData({ ...formData, deliveryDays: e.target.value })}
                />
              </div>
              <div>
                <Label value="Express Fee ₹" />
                <TextInput
                  type="number"
                  value={formData.expressDeliveryCharge}
                  onChange={(e) => setFormData({ ...formData, expressDeliveryCharge: e.target.value })}
                />
              </div>
            </div>

            {/* Features Builder */}
            <div className="space-y-2 border-t pt-3">
              <Label value="Package Features & Deliverables Checklist" />
              <div className="flex gap-2">
                <TextInput
                  className="flex-1"
                  placeholder="e.g. CMYK Print-ready PDF, Source Vector File..."
                  value={newFeatureInput}
                  onChange={(e) => setNewFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                />
                <Button type="button" size="sm" color="light" onClick={handleAddFeature}>
                  + Add Feature
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 text-gray-800 text-xs px-2.5 py-1 rounded-lg"
                  >
                    ✔ {feat}
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="text-red-500 hover:text-red-700 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4 border-t pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span className="text-xs font-bold text-gray-700">Active Package</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                <span className="text-xs font-bold text-gray-700">Mark as Default Package</span>
              </label>

              {!editingPkg && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.mapToAllProducts}
                    onChange={(e) => setFormData({ ...formData, mapToAllProducts: e.target.checked })}
                  />
                  <span className="text-xs font-bold text-purple-700">Map to All Existing Products Automatically</span>
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button color="light" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" color="dark" disabled={saving}>
                {saving ? <Spinner size="sm" /> : 'Save Package'}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

// =========================================================================
// TAB B: DESIGN ADD-ONS
// =========================================================================
function DesignAddonsTab() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 150,
    description: '',
    badge: '',
    sortOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    loadAddons();
  }, []);

  const loadAddons = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDesignAddons();
      if (res.success && res.data) {
        setAddons(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingAddon(null);
    setFormData({ name: '', price: 150, description: '', badge: '', sortOrder: addons.length + 1, isActive: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (addon) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name,
      price: addon.price,
      description: addon.description || '',
      badge: addon.badge || '',
      sortOrder: addon.sortOrder || 0,
      isActive: addon.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingAddon) {
        await api.updateDesignAddon(editingAddon.id, formData);
      } else {
        await api.createDesignAddon(formData);
      }
      setIsModalOpen(false);
      await loadAddons();
    } catch (err) {
      alert(err.message || 'Failed to save add-on');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this design add-on?')) return;
    try {
      await api.deleteDesignAddon(id);
      await loadAddons();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-gray-900">Optional Design Add-ons Master</h2>
          <p className="text-xs text-gray-500">Add-ons that customers can selectively check in the customizer (Extra revision, Source file, Express delivery, etc.).</p>
        </div>
        <Button onClick={handleOpenCreate} color="dark" size="sm">
          <HiOutlinePlus className="w-4 h-4 mr-1" />
          + Add Design Add-on
        </Button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center bg-white rounded-2xl border">
          <Spinner size="xl" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 uppercase text-gray-700 font-bold border-b">
              <tr>
                <th className="px-4 py-3">Add-on Name</th>
                <th className="px-4 py-3">Price (₹)</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {addons.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-extrabold text-gray-900 text-sm">{a.name}</span>
                    {a.badge && (
                      <span className="ml-2 text-[9px] bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded-full">
                        {a.badge}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-extrabold text-purple-700 text-sm">
                    +₹{a.price}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-sm">{a.description || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="xs" color="light" onClick={() => handleOpenEdit(a)}>
                        <HiOutlinePencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="xs" color="failure" onClick={() => handleDelete(a.id)}>
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Add-on Modal */}
      <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
        <Modal.Header>{editingAddon ? 'Edit Add-on' : '+ Add Design Add-on'}</Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <Label value="Add-on Name *" />
              <TextInput
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Editable Source File (AI/CDR)"
                required
              />
            </div>
            <div>
              <Label value="Price (₹) *" />
              <TextInput
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label value="Description" />
              <TextInput
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Full open master vector file"
              />
            </div>
            <div>
              <Label value="Badge (Optional)" />
              <TextInput
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                placeholder="e.g. POPULAR, RUSH"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <Checkbox
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <span className="text-xs font-bold text-gray-700">Active</span>
            </label>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button color="light" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" color="dark">Save Add-on</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

// =========================================================================
// TAB C: PRODUCT DESIGN MAPPING & BULK ASSIGN
// =========================================================================
function ProductMappingTab() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [mappingData, setMappingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bulk modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkSelectedProducts, setBulkSelectedProducts] = useState([]);
  const [bulkSelectedPackages, setBulkSelectedPackages] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadProductMapping(selectedProductId);
    }
  }, [selectedProductId]);

  const loadProducts = async () => {
    try {
      const res = await api.getProducts({ limit: 200 });
      if (res.success && res.data) {
        setProducts(res.data);
        if (res.data.length > 0 && !selectedProductId) {
          setSelectedProductId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProductMapping = async (prodId) => {
    setLoading(true);
    try {
      const res = await api.getAdminProductMapping(prodId);
      if (res.success && res.data) {
        setMappingData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePackage = (pkgId) => {
    if (!mappingData) return;
    const existing = mappingData.mappings.find((m) => m.packageId === pkgId);
    if (existing) {
      setMappingData({
        ...mappingData,
        mappings: mappingData.mappings.filter((m) => m.packageId !== pkgId),
      });
    } else {
      const pkg = mappingData.availablePackages.find((p) => p.id === pkgId);
      setMappingData({
        ...mappingData,
        mappings: [
          ...mappingData.mappings,
          {
            packageId: pkgId,
            customPrice: null,
            customDoubleSidePrice: null,
            sortOrder: pkg ? pkg.sortOrder : 0,
            isDefault: false,
            isActive: true,
            designPackage: pkg,
          },
        ],
      });
    }
  };

  const handleCustomPriceChange = (pkgId, field, val) => {
    if (!mappingData) return;
    setMappingData({
      ...mappingData,
      mappings: mappingData.mappings.map((m) =>
        m.packageId === pkgId ? { ...m, [field]: val } : m
      ),
    });
  };

  const handleSetDefault = (pkgId) => {
    if (!mappingData) return;
    setMappingData({
      ...mappingData,
      mappings: mappingData.mappings.map((m) => ({
        ...m,
        isDefault: m.packageId === pkgId,
      })),
    });
  };

  const handleSaveMapping = async () => {
    if (!selectedProductId || !mappingData) return;
    setSaving(true);
    try {
      await api.updateAdminProductMapping(selectedProductId, {
        enableDesignSupport: mappingData.product?.enableDesignSupport ?? true,
        packageConfigs: mappingData.mappings.map((m) => ({
          packageId: m.packageId,
          customPrice: m.customPrice,
          customDoubleSidePrice: m.customDoubleSidePrice,
          sortOrder: m.sortOrder,
          isDefault: m.isDefault,
          isActive: m.isActive,
        })),
      });
      alert('Product design mapping saved successfully!');
      await loadProductMapping(selectedProductId);
    } catch (err) {
      alert(err.message || 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteBulkAssign = async () => {
    if (!bulkSelectedProducts.length || !bulkSelectedPackages.length) {
      alert('Select at least one product and one package.');
      return;
    }
    try {
      await api.bulkAssignPackages({
        productIds: bulkSelectedProducts,
        packageIds: bulkSelectedPackages,
        defaultPackageId: bulkSelectedPackages[0],
      });
      alert('Bulk mapping complete!');
      setIsBulkOpen(false);
      if (selectedProductId) loadProductMapping(selectedProductId);
    } catch (err) {
      alert(err.message || 'Bulk assignment failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Product Selector Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-96">
          <Label value="Select Printing Product to Configure Design" className="font-bold text-xs" />
          <Select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="mt-1"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button color="light" size="sm" onClick={() => setIsBulkOpen(true)}>
            <HiOutlineDuplicate className="w-4 h-4 mr-1 text-purple-600" />
            Bulk Assign Packages
          </Button>
          <Button color="dark" size="sm" onClick={handleSaveMapping} disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Save Product Mapping'}
          </Button>
        </div>
      </div>

      {loading || !mappingData ? (
        <div className="py-20 flex justify-center bg-white rounded-2xl border">
          <Spinner size="xl" />
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          {/* Master Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-purple-50/50 border border-purple-200 rounded-2xl">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Enable Design Service for this Product?</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                When ON, customers will see the "I need Print Bazzar to design it" option on the product customizer.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mappingData.product?.enableDesignSupport ?? true}
                onChange={(e) =>
                  setMappingData({
                    ...mappingData,
                    product: { ...mappingData.product, enableDesignSupport: e.target.checked },
                  })
                }
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="font-extrabold text-xs uppercase text-purple-900">
                {mappingData.product?.enableDesignSupport ? 'ENABLED (YES)' : 'DISABLED (NO)'}
              </span>
            </label>
          </div>

          {/* Mapped Packages Grid */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-extrabold text-sm text-gray-900">
                Available Design Packages for {mappingData.product?.name}
              </h3>
              <span className="text-xs text-gray-400">
                Check to enable • Set custom override price if different from base master package
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mappingData.availablePackages.map((pkg) => {
                const mapped = mappingData.mappings.find((m) => m.packageId === pkg.id);
                const isChecked = !!mapped;

                return (
                  <div
                    key={pkg.id}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      isChecked ? 'border-purple-600 bg-purple-50/30 shadow-xs' : 'border-gray-200 opacity-60 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePackage(pkg.id)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="font-extrabold text-sm text-gray-900">{pkg.name}</span>
                      </label>
                      {pkg.badge && (
                        <span className="text-[9px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                          {pkg.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{pkg.shortDescription || 'Master design tier'}</p>

                    <div className="mt-3 text-xs text-gray-600 space-y-1">
                      <div>Base Master Single: <strong>₹{pkg.basePrice}</strong></div>
                      <div>Base Master Double: <strong>₹{pkg.doubleSidePrice || (pkg.basePrice * 1.6)}</strong></div>
                    </div>

                    {isChecked && (
                      <div className="mt-4 pt-3 border-t border-purple-200 space-y-2.5">
                        <div>
                          <Label value="Custom Single Side Price (₹)" className="text-[11px] font-bold" />
                          <TextInput
                            type="number"
                            size="sm"
                            placeholder={`Leave blank for default (₹${pkg.basePrice})`}
                            value={mapped.customPrice ?? ''}
                            onChange={(e) => handleCustomPriceChange(pkg.id, 'customPrice', e.target.value)}
                          />
                        </div>

                        <div>
                          <Label value="Custom Double Side Price (₹)" className="text-[11px] font-bold" />
                          <TextInput
                            type="number"
                            size="sm"
                            placeholder={`Leave blank for default (₹${pkg.doubleSidePrice || 499})`}
                            value={mapped.customDoubleSidePrice ?? ''}
                            onChange={(e) => handleCustomPriceChange(pkg.id, 'customDoubleSidePrice', e.target.value)}
                          />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="radio"
                            name="default_package_radio"
                            checked={!!mapped.isDefault}
                            onChange={() => handleSetDefault(pkg.id)}
                            className="text-purple-600"
                          />
                          <span className="text-xs font-bold text-gray-800">Set as Default Package</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      <Modal show={isBulkOpen} onClose={() => setIsBulkOpen(false)} size="xl">
        <Modal.Header>Bulk Assign Design Packages to Multiple Products</Modal.Header>
        <Modal.Body className="space-y-4">
          <div>
            <Label value="1. Select Products (Multi-select)" className="font-bold" />
            <div className="max-h-48 overflow-y-auto border rounded-xl p-3 space-y-1.5 mt-1">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkSelectedProducts.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) setBulkSelectedProducts([...bulkSelectedProducts, p.id]);
                      else setBulkSelectedProducts(bulkSelectedProducts.filter((id) => id !== p.id));
                    }}
                    className="rounded text-purple-600"
                  />
                  <span>{p.name} ({p.sku})</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setBulkSelectedProducts(products.map((p) => p.id))}
                className="text-[11px] text-purple-600 font-bold underline"
              >
                Select All ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setBulkSelectedProducts([])}
                className="text-[11px] text-gray-500 font-bold underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div>
            <Label value="2. Select Packages to Map" className="font-bold" />
            <div className="space-y-2 mt-1">
              {mappingData?.availablePackages.map((pkg) => (
                <label key={pkg.id} className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkSelectedPackages.includes(pkg.id)}
                    onChange={(e) => {
                      if (e.target.checked) setBulkSelectedPackages([...bulkSelectedPackages, pkg.id]);
                      else setBulkSelectedPackages(bulkSelectedPackages.filter((id) => id !== pkg.id));
                    }}
                    className="rounded text-purple-600"
                  />
                  <span>{pkg.name} (Starts ₹{pkg.basePrice})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button color="light" onClick={() => setIsBulkOpen(false)}>Cancel</Button>
            <Button color="dark" onClick={handleExecuteBulkAssign}>Apply Bulk Assignment</Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

// =========================================================================
// TAB D: DESIGN ORDERS (DESIGN JOB HUB)
// =========================================================================
function DesignOrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [staffList, setStaffList] = useState([]);

  // Detail modal
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobDetail, setJobDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [draftUrlInput, setDraftUrlInput] = useState('');
  const [draftNotesInput, setDraftNotesInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    loadDesignOrders();
    loadStaff();
  }, [statusFilter]);

  const loadDesignOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDesignOrders({
        status: statusFilter,
        search,
      });
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await api.getStaffList();
      if (res.success && res.data) {
        // filter or list all designers
        setStaffList(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetail = async (jobId) => {
    setSelectedJobId(jobId);
    setLoadingDetail(true);
    try {
      const res = await api.getAdminDesignOrderById(jobId);
      if (res.success && res.data) {
        setJobDetail(res.data);
      }
    } catch (err) {
      alert('Failed to load job details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAssignDesigner = async (designerId) => {
    if (!selectedJobId) return;
    try {
      await api.assignDesigner(selectedJobId, designerId);
      await handleOpenDetail(selectedJobId);
      await loadDesignOrders();
    } catch (err) {
      alert(err.message || 'Assign failed');
    }
  };

  const handleUploadDraft = async () => {
    if (!draftUrlInput.trim()) {
      alert('Please enter or paste a draft file URL / image link.');
      return;
    }
    setSubmittingAction(true);
    try {
      await api.uploadDraftRevision(selectedJobId, {
        draftFileUrl: draftUrlInput.trim(),
        designerResponse: draftNotesInput.trim() || 'Proof draft submitted for review.',
      });
      setDraftUrlInput('');
      setDraftNotesInput('');
      alert('Draft revision uploaded! Customer notified.');
      await handleOpenDetail(selectedJobId);
      await loadDesignOrders();
    } catch (err) {
      alert(err.message || 'Upload draft failed');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleApproveDesign = async () => {
    if (!window.confirm('Approve this design proof? This will unlock and ACTIVATE the physical printing production queue!')) return;
    setSubmittingAction(true);
    try {
      await api.adminApproveDesign(selectedJobId, {
        approverNotes: 'Admin approved on customer behalf',
      });
      alert('Design Approved! Printing production job is now activated.');
      await handleOpenDetail(selectedJobId);
      await loadDesignOrders();
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REQUIREMENT_RECEIVED':
        return <Badge color="warning">🟡 Requirement Received</Badge>;
      case 'DESIGNER_ASSIGNED':
        return <Badge color="purple">⚪ Designer Assigned</Badge>;
      case 'DESIGNING':
        return <Badge color="indigo">⚪ In Progress</Badge>;
      case 'DRAFT_READY':
        return <Badge color="info">⚪ Draft Ready</Badge>;
      case 'CUSTOMER_REVIEW':
        return <Badge color="purple">⚪ Customer Review</Badge>;
      case 'REVISION':
        return <Badge color="failure">⚪ Revision Requested</Badge>;
      case 'APPROVED':
        return <Badge color="success">🟢 Design Approved</Badge>;
      case 'FINAL_DESIGN_READY':
        return <Badge color="success">🟢 Final Ready for Press</Badge>;
      default:
        return <Badge color="gray">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="REQUIREMENT_RECEIVED">🟡 Requirement Received</option>
            <option value="DESIGNER_ASSIGNED">⚪ Designer Assigned</option>
            <option value="DRAFT_READY">⚪ Draft Ready</option>
            <option value="REVISION">⚪ Revision Requested</option>
            <option value="APPROVED">🟢 Design Approved</option>
            <option value="FINAL_DESIGN_READY">🟢 Final Ready for Press</option>
          </Select>

          <div className="w-64">
            <TextInput
              placeholder="Search Job ID, Order, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadDesignOrders()}
              icon={HiOutlineSearch}
              size="sm"
            />
          </div>
        </div>

        <Button color="light" size="sm" onClick={loadDesignOrders}>
          Refresh Jobs
        </Button>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="py-20 flex justify-center bg-white rounded-2xl border">
          <Spinner size="xl" />
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border p-8">
          <span className="text-4xl block mb-2">🎨</span>
          <h3 className="font-extrabold text-gray-800 text-base">No Design Jobs Found</h3>
          <p className="text-xs text-gray-500 mt-1">Design jobs created from customer product orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 uppercase text-gray-700 font-bold border-b text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Job ID</th>
                  <th className="px-4 py-3.5">Main Order</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Product & Package</th>
                  <th className="px-4 py-3.5">Designer</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((job) => (
                  <tr key={job.id} className="hover:bg-purple-50/20 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-black text-purple-700">
                      {job.designJobNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-gray-900 block">{job.order?.orderNumber}</span>
                      <span className="text-[10px] text-gray-400 block">{new Date(job.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-gray-800 block">{job.order?.customerName}</span>
                      <span className="text-[11px] text-gray-400 block">{job.order?.customerMobile}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-gray-900 block">{job.product?.name || 'Custom Product'}</span>
                      <span className="text-[10px] text-purple-700 font-semibold block">
                        {job.packageNameSnapshot} (+₹{job.packagePriceSnapshot})
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {job.designer ? (
                        <span className="font-bold text-gray-800 flex items-center gap-1">
                          👤 {job.designer.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-bold">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button size="xs" color="dark" onClick={() => handleOpenDetail(job.id)}>
                        <HiOutlineEye className="w-3.5 h-3.5 mr-1" />
                        View Job
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Design Job Detail Drawer / Modal */}
      <Modal show={!!selectedJobId} onClose={() => setSelectedJobId(null)} size="3xl">
        <Modal.Header>
          {jobDetail ? (
            <div className="flex items-center gap-3">
              <span className="font-mono font-black text-purple-700 text-lg">{jobDetail.designJobNumber}</span>
              {getStatusBadge(jobDetail.status)}
            </div>
          ) : 'Loading Job Details...'}
        </Modal.Header>
        <Modal.Body>
          {loadingDetail || !jobDetail ? (
            <div className="py-20 flex justify-center"><Spinner size="xl" /></div>
          ) : (
            <div className="space-y-6 text-xs">
              {/* Top Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border">
                <div>
                  <span className="text-gray-400 block font-bold text-[10px] uppercase">Main Order</span>
                  <span className="font-bold text-gray-900">{jobDetail.order?.orderNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold text-[10px] uppercase">Customer</span>
                  <span className="font-bold text-gray-900">{jobDetail.order?.customerName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold text-[10px] uppercase">Package</span>
                  <span className="font-bold text-purple-700">{jobDetail.packageNameSnapshot}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold text-[10px] uppercase">Assigned Designer</span>
                  <span className="font-bold text-gray-900">{jobDetail.designer?.name || 'Unassigned'}</span>
                </div>
              </div>

              {/* Designer Assignment Bar */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2">
                  <Label value="Assign / Reassign Staff Designer:" className="font-bold text-xs text-purple-950" />
                  <Select
                    value={jobDetail.designerId || ''}
                    onChange={(e) => handleAssignDesigner(e.target.value)}
                    size="sm"
                  >
                    <option value="">-- Unassigned --</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="text-[11px] text-gray-500">
                  Priority: <strong>{jobDetail.priority}</strong>
                </div>
              </div>

              {/* Customer Creative Brief & Requirements */}
              <div className="border rounded-2xl p-4 space-y-3 bg-white">
                <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                  <HiOutlineClipboardList className="w-4 h-4 text-purple-600" />
                  Customer Creative Brief
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-gray-700 block">Requirement Notes:</span>
                    <p className="text-gray-600 mt-1 p-2 bg-gray-50 rounded-lg whitespace-pre-wrap leading-relaxed">
                      {jobDetail.requirementNotes || 'No specific notes provided.'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 block">Preferred Style & Colors:</span>
                    <div className="mt-1 space-y-1 text-gray-600">
                      <div>Style: <strong>{jobDetail.preferredStyle || 'Designer Choice'}</strong></div>
                      <div>Color Preference: <strong>{jobDetail.preferredColor || 'Brand standard'}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Uploaded Customer Assets */}
                <div className="border-t pt-3">
                  <span className="font-bold text-gray-700 block mb-1.5">Uploaded Brand Assets & Files:</span>
                  {Object.keys(jobDetail.uploadedAssets || {}).length === 0 ? (
                    <span className="text-gray-400 italic">No files attached in brief.</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(jobDetail.uploadedAssets).map(([key, asset]) => (
                        <a
                          key={key}
                          href={asset.fileUrl || asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 bg-gray-100 hover:bg-yellow-400 hover:text-black text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                          <HiOutlineDownload className="w-3.5 h-3.5" />
                          <span>{asset.originalName || asset.fileName || key}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Revisions & Proofs Section */}
              <div className="border rounded-2xl p-4 space-y-3 bg-white">
                <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                  <HiOutlineEye className="w-4 h-4 text-indigo-600" />
                  Draft Proofs & Revision History ({jobDetail.revisions?.length || 0})
                </h4>

                {jobDetail.revisions && jobDetail.revisions.length > 0 ? (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto">
                    {jobDetail.revisions.map((rev) => (
                      <div key={rev.id} className="p-3 bg-gray-50 border rounded-xl flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-purple-800">Draft #{rev.revisionNumber}</span>
                            <span className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-1">{rev.designerResponse}</p>
                          {rev.customerComment && (
                            <p className="text-[11px] text-red-600 mt-1 bg-red-50 p-1.5 rounded">
                              Customer Feedback: {rev.customerComment}
                            </p>
                          )}
                        </div>
                        {rev.draftFileUrl && (
                          <a
                            href={rev.draftFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white border px-2.5 py-1 rounded-lg text-xs font-bold text-gray-800 hover:bg-gray-100"
                          >
                            View Proof ➔
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No drafts submitted yet.</p>
                )}

                {/* Upload New Draft Form */}
                <div className="border-t pt-3 space-y-2 bg-purple-50/40 p-3 rounded-xl">
                  <span className="font-bold text-xs text-purple-950 block">+ Upload New Draft / Proof Revision</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <TextInput
                      placeholder="Paste Proof URL (Supabase/Image/PDF link)"
                      value={draftUrlInput}
                      onChange={(e) => setDraftUrlInput(e.target.value)}
                      size="sm"
                    />
                    <TextInput
                      placeholder="Designer comment or notes to customer..."
                      value={draftNotesInput}
                      onChange={(e) => setDraftNotesInput(e.target.value)}
                      size="sm"
                    />
                  </div>
                  <Button size="xs" color="dark" onClick={handleUploadDraft} disabled={submittingAction}>
                    Submit Draft to Customer
                  </Button>
                </div>
              </div>

              {/* Design Approval & Printing Handover Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-green-50 p-4 rounded-2xl border border-green-200">
                <div>
                  <h4 className="font-extrabold text-sm text-green-950 flex items-center gap-1.5">
                    <HiOutlineCheckCircle className="w-4 h-4 text-green-600" />
                    Approve Design & Unlock Printing Production
                  </h4>
                  <p className="text-[11px] text-green-800 mt-0.5">
                    Once approved, the printing press job is automatically unlocked and assigned to Production.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {jobDetail.status !== 'APPROVED' && jobDetail.status !== 'FINAL_DESIGN_READY' ? (
                    <Button color="success" size="sm" onClick={handleApproveDesign} disabled={submittingAction}>
                      ✔ Approve Design (Activate Press)
                    </Button>
                  ) : (
                    <span className="text-xs font-black text-green-700 bg-green-100 px-3 py-1 rounded-full">
                      ✔ Production Job Activated
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

// =========================================================================
// TAB E: DESIGN SETTINGS
// =========================================================================
function DesignSettingsTab() {
  const [settings, setSettings] = useState({
    maxFileSizeMb: 100,
    allowedFormats: 'PDF,AI,CDR,PSD,PNG,JPG,SVG',
    jobPrefix: 'PB-DES',
    defaultRevisionLimit: 2,
    defaultDeliveryDays: 2,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getDesignSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateDesignSettings(settings);
      alert('Design settings saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-black text-gray-900">Design Studio & File Upload Settings</h2>
        <p className="text-xs text-gray-500">Configure global defaults for customer uploads, formats, job IDs, and delivery SLAs.</p>
      </div>

      {loading ? (
        <Spinner size="lg" />
      ) : (
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <Label value="Design Job ID Prefix" />
            <TextInput
              value={settings.jobPrefix}
              onChange={(e) => setSettings({ ...settings, jobPrefix: e.target.value })}
              placeholder="e.g. PB-DES"
              required
            />
            <span className="text-[10px] text-gray-400">Generates IDs like: {settings.jobPrefix}-2026-00001</span>
          </div>

          <div>
            <Label value="Maximum File Upload Size (MB)" />
            <TextInput
              type="number"
              value={settings.maxFileSizeMb}
              onChange={(e) => setSettings({ ...settings, maxFileSizeMb: e.target.value })}
              required
            />
          </div>

          <div>
            <Label value="Allowed Artwork File Formats (Comma Separated)" />
            <TextInput
              value={settings.allowedFormats}
              onChange={(e) => setSettings({ ...settings, allowedFormats: e.target.value })}
              placeholder="PDF,AI,CDR,PSD,PNG,JPG,SVG"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label value="Default Revision Limit" />
              <TextInput
                type="number"
                value={settings.defaultRevisionLimit}
                onChange={(e) => setSettings({ ...settings, defaultRevisionLimit: e.target.value })}
                required
              />
            </div>
            <div>
              <Label value="Default Turnaround (Days)" />
              <TextInput
                type="number"
                value={settings.defaultDeliveryDays}
                onChange={(e) => setSettings({ ...settings, defaultDeliveryDays: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="pt-3 border-t">
            <Button type="submit" color="dark" disabled={saving}>
              {saving ? <Spinner size="sm" /> : 'Save Settings'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
