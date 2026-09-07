import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TextInput, Select, Button, Spinner } from 'flowbite-react';
import { HiSearch, HiOutlineEye, HiOutlinePrinter } from 'react-icons/hi';
import { api } from '../services/api';
import PreProductionQCModal from '../Components/PreProductionQCModal';
import OrderSourceBadge from '../Components/OrderSourceBadge';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [orderSourceFilter, setOrderSourceFilter] = useState('ALL');
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedQcOrder, setSelectedQcOrder] = useState(null);
  const [qcModalOpen, setQcModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, paymentFilter, departmentFilter, orderSourceFilter, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminOrders({
        search,
        status: statusFilter,
        paymentStatus: paymentFilter,
        department: departmentFilter,
        orderSource: orderSourceFilter,
        page,
        limit: 25,
      });
      if (res.success) {
        setOrders(res.data || []);
        setTotalOrders(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PAYMENT_PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'PAYMENT_CONFIRMED':
        return 'bg-emerald-100 text-emerald-800';
      case 'ORDER_REVIEW':
      case 'ARTWORK_REVIEW':
      case 'DESIGN_QUEUE':
      case 'DESIGN_REQUIRED':
      case 'CUSTOMER_APPROVAL_REQUIRED':
      case 'CUSTOMER_APPROVAL':
        return 'bg-purple-100 text-purple-800';
      case 'PRE_PRODUCTION_QC':
      case 'PRODUCTION_QUEUE':
        return 'bg-blue-100 text-blue-800';
      case 'PRINTING':
      case 'FINISHING':
        return 'bg-yellow-100 text-yellow-800';
      case 'QUALITY_CHECK':
      case 'PACKING':
      case 'PACKED':
      case 'READY':
      case 'READY_FOR_DISPATCH':
        return 'bg-orange-100 text-orange-800';
      case 'OUT_FOR_DELIVERY':
      case 'DISPATCHED':
        return 'bg-cyan-100 text-cyan-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'PROCESSING':
      case 'ORDER_RECEIVED':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Order Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Total of <span className="font-bold text-gray-800">{totalOrders}</span> customer orders
          </p>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white p-4 rounded-xl border shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <TextInput
          type="text"
          placeholder="Search by Order ID, Name, Mobile..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          icon={HiSearch}
          size="sm"
        />

        <Select
          value={orderSourceFilter}
          onChange={(e) => {
            setOrderSourceFilter(e.target.value);
            setPage(1);
          }}
          size="sm"
        >
          <option value="ALL">All Sources / Channels</option>
          <option value="WEBSITE">🌐 Website Direct</option>
          <option value="WALK_IN">🏪 Counter Walk-In</option>
          <option value="WHATSAPP">💬 WhatsApp Chat</option>
          <option value="INSTAGRAM">📸 Instagram DM</option>
          <option value="PHONE">📞 Phone Order</option>
          <option value="B2B">🏢 Corporate B2B</option>
          <option value="STAFF_ASSISTED">👨‍💼 Staff Assisted</option>
        </Select>

        <Select
          value={departmentFilter}
          onChange={(e) => {
            setDepartmentFilter(e.target.value);
            setPage(1);
          }}
          size="sm"
        >
          <option value="ALL">All Departments</option>
          <option value="DESIGN">Design & Prepress</option>
          <option value="PRODUCTION">Press Production</option>
          <option value="FINISHING_QC">Finishing & QC</option>
          <option value="PACKING">Packaging Desk</option>
          <option value="DELIVERY">Logistics & Delivery</option>
          <option value="COMPLETED">Completed</option>
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          size="sm"
        >
          <option value="ALL">All Order Statuses</option>
          <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
          <option value="PAYMENT_CONFIRMED">PAYMENT_CONFIRMED</option>
          <option value="ORDER_REVIEW">ORDER_REVIEW (Prepress Hub)</option>
          <option value="DESIGN_QUEUE">DESIGN_QUEUE (Design Service)</option>
          <option value="ARTWORK_REVIEW">ARTWORK_REVIEW</option>
          <option value="CUSTOMER_APPROVAL_REQUIRED">CUSTOMER_APPROVAL_REQUIRED</option>
          <option value="ARTWORK_APPROVED">ARTWORK_APPROVED</option>
          <option value="PRE_PRODUCTION_QC">PRE_PRODUCTION_QC</option>
          <option value="PRODUCTION_QUEUE">PRODUCTION_QUEUE</option>
          <option value="PRINTING">PRINTING</option>
          <option value="FINISHING">FINISHING</option>
          <option value="QUALITY_CHECK">QUALITY_CHECK</option>
          <option value="PACKING">PACKING</option>
          <option value="READY_FOR_DISPATCH">READY_FOR_DISPATCH</option>
          <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
        </Select>

        <Select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setPage(1);
          }}
          size="sm"
        >
          <option value="ALL">All Payment Statuses</option>
          <option value="PENDING">Payment: PENDING</option>
          <option value="PROCESSING">Payment: PROCESSING</option>
          <option value="CONFIRMED">Payment: CONFIRMED</option>
          <option value="SUCCESS">Payment: SUCCESS</option>
          <option value="FAILED">Payment: FAILED</option>
          <option value="REFUNDED">Payment: REFUNDED</option>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Spinner size="lg" />
            <p className="mt-2 text-xs text-gray-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            No orders found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="bg-gray-50 uppercase text-[10px] text-gray-400 border-b">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Total (₹)</th>
                  <th className="p-3">Order Status</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <Link to={`/admin/orders/${ord.id}`} className="font-mono font-bold text-gray-900 hover:text-yellow-600 block">
                        {ord.orderNumber}
                      </Link>
                      <div className="mt-1">
                        <OrderSourceBadge source={ord.orderSource} size="xs" />
                      </div>
                    </td>

                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="p-3">
                      <span className="font-bold text-gray-900 block">{ord.customerName}</span>
                      <span className="text-[11px] text-gray-500">{ord.customerMobile}</span>
                    </td>

                    <td className="p-3 font-semibold text-gray-800">
                      {ord.items?.length || 0} items
                    </td>

                    <td className="p-3 font-extrabold text-red-600 text-sm">
                      ₹{ord.grandTotal}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getStatusBadgeClass(
                          ord.orderStatus
                        )}`}
                      >
                        {ord.orderStatus?.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          ord.paymentStatus === 'CONFIRMED' || ord.paymentStatus === 'SUCCESS' || ord.paymentStatus === 'PAID'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : ord.paymentStatus === 'FAILED'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>

                    <td className="p-3 text-right whitespace-nowrap">
                      {ord.orderStatus === 'PRE_PRODUCTION_QC' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQcOrder(ord);
                            setQcModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold rounded text-xs animate-pulse mr-1.5 shadow-2xs"
                        >
                          🛡️ Pre-QC
                        </button>
                      )}
                      <Link
                        to={`/admin/orders/${ord.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded text-xs"
                      >
                        <HiOutlineEye className="w-3.5 h-3.5" /> Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalOrders > 25 && (
        <div className="flex justify-between items-center text-xs text-gray-500 pt-2">
          <span>Showing page {page} of {Math.ceil(totalOrders / 25)}</span>
          <div className="flex gap-2">
            <Button
              size="xs"
              color="light"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="xs"
              color="light"
              disabled={page >= Math.ceil(totalOrders / 25)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Pre-Production QC Modal */}
      <PreProductionQCModal
        show={qcModalOpen}
        onClose={() => {
          setQcModalOpen(false);
          setSelectedQcOrder(null);
        }}
        order={selectedQcOrder}
        onSuccess={() => {
          fetchOrders();
        }}
      />
    </div>
  );
}
