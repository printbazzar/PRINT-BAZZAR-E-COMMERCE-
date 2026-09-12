import React, { useMemo } from 'react';
import { HiCheckCircle, HiTrendingDown, HiOutlinePlus, HiOutlineMinus } from 'react-icons/hi';
import { getQuantityTierPricing, calculatePricing } from '../utils/pricingEngine';

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

  const handleStepQuantity = (delta) => {
    const minQ = product?.customQtyMin || product?.minQuantity || 50;
    const step = product?.customQtyStep || (quantity >= 1000 ? 500 : 100);
    const newQ = Math.max(minQ, quantity + delta * step);
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

      {/* Dynamic Quantity Tier Cards */}
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

              {/* Quantity */}
              <div>
                <span className="text-sm font-black block tracking-tight">
                  {tier.quantity.toLocaleString()}
                </span>
                <span className={`text-[10px] block -mt-0.5 ${isSelected ? 'text-black/80 font-bold' : 'text-gray-500'}`}>
                  {quantityUnit}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Quantity Stepper & Direct Input */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-gray-800 block">
            Custom Order Quantity
          </span>
          <span className="text-[10px] text-gray-500">
            Enter exact pieces or use quick steppers. Bulk discount applies automatically.
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleStepQuantity(-1)}
            disabled={quantity <= (product?.customQtyMin || product?.minQuantity || 50)}
            className="w-11 h-11 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Decrease Quantity"
          >
            <HiOutlineMinus className="w-3.5 h-3.5" />
          </button>

          <div className="relative">
            <input
              type="number"
              min={product?.customQtyMin || product?.minQuantity || 1}
              step={product?.customQtyStep || 50}
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
    </div>
  );
}