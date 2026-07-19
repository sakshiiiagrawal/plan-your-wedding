import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useViewPreference } from '../../hooks/useViewPreference';
import {
  HiOutlineDeviceMobile,
  HiOutlineDesktopComputer,
  HiOutlineExternalLink,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineLink,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineSparkles,
  HiOutlineTrash,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import {
  useCreatePage,
  useDeletePage,
  useGalleryContent,
  useHeroContent,
  useOurStory,
  usePages,
  usePublicEvents,
  useUpdatePage,
  useUpdateWebsiteContent,
  type PublicPageRecord,
} from '../../hooks/useApi';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { resolvePartSettings } from '../../site/config';
import { getPalette, getTemplate, templatesForKind } from '../../site/registry';
import type { SiteEditController } from '../../site/copy/context';
import { defaultForKey } from '../../site/copy/registry';
import type { EffectControl } from '../../site/effects/schema';
import { DEFAULT_QR_DESIGN_ID } from '../../site/qrDesigns';
import {
  DEFAULT_GALLERY_LAYOUT,
  type GalleryLayoutId,
  type PageKind,
  type PartId,
  type SectionSetting,
  type SiteData,
} from '../../site/types';
import { parseLocalDate } from '../../utils/date';
import PreviewCanvas, { type Device } from './website/PreviewCanvas';
import ContentPanel from './website/ContentPanel';
import DesignPanel from './website/DesignPanel';
import { AddPageDialog, EditPageDialog } from './website/PageDialogs';

const DEFAULT_MUSIC_END = 45;

type Tab = 'design' | 'content';

export default function Website() {
  const { slug } = useParams<{ slug: string }>();
  const { data: heroContent } = useHeroContent(undefined);
  const { data: storyContent } = useOurStory(undefined);
  const { data: publicEvents = [] } = usePublicEvents(slug);
  const { data: galleryContent } = useGalleryContent(undefined);
  const { data: pages = [], isLoading: pagesLoading } = usePages();
  const updateContent = useUpdateWebsiteContent();
  const updatePage = useUpdatePage();
  const createPage = useCreatePage();
  const deletePage = useDeletePage();

  const [tab, setTab] = useViewPreference<Tab>('siteStudio.tab', 'design');
  // Falls back to the pre-migration standalone key so an existing device
  // choice survives the switch to the shared preferences hook.
  const legacyDevice = (() => {
    try {
      const saved = localStorage.getItem('siteStudioDevice');
      return saved === 'mobile' || saved === 'desktop' ? saved : undefined;
    } catch {
      return undefined;
    }
  })();
  const [device, setDevice] = useViewPreference<Device>(
    'siteStudio.device',
    legacyDevice ?? 'desktop',
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showAddPage, setShowAddPage] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PublicPageRecord | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<PublicPageRecord | null>(null);
  const [pendingUnpublish, setPendingUnpublish] = useState<PublicPageRecord | null>(null);
  const [editingPage, setEditingPage] = useState<PublicPageRecord | null>(null);
  const [uploadingMusic, setUploadingMusic] = useState(false);

  // Per-page draft design state
  const [templateId, setTemplateId] = useState('classic');
  const [paletteId, setPaletteId] = useState('royal');
  const [sections, setSections] = useState<SectionSetting[]>([]);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicStartTime, setMusicStartTime] = useState(0);
  const [musicEndTime, setMusicEndTime] = useState(45);
  const [qrEnabled, setQrEnabled] = useState(false);
  const [qrStyle, setQrStyle] = useState(DEFAULT_QR_DESIGN_ID);
  const [galleryLayout, setGalleryLayout] = useState<GalleryLayoutId>(DEFAULT_GALLERY_LAYOUT);
  // Sparse per-page animation picks (config.effects) — a default choice stores nothing
  const [effects, setEffects] = useState<Record<string, string>>({});
  // Sparse per-page copy overrides (config.text_overrides), edited inline in the preview
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>({});
  // Shared couple content drafts
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [heroTagline, setHeroTagline] = useState('');
  const [storyText, setStoryText] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [hydratedContent, setHydratedContent] = useState(false);
  const [hydratedStory, setHydratedStory] = useState(false);
  const [hydratedPageId, setHydratedPageId] = useState<string | null>(null);

  const homePage = pages.find((p) => p.page_slug === '') ?? pages[0] ?? null;
  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? homePage;

  // Render-phase hydration: run once per data source / selected page so
  // cleared-and-saved fields stay cleared.
  if (heroContent && !hydratedContent) {
    setHydratedContent(true);
    setBrideName(heroContent.bride_name ?? '');
    setGroomName(heroContent.groom_name ?? '');
    setWeddingDate(heroContent.wedding_date ? heroContent.wedding_date.slice(0, 10) : '');
    setHeroTagline(heroContent.tagline ?? '');
  }
  if (storyContent && !hydratedStory) {
    setHydratedStory(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setStoryText((storyContent as any).story ?? '');
  }
  if (selectedPage && hydratedPageId !== selectedPage.id) {
    setHydratedPageId(selectedPage.id);
    setSelectedPageId(selectedPage.id);
    const template = getTemplate(selectedPage.template, selectedPage.kind);
    setTemplateId(template.id);
    setPaletteId(getPalette(selectedPage.palette).id);
    setSections(resolvePartSettings(template, selectedPage.config));
    setMusicUrl(selectedPage.config?.music_url ?? null);
    setMusicStartTime(selectedPage.config?.music_start_time ?? 0);
    setMusicEndTime(selectedPage.config?.music_end_time ?? DEFAULT_MUSIC_END);
    setQrEnabled(!!selectedPage.config?.qr_enabled);
    setQrStyle(selectedPage.config?.qr_style ?? DEFAULT_QR_DESIGN_ID);
    setGalleryLayout(selectedPage.config?.gallery_layout ?? DEFAULT_GALLERY_LAYOUT);
    setEffects(selectedPage.config?.effects ?? {});
    setTextOverrides(selectedPage.config?.text_overrides ?? {});
  }

  const kind: PageKind = selectedPage?.kind ?? 'website';
  const template = getTemplate(templateId, kind);
  const palette = getPalette(paletteId);

  const pageUrl = (page: PublicPageRecord) =>
    `${window.location.origin}/${slug}${page.page_slug ? `/${page.page_slug}` : ''}`;
  const siteUrlLabel = `${window.location.host}/${slug}${
    selectedPage?.page_slug ? `/${selectedPage.page_slug}` : ''
  }`;

  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setIsDirty(true);
  };

  // Inline-edit sink for the preview: content edits land in the same drafts as
  // the panel inputs (two-way sync for free); copy edits keep text_overrides
  // sparse — committing text equal to the default deletes the override.
  const editController: SiteEditController = {
    commitContent: (field, value) => {
      const setter = {
        brideName: setBrideName,
        groomName: setGroomName,
        tagline: setHeroTagline,
        story: setStoryText,
      }[field];
      markDirty(setter)(value);
    },
    commitCopy: (key, value) => {
      setTextOverrides((prev) => {
        const next = { ...prev };
        if (value === defaultForKey(key)) delete next[key];
        else next[key] = value;
        return next;
      });
      setIsDirty(true);
    },
  };

  // Sparse storage: picking a control's default deletes the key (same pattern
  // as text_overrides), so config.effects stays empty until customized.
  const setEffect = (control: EffectControl, choiceId: string) => {
    setEffects((prev) => {
      const next = { ...prev };
      if (choiceId === control.defaultId) delete next[control.id];
      else next[control.id] = choiceId;
      return next;
    });
    setIsDirty(true);
  };

  const clearOverride = (key: string) => {
    setTextOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setIsDirty(true);
  };

  // Unpublished edits shouldn't silently die with the tab
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const switchToPage = (page: PublicPageRecord) => {
    setSelectedPageId(page.id);
    setHydratedPageId(null);
    // Rehydrate shared content too — a discard is a full discard
    setHydratedContent(false);
    setHydratedStory(false);
    setIsDirty(false);
  };

  const requestSwitch = (page: PublicPageRecord) => {
    if (isDirty) setPendingSwitch(page);
    else switchToPage(page);
  };

  const selectTemplate = (id: string) => {
    const next = getTemplate(id, kind);
    setTemplateId(next.id);
    // Palette is an independent choice — keep it. Re-fit sections to the new
    // template's parts (saved order preserved where part ids overlap).
    setSections(resolvePartSettings(next, { sections_order: sections }));
    setIsDirty(true);
  };

  const handlePublish = async () => {
    if (!selectedPage) return;
    if (!brideName.trim() || !groomName.trim()) {
      toast.error('Add both names in the Content tab before publishing');
      setTab('content');
      return;
    }

    // Merge onto a *fresh* server copy — the cached blob can be minutes old
    // and would silently revert edits a partner made from another tab.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let freshHero: Record<string, any> = (heroContent as any) ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let freshStory: Record<string, any> = (storyContent as any) ?? {};
    try {
      [freshHero, freshStory] = await Promise.all([
        api.get('/website-content/hero').then((r) => r.data ?? {}),
        api.get('/website-content/story').then((r) => r.data ?? {}),
      ]);
    } catch {
      // offline refetch — fall back to the cached copies above
    }

    const previousMusicUrl = selectedPage.config?.music_url as string | undefined;

    // The hero blob stays the source of couple data, and mirrors the home
    // page's design as the legacy fallback for pre-pages clients.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heroPayload: Record<string, any> = {
      ...freshHero,
      tagline: heroTagline,
      bride_name: brideName,
      groom_name: groomName,
      wedding_date: weddingDate || null,
    };
    if (selectedPage.page_slug === '') {
      heroPayload.template = templateId;
      heroPayload.palette = paletteId;
      heroPayload.sections_order = sections;
      heroPayload.theme = ['royal', 'desert', 'mandala'].includes(paletteId)
        ? paletteId
        : (heroPayload.theme ?? 'royal');
      heroPayload.sections = Object.fromEntries(sections.map((s) => [s.id, s.enabled]));
    }

    const results = await Promise.allSettled([
      updatePage.mutateAsync({
        id: selectedPage.id,
        template: templateId,
        palette: paletteId,
        config: {
          ...selectedPage.config,
          sections_order: sections,
          music_url: musicUrl,
          music_start_time: musicStartTime,
          music_end_time: musicEndTime,
          qr_enabled: qrEnabled,
          qr_style: qrStyle,
          gallery_layout: galleryLayout,
          effects,
          text_overrides: textOverrides,
        },
      }),
      updateContent.mutateAsync({
        section: 'our_story',
        payload: { ...freshStory, story: storyText },
      }),
      updateContent.mutateAsync({ section: 'hero', payload: heroPayload }),
    ]);

    const failures = results.filter((r) => r.status === 'rejected').length;
    if (failures === 0) {
      toast.success(
        selectedPage.is_published
          ? `${selectedPage.title} published!`
          : `${selectedPage.title} saved — press the eye icon to take it live`,
      );
      setIsDirty(false);
      // A replaced uploaded soundtrack is now unreferenced — clean it up
      // (best effort; skip if any other page still points at it).
      if (
        previousMusicUrl &&
        previousMusicUrl !== musicUrl &&
        previousMusicUrl.includes('/music/') &&
        !pages.some((p) => p.id !== selectedPage.id && p.config?.music_url === previousMusicUrl)
      ) {
        api.delete('/website-content/music', { data: { url: previousMusicUrl } }).catch(() => {});
      }
    } else if (failures === results.length) {
      toast.error('Failed to publish changes');
    } else {
      // Partial writes happened — leave the dirty flag on so a retry re-sends everything
      toast.error('Some changes failed to save — publish again to retry');
    }
  };

  const handleEditPage = async (payload: { title: string; page_slug?: string }) => {
    if (!editingPage) return;
    try {
      await updatePage.mutateAsync({ id: editingPage.id, ...payload });
      toast.success('Page updated');
      setEditingPage(null);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Failed to update page');
    }
  };

  const handleCreatePage = async (payload: {
    kind: PageKind;
    title: string;
    page_slug: string;
  }) => {
    try {
      const templateDefault = templatesForKind(payload.kind)[0]!;
      const created = await createPage.mutateAsync({
        ...payload,
        template: templateDefault.id,
        palette: templateDefault.defaultPaletteId,
        config: {},
      });
      setShowAddPage(false);
      setSelectedPageId(created.id);
      setHydratedPageId(null); // rehydrate drafts from the new page
      toast.success(`${payload.title} created — pick its design and publish`);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Failed to create page');
    }
  };

  const handleDeletePage = async () => {
    if (!pendingDelete) return;
    try {
      await deletePage.mutateAsync(pendingDelete.id);
      if (selectedPageId === pendingDelete.id) {
        setSelectedPageId(null);
        setHydratedPageId(null);
      }
      toast.success(`${pendingDelete.title} deleted`);
    } catch {
      toast.error('Failed to delete page');
    } finally {
      setPendingDelete(null);
    }
  };

  const togglePublished = async (page: PublicPageRecord) => {
    try {
      await updatePage.mutateAsync({ id: page.id, is_published: !page.is_published });
      toast.success(page.is_published ? `${page.title} unpublished` : `${page.title} is live`);
    } catch {
      toast.error('Failed to update page');
    }
  };

  const handleMusicUpload = async (file: File) => {
    setUploadingMusic(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/website-content/music', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMusicUrl(res.data.url);
      setIsDirty(true);
      toast.success('Soundtrack uploaded — publish to make it live');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Failed to upload audio');
    } finally {
      setUploadingMusic(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const galleryImages = ((galleryContent as any)?.images ?? []) as { url: string }[];
  // Mirror the live renderer: an empty story disables its section instead of
  // showing placeholder prose the couple never wrote.
  const previewSections = storyText.trim()
    ? sections
    : sections.map((s) => (s.id === 'story' ? { ...s, enabled: false } : s));

  const previewData: SiteData = {
    slug: slug ?? '',
    brideName: brideName || 'Bride',
    groomName: groomName || 'Groom',
    weddingDate: weddingDate ? parseLocalDate(weddingDate) : null,
    tagline: heroTagline,
    story: storyText,
    events: publicEvents,
    galleryImages,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gallerySubtitle: (galleryContent as any)?.subtitle ?? '',
    galleryLayout,
    effects,
    sections: previewSections,
    palette,
    pages: pages
      .filter((p) => p.id !== selectedPage?.id && p.is_published)
      .map((p) => ({ pageSlug: p.page_slug, kind: p.kind, title: p.title })),
    musicUrl,
    musicStartTime,
    musicEndTime,
    qrCode: selectedPage ? { enabled: qrEnabled, style: qrStyle, url: pageUrl(selectedPage) } : undefined,
    // The preview is the guest's-eye view — never show couple-only chrome
    authed: false,
    preview: true,
  };

  // Why a toggled-on section may still show nothing — surfaced in Sections
  const sectionNote = (id: PartId): string | null => {
    switch (id) {
      case 'countdown': {
        if (!weddingDate) return 'Needs a wedding date — set one in Content';
        const target = parseLocalDate(weddingDate);
        if (target && target.getTime() < Date.now() - 24 * 60 * 60 * 1000)
          return 'Hidden — the wedding date has passed';
        return null;
      }
      case 'events':
        return publicEvents.length === 0 ? 'No public events yet — mark events public in Events' : null;
      case 'gallery':
        return galleryImages.length === 0 ? 'No photos yet — add some in Gallery' : null;
      case 'story':
        return !storyText.trim() ? 'Story is empty — write it in Content' : null;
      default:
        return null;
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'design', label: 'Design' },
    { id: 'content', label: 'Content' },
  ];

  return (
    <div className="studio">
      {/* ── Toolbar: pages · url · device · actions ─────────────────────── */}
      <div className="studio-toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
          {pages.map((page) => {
            const active = selectedPage?.id === page.id;
            return (
              <div
                key={page.id}
                role="button"
                tabIndex={0}
                title={`${window.location.host}/${slug}${page.page_slug ? `/${page.page_slug}` : ''}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => {
                  if (!active) requestSwitch(page);
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !active) {
                    e.preventDefault();
                    requestSwitch(page);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '5px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: active ? '1.5px solid var(--gold)' : '1px solid var(--line-soft)',
                  background: active ? 'var(--gold-glow)' : 'var(--bg-raised)',
                  transition: 'all 150ms',
                }}
              >
                <span
                  title={page.is_published ? 'Live' : 'Unpublished'}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: page.is_published ? '#22c55e' : 'var(--line-strong)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--ink-high)' : 'var(--ink-mid)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {page.title}
                </span>
                {active && (
                  <span style={{ display: 'flex', gap: 2, marginLeft: 2 }}>
                    {page.page_slug !== '' && (
                      <button
                        title={page.is_published ? 'Unpublish' : 'Publish'}
                        aria-label={page.is_published ? `Unpublish ${page.title}` : `Publish ${page.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Taking a live page down deserves a confirm; going live doesn't
                          if (page.is_published) setPendingUnpublish(page);
                          else void togglePublished(page);
                        }}
                        style={{ padding: 4, borderRadius: 4, color: 'var(--ink-dim)', display: 'flex' }}
                      >
                        {page.is_published ? (
                          <HiOutlineEye style={{ width: 13, height: 13 }} />
                        ) : (
                          <HiOutlineEyeOff style={{ width: 13, height: 13 }} />
                        )}
                      </button>
                    )}
                    <button
                      title="Rename page"
                      aria-label={`Rename ${page.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPage(page);
                      }}
                      style={{ padding: 4, borderRadius: 4, color: 'var(--ink-dim)', display: 'flex' }}
                    >
                      <HiOutlinePencil style={{ width: 13, height: 13 }} />
                    </button>
                    {page.page_slug !== '' && (
                      <button
                        title="Delete page"
                        aria-label={`Delete ${page.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(page);
                        }}
                        style={{ padding: 4, borderRadius: 4, color: 'var(--ink-dim)', display: 'flex' }}
                      >
                        <HiOutlineTrash style={{ width: 13, height: 13 }} />
                      </button>
                    )}
                  </span>
                )}
              </div>
            );
          })}
          <button
            onClick={() => setShowAddPage(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 9px',
              borderRadius: 8,
              fontSize: 12,
              border: '1px dashed var(--line)',
              color: 'var(--ink-low)',
              background: 'transparent',
              whiteSpace: 'nowrap',
            }}
          >
            <HiOutlinePlus style={{ width: 13, height: 13 }} />
            Page
          </button>
          {pagesLoading && <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>Loading…</span>}
        </div>

        {/* Current page address — wide screens only */}
        <div
          className="mono hidden xl:block"
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--ink-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedPage ? `${siteUrlLabel} · ${template.name} · ${palette.name}` : ''}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {/* Device toggle */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              padding: 3,
              background: 'var(--bg-raised)',
              borderRadius: 8,
              border: '1px solid var(--line-soft)',
            }}
          >
            {(
              [
                { id: 'mobile', icon: HiOutlineDeviceMobile, label: 'Mobile preview' },
                { id: 'desktop', icon: HiOutlineDesktopComputer, label: 'Desktop preview' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                aria-label={d.label}
                title={d.label}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  display: 'flex',
                  background: device === d.id ? 'var(--bg-panel)' : 'transparent',
                  color: device === d.id ? 'var(--gold-deep)' : 'var(--ink-dim)',
                  boxShadow: device === d.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 150ms',
                }}
              >
                <d.icon style={{ width: 15, height: 15 }} />
              </button>
            ))}
          </div>

          {selectedPage && (
            <>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(pageUrl(selectedPage));
                    toast.success('Link copied!');
                  } catch {
                    toast.error("Couldn't copy the link — your browser blocked clipboard access");
                  }
                }}
                title="Copy link"
                aria-label="Copy link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  color: 'var(--ink-mid)',
                  background: 'transparent',
                }}
              >
                <HiOutlineLink style={{ width: 14, height: 14 }} />
              </button>
              <a
                href={pageUrl(selectedPage)}
                target="_blank"
                rel="noopener noreferrer"
                title={selectedPage.is_published ? 'Open live' : 'Not live yet'}
                aria-label="Open live"
                onClick={(e) => {
                  if (!selectedPage.is_published) {
                    e.preventDefault();
                    toast("This page isn't live yet — publish it with the eye icon first");
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  color: 'var(--ink-mid)',
                  background: 'transparent',
                }}
              >
                <HiOutlineExternalLink style={{ width: 14, height: 14 }} />
              </a>
              <a
                href={`${pageUrl(selectedPage)}?print=1`}
                target="_blank"
                rel="noopener noreferrer"
                title={selectedPage.is_published ? 'Print page' : 'Publish it first to print'}
                aria-label="Print page"
                onClick={(e) => {
                  if (!selectedPage.is_published) {
                    e.preventDefault();
                    toast("This page isn't live yet — publish it with the eye icon first");
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  color: 'var(--ink-mid)',
                  background: 'transparent',
                }}
              >
                <HiOutlinePrinter style={{ width: 14, height: 14 }} />
              </a>
            </>
          )}

          <button
            onClick={handlePublish}
            disabled={updateContent.isPending || updatePage.isPending || !selectedPage}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              padding: '7px 14px',
              opacity: updateContent.isPending || updatePage.isPending ? 0.6 : 1,
              position: 'relative',
            }}
          >
            <HiOutlineSparkles style={{ width: 14, height: 14 }} />
            {updateContent.isPending || updatePage.isPending ? 'Publishing…' : 'Publish'}
            {isDirty && !updateContent.isPending && !updatePage.isPending && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#f97316',
                  border: '1.5px solid white',
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* ── Canvas + config panel ───────────────────────────────────────── */}
      <div className="studio-body">
        <div className="studio-canvas">
          {selectedPage ? (
            <PreviewCanvas
              data={previewData}
              templateId={templateId}
              kind={kind}
              device={device}
              overrides={textOverrides}
              edit={editController}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              {pagesLoading ? (
                <span style={{ fontSize: 13, color: 'var(--ink-dim)' }}>Loading pages…</span>
              ) : (
                <>
                  <span style={{ fontSize: 13, color: 'var(--ink-low)' }}>
                    No pages yet — create your first one.
                  </span>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 13 }}
                    onClick={() => setShowAddPage(true)}
                  >
                    Add a page
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <aside className="studio-panel no-print">
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              padding: 12,
              background: 'var(--bg-panel)',
              borderBottom: '1px solid var(--line-soft)',
            }}
          >
            <div
              role="tablist"
              aria-label="Page settings"
              style={{
                display: 'flex',
                gap: 4,
                padding: 4,
                background: 'var(--bg-raised)',
                borderRadius: 10,
                border: '1px solid var(--line-soft)',
              }}
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    borderRadius: 7,
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    background: tab === t.id ? 'var(--bg-panel)' : 'transparent',
                    color: tab === t.id ? 'var(--ink-high)' : 'var(--ink-dim)',
                    boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 150ms',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {tab === 'design' && (
              <DesignPanel
                kind={kind}
                templateId={templateId}
                onSelectTemplate={selectTemplate}
                paletteId={paletteId}
                onSelectPalette={markDirty(setPaletteId)}
                recommendedPaletteIds={template.recommendedPaletteIds}
                galleryLayout={galleryLayout}
                onGalleryLayout={markDirty(setGalleryLayout)}
                showGalleryLayout={
                  !!template.supportsGalleryLayout &&
                  template.parts.some((part) => part.id === 'gallery')
                }
                effectControls={template.effectControls ?? []}
                effects={effects}
                onEffect={setEffect}
              />
            )}

            {tab === 'content' && (
              <ContentPanel
                template={template}
                sections={sections}
                onSectionsChange={markDirty(setSections)}
                sectionNote={sectionNote}
                slug={slug}
                brideName={brideName}
                onBrideName={markDirty(setBrideName)}
                groomName={groomName}
                onGroomName={markDirty(setGroomName)}
                weddingDate={weddingDate}
                onWeddingDate={markDirty(setWeddingDate)}
                heroTagline={heroTagline}
                onHeroTagline={markDirty(setHeroTagline)}
                storyText={storyText}
                onStoryText={markDirty(setStoryText)}
                musicUrl={musicUrl}
                musicStartTime={musicStartTime}
                musicEndTime={musicEndTime}
                uploadingMusic={uploadingMusic}
                onMusicUpload={(file) => {
                  setMusicStartTime(0);
                  setMusicEndTime(DEFAULT_MUSIC_END);
                  void handleMusicUpload(file);
                }}
                onMusicRemove={() => {
                  setMusicUrl(null);
                  setMusicStartTime(0);
                  setMusicEndTime(DEFAULT_MUSIC_END);
                  setIsDirty(true);
                }}
                onMusicRange={(start, end) => {
                  setMusicStartTime(start);
                  setMusicEndTime(end);
                  setIsDirty(true);
                }}
                qrEnabled={qrEnabled}
                onQrEnabled={markDirty(setQrEnabled)}
                qrStyle={qrStyle}
                onQrStyle={markDirty(setQrStyle)}
                qrUrl={selectedPage ? pageUrl(selectedPage) : window.location.origin}
                siteUrlLabel={siteUrlLabel}
                palette={palette}
                textOverrides={textOverrides}
                onClearOverride={clearOverride}
                onClearAllOverrides={() => {
                  setTextOverrides({});
                  setIsDirty(true);
                }}
              />
            )}
          </div>
        </aside>
      </div>

      {showAddPage && (
        <AddPageDialog
          existingSlugs={pages.map((p) => p.page_slug)}
          onClose={() => setShowAddPage(false)}
          onCreate={(payload) => void handleCreatePage(payload)}
          creating={createPage.isPending}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          open
          title={`Delete "${pendingDelete.title}"?`}
          message={`Guests will no longer be able to open /${slug}/${pendingDelete.page_slug}. This can't be undone.`}
          confirmLabel="Delete page"
          onConfirm={() => void handleDeletePage()}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {pendingSwitch && (
        <ConfirmDialog
          open
          title="Discard unpublished changes?"
          message={`You have edits that aren't published yet. Switching to "${pendingSwitch.title}" will discard them.`}
          confirmLabel="Discard and switch"
          onConfirm={() => {
            switchToPage(pendingSwitch);
            setPendingSwitch(null);
          }}
          onCancel={() => setPendingSwitch(null)}
        />
      )}

      {pendingUnpublish && (
        <ConfirmDialog
          open
          title={`Take "${pendingUnpublish.title}" offline?`}
          message={`Guests opening ${window.location.host}/${slug}${pendingUnpublish.page_slug ? `/${pendingUnpublish.page_slug}` : ''} will see a "not published" page until you publish it again.`}
          confirmLabel="Unpublish"
          onConfirm={() => {
            void togglePublished(pendingUnpublish);
            setPendingUnpublish(null);
          }}
          onCancel={() => setPendingUnpublish(null)}
        />
      )}

      {editingPage && (
        <EditPageDialog
          page={editingPage}
          existingSlugs={pages.filter((p) => p.id !== editingPage.id).map((p) => p.page_slug)}
          onClose={() => setEditingPage(null)}
          onSave={(payload) => void handleEditPage(payload)}
          saving={updatePage.isPending}
        />
      )}
    </div>
  );
}
