import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateViewPref } from './useApi';

const STORAGE_PREFIX = 'viewPref:';

function readLocal<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw !== null ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full/unavailable (private mode) — in-memory state still works this session
  }
}

/**
 * Remembers the last-used view/tab for a page (list vs kanban, active budget
 * tab, desktop vs mobile preview, ...) across visits and devices.
 *
 * localStorage gives an instant, flicker-free value on first paint; the
 * account-level value from /auth/me (already loaded by AuthContext at login)
 * reconciles it once, so a second device picks up the same choice. Writes go
 * to both, debounced, via the shared users.view_prefs column.
 */
export function useViewPreference<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const { user, patchViewPref } = useAuth();
  const updateViewPref = useUpdateViewPref();

  const [value, setValue] = useState<T>(() => readLocal<T>(key) ?? defaultValue);

  // Reconcile with the server value once, the first time it becomes
  // available — a later prop change (e.g. this same key edited from another
  // open tab) must not stomp on what the user just picked here.
  const reconciled = useRef(false);
  useEffect(() => {
    if (reconciled.current) return;
    const serverValue = user?.viewPrefs?.[key] as T | undefined;
    if (serverValue !== undefined) {
      reconciled.current = true;
      setValue(serverValue);
      writeLocal(key, serverValue);
    }
  }, [user, key]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const setPreference = useCallback(
    (next: T) => {
      setValue(next);
      writeLocal(key, next);
      patchViewPref(key, next);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateViewPref.mutate({ key, value: next });
      }, 400);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, patchViewPref],
  );

  return [value, setPreference];
}
