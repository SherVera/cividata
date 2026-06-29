import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';

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
  /** Si false, el menú usa absolute dentro del root (puede recortarse con overflow del padre). */
  portaled?: boolean;
  id?: string;
  'aria-label'?: string;
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
  portaled = true,
  id,
  'aria-label': ariaLabel,
}: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const selected = options.find((option) => option.value === value);
  const variantClass = cn(`ui-select--${size}`, `ui-select--${accent}`);
  const rootClass = cn('ui-select', variantClass, className);

  const updateMenuPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    const rootRect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (portaled) {
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
        zIndex: 300,
      });
      return;
    }

    if (!rootRect) return;
    setMenuStyle({
      position: 'absolute',
      top: rect.bottom - rootRect.top,
      left: rect.left - rootRect.left,
      width: rect.width,
      zIndex: 50,
    });
  };

  const closeMenu = () => setOpen(false);

  const toggleMenu = () => {
    if (disabled) return;
    if (open) {
      closeMenu();
      return;
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, portaled]);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as Element).closest?.('[data-select-menu]')) return;
      closeMenu();
    };

    const handleReposition = () => {
      if (open) updateMenuPosition();
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

  const controlClass = cn(
    'ui-select__row',
    'ui-select__control',
    open && 'ui-select__control--open',
  );

  const trailingIcon = (kind: 'chevron' | 'check' | 'spacer') => {
    if (kind === 'chevron') {
      return (
        <ChevronDown
          className={cn('ui-select__icon', 'ui-select__icon--muted', open && 'ui-select__icon--open')}
        />
      );
    }
    if (kind === 'check') {
      return <Check className={cn('ui-select__icon', `ui-select__icon--${accent}`)} />;
    }
    return <span className="ui-select__icon" aria-hidden />;
  };

  const optionsList = (
    <ul role="listbox" aria-labelledby={fieldId} className="ui-select__list">
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
              className="ui-select__row ui-select__option"
            >
              <span className="ui-select__label">{option.label}</span>
              {trailingIcon(isSelected ? 'check' : 'spacer')}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const menu = (
    <div
      data-select-menu
      style={menuStyle}
      className={cn('ui-select__menu', open && 'ui-select__menu--open')}
    >
      {optionsList}
    </div>
  );

  return (
    <div ref={rootRef} className={rootClass}>
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
        <span className={cn('ui-select__label', selected ? 'ui-select__label--value' : 'ui-select__label--placeholder')}>
          {selected?.label ?? placeholder}
        </span>
        {trailingIcon('chevron')}
      </button>
      {open &&
        (portaled ? createPortal(<div className={variantClass}>{menu}</div>, document.body) : menu)}
    </div>
  );
}
