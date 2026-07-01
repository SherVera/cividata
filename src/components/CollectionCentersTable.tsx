import React from 'react';
import { Package } from 'lucide-react';
import type { CollectionCenter } from '../lib/collectionCentersApi';
import { formatQty } from '../lib/centerSupplyApi';

type CenterNeedSummary = { openItems: number; pendingUnits: number };

type CollectionCentersTableProps = {
  centers: CollectionCenter[];
  centerNeedCounts: Map<string, CenterNeedSummary>;
  canManage: boolean;
  saving: boolean;
  onOpen: (center: CollectionCenter) => void;
  onEdit: (center: CollectionCenter) => void;
  onToggleActive: (center: CollectionCenter) => void;
};

export default function CollectionCentersTable({
  centers,
  centerNeedCounts,
  canManage,
  saving,
  onOpen,
  onEdit,
  onToggleActive,
}: CollectionCentersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Centro</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Insumos</th>
              {canManage && <th className="px-4 py-3 text-right">Gestión</th>}
              <th className="px-4 py-3 text-right">Abrir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {centers.map((center) => {
              const needs = centerNeedCounts.get(center.id);
              return (
                <tr key={center.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-800">{center.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[14rem] truncate">
                    {center.address || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        center.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {center.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {needs && needs.openItems > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-800">
                        <Package className="h-3.5 w-3.5" />
                        {needs.openItems} ítems · faltan {formatQty(needs.pendingUnits)}
                      </span>
                    ) : (
                      <span className="text-teal-700 font-medium">Al día</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(center)}
                          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => onToggleActive(center)}
                          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                        >
                          {center.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpen(center)}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-teal-700"
                    >
                      Ver insumos
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
