import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type FilterValue = string | number;
type FilterDefaults = Record<string, FilterValue>;

/**
 * Syncs a flat filter/page state object to the URL, mirroring Guests.tsx's
 * existing tab-persistence pattern: a value equal to its default is omitted
 * from the URL (keeps it clean), writes use `replace` (no back-button spam
 * per keystroke/click).
 *
 * Setting any key other than "page" clears "page" back to its default —
 * every list page gets "filter change resets pagination" for free.
 *
 * `defaults` should be a stable reference (module-level const or useMemo) —
 * a fresh object literal each render still works, just recomputes `values`
 * every render.
 */
export function useUrlFilters<D extends FilterDefaults>(defaults: D) {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const raw = searchParams.get(key);
      if (raw === null) continue;
      const defaultValue = defaults[key];
      (result as Record<string, FilterValue>)[key] =
        typeof defaultValue === 'number' ? Number(raw) || defaultValue : raw;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<D>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === defaults[key] || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      const touchesFilterKey = Object.keys(patch).some((key) => key !== 'page');
      if (touchesFilterKey && 'page' in defaults) next.delete('page');
      setSearchParams(next, { replace: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, setSearchParams],
  );

  return [values, setFilters] as const;
}
