import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export interface MobileDrawerItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  active?: boolean;
  badge?: string | number;
  tone?: 'default' | 'amber' | 'teal' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

interface MobileOptionsDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: MobileDrawerItem[];
}

const toneClasses: Record<NonNullable<MobileDrawerItem['tone']>, string> = {
  default: 'text-blue-600 bg-blue-50',
  amber: 'text-amber-600 bg-amber-50',
  teal: 'text-teal-600 bg-teal-50',
  danger: 'text-rose-600 bg-rose-50',
};

export default function MobileOptionsDrawer({
  open,
  onClose,
  title = 'Opciones',
  items,
}: MobileOptionsDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden print:hidden" role="presentation">
          <motion.button
            type="button"
            aria-label="Cerrar menú"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-slate-200 bg-white shadow-2xl pt-safe pb-safe"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const tone = item.tone ?? 'default';
                  const iconTone = item.active ? toneClasses[tone] : 'text-slate-500 bg-slate-100';

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={item.disabled}
                        onClick={() => {
                          if (item.disabled) return;
                          item.onSelect();
                          onClose();
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                          item.active ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconTone}`}
                        >
                          <Icon
                            className={`h-4 w-4 ${item.loading ? 'animate-spin' : ''}`}
                            strokeWidth={item.active ? 2.4 : 2}
                          />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold">{item.label}</span>
                        {item.badge != null && item.badge !== 0 && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
