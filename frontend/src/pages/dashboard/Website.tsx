import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  HiOutlineLink,
  HiOutlineExternalLink,
  HiOutlineSparkles,
  HiOutlineX,
  HiOutlineCheck,
} from 'react-icons/hi';
import { useHeroContent, useUpdateWebsiteContent } from '../../hooks/useApi';
import { SectionHeader } from '../../components/ui';
import toast from 'react-hot-toast';

const THEMES = [
  {
    id: 'royal',
    label: 'Royal Rajasthani',
    hint: 'Deep maroon · gold',
    gradient: 'linear-gradient(135deg, #8B0000, #D4AF37)',
    heroGradient: 'linear-gradient(160deg, #8B0000 0%, #5C0000 100%)',
    accentColor: '#D4AF37',
  },
  {
    id: 'desert',
    label: 'Desert Bloom',
    hint: 'Sand · rose gold',
    gradient: 'linear-gradient(135deg, #C9A96E, #B87676)',
    heroGradient: 'linear-gradient(160deg, #C9A96E 0%, #A0785A 100%)',
    accentColor: '#B87676',
  },
  {
    id: 'mandala',
    label: 'Midnight Mandala',
    hint: 'Navy · ivory',
    gradient: 'linear-gradient(135deg, #1B2A4A, #C9A96E)',
    heroGradient: 'linear-gradient(160deg, #1B2A4A 0%, #0D1629 100%)',
    accentColor: '#C9A96E',
  },
];

const SECTIONS = [
  { id: 'story', name: 'Our Story' },
  { id: 'events', name: 'Events' },
  { id: 'venue', name: 'Venue' },
  { id: 'rsvp', name: 'RSVP' },
  { id: 'gallery', name: 'Gallery' },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        position: 'relative', flexShrink: 0, width: 34, height: 20, borderRadius: 999,
        background: enabled ? 'var(--gold)' : 'var(--line-strong)',
        transition: 'background 200ms', border: 'none', cursor: 'pointer',
      }}
    >
      <div style={{
        position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
        background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 200ms', left: enabled ? 16 : 2,
      }} />
    </button>
  );
}

function PreviewPane({
  slug,
  heroTagline,
  theme,
  sections,
  heroContent,
}: {
  slug: string;
  heroTagline: string;
  theme: string;
  sections: { id: string; name: string; enabled: boolean }[];
  heroContent: any;
}) {
  const themeObj = (THEMES.find((t) => t.id === theme) ?? THEMES[0])!;
  const enabledSections = sections.filter((s) => s.enabled);

  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line-soft)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Browser chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-raised)', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fc625d' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fdbc40' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#35cd4b' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>https://{slug}.weds.app</span>
        </div>
        <a href={`https://${slug}.weds.app`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-dim)' }}>
          <HiOutlineExternalLink style={{ width: 13, height: 13 }} />
        </a>
      </div>

      {/* Preview content */}
      <div style={{ overflowY: 'auto', maxHeight: '70vh' }}>
        {/* Hero */}
        <div style={{ padding: '32px 24px', textAlign: 'center', background: themeObj.heroGradient, color: 'white' }}>
          <p style={{ fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>Together with their families</p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 28, margin: '0 0 4px', color: 'white' }}>
            {heroContent?.bride_name || 'Bride'} &amp; {heroContent?.groom_name || 'Groom'}
          </h2>
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 13, opacity: 0.8, marginTop: 6 }}>
            {heroTagline || 'Your tagline here'}
          </p>
          <p className="mono" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginTop: 8 }}>
            {heroContent?.wedding_date ? new Date(heroContent.wedding_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date · City'}
          </p>
        </div>

        {/* Section stubs */}
        {enabledSections.map((s) => (
          <div key={s.id} style={{ padding: '20px 24px', borderBottom: '1px solid var(--line-soft)', textAlign: 'center' }}>
            <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: themeObj.accentColor, marginBottom: 8, fontWeight: 600 }}>{s.name}</p>
            <div style={{ height: 6, background: 'var(--bg-raised)', borderRadius: 4, maxWidth: 200, margin: '0 auto 6px' }} />
            <div style={{ height: 6, background: 'var(--line-soft)', borderRadius: 4, maxWidth: 140, margin: '0 auto' }} />
          </div>
        ))}
        {enabledSections.length === 0 && (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--ink-dim)', fontSize: 12, fontStyle: 'italic' }}>
            No sections enabled
          </div>
        )}
      </div>
    </div>
  );
}

