import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HiOutlineHome,
  HiOutlineCalendar,
  HiOutlineUserGroup,
  HiOutlineLocationMarker,
  HiOutlineOfficeBuilding,
  HiOutlineBriefcase,
  HiOutlineCurrencyRupee,
  HiOutlineClipboardList,
  HiOutlineLogout,
  HiOutlineMenu,
} from 'react-icons/hi';
import { useState } from 'react';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: HiOutlineHome, end: true },
  { path: '/admin/events', label: 'Events', icon: HiOutlineCalendar },
  { path: '/admin/guests', label: 'Guests', icon: HiOutlineUserGroup },
  { path: '/admin/venues', label: 'Venues', icon: HiOutlineLocationMarker },
  { path: '/admin/accommodations', label: 'Accommodations', icon: HiOutlineOfficeBuilding },
  { path: '/admin/vendors', label: 'Vendors', icon: HiOutlineBriefcase },
  { path: '/admin/budget', label: 'Budget', icon: HiOutlineCurrencyRupee },
  { path: '/admin/tasks', label: 'Tasks', icon: HiOutlineClipboardList },
];

export default function AdminLayout() {
  const { logout, user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold-500 border-t-maroon-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-maroon-800 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gold-200 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gold-200">
            <NavLink to="/admin" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-maroon-800 to-gold-600 rounded-full flex items-center justify-center">
                <span className="text-white font-script text-xl">S&A</span>
              </div>
              <div>
                <h1 className="font-display font-bold text-maroon-800">Sakshi & Ayush</h1>
                <p className="text-xs text-gray-500">Wedding Planner</p>
              </div>
            </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-maroon-800 text-white'
                      : 'text-gray-700 hover:bg-gold-100 hover:text-maroon-800'
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User & Logout */}
          <div className="p-4 border-t border-gold-200">
            <div className="flex items-center gap-3 mb-3 px-4">
              <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
                <span className="text-maroon-800 font-medium text-sm">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <HiOutlineLogout className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-white border-b border-gold-200 px-4 py-3 lg:px-6 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gold-50 rounded-lg"
          >
            <HiOutlineMenu className="w-6 h-6 text-maroon-800" />
          </button>
          <div className="flex-1">
            <h2 className="font-display font-semibold text-maroon-800">Wedding Dashboard</h2>
          </div>
          <NavLink
            to="/"
            className="text-sm text-gold-600 hover:text-gold-700 font-medium"
          >
            View Wedding Website →
          </NavLink>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
