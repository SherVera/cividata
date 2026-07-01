import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { DocumentExportFormat } from '../lib/documentExport';

type ExportFormatModalProps = {
  open: boolean;
  title: string;
  description?: string;
  itemCount?: number;
  onClose: () => void;
  onExport: (format: DocumentExportFormat) => void | Promise<void>;
};

const FORMAT_OPTIONS: {
  value: DocumentExportFormat;
  label: string;
  hint: string;
  icon: typeof FileText;
}[] = [
  {
    value: 'pdf',
    label: 'PDF',
    hint: 'Documento listo para imprimir o compartir.',
    icon: FileText,
  },
  {
    value: 'csv',
    label: 'CSV',
    hint: 'Hoja de cálculo (Excel, Google Sheets).',
    icon: FileSpreadsheet,
  },
];

export default function ExportFormatModal({
  open,
  title,
  description,
  itemCount,
  onClose,
  onExport,
}: ExportFormatModalProps) {
  const [exporting, setExporting] = useState<DocumentExportFormat | null>(null);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleExport = async (format: DocumentExportFormat) => {
    setError('');
    setExporting(format);
    try {
      await onExport(format);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Cerrar"
        onClick={() => !exporting && onClose()}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
            {itemCount != null && (
              <p className="mt-1 text-[11px] font-semibold text-blue-700">
                {itemCount} registro{itemCount === 1 ? '' : 's'} según filtros actuales
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!exporting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {FORMAT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const busy = exporting === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={!!exporting}
                onClick={() => void handleExport(option.value)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-800">{option.label}</span>
                  <span className="block text-[11px] text-slate-500">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}
      </motion.div>
    </div>
  );
}
