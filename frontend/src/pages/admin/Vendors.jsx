import { useState } from 'react';
import { HiOutlinePhone, HiOutlineMail, HiOutlineStar, HiOutlineCurrencyRupee } from 'react-icons/hi';

const categories = [
  'All', 'Caterer', 'Decorator', 'Photographer', 'Videographer', 'Mehendi Artist',
  'Makeup Artist', 'DJ', 'Band', 'Florist', 'Pandit', 'Tent House', 'Lighting'
];

const mockVendors = [
  {
    id: 1,
    name: 'Sharma Caterers',
    category: 'Caterer',
    contact_person: 'Ramesh Sharma',
    phone: '9876543210',
    email: 'sharma.caterers@gmail.com',
    rating: 4.5,
    total_cost: 1200000,
    paid: 800000,
    is_confirmed: true,
    events: ['Mehendi', 'Haldi', 'Sangeet', 'Wedding']
  },
  {
    id: 2,
    name: 'Flower Power Decorators',
    category: 'Decorator',
    contact_person: 'Anjali Gupta',
    phone: '9876543211',
    email: 'flowerpower@gmail.com',
    rating: 4.8,
    total_cost: 450000,
    paid: 200000,
    is_confirmed: true,
    events: ['All Events']
  },
  {
    id: 3,
    name: 'Capture Dreams Photography',
    category: 'Photographer',
    contact_person: 'Vikram Singh',
    phone: '9876543212',
    email: 'capturedreams@gmail.com',
    rating: 4.9,
    total_cost: 350000,
    paid: 175000,
    is_confirmed: true,
    events: ['All Events']
  },
  {
    id: 4,
    name: 'Ritu Mehendi Art',
    category: 'Mehendi Artist',
    contact_person: 'Ritu Verma',
    phone: '9876543213',
    email: 'ritumehendi@gmail.com',
    rating: 4.7,
    total_cost: 50000,
    paid: 25000,
    is_confirmed: true,
    events: ['Mehendi']
  },
  {
    id: 5,
    name: 'Glamour Studio',
    category: 'Makeup Artist',
    contact_person: 'Priya Kapoor',
    phone: '9876543214',
    email: 'glamourstudio@gmail.com',
    rating: 4.6,
    total_cost: 80000,
    paid: 40000,
    is_confirmed: true,
    events: ['All Events']
  },
  {
    id: 6,
    name: 'DJ Akash',
    category: 'DJ',
    contact_person: 'Akash Kumar',
    phone: '9876543215',
    email: 'djakash@gmail.com',
    rating: 4.4,
    total_cost: 100000,
    paid: 50000,
    is_confirmed: false,
    events: ['Sangeet', 'Wedding']
  },
];

export default function Vendors() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredVendors = selectedCategory === 'All'
    ? mockVendors
    : mockVendors.filter(v => v.category === selectedCategory);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Vendors</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">Add Vendor</button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-maroon-800 text-white'
                : 'bg-white text-gray-600 hover:bg-gold-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Vendor Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => (
          <div key={vendor.id} className="card-hover">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-maroon-800">{vendor.name}</h3>
                <p className="text-sm text-gold-600">{vendor.category}</p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <HiOutlineStar className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{vendor.rating}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">Contact:</span>
                <span>{vendor.contact_person}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <HiOutlinePhone className="w-4 h-4" />
                <span>{vendor.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <HiOutlineMail className="w-4 h-4" />
                <span className="truncate">{vendor.email}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Total Cost:</span>
                <span className="font-medium">{formatCurrency(vendor.total_cost)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Paid:</span>
                <span className="font-medium text-green-600">{formatCurrency(vendor.paid)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Due:</span>
                <span className="font-medium text-red-600">{formatCurrency(vendor.total_cost - vendor.paid)}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {vendor.events.map((event) => (
                <span key={event} className="text-xs bg-gold-100 text-gold-700 px-2 py-1 rounded">
                  {event}
                </span>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gold-100 flex justify-between items-center">
              <span className={vendor.is_confirmed ? 'badge-success' : 'badge-warning'}>
                {vendor.is_confirmed ? 'Confirmed' : 'Pending'}
              </span>
              <div className="flex gap-2">
                <button className="text-sm text-gold-600 hover:underline">Details</button>
                <button className="text-sm text-maroon-800 hover:underline">Pay</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