export default function Website() {
  const { slug } = useParams<{ slug: string }>();
  const { data: heroContent } = useHeroContent(undefined);
  const updateContent = useUpdateWebsiteContent();

  const [theme, setTheme] = useState('royal');
  const [heroTagline, setHeroTagline] = useState('');
  const [sections, setSections] = useState(
    SECTIONS.map((s) => ({ ...s, enabled: true }))
  );
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (heroContent?.tagline) {
      setHeroTagline(heroContent.tagline);
    }
    if ((heroContent as any)?.theme) {
      setTheme((heroContent as any).theme);
    }
    if ((heroContent as any)?.sections) {
      const savedSections: Record<string, boolean> = (heroContent as any).sections;
      setSections(SECTIONS.map((s) => ({ ...s, enabled: savedSections[s.id] ?? true })));
    }
  }, [heroContent]);

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
    setIsDirty(true);
  };

  const handleThemeChange = (id: string) => {
    setTheme(id);
    setIsDirty(true);
  };

  const handleTaglineChange = (v: string) => {
    setHeroTagline(v);
    setIsDirty(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`https://${slug}.weds.app`);
    toast.success('Link copied!');
  };

  const handlePublish = async () => {
    try {
      const sectionsMap = Object.fromEntries(sections.map((s) => [s.id, s.enabled]));
      await updateContent.mutateAsync({
        section: 'hero',
        payload: {
          ...heroContent,
          tagline: heroTagline,
          theme,
          sections: sectionsMap,
        },
      });
      toast.success('Website settings published!');
      setIsDirty(false);
    } catch {
      toast.error('Failed to publish changes');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        eyebrow="Public site"
        title="Your wedding website"
        description={`Live at ${slug}.weds.app — share with guests so they can RSVP, view events, and browse the gallery.`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={copyLink}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <HiOutlineLink style={{ width: 14, height: 14 }} />
              Copy link
            </button>
            <button
              onClick={() => setShowFullPreview(true)}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <HiOutlineExternalLink style={{ width: 14, height: 14 }} />
              Preview
            </button>
            <button
              onClick={handlePublish}
              disabled={updateContent.isPending}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: updateContent.isPending ? 0.6 : 1, position: 'relative' }}
            >
              <HiOutlineSparkles style={{ width: 14, height: 14 }} />
              {updateContent.isPending ? 'Publishing…' : 'Publish changes'}
              {isDirty && !updateContent.isPending && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: '#f97316', border: '1.5px solid white' }} />
              )}
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        {/* Editor sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Theme preset */}
          <div className="card">
            <div className="uppercase-eyebrow" style={{ marginBottom: 12 }}>Theme preset</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    border: theme === t.id ? '1.5px solid var(--gold)' : '1px solid var(--line-soft)',
                    background: theme === t.id ? 'var(--gold-glow)' : 'var(--bg-raised)',
                    transition: 'all 150ms',
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: t.gradient }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink-high)', fontWeight: 500 }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{t.hint}</div>
                  </div>
                  {theme === t.id && <HiOutlineCheck style={{ width: 14, height: 14, color: 'var(--gold-deep)', flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Hero tagline */}
          <div className="card">
            <div className="uppercase-eyebrow" style={{ marginBottom: 12 }}>Hero tagline</div>
            <textarea
              value={heroTagline}
              onChange={(e) => handleTaglineChange(e.target.value)}
              className="input"
              style={{ minHeight: 64, resize: 'vertical' }}
              placeholder="A short tagline for your wedding site…"
            />
            <p style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 6 }}>
              Displays beneath the couple's names on the homepage.
            </p>
          </div>

          {/* Section toggles */}
          <div className="card">
            <div className="uppercase-eyebrow" style={{ marginBottom: 12 }}>Sections</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sections.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '10px 0',
                    borderTop: i > 0 ? '1px solid var(--line-soft)' : 'none',
                  }}
                >
                  <span style={{ flex: 1, fontSize: 13, color: s.enabled ? 'var(--ink-high)' : 'var(--ink-dim)', transition: 'color 200ms' }}>
                    {s.name}
                  </span>
                  <Toggle enabled={s.enabled} onChange={() => toggleSection(s.id)} />
                </div>
              ))}
            </div>
          </div>

          {/* Domain */}
          <div className="card">
            <div className="uppercase-eyebrow" style={{ marginBottom: 12 }}>Domain</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mid)', background: 'var(--bg-raised)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line-soft)' }}>
              {slug}.weds.app
            </div>
            <button
              className="btn-outline"
              style={{ marginTop: 8, width: '100%', fontSize: 12 }}
              onClick={() => toast('Custom domain feature coming soon', { icon: '🔜' })}
            >
              Use custom domain
            </button>
          </div>
        </div>

        {/* Live preview */}
        <PreviewPane
          slug={slug ?? ''}
          heroTagline={heroTagline}
          theme={theme}
          sections={sections}
          heroContent={heroContent}
        />
      </div>

      {/* Full-screen preview modal */}
      {showFullPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-page)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--line-soft)', position: 'sticky', top: 0 }}>
            <button
              onClick={() => setShowFullPreview(false)}
              style={{ padding: '6px 8px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}
            >
              <HiOutlineX style={{ width: 18, height: 18 }} />
            </button>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-low)' }}>{slug}.weds.app</span>
            <span className="pill ok" style={{ fontSize: 9 }}>
              <span className="dot" />Live
            </span>
            <a
              href={`https://${slug}.weds.app`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gold-deep)', textDecoration: 'none' }}
            >
              Open in new tab <HiOutlineExternalLink style={{ width: 12, height: 12 }} />
            </a>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {(() => {
              const themeObj = (THEMES.find((t) => t.id === theme) ?? THEMES[0])!;
              const enabledSections = sections.filter((s) => s.enabled);
              return (
                <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 48px' }}>
                  <div style={{ padding: '64px 32px', textAlign: 'center', background: themeObj.heroGradient, color: 'white' }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 12 }}>Together with their families</p>
                    <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 48, margin: '0 0 8px', color: 'white' }}>
                      {heroContent?.bride_name || 'Bride'}
                    </h1>
                    <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 32, color: themeObj.accentColor, margin: '4px 0' }}>&amp;</p>
                    <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 48, margin: '0 0 16px', color: 'white' }}>
                      {heroContent?.groom_name || 'Groom'}
                    </h1>
                    {heroTagline && (
                      <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 18, opacity: 0.85, marginTop: 8 }}>{heroTagline}</p>
                    )}
                    {heroContent?.wedding_date && (
                      <p className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginTop: 16 }}>
                        {new Date(heroContent.wedding_date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {enabledSections.map((s) => (
                    <div key={s.id} style={{ padding: '40px 32px', borderBottom: '1px solid var(--line-soft)', textAlign: 'center' }}>
                      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: themeObj.accentColor, fontWeight: 600, marginBottom: 16 }}>{s.name}</p>
                      <div style={{ height: 8, background: 'var(--bg-raised)', borderRadius: 4, maxWidth: 360, margin: '0 auto 8px' }} />
                      <div style={{ height: 8, background: 'var(--line-soft)', borderRadius: 4, maxWidth: 240, margin: '0 auto 8px' }} />
                      <div style={{ height: 8, background: 'var(--line-soft)', borderRadius: 4, maxWidth: 200, margin: '0 auto' }} />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
