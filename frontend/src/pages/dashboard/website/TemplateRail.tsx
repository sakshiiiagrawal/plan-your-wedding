import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { getPalette, TEMPLATES } from '../../../site/registry';

/** Mini visual for a template card: each template gets its own sketch of the
 *  layout it actually produces (envelope, reel frames, timeline, ticket…),
 *  drawn from its default palette — not just a recolored generic card. */
function TemplateThumb({ templateId }: { templateId: string }) {
  const template = TEMPLATES[templateId]!;
  const p = getPalette(template.defaultPaletteId);

  const names = (
    <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 13, color: p.onHero, lineHeight: 1.1 }}>
      A &amp; S
    </div>
  );
  const bar = (width: string, color: string, height = 3) => (
    <div style={{ height, width, borderRadius: 2, background: color }} />
  );

  const sketches: Record<string, ReactNode> = {
    classic: (
      <>
        <div style={{ background: p.heroGradient, padding: '10px 8px 9px', textAlign: 'center' }}>
          {names}
          <div style={{ fontSize: 5.5, color: p.onHeroSoft, marginTop: 2, letterSpacing: '0.2em' }}>12 · 12 · 2026</div>
        </div>
        <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
          {bar('55%', p.accent)}
          {bar('85%', p.line)}
        </div>
      </>
    ),
    editorial: (
      <div style={{ padding: '9px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: p.ink, lineHeight: 1 }}>A&amp;S</div>
        {bar('90%', p.line, 2)}
        {bar('70%', p.line, 2)}
        <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
          <div style={{ flex: 1, height: 14, background: p.line, opacity: 0.6 }} />
          <div style={{ flex: 1, height: 14, background: p.line, opacity: 0.6 }} />
        </div>
      </div>
    ),
    botanical: (
      <div style={{ padding: '8px 8px 6px', textAlign: 'center' }}>
        <div
          style={{
            width: 30,
            height: 38,
            margin: '0 auto 4px',
            borderRadius: '999px 999px 6px 6px',
            background: p.heroGradient,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: 3,
          }}
        >
          <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 10, color: p.onHero }}>A&amp;S</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>{bar('50%', p.accent)}</div>
      </div>
    ),
    midnight: (
      <div style={{ background: p.heroGradient, padding: '14px 8px 13px', textAlign: 'center' }}>
        {names}
        <div style={{ width: 22, height: 1, background: p.accent, margin: '4px auto 0' }} />
      </div>
    ),
    album: (
      <div style={{ padding: 5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <div style={{ height: 20, borderRadius: 3, background: p.heroGradient }} />
        <div style={{ height: 20, borderRadius: 3, background: p.line }} />
        <div style={{ height: 20, borderRadius: 3, background: p.line }} />
        <div style={{ height: 20, borderRadius: 3, background: p.heroGradient, opacity: 0.7 }} />
      </div>
    ),
    journey: (
      <div style={{ padding: '8px 8px', position: 'relative', height: 52 }}>
        <div style={{ position: 'absolute', left: '50%', top: 6, bottom: 6, width: 1, background: p.accent }} />
        {[12, 26, 40].map((top, i) => (
          <div key={top}>
            <div style={{ position: 'absolute', left: 'calc(50% - 2px)', top, width: 5, height: 5, borderRadius: '50%', background: p.accent }} />
            <div style={{ position: 'absolute', top: top + 1, [i % 2 ? 'left' : 'right']: '58%', width: '30%', height: 3, borderRadius: 2, background: p.line } as CSSProperties} />
          </div>
        ))}
      </div>
    ),
    fiesta: (
      <div style={{ padding: '7px 8px 9px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 5 }}>
          {[p.accent, p.primary, p.accent, p.primary, p.accent].map((c, i) => (
            <div key={i} style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `6px solid ${c}` }} />
          ))}
        </div>
        {names && <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 12, color: p.primary }}>A &amp; S</div>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 4 }}>
          {[p.accent, p.primary, p.accent].map((c, i) => (
            <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: c }} />
          ))}
        </div>
      </div>
    ),
    monogram: (
      <div style={{ padding: '10px 8px', textAlign: 'center' }}>
        <div
          style={{
            width: 30,
            height: 30,
            margin: '0 auto 4px',
            borderRadius: '50%',
            border: `1px solid ${p.accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 11, color: p.primary }}>AS</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>{bar('35%', p.line, 2)}</div>
      </div>
    ),
    matinee: (
      <div style={{ padding: 5 }}>
        <div style={{ border: `2px solid ${p.primary}`, borderRadius: 3, padding: '7px 4px', textAlign: 'center', background: p.heroGradient }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: p.onHero }}>A ★ S</div>
        </div>
        <div style={{ marginTop: 3, height: 8, borderRadius: 2, border: `1px dashed ${p.line}` }} />
      </div>
    ),
    invite: (
      <div style={{ padding: '9px 8px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 46, height: 32, borderRadius: 4, background: p.heroGradient }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 0,
              borderLeft: '23px solid transparent',
              borderRight: '23px solid transparent',
              borderTop: `16px solid color-mix(in srgb, ${p.onHero} 25%, transparent)`,
            }}
          />
          <div style={{ position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#8a2323', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 5, color: '#f3d9b0' }}>AS</span>
          </div>
        </div>
      </div>
    ),
    reel: (
      <div style={{ padding: 5, display: 'flex', gap: 3 }}>
        {[1, 0.75, 0.5].map((op) => (
          <div key={op} style={{ flex: 1, height: 42, borderRadius: 3, background: p.heroGradient, opacity: op }} />
        ))}
      </div>
    ),
    scroll: (
      <div style={{ padding: '8px 10px' }}>
        <div style={{ height: 5, borderRadius: 3, background: p.accent }} />
        <div style={{ margin: '0 4px', padding: '6px 2px', background: `color-mix(in srgb, ${p.bg} 70%, #fff)`, textAlign: 'center' }}>
          <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 11, color: p.primary }}>A &amp; S</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: p.accent }} />
      </div>
    ),
    boarding: (
      <div style={{ padding: 5 }}>
        <div style={{ borderRadius: 4, background: p.heroGradient, padding: '5px 5px 4px' }}>
          <div style={{ fontSize: 6, letterSpacing: '0.12em', color: p.onHeroSoft, textTransform: 'uppercase' }}>A ✈ S</div>
          <div style={{ borderTop: `1px dashed ${p.onHeroSoft}`, margin: '4px 0' }} />
          <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 8 }}>
            {[2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1].map((w, i) => (
              <div key={i} style={{ width: w, height: '100%', background: p.onHero, opacity: 0.85 }} />
            ))}
          </div>
        </div>
      </div>
    ),
    polaroid: (
      <div style={{ padding: '7px 8px', position: 'relative', height: 50 }}>
        {[-7, 5].map((rot, i) => (
          <div
            key={rot}
            style={{
              position: 'absolute',
              left: i ? '38%' : '22%',
              top: i ? 8 : 5,
              width: 26,
              height: 30,
              background: '#fff',
              padding: 2,
              transform: `rotate(${rot}deg)`,
              boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ width: '100%', height: '75%', background: p.heroGradient }} />
          </div>
        ))}
      </div>
    ),
    card: (
      <div style={{ padding: 7 }}>
        <div style={{ border: `1px solid ${p.line}`, borderRadius: 5, padding: '7px 4px', textAlign: 'center', background: p.surface }}>
          <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 11, color: p.primary }}>A &amp; S</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 3 }}>{bar('45%', p.accent)}</div>
        </div>
      </div>
    ),
  };

  return (
    <div
      style={{
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--line-soft)',
        background: p.bg,
        flexShrink: 0,
      }}
    >
      {sketches[templateId] ?? sketches['classic']}
    </div>
  );
}

