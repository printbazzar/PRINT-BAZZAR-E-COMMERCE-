import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Breadcrumb } from 'flowbite-react';
import { HiHome, HiTrash, HiOutlineShoppingBag, HiArrowRight, HiOutlinePencil } from 'react-icons/hi';
import { useCart } from '../context/CartContext';
import Feedback from '../Components/Feedback';
import { computeInclusiveGstBreakdown } from '../utils/gstDisplay';

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, cartSubtotal, cartShipping, cartGrandTotal, clearCart } = useCart();
  const navigate = useNavigate();
  // Task #30: cartSubtotal is GST-inclusive; the breakdown below must divide, not
  // multiply, to recover what's actually embedded in it (see gstDisplay.js).
  const gstBreakdown = computeInclusiveGstBreakdown(cartSubtotal, 18);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border rounded-2xl p-12 shadow-sm">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
            <HiOutlineShoppingBag className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Shopping Cart is Empty</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            You have no items in your print order cart. Explore our products and configure your custom printing job.
          </p>
          <Button
            as={Link}
            to="/shop"
            color="dark"
            className="bg-black hover:bg-yellow-400 hover:text-black font-bold mx-auto px-6 py-2"
          >
            Explore Categories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-28 lg:pb-8">
      <Breadcrumb className="text-sm mb-6">
        <Breadcrumb.Item icon={HiHome}>
          <Link to="/" className="hover:underline">Home</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Shopping Cart</Breadcrumb.Item>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Shopping Cart ({cartItems.length})</h1>
        <button onClick={clearCart} className="text-sm text-red-600 hover:underline">
          Clear Entire Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {cartItems.map((item) => (
            <div key={item.cartItemId} className="bg-white border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row gap-5 items-start">
              <img
                src={item.product?.thumbnailUrl || '/default-image.png'}
                alt={item.product?.name}
                className="w-24 h-24 object-contain p-1.5 bg-[#f8f9fa] rounded-xl border border-gray-200 flex-shrink-0"
              />
              <div className="flex-1 w-full">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{item.product?.name}</h3>
                    <p className="text-xs text-gray-500 font-medium">SKU: {item.product?.sku}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/product/${item.product?.slug}`}
                      state={{ editCartItem: item }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition shadow-2xs"
                      title="Edit this configuration"
                    >
                      <HiOutlinePencil className="w-3.5 h-3.5" /> Edit Config
                    </Link>
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition"
                      title="Remove item"
                      aria-label={`Remove ${item.product?.name || 'item'} from cart`}
                    >
                      <HiTrash className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Options Chips */}
                {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(item.selectedOptions).map(([key, val]) => (
                      <span key={key} className="text-xs bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded">
                        {key}: {val}
                      </span>
                    ))}
                  </div>
                )}

                {/* Applied Add-Ons Breakdown */}
                {item.appliedAddons && item.appliedAddons.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.appliedAddons.map((addon, aIdx) => (
                      <span key={aIdx} className="text-[11px] bg-purple-50 text-purple-800 border border-purple-200 font-bold px-2 py-0.5 rounded">
                        ✨ {addon.optionName}: {addon.valueLabel} (+₹{addon.amount})
                      </span>
                    ))}
                  </div>
                )}

                {/* Artwork & Design Package Status */}
                {item.artworkOption === 'DESIGN_SUPPORT' ? (
                  <div className="mt-2.5 space-y-1 bg-purple-50/50 p-3 rounded-xl border border-purple-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-block text-xs bg-purple-100 text-purple-950 font-bold px-2.5 py-0.5 rounded-md border border-purple-200">
                        🎨 Design Support: {item.designPackageName || (item.designPackage ? (item.designPackage.packageName || item.designPackage.name) : 'Package')} (+₹{item.designFee || 0})
                      </span>
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                        Design Studio Routing
                      </span>
                    </div>
                    {Array.isArray(item.selectedAddons) && item.selectedAddons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedAddons.map((addon, adx) => (
                          <span key={adx} className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded font-bold">
                            + {addon.name} (+₹{addon.price})
                          </span>
                        ))}
                      </div>
                    )}
                    {item.designBriefResponses && Object.keys(item.designBriefResponses).length > 0 && (
                      <p className="text-[11px] text-gray-600">
                        📋 {Object.keys(item.designBriefResponses).length} design brief detail(s) attached
                      </p>
                    )}
                    {item.preferredStyle && (
                      <p className="text-[11px] text-gray-600">
                        ✨ Style: <strong className="text-gray-900">{item.preferredStyle}</strong>
                      </p>
                    )}
                    {item.termsAccepted && (
                      <span className="text-[10px] text-green-700 font-semibold block">
                        ✔ Design terms accepted
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-2.5 space-y-1.5 bg-blue-50/40 p-3 rounded-xl border border-blue-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-block text-xs bg-blue-100 text-blue-900 font-bold px-2.5 py-0.5 rounded">
                        📄 Print-Ready File
                      </span>
                      {item.artworkVersion && (
                        <span className="text-[11px] font-mono font-bold bg-white text-gray-800 px-2 py-0.5 rounded border border-gray-300 shadow-2xs">
                          {item.artworkVersion}
                        </span>
                      )}
                      {item.preflightReport?.status === 'PASS' ? (
                        <span className="text-[11px] font-bold text-green-700 bg-green-100 border border-green-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          🟢 Preflight Passed ({item.preflightReport.dpi || 300} DPI)
                        </span>
                      ) : (item.preflightReport?.status === 'WARNING' || item.preflightReport?.status === 'ERROR') ? (
                        <span className="text-[11px] font-bold text-yellow-800 bg-yellow-100 border border-yellow-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          🟡 Quality Warning Acknowledged
                        </span>
                      ) : null}
                    </div>
                    {item.artworkFileName && (
                      <p className="text-xs text-gray-800 font-medium flex items-center gap-1">
                        📎 <span className="font-semibold">{item.artworkFileName}</span>
                        {item.artworkFileUrl && (
                          <a
                            href={item.artworkFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline text-[11px] ml-1 font-bold hover:text-blue-800"
                          >
                            (View Artwork ↗)
                          </a>
                        )}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 pt-3 border-t">
                  <div className="flex items-center border rounded-xl bg-gray-50 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartItemId, item.quantity - 100 > 0 ? item.quantity - 100 : item.quantity - 1)}
                      className="w-11 h-11 flex items-center justify-center text-base font-black text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="px-3 text-sm font-black text-gray-900 min-w-[60px] text-center">
                      {item.quantity} <span className="text-[10px] text-gray-500 block font-bold">{item.quantityUnit || 'pcs'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 100)}
                      className="w-11 h-11 flex items-center justify-center text-base font-black text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-bold text-red-600">₹{item.totalPrice}</span>
                    <p className="text-[11px] text-gray-500">₹{(item.totalPrice / item.quantity).toFixed(2)} / unit</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-4">
          <div className="bg-white border rounded-xl p-6 shadow-sm sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b">Order Summary</h2>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Taxable Items Subtotal:</span>
                <span className="font-semibold text-gray-900">₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery & Handling:</span>
                <span className="font-semibold text-gray-900">
                  {cartShipping === 0 ? <span className="text-green-600 font-bold">FREE (₹0)</span> : `₹${cartShipping}`}
                </span>
              </div>
              <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                <div className="flex justify-between text-gray-800 font-bold">
                  <span>Applicable GST (18% included):</span>
                  <span className="text-gray-900">₹{gstBreakdown.totalTax}</span>
                </div>
                <div className="flex justify-between text-gray-500 pl-2">
                  <span>• Central GST (CGST 9%):</span>
                  <span>₹{gstBreakdown.cgst}</span>
                </div>
                <div className="flex justify-between text-gray-500 pl-2">
                  <span>• State GST (SGST 9%):</span>
                  <span>₹{gstBreakdown.sgst}</span>
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
                <span>Grand Total:</span>
                <span className="text-red-600 font-extrabold text-2xl">₹{cartGrandTotal}</span>
              </div>
            </div>

            <Button
              color="dark"
              onClick={() => navigate('/checkout')}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 mt-6 flex items-center justify-center gap-2 text-base rounded-lg"
            >
              Proceed to Checkout <HiArrowRight className="w-5 h-5" />
            </Button>

            <p className="text-xs text-center text-gray-400 mt-4">
              🔒 Safe & Secure checkout | Single day dispatch
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <Feedback />
      </div>

      {/* Sticky Mobile Cart Checkout CTA Bar (Positioned above MobileBottomNav) */}
      <div
        className="lg:hidden fixed bottom-13.5 sm:bottom-14 left-0 right-0 bg-white/98 backdrop-blur-md border-t border-gray-200 px-4 py-2.5 z-35 shadow-2xl flex items-center justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">
            Total ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
          </span>
          <span className="text-xl font-black text-red-600 block">
            ₹{cartGrandTotal?.toLocaleString('en-IN')}
          </span>
        </div>
        <Button
          onClick={() => navigate('/checkout')}
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs px-5 py-2 rounded-xl shadow-md min-h-[44px] whitespace-nowrap"
        >
          Proceed to Checkout ➔
        </Button>
      </div>
    </div>
  );
}
