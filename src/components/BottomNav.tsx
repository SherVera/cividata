import { BarChart3, ClipboardList, Plus, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export type BottomNavKey = 'listado' | 'create' | 'estadisticas' | 'admin';

interface BottomNavProps {
  active: BottomNavKey;
  onSelect: (key: BottomNavKey) => void;
  showAdmin?: boolean;
}

const listadoItem = { key: 'listado' as const, label: 'Listado', icon: ClipboardList };
const statsItem = { key: 'estadisticas' as const, label: 'Estadísticas', icon: BarChart3 };
const createItem = { key: 'create' as const, label: 'Triaje', icon: Plus };
const adminItem = { key: 'admin' as const, label: 'Admin', icon: ShieldCheck };

export default function BottomNav({ active, onSelect, showAdmin = false }: BottomNavProps) {
  const items = [
    statsItem,
    listadoItem,
    createItem,
    ...(showAdmin ? [adminItem] : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden print:hidden">
      <div className="mx-auto max-w-md px-3 pb-safe">
        <div className="mb-2 flex items-stretch justify-around rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-lg shadow-slate-900/10 backdrop-blur-md">
          {items.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-colors active:scale-95"
              >
                {isActive && (
                  <motion.span
                    layoutId="bottomNavActive"
                    className="absolute inset-0 rounded-xl bg-blue-50"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  className={`relative z-10 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span
                  className={`relative z-10 text-[10px] font-bold tracking-tight ${
                    isActive ? 'text-blue-700' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
