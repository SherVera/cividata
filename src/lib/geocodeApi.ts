import { roundGeo } from './geo';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '6');
  url.searchParams.set('addressdetails', '0');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'es',
    },
  });

  if (!response.ok) {
    throw new Error('No se pudo buscar la ubicación.');
  }

  const data = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return data.map((item) => {
    const coords = roundGeo(parseFloat(item.lat), parseFloat(item.lon));
    return {
      lat: coords.lat,
      lng: coords.lng,
      displayName: item.display_name,
    };
  });
}
