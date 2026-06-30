import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  Warehouse,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  CollectionCenter,
  listCollectionCenters,
  saveCollectionCenter,
  setCollectionCenterActive,
} from '../lib/collectionCentersApi';
import { DEFAULT_MAP_CENTER, formatDistance, haversineMeters } from '../lib/geo';
import { GeocodeResult, searchPlaces } from '../lib/geocodeApi';
import GeoMapPicker from './GeoMapPicker';
import ListPagination from './ListPagination';
import { paginate, useListPageSize } from '../lib/pagination';

import CenterSupplyPanel from './CenterSupplyPanel';
import GlobalSupplyLedger from './GlobalSupplyLedger';
import QuickSupplyRegisterModal from './QuickSupplyRegisterModal';
import type { SupplyEntryType } from '../lib/centerSupplyApi';
import {
  computeSupplyDashboardStats,
  formatQty,
  listCenterSupplyEntries,
} from '../lib/centerSupplyApi';

interface CollectionCentersPanelProps {
  onBack?: () => void;
  canManageCenters?: boolean;
  initialCenterId?: string | null;
  onInitialCenterConsumed?: () => void;
  initialPanelView?: 'centros' | 'ledger';
  onInitialPanelViewConsumed?: () => void;
}

type PanelView = 'centros' | 'ledger';

type FormState = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  active: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  address: '',
  lat: DEFAULT_MAP_CENTER.lat,
  lng: DEFAULT_MAP_CENTER.lng,
  active: true,
});

