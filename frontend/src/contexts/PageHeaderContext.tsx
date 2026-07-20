import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface PageHeaderContent {
  title: string;
  nav?: ReactNode;
  action?: ReactNode;
}

interface PageHeaderContextValue {
  header: PageHeaderContent | null;
  setHeader: (content: PageHeaderContent | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeaderContent | null>(null);
  return (
    <PageHeaderContext.Provider value={{ header, setHeader }}>{children}</PageHeaderContext.Provider>
  );
}

/** DashboardLayout reads the active page's title/nav/action to render into the topbar. */
export function useTopbarHeader() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error('useTopbarHeader must be used within PageHeaderProvider');
  return ctx.header;
}

/**
 * Pages call this instead of rendering their own title bar — it hoists
 * title/nav/action into the shared topbar. Re-registers on every render (nav/
 * action are JSX closures that capture page state), clears on unmount so the
 * next page starts blank.
 */
export function usePageHeader(content: PageHeaderContent) {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error('usePageHeader must be used within PageHeaderProvider');
  const { setHeader } = ctx;

  useEffect(() => {
    setHeader(content);
    return () => setHeader(null);
  });
}
