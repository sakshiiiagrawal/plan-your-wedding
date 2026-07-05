import { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import {
  useGalleryContent,
  useHeroContent,
  useOurStory,
  usePublicEvents,
  usePublicPages,
  type PublicPagePayload,
} from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import { SiteCopyContext } from '../../site/copy/context';
import { resolvePartSettings, resolveSiteConfig } from '../../site/config';
import { getPalette, getTemplate } from '../../site/registry';
import QrCodeBlock from '../../site/QrCodeBlock';
import PrintButton from '../../site/PrintButton';
import { DEFAULT_QR_DESIGN_ID } from '../../site/qrDesigns';
import type { SiteData } from '../../site/types';
import { parseLocalDate } from '../../utils/date';

/**
 * Public renderer for every wedding page: /{slug} resolves the home page
 * (page_slug ''), /{slug}/{pageSlug} any other published page. Each page
 * carries its own template + palette + parts config; couple content
 * (names/date/story/gallery/events) is shared across all pages.
 */
export default function PublicPage() {
  const { slug, pageSlug = '' } = useParams<{ slug: string; pageSlug?: string }>();
  const { isAuthenticated } = useAuth();

  const { data: pages, isLoading: pagesLoading } = usePublicPages(slug);
  const { data: heroContent, isLoading: heroLoading } = useHeroContent(slug);
  const { data: events = [] } = usePublicEvents(slug);
  const { data: storyContent } = useOurStory(slug);
  const { data: galleryContent } = useGalleryContent(slug);

  if (pagesLoading || heroLoading) {
    return <div className="min-h-screen" style={{ background: '#faf8f4' }} />;
  }

  // Resolve the requested page; weddings predating the pages model fall back
  // to a home page synthesized from the legacy hero blob.
  let page: PublicPagePayload | undefined = (pages ?? []).find((p) => p.page_slug === pageSlug);
  if (!page && pageSlug === '' && (pages ?? []).length === 0) {
    const legacy = resolveSiteConfig(heroContent);
    page = {
      page_slug: '',
      kind: 'website',
      title: 'Main website',
      template: legacy.templateId,
      palette: legacy.paletteId,
      config: heroContent ?? {},
    };
  }

  if (!page) {
    // Link to a page that actually exists — never back to the URL that 404'd
    const fallback = (pages ?? []).find((p) => p.page_slug !== pageSlug);
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold text-maroon-800 mb-4">404</h1>
          <p className="text-gray-600 mb-6">This page isn&apos;t published</p>
          {fallback && (
            <a
              href={`/${slug}${fallback.page_slug ? `/${fallback.page_slug}` : ''}`}
              className="btn-primary px-6 py-3"
            >
              Open {fallback.title}
            </a>
          )}
        </div>
      </div>
    );
  }

  const template = getTemplate(page.template, page.kind);
  const palette = getPalette(page.palette);
  const Template = template.component;
  const weddingDateStr = heroContent?.wedding_date ?? null;

  // No canned filler on the live site: an unwritten story disables the
  // section rather than publishing placeholder prose under the couple's name.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const story: string = (storyContent as any)?.story || '';
  const sections = resolvePartSettings(template, page.config).map((s) =>
    s.id === 'story' && !story ? { ...s, enabled: false } : s,
  );

  const data: SiteData = {
    slug: slug ?? '',
    brideName: heroContent?.bride_name || 'Bride',
    groomName: heroContent?.groom_name || 'Groom',
    weddingDate: weddingDateStr ? parseLocalDate(weddingDateStr) : null,
    tagline: heroContent?.tagline || '',
    story,
    events,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    galleryImages: ((galleryContent as any)?.images ?? []) as { url: string }[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gallerySubtitle: (galleryContent as any)?.subtitle ?? '',
    sections,
    palette,
    pages: (pages ?? [])
      .filter((p) => p.page_slug !== page!.page_slug)
      .map((p) => ({ pageSlug: p.page_slug, kind: p.kind, title: p.title })),
    musicUrl: page.config?.music_url ?? null,
    musicStartTime: page.config?.music_start_time ?? 0,
    musicEndTime: page.config?.music_end_time,
    qrCode: {
      enabled: !!page.config?.qr_enabled,
      style: page.config?.qr_style ?? DEFAULT_QR_DESIGN_ID,
      url: `${window.location.origin}/${slug}${page.page_slug ? `/${page.page_slug}` : ''}`,
    },
    authed: isAuthenticated,
  };

  return (
    // Live site: overrides apply, but no edit controller — text stays inert.
    <SiteCopyContext.Provider value={{ overrides: page.config?.text_overrides ?? {}, edit: null }}>
      <Suspense fallback={<div className="min-h-screen" style={{ background: palette.bg }} />}>
        <Template key={`${page.page_slug}:${template.id}`} data={data} />
      </Suspense>
      <QrCodeBlock data={data} />
      <PrintButton data={data} />
    </SiteCopyContext.Provider>
  );
}