/** Compact horizontal-scroll rail replacing the vertical template card list. */
export default function TemplateRail({
  templates,
  templateId,
  onSelect,
}: {
  templates: { id: string; name: string; tagline: string }[];
  templateId: string;
  onSelect: (id: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const clickedRef = useRef(false);

  useLayoutEffect(() => {
    // Only auto-center on external selection changes (mount, page switch) —
    // scrolling the rail under the cursor right after a click is disorienting.
    if (clickedRef.current) {
      clickedRef.current = false;
      return;
    }
    const card = cardRefs.current[templateId];
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [templateId]);

  const captionOf = templates.find((t) => t.id === (hoverId ?? templateId));

  return (
    <div>
      <div className="tpl-rail" ref={railRef}>
        {templates.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              cardRefs.current[t.id] = el;
            }}
            className="tpl-card"
            onClick={() => {
              clickedRef.current = true;
              onSelect(t.id);
            }}
            onMouseEnter={() => setHoverId(t.id)}
            onMouseLeave={() => setHoverId(null)}
            aria-pressed={templateId === t.id}
            aria-label={`${t.name} template`}
            style={{ background: 'transparent', border: 'none', padding: 0 }}
          >
            <TemplateThumb templateId={t.id} />
            {templateId === t.id && (
              <motion.div
                layoutId="tpl-ring"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                style={{
                  position: 'absolute',
                  inset: -2,
                  borderRadius: 12,
                  border: '2px solid var(--gold)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </button>
        ))}
      </div>
      <div style={{ minHeight: 46, paddingTop: 6 }}>
        {captionOf && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-high)' }}>
              {captionOf.name}
            </div>
            <div style={{ fontSize: 10.5, lineHeight: 1.35, color: 'var(--ink-dim)' }}>
              {captionOf.tagline}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
