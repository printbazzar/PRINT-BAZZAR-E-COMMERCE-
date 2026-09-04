import React, { useState, useEffect } from "react";
import logo from "../assets/images/logo_white.png";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { Drawer } from "flowbite-react";
import {
  HiOutlineShoppingCart,
  HiOutlineTruck,
  HiOutlineUser,
  HiOutlineMenu,
  HiOutlineViewGrid,
  HiOutlineCog,
} from "react-icons/hi";
import { MdLabelImportant, MdInsertInvitation } from "react-icons/md";
import { SiMarketo } from "react-icons/si";
import { GoPackage } from "react-icons/go";
import { FaSign, FaTshirt } from "react-icons/fa";
import { LiaAwardSolid } from "react-icons/lia";
import { IoGiftSharp, IoCardSharp } from "react-icons/io5";
import Search from "./Search";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { api } from "../services/api";

export default function Header() {
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [isOpenCat, setIsOpenCat] = useState(false);
  const [categories, setCategories] = useState([]);

  const { cartCount, setIsCartDrawerOpen } = useCart();
  const { isAuthenticated } = useAuth();
  const { customer, isAuthenticated: isCustomerLoggedIn, isCorporate } = useCustomerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getCategories()
      .then((res) => {
        if (res.success && res.data) {
          setCategories(res.data);
        }
      })
      .catch(console.error);

    const handleOpenCat = () => setIsOpenCat(true);
    window.addEventListener('open-categories-drawer', handleOpenCat);
    return () => window.removeEventListener('open-categories-drawer', handleOpenCat);
  }, []);

  const handleCategoryClick = (categorySlug) => {
    navigate(`/category/${categorySlug}`);
    setIsOpenCat(false);
    setIsOpenMenu(false);
  };

  const getCategoryIcon = (slug) => {
    if (slug.includes("card")) return IoCardSharp;
    if (slug.includes("sticker") || slug.includes("label")) return MdLabelImportant;
    if (slug.includes("market") || slug.includes("promot")) return SiMarketo;
    if (slug.includes("pack")) return GoPackage;
    if (slug.includes("sign")) return FaSign;
    if (slug.includes("award") || slug.includes("certi")) return LiaAwardSolid;
    if (slug.includes("gift")) return IoGiftSharp;
    if (slug.includes("invit")) return MdInsertInvitation;
    if (slug.includes("apparel")) return FaTshirt;
    return IoCardSharp;
  };

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* Main Spacious Corporate Header */}
      <div className="bg-black text-white py-3.5 sm:py-4 px-4 sm:px-8 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 lg:gap-8">
          {/* 1. Left: Brand Logo */}
          <div className="flex-shrink-0">
            <NavLink to="/" className="flex items-center">
              <img
                src={logo}
                alt="Print Bazzar"
                className="h-9 sm:h-11 object-contain hover:opacity-90 transition-opacity"
              />
            </NavLink>
          </div>

          {/* 2. Center: Spacious Search Bar (Desktop) */}
          <div className="hidden md:block flex-1 max-w-xl mx-auto">
            <Search />
          </div>

          {/* 3. Right: Navigation Links & Actions */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-6 text-xs sm:text-sm font-semibold text-gray-200">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? "text-yellow-400 font-bold" : "hover:text-yellow-400 transition-colors"
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/shop"
                className={({ isActive }) =>
                  isActive ? "text-yellow-400 font-bold" : "hover:text-yellow-400 transition-colors"
                }
              >
                All Products
              </NavLink>
              <NavLink
                to="/track-order"
                className={({ isActive }) =>
                  isActive
                    ? "text-yellow-400 font-bold flex items-center gap-1.5"
                    : "hover:text-yellow-400 flex items-center gap-1.5 transition-colors"
                }
              >
                <HiOutlineTruck className="w-4 h-4 text-yellow-400" />
                <span>Track Order</span>
              </NavLink>
            </nav>

            {/* Categories Drawer Button */}
            <button
              onClick={() => setIsOpenCat(true)}
              className="hidden sm:inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs"
            >
              <HiOutlineViewGrid className="w-4 h-4" />
              <span>Categories ▾</span>
            </button>

            {/* Cart Button with Counter */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2 text-white hover:text-yellow-400 transition-colors flex items-center gap-2"
              title="View Cart"
            >
              <HiOutlineShoppingCart className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="hidden xl:inline text-xs font-bold">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Customer / Corporate Portal Account Link */}
            {isCustomerLoggedIn ? (
              <Link
                to="/account/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl transition-all border border-gray-700 shadow-xs"
                title="Customer Dashboard"
              >
                <HiOutlineUser className="w-4 h-4 text-yellow-400" />
                <span className="max-w-[110px] truncate">{isCorporate ? (customer.companyName || customer.name) : customer.name}</span>
                {isCorporate && (
                  <span className="bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                    10% Off
                  </span>
                )}
              </Link>
            ) : (
              <Link
                to="/account/login"
                className="hidden sm:inline-flex items-center gap-1.5 text-gray-300 hover:text-yellow-400 font-extrabold text-xs px-2.5 py-2 rounded-xl transition-all"
              >
                <HiOutlineUser className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setIsOpenMenu(true)}
              className="lg:hidden text-white p-2 hover:text-yellow-400 focus:outline-none"
              aria-label="Open Navigation"
            >
              <HiOutlineMenu className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          </div>
        </div>
      </div>

      {/* Categories Flyout Drawer */}
      <Drawer
        open={isOpenCat}
        onClose={() => setIsOpenCat(false)}
        position="right"
        className="w-80 bg-white p-6 z-50 shadow-2xl"
      >
        <div className="flex justify-between items-center pb-4 border-b mb-4">
          <div className="flex items-center gap-2">
            <HiOutlineViewGrid className="w-5 h-5 text-yellow-500" />
            <h3 className="font-extrabold text-gray-900 text-sm tracking-wider uppercase">
              ALL CATEGORIES
            </h3>
          </div>
          <button
            onClick={() => setIsOpenCat(false)}
            className="text-gray-400 hover:text-gray-700 font-bold p-1 text-lg"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto max-h-[80vh] space-y-1 pr-1">
          {categories.map((cat) => {
            const IconComp = getCategoryIcon(cat.slug);
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.slug)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-yellow-50 hover:text-black rounded-xl transition-colors text-left"
              >
                <IconComp className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <span className="flex-1 truncate">{cat.name}</span>
                {cat._count?.products > 0 && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                    {cat._count.products}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Drawer>

      {/* Mobile Navigation Drawer */}
      <Drawer
        open={isOpenMenu}
        onClose={() => setIsOpenMenu(false)}
        position="right"
        className="w-80 bg-white p-6 z-50 shadow-2xl"
      >
        <div className="flex justify-between items-center pb-4 border-b mb-4">
          <h3 className="font-bold text-gray-900 text-base">Menu & Navigation</h3>
          <button
            onClick={() => setIsOpenMenu(false)}
            className="text-gray-400 hover:text-gray-700 font-bold p-1 text-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Mobile Search Input */}
          <div className="pb-2 border-b">
            <Search />
          </div>

          <div className="space-y-1.5 text-sm font-bold text-gray-800">
            <Link
              to="/"
              onClick={() => setIsOpenMenu(false)}
              className="block py-2 px-3 hover:bg-yellow-50 rounded-xl"
            >
              Home
            </Link>
            <Link
              to="/shop"
              onClick={() => setIsOpenMenu(false)}
              className="block py-2 px-3 hover:bg-yellow-50 rounded-xl"
            >
              All Categories & Products
            </Link>
            <Link
              to="/track-order"
              onClick={() => setIsOpenMenu(false)}
              className="block py-2 px-3 bg-yellow-50 text-yellow-900 rounded-xl font-bold flex items-center justify-between"
            >
              <span>Track Live Order</span>
              <span>➔</span>
            </Link>
            <Link
              to="/cart"
              onClick={() => setIsOpenMenu(false)}
              className="block py-2 px-3 hover:bg-yellow-50 rounded-xl flex items-center justify-between"
            >
              <span>Shopping Cart</span>
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {cartCount}
              </span>
            </Link>
            <Link
              to="/about-us"
              onClick={() => setIsOpenMenu(false)}
              className="block py-2 px-3 hover:bg-yellow-50 rounded-xl"
            >
              About Us
            </Link>
            <Link
              to="/contact-us"
              onClick={() => setIsOpenMenu(false)}
              className="block py-2 px-3 hover:bg-yellow-50 rounded-xl"
            >
              Contact Us
            </Link>
            {isCustomerLoggedIn ? (
              <Link
                to="/account/dashboard"
                onClick={() => setIsOpenMenu(false)}
                className="block py-2 px-3 bg-gray-900 text-white rounded-xl font-bold text-xs"
              >
                👤 Customer Account ({isCorporate ? (customer.companyName || customer.name) : customer.name})
              </Link>
            ) : (
              <Link
                to="/account/login"
                onClick={() => setIsOpenMenu(false)}
                className="block py-2 px-3 bg-yellow-400 text-black rounded-xl font-bold text-xs"
              >
                👤 Sign In / Create Account
              </Link>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-[11px] uppercase text-gray-400 font-bold mb-2">Explore Categories</h4>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className="w-full text-left py-1.5 px-2 text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg truncate"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Drawer>
    </header>
  );
}
