import Portal from './Portal';

interface UnsavedChangesDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscardChanges: () => void;
  onSaveChanges: () => void;
  isSaving?: boolean;
}

export default function UnsavedChangesDialog({
  open,
  onKeepEditing,
  onDiscardChanges,
  onSaveChanges,
  isSaving = false,
}: UnsavedChangesDialogProps) {
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
          zIndex: 80,
          padding: 16,
        }}
        onClick={onKeepEditing}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-panel)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            maxWidth: 420,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }}
        >
          <h3
            className="display"
            style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--ink-high)' }}
          >
            Unsaved changes
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ink-low)', margin: '0 0 20px' }}>
            You have unsaved changes in this modal.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onKeepEditing} className="btn-outline" style={{ flex: 1 }}>
              Keep editing
            </button>
            <button
              type="button"
              onClick={onDiscardChanges}
              className="btn-outline"
              style={{ flex: 1, color: 'var(--err)' }}
            >
              Discard changes
            </button>
            <button
              type="button"
              onClick={onSaveChanges}
              disabled={isSaving}
              className="btn-primary"
              style={{ flex: 1, opacity: isSaving ? 0.5 : 1 }}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
