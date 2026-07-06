import { HiOutlinePrinter } from 'react-icons/hi';

/** Rendered once, alongside QrCodeBlock, on every public page. Prints the page
 *  exactly as rendered, so the browser's print dialog already reflects whichever
 *  sections are toggled on — handy for guests saving the itinerary too. */
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      aria-label="Print this page"
      className="no-print"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 80,
        height: 40,
        padding: '0 16px',
        borderRadius: 20,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: 'white',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 6px 20px -8px rgba(0,0,0,0.5)',
      }}
    >
      <HiOutlinePrinter style={{ width: 18, height: 18 }} />
      Print
    </button>
  );
}
