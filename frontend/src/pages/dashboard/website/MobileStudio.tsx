import { useState, type ComponentProps, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineChevronDown,
  HiOutlineColorSwatch,
  HiOutlineDocumentText,
  HiOutlineExternalLink,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineLink,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineShare,
  HiOutlineSparkles,
  HiOutlineTemplate,
  HiOutlineTrash,
  HiOutlineX,
} from 'react-icons/hi';
import type { PublicPageRecord } from '../../../hooks/useApi';
import type { SiteEditController } from '../../../site/copy/context';
import { PALETTES, templatesForKind } from '../../../site/registry';
import { GALLERY_LAYOUTS, type PageKind, type SiteData } from '../../../site/types';
import ContentPanel from './ContentPanel';
import type DesignPanel from './DesignPanel';
import PreviewCanvas from './PreviewCanvas';
import TemplateRail from './TemplateRail';

type DesignProps = ComponentProps<typeof DesignPanel>;
type ContentProps = ComponentProps<typeof ContentPanel>;

type Tool = 'template' | 'palette' | 'effects' | 'content';
type SheetId = 'pages' | 'share';

const SPRING = { type: 'spring', stiffness: 420, damping: 38 } as const;

/**
 * Phone-first Site Studio: full-bleed live preview with a photo-editor tool
 * dock along the bottom. Tapping a tool slides a compact tray up over the
 * preview's lower edge — the page stays visible and re-renders live while
 * you swipe through templates, palettes, and effects. Page management and
 * sharing live in bottom sheets off the top bar.
 */
