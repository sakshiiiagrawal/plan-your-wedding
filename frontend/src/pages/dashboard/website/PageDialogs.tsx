import { useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import type { PublicPageRecord } from '../../../hooks/useApi';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import type { PageKind } from '../../../site/types';
import { RESERVED_PAGE_SLUGS } from '@wedding-planner/shared';

const RESERVED_SLUGS = new Set<string>(RESERVED_PAGE_SLUGS);

export function AddPageDialog({
  existingSlugs,
  onClose,
  onCreate,
  creating,
}: {
  existingSlugs: string[];
  onClose: () => void;
  onCreate: (payload: { kind: PageKind; title: string; page_slug: string }) => void;
  creating: boolean;
}) {
  // Keep suggesting until a free slug is found (invite → invite-2 → invite-3…)
  const suggestSlug = (base: string) => {
    if (!existingSlugs.includes(base)) return base;
    let n = 2;
    while (existingSlugs.includes(`${base}-${n}`)) n += 1;
    return `${base}-${n}`;
  };

  const [kind, setKind] = useState<PageKind>('invite');
  const [title, setTitle] = useState('Invitation');
  const [pageSlug, setPageSlug] = useState(() => suggestSlug('invite'));
  // Switching Type only refreshes fields the user hasn't customized
  const [titleEdited, setTitleEdited] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  useModalDismiss(true, onClose);

  const selectKind = (k: PageKind) => {
    setKind(k);
    const defaults =
      k === 'invite' ? { title: 'Invitation', slug: 'invite' } : { title: 'Website', slug: 'site' };
    if (!titleEdited) setTitle(defaults.title);
    if (!slugEdited) setPageSlug(suggestSlug(defaults.slug));
  };

  const slugValid = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(pageSlug);
  const slugTaken = existingSlugs.includes(pageSlug);
  const slugReserved = RESERVED_SLUGS.has(pageSlug);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        role="dialog"
        aria-modal="true"
        aria-label="Add a page"
        style={{ width: 380, background: 'var(--bg-panel)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-high)' }}>
            Add a page
          </span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <HiOutlineX style={{ width: 16, height: 16, color: 'var(--ink-dim)' }} />
          </button>
        </div>

        <div className="uppercase-eyebrow" style={{ marginBottom: 8 }}>
          Type
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3.5">
          {(
            [
              { id: 'invite', label: 'Invitation', hint: 'Tap-to-open story-scroll invite' },
              { id: 'website', label: 'Website', hint: 'Multi-section guest site' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              onClick={() => selectKind(option.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                textAlign: 'left',
                cursor: 'pointer',
                border:
                  kind === option.id ? '1.5px solid var(--gold)' : '1px solid var(--line-soft)',
                background: kind === option.id ? 'var(--gold-glow)' : 'var(--bg-raised)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-high)' }}>
                {option.label}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 2 }}>
                {option.hint}
              </div>
            </button>
          ))}
        </div>

        <div className="uppercase-eyebrow" style={{ marginBottom: 8 }}>
          Name &amp; URL
        </div>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleEdited(true);
          }}
          className="input"
          placeholder="Page name"
          aria-label="Page name"
          style={{ marginBottom: 8 }}
        />
        <input
          value={pageSlug}
          onChange={(e) => {
            setPageSlug(e.target.value.toLowerCase());
            setSlugEdited(true);
          }}
          className="input mono"
          placeholder="url-segment"
          aria-label="Page URL segment"
        />
        <p style={{ fontSize: 11, color: 'var(--ink-dim)', margin: '6px 0 14px' }}>
          {slugTaken
            ? 'That URL is already used by another page.'
            : slugReserved
              ? 'That URL is reserved by the app — pick another.'
              : !slugValid && pageSlug
                ? 'Lowercase letters, numbers and hyphens only.'
                : `Guests will open it at /${pageSlug || '…'}`}
        </p>

        <button
          className="btn-primary"
          style={{ width: '100%', opacity: creating ? 0.6 : 1 }}
          disabled={creating || !title.trim() || !slugValid || slugTaken || slugReserved}
          onClick={() => onCreate({ kind, title: title.trim(), page_slug: pageSlug })}
        >
          {creating ? 'Creating…' : 'Create page'}
        </button>
      </div>
    </div>
  );
}

export function EditPageDialog({
  page,
  existingSlugs,
  onClose,
  onSave,
  saving,
}: {
  page: PublicPageRecord;
  existingSlugs: string[];
  onClose: () => void;
  onSave: (payload: { title: string; page_slug?: string }) => void;
  saving: boolean;
}) {
  const isHome = page.page_slug === '';
  const [title, setTitle] = useState(page.title);
  const [pageSlug, setPageSlug] = useState(page.page_slug);
  useModalDismiss(true, onClose);

  const slugChanged = pageSlug !== page.page_slug;
  const slugValid = isHome || /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(pageSlug);
  const slugTaken = slugChanged && existingSlugs.includes(pageSlug);
  const slugReserved = slugChanged && RESERVED_SLUGS.has(pageSlug);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${page.title}`}
        style={{ width: 380, background: 'var(--bg-panel)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-high)' }}>Edit page</span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <HiOutlineX style={{ width: 16, height: 16, color: 'var(--ink-dim)' }} />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="Page name"
          aria-label="Page name"
          style={{ marginBottom: 8 }}
        />
        {isHome ? (
          <p style={{ fontSize: 11, color: 'var(--ink-dim)', margin: '0 0 14px' }}>
            The home page always lives at the wedding&apos;s root address.
          </p>
        ) : (
          <>
            <input
              value={pageSlug}
              onChange={(e) => setPageSlug(e.target.value.toLowerCase())}
              className="input mono"
              placeholder="url-segment"
              aria-label="Page URL segment"
            />
            <p style={{ fontSize: 11, color: 'var(--ink-dim)', margin: '6px 0 14px' }}>
              {slugTaken
                ? 'That URL is already used by another page.'
                : slugReserved
                  ? 'That URL is reserved by the app — pick another.'
                  : !slugValid && pageSlug
                    ? 'Lowercase letters, numbers and hyphens only.'
                    : slugChanged
                      ? 'Old links (and printed QR codes) to the previous URL will stop working.'
                      : `Guests open it at /${pageSlug}`}
            </p>
          </>
        )}

        <button
          className="btn-primary"
          style={{ width: '100%', opacity: saving ? 0.6 : 1 }}
          disabled={saving || !title.trim() || !slugValid || slugTaken || slugReserved}
          onClick={() =>
            onSave({
              title: title.trim(),
              ...(isHome || !slugChanged ? {} : { page_slug: pageSlug }),
            })
          }
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
