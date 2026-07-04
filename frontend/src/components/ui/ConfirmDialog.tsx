import Portal from '../Portal';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Styled confirm dialog — use instead of window.confirm for destructive actions. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useModalDismiss(open, onCancel);

  if (!open) return null;

  return (
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
        onClick={onCancel}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-panel)',
            borderRadius: 'var(--radius-lg)',
            padding: 28,
            maxWidth: 380,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }}
        >
          <h3
            className="display"
            style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--ink-high)' }}
          >
            {title}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ink-low)', marginBottom: 24 }}>{message}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel} className="btn-outline" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              style={{
                flex: 1,
                padding: '9px 16px',
                background: 'var(--err)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                opacity: isPending ? 0.5 : 1,
              }}
            >
              {isPending ? 'Deleting…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
