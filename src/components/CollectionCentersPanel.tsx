import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
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
import GeoMapPicker, { requestDeviceLocation } from './GeoMapPicker';

interface CollectionCentersPanelProps {
  onBack?: () => void;
}

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

export default function CollectionCentersPanel({ onBack }: CollectionCentersPanelProps) {
  const [centers, setCenters] = useState<CollectionCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const loadCenters = async () => {
    setLoading(true);
    try {
      setCenters(await listCollectionCenters());
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'No se pudieron cargar los centros.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCenters();
  }, []);

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

  const mapCenters = useMemo(
    () =>
      filtered.map((c) => ({ id: c.id, name: c.name, lat: c.geo_lat, lng: c.geo_lng })),
    [filtered]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
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
    setShowForm(true);
  };

  const handleUseLocation = async () => {
    setLocating(true);
    try {
      const coords = await requestDeviceLocation();
      setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'No se pudo usar la ubicación del dispositivo.' });
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setNotice({ type: 'error', message: 'El nombre del centro es obligatorio.' });
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
          : `Ya existe "${center.name}" en esa ubicación; no se creó un duplicado.`,
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
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xl md:flex-row md:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-teal-100">
            <Warehouse className="h-3.5 w-3.5" /> Centros de acopio
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight">Puntos de registro</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-300">
            Administre los centros donde se capturan fichas. La ubicación es aproximada (~100 m) y se puede ajustar arrastrando el marcador en el mapa.
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
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo centro
          </button>
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
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Mostrar inactivos
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
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar primer centro
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filtered.map((center) => (
              <motion.div
                key={center.id}
                layout
                className={`rounded-2xl border p-4 transition-colors ${
                  center.active
                    ? 'border-slate-200 bg-white hover:border-teal-200'
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
                    <p className="mt-2 font-mono text-[10px] text-slate-400">
                      {center.geo_lat.toFixed(3)}, {center.geo_lng.toFixed(3)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
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
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
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
                  Arrastre el marcador azul para ubicar el punto aproximado del centro.
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
                  Nombre del centro *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Acopio Parroquia San Juan"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  required
                />
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                >
                  {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                  Usar mi ubicación
                </button>
                <span className="font-mono text-[10px] text-slate-400">
                  {form.lat.toFixed(3)}, {form.lng.toFixed(3)} (aprox.)
                </span>
              </div>

              <GeoMapPicker
                lat={form.lat}
                lng={form.lng}
                centers={mapCenters.filter((c) => c.id !== editingId)}
                fitToCenters={mapCenters.length > 0}
                onChange={(coords) => setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }))}
                height="260px"
              />

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Centro activo para nuevos registros
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
