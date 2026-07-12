import { Suspense, useEffect, useState } from 'react';
import { SiteCopyContext, type SiteEditController } from '../../../site/copy/context';
import { getTemplate } from '../../../site/registry';
import QrCodeBlock from '../../../site/QrCodeBlock';
import type { PageKind, SiteData } from '../../../site/types';

/** Everything the studio streams into the preview iframe. */
export interface PreviewPayload {
  data: SiteData;
  templateId: string;
  kind: PageKind;
  overrides: Record<string, string>;
  edit: SiteEditController;
  /** Bumped by the studio's "Replay intro" button to remount the template. */
  nonce: number;
}

/** The studio and the frame talk through expandos on the <iframe> element —
 *  same origin, no postMessage serialization, so the payload can carry the
 *  edit controller's functions. The studio sets __getPreviewPayload before
 *  the frame loads (the frame pulls on mount and after any reload); the
 *  frame registers __onPreviewPayload so the studio can push updates. */
export interface PreviewFrameElement extends HTMLIFrameElement {
  __getPreviewPayload?: () => PreviewPayload;
  __onPreviewPayload?: (payload: PreviewPayload) => void;
}

/**
 * Iframe half of the Site Studio preview (route: /__preview). Renders the
 * template at the top of a real document, exactly like PublicPage, so the
 * studio and the live site cannot drift: media queries, vw/svh units,
 * window scroll and position:fixed all resolve against this frame's
 * viewport instead of the dashboard's.
 */
export default function PreviewFrame() {
  const frame = window.frameElement as PreviewFrameElement | null;
  const [payload, setPayload] = useState<PreviewPayload | null>(
    () => frame?.__getPreviewPayload?.() ?? null,
  );

  useEffect(() => {
    if (!frame) return;
    frame.__onPreviewPayload = setPayload;
    // Re-pull: catches a push dropped between first render and this effect
    setPayload(frame.__getPreviewPayload?.() ?? null);
    return () => {
      delete frame.__onPreviewPayload;
    };
  }, [frame]);

  // Gates the .site-editable hover/focus affordances in index.css
  useEffect(() => {
    document.documentElement.setAttribute('data-site-editing', '');
    return () => document.documentElement.removeAttribute('data-site-editing');
  }, []);

  // Keep the studio navigation-safe: no router Link, external maps/calendar
  // anchor, etc. inside the preview should ever leave the dashboard.
  // Buttons (envelope tap, lightbox, mute) still work.
  useEffect(() => {
    const blockAnchors = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', blockAnchors, true);
    return () => document.removeEventListener('click', blockAnchors, true);
  }, []);

  const templateId = payload?.templateId;
  const nonce = payload?.nonce;
  // Back to the top when the template changes or an intro replays
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [templateId, nonce]);

  if (!payload) return null;

  const template = getTemplate(payload.templateId, payload.kind);
  const Template = template.component;

  return (
    <SiteCopyContext.Provider value={{ overrides: payload.overrides, edit: payload.edit }}>
      <Suspense
        fallback={<div style={{ minHeight: '100vh', background: payload.data.palette.bg }} />}
      >
        <Template key={`${payload.templateId}:${payload.nonce}`} data={payload.data} />
      </Suspense>
      <QrCodeBlock data={payload.data} />
    </SiteCopyContext.Provider>
  );
}
