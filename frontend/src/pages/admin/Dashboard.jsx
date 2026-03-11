import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  useDashboardStats,
  useDashboardSummary,
  useCountdown,
  useHeroContent,
  useBudgetOverview,
} from '../../hooks/useApi';
import {
  HiOutlineUserGroup,
  HiOutlineCurrencyRupee,
  HiOutlineClipboardList,
  HiOutlineCalendar,
  HiOutlinePlus,
} from 'react-icons/hi';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function Dashboard() {
  const { slug } = useParams();
  const { canEdit, canViewFinance } = useAuth();
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // API hooks
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: countdownData } = useCountdown();
  const { data: heroContent } = useHeroContent(slug);
  const { data: budgetOverview } = useBudgetOverview();

  // Get names from hero content or use defaults
  const brideName = heroContent?.bride_name || 'Bride';
  const groomName = heroContent?.groom_name || 'Groom';
  const weddingDateStr = heroContent?.wedding_date || countdownData?.weddingDate;

  useEffect(() => {
    if (!weddingDateStr) return;

    const weddingDate = new Date(weddingDateStr);
    const timer = setInterval(() => {
      const now = new Date();
      const diff = weddingDate - now;

      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [weddingDateStr]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare RSVP data for pie chart
  const rsvpData = stats ? [
    { name: 'Confirmed', value: stats.rsvp?.confirmed || 0, color: '#22c55e' },
    { name: 'Pending', value: stats.rsvp?.pending || 0, color: '#eab308' },
  ] : [];

  // Prepare budget data for bar chart
  const budgetData = budgetOverview || [];

  // Events from summary
  const events = summary?.events || [];

  // Loading state
  if (statsLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Countdown Section */}
      <div className="bg-gradient-wedding rounded-2xl p-8 text-white shadow-lg">
        <div className="text-center">
          <h2 className="font-script text-4xl mb-2">{brideName} & {groomName}</h2>
          <p className="text-gold-300 mb-6">{weddingDateStr ? new Date(weddingDateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Wedding Date'}</p>

          <div className="flex justify-center gap-4 md:gap-8">
            {[
              { value: countdown.days, label: 'Days' },
              { value: countdown.hours, label: 'Hours' },
              { value: countdown.minutes, label: 'Minutes' },
              { value: countdown.seconds, label: 'Seconds' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur rounded-xl p-4 min-w-[80px]">
                <div className="text-3xl md:text-4xl font-bold">{item.value}</div>
                <div className="text-sm text-gold-300">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <HiOutlineUserGroup className="w-8 h-8 text-gold-500 mb-2" />
          <div className="stat-value">{stats?.guests?.total || 0}</div>
          <div className="stat-label">Total Guests</div>
          <div className="text-xs text-gray-400 mt-1">
            <span className="text-pink-500">{stats?.guests?.bride || 0} Bride</span>
            {' • '}
            <span className="text-blue-500">{stats?.guests?.groom || 0} Groom</span>
          </div>
        </div>

        {canViewFinance && (
          <div className="stat-card">
            <HiOutlineCurrencyRupee className="w-8 h-8 text-gold-500 mb-2" />
            <div className="stat-value">{formatCurrency(stats?.budget?.spent || 0)}</div>
            <div className="stat-label">Spent</div>
            <div className="text-xs text-gray-400 mt-1">
              of {formatCurrency(stats?.budget?.total || 0)}
            </div>
          </div>
        )}

        <div className="stat-card">
          <HiOutlineClipboardList className="w-8 h-8 text-gold-500 mb-2" />
          <div className="stat-value">{stats?.tasks?.pending || 0}</div>
          <div className="stat-label">Pending Tasks</div>
          <div className="text-xs text-gray-400 mt-1">
            {stats?.tasks?.completed || 0} completed
          </div>
        </div>

        <div className="stat-card">
          <HiOutlineCalendar className="w-8 h-8 text-gold-500 mb-2" />
          <div className="stat-value">{events.length}</div>
          <div className="stat-label">Events</div>
          <div className="text-xs text-gray-400 mt-1">
            {events.length > 0 ? `${Math.ceil((new Date(events[events.length - 1]?.event_date) - new Date(events[0]?.event_date)) / (1000 * 60 * 60 * 24)) + 1} days of celebration` : 'No events'}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Add Guest', path: `/${slug}/admin/guests`, icon: HiOutlineUserGroup, requiresEdit: true },
          { label: 'Add Expense', path: `/${slug}/admin/budget`, icon: HiOutlineCurrencyRupee, requiresEdit: true, requiresFinance: true },
          { label: 'Add Task', path: `/${slug}/admin/tasks`, icon: HiOutlineClipboardList, requiresEdit: true },
          { label: 'View Events', path: `/${slug}/admin/events`, icon: HiOutlineCalendar },
        ]
          .filter(action => {
            if (action.requiresEdit && !canEdit) return false;
            if (action.requiresFinance && !canViewFinance) return false;
            return true;
          })
          .map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className="card-hover flex items-center gap-3 p-4"
            >
              <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                <action.icon className="w-5 h-5 text-gold-600" />
              </div>
              <span className="font-medium text-gray-700">{action.label}</span>
            </Link>
          ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* RSVP Summary */}
        <div className="card">
          <h3 className="section-title mb-4">RSVP Summary</h3>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rsvpData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {rsvpData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {rsvpData.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.name}</span>
                  <span className="font-bold text-maroon-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Budget Overview */}
        {canViewFinance && (
          <div className="card">
            <h3 className="section-title mb-4">Budget Overview</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={budgetData} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `₹${v / 100000}L`} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="allocated" fill="#D4AF37" name="Allocated" />
                <Bar dataKey="spent" fill="#8B0000" name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Events Timeline */}
      <div className="card">
        <h3 className="section-title mb-4">Events Timeline</h3>
        <div className="space-y-4">
          {events.map((event, index) => {
            const colorPalette = typeof event.color_palette === 'string'
              ? JSON.parse(event.color_palette)
              : (event.color_palette || {});
            const eventColor = colorPalette.primary || '#8B0000';
            return (
              <div
                key={event.id || index}
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-gold-50 transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: eventColor }}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-maroon-800">{event.name}</h4>
                  <p className="text-sm text-gray-500">
                    {new Date(event.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {event.start_time?.slice(0, 5)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="badge bg-gold-100 text-gold-700">{event.theme || 'Theme'}</span>
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <p className="text-gray-500 text-center py-4">No events found</p>
          )}
        </div>
      </div>
    </div>
  );
}
