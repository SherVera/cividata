import React from 'react';
import { Building2, Package, Warehouse } from 'lucide-react';
import type { CollectionCenter } from '../lib/collectionCentersApi';
import { isAcopioCenter } from '../lib/collectionCentersApi';
import { formatQty } from '../lib/centerSupplyApi';
import { FACILITY_TYPE_LABELS } from '../brand';

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
              <th className="px-4 py-3">Establecimiento</th>
              <th className="px-4 py-3">Tipo</th>
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
              const acopio = isAcopioCenter(center);
              return (
                <tr key={center.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-800">{center.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      acopio ? 'bg-teal-50 text-teal-700' : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {acopio ? <Warehouse className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                      {FACILITY_TYPE_LABELS[center.facility_type]}
                    </span>
                  </td>
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
                    {acopio ? (
                      needs && needs.openItems > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-800">
                          <Package className="h-3.5 w-3.5" />
                          {needs.openItems} ítems · faltan {formatQty(needs.pendingUnits)}
                        </span>
                      ) : (
                        <span className="font-medium text-teal-700">Al día</span>
                      )
                    ) : (
                      <span className="text-slate-400">No aplica</span>
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
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold text-white ${
                        acopio ? 'bg-teal-600 hover:bg-teal-700' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {acopio ? 'Ver insumos' : 'Ver ficha'}
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
