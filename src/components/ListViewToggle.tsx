import React from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import type { ListViewMode } from '../lib/listViewMode';

type ListViewToggleProps = {
  value: ListViewMode;
  onChange: (mode: ListViewMode) => void;
  className?: string;
};

export default function ListViewToggle({ value, onChange, className = '' }: ListViewToggleProps) {
  return (
    <div
      className={`inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 ${className}`}
      role="group"
      aria-label="Formato del listado"
    >
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
          value === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
        aria-pressed={value === 'cards'}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
        Tarjetas
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
          value === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
        aria-pressed={value === 'table'}
      >
        <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
        Tabla
      </button>
    </div>
  );
}
