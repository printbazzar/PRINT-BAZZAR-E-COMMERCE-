import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  TextInput,
  Select,
  Spinner,
  Badge,
  Modal,
  Toast,
  Checkbox,
  Label,
} from 'flowbite-react';
import {
  HiArrowLeft,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineCollection,
  HiOutlineSearch,
} from 'react-icons/hi';
import { api } from '../services/api';

export default function AdminOptionMasterManager() {
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Modals
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);
  const [masterForm, setMasterForm] = useState({
    name: '',
    code: '',
    description: '',
    optionType: 'SELECT',
    isAddon: false,
    displayOrder: 0,
  });

  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [activeMasterForValue, setActiveMasterForValue] = useState(null);
  const [editingValue, setEditingValue] = useState(null);
  const [valueForm, setValueForm] = useState({
    label: '',
    code: '',
    description: '',
    swatchValue: '',
    defaultModifierType: 'FLAT',
    defaultModifierValue: 0,
    displayOrder: 0,
  });

  useEffect(() => {
    fetchMasters();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchMasters = async () => {
    setLoading(true);
    try {
      const res = await api.getOptionMasters();
      if (res.success && res.data) {
        setMasters(res.data);
      }
    } catch (err) {
      console.error('Failed to load option masters:', err);
      showToast('Failed to load option masters.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaster = async (e) => {
    e.preventDefault();
    if (!masterForm.name.trim()) return;

    try {
      if (editingMaster) {
        await api.updateOptionMaster(editingMaster.id, masterForm);
        showToast('Option master updated!');
      } else {
        await api.createOptionMaster(masterForm);
        showToast('Option master created!');
      }
      setIsMasterModalOpen(false);
      setEditingMaster(null);
      fetchMasters();
    } catch (err) {
      showToast(err.message || 'Failed to save option master.', 'error');
    }
  };

  const handleSaveValue = async (e) => {
    e.preventDefault();
    if (!valueForm.label.trim()) return;

    try {
      if (editingValue) {
        await api.updateOptionMasterValue(editingValue.id, valueForm);
        showToast('Option value updated!');
      } else {
        await api.createOptionMasterValue(activeMasterForValue.id, valueForm);
        showToast('Option value added!');
      }
      setIsValueModalOpen(false);
      setEditingValue(null);
      fetchMasters();
    } catch (err) {
      showToast(err.message || 'Failed to save option value.', 'error');
    }
  };

  const filteredMasters = masters.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast>
            <div className="flex items-center gap-3">
              {toastType === 'success' ? (
                <HiOutlineCheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <HiOutlineExclamationCircle className="w-6 h-6 text-red-500" />
              )}
              <span className="text-sm font-semibold">{toastMessage}</span>
            </div>
          </Toast>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              to="/admin/products"
              className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              <HiArrowLeft className="w-3.5 h-3.5" /> Back to Products
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs text-purple-700 font-extrabold uppercase">Option Masters Catalog</span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <HiOutlineCollection className="w-6 h-6 text-purple-600" />
            Reusable Option Masters Catalog
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Centralized registry of options and standard values (Size, GSM, Material, Lamination, Corner, Finishing). Products link to these masters instead of duplicating.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <HiOutlineSearch className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <TextInput
              size="sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search masters..."
              className="pl-8 text-xs"
            />
          </div>

          <Button
            color="purple"
            size="sm"
            onClick={() => {
              setEditingMaster(null);
              setMasterForm({
                name: '',
                code: '',
                description: '',
                optionType: 'SELECT',
                isAddon: false,
                displayOrder: masters.length + 1,
              });
              setIsMasterModalOpen(true);
            }}
            className="font-black"
          >
            <HiOutlinePlus className="w-4 h-4 mr-1" />
            New Option Master
          </Button>
        </div>
      </div>

      {/* Masters List */}
      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="xl" />
          <p className="text-xs text-gray-500 mt-2">Loading option masters...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMasters.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3 hover:border-purple-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900">{m.name}</h3>
                    <Badge color={m.isAddon ? 'purple' : 'info'} size="xs">
                      {m.isAddon ? 'Add-on' : 'Core Dimension'}
                    </Badge>
                    <Badge color="light" size="xs">{m.optionType}</Badge>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingMaster(m);
                      setMasterForm({
                        name: m.name,
                        code: m.code,
                        description: m.description || '',
                        optionType: m.optionType,
                        isAddon: m.isAddon,
                        displayOrder: m.displayOrder,
                      });
                      setIsMasterModalOpen(true);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                    title="Edit Master"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                </div>

                <span className="font-mono text-[11px] text-gray-400 block mt-0.5">code: {m.code}</span>
                {m.description && <p className="text-xs text-gray-600 mt-1">{m.description}</p>}

                {/* Values List */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                      Master Values ({m.values?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMasterForValue(m);
                        setEditingValue(null);
                        setValueForm({
                          label: '',
                          code: '',
                          description: '',
                          swatchValue: '',
                          defaultModifierType: 'FLAT',
                          defaultModifierValue: 0,
                          displayOrder: (m.values?.length || 0) + 1,
                        });
                        setIsValueModalOpen(true);
                      }}
                      className="text-[11px] text-purple-700 font-bold hover:underline"
                    >
                      + Add Value
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {m.values?.map((v) => (
                      <span
                        key={v.id}
                        onClick={() => {
                          setActiveMasterForValue(m);
                          setEditingValue(v);
                          setValueForm({
                            label: v.label,
                            code: v.code,
                            description: v.description || '',
                            swatchValue: v.swatchValue || '',
                            defaultModifierType: v.defaultModifierType,
                            defaultModifierValue: v.defaultModifierValue,
                            displayOrder: v.displayOrder,
                          });
                          setIsValueModalOpen(true);
                        }}
                        className="cursor-pointer inline-flex items-center gap-1 bg-gray-50 hover:bg-purple-50 text-gray-800 text-xs px-2 py-1 rounded-lg border border-gray-200"
                      >
                        <span className="font-bold">{v.label}</span>
                        {v.defaultModifierValue > 0 && (
                          <span className="text-[10px] text-purple-700 font-bold">
                            +₹{v.defaultModifierValue}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-semibold">
                <span>Mapped in {m._count?.productMappings || 0} products</span>
                <span>Display Order: #{m.displayOrder}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Master Modal */}
      <Modal show={isMasterModalOpen} size="md" onClose={() => setIsMasterModalOpen(false)}>
        <Modal.Header>
          <span className="font-black text-gray-900">
            {editingMaster ? 'Edit Option Master' : 'Create Option Master'}
          </span>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSaveMaster} className="space-y-4">
            <div>
              <Label className="text-xs font-bold">Option Name *</Label>
              <TextInput
                value={masterForm.name}
                onChange={(e) => setMasterForm({ ...masterForm, name: e.target.value })}
                placeholder="e.g. Corner Finishing"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Code Identifier (Auto-generated if empty)</Label>
              <TextInput
                value={masterForm.code}
                onChange={(e) => setMasterForm({ ...masterForm, code: e.target.value })}
                placeholder="e.g. corner_finishing"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Option Type</Label>
                <Select
                  value={masterForm.optionType}
                  onChange={(e) => setMasterForm({ ...masterForm, optionType: e.target.value })}
                >
                  <option value="SELECT">Dropdown (Select)</option>
                  <option value="RADIO">Radio Pills</option>
                  <option value="CHECKBOX">Checkbox Toggle</option>
                  <option value="SWATCH">Color/Image Swatch</option>
                </Select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={masterForm.isAddon}
                    onChange={(e) => setMasterForm({ ...masterForm, isAddon: e.target.checked })}
                  />
                  <span className="text-xs font-bold text-gray-700">Is Optional Add-on?</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Description / Help text</Label>
              <TextInput
                value={masterForm.description}
                onChange={(e) => setMasterForm({ ...masterForm, description: e.target.value })}
                placeholder="Optional customer explanation"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button color="gray" onClick={() => setIsMasterModalOpen(false)}>
                Cancel
              </Button>
              <Button color="purple" type="submit">
                Save Master
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Value Modal */}
      <Modal show={isValueModalOpen} size="md" onClose={() => setIsValueModalOpen(false)}>
        <Modal.Header>
          <span className="font-black text-gray-900">
            {editingValue ? 'Edit Value' : 'Add Value'} — {activeMasterForValue?.name}
          </span>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSaveValue} className="space-y-4">
            <div>
              <Label className="text-xs font-bold">Value Label *</Label>
              <TextInput
                value={valueForm.label}
                onChange={(e) => setValueForm({ ...valueForm, label: e.target.value })}
                placeholder="e.g. Rounded 4 Corners"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Default Modifier Type</Label>
                <Select
                  value={valueForm.defaultModifierType}
                  onChange={(e) => setValueForm({ ...valueForm, defaultModifierType: e.target.value })}
                >
                  <option value="FLAT">Flat (₹)</option>
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="PER_UNIT">Per Unit (₹/pc)</option>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Default Surcharge Value</Label>
                <TextInput
                  type="number"
                  value={valueForm.defaultModifierValue}
                  onChange={(e) => setValueForm({ ...valueForm, defaultModifierValue: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button color="gray" onClick={() => setIsValueModalOpen(false)}>
                Cancel
              </Button>
              <Button color="purple" type="submit">
                Save Value
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
