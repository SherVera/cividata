import React, { useId } from 'react';
import type { SupplyCategory } from '../lib/centerSupplyApi';

type SupplyCategoryFieldProps = {
  categories: SupplyCategory[];
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
};

/** Clasificación de insumo: catálogo `supply_categories` o texto nuevo (se crea al guardar). */
export default function SupplyCategoryField({
  categories,
  value,
  onChange,
  disabled = false,
}: SupplyCategoryFieldProps) {
  const listId = useId();

  return (
    <div className="space-y-1">
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
        placeholder="Ej.: Medicinas, Ropa, Insumos…"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 disabled:opacity-60"
      />
      <datalist id={listId}>
        {categories.map((category) => (
          <option key={category.id} value={category.name} />
        ))}
      </datalist>
      <p className="text-[10px] leading-relaxed text-slate-400">
        Elija una clasificación existente o escriba una nueva; se guardará en el catálogo del centro.
      </p>
    </div>
  );
}
