import { useCommsChannels } from '../../hooks/useApi';

/** Shown when the messaging channel's env vars are missing on the server. */
export default function SetupBanner() {
  const channels = useCommsChannels();
  const wa = channels.data?.find((c) => c.channel === 'whatsapp');
  if (!wa || wa.configured) return null;
  return (
    <div
      className="card border-amber-300 bg-amber-50 text-sm text-amber-800"
      style={{ padding: 14 }}
    >
      {wa.config_hint}
    </div>
  );
}
