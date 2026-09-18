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

// An option "name" (display label, customLabel, or OptionMaster name) is treated as a
// printing-side option if it contains any of these keywords. This single predicate is the
// ONLY definition of "this is a side option" anywhere in the pricing engine — it is reused
// both to detect double-side selections (checkIsDoubleSide) and, further below, to decide
// whether a side option's price is already fully embedded in a matched ProductPriceSlab row
// (and must therefore NOT also be charged again as a separate option surcharge). Keeping a
// single shared predicate, instead of two independently-maintained lists, is what fixes the
// SDC1 bug (Task #11 Part 1): the surcharge-skip guard previously matched only the exact
// strings "Printing Location" / "Sides" / "Printing" and missed "Print Side" (SDC1's option
// name), causing SDC1's double-side slab price to be charged the double-side surcharge a
// second time. Any option name that satisfies this predicate now behaves consistently in
// both places.
export function isSideOptionKey(key) {
  const keyLower = String(key ?? '').toLowerCase();
  return (
    keyLower.includes('side') ||
    keyLower.includes('print') ||
    keyLower.includes('location') ||
    keyLower.includes('page')
  );
}

// Canonical quantity model (Task #15). Product.quantityType now carries one of exactly two
// explicit values for any product priced via ProductPriceSlab: 'OPEN_QUANTITY' or 'FIXED_SLAB'.
// This is NEVER inferred from maxQty/slab-count/category/name — only the stored field is read,
// and anything other than the literal string 'OPEN_QUANTITY' is treated as 'FIXED_SLAB' (this
// also covers products still holding a pre-Task-#15 legacy value — FIXED/CUSTOM/BOTH — until
// the prepared-but-not-yet-applied migration sets every product's value explicitly; see
// docs/task15-canonical-pricing-implementation.md).
export function resolveQuantityModel(product) {
  return product?.quantityType === 'OPEN_QUANTITY' ? 'OPEN_QUANTITY' : 'FIXED_SLAB';
}

// A slab genuinely supports Double Side only if its own doubleSidePrice is a real, distinct,
// higher configured price — never a generic +₹50/+₹100 modifier, and never just "double side
// happens to equal single side because no one configured it separately" (Task #15 Section 3 /
// Section 12 — this is the general rule that makes Chromo Art Sticker single-side-only without
// a hardcoded product/SKU check: its slab has singleSidePrice === doubleSidePrice === ₹25, so
// this returns false for it and for every other product where side pricing was never really
// differentiated, exactly like the business decision requires).
export function isDoubleSideAvailable(slab) {
  if (!slab) return false;
  const single = Number(slab.singleSidePrice) || 0;
  const double = Number(slab.doubleSidePrice) || 0;
  return double > 0 && double > single;
}

// =========================================================================
// TASK #23: FIXED_SLAB now matches a QUANTITY RANGE, not an exact quantity —
// a locked business-rule change that supersedes Task #15's original
// exact-minQty-only matching. A slab is a candidate for a given qty when
// `qty >= slab.minQty AND (slab.maxQty is null/undefined OR qty <= slab.maxQty)`.
//
// When more than one configured slab is a candidate for the same qty — the
// common case for an "open-ended ladder" of tiers, where every row's maxQty
// is null/undefined and each tier is implicitly bounded above only by the
// NEXT tier's minQty (this is real production data: Menu Card's two slabs
// are minQty=1/maxQty=null and minQty=25/maxQty=null; SDC1's five slabs are
// all maxQty=null at minQty 100/200/300/500/1000) — the slab with the
// HIGHEST minQty among the candidates is the correct, most-specific match.
// This is the ordinary "highest threshold not exceeded" rule used by any
// tiered/volume pricing system, and it is what lets qty=1000 resolve to the
// 1000+ tier rather than to every lower tier that also technically "covers"
// it. It does NOT reintroduce Task #12's original bug (an ascending `.find`
// that degraded to always picking the LOWEST tier whenever 2+ slabs shared
// maxQty=NULL) — this explicitly picks the opposite, most-specific end, and
// is deterministic for every ladder shape.
//
// Task #24 verification refined this further, after Example D exposed a real gap:
// two slabs that are BOTH explicitly, finitely bounded (a real maxQty on each) and
// whose ranges genuinely intersect (e.g. 1-100 and 50-200) are a real admin
// data-entry contradiction — each boundary was deliberately set, and they conflict
// — and must fail safely, never resolve to either one. That is different from an
// open-ended ladder tier (maxQty left null, relying on "the next tier begins" as
// its implicit upper bound), where only ONE side of the overlap is ever explicit;
// there, the highest-minQty candidate is unambiguous and correct. So: if two or
// more candidates each have an explicit, finite maxQty, it is always a config
// error, regardless of minQty. Otherwise (at most one candidate is finitely
// bounded — the rest are open-ended ladder tiers), resolve to the
// highest-minQty candidate; a genuine minQty tie among THAT set is still a
// config error (the original Task #23 rule, kept as the final safety net).
// =========================================================================
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
    // Two or more explicitly-bounded ranges genuinely intersect — a real
    // configuration contradiction. Never silently pick one.
    return { matchedSlab: null, isConfigError: true };
  }
  const maxMinQty = Math.max(...candidates.map((s) => s.minQty));
  const tightest = candidates.filter((s) => s.minQty === maxMinQty);
  if (tightest.length > 1) {
    return { matchedSlab: null, isConfigError: true };
  }
  return { matchedSlab: tightest[0], isConfigError: false };
}

