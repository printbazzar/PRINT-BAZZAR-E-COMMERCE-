import React from 'react';
import { HiOutlineShieldCheck, HiOutlineCurrencyRupee, HiOutlineLightningBolt, HiOutlineSparkles } from 'react-icons/hi';

export default function TrustHighlights() {
  const highlights = [
    {
      icon: HiOutlineShieldCheck,
      title: '100% Satisfaction Guarantee',
      desc: 'High-definition industrial printing with strict quality control. If it isn’t right, we’ll reprint it.',
      color: 'text-green-500 bg-green-50',
    },
    {
      icon: HiOutlineCurrencyRupee,
      title: 'Direct Press Factory Prices',
      desc: 'Transparent pricing with massive quantity slab discounts. Direct factory rates.',
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      icon: HiOutlineLightningBolt,
      title: 'Superfast Turnaround',
      desc: 'Fast dispatch & reliable doorstep courier delivery across Tamil Nadu and all of India.',
      color: 'text-blue-500 bg-blue-50',
    },
    {
      icon: HiOutlineSparkles,
      title: 'Professional Design Support',
      desc: 'Upload ready print files or collaborate with our expert graphic designers.',
      color: 'text-purple-500 bg-purple-50',
    },
  ];

  return (
    <section className="bg-white border-y border-gray-200 py-8 my-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-start gap-3.5 p-2">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-snug">{item.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
