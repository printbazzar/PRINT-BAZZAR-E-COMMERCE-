import React from 'react';
import { HiCheckCircle, HiOutlineDocumentText, HiOutlineSparkles } from 'react-icons/hi';

/**
 * Metadata dictionary providing printing-industry specifications for common Paper GSMs
 */
const GSM_CATALOG = {
  '80': {
    weightNum: 80,
    shortBadge: '80 GSM',
    displayName: '80 GSM',
    categoryName: 'Standard Office & Economy',
    feel: 'Lightweight, crisp & smooth',
    bars: 1,
    idealFor: 'Letterheads, Invoices, Bill Books & Bulk Distribution',
    tag: 'Economical',
    defaultModifierText: 'Standard Included',
  },
  '100': {
    weightNum: 100,
    shortBadge: '100 GSM',
    displayName: '100 GSM',
    categoryName: 'Executive Bond Paper',
    feel: 'Smooth executive watermark feel',
    bars: 2,
    idealFor: 'Executive Letterheads & Formal Stationery',
    tag: 'Office Pro',
    defaultModifierText: '+₹0.10/pc',
  },
  '130': {
    weightNum: 130,
    shortBadge: '130 GSM',
    displayName: '130 GSM',
    categoryName: 'Gloss / Matte Art Paper',
    feel: 'Vibrant colors, flexible & magazine-smooth',
    bars: 2,
    idealFor: 'Flyers, Leaflets, Menu Inserts & Product Catalogs',
    tag: 'Most Popular for Flyers',
    defaultModifierText: '+₹0.25/pc',
  },
  '170': {
    weightNum: 170,
    shortBadge: '170 GSM',
    displayName: '170 GSM',
    categoryName: 'Premium Heavy Art Paper',
    feel: 'Substantial body with zero show-through',
    bars: 3,
    idealFor: 'Bi-Fold Brochures, Event Folders & High-End Menus',
    tag: 'Premium Touch',
    defaultModifierText: '+₹0.40/pc',
  },
  '250': {
    weightNum: 250,
    shortBadge: '250 GSM',
    displayName: '250 GSM',
    categoryName: 'Semi-Rigid Art Board',
    feel: 'Firm, fold-resistant & substantial',
    bars: 4,
    idealFor: 'Greeting Cards, Product Hang Tags & Table Tents',
    tag: 'Firm Cardstock',
    defaultModifierText: '+₹0.60/pc',
  },
  '300': {
    weightNum: 300,
    shortBadge: '300 GSM',
    displayName: '300 GSM',
    categoryName: 'Heavyweight Premium Card',
    feel: 'Stiff, durable & high-end luxury cardstock',
    bars: 5,
    idealFor: 'Visiting Cards, Postcards, Bookmarks & Event Badges',
    tag: 'Top Standard for Cards',
    defaultModifierText: '+₹0.90/pc',
  },
  '350': {
    weightNum: 350,
    shortBadge: '350 GSM',
    displayName: '350 GSM',
    categoryName: 'Ultra-Thick Art Board',
    feel: 'Heavyweight, zero bend & supreme rigidity',
    bars: 5,
    idealFor: 'Executive Business Cards, Wedding Cards & Luxury Tags',
    tag: 'Heavy Royal Board',
    defaultModifierText: '+₹1.20/pc',
  },
  '400': {
    weightNum: 400,
    shortBadge: '400 GSM',
    displayName: '400 GSM',
    categoryName: 'Heavy Velvet Royal Board',
    feel: 'Maximum industrial cardstock thickness',
    bars: 5,
    idealFor: 'Elite Velvet Cards & Masterpiece Keepsakes',
    tag: 'Maximum Thickness',
    defaultModifierText: '+₹1.60/pc',
  },
};

/**
 * Extracts GSM number from string (e.g. "350 GSM Premium Art Board" -> "350")
 */
function extractGsmKey(str = '') {
  const match = String(str).match(/(\d{2,3})\s*gsm/i);
  return match ? match[1] : null;
}

