export const PATIENT_LIST_PAGE_SIZE = 12;
export const TABLE_LIST_PAGE_SIZE = 10;

export type PaginationResult<T> = {
  pageItems: T[];
  page: number;
  totalPages: number;
  total: number;
  startIndex: number;
  endIndex: number;
};

export function paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    pageItems: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
    startIndex: total === 0 ? 0 : start + 1,
    endIndex: Math.min(start + pageSize, total),
  };
}
