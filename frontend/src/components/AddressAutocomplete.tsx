import { useEffect, useRef, useState } from 'react';
import { HiOutlineLocationMarker } from 'react-icons/hi';
import api from '../api/axios';

export interface PlaceSelection {
  address: string;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
}

interface GeocodeSuggestion {
  label: string;
  sublabel: string | null;
  place_id: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
}

interface Props {
  value: string;
  onChange: (next: PlaceSelection) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Detects lat/lng in a Google Maps URL (or plain "lat,lng") pasted by the user.
// Handles:
//   https://www.google.com/maps/place/Name/@28.6139,77.2090,15z
//   https://maps.google.com/?q=28.6139,77.2090
//   ...!3d28.6139!4d77.2090...
//   28.6139, 77.2090 (plain coords)
// Short links (maps.app.goo.gl / goo.gl/maps) can't be expanded from the
// browser due to CORS on redirects — we show a hint for those.
export function extractCoordsFromText(text: string): { lat: number; lng: number } | null {
  if (!text) return null;
  const patterns: RegExp[] = [
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /[?&](?:q|ll|center|destination|daddr|saddr|query)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
    /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const lat = parseFloat(m[1]!);
      const lng = parseFloat(m[2]!);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        return { lat, lng };
      }
    }
  }
  return null;
}

function isGoogleShortLink(text: string): boolean {
  return /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/\S+/i.test(text);
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing an address…',
  required,
  disabled,
  className,
}: Props) {
  const [input, setInput] = useState(value);
  const [results, setResults] = useState<GeocodeSuggestion[]>([]);
  const [provider, setProvider] = useState<'mappls' | 'photon' | 'none'>('none');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const justSelectedRef = useRef(false);
  // Only run the network search when the user is actively typing — prevents
  // dropdown from auto-opening on remount / tab switch / prop sync.
  const userTypingRef = useRef(false);

  // Sync from parent only when the value genuinely changes externally (e.g.,
  // edit modal opens with a pre-filled address). Skip on the round-trip echo
  // caused by our own onChange → parent state update → prop re-render.
  useEffect(() => {
    if (value === input) return;
    setInput(value);
    userTypingRef.current = false;
    setOpen(false);
    setResults([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (!userTypingRef.current) return;

    const query = input.trim();
    if (query.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      abortCtrlRef.current?.abort();
      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;
      setLoading(true);

      api
        .get<{ results: GeocodeSuggestion[]; provider: 'mappls' | 'photon' }>(
          `/geocode/search?q=${encodeURIComponent(query)}`,
          { signal: ctrl.signal },
        )
        .then(({ data }) => {
          setResults(data.results);
          setProvider(data.provider);
          setOpen(true);
          setHighlight(0);
        })
        .catch((err: { name?: string }) => {
          if (err?.name !== 'CanceledError' && err?.name !== 'AbortError') setResults([]);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const selectSuggestion = (s: GeocodeSuggestion) => {
    const address = [s.label, s.sublabel].filter(Boolean).join(', ');
    justSelectedRef.current = true;
    setInput(address);
    setOpen(false);
    setResults([]);
    onChange({
      address,
      place_id: s.place_id,
      latitude: s.latitude,
      longitude: s.longitude,
      city: s.city,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      const picked = results[highlight];
      if (picked) {
        e.preventDefault();
        selectSuggestion(picked);
      }
    } else if (e.key === 'Escape') setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    userTypingRef.current = true;
    setInput(next);

    // When the user pastes a Google Maps URL or raw lat,lng, extract the
    // coordinates directly — no geocoding needed.
    const coords = extractCoordsFromText(next);
    if (coords) {
      userTypingRef.current = false;
      setOpen(false);
      setResults([]);
      onChange({
        address: next,
        place_id: null,
        latitude: coords.lat,
        longitude: coords.lng,
        city: null,
      });
      return;
    }

    onChange({ address: next, place_id: null, latitude: null, longitude: null, city: null });
  };

  const attribution =
    provider === 'mappls'
      ? 'Powered by Mappls © MapmyIndia'
      : 'Results © OpenStreetMap contributors';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <HiOutlineLocationMarker
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 14,
            height: 14,
            color: 'var(--gold)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onFocus={() => {
            if (userTypingRef.current && results.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={className || 'input'}
          style={{ paddingLeft: 30 }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
        />
      </div>

      {isGoogleShortLink(input) && (
        <span
          style={{ fontSize: 10, color: 'var(--warn, #b45309)', display: 'block', marginTop: 4 }}
        >
          Short Google Maps links can&apos;t be expanded here. Open the link in a browser, copy the
          full URL from the address bar, and paste that instead.
        </span>
      )}

      {open && (results.length > 0 || loading) && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--bg-panel)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {loading && results.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink-dim)' }}>
              Searching…
            </div>
          )}
          {results.map((s, idx) => {
            const active = idx === highlight;
            return (
              <button
                key={`${s.place_id ?? idx}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s);
                }}
                onMouseEnter={() => setHighlight(idx)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 13,
                  border: 'none',
                  background: active ? 'var(--gold-glow)' : 'transparent',
                  color: 'var(--ink-high)',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                <div style={{ fontWeight: 500 }}>{s.label}</div>
                {s.sublabel && (
                  <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 2 }}>
                    {s.sublabel}
                  </div>
                )}
              </button>
            );
          })}
          <div
            style={{
              padding: '6px 12px',
              fontSize: 10,
              color: 'var(--ink-dim)',
              borderTop: '1px solid var(--line-soft)',
              background: 'var(--bg-raised)',
            }}
          >
            {attribution}
          </div>
        </div>
      )}
    </div>
  );
}

export function buildMapsUrl(opts: {
  place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): string | null {
  // Only Google place_ids (not osm:/mappls: prefixed ones) work with query_place_id.
  const googlePlaceId =
    opts.place_id && !opts.place_id.startsWith('osm:') && !opts.place_id.startsWith('mappls:')
      ? opts.place_id
      : null;

  if (opts.latitude != null && opts.longitude != null) {
    const coords = `${opts.latitude},${opts.longitude}`;
    const base = `https://www.google.com/maps/search/?api=1&query=${coords}`;
    return googlePlaceId ? `${base}&query_place_id=${encodeURIComponent(googlePlaceId)}` : base;
  }
  if (googlePlaceId)
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(googlePlaceId)}`;
  if (opts.address)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opts.address)}`;
  return null;
}
