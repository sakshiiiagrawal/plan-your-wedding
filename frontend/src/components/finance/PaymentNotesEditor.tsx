import { useState } from 'react';
import { HiOutlinePencil, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useUpdateExpensePayment } from '../../hooks/useApi';

export default function PaymentNotesEditor({
  paymentId,
  notes,
}: {
  paymentId: string;
  notes: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? '');
  const [displayNotes, setDisplayNotes] = useState(notes ?? null);

  const updatePayment = useUpdateExpensePayment();

  const handleSave = async () => {
    const nextNotes = draft.trim() || null;
    try {
      await updatePayment.mutateAsync({ paymentId, notes: nextNotes });
      setDisplayNotes(nextNotes);
      setIsEditing(false);
    } catch {
      toast.error('Failed to save note.');
    }
  };

  const handleCancel = () => {
    setDraft(displayNotes ?? '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="input"
          style={{ minHeight: 56, fontSize: 12 }}
          placeholder="Optional note"
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={updatePayment.isPending}
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: 11, opacity: updatePayment.isPending ? 0.5 : 1 }}
          >
            <HiOutlineCheck style={{ width: 12, height: 12 }} /> Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={updatePayment.isPending}
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: 11 }}
          >
            <HiOutlineX style={{ width: 12, height: 12 }} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(displayNotes ?? '');
        setIsEditing(true);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: displayNotes ? 'var(--ink-dim)' : 'var(--ink-low)',
        background: 'transparent',
        cursor: 'pointer',
        padding: 0,
        textAlign: 'left',
        marginTop: 2,
      }}
    >
      <HiOutlinePencil style={{ width: 11, height: 11, flexShrink: 0 }} />
      {displayNotes || 'Add a note'}
    </button>
  );
}
