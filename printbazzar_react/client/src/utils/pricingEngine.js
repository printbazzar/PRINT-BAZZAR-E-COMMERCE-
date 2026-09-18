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

// Shared with the server (server/src/utils/pricingEngine.js) — kept as a duplicated but
// IDENTICAL predicate rather than a shared import, since client and server are separate
// build targets. Any option name that can flip a slab from singleSidePrice to
// doubleSidePrice is recognized as a "side" option (Task #11 fix, mirrored here in Task #15
// to close the parity gap this client copy still had — see Method C below).
export function isSideOptionKey(key) {
  const keyLower = String(key ?? '').toLowerCase();
  return (
    keyLower.includes('side') ||
    keyLower.includes('print') ||
    keyLower.includes('location') ||
    keyLower.includes('page')
  );
}

// Canonical quantity model (Task #15) — identical rule to the server's resolveQuantityModel().
// Never inferred from maxQty/slab-count/category/name; only the stored field is read.
export function resolveQuantityModel(product) {
  return product?.quantityType === 'OPEN_QUANTITY' ? 'OPEN_QUANTITY' : 'FIXED_SLAB';
}

// Identical rule to the server's isDoubleSideAvailable() — Double Side is only ever a real,
// selectable option when its configured price is genuinely higher than Single Side, never a
// generic surcharge guess.
export function isDoubleSideAvailable(slab) {
  if (!slab) return false;
  const single = Number(slab.singleSidePrice) || 0;
  const double = Number(slab.doubleSidePrice) || 0;
  return double > 0 && double > single;
}

// Task #23/#24: identical range-matching + tie-break rule as the server's
// matchFixedSlabForQuantity() (server/src/utils/pricingEngine.js) — kept as a
// duplicated but IDENTICAL function for the same reason as isSideOptionKey()
// above. See the server copy for the full rationale: Menu Card / SDC1
// open-ended-ladder real data resolves via "highest minQty wins" (does not
// reintroduce Task #12's bug); two explicitly-finite, genuinely overlapping
// ranges (Task #24 Example D) always fail safely instead, since both bounds
// were deliberately set and contradict each other; a true minQty tie among
// the remaining candidates is the final safety net.
export function matchFixedSlabForQuantity(priceSlabs, qty) {
  const candidates = (priceSlabs || []).filter(
    (s) => qty >= s.minQty && (s.maxQty === null || s.maxQty === undefined || qty <= s.maxQty)
  );
  if (candidates.length === 0) {
    return { matchedSlab: null, isConfigError: false };
  }
  if (candidates.length === 1) {
    return { matchedSlab: candidates[0], isConfigError: false };
  }
  const finiteCandidates = candidates.filter((s) => s.maxQty !== null && s.maxQty !== undefined);
  if (finiteCandidates.length >= 2) {
    return { matchedSlab: null, isConfigError: true };
  }
  const maxMinQty = Math.max(...candidates.map((s) => s.minQty));
  const tightest = candidates.filter((s) => s.minQty === maxMinQty);
  if (tightest.length > 1) {
    return { matchedSlab: null, isConfigError: true };
  }
  return { matchedSlab: tightest[0], isConfigError: false };
}

