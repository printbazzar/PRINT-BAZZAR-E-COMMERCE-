import React, { useState, useEffect } from 'react';
import { TextInput, Select, Button, Spinner, Modal, Toast, Label, Textarea } from 'flowbite-react';
import {
  HiOutlineSearch,
  HiOutlineEye,
  HiOutlinePhotograph,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import { api } from '../services/api';

const STATUS_OPTIONS = ['PENDING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED_TO_ORDER'];

// Mirrors the backend's own validTransitions map in quoteRequestController.js — kept here only to
// limit the dropdown to choices the API will actually accept, not to re-implement any business logic.
const VALID_TRANSITIONS = {
  PENDING: ['QUOTED', 'REJECTED'],
  QUOTED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: ['CONVERTED_TO_ORDER'],
  REJECTED: [],
  EXPIRED: ['QUOTED'],
  CONVERTED_TO_ORDER: [],
};

function getStatusBadgeClass(status) {
  switch (status) {
    case 'ACCEPTED':
    case 'CONVERTED_TO_ORDER':
      return 'bg-green-100 text-green-800';
    case 'QUOTED':
      return 'bg-blue-100 text-blue-800';
    case 'REJECTED':
    case 'EXPIRED':
      return 'bg-red-100 text-red-800';
    case 'PENDING':
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

// specificationsJson is a free-form JSON object stringified by the customer form; render it as
// simple label:value rows rather than assuming a fixed shape.
function parseSpecifications(specificationsJson) {
  if (!specificationsJson) return [];
  try {
    const parsed = typeof specificationsJson === 'string' ? JSON.parse(specificationsJson) : specificationsJson;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed);
    }
  } catch {
    // fall through to empty
  }
  return [];
}

function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function AdminQuoteRequests() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeQuote, setActiveQuote] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [responseForm, setResponseForm] = useState({ quotedPrice: '', notes: '', validUntil: '', status: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page]);

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchQuotes = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.getQuoteRequests({ search, status: statusFilter, page, limit: 25 });
      if (res.success) {
        setQuotes(res.data || []);
        setTotalQuotes(res.pagination?.total || 0);
      } else {
        setLoadError(res.message || 'Failed to load quote requests.');
      }
    } catch (err) {
      console.error('Error loading quote requests:', err);
      setLoadError(err.message || 'Failed to load quote requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQuote = async (quote) => {
    setIsModalOpen(true);
    setActiveQuote(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await api.getQuoteRequestById(quote.id);
      if (res.success && res.data) {
        setActiveQuote(res.data);
        setResponseForm({
          quotedPrice: res.data.quotedPrice != null ? String(res.data.quotedPrice) : '',
          notes: res.data.notes || '',
          validUntil: toDateInputValue(res.data.validUntil),
          status: res.data.status,
        });
      } else {
        setDetailError(res.message || 'Failed to load quote request details.');
      }
    } catch (err) {
      setDetailError(err.message || 'Failed to load quote request details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    if (saving) return; // avoid closing mid-save
    setIsModalOpen(false);
    setActiveQuote(null);
    setDetailError('');
  };

  const handleSaveResponse = async (e) => {
    e.preventDefault();
    if (!activeQuote || saving) return;

    const payload = {};
    if (responseForm.status && responseForm.status !== activeQuote.status) {
      payload.status = responseForm.status;
    }
    if (responseForm.quotedPrice !== '') {
      const priceNum = parseFloat(responseForm.quotedPrice);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        showToast('Quoted price must be a valid positive number.', 'error');
        return;
      }
      payload.quotedPrice = priceNum;
    }
    payload.notes = responseForm.notes || '';
    if (responseForm.validUntil) {
      payload.validUntil = responseForm.validUntil;
    }

    setSaving(true);
    try {
      const res = await api.updateQuoteRequest(activeQuote.id, payload);
      showToast(res.message || 'Quote request updated.');
      setIsModalOpen(false);
      setActiveQuote(null);
      fetchQuotes();
    } catch (err) {
      showToast(err.message || 'Failed to update quote request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const allowedStatusChoices = activeQuote
    ? [activeQuote.status, ...(VALID_TRANSITIONS[activeQuote.status] || [])]
    : [];

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
          <h1 className="text-2xl font-extrabold text-gray-900">Quote Requests</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Total of <span className="font-bold text-gray-800">{totalQuotes}</span> custom quote enquiries
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <TextInput
          type="text"
          placeholder="Search by quote #, customer, mobile..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          icon={HiOutlineSearch}
          size="sm"
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          size="sm"
        >
          <option value="ALL">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Spinner size="lg" />
            <p className="mt-2 text-xs text-gray-500">Loading quote requests...</p>
          </div>
        ) : loadError ? (
          <div className="py-16 text-center text-red-600 text-sm font-semibold">{loadError}</div>
        ) : quotes.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            No quote requests found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="bg-gray-50 uppercase text-[10px] text-gray-400 border-b">
                <tr>
                  <th className="p-3">Quote #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Quoted Price (₹)</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-gray-900">{q.quoteNumber}</td>
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {new Date(q.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-gray-900 block">{q.customerName}</span>
                      <span className="text-[11px] text-gray-500 block">{q.customerMobile}</span>
                      {q.customerEmail && <span className="text-[11px] text-gray-400 block">{q.customerEmail}</span>}
                    </td>
                    <td className="p-3 text-gray-700">{q.product?.name || '—'}</td>
                    <td className="p-3 font-semibold text-gray-800">{q.quantity}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getStatusBadgeClass(
                          q.status
                        )}`}
                      >
                        {q.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-extrabold text-gray-900">
                      {q.quotedPrice != null ? `₹${q.quotedPrice}` : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenQuote(q)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded text-xs"
                      >
                        <HiOutlineEye className="w-3.5 h-3.5" /> View / Respond
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalQuotes > 25 && (
        <div className="flex justify-between items-center text-xs text-gray-500 pt-2">
          <span>Showing page {page} of {Math.ceil(totalQuotes / 25)}</span>
          <div className="flex gap-2">
            <Button size="xs" color="light" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button
              size="xs"
              color="light"
              disabled={page >= Math.ceil(totalQuotes / 25)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* View / Respond Modal */}
      <Modal show={isModalOpen} size="2xl" onClose={closeModal}>
        <Modal.Header>
          {activeQuote ? `Quote ${activeQuote.quoteNumber}` : 'Quote Request'}
        </Modal.Header>
        <Modal.Body className="max-h-[75vh] overflow-y-auto text-xs">
          {detailLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Spinner size="lg" />
              <p className="mt-2 text-xs text-gray-500">Loading quote details...</p>
            </div>
          ) : detailError ? (
            <div className="py-10 text-center text-red-600 text-sm font-semibold">{detailError}</div>
          ) : activeQuote ? (
            <div className="space-y-5">
              {/* Customer & Product Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-gray-400 mb-1">Customer</p>
                  <p className="font-bold text-gray-900">{activeQuote.customerName}</p>
                  <p className="text-gray-600">{activeQuote.customerMobile}</p>
                  {activeQuote.customerEmail && <p className="text-gray-600">{activeQuote.customerEmail}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-gray-400 mb-1">Product & Quantity</p>
                  <p className="font-bold text-gray-900">{activeQuote.product?.name || 'Not linked to a catalogue product'}</p>
                  <p className="text-gray-600">Quantity: {activeQuote.quantity}</p>
                </div>
              </div>

              {/* Specifications */}
              <div>
                <p className="text-[10px] font-extrabold uppercase text-gray-400 mb-1.5">Specifications</p>
                {parseSpecifications(activeQuote.specificationsJson).length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {parseSpecifications(activeQuote.specificationsJson).map(([key, val]) => (
                      <div key={key} className="flex justify-between px-3 py-1.5 odd:bg-gray-50 border-b last:border-b-0 border-gray-100">
                        <span className="font-semibold text-gray-500">{key}</span>
                        <span className="text-gray-900 font-medium">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No structured specifications provided.</p>
                )}
              </div>

              {/* Description */}
              {activeQuote.description && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-gray-400 mb-1.5">Project Description</p>
                  <p className="text-gray-800 bg-gray-50 rounded-lg p-3 border border-gray-100 whitespace-pre-wrap">
                    {activeQuote.description}
                  </p>
                </div>
              )}

              {/* Reference Image */}
              {activeQuote.referenceImageUrl && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-gray-400 mb-1.5 flex items-center gap-1">
                    <HiOutlinePhotograph className="w-4 h-4" /> Reference Image
                  </p>
                  <a href={activeQuote.referenceImageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={activeQuote.referenceImageUrl}
                      alt="Customer reference"
                      className="max-h-48 rounded-lg border border-gray-200"
                    />
                  </a>
                </div>
              )}

              {/* Response Form */}
              <form onSubmit={handleSaveResponse} className="space-y-4 pt-2 border-t border-gray-100">
                <p className="text-[10px] font-extrabold uppercase text-gray-400 pt-3">Admin Response</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="font-bold text-gray-700 block mb-1">Quoted Price (₹)</Label>
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={responseForm.quotedPrice}
                      onChange={(e) => setResponseForm({ ...responseForm, quotedPrice: e.target.value })}
                      placeholder="e.g. 4500"
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700 block mb-1">Valid Until</Label>
                    <TextInput
                      type="date"
                      value={responseForm.validUntil}
                      onChange={(e) => setResponseForm({ ...responseForm, validUntil: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700 block mb-1">Status</Label>
                    <Select
                      value={responseForm.status}
                      onChange={(e) => setResponseForm({ ...responseForm, status: e.target.value })}
                    >
                      {allowedStatusChoices.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Internal Notes</Label>
                  <Textarea
                    rows={3}
                    value={responseForm.notes}
                    onChange={(e) => setResponseForm({ ...responseForm, notes: e.target.value })}
                    placeholder="Internal notes visible only to staff..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button color="light" type="button" onClick={closeModal} disabled={saving} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    color="dark"
                    disabled={saving}
                    className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs"
                  >
                    {saving ? <Spinner size="sm" className="mr-2" /> : null}
                    {saving ? 'Saving...' : 'Save Response'}
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </Modal.Body>
      </Modal>
    </div>
  );
}
