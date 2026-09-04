import React, { useState, useEffect } from 'react';
import { TextInput, Button, Label, Spinner, Textarea, Select, Modal } from 'flowbite-react';
import {
  HiSave,
  HiRefresh,
  HiEye,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlineExternalLink,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineClock,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineLocationMarker,
} from 'react-icons/hi';
import { BsWhatsapp, BsFacebook, BsInstagram, BsYoutube, BsLinkedin } from 'react-icons/bs';
import { api } from '../services/api';

export default function AdminFooterSettings() {
  const [activeTab, setActiveTab] = useState('brand');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [allCategories, setAllCategories] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Settings State
  const [settings, setSettings] = useState(null);

  // Modal State for adding/editing a link
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalTarget, setLinkModalTarget] = useState('supportLinks'); // 'supportLinks' | 'businessLinks' | 'legalLinks'
  const [linkForm, setLinkForm] = useState({ id: '', label: '', url: '', isEnabled: true, isExternal: false });
  const [editingLinkIndex, setEditingLinkIndex] = useState(-1);

  useEffect(() => {
    fetchFooterSettings();
  }, []);

  const fetchFooterSettings = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.getAdminFooterSettings();
      if (res.success && res.data) {
        setSettings(res.data.settings);
        setAllCategories(res.data.allCategories || []);
      }
    } catch (err) {
      console.error('Error loading footer settings:', err);
      setErrorMessage(err.message || 'Failed to load footer settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback('');
    setErrorMessage('');
    try {
      const res = await api.updateAdminFooterSettings(settings);
      if (res.success) {
        setFeedback('Website footer settings saved and published successfully!');
        setTimeout(() => setFeedback(''), 4000);
      }
    } catch (err) {
      console.error('Failed to save footer settings:', err);
      setErrorMessage(err.message || 'Failed to save footer settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all footer settings back to standard Print Bazzar factory defaults?')) {
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.resetAdminFooterSettings();
      if (res.success && res.data) {
        setSettings(res.data);
        setFeedback('Footer settings reset to defaults successfully!');
        setTimeout(() => setFeedback(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Reordering links
  const moveLink = (listKey, index, direction) => {
    const list = [...(settings[listKey] || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // update orders
    const updated = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    setSettings({ ...settings, [listKey]: updated });
  };

  const toggleLinkStatus = (listKey, index) => {
    const list = [...(settings[listKey] || [])];
    list[index].isEnabled = !list[index].isEnabled;
    setSettings({ ...settings, [listKey]: list });
  };

  const deleteLink = (listKey, index) => {
    if (!window.confirm('Delete this footer link?')) return;
    const list = [...(settings[listKey] || [])];
    list.splice(index, 1);
    const updated = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    setSettings({ ...settings, [listKey]: updated });
  };

  const openAddLinkModal = (listKey) => {
    setLinkModalTarget(listKey);
    setLinkForm({ id: `link-${Date.now()}`, label: '', url: '/', isEnabled: true, isExternal: false });
    setEditingLinkIndex(-1);
    setLinkModalOpen(true);
  };

  const openEditLinkModal = (listKey, index) => {
    setLinkModalTarget(listKey);
    const item = settings[listKey][index];
    setLinkForm({ ...item });
    setEditingLinkIndex(index);
    setLinkModalOpen(true);
  };

  const saveLinkModal = () => {
    if (!linkForm.label.trim() || !linkForm.url.trim()) {
      alert('Label and URL are required.');
      return;
    }
    const list = [...(settings[linkModalTarget] || [])];
    if (editingLinkIndex >= 0) {
      list[editingLinkIndex] = { ...linkForm };
    } else {
      list.push({ ...linkForm, order: list.length + 1 });
    }
    setSettings({ ...settings, [linkModalTarget]: list });
    setLinkModalOpen(false);
  };

  // Category Override management
  const handleCategoryOverrideChange = (slug, field, value) => {
    const current = [...(settings.categorySettings?.categoryOverrides || [])];
    const idx = current.findIndex((c) => c.slug === slug);
    if (idx >= 0) {
      current[idx][field] = value;
    } else {
      current.push({ slug, customLabel: '', isEnabled: true, [field]: value });
    }
    setSettings({
      ...settings,
      categorySettings: {
        ...settings.categorySettings,
        categoryOverrides: current,
      },
    });
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Spinner size="xl" />
        <p className="mt-3 text-sm text-gray-500 font-bold">Loading Website Footer Settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-2xl border border-red-200">
        Failed to load footer settings. <Button onClick={fetchFooterSettings} size="xs" color="failure" className="mt-2 mx-auto">Retry</Button>
      </div>
    );
  }

  const tabs = [
    { key: 'brand', label: 'Brand & SEO' },
    { key: 'contact', label: 'Contact & WhatsApp' },
    { key: 'categories', label: 'Shop Categories' },
    { key: 'support', label: 'Support Links' },
    { key: 'business', label: 'Business Services' },
    { key: 'legal', label: 'Legal & Policies' },
    { key: 'trust', label: 'Trust Badges' },
    { key: 'payment', label: 'Payment & Copyright' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-black px-2.5 py-0.5 rounded">
              CENTRALIZED CMS
            </span>
            <span className="text-xs text-gray-400">• Website Navigation</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Website Footer Management</h1>
          <p className="text-xs text-gray-500">
            Control brand message, dynamic category columns, customer support links, WhatsApp desk, trust badges, and legal policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="xs"
            color="light"
            onClick={() => setShowPreviewModal(true)}
            className="font-bold border-gray-300 hover:bg-gray-100"
          >
            <HiEye className="w-4 h-4 mr-1 text-gray-600" /> Preview Live Footer
          </Button>

          <Button
            size="xs"
            color="failure"
            outline
            onClick={handleReset}
            disabled={isSaving}
            className="font-bold"
          >
            <HiRefresh className="w-4 h-4 mr-1" /> Reset Defaults
          </Button>

          <Button
            size="xs"
            color="dark"
            onClick={handleSave}
            disabled={isSaving}
            className="font-extrabold bg-black text-white hover:bg-yellow-400 hover:text-black transition-colors"
          >
            {isSaving ? <Spinner size="xs" className="mr-1" /> : <HiSave className="w-4 h-4 mr-1" />}
            Save Settings
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-fade-in">
          <span>✔</span> {feedback}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
          <span>✕</span> {errorMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 gap-1 pb-1 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-8">
        {/* ==================================================== */}
        {/* TAB 1: BRAND INFORMATION & SEO */}
        {/* ==================================================== */}
        {activeTab === 'brand' && (
          <div className="space-y-6">
            <div className="border-b pb-3">
              <h2 className="text-base font-extrabold text-gray-900">Brand Identity & SEO Description</h2>
              <p className="text-xs text-gray-500">Configure company name, brand tagline, mission description, and social media handles.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <Label value="Brand Display Name" />
                <TextInput
                  value={settings.brand.companyName}
                  onChange={(e) =>
                    setSettings({ ...settings, brand: { ...settings.brand, companyName: e.target.value } })
                  }
                  required
                />
              </div>
              <div>
                <Label value="Brand Tagline" />
                <TextInput
                  value={settings.brand.tagline}
                  onChange={(e) =>
                    setSettings({ ...settings, brand: { ...settings.brand, tagline: e.target.value } })
                  }
                />
              </div>
            </div>

            <div>
              <Label value="Short Company Mission Description (Max 500 characters)" />
              <Textarea
                rows={3}
                value={settings.brand.description}
                onChange={(e) =>
                  setSettings({ ...settings, brand: { ...settings.brand, description: e.target.value } })
                }
                className="text-xs"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                {settings.brand.description?.length || 0} / 500 characters
              </span>
            </div>

            {/* Social Media Links */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                Social Media Platforms (Only enabled platforms with URLs will display)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {(settings.brand.socialLinks || []).map((social, idx) => (
                  <div key={social.platform} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold capitalize text-gray-800 flex items-center gap-1.5">
                        {social.platform === 'whatsapp' && <BsWhatsapp className="text-green-500" />}
                        {social.platform === 'instagram' && <BsInstagram className="text-pink-500" />}
                        {social.platform === 'facebook' && <BsFacebook className="text-blue-600" />}
                        {social.platform === 'youtube' && <BsYoutube className="text-red-600" />}
                        {social.platform === 'linkedin' && <BsLinkedin className="text-blue-700" />}
                        {social.label || social.platform}
                      </span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={social.isEnabled}
                          onChange={(e) => {
                            const updated = [...settings.brand.socialLinks];
                            updated[idx].isEnabled = e.target.checked;
                            setSettings({ ...settings, brand: { ...settings.brand, socialLinks: updated } });
                          }}
                          className="rounded text-black focus:ring-black"
                        />
                        <span className="text-[11px] font-bold text-gray-600">Active</span>
                      </label>
                    </div>
                    <TextInput
                      size="sm"
                      placeholder={`https://${social.platform}.com/...`}
                      value={social.url}
                      onChange={(e) => {
                        const updated = [...settings.brand.socialLinks];
                        updated[idx].url = e.target.value;
                        setSettings({ ...settings, brand: { ...settings.brand, socialLinks: updated } });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SEO Content Section */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">SEO Footer Content Block</h3>
                  <p className="text-[11px] text-gray-500">Short informative summary for organic search crawlability</p>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.seo?.isEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, seo: { ...settings.seo, isEnabled: e.target.checked } })
                    }
                    className="rounded text-black focus:ring-black"
                  />
                  <span className="text-xs font-bold text-gray-700">Display SEO Block</span>
                </label>
              </div>
              <Textarea
                rows={3}
                value={settings.seo?.text || ''}
                onChange={(e) =>
                  setSettings({ ...settings, seo: { ...settings.seo, text: e.target.value } })
                }
                placeholder="Print Bazzar provides professional online printing, custom printing, business cards..."
                className="text-xs"
              />
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: CONTACT INFORMATION & WHATSAPP SUPPORT */}
        {/* ==================================================== */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div className="border-b pb-3">
              <h2 className="text-base font-extrabold text-gray-900">Store Contact Information & WhatsApp Desk</h2>
              <p className="text-xs text-gray-500">
                Phone numbers are clickable (`tel:`), emails open mail clients (`mailto:`), and addresses link to Google Maps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <Label value="Street Address" />
                <TextInput
                  value={settings.contact.address}
                  onChange={(e) =>
                    setSettings({ ...settings, contact: { ...settings.contact, address: e.target.value } })
                  }
                  required
                />
              </div>
              <div>
                <Label value="City & Pincode" />
                <div className="grid grid-cols-2 gap-2">
                  <TextInput
                    value={settings.contact.city}
                    onChange={(e) =>
                      setSettings({ ...settings, contact: { ...settings.contact, city: e.target.value } })
                    }
                    placeholder="City"
                  />
                  <TextInput
                    value={settings.contact.pincode}
                    onChange={(e) =>
                      setSettings({ ...settings, contact: { ...settings.contact, pincode: e.target.value } })
                    }
                    placeholder="Pincode"
                  />
                </div>
              </div>

              <div>
                <Label value="State & Country" />
                <div className="grid grid-cols-2 gap-2">
                  <TextInput
                    value={settings.contact.state}
                    onChange={(e) =>
                      setSettings({ ...settings, contact: { ...settings.contact, state: e.target.value } })
                    }
                  />
                  <TextInput
                    value={settings.contact.country}
                    onChange={(e) =>
                      setSettings({ ...settings, contact: { ...settings.contact, country: e.target.value } })
                    }
                  />
                </div>
              </div>

              <div>
                <Label value="Google Maps Location URL" />
                <TextInput
                  value={settings.contact.googleMapsUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, contact: { ...settings.contact, googleMapsUrl: e.target.value } })
                  }
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <Label value="Primary Calling Number" />
                <TextInput
                  value={settings.contact.primaryPhone}
                  onChange={(e) =>
                    setSettings({ ...settings, contact: { ...settings.contact, primaryPhone: e.target.value } })
                  }
                />
              </div>
              <div>
                <Label value="Secondary / Landline Number" />
                <TextInput
                  value={settings.contact.secondaryPhone}
                  onChange={(e) =>
                    setSettings({ ...settings, contact: { ...settings.contact, secondaryPhone: e.target.value } })
                  }
                />
              </div>
              <div>
                <Label value="Customer Support Email" />
                <TextInput
                  value={settings.contact.supportEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, contact: { ...settings.contact, supportEmail: e.target.value } })
                  }
                />
              </div>
              <div>
                <Label value="Sales / Bulk Orders Email" />
                <TextInput
                  value={settings.contact.salesEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, contact: { ...settings.contact, salesEmail: e.target.value } })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
              <div>
                <Label value="Working Days" />
                <TextInput
                  value={settings.contact.workingDays}
                  onChange={(e) =>
                    setSettings({ ...settings, contact: { ...settings.contact, workingDays: e.target.value } })
                  }
                />
              </div>
              <div>
                <Label value="Operating Hours (Mon-Sat)" />
                <TextInput
                  value={`${settings.contact.openingTime} – ${settings.contact.closingTime}`}
                  onChange={(e) => {
                    const parts = e.target.value.split('–');
                    setSettings({
                      ...settings,
                      contact: {
                        ...settings.contact,
                        openingTime: parts[0]?.trim() || settings.contact.openingTime,
                        closingTime: parts[1]?.trim() || settings.contact.closingTime,
                      },
                    });
                  }}
                />
              </div>
              <div>
                <Label value="Sunday Working Hours" />
                <TextInput
                  value={settings.contact.sundayHours}
                  onChange={(e) =>
                    setSettings({ ...settings, contact: { ...settings.contact, sundayHours: e.target.value } })
                  }
                />
              </div>
            </div>

            {/* WhatsApp Support Section */}
            <div className="pt-6 border-t border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                    <BsWhatsapp className="text-green-500 w-4 h-4" /> Prominent WhatsApp Support Desk
                  </h3>
                  <p className="text-xs text-gray-500">Configures the highlighted button in the footer for direct customer chat</p>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.whatsapp.isEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp: { ...settings.whatsapp, isEnabled: e.target.checked } })
                    }
                    className="rounded text-black focus:ring-black"
                  />
                  <span className="text-xs font-bold text-gray-700">Enable WhatsApp Button</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <Label value="WhatsApp Contact Number (Include Country Code)" />
                  <TextInput
                    value={settings.whatsapp.phoneNumber}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp: { ...settings.whatsapp, phoneNumber: e.target.value } })
                    }
                    placeholder="+91 96290 98565"
                  />
                </div>
                <div>
                  <Label value="Button Label Text" />
                  <TextInput
                    value={settings.whatsapp.buttonText}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp: { ...settings.whatsapp, buttonText: e.target.value } })
                    }
                  />
                </div>
              </div>

              <div>
                <Label value="Default Pre-filled Message" />
                <TextInput
                  value={settings.whatsapp.defaultMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsapp: { ...settings.whatsapp, defaultMessage: e.target.value } })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: SHOP BY CATEGORY SETTINGS */}
        {/* ==================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="border-b pb-3">
              <h2 className="text-base font-extrabold text-gray-900">Dynamic Shop By Category Column</h2>
              <p className="text-xs text-gray-500">
                Categories are automatically fetched from your catalog database. You can customize the column title, maximum number of categories displayed, or override custom labels.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <Label value="Column Header Title" />
                <TextInput
                  value={settings.categorySettings?.title || 'SHOP BY CATEGORY'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      categorySettings: { ...settings.categorySettings, title: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label value="Maximum Categories to Show (1 - 24)" />
                <TextInput
                  type="number"
                  min={1}
                  max={24}
                  value={settings.categorySettings?.maxCategories || 8}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      categorySettings: {
                        ...settings.categorySettings,
                        maxCategories: parseInt(e.target.value, 10) || 8,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label value="Show All Collections Link" />
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.categorySettings?.showAllLink !== false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        categorySettings: {
                          ...settings.categorySettings,
                          showAllLink: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-black"
                  />
                  <span className="text-xs font-bold text-gray-700">Display "Browse All Collections" link</span>
                </div>
              </div>
            </div>

            {/* Live Category Visibility & Override Table */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-3">
                Live Catalog Categories ({allCategories.length})
              </h3>
              <div className="overflow-x-auto border rounded-xl divide-y text-xs">
                <div className="grid grid-cols-12 bg-gray-50 font-black text-gray-500 p-2.5">
                  <span className="col-span-5">Database Category Name</span>
                  <span className="col-span-4">Custom Footer Label (Optional)</span>
                  <span className="col-span-3 text-center">Footer Visibility</span>
                </div>
                {allCategories.map((cat) => {
                  const override = (settings.categorySettings?.categoryOverrides || []).find((o) => o.slug === cat.slug);
                  const isVisible = override?.isEnabled !== false;
                  const customLabel = override?.customLabel || '';

                  return (
                    <div key={cat.id} className="grid grid-cols-12 items-center p-2.5 hover:bg-gray-50/80">
                      <div className="col-span-5 flex items-center gap-2">
                        <span className="font-bold text-gray-900">{cat.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">({cat.slug})</span>
                      </div>
                      <div className="col-span-4 pr-2">
                        <input
                          type="text"
                          placeholder={cat.name}
                          value={customLabel}
                          onChange={(e) => handleCategoryOverrideChange(cat.slug, 'customLabel', e.target.value)}
                          className="w-full text-xs p-1.5 border rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 flex justify-center items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCategoryOverrideChange(cat.slug, 'isEnabled', !isVisible)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-colors ${
                            isVisible ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {isVisible ? '✔ Shown' : '✕ Hidden'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: CUSTOMER SUPPORT LINKS */}
        {/* ==================================================== */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Customer Support Links</h2>
                <p className="text-xs text-gray-500">Manage order tracking, design guidelines, FAQs and contact navigation.</p>
              </div>
              <Button size="xs" color="dark" onClick={() => openAddLinkModal('supportLinks')}>
                <HiOutlinePlus className="w-4 h-4 mr-1" /> Add Support Link
              </Button>
            </div>

            <div className="border rounded-xl divide-y text-xs">
              <div className="grid grid-cols-12 bg-gray-50 font-black text-gray-500 p-2.5">
                <span className="col-span-4">Link Label</span>
                <span className="col-span-4">Target Route / URL</span>
                <span className="col-span-2 text-center">Status</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>
              {(settings.supportLinks || []).map((link, idx) => (
                <div key={link.id || idx} className="grid grid-cols-12 items-center p-2.5 hover:bg-gray-50">
                  <span className="col-span-4 font-bold text-gray-900">{link.label}</span>
                  <span className="col-span-4 text-gray-500 font-mono text-[11px] truncate">{link.url}</span>
                  <div className="col-span-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleLinkStatus('supportLinks', idx)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        link.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {link.isEnabled ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => moveLink('supportLinks', idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-gray-400 hover:text-black disabled:opacity-30"
                      title="Move Up"
                    >
                      <HiOutlineArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink('supportLinks', idx, 1)}
                      disabled={idx === settings.supportLinks.length - 1}
                      className="p-1 text-gray-400 hover:text-black disabled:opacity-30"
                      title="Move Down"
                    >
                      <HiOutlineArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditLinkModal('supportLinks', idx)}
                      className="p-1 text-blue-600 hover:text-blue-800 font-bold ml-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLink('supportLinks', idx)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: BUSINESS SERVICES LINKS */}
        {/* ==================================================== */}
        {activeTab === 'business' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Business & B2B Service Links</h2>
                <p className="text-xs text-gray-500">Corporate printing, custom packaging, quotation request, and partner program links.</p>
              </div>
              <Button size="xs" color="dark" onClick={() => openAddLinkModal('businessLinks')}>
                <HiOutlinePlus className="w-4 h-4 mr-1" /> Add Service Link
              </Button>
            </div>

            <div className="border rounded-xl divide-y text-xs">
              <div className="grid grid-cols-12 bg-gray-50 font-black text-gray-500 p-2.5">
                <span className="col-span-4">Link Label</span>
                <span className="col-span-4">Target Route / URL</span>
                <span className="col-span-2 text-center">Status</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>
              {(settings.businessLinks || []).map((link, idx) => (
                <div key={link.id || idx} className="grid grid-cols-12 items-center p-2.5 hover:bg-gray-50">
                  <span className="col-span-4 font-bold text-gray-900">{link.label}</span>
                  <span className="col-span-4 text-gray-500 font-mono text-[11px] truncate">{link.url}</span>
                  <div className="col-span-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleLinkStatus('businessLinks', idx)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        link.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {link.isEnabled ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => moveLink('businessLinks', idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-gray-400 hover:text-black disabled:opacity-30"
                    >
                      <HiOutlineArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink('businessLinks', idx, 1)}
                      disabled={idx === settings.businessLinks.length - 1}
                      className="p-1 text-gray-400 hover:text-black disabled:opacity-30"
                    >
                      <HiOutlineArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditLinkModal('businessLinks', idx)}
                      className="p-1 text-blue-600 hover:text-blue-800 font-bold ml-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLink('businessLinks', idx)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 6: LEGAL & POLICY LINKS */}
        {/* ==================================================== */}
        {activeTab === 'legal' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Legal & Policy Navigation</h2>
                <p className="text-xs text-gray-500">Terms of service, privacy policy, shipping, cancellation, and refund policies.</p>
              </div>
              <Button size="xs" color="dark" onClick={() => openAddLinkModal('legalLinks')}>
                <HiOutlinePlus className="w-4 h-4 mr-1" /> Add Legal Link
              </Button>
            </div>

            <div className="border rounded-xl divide-y text-xs">
              <div className="grid grid-cols-12 bg-gray-50 font-black text-gray-500 p-2.5">
                <span className="col-span-4">Policy Title</span>
                <span className="col-span-4">Route Path</span>
                <span className="col-span-2 text-center">Status</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>
              {(settings.legalLinks || []).map((link, idx) => (
                <div key={link.id || idx} className="grid grid-cols-12 items-center p-2.5 hover:bg-gray-50">
                  <span className="col-span-4 font-bold text-gray-900">{link.label}</span>
                  <span className="col-span-4 text-gray-500 font-mono text-[11px] truncate">{link.url}</span>
                  <div className="col-span-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleLinkStatus('legalLinks', idx)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        link.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {link.isEnabled ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => moveLink('legalLinks', idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-gray-400 hover:text-black disabled:opacity-30"
                    >
                      <HiOutlineArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink('legalLinks', idx, 1)}
                      disabled={idx === settings.legalLinks.length - 1}
                      className="p-1 text-gray-400 hover:text-black disabled:opacity-30"
                    >
                      <HiOutlineArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditLinkModal('legalLinks', idx)}
                      className="p-1 text-blue-600 hover:text-blue-800 font-bold ml-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLink('legalLinks', idx)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 7: TRUST BADGES & ASSURANCE */}
        {/* ==================================================== */}
        {activeTab === 'trust' && (
          <div className="space-y-6">
            <div className="border-b pb-3">
              <h2 className="text-base font-extrabold text-gray-900">Trust & Assurance Badges</h2>
              <p className="text-xs text-gray-500">
                Displays the horizontal assurance bar across the top of the footer. (Only active items are shown).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(settings.trustBadges || []).map((badge, idx) => (
                <div key={badge.id || idx} className="p-4 bg-gray-50 border rounded-2xl flex flex-col justify-between gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-gray-800 uppercase text-[11px] tracking-wider">
                      Badge #{idx + 1}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={badge.isEnabled}
                        onChange={(e) => {
                          const updated = [...settings.trustBadges];
                          updated[idx].isEnabled = e.target.checked;
                          setSettings({ ...settings, trustBadges: updated });
                        }}
                        className="rounded text-black"
                      />
                      <span className="text-[11px] font-bold text-gray-700">Display Badge</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label value="Title" />
                      <TextInput
                        value={badge.title}
                        onChange={(e) => {
                          const updated = [...settings.trustBadges];
                          updated[idx].title = e.target.value;
                          setSettings({ ...settings, trustBadges: updated });
                        }}
                      />
                    </div>
                    <div>
                      <Label value="Short Description" />
                      <TextInput
                        value={badge.description}
                        onChange={(e) => {
                          const updated = [...settings.trustBadges];
                          updated[idx].description = e.target.value;
                          setSettings({ ...settings, trustBadges: updated });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 8: PAYMENT METHODS & COPYRIGHT */}
        {/* ==================================================== */}
        {activeTab === 'payment' && (
          <div className="space-y-6">
            <div className="border-b pb-3">
              <h2 className="text-base font-extrabold text-gray-900">Supported Payment Badges & Copyright Bar</h2>
              <p className="text-xs text-gray-500">
                Configure payment method badges matching live checkout, dynamic copyright year, GSTIN, and company identifiers.
              </p>
            </div>

            {/* Payment Badges Toggle */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                Payment Method Badges Displayed in Footer
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {(settings.paymentMethods || []).map((pay, idx) => (
                  <div key={pay.id || idx} className="p-3 bg-gray-50 border rounded-xl flex items-center justify-between">
                    <span className="font-extrabold text-gray-800">{pay.label}</span>
                    <input
                      type="checkbox"
                      checked={pay.isEnabled}
                      onChange={(e) => {
                        const updated = [...settings.paymentMethods];
                        updated[idx].isEnabled = e.target.checked;
                        setSettings({ ...settings, paymentMethods: updated });
                      }}
                      className="rounded text-black"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Copyright & Identifiers */}
            <div className="pt-6 border-t border-gray-200 space-y-4 text-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                Bottom Copyright & Corporate Identifiers
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label value="Copyright Notice Text (Year is automatically generated)" />
                  <TextInput
                    value={settings.copyright?.text || 'Print Bazzar. All Rights Reserved.'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        copyright: { ...settings.copyright, text: e.target.value },
                      })
                    }
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Preview: © {new Date().getFullYear()} {settings.copyright?.text}
                  </span>
                </div>

                <div>
                  <Label value="Origin / Regional Badge" />
                  <TextInput
                    value={settings.copyright?.madeInIndiaText || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        copyright: { ...settings.copyright, madeInIndiaText: e.target.value },
                      })
                    }
                    placeholder="Proudly Made with ❤️ in India"
                  />
                </div>

                <div>
                  <Label value="Store GSTIN Number (Optional)" />
                  <div className="flex gap-2 items-center">
                    <TextInput
                      className="flex-1"
                      value={settings.copyright?.gstin || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          copyright: { ...settings.copyright, gstin: e.target.value },
                        })
                      }
                      placeholder="33AAAAA0000A1Z5"
                    />
                    <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={settings.copyright?.showGstin !== false}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            copyright: { ...settings.copyright, showGstin: e.target.checked },
                          })
                        }
                        className="rounded text-black"
                      />
                      <span className="text-[11px] font-bold">Show</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label value="Company / MSME Registration (Optional)" />
                  <TextInput
                    value={settings.copyright?.companyRegNumber || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        copyright: { ...settings.copyright, companyRegNumber: e.target.value },
                      })
                    }
                    placeholder="UDYAM-TN-27-0000000"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT LINK */}
      {/* ==================================================== */}
      <Modal show={linkModalOpen} onClose={() => setLinkModalOpen(false)} size="md">
        <div className="p-6 bg-white rounded-2xl space-y-4 text-xs">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-extrabold text-sm text-gray-900">
              {editingLinkIndex >= 0 ? 'Edit Footer Link' : 'Add New Footer Link'}
            </h3>
            <button onClick={() => setLinkModalOpen(false)} className="text-gray-400 hover:text-black">✕</button>
          </div>

          <div className="space-y-3">
            <div>
              <Label value="Link Display Text *" />
              <TextInput
                required
                placeholder="e.g. Track My Order"
                value={linkForm.label}
                onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
              />
            </div>
            <div>
              <Label value="Target URL or Internal Route *" />
              <TextInput
                required
                placeholder="e.g. /track-order or https://example.com"
                value={linkForm.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Relative internal paths (e.g. /shop, /track-order) or https:// URLs. JavaScript URLs are forbidden.
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkForm.isEnabled}
                  onChange={(e) => setLinkForm({ ...linkForm, isEnabled: e.target.checked })}
                  className="rounded text-black"
                />
                <span className="font-bold text-gray-700">Active (Visible in Footer)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkForm.isExternal}
                  onChange={(e) => setLinkForm({ ...linkForm, isExternal: e.target.checked })}
                  className="rounded text-black"
                />
                <span className="font-bold text-gray-700">Open in New Tab</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button size="xs" color="gray" onClick={() => setLinkModalOpen(false)}>
              Cancel
            </Button>
            <Button size="xs" color="dark" onClick={saveLinkModal}>
              Save Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL: LIVE PREVIEW */}
      {/* ==================================================== */}
      <Modal show={showPreviewModal} onClose={() => setShowPreviewModal(false)} size="7xl">
        <div className="p-4 bg-gray-900 text-white rounded-2xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-800">
            <div>
              <h3 className="font-black text-sm text-yellow-400">Live Footer Configuration Preview</h3>
              <p className="text-[11px] text-gray-400">Shows current uncommitted settings layout</p>
            </div>
            <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>

          <div className="bg-black rounded-xl p-4 sm:p-6 text-xs text-gray-300 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Trust Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#0d0d0d] rounded-xl border border-gray-800">
              {(settings.trustBadges || []).filter((b) => b.isEnabled).map((badge) => (
                <div key={badge.id} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                    <HiOutlineShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-[11px]">{badge.title}</h5>
                    <p className="text-[10px] text-gray-400">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Columns */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 space-y-3">
                <h4 className="font-black text-white text-base">{settings.brand.companyName}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">{settings.brand.description}</p>
                <div className="space-y-1 text-[11px] text-gray-300 pt-2">
                  <p>📍 {settings.contact.address}, {settings.contact.city}</p>
                  <p>📞 {settings.contact.primaryPhone}</p>
                  <p>📧 {settings.contact.supportEmail}</p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider">{settings.categorySettings?.title || 'Categories'}</h5>
                <ul className="space-y-1 text-[11px] text-gray-400">
                  {allCategories.slice(0, settings.categorySettings?.maxCategories || 8).map((c) => (
                    <li key={c.id}>• {c.name}</li>
                  ))}
                </ul>
              </div>

              <div className="md:col-span-3 space-y-2">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider">Customer Support</h5>
                <ul className="space-y-1 text-[11px] text-gray-400">
                  {(settings.supportLinks || []).filter((l) => l.isEnabled).map((l) => (
                    <li key={l.id}>• {l.label}</li>
                  ))}
                </ul>
              </div>

              <div className="md:col-span-3 space-y-3">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider">Hours & WhatsApp</h5>
                <p className="text-[11px] text-gray-400">Mon-Sat: {settings.contact.openingTime} - {settings.contact.closingTime}</p>
                {settings.whatsapp.isEnabled && (
                  <div className="p-2.5 bg-green-950/40 border border-green-700/50 rounded-xl text-green-400 font-bold text-center">
                    💬 {settings.whatsapp.buttonText}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-4 border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-500">
              <p>© {new Date().getFullYear()} {settings.copyright?.text}</p>
              <div className="flex gap-2">
                {(settings.paymentMethods || []).filter((p) => p.isEnabled).map((p) => (
                  <span key={p.id} className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded font-mono text-white">
                    {p.code}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="xs" color="dark" onClick={() => setShowPreviewModal(false)}>Close Preview</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
