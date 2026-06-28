/** Coordenadas aproximadas (~100 m) para no guardar ubicación exacta. */
export function roundGeo(lat: number, lng: number, decimals = 3): { lat: number; lng: number } {
  const factor = 10 ** decimals;
  return {
    lat: Math.round(lat * factor) / factor,
    lng: Math.round(lng * factor) / factor,
  };
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export const DEFAULT_MAP_CENTER = { lat: 10.4806, lng: -66.9036 };

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoNamedPoint extends GeoPoint {
  id: string;
  name: string;
}

export function findNearest<T extends GeoPoint>(
  lat: number,
  lng: number,
  points: T[]
): { item: T; distanceM: number } | null {
  if (points.length === 0) return null;
  let best: { item: T; distanceM: number } | null = null;
  for (const item of points) {
    const distanceM = haversineMeters(lat, lng, item.lat, item.lng);
    if (!best || distanceM < best.distanceM) {
      best = { item, distanceM };
    }
  }
  return best;
}
