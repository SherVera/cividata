import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ChevronRight, Loader2, Search } from 'lucide-react';
import {
  CenterSupplyEntry,
  SupplyCategory,
  SupplyItemBalanceWithCenter,
  entryRegisteredOnDifferentDay,
  formatQty,
  formatSupplyEntryDate,
  formatSupplyRegisteredAt,
  listCenterSupplyEntries,
  listGlobalOpenSupplyNeeds,
  listSupplyCategories,
} from '../lib/centerSupplyApi';
import ListPagination from './ListPagination';
import SelectField from './SelectField';
import { paginate, useListPageSize } from '../lib/pagination';

type LedgerTab = 'necesidades' | 'recepciones';

type GlobalSupplyLedgerProps = {
  onOpenCenter?: (centerId: string) => void;
  refreshToken?: number;
};

export default function GlobalSupplyLedger({ onOpenCenter, refreshToken = 0 }: GlobalSupplyLedgerProps) {
  const [tab, setTab] = useState<LedgerTab>('necesidades');
  const [entries, setEntries] = useState<CenterSupplyEntry[]>([]);
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useListPageSize();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [allEntries, cats] = await Promise.all([
        listCenterSupplyEntries(),
        listSupplyCategories(),
      ]);
      setEntries(allEntries);
      setCategories(cats);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el listado de insumos.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshToken]);

  const openNeeds = useMemo(() => listGlobalOpenSupplyNeeds(entries), [entries]);

  const receptions = useMemo(
    () =>
      [...entries]
        .filter((entry) => entry.entryType === 'recepcion')
        .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt)),
    [entries]
  );

  const centerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      map.set(entry.collectionCenterId, entry.collectionCenterName);
    }
    return [
      { value: 'all', label: 'Todos los centros' },
      ...Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1], 'es'))
        .map(([id, name]) => ({ value: id, label: name })),
    ];
  }, [entries]);

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'Todas las clasificaciones' },
      ...categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories]
  );

  const query = search.trim().toLowerCase();

  const filteredNeeds = useMemo(() => {
    return openNeeds.filter((row) => {
      if (centerFilter !== 'all' && row.collectionCenterId !== centerFilter) return false;
      if (categoryFilter !== 'all' && row.categoryId !== categoryFilter) return false;
      if (!query) return true;
      return (
        row.itemName.toLowerCase().includes(query) ||
        row.categoryName.toLowerCase().includes(query) ||
        row.collectionCenterName.toLowerCase().includes(query)
      );
    });
  }, [openNeeds, centerFilter, categoryFilter, query]);

  const filteredReceptions = useMemo(() => {
    return receptions.filter((entry) => {
      if (centerFilter !== 'all' && entry.collectionCenterId !== centerFilter) return false;
      if (categoryFilter !== 'all' && entry.categoryId !== categoryFilter) return false;
      if (!query) return true;
      return (
        entry.itemName.toLowerCase().includes(query) ||
        entry.categoryName.toLowerCase().includes(query) ||
        entry.collectionCenterName.toLowerCase().includes(query)
      );
    });
  }, [receptions, centerFilter, categoryFilter, query]);

  const activeRows = tab === 'necesidades' ? filteredNeeds : filteredReceptions;

  useEffect(() => {
    setPage(1);
  }, [tab, search, centerFilter, categoryFilter]);

  const pagination = useMemo(
    () => paginate(activeRows, page, pageSize),
    [activeRows, page, pageSize]
  );

  useEffect(() => {
    if (page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Insumos: necesidades y entregas</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Qué falta por centro y qué cantidad ya se ha entregado en todos los puntos de acopio.
          </p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab('necesidades')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              tab === 'necesidades' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Necesidades pendientes
            {openNeeds.length > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                {openNeeds.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('recepciones')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              tab === 'recepciones' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Entregado
            {receptions.length > 0 && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                {receptions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative md:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ítem, clasificación o centro…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
          />
        </div>
        <SelectField
          value={centerFilter}
          onChange={setCenterFilter}
          options={centerOptions}
          size="sm"
          accent="teal"
        />
        <SelectField
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
          size="sm"
          accent="teal"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          Cargando listado…
        </div>
      ) : tab === 'necesidades' ? (
        <NeedsTable rows={pagination.pageItems} onOpenCenter={onOpenCenter} />
      ) : (
        <ReceptionsTable rows={pagination.pageItems} onOpenCenter={onOpenCenter} />
      )}

      {!loading && activeRows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
          <p className="text-sm font-semibold text-slate-600">
            {tab === 'necesidades'
              ? 'No hay necesidades pendientes con los filtros actuales.'
              : 'No hay entregas registradas con los filtros actuales.'}
          </p>
        </div>
      )}

      <ListPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}

function NeedsTable({
  rows,
  onOpenCenter,
}: {
  rows: SupplyItemBalanceWithCenter[];
  onOpenCenter?: (centerId: string) => void;
}) {
  if (!rows?.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={`${row.collectionCenterId}-${row.categoryId}-${row.itemName}`} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-semibold text-slate-800">{row.collectionCenterName}</td>
                <td className="px-4 py-3 text-slate-600">{row.categoryName}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{row.itemName}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">{formatQty(row.needed)}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">{formatQty(row.received)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{formatQty(row.balance)}</td>
                <td className="px-4 py-3 text-right">
                  {onOpenCenter && (
                    <button
                      type="button"
                      onClick={() => onOpenCenter(row.collectionCenterId)}
                      className="inline-flex items-center gap-0.5 text-xs font-bold text-teal-700 hover:text-teal-800"
                    >
                      Ver centro
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <li key={`${row.collectionCenterId}-${row.categoryId}-${row.itemName}`}>
            <button
              type="button"
              onClick={() => onOpenCenter?.(row.collectionCenterId)}
              disabled={!onOpenCenter}
              className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-default"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700">{row.collectionCenterName}</p>
                  <p className="text-[10px] font-semibold text-slate-400">{row.categoryName}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">{row.itemName}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Necesita {formatQty(row.needed)} · Entregado {formatQty(row.received)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  Faltan {formatQty(row.balance)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReceptionsTable({
  rows,
  onOpenCenter,
}: {
  rows: CenterSupplyEntry[];
  onOpenCenter?: (centerId: string) => void;
}) {
  if (!rows?.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Centro</th>
              <th className="px-4 py-3">Clasificación</th>
              <th className="px-4 py-3">Ítem</th>
              <th className="px-4 py-3 text-right">Cantidad entregada</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((entry) => {
              const backdated = entryRegisteredOnDifferentDay(entry);
              return (
                <tr key={entry.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{formatSupplyEntryDate(entry.entryDate)}</p>
                    {backdated && (
                      <p className="text-[10px] text-slate-400">
                        Anotado: {formatSupplyRegisteredAt(entry.createdAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{entry.collectionCenterName}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.categoryName}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{entry.itemName}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                    {formatQty(entry.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {onOpenCenter && (
                      <button
                        type="button"
                        onClick={() => onOpenCenter(entry.collectionCenterId)}
                        className="inline-flex items-center gap-0.5 text-xs font-bold text-teal-700 hover:text-teal-800"
                      >
                        Ver centro
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((entry) => {
          const backdated = entryRegisteredOnDifferentDay(entry);
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onOpenCenter?.(entry.collectionCenterId)}
                disabled={!onOpenCenter}
                className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-default"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Entrega</p>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {formatSupplyEntryDate(entry.entryDate)}
                      {backdated ? ` · anotado ${formatSupplyRegisteredAt(entry.createdAt)}` : ''}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{entry.itemName}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {entry.collectionCenterName} · {entry.categoryName}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    {formatQty(entry.quantity)} u.
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
