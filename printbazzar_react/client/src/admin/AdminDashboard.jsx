import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, Button } from 'flowbite-react';
import {
  HiOutlineShoppingBag,
  HiOutlineCurrencyRupee,
  HiOutlineClipboardCheck,
  HiOutlineClock,
  HiOutlineTruck,
  HiOutlineExclamation,
  HiOutlinePlus,
  HiArrowRight,
} from 'react-icons/hi';
import { api } from '../services/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardKPIs();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Spinner size="xl" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Loading store metrics...</p>
      </div>
    );
  }

  const { kpis, chartData, recentOrders, recentAuditLogs } = data || {};

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time overview of Print Bazzar sales, production, and catalog health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            as={Link}
            to="/admin/products/new"
            color="dark"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs"
            size="sm"
          >
            <HiOutlinePlus className="w-4 h-4 mr-1" /> Add Product
          </Button>
          <Button
            as={Link}
            to="/admin/orders"
            color="light"
            size="sm"
            className="text-xs font-semibold"
          >
            Manage Orders
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Revenue</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">₹{kpis?.totalRevenue || 0}</h3>
            <p className="text-[11px] text-green-600 font-semibold mt-1">
              Today: ₹{kpis?.todayRevenue || 0}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <HiOutlineCurrencyRupee className="w-7 h-7" />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Orders</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{kpis?.totalOrders || 0}</h3>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">
              Today: {kpis?.todayOrders || 0} orders
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <HiOutlineClipboardCheck className="w-7 h-7" />
          </div>
        </div>

        {/* Production Queue */}
        <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Production Queue</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{kpis?.productionOrders || 0}</h3>
            <p className="text-[11px] text-yellow-600 font-semibold mt-1">
              Pending confirmation: {kpis?.pendingOrders || 0}
            </p>
          </div>
          <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center">
            <HiOutlineClock className="w-7 h-7" />
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Catalogue</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{kpis?.activeProducts || 0}</h3>
            <p className="text-[11px] text-gray-500 font-medium mt-1">
              Total created: {kpis?.totalProducts || 0}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <HiOutlineShoppingBag className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* 7-Day Trend Chart & Metrics */}
      <div className="bg-white p-6 rounded-2xl border shadow-xs">
        <h2 className="text-base font-bold text-gray-900 mb-4">7-Day Order Volume & Revenue Trend</h2>
        <div className="grid grid-cols-7 gap-2 sm:gap-4 text-center items-end h-40 pt-4">
          {chartData?.map((day, idx) => {
            const heightPercent = Math.min(100, Math.max(15, (day.orders / (Math.max(...chartData.map((d) => d.orders), 1))) * 100));
            return (
              <div key={idx} className="flex flex-col items-center justify-end h-full">
                <span className="text-[10px] text-gray-500 font-bold mb-1">
                  ₹{day.revenue}
                </span>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[36px] bg-yellow-400 rounded-t-lg hover:bg-yellow-500 transition-all cursor-pointer"
                  title={`${day.date}: ${day.orders} orders (₹${day.revenue})`}
                ></div>
                <span className="text-[10px] sm:text-xs font-semibold text-gray-700 mt-2 truncate w-full">
                  {day.label}
                </span>
                <span className="text-[9px] text-gray-400 font-medium">
                  {day.orders} ord
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders and Activity Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Recent Orders */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-gray-900">Recent Customer Orders</h2>
            <Link to="/admin/orders" className="text-xs font-bold text-yellow-600 hover:underline">
              View All ➔
            </Link>
          </div>

          {recentOrders?.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No orders recorded yet.</p>
          ) : (
            <div className="divide-y overflow-x-auto">
              {recentOrders?.map((ord) => (
                <div key={ord.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <Link
                      to={`/admin/orders/${ord.id}`}
                      className="font-bold text-gray-900 hover:text-yellow-600 block"
                    >
                      {ord.orderNumber}
                    </Link>
                    <p className="text-gray-500">
                      {ord.customerName} ({ord.customerMobile}) • {ord.items?.length} items
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-gray-900 text-sm block">₹{ord.grandTotal}</span>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                      {ord.orderStatus?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Audit Log Feed */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-gray-900">System Activity Audit Log</h2>
            <Link to="/admin/audit-logs" className="text-xs font-bold text-yellow-600 hover:underline">
              Full Log ➔
            </Link>
          </div>

          {recentAuditLogs?.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No audit logs recorded yet.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {recentAuditLogs?.map((log) => (
                <div key={log.id} className="p-2.5 bg-gray-50 rounded-lg text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-gray-900">{log.action?.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Target: {log.entityName} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                  </p>
                  <span className="text-[10px] text-gray-400">by {log.user?.name || 'System Admin'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
