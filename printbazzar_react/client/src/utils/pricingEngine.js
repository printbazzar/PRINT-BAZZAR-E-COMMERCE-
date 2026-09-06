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
          // Progressive discount curve on custom unit rate for higher volumes
          const volMultiplier = qty >= 5000 ? 0.65 : qty >= 2500 ? 0.75 : qty >= 1000 ? 0.85 : 1.0;
          basePrice = Math.round(product.customUnitPrice * volMultiplier * qty * (isDoubleSide ? 1.35 : 1.0));
        } else {
          // Smooth progressive interpolation across volume slabs
          let lowerSlab = null;
          let upperSlab = null;
          for (let i = 0; i < sortedSlabs.length; i++) {
            if (sortedSlabs[i].minQty <= qty) {
              lowerSlab = sortedSlabs[i];
              upperSlab = sortedSlabs[i + 1] || null;
            }
          }

          if (!lowerSlab) {
            // qty is less than first slab: unit rate based on first slab + small volume premium
            const firstSlab = sortedSlabs[0];
            const firstBase = isDoubleSide && firstSlab.doubleSidePrice > 0
              ? firstSlab.doubleSidePrice
              : (firstSlab.singleSidePrice || (firstSlab.unitPrice * firstSlab.minQty));
            const unitRate = (firstBase / firstSlab.minQty) * 1.15;
            basePrice = Math.round(unitRate * qty);
          } else if (upperSlab) {
            // qty is between lowerSlab and upperSlab: smooth interpolation ensures unit price drops as qty rises
            const lowerBase = isDoubleSide && lowerSlab.doubleSidePrice > 0
              ? lowerSlab.doubleSidePrice
              : (lowerSlab.singleSidePrice || (lowerSlab.unitPrice * lowerSlab.minQty));
            const upperBase = isDoubleSide && upperSlab.doubleSidePrice > 0
              ? upperSlab.doubleSidePrice
              : (upperSlab.singleSidePrice || (upperSlab.unitPrice * upperSlab.minQty));

            const lowerUnit = lowerBase / lowerSlab.minQty;
            const upperUnit = upperBase / upperSlab.minQty;

            const t = (qty - lowerSlab.minQty) / (upperSlab.minQty - lowerSlab.minQty);
            const interpolatedUnit = lowerUnit - t * (lowerUnit - upperUnit);
            basePrice = Math.round(interpolatedUnit * qty);
          } else {
            // qty is beyond the highest slab: award additional bulk volume efficiency
            const highestSlab = lowerSlab;
            const highestBase = isDoubleSide && highestSlab.doubleSidePrice > 0
              ? highestSlab.doubleSidePrice
              : (highestSlab.singleSidePrice || (highestSlab.unitPrice * highestSlab.minQty));
            const highestUnit = highestBase / highestSlab.minQty;
            const volumeEfficiency = Math.max(0.72, 1 - Math.log10(Math.max(1, qty / highestSlab.minQty)) * 0.18);
            const unitRate = highestUnit * volumeEfficiency;
            basePrice = Math.round(unitRate * qty);
          }
        }
      }
    } else if (product.customUnitPrice && product.customUnitPrice > 0) {
      // Product configured with direct custom unit rate (e.g. Banners, Stickers per sq.ft)
      pricingMethod = 'CUSTOM_UNIT';
      const volMultiplier = qty >= 5000 ? 0.65 : qty >= 2500 ? 0.75 : qty >= 1000 ? 0.85 : 1.0;
      basePrice = Math.round(product.customUnitPrice * volMultiplier * qty * (isDoubleSide ? 1.35 : 1.0));
    } else {
      // Progressive volume discount curve based on startingPrice
      pricingMethod = 'STARTING_PRICE';
      const baseStarting = product.startingPrice || 100;
      const baseQty = product.minQuantity || 100;
      const baseUnit = baseStarting / Math.max(1, baseQty);

      // Progressive discount curve: price per piece drops for higher quantities
      let discountMultiplier = 1.0;
      if (qty >= 5000) discountMultiplier = 0.35;
      else if (qty >= 2500) discountMultiplier = 0.44;
      else if (qty >= 1000) discountMultiplier = 0.54;
      else if (qty >= 500) discountMultiplier = 0.68;
      else if (qty >= 250) discountMultiplier = 0.82;
      else if (qty < 100) discountMultiplier = 1.15;

      const effectiveUnit = baseUnit * discountMultiplier * (isDoubleSide ? 1.35 : 1.0);
      basePrice = Math.round(effectiveUnit * qty);
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

  // Universal Paper GSM dynamic pricing modifier if not already handled by optionMappings
  const hasExplicitGsmMapping = appliedModifiers.some((m) => {
    const n = (m.optionName || '').toLowerCase();
    return n.includes('gsm') || n.includes('paper') || n.includes('stock');
  });

  if (!hasExplicitGsmMapping) {
    const gsmEntry = Object.entries(selectedOptions).find(([k]) => {
      const kl = k.toLowerCase();
      return kl.includes('gsm') || kl.includes('paper') || kl.includes('stock');
    });
    if (gsmEntry) {
      const gsmVal = String(gsmEntry[1] || '').toLowerCase();
      let perUnitGsmCost = 0;
      if (gsmVal.includes('400') || gsmVal.includes('velvet royal')) perUnitGsmCost = 1.60;
      else if (gsmVal.includes('350')) perUnitGsmCost = 1.20;
      else if (gsmVal.includes('300') || gsmVal.includes('kraft')) perUnitGsmCost = 0.90;
      else if (gsmVal.includes('250')) perUnitGsmCost = 0.60;
      else if (gsmVal.includes('170')) perUnitGsmCost = 0.40;
      else if (gsmVal.includes('130')) perUnitGsmCost = 0.25;
      else if (gsmVal.includes('120') || gsmVal.includes('alabaster')) perUnitGsmCost = 0.20;
      else if (gsmVal.includes('100') || gsmVal.includes('bond')) perUnitGsmCost = 0.10;
      else if (gsmVal.includes('80')) perUnitGsmCost = 0; // 80 GSM baseline (Included)

      if (perUnitGsmCost > 0) {
        const gsmTotalCost = Math.round(perUnitGsmCost * qty);
        optionSurcharges += gsmTotalCost;
        appliedModifiers.push({
          optionName: gsmEntry[0],
          valueLabel: gsmEntry[1],
          modifierType: 'PER_UNIT',
          modifierValue: perUnitGsmCost,
          amount: gsmTotalCost,
          isAddon: false,
        });
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

/**
 * Calculates progressive quantity tiers with per-unit price drops and savings percentages
 */
export function getQuantityTierPricing({
  product,
  selectedOptions = {},
  artworkOption = null,
  designPackage = null,
  selectedAddons = [],
  customTiers = null,
}) {
  if (!product) return [];

  // Determine tiers to display
  let tierQuantities = [];
  if (customTiers && Array.isArray(customTiers) && customTiers.length > 0) {
    tierQuantities = customTiers;
  } else if (product.priceSlabs && product.priceSlabs.length > 1) {
    tierQuantities = [...product.priceSlabs].map((s) => s.minQty).sort((a, b) => a - b);
  } else {
    // Standard industry printing tiers based on product minQuantity
    const minQ = product.minQuantity || 100;
    if (minQ >= 500) {
      tierQuantities = [500, 1000, 2000, 3000, 5000];
    } else if (minQ >= 100) {
      tierQuantities = [100, 250, 500, 1000, 2500, 5000];
    } else if (minQ >= 25) {
      tierQuantities = [25, 50, 100, 250, 500, 1000];
    } else {
      tierQuantities = [1, 5, 10, 25, 50, 100];
    }
  }

  // Calculate base tier unit price for savings comparison
  const baseQty = tierQuantities[0] || 100;
  const baseResult = calculatePricing({
    product,
    quantity: baseQty,
    selectedOptions,
    artworkOption,
    designPackage,
    selectedAddons,
  });
  const baseUnitPrice = parseFloat(baseResult.unitPrice) || (baseResult.subtotal / Math.max(1, baseQty)) || 1;

  return tierQuantities.map((tQty, idx) => {
    const res = calculatePricing({
      product,
      quantity: tQty,
      selectedOptions,
      artworkOption,
      designPackage,
      selectedAddons,
    });
    const thisUnitPrice = parseFloat(res.unitPrice) || (res.subtotal / Math.max(1, tQty)) || 0;
    const savingsPct =
      idx > 0 && baseUnitPrice > 0 && thisUnitPrice < baseUnitPrice
        ? Math.round(((baseUnitPrice - thisUnitPrice) / baseUnitPrice) * 100)
        : 0;

    return {
      quantity: tQty,
      totalPrice: res.subtotal,
      unitPrice: res.unitPrice,
      savingsPct,
      isPopular: tQty === 1000 || (tierQuantities.length >= 4 && idx === Math.floor(tierQuantities.length / 2)),
      isBestValue: idx === tierQuantities.length - 1,
      pricing: res,
    };
  });
}

