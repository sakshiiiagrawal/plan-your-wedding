import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiOutlineSearch,
  HiOutlinePlus,
  HiOutlineFilter,
  HiOutlineDownload,
  HiOutlineUpload,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
} from 'react-icons/hi';

const mockGuests = [
  { id: 1, first_name: 'Rakesh', last_name: 'Agrawal', side: 'bride', phone: '9876543210', rsvp_status: 'confirmed', meal_preference: 'vegetarian', needs_accommodation: true, relationship: 'Father' },
  { id: 2, first_name: 'Sunita', last_name: 'Agrawal', side: 'bride', phone: '9876543211', rsvp_status: 'confirmed', meal_preference: 'jain', needs_accommodation: true, relationship: 'Mother' },
  { id: 3, first_name: 'Vinod', last_name: 'Dangwal', side: 'groom', phone: '9876543212', rsvp_status: 'confirmed', meal_preference: 'vegetarian', needs_accommodation: false, relationship: 'Uncle' },
  { id: 4, first_name: 'Meera', last_name: 'Dangwal', side: 'groom', phone: '9876543213', rsvp_status: 'confirmed', meal_preference: 'vegetarian', needs_accommodation: false, relationship: 'Mother' },
  { id: 5, first_name: 'Priya', last_name: 'Sharma', side: 'bride', phone: '9876543214', rsvp_status: 'pending', meal_preference: 'vegetarian', needs_accommodation: true, relationship: 'Cousin' },
  { id: 6, first_name: 'Amit', last_name: 'Kumar', side: 'groom', phone: '9876543215', rsvp_status: 'pending', meal_preference: 'non_vegetarian', needs_accommodation: false, relationship: 'Friend' },
  { id: 7, first_name: 'Neha', last_name: 'Gupta', side: 'bride', phone: '9876543216', rsvp_status: 'declined', meal_preference: 'vegetarian', needs_accommodation: false, relationship: 'Colleague' },
  { id: 8, first_name: 'Rahul', last_name: 'Verma', side: 'groom', phone: '9876543217', rsvp_status: 'confirmed', meal_preference: 'vegan', needs_accommodation: true, relationship: 'Best Friend' },
];

const stats = {
  total: 245,
  bride: 120,
  groom: 125,
  confirmed: 180,
  pending: 55,
  declined: 10
};

export default function Guests() {
  const { canEdit } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sideFilter, setSideFilter] = useState('all');
  const [rsvpFilter, setRsvpFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredGuests = mockGuests.filter(guest => {
    const matchesSearch = `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSide = sideFilter === 'all' || guest.side === sideFilter;
    const matchesRsvp = rsvpFilter === 'all' || guest.rsvp_status === rsvpFilter;
    return matchesSearch && matchesSide && matchesRsvp;
  });

  const getRsvpBadge = (status) => {
    const badges = {
      confirmed: 'badge-success',
      pending: 'badge-warning',
      declined: 'badge-danger',
      tentative: 'badge-info'
    };
    return badges[status] || 'badge-info';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">Guest Management</h1>
        <div className="flex gap-2">
          <button className="btn-outline flex items-center gap-2">
            <HiOutlineDownload className="w-4 h-4" />
            Export
          </button>
          {canEdit && (
            <>
              <button className="btn-outline flex items-center gap-2">
                <HiOutlineUpload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <HiOutlinePlus className="w-4 h-4" />
                Add Guest
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-maroon-800">{stats.total}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-pink-600">{stats.bride}</div>
          <div className="text-sm text-gray-500">Bride Side</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.groom}</div>
          <div className="text-sm text-gray-500">Groom Side</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          <div className="text-sm text-gray-500">Confirmed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
          <div className="text-sm text-gray-500">Declined</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="all">All Sides</option>
            <option value="bride">Bride Side</option>
            <option value="groom">Groom Side</option>
          </select>
          <select
            value={rsvpFilter}
            onChange={(e) => setRsvpFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="all">All RSVP</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      {/* Guest Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Side</th>
                <th className="text-left p-4">Phone</th>
                <th className="text-left p-4">RSVP</th>
                <th className="text-left p-4">Diet</th>
                <th className="text-left p-4">Accommodation</th>
                {canEdit && <th className="text-left p-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="table-row">
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-gray-800">
                        {guest.first_name} {guest.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{guest.relationship}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={guest.side === 'bride' ? 'badge-bride' : 'badge-groom'}>
                      {guest.side === 'bride' ? 'Bride' : 'Groom'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{guest.phone}</td>
                  <td className="p-4">
                    <span className={getRsvpBadge(guest.rsvp_status)}>
                      {guest.rsvp_status.charAt(0).toUpperCase() + guest.rsvp_status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600 capitalize">
                    {guest.meal_preference.replace('_', ' ')}
                  </td>
                  <td className="p-4">
                    {guest.needs_accommodation ? (
                      <span className="badge-info">Needed</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gold-50 rounded-lg text-gold-600">
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Guest Modal */}
      {canEdit && showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">Add New Guest</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input type="text" className="input" placeholder="First name" />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input type="text" className="input" placeholder="Last name" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" className="input" placeholder="Phone number" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="Email address" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Side *</label>
                  <select className="input">
                    <option value="bride">Bride Side</option>
                    <option value="groom">Groom Side</option>
                  </select>
                </div>
                <div>
                  <label className="label">Relationship</label>
                  <input type="text" className="input" placeholder="e.g., Uncle, Cousin" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Meal Preference</label>
                  <select className="input">
                    <option value="vegetarian">Vegetarian</option>
                    <option value="jain">Jain</option>
                    <option value="vegan">Vegan</option>
                    <option value="non_vegetarian">Non-Vegetarian</option>
                  </select>
                </div>
                <div>
                  <label className="label">Dietary Restrictions</label>
                  <input type="text" className="input" placeholder="e.g., No onion-garlic" />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 text-maroon-800" />
                  <span className="text-sm">Needs Accommodation</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 text-maroon-800" />
                  <span className="text-sm">Needs Pickup</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 text-maroon-800" />
                  <span className="text-sm">VIP Guest</span>
                </label>
              </div>

              <div>
                <label className="label">Events Attending</label>
                <div className="flex flex-wrap gap-3">
                  {['Mehendi', 'Haldi', 'Sangeet', 'Wedding'].map((event) => (
                    <label key={event} className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-maroon-800" />
                      <span className="text-sm">{event}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={3} placeholder="Any special notes..." />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gold-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button className="btn-primary flex-1">
                Add Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
