import React from 'react';
import { Drawer, Button } from 'flowbite-react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { HiTrash, HiOutlineShoppingBag, HiArrowRight } from 'react-icons/hi';

export function CartDrawer() {
  const {
    cartItems,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    cartShipping,
    cartGrandTotal,
  } = useCart();

  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsCartDrawerOpen(false);
    navigate('/checkout');
  };

  return (
    <Drawer
      open={isCartDrawerOpen}
      onClose={() => setIsCartDrawerOpen(false)}
      position="right"
      className="w-full max-w-md bg-white p-6 shadow-2xl z-50 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <HiOutlineShoppingBag className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-gray-900">Your Cart ({cartItems.length})</h2>
          </div>
          <button
            onClick={() => setIsCartDrawerOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <HiOutlineShoppingBag className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Your cart is empty</h3>
            <p className="text-sm text-gray-500 mb-6">Explore our custom printing catalog to add items.</p>
            <Button
              color="dark"
              onClick={() => {
                setIsCartDrawerOpen(false);
                navigate('/shop');
              }}
              className="bg-black text-white hover:bg-yellow-400 hover:text-black font-semibold"
            >
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="divide-y max-h-[60vh] overflow-y-auto pr-1 mt-2">
            {cartItems.map((item) => (
              <div key={item.cartItemId} className="py-4 flex gap-4">
                <img
                  src={item.product?.thumbnailUrl || '/default-image.png'}
                  alt={item.product?.name}
                  className="w-20 h-20 object-contain p-1 bg-[#f8f9fa] rounded-xl border border-gray-200 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-900 text-sm">{item.product?.name}</h4>
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove item"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Qty: <span className="font-medium text-gray-800">{item.quantity}</span> | SKU: {item.product?.sku}
                  </p>
                  {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(item.selectedOptions).map(([key, val]) => (
                        <span key={key} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {key}: {val}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.designRequired && (
                    <span className="inline-block text-[10px] bg-yellow-100 text-yellow-800 font-medium px-1.5 py-0.5 rounded mt-1">
                      Design Service Requested
                    </span>
                  )}
                  {item.artworkFileName && (
                    <p className="text-[11px] text-green-600 mt-1 truncate">
                      📎 Artwork: {item.artworkFileName}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-3">
                    <span className="font-bold text-red-600 text-base">₹{item.totalPrice}</span>
                    <div className="flex items-center border rounded">
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 100 > 0 ? item.quantity - 100 : item.quantity - 1)}
                        className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 100)}
                        className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="pt-4 border-t mt-4 bg-white">
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-900">₹{cartSubtotal}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Estimated Shipping:</span>
              <span className="font-semibold text-gray-900">
                {cartShipping === 0 ? <span className="text-green-600">FREE</span> : `₹${cartShipping}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t">
              <span>Total (incl. GST):</span>
              <span className="text-red-600 text-lg">₹{cartGrandTotal}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              color="dark"
              onClick={handleCheckout}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-1 flex items-center justify-center gap-2"
            >
              Proceed to Checkout <HiArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              color="light"
              as={Link}
              to="/cart"
              onClick={() => setIsCartDrawerOpen(false)}
              className="w-full text-gray-700 hover:bg-gray-100 text-xs"
            >
              View Full Cart
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
