// Mappls (MapmyIndia) geocode proxy service.
// Auth flow: OAuth2 client_credentials when both CLIENT_ID + CLIENT_SECRET are
// set; otherwise treats CLIENT_ID as a static bearer key (also valid for
// Mappls REST API keys issued from the console).
// Falls through to Photon (OSM) when Mappls isn't configured.

const MAPPLS_TOKEN_URL = 'https://outpost.mappls.com/api/security/oauth/token';
const MAPPLS_SEARCH_URL = 'https://atlas.mappls.com/api/places/search/json';
const PHOTON_URL = 'https://photon.komoot.io/api/';

export interface GeocodeSuggestion {
  label: string;
  sublabel: string | null;
  place_id: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
}

// ---------------------------------------------------------------------------
// Mappls OAuth2 token cache
// ---------------------------------------------------------------------------

interface TokenCache {
  token: string;
  expiresAt: number; // ms epoch
}

let tokenCache: TokenCache | null = null;

async function getMappplsToken(clientId: string, clientSecret: string): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(MAPPLS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Mappls token error: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.token;
}

// ---------------------------------------------------------------------------
// Mappls place search
// ---------------------------------------------------------------------------

interface MapplsResult {
  eLoc?: string;
  placeAddress?: string;
  placeName?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  district?: string;
  state?: string;
  type?: string;
  orderIndex?: number;
}

async function searchMappls(query: string, bearerToken: string): Promise<GeocodeSuggestion[]> {
  const url = `${MAPPLS_SEARCH_URL}?query=${encodeURIComponent(query)}&region=IND&pod=CITY&bridge=true&tokenizeAddress=true`;
  const res = await fetch(url, {
    headers: { Authorization: `bearer ${bearerToken}` },
  });
  if (!res.ok) throw new Error(`Mappls search error: ${res.status}`);
  const data = (await res.json()) as {
    suggestedLocations?: MapplsResult[];
    userAddedLocations?: MapplsResult[];
  };

  const locations: MapplsResult[] = [
    ...(data.suggestedLocations ?? []),
    ...(data.userAddedLocations ?? []),
  ];

  return locations
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      label: l.placeName ?? l.placeAddress ?? 'Unknown',
      sublabel: l.placeAddress !== l.placeName ? (l.placeAddress ?? null) : null,
      place_id: l.eLoc ? `mappls:${l.eLoc}` : null,
      latitude: l.latitude!,
      longitude: l.longitude!,
      city: l.city ?? l.district ?? null,
    }));
}

// ---------------------------------------------------------------------------
// Photon (OSM) fallback
// ---------------------------------------------------------------------------

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
  };
}

async function searchPhoton(query: string): Promise<GeocodeSuggestion[]> {
  const url = `${PHOTON_URL}?q=${encodeURIComponent(query)}&limit=6&lang=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Photon error: ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).map((f) => {
    const p = f.properties;
    const line1 = [p.name, [p.housenumber, p.street].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    const line2 = [p.district, p.city, p.state, p.country].filter(Boolean).join(', ');
    const [lon, lat] = f.geometry.coordinates;
    return {
      label: line1 || p.name || 'Unknown',
      sublabel: line2 || null,
      place_id: p.osm_type && p.osm_id != null ? `osm:${p.osm_type}/${p.osm_id}` : null,
      latitude: lat,
      longitude: lon,
      city: p.city ?? p.district ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function searchPlaces(query: string): Promise<{
  results: GeocodeSuggestion[];
  provider: 'mappls' | 'photon';
}> {
  const clientId = process.env.MAPPLS_CLIENT_ID;
  const clientSecret = process.env.MAPPLS_CLIENT_SECRET;

  if (clientId) {
    try {
      // Use OAuth2 when secret is present; otherwise treat client_id as a
      // static REST key (also accepted by Mappls as a bearer token).
      const token = clientSecret
        ? await getMappplsToken(clientId, clientSecret)
        : clientId;
      const results = await searchMappls(query, token);
      return { results, provider: 'mappls' };
    } catch (err) {
      console.warn('[geocode] Mappls failed, falling back to Photon:', (err as Error).message);
    }
  }

  const results = await searchPhoton(query);
  return { results, provider: 'photon' };
}
