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
  HiOutlineSparkles,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineCalculator,
} from 'react-icons/hi';
import { api } from '../services/api';

export default function AdminProductConfigurator() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [allMasters, setAllMasters] = useState([]);
  const [optionMasterSearch, setOptionMasterSearch] = useState('');
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

  // Matrix Editor State
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [bulkMarkupType, setBulkMarkupType] = useState('PERCENT'); // 'PERCENT' | 'FLAT'
  const [bulkMarkupValue, setBulkMarkupValue] = useState(10);
  const [matrixFilter, setMatrixFilter] = useState('');
  const [matrixQtyFilter, setMatrixQtyFilter] = useState('ALL');

  // Phase 8D-1: purely local UI state — which rows in the "Applicable Options" table have their
  // technical/advanced fields (Master Code, Pricing Behavior) expanded. Never sent to the server,
  // never affects optionMappings data, defaults to fully collapsed (clean view).
  const [expandedAdvancedRows, setExpandedAdvancedRows] = useState({});

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
        priceSlabs: priceSlabs.map((s) => ({
          minQty: parseInt(s.minQty, 10) || 1,
          maxQty: s.maxQty ? parseInt(s.maxQty, 10) : null,
          singleSidePrice: parseFloat(s.singleSidePrice) || 0,
          doubleSidePrice: parseFloat(s.doubleSidePrice) || 0,
          unitPrice: parseFloat(s.unitPrice) || ((parseFloat(s.singleSidePrice) || 0) / (parseInt(s.minQty, 10) || 1)),
        })),
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

  const handleApplyIndustryPreset = (presetType) => {
    if (!allMasters || allMasters.length === 0) {
      showToast('No Option Masters available. Please click Seed Defaults or manage masters.', 'error');
      return;
    }

    const presetName = presetType === 'BUSINESS_CARDS'
      ? 'Business Cards'
      : presetType === 'STICKERS'
      ? 'Stickers & Labels'
      : 'Banners & Signages';

    if (!window.confirm(`Apply "${presetName}" industry preset? This will configure standard options and volume pricing tiers for this product.`)) {
      return;
    }

    if (presetType === 'BUSINESS_CARDS') {
      const targetCodes = ['size', 'material', 'printing_side', 'finishing', 'card_addons'];
      const newMappings = [];
      targetCodes.forEach((code, idx) => {
        const master = allMasters.find((m) => m.code === code);
        if (!master) return;
        const isAddon = master.isAddon;
        let defaultVal = '';
        if (code === 'size') defaultVal = '3.5 × 2 inches (Standard)';
        else if (code === 'material') defaultVal = '350 GSM Premium Art Card';
        else if (code === 'printing_side') defaultVal = 'Single Side (Front Only)';
        else if (code === 'finishing') defaultVal = 'Thermal Matte Lamination';
        else defaultVal = master.values?.[0]?.label || '';

        newMappings.push({
          id: `temp_preset_${Date.now()}_${idx}`,
          productId: id,
          masterId: master.id,
          master,
          customLabel: master.name,
          isRequired: !isAddon,
          isAddon,
          defaultValue: defaultVal,
          displayOrder: idx + 1,
          pricingBehavior: isAddon ? 'ADDON_SURCHARGE' : 'MATRIX_DIMENSION',
          isEnabled: true,
          valueMappings: (master.values || []).map((val, vIdx) => ({
            id: `temp_preset_val_${Date.now()}_${vIdx}`,
            masterValueId: val.id,
            masterValue: val,
            customLabel: val.label,
            priceModifierType: val.defaultModifierType || 'FLAT',
            priceModifierValue: val.defaultModifierValue || 0,
            isDefault: val.label === defaultVal,
            isEnabled: true,
            displayOrder: vIdx + 1,
          })),
        });
      });

      setOptionMappings(newMappings);
      setPricingType('TIERED');
      setStartingPrice(200);
      setPriceSlabs([
        { id: `slab_1`, minQty: 100, singleSidePrice: 200, doubleSidePrice: 350, unitPrice: 2.0 },
        { id: `slab_2`, minQty: 250, singleSidePrice: 380, doubleSidePrice: 650, unitPrice: 1.52 },
        { id: `slab_3`, minQty: 500, singleSidePrice: 650, doubleSidePrice: 1100, unitPrice: 1.3 },
        { id: `slab_4`, minQty: 1000, singleSidePrice: 1100, doubleSidePrice: 1800, unitPrice: 1.1 },
        { id: `slab_5`, minQty: 2000, singleSidePrice: 2000, doubleSidePrice: 3200, unitPrice: 1.0 },
      ]);
      showToast('Applied Business Cards industry preset! Click Save Changes to store.');
    } else if (presetType === 'STICKERS') {
      const targetCodes = ['size', 'custom_shape', 'material', 'finishing'];
      const newMappings = [];
      targetCodes.forEach((code, idx) => {
        const master = allMasters.find((m) => m.code === code);
        if (!master) return;
        const isAddon = master.isAddon;
        let defaultVal = '';
        if (code === 'size') defaultVal = '2 × 2 inches';
        else if (code === 'custom_shape') defaultVal = 'Standard Square / Rectangle Cut';
        else if (code === 'material') defaultVal = 'Premium Gloss Vinyl Sticker';
        else if (code === 'finishing') defaultVal = 'Waterproof Scratch-Resistant Film';
        else defaultVal = master.values?.[0]?.label || '';

        newMappings.push({
          id: `temp_preset_${Date.now()}_${idx}`,
          productId: id,
          masterId: master.id,
          master,
          customLabel: master.name,
          isRequired: !isAddon,
          isAddon,
          defaultValue: defaultVal,
          displayOrder: idx + 1,
          pricingBehavior: isAddon ? 'ADDON_SURCHARGE' : 'MATRIX_DIMENSION',
          isEnabled: true,
          valueMappings: (master.values || []).map((val, vIdx) => ({
            id: `temp_preset_val_${Date.now()}_${vIdx}`,
            masterValueId: val.id,
            masterValue: val,
            customLabel: val.label,
            priceModifierType: val.defaultModifierType || 'FLAT',
            priceModifierValue: val.defaultModifierValue || 0,
            isDefault: val.label === defaultVal,
            isEnabled: true,
            displayOrder: vIdx + 1,
          })),
        });
      });

      setOptionMappings(newMappings);
      setPricingType('TIERED');
      setStartingPrice(150);
      setPriceSlabs([
        { id: `slab_s1`, minQty: 50, singleSidePrice: 150, doubleSidePrice: 150, unitPrice: 3.0 },
        { id: `slab_s2`, minQty: 100, singleSidePrice: 250, doubleSidePrice: 250, unitPrice: 2.5 },
        { id: `slab_s3`, minQty: 250, singleSidePrice: 500, doubleSidePrice: 500, unitPrice: 2.0 },
        { id: `slab_s4`, minQty: 500, singleSidePrice: 850, doubleSidePrice: 850, unitPrice: 1.7 },
        { id: `slab_s5`, minQty: 1000, singleSidePrice: 1400, doubleSidePrice: 1400, unitPrice: 1.4 },
      ]);
      showToast('Applied Stickers & Labels industry preset! Click Save Changes to store.');
    } else if (presetType === 'BANNERS') {
      const targetCodes = ['size', 'material', 'printing_method', 'banner_finishing'];
      const newMappings = [];
      targetCodes.forEach((code, idx) => {
        const master = allMasters.find((m) => m.code === code);
        if (!master) return;
        const isAddon = master.isAddon;
        let defaultVal = '';
        if (code === 'size') defaultVal = '6 × 3 ft (18 Sq.ft)';
        else if (code === 'material') defaultVal = 'Standard Frontlit Flex (280 GSM)';
        else if (code === 'printing_method') defaultVal = 'Eco-Solvent HD Print (1440 DPI)';
        else if (code === 'banner_finishing') defaultVal = 'Brass Eyelets on All Corners';
        else defaultVal = master.values?.[0]?.label || '';

        newMappings.push({
          id: `temp_preset_${Date.now()}_${idx}`,
          productId: id,
          masterId: master.id,
          master,
          customLabel: master.name,
          isRequired: !isAddon,
          isAddon,
          defaultValue: defaultVal,
          displayOrder: idx + 1,
          pricingBehavior: isAddon ? 'ADDON_SURCHARGE' : 'MATRIX_DIMENSION',
          isEnabled: true,
          valueMappings: (master.values || []).map((val, vIdx) => ({
            id: `temp_preset_val_${Date.now()}_${vIdx}`,
            masterValueId: val.id,
            masterValue: val,
            customLabel: val.label,
            priceModifierType: val.defaultModifierType || 'FLAT',
            priceModifierValue: val.defaultModifierValue || 0,
            isDefault: val.label === defaultVal,
            isEnabled: true,
            displayOrder: vIdx + 1,
          })),
        });
      });

      setOptionMappings(newMappings);
      setPricingType('PER_SQFT');
      setStartingPrice(18);
      setCustomUnitPrice(18);
      setPriceSlabs([
        { id: `slab_b1`, minQty: 1, singleSidePrice: 324, doubleSidePrice: 648, unitPrice: 324 },
        { id: `slab_b2`, minQty: 5, singleSidePrice: 1500, doubleSidePrice: 3000, unitPrice: 300 },
        { id: `slab_b3`, minQty: 10, singleSidePrice: 2800, doubleSidePrice: 5600, unitPrice: 280 },
      ]);
      showToast('Applied Banners & Signages industry preset! Click Save Changes to store.');
    }
  };

  const handleGenerateMatrixPermutations = () => {
    const coreOptions = optionMappings.filter((m) => !m.isAddon && m.isEnabled !== false);
    if (coreOptions.length === 0) {
      showToast('Please add & enable at least one core option master in Tab 1 first.', 'error');
      return;
    }

    const dimensions = coreOptions
      .map((opt) => {
        const optName = opt.customLabel || opt.master?.name || 'Option';
        const values = (opt.valueMappings || [])
          .filter((vm) => vm.isEnabled !== false)
          .map((vm) => ({
            label: vm.customLabel || vm.masterValue?.label,
            priceModifierType: vm.priceModifierType || 'FLAT',
            priceModifierValue: parseFloat(vm.priceModifierValue) || 0,
          }));
        return { name: optName, values };
      })
      .filter((d) => d.values.length > 0);

    if (dimensions.length === 0) {
      showToast('No active option values found to generate combinations.', 'error');
      return;
    }

    const targetQuantities = priceSlabs.length > 0
      ? priceSlabs.map((s) => parseInt(s.minQty, 10)).filter(Boolean)
      : [100, 250, 500, 1000];

    function cartesian(arr) {
      return arr.reduce(
        (acc, curr) => acc.flatMap((c) => curr.values.map((v) => ({ ...c, [curr.name]: v }))),
        [{}]
      );
    }

    const optionPermutations = cartesian(dimensions);
    const maxCombinations = 500;
    const truncatedOptionPermutations = optionPermutations.slice(0, Math.floor(maxCombinations / targetQuantities.length));

    const generatedEntries = [];
    let count = 0;

    for (const qty of targetQuantities) {
      const matchingSlab = priceSlabs.find((s) => parseInt(s.minQty, 10) === qty);
      const baseSlabPrice = matchingSlab
        ? parseFloat(matchingSlab.singleSidePrice) || 200
        : (parseFloat(startingPrice) || 200) * (qty / 100);

      for (const optCombo of truncatedOptionPermutations) {
        count++;
        const optionsJsonObj = {};
        let totalModifiers = 0;
        const keyParts = [];

        Object.entries(optCombo).forEach(([optName, valObj]) => {
          optionsJsonObj[optName] = valObj.label;
          keyParts.push(valObj.label);

          if (valObj.priceModifierType === 'PERCENT') {
            totalModifiers += (baseSlabPrice * valObj.priceModifierValue) / 100;
          } else if (valObj.priceModifierType === 'PER_UNIT') {
            totalModifiers += valObj.priceModifierValue * qty;
          } else {
            totalModifiers += valObj.priceModifierValue;
          }
        });

        const calculatedPrice = Math.max(1, Math.round(baseSlabPrice + totalModifiers));
        const combinationKey = `${keyParts.join(' | ')} (Qty: ${qty})`;

        generatedEntries.push({
          id: `temp_comb_${Date.now()}_${count}`,
          combinationKey,
          optionsJson: JSON.stringify(optionsJsonObj),
          quantity: qty,
          price: calculatedPrice,
          unitPrice: parseFloat((calculatedPrice / qty).toFixed(2)),
          sku: `${product?.sku || 'PRD'}-${qty}-${count}`,
          isAvailable: true,
          displayOrder: count,
        });
      }
    }

    setPricingMatrices(generatedEntries);
    showToast(`Generated ${generatedEntries.length} combinations! Review and click "Save Pricing Matrix".`);
  };

  const handleSavePricingMatrix = async () => {
    setSavingMatrix(true);
    try {
      const res = await api.bulkUpdatePricingMatrix(id, pricingMatrices);
      if (res.success) {
        showToast(res.message || 'Pricing matrix saved successfully!');
        fetchConfiguration();
      }
    } catch (err) {
      console.error('Matrix save error:', err);
      showToast(err.message || 'Failed to save pricing matrix.', 'error');
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleApplyBulkMarkup = () => {
    const markupVal = parseFloat(bulkMarkupValue) || 0;
    if (markupVal === 0) return;

    const updated = pricingMatrices.map((row) => {
      let newPrice = row.price;
      if (bulkMarkupType === 'PERCENT') {
        newPrice = Math.round(row.price * (1 + markupVal / 100));
      } else {
        newPrice = Math.round(row.price + markupVal);
      }
      newPrice = Math.max(1, newPrice);
      return {
        ...row,
        price: newPrice,
        unitPrice: parseFloat((newPrice / row.quantity).toFixed(2)),
      };
    });

    setPricingMatrices(updated);
    showToast(`Applied ${bulkMarkupType === 'PERCENT' ? `+${markupVal}%` : `+₹${markupVal}`} markup across all combinations.`);
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

  // Show/hide this entire option to the customer without removing its mapping
  // (reuses the existing ProductOptionMapping.isEnabled field already saved by handleSaveConfiguration)
  const handleToggleMappingEnabled = (masterId) => {
    setOptionMappings(
      optionMappings.map((m) =>
        m.masterId === masterId ? { ...m, isEnabled: !(m.isEnabled !== false) } : m
      )
    );
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

              {/* 1-Click Industry Presets Bar */}
              <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <HiOutlineSparkles className="w-4 h-4 text-amber-600" />
                    1-Click Industry Printing Presets
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Instantly load standard options, industry defaults, and volume pricing matrices for standard product types.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyIndustryPreset('BUSINESS_CARDS')}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-400 hover:bg-amber-500 text-black shadow-xs transition-all flex items-center gap-1"
                  >
                    📇 Business Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyIndustryPreset('STICKERS')}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-400 hover:bg-amber-500 text-black shadow-xs transition-all flex items-center gap-1"
                  >
                    🏷️ Stickers & Labels
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyIndustryPreset('BANNERS')}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-400 hover:bg-amber-500 text-black shadow-xs transition-all flex items-center gap-1"
                  >
                    🚩 Banners & Signages
                  </button>
                </div>
              </div>

              <div>
                <Label className="font-extrabold text-xs uppercase tracking-wider text-gray-700 block mb-2">
                  Add Reusable Option Master to this Product
                </Label>
                <div className="relative mb-2 max-w-xs">
                  <HiOutlineSearch className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <TextInput
                    sizing="sm"
                    value={optionMasterSearch}
                    onChange={(e) => setOptionMasterSearch(e.target.value)}
                    placeholder="Search option masters (e.g. Size, GSM, Lamination)..."
                    style={{ paddingLeft: '1.75rem' }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {allMasters
                    .filter((m) => m.name.toLowerCase().includes(optionMasterSearch.trim().toLowerCase()))
                    .map((m) => {
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
                    <Table.HeadCell>Option Name</Table.HeadCell>
                    <Table.HeadCell>Customer Label</Table.HeadCell>
                    <Table.HeadCell>Required</Table.HeadCell>
                    <Table.HeadCell>Show to Customer</Table.HeadCell>
                    <Table.HeadCell>Values</Table.HeadCell>
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
                        const isMappingVisible = mapping.isEnabled !== false;
                        const rowKey = mapping.id || mapping.masterId;
                        const isAdvancedOpen = !!expandedAdvancedRows[mapping.masterId];
                        const enabledValueCount = availableVals.filter((v) => v.isEnabled !== false).length;

                        return (
                          <React.Fragment key={rowKey}>
                            <Table.Row
                              className={isMappingVisible ? 'bg-white' : 'bg-gray-50 opacity-60'}
                            >
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
                                <label className="flex items-center gap-2 cursor-pointer" title="Controls ProductOptionMapping.isEnabled — hides this option from the customer without deleting it">
                                  <Checkbox
                                    checked={isMappingVisible}
                                    onChange={() => handleToggleMappingEnabled(mapping.masterId)}
                                  />
                                  <span className={`text-xs font-bold ${isMappingVisible ? 'text-green-700' : 'text-gray-400'}`}>
                                    {isMappingVisible ? 'Visible' : 'Hidden'}
                                  </span>
                                </label>
                              </Table.Cell>

                              <Table.Cell>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[11px] font-bold text-gray-500">
                                    {enabledValueCount} of {availableVals.length} values shown
                                  </span>
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
                                    <option value="">-- Default: None / Select at checkout --</option>
                                    {availableVals.map((v) => {
                                      const label = v.customLabel || v.label || v.masterValue?.label;
                                      return (
                                        <option key={v.id || label} value={label}>
                                          {label}
                                        </option>
                                      );
                                    })}
                                  </Select>
                                </div>
                              </Table.Cell>

                              <Table.Cell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedAdvancedRows((prev) => ({
                                        ...prev,
                                        [mapping.masterId]: !prev[mapping.masterId],
                                      }))
                                    }
                                    className={`p-1.5 rounded ${
                                      isAdvancedOpen
                                        ? 'text-purple-700 bg-purple-50'
                                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                                    title="Show technical fields (master code, pricing behavior)"
                                  >
                                    <HiOutlineAdjustments className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMapping(mapping.masterId)}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                    title="Remove Option"
                                  >
                                    <HiOutlineTrash className="w-4 h-4" />
                                  </button>
                                </div>
                              </Table.Cell>
                            </Table.Row>

                            {isAdvancedOpen && (
                              <Table.Row className="bg-purple-50/40">
                                <Table.Cell />
                                <Table.Cell colSpan={6}>
                                  <div className="flex flex-wrap items-center gap-4 py-1">
                                    <span className="text-[11px] text-gray-600">
                                      <span className="font-bold text-gray-700">Master Code:</span>{' '}
                                      <span className="font-mono">{master?.code}</span>
                                    </span>
                                    <span className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                      <span className="font-bold text-gray-700">Pricing Behavior:</span>
                                      <Badge color={mapping.isAddon ? 'purple' : 'info'} size="sm">
                                        {mapping.isAddon ? 'Add-on Surcharge' : 'Matrix Dimension'}
                                      </Badge>
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      (Advanced — set automatically when the option was added; not normally edited here.)
                                    </span>
                                  </div>
                                </Table.Cell>
                              </Table.Row>
                            )}
                          </React.Fragment>
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
              <div className="space-y-3">
                <Label className="font-extrabold text-xs uppercase tracking-wider text-gray-700 block">
                  Pricing Mode — choose one. Only that mode's tools are shown below.
                </Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setPricingType('TIERED')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      pricingType === 'TIERED'
                        ? 'border-purple-600 bg-purple-50 shadow-xs ring-2 ring-purple-400/30'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-black text-sm text-gray-900">🟢 Simple Pricing</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Quantity → Price. One rate per quantity tier (e.g. 100 pcs = ₹200), with separate Single &amp; Double Side rates. Best for most products.
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
                    <h4 className="font-black text-sm text-gray-900">🔵 Advanced Pricing</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Quantity × Options → Price. Use when price depends on which options are picked (e.g. Print Side, Corner, Lamination).
                    </p>
                  </div>
                </div>

                <details className="group" open={pricingType === 'PER_SQFT' || pricingType === 'CUSTOM_UNIT'}>
                  <summary className="text-[11px] font-bold text-gray-400 hover:text-gray-600 cursor-pointer list-none flex items-center gap-1">
                    <HiOutlineFilter className="w-3 h-3" />
                    Special case: rate per unit / sq.ft (rarely needed — e.g. Banners, Flex)
                  </summary>
                  <div
                    onClick={() => setPricingType('PER_SQFT')}
                    className={`mt-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      pricingType === 'PER_SQFT' || pricingType === 'CUSTOM_UNIT'
                        ? 'border-purple-600 bg-purple-50 shadow-xs ring-2 ring-purple-400/30'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-black text-sm text-gray-900">⚙️ Custom Rate</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Linear rate per unit or sq.ft (e.g. ₹18 / sq.ft for Flex, ₹0.85 / card for bulk).
                    </p>
                  </div>
                </details>
              </div>

              {pricingType === 'TIERED' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
                      Simple Pricing — Quantity → Price ({priceSlabs.length} Tiers)
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

              {/* MATRIX PRICING VIEW */}
              {pricingType === 'MATRIX' && (
                <div className="space-y-4">
                  {/* Top toolbar */}
                  <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                          <HiOutlineSparkles className="w-4 h-4 text-purple-600" />
                          Advanced Pricing — Quantity × Options → Price ({pricingMatrices.length} Combinations)
                        </h4>
                        <Badge color="purple" size="sm">
                          {pricingMatrices.filter((m) => m.isAvailable).length} Active
                        </Badge>
                      </div>
                      <p className="text-xs text-purple-700">
                        Match exact customer selections to custom fixed pricing for each volume tier.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="xs"
                        color="purple"
                        onClick={handleGenerateMatrixPermutations}
                        className="font-bold flex items-center gap-1"
                      >
                        <HiOutlineRefresh className="w-3.5 h-3.5 mr-1" />
                        Auto-Generate Permutations
                      </Button>

                      <Button
                        size="xs"
                        color="success"
                        disabled={savingMatrix || pricingMatrices.length === 0}
                        onClick={handleSavePricingMatrix}
                        className="font-black flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {savingMatrix ? <Spinner size="xs" className="mr-1" /> : <HiSave className="w-3.5 h-3.5 mr-1" />}
                        Save Matrix ({pricingMatrices.length})
                      </Button>
                    </div>
                  </div>

                  {/* Bulk Markup & Filtering Bar */}
                  {pricingMatrices.length > 0 && (
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      {/* Bulk Markup Tool */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-gray-700 uppercase tracking-wide">Bulk Markup:</span>
                        <Select
                          size="sm"
                          value={bulkMarkupType}
                          onChange={(e) => setBulkMarkupType(e.target.value)}
                          className="w-28 text-xs"
                        >
                          <option value="PERCENT">% Markup</option>
                          <option value="FLAT">₹ Flat Add</option>
                        </Select>
                        <TextInput
                          size="sm"
                          type="number"
                          value={bulkMarkupValue}
                          onChange={(e) => setBulkMarkupValue(e.target.value)}
                          className="w-24 text-xs font-bold"
                          placeholder="e.g. 10"
                        />
                        <Button size="xs" color="gray" onClick={handleApplyBulkMarkup} className="font-bold">
                          Apply to All
                        </Button>
                      </div>

                      {/* Filters */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                          <TextInput
                            size="sm"
                            icon={HiOutlineSearch}
                            placeholder="Filter combinations..."
                            value={matrixFilter}
                            onChange={(e) => setMatrixFilter(e.target.value)}
                            className="w-48 text-xs"
                          />
                        </div>
                        <Select
                          size="sm"
                          value={matrixQtyFilter}
                          onChange={(e) => setMatrixQtyFilter(e.target.value)}
                          className="w-32 text-xs"
                        >
                          <option value="ALL">All Quantities</option>
                          {Array.from(new Set(pricingMatrices.map((m) => m.quantity)))
                            .sort((a, b) => a - b)
                            .map((qty) => (
                              <option key={qty} value={qty}>
                                Qty: {qty}
                              </option>
                            ))}
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Matrix Combinations Table */}
                  {pricingMatrices.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 space-y-3">
                      <HiOutlineSparkles className="w-10 h-10 text-purple-400 mx-auto" />
                      <div>
                        <h4 className="font-bold text-sm text-gray-800">No Pricing Matrix Entries Yet</h4>
                        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                          Click "Auto-Generate Permutations" above to automatically generate combination rows based on the options enabled in Tab 1, or add manual combinations below.
                        </p>
                      </div>
                      <div className="pt-2 flex justify-center gap-2">
                        <Button size="sm" color="purple" onClick={handleGenerateMatrixPermutations}>
                          <HiOutlineRefresh className="w-4 h-4 mr-1.5" />
                          Auto-Generate from Options
                        </Button>
                        <Button
                          size="sm"
                          color="light"
                          onClick={() => {
                            setPricingMatrices([
                              ...pricingMatrices,
                              {
                                id: `manual_${Date.now()}`,
                                combinationKey: 'Custom Combination',
                                optionsJson: JSON.stringify({}),
                                quantity: 100,
                                price: 250,
                                unitPrice: 2.5,
                                sku: `${product?.sku || 'PRD'}-100`,
                                isAvailable: true,
                                displayOrder: pricingMatrices.length + 1,
                              },
                            ]);
                          }}
                        >
                          + Add Single Row
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden max-h-[550px] overflow-y-auto">
                      <Table hoverable>
                        <Table.Head className="sticky top-0 bg-gray-100 z-10">
                          <Table.HeadCell className="w-12">#</Table.HeadCell>
                          <Table.HeadCell>Combination / Option Attributes</Table.HeadCell>
                          <Table.HeadCell className="w-24">Quantity</Table.HeadCell>
                          <Table.HeadCell className="w-36">Total Price (₹)</Table.HeadCell>
                          <Table.HeadCell className="w-28">Rate / Pc</Table.HeadCell>
                          <Table.HeadCell className="w-36">SKU Code</Table.HeadCell>
                          <Table.HeadCell className="w-24 text-center">Available</Table.HeadCell>
                          <Table.HeadCell className="w-16 text-right">Delete</Table.HeadCell>
                        </Table.Head>
                        <Table.Body className="divide-y">
                          {pricingMatrices
                            .filter((row) => {
                              const matchesText =
                                !matrixFilter ||
                                row.combinationKey?.toLowerCase().includes(matrixFilter.toLowerCase()) ||
                                row.optionsJson?.toLowerCase().includes(matrixFilter.toLowerCase()) ||
                                row.sku?.toLowerCase().includes(matrixFilter.toLowerCase());
                              const matchesQty =
                                matrixQtyFilter === 'ALL' || String(row.quantity) === String(matrixQtyFilter);
                              return matchesText && matchesQty;
                            })
                            .map((row, rIdx) => (
                              <Table.Row key={row.id || rIdx} className="bg-white hover:bg-purple-50/20">
                                <Table.Cell className="text-xs text-gray-400 font-mono">{rIdx + 1}</Table.Cell>
                                <Table.Cell>
                                  <span className="font-bold text-xs text-gray-900 block">{row.combinationKey}</span>
                                  <span className="text-[10px] text-gray-500 font-mono truncate max-w-sm block">
                                    {row.optionsJson}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <TextInput
                                    size="sm"
                                    type="number"
                                    value={row.quantity}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value, 10) || 1;
                                      const copy = [...pricingMatrices];
                                      copy[rIdx].quantity = newQty;
                                      copy[rIdx].unitPrice = parseFloat((copy[rIdx].price / newQty).toFixed(2));
                                      setPricingMatrices(copy);
                                    }}
                                    className="w-20 text-xs font-bold"
                                  />
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-gray-400">₹</span>
                                    <TextInput
                                      size="sm"
                                      type="number"
                                      value={row.price}
                                      onChange={(e) => {
                                        const newPrice = parseFloat(e.target.value) || 0;
                                        const copy = [...pricingMatrices];
                                        copy[rIdx].price = newPrice;
                                        copy[rIdx].unitPrice = parseFloat((newPrice / copy[rIdx].quantity).toFixed(2));
                                        setPricingMatrices(copy);
                                      }}
                                      className="w-28 text-xs font-black text-green-700"
                                    />
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="text-xs font-mono text-gray-600">
                                  ₹{row.unitPrice || (row.price / row.quantity).toFixed(2)}
                                </Table.Cell>
                                <Table.Cell>
                                  <TextInput
                                    size="sm"
                                    value={row.sku || ''}
                                    onChange={(e) => {
                                      const copy = [...pricingMatrices];
                                      copy[rIdx].sku = e.target.value;
                                      setPricingMatrices(copy);
                                    }}
                                    placeholder="SKU"
                                    className="w-28 text-xs font-mono"
                                  />
                                </Table.Cell>
                                <Table.Cell className="text-center">
                                  <Checkbox
                                    checked={row.isAvailable !== false}
                                    onChange={(e) => {
                                      const copy = [...pricingMatrices];
                                      copy[rIdx].isAvailable = e.target.checked;
                                      setPricingMatrices(copy);
                                    }}
                                  />
                                </Table.Cell>
                                <Table.Cell className="text-right">
                                  <button
                                    type="button"
                                    onClick={() => setPricingMatrices(pricingMatrices.filter((_, idx) => idx !== rIdx))}
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

                  {pricingMatrices.length > 0 && (
                    <div className="flex justify-between items-center pt-2">
                      <Button
                        size="xs"
                        color="light"
                        onClick={() => {
                          setPricingMatrices([
                            ...pricingMatrices,
                            {
                              id: `manual_${Date.now()}`,
                              combinationKey: 'Custom Combination',
                              optionsJson: JSON.stringify({}),
                              quantity: 100,
                              price: 250,
                              unitPrice: 2.5,
                              sku: `${product?.sku || 'PRD'}-100`,
                              isAvailable: true,
                              displayOrder: pricingMatrices.length + 1,
                            },
                          ]);
                        }}
                      >
                        + Add Custom Row
                      </Button>

                      <Button
                        size="sm"
                        color="success"
                        disabled={savingMatrix}
                        onClick={handleSavePricingMatrix}
                        className="font-black bg-green-600 hover:bg-green-700 text-white"
                      >
                        {savingMatrix ? <Spinner size="sm" className="mr-2" /> : <HiSave className="w-4 h-4 mr-1.5" />}
                        Save All Matrix Changes
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* PER SQ.FT / FORMULA PRICING VIEW */}
              {(pricingType === 'PER_SQFT' || pricingType === 'CUSTOM_UNIT') && (
                <div className="space-y-5">
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                      <HiOutlineCalculator className="w-4 h-4 text-purple-700" />
                      Formula / Linear Dimension Pricing Settings
                    </h4>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Used for large format print products like Flex Banners, Vinyl Stickers, Canvas, Standees, and Acrylic Boards.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2">
                      <Label className="text-xs font-black uppercase text-gray-800">
                        Base Rate per Unit / Sq.ft (₹)
                      </Label>
                      <TextInput
                        size="sm"
                        type="number"
                        value={customUnitPrice}
                        onChange={(e) => setCustomUnitPrice(e.target.value)}
                        placeholder="e.g. 18"
                        className="font-bold text-sm"
                      />
                      <span className="text-[11px] text-gray-500 block">
                        Cost per square foot or linear unit for standard printing.
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2">
                      <Label className="text-xs font-black uppercase text-gray-800">
                        Starting / Minimum Price per Order (₹)
                      </Label>
                      <TextInput
                        size="sm"
                        type="number"
                        value={startingPrice}
                        onChange={(e) => setStartingPrice(e.target.value)}
                        placeholder="e.g. 150"
                        className="font-bold text-sm"
                      />
                      <span className="text-[11px] text-gray-500 block">
                        Floor price to cover machine setup if customer dimensions are very small.
                      </span>
                    </div>
                  </div>

                  {/* Interactive Formula Simulation */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 max-w-2xl space-y-3">
                    <h5 className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                      Live Formula Calculation Preview
                    </h5>
                    <div className="bg-white p-3.5 rounded-lg border font-mono text-xs text-gray-700 space-y-1">
                      <p>Example: 6 ft (Width) × 3 ft (Height) = <span className="font-bold text-purple-700">18 Sq.ft</span></p>
                      <p>Rate: ₹{customUnitPrice || 18} / sq.ft</p>
                      <p className="font-bold text-sm text-green-700 pt-1 border-t">
                        Estimated Base Price = 18 × ₹{customUnitPrice || 18} = ₹{Math.max(parseFloat(startingPrice) || 0, 18 * (parseFloat(customUnitPrice) || 18))}
                      </p>
                    </div>
                  </div>
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