// Identical to the server's describeConfiguredRanges().
export function describeConfiguredRanges(priceSlabs) {
  return [...(priceSlabs || [])]
    .sort((a, b) => a.minQty - b.minQty)
    .map((s) => (s.maxQty !== null && s.maxQty !== undefined ? `${s.minQty}-${s.maxQty}` : `${s.minQty}+`))
    .join(', ');
}

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
    const valLower = String(val).toLowerCase();
    if (isSideOptionKey(key)) {
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
  // Task #15: this preview engine now mirrors the server's canonical, deterministic rules
  // exactly (server/src/utils/pricingEngine.js) instead of maintaining its own independent
  // interpolation/extrapolation/logarithmic-discount formulas. Those formulas are removed —
  // this is a preview of what the server WILL charge, not a second, competing pricing engine.
  if (!basePrice && isAvailable) {
    const hasSlabs = product.priceSlabs && product.priceSlabs.length > 0;

    if (hasSlabs) {
      pricingMethod = 'SLABS';
      const quantityModel = resolveQuantityModel(product);

      if (quantityModel === 'OPEN_QUANTITY') {
        const rateSlab = [...product.priceSlabs].sort((a, b) => a.minQty - b.minQty)[0];
        if (!Number.isInteger(qty) || qty < 1) {
          isAvailable = false;
          unavailableReason = 'Please enter a valid quantity (a whole number of 1 or more).';
        } else if (isDoubleSide && !isDoubleSideAvailable(rateSlab)) {
          isAvailable = false;
          unavailableReason = 'Double Side printing is not available for this product.';
        } else {
          const unitRate = isDoubleSide ? rateSlab.doubleSidePrice : rateSlab.singleSidePrice;
          if (!unitRate || unitRate <= 0) {
            isAvailable = false;
            unavailableReason = 'This product has no configured price yet.';
          } else {
            basePrice = Math.round(unitRate * qty);
          }
        }
      } else {
        // FIXED_SLAB (Task #23): range match + tie-break, mirroring the server exactly
        // — see matchFixedSlabForQuantity() above. No interpolation, no extrapolation.
        const { matchedSlab: rangeMatchedSlab, isConfigError } = matchFixedSlabForQuantity(
          product.priceSlabs,
          qty
        );
        matchedSlab = rangeMatchedSlab;
        if (isConfigError) {
          isAvailable = false;
          unavailableReason = `Quantity ${qty} is not available for this product right now due to a pricing configuration issue (overlapping quantity ranges). Please contact us so we can fix it.`;
        } else if (!matchedSlab) {
          isAvailable = false;
          const configuredRanges = describeConfiguredRanges(product.priceSlabs);
          unavailableReason = `Quantity ${qty} is not available for this product. Available quantities: ${configuredRanges}.`;
        } else if (isDoubleSide) {
          if (!isDoubleSideAvailable(matchedSlab)) {
            isAvailable = false;
            unavailableReason = 'Double Side printing is not available for this product at this quantity.';
          } else {
            basePrice = matchedSlab.doubleSidePrice;
          }
        } else if (matchedSlab.singleSidePrice > 0) {
          basePrice = matchedSlab.singleSidePrice;
        } else if (matchedSlab.unitPrice > 0) {
          basePrice = matchedSlab.unitPrice * qty;
        } else {
          isAvailable = false;
          unavailableReason = 'This product has no configured price for this quantity.';
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
          // If option is a core printing side handled by slabs, skip duplicate surcharge.
          // Uses the shared isSideOptionKey() predicate (Task #15 — this client copy still had
          // the old hardcoded three-string list that Task #11 already fixed server-side, which
          // meant the preview and the real server charge could disagree for "Print Side"-style
          // option names; now identical to the server).
          if (
            isSideOptionKey(optName) &&
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
          // Same shared predicate as the optionMappings branch above (Task #11 fix) — keeps
          // the legacy ProductOption path consistent with the new-architecture path.
          if (
            isSideOptionKey(opt.optionName) &&
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

  // Tax Calculation (GST) — Task #29 GST fix, mirrors server/src/utils/pricingEngine.js exactly.
  // `subtotal` is GST-inclusive; the taxable value and embedded tax are recovered by division,
  // not `subtotal * rate/100` (which computed an additional rate% on top of the inclusive
  // figure instead of extracting what's actually embedded in it).
  const taxRate = parseFloat(gstRate) || 18;
  const taxableAmount = isAvailable ? Math.round(subtotal / (1 + taxRate / 100)) : 0;
  const totalTax = isAvailable ? subtotal - taxableAmount : 0;
  const cgst = Math.round(totalTax / 2);
  const sgst = totalTax - cgst;
  // IGST vs CGST+SGST needs the customer's shipping state, which this preview function does
  // not receive — the authoritative intra-/inter-state split happens server-side at order
  // creation (orderController.js/posController.js). Left at 0 here by design.
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
    taxableAmount,
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

  // Determine tiers to display. Task #15: quantity chips must only ever be REAL, configured
  // ProductPriceSlab quantities — never a fabricated "standard industry tiers" ladder invented
  // from product.minQuantity, since that list could (and for single-slab products, always did)
  // include quantities the product was never actually configured to sell. FIXED_SLAB products
  // show every configured tier, however many there are (including exactly one, which previously
  // fell through to the fabricated ladder below). OPEN_QUANTITY products show no tier chips at
  // all — the caller (DynamicQuantityTierPricing) renders a plain quantity stepper for those
  // instead, per Task #15 Section 8.
  let tierQuantities = [];
  if (customTiers && Array.isArray(customTiers) && customTiers.length > 0) {
    tierQuantities = customTiers;
  } else if (resolveQuantityModel(product) === 'OPEN_QUANTITY') {
    tierQuantities = [];
  } else if (product.priceSlabs && product.priceSlabs.length > 0) {
    tierQuantities = [...product.priceSlabs].map((s) => s.minQty).sort((a, b) => a - b);
  }

  if (tierQuantities.length === 0) return [];

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

    // Task #23: chips must represent the product's real configured RANGE, not just its
    // starting quantity, now that FIXED_SLAB matching is range-based. rangeLabel is purely
    // additive/display — it does not change which quantity a click sets (still the tier's
    // minQty, per Task #23 Requirement D: FIXED_SLAB storefront selection stays chip-only,
    // no free-text/arbitrary-stepper entry — but the label must stop implying that ONLY the
    // exact minQty is valid when a real maxQty range is configured).
    const ownSlab = (product.priceSlabs || []).find((s) => s.minQty === tQty);
    const rangeLabel =
      ownSlab && ownSlab.maxQty !== null && ownSlab.maxQty !== undefined
        ? `${tQty}-${ownSlab.maxQty}`
        : `${tQty}+`;

    return {
      quantity: tQty,
      maxQty: ownSlab && ownSlab.maxQty !== null && ownSlab.maxQty !== undefined ? ownSlab.maxQty : null,
      rangeLabel,
      totalPrice: res.subtotal,
      unitPrice: res.unitPrice,
      savingsPct,
      isPopular: tQty === 1000 || (tierQuantities.length >= 4 && idx === Math.floor(tierQuantities.length / 2)),
      isBestValue: idx === tierQuantities.length - 1,
      pricing: res,
    };
  });
}

