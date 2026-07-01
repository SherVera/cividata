import React from 'react';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { Paciente, edadPacienteTexto, pacienteRequiereRepresentante, puntoRegistroEtiqueta } from '../types';
import PatientPhoto from './PatientPhoto';

type PatientListTableProps = {
  patients: Paciente[];
  canEdit: boolean;
  canDelete: boolean;
  onView: (patient: Paciente) => void;
  onEdit: (patient: Paciente) => void;
  onDelete: (patient: Paciente) => void;
};

export default function PatientListTable({
  patients,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
}: PatientListTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Género</th>
              <th className="px-4 py-3">Vacunación</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Representante</th>
              <th className="px-4 py-3">Punto / ciudad</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-[12rem]">
                    {p.fotoPath && (
                      <PatientPhoto
                        fotoPath={p.fotoPath}
                        alt={`${p.nombres} ${p.apellidos}`}
                        className="h-9 w-9 rounded-lg object-cover border border-slate-200 shrink-0"
                        fallbackClassName="hidden"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {p.nombres} {p.apellidos}
                      </p>
                      <p className="text-xs text-slate-500">{edadPacienteTexto(p)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-slate-600">{p.genero}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.esquemaVacunacion === 'Completo'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {p.esquemaVacunacion}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.documentoIdentidad || '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-600 max-w-[10rem] truncate">
                  {pacienteRequiereRepresentante(p)
                    ? p.nombreRepresentante
                      ? `${p.nombreRepresentante} (${p.parentesco})`
                      : 'Sin registrar'
                    : 'No aplica'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[12rem] truncate">
                  {puntoRegistroEtiqueta(p) || `${p.ciudadMunicipio}${p.estadoProvincia ? `, ${p.estadoProvincia}` : ''}` || '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(p)}
                        title="Eliminar captura"
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(p)}
                        title="Editar ficha"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onView(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg font-bold text-[11px] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
