/**
 * Throwaway QA harness (not part of the app): renders any template with mock
 * SiteData so templates can be screenshotted headlessly without auth/DB.
 * Usage: /tpl-preview.html?t=classic&p=royal&photos=1&layout=mosaic
 *        &fx={"scrollAnim":"off"}   — per-page effect picks (config.effects)
 */
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getPalette, getTemplate } from './site/registry';
import type { GalleryLayoutId, SiteData } from './site/types';
import './index.css';

const params = new URLSearchParams(window.location.search);
const template = getTemplate(
  params.get('t') ?? 'classic',
  (params.get('kind') as 'website' | 'invite') ?? 'website',
);
const palette = getPalette(params.get('p') ?? template.defaultPaletteId);
const photos = params.get('photos') !== '0';
const layout = (params.get('layout') ?? 'mosaic') as GalleryLayoutId;

let effects: Record<string, string> = {};
try {
  effects = JSON.parse(params.get('fx') ?? '{}');
} catch {
  /* keep defaults */
}

// Inline SVG photos: no network, so the sweep runs offline and never flakes.
const img = (seed: number) => {
  const hue = (seed * 47) % 360;
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${seed % 2 ? 1200 : 900}"><rect width="100%" height="100%" fill="hsl(${hue},38%,70%)"/><circle cx="450" cy="480" r="200" fill="hsl(${hue},44%,52%)"/></svg>`,
  )}`;
};

const future = new Date();
future.setDate(future.getDate() + 142);

const data: SiteData = {
  slug: 'qa-preview',
  homePath: '/qa-preview',
  pagePath: (pageSlug: string) => (pageSlug ? `/qa-preview/${pageSlug}` : '/qa-preview'),
  brideName: 'Aisha',
  groomName: 'Rohan',
  weddingDate: future,
  tagline: 'Two families, one celebration',
  story:
    'We met over chai at a mutual friend’s Diwali party, argued about the best road-trip snacks, and have been finishing each other’s sentences ever since.\nNow we’re making it official — and we want you there.',
  events: [
    {
      id: 'e1',
      name: 'Mehendi',
      event_type: 'Ceremony',
      description: 'An afternoon of henna, music and laughter.',
      date: future.toISOString().slice(0, 10),
      start_time: '15:00',
      end_time: '19:00',
      dress_code: 'Festive greens',
      color: null,
      venue: { name: 'Grand Lotus Hotel', address: 'MI Road', city: 'Jaipur', latitude: 26.9, longitude: 75.8 },
    },
    {
      id: 'e2',
      name: 'Sangeet',
      event_type: 'Party',
      description: 'Bring your best dance moves.',
      date: future.toISOString().slice(0, 10),
      start_time: '19:30',
      end_time: null,
      dress_code: null,
      color: null,
      venue: { name: 'Grand Lotus Lawns', address: null, city: 'Jaipur', latitude: null, longitude: null },
    },
    {
      id: 'e3',
      name: 'Wedding & Reception',
      event_type: 'Ceremony',
      description: null,
      date: future.toISOString().slice(0, 10),
      start_time: '18:00',
      end_time: null,
      dress_code: 'Formal',
      color: null,
      venue: null,
    },
  ],
  galleryImages: photos ? Array.from({ length: 9 }, (_, i) => ({ url: img(i + 1) })) : [],
  gallerySubtitle: photos ? 'A few of our favourite frames' : '',
  galleryLayout: layout,
  effects,
  // The template's own parts, all on — except the tap-to-open envelope so
  // headless runs can reach the content (opt back in with ?envelope=1).
  sections: template.parts.map((part) => ({
    id: part.id,
    enabled: part.id !== 'envelope' || params.get('envelope') === '1',
  })),
  palette,
  pages: [],
  musicUrl: null,
  authed: false,
  preview: true,
};

const Template = template.component;
const qc = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Suspense fallback={null}>
          <Template data={data} />
        </Suspense>
      </MemoryRouter>
    </QueryClientProvider>
  </StrictMode>,
);
