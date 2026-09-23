import React, { createContext, useContext, useState, useEffect } from 'react';
import { computeInclusiveGstBreakdown } from '../utils/gstDisplay';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('pb_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('pb_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cartItems]);

  const addToCart = (newItem) => {
    // Generate internal cart item id based on product id + options hash + artwork configuration
    const optionsHash = JSON.stringify(newItem.selectedOptions || {});
    const pkgId = newItem.designPackageId || newItem.designPackageName || 'none';
    const uploadId = newItem.artworkUploadId || newItem.artworkFileName || 'none';
    const cartItemId = `${newItem.product.id}-${newItem.quantity}-${newItem.artworkOption || 'std'}-${pkgId}-${uploadId}-${optionsHash}`;

    setCartItems((prevItems) => {
      const existingIdx = prevItems.findIndex((item) => item.cartItemId === cartItemId);
      if (existingIdx > -1) {
        const updated = [...prevItems];
        updated[existingIdx].quantity += newItem.quantity;
        updated[existingIdx].totalPrice = updated[existingIdx].unitPrice * updated[existingIdx].quantity;
        return updated;
      }
      return [
        ...prevItems,
        {
          ...newItem,
          cartItemId,
        },
      ];
    });

    setIsCartDrawerOpen(true);
  };

  const removeFromCart = (cartItemId) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const qty = parseInt(newQty, 10);
          return {
            ...item,
            quantity: qty,
            totalPrice: item.unitPrice * qty,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('pb_cart');
  };

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity ? 1 : 0), 0);
  const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const cartShipping = cartSubtotal >= 1500 || cartSubtotal === 0 ? 0 : 80;
  // Task #30: cartSubtotal is GST-INCLUSIVE (it sums each item's already-inclusive
  // totalPrice from the pricing engine). The tax actually embedded in it is
  // recovered by division, not `subtotal * rate/100` — see gstDisplay.js for the
  // full rationale (same fix as Task #29's server-side formula correction).
  const cartTax = computeInclusiveGstBreakdown(cartSubtotal, 18).totalTax;
  const cartGrandTotal = cartSubtotal + cartShipping;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartSubtotal,
        cartShipping,
        cartTax,
        cartGrandTotal,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
