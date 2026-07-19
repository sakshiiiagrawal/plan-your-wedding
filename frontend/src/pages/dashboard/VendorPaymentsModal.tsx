import Portal from '../../components/Portal';
import PaymentTimelinePanel from '../../components/finance/PaymentTimelinePanel';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { formatCurrency } from '../../utils/currency';
import {
  useCreateSourcePayment,
  useDeleteSourcePayment,
  useSourcePayments,
  useUpdateExpensePayment,
} from '../../hooks/useApi';
import type { PaymentAllocationRow } from '@wedding-planner/shared';
import { HiOutlineX } from 'react-icons/hi';

interface SourcePaymentModalProps {
  source: {
    id: string;
    name: string;
    type: 'vendor' | 'venue';
    expense_id: string | null;
    finance_summary?: {
      planned_amount?: number;
      committed_amount: number;
      paid_amount: number;
      outstanding_amount: number;
    } | null;
    finance?: {
      items?: Array<{
        id: string;
        description: string;
        amount: number;
        side: 'bride' | 'groom' | 'shared';
        bride_share_percentage: number | null;
      }>;
      allocations?: PaymentAllocationRow[];
    } | null;
  };
  onClose: () => void;
}

function getDefaultPaymentSplit(source: SourcePaymentModalProps['source']) {
  const firstItem = source.finance?.items?.[0];
  return {
    side: firstItem?.side ?? 'shared',
    bridePercentage: firstItem?.bride_share_percentage ?? 50,
  };
}

export default function VendorPaymentsModal({ source, onClose }: SourcePaymentModalProps) {
  const { data: payments = [] } = useSourcePayments(source.type, source.id);
  const createPayment = useCreateSourcePayment(source.type);
  const deletePayment = useDeleteSourcePayment(source.type);
  const updatePayment = useUpdateExpensePayment();

  const planned = source.finance_summary?.planned_amount ?? 0;
  const committed = source.finance_summary?.committed_amount ?? 0;
  const paid = source.finance_summary?.paid_amount ?? 0;
  const outstanding = source.finance_summary?.outstanding_amount ?? 0;

  useModalDismiss(true, onClose);

  return (
    <>
      <Portal>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
          onClick={onClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-panel)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: 672,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--line-soft)',
              }}
            >
              <div>
                <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>
                  Payments
                </div>
                <h2
                  className="display"
                  style={{ margin: '0 0 6px', fontSize: 20, color: 'var(--ink-high)' }}
                >
                  {source.name}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12 }}>
                  {planned > 0 && (
                    <span style={{ color: 'var(--ink-low)' }}>
                      Planned:{' '}
                      <strong style={{ color: 'var(--ink-mid)' }}>{formatCurrency(planned)}</strong>
                    </span>
                  )}
                  <span style={{ color: 'var(--ink-low)' }}>
                    Allocated:{' '}
                    <strong style={{ color: 'var(--ink-mid)' }}>{formatCurrency(committed)}</strong>
                  </span>
                  <span style={{ color: 'var(--ok)' }}>
                    Paid: <strong>{formatCurrency(paid)}</strong>
                  </span>
                  <span style={{ color: 'var(--warn)' }}>
                    Outstanding: <strong>{formatCurrency(outstanding)}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  color: 'var(--ink-dim)',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <HiOutlineX style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                padding: 24,
              }}
            >
              {!source.expense_id && (
                <div
                  style={{
                    display: 'inline-flex',
                    fontSize: 11,
                    color: 'var(--warn)',
                    background: 'rgba(217,119,6,0.08)',
                    border: '1px solid rgba(217,119,6,0.2)',
                    borderRadius: 100,
                    padding: '3px 10px',
                    marginBottom: 14,
                  }}
                >
                  No obligation linked yet
                </div>
              )}
              <PaymentTimelinePanel
                payments={payments}
                committed={committed}
                paid={paid}
                outstanding={outstanding}
                onCreate={(payload) => createPayment.mutateAsync({ sourceId: source.id, ...payload })}
                onDelete={(paymentId) => deletePayment.mutateAsync({ sourceId: source.id, paymentId })}
                onUpdate={(paymentId, payload) =>
                  updatePayment.mutateAsync({ paymentId, ...payload })
                }
                isUpdating={updatePayment.isPending}
                items={source.finance?.items}
                allocations={source.finance?.allocations}
                isCreating={createPayment.isPending}
                isDeleting={deletePayment.isPending}
                defaultSplit={getDefaultPaymentSplit(source)}
                canSeeSplits
                canRecordPayment={!!source.expense_id}
                disabledReason="Add the obligation amount first before recording payments."
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: '16px 24px',
                borderTop: '1px solid var(--line-soft)',
                justifyContent: 'flex-end',
              }}
            >
              <button type="button" onClick={onClose} className="btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      </Portal>
    </>
  );
}
