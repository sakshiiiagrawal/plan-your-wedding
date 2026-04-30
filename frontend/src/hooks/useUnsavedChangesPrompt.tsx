import { useEffect, useState } from 'react';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';

interface UseUnsavedChangesPromptOptions {
  isDirty: boolean;
  onDiscard: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export default function useUnsavedChangesPrompt({
  isDirty,
  onDiscard,
  onSave,
  isSaving = false,
}: UseUnsavedChangesPromptOptions) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setShowPrompt(false);
    }
  }, [isDirty]);

  const attemptClose = () => {
    if (!isDirty) {
      onDiscard();
      return;
    }
    setShowPrompt(true);
  };

  const dialog = (
    <UnsavedChangesDialog
      open={showPrompt}
      onKeepEditing={() => setShowPrompt(false)}
      onDiscardChanges={() => {
        setShowPrompt(false);
        onDiscard();
      }}
      onSaveChanges={() => {
        setShowPrompt(false);
        onSave();
      }}
      isSaving={isSaving}
    />
  );

  return {
    attemptClose,
    dialog,
  };
}
