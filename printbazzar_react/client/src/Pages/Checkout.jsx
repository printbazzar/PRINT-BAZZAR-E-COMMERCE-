import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, TextInput, Label, Select, Checkbox, Spinner, Alert, Modal } from 'flowbite-react';
import { HiHome, HiLockClosed, HiCheckCircle, HiOutlineSparkles, HiOutlineTruck, HiOutlineDocumentText, HiOutlineRefresh } from 'react-icons/hi';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { api } from '../services/api';
import PaymentGatewayModal from '../Components/PaymentGatewayModal';
import { useBusinessInfo } from '../context/BusinessInfoContext';

export default function Checkout() {
  const { businessInfo } = useBusinessInfo();
  const { cartItems, cartSubtotal, cartShipping, cartGrandTotal, clearCart } = useCart();
  const { customer, isCorporate, sendOtp, verifyOtp } = useCustomerAuth();
  const navigate = useNavigate();

  const [storeSettings, setStoreSettings] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState(null);

  // Quick OTP Authentication State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpMobile, setOtpMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  // Mandatory Final Order Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    customerName: customer?.name || '',
    customerMobile: customer?.mobile || '',
    customerWhatsapp: customer?.whatsapp || customer?.mobile || '',
    customerEmail: customer?.email || '',
    deliveryMethod: 'COURIER', // 'COURIER' | 'STORE_PICKUP'
    street: customer?.address || '',
    city: customer?.city || 'Tiruchirappalli',
    state: customer?.state || 'Tamil Nadu',
    pincode: customer?.pincode || '',
    landmark: '',
    gstNumber: customer?.gstNumber || '',
    deliveryType: 'COURIER',
    paymentMethod: 'UPI',
  });

  const effectiveShipping = formData.deliveryMethod === 'STORE_PICKUP' ? 0 : cartShipping;
  const effectiveGrandTotal = cartSubtotal + effectiveShipping;

  // Detect Design Service requirement
  const hasDesignItems = cartItems.some(
    (i) => i.artworkOption === 'DESIGN_SUPPORT' || i.designRequired || (i.designFee && i.designFee > 0)
  );
  const totalDesignFee = cartItems.reduce(
    (acc, it) => acc + (it.designFee || it.designCharge || 0),
    0
  );
  const isDesignSplitActive =
    hasDesignItems && totalDesignFee > 0 && storeSettings?.DESIGN_SPLIT_PAYMENT !== false;
  const initialPayableNow = isDesignSplitActive ? totalDesignFee : effectiveGrandTotal;
  const balanceDueLater = isDesignSplitActive ? Math.max(0, effectiveGrandTotal - totalDesignFee) : 0;

  useEffect(() => {
    if (customer) {
      setFormData((prev) => ({
        ...prev,
        customerName: customer.name || prev.customerName,
        customerMobile: customer.mobile || prev.customerMobile,
        customerWhatsapp: customer.whatsapp || customer.mobile || prev.customerWhatsapp,
        customerEmail: customer.email || prev.customerEmail,
        street: customer.address || prev.street,
        city: customer.city || prev.city,
        pincode: customer.pincode || prev.pincode,
        gstNumber: customer.gstNumber || prev.gstNumber,
      }));
    }
  }, [customer]);

  useEffect(() => {
    api
      .getPublicSettings()
      .then((res) => {
        if (res.success && res.data) {
          setStoreSettings(res.data);
          if (res.data.ENABLE_ONLINE_PAYMENTS === false && res.data.ENABLE_COD) {
            setFormData((prev) => ({ ...prev, paymentMethod: 'CASH' }));
          }
        }
      })
      .catch((err) => console.warn('Could not load public store settings:', err.message));
  }, []);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (cartItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Cart is Empty</h2>
        <p className="text-gray-600 mb-6">Please add items to your cart before proceeding to checkout.</p>
        <Button as={Link} to="/shop" color="dark" className="mx-auto">
          Go To Products
        </Button>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.customerName.trim()) newErrors.customerName = 'Full Name is required.';
    if (!formData.customerMobile.trim() || formData.customerMobile.length < 10)
      newErrors.customerMobile = 'Valid 10-digit mobile number is required.';
    if (!formData.customerEmail.trim()) newErrors.customerEmail = 'Email is required for order confirmation.';

    if (formData.deliveryMethod === 'COURIER') {
      if (!formData.street.trim()) newErrors.street = 'Delivery address is required for courier dispatch.';
      if (!formData.pincode.trim() || formData.pincode.length < 6)
        newErrors.pincode = 'Valid 6-digit postal pincode is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // OTP Timer Countdown
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleOpenOtpModal = () => {
    setOtpMobile(formData.customerMobile || '');
    setOtpCode('');
    setOtpError('');
    setOtpSent(false);
    setOtpModalOpen(true);
  };

  const handleSendOtp = async () => {
    if (!otpMobile.trim() || otpMobile.trim().length < 10) {
      setOtpError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await sendOtp(otpMobile.trim());
      if (res.success) {
        setOtpSent(true);
        setOtpTimer(60);
      } else {
        setOtpError(res.message || 'Failed to send OTP code.');
      }
    } catch (err) {
      setOtpError(err.message || 'Error sending OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setOtpError('Please enter the 6-digit OTP code.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await verifyOtp(otpMobile.trim(), otpCode.trim(), formData.customerName);
      if (res.success) {
        setOtpModalOpen(false);
        if (res.customer) {
          setFormData((prev) => ({
            ...prev,
            customerName: res.customer.name || prev.customerName,
            customerMobile: res.customer.mobile || prev.customerMobile,
            customerWhatsapp: res.customer.whatsapp || res.customer.mobile || prev.customerWhatsapp,
            customerEmail: res.customer.email || prev.customerEmail,
            street: res.customer.address || prev.street,
            city: res.customer.city || prev.city,
            pincode: res.customer.pincode || prev.pincode,
            gstNumber: res.customer.gstNumber || prev.gstNumber,
          }));
        }
      } else {
        setOtpError(res.message || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      setOtpError(err.message || 'OTP verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 1: Validate and open Final Order Review Modal (Enforcing Authentication Gate)
  const handleSubmitOrder = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) return;
    if (!customer) {
      setSubmitError('Please verify your mobile number with OTP to continue to payment.');
      handleOpenOtpModal();
      return;
    }
    setReviewModalOpen(true);
  };

  // Step 2: Customer confirmed review -> Execute Order Placement
  const executeOrderPlacement = async () => {
    if (isSubmitting) return;
    if (!customer) {
      setSubmitError('Please verify your mobile number with OTP to continue.');
      handleOpenOtpModal();
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    setReviewModalOpen(false);

    try {
      const isPickup = formData.deliveryMethod === 'STORE_PICKUP';
      const orderPayload = {
        customerId: customer?.id || null,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerMobile: formData.customerMobile,
        customerWhatsapp: formData.customerWhatsapp || formData.customerMobile,
        deliveryMethod: formData.deliveryMethod,
        shippingAddress: isPickup
          ? {
              street: businessInfo.address?.pressFacilityAddress || 'Store Pickup - Print Bazzar Press Facility, Singarathope',
              city: businessInfo.address?.city || 'Tiruchirappalli',
              state: businessInfo.address?.state || 'Tamil Nadu',
              pincode: businessInfo.address?.pincode || '620008',
            }
          : {
              street: formData.street,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
              landmark: formData.landmark,
            },
        billingAddress: {
          street: formData.street || 'Big Bazzar Street',
          city: formData.city || 'Tiruchirappalli',
          state: formData.state || 'Tamil Nadu',
          pincode: formData.pincode || '620008',
        },
        gstNumber: formData.gstNumber || null,
        deliveryType: isPickup ? 'PICKUP' : formData.deliveryType,
        paymentMethod: formData.paymentMethod,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
          designRequired: item.designRequired || item.artworkOption === 'DESIGN_SUPPORT',
          artworkOption: item.artworkOption || (item.designRequired ? 'DESIGN_SUPPORT' : 'PRINT_READY_FILE'),
          designPackageId: item.designPackageId || null,
          designPackageName: item.designPackageName || (item.designPackage ? (item.designPackage.packageName || item.designPackage.name) : null),
          designPackage: item.designPackage || null,
          selectedAddons: item.selectedAddons || [],
          preferredStyle: item.preferredStyle || null,
          preferredColor: item.preferredColor || null,
          requirementNotes: item.requirementNotes || null,
          designCharge: item.designFee || 0,
          designBriefResponses: item.designBriefResponses || null,
          designAssets: item.designAssets || null,
          termsAccepted: Boolean(item.termsAccepted),
          termsAcceptedAt: item.termsAcceptedAt || null,
          artworkFileUrl: item.artworkFileUrl || null,
          artworkFileName: item.artworkFileName || null,
          artworkVersion: item.artworkVersion || 'V1',
          artworkAcknowledged: Boolean(item.artworkAcknowledged),
          preflightReport: item.preflightReport || null,
        })),
      };

      const res = await api.createOrder(orderPayload);

      if (res.success && res.orderNumber) {
        if (formData.paymentMethod === 'CASH') {
          // Cash on Delivery / Shop Pickup
          clearCart();
          navigate(`/order-confirmation/${res.orderNumber}`, {
            state: { order: res.order },
          });
        } else {
          // Mandatory Online Payment Collection Before Order Confirmation
          setActivePaymentOrder({
            orderNumber: res.orderNumber,
            amount: res.initialPayableAmount || initialPayableNow,
            paymentStage: isDesignSplitActive ? 'DESIGN' : 'FULL',
            customer: {
              name: formData.customerName,
              email: formData.customerEmail,
              mobile: formData.customerMobile,
            },
            fullOrder: res.order,
          });
          setPaymentModalOpen(true);
        }
      } else {
        setSubmitError(res.message || 'Failed to place order.');
      }
    } catch (err) {
      setSubmitError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-28 lg:pb-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link to="/cart" className="hover:underline">Cart</Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">Checkout</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <HiLockClosed className="w-7 h-7 text-yellow-500" /> Secure Checkout
      </h1>

      {submitError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
          ⚠ {submitError}
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Customer & Address Information */}
        <div className="lg:col-span-7 space-y-6">
          {/* Contact Details Card */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-yellow-400 text-black text-xs font-extrabold rounded-full flex items-center justify-center">1</span>
                Contact & Account Verification
              </h2>
              {customer ? (
                <span className="text-xs bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <HiCheckCircle className="w-4 h-4 text-green-600" /> Account Verified ({customer.mobile})
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenOtpModal}
                  className="text-xs font-bold text-yellow-950 bg-yellow-300 hover:bg-yellow-400 px-3.5 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1.5"
                >
                  ⚡ Verify Mobile via OTP (Required)
                </button>
              )}
            </div>

            {!customer && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <strong className="block text-amber-950 font-bold">🔒 Customer Authentication Gate</strong>
                  <span>Please verify your mobile number with a quick 6-digit OTP before proceeding to payment. Your selected specifications and artwork files will be 100% preserved.</span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenOtpModal}
                  className="bg-amber-800 hover:bg-amber-900 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-xs"
                >
                  Verify Now ➔
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label value="Full Name *" />
                <TextInput
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="e.g. Abdul Rajak"
                  autoComplete="name"
                  className="min-h-[44px]"
                />
                {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
              </div>

              <div>
                <Label value="Mobile Number (for Order Updates) *" />
                <TextInput
                  type="tel"
                  inputMode="tel"
                  name="customerMobile"
                  value={formData.customerMobile}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  maxLength={10}
                  className="min-h-[44px]"
                />
                {errors.customerMobile && <p className="text-xs text-red-500 mt-1">{errors.customerMobile}</p>}
              </div>

              <div>
                <Label value="WhatsApp Number (Optional)" />
                <TextInput
                  type="tel"
                  inputMode="tel"
                  name="customerWhatsapp"
                  value={formData.customerWhatsapp}
                  onChange={handleChange}
                  placeholder="Leave empty if same as mobile"
                  maxLength={10}
                  className="min-h-[44px]"
                />
              </div>

              <div>
                <Label value="Email Address *" />
                <TextInput
                  type="email"
                  inputMode="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="min-h-[44px]"
                />
                {errors.customerEmail && <p className="text-xs text-red-500 mt-1">{errors.customerEmail}</p>}
              </div>
            </div>
          </div>

          {/* Delivery Method & Address Card */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-400 text-black text-xs font-extrabold rounded-full flex items-center justify-center">2</span>
              How Would You Like to Receive Your Order?
            </h2>

            {/* Delivery Method Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div
                onClick={() => setFormData({ ...formData, deliveryMethod: 'COURIER', deliveryType: 'COURIER' })}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.deliveryMethod === 'COURIER'
                    ? 'border-yellow-400 bg-yellow-50/50 shadow-sm ring-2 ring-yellow-400/20'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🚚</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    formData.deliveryMethod === 'COURIER' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {effectiveShipping === 0 ? 'FREE' : `₹${effectiveShipping}`}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm mt-2">Doorstep Courier Delivery</h4>
                <p className="text-xs text-gray-500 mt-1 leading-snug">
                  Safe dispatch via DTDC / ST Courier / Professional Courier to your address.
                </p>
              </div>

              <div
                onClick={() => setFormData({ ...formData, deliveryMethod: 'STORE_PICKUP', deliveryType: 'PICKUP' })}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.deliveryMethod === 'STORE_PICKUP'
                    ? 'border-yellow-400 bg-yellow-50/50 shadow-sm ring-2 ring-yellow-400/20'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🏪</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-800">
                    FREE (₹0)
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm mt-2">Direct Store Self-Pickup</h4>
                <p className="text-xs text-gray-500 mt-1 leading-snug">
                  Collect directly from our Trichy press facility once your job is ready.
                </p>
              </div>
            </div>

            {/* Conditional Content: Store Pickup vs Courier Form */}
            {formData.deliveryMethod === 'STORE_PICKUP' ? (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-gray-700 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-base">📍</span>
                  <div>
                    <h5 className="font-bold text-amber-950 text-sm">{businessInfo.brand?.brandName || 'Print Bazzar'} Press Facility Pickup Point:</h5>
                    <p className="text-amber-900 font-medium mt-0.5">
                      {businessInfo.address?.pressFacilityAddress || businessInfo.address?.fullDisplayAddress || 'No. 42, Big Bazzar Street, Singarathope, Tiruchirappalli - 620008, Tamil Nadu'}
                    </p>
                    <p className="text-amber-700 mt-1">
                      Operating Hours: {businessInfo.operatingHours?.weekdays || 'Mon - Sat, 9:30 AM to 8:30 PM'}.
                    </p>
                  </div>
                </div>
                <div className="border-t border-amber-200/80 pt-2 text-[11px] text-amber-800">
                  ✔ We will notify you via SMS & WhatsApp when your job is packed and ready for collection.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label value="Street Address / Building / Flat No. *" />
                  <TextInput
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    placeholder="e.g. 12 A, Allimal Street, Big Bazzar"
                    autoComplete="street-address"
                    className="min-h-[44px]"
                  />
                  {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label value="City *" />
                    <TextInput
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      autoComplete="address-level2"
                      className="min-h-[44px]"
                    />
                  </div>
                  <div>
                    <Label value="State *" />
                    <TextInput
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      autoComplete="address-level1"
                      className="min-h-[44px]"
                    />
                  </div>
                  <div>
                    <Label value="Pincode *" />
                    <TextInput
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="620008"
                      autoComplete="postal-code"
                      className="min-h-[44px]"
                    />
                    {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
                  </div>
                </div>

                <div>
                  <Label value="Landmark (Optional)" />
                  <TextInput
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleChange}
                    placeholder="Near clock tower, etc."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Business GST Information (Optional) */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-400 text-black text-xs font-extrabold rounded-full flex items-center justify-center">3</span>
              GST & Payment Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <Label value="GSTIN Number (Optional, for Tax Invoice)" />
                <TextInput
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  placeholder="33AAAAA0000A1Z5"
                />
              </div>

              <div>
                <Label value="Payment Option" />
                <Select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                >
                  <option value="UPI">UPI / GPay / PhonePe / QR Code</option>
                  <option value="NET_BANKING">Bank Transfer (NEFT / IMPS)</option>
                  <option value="CASH">Cash on Delivery / Pay at Shop Pickup</option>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5">
          <div className="bg-white border rounded-xl p-6 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b">Review Order Items ({cartItems.length})</h2>

            <div className="divide-y max-h-60 overflow-y-auto mb-4">
              {cartItems.map((item) => (
                <div key={item.cartItemId} className="py-3 flex gap-3 text-sm">
                  <img
                    src={item.product?.thumbnailUrl || '/default-image.png'}
                    alt={item.product?.name}
                    className="w-14 h-14 object-contain p-1 bg-[#f8f9fa] rounded-lg border border-gray-200 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 leading-tight">{item.product?.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Qty: <span className="font-medium">{item.quantity} {item.quantityUnit || 'pcs'}</span> | ₹{item.totalPrice}
                    </p>
                    {item.artworkOption === 'DESIGN_SUPPORT' ? (
                      <span className="text-[11px] text-purple-700 font-bold block mt-0.5">
                        🎨 Design Support: {item.designPackageName || (item.designPackage ? item.designPackage.packageName : 'Package')} (+₹{item.designFee || 0})
                      </span>
                    ) : item.artworkFileName ? (
                      <span className="text-[11px] text-green-600 font-medium block mt-0.5">
                        ✔ Artwork: {item.artworkFileName}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 text-sm text-gray-600 border-t pt-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-gray-900">₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span className="font-semibold text-gray-900">
                  {effectiveShipping === 0 ? (
                    <span className="text-green-600 font-bold">
                      {formData.deliveryMethod === 'STORE_PICKUP' ? 'FREE (Store Pickup)' : 'FREE'}
                    </span>
                  ) : (
                    `₹${effectiveShipping}`
                  )}
                </span>
              </div>
              <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                <div className="flex justify-between text-gray-800 font-bold">
                  <span>Applicable GST (18% included):</span>
                  <span className="text-gray-900">₹{Math.round((cartSubtotal * 18) / 100)}</span>
                </div>
                <div className="flex justify-between text-gray-500 pl-2">
                  <span>• Central GST (CGST 9%):</span>
                  <span>₹{Math.round((cartSubtotal * 9) / 100)}</span>
                </div>
                <div className="flex justify-between text-gray-500 pl-2">
                  <span>• State GST (SGST 9%):</span>
                  <span>₹{Math.round((cartSubtotal * 9) / 100)}</span>
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
                <span>Grand Total:</span>
                <span className="text-gray-900 font-extrabold text-xl">₹{effectiveGrandTotal}</span>
              </div>

              {/* Two-Stage Design Milestone Breakdown */}
              {isDesignSplitActive && (
                <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3.5 space-y-2 mt-3">
                  <div className="flex items-center gap-1.5 text-purple-900 font-extrabold text-xs">
                    <HiOutlineSparkles className="w-4 h-4 text-purple-600" />
                    <span>Two-Stage Milestone Payment</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-purple-950">
                      <span>1. Design Advance (Pay Now):</span>
                      <span className="text-purple-700 text-sm font-black">₹{initialPayableNow}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 text-[11px]">
                      <span>2. Printing Balance (Due on Proof Approval):</span>
                      <span className="font-semibold text-gray-800">₹{balanceDueLater}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-purple-800 italic pt-1.5 border-t border-purple-200/60 leading-tight">
                    Pay only the design fee today. Press printing balance is collected after our designers create your proof and you approve it.
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              color="dark"
              disabled={isSubmitting}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold py-2 mt-6 text-base rounded-lg shadow-md"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" /> Processing Order...
                </div>
              ) : formData.paymentMethod === 'CASH' ? (
                `Place Order via Cash / COD (₹${effectiveGrandTotal})`
              ) : isDesignSplitActive ? (
                `Pay Design Advance (₹${initialPayableNow}) & Place Order`
              ) : (
                `Pay Now & Place Order (₹${effectiveGrandTotal})`
              )}
            </Button>

            <p className="text-[11px] text-center text-gray-400 mt-3">
              By placing your order, you agree to Print Bazzar printing and proofing guidelines.
            </p>
          </div>
        </div>

        {/* Sticky Mobile Checkout Action Bar */}
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-md border-t border-gray-200 px-4 py-3 z-50 shadow-2xl flex items-center justify-between gap-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">
              {isDesignSplitActive ? 'Pay Now (Design Advance)' : 'Total Payable'}
            </span>
            <span className="text-xl font-black text-red-600 block">
              ₹{(formData.paymentMethod === 'CASH' ? effectiveGrandTotal : initialPayableNow)?.toLocaleString('en-IN')}
            </span>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-black text-sm px-6 py-2.5 rounded-xl shadow-md min-h-[48px] whitespace-nowrap"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-1.5">
                <Spinner size="sm" />
                <span>Processing...</span>
              </div>
            ) : formData.paymentMethod === 'CASH' ? (
              'Confirm COD Order ➔'
            ) : isDesignSplitActive ? (
              `Pay ₹${initialPayableNow} ➔`
            ) : (
              'Place Order & Pay ➔'
            )}
          </Button>
        </div>
      </form>

      {/* Payment Gateway Modal (Online Payments) */}
      {activePaymentOrder && (
        <PaymentGatewayModal
          show={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          orderNumber={activePaymentOrder.orderNumber}
          amount={activePaymentOrder.amount}
          paymentStage={activePaymentOrder.paymentStage}
          customer={activePaymentOrder.customer}
          onSuccess={(verifyRes) => {
            clearCart();
            setPaymentModalOpen(false);
            navigate(`/order-confirmation/${activePaymentOrder.orderNumber}`, {
              state: {
                order: {
                  ...activePaymentOrder.fullOrder,
                  paymentStatus: verifyRes.paymentStatus,
                  orderStatus: verifyRes.orderStatus,
                },
                paymentVerified: true,
              },
            });
          }}
        />
      )}

      {/* Quick Mobile OTP Login Modal */}
      <Modal show={otpModalOpen} onClose={() => setOtpModalOpen(false)} size="md">
        <Modal.Header>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-extrabold text-base text-gray-900">Quick Mobile OTP Login</span>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4 text-xs">
            <p className="text-gray-600">
              Sign in with your 10-digit mobile number to access your saved delivery addresses and bind this order directly to your account.
            </p>

            {otpError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg font-semibold">
                ⚠ {otpError}
              </div>
            )}

            <div>
              <Label value="Mobile Number (10 digits)" className="mb-1 block font-bold" />
              <div className="flex gap-2">
                <TextInput
                  type="tel"
                  maxLength={10}
                  value={otpMobile}
                  onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit mobile number"
                  className="flex-1 min-h-[42px]"
                  disabled={otpSent && otpTimer > 0}
                />
                <Button
                  color="dark"
                  onClick={handleSendOtp}
                  disabled={otpLoading || (otpSent && otpTimer > 0) || otpMobile.length < 10}
                  className="bg-black hover:bg-gray-800 text-white font-bold whitespace-nowrap text-xs"
                >
                  {otpLoading ? <Spinner size="xs" /> : otpSent ? (otpTimer > 0 ? `Resend (${otpTimer}s)` : 'Resend') : 'Send OTP'}
                </Button>
              </div>
            </div>

            {otpSent && (
              <div className="pt-3 border-t space-y-3">
                <div className="p-2 bg-green-50 border border-green-200 text-green-800 rounded-lg text-xs">
                  ✔ 6-digit OTP code sent to <strong>+91 {otpMobile}</strong>.
                </div>
                <div>
                  <Label value="Enter 6-Digit OTP Code" className="mb-1 block font-bold" />
                  <TextInput
                    type="tel"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 123456"
                    className="text-center font-mono font-bold tracking-widest text-lg min-h-[44px]"
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otpCode.length < 6}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold py-2 text-sm rounded-xl shadow"
                >
                  {otpLoading ? <Spinner size="sm" /> : 'Verify & Continue Checkout ➔'}
                </Button>
              </div>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* Mandatory Final Order Review Modal */}
      <Modal show={reviewModalOpen} onClose={() => setReviewModalOpen(false)} size="2xl">
        <Modal.Header>
          <div className="flex items-center gap-2">
            <HiOutlineDocumentText className="w-5 h-5 text-yellow-500" />
            <span className="font-extrabold text-base sm:text-lg text-gray-900">
              Confirm Print Order Details
            </span>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4 text-xs">
            {/* Customer & Fulfillment Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Customer Information</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{formData.customerName}</p>
                <p className="text-gray-600">📱 +91 {formData.customerMobile}</p>
                <p className="text-gray-600 truncate">✉ {formData.customerEmail}</p>
                {formData.gstNumber && (
                  <p className="text-purple-700 font-bold mt-1">GSTIN: {formData.gstNumber}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Delivery Method & Destination</span>
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-1 ${
                  formData.deliveryMethod === 'STORE_PICKUP' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                }`}>
                  {formData.deliveryMethod === 'STORE_PICKUP' ? '🏪 Direct Store Self-Pickup' : '🚚 Doorstep Courier'}
                </span>
                {formData.deliveryMethod === 'STORE_PICKUP' ? (
                  <p className="text-gray-600 mt-1 leading-snug">
                    Print Bazzar Press Facility, Singarathope, Trichy - 620008. Free Pickup.
                  </p>
                ) : (
                  <p className="text-gray-600 mt-1 leading-snug">
                    {formData.street}, {formData.city}, {formData.state} - {formData.pincode}
                  </p>
                )}
              </div>
            </div>

            {/* Items & Artwork Summary */}
            <div className="border rounded-xl p-3 divide-y max-h-52 overflow-y-auto">
              <span className="text-[10px] uppercase font-bold text-gray-400 block pb-1.5">
                Ordered Products ({cartItems.length})
              </span>
              {cartItems.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-start gap-2">
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs">{item.product?.name}</h5>
                    <p className="text-gray-500 text-[11px]">
                      Qty: <strong>{item.quantity} {item.quantityUnit || 'pcs'}</strong>
                    </p>

                    {/* Customer-Confirmed Options */}
                    {item.selectedOptions && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(item.selectedOptions).map(([k, v]) => {
                          if (k.startsWith('_') || String(v).toLowerCase() === 'no' || String(v).toLowerCase() === 'none') return null;
                          return (
                            <span key={k} className="inline-block text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                              <strong className="text-gray-900">{k}:</strong> {String(v)}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {item.artworkOption === 'DESIGN_SUPPORT' ? (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 inline-block mt-1">
                        🎨 Design Support: {item.designPackageName || 'Custom'} (+₹{item.designFee || 0})
                      </span>
                    ) : item.artworkFileName ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-green-700 font-semibold truncate max-w-[200px]">
                          📎 {item.artworkFileName}
                        </span>
                        {item.artworkVersion && (
                          <span className="text-[9px] font-mono font-bold bg-gray-100 px-1 py-0.2 rounded border">
                            {item.artworkVersion}
                          </span>
                        )}
                        {item.preflightReport?.status === 'PASS' ? (
                          <span className="text-[9px] text-green-700 font-bold bg-green-50 px-1.5 py-0.2 rounded-full border border-green-200">
                            ✔ Preflight Pass
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <span className="font-bold text-gray-900 text-sm whitespace-nowrap">₹{item.totalPrice}</span>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="p-3 bg-gray-50 rounded-xl border space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Taxable Items Subtotal:</span>
                <span className="font-bold text-gray-900">₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery:</span>
                <span className="font-bold text-gray-900">
                  {effectiveShipping === 0 ? <span className="text-green-600">FREE</span> : `₹${effectiveShipping}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (18% included):</span>
                <span className="font-bold text-gray-900">₹{Math.round((cartSubtotal * 18) / 100)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t">
                <span>Total Amount:</span>
                <span className="text-red-600 text-base font-black">₹{effectiveGrandTotal}</span>
              </div>
              {isDesignSplitActive && (
                <div className="p-2 bg-purple-50 rounded-lg border border-purple-200 text-purple-900 mt-2 text-[11px]">
                  <strong>Two-Stage Milestone:</strong> Pay design fee ₹{initialPayableNow} now. Balance ₹{balanceDueLater} is paid upon your approval of the digital proof.
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                color="light"
                onClick={() => setReviewModalOpen(false)}
                className="flex-1 font-bold text-xs"
              >
                ← Back to Edit
              </Button>
              <Button
                color="dark"
                onClick={executeOrderPlacement}
                disabled={isSubmitting}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs py-2 rounded-xl shadow"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-1.5">
                    <Spinner size="xs" /> Processing...
                  </div>
                ) : formData.paymentMethod === 'CASH' ? (
                  `Confirm COD Order (₹${effectiveGrandTotal}) ➔`
                ) : isDesignSplitActive ? (
                  `Confirm & Pay ₹${initialPayableNow} ➔`
                ) : (
                  `Confirm & Pay ₹${effectiveGrandTotal} ➔`
                )}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
