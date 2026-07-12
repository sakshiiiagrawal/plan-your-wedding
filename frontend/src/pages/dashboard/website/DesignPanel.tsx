import { HiOutlineSparkles } from 'react-icons/hi';
import { PALETTES, templatesForKind } from '../../../site/registry';
import type { EffectControl } from '../../../site/effects/schema';
import { GALLERY_LAYOUTS, type GalleryLayoutId, type PageKind } from '../../../site/types';
import PanelSection from './PanelSection';
import TemplateRail from './TemplateRail';

const EFFECT_GROUPS: { id: EffectControl['group']; title: string }[] = [
  { id: 'atmosphere', title: 'Effects · Atmosphere' },
  { id: 'motion', title: 'Effects · Motion' },
  { id: 'interaction', title: 'Effects · Interactions' },
];

/** The Design tab: template rail + palette grid + gallery layout + the
 *  template's declared animation controls (rendered generically — a template
 *  that declares `effectControls` gets its pickers with zero Studio code).
 *  Palette positions are stable across template switches — recommendation is
 *  a badge, not a reorder. */
export default function DesignPanel({
  kind,
  templateId,
  onSelectTemplate,
  paletteId,
  onSelectPalette,
  recommendedPaletteIds,
  galleryLayout,
  onGalleryLayout,
  showGalleryLayout,
  effectControls,
  effects,
  onEffect,
}: {
  kind: PageKind;
  templateId: string;
  onSelectTemplate: (id: string) => void;
  paletteId: string;
  onSelectPalette: (id: string) => void;
  recommendedPaletteIds: string[];
  galleryLayout: GalleryLayoutId;
  onGalleryLayout: (id: GalleryLayoutId) => void;
  showGalleryLayout: boolean;
  effectControls: EffectControl[];
  effects: Record<string, string>;
  onEffect: (control: EffectControl, choiceId: string) => void;
}) {
  return (
    <>
      <PanelSection title={`Template · ${kind === 'invite' ? 'Invitation' : 'Website'}`}>
        <TemplateRail
          templates={templatesForKind(kind)}
          templateId={templateId}
          onSelect={onSelectTemplate}
        />
      </PanelSection>

      <PanelSection
        title="Palette"
        hint="Any palette works with any template — ✦ marks the ones that suit this one best."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 6,
          }}
        >
          {PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPalette(p.id)}
              title={p.name}
              aria-pressed={paletteId === p.id}
              style={{
                minWidth: 0,
                textAlign: 'left',
                padding: '7px 8px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                cursor: 'pointer',
                border:
                  paletteId === p.id
                    ? '1.5px solid var(--gold)'
                    : '1px solid var(--line-soft)',
                background: paletteId === p.id ? 'var(--gold-glow)' : 'var(--bg-raised)',
                transition: 'all 150ms',
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  background: p.heroGradient,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  width: 10,
                  height: 18,
                  borderRadius: 5,
                  background: p.accent,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 11,
                  color: 'var(--ink-high)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {p.name}
              </span>
              {recommendedPaletteIds.includes(p.id) && (
                <HiOutlineSparkles
                  title="Recommended for this template"
                  style={{ width: 12, height: 12, color: 'var(--gold-deep)', flexShrink: 0 }}
                />
              )}
            </button>
          ))}
        </div>
      </PanelSection>

      {showGalleryLayout && (
        <PanelSection
          title="Gallery layout"
          hint="How the photo grid arranges itself on this page."
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: 6,
            }}
          >
            {GALLERY_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                onClick={() => onGalleryLayout(layout.id)}
                title={layout.hint}
                aria-pressed={galleryLayout === layout.id}
                style={{
                  minWidth: 0,
                  textAlign: 'left',
                  padding: '8px 9px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  border:
                    galleryLayout === layout.id
                      ? '1.5px solid var(--gold)'
                      : '1px solid var(--line-soft)',
                  background:
                    galleryLayout === layout.id ? 'var(--gold-glow)' : 'var(--bg-raised)',
                  transition: 'all 150ms',
                }}
              >
                <GalleryLayoutGlyph id={layout.id} active={galleryLayout === layout.id} />
                <span
                  style={{
                    minWidth: 0,
                    fontSize: 11.5,
                    color: 'var(--ink-high)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {layout.name}
                </span>
              </button>
            ))}
          </div>
        </PanelSection>
      )}

      {EFFECT_GROUPS.map(({ id, title }) => {
        const controls = effectControls.filter((c) => c.group === id);
        if (controls.length === 0) return null;
        return (
          <PanelSection key={id} title={title}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {controls.map((control) => {
                const value = effects[control.id] ?? control.defaultId;
                return (
                  <div key={control.id}>
                    <div
                      style={{ fontSize: 11.5, color: 'var(--ink-mid)', marginBottom: 6 }}
                      title={control.hint}
                    >
                      {control.label}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {control.choices.map((choice) => {
                        const active = value === choice.id;
                        return (
                          <button
                            key={choice.id}
                            onClick={() => onEffect(control, choice.id)}
                            title={choice.hint}
                            aria-pressed={active}
                            style={{
                              padding: '5px 11px',
                              borderRadius: 999,
                              fontSize: 11,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              border: active
                                ? '1.5px solid var(--gold)'
                                : '1px solid var(--line-soft)',
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
                  </div>
                );
              })}
            </div>
          </PanelSection>
        );
      })}
    </>
  );
}

/** Tiny schematic of each arrangement so the pick reads at a glance. */
function GalleryLayoutGlyph({ id, active }: { id: GalleryLayoutId; active: boolean }) {
  const fill = active ? 'var(--gold-deep)' : 'var(--line-strong)';
  const rects: Record<GalleryLayoutId, { x: number; y: number; w: number; h: number; r?: number }[]> = {
    mosaic: [
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 11, y: 0, w: 7, h: 4.5 },
      { x: 11, y: 5.5, w: 7, h: 4.5 },
      { x: 0, y: 11, w: 7, h: 4 },
      { x: 8, y: 11, w: 10, h: 4 },
    ],
    masonry: [
      { x: 0, y: 0, w: 5, h: 9 },
      { x: 6.5, y: 0, w: 5, h: 6 },
      { x: 13, y: 0, w: 5, h: 8 },
      { x: 0, y: 10, w: 5, h: 5 },
      { x: 6.5, y: 7, w: 5, h: 8 },
      { x: 13, y: 9, w: 5, h: 6 },
    ],
    filmstrip: [
      { x: 0, y: 3, w: 5, h: 9 },
      { x: 6.5, y: 3, w: 5, h: 9 },
      { x: 13, y: 3, w: 5, h: 9 },
    ],
    polaroid: [
      { x: 1, y: 1, w: 7, h: 9, r: -8 },
      { x: 10, y: 4, w: 7, h: 9, r: 8 },
    ],
  };
  return (
    <svg width="20" height="17" viewBox="0 0 18 15.5" style={{ flexShrink: 0 }} aria-hidden>
      {rects[id].map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx="1"
          fill={fill}
          opacity={0.85}
          transform={r.r ? `rotate(${r.r} ${r.x + r.w / 2} ${r.y + r.h / 2})` : undefined}
        />
      ))}
    </svg>
  );
}
