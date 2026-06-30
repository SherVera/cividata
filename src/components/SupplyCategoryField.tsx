import React, { useMemo } from 'react';
import type { SupplyCategory } from '../lib/centerSupplyApi';
import { cn } from '../lib/cn';
import SelectField from './SelectField';

const CUSTOM_SUPPLY_CATEGORY_KEY = '__custom__';

type SupplyCategoryFieldProps = {
  categories: SupplyCategory[];
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  menuZIndex?: number;
  size?: 'sm' | 'md';
};

const customInputClass = cn(
  'ui-select__row ui-select__control ui-select--md ui-select--teal',
  'h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800',
  'focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

/** Clasificación de insumo: catálogo `supply_categories` o texto nuevo (se crea al guardar). */
export default function SupplyCategoryField({
  categories,
  value,
  onChange,
  disabled = false,
  menuZIndex = 300,
  size = 'md',
}: SupplyCategoryFieldProps) {
  const knownNames = useMemo(
    () => new Set(categories.map((category) => category.name.toLowerCase())),
    [categories]
  );

  const isCustomValue = value.trim() !== '' && !knownNames.has(value.trim().toLowerCase());

  const selectValue = isCustomValue ? CUSTOM_SUPPLY_CATEGORY_KEY : value;

  const options = useMemo(
    () => [
      ...categories.map((category) => ({
        value: category.name,
        label: category.name,
      })),
      { value: CUSTOM_SUPPLY_CATEGORY_KEY, label: 'Otra clasificación…' },
    ],
    [categories]
  );

  const handleSelectChange = (next: string) => {
    if (next === CUSTOM_SUPPLY_CATEGORY_KEY) {
      if (!isCustomValue) onChange('');
      return;
    }
    onChange(next);
  };

  const showCustomInput = selectValue === CUSTOM_SUPPLY_CATEGORY_KEY;

  return (
    <div className="space-y-2">
      <SelectField
        value={selectValue}
        onChange={handleSelectChange}
        options={options}
        disabled={disabled}
        placeholder="Seleccione clasificación…"
        size={size}
        accent="teal"
        menuZIndex={menuZIndex}
      />
      {showCustomInput && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required
          placeholder="Escriba la nueva clasificación…"
          className={customInputClass}
        />
      )}
      <p className="text-[10px] leading-relaxed text-slate-400">
        Elija una clasificación existente o escriba una nueva; se guardará en el catálogo del centro.
      </p>
    </div>
  );
}
