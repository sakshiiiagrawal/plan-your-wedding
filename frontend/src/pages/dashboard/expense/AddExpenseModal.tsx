import { useMemo, useRef, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import { Modal, FormSection, SectionAction, SideToggle } from '../../../components/ui/Modal';
import CategoryCombobox from '../../../components/CategoryCombobox';
import CustomCategoryModal from '../../../components/CustomCategoryModal';
import DatePicker from '../../../components/ui/DatePicker';
import SplitShare from '../../../components/ui/SplitShare';
import InstallmentsEditor, {
  installmentsExceedTotal,
  installmentToPaymentPayload,
  type InstallmentFormRow,
} from '../../../components/finance/InstallmentsEditor';
import useUnsavedChangesPrompt from '../../../hooks/useUnsavedChangesPrompt';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import { formatCurrency } from '../../../utils/currency';
import { todayLocal } from '../../../utils/date';
import { financeTier } from '@wedding-planner/shared';
import { useAuth } from '../../../contexts/AuthContext';

interface AddExpenseModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  isPending: boolean;
}

interface ExpenseItemForm {
  id: string;
  description: string;
  amount: string;
  category_id: string | null;
  side: 'bride' | 'groom' | 'shared';
  bride_share_percentage: number;
}

interface FormData {
  description: string;
  expense_date: string;
  notes: string;
  items: ExpenseItemForm[];
  installments: InstallmentFormRow[];
}

// New items inherit the previous item's side/split so multi-item entry
// doesn't re-ask a question already answered.
const createItem = (prev?: ExpenseItemForm): ExpenseItemForm => ({
  id: Math.random().toString(36).slice(2),
  description: '',
  amount: '',
  category_id: null,
  side: prev?.side ?? 'shared',
  bride_share_percentage: prev?.bride_share_percentage ?? 50,
});

const createInitialForm = (): FormData => ({
  description: '',
  expense_date: todayLocal(),
  notes: '',
  items: [createItem()],
  installments: [],
});

