import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';

/**
 * Runs before the browser print dialog opens. Pages use it to swap the screen
 * view into a printable one — most importantly to load rows that pagination
 * hides, since printing renders the live DOM and would otherwise silently
 * produce a truncated document. Resolve only once the printable state has
 * been committed; the dialog opens the moment this settles.
 *
 * May return a teardown function, which runs once the dialog closes. Prefer it
 * over an 'afterprint' listener: window.print() blocks until dismissed, so this
 * fires even in browsers that skip the event, and a page left in its expanded
 * print state is a visible bug (a paginated list showing every row).
 */
type PrepareFn = () => Promise<(() => void) | void> | ((() => void) | void);

interface PrintStore {
  register: (fn: PrepareFn | null) => void;
  run: () => Promise<(() => void) | void>;
}

/**
 * Deliberately a ref-backed store rather than React state, for the same reason
 * PageHeaderContext is (see the note there): pages register a fresh closure on
 * every render, so holding it in provider state would re-render the layout,
 * which re-renders the page, which re-registers. Nothing subscribes to this
 * store reactively — the topbar only reads it inside a click handler — so
 * registration never triggers a render at all.
 */
const PrintContext = createContext<PrintStore | null>(null);

export function PrintProvider({ children }: { children: ReactNode }) {
  const prepareRef = useRef<PrepareFn | null>(null);
  const storeRef = useRef<PrintStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = {
      register: (fn) => {
        prepareRef.current = fn;
      },
      run: async () => await prepareRef.current?.(),
    };
  }

  return <PrintContext.Provider value={storeRef.current}>{children}</PrintContext.Provider>;
}

function usePrintStore(hookName: string): PrintStore {
  const store = useContext(PrintContext);
  if (!store) throw new Error(`${hookName} must be used within PrintProvider`);
  return store;
}

/**
 * Pages that hide rows behind pagination register their loader here. Re-registers
 * every render (the closure captures current filter state), clears on unmount so
 * the next page doesn't inherit a stale preparer.
 */
export function usePrintPrepare(prepare: PrepareFn) {
  const store = usePrintStore('usePrintPrepare');

  // Dependency-free on purpose: `prepare` is a fresh closure each render and
  // must stay current. Safe because registration renders nothing.
  useEffect(() => {
    store.register(prepare);
  });

  useEffect(() => {
    return () => store.register(null);
  }, [store]);
}

/**
 * Returns the topbar's print action: let the active page load its full dataset,
 * then open the dialog. Falls through to a plain print when no page registered.
 */
export function usePrintTrigger() {
  const store = usePrintStore('usePrintTrigger');
  const printingRef = useRef(false);

  return useCallback(async () => {
    if (printingRef.current) return;
    printingRef.current = true;
    let teardown: (() => void) | void = undefined;
    try {
      teardown = await store.run();
      window.print();
    } finally {
      teardown?.();
      printingRef.current = false;
    }
  }, [store]);
}