export default function CollectionCentersPanel({
  onBack,
  canManageCenters = false,
  initialCenterId = null,
  onInitialCenterConsumed,
  initialPanelView = 'centros',
  onInitialPanelViewConsumed,
}: CollectionCentersPanelProps) {
  const [panelView, setPanelView] = useState<PanelView>(initialPanelView);
  const [centers, setCenters] = useState<CollectionCenter[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<CollectionCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [locationQuery, setLocationQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [searchedPlaceLabel, setSearchedPlaceLabel] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [centersPage, setCentersPage] = useState(1);
  const [listPageSize, setListPageSize] = useListPageSize();
  const [quickSupplyType, setQuickSupplyType] = useState<SupplyEntryType | null>(null);
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0);
  const [centerNeedCounts, setCenterNeedCounts] = useState<Map<string, { openItems: number; pendingUnits: number }>>(
    new Map()
  );

  const resetLocationSearch = () => {
    setLocationQuery('');
    setGeocodeResults([]);
    setLocationConfirmed(false);
    setSearchedPlaceLabel('');
  };

  const loadCenters = async () => {
    setLoading(true);
    try {
      setCenters(await listCollectionCenters(!canManageCenters));
      try {
        const stats = computeSupplyDashboardStats(await listCenterSupplyEntries());
        setCenterNeedCounts(
          new Map(stats.byCenter.map((row) => [row.centerId, { openItems: row.openItems, pendingUnits: row.pendingUnits }]))
        );
      } catch {
        setCenterNeedCounts(new Map());
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'No se pudieron cargar los centros.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCenters();
  }, []);

  useEffect(() => {
    if (!initialCenterId || centers.length === 0) return;
    const center = centers.find((item) => item.id === initialCenterId);
    if (center) {
      setSelectedCenter(center);
      onInitialCenterConsumed?.();
    }
  }, [initialCenterId, centers, onInitialCenterConsumed]);

  useEffect(() => {
    if (!initialPanelView) return;
    setPanelView(initialPanelView);
    onInitialPanelViewConsumed?.();
  }, [initialPanelView, onInitialPanelViewConsumed]);

  const openCenterById = (centerId: string) => {
    const center = centers.find((item) => item.id === centerId);
    if (center) setSelectedCenter(center);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return centers.filter((c) => {
      if (!showInactive && !c.active) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q)
      );
    });
  }, [centers, search, showInactive]);

  const centersPagination = useMemo(
    () => paginate(filtered, centersPage, listPageSize),
    [filtered, centersPage, listPageSize]
  );

  const handleListPageSizeChange = (size: number) => {
    setListPageSize(size);
    setCentersPage(1);
  };

  useEffect(() => {
    setCentersPage(1);
  }, [search, showInactive]);

  useEffect(() => {
    if (centersPage > centersPagination.totalPages) {
      setCentersPage(centersPagination.totalPages);
    }
  }, [centersPage, centersPagination.totalPages]);

  const mapCenters = useMemo(
    () =>
      filtered.map((c) => ({ id: c.id, name: c.name, lat: c.geo_lat, lng: c.geo_lng })),
    [filtered]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    resetLocationSearch();
    setShowForm(true);
  };

  const openEdit = (center: CollectionCenter) => {
    setEditingId(center.id);
    setForm({
      name: center.name,
      address: center.address || '',
      lat: center.geo_lat,
      lng: center.geo_lng,
      active: center.active,
    });
    resetLocationSearch();
    setLocationConfirmed(true);
    setShowForm(true);
  };

  const handleSearchPlace = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const q = locationQuery.trim();
    if (!q) return;
    setSearchingPlace(true);
    setGeocodeResults([]);
    try {
      const results = await searchPlaces(q);
      if (results.length === 0) {
        setNotice({ type: 'error', message: 'No se encontró ese lugar. Pruebe con otra búsqueda.' });
      } else {
        setGeocodeResults(results);
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'No se pudo buscar el lugar.' });
    } finally {
      setSearchingPlace(false);
    }
  };

  const applyGeocodeResult = (result: GeocodeResult) => {
    setForm((prev) => ({
      ...prev,
      lat: result.lat,
      lng: result.lng,
      address: prev.address.trim() ? prev.address : result.displayName.split(',').slice(0, 2).join(',').trim(),
    }));
    setSearchedPlaceLabel(result.displayName);
    setGeocodeResults([]);
    setLocationConfirmed(false);
    setLocationQuery(result.displayName.split(',')[0].trim());
  };

  const handleMapCoordsChange = (coords: { lat: number; lng: number }) => {
    setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
    setLocationConfirmed(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setNotice({ type: 'error', message: 'El nombre del centro es obligatorio.' });
      return;
    }
    if (!editingId && !locationConfirmed) {
      setNotice({
        type: 'error',
        message: 'Busque el lugar, ajuste el marcador en el mapa y confirme la ubicación.',
      });
      return;
    }
    setSaving(true);
    try {
      const { center, created } = await saveCollectionCenter(
        {
          name: form.name,
          address: form.address,
          geo_lat: form.lat,
          geo_lng: form.lng,
          active: form.active,
        },
        editingId || undefined
      );
      setShowForm(false);
      setNotice({
        type: created ? 'success' : 'info',
        message: created
          ? editingId
            ? 'Centro actualizado correctamente.'
            : 'Centro de acopio registrado.'
          : `Ya existe un centro con el nombre "${center.name}"; no se creó un duplicado.`,
      });
      await loadCenters();
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'No se pudo guardar el centro.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (center: CollectionCenter) => {
    setSaving(true);
    try {
      await setCollectionCenterActive(center.id, !center.active);
      await loadCenters();
      setNotice({
        type: 'success',
        message: center.active ? 'Centro desactivado.' : 'Centro reactivado.',
      });
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'No se pudo cambiar el estado.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {selectedCenter ? (
        <CenterSupplyPanel center={selectedCenter} onBack={() => setSelectedCenter(null)} />
      ) : (
        <>
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xl md:flex-row md:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-teal-100">
            <Warehouse className="h-3.5 w-3.5" /> Centros de acopio
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight">Puntos de triaje</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-300">
            {canManageCenters
              ? 'Administre los centros y consulte necesidades y recepciones de insumos por punto.'
              : 'Consulte cada centro para ver necesidades, recepciones e historial de insumos y medicinas.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </button>
          )}
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setPanelView('centros')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                panelView === 'centros' ? 'bg-white text-slate-900' : 'text-slate-200 hover:text-white'
              }`}
            >
              Centros
            </button>
            <button
              type="button"
              onClick={() => setPanelView('ledger')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                panelView === 'ledger' ? 'bg-white text-slate-900' : 'text-slate-200 hover:text-white'
              }`}
            >
              Necesidades y entregas
            </button>
          </div>
          <button
            type="button"
            onClick={() => setQuickSupplyType('necesidad')}
            title="Registrar necesidad o recepción de insumos"
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-100 transition-colors hover:bg-amber-500/30"
          >
            <Package className="h-3.5 w-3.5" />
            Insumo rápido
          </button>
          {canManageCenters && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo centro
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            notice.type === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : notice.type === 'info'
                ? 'border-blue-100 bg-blue-50 text-blue-700'
              : 'border-rose-100 bg-rose-50 text-rose-700'
          }`}
        >
          {notice.message}
        </div>
      )}

      {panelView === 'ledger' ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <GlobalSupplyLedger refreshToken={ledgerRefreshKey} onOpenCenter={openCenterById} />
        </div>
      ) : (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nombre o dirección..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            {canManageCenters && (
            <>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Mostrar inactivos
            </>
            )}
          </label>
        </div>

        {mapCenters.length > 0 && (
          <GeoMapPicker
            lat={null}
            lng={null}
            readOnly
            fitToCenters
            centers={mapCenters}
            height="200px"
            className="mb-4"
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            Cargando centros...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No hay centros que coincidan con el filtro.</p>
            {canManageCenters && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar primer centro
            </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
          <ListPagination
            page={centersPagination.page}
            totalPages={centersPagination.totalPages}
            totalItems={centersPagination.total}
            startIndex={centersPagination.startIndex}
            endIndex={centersPagination.endIndex}
            onPageChange={setCentersPage}
            pageSize={listPageSize}
            onPageSizeChange={handleListPageSizeChange}
          />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {centersPagination.pageItems.map((center) => (
              <motion.button
                key={center.id}
                type="button"
                layout
                onClick={() => setSelectedCenter(center)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  center.active
                    ? 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/30'
                    : 'border-slate-100 bg-slate-50 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-bold text-slate-800">{center.name}</h3>
                      {!center.active && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {center.address && (
                      <p className="mt-1 text-xs text-slate-500">{center.address}</p>
                    )}
                    {(() => {
                      const needs = centerNeedCounts.get(center.id);
                      if (needs && needs.openItems > 0) {
                        return (
                          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                            <Package className="h-3 w-3" />
                            {needs.openItems} {needs.openItems === 1 ? 'ítem' : 'ítems'} · faltan {formatQty(needs.pendingUnits)}
                          </p>
                        );
                      }
                      return (
                        <p className="mt-2 text-[11px] font-semibold text-teal-700">
                          Ver necesidades y recepciones →
                        </p>
                      );
                    })()}
                  </div>
                  {canManageCenters && (
                  <div className="flex shrink-0 flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openEdit(center)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleToggleActive(center)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                    >
                      {center.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
          <ListPagination
            page={centersPagination.page}
            totalPages={centersPagination.totalPages}
            totalItems={centersPagination.total}
            startIndex={centersPagination.startIndex}
            endIndex={centersPagination.endIndex}
            onPageChange={setCentersPage}
            pageSize={listPageSize}
            onPageSizeChange={handleListPageSizeChange}
          />
          </div>
        )}
      </div>
      )}

      {showForm && canManageCenters && (
        <motion.div
          className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.form
            onSubmit={handleSave}
            className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Editar centro de acopio' : 'Nuevo centro de acopio'}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Busque un lugar para mover el mapa, ajuste el marcador y asigne un nombre propio al centro.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Buscar lugar en el mapa
                </label>
                <div className="flex gap-2">
                  <input
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchPlace();
                      }
                    }}
                    placeholder="Ej. Centro Letonía, Caracas"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchPlace()}
                    disabled={searchingPlace || !locationQuery.trim()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:bg-slate-300"
                  >
                    {searchingPlace ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Buscar
                  </button>
                </div>
                {geocodeResults.length > 0 && (
                  <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    {geocodeResults.map((result, idx) => (
                      <button
                        key={`${result.lat}-${result.lng}-${idx}`}
                        type="button"
                        onClick={() => applyGeocodeResult(result)}
                        className="block w-full border-b border-slate-100 px-3 py-2.5 text-left text-xs text-slate-700 last:border-0 hover:bg-teal-50"
                      >
                        {result.displayName}
                      </button>
                    ))}
                  </div>
                )}
                {searchedPlaceLabel && (
                  <p className="mt-2 text-[11px] font-medium text-teal-700">
                    Lugar buscado: {searchedPlaceLabel}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400">
                  {form.lat.toFixed(3)}, {form.lng.toFixed(3)} (aprox.)
                </span>
              </div>

              <GeoMapPicker
                lat={form.lat}
                lng={form.lng}
                centers={mapCenters.filter((c) => c.id !== editingId)}
                fitToCenters={false}
                showLocateButton
                onLocateError={(message) => setNotice({ type: 'error', message })}
                onLocate={() => setSearchedPlaceLabel('Ubicación actual del dispositivo')}
                onChange={handleMapCoordsChange}
                height="260px"
              />

              <label className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-3 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={locationConfirmed}
                  onChange={(e) => setLocationConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>
                  Confirmo que el marcador azul indica el punto correcto para este centro de acopio.
                  Puede arrastrarlo en el mapa antes de confirmar.
                </span>
              </label>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Nombre del centro de acopio *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Acopio Parroquia San Juan"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  required
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Puede ser distinto al lugar buscado (ej. buscar &quot;Centro Letonía&quot; y nombrar el acopio de otra forma).
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Dirección de referencia
                </label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Ej. Av. Principal, local comunal"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Centro activo para nuevos triajes
              </label>
            </div>

            <div className="flex gap-2 border-t border-slate-100 bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:bg-slate-300"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Guardar centro
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
        </>
      )}

      <QuickSupplyRegisterModal
        open={quickSupplyType !== null}
        entryType={quickSupplyType ?? 'necesidad'}
        onClose={() => setQuickSupplyType(null)}
        onSaved={() => {
          setNotice({ type: 'success', message: 'Registro guardado correctamente.' });
          setLedgerRefreshKey((k) => k + 1);
          void loadCenters();
        }}
      />
    </div>
  );
}

export function distanceToCenter(
  lat: number | null,
  lng: number | null,
  center: Pick<CollectionCenter, 'geo_lat' | 'geo_lng'> | null
): number | null {
  if (lat == null || lng == null || !center) return null;
  return haversineMeters(lat, lng, center.geo_lat, center.geo_lng);
}

export { formatDistance };
