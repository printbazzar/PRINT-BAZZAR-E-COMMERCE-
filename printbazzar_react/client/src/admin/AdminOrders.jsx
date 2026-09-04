import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TextInput, Select, Button, Spinner } from 'flowbite-react';
import { HiSearch, HiOutlineEye, HiOutlinePrinter } from 'react-icons/hi';
import { api } from '../services/api';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, paymentFilter, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminOrders({
        search,
        status: statusFilter,
        paymentStatus: paymentFilter,
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
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'ORDER_RECEIVED':
        return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED':
        return 'bg-indigo-100 text-indigo-800';
      case 'PRINTING':
      case 'PRODUCTION_QUEUE':
      case 'FINISHING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
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
      <div className="bg-white p-4 rounded-xl border shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          size="sm"
        >
          <option value="ALL">All Order Statuses</option>
          <option value="ORDER_RECEIVED">ORDER_RECEIVED</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="PRODUCTION_QUEUE">PRODUCTION_QUEUE</option>
          <option value="PRINTING">PRINTING</option>
          <option value="FINISHING">FINISHING</option>
          <option value="PACKED">PACKED</option>
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
          <option value="CONFIRMED">Payment: CONFIRMED</option>
          <option value="FAILED">Payment: FAILED</option>
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
                    <td className="p-3 font-mono font-bold text-gray-900">
                      <Link to={`/admin/orders/${ord.id}`} className="hover:text-yellow-600">
                        {ord.orderNumber}
                      </Link>
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
                          ord.paymentStatus === 'CONFIRMED'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <Link
                        to={`/admin/orders/${ord.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded text-xs"
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
    </div>
  );
}
