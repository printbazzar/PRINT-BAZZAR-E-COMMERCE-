import React from 'react';
import { HiOutlineCursorClick, HiOutlineColorSwatch, HiOutlineTruck } from 'react-icons/hi';
import { Link } from 'react-router-dom';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: HiOutlineCursorClick,
      title: 'Pick Product & Customize',
      desc: 'Select from 90+ custom print products. Choose your quantity slab, paper stock, and finishing options.',
    },
    {
      number: '02',
      icon: HiOutlineColorSwatch,
      title: 'Upload File or Request Design',
      desc: 'Attach your print-ready PDF/AI/CDR artwork, or let our professional in-house designers create custom designs for you.',
    },
    {
      number: '03',
      icon: HiOutlineTruck,
      title: 'Precision Print & Express Delivery',
      desc: 'We produce your job with high-precision digital offset machines and dispatch quickly to your doorstep.',
    },
  ];

  return (
    <section className="py-12 bg-gray-50 border-y border-gray-200 my-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs uppercase font-extrabold tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
            SIMPLE & HASSLE-FREE
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mt-3">
            How Print Bazzar Works
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            Get your business cards, packaging, stickers, and promotional merchandise printed in 3 easy steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-xs relative hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-yellow-100 text-black rounded-2xl flex items-center justify-center font-bold">
                      <Icon className="w-7 h-7 text-yellow-600" />
                    </div>
                    <span className="text-3xl font-black text-gray-200 font-mono">{step.number}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/shop"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-md transition-all"
          >
            Explore Catalog & Start Printing ➔
          </Link>
        </div>
      </div>
    </section>
  );
}
