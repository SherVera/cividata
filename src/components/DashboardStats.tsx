/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Paciente, CensoStats, grupoEtarioLabel, pacienteTieneEdad, resolveGrupoEtario } from '../types';
import { APP_NAME } from '../brand';
import type { AppRole } from '../lib/authRoles';
import { isPersonalMedico, isRegistrador } from '../lib/authRoles';
import type { MetricDrillDown } from '../lib/metricDrillDown';
import { isRegistroToday, isRegistroWithinDays } from '../lib/registroDates';
import {
  Users, ShieldCheck, Heart, Smile, Warehouse,
  CalendarDays, MapPinOff, Stethoscope, UserCog, UserX, Activity, ClipboardList,
  ChevronRight, School, AlertCircle, Syringe,
} from 'lucide-react';

export type SuperAdminDashboardStats = {
  totalUsuarios: number;
  personalMedico: number;
  registradores: number;
  admins: number;
  deshabilitadas: number;
};

interface DashboardStatsProps {
  patients: Paciente[];
  totalCentrosRegistrados: number;
  role: AppRole;
  superAdminStats?: SuperAdminDashboardStats | null;
  onDrillDown?: (action: MetricDrillDown) => void;
}

function computeFieldStats(list: Paciente[]) {
  return {
    registrosHoy: list.filter((p) => isRegistroToday(p.fechaRegistro)).length,
    registrosUltimos7Dias: list.filter((p) => isRegistroWithinDays(p.fechaRegistro, 7)).length,
    sinCentro: list.filter((p) => p.puntoRegistroTipo !== 'medico' && !p.centroAcopioId).length,
    conHistoriaClinica: list.filter((p) => p.notasClinicas.length > 0).length,
    alergiasCronicos: list.filter((p) => p.tieneAlergias || p.tieneCondicionMedica).length,
    esquemaIncompleto: list.filter((p) => p.esquemaVacunacion === 'Incompleto').length,
    sinEdad: list.filter((p) => !pacienteTieneEdad(p)).length,
    asisteEscuela: list.filter((p) => p.asisteEscuela).length,
    noAsisteEscuela: list.filter((p) => !p.asisteEscuela).length,
  };
}

