// Geocode an address string using Nominatim (free, no API key required).
// Rate-limited to 1 req/s per Nominatim policy.
// Falls back to null when no result is found.

let lastGeocodedAt = 0;

export interface LatLng {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  // Enforce Nominatim 1 req/s
  const now = Date.now();
  const wait = 1100 - (now - lastGeocodedAt);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastGeocodedAt = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=ar&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'corredor-tokko-importer/0.1' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!data.length || !first) return null;
    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
  } catch {
    return null;
  }
}
