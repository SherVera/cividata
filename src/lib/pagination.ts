import { useCallback, useState } from 'react';

export const LIST_PAGE_SIZE_MIN = 10;
export const LIST_PAGE_SIZE_MAX = 30;
export const DEFAULT_LIST_PAGE_SIZE = 10;

/** @deprecated Use DEFAULT_LIST_PAGE_SIZE */
export const PATIENT_LIST_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;
/** @deprecated Use DEFAULT_LIST_PAGE_SIZE */
export const TABLE_LIST_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export const LIST_PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 30] as const;

const PAGE_SIZE_STORAGE_KEY = 'cividata_list_page_size';

export type PaginationResult<T> = {
  pageItems: T[];
  page: number;
  totalPages: number;
  total: number;
  startIndex: number;
  endIndex: number;
};

export function clampPageSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LIST_PAGE_SIZE;
  return Math.min(LIST_PAGE_SIZE_MAX, Math.max(LIST_PAGE_SIZE_MIN, Math.round(value)));
}

export function readStoredPageSize(): number {
  if (typeof window === 'undefined') return DEFAULT_LIST_PAGE_SIZE;
  try {
    const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    if (!raw) return DEFAULT_LIST_PAGE_SIZE;
    return clampPageSize(Number(raw));
  } catch {
    return DEFAULT_LIST_PAGE_SIZE;
  }
}

export function persistPageSize(size: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(clampPageSize(size)));
  } catch {
    // ignore quota / private mode
  }
}

export function useListPageSize(initial = readStoredPageSize) {
  const [pageSize, setPageSizeState] = useState(() => clampPageSize(initial()));

  const setPageSize = useCallback((next: number) => {
    const clamped = clampPageSize(next);
    setPageSizeState(clamped);
    persistPageSize(clamped);
  }, []);

  return [pageSize, setPageSize] as const;
}

export function paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const safePageSize = clampPageSize(pageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    pageItems: items.slice(start, start + safePageSize),
    page: safePage,
    totalPages,
    total,
    startIndex: total === 0 ? 0 : start + 1,
    endIndex: Math.min(start + safePageSize, total),
  };
}
