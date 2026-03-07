import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineUserGroup,
  HiOutlineCurrencyRupee,
  HiOutlineClipboardList,
  HiOutlineCalendar,
  HiOutlinePlus,
} from 'react-icons/hi';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const WEDDING_DATE = new Date('2026-11-26T07:00:00');

// Mock data for now - will connect to API
const mockStats = {
  guests: { total: 245, bride: 120, groom: 125 },
  rsvp: { confirmed: 180, pending: 65 },
  tasks: { pending: 25, completed: 48 },
  budget: { total: 5000000, spent: 3245000 }
};

const mockEvents = [
  { name: 'Mehendi', date: '2026-11-24', time: '6:00 PM', theme: 'Floral Garden', color: '#228B22' },
  { name: 'Haldi Carnival', date: '2026-11-25', time: '9:00 AM', theme: 'Yellow Carnival', color: '#FFD700' },
  { name: 'Engagement & Sangeet', date: '2026-11-25', time: '6:00 PM', theme: 'Starry Night', color: '#1A237E' },
  { name: 'Wedding', date: '2026-11-26', time: '7:00 AM', theme: 'Royal Indian', color: '#8B0000' },
];

const mockBudgetData = [
  { name: 'Venue', allocated: 1000000, spent: 850000 },
  { name: 'Catering', allocated: 1500000, spent: 1200000 },
  { name: 'Decoration', allocated: 500000, spent: 450000 },
  { name: 'Photography', allocated: 400000, spent: 300000 },
  { name: 'Other', allocated: 1600000, spent: 445000 },
];

const rsvpData = [
  { name: 'Confirmed', value: 180, color: '#22c55e' },
  { name: 'Pending', value: 65, color: '#eab308' },
];

export default function Dashboard() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = WEDDING_DATE - now;

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
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Countdown Section */}
      <div className="bg-gradient-wedding rounded-2xl p-8 text-white shadow-lg">
        <div className="text-center">
          <h2 className="font-script text-4xl mb-2">Sakshi & Ayush</h2>
          <p className="text-gold-300 mb-6">November 26, 2026</p>

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
          <div className="stat-value">{mockStats.guests.total}</div>
          <div className="stat-label">Total Guests</div>
          <div className="text-xs text-gray-400 mt-1">
            <span className="text-pink-500">{mockStats.guests.bride} Bride</span>
            {' • '}
            <span className="text-blue-500">{mockStats.guests.groom} Groom</span>
          </div>
        </div>

        <div className="stat-card">
          <HiOutlineCurrencyRupee className="w-8 h-8 text-gold-500 mb-2" />
          <div className="stat-value">{formatCurrency(mockStats.budget.spent)}</div>
          <div className="stat-label">Spent</div>
          <div className="text-xs text-gray-400 mt-1">
            of {formatCurrency(mockStats.budget.total)}
          </div>
        </div>

        <div className="stat-card">
          <HiOutlineClipboardList className="w-8 h-8 text-gold-500 mb-2" />
          <div className="stat-value">{mockStats.tasks.pending}</div>
          <div className="stat-label">Pending Tasks</div>
          <div className="text-xs text-gray-400 mt-1">
            {mockStats.tasks.completed} completed
          </div>
        </div>

        <div className="stat-card">
          <HiOutlineCalendar className="w-8 h-8 text-gold-500 mb-2" />
          <div className="stat-value">4</div>
          <div className="stat-label">Events</div>
          <div className="text-xs text-gray-400 mt-1">
            3 days of celebration
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Add Guest', path: '/admin/guests', icon: HiOutlineUserGroup },
          { label: 'Add Expense', path: '/admin/budget', icon: HiOutlineCurrencyRupee },
          { label: 'Add Task', path: '/admin/tasks', icon: HiOutlineClipboardList },
          { label: 'View Events', path: '/admin/events', icon: HiOutlineCalendar },
        ].map((action) => (
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
        <div className="card">
          <h3 className="section-title mb-4">Budget Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockBudgetData} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => `₹${v / 100000}L`} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="allocated" fill="#D4AF37" name="Allocated" />
              <Bar dataKey="spent" fill="#8B0000" name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="card">
        <h3 className="section-title mb-4">Events Timeline</h3>
        <div className="space-y-4">
          {mockEvents.map((event, index) => (
            <div
              key={event.name}
              className="flex items-center gap-4 p-4 rounded-lg hover:bg-gold-50 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: event.color }}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-maroon-800">{event.name}</h4>
                <p className="text-sm text-gray-500">{event.date} • {event.time}</p>
              </div>
              <div className="text-right">
                <span className="badge bg-gold-100 text-gold-700">{event.theme}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
