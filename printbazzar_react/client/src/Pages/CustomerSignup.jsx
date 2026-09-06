import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, TextInput, Label, Alert, Spinner } from 'flowbite-react';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineDocumentText,
  HiOutlineSparkles,
} from 'react-icons/hi';
import {
  HiOutlineBuildingOffice2,
  HiOutlineMapPin,
} from 'react-icons/hi2';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import GoogleAuthButton from '../Components/GoogleAuthButton';

export default function CustomerSignup() {
  const [accountType, setAccountType] = useState('B2C_RETAIL'); // 'B2C_RETAIL' | 'B2B_CORPORATE'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [businessPan, setBusinessPan] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Tiruchirappalli');
  const [pincode, setPincode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { signupCustomer } = useCustomerAuth();
  const navigate = useNavigate();

  const isB2B = accountType === 'B2B_CORPORATE';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signupCustomer({
        name,
        email,
        mobile,
        password,
        accountType,
        companyName: isB2B ? companyName : undefined,
        gstNumber: isB2B ? gstNumber : undefined,
        businessPan: isB2B ? businessPan : undefined,
        address,
        city,
        pincode,
      });

      navigate('/account/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 bg-gray-50/50">
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-yellow-800 bg-yellow-100 px-3 py-1 rounded-full inline-block mb-2">
            REGISTRATION PORTAL
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Create Print Bazzar Account</h2>
          <p className="text-xs text-gray-500 mt-1">
            Choose your account type below to get custom pricing, digital proofs, and GST invoices.
          </p>
        </div>

        {/* B2C vs B2B Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-1.5 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setAccountType('B2C_RETAIL')}
            className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 ${
              !isB2B ? 'bg-white text-black shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HiOutlineUser className="w-4 h-4" />
            <span>Retail / Individual (B2C)</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountType('B2B_CORPORATE')}
            className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 ${
              isB2B ? 'bg-yellow-400 text-black shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HiOutlineBuildingOffice2 className="w-4 h-4" />
            <span>Corporate / Business (B2B)</span>
          </button>
        </div>

        {isB2B && (
          <div className="mb-5 p-3.5 bg-yellow-50/80 border border-yellow-300 rounded-2xl text-xs text-yellow-900 flex items-start gap-2.5">
            <HiOutlineSparkles className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-black">Corporate Wholesale Tier Activated (10% Off)</strong>
              <span>Save 10% on business stationery, input tax credit with GST invoices, and dedicated prepress manager.</span>
            </div>
          </div>
        )}

        {error && (
          <Alert color="failure" className="mb-4 text-xs font-bold">
            {error}
          </Alert>
        )}

        {/* 1-Click Continue with Google (Zero SMS Gateway Cost) */}
        <div className="mb-5">
          <GoogleAuthButton
            text="Sign Up with Google"
            onSuccess={() => navigate('/account/dashboard')}
            onError={(errMsg) => setError(errMsg)}
          />
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-3 text-gray-400 text-[11px] font-bold uppercase tracking-wider">
              Or fill registration form
            </span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                {isB2B ? 'Authorized Contact Person *' : 'Full Name *'}
              </Label>
              <TextInput
                placeholder={isB2B ? 'e.g. Ramesh Sundaram' : 'e.g. Karthik S'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                sizing="sm"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                Mobile Number (WhatsApp) *
              </Label>
              <TextInput
                placeholder="10-digit mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                sizing="sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">Official Email Address *</Label>
              <TextInput
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sizing="sm"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">Set Account Password *</Label>
              <TextInput
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sizing="sm"
              />
            </div>
          </div>

          {/* Corporate Specific Fields */}
          {isB2B && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
              <h4 className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                <HiOutlineBuildingOffice2 className="w-4 h-4 text-yellow-600" /> Company & GSTIN Information
              </h4>

              <div>
                <Label className="text-xs font-bold text-gray-700 block mb-1">Registered Company Name *</Label>
                <TextInput
                  placeholder="e.g. Trichy Tech Solutions Pvt Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required={isB2B}
                  sizing="sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1">GSTIN Number (For 18% ITC)</Label>
                  <TextInput
                    placeholder="33AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    sizing="sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1">Business PAN</Label>
                  <TextInput
                    placeholder="AAAAA0000A"
                    value={businessPan}
                    onChange={(e) => setBusinessPan(e.target.value.toUpperCase())}
                    sizing="sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Address Fields */}
          <div>
            <Label className="text-xs font-bold text-gray-700 block mb-1">
              {isB2B ? 'Corporate Head Office / Factory Address' : 'Delivery Address'}
            </Label>
            <TextInput
              placeholder="Street / Building / Area"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              sizing="sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">City</Label>
              <TextInput value={city} onChange={(e) => setCity(e.target.value)} sizing="sm" />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">Pincode</Label>
              <TextInput
                placeholder="620001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                sizing="sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black py-1.5 rounded-xl text-sm shadow-md mt-4"
          >
            {loading ? <Spinner size="sm" className="mr-2" /> : null}
            {loading ? 'Registering Account...' : isB2B ? 'Create Corporate Account (10% Off) ➔' : 'Create Customer Account ➔'}
          </Button>
        </form>

        <div className="text-center pt-6 border-t border-gray-100 mt-6">
          <p className="text-xs text-gray-600">
            Already have an account?{' '}
            <Link to="/account/login" className="text-red-600 font-extrabold hover:underline">
              Sign In Here ➔
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
