import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineViewGrid,
  HiOutlineSearch,
  HiOutlineShoppingCart,
  HiOutlineUser,
} from 'react-icons/hi';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export default function MobileBottomNav({ onOpenCategories, onOpenSearch }) {
  const { cartCount, setIsCartDrawerOpen } = useCart();
  const { isAuthenticated, customer, isCorporate } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isShop = location.pathname.startsWith('/shop') || location.pathname.startsWith('/category');
  const isAccount = location.pathname.startsWith('/account');

  // Hide generic bottom nav on checkout and invoice printing pages to give full focus to payment
  if (location.pathname === '/checkout' || location.pathname.startsWith('/invoice/')) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1 shadow-2xl transition-all"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-5 items-center justify-around text-center h-13">
        {/* 1. Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 rounded-xl transition-all min-h-[44px] ${
              isActive
                ? 'text-black font-extrabold'
                : 'text-gray-500 hover:text-gray-900 font-semibold'
            }`
          }
        >
          <div className="relative flex items-center justify-center">
            <HiOutlineHome className={`w-5 h-5 ${isHome ? 'stroke-[2.5px] text-yellow-500' : ''}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Home</span>
        </NavLink>

        {/* 2. Categories */}
        <button
          type="button"
          onClick={() => {
            if (onOpenCategories) {
              onOpenCategories();
            } else {
              window.dispatchEvent(new CustomEvent('open-categories-drawer'));
            }
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all min-h-[44px] ${
            isShop
              ? 'text-black font-extrabold'
              : 'text-gray-500 hover:text-gray-900 font-semibold'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <HiOutlineViewGrid className={`w-5 h-5 ${isShop ? 'stroke-[2.5px] text-yellow-500' : ''}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Categories</span>
        </button>

        {/* 3. Search */}
        <button
          type="button"
          onClick={onOpenSearch ? onOpenSearch : () => {
            // Target the storefront search bar's stable id directly (it is present on
            // every page this bottom nav renders on, via StorefrontLayout) instead of a
            // loose attribute match, so this reliably finds the real, visible input.
            const searchInput =
              document.getElementById('storefront-search-input') ||
              document.querySelector('input[name="search"], input[type="search"], input[placeholder*="Search"]');
            if (searchInput) {
              searchInput.focus();
              searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              navigate('/shop');
            }
          }}
          className="flex flex-col items-center justify-center py-1 rounded-xl transition-all text-gray-500 hover:text-gray-900 font-semibold min-h-[44px]"
        >
          <div className="relative flex items-center justify-center">
            <HiOutlineSearch className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Search</span>
        </button>

        {/* 4. Cart with Live Badge */}
        <button
          type="button"
          onClick={() => setIsCartDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 rounded-xl transition-all text-gray-500 hover:text-gray-900 font-semibold min-h-[44px] relative"
        >
          <div className="relative flex items-center justify-center">
            <HiOutlineShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Cart</span>
        </button>

        {/* 5. Account */}
        <NavLink
          to={isAuthenticated ? '/account/dashboard' : '/account/login'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 rounded-xl transition-all min-h-[44px] ${
              isActive || isAccount
                ? 'text-black font-extrabold'
                : 'text-gray-500 hover:text-gray-900 font-semibold'
            }`
          }
        >
          <div className="relative flex items-center justify-center">
            <HiOutlineUser className={`w-5 h-5 ${isAccount ? 'stroke-[2.5px] text-yellow-500' : ''}`} />
            {isAuthenticated && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">
            {isAuthenticated ? (isCorporate ? 'Corporate' : 'Account') : 'Sign In'}
          </span>
        </NavLink>
      </div>
    </nav>
  );
}
