import { useHeroContent } from '../hooks/useApi';
import { formatDate } from '../utils/date';

interface PrintDocumentHeaderProps {
  /** Section name as it should read on paper, e.g. "Guest List". */
  title: string;
  /**
   * Human-readable summary of the filters that produced this view, e.g.
   * ["Side: Bride", "RSVP: Attending"]. Omit or leave empty when the page
   * prints everything — the header then says so explicitly.
   */
  filters?: string[];
  /** Row/item count, printed so a truncated document is obvious. */
  count?: { shown: number; label: string };
}

/**
 * Masthead stamped on every printed section. Exists because a printout leaves
 * the app: without whose wedding it is, which section, what filters produced it
 * and when it was generated, a sheet found on a desk is unidentifiable — and a
 * filtered list is indistinguishable from a complete one. Hidden on screen.
 */
export default function PrintDocumentHeader({ title, filters, count }: PrintDocumentHeaderProps) {
  const { data: heroContent } = useHeroContent();
  const brideName = heroContent?.bride_name || 'Bride';
  const groomName = heroContent?.groom_name || 'Groom';
  const weddingDate = heroContent?.wedding_date
    ? formatDate(heroContent.wedding_date, { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const generated = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <header className="print-only print-doc-header">
      <div className="print-doc-titles">
        <h1>{title}</h1>
        <p className="print-doc-wedding">
          {brideName} &amp; {groomName}
          {weddingDate ? ` · ${weddingDate}` : ''}
        </p>
      </div>
      <dl className="print-doc-meta">
        <div>
          <dt>Filters</dt>
          <dd>{filters && filters.length > 0 ? filters.join(' · ') : 'None — showing all'}</dd>
        </div>
        {count && (
          <div>
            <dt>{count.label}</dt>
            <dd>{count.shown}</dd>
          </div>
        )}
        <div>
          <dt>Generated</dt>
          <dd>{generated}</dd>
        </div>
      </dl>
    </header>
  );
}
