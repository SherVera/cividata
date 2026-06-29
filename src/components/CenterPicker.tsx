import React, { useMemo, useState } from 'react';
import type { CollectionCenter } from '../lib/collectionCentersApi';
import {
  buildCenterSearchList,
  isRecentCenter,
  resolveRecentCenters,
} from '../lib/centerPicker';

type CenterPickerProps = {
  collectionCenters: CollectionCenter[];
  recentCenterIds: string[];
  selectedCenterId: string;
  selectedCenterName: string;
  centerFilter: string;
  onCenterFilterChange: (value: string) => void;
  onSelectCenter: (center: CollectionCenter) => void;
  onClearSelection?: () => void;
  inputClass?: string;
  error?: string;
  placeholder?: string;
};

export default function CenterPicker({
  collectionCenters,
  recentCenterIds,
  selectedCenterId,
  selectedCenterName,
  centerFilter,
  onCenterFilterChange,
  onSelectCenter,
  onClearSelection,
  inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10',
  error,
  placeholder = 'Buscar centro...',
}: CenterPickerProps) {
  const [listOpen, setListOpen] = useState(false);

  const recentCenters = useMemo(
    () => resolveRecentCenters(recentCenterIds, collectionCenters),
    [recentCenterIds, collectionCenters]
  );

  const searchList = useMemo(
    () => buildCenterSearchList(collectionCenters, recentCenterIds, centerFilter),
    [collectionCenters, recentCenterIds, centerFilter]
  );

  const showList = listOpen && searchList.length > 0;
  const showRecentHint = !centerFilter.trim() && recentCenters.length > 0;

  const handleSelect = (center: CollectionCenter) => {
    onSelectCenter(center);
    setListOpen(false);
  };

  return (
    <div className="space-y-2">
      {recentCenters.length > 0 && (
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Centros más usados
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {recentCenters.map((center) => (
              <button
                key={center.id}
                type="button"
                onClick={() => handleSelect(center)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  selectedCenterId === center.id
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
                }`}
              >
                {center.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        value={centerFilter || selectedCenterName}
        onChange={(e) => {
          onCenterFilterChange(e.target.value);
          if (!e.target.value.trim()) {
            onClearSelection?.();
          }
          setListOpen(true);
        }}
        onFocus={() => setListOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setListOpen(false), 150);
        }}
        placeholder={placeholder}
        className={`${inputClass} ${error ? 'border-red-300 ring-2 ring-red-500/10' : ''}`}
      />

      {showRecentHint && listOpen && !centerFilter.trim() && (
        <p className="text-[10px] text-slate-400">
          Toque el campo para ver sus centros más usados o escriba para buscar.
        </p>
      )}

      {showList && (
        <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {searchList.map((center) => (
            <button
              key={center.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(center)}
              className={`block w-full px-3 py-2 text-left text-xs hover:bg-teal-50 ${
                selectedCenterId === center.id
                  ? 'bg-teal-50 font-bold text-teal-800'
                  : 'text-slate-700'
              }`}
            >
              {isRecentCenter(center.id, recentCenterIds) && (
                <span className="mr-1 text-[10px] font-bold uppercase text-teal-600">
                  Frecuente
                </span>
              )}
              <span className="font-semibold">{center.name}</span>
              {center.address && (
                <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                  {center.address}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedCenterId && !centerFilter && (
        <p className="text-xs font-semibold text-teal-700">
          Seleccionado: {selectedCenterName}
        </p>
      )}

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
