import { HiOutlinePrinter } from 'react-icons/hi';
import type { SiteData } from './types';

/** Rendered once, alongside QrCodeBlock, whenever the viewer is the couple or
 *  an editor — never guests. Prints the page exactly as rendered, so the
 *  browser's print dialog already reflects whichever sections are toggled on. */
export default function PrintButton({ data }: { data: SiteData }) {
  if (!data.authed) return null;

  return (
    <button
      onClick={() => window.print()}
      aria-label="Print this page"
      className="no-print"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 80,
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.25)',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <HiOutlinePrinter style={{ width: 18, height: 18 }} />
    </button>
  );
}
