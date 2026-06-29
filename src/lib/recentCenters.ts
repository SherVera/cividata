const STORAGE_KEY_V1 = 'censo_recent_centers_v1';
const STORAGE_KEY = 'censo_recent_centers_v2';
const MAX_RECENT = 3;
const MAX_STORED = 20;

export type RecentCenterRecord = {
  id: string;
  uses: number;
  lastUsedAt: number;
};

function rankRecords(records: RecentCenterRecord[]): RecentCenterRecord[] {
  return [...records].sort((a, b) => b.uses - a.uses || b.lastUsedAt - a.lastUsedAt);
}

function loadRecords(): RecentCenterRecord[] {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (!Array.isArray(parsed)) return [];
      return rankRecords(
        parsed.filter(
          (entry): entry is RecentCenterRecord =>
            !!entry &&
            typeof entry === 'object' &&
            typeof entry.id === 'string' &&
            typeof entry.uses === 'number' &&
            typeof entry.lastUsedAt === 'number'
        )
      );
    }

    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (!rawV1) return [];

    const ids = JSON.parse(rawV1);
    if (!Array.isArray(ids)) return [];

    const migrated = ids
      .filter((id): id is string => typeof id === 'string' && !!id)
      .map((id, index) => ({
        id,
        uses: 1,
        lastUsedAt: Date.now() - index,
      }));

    saveRecords(migrated);
    localStorage.removeItem(STORAGE_KEY_V1);
    return rankRecords(migrated);
  } catch {
    return [];
  }
}

function saveRecords(records: RecentCenterRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rankRecords(records).slice(0, MAX_STORED)));
}

/** Los 3 centros más usados (por frecuencia; desempate por uso reciente). */
export function getRecentCenterIds(): string[] {
  return loadRecords()
    .slice(0, MAX_RECENT)
    .map((record) => record.id);
}

export function recordRecentCenter(centerId: string): void {
  if (!centerId) return;

  const records = loadRecords();
  const existing = records.find((record) => record.id === centerId);
  if (existing) {
    existing.uses += 1;
    existing.lastUsedAt = Date.now();
  } else {
    records.push({ id: centerId, uses: 1, lastUsedAt: Date.now() });
  }

  saveRecords(records);
}
