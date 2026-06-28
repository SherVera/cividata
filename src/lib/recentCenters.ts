const STORAGE_KEY = 'censo_recent_centers_v1';
const MAX_RECENT = 3;

export function getRecentCenterIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function recordRecentCenter(centerId: string): void {
  if (!centerId) return;
  const next = [centerId, ...getRecentCenterIds().filter((id) => id !== centerId)].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
