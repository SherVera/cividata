import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ListPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
}

export default function ListPagination({
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
}: ListPaginationProps) {
  if (totalItems === 0 || totalPages <= 1) return null;

  const navButtonClass =
    'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
      <p className="text-xs font-medium text-slate-500">
        Mostrando{' '}
        <span className="font-bold text-slate-700">
          {startIndex}–{endIndex}
        </span>{' '}
        de <span className="font-bold text-slate-700">{totalItems}</span>
      </p>
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
        <span className="px-2 text-xs font-semibold text-slate-600">
          Página {page} de {totalPages}
        </span>
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
    </div>
  );
}