export default function PaperGsmSelector({
  product,
  selectedGsm,
  onSelectGsm,
  optionConfig = null,
  isAvailableFn = () => true,
}) {
  // If product has explicit value mappings from DB for GSM/Paper Stock
  const mappedValues = optionConfig?.valueMappings?.filter((vm) => vm.isEnabled !== false) || [];

  // No real DB-backed GSM/Paper Stock mapping exists for this product — render nothing rather
  // than inventing GSM options or price modifiers the server pricing system doesn't know about.
  if (mappedValues.length === 0) {
    return null;
  }

  // Build from DB mapped values with rich metadata enrichment
  const gsmItems = mappedValues.map((vm) => {
    const label = vm.customLabel || vm.masterValue?.label || '';
    const gsmKey = extractGsmKey(label) || extractGsmKey(vm.masterValue?.code);
    const meta = (gsmKey && GSM_CATALOG[gsmKey]) || {
      weightNum: parseInt(gsmKey, 10) || 150,
      shortBadge: gsmKey ? `${gsmKey} GSM` : label,
      displayName: label,
      categoryName: 'Commercial Paper Stock',
      feel: 'Standard commercial printing stock',
      bars: 3,
      idealFor: 'Commercial Printing & Marketing Collateral',
      tag: null,
      defaultModifierText: vm.priceModifierValue > 0
        ? `+₹${vm.priceModifierValue}`
        : 'Standard',
    };

    const modifierText = vm.priceModifierValue > 0
      ? `+${vm.priceModifierType === 'PERCENT' ? `${vm.priceModifierValue}%` : `₹${vm.priceModifierValue}`}`
      : meta.defaultModifierText;

    return {
      id: vm.id,
      valueLabel: label,
      gsmKey,
      shortBadge: meta.shortBadge,
      displayName: label,
      categoryName: meta.categoryName,
      feel: meta.feel,
      bars: meta.bars,
      idealFor: meta.idealFor,
      tag: meta.tag,
      modifierText,
    };
  });

  // Find currently active item
  const activeItem = gsmItems.find((item) => {
    if (!selectedGsm) return false;
    if (item.valueLabel === selectedGsm) return true;
    const itemGsm = extractGsmKey(item.valueLabel) || item.gsmKey;
    const selGsm = extractGsmKey(selectedGsm);
    return itemGsm && selGsm && itemGsm === selGsm;
  }) || gsmItems[0];

  return (
    <div className="space-y-3">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 text-black font-extrabold text-[11px]">
            <HiOutlineDocumentText className="w-3.5 h-3.5" />
          </span>
          <span className="font-extrabold text-xs text-gray-800 uppercase tracking-wider">
            Paper Weight & GSM Specification
          </span>
          <span className="text-red-500 font-bold text-xs">*</span>
        </div>
        {activeItem && (
          <span className="text-xs font-extrabold text-purple-800 bg-purple-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <HiOutlineSparkles className="w-3.5 h-3.5 text-purple-600" />
            Selected: {activeItem.shortBadge}
          </span>
        )}
      </div>

      <p className="text-[11px] text-gray-500">
        Choose your desired paper thickness and weight. Higher GSM offers greater rigidity and luxurious hand-feel.
      </p>

      {/* Interactive GSM Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {gsmItems.map((item) => {
          const isSelected = activeItem?.id === item.id || activeItem?.valueLabel === item.valueLabel;
          const available = isAvailableFn(item.valueLabel);

          return (
            <button
              key={item.id}
              type="button"
              disabled={!available}
              onClick={() => onSelectGsm(item.valueLabel)}
              className={`relative text-left p-3.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
                !available
                  ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200'
                  : isSelected
                  ? 'border-yellow-400 bg-yellow-50/70 ring-2 ring-yellow-400 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-yellow-300 hover:bg-gray-50/50'
              }`}
            >
              {/* Optional Top Tag */}
              {item.tag && (
                <span
                  className={`absolute -top-2 right-3 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs ${
                    isSelected
                      ? 'bg-yellow-400 text-black'
                      : 'bg-gray-800 text-white'
                  }`}
                >
                  {item.tag}
                </span>
              )}

              {/* Weight Badge & Checkmark */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-base font-black text-gray-900 tracking-tight block">
                    {item.shortBadge}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-700 block leading-tight">
                    {item.categoryName}
                  </span>
                </div>

                <div className="mt-0.5">
                  {isSelected ? (
                    <HiCheckCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                </div>
              </div>

              {/* Thickness Meter & Feel */}
              <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span className="font-medium">Thickness:</span>
                  <div className="flex items-center gap-1" title={`${item.bars} / 5 Rigidity`}>
                    {[1, 2, 3, 4, 5].map((b) => (
                      <span
                        key={b}
                        className={`w-2.5 h-1.5 rounded-xs transition-colors ${
                          b <= item.bars
                            ? isSelected
                              ? 'bg-yellow-500'
                              : 'bg-gray-700'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-gray-600 line-clamp-2 leading-tight">
                  {item.feel}
                </p>

                {/* Surcharge / Included Tag */}
                <div className="pt-1 flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">Rate:</span>
                  <span className={`font-bold ${item.modifierText.includes('+') ? 'text-red-600' : 'text-green-700'}`}>
                    {item.modifierText}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected GSM Real-Time Tactile Advisory */}
      {activeItem && (
        <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 flex items-start gap-2">
          <span className="text-base leading-none">📋</span>
          <div>
            <span className="font-bold text-gray-900">Recommended Application: </span>
            <span>{activeItem.idealFor}</span>
          </div>
        </div>
      )}
    </div>
  );
}