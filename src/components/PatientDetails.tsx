/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Paciente, NotaClinica, puntoRegistroEtiqueta, grupoEtarioLabel, edadPacienteTexto, resolveGrupoEtario } from '../types';
import { 
  User, MapPin, ShieldAlert, Heart, GraduationCap, 
  ArrowLeft, Edit3, Printer, Plus, Calendar, Activity, 
  ShieldCheck, FileText, ChevronRight, Phone, Mail, FileClock, ClipboardList, Warehouse, Stethoscope
} from 'lucide-react';
import { motion } from 'motion/react';
import { fetchCatalogs } from '../lib/catalogsApi';
import { parseMultiValue } from '../lib/multiValue';
import GeoMapPicker from './GeoMapPicker';
import { formatDistance, haversineMeters } from '../lib/geo';
import PatientPhoto from './PatientPhoto';

interface PatientDetailsProps {
  patient: Paciente;
  onEdit: (paciente: Paciente) => void;
  onBack: () => void;
  onUpdatePatient: (updatedPatient: Paciente) => void;
}

export default function PatientDetails({ patient, onEdit, onBack, onUpdatePatient }: PatientDetailsProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({
    fecha: new Date().toISOString().split('T')[0],
    peso: patient.peso,
    estatura: patient.estatura,
    motivo: "",
    diagnostico: "",
    tratamiento: ""
  });
  const [noteError, setNoteError] = useState("");

  // Catálogos de salud para diagnóstico/tratamiento (filtrar existentes o crear nuevo).
  const [diagnosisOptions, setDiagnosisOptions] = useState<string[]>([]);
  const [treatmentOptions, setTreatmentOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchCatalogs()
      .then((c) => {
        setDiagnosisOptions(c.diagnoses);
        setTreatmentOptions(c.treatments);
      })
      .catch(() => {/* sin catálogos: texto libre */});
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.motivo.trim() || !newNote.diagnostico.trim() || !newNote.tratamiento.trim()) {
      setNoteError("Por favor complete todos los campos de la consulta.");
      return;
    }
    if (newNote.peso <= 0 || newNote.estatura <= 0) {
      setNoteError("El peso y la estatura deben ser mayores a 0.");
      return;
    }

    const createdNote: NotaClinica = {
      id: "note-" + Math.random().toString(36).substr(2, 9),
      fecha: newNote.fecha,
      peso: parseFloat(newNote.peso.toString()),
      estatura: parseFloat(newNote.estatura.toString()),
      motivo: newNote.motivo,
      diagnostico: newNote.diagnostico,
      tratamiento: newNote.tratamiento
    };

    // Update patient with new note AND update their current weight/height with latest measurements
    const updatedPatient: Paciente = {
      ...patient,
      peso: createdNote.peso,
      estatura: createdNote.estatura,
      notasClinicas: [createdNote, ...patient.notasClinicas] // newest note first
    };

    onUpdatePatient(updatedPatient);
    setShowAddNote(false);
    // Reset form
    setNewNote({
      fecha: new Date().toISOString().split('T')[0],
      peso: createdNote.peso,
      estatura: createdNote.estatura,
      motivo: "",
      diagnostico: "",
      tratamiento: ""
    });
    setNoteError("");
  };

  // Find previous measurements to show progression
  const getProgression = () => {
    if (patient.notasClinicas.length <= 1) {
      return { weightDiff: 0, heightDiff: 0 };
    }
    // Since notes are sorted with newest first, index 0 is current, index 1 is previous
    const current = patient.notasClinicas[0];
    const prev = patient.notasClinicas[1];
    
    return {
      weightDiff: parseFloat((current.peso - prev.peso).toFixed(2)),
      heightDiff: parseFloat((current.estatura - prev.estatura).toFixed(2))
    };
  };

  const progression = getProgression();

  const renderHealthTags = (text: string, tone: 'rose' | 'amber' | 'blue') => {
    const items = parseMultiValue(text);
    const tones = {
      rose: 'bg-rose-50 text-rose-800 border-rose-200',
      amber: 'bg-amber-50 text-amber-800 border-amber-200',
      blue: 'bg-blue-50 text-blue-800 border-blue-200',
    };
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span
            key={item}
            className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-medium ${tones[tone]}`}
          >
            {item}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Bar (Hidden during printing) */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm print:hidden">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Listado
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(patient)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 transition-all cursor-pointer active:scale-95"
          >
            <Edit3 className="w-4 h-4" /> Editar Ficha
          </button>
          
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Imprimir Carnet
          </button>
        </div>
      </div>

      {/* Main Clinical File Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Pediatric Profile ID Card & Health Stats */}
        <div className="lg:col-span-1 space-y-6 print:col-span-3">
          
          {/* Visual ID Card resembling medical credential */}
          <div className="bg-blue-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -translate-y-12 translate-x-12 pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-6 gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded-md uppercase">
                  HISTORIA CLÍNICA INFANTIL
                </span>
                <p className="text-[10px] text-blue-200 font-mono mt-1">ID: {patient.id.toUpperCase()}</p>
              </div>
              <div className="flex items-start gap-3">
                {patient.fotoPath && (
                  <PatientPhoto
                    fotoPath={patient.fotoPath}
                    alt={`${patient.nombres} ${patient.apellidos}`}
                    className="h-16 w-16 rounded-xl object-cover border-2 border-white/20 shadow-md"
                    fallbackClassName="hidden"
                  />
                )}
                <Heart className="w-7 h-7 text-rose-400 fill-rose-400/20 shrink-0" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-sans font-bold text-lg leading-tight tracking-tight">
                  {patient.nombres}
                </h3>
                <h4 className="font-sans font-bold text-xl tracking-tight text-blue-100">
                  {patient.apellidos}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs font-mono">
                <div>
                  <span className="text-blue-300 block text-[9px] uppercase tracking-wider">Documento</span>
                  <span className="font-semibold text-white">{patient.documentoIdentidad || "Sin Documento"}</span>
                </div>
                <div>
                  <span className="text-blue-300 block text-[9px] uppercase tracking-wider">Género</span>
                  <span className="font-semibold text-white">{patient.genero}</span>
                </div>
                <div>
                  <span className="text-blue-300 block text-[9px] uppercase tracking-wider">Edad registrada</span>
                  <span className="font-semibold text-white">
                    {edadPacienteTexto(patient)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-300 block text-[9px] uppercase tracking-wider">Clasificación</span>
                  <span className="font-semibold text-white">
                    {grupoEtarioLabel(resolveGrupoEtario(patient))}
                  </span>
                </div>
                <div>
                  <span className="text-blue-300 block text-[9px] uppercase tracking-wider">Nacionalidad</span>
                  <span className="font-semibold text-white truncate block">{patient.nacionalidad}</span>
                </div>
              </div>
            </div>

            {/* Quick Badge Status bar */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Registro validado
              </span>
              <span className="font-mono text-[10px] text-blue-200">Reg: {patient.fechaRegistro}</span>
            </div>
          </div>

          {/* Quick Vital Nutrition Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" /> Parámetros de Crecimiento
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Estatura */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estatura</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold font-mono text-slate-800">{patient.estatura}</span>
                    <span className="text-xs text-slate-500 font-medium">cm</span>
                  </div>
                </div>
                {progression.heightDiff !== 0 && (
                  <span className={`text-[10px] font-bold mt-2 flex items-center gap-0.5 ${
                    progression.heightDiff > 0 ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {progression.heightDiff > 0 ? `+${progression.heightDiff}` : progression.heightDiff} cm (Ant.)
                  </span>
                )}
              </div>

              {/* Peso */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peso</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold font-mono text-slate-800">{patient.peso}</span>
                    <span className="text-xs text-slate-500 font-medium">kg</span>
                  </div>
                </div>
                {progression.weightDiff !== 0 && (
                  <span className={`text-[10px] font-bold mt-2 flex items-center gap-0.5 ${
                    progression.weightDiff > 0 ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {progression.weightDiff > 0 ? `+${progression.weightDiff}` : progression.weightDiff} kg (Ant.)
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center text-xs py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Grupo Sanguíneo:</span>
                <span className="font-bold text-slate-700 font-mono">{patient.grupoSanguineo}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Vacunación:</span>
                <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                  patient.esquemaVacunacion === "Completo" 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  Esquema {patient.esquemaVacunacion}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Contacts */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
              Contacto de Emergencia
            </h3>
            
            <div className="text-xs space-y-2.5">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-mono font-semibold">{patient.telefonoPrincipal}</span>
              </div>
              {patient.telefonoEmergencias && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-mono text-slate-500">Emergencias: </span>
                  <span className="font-mono font-semibold">{patient.telefonoEmergencias}</span>
                </div>
              )}
              {patient.correo && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate font-mono select-all">{patient.correo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Complete Ficha Censo & Consultation Notes History */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Complete 5-section info board */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <h3 className="font-sans font-bold text-slate-700 text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                Detalles Completos de la Ficha Nacional
              </h3>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Seccion 1: Personales */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                  <User className="w-3.5 h-3.5" /> 1. Datos Personales del Niño/a
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Nombres</span>
                    <span className="font-bold text-slate-700 text-sm">{patient.nombres}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Apellidos</span>
                    <span className="font-bold text-slate-700 text-sm">{patient.apellidos}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Fecha Nacimiento</span>
                    <span className="font-bold text-slate-700 font-mono">{patient.fechaNacimiento || 'Sin registrar'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Documento Identidad</span>
                    <span className="font-semibold text-slate-700 font-mono">{patient.documentoIdentidad || "No posee / En trámite"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Edad Registrada</span>
                    <span className="font-semibold text-slate-700">
                      {edadPacienteTexto(patient)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Clasificación etaria</span>
                    <span className="font-semibold text-slate-700">
                      {grupoEtarioLabel(resolveGrupoEtario(patient))}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Nacionalidad</span>
                    <span className="font-semibold text-slate-700">{patient.nacionalidad}</span>
                  </div>
                </div>
              </div>

              {/* Seccion 2: Registro y Centro de Acopio */}
              {(patient.puntoRegistroTipo === 'medico' || patient.centroAcopioNombre || patient.registroLat != null) && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                    {patient.puntoRegistroTipo === 'medico' ? (
                      <Stethoscope className="w-3.5 h-3.5" />
                    ) : (
                      <Warehouse className="w-3.5 h-3.5" />
                    )}
                    Punto de Registro del Paciente
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                    <div className="sm:col-span-3">
                      <span className="text-slate-400 block mb-0.5">
                        {patient.puntoRegistroTipo === 'medico' ? 'Tipo de atención' : 'Centro de acopio'}
                      </span>
                      <span className={`font-semibold ${patient.puntoRegistroTipo === 'medico' ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {puntoRegistroEtiqueta(patient) || 'No especificado'}
                      </span>
                    </div>
                    {patient.registroLat != null && patient.registroLng != null && (
                      <div className="sm:col-span-3">
                        <span className="text-slate-400 block mb-0.5">Ubicación aproximada</span>
                        <span className="font-mono text-[10px] font-semibold text-slate-600">
                          {patient.registroLat.toFixed(3)}, {patient.registroLng.toFixed(3)}
                        </span>
                        {patient.puntoRegistroTipo === 'centro' &&
                          patient.centroAcopioLat != null &&
                          patient.centroAcopioLng != null && (
                          <span className="block mt-1 text-[10px] font-medium text-teal-700">
                            Distancia al centro:{' '}
                            {formatDistance(
                              haversineMeters(
                                patient.registroLat,
                                patient.registroLng,
                                patient.centroAcopioLat,
                                patient.centroAcopioLng
                              )
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {patient.registroLat != null && patient.registroLng != null && (
                    <GeoMapPicker
                      lat={patient.registroLat}
                      lng={patient.registroLng}
                      readOnly
                      centers={
                        patient.puntoRegistroTipo === 'centro' &&
                        patient.centroAcopioLat != null &&
                        patient.centroAcopioLng != null
                          ? [{
                              id: patient.centroAcopioId || 'center',
                              name: patient.centroAcopioNombre || 'Centro',
                              lat: patient.centroAcopioLat,
                              lng: patient.centroAcopioLng,
                            }]
                          : []
                      }
                      height="200px"
                    />
                  )}
                </div>
              )}

              {/* Seccion 3: Vivienda y Ubicacion */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                  <MapPin className="w-3.5 h-3.5" /> 2. Información de Vivienda y Ubicación
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                  <div className="sm:col-span-3">
                    <span className="text-slate-400 block mb-0.5">Dirección de Residencia Actual</span>
                    <span className="font-semibold text-slate-700">{patient.direccion}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Ciudad / Municipio</span>
                    <span className="font-semibold text-slate-700">{patient.ciudadMunicipio}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Estado / Provincia</span>
                    <span className="font-semibold text-slate-700">{patient.estadoProvincia}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Punto de Referencia</span>
                    <span className="font-semibold text-slate-700">{patient.puntoReferencia || "Ninguno especificado"}</span>
                  </div>
                </div>
              </div>

              {/* Seccion 3: Representante Legal */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                  <ShieldAlert className="w-3.5 h-3.5" /> 3. Datos del Representante Legal (Padre, Madre o Tutor)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block mb-0.5">Nombre Completo</span>
                    <span className="font-bold text-slate-700">{patient.nombreRepresentante}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Parentesco</span>
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full inline-block font-mono text-[10px]">{patient.parentesco}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Documento Identidad</span>
                    <span className="font-semibold text-slate-700 font-mono">{patient.documentoRepresentante}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Ocupación / Profesión</span>
                    <span className="font-semibold text-slate-700">{patient.ocupacion || "No especificado"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Teléfono Principal</span>
                    <span className="font-semibold text-slate-700 font-mono">{patient.telefonoPrincipal}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Teléfono Alternativo</span>
                    <span className="font-semibold text-slate-700 font-mono">{patient.telefonoEmergencias || "No asignado"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block mb-0.5">Correo Electrónico</span>
                    <span className="font-semibold text-slate-700 font-mono">{patient.correo || "No asignado"}</span>
                  </div>
                </div>
              </div>

              {/* Seccion 4: Salud, Nutricion y Patologias */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                  <Heart className="w-3.5 h-3.5" /> 4. Salud, Nutrición y Antecedentes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/20 col-span-1 sm:col-span-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <span className="font-bold text-slate-700 text-xs">Alergias Conocidas</span>
                    </div>
                    <div className="text-slate-600 text-[11px] leading-relaxed">
                      {patient.tieneAlergias
                        ? renderHealthTags(patient.alergiasEspecificas, 'rose')
                        : <span className="font-mono">Paciente no presenta alergias conocidas.</span>}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="font-bold text-slate-700 text-xs">Condición Médica / Enfermedad Crónica</span>
                    </div>
                    <div className="text-slate-600 text-[11px] leading-relaxed">
                      {patient.tieneCondicionMedica
                        ? renderHealthTags(patient.condicionMedicaEspecifica, 'amber')
                        : <span className="font-mono">No se reportan condiciones médicas crónicas.</span>}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="font-bold text-slate-700 text-xs">Tratamientos Médicos Regulares</span>
                    </div>
                    <div className="text-slate-600 text-[11px] leading-relaxed">
                      {patient.tomaMedicamentos
                        ? renderHealthTags(patient.medicamentosEspecificos, 'blue')
                        : <span className="font-mono">No recibe medicación recurrente.</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seccion 5: Datos Educativos */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                  <GraduationCap className="w-3.5 h-3.5" /> 5. Información Educativa
                </h4>
                {patient.asisteEscuela ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Asiste a Escuela</span>
                      <span className="font-bold text-green-600">Sí asiste actualmente</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Nivel Educativo</span>
                      <span className="font-semibold text-slate-700">{patient.nivelEducativo}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Grado / Año</span>
                      <span className="font-semibold text-slate-700">{patient.gradoAnio}</span>
                    </div>
                    <div className="sm:col-span-3">
                      <span className="text-slate-400 block mb-0.5">Nombre de la Institución Educativa</span>
                      <span className="font-bold text-slate-700">{patient.nombreInstitucion}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
                    El niño o la niña no asiste actualmente a una institución educativa.
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* HISTORIAL CLÍNICO - EVOLUCIÓN (CRITICAL FOR CLINICAL RECORD TRACKING) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-sans font-bold text-slate-700 text-sm flex items-center gap-2">
                  <FileClock className="w-4 h-4 text-blue-600" />
                  Evolución Médica &amp; Historial de Consultas
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Seguimiento cronológico del crecimiento, peso, diagnóstico y tratamiento.</p>
              </div>
              
              {!showAddNote && (
                <button
                  onClick={() => setShowAddNote(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar Consulta
                </button>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* Form to add clinical note inline */}
              {showAddNote && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-blue-50/50 rounded-lg border border-blue-200 space-y-4"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" /> Nueva Consulta Médica
                    </span>
                    <button 
                      type="button"
                      onClick={() => setShowAddNote(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                    >
                      Cancelar
                    </button>
                  </div>

                  <form onSubmit={handleNoteSubmit} className="space-y-4">
                    {noteError && (
                      <p className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded-lg border border-red-100">{noteError}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha de Consulta</label>
                        <input
                          type="date"
                          value={newNote.fecha}
                          onChange={(e) => setNewNote(prev => ({ ...prev, fecha: e.target.value }))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estatura Actual (cm)</label>
                        <input
                          type="number"
                          value={newNote.estatura}
                          onChange={(e) => setNewNote(prev => ({ ...prev, estatura: parseFloat(e.target.value) }))}
                          placeholder="cm"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Peso Actual (kg)</label>
                        <input
                          type="number"
                          value={newNote.peso}
                          onChange={(e) => setNewNote(prev => ({ ...prev, peso: parseFloat(e.target.value) }))}
                          placeholder="kg"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Motivo de la Consulta</label>
                      <input
                        type="text"
                        value={newNote.motivo}
                        onChange={(e) => setNewNote(prev => ({ ...prev, motivo: e.target.value }))}
                        placeholder="Ej. Control de crecimiento y desarrollo habitual o gripe leve."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Diagnóstico / Evaluación Clínica</label>
                      <input
                        type="text"
                        list="note-diagnoses"
                        value={newNote.diagnostico}
                        onChange={(e) => setNewNote(prev => ({ ...prev, diagnostico: e.target.value }))}
                        placeholder="Ej. Paciente sano, Faringitis viral, Anemia leve"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                      />
                      <datalist id="note-diagnoses">
                        {diagnosisOptions.map(d => <option key={d} value={d} />)}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tratamiento / Indicaciones Médicas</label>
                      <input
                        type="text"
                        list="note-treatments"
                        value={newNote.tratamiento}
                        onChange={(e) => setNewNote(prev => ({ ...prev, tratamiento: e.target.value }))}
                        placeholder="Ej. Hidratación, Salbutamol, Reposo"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                      />
                      <datalist id="note-treatments">
                        {treatmentOptions.map(t => <option key={t} value={t} />)}
                      </datalist>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddNote(false)}
                        className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg active:scale-95 transition-all shadow-sm cursor-pointer"
                      >
                        Guardar Nota de Evolución
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Consultation History Timeline */}
              {patient.notasClinicas && patient.notasClinicas.length > 0 ? (
                <div className="relative border-l border-slate-200 pl-4 space-y-6 ml-2">
                  {patient.notasClinicas.map((note, index) => (
                    <div key={note.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
                      
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {note.fecha}
                            </span>
                            {index === 0 && (
                              <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 font-bold uppercase tracking-wider px-1.5 rounded">
                                Última Consulta
                              </span>
                            )}
                          </div>
                          
                          <span className="text-[10px] font-mono text-slate-400 font-medium">
                            Talla: <strong className="text-slate-600">{note.estatura} cm</strong> &bull; Peso: <strong className="text-slate-600">{note.peso} kg</strong>
                          </span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2.5">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Motivo de consulta</span>
                            <span className="text-xs font-semibold text-slate-800">{note.motivo}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Diagnóstico / Evaluación</span>
                              <p className="text-slate-600 font-mono text-[11px] leading-relaxed mt-0.5">{note.diagnostico}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Tratamiento e indicaciones</span>
                              <p className="text-slate-600 font-mono text-[11px] leading-relaxed mt-0.5">{note.tratamiento}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-lg">
                  <ClipboardList className="w-8 h-8 text-slate-300" />
                  <span>No se han registrado consultas ni notas de evolución médica para este paciente.</span>
                  <button
                    onClick={() => setShowAddNote(true)}
                    className="text-blue-600 font-bold text-xs hover:underline mt-1 cursor-pointer"
                  >
                    + Registrar primera consulta
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
