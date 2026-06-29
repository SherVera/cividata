import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
  accent?: 'teal' | 'blue';
  id?: string;
  'aria-label'?: string;
};

const sizeClasses = {
  sm: 'px-2.5 py-1.5 text-xs font-semibold rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
};

const accentClasses = {
  teal: 'focus:border-teal-500 focus:ring-teal-500/10 data-[open=true]:border-teal-500 data-[open=true]:ring-2 data-[open=true]:ring-teal-500/10',
  blue: 'focus:border-blue-500 focus:ring-blue-500/10 data-[open=true]:border-blue-500 data-[open=true]:ring-2 data-[open=true]:ring-blue-500/10',
};

const selectedOptionClasses = {
  teal: 'bg-teal-50 font-semibold text-teal-800',
  blue: 'bg-blue-50 font-semibold text-blue-800',
};

export default function SelectField({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = 'Seleccionar',
  className = '',
  size = 'md',
  accent = 'teal',
  id,
  'aria-label': ariaLabel,
}: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const selected = options.find((option) => option.value === value);

  const updateMenuPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      zIndex: 300,
    });
  };

  const closeMenu = () => setOpen(false);

  const openMenu = () => {
    if (disabled) return;
    updateMenuPosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if ((target as Element).closest?.('[data-select-menu]')) return;
      closeMenu();
    };

    const handleReposition = () => updateMenuPosition();

    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const menu = open
    ? createPortal(
        <ul
          data-select-menu
          role="listbox"
          aria-labelledby={fieldId}
          style={menuStyle}
          className="max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-300/30"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    closeMenu();
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                    isSelected ? selectedOptionClasses[accent] : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        id={fieldId}
        type="button"
        disabled={disabled}
        data-open={open}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? closeMenu() : openMenu())}
        className={`flex w-full items-center justify-between gap-2 border border-slate-200 bg-slate-50 text-left text-slate-800 transition-colors hover:bg-white focus:bg-white focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${accentClasses[accent]} ${className}`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </>
  );
}
