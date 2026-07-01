import { useCallback, useState } from 'react';

export type ListViewMode = 'cards' | 'table';

const STORAGE_PREFIX = 'cividata_list_view_';

export function readStoredListViewMode(scope: string, fallback: ListViewMode = 'cards'): ListViewMode {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${scope}`);
    return raw === 'table' ? 'table' : 'cards';
  } catch {
    return fallback;
  }
}

export function persistListViewMode(scope: string, mode: ListViewMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${scope}`, mode);
  } catch {
    // ignore quota / private mode
  }
}

export function useListViewMode(scope: string, fallback: ListViewMode = 'cards') {
  const [viewMode, setViewModeState] = useState<ListViewMode>(() => readStoredListViewMode(scope, fallback));

  const setViewMode = useCallback(
    (next: ListViewMode) => {
      setViewModeState(next);
      persistListViewMode(scope, next);
    },
    [scope],
  );

  return [viewMode, setViewMode] as const;
}
