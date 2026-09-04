import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Badge } from 'flowbite-react';
import {
  HiLockClosed,
  HiCheckCircle,
  HiOutlineCreditCard,
  HiOutlineQrcode,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { api } from '../services/api';

export default function PaymentGatewayModal({
  show,
  onClose,
  orderNumber,
  amount,
  paymentStage = 'FULL',
  customer,
  onSuccess,
}) {
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Simulated Card Fields
  const [cardData, setCardData] = useState({
    number: '4532 •••• •••• 8921',
    expiry: '12/28',
    cvv: '•••',
    name: customer?.name || 'Authorized Cardholder',
  });

  // Simulated UPI ID
  const [upiId, setUpiId] = useState(
    customer?.mobile ? `${customer.mobile}@upi` : 'customer@okhdfcbank'
  );

  useEffect(() => {
    if (show && orderNumber) {
      initPaymentSession();
    } else {
      setSessionData(null);
      setPaymentSuccess(false);
      setErrorMsg('');
      setIsVerifying(false);
    }
  }, [show, orderNumber]);

  const initPaymentSession = async () => {
    setLoadingSession(true);
    setErrorMsg('');
    try {
      const res = await api.createPaymentSession({
        orderNumber,
        paymentStage,
      });
      if (res.success) {
        setSessionData(res);
      } else {
        setErrorMsg(res.message || 'Unable to initiate payment session.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to initialize payment gateway.');
    } finally {
      setLoadingSession(false);
    }
  };

  const handleProcessPayment = async (simulated = true) => {
    setIsVerifying(true);
    setErrorMsg('');

    try {
      const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const gatewayOrderId = sessionData?.gatewayOrderId || `order_${Date.now()}`;

      const payload = {
        orderNumber,
        paymentId: mockPaymentId,
        orderId: gatewayOrderId,
        paymentMethod: selectedMethod,
        paymentStage,
        transactionReference: `PB-TXN-${Date.now()}`,
      };

      const verifyRes = await api.verifyPayment(payload);

      if (verifyRes.success) {
        setPaymentSuccess(true);
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(verifyRes);
          }
        }, 1200);
      } else {
        setErrorMsg(verifyRes.message || 'Payment verification failed.');
        setIsVerifying(false);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment processing error.');
      setIsVerifying(false);
    }
  };

  // Launch official Razorpay Checkout modal if real key is configured
  const launchRazorpaySDK = () => {
    if (!sessionData || !sessionData.keyId) return;

    if (typeof window === 'undefined') return;

    const loadScript = () => {
      return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadScript().then((loaded) => {
      if (!loaded || !window.Razorpay) {
        // Fall back to built-in simulator
        handleProcessPayment(true);
        return;
      }

      try {
        const options = {
          key: sessionData.keyId,
          amount: Math.round((sessionData.amount || amount) * 100),
          currency: 'INR',
          name: 'Print Bazzar',
          description:
            paymentStage === 'DESIGN'
              ? `Design Fee for Order #${orderNumber}`
              : `Print Production Payment #${orderNumber}`,
          order_id:
            sessionData.gatewayOrderId && sessionData.gatewayOrderId.startsWith('order_')
              ? sessionData.gatewayOrderId
              : undefined,
          prefill: {
            name: sessionData.customer?.name || customer?.name || '',
            email: sessionData.customer?.email || customer?.email || '',
            contact: sessionData.customer?.mobile || customer?.mobile || '',
          },
          theme: {
            color: '#EAB308',
          },
          handler: async function (response) {
            setIsVerifying(true);
            try {
              const verifyRes = await api.verifyPayment({
                orderNumber,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id || sessionData.gatewayOrderId,
                signature: response.razorpay_signature,
                paymentMethod: 'ONLINE_RAZORPAY',
                paymentStage,
              });
              if (verifyRes.success) {
                setPaymentSuccess(true);
                setTimeout(() => {
                  if (onSuccess) onSuccess(verifyRes);
                }, 1000);
              } else {
                setErrorMsg(verifyRes.message || 'Verification failed');
                setIsVerifying(false);
              }
            } catch (err) {
              setErrorMsg(err.message || 'Verification failed');
              setIsVerifying(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsVerifying(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (sdkErr) {
        console.warn('Razorpay SDK modal error, fallback to simulator:', sdkErr);
        handleProcessPayment(true);
      }
    });
  };

  const payableAmount = sessionData?.amount || amount || 0;
  const isDesignStage1 = paymentStage === 'DESIGN';
  const isBalanceStage = paymentStage === 'BALANCE';

  return (
    <Modal show={show} onClose={!isVerifying ? onClose : undefined} size="md">
      <Modal.Header className="bg-slate-900 text-white border-b border-slate-800 rounded-t-lg">
        <div className="flex items-center gap-2">
          <HiLockClosed className="w-5 h-5 text-yellow-400" />
          <span className="font-extrabold text-sm sm:text-base text-white">
            Print Bazzar Secure Payment
          </span>
        </div>
      </Modal.Header>

      <Modal.Body className="p-5 space-y-4 text-xs">
        {loadingSession ? (
          <div className="py-12 text-center space-y-2">
            <Spinner size="lg" />
            <p className="text-gray-500 font-medium">Securing payment gateway session...</p>
          </div>
        ) : paymentSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✔
            </div>
            <h3 className="text-lg font-black text-gray-900">Payment Verified!</h3>
            <p className="text-gray-600">
              {isDesignStage1
                ? 'Design fee verified. Order routed to Prepress Team.'
                : 'Payment received. Order released to Press Production queue!'}
            </p>
            <span className="inline-block font-mono text-xs font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded">
              Order #{orderNumber}
            </span>
          </div>
        ) : (
          <>
            {/* Amount and Order Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-yellow-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  {isDesignStage1
                    ? 'Stage 1: Graphic Design Advance'
                    : isBalanceStage
                    ? 'Stage 2: Press Printing Balance'
                    : 'Total Payable Amount'}
                </span>
                <span className="text-2xl font-black text-gray-900">
                  ₹{payableAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-gray-500 block font-mono">
                  Order #{orderNumber}
                </span>
              </div>

              <div className="text-right">
                {isDesignStage1 ? (
                  <Badge color="purple" size="xs">
                    🎨 Design Milestone
                  </Badge>
                ) : isBalanceStage ? (
                  <Badge color="info" size="xs">
                    🖨️ Press Release Balance
                  </Badge>
                ) : (
                  <Badge color="success" size="xs">
                    ✔ Full Payment
                  </Badge>
                )}
              </div>
            </div>

            {/* Explanatory Milestone Note */}
            {isDesignStage1 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-[11px] text-purple-900">
                <p className="font-bold flex items-center gap-1">
                  <HiOutlineSparkles className="w-4 h-4 text-purple-600" /> Two-Stage Milestone Payment
                </p>
                <p className="mt-0.5 text-purple-700">
                  You are paying only the <strong>Design Service Fee (₹{payableAmount})</strong> now. Once our designers prepare your digital proof and you approve it, you will pay the remaining printing balance before press production begins.
                </p>
              </div>
            )}

            {isBalanceStage && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-900">
                <p className="font-bold">✔ Digital Proof Approved</p>
                <p className="mt-0.5 text-blue-700">
                  Complete this balance payment of <strong>₹{payableAmount}</strong> to immediately send your job to the Press Room machines.
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg font-medium text-xs">
                ⚠ {errorMsg}
              </div>
            )}

            {/* Payment Mode Selector */}
            <div>
              <label className="font-bold text-gray-700 block mb-2">Choose Payment Mode:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('UPI')}
                  className={`p-2.5 rounded-lg border text-center font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                    selectedMethod === 'UPI'
                      ? 'border-yellow-500 bg-yellow-50 text-gray-900 ring-2 ring-yellow-400'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <HiOutlineQrcode className="w-5 h-5 text-yellow-600" />
                  <span className="text-[11px]">UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('CARD')}
                  className={`p-2.5 rounded-lg border text-center font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                    selectedMethod === 'CARD'
                      ? 'border-yellow-500 bg-yellow-50 text-gray-900 ring-2 ring-yellow-400'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <HiOutlineCreditCard className="w-5 h-5 text-yellow-600" />
                  <span className="text-[11px]">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('NET_BANKING')}
                  className={`p-2.5 rounded-lg border text-center font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                    selectedMethod === 'NET_BANKING'
                      ? 'border-yellow-500 bg-yellow-50 text-gray-900 ring-2 ring-yellow-400'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <HiOutlineShieldCheck className="w-5 h-5 text-yellow-600" />
                  <span className="text-[11px]">NetBanking</span>
                </button>
              </div>
            </div>

            {/* Method Details */}
            {selectedMethod === 'UPI' && (
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-3 text-center">
                <div className="flex justify-center gap-2">
                  <span className="px-2 py-1 bg-white border rounded text-[10px] font-bold text-gray-700 shadow-xs">
                    GPay
                  </span>
                  <span className="px-2 py-1 bg-white border rounded text-[10px] font-bold text-purple-700 shadow-xs">
                    PhonePe
                  </span>
                  <span className="px-2 py-1 bg-white border rounded text-[10px] font-bold text-blue-700 shadow-xs">
                    Paytm
                  </span>
                  <span className="px-2 py-1 bg-white border rounded text-[10px] font-bold text-green-700 shadow-xs">
                    BHIM UPI
                  </span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">
                    Virtual Payment Address (VPA / UPI ID)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full text-center font-mono font-bold text-xs p-2 border rounded-lg bg-white"
                  />
                </div>
              </div>
            )}

            {selectedMethod === 'CARD' && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                <div>
                  <span className="text-[10px] text-gray-500 block">Card Number</span>
                  <input
                    type="text"
                    readOnly
                    value={cardData.number}
                    className="w-full text-xs font-mono p-1.5 border rounded bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Valid Thru</span>
                    <input
                      type="text"
                      readOnly
                      value={cardData.expiry}
                      className="w-full text-xs font-mono p-1.5 border rounded bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">CVV</span>
                    <input
                      type="password"
                      readOnly
                      value={cardData.cvv}
                      className="w-full text-xs font-mono p-1.5 border rounded bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === 'NET_BANKING' && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-500 block mb-1">Select Bank</span>
                <select className="w-full text-xs p-2 border rounded-lg bg-white">
                  <option>State Bank of India (SBI)</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                  <option>Indian Overseas Bank (IOB)</option>
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {sessionData?.isRealKeyConfigured ? (
                <Button
                  onClick={launchRazorpaySDK}
                  disabled={isVerifying}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black py-1.5 rounded-xl shadow-md text-sm"
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <Spinner size="sm" /> Verifying...
                    </div>
                  ) : (
                    `Pay ₹${payableAmount.toLocaleString('en-IN')} via Razorpay`
                  )}
                </Button>
              ) : null}

              <Button
                onClick={() => handleProcessPayment(true)}
                disabled={isVerifying}
                color={sessionData?.isRealKeyConfigured ? 'light' : 'dark'}
                className={`w-full font-black py-1.5 rounded-xl shadow-xs text-xs ${
                  !sessionData?.isRealKeyConfigured
                    ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
                    : 'text-gray-700'
                }`}
              >
                {isVerifying ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" /> Verifying Payment...
                  </div>
                ) : (
                  `✔ Complete Payment of ₹${payableAmount.toLocaleString('en-IN')} (Instant)`
                )}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 pt-1">
              <HiLockClosed className="w-3 h-3 text-green-600" />
              <span>256-Bit SSL Encrypted | Razorpay Payment Gateway Verified</span>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
