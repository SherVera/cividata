/**
 * Selector múltiple con filtro sobre catálogo existente y opción de crear nuevos ítems.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { joinMultiValue, parseMultiValue } from '../lib/multiValue';

interface CatalogMultiPickerProps {
  id: string;
  label: string;
  placeholder: string;
  hint?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function CatalogMultiPicker({
  id,
  label,
  placeholder,
  hint,
  options,
  value,
  onChange,
  error,
}: CatalogMultiPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => parseMultiValue(value), [value]);

  const availableOptions = useMemo(() => {
    const selectedLower = new Set(selected.map(s => s.toLowerCase()));
    const q = query.trim().toLowerCase();
    return options
      .filter(o => !selectedLower.has(o.toLowerCase()))
      .filter(o => !q || o.toLowerCase().includes(q))
      .slice(0, 8);
  }, [options, query, selected]);

  const trimmedQuery = query.trim();
  const canCreate =
    trimmedQuery.length > 0 &&
    !selected.some(s => s.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !options.some(o => o.toLowerCase() === trimmedQuery.toLowerCase());

  const addItem = (item: string) => {
    const next = joinMultiValue([...selected, item.trim()]);
    onChange(next);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeItem = (item: string) => {
    onChange(joinMultiValue(selected.filter(s => s !== item)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (availableOptions.length > 0) {
        addItem(availableOptions[0]);
      } else if (canCreate) {
        addItem(trimmedQuery);
      }
    } else if (e.key === 'Backspace' && !query && selected.length > 0) {
      removeItem(selected[selected.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && (availableOptions.length > 0 || canCreate);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 uppercase mb-1">
        {label} <span className="text-red-500">*</span>
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(item => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium"
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="p-0.5 rounded hover:bg-teal-100 transition-colors cursor-pointer"
                aria-label={`Quitar ${item}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-9 pr-4 py-2 bg-white border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
            error ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
          }`}
        />

        {showDropdown && (
          <ul className="absolute z-20 mt-1 w-full max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg text-sm">
            {availableOptions.map(option => (
              <li key={option}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addItem(option)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  {option}
                </button>
              </li>
            ))}
            {canCreate && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addItem(trimmedQuery)}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 text-teal-700 font-medium flex items-center gap-1.5 cursor-pointer border-t border-slate-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear «{trimmedQuery}»
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
      {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
    </div>
  );
}
