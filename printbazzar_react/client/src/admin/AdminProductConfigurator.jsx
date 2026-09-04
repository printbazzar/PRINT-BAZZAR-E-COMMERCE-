import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Button,
  TextInput,
  Select,
  Spinner,
  Badge,
  Modal,
  Table,
  Toast,
  Tabs,
  Checkbox,
  Label,
} from 'flowbite-react';
import {
  HiArrowLeft,
  HiOutlineEye,
  HiSave,
  HiOutlineAdjustments,
  HiOutlineCurrencyRupee,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineDuplicate,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineViewList,
} from 'react-icons/hi';
import { api } from '../services/api';

export default function AdminProductConfigurator() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [allMasters, setAllMasters] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState([]);

  // Active edit state
  const [pricingType, setPricingType] = useState('TIERED');
  const [quantityType, setQuantityType] = useState('FIXED');
  const [startingPrice, setStartingPrice] = useState(0);
  const [customUnitPrice, setCustomUnitPrice] = useState('');
  const [optionMappings, setOptionMappings] = useState([]);
  const [priceSlabs, setPriceSlabs] = useState([]);
  const [pricingMatrices, setPricingMatrices] = useState([]);
  const [compatibilityRules, setCompatibilityRules] = useState([]);
  const [priceVersions, setPriceVersions] = useState([]);
  const [changeReason, setChangeReason] = useState('');

  // UI Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Customer Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewQty, setPreviewQty] = useState(100);
  const [previewOptions, setPreviewOptions] = useState({});
  const [previewArtworkOption, setPreviewArtworkOption] = useState('PRINT_READY_FILE');
  const [previewPricing, setPreviewPricing] = useState(null);
  const [previewCalculating, setPreviewCalculating] = useState(false);

  // Template Clone State
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  // New Compatibility Rule State
  const [newRule, setNewRule] = useState({
    ruleName: '',
    triggerOptionCode: '',
    triggerValueCode: '',
    operator: 'EQUALS',
    action: 'DISABLE_TARGET',
    targetOptionCode: '',
    targetValueCode: '',
    reason: '',
  });

  useEffect(() => {
    fetchConfiguration();
  }, [id]);

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchConfiguration = async () => {
    setLoading(true);
    try {
      const res = await api.getProductConfiguration(id);
      if (res.success && res.data) {
        const p = res.data.product;
        setProduct(p);
        setAllMasters(res.data.allMasters || []);
        setAvailableTemplates(res.data.availableTemplates || []);

        setPricingType(p.pricingType || 'TIERED');
        setQuantityType(p.quantityType || 'FIXED');
        setStartingPrice(p.startingPrice || 0);
        setCustomUnitPrice(p.customUnitPrice || '');
        setOptionMappings(p.optionMappings || []);
        setPriceSlabs(p.priceSlabs || []);
        setPricingMatrices(p.pricingMatrices || []);
        setCompatibilityRules(p.compatibilityRules || []);
        setPriceVersions(p.priceVersions || []);

        if (p.priceSlabs?.length > 0) {
          setPreviewQty(p.priceSlabs[0].minQty);
        } else {
          setPreviewQty(p.minQuantity || 100);
        }

        const initialSelected = {};
        (p.optionMappings || []).forEach((m) => {
          const optName = m.customLabel || m.master?.name;
          const defaultVal = m.defaultValue || m.valueMappings?.find((v) => v.isDefault)?.customLabel || m.valueMappings?.[0]?.customLabel || m.master?.values?.[0]?.label;
          if (defaultVal) {
            initialSelected[optName] = defaultVal;
          }
        });
        setPreviewOptions(initialSelected);
      }
    } catch (err) {
      console.error('Failed to load product configuration:', err);
      showToast('Failed to load configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Recalculate preview pricing using server calculate-price endpoint
  useEffect(() => {
    if (product && isPreviewOpen) {
      setPreviewCalculating(true);
      api.calculatePrice({
        productId: product.id,
        quantity: previewQty,
        selectedOptions: previewOptions,
        artworkOption: previewArtworkOption,
      })
        .then((res) => {
          if (res.success && res.data) {
            setPreviewPricing(res.data);
          }
        })
        .catch((err) => console.warn('Preview calc err:', err))
        .finally(() => setPreviewCalculating(false));
    }
  }, [product, previewQty, previewOptions, previewArtworkOption, isPreviewOpen]);

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      const payload = {
        pricingType,
        quantityType,
        startingPrice: parseFloat(startingPrice) || 0,
        customUnitPrice: customUnitPrice ? parseFloat(customUnitPrice) : null,
        optionMappings: optionMappings.map((m, idx) => ({
          masterId: m.masterId,
          customLabel: m.customLabel,
          isRequired: m.isRequired,
          isAddon: m.isAddon,
          defaultValue: m.defaultValue,
          displayOrder: idx + 1,
          pricingBehavior: m.pricingBehavior,
          isEnabled: m.isEnabled !== false,
          valueMappings: (m.valueMappings || []).map((vm, vIdx) => ({
            masterValueId: vm.masterValueId,
            customLabel: vm.customLabel,
            priceModifierType: vm.priceModifierType || 'FLAT',
            priceModifierValue: parseFloat(vm.priceModifierValue) || 0,
            isDefault: vm.isDefault,
            isEnabled: vm.isEnabled !== false,
            displayOrder: vIdx + 1,
          })),
        })),
        changeReason: changeReason || 'Admin routine configuration update.',
      };

      const res = await api.updateProductConfiguration(id, payload);
      if (res.success) {
        showToast('Configuration and price version saved successfully!');
        setChangeReason('');
        fetchConfiguration();
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast(err.message || 'Failed to save configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateFromTemplate = async () => {
    if (!selectedTemplateId) {
      alert('Please select a template product first.');
      return;
    }
    if (!window.confirm('This will copy option mappings and compatibility rules from the template. Continue?')) {
      return;
    }

    setIsCloning(true);
    try {
      const res = await api.duplicateProductConfiguration(id, selectedTemplateId);
      if (res.success) {
        showToast(res.message || 'Configuration duplicated successfully!');
        fetchConfiguration();
      }
    } catch (err) {
      console.error('Clone error:', err);
      showToast(err.message || 'Failed to duplicate configuration.', 'error');
    } finally {
      setIsCloning(false);
    }
  };

  const handleAddMasterToProduct = (master) => {
    if (optionMappings.some((m) => m.masterId === master.id)) {
      showToast(`"${master.name}" is already added to this product.`, 'error');
      return;
    }

    const newMapping = {
      id: `temp_${Date.now()}`,
      productId: id,
      masterId: master.id,
      master,
      customLabel: master.name,
      isRequired: true,
      isAddon: master.isAddon,
      defaultValue: master.values?.[0]?.label || '',
      displayOrder: optionMappings.length + 1,
      pricingBehavior: master.isAddon ? 'ADDON_SURCHARGE' : 'MATRIX_DIMENSION',
      isEnabled: true,
      valueMappings: (master.values || []).map((val, idx) => ({
        id: `temp_val_${Date.now()}_${idx}`,
        masterValueId: val.id,
        masterValue: val,
        customLabel: val.label,
        priceModifierType: val.defaultModifierType || 'FLAT',
        priceModifierValue: val.defaultModifierValue || 0,
        isDefault: idx === 0,
        isEnabled: true,
        displayOrder: idx + 1,
      })),
    };

    setOptionMappings([...optionMappings, newMapping]);
    showToast(`Added "${master.name}" to configuration.`);
  };

  const handleRemoveMapping = (masterId) => {
    setOptionMappings(optionMappings.filter((m) => m.masterId !== masterId));
  };

  const handleMoveMapping = (index, direction) => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= optionMappings.length) return;
    const copy = [...optionMappings];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setOptionMappings(copy);
  };

  const handleToggleValueEnabled = (masterId, masterValueId) => {
    setOptionMappings(
      optionMappings.map((m) => {
        if (m.masterId !== masterId) return m;
        return {
          ...m,
          valueMappings: (m.valueMappings || []).map((vm) => {
            if (vm.masterValueId === masterValueId) {
              return { ...vm, isEnabled: !vm.isEnabled };
            }
            return vm;
          }),
        };
      })
    );
  };

  const handleValueModifierChange = (masterId, masterValueId, field, val) => {
    setOptionMappings(
      optionMappings.map((m) => {
        if (m.masterId !== masterId) return m;
        return {
          ...m,
          valueMappings: (m.valueMappings || []).map((vm) => {
            if (vm.masterValueId === masterValueId) {
              return { ...vm, [field]: val };
            }
            return vm;
          }),
        };
      })
    );
  };

  const handleAddRule = async () => {
    if (!newRule.triggerOptionCode || !newRule.triggerValueCode || !newRule.targetOptionCode) {
      alert('Please fill trigger option, trigger value, and target option.');
      return;
    }

    try {
      const res = await api.saveCompatibilityRule(id, newRule);
      if (res.success) {
        showToast('Compatibility rule saved!');
        setNewRule({
          ruleName: '',
          triggerOptionCode: '',
          triggerValueCode: '',
          operator: 'EQUALS',
          action: 'DISABLE_TARGET',
          targetOptionCode: '',
          targetValueCode: '',
          reason: '',
        });
        fetchConfiguration();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save rule.', 'error');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Delete this compatibility rule?')) return;
    try {
      const res = await api.deleteCompatibilityRule(ruleId);
      if (res.success) {
        showToast('Rule deleted.');
        fetchConfiguration();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete rule.', 'error');
    }
  };

  const handleRollback = async (versionId, label) => {
    if (!window.confirm(`Revert pricing configuration back to ${label}?`)) return;
    try {
      const res = await api.rollbackPriceVersion(id, versionId);
      if (res.success) {
        showToast(res.message || 'Reverted successfully!');
        fetchConfiguration();
      }
    } catch (err) {
      showToast(err.message || 'Failed to rollback.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="xl" />
        <span className="mt-3 text-sm text-gray-500 font-semibold">Loading product configuration matrix...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-xs max-w-xl mx-auto my-12">
        <HiOutlineExclamationCircle className="w-12 h-12 text-red-500 mb-2" />
        <h3 className="text-lg font-black text-gray-900">Product Not Found</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          Unable to find or load the configuration matrix for product ID: <span className="font-mono">{id}</span>.
        </p>
        <Link to="/admin/products" className="px-4 py-2 bg-black text-white font-bold text-xs rounded-lg">
          ← Back to Products List
        </Link>
      </div>
    );
  }

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

      {/* Header Bar */}
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
            <span className="text-xs text-purple-700 font-extrabold uppercase">Configuration & Pricing Hub</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-gray-900">{product?.name}</h1>
            <Badge color="info" size="sm">SKU: {product?.sku}</Badge>
            <Badge color="purple" size="sm">{product?.category?.name}</Badge>
            <Badge color={pricingType === 'MATRIX' ? 'success' : 'warning'} size="sm">
              Pricing: {pricingType}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            color="light"
            onClick={() => setIsPreviewOpen(true)}
            className="font-bold flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <HiOutlineEye className="w-5 h-5 text-purple-600 mr-1" />
            Customer Preview
          </Button>

          <Button
            color="success"
            disabled={saving}
            onClick={handleSaveConfiguration}
            className="font-black flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? <Spinner size="sm" className="mr-2" /> : <HiSave className="w-5 h-5 mr-1" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <Tabs aria-label="Product Configuration Tabs" variant="underline">
          {/* TAB 1: Applicable Options & Ordering */}
          <Tabs.Item active title="1. Applicable Options & Ordering" icon={HiOutlineViewList}>
            <div className="p-4 sm:p-6 space-y-6">
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <HiOutlineDuplicate className="w-4 h-4 text-purple-700" />
                    Clone Configuration from Product Template
                  </h4>
                  <p className="text-xs text-purple-700 mt-0.5">
                    Save time by copying options and compatibility rules from another product (e.g. Standard Visiting Card to Synthetic Card).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="text-xs"
                  >
                    <option value="">-- Choose Template Product --</option>
                    {availableTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.sku})
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="xs"
                    color="purple"
                    disabled={!selectedTemplateId || isCloning}
                    onClick={handleDuplicateFromTemplate}
                  >
                    {isCloning ? <Spinner size="xs" /> : 'Apply Template'}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="font-extrabold text-xs uppercase tracking-wider text-gray-700 block mb-2">
                  Add Reusable Option Master to this Product
                </Label>
                <div className="flex flex-wrap gap-2">
                  {allMasters.map((m) => {
                    const isAlreadyAdded = optionMappings.some((map) => map.masterId === m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={isAlreadyAdded}
                        onClick={() => handleAddMasterToProduct(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          isAlreadyAdded
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-800 border-gray-300 hover:border-purple-500 hover:bg-purple-50'
                        }`}
                      >
                        <HiOutlinePlus className="w-3.5 h-3.5" />
                        {m.name}
                        {m.isAddon && (
                          <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded font-semibold">
                            Add-on
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <Link
                    to="/admin/options-master"
                    className="px-3 py-1.5 rounded-lg text-xs font-extrabold border border-dashed border-gray-300 text-purple-700 hover:bg-purple-50 flex items-center gap-1"
                  >
                    + Manage Masters Catalog
                  </Link>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table hoverable>
                  <Table.Head>
                    <Table.HeadCell className="w-16">Order</Table.HeadCell>
                    <Table.HeadCell>Option Name & Master Code</Table.HeadCell>
                    <Table.HeadCell>Display Label Override</Table.HeadCell>
                    <Table.HeadCell>Behavior</Table.HeadCell>
                    <Table.HeadCell>Required?</Table.HeadCell>
                    <Table.HeadCell>Default Value</Table.HeadCell>
                    <Table.HeadCell className="text-right">Actions</Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {optionMappings.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={7} className="text-center py-8 text-gray-400 text-xs">
                          No option masters mapped to this product yet. Select from the badges above to add options.
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      optionMappings.map((mapping, idx) => {
                        const master = mapping.master || allMasters.find((m) => m.id === mapping.masterId);
                        const availableVals = mapping.valueMappings || master?.values || [];

                        return (
                          <Table.Row key={mapping.id || mapping.masterId} className="bg-white">
                            <Table.Cell className="font-bold text-gray-700">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-black">{idx + 1}</span>
                                <div className="flex flex-col">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveMapping(idx, 'up')}
                                    className="p-0.5 text-gray-400 hover:text-black disabled:opacity-20"
                                  >
                                    <HiOutlineChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === optionMappings.length - 1}
                                    onClick={() => handleMoveMapping(idx, 'down')}
                                    className="p-0.5 text-gray-400 hover:text-black disabled:opacity-20"
                                  >
                                    <HiOutlineChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </Table.Cell>

                            <Table.Cell>
                              <span className="font-black text-sm text-gray-900 block">{master?.name || mapping.customLabel}</span>
                              <span className="text-[10px] font-mono text-gray-400 block">{master?.code}</span>
                            </Table.Cell>

                            <Table.Cell>
                              <TextInput
                                size="sm"
                                value={mapping.customLabel || ''}
                                onChange={(e) => {
                                  const updated = [...optionMappings];
                                  updated[idx].customLabel = e.target.value;
                                  setOptionMappings(updated);
                                }}
                                placeholder={master?.name}
                                className="w-44 text-xs font-medium"
                              />
                            </Table.Cell>

                            <Table.Cell>
                              <Badge color={mapping.isAddon ? 'purple' : 'info'} size="sm">
                                {mapping.isAddon ? 'Add-on Surcharge' : 'Matrix Dimension'}
                              </Badge>
                            </Table.Cell>

                            <Table.Cell>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={mapping.isRequired !== false}
                                  onChange={(e) => {
                                    const updated = [...optionMappings];
                                    updated[idx].isRequired = e.target.checked;
                                    setOptionMappings(updated);
                                  }}
                                />
                                <span className="text-xs font-bold text-gray-700">
                                  {mapping.isRequired !== false ? 'Required' : 'Optional'}
                                </span>
                              </label>
                            </Table.Cell>

                            <Table.Cell>
                              <Select
                                size="sm"
                                value={mapping.defaultValue || ''}
                                onChange={(e) => {
                                  const updated = [...optionMappings];
                                  updated[idx].defaultValue = e.target.value;
                                  setOptionMappings(updated);
                                }}
                                className="text-xs w-48"
                              >
                                <option value="">-- None / Select at checkout --</option>
                                {availableVals.map((v) => {
                                  const label = v.customLabel || v.label || v.masterValue?.label;
                                  return (
                                    <option key={v.id || label} value={label}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </Select>
                            </Table.Cell>

                            <Table.Cell className="text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveMapping(mapping.masterId)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Remove Option"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })
                    )}
                  </Table.Body>
                </Table>
              </div>
            </div>
          </Tabs.Item>

          {/* TAB 2: Option Values & Custom Modifiers */}
          <Tabs.Item title="2. Values & Custom Surcharges" icon={HiOutlineAdjustments}>
            <div className="p-4 sm:p-6 space-y-6">
              <p className="text-xs text-gray-500">
                Configure which master values are enabled for this product, assign specific price modifier surcharges (Flat, Percent, Per-unit), and set the default pre-selected value.
              </p>

              {optionMappings.map((m) => {
                const master = m.master || allMasters.find((am) => am.id === m.masterId);
                const valueMappings = m.valueMappings || [];

                return (
                  <div key={m.masterId} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900">{m.customLabel || master?.name}</span>
                        <Badge color="light" size="xs">{master?.code}</Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {valueMappings.filter((v) => v.isEnabled !== false).length} of {valueMappings.length} enabled
                      </span>
                    </div>

                    <Table hoverable>
                      <Table.Head>
                        <Table.HeadCell className="w-16">Enabled</Table.HeadCell>
                        <Table.HeadCell>Value Label</Table.HeadCell>
                        <Table.HeadCell>Modifier Type</Table.HeadCell>
                        <Table.HeadCell>Surcharge Value</Table.HeadCell>
                        <Table.HeadCell>Default?</Table.HeadCell>
                      </Table.Head>
                      <Table.Body className="divide-y">
                        {valueMappings.map((vm) => {
                          const valObj = vm.masterValue || master?.values?.find((v) => v.id === vm.masterValueId);
                          const isEnabled = vm.isEnabled !== false;

                          return (
                            <Table.Row key={vm.masterValueId} className={isEnabled ? 'bg-white' : 'bg-gray-50 opacity-60'}>
                              <Table.Cell>
                                <Checkbox
                                  checked={isEnabled}
                                  onChange={() => handleToggleValueEnabled(m.masterId, vm.masterValueId)}
                                />
                              </Table.Cell>

                              <Table.Cell>
                                <span className="font-bold text-xs text-gray-900 block">{vm.customLabel || valObj?.label}</span>
                                <span className="text-[10px] font-mono text-gray-400">{valObj?.code}</span>
                              </Table.Cell>

                              <Table.Cell>
                                <Select
                                  size="sm"
                                  disabled={!isEnabled}
                                  value={vm.priceModifierType || 'FLAT'}
                                  onChange={(e) => handleValueModifierChange(m.masterId, vm.masterValueId, 'priceModifierType', e.target.value)}
                                  className="w-36 text-xs"
                                >
                                  <option value="FLAT">Flat Fee (₹)</option>
                                  <option value="PERCENT">Percentage (%)</option>
                                  <option value="PER_UNIT">Per Unit (₹/pc)</option>
                                </Select>
                              </Table.Cell>

                              <Table.Cell>
                                <div className="flex items-center gap-1 w-32">
                                  <span className="text-xs font-bold text-gray-400">
                                    {vm.priceModifierType === 'PERCENT' ? '%' : '₹'}
                                  </span>
                                  <TextInput
                                    size="sm"
                                    type="number"
                                    disabled={!isEnabled}
                                    value={vm.priceModifierValue || 0}
                                    onChange={(e) => handleValueModifierChange(m.masterId, vm.masterValueId, 'priceModifierValue', e.target.value)}
                                    className="text-xs font-bold"
                                  />
                                </div>
                              </Table.Cell>

                              <Table.Cell>
                                <input
                                  type="radio"
                                  name={`default_${m.masterId}`}
                                  disabled={!isEnabled}
                                  checked={m.defaultValue === (vm.customLabel || valObj?.label)}
                                  onChange={() => {
                                    const label = vm.customLabel || valObj?.label;
                                    setOptionMappings(
                                      optionMappings.map((opt) => (opt.masterId === m.masterId ? { ...opt, defaultValue: label } : opt))
                                    );
                                  }}
                                  className="text-purple-600 focus:ring-purple-500"
                                />
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table>
                  </div>
                );
              })}
            </div>
          </Tabs.Item>

          {/* TAB 3: Pricing Matrix & Slabs */}
          <Tabs.Item title="3. Pricing Matrix & Volume Tiers" icon={HiOutlineCurrencyRupee}>
            <div className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => setPricingType('TIERED')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    pricingType === 'TIERED'
                      ? 'border-purple-600 bg-purple-50 shadow-xs ring-2 ring-purple-400/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-black text-sm text-gray-900">Volume Quantity Slabs</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Standard tiered pricing for 100, 250, 500, 1000, 2000 units with separate Single & Double Side rates.
                  </p>
                </div>

                <div
                  onClick={() => setPricingType('MATRIX')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    pricingType === 'MATRIX'
                      ? 'border-purple-600 bg-purple-50 shadow-xs ring-2 ring-purple-400/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-black text-sm text-gray-900">Exact Pricing Matrix</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Lookup exact price combinations matching Size × Material × Printing × Finish × Quantity.
                  </p>
                </div>

                <div
                  onClick={() => setPricingType('PER_SQFT')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    pricingType === 'PER_SQFT' || pricingType === 'CUSTOM_UNIT'
                      ? 'border-purple-600 bg-purple-50 shadow-xs ring-2 ring-purple-400/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-black text-sm text-gray-900">Formula / Custom Rate</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Linear rate per unit or sq.ft (e.g. ₹18 / sq.ft for Flex, ₹0.85 / card for bulk).
                  </p>
                </div>
              </div>

              {pricingType === 'TIERED' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
                      Volume Quantity Slabs ({priceSlabs.length} Tiers)
                    </h3>
                    <Button
                      size="xs"
                      color="purple"
                      onClick={() => {
                        const lastQty = priceSlabs.length > 0 ? priceSlabs[priceSlabs.length - 1].minQty * 2 : 100;
                        setPriceSlabs([
                          ...priceSlabs,
                          {
                            id: `temp_slab_${Date.now()}`,
                            minQty: lastQty,
                            singleSidePrice: 200,
                            doubleSidePrice: 350,
                            unitPrice: 2,
                          },
                        ]);
                      }}
                    >
                      + Add Quantity Slab
                    </Button>
                  </div>

                  <Table hoverable>
                    <Table.Head>
                      <Table.HeadCell>Quantity</Table.HeadCell>
                      <Table.HeadCell>Single Side Price (₹)</Table.HeadCell>
                      <Table.HeadCell>Double Side Price (₹)</Table.HeadCell>
                      <Table.HeadCell>Per-Piece Rate</Table.HeadCell>
                      <Table.HeadCell className="text-right">Actions</Table.HeadCell>
                    </Table.Head>
                    <Table.Body className="divide-y">
                      {priceSlabs.map((slab, sIdx) => (
                        <Table.Row key={slab.id || sIdx} className="bg-white">
                          <Table.Cell>
                            <TextInput
                              size="sm"
                              type="number"
                              value={slab.minQty}
                              onChange={(e) => {
                                const copy = [...priceSlabs];
                                copy[sIdx].minQty = parseInt(e.target.value, 10) || 1;
                                setPriceSlabs(copy);
                              }}
                              className="w-28 font-bold text-xs"
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <TextInput
                              size="sm"
                              type="number"
                              value={slab.singleSidePrice || 0}
                              onChange={(e) => {
                                const copy = [...priceSlabs];
                                copy[sIdx].singleSidePrice = parseFloat(e.target.value) || 0;
                                setPriceSlabs(copy);
                              }}
                              className="w-32 font-bold text-xs"
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <TextInput
                              size="sm"
                              type="number"
                              value={slab.doubleSidePrice || 0}
                              onChange={(e) => {
                                const copy = [...priceSlabs];
                                copy[sIdx].doubleSidePrice = parseFloat(e.target.value) || 0;
                                setPriceSlabs(copy);
                              }}
                              className="w-32 font-bold text-xs"
                            />
                          </Table.Cell>
                          <Table.Cell className="text-xs font-mono text-gray-500">
                            ₹{(slab.singleSidePrice / slab.minQty).toFixed(2)} / pc
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            <button
                              type="button"
                              onClick={() => setPriceSlabs(priceSlabs.filter((_, idx) => idx !== sIdx))}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              )}
            </div>
          </Tabs.Item>

          {/* TAB 4: Compatibility Rules */}
          <Tabs.Item title="4. Compatibility Rules" icon={HiOutlineShieldCheck}>
            <div className="p-4 sm:p-6 space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                  Conditional Option & Compatibility Rules
                </h4>
                <p className="text-xs text-blue-700 mt-1">
                  Enforce printing industry rules so customers cannot select invalid options. For example: If Printing = Single Side, disable Back-Side Spot UV; or If Lamination = None, hide Special Finishes.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-gray-800">Add New Compatibility Rule</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs font-bold">IF (Trigger Option Code)</Label>
                    <TextInput
                      size="sm"
                      value={newRule.triggerOptionCode}
                      onChange={(e) => setNewRule({ ...newRule, triggerOptionCode: e.target.value })}
                      placeholder="e.g. printing_location"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">IS EQUAL TO (Trigger Value)</Label>
                    <TextInput
                      size="sm"
                      value={newRule.triggerValueCode}
                      onChange={(e) => setNewRule({ ...newRule, triggerValueCode: e.target.value })}
                      placeholder="e.g. Single Side"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">THEN (Action)</Label>
                    <Select
                      size="sm"
                      value={newRule.action}
                      onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                      className="text-xs"
                    >
                      <option value="DISABLE_TARGET">DISABLE Target Option / Value</option>
                      <option value="HIDE_TARGET">HIDE Target Option</option>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">TARGET OPTION CODE</Label>
                    <TextInput
                      size="sm"
                      value={newRule.targetOptionCode}
                      onChange={(e) => setNewRule({ ...newRule, targetOptionCode: e.target.value })}
                      placeholder="e.g. spot_uv_coating"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold">TARGET SPECIFIC VALUE (Optional)</Label>
                    <TextInput
                      size="sm"
                      value={newRule.targetValueCode}
                      onChange={(e) => setNewRule({ ...newRule, targetValueCode: e.target.value })}
                      placeholder="Leave blank to disable entire target option"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">CUSTOMER REASON MESSAGE</Label>
                    <TextInput
                      size="sm"
                      value={newRule.reason}
                      onChange={(e) => setNewRule({ ...newRule, reason: e.target.value })}
                      placeholder="e.g. Back side Spot UV is not applicable for Single Side prints."
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="sm" color="purple" onClick={handleAddRule}>
                    + Add Rule
                  </Button>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table hoverable>
                  <Table.Head>
                    <Table.HeadCell>Trigger Condition</Table.HeadCell>
                    <Table.HeadCell>Action & Target</Table.HeadCell>
                    <Table.HeadCell>Customer Explanation</Table.HeadCell>
                    <Table.HeadCell className="text-right">Actions</Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {compatibilityRules.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={4} className="text-center py-6 text-gray-400 text-xs">
                          No compatibility rules defined yet.
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      compatibilityRules.map((rule) => (
                        <Table.Row key={rule.id} className="bg-white">
                          <Table.Cell>
                            <span className="text-xs font-bold text-purple-900 block">
                              {rule.triggerOptionCode} = "{rule.triggerValueCode}"
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={rule.action === 'HIDE_TARGET' ? 'failure' : 'warning'} size="sm" className="inline-block">
                              {rule.action} {rule.targetOptionCode} {rule.targetValueCode ? `(${rule.targetValueCode})` : ''}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-xs text-gray-600">{rule.reason || 'No explanation'}</span>
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table>
              </div>
            </div>
          </Tabs.Item>

          {/* TAB 5: Price Versions & Audit Log */}
          <Tabs.Item title="5. Price Versions & Audit" icon={HiOutlineClock}>
            <div className="p-4 sm:p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
                  Historical Price Versions ({priceVersions.length} Recorded)
                </h4>
                <span className="text-xs text-green-600 font-bold">
                  🛡 Old orders retain their original immutable snapshot.
                </span>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table hoverable>
                  <Table.Head>
                    <Table.HeadCell>Version</Table.HeadCell>
                    <Table.HeadCell>Pricing Model</Table.HeadCell>
                    <Table.HeadCell>Date & Time</Table.HeadCell>
                    <Table.HeadCell>Change Reason</Table.HeadCell>
                    <Table.HeadCell className="text-right">Actions</Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {priceVersions.map((ver, vIdx) => (
                      <Table.Row key={ver.id} className="bg-white">
                        <Table.Cell>
                          <span className="font-black text-xs text-gray-900">{ver.versionLabel}</span>
                          {vIdx === 0 && (
                            <Badge color="success" size="xs" className="inline-block ml-2">
                              Active
                            </Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge color="light" size="xs">{ver.pricingModel}</Badge>
                        </Table.Cell>
                        <Table.Cell className="text-xs text-gray-500">
                          {new Date(ver.createdAt).toLocaleString()}
                        </Table.Cell>
                        <Table.Cell className="text-xs text-gray-700">
                          {ver.changeReason || 'No reason specified'}
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          {vIdx > 0 && (
                            <Button
                              size="xs"
                              color="light"
                              onClick={() => handleRollback(ver.id, ver.versionLabel)}
                              className="text-xs font-bold"
                            >
                              ↺ Revert to this
                            </Button>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          </Tabs.Item>
        </Tabs>
      </div>

      {/* Customer Preview Simulator Modal */}
      <Modal show={isPreviewOpen} size="3xl" onClose={() => setIsPreviewOpen(false)}>
        <Modal.Header>
          <div className="flex items-center gap-2">
            <HiOutlineEye className="w-5 h-5 text-purple-600" />
            <span className="font-black text-gray-900">Storefront Customer Simulator — {product?.name}</span>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800">
              💡 <strong>Interactive Admin Simulator</strong>: Test how customers experience your option order, quantity tiers, add-ons, and compatibility rules before saving!
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase text-gray-700 mb-2">Step 1: Configuration Options</h4>
                  <div className="space-y-3">
                    {optionMappings
                      .filter((m) => !m.isAddon && m.isEnabled !== false)
                      .map((m) => {
                        const optName = m.customLabel || m.master?.name;
                        const vals = m.valueMappings?.filter((v) => v.isEnabled !== false) || [];

                        return (
                          <div key={m.masterId}>
                            <span className="text-xs font-bold text-gray-800 block mb-1">
                              {optName} {m.isRequired && <span className="text-red-500">*</span>}
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {vals.map((v) => {
                                const label = v.customLabel || v.masterValue?.label;
                                const isSelected = previewOptions[optName] === label;

                                return (
                                  <button
                                    key={v.id || label}
                                    type="button"
                                    onClick={() => setPreviewOptions({ ...previewOptions, [optName]: label })}
                                    className={`p-2 rounded-lg border text-left text-xs transition-all ${
                                      isSelected
                                        ? 'border-yellow-400 bg-yellow-50 text-black font-extrabold shadow-xs'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    }`}
                                  >
                                    <span className="block">{label}</span>
                                    {v.priceModifierValue > 0 && (
                                      <span className="text-[10px] text-red-600 font-bold block mt-0.5">
                                        +₹{v.priceModifierValue}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <h4 className="text-xs font-black uppercase text-gray-700 mb-2">
                    Step 2: Quantity ({product?.quantityUnit || 'Pieces'})
                  </h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(priceSlabs.length > 0 ? priceSlabs.map((s) => s.minQty) : [100, 250, 500, 1000]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setPreviewQty(q)}
                        className={`p-2 rounded-lg border text-center text-xs transition-all ${
                          previewQty === q
                            ? 'border-yellow-400 bg-yellow-400 text-black font-extrabold shadow-xs'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 font-bold'
                        }`}
                      >
                        {q} pcs
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Price Breakdown Card */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-gray-700 mb-3">Live Calculated Price Breakdown</h4>
                  
                  {previewCalculating ? (
                    <div className="py-8 text-center"><Spinner size="md" /></div>
                  ) : previewPricing ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-600">Base Print ({previewQty} units):</span>
                        <span className="font-bold text-gray-900">₹{previewPricing.basePrice}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-600">Finishing & Options:</span>
                        <span className="font-bold text-gray-900">+₹{previewPricing.optionSurcharges}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-600">Design Support:</span>
                        <span className="font-bold text-gray-900">₹{previewPricing.designFee}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-600">Logistics & Shipping:</span>
                        <span className="font-bold text-gray-900">
                          {previewPricing.shipping === 0 ? 'FREE' : `₹${previewPricing.shipping}`}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-600">GST (18%):</span>
                        <span className="font-bold text-gray-900">₹{previewPricing.totalTax}</span>
                      </div>
                      
                      <div className="pt-2 flex justify-between items-baseline">
                        <span className="text-sm font-black text-gray-900">Grand Total:</span>
                        <div className="text-right">
                          <span className="text-2xl font-black text-red-600">₹{previewPricing.grandTotal}</span>
                          <span className="block text-[10px] text-gray-500">
                            (₹{previewPricing.unitPrice} / piece)
                          </span>
                        </div>
                      </div>

                      {!previewPricing.isAvailable && (
                        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-lg text-red-700 text-xs font-bold">
                          ⚠️ {previewPricing.unavailableReason}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">No price data</span>
                  )}
                </div>

                <Button color="dark" size="sm" className="w-full mt-4 font-black" onClick={() => setIsPreviewOpen(false)}>
                  Close Simulator
                </Button>
              </div>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
