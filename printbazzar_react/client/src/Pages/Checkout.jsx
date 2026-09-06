import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, TextInput, Label, Select, Checkbox, Spinner, Alert } from 'flowbite-react';
import { HiHome, HiLockClosed, HiCheckCircle, HiOutlineSparkles, HiOutlineTruck, HiOutlineRefresh } from 'react-icons/hi';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { api } from '../services/api';
import PaymentGatewayModal from '../Components/PaymentGatewayModal';
import LazyImage from '../Components/LazyImage';
import GoogleAuthButton from '../Components/GoogleAuthButton';
import { useBusinessInfo } from '../context/BusinessInfoContext';

export default function Checkout() {
  const { businessInfo } = useBusinessInfo();
  const { cartItems, cartSubtotal, cartShipping, cartGrandTotal, clearCart } = useCart();
  const { customer, isCorporate, setCustomerSession } = useCustomerAuth();
  const navigate = useNavigate();

  const [storeSettings, setStoreSettings] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState(null);
  const [submitStatusMessage, setSubmitStatusMessage] = useState('');
  const isSubmittingRef = useRef(false);

  // Dynamic OTP & Authentication Flags from Backend Settings API
  const isOtpRequired = Boolean(storeSettings?.MOBILE_OTP_REQUIRED);
  const isOtpEnabled = Boolean(storeSettings?.MOBILE_OTP_ENABLED);

  // OTP Verification state (active when isOtpRequired is true)
  const [otpStep, setOtpStep] = useState('IDLE'); // 'IDLE' | 'SENT' | 'VERIFIED'
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpBannerMsg, setOtpBannerMsg] = useState('');
  const [otpBannerError, setOtpBannerError] = useState('');

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

  const handleSendOtp = async () => {
    const cleanMobile = formData.customerMobile.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      setOtpBannerError('Please enter a valid 10-digit mobile number first.');
      return;
    }
    setOtpLoading(true);
    setOtpBannerError('');
    setOtpBannerMsg('');
    try {
      const res = await api.sendCustomerOtp({ mobile: cleanMobile });
      if (res.success) {
        setOtpStep('SENT');
        setOtpBannerMsg(res.message || `OTP code sent to +91 ${cleanMobile}`);
        if (res.devOtp) {
          setOtpCode(res.devOtp); // Convenience in development/testing mode
        }
      } else if (res.code === 'OTP_OPTIONAL') {
        setOtpStep('VERIFIED');
        setOtpBannerMsg(res.message || 'Mobile OTP is optional. You may proceed directly with checkout.');
      } else {
        setOtpBannerError(res.message || 'Failed to send verification OTP.');
      }
    } catch (err) {
      setOtpBannerError(err.message || 'Error sending OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanMobile = formData.customerMobile.replace(/\D/g, '');
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpBannerError('Please enter the complete 6-digit OTP code.');
      return;
    }
    setOtpLoading(true);
    setOtpBannerError('');
    try {
      const res = await api.verifyCustomerOtp({
        mobile: cleanMobile,
        otp: otpCode.trim(),
        name: formData.customerName,
      });
      if (res.success) {
        setOtpStep('VERIFIED');
        setOtpBannerMsg('Mobile number verified successfully!');
        if (res.customer && setCustomerSession) {
          setCustomerSession(res.customer, res.token);
        }
      } else {
        setOtpBannerError(res.message || 'Invalid verification OTP code.');
      }
    } catch (err) {
      setOtpBannerError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.customerName.trim() || formData.customerName.trim().length < 2) {
      newErrors.customerName = 'Full Name is required.';
    }

    const cleanMobile = formData.customerMobile.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      newErrors.customerMobile = 'Valid 10-digit mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      newErrors.customerMobile = 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
    }

    // When backend policy mandates OTP, ensure customer is authenticated or verified
    if (isOtpRequired && !customer && otpStep !== 'VERIFIED') {
      newErrors.customerMobile = 'Mobile OTP verification is required prior to order placement.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Email is required for order confirmation.';
    } else if (!emailRegex.test(formData.customerEmail.trim())) {
      newErrors.customerEmail = 'Please enter a valid email address.';
    }

    if (formData.deliveryMethod === 'COURIER') {
      if (!formData.street.trim() || formData.street.trim().length < 5) {
        newErrors.street = 'Delivery address is required for courier dispatch.';
      }
      const cleanPincode = formData.pincode.replace(/\D/g, '');
      if (!cleanPincode || cleanPincode.length !== 6) {
        newErrors.pincode = 'Valid 6-digit postal pincode is required.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 1-Click Direct Order Placement
  const handleSubmitOrder = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isOtpRequired && !customer && otpStep !== 'VERIFIED') {
      setSubmitError('Mobile OTP verification is required prior to order placement. Please verify your mobile number above.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!validateForm()) return;
    executeOrderPlacement();
  };

  const executeOrderPlacement = async () => {
    if (isSubmittingRef.current || isSubmitting) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitStatusMessage('Securing print specifications & generating production jobs...');

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
        // Auto-authenticate guest customer so they can track orders immediately
        if (res.customerToken && res.customer && setCustomerSession) {
          setCustomerSession(res.customer, res.customerToken);
        }

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
        setSubmitError(res.message || 'Failed to place order. Please try again.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setSubmitError(err.message || 'An unexpected error occurred. Please check your connection and try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setSubmitStatusMessage('');
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
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠</span>
            <div>
              <strong className="block text-red-800">Order Submission Notice:</strong>
              <span>{submitError}</span>
            </div>
          </div>
          <Button
            size="xs"
            color="failure"
            onClick={handleSubmitOrder}
            className="font-bold whitespace-nowrap self-end sm:self-center shadow-xs"
          >
            Retry Order ➔
          </Button>
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
                Contact & Customer Details
              </h2>
              {customer ? (
                <span className="text-xs bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <HiCheckCircle className="w-4 h-4 text-green-600" /> Logged In ({customer.name || customer.email || customer.mobile})
                </span>
              ) : isOtpRequired ? (
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  🔒 Mobile OTP Verification Required
                </span>
              ) : (
                <span className="text-xs bg-green-50 border border-green-200 text-green-800 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <HiCheckCircle className="w-4 h-4 text-green-600" /> Guest Checkout (OTP Optional)
                </span>
              )}
            </div>

            {!customer && (
              <div className="mb-5 p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 border border-amber-200/90 rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">⚡</span>
                      <strong className="text-xs font-black text-amber-950 uppercase tracking-wider">
                        Express 1-Click Checkout
                      </strong>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Sign in with Google to auto-fill your delivery info instantly, or directly enter details below.
                    </p>
                  </div>
                  <div className="w-full sm:w-auto shrink-0">
                    <GoogleAuthButton
                      compact
                      text="Continue with Google"
                      onSuccess={(cust) => {
                        if (cust) {
                          setFormData((prev) => ({
                            ...prev,
                            customerName: cust.name || prev.customerName,
                            customerEmail: cust.email || prev.customerEmail,
                            customerMobile: cust.mobile || prev.customerMobile,
                            customerWhatsapp: cust.whatsapp || cust.mobile || prev.customerWhatsapp,
                            street: cust.address || prev.street,
                            city: cust.city || prev.city,
                            pincode: cust.pincode || prev.pincode,
                            gstNumber: cust.gstNumber || prev.gstNumber,
                          }));
                        }
                      }}
                    />
                  </div>
                </div>
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
                {!isOtpRequired && (
                  <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                    <span className="text-green-600 font-bold">✔</span> Mobile verification is optional.
                  </p>
                )}
              </div>

              {/* Inline OTP Verification Card (Active only when backend configures MOBILE_OTP_REQUIRED=true) */}
              {isOtpRequired && !customer && (
                <div className="sm:col-span-2 p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <span>🔒</span> Mobile OTP Verification (Required)
                    </span>
                    {otpStep === 'SENT' && (
                      <span className="text-[11px] text-amber-700 font-medium">
                        OTP code sent to +91 {formData.customerMobile}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-800">
                    To finalize and secure your print order, please verify your mobile number with a quick 6-digit code.
                  </p>

                  {otpBannerError && (
                    <p className="text-xs text-red-600 font-semibold">{otpBannerError}</p>
                  )}
                  {otpBannerMsg && (
                    <p className="text-xs text-green-700 font-semibold">{otpBannerMsg}</p>
                  )}

                  {otpStep !== 'SENT' && otpStep !== 'VERIFIED' ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="xs"
                        color="warning"
                        onClick={handleSendOtp}
                        disabled={otpLoading}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
                      >
                        {otpLoading ? <Spinner size="xs" /> : 'Send Verification OTP ➔'}
                      </Button>
                    </div>
                  ) : otpStep === 'SENT' ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1">
                      <TextInput
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6-digit OTP"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-36 min-h-[38px]"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="xs"
                          color="dark"
                          onClick={handleVerifyOtp}
                          disabled={otpLoading}
                          className="bg-gray-900 hover:bg-black text-white font-bold"
                        >
                          {otpLoading ? <Spinner size="xs" /> : 'Verify Code ➔'}
                        </Button>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpLoading}
                          className="text-xs text-gray-500 underline hover:text-gray-800 ml-1"
                        >
                          Resend Code
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-green-800 font-bold flex items-center gap-1.5 pt-1">
                      <HiCheckCircle className="w-4 h-4 text-green-600" />
                      <span>Mobile Number Verified (+91 {formData.customerMobile})</span>
                    </div>
                  )}
                </div>
              )}

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
                  <LazyImage
                    src={item.product?.thumbnailUrl || '/default-image.png'}
                    alt={item.product?.name}
                    containerClassName="w-14 h-14 rounded-lg bg-[#f8f9fa] border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden"
                    className="w-full h-full object-contain p-1"
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

      {/* Dedicated Full-Screen Non-Dismissible Order Submission Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-4 border border-yellow-300">
            <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
              <Spinner size="xl" />
            </div>
            <h3 className="text-xl font-black text-gray-900">
              Processing Your Print Order...
            </h3>
            <p className="text-xs text-gray-600 font-medium">
              {submitStatusMessage || "Verifying print specifications, generating job cards & connecting to payment gateway..."}
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-bold">
              🔒 Please do not refresh, close, or press back while we finalize your order in our press system.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
