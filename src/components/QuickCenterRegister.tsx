import React, { useState } from 'react';
import { Check, Loader2, MapPin, Search, X } from 'lucide-react';
import { CollectionCenter, saveCollectionCenter } from '../lib/collectionCentersApi';
import { GeocodeResult, searchPlaces } from '../lib/geocodeApi';
import { DEFAULT_MAP_CENTER } from '../lib/geo';
import GeoMapPicker, { requestDeviceLocation } from './GeoMapPicker';

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
  const [locating, setLocating] = useState(false);
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
      setError('Escriba un nombre para el centro de acopio.');
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
    <div className="rounded-xl border border-teal-200 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-teal-800">Registrar nuevo centro de acopio</span>
        <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
            placeholder="Ej. Centro Letonía"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-teal-500"
          />
          <button
            type="button"
            onClick={handleSearchPlace}
            disabled={searchingPlace || !locationQuery.trim()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-2 text-[10px] font-bold text-white disabled:bg-slate-300"
          >
            {searchingPlace ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            Buscar
          </button>
        </div>
        {geocodeResults.length > 0 && (
          <div className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {geocodeResults.map((result, idx) => (
              <button
                key={`${result.lat}-${idx}`}
                type="button"
                onClick={() => applyGeocodeResult(result)}
                className="block w-full px-2.5 py-2 text-left text-[10px] text-slate-600 hover:bg-teal-50 border-b border-slate-50 last:border-0"
              >
                {result.displayName}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={locating}
          onClick={async () => {
            setLocating(true);
            try {
              const coords = await requestDeviceLocation();
              setLat(coords.lat);
              setLng(coords.lng);
              setLocationConfirmed(false);
            } catch {
              setError('No se pudo usar la ubicación del dispositivo.');
            } finally {
              setLocating(false);
            }
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-teal-200 px-2 py-1 text-[10px] font-bold text-teal-700"
        >
          {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
          Mi ubicación
        </button>
        <span className="font-mono text-[9px] text-slate-400">
          {lat.toFixed(3)}, {lng.toFixed(3)}
        </span>
      </div>

      <GeoMapPicker
        lat={lat}
        lng={lng}
        fitToCenters={false}
        onChange={(coords) => {
          setLat(coords.lat);
          setLng(coords.lng);
          setLocationConfirmed(false);
        }}
        height="180px"
      />

      <label className="flex items-start gap-2 text-[10px] font-medium text-slate-600">
        <input
          type="checkbox"
          checked={locationConfirmed}
          onChange={(e) => setLocationConfirmed(e.target.checked)}
          className="mt-0.5 rounded border-slate-300 text-teal-600"
        />
        Confirmo la ubicación del marcador (puede arrastrarlo antes).
      </label>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Nombre del centro *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Acopio Parroquia San Juan"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-teal-500"
        />
        <p className="mt-1 text-[9px] text-slate-400">Puede ser distinto al lugar buscado.</p>
      </div>

      {error && <p className="text-[10px] font-medium text-rose-600">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:bg-slate-300"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Guardar y usar este centro
      </button>
    </div>
  );
}