export default function AddExpenseModal({
  show,
  onClose,
  onSubmit,
  isPending,
}: AddExpenseModalProps) {
  const { user } = useAuth();
  const canSeeSplits = financeTier(user) === 'full';
  // Stable baseline for dirty-checking and reset; the item id stays fixed for
  // this mount so an untouched form compares equal.
  const initialFormRef = useRef<FormData>(createInitialForm());
  const [formData, setFormData] = useState<FormData>(initialFormRef.current);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [customCategoryParentId, setCustomCategoryParentId] = useState<string | null>(null);
  const singleItem = formData.items.length === 1;

  const totalCommitted = useMemo(
    () => formData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [formData.items],
  );
  const paymentExceedsTotal = installmentsExceedTotal(formData.installments, totalCommitted);

  const handleClose = () => {
    setFormData(initialFormRef.current);
    onClose();
  };
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormRef.current);
  const { attemptClose, dialog: unsavedDialog } = useUnsavedChangesPrompt({
    isDirty,
    onDiscard: handleClose,
    onSave: () => {
      (document.getElementById('add-expense-form') as HTMLFormElement | null)?.requestSubmit();
    },
    isSaving: isPending,
  });
  useModalDismiss(show, attemptClose);

  const updateItem = (id: string, patch: Partial<ExpenseItemForm>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const removeItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== id) : prev.items,
    }));
  };

  // Amount is what this line item allocates — the single figure the whole app
  // rolls up as "Allocated".
  const renderAmountField = (item: ExpenseItemForm) => (
    <div>
      <label className="label">Amount *</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={item.amount}
        onChange={(event) => updateItem(item.id, { amount: event.target.value })}
        className="input no-spinner"
        placeholder="0"
        required
      />
    </div>
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      description: formData.description,
      expense_date: formData.expense_date,
      notes: formData.notes || null,
      items: formData.items.map((item, index) => ({
        category_id: item.category_id,
        // Single-item expenses don't ask for a separate item description —
        // the expense title is the description.
        description: item.description || formData.description,
        amount: Number(item.amount || 0),
        display_order: index + 1,
        ...(canSeeSplits
          ? {
              side: item.side,
              bride_share_percentage: item.side === 'shared' ? item.bride_share_percentage : null,
            }
          : {}),
      })),
      payments: formData.installments.map((installment) =>
        installmentToPaymentPayload(installment, canSeeSplits),
      ),
    });

    // Only reached on success — onSubmit rethrows on failure, preserving the
    // form (and the unsaved-changes dialog) so nothing is lost.
    const fresh = createInitialForm();
    initialFormRef.current = fresh;
    setFormData(fresh);
  };

  if (!show) return null;

  return (
    <>
      <Modal
        onClose={attemptClose}
        eyebrow="Expenses"
        title="Add expense"
        size="lg"
        footerLeft={
          paymentExceedsTotal ? (
            <span style={{ color: 'var(--err)' }}>
              Installments exceed the allocated total — reduce them to save.
            </span>
          ) : (
            <span>
              Total{' '}
              <strong style={{ color: 'var(--gold-deep)' }}>{formatCurrency(totalCommitted)}</strong>
            </span>
          )
        }
        footer={
          <>
            <button type="button" onClick={attemptClose} className="btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              form="add-expense-form"
              disabled={isPending || paymentExceedsTotal}
              className="btn-primary"
              style={{ minWidth: 150 }}
            >
              {isPending ? 'Saving…' : 'Add expense'}
            </button>
          </>
        }
      >
        <form
          id="add-expense-form"
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Expense Title *</label>
              <input
                type="text"
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, description: event.target.value }))
                }
                className="input"
                placeholder="Photography contract, decor advance, etc."
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Expense Date *</label>
              <DatePicker
                value={formData.expense_date}
                onChange={(v) => setFormData((prev) => ({ ...prev, expense_date: v }))}
                required
                placeholder="Expense date"
              />
            </div>
          </div>

          <FormSection
            title="Line Items"
            hint="Split into multiple items to track categories or sides separately."
            action={
              <SectionAction
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    items: [
                      // Going from one item to several: the first item's hidden
                      // description was the title, so materialize it.
                      ...prev.items.map((item, i) =>
                        i === 0 && prev.items.length === 1 && !item.description
                          ? { ...item, description: prev.description }
                          : item,
                      ),
                      createItem(prev.items[prev.items.length - 1]),
                    ],
                  }))
                }
              >
                <HiOutlinePlus className="w-4 h-4" />
                Add Item
              </SectionAction>
            }
          >
            {formData.items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  borderRadius: 10,
                  border: '1px solid var(--line-soft)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {!singleItem && (
                  <div className="flex items-center justify-between">
                    <h4
                      style={{ margin: 0, fontWeight: 600, color: 'var(--ink-high)', fontSize: 13 }}
                    >
                      Item {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove item ${index + 1}`}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  {/* One item = the title is the description; don't ask twice. */}
                  {!singleItem && (
                    <div>
                      <label className="label">Item Description *</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) =>
                          updateItem(item.id, { description: event.target.value })
                        }
                        className="input"
                        placeholder="Base package, flowers, travel fee"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="label">Category *</label>
                    <CategoryCombobox
                      value={item.category_id}
                      onChange={(id) => updateItem(item.id, { category_id: id })}
                      level="subcategory"
                      placeholder="Search categories…"
                      allowCustom
                      onAddCustom={(parentId) => {
                        setCustomCategoryParentId(parentId);
                        setShowCustomCategoryModal(true);
                      }}
                      required
                    />
                  </div>
                  {singleItem && renderAmountField(item)}
                </div>

                {!singleItem && (
                  <div className="grid sm:grid-cols-2 gap-3">{renderAmountField(item)}</div>
                )}

                {canSeeSplits && (
                  <div>
                    <label className="label">Liability Side</label>
                    <SideToggle
                      value={item.side}
                      onChange={(side) => updateItem(item.id, { side })}
                    />
                  </div>
                )}

                {canSeeSplits && item.side === 'shared' && (
                  <SplitShare
                    total={Number(item.amount) || 0}
                    bridePercentage={item.bride_share_percentage}
                    onChange={(pct) => updateItem(item.id, { bride_share_percentage: pct })}
                  />
                )}
              </div>
            ))}

            <div
              style={{
                background: 'var(--bg-raised)',
                borderRadius: 10,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--line-soft)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ink-low)' }}>
                Total{' '}
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--gold-deep)' }}>
                  {formatCurrency(totalCommitted)}
                </span>
              </span>
            </div>
          </FormSection>

          <InstallmentsEditor
            installments={formData.installments}
            onChange={(installments) => setFormData((prev) => ({ ...prev, installments }))}
            committedTotal={totalCommitted}
            canSeeSplits={canSeeSplits}
          />

          <FormSection title="Notes">
            <textarea
              value={formData.notes}
              onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
              className="input min-h-[72px]"
              placeholder="Optional notes about the obligation"
            />
          </FormSection>
        </form>
      </Modal>
      {unsavedDialog}

      <CustomCategoryModal
        isOpen={showCustomCategoryModal}
        onClose={() => {
          setShowCustomCategoryModal(false);
          setCustomCategoryParentId(null);
        }}
        defaultParentId={customCategoryParentId}
      />
    </>
  );
}
