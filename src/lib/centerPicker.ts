import type { CollectionCenter } from './collectionCentersApi';

export function resolveRecentCenters(
  recentIds: string[],
  centers: CollectionCenter[]
): CollectionCenter[] {
  return recentIds
    .map((id) => centers.find((center) => center.id === id))
    .filter((center): center is CollectionCenter => !!center && center.active);
}

/** Lista para el desplegable: recientes primero; con búsqueda, coincidencias recientes arriba. */
export function buildCenterSearchList(
  centers: CollectionCenter[],
  recentIds: string[],
  query: string
): CollectionCenter[] {
  const active = centers.filter((center) => center.active);
  const q = query.trim().toLowerCase();

  if (!q) {
    return resolveRecentCenters(recentIds, active);
  }

  const matches = active.filter(
    (center) =>
      center.name.toLowerCase().includes(q) ||
      (center.address || '').toLowerCase().includes(q)
  );

  const recentSet = new Set(recentIds);
  const recentMatches = recentIds
    .map((id) => matches.find((center) => center.id === id))
    .filter((center): center is CollectionCenter => !!center);
  const otherMatches = matches.filter((center) => !recentSet.has(center.id));

  return [...recentMatches, ...otherMatches];
}

export function isRecentCenter(centerId: string, recentIds: string[]): boolean {
  return recentIds.includes(centerId);
}