export default function MobileStudio({
  pages,
  pagesLoading,
  selectedPage,
  isDirty,
  publishing,
  onPublish,
  onSwitchPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onUnpublishPage,
  onGoLive,
  pageUrl,
  siteUrlLabel,
  preview,
  design,
  content,
}: {
  pages: PublicPageRecord[];
  pagesLoading: boolean;
  selectedPage: PublicPageRecord | null;
  isDirty: boolean;
  publishing: boolean;
  onPublish: () => void;
  onSwitchPage: (page: PublicPageRecord) => void;
  onAddPage: () => void;
  onRenamePage: (page: PublicPageRecord) => void;
  onDeletePage: (page: PublicPageRecord) => void;
  onUnpublishPage: (page: PublicPageRecord) => void;
  onGoLive: (page: PublicPageRecord) => void;
  pageUrl: (page: PublicPageRecord) => string;
  siteUrlLabel: string;
  preview: {
    data: SiteData;
    templateId: string;
    kind: PageKind;
    overrides: Record<string, string>;
    edit: SiteEditController;
  };
  design: DesignProps;
  content: ContentProps;
}) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [sheet, setSheet] = useState<SheetId | null>(null);

  const hasEffects = design.effectControls.length > 0 || design.showGalleryLayout;
  const toggleTool = (t: Tool) => setTool((cur) => (cur === t ? null : t));

  // Same guard as handlePublish, but surfaced the mobile way: open the
  // Content tray so the empty name fields are right there.
  const publish = () => {
    if (!content.brideName.trim() || !content.groomName.trim()) setTool('content');
    onPublish();
  };

  const dockTools: { id: Tool; label: string; icon: typeof HiOutlineTemplate }[] = [
    { id: 'template', label: 'Template', icon: HiOutlineTemplate },
    { id: 'palette', label: 'Palette', icon: HiOutlineColorSwatch },
    ...(hasEffects
      ? [{ id: 'effects' as Tool, label: 'Effects', icon: HiOutlineSparkles }]
      : []),
    { id: 'content', label: 'Content', icon: HiOutlineDocumentText },
  ];

  const trayTitle: Record<Tool, string> = {
    template: 'Template',
    palette: 'Palette',
    effects: 'Effects',
    content: 'Page content',
  };

  return (
    <div className="mstudio no-print">
      {/* ── Top bar: page pill · share · publish ─────────────────────── */}
      <div className="mstudio-topbar">
        <button
          onClick={() => setSheet('pages')}
          aria-label="Switch page"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 10px',
            borderRadius: 9,
            border: '1px solid var(--line-soft)',
            background: 'var(--bg-raised)',
            minWidth: 0,
            maxWidth: '48%',
          }}
        >
          {selectedPage && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: selectedPage.is_published ? '#22c55e' : 'var(--line-strong)',
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-high)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {selectedPage?.title ?? (pagesLoading ? 'Loading…' : 'No pages')}
          </span>
          <HiOutlineChevronDown
            style={{ width: 13, height: 13, color: 'var(--ink-dim)', flexShrink: 0 }}
          />
        </button>

        <div style={{ flex: 1 }} />

        {selectedPage && (
          <button
            onClick={() => setSheet('share')}
            aria-label="Share options"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 9,
              border: '1px solid var(--line)',
              color: 'var(--ink-mid)',
              background: 'transparent',
            }}
          >
            <HiOutlineShare style={{ width: 15, height: 15 }} />
          </button>
        )}

        <button
          onClick={publish}
          disabled={publishing || !selectedPage}
          className="btn-primary"
          style={{
            fontSize: 12.5,
            padding: '7px 14px',
            opacity: publishing ? 0.6 : 1,
            position: 'relative',
          }}
        >
          {publishing ? 'Publishing…' : 'Publish'}
          {isDirty && !publishing && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#f97316',
                border: '1.5px solid white',
              }}
            />
          )}
        </button>
      </div>

      {/* ── Canvas: live preview + slide-up tool tray ────────────────── */}
      <div className="mstudio-canvas">
        {selectedPage ? (
          <PreviewCanvas
            data={preview.data}
            templateId={preview.templateId}
            kind={preview.kind}
            device="mobile"
            overrides={preview.overrides}
            edit={preview.edit}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            {pagesLoading ? (
              <span style={{ fontSize: 13, color: 'var(--ink-dim)' }}>Loading pages…</span>
            ) : (
              <>
                <span style={{ fontSize: 13, color: 'var(--ink-low)' }}>
                  No pages yet — create your first one.
                </span>
                <button className="btn-primary" style={{ fontSize: 13 }} onClick={onAddPage}>
                  Add a page
                </button>
              </>
            )}
          </div>
        )}

        <AnimatePresence>
          {tool && selectedPage && (
            <motion.div
              key="tray"
              className="mstudio-tray"
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              exit={{ y: '110%' }}
              transition={SPRING}
            >
              <div className="mstudio-tray-head" onClick={() => setTool(null)}>
                <span className="mstudio-grabber" aria-hidden />
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <span
                    className="uppercase-eyebrow"
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    {trayTitle[tool]}
                  </span>
                  <button
                    onClick={() => setTool(null)}
                    aria-label="Close tray"
                    style={{
                      padding: 5,
                      borderRadius: 6,
                      color: 'var(--ink-dim)',
                      background: 'transparent',
                      display: 'flex',
                    }}
                  >
                    <HiOutlineX style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>

              <div
                className="mstudio-tray-body"
                style={{ maxHeight: tool === 'content' ? '58dvh' : '42dvh' }}
              >
                {tool === 'template' && (
                  <div style={{ padding: '4px 14px 10px' }}>
                    <TemplateRail
                      templates={templatesForKind(design.kind)}
                      templateId={design.templateId}
                      onSelect={design.onSelectTemplate}
                    />
                  </div>
                )}

                {tool === 'palette' && (
                  <PaletteRail
                    paletteId={design.paletteId}
                    onSelect={design.onSelectPalette}
                    recommendedIds={design.recommendedPaletteIds}
                  />
                )}

                {tool === 'effects' && <EffectsTray design={design} />}

                {tool === 'content' && <ContentPanel {...content} headerless />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Tool dock ────────────────────────────────────────────────── */}
      {selectedPage && (
        <nav className="mstudio-dock" aria-label="Editing tools">
          {dockTools.map((t) => (
            <button
              key={t.id}
              className="mstudio-dock-btn"
              aria-pressed={tool === t.id}
              onClick={() => toggleTool(t.id)}
            >
              <t.icon style={{ width: 19, height: 19 }} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* ── Bottom sheets: pages · share ─────────────────────────────── */}
      <AnimatePresence>
        {sheet === 'pages' && (
          <Sheet title="Pages" onClose={() => setSheet(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 14px 14px' }}>
              {pages.map((page) => {
                const active = selectedPage?.id === page.id;
                return (
                  <div
                    key={page.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSheet(null);
                      if (!active) onSwitchPage(page);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSheet(null);
                        if (!active) onSwitchPage(page);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: active ? '1.5px solid var(--gold)' : '1px solid var(--line-soft)',
                      background: active ? 'var(--gold-glow)' : 'var(--bg-raised)',
                    }}
                  >
                    <span
                      title={page.is_published ? 'Live' : 'Unpublished'}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: page.is_published ? '#22c55e' : 'var(--line-strong)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: active ? 600 : 500,
                          color: 'var(--ink-high)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {page.title}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-dim)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        /{page.page_slug || ''}
                        {!page.is_published && ' · not live'}
                      </div>
                    </div>
                    <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      {page.page_slug !== '' && (
                        <SheetRowAction
                          label={page.is_published ? `Unpublish ${page.title}` : `Publish ${page.title}`}
                          onClick={() => {
                            if (page.is_published) {
                              setSheet(null);
                              onUnpublishPage(page);
                            } else onGoLive(page);
                          }}
                        >
                          {page.is_published ? (
                            <HiOutlineEye style={{ width: 15, height: 15 }} />
                          ) : (
                            <HiOutlineEyeOff style={{ width: 15, height: 15 }} />
                          )}
                        </SheetRowAction>
                      )}
                      <SheetRowAction
                        label={`Rename ${page.title}`}
                        onClick={() => {
                          setSheet(null);
                          onRenamePage(page);
                        }}
                      >
                        <HiOutlinePencil style={{ width: 15, height: 15 }} />
                      </SheetRowAction>
                      {page.page_slug !== '' && (
                        <SheetRowAction
                          label={`Delete ${page.title}`}
                          onClick={() => {
                            setSheet(null);
                            onDeletePage(page);
                          }}
                        >
                          <HiOutlineTrash style={{ width: 15, height: 15 }} />
                        </SheetRowAction>
                      )}
                    </span>
                  </div>
                );
              })}

              <button
                onClick={() => {
                  setSheet(null);
                  onAddPage();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  border: '1px dashed var(--line)',
                  color: 'var(--ink-low)',
                  background: 'transparent',
                }}
              >
                <HiOutlinePlus style={{ width: 14, height: 14 }} />
                Add a page
              </button>
            </div>
          </Sheet>
        )}

        {sheet === 'share' && selectedPage && (
          <Sheet title="Share" onClose={() => setSheet(null)}>
            <div style={{ padding: '0 14px 14px' }}>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--ink-dim)',
                  padding: '2px 2px 10px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {siteUrlLabel}
                {!selectedPage.is_published && ' · not live yet'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <ShareRow
                  icon={<HiOutlineLink style={{ width: 16, height: 16 }} />}
                  label="Copy link"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(pageUrl(selectedPage));
                      toast.success('Link copied!');
                      setSheet(null);
                    } catch {
                      toast.error("Couldn't copy the link — your browser blocked clipboard access");
                    }
                  }}
                />
                <ShareRow
                  icon={<HiOutlineExternalLink style={{ width: 16, height: 16 }} />}
                  label="Open live page"
                  onClick={() => {
                    if (!selectedPage.is_published) {
                      toast("This page isn't live yet — publish it first");
                      return;
                    }
                    window.open(pageUrl(selectedPage), '_blank', 'noopener,noreferrer');
                    setSheet(null);
                  }}
                />
                <ShareRow
                  icon={<HiOutlinePrinter style={{ width: 16, height: 16 }} />}
                  label="Print page"
                  onClick={() => {
                    if (!selectedPage.is_published) {
                      toast("This page isn't live yet — publish it first");
                      return;
                    }
                    window.open(`${pageUrl(selectedPage)}?print=1`, '_blank', 'noopener,noreferrer');
                    setSheet(null);
                  }}
                />
              </div>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Horizontal snap rail of palette cards — swatch first, name under it. */
function PaletteRail({
  paletteId,
  onSelect,
  recommendedIds,
}: {
  paletteId: string;
  onSelect: (id: string) => void;
  recommendedIds: string[];
}) {
  return (
    <div style={{ padding: '4px 14px 12px' }}>
      <div className="tpl-rail">
        {PALETTES.map((p) => {
          const active = paletteId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              aria-pressed={active}
              aria-label={`${p.name} palette`}
              style={{
                flex: '0 0 84px',
                scrollSnapAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: 6,
                borderRadius: 10,
                border: active ? '2px solid var(--gold)' : '1px solid var(--line-soft)',
                background: active ? 'var(--gold-glow)' : 'var(--bg-raised)',
                transition: 'all 150ms',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: '100%',
                  height: 36,
                  borderRadius: 7,
                  background: p.heroGradient,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 8,
                    background: p.accent,
                  }}
                />
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  minWidth: 0,
                  fontSize: 10.5,
                  color: 'var(--ink-high)',
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </span>
                {recommendedIds.includes(p.id) && (
                  <HiOutlineSparkles
                    title="Recommended for this template"
                    style={{ width: 11, height: 11, color: 'var(--gold-deep)', flexShrink: 0 }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Gallery layout + every declared effect control as label + swipeable pills. */
function EffectsTray({ design }: { design: DesignProps }) {
  const pillRow = (
    choices: { id: string; name: string; hint?: string }[],
    value: string,
    pick: (id: string) => void,
  ) => (
    <div
      style={{
        display: 'flex',
        gap: 5,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        padding: '1px 1px 3px',
      }}
    >
      {choices.map((choice) => {
        const active = value === choice.id;
        return (
          <button
            key={choice.id}
            onClick={() => pick(choice.id)}
            title={choice.hint}
            aria-pressed={active}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 11.5,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              border: active ? '1.5px solid var(--gold)' : '1px solid var(--line-soft)',
              background: active ? 'var(--gold-glow)' : 'var(--bg-raised)',
              color: 'var(--ink-high)',
              transition: 'all 150ms',
            }}
          >
            {choice.name}
          </button>
        );
      })}
    </div>
  );

  const label = (text: string): ReactNode => (
    <div style={{ fontSize: 11.5, color: 'var(--ink-mid)', marginBottom: 6 }}>{text}</div>
  );

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 14px 14px' }}
    >
      {design.showGalleryLayout && (
        <div>
          {label('Gallery layout')}
          {pillRow(GALLERY_LAYOUTS, design.galleryLayout, (id) =>
            design.onGalleryLayout(id as typeof design.galleryLayout),
          )}
        </div>
      )}
      {design.effectControls.map((control) => (
        <div key={control.id}>
          {label(control.label)}
          {pillRow(control.choices, design.effects[control.id] ?? control.defaultId, (id) =>
            design.onEffect(control, id),
          )}
        </div>
      ))}
    </div>
  );
}

function SheetRowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        padding: 7,
        borderRadius: 7,
        color: 'var(--ink-dim)',
        background: 'transparent',
        display: 'flex',
      }}
    >
      {children}
    </button>
  );
}

function ShareRow({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 12px',
        borderRadius: 10,
        border: '1px solid var(--line-soft)',
        background: 'var(--bg-raised)',
        fontSize: 13,
        color: 'var(--ink-high)',
        textAlign: 'left',
      }}
    >
      <span style={{ color: 'var(--ink-mid)', display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );
}

/** Modal bottom sheet with scrim — pages and share menus. */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0" style={{ zIndex: 60 }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '80dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-panel)',
          borderRadius: '16px 16px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -16px 40px -16px rgba(0,0,0,0.35)',
        }}
      >
        <div className="mstudio-tray-head" onClick={onClose}>
          <span className="mstudio-grabber" aria-hidden />
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <span className="uppercase-eyebrow" style={{ flex: 1, marginBottom: 0 }}>
              {title}
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                padding: 5,
                borderRadius: 6,
                color: 'var(--ink-dim)',
                background: 'transparent',
                display: 'flex',
              }}
            >
              <HiOutlineX style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}>{children}</div>
      </motion.div>
    </div>
  );
}
