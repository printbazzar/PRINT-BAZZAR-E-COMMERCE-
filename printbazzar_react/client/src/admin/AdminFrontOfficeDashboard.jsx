import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, Button } from 'flowbite-react';
import {
  HiOutlineShoppingCart,
  HiOutlineCurrencyRupee,
  HiOutlineUsers,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiArrowRight,
} from 'react-icons/hi';
import { api } from '../services/api';
import OrderSourceBadge from '../Components/OrderSourceBadge';

export default function AdminFrontOfficeDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard(selectedDate);
  }, [selectedDate]);

  const fetchDashboard = async (dateStr) => {
    setLoading(true);
    try {
      const res = await api.getFrontOfficeDashboard(dateStr);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error fetching front office dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const kpis = data?.kpis || {};
  const staffPerf = data?.staffPerformance || [];

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏪</span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Front Office & POS Hub</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Omnichannel order entry monitoring, daily counter collections, and staff performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-2 py-1 shadow-xs">
            <span className="text-xs font-bold text-gray-600">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 p-0 text-xs font-bold text-gray-900 focus:ring-0 cursor-pointer"
            />
          </div>

          <Button
            color="light"
            size="sm"
            onClick={() => fetchDashboard(selectedDate)}
            className="text-xs font-semibold"
            title="Refresh statistics"
          >
            <HiOutlineRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>

          <Button
            as={Link}
            to="/admin/pos"
            color="dark"
            size="sm"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs shadow-sm"
          >
            <HiOutlineShoppingCart className="w-4 h-4 mr-1.5" /> New Walk-In / POS Order
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Spinner size="xl" />
          <p className="mt-3 text-sm text-gray-500 font-medium">Loading Front Office Metrics...</p>
        </div>
      ) : (
        <>
          {/* Main Financial & Order KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sales Today */}
            <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between border-l-4 border-l-yellow-400">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Booked Sales</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">₹{kpis.totalSalesToday?.toLocaleString('en-IN') || 0}</h3>
                <p className="text-[11px] text-gray-500 font-semibold mt-1">
                  Walk-in: <span className="text-black font-bold">₹{kpis.walkInSalesToday?.toLocaleString('en-IN') || 0}</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center">
                <HiOutlineCurrencyRupee className="w-7 h-7" />
              </div>
            </div>

            {/* Total Payments Collected */}
            <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between border-l-4 border-l-green-500">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Collected</p>
                <h3 className="text-2xl font-black text-green-600 mt-1">₹{kpis.totalCollected?.toLocaleString('en-IN') || 0}</h3>
                <p className="text-[11px] text-green-700 font-semibold mt-1">
                  Cash + UPI + Card + Online
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <HiOutlineCheckCircle className="w-7 h-7" />
              </div>
            </div>

            {/* Balance Due / Uncollected */}
            <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between border-l-4 border-l-red-500">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Outstanding Balance</p>
                <h3 className="text-2xl font-black text-red-600 mt-1">₹{kpis.balanceDueToday?.toLocaleString('en-IN') || 0}</h3>
                <p className="text-[11px] text-gray-500 font-semibold mt-1">
                  {kpis.pendingPayments || 0} orders pending payment
                </p>
              </div>
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <HiOutlineExclamationCircle className="w-7 h-7" />
              </div>
            </div>

            {/* Total Orders Created */}
            <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between border-l-4 border-l-indigo-500">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Orders Placed</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{kpis.totalOrdersCreated || 0}</h3>
                <p className="text-[11px] text-indigo-700 font-semibold mt-1">
                  Walk-in: <span className="font-bold">{kpis.walkInOrdersCount || 0}</span> | Web: <span className="font-bold">{kpis.websiteOrdersCount || 0}</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <HiOutlineShoppingCart className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* Payment Collection Channels & Omnichannel Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                  <span>💳</span> Daily Payment Collections
                </h2>
                <span className="text-xs font-bold text-gray-500">
                  Total: ₹{kpis.totalCollected?.toLocaleString('en-IN') || 0}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <span className="text-[10px] font-black uppercase text-emerald-700 block">💵 Cash</span>
                  <p className="text-lg font-black text-gray-900 mt-0.5">₹{kpis.cashCollected?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <span className="text-[10px] font-black uppercase text-blue-700 block">📱 UPI / QR</span>
                  <p className="text-lg font-black text-gray-900 mt-0.5">₹{kpis.upiCollected?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <span className="text-[10px] font-black uppercase text-purple-700 block">💳 Card POS</span>
                  <p className="text-lg font-black text-gray-900 mt-0.5">₹{kpis.cardCollected?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                  <span className="text-[10px] font-black uppercase text-cyan-700 block">⚡ Razorpay Online</span>
                  <p className="text-lg font-black text-gray-900 mt-0.5">₹{kpis.razorpayCollected?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <span className="text-[10px] font-black uppercase text-gray-700 block">🏦 Bank Transfer</span>
                  <p className="text-lg font-black text-gray-900 mt-0.5">₹{kpis.bankTransferCollected?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <span className="text-[10px] font-black uppercase text-amber-700 block">⏳ Pending Due</span>
                  <p className="text-lg font-black text-red-600 mt-0.5">₹{kpis.balanceDueToday?.toLocaleString('en-IN') || 0}</p>
                </div>
              </div>
            </div>

            {/* Omnichannel Distribution */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                  <span>🌐</span> Orders by Source Channel
                </h2>
                <span className="text-xs font-bold text-gray-500">
                  {kpis.totalOrdersCreated || 0} Total Orders
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <OrderSourceBadge source="WALK_IN" size="xs" />
                    <span className="text-base font-black text-gray-900">{kpis.walkInOrdersCount || 0}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">Counter Walk-in</span>
                </div>

                <div className="p-2.5 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <OrderSourceBadge source="WEBSITE" size="xs" />
                    <span className="text-base font-black text-gray-900">{kpis.websiteOrdersCount || 0}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">Direct Online</span>
                </div>

                <div className="p-2.5 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <OrderSourceBadge source="WHATSAPP" size="xs" />
                    <span className="text-base font-black text-gray-900">{kpis.whatsappOrdersCount || 0}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">WhatsApp Chat</span>
                </div>

                <div className="p-2.5 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <OrderSourceBadge source="INSTAGRAM" size="xs" />
                    <span className="text-base font-black text-gray-900">{kpis.instagramOrdersCount || 0}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">Instagram DM</span>
                </div>

                <div className="p-2.5 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <OrderSourceBadge source="PHONE" size="xs" />
                    <span className="text-base font-black text-gray-900">{kpis.phoneOrdersCount || 0}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">Phone Call</span>
                </div>

                <div className="p-2.5 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <OrderSourceBadge source="B2B" size="xs" />
                    <span className="text-base font-black text-gray-900">{kpis.b2bOrdersCount || 0}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">Corporate Client</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Workflow Queues */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-800">Pending Customer Artwork</p>
                <h4 className="text-xl font-black text-amber-900 mt-0.5">{kpis.pendingArtwork || 0} Orders</h4>
                <p className="text-[10px] text-amber-700 mt-0.5">Files not yet received</p>
              </div>
              <Link to="/admin/orders?status=ORDER_REVIEW" className="p-2 bg-amber-200 rounded-lg hover:bg-amber-300 text-amber-900">
                <HiArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-purple-800">Design Proof Approvals</p>
                <h4 className="text-xl font-black text-purple-900 mt-0.5">{kpis.pendingDesignApproval || 0} Orders</h4>
                <p className="text-[10px] text-purple-700 mt-0.5">In design queue or awaiting approval</p>
              </div>
              <Link to="/admin/orders?department=DESIGN" className="p-2 bg-purple-200 rounded-lg hover:bg-purple-300 text-purple-900">
                <HiArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-800">Pre-Production QC Pending</p>
                <h4 className="text-xl font-black text-blue-900 mt-0.5">{kpis.preProductionQcPending || 0} Orders</h4>
                <p className="text-[10px] text-blue-700 mt-0.5">Mandatory gate before press room</p>
              </div>
              <Link to="/admin/orders?status=PRE_PRODUCTION_QC" className="p-2 bg-blue-200 rounded-lg hover:bg-blue-300 text-blue-900">
                <HiArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Front Office Staff Performance Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <HiOutlineUsers className="w-5 h-5 text-yellow-600" />
                  Front Office Staff Performance
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Breakdown of orders created, sales volume, and payment collections by staff member.
                </p>
              </div>
            </div>

            {staffPerf.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs italic">
                No orders recorded for the selected date.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-700">
                  <thead className="bg-gray-50 uppercase text-[10px] text-gray-400 border-b">
                    <tr>
                      <th className="p-3">Staff Member</th>
                      <th className="p-3 text-center">Orders Placed</th>
                      <th className="p-3 text-right">Total Sales Booked</th>
                      <th className="p-3 text-right">Cash Collected</th>
                      <th className="p-3 text-right">UPI Collected</th>
                      <th className="p-3 text-right">Unpaid Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffPerf.map((staff, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold text-gray-900">
                          {staff.staffName}
                        </td>
                        <td className="p-3 text-center font-bold text-gray-800">
                          {staff.orderCount}
                        </td>
                        <td className="p-3 text-right font-black text-gray-900">
                          ₹{staff.totalSales?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-600">
                          ₹{staff.cashCollected?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="p-3 text-right font-semibold text-blue-600">
                          ₹{staff.upiCollected?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="p-3 text-right font-bold text-red-600">
                          ₹{staff.pendingBalance?.toLocaleString('en-IN') || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
