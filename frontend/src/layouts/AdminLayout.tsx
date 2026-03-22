import { Outlet, NavLink, useNavigate, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHeroContent } from '../hooks/useApi';
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
  HiOutlineLockClosed,
} from 'react-icons/hi';
import { useState } from 'react';

export default function AdminLayout() {
  const { logout, user, isAuthenticated, loading, canViewFinance, isReadOnly, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: heroContent } = useHeroContent(slug);
  const brideName = heroContent?.bride_name || 'Bride';
  const groomName = heroContent?.groom_name || 'Groom';
  const initials = `${brideName.charAt(0)}${groomName.charAt(0)}`;

  const allNavItems = [
    { path: `/${slug}/admin`, label: 'Dashboard', icon: HiOutlineHome, end: true },
    { path: `/${slug}/admin/events`, label: 'Events', icon: HiOutlineCalendar },
    { path: `/${slug}/admin/guests`, label: 'Guests', icon: HiOutlineUserGroup },
    { path: `/${slug}/admin/venues`, label: 'Venues', icon: HiOutlineLocationMarker },
    {
      path: `/${slug}/admin/accommodations`,
      label: 'Accommodations',
      icon: HiOutlineOfficeBuilding,
    },
    { path: `/${slug}/admin/vendors`, label: 'Vendors', icon: HiOutlineBriefcase },
    {
      path: `/${slug}/admin/expense`,
      label: 'Expense',
      icon: HiOutlineCurrencyRupee,
      requiresFinanceAccess: true,
    },
    { path: `/${slug}/admin/tasks`, label: 'Tasks', icon: HiOutlineClipboardList },
    {
      path: `/${slug}/admin/team`,
      label: 'Team Access',
      icon: HiOutlineLockClosed,
      adminOnly: true,
    },
  ];

  const navItems = allNavItems.filter((item) => {
    if (item.requiresFinanceAccess && !canViewFinance) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate(`/${slug}/login`);
  };

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

  if (!isAuthenticated) {
    return <Navigate to={`/${slug}/login`} replace />;
  }

  return (
    <div className="min-h-screen bg-cream flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gold-200 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gold-200">
            <NavLink to={`/${slug}/admin`} className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-maroon-800 to-gold-600 rounded-full flex items-center justify-center">
                <span className="text-white font-script text-xl">{initials}</span>
              </div>
              <div>
                <h1 className="font-display font-bold text-maroon-800">
                  {brideName} & {groomName}
                </h1>
                <p className="text-xs text-gray-500">Wedding Planner</p>
              </div>
            </NavLink>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={!!item.end}
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

          <div className="p-4 border-t border-gold-200">
            <div className="flex items-center gap-3 mb-3 px-4">
              <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
                <span className="text-maroon-800 font-medium text-sm">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            {isReadOnly && (
              <div className="mb-3 mx-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 font-medium text-center">View Only Mode</p>
              </div>
            )}
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

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
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
          <div className="flex items-center gap-4">
            <NavLink
              to={`/${slug}`}
              className="hidden sm:block text-sm text-gold-600 hover:text-gold-700 font-medium"
            >
              View Wedding Website →
            </NavLink>
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gold-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <HiOutlineLogout className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
