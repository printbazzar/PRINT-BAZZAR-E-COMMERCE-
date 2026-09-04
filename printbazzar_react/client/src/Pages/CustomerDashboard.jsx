import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tabs, Button, Badge, Modal, TextInput, Label, Spinner, Alert } from 'flowbite-react';
import {
  HiOutlineShoppingBag,
  HiOutlineDocumentText,
  HiOutlineArrowRight,
  HiOutlineTruck,
  HiOutlineSparkles,
  HiOutlineEye,
  HiOutlinePlus,
} from 'react-icons/hi';
import {
  HiOutlineBuildingOffice2,
  HiOutlineMapPin,
  HiOutlineArrowPath,
  HiOutlineCheckBadge,
  HiOutlineArrowLeftOnRectangle,
} from 'react-icons/hi2';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useCart } from '../context/CartContext';
import { useBusinessInfo } from '../context/BusinessInfoContext';
import { api } from '../services/api';

export default function CustomerDashboard() {
  const { customer, logoutCustomer, isCorporate } = useCustomerAuth();
  const { addToCart } = useCart();
  const { businessInfo } = useBusinessInfo();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState('');

  // Add Address Modal
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('Branch Office');
  const [newRecipient, setNewRecipient] = useState(customer?.name || '');
  const [newMobile, setNewMobile] = useState(customer?.mobile || '');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('Tiruchirappalli');
  const [newPincode, setNewPincode] = useState('620001');

  // Invoice Modal
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  useEffect(() => {
    if (!customer) {
      navigate('/account/login');
      return;
    }
    loadData();
  }, [customer]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profRes, ordRes] = await Promise.all([
        api.getCustomerProfile(),
        api.getCustomerOrders(),
      ]);

      if (profRes.success && profRes.data) {
        setDashboardData(profRes.data);
      }
      if (ordRes.success && ordRes.data) {
        setOrders(ordRes.data);
      }
    } catch (err) {
      setError('Failed to load account dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handle1ClickReorder = async (orderId) => {
    try {
      const res = await api.reorderPreviousOrder(orderId);
      if (res.success && res.items) {
        res.items.forEach((item) => {
          addToCart(
            { id: item.productId, name: item.productName, startingPrice: item.selectedOptions?.subtotal || 200 },
            item.selectedOptions,
            item.quantity,
            { subtotal: item.selectedOptions?.subtotal || 200, totalTax: 0 },
            item.artworkFileUrl
          );
        });
        setReorderSuccessMsg(`✔ Items from order ${res.previousOrderNumber} loaded into your cart! Redirecting to checkout...`);
        setTimeout(() => {
          navigate('/checkout');
        }, 1500);
      }
    } catch (err) {
      alert('Failed to re-order: ' + err.message);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.addCustomerAddress({
        label: newLabel,
        recipientName: newRecipient,
        mobile: newMobile,
        street: newStreet,
        city: newCity,
        pincode: newPincode,
      });
      if (res.success) {
        setAddressModalOpen(false);
        loadData();
      }
    } catch (err) {
      alert('Failed to save address: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Spinner size="xl" />
        <span className="text-xs font-bold text-gray-500 mt-3">Loading Customer Dashboard...</span>
      </div>
    );
  }

  const stats = dashboardData?.stats || { totalOrdersCount: orders.length, activeOrdersCount: 0, totalSpend: 0 };

  return (
    <div className="mx-auto px-4 py-8 max-w-7xl">
      {/* 1. Account Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-8">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isCorporate ? (
                <span className="bg-yellow-400 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <HiOutlineBuildingOffice2 className="w-3.5 h-3.5" /> B2B Corporate Partner (10% Off)
                </span>
              ) : (
                <span className="bg-white/20 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <HiOutlineCheckBadge className="w-3.5 h-3.5 text-green-400" /> Verified Customer
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black">
              Welcome, {isCorporate ? (customer.companyName || customer.name) : customer.name}!
            </h1>
            <p className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-3">
              <span>📧 {customer.email}</span>
              <span>📱 +91 {customer.mobile}</span>
              {customer.gstNumber && <span>🏛️ GSTIN: {customer.gstNumber}</span>}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              as={Link}
              to="/shop"
              color="warning"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs rounded-xl"
            >
              Order New Prints +
            </Button>
            <Button
              color="light"
              size="xs"
              onClick={() => {
                logoutCustomer();
                navigate('/account/login');
              }}
              className="font-extrabold text-xs"
            >
              <HiOutlineArrowLeftOnRectangle className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-8 pt-6 border-t border-gray-800">
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3 sm:p-4 border border-white/10">
            <span className="text-[10px] text-gray-400 block font-bold uppercase">Total Orders</span>
            <span className="text-xl sm:text-2xl font-black text-white">{stats.totalOrdersCount}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3 sm:p-4 border border-white/10">
            <span className="text-[10px] text-yellow-400 block font-bold uppercase">Active In-Press</span>
            <span className="text-xl sm:text-2xl font-black text-yellow-400">{stats.activeOrdersCount}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3 sm:p-4 border border-white/10">
            <span className="text-[10px] text-green-400 block font-bold uppercase">Lifetime Value</span>
            <span className="text-xl sm:text-2xl font-black text-green-400">₹{stats.totalSpend}</span>
          </div>
        </div>
      </div>

      {reorderSuccessMsg && (
        <Alert color="success" className="mb-6 text-xs font-bold">
          {reorderSuccessMsg}
        </Alert>
      )}

      {/* 2. Main Dashboard Tabbed Interface */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs">
        <Tabs aria-label="Customer Account Navigation" variant="underline">
          {/* TAB 1: ORDERS & LIVE TRACKING */}
          <Tabs.Item active title="📦 Order History & Live Tracking" icon={HiOutlineShoppingBag}>
            <div className="pt-4 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-base text-gray-900">Your Print Orders & Repeat Slabs</h3>
                <span className="text-xs text-gray-500 font-bold">{orders.length} Total Orders</span>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-gray-50">
                  <HiOutlineShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-extrabold text-sm text-gray-800">No Orders Placed Yet</h4>
                  <p className="text-xs text-gray-500 mt-1 mb-4">
                    Explore our catalogue of visiting cards, letterheads, flyers, and promotional items.
                  </p>
                  <Button as={Link} to="/shop" color="dark" size="xs" className="mx-auto font-black">
                    Start Your First Order ➔
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => {
                    const isCompleted = ord.orderStatus === 'DELIVERED';
                    return (
                      <div
                        key={ord.id}
                        className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white hover:border-yellow-400 transition-all shadow-2xs space-y-4"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-gray-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-gray-900">{ord.orderNumber}</span>
                              <Badge
                                color={
                                  isCompleted
                                    ? 'success'
                                    : ord.currentDepartment === 'DELIVERY'
                                    ? 'warning'
                                    : 'purple'
                                }
                                size="xs"
                                className="font-bold"
                              >
                                {ord.currentDepartment
                                  ? `${ord.currentDepartment} DEPT`
                                  : ord.orderStatus}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-gray-400 block mt-0.5">
                              Placed on {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-xs text-gray-400 block">Grand Total</span>
                            <span className="font-black text-base text-red-600">₹{ord.grandTotal}</span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2.5">
                          {ord.items?.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 bg-gray-50/70 p-2.5 rounded-xl">
                              <img
                                src={item.product?.thumbnailUrl || '/default-image.png'}
                                alt={item.productNameSnapshot}
                                className="w-12 h-12 object-cover rounded-lg border bg-white"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-extrabold text-xs text-gray-900 truncate">
                                  {item.productNameSnapshot}
                                </h4>
                                <p className="text-[10px] text-gray-500 truncate">
                                  Quantity: <strong>{item.quantity} pcs</strong> | Unit: ₹{item.unitPrice}
                                </p>
                              </div>
                              {item.artworkFileUrl && (
                                <a
                                  href={item.artworkFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] bg-white border text-gray-700 px-2 py-1 rounded font-bold hover:bg-gray-100"
                                >
                                  View Artwork
                                </a>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Action CTA Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/track-order?orderId=${ord.orderNumber}`}
                              className="inline-flex items-center gap-1.5 bg-black hover:bg-gray-800 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition-colors"
                            >
                              <HiOutlineTruck className="w-4 h-4 text-yellow-400" />
                              <span>Live Department Tracker</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoiceOrder(ord);
                                setInvoiceModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold px-3 py-1.5 rounded-xl text-xs transition-colors"
                            >
                              <HiOutlineDocumentText className="w-4 h-4" />
                              <span>GST Tax Invoice</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handle1ClickReorder(ord.id)}
                            className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-black font-black px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-colors"
                          >
                            <HiOutlineArrowPath className="w-4 h-4" />
                            <span>1-Click Re-Order ➔</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Tabs.Item>

          {/* TAB 2: COMPANY PROFILE & GST TAX */}
          <Tabs.Item title="🏢 Company & GST Profile" icon={HiOutlineBuildingOffice2}>
            <div className="pt-4 max-w-3xl space-y-6 text-xs">
              <div>
                <h3 className="font-black text-base text-gray-900">
                  {isCorporate ? 'Registered Corporate Profile' : 'Personal Profile'}
                </h3>
                <p className="text-gray-500 mt-0.5">Official billing details attached to all 18% GST tax invoices.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-2xl p-5 bg-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Account Holder</span>
                  <span className="font-extrabold text-gray-900 text-sm">{customer.name}</span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Account Type</span>
                  <span className="font-extrabold text-yellow-900 bg-yellow-100 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                    {isCorporate ? '🏢 B2B CORPORATE COMPANY' : '👤 B2C RETAIL CUSTOMER'}
                  </span>
                </div>

                {isCorporate && (
                  <>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Company Name</span>
                      <span className="font-bold text-gray-900">{customer.companyName || 'Not specified'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">GSTIN Number</span>
                      <span className="font-mono font-bold text-gray-900">{customer.gstNumber || 'Unregistered'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Business PAN</span>
                      <span className="font-mono font-bold text-gray-900">{customer.businessPan || '—'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Corporate Discount</span>
                      <span className="font-extrabold text-green-700">10% Wholesale Savings Active</span>
                    </div>
                  </>
                )}

                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Official Email</span>
                  <span className="font-semibold text-gray-900">{customer.email}</span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Mobile / WhatsApp</span>
                  <span className="font-semibold text-gray-900">+91 {customer.mobile}</span>
                </div>
              </div>
            </div>
          </Tabs.Item>

          {/* TAB 3: SAVED BRANCHES & ADDRESSES */}
          <Tabs.Item title="📍 Delivery Addresses" icon={HiOutlineMapPin}>
            <div className="pt-4 max-w-4xl space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-black text-base text-gray-900">Saved Branch Delivery Addresses</h3>
                  <p className="text-xs text-gray-500">Dispatch directly to multiple office locations or retail branches.</p>
                </div>

                <Button
                  size="xs"
                  color="dark"
                  onClick={() => setAddressModalOpen(true)}
                  className="bg-black text-white font-extrabold text-xs"
                >
                  <HiOutlinePlus className="w-4 h-4 mr-1" /> Add New Address
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.savedAddresses && customer.savedAddresses.length > 0 ? (
                  customer.savedAddresses.map((addr) => (
                    <div key={addr.id} className="border rounded-2xl p-4 bg-white shadow-2xs space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-gray-900 text-xs">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-gray-800">{addr.recipientName} ({addr.mobile})</p>
                      <p className="text-gray-600 leading-relaxed">
                        {addr.street}, {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="border rounded-2xl p-4 bg-white shadow-2xs text-xs space-y-1.5 col-span-2">
                    <span className="font-black text-gray-900">Primary Registered Address</span>
                    <p className="text-gray-600">{customer.address || 'Trichy, Tamil Nadu'}</p>
                    <p className="text-gray-500 font-medium">Pincode: {customer.pincode || '620001'}</p>
                  </div>
                )}
              </div>
            </div>
          </Tabs.Item>
        </Tabs>
      </div>

      {/* Add Address Modal */}
      <Modal show={addressModalOpen} onClose={() => setAddressModalOpen(false)}>
        <Modal.Header>Add Office / Delivery Branch</Modal.Header>
        <form onSubmit={handleSaveAddress}>
          <Modal.Body className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">Branch / Location Label *</Label>
              <TextInput
                placeholder="e.g. Cantonment Branch or Warehouse"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
                sizing="sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-gray-700 block mb-1">Recipient Name *</Label>
                <TextInput
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  required
                  sizing="sm"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-700 block mb-1">Contact Mobile *</Label>
                <TextInput
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  required
                  sizing="sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">Street Address *</Label>
              <TextInput
                value={newStreet}
                onChange={(e) => setNewStreet(e.target.value)}
                required
                sizing="sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-gray-700 block mb-1">City</Label>
                <TextInput value={newCity} onChange={(e) => setNewCity(e.target.value)} sizing="sm" />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-700 block mb-1">Pincode *</Label>
                <TextInput
                  value={newPincode}
                  onChange={(e) => setNewPincode(e.target.value)}
                  required
                  sizing="sm"
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="flex justify-between">
            <Button color="light" size="xs" onClick={() => setAddressModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" color="dark" size="xs" className="bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold">
              Save Address ➔
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Tax Invoice Modal */}
      <Modal show={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} size="3xl">
        <Modal.Header>GST Tax Invoice Preview</Modal.Header>
        <Modal.Body>
          {selectedInvoiceOrder && (
            <div className="p-6 border rounded-2xl bg-white space-y-6 text-xs text-gray-800">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-black">{businessInfo?.legal?.tradeName || 'PRINT BAZZAR'}</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {businessInfo?.address?.registeredOffice?.fullAddress || '12 A, Allimal Street, Big Bazzar St, Tiruchirapalli - 620008'}<br />
                    {businessInfo?.legal?.gstin ? (
                      <>GSTIN: <strong>{businessInfo.legal.gstin}</strong> | </>
                    ) : null}
                    State: {businessInfo?.address?.registeredOffice?.state || 'Tamil Nadu'} ({businessInfo?.legal?.stateCode || '33'})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-gray-400 block">TAX INVOICE</span>
                  <span className="font-mono font-bold text-gray-900">{selectedInvoiceOrder.orderNumber}</span>
                  <span className="text-[10px] text-gray-400 block">
                    Date: {new Date(selectedInvoiceOrder.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 border p-3 rounded-xl bg-gray-50 text-[11px]">
                <div>
                  <strong className="block text-gray-900 uppercase">Billed To (Customer):</strong>
                  <span className="font-bold">{customer.companyName || selectedInvoiceOrder.customerName}</span><br />
                  <span>{selectedInvoiceOrder.shippingAddress}</span><br />
                  <span>GSTIN: {customer.gstNumber || 'Consumer / B2C'}</span>
                </div>
                <div>
                  <strong className="block text-gray-900 uppercase">Dispatch Facility:</strong>
                  <span>Print Bazzar Heidelberg Offset Hub, Trichy</span><br />
                  <span>Place of Supply: 33-Tamil Nadu</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-xl overflow-hidden divide-y">
                <div className="bg-gray-100 p-2.5 font-bold flex justify-between">
                  <span className="w-1/2">Product Description & Specs</span>
                  <span className="w-1/6 text-center">Qty</span>
                  <span className="w-1/6 text-right">Rate</span>
                  <span className="w-1/6 text-right">Amount (₹)</span>
                </div>
                {selectedInvoiceOrder.items?.map((item) => (
                  <div key={item.id} className="p-2.5 flex justify-between items-center">
                    <div className="w-1/2">
                      <strong className="block text-gray-900">{item.productNameSnapshot}</strong>
                      <span className="text-[10px] text-gray-500 font-mono">SKU: {item.skuSnapshot}</span>
                    </div>
                    <span className="w-1/6 text-center font-bold">{item.quantity}</span>
                    <span className="w-1/6 text-right">₹{item.unitPrice}</span>
                    <span className="w-1/6 text-right font-bold">₹{item.totalPrice}</span>
                  </div>
                ))}
              </div>

              {/* Total Calculation */}
              <div className="space-y-1.5 text-right pt-2 border-t text-xs">
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span>₹{selectedInvoiceOrder.subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>CGST (9%):</span>
                  <span>₹{(selectedInvoiceOrder.taxAmount / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>SGST (9%):</span>
                  <span>₹{(selectedInvoiceOrder.taxAmount / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-red-600 border-t pt-2">
                  <span>Total Payable:</span>
                  <span>₹{selectedInvoiceOrder.grandTotal}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-gray-400 pt-4 border-t">
                This is a computer-generated tax invoice issued by Print Bazzar.
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="flex justify-between">
          <Button color="light" size="xs" onClick={() => setInvoiceModalOpen(false)}>
            Close
          </Button>
          <Button
            color="dark"
            size="xs"
            onClick={() => window.print()}
            className="bg-yellow-400 text-black font-extrabold hover:bg-yellow-500"
          >
            🖨️ Print / Save PDF
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
