/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Paciente, CensoStats, grupoEtarioLabel, pacienteTieneEdad } from '../types';
import type { AppRole } from '../lib/authRoles';
import { 
  Users, ShieldCheck, GraduationCap, Heart, Smile, Warehouse,
  CalendarDays, MapPinOff, Stethoscope, UserCog, UserX, Activity
} from 'lucide-react';

export type SuperAdminDashboardStats = {
  totalUsuarios: number;
  personalMedico: number;
  admins: number;
  deshabilitadas: number;
};

interface DashboardStatsProps {
  patients: Paciente[];
  totalCentrosRegistrados: number;
  role: AppRole;
  superAdminStats?: SuperAdminDashboardStats | null;
}

function parseRegistroDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function isToday(dateStr: string): boolean {
  const d = parseRegistroDate(dateStr);
  if (!d) return false;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function isWithinDays(dateStr: string, days: number): boolean {
  const d = parseRegistroDate(dateStr);
  if (!d) return false;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
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
}: {
  label: string;
  value: number;
  hint: string;
  hintClass: string;
  icon: typeof Users;
  iconClass: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
      <div className="space-y-1">
        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
        <span className="text-2xl md:text-3xl font-bold font-mono text-slate-800 block">{value}</span>
        <span className={`text-[10px] font-semibold ${hintClass}`}>{hint}</span>
      </div>
      <div className={`p-3 rounded-lg ${iconClass}`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
    </div>
  );
}

export default function DashboardStats({
  patients,
  totalCentrosRegistrados,
  role,
  superAdminStats,
}: DashboardStatsProps) {
  
  // Calculate dynamic stats from patient list
  const computeStats = (list: Paciente[]): CensoStats => {
    const total = list.length;
    let completo = 0;
    let incompleto = 0;
    let asiste = 0;
    let noAsiste = 0;
    let masc = 0;
    let fem = 0;
    let otro = 0;
    
    let bebes = 0; // 0-2
    let preescolar = 0; // 3-5
    let escolar = 0; // 6-12
    let adolescentes = 0; // 13+
    let ninos = 0;
    let adultos = 0;
    let terceraEdad = 0;
    let sinEdad = 0;

    list.forEach(p => {
      // Vaccine scheme
      if (p.esquemaVacunacion === 'Completo') completo++;
      else incompleto++;

      // School
      if (p.asisteEscuela) asiste++;
      else noAsiste++;

      // Gender
      if (p.genero === 'Masculino') masc++;
      else if (p.genero === 'Femenino') fem++;
      else otro++;

      if (p.grupoEtario === 'adulto') adultos++;
      else if (p.grupoEtario === 'tercera_edad') terceraEdad++;
      else ninos++;

      // Age group (fecha exacta o edad tentativa)
      if (pacienteTieneEdad(p)) {
        const age = p.edadAnios;
        if (age <= 2) bebes++;
        else if (age <= 5) preescolar++;
        else if (age <= 12) escolar++;
        else adolescentes++;
      } else {
        sinEdad++;
      }
    });

    return {
      totalPacientes: total,
      esquemaCompleto: completo,
      esquemaIncompleto: incompleto,
      asisteEscuelaCount: asiste,
      noAsisteEscuelaCount: noAsiste,
      generos: {
        masculino: masc,
        femenino: fem,
        otro: otro
      },
      gruposEtarios: {
        nino: ninos,
        adulto: adultos,
        tercera_edad: terceraEdad,
      },
      rangosEdad: {
        bebes,
        preescolar,
        escolar,
        adolescentes
      },
      sinEdad,
    };
  };

  const [demographicsView, setDemographicsView] = useState<'edad' | 'clasificacion'>('clasificacion');

  const stats = computeStats(patients);

  const conEdad =
    stats.rangosEdad.bebes +
    stats.rangosEdad.preescolar +
    stats.rangosEdad.escolar +
    stats.rangosEdad.adolescentes;

  const ageBuckets = [
    { val: stats.rangosEdad.bebes, label: '0-2 años', desc: 'Lactantes / bebés', color: 'bg-blue-600', ring: 'ring-blue-100' },
    { val: stats.rangosEdad.preescolar, label: '3-5 años', desc: 'Preescolar', color: 'bg-blue-400', ring: 'ring-blue-50' },
    { val: stats.rangosEdad.escolar, label: '6-12 años', desc: 'Escolares', color: 'bg-indigo-400', ring: 'ring-indigo-50' },
    { val: stats.rangosEdad.adolescentes, label: '13+ años', desc: 'Adolescentes y mayores', color: 'bg-slate-500', ring: 'ring-slate-100' },
  ] as const;

  const classBuckets = [
    { key: 'nino' as const, color: 'bg-teal-500', ring: 'ring-teal-100', text: 'text-teal-700' },
    { key: 'adulto' as const, color: 'bg-blue-500', ring: 'ring-blue-100', text: 'text-blue-700' },
    { key: 'tercera_edad' as const, color: 'bg-violet-500', ring: 'ring-violet-100', text: 'text-violet-700' },
  ] as const;

  const adminFieldStats = {
    registrosHoy: patients.filter((p) => isToday(p.fechaRegistro)).length,
    registrosUltimos7Dias: patients.filter((p) => isWithinDays(p.fechaRegistro, 7)).length,
    sinCentro: patients.filter((p) => p.puntoRegistroTipo !== 'medico' && !p.centroAcopioId).length,
    conHistoriaClinica: patients.filter((p) => p.notasClinicas.length > 0).length,
  };

  const vaccinePercentage = stats.totalPacientes > 0 
    ? Math.round((stats.esquemaCompleto / stats.totalPacientes) * 100) 
    : 0;

  const schoolPercentage = stats.totalPacientes > 0 
    ? Math.round((stats.asisteEscuelaCount / stats.totalPacientes) * 100) 
    : 0;

  // Circular progress SVG values
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const vaccineStrokeDashoffset = circumference - (vaccinePercentage / 100) * circumference;
  const schoolStrokeDashoffset = circumference - (schoolPercentage / 100) * circumference;

  return (
    <div className="space-y-6">
      
      {/* Metrics Row (Large Bento Numbers) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Total Pacientes */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Censo</span>
            <span className="text-2xl md:text-3xl font-bold font-mono text-slate-800 block">{stats.totalPacientes}</span>
            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
              <Smile className="w-3.5 h-3.5" /> Pacientes registrados
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        {/* Metric 2: Vacunas Completas */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block">Vacunados</span>
            <span className="text-2xl md:text-3xl font-bold font-mono text-slate-800 block">{stats.esquemaCompleto}</span>
            <span className="text-[10px] text-green-600 font-semibold">
              {vaccinePercentage}% Cobertura
            </span>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        {/* Metric 3: Escolaridad */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block">Escolarizados</span>
            <span className="text-2xl md:text-3xl font-bold font-mono text-slate-800 block">{stats.asisteEscuelaCount}</span>
            <span className="text-[10px] text-indigo-600 font-semibold">
              {schoolPercentage}% Asistencia
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <GraduationCap className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        {/* Metric 4: Alert / Alergias crónicas */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block">Alergias / Crónicos</span>
            <span className="text-2xl md:text-3xl font-bold font-mono text-slate-800 block">
              {patients.filter(p => p.tieneAlergias || p.tieneCondicionMedica).length}
            </span>
            <span className="text-[10px] text-rose-600 font-semibold">
              Con atención especial
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <Heart className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        {/* Metric 5: Centros de acopio */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block">Centros</span>
            <span className="text-2xl md:text-3xl font-bold font-mono text-slate-800 block">{totalCentrosRegistrados}</span>
            <span className="text-[10px] text-teal-600 font-semibold">
              Registrados en el sistema
            </span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
            <Warehouse className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

      </div>

      {/* Demografía: por edad o por clasificación */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Pacientes por edad o clasificación</h3>
            <p className="text-xs text-slate-500">
              Cantidad registrada por rangos de edad (fecha o tentativa) o por clasificación etaria asignada manualmente.
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
                <div
                  key={bucket.label}
                  className={`rounded-2xl border border-slate-200 p-4 ring-4 ${bucket.ring}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{bucket.label}</span>
                  <div className="mt-1 font-mono text-3xl font-bold text-slate-800">{bucket.val}</div>
                  <p className="mt-1 text-[11px] text-slate-500">{bucket.desc}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span>
                <strong className="font-mono text-slate-700">{conEdad}</strong> con edad registrada
              </span>
              {stats.sinEdad > 0 && (
                <span>
                  <strong className="font-mono text-amber-700">{stats.sinEdad}</strong> sin edad ni fecha
                </span>
              )}
              <span>
                <strong className="font-mono text-slate-700">{stats.totalPacientes}</strong> total censo
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
                  <div
                    key={key}
                    className={`rounded-2xl border border-slate-200 p-5 ring-4 ${ring}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${text}`}>
                          {grupoEtarioLabel(key)}
                        </span>
                        <div className="mt-1 font-mono text-3xl font-bold text-slate-800">{val}</div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {pct}% del censo · {val} paciente{val === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className={`h-3 w-3 rounded-full ${color}`} />
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              Clasificación asignada manualmente en cada ficha (niño/a, adulto, tercera edad).
            </p>
          </>
        )}
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Chart Card 1: Vaccination Scheme Ring Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Esquema de Vacunación</h4>
            <p className="text-[10px] text-slate-400">Proporción de inmunización infantil.</p>
          </div>

          <div className="flex items-center justify-center py-2 relative">
            <svg className="w-32 h-32 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-slate-100 fill-none"
                strokeWidth="8"
              />
              {/* Progress Circle */}
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
            <div className="flex items-center gap-1.5 justify-center">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
              <span className="text-slate-600">Completo ({stats.esquemaCompleto})</span>
            </div>
            <div className="flex items-center gap-1.5 justify-center">
              <span className="w-2.5 h-2.5 bg-slate-200 rounded-full"></span>
              <span className="text-slate-600">Falta ({stats.esquemaIncompleto})</span>
            </div>
          </div>
        </div>

        {/* Chart Card 2: Age Demographics Histogram */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Distribución por edad</h4>
            <p className="text-[10px] text-slate-400">Rangos pediátricos según años registrados.</p>
          </div>

          {/* Custom SVG histogram */}
          <div className="h-32 flex items-end justify-between px-2 gap-3 pt-6 relative">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-x-0 bottom-0 border-b border-slate-100"></div>
            <div className="absolute inset-x-0 bottom-1/3 border-b border-dashed border-slate-100/50"></div>
            <div className="absolute inset-x-0 bottom-2/3 border-b border-dashed border-slate-100/50"></div>

            {/* Bars */}
            {ageBuckets.map((bar, idx) => {
              const maxVal = Math.max(...ageBuckets.map((b) => b.val), 1);
              const heightPct = (bar.val / maxVal) * 85; // cap at 85% for styling space
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative z-10">
                  {/* Tooltip value */}
                  <span className="text-[10px] font-mono font-bold text-slate-700 mb-1 opacity-100 scale-100 transition-all">
                    {bar.val}
                  </span>
                  
                  {/* Bar pillar */}
                  <div 
                    style={{ height: `${Math.max(heightPct, 4)}%` }} // minimum 4% height to be visible
                    className={`w-full rounded-t-md transition-all duration-500 shadow-sm ${bar.color} hover:brightness-95`}
                  ></div>
                  
                  {/* Label */}
                  <span className="text-[9px] font-bold text-slate-500 font-mono mt-1.5">
                    {bar.label.replace(' años', 'a')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[9px] text-slate-400 text-center font-medium">
            {conEdad} con edad · {stats.sinEdad > 0 ? `${stats.sinEdad} sin edad` : 'todos con edad'}
          </div>
        </div>

        {/* Chart Card 3: Clasificación etaria */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Por clasificación</h4>
            <p className="text-[10px] text-slate-400">Niño/a, adulto y tercera edad.</p>
          </div>

          <div className="space-y-3">
            {classBuckets.map(({ key, color }) => {
              const val = stats.gruposEtarios[key];
              const pct = stats.totalPacientes > 0 ? (val / stats.totalPacientes) * 100 : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>{grupoEtarioLabel(key)}</span>
                    <span className="font-mono">{val} pac.</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[9px] text-slate-400 text-center font-medium">
            Clasificación manual en ficha
          </div>
        </div>

        {/* Chart Card 4: School Attendance & Gender Proportion */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Género &amp; Educación</h4>
            <p className="text-[10px] text-slate-400">Demografía e inserción escolar.</p>
          </div>

          <div className="space-y-4">
            {/* Gender Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                <span>Distribución de Género</span>
                <span className="font-mono text-slate-700">
                  M: {stats.generos.masculino} | F: {stats.generos.femenino}
                </span>
              </div>
              <div className="h-3.5 bg-slate-100 rounded-full flex overflow-hidden">
                {/* Masculino */}
                {stats.generos.masculino > 0 && (
                  <div 
                    style={{ width: `${(stats.generos.masculino / (stats.totalPacientes || 1)) * 100}%` }}
                    className="bg-blue-500 h-full flex items-center justify-center text-[8px] text-white font-mono font-bold"
                    title="Masculino"
                  >
                    M
                  </div>
                )}
                {/* Femenino */}
                {stats.generos.femenino > 0 && (
                  <div 
                    style={{ width: `${(stats.generos.femenino / (stats.totalPacientes || 1)) * 100}%` }}
                    className="bg-rose-400 h-full flex items-center justify-center text-[8px] text-white font-mono font-bold"
                    title="Femenino"
                  >
                    F
                  </div>
                )}
                {/* Otro */}
                {stats.generos.otro > 0 && (
                  <div 
                    style={{ width: `${(stats.generos.otro / (stats.totalPacientes || 1)) * 100}%` }}
                    className="bg-indigo-400 h-full flex items-center justify-center text-[8px] text-white font-mono font-bold"
                    title="Otro"
                  >
                    O
                  </div>
                )}
              </div>
            </div>

            {/* School Enrollment Gauge bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                <span>Matrícula Escolar</span>
                <span className="font-mono text-slate-700">
                  {stats.asisteEscuelaCount} de {stats.totalPacientes} asistiendo
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${schoolPercentage}%` }}
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                ></div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-400 font-medium">
                <span>{schoolPercentage}% de matrícula activa</span>
                <span>{stats.noAsisteEscuelaCount} sin escolaridad</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] bg-slate-50 border border-slate-200 text-slate-500 rounded-lg p-2.5 flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
            <span>Útil para proyectar requerimientos de vacunas y escuelas.</span>
          </div>
        </div>

      </div>

      {role === 'admin' && (
        <RoleSection
          badge="Solo admin"
          title="Operación de campo"
          description="Indicadores de captura y seguimiento del personal médico. No visibles para super admin."
          badgeClass="border-blue-100 bg-blue-50 text-blue-700"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Registros hoy"
              value={adminFieldStats.registrosHoy}
              hint="Capturas del día"
              hintClass="text-blue-600"
              icon={CalendarDays}
              iconClass="bg-blue-50 text-blue-600"
            />
            <MetricCard
              label="Últimos 7 días"
              value={adminFieldStats.registrosUltimos7Dias}
              hint="Actividad reciente"
              hintClass="text-indigo-600"
              icon={Activity}
              iconClass="bg-indigo-50 text-indigo-600"
            />
            <MetricCard
              label="Sin centro"
              value={adminFieldStats.sinCentro}
              hint="Pendientes de asignar"
              hintClass="text-amber-600"
              icon={MapPinOff}
              iconClass="bg-amber-50 text-amber-600"
            />
            <MetricCard
              label="Con historia clínica"
              value={adminFieldStats.conHistoriaClinica}
              hint="Seguimiento médico iniciado"
              hintClass="text-teal-600"
              icon={Stethoscope}
              iconClass="bg-teal-50 text-teal-600"
            />
          </div>
        </RoleSection>
      )}

      {role === 'super_admin' && superAdminStats && (
        <RoleSection
          badge="Solo super admin"
          title="Gobernanza del sistema"
          description="Resumen de cuentas y accesos. No heredado por admin ni personal médico."
          badgeClass="border-violet-100 bg-violet-50 text-violet-700"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Usuarios totales"
              value={superAdminStats.totalUsuarios}
              hint="Cuentas visibles"
              hintClass="text-violet-600"
              icon={Users}
              iconClass="bg-violet-50 text-violet-600"
            />
            <MetricCard
              label="Personal médico"
              value={superAdminStats.personalMedico}
              hint="Captura en campo"
              hintClass="text-blue-600"
              icon={Stethoscope}
              iconClass="bg-blue-50 text-blue-600"
            />
            <MetricCard
              label="Administradores"
              value={superAdminStats.admins}
              hint="Gestión operativa"
              hintClass="text-indigo-600"
              icon={UserCog}
              iconClass="bg-indigo-50 text-indigo-600"
            />
            <MetricCard
              label="Suspendidas"
              value={superAdminStats.deshabilitadas}
              hint="Cuentas deshabilitadas"
              hintClass="text-rose-600"
              icon={UserX}
              iconClass="bg-rose-50 text-rose-600"
            />
          </div>
        </RoleSection>
      )}

    </div>
  );
}
