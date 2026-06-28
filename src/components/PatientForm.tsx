/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Paciente, GRUPOS_ETARIOS, grupoEtarioLabel, grupoEtarioFromAge, pacienteTieneEdad } from '../types';
import { parseFormNumber, validatePatientSection1 } from '../lib/patientValidation';
import { APP_NAME } from '../brand';
import { 
  User, MapPin, ShieldAlert, Heart, GraduationCap, 
  ArrowLeft, ArrowRight, Save, RotateCcw, HelpCircle, Sparkles, Warehouse, Plus, Stethoscope, Camera, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Catalogs, GuardianOption, fetchCatalogs } from '../lib/catalogsApi';
import { parseMultiValue } from '../lib/multiValue';
import CatalogMultiPicker from './CatalogMultiPicker';
import { CollectionCenter, listCollectionCenters } from '../lib/collectionCentersApi';
import { DEFAULT_MAP_CENTER, findNearest, formatDistance, GeoNamedPoint } from '../lib/geo';
import GeoMapPicker from './GeoMapPicker';
import { requestDeviceLocation } from '../lib/geo';
import QuickCenterRegister from './QuickCenterRegister';
import { getRecentCenterIds, recordRecentCenter } from '../lib/recentCenters';
import PatientPhoto from './PatientPhoto';
import {
  compressPatientPhoto,
  deletePatientPhoto,
  getPatientPhotoUrl,
  uploadPatientPhoto,
} from '../lib/patientPhotosApi';

interface PatientFormProps {
  initialPatient?: Paciente | null;
  onSave: (paciente: Paciente) => void;
  onCancel: () => void;
}

const emptyPatient: Omit<Paciente, 'id' | 'fechaRegistro' | 'notasClinicas'> = {
  nombres: "",
  apellidos: "",
  fechaNacimiento: "",
  edadAnios: 0,
  edadMeses: 0,
  genero: "Masculino",
  documentoIdentidad: "",
  nacionalidad: "Venezolana",
  fotoPath: null,
  grupoEtario: null,
  
  direccion: "",
  ciudadMunicipio: "",
  estadoProvincia: "",
  puntoReferencia: "",
  
  nombreRepresentante: "",
  parentesco: "Madre",
  documentoRepresentante: "",
  ocupacion: "",
  telefonoPrincipal: "",
  telefonoEmergencias: "",
  correo: "",
  
  estatura: 0,
  peso: 0,
  grupoSanguineo: "O Rh Positivo (O+)",
  tieneAlergias: false,
  alergiasEspecificas: "",
  tieneCondicionMedica: false,
  condicionMedicaEspecifica: "",
  tomaMedicamentos: false,
  medicamentosEspecificos: "",
  esquemaVacunacion: "Completo",
  
  asisteEscuela: false,
  nivelEducativo: "",
  gradoAnio: "",
  nombreInstitucion: "",

  centroAcopioId: "",
  centroAcopioNombre: "",
  puntoRegistroTipo: "centro",
  centroAcopioLat: null,
  centroAcopioLng: null,
  registroLat: DEFAULT_MAP_CENTER.lat,
  registroLng: DEFAULT_MAP_CENTER.lng,
  registrantLat: null,
  registrantLng: null,
};

