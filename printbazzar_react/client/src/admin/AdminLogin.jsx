import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TextInput, Button, Label, Spinner } from 'flowbite-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/logo_white.png';
import { HiLockClosed, HiMail } from 'react-icons/hi';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@printbazzar.online');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      const destination = location.state?.from?.pathname || '/admin/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <img src={logo} alt="Print Bazzar Logo" className="h-10 mx-auto mb-3" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-yellow-400 bg-yellow-950/60 px-3 py-1 rounded-full border border-yellow-800">
            Control Management Portal
          </span>
          <h2 className="text-xl font-bold text-white mt-4">Administrator Sign In</h2>
          <p className="text-xs text-gray-400 mt-1">
            Access store catalogue, orders, dynamic pricing & ERP modules
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/60 border border-red-800 text-red-300 text-xs font-semibold p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label value="Admin Email" className="text-gray-300 text-xs font-bold mb-1 block" />
            <TextInput
              type="email"
              icon={HiMail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@printbazzar.online"
              required
            />
          </div>

          <div>
            <Label value="Password" className="text-gray-300 text-xs font-bold mb-1 block" />
            <TextInput
              type="password"
              icon={HiLockClosed}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            color="dark"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold py-2 mt-4 text-sm rounded-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner size="sm" /> Authenticating...
              </div>
            ) : (
              'Sign In to Dashboard'
            )}
          </Button>
        </form>

        <div className="mt-8 pt-4 border-t border-gray-800 text-center">
          <p className="text-[11px] text-gray-500">
            Default credentials: <br />
            <span className="text-gray-300 font-mono">admin@printbazzar.online / Admin@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
