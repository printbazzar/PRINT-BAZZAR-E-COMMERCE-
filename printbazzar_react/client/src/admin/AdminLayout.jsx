import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiHome,
  HiOutlineViewGrid,
  HiOutlineShoppingBag,
  HiOutlineCurrencyRupee,
  HiOutlineClipboardList,
  HiOutlinePhotograph,
  HiOutlineCog,
  HiOutlineDocumentReport,
  HiOutlineLogout,
  HiOutlineExternalLink,
  HiOutlineUserGroup,
  HiOutlineSparkles,
  HiOutlineCollection,
  HiOutlineOfficeBuilding,
  HiMenu,
  HiX,
} from 'react-icons/hi';
import logo from '../assets/images/logo_white.png';

export default function AdminLayout() {
  const { adminUser, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading Admin Session...
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/admin/login', { replace: true, state: { from: location } });
    return null;
  }

  const isSuperAdmin =
    adminUser?.role?.toLowerCase().includes('super') ||
    adminUser?.role === 'SUPER_ADMIN' ||
    adminUser?.department === 'ALL';
  const department = adminUser?.department;

  // Auto-redirect floor staff directly to their workstation queue
  React.useEffect(() => {
    if (!loading && isAuthenticated && !isSuperAdmin) {
      if (location.pathname === '/admin' || location.pathname === '/admin/dashboard') {
        navigate('/admin/queue', { replace: true });
      }
    }
  }, [loading, isAuthenticated, isSuperAdmin, location.pathname, navigate]);

  // Department workstation labels
  const deptWorkstationLabels = {
    PRODUCTION: '🖨️ Press Room Station',
    FINISHING_QC: '✂️ Finishing & QC Desk',
    PACKING: '📦 Packaging Desk',
    DELIVERY: '🚚 Logistics & Dispatch',
    DESIGN: '🎨 Prepress & Design Desk',
  };

  // Role-based navigation items
  let navItems = [];
  if (isSuperAdmin) {
    navItems = [
      { label: 'Dashboard', path: '/admin/dashboard', icon: HiOutlineViewGrid },
      { label: 'Factory Staff Queue', path: '/admin/queue', icon: HiOutlineClipboardList },
      { label: 'ERP Workflow (Kanban)', path: '/admin/workflow', icon: HiOutlineClipboardList },
      { label: 'Orders List', path: '/admin/orders', icon: HiOutlineShoppingBag },
      { label: 'Staff & Roles', path: '/admin/staff', icon: HiOutlineUserGroup },
      { label: 'Products CMS', path: '/admin/products', icon: HiOutlineShoppingBag },
      { label: 'Option Masters', path: '/admin/options-master', icon: HiOutlineCollection },
      { label: 'Pricing Master', path: '/admin/pricing', icon: HiOutlineCurrencyRupee },
      { label: 'Design Services', path: '/admin/design-services', icon: HiOutlineSparkles },
      { label: 'Categories', path: '/admin/categories', icon: HiHome },
      { label: 'Banners CMS', path: '/admin/banners', icon: HiOutlinePhotograph },
      { label: 'Store Settings', path: '/admin/settings', icon: HiOutlineCog },
      { label: 'Business & Contact Info', path: '/admin/business-settings', icon: HiOutlineOfficeBuilding },
      { label: 'Footer Management', path: '/admin/footer-settings', icon: HiOutlineCollection },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: HiOutlineDocumentReport },
    ];
  } else {
    const workstationTitle = deptWorkstationLabels[department] || 'Factory Workstation';
    navItems = [
      { label: workstationTitle, path: '/admin/queue', icon: HiOutlineClipboardList },
      { label: 'Orders List', path: '/admin/orders', icon: HiOutlineShoppingBag },
    ];
    if (department === 'DESIGN') {
      navItems.push({ label: 'Design Services Master', path: '/admin/design-services', icon: HiOutlineSparkles });
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="w-64 bg-black text-white flex-shrink-0 hidden md:flex flex-col justify-between p-4 shadow-xl z-20">
        <div>
          <div className="py-3 px-2 border-b border-gray-800 flex items-center justify-between">
            <Link to="/admin/dashboard">
              <img src={logo} alt="Print Bazzar Admin" className="h-9" />
            </Link>
          </div>
          <div className="mt-2 px-2 py-1 bg-yellow-400 text-black text-[10px] font-extrabold uppercase rounded text-center tracking-wider">
            ADMIN CONTROL PANEL
          </div>

          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-yellow-400 text-black shadow-sm'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Store Link */}
        <div className="pt-4 border-t border-gray-800 space-y-2">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span>Live Storefront</span>
            <HiOutlineExternalLink className="w-4 h-4 text-yellow-400" />
          </Link>

          <div className="px-3 py-2 space-y-1">
            <p className="text-xs font-bold text-white truncate">{adminUser?.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{adminUser?.email}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="inline-block text-[10px] bg-gray-800 text-yellow-300 px-2 py-0.5 rounded font-bold">
                {adminUser?.role}
              </span>
              {adminUser?.department && adminUser?.department !== 'ALL' && (
                <span className="inline-block text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded font-bold">
                  {adminUser?.department} DEPT
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/admin/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
          >
            <HiOutlineLogout className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="md:hidden bg-black text-white p-4 flex justify-between items-center z-20">
        <Link to="/admin/dashboard">
          <img src={logo} alt="Print Bazzar Admin" className="h-7" />
        </Link>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 text-white hover:text-yellow-300"
        >
          {mobileSidebarOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Slideout Navigation */}
      {mobileSidebarOpen && (
        <div className="md:hidden bg-black text-white p-4 space-y-2 border-b border-gray-800 z-20">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-yellow-400 text-black' : 'text-gray-300'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
          <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-xs">
            <Link to="/" target="_blank" className="text-yellow-400 font-bold">Live Store ↗</Link>
            <button onClick={logout} className="text-red-400 font-bold">Sign Out</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
