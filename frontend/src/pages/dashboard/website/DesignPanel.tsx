import { HiOutlineSparkles } from 'react-icons/hi';
import { PALETTES, templatesForKind } from '../../../site/registry';
import type { PageKind } from '../../../site/types';
import PanelSection from './PanelSection';
import TemplateRail from './TemplateRail';

/** The Design tab: template rail + palette grid. Palette positions are stable
 *  across template switches — recommendation is a badge, not a reorder. */
export default function DesignPanel({
  kind,
  templateId,
  onSelectTemplate,
  paletteId,
  onSelectPalette,
  recommendedPaletteIds,
}: {
  kind: PageKind;
  templateId: string;
  onSelectTemplate: (id: string) => void;
  paletteId: string;
  onSelectPalette: (id: string) => void;
  recommendedPaletteIds: string[];
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
    </>
  );
}
