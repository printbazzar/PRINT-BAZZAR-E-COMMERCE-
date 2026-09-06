import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineSparkles, HiOutlineTruck, HiOutlineShieldCheck } from 'react-icons/hi';

export default function PromoBannerBlocks() {
  const promos = [
    {
      badge: 'TOP VALUE PACK',
      badgeColor: 'bg-yellow-400 text-black',
      title: 'Bulk Visiting Cards',
      subtitle: '500 Pcs Premium 350 GSM Offset Cards starting at ₹299',
      tag: 'Matte / Gloss Lamination',
      link: '/category/business-cards',
      btnText: 'Order Cards ➔',
      bgGradient: 'from-gray-950 via-black to-gray-900',
      border: 'border-yellow-400/40',
      icon: HiOutlineSparkles,
      iconColor: 'text-yellow-400',
    },
    {
      badge: 'POPULAR CHOICE',
      badgeColor: 'bg-white text-black',
      title: 'Custom Die-Cut Stickers',
      subtitle: '100% Waterproof vinyl product labels & brand packaging stickers',
      tag: 'Any Custom Shape & Size',
      link: '/category/stickers-and-labels',
      btnText: 'Create Stickers ➔',
      bgGradient: 'from-yellow-400 via-amber-400 to-yellow-500',
      isLight: true,
      border: 'border-yellow-500',
      icon: HiOutlineShieldCheck,
      iconColor: 'text-black',
    },
    {
      badge: 'EXPRESS DESK',
      badgeColor: 'bg-yellow-400 text-black',
      title: 'Corporate Stationery',
      subtitle: 'Letterheads, Envelopes, Bill Books, ID Cards & Lanyards',
      tag: 'Trichy Same-Day Dispatch',
      link: '/category/business-essentials',
      btnText: 'Browse Office Kits ➔',
      bgGradient: 'from-gray-900 via-zinc-900 to-black',
      border: 'border-gray-800',
      icon: HiOutlineTruck,
      iconColor: 'text-yellow-400',
    },
  ];

  return (
    <section className="py-4 sm:py-6 max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {promos.map((promo, idx) => {
          const Icon = promo.icon;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 border ${promo.border} bg-gradient-to-br ${promo.bgGradient} shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs ${promo.badgeColor}`}>
                    {promo.badge}
                  </span>
                  <div className={`p-2 rounded-xl ${promo.isLight ? 'bg-black/10' : 'bg-white/10'}`}>
                    <Icon className={`w-5 h-5 ${promo.iconColor}`} />
                  </div>
                </div>

                <h3 className={`text-lg sm:text-xl font-black mb-1.5 leading-snug ${promo.isLight ? 'text-black' : 'text-white'}`}>
                  {promo.title}
                </h3>
                <p className={`text-xs leading-relaxed font-medium mb-3 ${promo.isLight ? 'text-gray-800' : 'text-gray-300'}`}>
                  {promo.subtitle}
                </p>

                <div className="inline-block">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    promo.isLight
                      ? 'bg-black/10 text-black border-black/20'
                      : 'bg-white/10 text-yellow-300 border-white/10'
                  }`}>
                    {promo.tag}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <Link
                  to={promo.link}
                  className={`inline-flex items-center gap-1.5 text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-transform active:scale-95 ${
                    promo.isLight
                      ? 'bg-black text-white hover:bg-gray-900'
                      : 'bg-yellow-400 text-black hover:bg-yellow-500'
                  }`}
                >
                  {promo.btnText}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
