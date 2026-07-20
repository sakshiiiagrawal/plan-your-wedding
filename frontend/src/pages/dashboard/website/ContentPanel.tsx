import { useState, type ReactNode } from 'react';
import { Reorder } from 'framer-motion';
import { HiOutlineMusicNote, HiOutlineX } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import AudioRangeSelector from '../../../components/AudioRangeSelector';
import { defaultForKey } from '../../../site/copy/registry';
import QrCode from '../../../site/QrCode';
import { QR_DESIGNS } from '../../../site/qrDesigns';
import type { Palette, PartId, SectionSetting, TemplateDefinition } from '../../../site/types';
import PanelSection from './PanelSection';
import { MovableSectionRow, SectionRow } from './SectionRow';
import { weddingPath } from '../../../utils/tenant';

/** The merged Content tab: one ordered accordion of everything on the page —
 *  real sections (toggle/reorder/edit) plus Soundtrack and QR pseudo-rows.
 *  `headerless` drops the PanelSection chrome for hosts that bring their own
 *  title (the mobile studio's Content tray). */
export default function ContentPanel({
  headerless = false,
  template,
  sections,
  onSectionsChange,
  sectionNote,
  slug,
  brideName,
  onBrideName,
  groomName,
  onGroomName,
  weddingDate,
  onWeddingDate,
  heroTagline,
  onHeroTagline,
  storyText,
  onStoryText,
  musicUrl,
  musicStartTime,
  musicEndTime,
  uploadingMusic,
  onMusicUpload,
  onMusicRemove,
  onMusicRange,
  qrEnabled,
  onQrEnabled,
  qrStyle,
  onQrStyle,
  qrUrl,
  siteUrlLabel,
  palette,
  textOverrides,
  onClearOverride,
  onClearAllOverrides,
}: {
  headerless?: boolean;
  template: TemplateDefinition;
  sections: SectionSetting[];
  onSectionsChange: (next: SectionSetting[]) => void;
  sectionNote: (id: PartId) => string | null;
  slug: string | undefined;
  brideName: string;
  onBrideName: (v: string) => void;
  groomName: string;
  onGroomName: (v: string) => void;
  weddingDate: string;
  onWeddingDate: (v: string) => void;
  heroTagline: string;
  onHeroTagline: (v: string) => void;
  storyText: string;
  onStoryText: (v: string) => void;
  musicUrl: string | null;
  musicStartTime: number;
  musicEndTime: number;
  uploadingMusic: boolean;
  onMusicUpload: (file: File) => void;
  onMusicRemove: () => void;
  onMusicRange: (start: number, end: number) => void;
  qrEnabled: boolean;
  onQrEnabled: (v: boolean) => void;
  qrStyle: string;
  onQrStyle: (v: string) => void;
  qrUrl: string;
  siteUrlLabel: string;
  palette: Palette;
  textOverrides: Record<string, string>;
  onClearOverride: (key: string) => void;
  onClearAllOverrides: () => void;
}) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const toggleOpen = (id: string) => setOpenRow((cur) => (cur === id ? null : id));

  const partOf = (id: PartId) => template.parts.find((p) => p.id === id);
  // Pinned parts (overlay / positionless) have no meaningful position —
  // templates ignore where they sit in sections_order, so they render as
  // static rows and the rest form the drag list.
  const pinned = sections.filter((s) => {
    const p = partOf(s.id);
    return p && (p.overlay || p.positionless);
  });
  const movable = sections.filter((s) => {
    const p = partOf(s.id);
    return p && !p.overlay && !p.positionless;
  });

  const toggleSection = (id: PartId) =>
    onSectionsChange(sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  const moveMovable = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= movable.length) return;
    const next = [...movable];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    onSectionsChange([...pinned, ...next]);
  };

  const inputStyle = { display: 'flex', flexDirection: 'column', gap: 8 } as const;
  const proseStyle = { fontSize: 11.5, color: 'var(--ink-mid)', lineHeight: 1.5, margin: 0 } as const;
  const dashLink = { color: 'var(--gold-deep)' } as const;
  const clickHint = (
    <p style={proseStyle}>Click any text in the preview to reword it.</p>
  );

  const bodyFor = (id: PartId): ReactNode => {
    switch (id) {
      case 'hero':
        return (
          <div style={inputStyle}>
            <input
              value={brideName}
              onChange={(e) => onBrideName(e.target.value)}
              className="input"
              placeholder="Bride's name"
              aria-label="Bride's name"
            />
            <input
              value={groomName}
              onChange={(e) => onGroomName(e.target.value)}
              className="input"
              placeholder="Groom's name"
              aria-label="Groom's name"
            />
            <input
              type="date"
              value={weddingDate}
              onChange={(e) => onWeddingDate(e.target.value)}
              className="input"
              aria-label="Wedding date"
            />
            <textarea
              value={heroTagline}
              onChange={(e) => onHeroTagline(e.target.value)}
              className="input"
              style={{ minHeight: 56, resize: 'vertical' }}
              placeholder="A short tagline for your wedding site…"
              aria-label="Hero tagline"
            />
            <p style={{ fontSize: 10, color: 'var(--ink-dim)', margin: 0 }}>
              Names and date are shared by every page — heroes, countdowns, and footers all use
              them.
            </p>
          </div>
        );
      case 'story':
        return (
          <textarea
            value={storyText}
            onChange={(e) => onStoryText(e.target.value)}
            className="input"
            style={{ minHeight: 110, resize: 'vertical', width: '100%' }}
            placeholder="Tell your guests how you met…"
            aria-label="Our story"
          />
        );
      case 'events':
        return (
          <p style={proseStyle}>
            Event details come from their own page —{' '}
            <Link to={weddingPath(slug ?? '', '/dashboard/events')} style={dashLink}>
              manage events
            </Link>
            . Only events marked public appear here.
          </p>
        );
      case 'gallery':
        return (
          <p style={proseStyle}>
            Photos come from{' '}
            <Link to={weddingPath(slug ?? '', '/dashboard/gallery')} style={dashLink}>
              Gallery
            </Link>
            , and order matters: templates fill their photo slots (hero backdrop, countdown
            backdrop, portraits, reel) from your first photos in order — drag photos in Gallery to
            change what lands where.
          </p>
        );
      default:
        return clickHint;
    }
  };

  const body = (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {pinned.map((s) => {
          const part = partOf(s.id)!;
          return (
            <SectionRow
              key={s.id}
              label={part.label}
              chip={part.overlay ? 'overlay' : 'woven in'}
              note={s.enabled ? sectionNote(s.id) : null}
              dimmed={!s.enabled}
              toggle={{
                checked: s.enabled,
                onChange: () => toggleSection(s.id),
                ariaLabel: `Toggle ${part.label}`,
              }}
              open={openRow === s.id}
              onOpenToggle={() => toggleOpen(s.id)}
            >
              {bodyFor(s.id)}
            </SectionRow>
          );
        })}

        <Reorder.Group
          as="div"
          axis="y"
          values={movable}
          onReorder={(next: SectionSetting[]) => onSectionsChange([...pinned, ...next])}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {movable.map((s, i) => {
            const part = partOf(s.id)!;
            return (
              <MovableSectionRow
                key={s.id}
                section={s}
                label={part.label}
                note={s.enabled ? sectionNote(s.id) : null}
                dimmed={!s.enabled}
                toggle={{
                  checked: s.enabled,
                  onChange: () => toggleSection(s.id),
                  ariaLabel: `Toggle ${part.label}`,
                }}
                open={openRow === s.id}
                onOpenToggle={() => toggleOpen(s.id)}
                onMove={(delta) => moveMovable(i, delta)}
                onDragStart={() => setOpenRow(null)}
              >
                {bodyFor(s.id)}
              </MovableSectionRow>
            );
          })}
        </Reorder.Group>

        {/* Pseudo-rows: page furniture that isn't a template section */}
        <SectionRow
          label="Soundtrack"
          note={musicUrl ? null : 'No music yet — add an mp3 / m4a'}
          open={openRow === 'music'}
          onOpenToggle={() => toggleOpen('music')}
        >
          {musicUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HiOutlineMusicNote
                  style={{ width: 15, height: 15, color: 'var(--gold-deep)', flexShrink: 0 }}
                />
                <span
                  className="mono"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 10,
                    color: 'var(--ink-mid)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {musicUrl.split('/').pop()}
                </span>
                <button
                  className="btn-outline"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                  onClick={onMusicRemove}
                >
                  Remove
                </button>
              </div>
              <AudioRangeSelector
                url={musicUrl}
                initialStart={musicStartTime}
                initialEnd={musicEndTime}
                onRangeChange={onMusicRange}
              />
            </div>
          ) : (
            <label
              className="btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 12,
                cursor: 'pointer',
                opacity: uploadingMusic ? 0.6 : 1,
              }}
            >
              <HiOutlineMusicNote style={{ width: 14, height: 14 }} />
              {uploadingMusic ? 'Uploading…' : 'Upload a soundtrack (mp3 / m4a, up to 8 MB)'}
              <input
                type="file"
                accept="audio/mpeg,audio/mp4,audio/aac,audio/x-m4a"
                style={{ display: 'none' }}
                disabled={uploadingMusic}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onMusicUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
          )}
          <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 8, marginBottom: 0 }}>
            Plays softly on this page after the guest&apos;s first tap, with a mute button. Use
            music you have the rights to share.
          </p>
        </SectionRow>

        <SectionRow
          label="QR code"
          note={qrEnabled ? null : 'Hidden — turn it on to print a scannable code'}
          dimmed={!qrEnabled}
          toggle={{
            checked: qrEnabled,
            onChange: () => onQrEnabled(!qrEnabled),
            ariaLabel: 'Toggle QR code',
          }}
          open={openRow === 'qr'}
          onOpenToggle={() => toggleOpen('qr')}
        >
          {qrEnabled ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                  gap: 8,
                }}
              >
                {QR_DESIGNS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onQrStyle(d.id)}
                    title={d.tagline}
                    style={{
                      minWidth: 0,
                      padding: '10px 8px',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      border:
                        qrStyle === d.id
                          ? '1.5px solid var(--gold)'
                          : '1px solid var(--line-soft)',
                      background: qrStyle === d.id ? 'var(--gold-glow)' : 'var(--bg-raised)',
                      transition: 'all 150ms',
                    }}
                  >
                    <QrCode
                      value={qrUrl}
                      size={56}
                      fgColor={palette.ink}
                      bgColor={d.frame === 'none' ? palette.bg : palette.surface}
                      cornerColor={palette.accent}
                      dotShape={d.dotShape}
                    />
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: 'var(--ink-high)',
                        textAlign: 'center',
                      }}
                    >
                      {d.name}
                    </span>
                  </button>
                ))}
              </div>
              <p
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--ink-dim)',
                  marginTop: 10,
                  marginBottom: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Links to {siteUrlLabel}
              </p>
            </>
          ) : (
            <p style={proseStyle}>
              Guests scan it to jump straight to this page — no typing the address. It appears at
              the very end of the page.
            </p>
          )}
        </SectionRow>

        {/* Custom text — only when inline edits exist. Shown for the active
            template + shared strings; "Reset all" also clears keys orphaned
            by template switches. */}
        {Object.keys(textOverrides).length > 0 && (() => {
          const visible = Object.entries(textOverrides).filter(
            ([key]) => key.startsWith(`${template.id}:`) || key.startsWith('shared:'),
          );
          if (visible.length === 0) return null;
          return (
            <SectionRow
              label="Text edits"
              note={`${visible.length} reworded ${visible.length === 1 ? 'string' : 'strings'}`}
              open={openRow === 'text-edits'}
              onOpenToggle={() => toggleOpen('text-edits')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visible.map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: 'var(--ink-dim)',
                          textDecoration: 'line-through',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {defaultForKey(key) ?? key}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: 'var(--ink-high)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {value}
                      </div>
                    </div>
                    <button
                      onClick={() => onClearOverride(key)}
                      title="Restore default"
                      aria-label={`Restore default for "${defaultForKey(key) ?? key}"`}
                      style={{
                        padding: 3,
                        borderRadius: 4,
                        color: 'var(--ink-dim)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexShrink: 0,
                      }}
                    >
                      <HiOutlineX style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
                <button
                  className="btn-outline"
                  style={{ fontSize: 11, padding: '5px 10px', alignSelf: 'flex-start' }}
                  onClick={onClearAllOverrides}
                >
                  Reset all custom text
                </button>
              </div>
            </SectionRow>
          );
        })()}
      </div>
  );

  if (headerless) return <div style={{ padding: '0 16px 16px' }}>{body}</div>;
  return (
    <PanelSection
      title={`Page content · ${template.name}`}
      hint="Everything guests see on this page — toggle, reorder, and edit it here or right in the preview."
    >
      {body}
    </PanelSection>
  );
}
