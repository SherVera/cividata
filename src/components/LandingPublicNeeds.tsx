import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import type { LandingOpenNeed } from '../lib/landingStatsApi';
import { formatQty } from '../lib/centerSupplyApi';
import { COLLECTION_CENTER_LABEL } from '../brand';
import SelectField from './SelectField';
import ListPagination from './ListPagination';
import { paginate, useListPageSize } from '../lib/pagination';

type LandingPublicNeedsProps = {
  id?: string;
  needs: LandingOpenNeed[];
  loading: boolean;
  loadError?: boolean;
};

export default function LandingPublicNeeds({ id, needs, loading, loadError = false }: LandingPublicNeedsProps) {
  const [search, setSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useListPageSize();

  const centerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of needs) {
      map.set(row.collectionCenterId, row.collectionCenterName);
    }
    return [
      { value: 'all', label: 'Todos los centros' },
      ...Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1], 'es'))
        .map(([id, name]) => ({ value: id, label: name })),
    ];
  }, [needs]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of needs) {
      if (row.categoryId) map.set(row.categoryId, row.categoryName);
    }
    return [
      { value: 'all', label: 'Todas las clasificaciones' },
      ...Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1], 'es'))
        .map(([id, name]) => ({ value: id, label: name })),
    ];
  }, [needs]);

  const filteredNeeds = useMemo(() => {
    const query = search.trim().toLowerCase();
    return needs.filter((row) => {
      if (centerFilter !== 'all' && row.collectionCenterId !== centerFilter) return false;
      if (categoryFilter !== 'all' && row.categoryId !== categoryFilter) return false;
      if (!query) return true;
      return (
        row.itemName.toLowerCase().includes(query) ||
        row.categoryName.toLowerCase().includes(query) ||
        row.collectionCenterName.toLowerCase().includes(query)
      );
    });
  }, [needs, search, centerFilter, categoryFilter]);

  const pagination = useMemo(
    () => paginate(filteredNeeds, page, pageSize),
    [filteredNeeds, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [search, centerFilter, categoryFilter]);

  useEffect(() => {
    if (page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  return (
    <section
      id={id}
      className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm md:p-6 scroll-mt-8"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
            Necesidades abiertas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Consulte qué insumos faltan por {COLLECTION_CENTER_LABEL.toLowerCase()}. Inicie sesión para registrar entregas.
          </p>
        </div>
        {!loading && needs.length > 0 && (
          <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            {needs.length} {needs.length === 1 ? 'ítem' : 'ítems'} en total
          </span>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative md:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ítem, clasificación o centro…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <SelectField
          value={centerFilter}
          onChange={setCenterFilter}
          options={centerOptions}
          size="sm"
          accent="blue"
        />
        <SelectField
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
          size="sm"
          accent="blue"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Cargando necesidades…
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-amber-900">No se pudieron cargar las necesidades.</p>
          <p className="mt-1 text-xs text-amber-800/80">
            Actualice la función <code className="font-mono">landing_stats</code> en Supabase
            (migración <code className="font-mono">20250630140000_landing_stats_patients</code>).
          </p>
        </div>
      ) : needs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
          <p className="text-sm font-semibold text-slate-600">No hay necesidades abiertas en este momento.</p>
        </div>
      ) : filteredNeeds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
          <p className="text-sm font-semibold text-slate-600">Ningún resultado con los filtros actuales.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Centro</th>
                    <th className="px-4 py-3">Clasificación</th>
                    <th className="px-4 py-3">Ítem</th>
                    <th className="px-4 py-3 text-right">Necesita</th>
                    <th className="px-4 py-3 text-right">Entregado</th>
                    <th className="px-4 py-3 text-right">Faltan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.pageItems.map((row) => (
                    <tr
                      key={`${row.collectionCenterId}-${row.categoryId}-${row.itemName}`}
                      className="hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.collectionCenterName}</td>
                      <td className="px-4 py-3 text-slate-600">{row.categoryName}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.itemName}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{formatQty(row.needed)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{formatQty(row.received)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                        {formatQty(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {pagination.pageItems.map((row) => (
                <li key={`${row.collectionCenterId}-${row.categoryId}-${row.itemName}`} className="px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    {row.collectionCenterName}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400">{row.categoryName}</p>
                  <div className="mt-1 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{row.itemName}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Necesita {formatQty(row.needed)} · Entregado {formatQty(row.received)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                      Faltan {formatQty(row.balance)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <ListPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}
    </section>
  );
}
