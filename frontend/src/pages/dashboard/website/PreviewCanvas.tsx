import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SiteEditController } from '../../../site/copy/context';
import { getTemplate } from '../../../site/registry';
import type { PageKind, SiteData } from '../../../site/types';
import type { PreviewFrameElement, PreviewPayload } from './PreviewFrame';

export type Device = 'mobile' | 'desktop';

export const DEVICE_WIDTHS: Record<Device, number> = { mobile: 390, desktop: 1280 };

/**
 * Hosts the preview in an <iframe> running this app's /__preview route
 * (PreviewFrame), scaled to fit with transform:scale. The template gets a
 * real window at the device width, so it renders pixel-identical to the
 * live site; draft data streams in through expandos on the iframe element.
 */
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
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<PreviewFrameElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [nonce, setNonce] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const payload: PreviewPayload = { data, templateId, kind, overrides, edit, nonce };
  // Latest-payload ref: the frame pulls on mount/reload; pushes cover updates.
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  useEffect(() => {
    frameRef.current?.__onPreviewPayload?.(payload);
  });

  const designWidth = DEVICE_WIDTHS[device];
  const zoom = containerWidth ? Math.min(1, containerWidth / designWidth) : 1;
  const hasIntro = template.parts.some(
    (part) => part.overlay && data.sections.some((s) => s.id === part.id && s.enabled),
  );

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {hasIntro && (
        <button
          onClick={() => setNonce((n) => n + 1)}
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
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: designWidth * zoom,
          boxShadow: '0 0 0 1px rgba(28,25,23,0.08), 0 16px 48px -16px rgba(28,25,23,0.3)',
        }}
      >
        <iframe
          ref={(el) => {
            frameRef.current = el as PreviewFrameElement | null;
            if (frameRef.current) frameRef.current.__getPreviewPayload = () => payloadRef.current;
          }}
          src="/__preview"
          title="Site preview"
          style={{
            display: 'block',
            border: 0,
            width: designWidth,
            height: `${100 / zoom}%`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            background: data.palette.bg,
          }}
        />
      </div>
    </div>
  );
}
