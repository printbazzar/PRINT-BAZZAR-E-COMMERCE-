import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TextInput, Button, Label, Spinner, Textarea, Checkbox, Badge } from 'flowbite-react';
import {
  HiSave,
  HiRefresh,
  HiExclamationCircle,
  HiCheckCircle,
  HiOutlineOfficeBuilding,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineLocationMarker,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineShare,
  HiExternalLink,
  HiEye,
  HiOutlineSparkles
} from 'react-icons/hi';
import { FaWhatsapp, FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { api } from '../services/api';
import { useBusinessInfo } from '../context/BusinessInfoContext';

export default function AdminBusinessSettings() {
  const { refreshBusinessInfo } = useBusinessInfo();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('brand');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [showLivePreview, setShowLivePreview] = useState(false);

  useEffect(() => {
    fetchBusinessSettings();
  }, []);

  const fetchBusinessSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminBusinessInfo();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Error fetching business settings:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to load business settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleNestedChange = (section, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSocialChange = (platform, field, value) => {
    setSettings((prev) => ({
      ...prev,
      socials: {
        ...prev.socials,
        [platform]: {
          ...prev.socials[platform],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await api.updateAdminBusinessInfo(settings);
      if (res.success) {
        setSettings(res.data);
        setFeedback({ type: 'success', message: 'Business settings successfully updated and published!' });
        refreshBusinessInfo();
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all business information back to default values?')) {
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.resetAdminBusinessInfo();
      if (res.success) {
        setSettings(res.data);
        setFeedback({ type: 'success', message: 'Reset to default business settings successfully!' });
        refreshBusinessInfo();
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reset settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Live GSTIN validator
  const isValidGSTIN = (gstin) => {
    if (!gstin) return false;
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase());
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Spinner size="xl" />
        <p className="text-gray-500 font-medium text-sm">Loading Business & Compliance Settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500 font-semibold">Failed to load business information.</p>
        <Button color="gray" className="mt-4 mx-auto" onClick={fetchBusinessSettings}>
          Retry
        </Button>
      </div>
    );
  }

  const gstinValid = isValidGSTIN(settings.tax?.gstin);
  const isDummyGstin = settings.tax?.gstin === '33AAAAA0000A1Z5' || !settings.tax?.isGstinVerified;

  const tabs = [
    { id: 'brand', label: 'Brand & Identity', icon: HiOutlineOfficeBuilding },
    { id: 'contact', label: 'Contact & Helplines', icon: HiOutlinePhone },
    { id: 'address', label: 'Store & Press Facility', icon: HiOutlineLocationMarker },
    { id: 'hours', label: 'Operating Hours', icon: HiOutlineClock },
    { id: 'tax', label: 'Tax & Compliance', icon: HiOutlineDocumentText },
    { id: 'socials', label: 'Social Media', icon: HiOutlineShare },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Business Information & Compliance
            </h1>
            <span className="bg-yellow-100 text-yellow-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-yellow-300">
              Central Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Unified management for company profile, registered press facility, phone lines, emails, GSTIN and social links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            color="gray"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="flex items-center gap-1.5 font-bold text-xs"
          >
            <HiEye className="w-4 h-4 text-gray-600" />
            <span>{showLivePreview ? 'Hide Preview' : 'Live Preview'}</span>
          </Button>

          <Button
            size="sm"
            color="failure"
            outline
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-1 font-semibold text-xs"
          >
            <HiRefresh className="w-3.5 h-3.5" />
            <span>Reset</span>
          </Button>

          <Button
            size="sm"
            color="warning"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 font-extrabold text-xs shadow-xs"
          >
            <HiSave className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-semibold transition-all ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-green-50 text-green-800 border-green-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <HiExclamationCircle className="w-5 h-5 text-red-500 shrink-0" />
            ) : (
              <HiCheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-gray-400 hover:text-gray-700 ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Unverified Information Warning Banner */}
      {isDummyGstin && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-amber-900 shadow-xs flex items-start justify-between">
          <div className="flex items-start gap-3">
            <HiExclamationCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <span>Action Required: Official GSTIN & Registration Unverified</span>
                <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-md font-extrabold">
                  ⚠️ REQUIRES BUSINESS OWNER INPUT
                </span>
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                The current GSTIN (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">{settings.tax?.gstin}</code>) is a demo placeholder.
                Please update with your official 15-digit GSTIN under the <strong>Tax & Compliance</strong> tab and check &ldquo;Verify Official GSTIN&rdquo;.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('tax')}
            className="text-xs font-bold text-amber-800 underline hover:text-amber-950 shrink-0 ml-4"
          >
            Update Tax Now ➔
          </button>
        </div>
      )}

      {/* Main Grid: Tabs on Left / Content on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Tabs */}
        <div className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-left ${
                  isActive
                    ? 'bg-yellow-400 text-black shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-gray-500'}`} />
                <span className="flex-1">{tab.label}</span>
                {tab.id === 'tax' && isDummyGstin && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                )}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-gray-200">
            <Link
              to="/admin/footer-settings"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 border border-dashed border-gray-300"
            >
              <span>Footer Navigation Links</span>
              <span>➔</span>
            </Link>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="lg:col-span-3 space-y-6">
          <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">

            {/* TAB 1: BRAND & IDENTITY */}
            {activeTab === 'brand' && (
              <div className="space-y-5">
                <div className="border-b pb-3">
                  <h3 className="text-base font-extrabold text-gray-900">Brand Identity & Company Profile</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Control the public brand name, legal entity name and foundation date.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brandName" value="Public Brand Name *" className="text-xs font-bold" />
                    <TextInput
                      id="brandName"
                      value={settings.brand?.brandName || ''}
                      onChange={(e) => handleNestedChange('brand', 'brandName', e.target.value)}
                      required
                      className="mt-1"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Displayed in Header, titles, and WhatsApp templates.</p>
                  </div>

                  <div>
                    <Label htmlFor="legalName" value="Legal Entity Name (Invoices & Invoicing) *" className="text-xs font-bold" />
                    <TextInput
                      id="legalName"
                      value={settings.brand?.legalName || ''}
                      onChange={(e) => handleNestedChange('brand', 'legalName', e.target.value)}
                      required
                      className="mt-1"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Printed on official customer GST receipts & invoices.</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tagline" value="Brand Mission / Tagline" className="text-xs font-bold" />
                  <TextInput
                    id="tagline"
                    value={settings.brand?.tagline || ''}
                    onChange={(e) => handleNestedChange('brand', 'tagline', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Used in About Us hero and SEO descriptions.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="foundedYear" value="Founded Year" className="text-xs font-bold" />
                    <TextInput
                      id="foundedYear"
                      value={settings.brand?.foundedYear || '2019'}
                      onChange={(e) => handleNestedChange('brand', 'foundedYear', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="logoLightUrl" value="Primary Header Logo URL" className="text-xs font-bold" />
                    <TextInput
                      id="logoLightUrl"
                      value={settings.brand?.logoLightUrl || ''}
                      onChange={(e) => handleNestedChange('brand', 'logoLightUrl', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CONTACT & HELPLINES */}
            {activeTab === 'contact' && (
              <div className="space-y-5">
                <div className="border-b pb-3">
                  <h3 className="text-base font-extrabold text-gray-900">Contact Points & WhatsApp Support Desk</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Centralize phone numbers, emails, and the floating WhatsApp desk.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryPhone" value="Primary Support Phone *" className="text-xs font-bold" />
                    <TextInput
                      id="primaryPhone"
                      value={settings.contact?.primaryPhone || ''}
                      onChange={(e) => handleNestedChange('contact', 'primaryPhone', e.target.value)}
                      required
                      className="mt-1 font-mono"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Displayed on Top Announcement Bar, Contact Us & Invoices.</p>
                  </div>

                  <div>
                    <Label htmlFor="secondaryPhone" value="Secondary / Alternate Phone" className="text-xs font-bold" />
                    <TextInput
                      id="secondaryPhone"
                      value={settings.contact?.secondaryPhone || ''}
                      onChange={(e) => handleNestedChange('contact', 'secondaryPhone', e.target.value)}
                      className="mt-1 font-mono"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Displayed on Contact Us page.</p>
                  </div>
                </div>

                <div className="p-4 bg-green-50/60 border border-green-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-900 font-bold text-xs sm:text-sm">
                      <FaWhatsapp className="w-4 h-4 text-green-600" />
                      <span>Direct WhatsApp Support Desk Number</span>
                    </div>
                    <a
                      href={`https://wa.me/${(settings.contact?.whatsappNumber || '919629098565').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-green-700 hover:text-green-900 flex items-center gap-1"
                    >
                      <span>Test Link</span>
                      <HiExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div>
                    <Label htmlFor="whatsappNumber" value="WhatsApp Number (with Country Code, no + or spaces) *" className="text-xs font-semibold" />
                    <TextInput
                      id="whatsappNumber"
                      value={settings.contact?.whatsappNumber || ''}
                      onChange={(e) => handleNestedChange('contact', 'whatsappNumber', e.target.value)}
                      required
                      placeholder="919629098565"
                      className="mt-1 font-mono font-bold"
                    />
                    <p className="text-[11px] text-green-800 mt-1">
                      Powers the floating WhatsApp button, prefilled quote links, and sample order queries.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supportEmail" value="Customer Support Email *" className="text-xs font-bold" />
                    <TextInput
                      id="supportEmail"
                      type="email"
                      value={settings.contact?.supportEmail || ''}
                      onChange={(e) => handleNestedChange('contact', 'supportEmail', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="salesEmail" value="Orders & Sales Email *" className="text-xs font-bold" />
                    <TextInput
                      id="salesEmail"
                      type="email"
                      value={settings.contact?.salesEmail || ''}
                      onChange={(e) => handleNestedChange('contact', 'salesEmail', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="corporateEmail" value="Corporate & B2B Inquiries Email" className="text-xs font-bold" />
                  <TextInput
                    id="corporateEmail"
                    type="email"
                    value={settings.contact?.corporateEmail || ''}
                    onChange={(e) => handleNestedChange('contact', 'corporateEmail', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Displayed in Quote Request confirmation & Corporate portal.</p>
                </div>

                <div>
                  <Label htmlFor="deskNotice" value="Help Desk Announcement / Notice" className="text-xs font-bold" />
                  <TextInput
                    id="deskNotice"
                    value={settings.contact?.deskNotice || ''}
                    onChange={(e) => handleNestedChange('contact', 'deskNotice', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: STORE & PRESS FACILITY ADDRESS */}
            {activeTab === 'address' && (
              <div className="space-y-5">
                <div className="border-b pb-3">
                  <h3 className="text-base font-extrabold text-gray-900">Physical Store & Press Facility</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Control registered storefront address, pickup location, and Google Maps embed.</p>
                </div>

                <div>
                  <Label htmlFor="fullDisplayAddress" value="Full Storefront Display Address *" className="text-xs font-bold" />
                  <Textarea
                    id="fullDisplayAddress"
                    rows={2}
                    value={settings.address?.fullDisplayAddress || ''}
                    onChange={(e) => handleNestedChange('address', 'fullDisplayAddress', e.target.value)}
                    required
                    className="mt-1 text-xs"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Displayed on Contact Us card, Footer, and legal invoices.</p>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                  <Label htmlFor="pressFacilityAddress" value="Store Pickup / Press Facility Address *" className="text-xs font-bold text-amber-900" />
                  <TextInput
                    id="pressFacilityAddress"
                    value={settings.address?.pressFacilityAddress || ''}
                    onChange={(e) => handleNestedChange('address', 'pressFacilityAddress', e.target.value)}
                    required
                    className="mt-1 font-medium"
                  />
                  <p className="text-[11px] text-amber-800">
                    Shown to customers at Checkout when choosing &ldquo;Store Pickup (Trichy Main Press)&rdquo; and printed on Job Cards.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city" value="City *" className="text-xs font-bold" />
                    <TextInput
                      id="city"
                      value={settings.address?.city || ''}
                      onChange={(e) => handleNestedChange('address', 'city', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state" value="State *" className="text-xs font-bold" />
                    <TextInput
                      id="state"
                      value={settings.address?.state || ''}
                      onChange={(e) => handleNestedChange('address', 'state', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pincode" value="PIN Code *" className="text-xs font-bold" />
                    <TextInput
                      id="pincode"
                      value={settings.address?.pincode || ''}
                      onChange={(e) => handleNestedChange('address', 'pincode', e.target.value)}
                      required
                      className="mt-1 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="googleMapsEmbedUrl" value="Google Maps Embed Iframe URL" className="text-xs font-bold" />
                  <TextInput
                    id="googleMapsEmbedUrl"
                    value={settings.address?.googleMapsEmbedUrl || ''}
                    onChange={(e) => handleNestedChange('address', 'googleMapsEmbedUrl', e.target.value)}
                    className="mt-1 text-xs font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Embedded directly on the Contact Us page.</p>
                </div>

                {settings.address?.googleMapsEmbedUrl && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                    <p className="bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600 border-b">
                      Live Google Maps Preview
                    </p>
                    <iframe
                      src={settings.address.googleMapsEmbedUrl}
                      title="Google Maps Preview"
                      width="100%"
                      height="220"
                      style={{ border: 0 }}
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: OPERATING HOURS */}
            {activeTab === 'hours' && (
              <div className="space-y-5">
                <div className="border-b pb-3">
                  <h3 className="text-base font-extrabold text-gray-900">Operating Hours & Press Shifts</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Eliminates conflicting operating schedules across checkout, footer and contact pages.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weekdays" value="Weekday / Saturday Hours *" className="text-xs font-bold" />
                    <TextInput
                      id="weekdays"
                      value={settings.operatingHours?.weekdays || ''}
                      onChange={(e) => handleNestedChange('operatingHours', 'weekdays', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sunday" value="Sunday Schedule *" className="text-xs font-bold" />
                    <TextInput
                      id="sunday"
                      value={settings.operatingHours?.sunday || ''}
                      onChange={(e) => handleNestedChange('operatingHours', 'sunday', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="turnaroundNotice" value="Turnaround & Order Acceptance Notice" className="text-xs font-bold" />
                  <Textarea
                    id="turnaroundNotice"
                    rows={2}
                    value={settings.operatingHours?.turnaroundNotice || ''}
                    onChange={(e) => handleNestedChange('operatingHours', 'turnaroundNotice', e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: TAX & COMPLIANCE */}
            {activeTab === 'tax' && (
              <div className="space-y-5">
                <div className="border-b pb-3">
                  <h3 className="text-base font-extrabold text-gray-900">Tax, GSTIN & Official Registration</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Indian GSTIN validation, Udyam registration and tax invoicing defaults.</p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gstin" value="GSTIN Number (15 Alphanumeric Characters) *" className="text-xs font-bold" />
                    {gstinValid ? (
                      <Badge color="success" className="font-bold text-[11px]">
                        ✓ Valid Format
                      </Badge>
                    ) : (
                      <Badge color="failure" className="font-bold text-[11px]">
                        Invalid Format
                      </Badge>
                    )}
                  </div>

                  <TextInput
                    id="gstin"
                    value={settings.tax?.gstin || ''}
                    onChange={(e) => handleNestedChange('tax', 'gstin', e.target.value.toUpperCase())}
                    placeholder="33AAAAA0000A1Z5"
                    className="mt-1 font-mono text-sm tracking-wider font-extrabold"
                  />
                  <p className="text-[11px] text-gray-500">
                    Structure: 2-digit state code (33) + 10-digit PAN + 1-digit entity + 1 check character (Z) + 1 check digit.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="isGstinVerified"
                      checked={Boolean(settings.tax?.isGstinVerified)}
                      onChange={(e) => handleNestedChange('tax', 'isGstinVerified', e.target.checked)}
                    />
                    <Label htmlFor="isGstinVerified" className="text-xs font-bold text-gray-700 cursor-pointer">
                      Official Verified GSTIN (check when confirmed by business owner)
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="msmeRegistration" value="MSME / UDYAM Registration" className="text-xs font-bold" />
                    <TextInput
                      id="msmeRegistration"
                      value={settings.tax?.msmeRegistration || ''}
                      onChange={(e) => handleNestedChange('tax', 'msmeRegistration', e.target.value)}
                      placeholder="UDYAM-TN-27-0000000"
                      className="mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pan" value="Business PAN" className="text-xs font-bold" />
                    <TextInput
                      id="pan"
                      value={settings.tax?.pan || ''}
                      onChange={(e) => handleNestedChange('tax', 'pan', e.target.value.toUpperCase())}
                      placeholder="AABCP1234F"
                      className="mt-1 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="stateCode" value="GST State Code *" className="text-xs font-bold" />
                    <TextInput
                      id="stateCode"
                      value={settings.tax?.stateCode || '33'}
                      onChange={(e) => handleNestedChange('tax', 'stateCode', e.target.value)}
                      required
                      className="mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <Label htmlFor="stateName" value="GST State Name *" className="text-xs font-bold" />
                    <TextInput
                      id="stateName"
                      value={settings.tax?.stateName || 'Tamil Nadu'}
                      onChange={(e) => handleNestedChange('tax', 'stateName', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="taxRatePercentage" value="Default GST Tax Rate (%) *" className="text-xs font-bold" />
                    <TextInput
                      id="taxRatePercentage"
                      type="number"
                      value={settings.tax?.taxRatePercentage || 18}
                      onChange={(e) => handleNestedChange('tax', 'taxRatePercentage', e.target.value)}
                      required
                      className="mt-1 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: SOCIAL MEDIA */}
            {activeTab === 'socials' && (
              <div className="space-y-5">
                <div className="border-b pb-3">
                  <h3 className="text-base font-extrabold text-gray-900">Social Media Handles & Links</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Toggle and configure public social media channels. Icons with empty URLs are hidden.</p>
                </div>

                {[
                  { key: 'facebook', label: 'Facebook', icon: FaFacebook, color: 'text-blue-600' },
                  { key: 'instagram', label: 'Instagram', icon: FaInstagram, color: 'text-pink-600' },
                  { key: 'twitter', label: 'Twitter / X', icon: FaTwitter, color: 'text-sky-500' },
                  { key: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: 'text-blue-700' },
                  { key: 'youtube', label: 'YouTube', icon: FaYoutube, color: 'text-red-600' },
                ].map((item) => {
                  const Icon = item.icon;
                  const currentSocial = settings.socials?.[item.key] || { url: '', isEnabled: false };
                  return (
                    <div key={item.key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="flex items-center gap-2.5 sm:w-44">
                        <Icon className={`w-5 h-5 ${item.color} shrink-0`} />
                        <span className="text-xs font-bold text-gray-900">{item.label}</span>
                      </div>

                      <div className="flex-1">
                        <TextInput
                          value={currentSocial.url || ''}
                          onChange={(e) => handleSocialChange(item.key, 'url', e.target.value)}
                          placeholder={`https://${item.key}.com/...`}
                          className="w-full text-xs font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Checkbox
                          id={`enable-${item.key}`}
                          checked={Boolean(currentSocial.isEnabled && currentSocial.url)}
                          onChange={(e) => handleSocialChange(item.key, 'isEnabled', e.target.checked)}
                          disabled={!currentSocial.url}
                        />
                        <Label htmlFor={`enable-${item.key}`} className="text-xs font-semibold cursor-pointer">
                          Enabled
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Form Actions */}
            <div className="pt-4 border-t flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Changes apply across the entire storefront upon saving.
              </span>
              <Button
                type="submit"
                color="warning"
                disabled={isSaving}
                className="font-extrabold text-xs shadow-xs"
              >
                <HiSave className="w-4 h-4 mr-1.5" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* LIVE PREVIEW MODAL / DRAWER */}
      {showLivePreview && (
        <div className="bg-white border-2 border-yellow-400 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <HiOutlineSparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="text-base font-extrabold text-gray-900">Storefront Live Preview</h3>
            </div>
            <button
              onClick={() => setShowLivePreview(false)}
              className="text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top Announcement Bar Preview */}
            <div className="bg-black text-white p-4 rounded-xl space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-yellow-400 font-bold">Top Bar Preview</p>
              <p className="text-xs font-semibold">📞 {settings.contact?.primaryPhone}</p>
              <p className="text-[11px] text-gray-300">📍 {settings.address?.city} Press: {settings.address?.street}</p>
            </div>

            {/* Contact Card Preview */}
            <div className="bg-gray-50 border p-4 rounded-xl space-y-1.5 text-xs">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Contact Page Preview</p>
              <p className="font-bold text-gray-900">{settings.brand?.brandName}</p>
              <p className="text-gray-600">{settings.address?.fullDisplayAddress}</p>
              <p className="text-yellow-600 font-medium">{settings.contact?.primaryPhone}</p>
              <p className="text-blue-600">{settings.contact?.supportEmail}</p>
            </div>

            {/* Invoicing Tax Preview */}
            <div className="bg-gray-50 border p-4 rounded-xl space-y-1.5 text-xs font-mono">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold font-sans">Invoice Header Preview</p>
              <p className="font-bold text-gray-900">{settings.brand?.legalName}</p>
              <p className="text-gray-700">GSTIN: {settings.tax?.gstin || 'UNREGISTERED'}</p>
              <p className="text-gray-500 text-[10px]">State: {settings.tax?.stateName} ({settings.tax?.stateCode})</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
