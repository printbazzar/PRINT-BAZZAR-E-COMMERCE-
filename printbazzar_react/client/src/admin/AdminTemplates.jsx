import React, { useState, useEffect } from 'react';
import { Button, TextInput, Textarea, Select, Modal, Spinner, Toast, Label } from 'flowbite-react';
import {
  HiPlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineTemplate,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineSearch,
} from 'react-icons/hi';
import { api } from '../services/api';

// Matches the categories used by the backend's seedDefaultTemplates() enterprise set.
// Admins can still type a custom category in the future via Edit; this list only drives the filter/create dropdowns.
const CATEGORY_OPTIONS = [
  'VISITING_CARDS',
  'STICKERS',
  'INVITATIONS',
  'ROLLUP_STANDEE',
  'PHOTO_GIFTS',
  'SIGNAGE',
];

const PRICING_MODEL_OPTIONS = ['MATRIX', 'TIERED_SLABS', 'SIZE_FORMULA', 'BASE_PLUS_ADDONS', 'CUSTOM_QUOTE'];

const STATUS_OPTIONS = ['DRAFT', 'PREVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'];

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  category: 'VISITING_CARDS',
  pricingModel: 'MATRIX',
  fieldsConfigJson: '[]',
  defaultOptionsJson: '',
  qcChecklistJson: '',
  status: 'DRAFT',
};

const FIELDS_CONFIG_PLACEHOLDER = `[
  { "code": "size", "name": "Size", "optionType": "SELECT", "visibility": "CUSTOMER_VISIBLE", "isRequired": true, "displayOrder": 1, "pricingBehavior": "MATRIX_DIMENSION", "values": ["A4", "A5"] }
]`;

function getStatusBadgeClass(status) {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800';
    case 'APPROVED':
      return 'bg-blue-100 text-blue-800';
    case 'PREVIEW':
      return 'bg-purple-100 text-purple-800';
    case 'ARCHIVED':
      return 'bg-gray-200 text-gray-600';
    case 'DRAFT':
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

// Pretty-prints a JSON string field for editing; falls back to the raw value if it isn't valid JSON.
function formatJsonForEditing(value) {
  if (!value) return '';
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return typeof value === 'string' ? value : '';
  }
}

