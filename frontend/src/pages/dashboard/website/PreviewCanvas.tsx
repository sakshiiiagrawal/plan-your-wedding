import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SiteCopyContext, type SiteEditController } from '../../../site/copy/context';
import { getTemplate } from '../../../site/registry';
import QrCodeBlock from '../../../site/QrCodeBlock';
import type { PageKind, SiteData } from '../../../site/types';

export type Device = 'mobile' | 'desktop';

export const DEVICE_WIDTHS: Record<Device, number> = { mobile: 390, desktop: 1280 };

/** Renders the real template, scaled to fit the canvas via CSS zoom. */
export default function PreviewCanvas({
  data,
  templateId,
  kind,
  device,
  overrides,
  edit,
}: {
  data: SiteData;
  templateId: string;
  kind: PageKind;
  device: Device;
  overrides: Record<string, string>;
  edit: SiteEditController;
}) {
  const template = getTemplate(templateId, kind);
  const Template = template.component;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [previewNonce, setPreviewNonce] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const designWidth = DEVICE_WIDTHS[device];
  const zoom = containerWidth ? Math.min(1, containerWidth / designWidth) : 1;
  // An intro only gates the preview if the couple actually has it enabled —
  // otherwise the template never fires onIntroOpen and scroll stays locked.
  const hasIntro = template.parts.some(
    (part) => part.overlay && data.sections.some((s) => s.id === part.id && s.enabled),
  );

  // Templates with a tap-to-open intro must stay un-scrollable in the preview
  // until dismissed — otherwise the canvas's own scrollbar lets you scroll
  // straight past the intro into sections it's meant to gate. The template
  // reports back through onIntroOpen once its intro completes.
  const [introLocked, setIntroLocked] = useState(hasIntro);
  useEffect(() => {
    setIntroLocked(hasIntro);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [hasIntro, templateId, previewNonce]);

  const canvasData = useMemo(
    () => (hasIntro ? { ...data, onIntroOpen: () => setIntroLocked(false) } : data),
    [data, hasIntro],
  );
  const copyCtx = useMemo(() => ({ overrides, edit }), [overrides, edit]);

  return (
    <div
      ref={containerRef}
      style={{
        overflowY: introLocked ? 'hidden' : 'auto',
        overflowX: 'hidden',
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {hasIntro && (
        <button
          onClick={() => setPreviewNonce((n) => n + 1)}
          className="no-print"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 10,
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 500,
            border: '1px solid var(--line)',
            background: 'var(--bg-panel)',
            color: 'var(--ink-mid)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          Replay intro
        </button>
      )}
      <div
        // Gates the .site-editable hover/focus affordances in index.css
        data-site-editing=""
        style={{
          width: designWidth,
          // zoom (unlike transform:scale) keeps layout + scroll height correct
          zoom,
          // Contain the templates' position:fixed effects (scroll progress,
          // music button, envelope) inside the preview sheet — a transformed
          // ancestor becomes their containing block.
          transform: 'translateZ(0)',
          background: data.palette.bg,
          minHeight: '100%',
          flexShrink: 0,
          boxShadow: '0 0 0 1px rgba(28,25,23,0.08), 0 16px 48px -16px rgba(28,25,23,0.3)',
        }}
        // Keep the studio itself navigation-safe: no router Link, external
        // maps/calendar anchor, etc. inside the preview should ever leave the
        // dashboard. Buttons (envelope tap, lightbox, mute) still work.
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest('a')) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <SiteCopyContext.Provider value={copyCtx}>
          <Suspense fallback={<div style={{ minHeight: 400, background: data.palette.bg }} />}>
            <Template key={`${templateId}:${previewNonce}`} data={canvasData} />
          </Suspense>
          <QrCodeBlock data={canvasData} />
        </SiteCopyContext.Provider>
      </div>
    </div>
  );
}
