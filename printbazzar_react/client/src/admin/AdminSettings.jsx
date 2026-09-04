import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TextInput, Button, Label, Spinner, Select, Checkbox } from 'flowbite-react';
import { HiSave, HiEye, HiEyeOff } from 'react-icons/hi';
import { api } from '../services/api';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    STORE_NAME: 'PRINT BAZZAR',
    STORE_EMAIL: 'printbazzar.online@gmail.com',
    STORE_PHONE: '+91 96290 98565',
    STORE_ADDRESS: '12 A, Allimal Street, Big Bazzar St, Tiruchirapalli, Tamilnadu - 620008',
    GST_RATE: 18,
    GST_NUMBER: '33AAAAA0000A1Z5',
    ORDER_PREFIX: 'PB-ORD-2026-',
    FREE_SHIPPING_THRESHOLD: 1500,
    DEFAULT_SHIPPING_CHARGE: 80,
    DEFAULT_SINGLE_SIDE_DESIGN_CHARGE: 200,
    DEFAULT_DOUBLE_SIDE_DESIGN_CHARGE: 400,
    ENABLE_ONLINE_PAYMENTS: true,
    PAYMENT_GATEWAY_PROVIDER: 'RAZORPAY',
    RAZORPAY_KEY_ID: '',
    RAZORPAY_KEY_SECRET: '',
    ENABLE_COD: true,
    DESIGN_SPLIT_PAYMENT: true,
  });

  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.updateSettings({
        ...settings,
        GST_RATE: parseFloat(settings.GST_RATE) || 18,
        FREE_SHIPPING_THRESHOLD: parseFloat(settings.FREE_SHIPPING_THRESHOLD) || 1500,
        DEFAULT_SHIPPING_CHARGE: parseFloat(settings.DEFAULT_SHIPPING_CHARGE) || 80,
        DEFAULT_SINGLE_SIDE_DESIGN_CHARGE: parseFloat(settings.DEFAULT_SINGLE_SIDE_DESIGN_CHARGE) || 200,
        DEFAULT_DOUBLE_SIDE_DESIGN_CHARGE: parseFloat(settings.DEFAULT_DOUBLE_SIDE_DESIGN_CHARGE) || 400,
        ENABLE_ONLINE_PAYMENTS: Boolean(settings.ENABLE_ONLINE_PAYMENTS),
        ENABLE_COD: Boolean(settings.ENABLE_COD),
        DESIGN_SPLIT_PAYMENT: Boolean(settings.DESIGN_SPLIT_PAYMENT),
      });
      if (res.success) {
        setFeedback('Store and payment gateway settings updated successfully!');
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Store Settings & Taxes</h1>
          <p className="text-xs text-gray-500 mt-0.5">Configure store info, GST rate, and delivery rules</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/business-settings"
            className="bg-black hover:bg-gray-800 text-yellow-400 font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all border border-gray-700"
          >
            <span>🏢 Business & Contact Info ➔</span>
          </Link>
          <Link
            to="/admin/footer-settings"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
          >
            <span>Website & Footer Settings ➔</span>
          </Link>
        </div>
      </div>

      {feedback && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold p-3 rounded-lg">
          ✔ {feedback}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border shadow-xs p-6 space-y-6 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label value="Store Brand Name" />
            <TextInput
              value={settings.STORE_NAME}
              onChange={(e) => setSettings({ ...settings, STORE_NAME: e.target.value })}
              required
            />
          </div>

          <div>
            <Label value="Contact Phone / WhatsApp" />
            <TextInput
              value={settings.STORE_PHONE}
              onChange={(e) => setSettings({ ...settings, STORE_PHONE: e.target.value })}
              required
            />
          </div>

          <div>
            <Label value="Support Email" />
            <TextInput
              value={settings.STORE_EMAIL}
              onChange={(e) => setSettings({ ...settings, STORE_EMAIL: e.target.value })}
              required
            />
          </div>

          <div>
            <Label value="Store GSTIN Number" />
            <TextInput
              value={settings.GST_NUMBER}
              onChange={(e) => setSettings({ ...settings, GST_NUMBER: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label value="Store Physical Address" />
          <TextInput
            value={settings.STORE_ADDRESS}
            onChange={(e) => setSettings({ ...settings, STORE_ADDRESS: e.target.value })}
            required
          />
        </div>

        <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label value="GST Rate (%)" />
            <TextInput
              type="number"
              value={settings.GST_RATE}
              onChange={(e) => setSettings({ ...settings, GST_RATE: e.target.value })}
              required
            />
          </div>

          <div>
            <Label value="Order ID Prefix" />
            <TextInput
              value={settings.ORDER_PREFIX}
              onChange={(e) => setSettings({ ...settings, ORDER_PREFIX: e.target.value })}
              required
            />
          </div>

          <div>
            <Label value="Default Shipping Charge (₹)" />
            <TextInput
              type="number"
              value={settings.DEFAULT_SHIPPING_CHARGE}
              onChange={(e) => setSettings({ ...settings, DEFAULT_SHIPPING_CHARGE: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label value="Free Shipping Threshold (₹) - Orders above this get Free Delivery" />
          <TextInput
            type="number"
            value={settings.FREE_SHIPPING_THRESHOLD}
            onChange={(e) => setSettings({ ...settings, FREE_SHIPPING_THRESHOLD: e.target.value })}
            required
          />
        </div>

        {/* Graphic Design Service Cost Configuration */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-gray-900">🎨 Graphic Design Cost Rates (Default)</span>
            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
              "Let Us Design" Service
            </span>
          </div>
          <p className="text-gray-500 text-xs">
            Configure default design fees applied when customers choose designer assistance during product customization.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
              <Label value="Single Side Design Charge (₹)" className="text-purple-900 font-bold" />
              <TextInput
                type="number"
                value={settings.DEFAULT_SINGLE_SIDE_DESIGN_CHARGE || 200}
                onChange={(e) =>
                  setSettings({ ...settings, DEFAULT_SINGLE_SIDE_DESIGN_CHARGE: e.target.value })
                }
                className="mt-1 font-extrabold text-purple-900"
                required
              />
              <span className="text-[10px] text-gray-500 block mt-1">
                Applied for Single-Side business cards, posters, stickers (1 artwork).
              </span>
            </div>

            <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
              <Label value="Double Side Design Charge (₹)" className="text-purple-900 font-bold" />
              <TextInput
                type="number"
                value={settings.DEFAULT_DOUBLE_SIDE_DESIGN_CHARGE || 400}
                onChange={(e) =>
                  setSettings({ ...settings, DEFAULT_DOUBLE_SIDE_DESIGN_CHARGE: e.target.value })
                }
                className="mt-1 font-extrabold text-purple-900"
                required
              />
              <span className="text-[10px] text-gray-500 block mt-1">
                Applied for Double-Side business cards & brochures (Front + Back 2 artworks).
              </span>
            </div>
          </div>
        </div>

        {/* Payment Gateway & Milestone Checkout Configuration */}
        <div className="pt-6 border-t space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-gray-900">💳 Payment Gateway & Checkout Hub</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Razorpay & Milestone Payments
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">
                Configure your payment gateway API keys, online checkout modes, and two-stage design milestone payments.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enable_online"
                  checked={Boolean(settings.ENABLE_ONLINE_PAYMENTS)}
                  onChange={(e) =>
                    setSettings({ ...settings, ENABLE_ONLINE_PAYMENTS: e.target.checked })
                  }
                />
                <Label htmlFor="enable_online" className="cursor-pointer">
                  <span className="font-bold text-gray-900 block">Enable Online Payments</span>
                  <span className="text-[11px] text-gray-500 font-normal block">
                    Accept UPI, QR Code, Cards, NetBanking via Razorpay
                  </span>
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="enable_cod"
                  checked={Boolean(settings.ENABLE_COD)}
                  onChange={(e) =>
                    setSettings({ ...settings, ENABLE_COD: e.target.checked })
                  }
                />
                <Label htmlFor="enable_cod" className="cursor-pointer">
                  <span className="font-bold text-gray-900 block">Enable Cash on Delivery (COD)</span>
                  <span className="text-[11px] text-gray-500 font-normal block">
                    Allow cash payment at shop pickup or delivery
                  </span>
                </Label>
              </div>
            </div>

            {/* Provider and Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label value="Payment Provider / Mode" className="font-bold text-gray-700 mb-1 block" />
                <Select
                  value={settings.PAYMENT_GATEWAY_PROVIDER || 'RAZORPAY'}
                  onChange={(e) =>
                    setSettings({ ...settings, PAYMENT_GATEWAY_PROVIDER: e.target.value })
                  }
                  className="text-xs"
                >
                  <option value="RAZORPAY">Razorpay (Live / Test Gateway)</option>
                  <option value="SIMULATOR">Local Test Simulator (Mock UPI/Cards)</option>
                </Select>
                <span className="text-[10px] text-gray-500 block mt-1">
                  Razorpay supports UPI (GPay, PhonePe), Cards & NetBanking.
                </span>
              </div>

              <div>
                <Label value="Razorpay Key ID" className="font-bold text-gray-700 mb-1 block" />
                <TextInput
                  value={settings.RAZORPAY_KEY_ID || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, RAZORPAY_KEY_ID: e.target.value.trim() })
                  }
                  placeholder="e.g. rzp_test_... or rzp_live_..."
                  className="font-mono text-xs"
                />
                <span className="text-[10px] text-gray-500 block mt-1">
                  Public API Key generated from your Razorpay Dashboard.
                </span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label value="Razorpay Key Secret" className="font-bold text-gray-700 block" />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    {showSecret ? <HiEyeOff className="w-3.5 h-3.5" /> : <HiEye className="w-3.5 h-3.5" />}
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
                <TextInput
                  type={showSecret ? 'text' : 'password'}
                  value={settings.RAZORPAY_KEY_SECRET || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, RAZORPAY_KEY_SECRET: e.target.value.trim() })
                  }
                  placeholder="Paste Key Secret from Razorpay"
                  className="font-mono text-xs"
                />
                <span className="text-[10px] text-gray-500 block mt-1">
                  Private HMAC secret for verifying online transaction signatures.
                </span>
              </div>
            </div>

            {/* Two-Stage Milestone Setting */}
            <div className="bg-amber-50/80 p-3.5 rounded-lg border border-amber-200 flex items-start gap-2.5">
              <Checkbox
                id="design_split"
                checked={Boolean(settings.DESIGN_SPLIT_PAYMENT)}
                onChange={(e) =>
                  setSettings({ ...settings, DESIGN_SPLIT_PAYMENT: e.target.checked })
                }
                className="mt-0.5"
              />
              <Label htmlFor="design_split" className="cursor-pointer">
                <span className="font-bold text-amber-950 text-xs block">
                  Two-Stage Milestone Payments for Graphic Design Orders
                </span>
                <span className="text-[11px] text-amber-800 font-normal block mt-0.5">
                  When enabled, customers choosing "Let Us Design" pay <strong>only the design fee upfront</strong> at checkout. The order moves to the Prepress Design Team. Once the digital proof is approved on the tracking page, customer pays the <strong>remaining printing balance</strong> before press production begins.
                </span>
              </Label>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button
            type="submit"
            color="dark"
            disabled={isSaving}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs"
          >
            {isSaving ? <Spinner size="sm" /> : <HiSave className="w-4 h-4 mr-1.5" />} Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
