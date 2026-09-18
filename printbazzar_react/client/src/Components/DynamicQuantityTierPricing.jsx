import React, { useMemo } from 'react';
import { HiCheckCircle, HiTrendingDown, HiOutlinePlus, HiOutlineMinus } from 'react-icons/hi';
import { getQuantityTierPricing, calculatePricing, resolveQuantityModel } from '../utils/pricingEngine';

export default function DynamicQuantityTierPricing({
  product,
  quantity,
  onQuantityChange,
  selectedOptions = {},
  artworkOption = null,
  selectedPackage = null,
  selectedAddons = [],
}) {
  const quantityUnit = product?.quantityUnit || 'Pieces';
  const singleUnitWord = quantityUnit.replace(/s$/, '').toLowerCase() || 'piece';

  // Task #15: the canonical quantity model decides the UI shape, never inferred from tier
  // count. FIXED_SLAB products only ever let the customer pick one of the configured
  // quantities below (no free-text entry — an unconfigured quantity is rejected server-side
  // per Task #15 Section 2, so it should never be typeable in the first place). OPEN_QUANTITY
  // products have no fixed tiers at all — just a plain, validated quantity stepper.
  const quantityModel = resolveQuantityModel(product);
  const isOpenQuantity = quantityModel === 'OPEN_QUANTITY';

  // Compute all volume tiers with exact unit prices and savings percentages
  const tiers = useMemo(() => {
    return getQuantityTierPricing({
      product,
      selectedOptions,
      artworkOption,
      designPackage: selectedPackage,
      selectedAddons,
    });
  }, [product, selectedOptions, artworkOption, selectedPackage, selectedAddons]);

  // Current pricing for selected quantity
  const currentPricing = useMemo(() => {
    return calculatePricing({
      product,
      quantity,
      selectedOptions,
      artworkOption,
      designPackage: selectedPackage,
      selectedAddons,
    });
  }, [product, quantity, selectedOptions, artworkOption, selectedPackage, selectedAddons]);

  // Calculate savings compared to baseline smallest tier
  const baseTier = tiers[0] || null;
  const baseUnitPrice = baseTier ? parseFloat(baseTier.unitPrice) : 0;
  const currentUnitPrice = parseFloat(currentPricing.unitPrice) || 0;

  const savingsPerUnit = baseUnitPrice > 0 && currentUnitPrice < baseUnitPrice
    ? (baseUnitPrice - currentUnitPrice).toFixed(2)
    : 0;

  const totalSaved = savingsPerUnit > 0
    ? Math.round(parseFloat(savingsPerUnit) * quantity)
    : 0;

  const savingsPercentage = baseUnitPrice > 0 && currentUnitPrice < baseUnitPrice
    ? Math.round(((baseUnitPrice - currentUnitPrice) / baseUnitPrice) * 100)
    : 0;

  // OPEN_QUANTITY products accept ANY positive integer (Task #15 Section 1) — the stepper
  // defaults to stepping by 1 unless the admin explicitly configured a larger step, rather
  // than the old 50-1000 defaults inherited from the retired custom-quantity system, which
  // would skip past perfectly valid quantities like 2 or 3.
  const openQtyMin = 1;
  const openQtyStep = product?.customQtyStep || 1;
  const handleStepQuantity = (delta) => {
    const newQ = Math.max(openQtyMin, quantity + delta * openQtyStep);
    onQuantityChange(newQ);
  };

  return (
    <div className="space-y-3.5">
      {/* Header with Live Bulk Savings Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 text-black font-extrabold text-[11px]">
            ⚡
          </span>
          <span className="font-extrabold text-xs uppercase tracking-wider text-gray-800">
            1. Quantity ({quantityUnit})
          </span>
        </div>

        {savingsPercentage > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full shadow-2xs">
            <HiTrendingDown className="w-3.5 h-3.5 text-green-600" />
            Save {savingsPercentage}% Per Unit
          </span>
        )}
      </div>

      {/* Dynamic Quantity Tier Cards — FIXED_SLAB only. OPEN_QUANTITY products have no fixed
          tiers to choose from (Task #15 Section 8); they get only the stepper below. */}
      {!isOpenQuantity && (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {tiers.map((tier) => {
          const isSelected = quantity === tier.quantity;

          return (
            <button
              key={tier.quantity}
              type="button"
              onClick={() => onQuantityChange(tier.quantity)}
              className={`relative text-center p-3 rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? 'border-yellow-400 bg-yellow-400 text-black font-extrabold shadow-sm ring-2 ring-yellow-400/50 scale-[1.02]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-800'
              }`}
            >
              {/* Savings Badge */}
              {tier.savingsPct > 0 && (
                <span
                  className={`absolute -top-2 right-1 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-2xs ${
                    isSelected ? 'bg-black text-yellow-300' : 'bg-green-600 text-white'
                  }`}
                >
                  Save {tier.savingsPct}%
                </span>
              )}

              {/* Quantity — Task #23: FIXED_SLAB tiers are now real configured RANGES
                  (e.g. "100-249" or an open-ended "2000+"), not just a starting number,
                  now that server-side matching accepts any quantity in that range. The
                  chip itself still only ever sets quantity to this tier's minQty — no
                  free-text/arbitrary-stepper entry for FIXED_SLAB (Task #23 Requirement D)
                  — this is a label-accuracy fix only, not a new input method. */}
              <div>
                <span className="text-sm font-black block tracking-tight">
                  {tier.rangeLabel || tier.quantity.toLocaleString()}
                </span>
                <span className={`text-[10px] block -mt-0.5 ${isSelected ? 'text-black/80 font-bold' : 'text-gray-500'}`}>
                  {quantityUnit}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* Quantity stepper — OPEN_QUANTITY only (Task #15 Section 8). FIXED_SLAB products offer
          no free-text entry at all: the tier cards above are the only way to pick a quantity,
          since any quantity that isn't one of those configured tiers is rejected by the server
          (Task #15 Section 2) — there is nothing left for a stepper to validly enter. */}
      {isOpenQuantity && (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-gray-800 block">
            Quantity
          </span>
          <span className="text-[10px] text-gray-500">
            {quantityUnit === 'Pairs'
              ? 'Enter the number of pairs you need.'
              : `Enter any quantity of ${quantityUnit.toLowerCase()} you need.`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleStepQuantity(-1)}
            disabled={quantity <= openQtyMin}
            className="w-11 h-11 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Decrease Quantity"
          >
            <HiOutlineMinus className="w-3.5 h-3.5" />
          </button>

          <div className="relative">
            <input
              type="number"
              min={openQtyMin}
              step={openQtyStep}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  onQuantityChange(val);
                }
              }}
              className="w-24 text-center font-black text-sm bg-white border border-gray-300 rounded-lg py-1.5 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
            />
          </div>

          <button
            type="button"
            onClick={() => handleStepQuantity(1)}
            className="w-11 h-11 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors"
            title="Increase Quantity"
          >
            <HiOutlinePlus className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-bold text-gray-500 ml-1">
            {quantityUnit}
          </span>
        </div>
      </div>
      )}
    </div>
  );
}