import React, { useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { CollectionCenter, saveCollectionCenter } from '../lib/collectionCentersApi';
import { GeocodeResult, searchPlaces } from '../lib/geocodeApi';
import { DEFAULT_MAP_CENTER } from '../lib/geo';
import { COLLECTION_CENTER_LABEL } from '../brand';
import GeoMapPicker from './GeoMapPicker';

interface QuickCenterRegisterProps {
  onSaved: (center: CollectionCenter, created: boolean) => void;
  onCancel: () => void;
}

export default function QuickCenterRegister({ onSaved, onCancel }: QuickCenterRegisterProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(DEFAULT_MAP_CENTER.lat);
  const [lng, setLng] = useState(DEFAULT_MAP_CENTER.lng);
  const [locationQuery, setLocationQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [error, setError] = useState('');

  const handleSearchPlace = async () => {
    const q = locationQuery.trim();
    if (!q) return;
    setSearchingPlace(true);
    setGeocodeResults([]);
    setError('');
    try {
      const results = await searchPlaces(q);
      if (results.length === 0) {
        setError('No se encontró ese lugar.');
      } else {
        setGeocodeResults(results);
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo buscar el lugar.');
    } finally {
      setSearchingPlace(false);
    }
  };

  const applyGeocodeResult = (result: GeocodeResult) => {
    setLat(result.lat);
    setLng(result.lng);
    if (!address.trim()) {
      setAddress(result.displayName.split(',').slice(0, 2).join(',').trim());
    }
    setGeocodeResults([]);
    setLocationConfirmed(false);
    setLocationQuery(result.displayName.split(',')[0].trim());
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(`Escriba un nombre para el ${COLLECTION_CENTER_LABEL.toLowerCase()}.`);
      return;
    }
    if (!locationConfirmed) {
      setError('Confirme la ubicación en el mapa.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { center, created } = await saveCollectionCenter({
        name: name.trim(),
        address,
        geo_lat: lat,
        geo_lng: lng,
        active: true,
      });
      onSaved(center, created);
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el centro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-center-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div>
            <h3 id="quick-center-title" className="text-base font-bold text-slate-900">
              Nuevo {COLLECTION_CENTER_LABEL.toLowerCase()}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Busque el lugar, confirme en el mapa y asigne un nombre. Al guardar quedará seleccionado.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Buscar lugar
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
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleSearchPlace}
                disabled={searchingPlace || !locationQuery.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2.5 text-xs font-bold text-white disabled:bg-slate-300"
              >
                {searchingPlace ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Buscar
              </button>
            </div>
            {geocodeResults.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                {geocodeResults.map((result, idx) => (
                  <button
                    key={`${result.lat}-${idx}`}
                    type="button"
                    onClick={() => applyGeocodeResult(result)}
                    className="block w-full border-b border-slate-100 px-3 py-2.5 text-left text-xs text-slate-700 last:border-0 hover:bg-teal-50"
                  >
                    {result.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-slate-400">
              {lat.toFixed(3)}, {lng.toFixed(3)} (aprox.)
            </span>
          </div>

          <GeoMapPicker
            lat={lat}
            lng={lng}
            fitToCenters={false}
            showLocateButton
            onLocateError={(message) => setError(message)}
            onChange={(coords) => {
              setLat(coords.lat);
              setLng(coords.lng);
              setLocationConfirmed(false);
            }}
            height="240px"
          />

          <label className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-3 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={locationConfirmed}
              onChange={(e) => setLocationConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-teal-600"
            />
            Confirmo que el marcador indica el punto correcto (puede arrastrarlo antes).
          </label>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Nombre del centro *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Acopio Parroquia San Juan"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white"
            />
            <p className="mt-1 text-[10px] text-slate-500">Puede ser distinto al lugar buscado.</p>
          </div>

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-slate-100 bg-slate-50 p-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:bg-slate-300"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar y continuar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
