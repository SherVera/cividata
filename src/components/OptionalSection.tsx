import React from 'react';

interface OptionalSectionProps {
  title: string;
  hint?: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  children: React.ReactNode;
}

export default function OptionalSection({
  title,
  hint,
  enabled,
  onToggle,
  children,
}: OptionalSectionProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100/80"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-700">{title}</p>
          {hint && <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{hint}</p>}
        </div>
        <span
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? 'Ocultar sección' : 'Mostrar sección'}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
            enabled ? 'bg-teal-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>
      {enabled && (
        <div className="space-y-3 border-t border-slate-100 p-4">{children}</div>
      )}
    </div>
  );
}
