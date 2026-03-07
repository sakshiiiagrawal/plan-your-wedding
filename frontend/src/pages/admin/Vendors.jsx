import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HiOutlinePhone, HiOutlineMail, HiOutlineStar, HiOutlineCurrencyRupee } from 'react-icons/hi';
import { useVendors, useVendorCategories } from '../../hooks/useApi';

export default function Vendors() {
  const { canEdit } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch data from API
  const { data: vendors, isLoading: loadingVendors } = useVendors(selectedCategory);
  const { data: categoryList, isLoading: loadingCategories } = useVendorCategories();

  // Prepare categories with "All" option
  const categories = useMemo(() => {
    if (!categoryList) return [{ value: 'all', label: 'All' }];
    return [
      { value: 'all', label: 'All' },
      ...categoryList
    ];
  }, [categoryList]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate vendor payment info
  const getVendorPaymentInfo = (vendor) => {
    const payments = vendor.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalCost = parseFloat(vendor.total_cost || 0);
    return {
      totalCost,
      paid: totalPaid,
      due: totalCost - totalPaid
    };
  };

  // Get vendor events
  const getVendorEvents = (vendor) => {
    if (!vendor.vendor_event_assignments || vendor.vendor_event_assignments.length === 0) {
      return [];
    }
    return vendor.vendor_event_assignments
      .map(assignment => assignment.events?.name)
      .filter(Boolean);
  };

  if (loadingVendors || loadingCategories) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Vendors</h1>
        {canEdit && <button onClick={() => setShowAddModal(true)} className="btn-primary">Add Vendor</button>}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedCategory === cat.value
                ? 'bg-maroon-800 text-white'
                : 'bg-white text-gray-600 hover:bg-gold-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Vendor Cards */}
      {vendors && vendors.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => {
            const paymentInfo = getVendorPaymentInfo(vendor);
            const events = getVendorEvents(vendor);

            return (
              <div key={vendor.id} className="card-hover">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-maroon-800">{vendor.name}</h3>
                    <p className="text-sm text-gold-600">
                      {vendor.category?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </p>
                  </div>
                  {vendor.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <HiOutlineStar className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{vendor.rating}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {vendor.contact_person && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium">Contact:</span>
                      <span>{vendor.contact_person}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <HiOutlinePhone className="w-4 h-4" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <HiOutlineMail className="w-4 h-4" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                </div>

                {paymentInfo.totalCost > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Total Cost:</span>
                      <span className="font-medium">{formatCurrency(paymentInfo.totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Paid:</span>
                      <span className="font-medium text-green-600">{formatCurrency(paymentInfo.paid)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Due:</span>
                      <span className="font-medium text-red-600">{formatCurrency(paymentInfo.due)}</span>
                    </div>
                  </div>
                )}

                {events.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {events.map((event, idx) => (
                      <span key={idx} className="text-xs bg-gold-100 text-gold-700 px-2 py-1 rounded">
                        {event}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gold-100 flex justify-between items-center">
                  <span className={vendor.is_confirmed ? 'badge-success' : 'badge-warning'}>
                    {vendor.is_confirmed ? 'Confirmed' : 'Pending'}
                  </span>
                  <div className="flex gap-2">
                    <button className="text-sm text-gold-600 hover:underline">Details</button>
                    {canEdit && <button className="text-sm text-maroon-800 hover:underline">Pay</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-500">No vendors found.</p>
          {canEdit && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary mt-4">
              Add Your First Vendor
            </button>
          )}
        </div>
      )}
    </div>
  );
}
