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
  portaled?: boolean;
  id?: string;
  'aria-label'?: string;
};

const sizeConfig = {
  sm: {
    control: 'min-h-[34px] px-2.5 py-1.5 text-xs font-semibold',
    option: 'min-h-[34px] px-2.5 py-1.5 text-xs font-semibold',
    icon: 'h-3.5 w-3.5',
    radius: 'rounded-lg',
  },
  md: {
    control: 'min-h-[42px] px-4 py-2.5 text-sm font-medium',
    option: 'min-h-[42px] px-4 py-2.5 text-sm font-medium',
    icon: 'h-4 w-4',
    radius: 'rounded-xl',
  },
};

const accentBorder = {
  teal: 'border-teal-500',
  blue: 'border-blue-500',
};

const accentRing = {
  teal: 'ring-2 ring-teal-500/10',
  blue: 'ring-2 ring-blue-500/10',
};

const accentSelected = {
  teal: 'bg-teal-50 text-teal-900',
  blue: 'bg-blue-50 text-blue-900',
};

const accentCheck = {
  teal: 'text-teal-600',
  blue: 'text-blue-600',
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
  portaled = false,
  id,
  'aria-label': ariaLabel,
}: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const cfg = sizeConfig[size];
  const selected = options.find((option) => option.value === value);

  const updateMenuPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom - 1,
      left: rect.left,
      width: rect.width,
      zIndex: 300,
    });
  };

  const closeMenu = () => setOpen(false);

  const toggleMenu = () => {
    if (disabled) return;
    if (open) {
      closeMenu();
      return;
    }
    if (portaled) updateMenuPosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (portaled && (target as Element).closest?.('[data-select-menu]')) return;
      closeMenu();
    };

    const handleReposition = () => {
      if (portaled && open) updateMenuPosition();
    };

    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, portaled]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const focusRing =
    accent === 'teal'
      ? 'focus:border-teal-500 focus:ring-teal-500/10'
      : 'focus:border-blue-500 focus:ring-blue-500/10';

  const controlClass = [
    'flex w-full items-center justify-between gap-2 text-left text-slate-800 transition-colors',
    'focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
    cfg.control,
    open && !portaled
      ? 'rounded-none border-0 bg-white'
      : [
          'border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:ring-2',
          'disabled:hover:bg-slate-50',
          cfg.radius,
          focusRing,
        ].join(' '),
  ].join(' ');

  const optionsList = (
    <ul role="listbox" aria-labelledby={fieldId} className="max-h-60 overflow-auto py-0.5">
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
              className={[
                'flex w-full items-center justify-between gap-2 text-left transition-colors',
                cfg.option,
                isSelected ? accentSelected[accent] : 'text-slate-800 hover:bg-slate-50',
              ].join(' ')}
            >
              <span className="truncate">{option.label}</span>
              {isSelected && <Check className={`${cfg.icon} shrink-0 ${accentCheck[accent]}`} />}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const portaledMenu = (
    <div
      data-select-menu
      style={menuStyle}
      className={[
        'overflow-hidden border border-t-0 bg-white py-0.5 shadow-lg shadow-slate-200/40',
        cfg.radius.replace('rounded-', 'rounded-b-'),
        accentBorder[accent],
      ].join(' ')}
    >
      {optionsList}
    </div>
  );

  const trigger = (
    <button
      ref={buttonRef}
      id={fieldId}
      type="button"
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={ariaLabel}
      onClick={toggleMenu}
      className={controlClass}
    >
      <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
        {selected?.label ?? placeholder}
      </span>
      <ChevronDown
        className={`${cfg.icon} shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {open && !portaled ? (
        <div
          className={[
            'overflow-hidden border bg-white shadow-lg shadow-slate-200/40',
            cfg.radius,
            accentBorder[accent],
            accentRing[accent],
          ].join(' ')}
        >
          <div className="border-b border-slate-100">{trigger}</div>
          {optionsList}
        </div>
      ) : (
        <>
          <button
            ref={buttonRef}
            id={fieldId}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={ariaLabel}
            onClick={toggleMenu}
            className={[
              'flex w-full items-center justify-between gap-2 border text-left text-slate-800 transition-colors',
              'bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-slate-50',
              cfg.control,
              cfg.radius,
              focusRing,
              open && portaled
                ? `relative z-20 border-b-transparent bg-white ${accentBorder[accent]} ${accentRing[accent]} rounded-b-none`
                : 'border-slate-200',
            ].join(' ')}
          >
            <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronDown
              className={`${cfg.icon} shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
          {open && portaled && createPortal(portaledMenu, document.body)}
        </>
      )}
    </div>
  );
}
