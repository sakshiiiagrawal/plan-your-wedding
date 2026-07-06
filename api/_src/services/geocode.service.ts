// Geocode proxy service — plug-in provider chain: Google Places (New) is
// tried first when configured, then Mappls (MapmyIndia), falling through to
// Photon (OSM, free/no-key) as the final resort.
//
// Google Places (New) Autocomplete does not return coordinates or photos —
// only a place_id + label. Callers must follow up with getGooglePlaceDetails()
// once the user picks a suggestion to resolve lat/long and (optionally) a
// photo URL. Mappls/Photon return full coordinates inline, unchanged.

const MAPPLS_TOKEN_URL = 'https://outpost.mappls.com/api/security/oauth/token';
const MAPPLS_SEARCH_URL = 'https://atlas.mappls.com/api/places/search/json';
const PHOTON_URL = 'https://photon.komoot.io/api/';
const GOOGLE_API_ROOT = 'https://places.googleapis.com/v1';
const GOOGLE_AUTOCOMPLETE_URL = `${GOOGLE_API_ROOT}/places:autocomplete`;
const GOOGLE_PLACES_BASE_URL = `${GOOGLE_API_ROOT}/places`;

export interface GeocodeSuggestion {
  label: string;
  sublabel: string | null;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
}

export interface PlaceDetails {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  formatted_address: string | null;
  photo_url: string | null;
}

// ---------------------------------------------------------------------------
// Google Places (New) autocomplete
// ---------------------------------------------------------------------------

interface GooglePlacePrediction {
  placePrediction?: {
    placeId: string;
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
    text?: { text?: string };
  };
}

async function searchGoogle(
  query: string,
  apiKey: string,
  sessionToken?: string,
): Promise<GeocodeSuggestion[]> {
  const res = await fetch(GOOGLE_AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify({ input: query, ...(sessionToken ? { sessionToken } : {}) }),
  });
  if (!res.ok) throw new Error(`Google Places autocomplete error: ${res.status}`);
  const data = (await res.json()) as { suggestions?: GooglePlacePrediction[] };

  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<GooglePlacePrediction['placePrediction']> => p != null)
    .map((p) => ({
      label: p.structuredFormat?.mainText?.text ?? p.text?.text ?? 'Unknown',
      sublabel: p.structuredFormat?.secondaryText?.text ?? null,
      place_id: p.placeId,
      // Autocomplete (New) doesn't return geometry — resolved via
      // getGooglePlaceDetails() once the user picks a suggestion.
      latitude: null,
      longitude: null,
      city: null,
    }));
}

interface GooglePlaceDetailsResponse {
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: { longText?: string; types?: string[] }[];
  photos?: { name?: string }[];
}

async function fetchGooglePhotoUrl(photoName: string, apiKey: string): Promise<string | null> {
  try {
    const url = `${GOOGLE_API_ROOT}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`;
    const res = await fetch(url, { headers: { 'X-Goog-Api-Key': apiKey } });
    if (!res.ok) return null;
    const data = (await res.json()) as { photoUri?: string };
    return data.photoUri ?? null;
  } catch (err) {
    console.warn('[geocode] Google photo fetch failed:', (err as Error).message);
    return null;
  }
}

function pickGoogleCity(components: GooglePlaceDetailsResponse['addressComponents']): string | null {
  if (!components) return null;
  const byType = (type: string) => components.find((c) => c.types?.includes(type))?.longText;
  return (
    byType('locality') ??
    byType('administrative_area_level_2') ??
    byType('administrative_area_level_1') ??
    null
  );
}

export async function getGooglePlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceDetails> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not configured');

  const params = new URLSearchParams();
  if (sessionToken) params.set('sessionToken', sessionToken);
  const url = `${GOOGLE_PLACES_BASE_URL}/${encodeURIComponent(placeId)}${params.size ? `?${params}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'formattedAddress,location,addressComponents,photos',
    },
  });
  if (!res.ok) throw new Error(`Google Places details error: ${res.status}`);
  const data = (await res.json()) as GooglePlaceDetailsResponse;

  const photoName = data.photos?.[0]?.name;
  const photo_url = photoName ? await fetchGooglePhotoUrl(photoName, apiKey) : null;

  return {
    latitude: data.location?.latitude ?? null,
    longitude: data.location?.longitude ?? null,
    city: pickGoogleCity(data.addressComponents),
    formatted_address: data.formattedAddress ?? null,
    photo_url,
  };
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
    const line1 = [p.name, [p.housenumber, p.street].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(' · ');
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

export async function searchPlaces(
  query: string,
  sessionToken?: string,
): Promise<{
  results: GeocodeSuggestion[];
  provider: 'google' | 'mappls' | 'photon';
}> {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (googleApiKey) {
    try {
      const results = await searchGoogle(query, googleApiKey, sessionToken);
      return { results, provider: 'google' };
    } catch (err) {
      console.warn('[geocode] Google Places failed, falling back:', (err as Error).message);
    }
  }

  const clientId = process.env.MAPPLS_CLIENT_ID;
  const clientSecret = process.env.MAPPLS_CLIENT_SECRET;

  if (clientId) {
    try {
      // Use OAuth2 when secret is present; otherwise treat client_id as a
      // static REST key (also accepted by Mappls as a bearer token).
      const token = clientSecret ? await getMappplsToken(clientId, clientSecret) : clientId;
      const results = await searchMappls(query, token);
      return { results, provider: 'mappls' };
    } catch (err) {
      console.warn('[geocode] Mappls failed, falling back to Photon:', (err as Error).message);
    }
  }

  const results = await searchPhoton(query);
  return { results, provider: 'photon' };
}
