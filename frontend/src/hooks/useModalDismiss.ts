import { useEffect } from 'react';

// Ref-count concurrently-open modals so stacked modals don't fight over body
// scroll: the lock is applied when the first modal opens and released only when
// the last one closes, using the overflow value captured before any lock.
let lockCount = 0;
let prevOverflow = '';

/**
 * Shared dismiss behavior for modals: closes on Escape and locks body scroll
 * while open. Call from the component that owns the modal's open state.
 */
export function useModalDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Let open popovers/dropdowns (e.g. address autocomplete) consume
      // Escape first — they call stopPropagation or preventDefault.
      if (e.defaultPrevented) return;
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    if (lockCount === 0) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [open, onClose]);
}
