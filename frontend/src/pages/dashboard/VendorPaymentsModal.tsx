/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { HiOutlineX, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';
import { useVendorPayments, useAddVendorPayment, useDeleteVendorPayment } from '../../hooks/useApi';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cheque: 'Cheque',
  credit_card: 'Credit Card',
};

const TODAY = new Date().toISOString().slice(0, 10);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

interface PendingRow {
  _id: string;
  amount: string;
  payment_date: string;
  payment_method: string;
  notes: string;
}

const newRow = (): PendingRow => ({
  _id: Math.random().toString(36).slice(2),
  amount: '',
  payment_date: TODAY,
  payment_method: 'cash',
  notes: '',
});

interface VendorPaymentsModalProps {
  vendor: any;
  onClose: () => void;
}

export default function VendorPaymentsModal({ vendor, onClose }: VendorPaymentsModalProps) {
  const [rows, setRows] = useState<PendingRow[]>([newRow()]);

  const { data: payments = [] } = useVendorPayments(vendor.id);
  const addMutation = useAddVendorPayment();
  const deleteMutation = useDeleteVendorPayment();

  const actualPayments = (payments as any[]).filter((p) => !p.is_planned);
  const totalCost = parseFloat(vendor.total_cost || 0);
  const totalPaid = actualPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const outstanding = totalCost - totalPaid;

  const updateRow = (id: string, patch: Partial<PendingRow>) =>
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r._id !== id) : prev));

  const handleSave = async () => {
    const valid = rows.filter((r) => r.amount && parseFloat(r.amount) > 0 && r.payment_date);
    if (valid.length === 0) {
      toast.error('Enter at least one payment with amount and date');
      return;
    }
    try {
      await Promise.all(
        valid.map((r) =>
          addMutation.mutateAsync({
            vendorId: vendor.id,
            amount: parseFloat(r.amount),
            payment_date: r.payment_date,
            payment_method: r.payment_method,
            notes: r.notes || null,
            is_planned: r.payment_date > TODAY,
          }),
        ),
      );
      const planned = valid.filter((r) => r.payment_date > TODAY).length;
      const actual = valid.length - planned;
      const parts = [];
      if (actual > 0) parts.push(`${actual} payment${actual > 1 ? 's' : ''} recorded`);
      if (planned > 0) parts.push(`${planned} planned`);
      toast.success(parts.join(', ') + '!');
      onClose();
    } catch {
      toast.error('Failed to save payments');
    }
  };

  const handleDelete = async (paymentId: string) => {
    try {
      await deleteMutation.mutateAsync({ vendorId: vendor.id, paymentId });
      toast.success('Payment deleted');
    } catch {
      toast.error('Failed to delete payment');
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gold-200">
            <div>
              <h2 className="text-xl font-display font-bold text-maroon-800">{vendor.name}</h2>
              {totalCost > 0 && (
                <div className="flex gap-4 text-sm mt-0.5">
                  <span className="text-green-700">Paid: {formatCurrency(totalPaid)}</span>
                  {outstanding > 0 && (
                    <span className="text-red-600">Outstanding: {formatCurrency(outstanding)}</span>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-5">

            {/* Existing payments */}
            {(payments as any[]).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Recorded Payments
                </p>
                {(payments as any[]).map((p: any) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      p.is_planned ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {p.is_planned && <span className="text-amber-500 text-xs">📅</span>}
                      <span className={`font-medium ${p.is_planned ? 'text-amber-800' : 'text-maroon-800'}`}>
                        {formatCurrency(parseFloat(p.amount))}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(p.payment_date).toLocaleDateString('en-IN')}
                        {!p.is_planned && ` · ${PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}`}
                        {p.notes && ` · ${p.notes}`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1 hover:bg-red-50 rounded text-red-400 disabled:opacity-50"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New payment rows */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Add Payments
              </p>

              {rows.map((row, idx) => (
                <div key={row._id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4 shrink-0">{idx + 1}.</span>
                    <input
                      type="number"
                      min="1"
                      value={row.amount}
                      onChange={(e) => updateRow(row._id, { amount: e.target.value })}
                      className="input py-1.5 text-sm w-28 shrink-0"
                      placeholder="Amount"
                    />
                    <input
                      type="date"
                      value={row.payment_date}
                      onChange={(e) => updateRow(row._id, { payment_date: e.target.value })}
                      className="input py-1.5 text-sm flex-1 min-w-0"
                    />
                    <select
                      value={row.payment_method}
                      onChange={(e) => updateRow(row._id, { payment_method: e.target.value })}
                      className="input py-1.5 text-sm w-28 shrink-0"
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeRow(row._id)}
                      className="p-1 hover:bg-red-50 rounded text-red-400 shrink-0"
                    >
                      <HiOutlineX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {row.payment_date > TODAY && (
                    <div className="ml-6">
                      <span className="text-xs text-amber-600 font-medium">📅 This will be saved as a planned payment</span>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, newRow()])}
                className="flex items-center gap-1 text-sm text-maroon-700 hover:text-maroon-900 font-medium mt-1"
              >
                <HiOutlinePlus className="w-4 h-4" />
                Add another
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gold-200">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={addMutation.isPending}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {addMutation.isPending ? 'Saving...' : 'Save Payments'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