function RoleSection({
  badge,
  title,
  description,
  badgeClass,
  children,
}: {
  badge: string;
  title: string;
  description: string;
  badgeClass: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
            {badge}
          </span>
          <h3 className="mt-2 text-sm font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  hintClass,
  icon: Icon,
  iconClass,
  onDrillDown,
  drillLabel = 'Ver detalle',
}: {
  label: string;
  value: number;
  hint: string;
  hintClass: string;
  icon: typeof Users;
  iconClass: string;
  onDrillDown?: () => void;
  drillLabel?: string;
}) {
  const content = (
    <>
      <div className="space-y-1 min-w-0">
        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
        <span className="text-2xl md:text-3xl font-bold font-mono text-slate-800 block">{value}</span>
        <span className={`text-[10px] font-semibold ${hintClass}`}>{hint}</span>
        {onDrillDown && (
          <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 mt-1">
            {drillLabel}
            <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>
      <div className={`p-3 rounded-lg shrink-0 ${iconClass}`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
    </>
  );

  if (!onDrillDown) {
    return (
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onDrillDown}
      className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex items-center justify-between text-left w-full cursor-pointer transition-all hover:border-blue-200 hover:shadow-md hover:bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    >
      {content}
    </button>
  );
}

function ClickableStatBucket({
  label,
  value,
  desc,
  ring,
  onDrillDown,
}: {
  label: string;
  value: number;
  desc: string;
  ring: string;
  onDrillDown?: () => void;
}) {
  const className = `rounded-2xl border border-slate-200 p-4 ring-4 ${ring} text-left w-full ${
    onDrillDown
      ? 'cursor-pointer transition-all hover:border-blue-200 hover:shadow-sm hover:bg-blue-50/20 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
      : ''
  }`;

  const inner = (
    <>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <div className="mt-1 font-mono text-3xl font-bold text-slate-800">{value}</div>
      <p className="mt-1 text-[11px] text-slate-500">{desc}</p>
      {onDrillDown && value > 0 && (
        <span className="mt-2 text-[10px] font-bold text-blue-600 flex items-center gap-0.5">
          Ver listado
          <ChevronRight className="w-3 h-3" />
        </span>
      )}
    </>
  );

  if (!onDrillDown) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <button type="button" onClick={onDrillDown} disabled={value === 0} className={className}>
      {inner}
    </button>
  );
}

export default function DashboardStats({
  patients,
  totalCentrosRegistrados,
  role,
  superAdminStats,
  onDrillDown,
}: DashboardStatsProps) {
  const drill = (action: MetricDrillDown) => onDrillDown?.(action);

  const computeStats = (list: Paciente[]): CensoStats => {
    const total = list.length;
    let completo = 0;
    let incompleto = 0;
    let asiste = 0;
    let noAsiste = 0;
    let masc = 0;
    let fem = 0;
    let otro = 0;

    let bebes = 0;
    let preescolar = 0;
    let escolar = 0;
    let adolescentes = 0;
    let ninos = 0;
    let adultos = 0;
    let terceraEdad = 0;
    let sinEdad = 0;

    list.forEach((p) => {
      if (p.esquemaVacunacion === 'Completo') completo++;
      else incompleto++;

      if (p.asisteEscuela) asiste++;
      else noAsiste++;

      if (p.genero === 'Masculino') masc++;
      else if (p.genero === 'Femenino') fem++;
      else otro++;

      if (pacienteTieneEdad(p)) {
        const age = p.edadAnios;
        if (age <= 2) bebes++;
        else if (age <= 5) preescolar++;
        else if (age <= 12) escolar++;
        else adolescentes++;
      } else {
        sinEdad++;
      }

      const grupo = resolveGrupoEtario(p);
      if (grupo === 'adulto') adultos++;
      else if (grupo === 'tercera_edad') terceraEdad++;
      else if (grupo === 'nino') ninos++;
    });

    return {
      totalPacientes: total,
      esquemaCompleto: completo,
      esquemaIncompleto: incompleto,
      asisteEscuelaCount: asiste,
      noAsisteEscuelaCount: noAsiste,
      generos: { masculino: masc, femenino: fem, otro },
      gruposEtarios: { nino: ninos, adulto: adultos, tercera_edad: terceraEdad },
      rangosEdad: { bebes, preescolar, escolar, adolescentes },
      sinEdad,
    };
  };

  const [demographicsView, setDemographicsView] = useState<'edad' | 'clasificacion'>('clasificacion');

  const stats = computeStats(patients);
  const fieldStats = computeFieldStats(patients);

  const conEdad =
    stats.rangosEdad.bebes +
    stats.rangosEdad.preescolar +
    stats.rangosEdad.escolar +
    stats.rangosEdad.adolescentes;

  const ageBuckets = [
    { key: 'Bebes' as const, val: stats.rangosEdad.bebes, label: '0-2 años', desc: 'Lactantes / bebés', color: 'bg-blue-600', ring: 'ring-blue-100' },
    { key: 'Preescolar' as const, val: stats.rangosEdad.preescolar, label: '3-5 años', desc: 'Preescolar', color: 'bg-blue-400', ring: 'ring-blue-50' },
    { key: 'Escolar' as const, val: stats.rangosEdad.escolar, label: '6-12 años', desc: 'Escolares', color: 'bg-indigo-400', ring: 'ring-indigo-50' },
    { key: 'Adolescentes' as const, val: stats.rangosEdad.adolescentes, label: '13+ años', desc: 'Adolescentes y mayores', color: 'bg-slate-500', ring: 'ring-slate-100' },
  ] as const;

  const classBuckets = [
    { key: 'nino' as const, color: 'bg-teal-500', ring: 'ring-teal-100', text: 'text-teal-700' },
    { key: 'adulto' as const, color: 'bg-blue-500', ring: 'ring-blue-100', text: 'text-blue-700' },
    { key: 'tercera_edad' as const, color: 'bg-violet-500', ring: 'ring-violet-100', text: 'text-violet-700' },
  ] as const;

  const vaccinePercentage = stats.totalPacientes > 0
    ? Math.round((stats.esquemaCompleto / stats.totalPacientes) * 100)
    : 0;

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const vaccineStrokeDashoffset = circumference - (vaccinePercentage / 100) * circumference;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total triajes"
          value={stats.totalPacientes}
          hint="Pacientes registrados"
          hintClass="text-blue-600"
          icon={Users}
          iconClass="bg-blue-50 text-blue-600"
          onDrillDown={onDrillDown ? () => drill({ target: 'listado' }) : undefined}
          drillLabel="Ver todos"
        />
        <MetricCard
          label="Vacunados"
          value={stats.esquemaCompleto}
          hint={`${vaccinePercentage}% cobertura`}
          hintClass="text-green-600"
          icon={ShieldCheck}
          iconClass="bg-green-50 text-green-600"
          onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterVacuna: 'Completo' } }) : undefined}
        />
        <MetricCard
          label="Alergias / crónicos"
          value={fieldStats.alergiasCronicos}
          hint="Con atención especial"
          hintClass="text-rose-600"
          icon={Heart}
          iconClass="bg-rose-50 text-rose-600"
          onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterSalud: 'AtencionEspecial' } }) : undefined}
        />
        <MetricCard
          label="Centros"
          value={totalCentrosRegistrados}
          hint="Registrados en el sistema"
          hintClass="text-teal-600"
          icon={Warehouse}
          iconClass="bg-teal-50 text-teal-600"
          onDrillDown={onDrillDown ? () => drill({ target: 'centros' }) : undefined}
          drillLabel="Ver centros"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Triajes hoy"
          value={fieldStats.registrosHoy}
          hint="Registros del día"
          hintClass="text-blue-600"
          icon={CalendarDays}
          iconClass="bg-blue-50 text-blue-600"
          onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterRegistro: 'Hoy' } }) : undefined}
        />
        <MetricCard
          label="Últimos 7 días"
          value={fieldStats.registrosUltimos7Dias}
          hint="Actividad reciente"
          hintClass="text-indigo-600"
          icon={Activity}
          iconClass="bg-indigo-50 text-indigo-600"
          onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterRegistro: 'Ultimos7' } }) : undefined}
        />
        <MetricCard
          label="Esquema incompleto"
          value={fieldStats.esquemaIncompleto}
          hint="Pendientes de vacunación"
          hintClass="text-amber-600"
          icon={Syringe}
          iconClass="bg-amber-50 text-amber-600"
          onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterVacuna: 'Incompleto' } }) : undefined}
        />
        <MetricCard
          label="Con historia clínica"
          value={fieldStats.conHistoriaClinica}
          hint="Seguimiento médico iniciado"
          hintClass="text-teal-600"
          icon={Stethoscope}
          iconClass="bg-teal-50 text-teal-600"
          onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterHistoria: 'ConNotas' } }) : undefined}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Pacientes por edad o clasificación</h3>
            <p className="text-xs text-slate-500">
              Cantidad por rangos de edad o por clasificación etaria. Toque un bloque para ver el listado filtrado.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setDemographicsView('edad')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                demographicsView === 'edad'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Por edad
            </button>
            <button
              type="button"
              onClick={() => setDemographicsView('clasificacion')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                demographicsView === 'clasificacion'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Por clasificación
            </button>
          </div>
        </div>

        {demographicsView === 'edad' ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {ageBuckets.map((bucket) => (
                <div key={bucket.key}>
                <ClickableStatBucket
                  label={bucket.label}
                  value={bucket.val}
                  desc={bucket.desc}
                  ring={bucket.ring}
                  onDrillDown={
                    onDrillDown
                      ? () => drill({ target: 'listado', filters: { filterAgeRange: bucket.key } })
                      : undefined
                  }
                />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span>
                <strong className="font-mono text-slate-700">{conEdad}</strong> con edad registrada
              </span>
              {stats.sinEdad > 0 && (
                <button
                  type="button"
                  onClick={() => onDrillDown && drill({ target: 'listado', filters: { filterEdad: 'SinEdad' } })}
                  disabled={!onDrillDown}
                  className="text-amber-700 font-semibold hover:underline cursor-pointer disabled:cursor-default disabled:no-underline"
                >
                  <strong className="font-mono">{stats.sinEdad}</strong> sin edad ni fecha → ver listado
                </button>
              )}
              <span>
                <strong className="font-mono text-slate-700">{stats.totalPacientes}</strong> en {APP_NAME}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {classBuckets.map(({ key, color, ring, text }) => {
                const val = stats.gruposEtarios[key];
                const pct = stats.totalPacientes > 0 ? Math.round((val / stats.totalPacientes) * 100) : 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onDrillDown && drill({ target: 'listado', filters: { filterGrupoEtario: key } })}
                    disabled={!onDrillDown || val === 0}
                    className={`rounded-2xl border border-slate-200 p-5 ring-4 ${ring} text-left w-full transition-all ${
                      onDrillDown && val > 0
                        ? 'cursor-pointer hover:border-blue-200 hover:shadow-sm hover:bg-blue-50/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${text}`}>
                          {grupoEtarioLabel(key)}
                        </span>
                        <div className="mt-1 font-mono text-3xl font-bold text-slate-800">{val}</div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {pct}% de triajes · {val} paciente{val === 1 ? '' : 's'}
                        </p>
                        {onDrillDown && val > 0 && (
                          <span className="mt-2 text-[10px] font-bold text-blue-600 flex items-center gap-0.5">
                            Ver listado
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className={`h-3 w-3 rounded-full ${color}`} />
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              Clasificación manual sin edad conocida; calculada automáticamente cuando hay fecha o edad tentativa.
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Esquema de vacunación</h4>
            <p className="text-[10px] text-slate-400">Proporción con esquema completo.</p>
          </div>

          <div className="flex items-center justify-center py-2 relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r={radius} className="stroke-slate-100 fill-none" strokeWidth="8" />
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-green-500 fill-none transition-all duration-500"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={stats.totalPacientes > 0 ? vaccineStrokeDashoffset : circumference}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-xl font-mono font-bold text-slate-800">{vaccinePercentage}%</span>
              <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Completo</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onDrillDown && drill({ target: 'listado', filters: { filterVacuna: 'Completo' } })}
              disabled={!onDrillDown}
              className="flex items-center gap-1.5 justify-center rounded-lg py-1 hover:bg-green-50 disabled:cursor-default"
            >
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              <span className="text-slate-600">Completo ({stats.esquemaCompleto})</span>
            </button>
            <button
              type="button"
              onClick={() => onDrillDown && drill({ target: 'listado', filters: { filterVacuna: 'Incompleto' } })}
              disabled={!onDrillDown}
              className="flex items-center gap-1.5 justify-center rounded-lg py-1 hover:bg-slate-50 disabled:cursor-default"
            >
              <span className="w-2.5 h-2.5 bg-slate-200 rounded-full" />
              <span className="text-slate-600">Falta ({stats.esquemaIncompleto})</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Distribución por edad</h4>
            <p className="text-[10px] text-slate-400">Rangos según años registrados.</p>
          </div>

          <div className="h-32 flex items-end justify-between px-2 gap-3 pt-6 relative">
            <div className="absolute inset-x-0 bottom-0 border-b border-slate-100" />
            <div className="absolute inset-x-0 bottom-1/3 border-b border-dashed border-slate-100/50" />
            <div className="absolute inset-x-0 bottom-2/3 border-b border-dashed border-slate-100/50" />

            {ageBuckets.map((bar) => {
              const maxVal = Math.max(...ageBuckets.map((b) => b.val), 1);
              const heightPct = (bar.val / maxVal) * 85;

              return (
                <button
                  key={bar.key}
                  type="button"
                  onClick={() => onDrillDown && drill({ target: 'listado', filters: { filterAgeRange: bar.key } })}
                  disabled={!onDrillDown || bar.val === 0}
                  className="flex-1 flex flex-col items-center group relative z-10 cursor-pointer disabled:cursor-default"
                >
                  <span className="text-[10px] font-mono font-bold text-slate-700 mb-1">{bar.val}</span>
                  <div
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                    className={`w-full rounded-t-md transition-all duration-500 shadow-sm ${bar.color} group-hover:brightness-95`}
                  />
                  <span className="text-[9px] font-bold text-slate-500 font-mono mt-1.5">
                    {bar.label.replace(' años', 'a')}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[9px] text-slate-400 text-center font-medium">
            {conEdad} con edad · {stats.sinEdad > 0 ? `${stats.sinEdad} sin edad` : 'todos con edad'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Escolaridad</h4>
            <p className="text-[10px] text-slate-400">Asistencia escolar declarada.</p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onDrillDown && drill({ target: 'listado', filters: { filterEscuela: 'Asiste' } })}
              disabled={!onDrillDown}
              className="w-full space-y-1 text-left rounded-lg p-1 hover:bg-teal-50/50 disabled:cursor-default"
            >
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span className="flex items-center gap-1"><School className="w-3 h-3" /> Asiste</span>
                <span className="font-mono">{stats.asisteEscuelaCount}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-teal-500"
                  style={{ width: `${stats.totalPacientes > 0 ? (stats.asisteEscuelaCount / stats.totalPacientes) * 100 : 0}%` }}
                />
              </div>
            </button>
            <button
              type="button"
              onClick={() => onDrillDown && drill({ target: 'listado', filters: { filterEscuela: 'NoAsiste' } })}
              disabled={!onDrillDown}
              className="w-full space-y-1 text-left rounded-lg p-1 hover:bg-slate-50 disabled:cursor-default"
            >
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>No asiste</span>
                <span className="font-mono">{stats.noAsisteEscuelaCount}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-400"
                  style={{ width: `${stats.totalPacientes > 0 ? (stats.noAsisteEscuelaCount / stats.totalPacientes) * 100 : 0}%` }}
                />
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Género</h4>
            <p className="text-[10px] text-slate-400">Distribución demográfica del censo.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                <span>Distribución</span>
                <span className="font-mono text-slate-700">
                  M: {stats.generos.masculino} | F: {stats.generos.femenino}
                </span>
              </div>
              <div className="h-3.5 bg-slate-100 rounded-full flex overflow-hidden">
                {stats.generos.masculino > 0 && (
                  <button
                    type="button"
                    onClick={() => onDrillDown && drill({ target: 'listado', filters: { filterGender: 'Masculino' } })}
                    disabled={!onDrillDown}
                    style={{ width: `${(stats.generos.masculino / (stats.totalPacientes || 1)) * 100}%` }}
                    className="bg-blue-500 h-full flex items-center justify-center text-[8px] text-white font-mono font-bold cursor-pointer hover:brightness-95 disabled:cursor-default"
                    title="Masculino"
                  >
                    M
                  </button>
                )}
                {stats.generos.femenino > 0 && (
                  <button
                    type="button"
                    onClick={() => onDrillDown && drill({ target: 'listado', filters: { filterGender: 'Femenino' } })}
                    disabled={!onDrillDown}
                    style={{ width: `${(stats.generos.femenino / (stats.totalPacientes || 1)) * 100}%` }}
                    className="bg-rose-400 h-full flex items-center justify-center text-[8px] text-white font-mono font-bold cursor-pointer hover:brightness-95 disabled:cursor-default"
                    title="Femenino"
                  >
                    F
                  </button>
                )}
                {stats.generos.otro > 0 && (
                  <button
                    type="button"
                    onClick={() => onDrillDown && drill({ target: 'listado', filters: { filterGender: 'Otro' } })}
                    disabled={!onDrillDown}
                    style={{ width: `${(stats.generos.otro / (stats.totalPacientes || 1)) * 100}%` }}
                    className="bg-indigo-400 h-full flex items-center justify-center text-[8px] text-white font-mono font-bold cursor-pointer hover:brightness-95 disabled:cursor-default"
                    title="Otro"
                  >
                    O
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="text-[10px] bg-slate-50 border border-slate-200 text-slate-500 rounded-lg p-2.5 flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5 text-blue-600" />
            <span>Toque una barra o tarjeta para abrir el listado filtrado.</span>
          </div>
        </div>
      </div>

      {isPersonalMedico(role) && (
        <RoleSection
          badge="Personal médico"
          title="Seguimiento clínico"
          description="Indicadores de atención y pendientes clínicos en su ámbito."
          badgeClass="border-blue-100 bg-blue-50 text-blue-700"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Con historia clínica"
              value={fieldStats.conHistoriaClinica}
              hint="Seguimiento iniciado"
              hintClass="text-teal-600"
              icon={Stethoscope}
              iconClass="bg-teal-50 text-teal-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterHistoria: 'ConNotas' } }) : undefined}
            />
            <MetricCard
              label="Alergias / crónicos"
              value={fieldStats.alergiasCronicos}
              hint="Requieren atención"
              hintClass="text-rose-600"
              icon={Heart}
              iconClass="bg-rose-50 text-rose-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterSalud: 'AtencionEspecial' } }) : undefined}
            />
            <MetricCard
              label="Esquema incompleto"
              value={fieldStats.esquemaIncompleto}
              hint="Vacunación pendiente"
              hintClass="text-amber-600"
              icon={Syringe}
              iconClass="bg-amber-50 text-amber-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterVacuna: 'Incompleto' } }) : undefined}
            />
            <MetricCard
              label="Últimos 7 días"
              value={fieldStats.registrosUltimos7Dias}
              hint="Triajes recientes"
              hintClass="text-indigo-600"
              icon={Activity}
              iconClass="bg-indigo-50 text-indigo-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterRegistro: 'Ultimos7' } }) : undefined}
            />
          </div>
        </RoleSection>
      )}

      {isRegistrador(role) && (
        <RoleSection
          badge="Asistente"
          title="Captura en campo"
          description="Indicadores de registro y datos pendientes de completar."
          badgeClass="border-teal-100 bg-teal-50 text-teal-700"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Triajes hoy"
              value={fieldStats.registrosHoy}
              hint="Registros del día"
              hintClass="text-blue-600"
              icon={CalendarDays}
              iconClass="bg-blue-50 text-blue-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterRegistro: 'Hoy' } }) : undefined}
            />
            <MetricCard
              label="Últimos 7 días"
              value={fieldStats.registrosUltimos7Dias}
              hint="Actividad reciente"
              hintClass="text-indigo-600"
              icon={Activity}
              iconClass="bg-indigo-50 text-indigo-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterRegistro: 'Ultimos7' } }) : undefined}
            />
            <MetricCard
              label="Sin centro"
              value={fieldStats.sinCentro}
              hint="Pendientes de asignar"
              hintClass="text-amber-600"
              icon={MapPinOff}
              iconClass="bg-amber-50 text-amber-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterCentro: 'SinCentro' } }) : undefined}
            />
            <MetricCard
              label="Sin edad"
              value={fieldStats.sinEdad}
              hint="Completar datos"
              hintClass="text-amber-600"
              icon={AlertCircle}
              iconClass="bg-amber-50 text-amber-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterEdad: 'SinEdad' } }) : undefined}
            />
          </div>
        </RoleSection>
      )}

      {role === 'admin' && (
        <RoleSection
          badge="Solo admin"
          title="Operación de campo"
          description="Indicadores de captura y seguimiento del personal médico."
          badgeClass="border-blue-100 bg-blue-50 text-blue-700"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Triajes hoy"
              value={fieldStats.registrosHoy}
              hint="Triajes del día"
              hintClass="text-blue-600"
              icon={CalendarDays}
              iconClass="bg-blue-50 text-blue-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterRegistro: 'Hoy' } }) : undefined}
            />
            <MetricCard
              label="Últimos 7 días"
              value={fieldStats.registrosUltimos7Dias}
              hint="Actividad reciente"
              hintClass="text-indigo-600"
              icon={Activity}
              iconClass="bg-indigo-50 text-indigo-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterRegistro: 'Ultimos7' } }) : undefined}
            />
            <MetricCard
              label="Sin centro"
              value={fieldStats.sinCentro}
              hint="Pendientes de asignar"
              hintClass="text-amber-600"
              icon={MapPinOff}
              iconClass="bg-amber-50 text-amber-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterCentro: 'SinCentro' } }) : undefined}
            />
            <MetricCard
              label="Con historia clínica"
              value={fieldStats.conHistoriaClinica}
              hint="Seguimiento médico iniciado"
              hintClass="text-teal-600"
              icon={Stethoscope}
              iconClass="bg-teal-50 text-teal-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'listado', filters: { filterHistoria: 'ConNotas' } }) : undefined}
            />
          </div>
        </RoleSection>
      )}

      {role === 'super_admin' && superAdminStats && (
        <RoleSection
          badge="Solo super admin"
          title="Gobernanza del sistema"
          description="Resumen de cuentas y accesos. Toque una métrica para ver usuarios filtrados."
          badgeClass="border-violet-100 bg-violet-50 text-violet-700"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <MetricCard
              label="Usuarios totales"
              value={superAdminStats.totalUsuarios}
              hint="Cuentas visibles"
              hintClass="text-violet-600"
              icon={Users}
              iconClass="bg-violet-50 text-violet-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'admin', roleFilter: 'all' }) : undefined}
              drillLabel="Ver usuarios"
            />
            <MetricCard
              label="Personal médico"
              value={superAdminStats.personalMedico}
              hint="Atención clínica"
              hintClass="text-blue-600"
              icon={Stethoscope}
              iconClass="bg-blue-50 text-blue-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'admin', roleFilter: 'personal_medico' }) : undefined}
              drillLabel="Ver usuarios"
            />
            <MetricCard
              label="Asistentes"
              value={superAdminStats.registradores ?? 0}
              hint="Captura en campo"
              hintClass="text-teal-600"
              icon={ClipboardList}
              iconClass="bg-teal-50 text-teal-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'admin', roleFilter: 'registrador' }) : undefined}
              drillLabel="Ver usuarios"
            />
            <MetricCard
              label="Administradores"
              value={superAdminStats.admins}
              hint="Gestión operativa"
              hintClass="text-indigo-600"
              icon={UserCog}
              iconClass="bg-indigo-50 text-indigo-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'admin', roleFilter: 'admin' }) : undefined}
              drillLabel="Ver usuarios"
            />
            <MetricCard
              label="Suspendidas"
              value={superAdminStats.deshabilitadas}
              hint="Cuentas deshabilitadas"
              hintClass="text-rose-600"
              icon={UserX}
              iconClass="bg-rose-50 text-rose-600"
              onDrillDown={onDrillDown ? () => drill({ target: 'admin', roleFilter: 'disabled' }) : undefined}
              drillLabel="Ver usuarios"
            />
          </div>
        </RoleSection>
      )}
    </div>
  );
}