export default function AdminTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, statusFilter]);

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.getConfigurationTemplates({
        category: categoryFilter,
        status: statusFilter,
        search,
        limit: 100,
      });
      if (res.success) {
        setTemplates(res.data || []);
      } else {
        setLoadError(res.message || 'Failed to load configuration templates.');
      }
    } catch (err) {
      console.error('Error loading configuration templates:', err);
      setLoadError(err.message || 'Failed to load configuration templates.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tmpl) => {
    setEditingTemplate(tmpl);
    setForm({
      code: tmpl.code,
      name: tmpl.name,
      description: tmpl.description || '',
      category: tmpl.category,
      pricingModel: tmpl.pricingModel,
      fieldsConfigJson: formatJsonForEditing(tmpl.fieldsConfigJson) || '[]',
      defaultOptionsJson: formatJsonForEditing(tmpl.defaultOptionsJson),
      qcChecklistJson: formatJsonForEditing(tmpl.qcChecklistJson),
      status: tmpl.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!editingTemplate && !form.code.trim()) errors.code = 'Code is required.';
    if (!form.name.trim()) errors.name = 'Name is required.';
    if (!form.category.trim()) errors.category = 'Category is required.';

    try {
      const parsed = JSON.parse(form.fieldsConfigJson || '[]');
      if (!Array.isArray(parsed)) {
        errors.fieldsConfigJson = 'Must be a JSON array of field definitions.';
      }
    } catch {
      errors.fieldsConfigJson = 'Not valid JSON.';
    }

    if (form.defaultOptionsJson.trim()) {
      try {
        const parsed = JSON.parse(form.defaultOptionsJson);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          errors.defaultOptionsJson = 'Must be a JSON object.';
        }
      } catch {
        errors.defaultOptionsJson = 'Not valid JSON.';
      }
    }

    if (form.qcChecklistJson.trim()) {
      try {
        const parsed = JSON.parse(form.qcChecklistJson);
        if (!Array.isArray(parsed)) {
          errors.qcChecklistJson = 'Must be a JSON array of checklist strings.';
        }
      } catch {
        errors.qcChecklistJson = 'Not valid JSON.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fix the highlighted fields before saving.', 'error');
      return;
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category,
      pricingModel: form.pricingModel,
      fieldsConfigJson: form.fieldsConfigJson,
      defaultOptionsJson: form.defaultOptionsJson || null,
      qcChecklistJson: form.qcChecklistJson || null,
    };

    setSaving(true);
    try {
      if (editingTemplate) {
        await api.updateConfigurationTemplate(editingTemplate.id, { ...payload, status: form.status });
        showToast('Configuration template updated.');
      } else {
        await api.createConfigurationTemplate({ ...payload, code: form.code });
        showToast('Configuration template created.');
      }
      setIsModalOpen(false);
      fetchTemplates();
    } catch (err) {
      showToast(err.message || 'Failed to save configuration template.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tmpl) => {
    if (!window.confirm(`Delete configuration template "${tmpl.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteConfigurationTemplate(tmpl.id);
      showToast('Configuration template deleted.');
      fetchTemplates();
    } catch (err) {
      // Backend blocks delete when products still reference the template and suggests archiving instead;
      // that message is surfaced here as-is.
      showToast(err.message || 'Failed to delete configuration template.', 'error');
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await api.seedDefaultTemplates();
      showToast(res.message || 'Default templates seeded.');
      fetchTemplates();
    } catch (err) {
      showToast(err.message || 'Failed to seed default templates.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast>
            <div className="flex items-center gap-3">
              {toastType === 'success' ? (
                <HiOutlineCheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <HiOutlineExclamationCircle className="w-6 h-6 text-red-500" />
              )}
              <span className="text-sm font-semibold">{toastMessage}</span>
            </div>
          </Toast>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <HiOutlineTemplate className="w-6 h-6 text-yellow-500" />
            Configuration Templates
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Reusable product configuration blueprints (fields, pricing model, QC checklist) that products attach to.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            color="light"
            size="sm"
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="font-bold text-xs"
          >
            <HiOutlineRefresh className={`w-4 h-4 mr-1 ${seeding ? 'animate-spin' : ''}`} />
            Seed Defaults
          </Button>
          <Button
            onClick={handleOpenAdd}
            color="dark"
            size="sm"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs"
          >
            <HiPlus className="w-4 h-4 mr-1" /> New Template
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TextInput
          type="text"
          placeholder="Search by code, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={HiOutlineSearch}
          size="sm"
        />
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} size="sm">
          <option value="ALL">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="sm">
          <option value="ALL">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Spinner size="lg" />
            <p className="mt-2 text-xs text-gray-500">Loading configuration templates...</p>
          </div>
        ) : loadError ? (
          <div className="py-16 text-center text-red-600 text-sm font-semibold">{loadError}</div>
        ) : templates.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            No configuration templates found. Create one or seed the standard set to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="bg-gray-50 uppercase text-[10px] text-gray-400 border-b">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Pricing Model</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Products</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templates.map((tmpl) => (
                  <tr key={tmpl.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-gray-500">{tmpl.code}</td>
                    <td className="p-3 font-bold text-gray-900">{tmpl.name}</td>
                    <td className="p-3 text-gray-700">{tmpl.category?.replace(/_/g, ' ')}</td>
                    <td className="p-3 text-gray-700">{tmpl.pricingModel}</td>
                    <td className="p-3 font-semibold text-gray-800">v{tmpl.version}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getStatusBadgeClass(
                          tmpl.status
                        )}`}
                      >
                        {tmpl.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          tmpl.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tmpl.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-gray-800">{tmpl._count?.products ?? '—'}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(tmpl)}
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
                          title="Edit"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tmpl)}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded"
                          title="Delete"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal show={isModalOpen} size="2xl" onClose={() => setIsModalOpen(false)}>
        <Modal.Header>
          {editingTemplate ? `Edit Template — ${editingTemplate.name}` : 'Create Configuration Template'}
        </Modal.Header>
        <form onSubmit={handleSave}>
          <Modal.Body className="space-y-4 text-xs max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="font-bold text-gray-700 block mb-1">Code {!editingTemplate && '*'}</Label>
                <TextInput
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. BUSINESS_CARD_TEMPLATE"
                  disabled={!!editingTemplate}
                  color={formErrors.code ? 'failure' : undefined}
                  helperText={formErrors.code}
                  required={!editingTemplate}
                />
                {editingTemplate && (
                  <p className="text-[10px] text-gray-400 mt-1">Code cannot be changed after creation.</p>
                )}
              </div>
              <div>
                <Label className="font-bold text-gray-700 block mb-1">Name *</Label>
                <TextInput
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Business Card Configuration"
                  color={formErrors.name ? 'failure' : undefined}
                  helperText={formErrors.name}
                  required
                />
              </div>
            </div>

            <div>
              <Label className="font-bold text-gray-700 block mb-1">Description</Label>
              <TextInput
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional internal description"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="font-bold text-gray-700 block mb-1">Category *</Label>
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="font-bold text-gray-700 block mb-1">Pricing Model</Label>
                <Select value={form.pricingModel} onChange={(e) => setForm({ ...form, pricingModel: e.target.value })}>
                  {PRICING_MODEL_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              </div>
              {editingTemplate && (
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Status</Label>
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label className="font-bold text-gray-700 block mb-1">Fields Configuration (JSON array) *</Label>
              <Textarea
                rows={8}
                className={`font-mono text-[11px] ${formErrors.fieldsConfigJson ? 'border-red-500' : ''}`}
                value={form.fieldsConfigJson}
                onChange={(e) => setForm({ ...form, fieldsConfigJson: e.target.value })}
                placeholder={FIELDS_CONFIG_PLACEHOLDER}
              />
              {formErrors.fieldsConfigJson ? (
                <p className="text-red-600 text-[11px] mt-1 font-semibold">{formErrors.fieldsConfigJson}</p>
              ) : (
                <p className="text-[10px] text-gray-400 mt-1">
                  Array of field definitions: code, name, optionType, visibility, isRequired, displayOrder, pricingBehavior, values...
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="font-bold text-gray-700 block mb-1">Default Options (JSON object, optional)</Label>
                <Textarea
                  rows={4}
                  className={`font-mono text-[11px] ${formErrors.defaultOptionsJson ? 'border-red-500' : ''}`}
                  value={form.defaultOptionsJson}
                  onChange={(e) => setForm({ ...form, defaultOptionsJson: e.target.value })}
                  placeholder='{ "size": "90x54mm" }'
                />
                {formErrors.defaultOptionsJson && (
                  <p className="text-red-600 text-[11px] mt-1 font-semibold">{formErrors.defaultOptionsJson}</p>
                )}
              </div>
              <div>
                <Label className="font-bold text-gray-700 block mb-1">QC Checklist (JSON array, optional)</Label>
                <Textarea
                  rows={4}
                  className={`font-mono text-[11px] ${formErrors.qcChecklistJson ? 'border-red-500' : ''}`}
                  value={form.qcChecklistJson}
                  onChange={(e) => setForm({ ...form, qcChecklistJson: e.target.value })}
                  placeholder='["Text legibility check", "Color accuracy vs proof"]'
                />
                {formErrors.qcChecklistJson && (
                  <p className="text-red-600 text-[11px] mt-1 font-semibold">{formErrors.qcChecklistJson}</p>
                )}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="submit"
              color="dark"
              disabled={saving}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs"
            >
              {saving ? <Spinner size="sm" className="mr-2" /> : null}
              Save Template
            </Button>
            <Button color="light" onClick={() => setIsModalOpen(false)} className="text-xs">
              Cancel
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
