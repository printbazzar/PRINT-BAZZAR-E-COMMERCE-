import React, { useState, useEffect, useRef } from 'react';
import { Button, TextInput, Select, Textarea, Modal, Spinner, Label, Badge } from 'flowbite-react';
import {
  HiSearch,
  HiOutlineUser,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineCurrencyRupee,
  HiOutlineShoppingBag,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlinePhotograph,
  HiOutlineRefresh,
  HiOutlineExternalLink,
  HiOutlineShieldCheck,
  HiOutlineX,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { calculateProductPrice } from '../utils/pricingEngine';
import OrderSourceBadge, { ORDER_SOURCES } from '../Components/OrderSourceBadge';
import JobCardModal from '../Components/JobCardModal';

export default function AdminPOS() {
  const { adminUser } = useAuth();

  // Step state
  const [orderSource, setOrderSource] = useState('WALK_IN');
  const [branch, setBranch] = useState('TRICHY_MAIN');
  const [deliveryMethod, setDeliveryMethod] = useState('STORE_PICKUP'); // STORE_PICKUP or COURIER

  // Customer state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    mobile: '',
    email: '',
    companyName: '',
    gstNumber: '',
    address: '',
    city: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    pincode: '620008',
  });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Catalog & Product Selection state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Product Customizer state
  const [quantity, setQuantity] = useState(100);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [artworkMode, setArtworkMode] = useState('CUSTOMER_ARTWORK'); // CUSTOMER_ARTWORK, CUSTOM_DESIGN, SEND_LATER
  const [artworkFile, setArtworkFile] = useState(null);
  const [artworkUrl, setArtworkUrl] = useState('');
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [designRequirementNotes, setDesignRequirementNotes] = useState('');
  const [preferredStyle, setPreferredStyle] = useState('Modern Minimal');
  const [calculatedItemPricing, setCalculatedItemPricing] = useState(null);

  // POS Cart state
  const [posCart, setPosCart] = useState([]);

  // Discount state
  const [discountType, setDiscountType] = useState('FLAT'); // FLAT or PERCENT
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [showManagerPinModal, setShowManagerPinModal] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [managerApproval, setManagerApproval] = useState(null); // { managerId, managerName }
  const [managerAuthError, setManagerAuthError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, UPI, CARD, RAZORPAY, BANK_TRANSFER, CREDIT
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Submission & Receipt state
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [createdOrderResponse, setCreatedOrderResponse] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showJobCardModal, setShowJobCardModal] = useState(false);

  const receiptPrintRef = useRef(null);

  // 1. Initial Catalog Load
  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.getAdminProducts({ limit: 100 }),
        api.getCategories(),
      ]);
      if (prodRes.success) setProducts(prodRes.data || []);
      if (catRes.success) setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to load catalog for POS:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // 2. Customer Search with debounce
  useEffect(() => {
    if (!customerSearchQuery || customerSearchQuery.trim().length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingCustomer(true);
      try {
        const res = await api.searchPosCustomers(customerSearchQuery.trim());
        if (res.success) {
          setCustomerSearchResults(res.customers || []);
        }
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  // 3. Dynamic Item Price Calculation
  useEffect(() => {
    if (!selectedProduct) {
      setCalculatedItemPricing(null);
      return;
    }

    try {
      const isDesign = artworkMode === 'CUSTOM_DESIGN';
      const pricing = calculateProductPrice({
        product: selectedProduct,
        quantity: parseInt(quantity, 10) || selectedProduct.minQuantity || 100,
        selectedOptions,
        designOption: isDesign ? 'Yes Please' : 'No Thank You',
        artworkOption: isDesign ? 'DESIGN_SUPPORT' : 'PRINT_READY_FILE',
        gstRate: 18,
      });
      setCalculatedItemPricing(pricing);
    } catch (e) {
      console.warn('Price calculation error:', e);
    }
  }, [selectedProduct, quantity, selectedOptions, artworkMode]);

  // Select a product from catalog
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setQuantity(product.minQuantity || 100);

    // Set default options
    const defaults = {};
    if (product.optionMappings) {
      product.optionMappings.forEach((m) => {
        const masterName = m.customLabel || m.master?.name || m.master?.code;
        const defaultVal = m.valueMappings?.find((v) => v.isDefault) || m.valueMappings?.[0];
        if (masterName && defaultVal) {
          defaults[masterName] = defaultVal.customLabel || defaultVal.masterValue?.label || defaultVal.masterValue?.code;
        }
      });
    } else if (product.options) {
      product.options.forEach((opt) => {
        if (opt.values?.[0]) {
          defaults[opt.optionName] = opt.values[0].valueLabel;
        }
      });
    }
    setSelectedOptions(defaults);
  };

  // Add configured item to POS cart
  const handleAddToCart = () => {
    if (!selectedProduct || !calculatedItemPricing || !calculatedItemPricing.isAvailable) {
      alert('Please select a valid product configuration before adding to cart.');
      return;
    }

    const newItem = {
      id: `pos_item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sku: selectedProduct.sku,
      thumbnailUrl: selectedProduct.thumbnailUrl,
      quantity: calculatedItemPricing.quantity,
      selectedOptions: { ...selectedOptions },
      unitPrice: calculatedItemPricing.subtotal / calculatedItemPricing.quantity,
      totalPrice: calculatedItemPricing.subtotal,
      artworkMode,
      artworkFileUrl: artworkUrl || null,
      designRequired: artworkMode === 'CUSTOM_DESIGN',
      requirementNotes: designRequirementNotes || null,
      preferredStyle: preferredStyle || null,
      pricingBreakdown: calculatedItemPricing,
    };

    setPosCart((prev) => [...prev, newItem]);

    // Reset product customizer
    setSelectedProduct(null);
    setArtworkUrl('');
    setArtworkFile(null);
    setDesignRequirementNotes('');
  };

  const handleRemoveCartItem = (itemId) => {
    setPosCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  // Clone item from previous order (Repeat Order Workflow)
  const handleRepeatPreviousOrder = (prevOrder) => {
    if (!prevOrder || !prevOrder.items || !prevOrder.items.length) return;

    const clonedItems = prevOrder.items.map((it) => {
      // Find matching product in catalog
      const catalogProd = products.find((p) => p.id === it.productId);
      const parsedOptions = typeof it.optionsSnapshot === 'string'
        ? JSON.parse(it.optionsSnapshot || '{}')
        : (it.optionsSnapshot || {});

      // Calculate fresh price at CURRENT rates
      let currentUnitPrice = it.unitPrice || 0;
      let currentTotalPrice = it.totalPrice || 0;

      if (catalogProd) {
        try {
          const freshPricing = calculateProductPrice({
            product: catalogProd,
            quantity: it.quantity,
            selectedOptions: parsedOptions,
            designOption: it.designRequired ? 'Yes Please' : 'No Thank You',
            gstRate: 18,
          });
          if (freshPricing && freshPricing.subtotal) {
            currentTotalPrice = freshPricing.subtotal;
            currentUnitPrice = freshPricing.subtotal / it.quantity;
          }
        } catch (_) {}
      }

      return {
        id: `pos_repeat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: it.productId,
        productName: it.productName || catalogProd?.name || 'Repeated Item',
        sku: it.sku || catalogProd?.sku || '',
        thumbnailUrl: catalogProd?.thumbnailUrl,
        quantity: it.quantity,
        selectedOptions: parsedOptions,
        unitPrice: currentUnitPrice,
        totalPrice: currentTotalPrice,
        artworkMode: it.designRequired ? 'CUSTOM_DESIGN' : (it.artworkFileUrl ? 'CUSTOMER_ARTWORK' : 'CUSTOMER_ARTWORK'),
        artworkFileUrl: it.artworkFileUrl || null,
        designRequired: !!it.designRequired,
        requirementNotes: it.requirementNotes || `Repeat of Order #${prevOrder.orderNumber}`,
      };
    });

    setPosCart((prev) => [...prev, ...clonedItems]);
    alert(`Cloned ${clonedItems.length} items from previous order #${prevOrder.orderNumber} with CURRENT pricing applied!`);
  };

  // Totals calculations
  const cartSubtotal = posCart.reduce((sum, item) => sum + item.totalPrice, 0);
  const maxStaffDiscount = Math.round(cartSubtotal * 0.05);

  let calculatedDiscount = 0;
  if (discountType === 'PERCENT') {
    calculatedDiscount = Math.round((cartSubtotal * (parseFloat(discountValue) || 0)) / 100);
  } else {
    calculatedDiscount = Math.min(cartSubtotal, parseFloat(discountValue) || 0);
  }

  const isDiscountOverThreshold = calculatedDiscount > maxStaffDiscount;
  const isDiscountAuthorized = !isDiscountOverThreshold || Boolean(managerApproval);

  const shippingCharge = deliveryMethod === 'STORE_PICKUP' ? 0 : (cartSubtotal >= 1500 ? 0 : 80);
  const finalGrandTotal = Math.max(0, cartSubtotal - calculatedDiscount) + shippingCharge;

  // Amount paid default
  const effectiveAmountPaid = amountPaidInput === '' ? finalGrandTotal : parseFloat(amountPaidInput) || 0;
  const balanceDue = Math.max(0, finalGrandTotal - effectiveAmountPaid);
  const changeToReturn = paymentMethod === 'CASH' && effectiveAmountPaid > finalGrandTotal ? effectiveAmountPaid - finalGrandTotal : 0;

  // Handle Manager PIN verification
  const handleVerifyManagerPin = async () => {
    if (!managerPin || !managerPin.trim()) {
      setManagerAuthError('Please enter the 4-digit Manager PIN.');
      return;
    }
    setIsVerifyingPin(true);
    setManagerAuthError('');
    try {
      const res = await api.verifyManagerPin({ pin: managerPin.trim() });
      if (res.success) {
        setManagerApproval({
          managerId: res.managerId,
          managerName: res.managerName,
        });
        setShowManagerPinModal(false);
        setManagerPin('');
      } else {
        setManagerAuthError(res.message || 'Invalid Manager PIN.');
      }
    } catch (err) {
      setManagerAuthError(err.message || 'Manager verification failed.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Create new customer quick modal handler
  const handleSaveNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name || !newCustomerForm.mobile) {
      alert('Customer Name and Mobile Number are required.');
      return;
    }
    setIsCreatingCustomer(true);
    try {
      const res = await api.createPosCustomer(newCustomerForm);
      if (res.success && res.customer) {
        setSelectedCustomer(res.customer);
        setShowNewCustomerModal(false);
        setCustomerSearchQuery(res.customer.mobile);
      }
    } catch (err) {
      alert(err.message || 'Failed to register customer.');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Final Order Submission to Central Order Engine
  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      alert('Please search and select a customer, or create a new customer profile.');
      return;
    }
    if (!posCart.length) {
      alert('POS cart is empty. Please add at least one product.');
      return;
    }
    if (isDiscountOverThreshold && !managerApproval) {
      setShowManagerPinModal(true);
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobile,
        customerEmail: selectedCustomer.email || '',
        customerWhatsapp: selectedCustomer.whatsapp || selectedCustomer.mobile,
        companyName: selectedCustomer.companyName || null,
        gstNumber: selectedCustomer.gstNumber || null,
        shippingAddress: selectedCustomer.address || 'Store Pickup Counter - Print Bazzar Trichy',
        deliveryType: deliveryMethod === 'STORE_PICKUP' ? 'PICKUP' : 'COURIER',
        deliveryMethod,
        orderSource,
        branch,
        items: posCart.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          selectedOptions: it.selectedOptions,
          artworkOption: it.artworkMode === 'CUSTOM_DESIGN' ? 'DESIGN_SUPPORT' : 'PRINT_READY_FILE',
          artworkFileUrl: it.artworkFileUrl,
          designRequired: it.designRequired,
          requirementNotes: it.requirementNotes,
          preferredStyle: it.preferredStyle,
        })),
        artworkMode,
        discountAmount: calculatedDiscount,
        discountReason,
        managerApprovalId: managerApproval?.managerId || null,
        managerApprovalName: managerApproval?.managerName || null,
        payment: {
          method: paymentMethod,
          amount: effectiveAmountPaid,
          transactionReference: transactionRef || null,
          notes: `Collected at counter by ${adminUser?.name || 'Front Office'}`,
        },
        notes: orderNotes,
      };

      const res = await api.createWalkInOrder(orderPayload);
      if (res.success) {
        setCreatedOrderResponse(res);
        setShowReceiptModal(true);
        // Clear cart
        setPosCart([]);
        setDiscountValue(0);
        setDiscountReason('');
        setManagerApproval(null);
        setAmountPaidInput('');
        setTransactionRef('');
        setOrderNotes('');
      } else {
        alert(res.message || 'Failed to place walk-in order.');
      }
    } catch (err) {
      console.error('POS order submission error:', err);
      alert(err.message || 'Order creation failed.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const getWhatsAppReceiptLink = () => {
    if (!createdOrderResponse || !selectedCustomer) return '';
    const mobile = selectedCustomer.mobile.replace(/\D/g, '').slice(-10);
    const text = encodeURIComponent(
      `🎉 *PRINT BAZZAR — Store Order Confirmation*\n\n` +
      `Hello ${selectedCustomer.name},\n` +
      `Your walk-in order *#${createdOrderResponse.orderNumber}* has been registered!\n\n` +
      `📦 *Items:* ${createdOrderResponse.receiptData?.items?.map((i) => `${i.name} (x${i.quantity})`).join(', ')}\n` +
      `💰 *Total Amount:* ₹${createdOrderResponse.grandTotal}\n` +
      `💵 *Paid at Counter:* ₹${createdOrderResponse.amountPaid}\n` +
      `⚖️ *Balance Due:* ₹${createdOrderResponse.balanceDue}\n` +
      `💳 *Payment Mode:* ${createdOrderResponse.receiptData?.paymentMethod}\n\n` +
      `📍 *Track Live Status:* https://printbazzar.online/track-order/${createdOrderResponse.orderNumber}\n\n` +
      `Thank you for choosing Print Bazzar Trichy!`
    );
    return `https://wa.me/91${mobile}?text=${text}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Bar: Omnichannel Order Source & Counter Branch */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏪</span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase">
              Front Office / Walk-in POS
            </h1>
            <span className="px-2 py-0.5 bg-yellow-400 text-black text-[10px] font-black uppercase rounded">
              ERP Order Desk
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Operator: <span className="font-bold text-gray-800">{adminUser?.name || 'Counter Staff'}</span> | Facility: <span className="font-semibold text-gray-700">Print Bazzar Trichy Main Press</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-500 pl-2">Source:</span>
            {ORDER_SOURCES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setOrderSource(s.key)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                  orderSource === s.key
                    ? 'bg-yellow-400 text-black shadow-xs font-black'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>

          <Select
            size="sm"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-40 font-semibold"
          >
            <option value="TRICHY_MAIN">Trichy Facility (Main)</option>
            <option value="TRICHY_BRANCH_2">Trichy Store #2</option>
            <option value="CHENNAI_HUB">Chennai Hub (Future)</option>
          </Select>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 Cols): Customer Search & Product Customizer */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Customer Identification */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs">1</span>
                Customer Identification
              </h2>
              <Button
                size="xs"
                color="light"
                onClick={() => setShowNewCustomerModal(true)}
                className="font-bold border-gray-300 hover:bg-gray-50"
              >
                <HiOutlinePlus className="w-4 h-4 mr-1 text-yellow-500" />
                New Customer
              </Button>
            </div>

            {/* Customer Search Box */}
            <div className="relative">
              <TextInput
                type="text"
                placeholder="Search by Mobile Number (e.g. 9629098565), Name or Email..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                icon={HiSearch}
              />
              {isSearchingCustomer && (
                <div className="absolute right-3 top-2.5">
                  <Spinner size="sm" />
                </div>
              )}

              {/* Autocomplete Dropdown */}
              {customerSearchResults.length > 0 && !selectedCustomer && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-30 max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {customerSearchResults.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        setSelectedCustomer(cust);
                        setCustomerSearchResults([]);
                      }}
                      className="p-3 hover:bg-yellow-50 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-900">{cust.name}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          📱 +91 {cust.mobile} {cust.companyName && `| 🏢 ${cust.companyName}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
                          {cust.totalOrdersCount} orders
                        </span>
                        {cust.outstandingBalance > 0 && (
                          <p className="text-[10px] text-red-600 font-bold mt-0.5">
                            Due: ₹{cust.outstandingBalance}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Customer Card */}
            {selectedCustomer ? (
              <div className="bg-amber-50/70 border border-yellow-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-gray-900 text-base">{selectedCustomer.name}</h3>
                      <span className="text-[10px] bg-yellow-400 text-black font-black px-1.5 py-0.5 rounded">
                        SELECTED
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-mono mt-0.5">
                      📱 +91 {selectedCustomer.mobile} {selectedCustomer.email && `| ✉️ ${selectedCustomer.email}`}
                    </p>
                    {selectedCustomer.companyName && (
                      <p className="text-xs font-semibold text-gray-700 mt-0.5">
                        🏢 {selectedCustomer.companyName} {selectedCustomer.gstNumber && `(GST: ${selectedCustomer.gstNumber})`}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearchQuery('');
                    }}
                    className="text-xs text-gray-400 hover:text-red-600 font-bold"
                  >
                    Change
                  </button>
                </div>

                {/* Customer Metrics & Balance Warning */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-yellow-200 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Total Spend</span>
                    <span className="font-extrabold text-gray-900">₹{selectedCustomer.totalSpent || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Past Orders</span>
                    <span className="font-extrabold text-gray-900">{selectedCustomer.totalOrdersCount || 0} orders</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Pending Balance</span>
                    <span className={`font-extrabold ${selectedCustomer.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selectedCustomer.outstandingBalance > 0 ? `₹${selectedCustomer.outstandingBalance} DUE` : '₹0 (Clear)'}
                    </span>
                  </div>
                </div>

                {/* Repeat Order Accordion (Module 7) */}
                {selectedCustomer.recentOrders && selectedCustomer.recentOrders.length > 0 && (
                  <div className="pt-2 border-t border-yellow-200">
                    <p className="text-[11px] font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                      <span>Recent Orders & Repeat Options:</span>
                      <span className="text-[10px] text-gray-500">Recalculates at current prices</span>
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedCustomer.recentOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="bg-white p-2 rounded-lg border border-yellow-200 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-gray-900 font-mono">{ord.orderNumber}</span>
                            <span className="text-gray-500 text-[10px] ml-2">
                              {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                            </span>
                            <p className="text-[11px] text-gray-600 truncate max-w-xs">
                              {ord.items?.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                            </p>
                          </div>
                          <Button
                            size="xs"
                            color="warning"
                            onClick={() => handleRepeatPreviousOrder(ord)}
                            className="font-bold text-[11px] whitespace-nowrap"
                          >
                            🔁 Repeat Order
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-500">
                Search an existing customer or click <span className="font-bold text-gray-700">"+ New Customer"</span> to begin order entry.
              </div>
            )}
          </div>

          {/* STEP 2: Product Catalog & Specification Customizer */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs">2</span>
                Product Selection & Customization
              </h2>
              {selectedProduct && (
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-gray-400 hover:text-gray-800 font-bold"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Category Filter & Search */}
            {!selectedProduct ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Select
                    size="sm"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-48 font-semibold"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <TextInput
                    size="sm"
                    placeholder="Search product by name or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    icon={HiSearch}
                    className="flex-1"
                  />
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {loadingCatalog ? (
                    <div className="col-span-3 py-8 text-center text-xs text-gray-500">
                      <Spinner size="sm" /> Loading catalog...
                    </div>
                  ) : (
                    products
                      .filter((p) => {
                        const matchCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
                        const matchQ = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase());
                        return matchCat && matchQ;
                      })
                      .map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => handleSelectProduct(prod)}
                          className="p-2.5 bg-gray-50 hover:bg-yellow-50 rounded-xl border border-gray-200 hover:border-yellow-400 cursor-pointer transition-all flex flex-col justify-between text-left group"
                        >
                          <div>
                            {prod.thumbnailUrl && (
                              <img
                                src={prod.thumbnailUrl}
                                alt={prod.name}
                                className="w-full h-16 object-cover rounded-lg mb-2 bg-gray-200"
                              />
                            )}
                            <h4 className="text-xs font-extrabold text-gray-900 group-hover:text-black line-clamp-2 leading-tight">
                              {prod.name}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{prod.sku}</p>
                          </div>
                          <div className="mt-2 pt-1 border-t border-gray-200 flex justify-between items-center text-xs">
                            <span className="text-[10px] text-gray-500 font-medium">From</span>
                            <span className="font-extrabold text-gray-900">₹{prod.startingPrice || 0}</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ) : (
              /* Configurator for selected product */
              <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase">{selectedProduct.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">SKU: {selectedProduct.sku}</p>
                  </div>
                  <span className="text-xs font-bold bg-black text-white px-2 py-0.5 rounded">
                    Configuring
                  </span>
                </div>

                {/* Quantity input */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Print Quantity
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[100, 250, 500, 1000, 2000, 5000].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantity(q)}
                        className={`px-3 py-1 text-xs font-extrabold rounded-lg border transition-all ${
                          quantity === q
                            ? 'bg-black text-white border-black shadow-xs'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                    <div className="w-28">
                      <TextInput
                        size="sm"
                        type="number"
                        min={selectedProduct.minQuantity || 1}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value, 10) || selectedProduct.minQuantity || 1)}
                        className="font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic Options (Size, Material, Side, Lamination, Finishing) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedProduct.optionMappings && selectedProduct.optionMappings.length > 0 ? (
                    selectedProduct.optionMappings.map((m) => {
                      const optName = m.customLabel || m.master?.name || m.master?.code;
                      const values = m.valueMappings || [];
                      return (
                        <div key={m.id}>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                            {optName}
                          </label>
                          <Select
                            size="sm"
                            value={selectedOptions[optName] || ''}
                            onChange={(e) =>
                              setSelectedOptions({ ...selectedOptions, [optName]: e.target.value })
                            }
                            className="font-semibold text-xs"
                          >
                            {values.map((v) => {
                              const label = v.customLabel || v.masterValue?.label || v.masterValue?.code;
                              return (
                                <option key={v.id} value={label}>
                                  {label}
                                </option>
                              );
                            })}
                          </Select>
                        </div>
                      );
                    })
                  ) : (
                    selectedProduct.options?.map((opt) => (
                      <div key={opt.id}>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          {opt.optionName}
                        </label>
                        <Select
                          size="sm"
                          value={selectedOptions[opt.optionName] || ''}
                          onChange={(e) =>
                            setSelectedOptions({ ...selectedOptions, [opt.optionName]: e.target.value })
                          }
                          className="font-semibold text-xs"
                        >
                          {opt.values?.map((val) => (
                            <option key={val.id} value={val.valueLabel}>
                              {val.valueLabel}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ))
                  )}
                </div>

                {/* Artwork & Design Input Selection (Module 6) */}
                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Artwork & Production Input
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setArtworkMode('CUSTOMER_ARTWORK')}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        artworkMode === 'CUSTOMER_ARTWORK'
                          ? 'bg-yellow-400 text-black border-yellow-500 font-extrabold shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 font-semibold'
                      }`}
                    >
                      <p className="font-bold">📁 Customer File</p>
                      <p className="text-[10px] opacity-80 mt-0.5">Prepress Review</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setArtworkMode('CUSTOM_DESIGN')}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        artworkMode === 'CUSTOM_DESIGN'
                          ? 'bg-yellow-400 text-black border-yellow-500 font-extrabold shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 font-semibold'
                      }`}
                    >
                      <p className="font-bold">🎨 Needs Design</p>
                      <p className="text-[10px] opacity-80 mt-0.5">Design Queue</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setArtworkMode('SEND_LATER')}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        artworkMode === 'SEND_LATER'
                          ? 'bg-yellow-400 text-black border-yellow-500 font-extrabold shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 font-semibold'
                      }`}
                    >
                      <p className="font-bold">⏳ Send Later</p>
                      <p className="text-[10px] opacity-80 mt-0.5">Hold in Review</p>
                    </button>
                  </div>

                  {artworkMode === 'CUSTOMER_ARTWORK' && (
                    <div className="mt-2.5 space-y-1.5">
                      <TextInput
                        size="sm"
                        type="text"
                        placeholder="Artwork file URL or cloud drive link (or paste below)..."
                        value={artworkUrl}
                        onChange={(e) => setArtworkUrl(e.target.value)}
                        icon={HiOutlinePhotograph}
                      />
                    </div>
                  )}

                  {artworkMode === 'CUSTOM_DESIGN' && (
                    <div className="mt-2.5 space-y-2">
                      <Textarea
                        rows={2}
                        placeholder="Enter customer design brief instructions (colors, text, references)..."
                        value={designRequirementNotes}
                        onChange={(e) => setDesignRequirementNotes(e.target.value)}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Select
                          size="sm"
                          value={preferredStyle}
                          onChange={(e) => setPreferredStyle(e.target.value)}
                          className="w-full text-xs font-semibold"
                        >
                          <option value="Modern Minimal">Style: Modern Minimal</option>
                          <option value="Corporate Professional">Style: Corporate Professional</option>
                          <option value="Creative Vibrant">Style: Creative Vibrant</option>
                          <option value="Traditional Luxury">Style: Traditional Luxury</option>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Authoritative Real-Time Pricing Summary */}
                {calculatedItemPricing && (
                  <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Quantity ({calculatedItemPricing.quantity} pcs):</span>
                      <span className="font-bold text-gray-900">₹{calculatedItemPricing.productPrice || calculatedItemPricing.basePrice}</span>
                    </div>
                    {calculatedItemPricing.designFee > 0 && (
                      <div className="flex justify-between items-center text-purple-700 font-semibold">
                        <span>Graphic Design Fee:</span>
                        <span>+ ₹{calculatedItemPricing.designFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-gray-500 text-[11px]">
                      <span>GST (18% inclusive):</span>
                      <span>₹{calculatedItemPricing.totalTax || 0}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 font-black text-sm text-gray-900">
                      <span>Total Item Price:</span>
                      <span className="text-black font-mono">₹{calculatedItemPricing.subtotal}</span>
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  color="warning"
                  onClick={handleAddToCart}
                  className="w-full font-black uppercase tracking-wider shadow-xs"
                >
                  <HiOutlinePlus className="w-4 h-4 mr-1.5" />
                  Add to Walk-in Cart (₹{calculatedItemPricing?.subtotal || 0})
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 Cols): Cart, Discount, Payment & Checkout */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs">3</span>
                POS Order Items ({posCart.length})
              </h2>
              {posCart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPosCart([])}
                  className="text-xs text-red-500 hover:text-red-700 font-bold"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {posCart.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                Cart is empty. Select products on the left to configure items.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {posCart.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-start gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black bg-gray-200 text-gray-700 px-1 rounded">
                          #{idx + 1}
                        </span>
                        <h4 className="text-xs font-black text-gray-900 truncate">{item.productName}</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        Qty: <span className="font-bold text-gray-800">{item.quantity}</span> | Rate: ₹{Math.round(item.unitPrice * 100) / 100}/pc
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-gray-600">
                        {Object.entries(item.selectedOptions || {}).map(([k, v]) => (
                          <span key={k} className="bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end justify-between">
                      <span className="text-xs font-black text-gray-900 font-mono">
                        ₹{item.totalPrice}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="text-gray-400 hover:text-red-600 mt-2"
                        title="Remove item"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Delivery Method Selector */}
            <div className="pt-3 border-t border-gray-200">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Fulfillment Mode
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('STORE_PICKUP')}
                  className={`p-2 rounded-xl border text-center font-bold transition-all ${
                    deliveryMethod === 'STORE_PICKUP'
                      ? 'bg-black text-white border-black shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  🏪 Store Pickup (Free)
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('COURIER')}
                  className={`p-2 rounded-xl border text-center font-bold transition-all ${
                    deliveryMethod === 'COURIER'
                      ? 'bg-black text-white border-black shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  🚚 Doorstep Courier {cartSubtotal >= 1500 ? '(Free)' : '(+₹80)'}
                </button>
              </div>
            </div>

            {/* STEP 4: Discount Control (Module 4 & 9) */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Concession / Discount
                </label>
                <span className="text-[10px] text-gray-500 font-semibold">
                  Staff Auto-Limit: 5% (₹{maxStaffDiscount})
                </span>
              </div>

              <div className="flex gap-2 items-center">
                <div className="w-28">
                  <Select
                    size="sm"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="font-bold text-xs"
                  >
                    <option value="FLAT">Flat ₹</option>
                    <option value="PERCENT">Percent %</option>
                  </Select>
                </div>
                <TextInput
                  size="sm"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-28 font-bold font-mono"
                />
                <TextInput
                  size="sm"
                  placeholder="Reason for discount..."
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="flex-1 text-xs"
                />
              </div>

              {/* Manager Authorization Banner if > 5% */}
              {isDiscountOverThreshold && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                  managerApproval
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {managerApproval ? (
                      <HiOutlineShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <HiOutlineExclamation className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-bold leading-tight">
                        {managerApproval
                          ? `Authorized by: ${managerApproval.managerName}`
                          : `Discount (₹${calculatedDiscount}) exceeds staff 5% limit!`}
                      </p>
                      <p className="text-[10px] opacity-80">
                        {managerApproval ? 'Approval audit record attached' : 'Manager PIN required before order submission'}
                      </p>
                    </div>
                  </div>

                  {!managerApproval && (
                    <Button
                      size="xs"
                      color="failure"
                      onClick={() => setShowManagerPinModal(true)}
                      className="font-black text-xs"
                    >
                      Authorize PIN
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* STEP 5: Payment Method & Accounting (Module 5, 8 & 10) */}
            <div className="pt-3 border-t border-gray-200 space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                Payment Collection Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {['CASH', 'UPI', 'CARD', 'RAZORPAY', 'BANK_TRANSFER', 'CREDIT'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 px-1.5 rounded-xl border text-center font-extrabold transition-all text-xs ${
                      paymentMethod === m
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {m === 'CASH' && '💵 Cash'}
                    {m === 'UPI' && '📱 UPI / QR'}
                    {m === 'CARD' && '💳 Card'}
                    {m === 'RAZORPAY' && '⚡ Razorpay'}
                    {m === 'BANK_TRANSFER' && '🏦 Bank Txn'}
                    {m === 'CREDIT' && '⏱️ Pay Later'}
                  </button>
                ))}
              </div>

              {/* Amount Collected & Balance Input */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">
                    Amount Collected (₹)
                  </label>
                  <TextInput
                    size="sm"
                    type="number"
                    min="0"
                    placeholder={`₹${finalGrandTotal}`}
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    className="font-bold font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">
                    Reference / Txn ID
                  </label>
                  <TextInput
                    size="sm"
                    placeholder={paymentMethod === 'CASH' ? 'Cash Register' : 'UPI/Txn Reference'}
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {changeToReturn > 0 && (
                <div className="p-2 bg-emerald-50 rounded-lg text-xs text-emerald-800 font-bold flex justify-between">
                  <span>Change to return customer:</span>
                  <span className="font-mono">₹{changeToReturn}</span>
                </div>
              )}
            </div>

            {/* Price Summary Breakdown */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Items Subtotal:</span>
                <span className="font-bold font-mono">₹{cartSubtotal}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount ({discountReason || 'Concession'}):</span>
                  <span className="font-mono">- ₹{calculatedDiscount}</span>
                </div>
              )}
              {shippingCharge > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Courier Delivery:</span>
                  <span className="font-mono">+ ₹{shippingCharge}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-base font-black text-gray-900">
                <span>Grand Total:</span>
                <span className="font-mono text-lg">₹{finalGrandTotal}</span>
              </div>

              <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
                <span className="text-gray-600">Amount Paid Now:</span>
                <span className="font-bold text-emerald-700 font-mono">₹{effectiveAmountPaid}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Balance Due at Handover:</span>
                <span className={`font-black font-mono ${balanceDue > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  ₹{balanceDue}
                </span>
              </div>
            </div>

            {/* Submit Order Button */}
            <Button
              size="lg"
              color="warning"
              disabled={isSubmittingOrder || !posCart.length || !selectedCustomer || (isDiscountOverThreshold && !managerApproval)}
              onClick={handleSubmitOrder}
              className="w-full font-black uppercase tracking-wider shadow-md py-1"
            >
              {isSubmittingOrder ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Processing Order...
                </>
              ) : (
                `Confirm & Place Order (₹${finalGrandTotal})`
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Manager Authorization PIN Modal */}
      <Modal show={showManagerPinModal} onClose={() => setShowManagerPinModal(false)} size="md">
        <Modal.Header>
          <span className="font-extrabold text-gray-900">🔐 Manager Authorization Required</span>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <p className="text-xs text-gray-600">
            Discounts exceeding the standard 5% limit (₹{maxStaffDiscount}) require Manager Authorization.
          </p>

          <div className="bg-amber-50 p-3 rounded-xl border border-yellow-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Subtotal:</span>
              <span className="font-bold font-mono">₹{cartSubtotal}</span>
            </div>
            <div className="flex justify-between text-red-600 font-bold">
              <span>Requested Discount:</span>
              <span className="font-mono">₹{calculatedDiscount} ({((calculatedDiscount / cartSubtotal) * 100).toFixed(1)}%)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Enter 4-Digit Manager PIN
            </label>
            <TextInput
              type="password"
              maxLength="6"
              placeholder="••••"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value)}
              className="text-center font-mono text-xl tracking-widest"
              autoFocus
            />
          </div>

          {managerAuthError && (
            <p className="text-xs text-red-600 font-bold">{managerAuthError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" color="gray" onClick={() => setShowManagerPinModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              color="failure"
              disabled={isVerifyingPin || !managerPin}
              onClick={handleVerifyManagerPin}
              className="font-bold"
            >
              {isVerifyingPin ? <Spinner size="sm" /> : 'Authorize Override'}
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* MODAL 2: New Customer Quick Registration Modal */}
      <Modal show={showNewCustomerModal} onClose={() => setShowNewCustomerModal(false)} size="lg">
        <Modal.Header>
          <span className="font-extrabold text-gray-900">👤 Quick Customer Registration</span>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSaveNewCustomer} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Customer Name *
                </label>
                <TextInput
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <TextInput
                  required
                  maxLength="10"
                  placeholder="e.g. 9629098565"
                  value={newCustomerForm.mobile}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, mobile: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Email Address
                </label>
                <TextInput
                  type="email"
                  placeholder="ramesh@gmail.com"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Company / Organization
                </label>
                <TextInput
                  placeholder="e.g. Kumar Enterprises"
                  value={newCustomerForm.companyName}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, companyName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  GSTIN (Optional)
                </label>
                <TextInput
                  placeholder="33AAAAA0000A1Z5"
                  value={newCustomerForm.gstNumber}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, gstNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Address / City
                </label>
                <TextInput
                  placeholder="Big Bazzar St, Trichy"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button size="sm" color="gray" onClick={() => setShowNewCustomerModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                color="warning"
                type="submit"
                disabled={isCreatingCustomer}
                className="font-bold"
              >
                {isCreatingCustomer ? <Spinner size="sm" /> : 'Register & Select Customer'}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* MODAL 3: Order Confirmation, Thermal Receipt & WhatsApp Share (Module 11) */}
      <Modal show={showReceiptModal} onClose={() => setShowReceiptModal(false)} size="2xl">
        <Modal.Header className="print:hidden">
          <span className="font-extrabold text-gray-900">🎉 Order Confirmed & Receipt Generated</span>
        </Modal.Header>
        <Modal.Body className="space-y-4 print:p-0">
          {createdOrderResponse && (
            <>
              {/* Action Bar (Print / WhatsApp / Job Card) */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-100 rounded-xl print:hidden">
                <div className="flex items-center gap-2">
                  <Button size="xs" color="dark" onClick={handlePrintReceipt} className="font-bold">
                    <HiOutlinePrinter className="w-4 h-4 mr-1" />
                    Print Receipt
                  </Button>
                  <a
                    href={getWhatsAppReceiptLink()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
                  >
                    <FaWhatsapp className="w-4 h-4" />
                    Send via WhatsApp
                  </a>
                </div>

                <Button
                  size="xs"
                  color="light"
                  onClick={() => setShowJobCardModal(true)}
                  className="font-bold border-gray-300"
                >
                  <HiOutlinePhotograph className="w-4 h-4 mr-1 text-yellow-500" />
                  View Press Job Card
                </Button>
              </div>

              {/* Printable POS Thermal Receipt (80mm / A4) */}
              <div
                ref={receiptPrintRef}
                className="max-w-[420px] mx-auto bg-white border-2 border-black p-5 text-black font-mono text-xs shadow-xs print:border-none print:shadow-none print:w-full print:max-w-none print:p-0"
              >
                <div className="text-center pb-3 border-b-2 border-dashed border-black">
                  <h2 className="text-lg font-black uppercase tracking-tight">PRINT BAZZAR</h2>
                  <p className="text-[10px] text-gray-600">Digital & Offset Commercial Printing</p>
                  <p className="text-[10px] text-gray-600">12 A, Allimal St, Big Bazzar, Trichy - 620008</p>
                  <p className="text-[10px] font-bold">GSTIN: 33AAAAA0000A1Z5 | Ph: +91 96290 98565</p>
                </div>

                <div className="py-2.5 border-b border-dashed border-black space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>Order #:</span>
                    <span className="font-bold">{createdOrderResponse.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span>{new Date().toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span className="font-bold uppercase">{orderSource}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Staff:</span>
                    <span>{adminUser?.name || 'Counter'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold">{createdOrderResponse.receiptData?.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mobile:</span>
                    <span>+91 {createdOrderResponse.receiptData?.customerMobile}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-2.5 border-b-2 border-dashed border-black">
                  <div className="flex justify-between font-bold pb-1 text-[10px] border-b border-black">
                    <span className="flex-1">ITEM DESCRIPTION</span>
                    <span className="w-12 text-center">QTY</span>
                    <span className="w-16 text-right">TOTAL</span>
                  </div>
                  <div className="space-y-1.5 pt-1.5 text-[11px]">
                    {createdOrderResponse.receiptData?.items?.map((it, i) => (
                      <div key={i} className="flex justify-between items-start">
                        <span className="flex-1 pr-1 leading-tight">{it.name}</span>
                        <span className="w-12 text-center">{it.quantity}</span>
                        <span className="w-16 text-right font-bold">₹{it.totalPrice}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="py-2.5 border-b-2 border-dashed border-black space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{createdOrderResponse.receiptData?.subtotal}</span>
                  </div>
                  {createdOrderResponse.receiptData?.discountAmount > 0 && (
                    <div className="flex justify-between font-bold">
                      <span>Discount:</span>
                      <span>- ₹{createdOrderResponse.receiptData?.discountAmount}</span>
                    </div>
                  )}
                  {createdOrderResponse.receiptData?.shippingCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery:</span>
                      <span>+ ₹{createdOrderResponse.receiptData?.shippingCharge}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-black pt-1 border-t border-black">
                    <span>GRAND TOTAL:</span>
                    <span>₹{createdOrderResponse.grandTotal}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>Amount Paid ({createdOrderResponse.receiptData?.paymentMethod}):</span>
                    <span className="font-bold">₹{createdOrderResponse.amountPaid}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs">
                    <span>BALANCE DUE:</span>
                    <span>₹{createdOrderResponse.balanceDue}</span>
                  </div>
                </div>

                {/* Tracking & Footer */}
                <div className="pt-3 text-center text-[10px] space-y-1">
                  <p className="font-bold">Live Tracking: https://printbazzar.online/track-order/{createdOrderResponse.orderNumber}</p>
                  <p className="text-gray-500">Thank you for visiting Print Bazzar Trichy!</p>
                  <p className="text-[9px] text-gray-400">All prices include 18% GST. Computer generated receipt.</p>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end pt-3 border-t border-gray-200 print:hidden">
            <Button
              size="sm"
              color="warning"
              onClick={() => {
                setShowReceiptModal(false);
                setCreatedOrderResponse(null);
              }}
              className="font-bold"
            >
              Start Next Walk-in Order
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Linked Job Card Modal */}
      {showJobCardModal && createdOrderResponse && (
        <JobCardModal
          show={showJobCardModal}
          onClose={() => setShowJobCardModal(false)}
          order={createdOrderResponse.order}
        />
      )}
    </div>
  );
}
