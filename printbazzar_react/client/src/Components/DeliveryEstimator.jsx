import React, { useState, useEffect } from 'react';
import {
  HiOutlineLocationMarker,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineShieldCheck,
} from 'react-icons/hi';

export default function DeliveryEstimator() {
  const [pincode, setPincode] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Load persisted delivery pincode from localStorage
    const savedPin = localStorage.getItem('pb_customer_pincode');
    if (savedPin && savedPin.length === 6) {
      setPincode(savedPin);
      calculateEstimate(savedPin);
    }
  }, []);

  const formatDate = (daysToAdd) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    // Skip Sunday if delivery lands on Sunday
    if (d.getDay() === 0) {
      d.setDate(d.getDate() + 1);
    }
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateEstimate = (code) => {
    const pin = code.trim();
    if (!/^\d{6}$/.test(pin)) {
      setErrorMsg('Please enter a valid 6-digit postal code.');
      setEstimate(null);
      return;
    }

    setErrorMsg('');
    setIsChecking(true);

    setTimeout(() => {
      let region = 'Rest of India';
      let minDays = 4;
      let maxDays = 5;
      let courier = 'Bluedart / Delhivery / Speed Post';
      let tag = 'Standard All-India Express';
      let isTrichy = false;

      const num = parseInt(pin, 10);
      const prefix2 = pin.substring(0, 2);
      const prefix3 = pin.substring(0, 3);

      // Trichy & Neighboring Central TN
      if (prefix3 === '620' || prefix3 === '621') {
        region = 'Tiruchirappalli (Trichy Region)';
        minDays = 1;
        maxDays = 2;
        courier = 'Local Express / Store Pickup';
        tag = '⚡ Express Local Dispatch';
        isTrichy = true;
      }
      // Tamil Nadu & Puducherry (60xxxx to 64xxxx)
      else if (num >= 600000 && num <= 649999) {
        if (prefix2 === '60') region = 'Chennai / Northern Tamil Nadu';
        else if (prefix2 === '64') region = 'Coimbatore / Western Tamil Nadu';
        else if (prefix2 === '62') region = 'Madurai / Southern Tamil Nadu';
        else if (prefix2 === '63') region = 'Salem / Dharmapuri / Erode';
        else if (prefix2 === '61') region = 'Thanjavur / Delta Region';
        else region = 'Tamil Nadu';

        minDays = 2;
        maxDays = 3;
        courier = 'ST Courier / Professional Courier';
        tag = '🚚 Tamil Nadu Fast Track';
      }
      // Southern States (Karnataka 56-59, Kerala 67-69, AP/Telangana 50-53)
      else if (
        (num >= 560000 && num <= 599999) ||
        (num >= 670000 && num <= 699999) ||
        (num >= 500000 && num <= 539999)
      ) {
        region = 'South India (Bangalore / Hyd / Kerala)';
        minDays = 3;
        maxDays = 4;
        courier = 'ST Courier / Bluedart / DTDC';
        tag = '📦 South India Express';
      }
      // Rest of India
      else {
        region = 'All India Delivery Zone';
        minDays = 4;
        maxDays = 6;
        courier = 'Bluedart / Delhivery Express';
        tag = '✈️ All-India Air Cargo';
      }

      const est = {
        pincode: pin,
        region,
        minDate: formatDate(minDays),
        maxDate: formatDate(maxDays),
        courier,
        tag,
        isTrichy,
        freeDeliveryEligible: true,
        codAvailable: true,
      };

      setEstimate(est);
      localStorage.setItem('pb_customer_pincode', pin);
      setIsChecking(false);
    }, 150);
  };

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    if (val.length === 6) {
      calculateEstimate(val);
    } else if (val.length === 0) {
      setEstimate(null);
      setErrorMsg('');
      localStorage.removeItem('pb_customer_pincode');
    }
  };

  const handleCheckClick = (e) => {
    e.preventDefault();
    calculateEstimate(pincode);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
          <HiOutlineTruck className="w-4 h-4 text-yellow-500" />
          Check Estimated Delivery Time
        </span>
        <span className="text-[10px] font-bold text-gray-400">Postal Code Verification</span>
      </div>

      {/* Pincode Input Form */}
      <form onSubmit={handleCheckClick} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <HiOutlineLocationMarker className="w-4 h-4" />
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pincode}
            onChange={handleInputChange}
            placeholder="Enter 6-digit Pincode (e.g. 620001)"
            className="w-full pl-9 pr-3 py-2 text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
          />
        </div>
        <button
          type="submit"
          disabled={isChecking || pincode.length !== 6}
          className="px-4 py-2 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-extrabold text-xs rounded-xl transition-colors flex-shrink-0"
        >
          {isChecking ? 'Checking...' : 'Check'}
        </button>
      </form>

      {errorMsg && (
        <p className="text-[11px] text-red-600 font-semibold">{errorMsg}</p>
      )}

      {/* Verified Delivery Result Card */}
      {estimate && (
        <div className="bg-green-50/70 border border-green-200 rounded-xl p-3 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-green-200 text-green-900 px-2 py-0.5 rounded-full mb-1">
                {estimate.tag}
              </span>
              <div className="font-extrabold text-sm text-gray-900 flex items-center gap-1">
                <HiOutlineCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>
                  Expected Delivery by <strong className="text-green-800">{estimate.minDate}</strong> – <strong className="text-green-800">{estimate.maxDate}</strong>
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mt-0.5 font-medium">
                Destination: <span className="font-semibold text-gray-800">{estimate.region}</span> ({estimate.pincode})
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-green-200/80 grid grid-cols-2 gap-2 text-[11px] text-gray-700">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span><strong>Courier:</strong> {estimate.courier}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span><strong>COD:</strong> Available on orders</span>
            </div>
          </div>

          {estimate.isTrichy && (
            <p className="text-[10px] text-emerald-800 bg-white/80 p-1.5 rounded-lg border border-green-200 font-semibold">
              ⚡ Local pickup ready from our Trichy press facility.
            </p>
          )}
        </div>
      )}

      {!estimate && !errorMsg && (
        <p className="text-[10px] text-gray-400 font-medium">
          Enter your 6-digit postal pincode to see the exact delivery date and available courier services.
        </p>
      )}
    </div>
  );
}