export default function PatientForm({ initialPatient, onSave, onCancel }: PatientFormProps) {
  const [formData, setFormData] = useState<Paciente>(() => {
    if (initialPatient) {
      return {
        ...initialPatient,
        fotoPath: initialPatient.fotoPath ?? null,
        grupoEtario: pacienteTieneEdad(initialPatient)
          ? grupoEtarioFromAge(initialPatient.edadAnios)
          : (initialPatient.grupoEtario ?? null),
        puntoRegistroTipo: initialPatient.puntoRegistroTipo ?? 'centro',
        registroLat: initialPatient.registroLat ?? DEFAULT_MAP_CENTER.lat,
        registroLng: initialPatient.registroLng ?? DEFAULT_MAP_CENTER.lng,
      };
    }
    return {
      ...emptyPatient,
      id: "pac-" + Math.random().toString(36).substr(2, 9),
      fechaRegistro: new Date().toISOString().split('T')[0],
      notasClinicas: []
    } as Paciente;
  });

  const [activeTab, setActiveTab] = useState<number>(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [collectionCenters, setCollectionCenters] = useState<CollectionCenter[]>([]);
  const [centerFilter, setCenterFilter] = useState("");
  const [geoHint, setGeoHint] = useState<string>("");
  const [recentCenterIds, setRecentCenterIds] = useState<string[]>(() => getRecentCenterIds());
  const [showNewCenter, setShowNewCenter] = useState(false);
  const [centerNotice, setCenterNotice] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Catálogos reutilizables (sugerencias para no re-tipear datos repetidos).
  const [catalogs, setCatalogs] = useState<Catalogs>({
    nationalities: [],
    states: [],
    cities: [],
    institutions: [],
    bloodTypes: [],
    allergies: [],
    conditions: [],
    medications: [],
    diagnoses: [],
    treatments: [],
    guardians: [],
  });

  useEffect(() => {
    fetchCatalogs()
      .then(setCatalogs)
      .catch(() => {/* sin catálogos: el formulario sigue funcionando con texto libre */});
    listCollectionCenters(true)
      .then(setCollectionCenters)
      .catch(() => {/* sin centros: el formulario sigue con texto */});
  }, []);

  useEffect(() => {
    let active = true;
    if (photoFile || photoRemoved) return undefined;

    if (!formData.fotoPath) {
      setPhotoPreview(null);
      return undefined;
    }

    getPatientPhotoUrl(formData.fotoPath)
      .then((url) => {
        if (active) setPhotoPreview(url);
      })
      .catch(() => {
        if (active) setPhotoPreview(null);
      });

    return () => { active = false; };
  }, [formData.fotoPath, photoFile, photoRemoved]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPhotoError('');
    try {
      await compressPatientPhoto(file);
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
      setPhotoFile(file);
      setPhotoRemoved(false);
      setPhotoPreview(URL.createObjectURL(file));
    } catch (err: any) {
      setPhotoError(err?.message || 'No se pudo cargar la imagen.');
    }
  };

  const handlePhotoRemove = () => {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(true);
    setPhotoError('');
  };

  const centersForMap = useMemo(() => {
    const q = centerFilter.trim().toLowerCase();
    let list = collectionCenters.filter((c) => c.active);
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q)
      );
    }
    if (formData.centroAcopioId) {
      const selected = collectionCenters.find((c) => c.id === formData.centroAcopioId);
      if (selected && !list.some((c) => c.id === selected.id)) {
        list = [selected, ...list];
      }
    }
    return list.map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.geo_lat,
      lng: c.geo_lng,
    }));
  }, [collectionCenters, centerFilter, formData.centroAcopioId]);

  const filteredCenters = useMemo(() => {
    const q = centerFilter.trim().toLowerCase();
    if (!q) return collectionCenters;
    return collectionCenters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q)
    );
  }, [collectionCenters, centerFilter]);

  const recentCenters = useMemo(
    () =>
      recentCenterIds
        .map((id) => collectionCenters.find((c) => c.id === id))
        .filter((c): c is CollectionCenter => !!c),
    [recentCenterIds, collectionCenters]
  );

  const applyCenter = (center: CollectionCenter, trackRecent = false) => {
    setFormData((prev) => ({
      ...prev,
      puntoRegistroTipo: 'centro',
      centroAcopioId: center.id,
      centroAcopioNombre: center.name,
      centroAcopioLat: center.geo_lat,
      centroAcopioLng: center.geo_lng,
      registroLat: center.geo_lat,
      registroLng: center.geo_lng,
    }));
    setCenterFilter('');
    setGeoHint(`Punto de registro centrado en ${center.name}. Ajuste arrastrando el marcador si hace falta.`);
    if (formErrors.centroAcopioId) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy.centroAcopioId;
        return copy;
      });
    }
    if (trackRecent) {
      recordRecentCenter(center.id);
      setRecentCenterIds(getRecentCenterIds());
    }
  };

  const pickCenter = (centerId: string) => {
    const center = collectionCenters.find((c) => c.id === centerId);
    if (center) applyCenter(center, true);
  };

  const handleQuickCenterSaved = (center: CollectionCenter, created: boolean) => {
    setCollectionCenters((prev) => {
      if (prev.some((c) => c.id === center.id)) return prev;
      return [...prev, center].sort((a, b) => a.name.localeCompare(b.name));
    });
    applyCenter(center, true);
    setShowNewCenter(false);
    setCenterNotice(
      created
        ? `Centro "${center.name}" registrado y seleccionado.`
        : `Ya existía "${center.name}"; se seleccionó el registro previo.`
    );
  };

  const setAtencionMedico = () => {
    setFormData((prev) => ({
      ...prev,
      puntoRegistroTipo: 'medico',
      centroAcopioId: '',
      centroAcopioNombre: '',
      centroAcopioLat: null,
      centroAcopioLng: null,
    }));
    setCenterFilter('');
    setGeoHint('Marque en el mapa dónde se atendió al paciente (calle, comunidad u otro sitio sin centro de acopio).');
    if (formErrors.centroAcopioId) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy.centroAcopioId;
        return copy;
      });
    }
  };

  const suggestCenterFromCoords = (lat: number, lng: number, autoSelect = false) => {
    if (formData.puntoRegistroTipo === 'medico') return;
    const points: GeoNamedPoint[] = collectionCenters.map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.geo_lat,
      lng: c.geo_lng,
    }));
    const nearest = findNearest(lat, lng, points);
    if (!nearest) {
      setGeoHint('No hay centros registrados cerca. Seleccione uno manualmente.');
      return;
    }
    setGeoHint(
      `Centro más cercano: ${nearest.item.name} (${formatDistance(nearest.distanceM)}).`
    );
    if (autoSelect && nearest.distanceM <= 1500) {
      setFormData((prev) => ({
        ...prev,
        centroAcopioId: nearest.item.id,
        centroAcopioNombre: nearest.item.name,
      }));
    }
  };

  useEffect(() => {
    if (initialPatient) return;
    let cancelled = false;
    requestDeviceLocation()
      .then((coords) => {
        if (cancelled) return;
        // Same initial coords for patient and registrant (on-site); registrant is not shown in UI.
        setFormData((prev) => ({
          ...prev,
          registrantLat: coords.lat,
          registrantLng: coords.lng,
          registroLat: coords.lat,
          registroLng: coords.lng,
        }));
        suggestCenterFromCoords(coords.lat, coords.lng, true);
        setGeoHint('Arrastre el marcador para ajustar dónde se registra al paciente.');
      })
      .catch(() => {
        if (!cancelled) {
          setGeoHint('Seleccione el centro de acopio y ajuste el punto en el mapa.');
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatient]);

  const handleCenterOnMap = () => {
    const center = collectionCenters.find((c) => c.id === formData.centroAcopioId);
    if (!center) {
      setGeoHint('Seleccione primero un centro de acopio.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      registroLat: center.geo_lat,
      registroLng: center.geo_lng,
    }));
    setGeoHint(`Punto de registro centrado en ${center.name}. Ajuste arrastrando el marcador si hace falta.`);
  };

  const handleCenterSelect = (centerId: string) => {
    if (!centerId) {
      setFormData((prev) => ({
        ...prev,
        centroAcopioId: '',
        centroAcopioNombre: '',
      }));
      return;
    }
    const center = collectionCenters.find((c) => c.id === centerId);
    if (center) applyCenter(center);
  };

  const handleRegistrationCoords = (coords: { lat: number; lng: number }) => {
    setFormData((prev) => ({
      ...prev,
      registroLat: coords.lat,
      registroLng: coords.lng,
    }));
    if (formData.puntoRegistroTipo !== 'medico') {
      suggestCenterFromCoords(coords.lat, coords.lng, !formData.centroAcopioId);
    }
  };

  // Secciones pediátricas: sin clasificación se asume contexto infantil; adulto/tercera edad ocultan campos pediátricos.
  const isPediatricProfile = formData.grupoEtario !== 'adulto' && formData.grupoEtario !== 'tercera_edad';
  const clasificacionManual = !pacienteTieneEdad(formData);

  // Autorrellena los datos del representante al coincidir con uno existente.
  const applyGuardian = (guardian: GuardianOption) => {
    setFormData(prev => ({
      ...prev,
      nombreRepresentante: guardian.full_name || prev.nombreRepresentante,
      documentoRepresentante: guardian.id_document || prev.documentoRepresentante,
      ocupacion: guardian.occupation || prev.ocupacion,
      telefonoPrincipal: guardian.phone_primary || prev.telefonoPrincipal,
      telefonoEmergencias: guardian.phone_alternate || prev.telefonoEmergencias,
      correo: guardian.email || prev.correo,
    }));
  };

  const handleGuardianLookup = (field: 'nombreRepresentante' | 'documentoRepresentante', value: string) => {
    const v = value.trim().toLowerCase();
    if (!v) return;
    const match = catalogs.guardians.find(g =>
      (field === 'nombreRepresentante' && (g.full_name || '').toLowerCase() === v) ||
      (field === 'documentoRepresentante' && (g.id_document || '').toLowerCase() === v)
    );
    if (match) applyGuardian(match);
  };

  // Calcular edad desde fecha de nacimiento exacta.
  useEffect(() => {
    if (!formData.fechaNacimiento) return;

    const birthDate = new Date(formData.fechaNacimiento);
    const today = new Date();
    if (isNaN(birthDate.getTime())) return;

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (today.getDate() < birthDate.getDate()) months--;
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years < 0) {
      years = 0;
      months = 0;
    }

    setFormData((prev) => ({
      ...prev,
      edadAnios: years,
      edadMeses: months,
    }));
  }, [formData.fechaNacimiento]);

  // Con edad conocida: clasificación automática; sin edad: asignación manual en el formulario.
  useEffect(() => {
    if (!pacienteTieneEdad(formData)) return;
    const calculated = grupoEtarioFromAge(formData.edadAnios);
    setFormData((prev) =>
      prev.grupoEtario === calculated ? prev : { ...prev, grupoEtario: calculated }
    );
  }, [formData.fechaNacimiento, formData.edadAnios, formData.edadMeses]);

  const hasExactBirthDate = !!formData.fechaNacimiento;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let parsedValue: any = value;
    if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      parsedValue = parseFormNumber(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));

    if (submitError) setSubmitError("");

    if (formErrors[name]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validateSection = (sectionNum: number): boolean => {
    const errors = sectionNum === 1 ? validatePatientSection1(formData) : {};
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    // Navegación libre entre paneles; los requeridos se validan al guardar.
    setActiveTab(prev => Math.min(prev + 1, 5));
  };

  const handlePrev = () => {
    setActiveTab(prev => Math.max(prev - 1, 1));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Solo al guardar: validar todos los paneles y avisar de los faltantes.
    let firstInvalid = 0;
    for (let i = 1; i <= 5; i++) {
      if (!validateSection(i)) {
        firstInvalid = i;
        break;
      }
    }

    if (firstInvalid === 0) {
      setSubmitError("");
      let registrantLat = formData.registrantLat;
      let registrantLng = formData.registrantLng;
      try {
        const device = await requestDeviceLocation();
        registrantLat = device.lat;
        registrantLng = device.lng;
      } catch {
        /* keep last device location if available */
      }

      let fotoPath = formData.fotoPath;
      setIsUploadingPhoto(true);
      try {
        if (photoRemoved && fotoPath) {
          await deletePatientPhoto(fotoPath);
          fotoPath = null;
        } else if (photoFile) {
          if (fotoPath) await deletePatientPhoto(fotoPath).catch(() => undefined);
          fotoPath = await uploadPatientPhoto(formData.id, photoFile);
        }
      } catch (err: any) {
        setIsUploadingPhoto(false);
        setSubmitError('Error al guardar la foto: ' + (err?.message || err));
        return;
      }
      setIsUploadingPhoto(false);

      onSave({
        ...formData,
        fotoPath,
        registrantLat,
        registrantLng,
      });
      if (formData.puntoRegistroTipo === 'centro' && formData.centroAcopioId) {
        recordRecentCenter(formData.centroAcopioId);
      }
    } else {
      const tabName = tabs.find(t => t.id === firstInvalid)?.label.split('. ')[1] || `Paso ${firstInvalid}`;
      setSubmitError(`Faltan campos requeridos en "${tabName}". Revise los campos marcados.`);
      setActiveTab(firstInvalid);
    }
  };

  const tabs = [
    { id: 1, label: "1. Datos Personales", icon: User },
    { id: 2, label: "2. Ubicación", icon: MapPin },
    { id: 3, label: "3. Representante", icon: ShieldAlert },
    { id: 4, label: "4. Salud y Nutrición", icon: Heart },
    { id: 5, label: "5. Educación", icon: GraduationCap }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Form Header */}
      <div className="bg-slate-900 px-6 py-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-white/20 text-white font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full font-medium">
              {APP_NAME}
            </span>
            {initialPatient && (
              <span className="text-xs bg-blue-500/20 text-blue-200 font-mono px-2.5 py-0.5 rounded-full font-medium">
                Editando Historia
              </span>
            )}
          </div>
          <h2 className="font-sans font-bold text-xl md:text-2xl tracking-tight mt-1">
            {initialPatient ? "Modificar Ficha de Registro" : "Nueva Ficha de Registro"}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Complete los datos que tenga disponibles. Sin fecha ni edad tentativa, asigne la clasificación etaria manualmente.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs border border-white/20 bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-lg font-medium transition-colors cursor-pointer"
        >
          Volver al Listado
        </button>
      </div>

      {/* Progress Tabs/Steps Indicator (Scrollable on mobile) */}
      <div className="border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-none">
        <div className="flex px-4 min-w-[700px] md:min-w-0 md:justify-between py-2.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isCompleted = activeTab > tab.id;
            
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  // Navegación libre entre paneles (sin bloquear por requeridos).
                  setActiveTab(tab.id);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 border-b-2 font-medium text-xs md:text-sm transition-all cursor-pointer ${
                  isActive 
                    ? 'border-blue-600 text-blue-700 bg-white shadow-sm' 
                    : isCompleted 
                      ? 'border-green-500 text-green-600 bg-green-50/20' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : isCompleted 
                      ? 'bg-green-500 text-white' 
                      : 'bg-slate-200 text-slate-500'
                }`}>
                  {tab.id}
                </div>
                <span>{tab.label.split('. ')[1]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleFormSubmit} className="p-6 md:p-8 space-y-6">
        {/* TAB 1: DATOS PERSONALES */}
        {activeTab === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-5 h-5 text-teal-600" />
              <h3 className="font-sans font-bold text-slate-700 text-base">1. Datos Personales</h3>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Vista previa del paciente"
                    className="h-24 w-24 rounded-2xl object-cover border border-slate-200 bg-white shadow-sm"
                  />
                ) : (
                  <PatientPhoto
                    fotoPath={photoRemoved ? null : formData.fotoPath}
                    alt="Paciente"
                    className="h-24 w-24 rounded-2xl object-cover border border-slate-200 bg-white shadow-sm"
                    fallbackClassName="h-24 w-24 rounded-2xl border border-slate-200 bg-white text-slate-300 flex items-center justify-center shadow-sm"
                  />
                )}

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Foto del paciente <span className="font-normal text-slate-400">(opcional)</span></p>
                  <p className="text-[11px] leading-relaxed text-slate-500">JPG, PNG o WebP. Máximo 5 MB. Se comprime automáticamente al guardar.</p>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-700">
                      <Camera className="h-3.5 w-3.5" />
                      {photoPreview || formData.fotoPath ? 'Cambiar foto' : 'Subir foto'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                    </label>
                    {(photoPreview || formData.fotoPath) && !photoRemoved && (
                      <button
                        type="button"
                        onClick={handlePhotoRemove}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        <X className="h-3.5 w-3.5" />
                        Quitar foto
                      </button>
                    )}
                  </div>
                  {photoError && <p className="text-xs font-medium text-red-500">{photoError}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Nombres Completos <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="nombres"
                  value={formData.nombres}
                  onChange={handleInputChange}
                  placeholder="Ej. Mateo Alejandro"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.nombres ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                {formErrors.nombres && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.nombres}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Apellidos Completos <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleInputChange}
                  placeholder="Ej. Gómez Rodríguez"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.apellidos ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                {formErrors.apellidos && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.apellidos}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Fecha de Nacimiento <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <input
                  type="date"
                  name="fechaNacimiento"
                  value={formData.fechaNacimiento}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.fechaNacimiento ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                {formErrors.fechaNacimiento && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.fechaNacimiento}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  {hasExactBirthDate ? 'Edad calculada' : 'Edad tentativa'}
                </label>
                {hasExactBirthDate ? (
                  <div className={`grid gap-2 ${isPediatricProfile ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="relative bg-slate-100 rounded-xl px-4 py-2.5 border border-slate-200 flex items-center justify-between text-sm text-slate-700">
                      <span className="font-mono font-bold text-slate-800">{formData.edadAnios}</span>
                      <span className="text-xs text-slate-500">años</span>
                    </div>
                    {isPediatricProfile && (
                      <div className="relative bg-slate-100 rounded-xl px-4 py-2.5 border border-slate-200 flex items-center justify-between text-sm text-slate-700">
                        <span className="font-mono font-bold text-slate-800">{formData.edadMeses}</span>
                        <span className="text-xs text-slate-500">meses</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        name="edadAnios"
                        min={0}
                        value={formData.edadAnios || ''}
                        onChange={handleInputChange}
                        placeholder="Años"
                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 ${
                          formErrors.edadAnios ? 'border-red-300' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        name="edadMeses"
                        min={0}
                        max={11}
                        value={formData.edadMeses || ''}
                        onChange={handleInputChange}
                        placeholder="Meses"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                      />
                    </div>
                  </div>
                )}
                {formErrors.edadAnios && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.edadAnios}</p>}
                <p className="text-[10px] text-slate-400 mt-1">
                  {hasExactBirthDate
                    ? 'Calculada automáticamente desde la fecha de nacimiento.'
                    : 'Estimación aproximada cuando no se conoce la fecha exacta.'}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Clasificación etaria{' '}
                  <span className="font-normal normal-case text-slate-400">
                    ({clasificacionManual ? 'manual' : 'automática'})
                  </span>
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {GRUPOS_ETARIOS.map((grupo) => (
                    <button
                      key={grupo}
                      type="button"
                      disabled={!clasificacionManual}
                      onClick={() => setFormData((prev) => ({ ...prev, grupoEtario: grupo }))}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                        !clasificacionManual
                          ? formData.grupoEtario === grupo
                            ? 'border-teal-300 bg-teal-50/60 text-teal-600 cursor-default'
                            : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                          : formData.grupoEtario === grupo
                            ? 'border-teal-600 bg-teal-50 text-teal-700 ring-2 ring-teal-500/10'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {grupoEtarioLabel(grupo)}
                    </button>
                  ))}
                </div>
                {formErrors.grupoEtario && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.grupoEtario}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {clasificacionManual
                    ? 'Sin fecha ni edad tentativa: seleccione niño/a, adulto o tercera edad según su criterio.'
                    : 'Calculada desde la edad (<18 niño/a, <60 adulto, 60+ tercera edad). No se puede cambiar manualmente.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Género
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Masculino', 'Femenino', 'Otro'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, genero: g }))}
                      className={`py-2 px-3 border rounded-xl font-medium text-xs transition-all text-center cursor-pointer ${
                        formData.genero === g 
                          ? 'border-teal-600 bg-teal-50 text-teal-700 ring-2 ring-teal-500/10' 
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Documento de Identidad (C.I. / Pasaporte)
                </label>
                <input
                  type="text"
                  name="documentoIdentidad"
                  value={formData.documentoIdentidad}
                  onChange={handleInputChange}
                  placeholder="Ej. V-32.123.456 (Si aplica)"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Nacionalidad <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="nacionalidad"
                  list="catalog-nationalities"
                  value={formData.nacionalidad}
                  onChange={handleInputChange}
                  placeholder="Ej. Venezolana, Colombiana, Española"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.nacionalidad ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                <datalist id="catalog-nationalities">
                  {catalogs.nationalities.map(n => <option key={n} value={n} />)}
                </datalist>
                {formErrors.nacionalidad && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.nacionalidad}</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: VIVIENDA Y UBICACIÓN */}
        {activeTab === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <MapPin className="w-5 h-5 text-teal-600" />
              <h3 className="font-sans font-bold text-slate-700 text-base">2. Información de Vivienda y Ubicación</h3>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-700" />
                <h4 className="text-sm font-bold text-teal-900">Punto de registro del paciente</h4>
              </div>
              <p className="text-xs text-teal-800/80 leading-relaxed">
                Indique si la atención fue en un centro de acopio o apoyo, o si un médico atendió en la calle u otro lugar sin centro.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, puntoRegistroTipo: 'centro' }));
                    setGeoHint('Elija un centro de acopio y ajuste el punto del paciente en el mapa.');
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-bold transition-all ${
                    formData.puntoRegistroTipo === 'centro'
                      ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                      : 'border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
                  }`}
                >
                  <Warehouse className="w-4 h-4 shrink-0" />
                  Centro de acopio / apoyo
                </button>
                <button
                  type="button"
                  onClick={setAtencionMedico}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-bold transition-all ${
                    formData.puntoRegistroTipo === 'medico'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                      : 'border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 shrink-0" />
                  Atención por médico (calle u otro sitio)
                </button>
              </div>

              {formData.puntoRegistroTipo === 'centro' ? (
                <p className="text-xs text-teal-800/80 leading-relaxed">
                  Elija un centro reciente, busque uno existente o regístrelo aquí mismo. Luego ajuste el punto del paciente en el mapa.
                </p>
              ) : (
                <p className="text-xs font-medium text-indigo-800 leading-relaxed">
                  No se asignará un centro de acopio. El registro quedará como atención médica en campo; marque el punto en el mapa.
                </p>
              )}

              {formData.puntoRegistroTipo === 'centro' && recentCenters.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Usados recientemente
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {recentCenters.map((center) => (
                      <button
                        key={center.id}
                        type="button"
                        onClick={() => pickCenter(center.id)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                          formData.centroAcopioId === center.id
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
                        }`}
                      >
                        {center.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.puntoRegistroTipo === 'centro' && (
              <button
                type="button"
                onClick={() => {
                  setShowNewCenter(true);
                  setCenterNotice('');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-teal-300 bg-white px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar nuevo centro de acopio
              </button>
              )}

              {formData.puntoRegistroTipo === 'centro' && centerNotice && (
                <p className="text-[11px] font-medium text-teal-700">{centerNotice}</p>
              )}

              {formData.puntoRegistroTipo === 'centro' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Centro de acopio <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={centerFilter || formData.centroAcopioNombre}
                  onChange={(e) => {
                    setCenterFilter(e.target.value);
                    if (!e.target.value.trim()) {
                      handleCenterSelect('');
                      setFormData((prev) => ({ ...prev, centroAcopioId: '', centroAcopioNombre: '' }));
                    }
                  }}
                  placeholder="Filtrar o buscar centro..."
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.centroAcopioId ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                {centerFilter.trim() && filteredCenters.length > 0 && (
                  <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    {filteredCenters.map((center) => (
                      <button
                        key={center.id}
                        type="button"
                        onClick={() => pickCenter(center.id)}
                        className={`block w-full px-3 py-2 text-left text-xs hover:bg-teal-50 ${
                          formData.centroAcopioId === center.id ? 'bg-teal-50 font-bold text-teal-800' : 'text-slate-700'
                        }`}
                      >
                        <span className="block font-semibold">{center.name}</span>
                        {center.address && (
                          <span className="block text-[10px] text-slate-400 truncate">{center.address}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {formData.centroAcopioId && !centerFilter && (
                  <p className="mt-1 text-xs font-semibold text-teal-700">
                    Seleccionado: {formData.centroAcopioNombre}
                  </p>
                )}
                {formErrors.centroAcopioId && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.centroAcopioId}</p>
                )}
              </div>
              )}

              {formData.puntoRegistroTipo === 'centro' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCenterOnMap}
                  disabled={!formData.centroAcopioId}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                >
                  <Warehouse className="w-3.5 h-3.5" />
                  Centrar en centro seleccionado
                </button>
                {formData.registroLat != null && formData.registroLng != null && (
                  <span className="font-mono text-[10px] text-slate-500">
                    {formData.registroLat.toFixed(3)}, {formData.registroLng.toFixed(3)} (aprox.)
                  </span>
                )}
              </div>
              )}
              {geoHint && <p className="text-[11px] font-medium text-teal-700">{geoHint}</p>}

              {!showNewCenter ? (
                <div
                  key={`map-${formData.puntoRegistroTipo}-${formData.centroAcopioId || 'none'}-${formData.registroLat}-${formData.registroLng}`}
                >
                  <GeoMapPicker
                    lat={formData.registroLat}
                    lng={formData.registroLng}
                    centers={formData.puntoRegistroTipo === 'centro' ? centersForMap : []}
                    fitToCenters={formData.puntoRegistroTipo === 'centro' && !!formData.centroAcopioId}
                    showLocateButton
                    onLocateError={(message) => setGeoHint(message)}
                    onChange={handleRegistrationCoords}
                    height="240px"
                  />
                </div>
              ) : (
                <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-100/80 px-4 text-center text-xs font-medium text-slate-400">
                  Mapa del paciente pausado mientras registra el centro de acopio
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 pb-2 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-slate-500" />
              <h4 className="font-sans font-bold text-slate-600 text-sm">Residencia del paciente</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Dirección de Residencia Actual
                </label>
                <textarea
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Ej. Av. Principal de Los Dos Caminos, Res. Parque Azul, Apto 5C."
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.direccion ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                {formErrors.direccion && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.direccion}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Ciudad / Municipio
                </label>
                <input
                  type="text"
                  name="ciudadMunicipio"
                  list="catalog-cities"
                  value={formData.ciudadMunicipio}
                  onChange={handleInputChange}
                  placeholder="Ej. Chacao / Sucre"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.ciudadMunicipio ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                <datalist id="catalog-cities">
                  {catalogs.cities.map(c => <option key={c} value={c} />)}
                </datalist>
                {formErrors.ciudadMunicipio && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.ciudadMunicipio}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Estado / Provincia
                </label>
                <input
                  type="text"
                  name="estadoProvincia"
                  list="catalog-states"
                  value={formData.estadoProvincia}
                  onChange={handleInputChange}
                  placeholder="Ej. Miranda / Distrito Capital"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.estadoProvincia ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                <datalist id="catalog-states">
                  {catalogs.states.map(s => <option key={s} value={s} />)}
                </datalist>
                {formErrors.estadoProvincia && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.estadoProvincia}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Punto de Referencia Cercano
                </label>
                <input
                  type="text"
                  name="puntoReferencia"
                  value={formData.puntoReferencia}
                  onChange={handleInputChange}
                  placeholder="Ej. Frente a la Iglesia San Juan o al lado del supermercado."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: REPRESENTANTE LEGAL */}
        {activeTab === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldAlert className="w-5 h-5 text-teal-600" />
              <h3 className="font-sans font-bold text-slate-700 text-base">3. Representante / Contacto</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Nombre Completo del Representante <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="nombreRepresentante"
                  list="catalog-guardians"
                  value={formData.nombreRepresentante}
                  onChange={handleInputChange}
                  onBlur={(e) => handleGuardianLookup('nombreRepresentante', e.target.value)}
                  placeholder="Ej. María Carolina Rodríguez"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.nombreRepresentante ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                <datalist id="catalog-guardians">
                  {catalogs.guardians.map(g => (
                    <option key={g.id} value={g.full_name}>
                      {g.id_document ? `${g.full_name} — ${g.id_document}` : g.full_name}
                    </option>
                  ))}
                </datalist>
                <p className="text-[10px] text-slate-400 mt-1">Si el representante ya existe, selecciónelo para autocompletar sus datos.</p>
                {formErrors.nombreRepresentante && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.nombreRepresentante}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Parentesco / Relación
                </label>
                <select
                  name="parentesco"
                  value={formData.parentesco}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all cursor-pointer"
                >
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                  <option value="Abuelo/a">Abuelo/a</option>
                  <option value="Tutor legal">Tutor legal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Documento de Identidad <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="documentoRepresentante"
                  value={formData.documentoRepresentante}
                  onChange={handleInputChange}
                  onBlur={(e) => handleGuardianLookup('documentoRepresentante', e.target.value)}
                  placeholder="Ej. V-12.345.678"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.documentoRepresentante ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                {formErrors.documentoRepresentante && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.documentoRepresentante}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Ocupación / Profesión
                </label>
                <input
                  type="text"
                  name="ocupacion"
                  value={formData.ocupacion}
                  onChange={handleInputChange}
                  placeholder="Ej. Comerciante, Docente, Abogado"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Teléfono de Contacto Principal <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="telefonoPrincipal"
                  value={formData.telefonoPrincipal}
                  onChange={handleInputChange}
                  placeholder="Ej. +58 412-1234567"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                    formErrors.telefonoPrincipal ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                {formErrors.telefonoPrincipal && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.telefonoPrincipal}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Teléfono Alternativo (Emergencias)
                </label>
                <input
                  type="text"
                  name="telefonoEmergencias"
                  value={formData.telefonoEmergencias}
                  onChange={handleInputChange}
                  placeholder="Ej. +58 414-9876543"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="correo"
                  value={formData.correo}
                  onChange={handleInputChange}
                  placeholder="Ej. representante@correo.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: DATOS DE SALUD Y NUTRICIÓN */}
        {activeTab === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Heart className="w-5 h-5 text-teal-600" />
              <h3 className="font-sans font-bold text-slate-700 text-base">4. Datos de Salud y Nutrición</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Estatura Actual (cm) <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <div className="relative rounded-xl">
                  <input
                    type="number"
                    name="estatura"
                    value={formData.estatura || ''}
                    onChange={handleInputChange}
                    placeholder="Ej. 110"
                    min="1"
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                      formErrors.estatura ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-xs text-slate-500 font-semibold uppercase">
                    cm
                  </div>
                </div>
                {formErrors.estatura && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.estatura}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Peso Actual (kg) <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <div className="relative rounded-xl">
                  <input
                    type="number"
                    name="peso"
                    value={formData.peso || ''}
                    onChange={handleInputChange}
                    placeholder="Ej. 19.5"
                    step="0.1"
                    min="0.1"
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                      formErrors.peso ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-xs text-slate-500 font-semibold uppercase">
                    kg
                  </div>
                </div>
                {formErrors.peso && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.peso}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Grupo Sanguíneo / Factor RH
                </label>
                <select
                  name="grupoSanguineo"
                  value={formData.grupoSanguineo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all cursor-pointer"
                >
                  <option value="O Rh Positivo (O+)">O Rh Positivo (O+)</option>
                  <option value="O Rh Negativo (O-)">O Rh Negativo (O-)</option>
                  <option value="A Rh Positivo (A+)">A Rh Positivo (A+)</option>
                  <option value="A Rh Negativo (A-)">A Rh Negativo (A-)</option>
                  <option value="B Rh Positivo (B+)">B Rh Positivo (B+)</option>
                  <option value="B Rh Negativo (B-)">B Rh Negativo (B-)</option>
                  <option value="AB Rh Positivo (AB+)">AB Rh Positivo (AB+)</option>
                  <option value="AB Rh Negativo (AB-)">AB Rh Negativo (AB-)</option>
                  <option value="Desconocido / No Evaluado">Desconocido / No Evaluado</option>
                </select>
              </div>

              {isPediatricProfile && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Esquema de Vacunación (Según edad)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Completo', 'Incompleto'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, esquemaVacunacion: v }))}
                        className={`py-2 px-3 border rounded-xl font-medium text-xs transition-all text-center cursor-pointer ${
                          formData.esquemaVacunacion === v 
                            ? 'border-teal-600 bg-teal-50 text-teal-700 ring-2 ring-teal-500/10' 
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Toggle Alergias */}
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">¿Presenta alguna alergia conocida?</h4>
                    <p className="text-[11px] text-slate-500">Medicamentos, alimentos, picaduras, polen, etc.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tieneAlergias: true }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        formData.tieneAlergias 
                          ? 'bg-red-500 border-red-500 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tieneAlergias: false, alergiasEspecificas: "" }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        !formData.tieneAlergias 
                          ? 'bg-slate-600 border-slate-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {formData.tieneAlergias && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <CatalogMultiPicker
                      id="alergiasEspecificas"
                      label="Especifique Alergias"
                      placeholder="Buscar o escribir alergia…"
                      hint="Busque en el catálogo o escriba una nueva y pulse Enter."
                      options={catalogs.allergies}
                      value={formData.alergiasEspecificas}
                      onChange={(v) => {
                        setFormData(prev => ({ ...prev, alergiasEspecificas: v }));
                        if (formErrors.alergiasEspecificas) {
                          setFormErrors(prev => {
                            const copy = { ...prev };
                            delete copy.alergiasEspecificas;
                            return copy;
                          });
                        }
                      }}
                      error={formErrors.alergiasEspecificas}
                    />
                  </motion.div>
                )}
              </div>

              {/* Toggle Condición Médica */}
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">¿Sufre de alguna condición médica o enfermedad crónica?</h4>
                    <p className="text-[11px] text-slate-500">Asma, diabetes, cardiopatías, hipotiroidismo, etc.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tieneCondicionMedica: true }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        formData.tieneCondicionMedica 
                          ? 'bg-red-500 border-red-500 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tieneCondicionMedica: false, condicionMedicaEspecifica: "" }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        !formData.tieneCondicionMedica 
                          ? 'bg-slate-600 border-slate-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {formData.tieneCondicionMedica && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <CatalogMultiPicker
                      id="condicionMedicaEspecifica"
                      label="Especifique Condición Médica"
                      placeholder="Buscar o escribir condición…"
                      hint="Busque en el catálogo o escriba una nueva y pulse Enter."
                      options={catalogs.conditions}
                      value={formData.condicionMedicaEspecifica}
                      onChange={(v) => {
                        setFormData(prev => ({ ...prev, condicionMedicaEspecifica: v }));
                        if (formErrors.condicionMedicaEspecifica) {
                          setFormErrors(prev => {
                            const copy = { ...prev };
                            delete copy.condicionMedicaEspecifica;
                            return copy;
                          });
                        }
                      }}
                      error={formErrors.condicionMedicaEspecifica}
                    />
                  </motion.div>
                )}
              </div>

              {/* Toggle Medicamentos Regulares */}
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">¿Toma algún medicamento de forma regular?</h4>
                    <p className="text-[11px] text-slate-500">Inhaladores, anticonvulsivos, insulina, etc.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tomaMedicamentos: true }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        formData.tomaMedicamentos 
                          ? 'bg-red-500 border-red-500 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tomaMedicamentos: false, medicamentosEspecificos: "" }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        !formData.tomaMedicamentos 
                          ? 'bg-slate-600 border-slate-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {formData.tomaMedicamentos && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <CatalogMultiPicker
                      id="medicamentosEspecificos"
                      label="Especifique Medicamentos"
                      placeholder="Buscar o escribir medicamento…"
                      hint="Busque en el catálogo o escriba uno nuevo y pulse Enter."
                      options={catalogs.medications}
                      value={formData.medicamentosEspecificos}
                      onChange={(v) => {
                        setFormData(prev => ({ ...prev, medicamentosEspecificos: v }));
                        if (formErrors.medicamentosEspecificos) {
                          setFormErrors(prev => {
                            const copy = { ...prev };
                            delete copy.medicamentosEspecificos;
                            return copy;
                          });
                        }
                      }}
                      error={formErrors.medicamentosEspecificos}
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: DATOS EDUCATIVOS */}
        {activeTab === 5 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <GraduationCap className="w-5 h-5 text-teal-600" />
              <h3 className="font-sans font-bold text-slate-700 text-base">5. Datos Educativos</h3>
            </div>

            <div className="space-y-4">
              {!isPediatricProfile && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
                  La sección educativa aplica únicamente a niños y niñas. Para adultos y tercera edad este apartado no aplica.
                </div>
              )}
              {isPediatricProfile && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">¿Asiste actualmente a una institución educativa?</h4>
                    <p className="text-[11px] text-slate-500">Guardería, preescolar, colegio o liceo.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, asisteEscuela: true }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        formData.asisteEscuela 
                          ? 'bg-teal-600 border-teal-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        asisteEscuela: false,
                        nivelEducativo: "",
                        gradoAnio: "",
                        nombreInstitucion: ""
                      }))}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        !formData.asisteEscuela 
                          ? 'bg-slate-600 border-slate-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {formData.asisteEscuela && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200/60"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Nivel Educativo Actual
                      </label>
                      <select
                        name="nivelEducativo"
                        value={formData.nivelEducativo}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all cursor-pointer ${
                          formErrors.nivelEducativo ? 'border-red-300' : 'border-slate-200'
                        }`}
                      >
                        <option value="">Seleccione...</option>
                        <option value="Maternal">Maternal</option>
                        <option value="Preescolar / Inicial">Preescolar / Inicial</option>
                        <option value="Primaria">Primaria</option>
                        <option value="Secundaria">Secundaria</option>
                      </select>
                      {formErrors.nivelEducativo && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.nivelEducativo}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Grado o Año que Cursa
                      </label>
                      <input
                        type="text"
                        name="gradoAnio"
                        value={formData.gradoAnio}
                        onChange={handleInputChange}
                        placeholder="Ej. 1er Grado, Sección B"
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                          formErrors.gradoAnio ? 'border-red-300' : 'border-slate-200'
                        }`}
                      />
                      {formErrors.gradoAnio && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.gradoAnio}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Nombre de la Institución Educativa
                      </label>
                      <input
                        type="text"
                        name="nombreInstitucion"
                        list="catalog-institutions"
                        value={formData.nombreInstitucion}
                        onChange={handleInputChange}
                        placeholder="Ej. U.E. Nacional Simón Bolívar"
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all ${
                          formErrors.nombreInstitucion ? 'border-red-300' : 'border-slate-200'
                        }`}
                      />
                      <datalist id="catalog-institutions">
                        {catalogs.institutions.map(i => <option key={i} value={i} />)}
                      </datalist>
                      {formErrors.nombreInstitucion && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.nombreInstitucion}</p>}
                    </div>
                  </motion.div>
                )}
              </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Aviso de campos requeridos (solo al intentar guardar) */}
        {submitError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Form Footer Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeTab === 1}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 1
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="text-xs text-slate-400 font-mono font-medium block sm:hidden">Paso {activeTab} de 5</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-xs text-slate-500 hover:bg-slate-50 font-semibold border border-slate-200 transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>

            {activeTab < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                Siguiente <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isUploadingPhoto}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer active:scale-95 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Save className="w-4 h-4" /> {isUploadingPhoto ? 'Guardando foto…' : 'Guardar Registro'}
              </button>
            )}
          </div>
        </div>
      </form>

      <AnimatePresence>
        {showNewCenter && (
          <QuickCenterRegister
            onSaved={handleQuickCenterSaved}
            onCancel={() => setShowNewCenter(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
