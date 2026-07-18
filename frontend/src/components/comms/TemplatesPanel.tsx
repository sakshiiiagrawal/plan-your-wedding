import toast from 'react-hot-toast';
import { HiOutlineRefresh } from 'react-icons/hi';
import { useCommsTemplates, useSyncTemplates, type CommsTemplate } from '../../hooks/useApi';
import { Pill } from '../ui';
import { STATUS_VARIANT, WA_LIGHT, WA_GREEN } from './shared';

export function TemplateCard({
  tpl,
  selected,
  onSelect,
}: {
  tpl: CommsTemplate;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={!onSelect}
      className={`card w-full text-left transition-all ${
        selected ? 'ring-2 ring-[#128C7E]' : onSelect ? 'hover:bg-surface-raised' : ''
      }`}
      style={{ padding: 16, cursor: onSelect ? 'pointer' : 'default' }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-high">{tpl.name}</span>
        <Pill variant={STATUS_VARIANT[tpl.status] ?? 'muted'}>{tpl.status}</Pill>
      </div>
      <p className="mb-2 text-[13px] leading-snug text-ink-mid">{tpl.body}</p>
      {tpl.buttons.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tpl.buttons.map((b) => (
            <span
              key={b}
              className="rounded-full border px-2.5 py-0.5 text-[11px]"
              style={{ borderColor: `${WA_LIGHT}80`, color: WA_GREEN }}
            >
              {b}
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-ink-low">{tpl.description}</p>
    </button>
  );
}

/** Read-only template roster + Meta sync — an admin concern, tucked in a tab. */
export default function TemplatesPanel() {
  const templates = useCommsTemplates();
  const syncTemplates = useSyncTemplates();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] leading-relaxed text-ink-low">
          Meta must approve every template before it can be sent. Sync pushes the app&rsquo;s
          template catalog to your WhatsApp Business account.
        </p>
        <button
          onClick={() =>
            syncTemplates.mutate(undefined, {
              onSuccess: (r: { created: string[] }) =>
                toast.success(
                  r.created.length > 0
                    ? `Created: ${r.created.join(', ')} (pending Meta approval)`
                    : 'All templates already exist',
                ),
              onError: () => toast.error('Template sync failed'),
            })
          }
          disabled={syncTemplates.isPending}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-sm text-ink-mid transition-colors hover:bg-surface-raised"
        >
          <HiOutlineRefresh
            className={`h-4 w-4 ${syncTemplates.isPending ? 'animate-spin' : ''}`}
          />
          Sync templates
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(templates.data ?? []).map((t) => (
          <TemplateCard key={t.name} tpl={t} />
        ))}
        {templates.isLoading && <p className="text-sm text-ink-low">Loading templates…</p>}
        {templates.isError && (
          <p className="text-sm text-ink-low">Couldn&rsquo;t load templates.</p>
        )}
      </div>
    </div>
  );
}
