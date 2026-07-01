import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  Check,
  Loader2,
  Package,
} from 'lucide-react';
import type { CollectionCenter } from '../lib/collectionCentersApi';
import {
  CenterSupplyEntry,
  SupplyCategory,
  SupplyEntryType,
  SupplyItemBalance,
  aggregateSupplyBalances,
  entryRegisteredOnDifferentDay,
  formatQty,
  formatSupplyEntryDate,
  formatSupplyRegisteredAt,
  listCenterSupplyEntries,
  listSupplyCategories,
  listSupplySurplus,
  supplyItemKey,
} from '../lib/centerSupplyApi';
import SelectField from './SelectField';
import QuickSupplyRegisterModal from './QuickSupplyRegisterModal';
import { supabase } from '../lib/supabaseClient';
import { staffDisplayName, useStaffNameMap } from '../lib/usersApi';

interface CenterSupplyPanelProps {
  center: CollectionCenter;
  onBack: () => void;
}

type CategoryFilter = 'all' | string;

function formatDateLabel(iso: string): string {
  return formatSupplyEntryDate(iso);
}

export default function CenterSupplyPanel({ center, onBack }: CenterSupplyPanelProps) {
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const staffNameMap = useStaffNameMap(accessToken);
  const [entries, setEntries] = useState<CenterSupplyEntry[]>([]);
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showForm, setShowForm] = useState<SupplyEntryType | null>(null);
  const [presetNeedKey, setPresetNeedKey] = useState<string | null>(null);

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token || undefined);
    });
  }, []);

  const loadCategories = async () => {
    try {
      setCategories(await listSupplyCategories());
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'No se pudieron cargar las clasificaciones.' });
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      setEntries(
        await listCenterSupplyEntries({
          centerId: center.id,
          categoryId: categoryFilter,
        })
      );
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'No se pudo cargar el registro.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.id, categoryFilter]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const balances = useMemo(() => aggregateSupplyBalances(entries), [entries]);

  const openEntries = useMemo(() => balances.filter((b) => b.balance > 0), [balances]);
  const surplusEntries = useMemo(() => listSupplySurplus(entries), [entries]);

  const dayGroups = useMemo(() => {
    const map = new Map<string, CenterSupplyEntry[]>();
    for (const entry of entries) {
      const key = entry.entryDate || 'sin-fecha';
      const list = map.get(key) || [];
      list.push(entry);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, label: formatDateLabel(date), items }));
  }, [entries]);

  const openEntryForm = (type: SupplyEntryType, needKey?: string) => {
    setPresetNeedKey(needKey || null);
    setShowForm(type);
  };

  const openReceptionForNeed = (row: SupplyItemBalance) => {
    openEntryForm('recepcion', supplyItemKey(row.categoryId, row.itemName));
  };

  const closeEntryForm = () => {
    setShowForm(null);
    setPresetNeedKey(null);
  };

  const handleSaved = () => {
    setNotice({
      type: 'success',
      message: showForm === 'recepcion' ? 'Recepción registrada.' : 'Necesidad registrada.',
    });
    setShowForm(null);
    setPresetNeedKey(null);
    loadCategories();
    loadEntries();
  };

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'Todas' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Centros
          </button>
          <h2 className="text-lg font-bold text-slate-900">{center.name}</h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Registro de necesidades y recepciones. Anote qué falta y qué cantidad ya llegó al centro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openEntryForm('necesidad')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Registrar necesidad
          </button>
          <button
            type="button"
            onClick={() => openEntryForm('recepcion')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" /> Registrar recepción
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            notice.type === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-rose-100 bg-rose-50 text-rose-700'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 space-y-1 sm:max-w-xs">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Clasificación
          </span>
          <SelectField
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v as CategoryFilter)}
            options={categoryOptions}
            size="sm"
            accent="teal"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            Cargando…
          </div>
        ) : (
          <>
            {openEntries.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Pendiente por ítem
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {openEntries.map((row) => (
                    <button
                      key={`${row.categoryId}-${row.itemName}`}
                      type="button"
                      onClick={() => openReceptionForNeed(row)}
                      className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            {row.categoryName}
                          </p>
                          <p className="text-sm font-bold text-slate-900">{row.itemName}</p>
                        </div>
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          Faltan {formatQty(row.balance)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Necesita {formatQty(row.needed)} · Recibido {formatQty(row.received)}
                      </p>
                      <p className="mt-2 text-[10px] font-semibold text-emerald-700">
                        Tocar para registrar recepción →
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {surplusEntries.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Superávit por ítem
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {surplusEntries.map((row) => (
                    <div
                      key={`surplus-${row.categoryId}-${row.itemName}`}
                      className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800">
                            {row.categoryName}
                          </p>
                          <p className="text-sm font-bold text-slate-900">{row.itemName}</p>
                        </div>
                        <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          Exceso {formatQty(row.balance)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Necesita {formatQty(row.needed)} · Recibido {formatQty(row.received)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {balances.length > 0 && openEntries.length === 0 && surplusEntries.length === 0 && (
              <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                <Check className="mb-1 inline h-4 w-4" /> Sin faltantes en esta clasificación.
              </div>
            )}

            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Historial</h3>
            <p className="mb-3 text-[11px] text-slate-400">
              Agrupado por fecha del movimiento. Si se anotó días después, se indica aparte.
            </p>
            {dayGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Sin movimientos</p>
                <p className="mt-1 text-xs text-slate-400">
                  Use «Registrar necesidad» o «Registrar recepción» para empezar el historial.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dayGroups.map((group) => (
                  <section key={group.date} className="overflow-hidden rounded-2xl border border-slate-100">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">
                      {group.label}
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {group.items.map((entry) => {
                        const backdated = entryRegisteredOnDifferentDay(entry);
                        return (
                        <li key={entry.id} className="flex items-start justify-between gap-3 px-4 py-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  entry.entryType === 'necesidad'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {entry.entryType === 'necesidad' ? 'Necesidad' : 'Recepción'}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {entry.categoryName}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{entry.itemName}</p>
                            <p className="text-[11px] text-slate-500">
                              Fecha del movimiento: {formatSupplyEntryDate(entry.entryDate)}
                            </p>
                            {backdated && (
                              <p className="text-[11px] text-slate-400">
                                Anotado en sistema: {formatSupplyRegisteredAt(entry.createdAt)}
                              </p>
                            )}
                            {entry.createdBy && (
                              <p className="text-[11px] text-slate-400">
                                Registrado por:{' '}
                                {staffDisplayName(staffNameMap, entry.createdBy) || 'Personal del sistema'}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-sm font-bold text-slate-800">
                            {formatQty(entry.quantity)}
                          </span>
                        </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <QuickSupplyRegisterModal
        open={showForm !== null}
        entryType={showForm ?? 'necesidad'}
        presetCenter={center}
        presetNeedKey={presetNeedKey ?? undefined}
        onClose={closeEntryForm}
        onSaved={handleSaved}
      />
    </div>
  );
}
