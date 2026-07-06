import type { PartId, SectionSetting, TemplateDefinition } from './types';
import { DEFAULT_TEMPLATE_ID, TEMPLATES } from './registry';

/** Generic display labels; a template's own `parts` labels take precedence in the Studio. */
export const SECTION_LABELS: Record<PartId, string> = {
  hero: 'Hero',
  story: 'Our Story',
  events: 'Events',
  rsvp: 'RSVP',
  gallery: 'Gallery',
  envelope: 'Intro',
  countdown: 'Countdown',
  final: 'Closing',
};

/**
 * Merge a saved sections order (or legacy boolean map) with the template's
 * declared parts: saved entries keep their order/enabled state, parts the
 * saved config doesn't know about are appended enabled, and ids the template
 * doesn't declare are dropped.
 */
export function resolvePartSettings(
  template: TemplateDefinition,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any> | null | undefined,
): SectionSetting[] {
  const validIds = new Set(template.parts.map((p) => p.id));
  const seen = new Set<PartId>();
  let sections: SectionSetting[] = [];

  if (Array.isArray(config?.sections_order)) {
    sections = (config!.sections_order as SectionSetting[])
      .filter((s) => validIds.has(s?.id) && !seen.has(s.id) && (seen.add(s.id), true))
      .map((s) => ({ id: s.id, enabled: s.enabled !== false }));
  } else if (config?.sections && typeof config.sections === 'object') {
    const legacy: Record<string, boolean> = config.sections;
    for (const part of template.parts) {
      seen.add(part.id);
      sections.push({ id: part.id, enabled: legacy[part.id] !== false });
    }
  }

  for (const part of template.parts) {
    if (!seen.has(part.id)) sections.push({ id: part.id, enabled: true });
  }
  return sections;
}

export interface ResolvedSiteConfig {
  templateId: string;
  paletteId: string;
  sections: SectionSetting[];
}

/**
 * Legacy resolver: reads template/palette/section settings out of the hero
 * content blob — the pre-multi-page storage location. Used only as a fallback
 * when a wedding has no `public_pages` rows yet, so nothing breaks mid-deploy.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveSiteConfig(hero: any): ResolvedSiteConfig {
  const templateId =
    typeof hero?.template === 'string' && TEMPLATES[hero.template]
      ? (hero.template as string)
      : DEFAULT_TEMPLATE_ID.website;

  const template = TEMPLATES[templateId]!;
  let paletteId: string | undefined = typeof hero?.palette === 'string' ? hero.palette : undefined;
  if (!paletteId && typeof hero?.theme === 'string') {
    paletteId = hero.theme; // legacy themes royal/desert/mandala are palette catalog ids
  }

  return {
    templateId,
    paletteId: paletteId ?? template.defaultPaletteId,
    sections: resolvePartSettings(template, hero),
  };
}
