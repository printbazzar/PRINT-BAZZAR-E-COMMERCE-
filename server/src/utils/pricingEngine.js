/**
 * Authoritative Print Bazzar Pricing Engine (Scalable Printing-Industry Edition)
 * Supports:
 * 1. Exact Combination Pricing (e.g. [Size] x [Material] x [Side] x [Lamination] x [Qty] = Exact Price)
 * 2. Combination Availability Validation (disables invalid configurations)
 * 3. Volume Quantity Slabs & Custom Quantity Range Interpolation
 * 4. Additional Add-On Pricing (FLAT, PERCENT, PER_UNIT)
 * 5. Dynamic Graphic Design Fees (Single Side ₹200 vs Double Side ₹400)
 * 6. GST Taxes & Delivery Logistics
 */

export function checkIsDoubleSide(selectedOptions = {}) {
  if (!selectedOptions || typeof selectedOptions !== 'object') return false;
  const doubleSidePatterns = [
    'double',
    'both',
    'front and back',
    'front & back',
    '2 side',
    'two side',
    '2 page',
    'two page',
    'front + back',
  ];
  return Object.entries(selectedOptions).some(([key, val]) => {
    const keyLower = String(key).toLowerCase();
    const valLower = String(val).toLowerCase();
    const isSideKey =
      keyLower.includes('side') ||
      keyLower.includes('print') ||
      keyLower.includes('location') ||
      keyLower.includes('page');
    if (isSideKey) {
      return doubleSidePatterns.some((pattern) => valLower.includes(pattern));
    }
  });
}

export function evaluateCompatibilityRules({ product, selectedOptions = {} }) {
  const disabledOptionValues = {}; // { [optionCodeOrName]: [valueCodesOrLabels] }
  const hiddenOptions = []; // [optionCodeOrName]
  const activeViolations = [];

  const rules = product?.compatibilityRules || [];
  for (const rule of rules) {
    if (rule.isActive === false) continue;

    // Find trigger value from selected options by code or label
    let triggerVal = selectedOptions[rule.triggerOptionCode];
    if (triggerVal === undefined && rule.triggerOptionName) {
      triggerVal = selectedOptions[rule.triggerOptionName];
    }
    if (triggerVal === undefined) {
      // Check case-insensitive key match
      const foundKey = Object.keys(selectedOptions).find(
        (k) => k.toLowerCase() === rule.triggerOptionCode?.toLowerCase()
      );
      if (foundKey) triggerVal = selectedOptions[foundKey];
    }

    if (triggerVal === undefined || triggerVal === null) continue;

    let isMatched = false;
    const trigLower = String(triggerVal).toLowerCase().trim();
    const ruleValLower = String(rule.triggerValueCode || '').toLowerCase().trim();

    if (!rule.operator || rule.operator === 'EQUALS') {
      isMatched = trigLower === ruleValLower || trigLower.includes(ruleValLower);
    } else if (rule.operator === 'NOT_EQUALS') {
      isMatched = trigLower !== ruleValLower;
    } else if (rule.operator === 'IN') {
      const candidates = ruleValLower.split(',').map((c) => c.trim());
      isMatched = candidates.some((c) => trigLower === c || trigLower.includes(c));
    }

    if (isMatched) {
      const targetOpt = rule.targetOptionCode;
      if (rule.action === 'HIDE_TARGET') {
        if (!hiddenOptions.includes(targetOpt)) {
          hiddenOptions.push(targetOpt);
        }
        if (selectedOptions[targetOpt]) {
          activeViolations.push({
            ruleName: rule.ruleName,
            reason: rule.reason || `Option "${targetOpt}" is hidden when "${rule.triggerOptionCode}" is "${triggerVal}".`,
          });
        }
      } else if (rule.action === 'DISABLE_TARGET') {
        if (!disabledOptionValues[targetOpt]) {
          disabledOptionValues[targetOpt] = [];
        }
        if (rule.targetValueCode) {
          const targetValLower = String(rule.targetValueCode).toLowerCase().trim();
          disabledOptionValues[targetOpt].push(rule.targetValueCode);

          // Check if customer selected this disabled value
          const selTargetVal = selectedOptions[targetOpt];
          if (selTargetVal && String(selTargetVal).toLowerCase().trim() === targetValLower) {
            activeViolations.push({
              ruleName: rule.ruleName,
              reason: rule.reason || `Value "${selTargetVal}" is not compatible with "${triggerVal}".`,
            });
          }
        } else {
          // Entire target option is disabled
          if (selectedOptions[targetOpt]) {
            activeViolations.push({
              ruleName: rule.ruleName,
              reason: rule.reason || `Option "${targetOpt}" is unavailable when "${rule.triggerOptionCode}" is "${triggerVal}".`,
            });
          }
        }
      }
    }
  }

  return {
    disabledOptionValues,
    hiddenOptions,
    isCompatible: activeViolations.length === 0,
    activeViolations,
  };
}

