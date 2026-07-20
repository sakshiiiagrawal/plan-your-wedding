import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

interface PageHeaderContent {
  title: string;
  nav?: ReactNode;
  action?: ReactNode;
}

interface HeaderStore {
  get: () => PageHeaderContent | null;
  set: (content: PageHeaderContent | null) => void;
  subscribe: (listener: () => void) => () => void;
}

function createHeaderStore(): HeaderStore {
  let header: PageHeaderContent | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => header,
    set: (content) => {
      header = content;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * The header lives in a subscribable store rather than React state on purpose.
 * Pages re-register on every render (nav/action are JSX closures over page
 * state), so storing it as provider state made every registration re-render the
 * layout, which re-rendered the page, which re-registered — an unbounded loop
 * that React aborted with "Maximum update depth exceeded". With a store, only
 * the leaf <PageHeaderSlot> subscribers re-render, and the page does not.
 */
const PageHeaderContext = createContext<HeaderStore | null>(null);

function useHeaderStore(hookName: string): HeaderStore {
  const store = useContext(PageHeaderContext);
  if (!store) throw new Error(`${hookName} must be used within PageHeaderProvider`);
  return store;
}

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createHeaderStore);
  return <PageHeaderContext.Provider value={store}>{children}</PageHeaderContext.Provider>;
}

/**
 * Renders the active page's title/nav/action into the topbar. Must be used as a
 * leaf — anything that renders the page itself will loop if it subscribes.
 */
export function PageHeaderSlot({
  children,
}: {
  children: (header: PageHeaderContent | null) => ReactNode;
}) {
  const store = useHeaderStore('PageHeaderSlot');
  const header = useSyncExternalStore(store.subscribe, store.get, store.get);
  return <>{children(header)}</>;
}

/**
 * Pages call this instead of rendering their own title bar. Re-registers on
 * every render (the JSX closures capture current page state), clears on unmount
 * so the next page starts blank.
 */
export function usePageHeader(content: PageHeaderContent) {
  const store = useHeaderStore('usePageHeader');

  // Deliberately dependency-free: `content` is a fresh object every render, so
  // the publish has to happen after every commit. It is safe here only because
  // subscribers are leaves — see the store comment above.
  useEffect(() => {
    store.set(content);
  });

  useEffect(() => {
    return () => store.set(null);
  }, [store]);
}
