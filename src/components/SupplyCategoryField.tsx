import React, { useEffect, useMemo, useState } from 'react';
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
  const [creatingNew, setCreatingNew] = useState(false);

  const knownNames = useMemo(
    () => new Set(categories.map((category) => category.name.toLowerCase())),
    [categories]
  );

  const trimmedValue = value.trim();
  const isCustomValue = trimmedValue !== '' && !knownNames.has(trimmedValue.toLowerCase());
  const showCustomInput = creatingNew || isCustomValue;
  const selectValue = showCustomInput ? CUSTOM_SUPPLY_CATEGORY_KEY : value;

  useEffect(() => {
    if (trimmedValue && knownNames.has(trimmedValue.toLowerCase())) {
      setCreatingNew(false);
    }
  }, [trimmedValue, knownNames]);

  const options = useMemo(
    () => [
      { value: CUSTOM_SUPPLY_CATEGORY_KEY, label: 'Nueva clasificación…' },
      ...categories.map((category) => ({
        value: category.name,
        label: category.name,
      })),
    ],
    [categories]
  );

  const handleSelectChange = (next: string) => {
    if (next === CUSTOM_SUPPLY_CATEGORY_KEY) {
      setCreatingNew(true);
      if (!isCustomValue) onChange('');
      return;
    }
    setCreatingNew(false);
    onChange(next);
  };

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
          autoFocus
          placeholder="Nombre de la nueva clasificación…"
          className={customInputClass}
        />
      )}
      <p className="text-[10px] leading-relaxed text-slate-400">
        Elija una clasificación existente o use «Nueva clasificación»; se guardará en el catálogo al registrar.
      </p>
    </div>
  );
}
