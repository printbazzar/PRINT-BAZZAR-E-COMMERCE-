import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button, TextInput, Label, Alert, Spinner } from 'flowbite-react';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';
import { HiOutlineBuildingOffice2, HiOutlineShieldCheck } from 'react-icons/hi2';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export default function CustomerLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { loginCustomer } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from || '/account/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginCustomer(identifier, password);
      navigate(redirectPath);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50/50">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-yellow-800 bg-yellow-100 px-3 py-1 rounded-full inline-block mb-2">
            CUSTOMER & CORPORATE PORTAL
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Sign In to Your Account</h2>
          <p className="text-xs text-gray-500 mt-1">
            Access previous orders, 1-click re-orders, digital proofs, and GST tax invoices.
          </p>
        </div>

        {error && (
          <Alert color="failure" className="mb-4 text-xs font-bold">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="identifier" className="text-xs font-bold text-gray-700 block mb-1">
              Email Address or Mobile Number *
            </Label>
            <TextInput
              id="identifier"
              type="text"
              icon={HiOutlineMail}
              placeholder="e.g. name@company.com or 9840123456"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              sizing="md"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="password" className="text-xs font-bold text-gray-700">
                Password *
              </Label>
            </div>
            <TextInput
              id="password"
              type="password"
              icon={HiOutlineLockClosed}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sizing="md"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black py-1.5 rounded-xl text-sm shadow-md mt-2"
          >
            {loading ? <Spinner size="sm" className="mr-2" /> : null}
            {loading ? 'Authenticating...' : 'Sign In to Portal ➔'}
          </Button>
        </form>

        {/* Quick Demo Credentials helper (Dev Mode Only) */}
        {import.meta.env.DEV && (
          <div className="mt-6 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1.5">
            <span className="font-extrabold text-amber-950 block">🛠️ Dev Demo Test Accounts:</span>
            <div className="flex justify-between">
              <span>🏢 <strong>Corporate (B2B):</strong> corporate@trichytech.com</span>
              <span className="font-mono text-amber-950">Corp@123</span>
            </div>
            <div className="flex justify-between">
              <span>👤 <strong>Retail (B2C):</strong> customer@printbazzar.online</span>
              <span className="font-mono text-amber-950">Customer@123</span>
            </div>
          </div>
        )}

        <div className="text-center pt-6 border-t border-gray-100 mt-6">
          <p className="text-xs text-gray-600">
            Don't have a corporate or customer account?{' '}
            <Link to="/account/signup" className="text-red-600 font-extrabold hover:underline">
              Create Account ➔
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
