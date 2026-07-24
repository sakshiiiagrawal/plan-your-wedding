// Shared prev/next pagination control — extracted from Vendors.tsx, the
// first page to implement real server-side pagination.
export function Pagination({
  page,
  perPage,
  totalPages,
  totalItems,
  itemCountOnPage,
  itemLabel,
  onPageChange,
  onPerPageChange,
  isFetching = false,
  perPageOptions = [12, 24, 48],
}: {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  itemCountOnPage: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  isFetching?: boolean;
  perPageOptions?: number[];
}) {
  const startIndex = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const endIndex = totalItems === 0 ? 0 : startIndex + itemCountOnPage - 1;

  return (
    // Screen-only: printing expands the list past the current page, so a
    // "1–20 of 47" footer under 47 printed rows would just contradict itself.
    // marginTop:auto pins the control to the bottom of a full-height flex-column
    // page root when the list is short; inert inside a plain block (card footers).
    <div className="card no-print" style={{ marginTop: 'auto', padding: '12px 16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--ink-low)' }}>
          Showing {startIndex} - {endIndex} of {totalItems} {itemLabel}
          {isFetching ? ' · Updating…' : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {onPerPageChange && (
            <>
              <span style={{ fontSize: 12, color: 'var(--ink-low)' }}>Per page</span>
              <select
                className="input"
                value={perPage}
                onChange={(event) => onPerPageChange(Number(event.target.value))}
                style={{ width: 80 }}
              >
                {perPageOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            className="btn-outline"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || isFetching}
            style={{ padding: '6px 10px', opacity: page <= 1 ? 0.5 : 1 }}
          >
            Prev
          </button>
          <span style={{ fontSize: 12, color: 'var(--ink-low)', minWidth: 80, textAlign: 'center' }}>
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn-outline"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || isFetching}
            style={{ padding: '6px 10px', opacity: page >= totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