// Renders the configured slabs as a human-readable range list for rejection
// messages, e.g. "1-24, 25+" or "100-249, 250-499, 500+" — never a fabricated
// list of individual quantities.
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
  if (!basePrice && isAvailable) {
    const hasSlabs = product.priceSlabs && product.priceSlabs.length > 0;

    if (hasSlabs) {
      pricingMethod = 'SLABS';
      const quantityModel = resolveQuantityModel(product);

      // =====================================================================
      // CANONICAL QUANTITY PRICING (Task #15). Exactly two deterministic
      // models, explicit per product via Product.quantityType. No fallback
      // of any kind exists in this branch any more: no nearest-slab search,
      // no maxQty-based matching (Task #12's root cause — an ascending
      // `.find` degrading to "always the lowest tier" whenever 2+ slabs
      // share maxQty=NULL — cannot happen here because maxQty is no longer
      // read at all), no interpolation, no extrapolation, no custom-unit-
      // price override, no double-side surcharge guesswork.
      // =====================================================================
      if (quantityModel === 'OPEN_QUANTITY') {
        // The canonical per-unit rate is the lowest-minQty slab's own
        // singleSidePrice/doubleSidePrice. Every configured OPEN_QUANTITY
        // product today has exactly one such row at minQty=1 (Task #13/#14
        // confirmed this for all 10 named products), so "the price AT
        // quantity 1" and "the per-unit rate" are the same stored number —
        // nothing is computed or guessed, it is read directly.
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
        // FIXED_SLAB (Task #23): the customer's quantity must fall within a
        // configured slab's [minQty, maxQty] range — see matchFixedSlabForQuantity()
        // above for the full range-matching + tie-break rule. Anything outside
        // every configured range, or a genuinely ambiguous (duplicate-minQty)
        // configuration, is rejected — never silently priced from another tier,
        // never interpolated, never extrapolated.
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
          // If option is a core printing side handled by slabs, skip duplicate surcharge.
          // Uses the same isSideOptionKey() predicate as checkIsDoubleSide() above, so any
          // option name that can flip a slab from singleSidePrice to doubleSidePrice (e.g.
          // "Printing Location", "Print Side", "Sides", "Printing") is recognized here too,
          // instead of relying on a hardcoded list of exact display names (Task #11 fix).
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

  const productPrice = isAvailable ? Math.round(basePrice + optionSurcharges) : 0;
  const subtotal = isAvailable ? Math.round(productPrice + designFee) : 0;

  // Shipping Calculation
  const shipping = isAvailable && (subtotal >= shippingThreshold || subtotal === 0) ? 0 : defaultShipping;

  // Tax Calculation (GST) — Task #29 GST fix.
  // `subtotal` is a GST-INCLUSIVE customer-facing price (grandTotal below adds only
  // shipping to it, never tax, confirming this has always been the intended meaning).
  // The correct way to recover the GST-exclusive taxable value and the tax amount
  // actually embedded in an inclusive price is division, not `subtotal * rate/100`
  // (that formula computes what an ADDITIONAL rate% would be on top of the inclusive
  // figure, which is a larger number than the tax actually embedded in it, and made
  // every stored totalTax/cgst/sgst figure overstate reality — e.g. it returned ~21
  // for a ₹118-inclusive line at 18% instead of the correct ₹18).
  const taxRate = parseFloat(gstRate) || 18;
  const taxableAmount = isAvailable ? Math.round(subtotal / (1 + taxRate / 100)) : 0;
  const totalTax = isAvailable ? subtotal - taxableAmount : 0;
  const cgst = Math.round(totalTax / 2);
  const sgst = totalTax - cgst;
  // IGST vs CGST+SGST depends on intra-/inter-state, which requires the customer's
  // shipping state — not available to this per-item function. Left at 0 here by
  // design; orderController.js/posController.js compute the real intra-/inter-state
  // split at the order level, where shippingAddress.state is known (Task #29).
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