export function calculatePricing({
  product,
  quantity = 100,
  selectedOptions = {}, // { "Printing Location": "Double Side", "Lamination": "Matte", "Gold Foil": "Yes" }
  designOption = 'No Thank You', // 'Yes Please' | 'No Thank You'
  artworkOption = null, // 'PRINT_READY_FILE' | 'DESIGN_SUPPORT'
  designPackage = null, // Object { id, name, packageName, basePrice, doubleSidePrice, customPrice, customDoubleSidePrice } or number
  selectedAddons = [], // Array of addon objects [{ id, name, price }]
  gstRate = 18,
  shippingThreshold = 1500,
  defaultShipping = 80,
}) {
  if (!product) {
    return {
      isAvailable: false,
      unavailableReason: 'Product not found',
      quantity: 0,
      basePrice: 0,
      subtotal: 0,
      grandTotal: 0,
    };
  }

  const qty = parseInt(quantity, 10) || product.minQuantity || 100;
  const isDoubleSide = checkIsDoubleSide(selectedOptions);

  const isPrintReady = !designPackage && (artworkOption === 'PRINT_READY_FILE' || (!artworkOption && (designOption === 'No Thank You' || designOption === 'UPLOAD')));
  const needDesign = !isPrintReady && (
    artworkOption === 'DESIGN_SUPPORT' ||
    designOption === 'Yes Please' ||
    designOption === 'DESIGN_SERVICE' ||
    designOption === true ||
    Boolean(designPackage)
  );

  // Single Side vs Double Side Design Fee Defaults
  const defaultSingleSideDesign = product.singleSideDesignCharge || 200;
  const defaultDoubleSideDesign = product.doubleSideDesignCharge || 400;

  let basePrice = 0;
  let basePackageFee = 0;
  let resolvedDesignPackage = null;

  if (needDesign) {
    if (designPackage) {
      if (typeof designPackage === 'object') {
        resolvedDesignPackage = designPackage;
        const singleCharge = parseFloat(
          designPackage.customPrice ??
          designPackage.basePrice ??
          designPackage.designCharge ??
          0
        );
        const doubleCharge = parseFloat(
          designPackage.customDoubleSidePrice ??
          designPackage.doubleSidePrice ??
          designPackage.doubleSideDesignCharge ??
          (singleCharge > 0 ? singleCharge * 2 : defaultDoubleSideDesign)
        );
        basePackageFee = isDoubleSide ? doubleCharge : singleCharge;
      } else if (typeof designPackage === 'number') {
        basePackageFee = designPackage;
      }
    } else {
      basePackageFee = isDoubleSide ? defaultDoubleSideDesign : defaultSingleSideDesign;
    }
  }

  // Calculate selected design addons
  let designAddonsFee = 0;
  const appliedDesignAddons = [];
  if (needDesign && Array.isArray(selectedAddons) && selectedAddons.length > 0) {
    for (const addon of selectedAddons) {
      if (!addon) continue;
      const fee = parseFloat(addon.price) || 0;
      designAddonsFee += fee;
      appliedDesignAddons.push({
        id: addon.id,
        name: addon.name,
        price: fee,
      });
    }
  }

  const totalDesignServiceFee = Math.round(basePackageFee + designAddonsFee);
  let designFee = totalDesignServiceFee; // For backwards compatibility

  // Compatibility Rule Verification
  const compatibility = evaluateCompatibilityRules({ product, selectedOptions });
  let isAvailable = compatibility.isCompatible;
  let unavailableReason = compatibility.isCompatible ? '' : (compatibility.activeViolations[0]?.reason || 'Selected options are not compatible.');
  let pricingMethod = 'SLABS'; // 'MATRIX' | 'COMBINATION' | 'SLABS' | 'CUSTOM_UNIT'

  // =========================================================================
  // METHOD A: DYNAMIC PRICING MATRIX & COMBINATIONS
  // =========================================================================
  const matrices = (product.pricingMatrices && product.pricingMatrices.length > 0)
    ? product.pricingMatrices
    : (product.combinations || []);

  if (matrices.length > 0) {
    pricingMethod = product.pricingMatrices?.length > 0 ? 'MATRIX' : 'COMBINATION';

    // Parse options for core configuration dimensions
    const coreOptions = (product.optionMappings && product.optionMappings.length > 0)
      ? product.optionMappings.filter((opt) => !opt.isAddon && opt.isEnabled)
      : (product.options || []).filter((opt) => !opt.isAddon);

    // Find combination or matrix entry matching current quantity and all core options
    const matchedCombination = matrices.find((comb) => {
      if (comb.quantity !== qty) return false;

      let combOptions = {};
      try {
        combOptions = typeof comb.optionsJson === 'string' ? JSON.parse(comb.optionsJson) : (comb.optionsJson || {});
      } catch (e) {
        combOptions = {};
      }

      // Every core option in combOptions must match selectedOptions
      for (const [key, val] of Object.entries(combOptions)) {
        if (selectedOptions[key] && selectedOptions[key] !== val) {
          return false;
        }
      }

      // Also check if any core option defined on product is missing in combOptions
      for (const opt of coreOptions) {
        const optName = opt.customLabel || opt.master?.name || opt.optionName;
        if (combOptions[optName] && selectedOptions[optName] !== combOptions[optName]) {
          return false;
        }
      }

      return true;
    });

    if (matchedCombination) {
      if (matchedCombination.isAvailable === false) {
        isAvailable = false;
        unavailableReason = 'This configuration is currently unavailable. Please select another option.';
      } else {
        basePrice = matchedCombination.price;
      }
    } else if (product.pricingType === 'CONFIGURATION' || product.pricingType === 'MATRIX') {
      // If product strictly mandates matrix pricing
      isAvailable = false;
      unavailableReason = 'This exact configuration is not listed. Please choose another combination.';
    }
  }

  // =========================================================================
  // METHOD B: VOLUME SLABS & CUSTOM QUANTITY PRICING
  // Used if no combination matrix was matched or defined
  // =========================================================================
  let matchedSlab = null;
  if (!basePrice && (pricingMethod !== 'MATRIX' && pricingMethod !== 'COMBINATION' || matrices.length === 0)) {
    const hasSlabs = product.priceSlabs && product.priceSlabs.length > 0;

    if (hasSlabs) {
      pricingMethod = 'SLABS';
      const sortedSlabs = [...product.priceSlabs].sort((a, b) => a.minQty - b.minQty);
      matchedSlab = sortedSlabs.find(
        (s) => qty >= s.minQty && (s.maxQty === null || qty <= s.maxQty)
      );

      // If exact slab matched
      if (matchedSlab && matchedSlab.minQty === qty) {
        if (isDoubleSide && matchedSlab.doubleSidePrice > 0) {
          basePrice = matchedSlab.doubleSidePrice;
        } else if (matchedSlab.singleSidePrice > 0) {
          basePrice = matchedSlab.singleSidePrice;
        } else {
          basePrice = matchedSlab.unitPrice * qty;
        }
      } else {
        // Custom Quantity or In-Between Slabs
        if (product.customUnitPrice && product.customUnitPrice > 0) {
          pricingMethod = 'CUSTOM_UNIT';
          basePrice = Math.round(product.customUnitPrice * qty * (isDoubleSide ? 1.35 : 1.0));
        } else {
          // Nearest volume slab unit interpolation
          const nearestSlab = sortedSlabs.slice().reverse().find((s) => qty >= s.minQty) || sortedSlabs[0];
          const slabBase = isDoubleSide && nearestSlab.doubleSidePrice > 0
            ? nearestSlab.doubleSidePrice
            : nearestSlab.singleSidePrice || (nearestSlab.unitPrice * nearestSlab.minQty);
          const perUnit = slabBase / nearestSlab.minQty;
          basePrice = Math.round(perUnit * qty);
        }
      }
    } else if (product.customUnitPrice && product.customUnitPrice > 0) {
      // Product configured with direct custom unit rate (e.g. Banners, Stickers per sq.ft)
      pricingMethod = 'CUSTOM_UNIT';
      basePrice = Math.round(product.customUnitPrice * qty * (isDoubleSide ? 1.35 : 1.0));
    } else {
      // Basic starting price fallback
      pricingMethod = 'STARTING_PRICE';
      let unit = product.startingPrice || 100;
      if (qty > 100) {
        unit = (unit / 100) * qty;
      }
      if (isDoubleSide) {
        unit = unit * 1.35;
      }
      basePrice = Math.round(unit);
    }
  }

  // Design Support Charge
  designFee = needDesign ? totalDesignServiceFee : 0;

  // =========================================================================
  // METHOD C: OPTIONAL FINISHING & ADD-ON PRICING
  // Supports both new ProductOptionMapping and legacy ProductOption
  // =========================================================================
  let optionSurcharges = 0;
  const appliedModifiers = [];
  const appliedAddons = [];

  if (product.optionMappings && Array.isArray(product.optionMappings) && product.optionMappings.length > 0) {
    for (const mapping of product.optionMappings) {
      if (!mapping.isEnabled) continue;
      const optName = mapping.customLabel || mapping.master?.name || mapping.master?.code;
      const selectedVal = selectedOptions[optName] || selectedOptions[mapping.master?.code];
      if (selectedVal && mapping.valueMappings) {
        const matchedVal = mapping.valueMappings.find(
          (vm) => vm.customLabel === selectedVal || vm.masterValue?.label === selectedVal || vm.masterValue?.code === selectedVal
        );
        if (matchedVal && matchedVal.priceModifierValue > 0) {
          // If option is a core printing side handled by slabs, skip duplicate surcharge
          if (
            (optName === 'Printing Location' || optName === 'Sides' || optName === 'Printing') &&
            product.priceSlabs?.length > 0 &&
            pricingMethod === 'SLABS'
          ) {
            continue;
          }

          let addedAmount = 0;
          if (matchedVal.priceModifierType === 'PERCENT') {
            addedAmount = (basePrice * matchedVal.priceModifierValue) / 100;
          } else if (matchedVal.priceModifierType === 'PER_UNIT') {
            addedAmount = matchedVal.priceModifierValue * qty;
          } else {
            // FLAT modifier: For large volume orders, flat finishing scales proportionally
            if (qty >= 1000 && matchedVal.priceModifierValue >= 100) {
              const scaleFactor = qty / 500;
              addedAmount = matchedVal.priceModifierValue * Math.min(scaleFactor, 2.5);
            } else {
              addedAmount = matchedVal.priceModifierValue;
            }
          }

          addedAmount = Math.round(addedAmount);
          optionSurcharges += addedAmount;

          const modItem = {
            optionName: optName,
            valueLabel: matchedVal.customLabel || matchedVal.masterValue?.label || selectedVal,
            modifierType: matchedVal.priceModifierType,
            modifierValue: matchedVal.priceModifierValue,
            amount: addedAmount,
            isAddon: Boolean(mapping.isAddon),
          };

          appliedModifiers.push(modItem);
          if (mapping.isAddon) {
            appliedAddons.push(modItem);
          }
        }
      }
    }
  } else if (product.options && Array.isArray(product.options)) {
    for (const opt of product.options) {
      const selectedVal = selectedOptions[opt.optionName];
      if (selectedVal && opt.values) {
        const matchedVal = opt.values.find((v) => v.valueLabel === selectedVal);
        if (matchedVal && matchedVal.priceModifierValue > 0) {
          if (
            (opt.optionName === 'Printing Location' || opt.optionName === 'Sides' || opt.optionName === 'Printing') &&
            product.priceSlabs?.length > 0 &&
            pricingMethod === 'SLABS'
          ) {
            continue;
          }

          let addedAmount = 0;
          if (matchedVal.priceModifierType === 'PERCENT') {
            addedAmount = (basePrice * matchedVal.priceModifierValue) / 100;
          } else if (matchedVal.priceModifierType === 'PER_UNIT') {
            addedAmount = matchedVal.priceModifierValue * qty;
          } else {
            if (qty >= 1000 && matchedVal.priceModifierValue >= 100) {
              const scaleFactor = qty / 500;
              addedAmount = matchedVal.priceModifierValue * Math.min(scaleFactor, 2.5);
            } else {
              addedAmount = matchedVal.priceModifierValue;
            }
          }

          addedAmount = Math.round(addedAmount);
          optionSurcharges += addedAmount;

          const modItem = {
            optionName: opt.optionName,
            valueLabel: matchedVal.valueLabel,
            modifierType: matchedVal.priceModifierType,
            modifierValue: matchedVal.priceModifierValue,
            amount: addedAmount,
            isAddon: !!opt.isAddon,
          };

          appliedModifiers.push(modItem);
          if (opt.isAddon) {
            appliedAddons.push(modItem);
          }
        }
      }
    }
  }

  const productPrice = isAvailable ? Math.round(basePrice + optionSurcharges) : 0;
  const subtotal = isAvailable ? Math.round(productPrice + designFee) : 0;

  // Shipping Calculation
  const shipping = isAvailable && (subtotal >= shippingThreshold || subtotal === 0) ? 0 : defaultShipping;

  // Tax Calculation (GST)
  const taxRate = parseFloat(gstRate) || 18;
  const totalTax = isAvailable ? Math.round((subtotal * taxRate) / 100) : 0;
  const cgst = Math.round(totalTax / 2);
  const sgst = totalTax - cgst;
  const igst = 0;

  const grandTotal = isAvailable ? subtotal + shipping : 0;
  const unitPrice = isAvailable && grandTotal > 0 && qty > 0 ? (grandTotal / qty).toFixed(2) : '0.00';

  return {
    isAvailable,
    unavailableReason,
    pricingMethod,
    quantity: qty,
    unitPrice,
    basePrice,
    productPrice,
    designFee, // total design fee
    basePackageFee, // base package rate
    designAddonsFee, // selected add-ons rate
    totalDesignServiceFee, // package + add-ons
    appliedDesignAddons,
    designPackageName: resolvedDesignPackage
      ? `${resolvedDesignPackage.packageName || resolvedDesignPackage.name || 'Design Package'} (${isDoubleSide ? 'Double Side: Front + Back' : 'Single Side'})`
      : (basePackageFee > 0 ? (isDoubleSide ? 'Double Side Custom Design' : 'Single Side Custom Design') : null),
    optionSurcharges,
    appliedModifiers,
    appliedAddons,
    subtotal,
    shipping,
    taxRate,
    totalTax,
    cgst,
    sgst,
    igst,
    grandTotal,
    compatibility,
    breakdown: {
      basePrintRate: basePrice,
      finishingAndAddons: optionSurcharges,
      designSupport: designFee,
      logistics: shipping,
      goodsAndServicesTax: totalTax,
      finalPayable: grandTotal,
    },
  };
}

export const calculateProductPrice = calculatePricing;
