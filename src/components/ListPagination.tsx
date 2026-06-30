import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LIST_PAGE_SIZE_OPTIONS } from '../lib/pagination';

interface ListPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
}

export default function ListPagination({
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: ListPaginationProps) {
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  if (totalItems === 0) return null;

  const navButtonClass =
    'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

  const controlClass =
    'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10';

  const goToPage = () => {
    const parsed = Number(pageInput);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(page));
      return;
    }
    const target = Math.min(Math.max(1, Math.floor(parsed)), totalPages);
    setPageInput(String(target));
    if (target !== page) onPageChange(target);
  };

  const showPageNav = totalPages > 1;
  const showPageSize = pageSize != null && onPageSizeChange != null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
      <p className="text-xs font-medium text-slate-500">
        Mostrando{' '}
        <span className="font-bold text-slate-700">
          {startIndex}–{endIndex}
        </span>{' '}
        de <span className="font-bold text-slate-700">{totalItems}</span>
        {showPageNav && (
          <span className="text-slate-400">
            {' '}
            · Página {page} de {totalPages}
          </span>
        )}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {showPageSize && (
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span className="shrink-0">Por página</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className={controlClass}
                aria-label="Cantidad por página"
              >
                {LIST_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          )}

          {showPageNav && (
            <div className="flex items-center gap-1.5">
              <label className="sr-only" htmlFor={`pagination-page-${page}`}>
                Ir a página
              </label>
              <input
                id={`pagination-page-${page}`}
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    goToPage();
                  }
                }}
                className={`${controlClass} w-14 text-center tabular-nums`}
                aria-label="Número de página"
              />
              <button type="button" onClick={goToPage} className={navButtonClass}>
                Ir
              </button>
            </div>
          )}
        </div>

        {showPageNav && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className={navButtonClass}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className={navButtonClass}
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
