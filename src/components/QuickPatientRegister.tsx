import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Stethoscope,
  UserPlus,
  Warehouse,
  Zap,
} from 'lucide-react';
import { Paciente, GRUPOS_ETARIOS, grupoEtarioFromAge, grupoEtarioLabel, pacienteTieneEdad, pacienteRequiereRepresentante, EMPTY_GUARDIAN_FIELDS } from '../types';
import { parseFormNumber, validatePatientSection1 } from '../lib/patientValidation';
import AppLogo from './AppLogo';
import { CollectionCenter, listCollectionCenters } from '../lib/collectionCentersApi';
import { createEmptyPatient, PatientCarryOver } from '../lib/patientDefaults';
import { findNearest, GeoNamedPoint, requestDeviceLocation } from '../lib/geo';
import { getRecentCenterIds, recordRecentCenter } from '../lib/recentCenters';
import PatientPhoto from './PatientPhoto';
import {
  compressPatientPhoto,
  uploadPatientPhoto,
} from '../lib/patientPhotosApi';
import QuickCenterRegister from './QuickCenterRegister';
import CenterPicker from './CenterPicker';
import SelectField from './SelectField';
import VoicePatientPanel, { type VoiceApplyPayload } from './VoicePatientPanel';
import { NIVEL_EDUCATIVO_OPTIONS, PARENTESCO_OPTIONS } from '../lib/selectOptions';
import OptionalSection from './OptionalSection';
import {
  OPTIONAL_SECTION_DEFAULTS,
  OptionalSectionKey,
} from '../lib/optionalPatientSections';

export type PatientSaveOptions = { andContinue?: boolean };

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10';

interface QuickPatientRegisterProps {
  carryOver?: PatientCarryOver | null;
  formKey?: number;
  onSave: (paciente: Paciente, options?: PatientSaveOptions) => void;
  onOpenFullForm: () => void;
  onCancel: () => void;
}

export default function QuickPatientRegister({
  carryOver,
  formKey = 0,
  onSave,
  onOpenFullForm,
  onCancel,
}: QuickPatientRegisterProps) {
  const [formData, setFormData] = useState<Paciente>(() => createEmptyPatient(carryOver ?? undefined));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [collectionCenters, setCollectionCenters] = useState<CollectionCenter[]>([]);
  const [centerFilter, setCenterFilter] = useState('');
  const [recentCenterIds, setRecentCenterIds] = useState<string[]>(() => getRecentCenterIds());
  const [showNewCenter, setShowNewCenter] = useState(false);
  const [centerNotice, setCenterNotice] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [optionalSections, setOptionalSections] = useState(OPTIONAL_SECTION_DEFAULTS);
  const [voiceDictationEnabled, setVoiceDictationEnabled] = useState(false);

  const setSection = (key: OptionalSectionKey, enabled: boolean) => {
    setOptionalSections((prev) => ({ ...prev, [key]: enabled }));
  };

  useEffect(() => {
    setFormData(createEmptyPatient(carryOver ?? undefined));
    setFormErrors({});
    setSubmitError('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError('');
    setCenterFilter('');
    setCenterNotice('');
    setOptionalSections(OPTIONAL_SECTION_DEFAULTS);
    setVoiceDictationEnabled(false);
  }, [formKey, carryOver]);

  useEffect(() => {
    listCollectionCenters(true)
      .then(setCollectionCenters)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (carryOver) return;
    let cancelled = false;
    requestDeviceLocation()
      .then((coords) => {
        if (cancelled) return;
        setFormData((prev) => ({
          ...prev,
          registrantLat: coords.lat,
          registrantLng: coords.lng,
          registroLat: coords.lat,
          registroLng: coords.lng,
        }));
        suggestCenterFromCoords(coords.lat, coords.lng, true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey, carryOver]);

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

  useEffect(() => {
    if (!pacienteTieneEdad(formData)) return;
    const calculated = grupoEtarioFromAge(formData.edadAnios);
    setFormData((prev) =>
      prev.grupoEtario === calculated ? prev : { ...prev, grupoEtario: calculated }
    );
  }, [formData.fechaNacimiento, formData.edadAnios, formData.edadMeses]);

  const clasificacionManual = !pacienteTieneEdad(formData);
  const hasExactBirthDate = !!formData.fechaNacimiento;
  const isChildAgeProfile =
    formData.grupoEtario !== 'adulto' && formData.grupoEtario !== 'tercera_edad';
  const hasCarryOver = !!carryOver;
  const requiereRepresentante = pacienteRequiereRepresentante(formData);

  useEffect(() => {
    if (requiereRepresentante) return;
    setOptionalSections((prev) =>
      prev.representante ? { ...prev, representante: false } : prev
    );
    setFormData((prev) => {
      const hasGuardianData =
        prev.nombreRepresentante.trim() ||
        prev.documentoRepresentante.trim() ||
        prev.telefonoPrincipal.trim() ||
        prev.telefonoEmergencias.trim();
      if (!hasGuardianData) return prev;
      return { ...prev, ...EMPTY_GUARDIAN_FIELDS };
    });
  }, [requiereRepresentante]);

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
    if (trackRecent) {
      recordRecentCenter(center.id);
      setRecentCenterIds(getRecentCenterIds());
    }
  };

  const suggestCenterFromCoords = (lat: number, lng: number, autoSelect = false) => {
    if (formData.puntoRegistroTipo === 'medico') return;
    const points: GeoNamedPoint[] = collectionCenters
      .filter((c) => c.active)
      .map((c) => ({
        id: c.id,
        name: c.name,
        lat: c.geo_lat,
        lng: c.geo_lng,
      }));
    const nearest = findNearest(lat, lng, points);
    if (!nearest || !autoSelect || nearest.distanceM > 1500) return;
    const center = collectionCenters.find((c) => c.id === nearest.item.id);
    if (center) applyCenter(center);
  };

  const handleVoiceApply = (payload: VoiceApplyPayload) => {
    setFormData((prev) => ({ ...prev, ...payload.patch }));
    if (payload.centerMatch) applyCenter(payload.centerMatch, true);
    setOptionalSections((prev) => ({ ...prev, ...payload.sections }));
    setFormErrors({});
    setSubmitError('');
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
        : `Ya existía "${center.name}"; se seleccionó el triaje previo.`
    );
  };

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoError('');
    try {
      await compressPatientPhoto(file);
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    } catch (err: any) {
      setPhotoError(err?.message || 'No se pudo cargar la imagen.');
    }
  };

  const handleSave = async (andContinue: boolean) => {
    const errors = validatePatientSection1(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitError('Revise los campos marcados antes de guardar.');
      return;
    }

    setSaving(true);
    setSubmitError('');
    setFormErrors({});

    try {
      let registrantLat = formData.registrantLat;
      let registrantLng = formData.registrantLng;
      try {
        const device = await requestDeviceLocation();
        registrantLat = device.lat;
        registrantLng = device.lng;
      } catch {
        /* keep existing */
      }

      let fotoPath = formData.fotoPath;
      if (photoFile) {
        fotoPath = await uploadPatientPhoto(formData.id, photoFile);
      }

      const patient: Paciente = {
        ...formData,
        fotoPath,
        registrantLat,
        registrantLng,
      };

      if (patient.puntoRegistroTipo === 'centro' && patient.centroAcopioId) {
        recordRecentCenter(patient.centroAcopioId);
      }

      onSave(patient, { andContinue });
    } catch (err: any) {
      setSubmitError(err?.message || 'No se pudo guardar el triaje.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex flex-col gap-4 bg-slate-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AppLogo variant="reverse" className="h-6 w-auto max-w-[130px]" />
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-amber-100">
              <Zap className="h-3 w-3" /> Rápido
            </span>
          </div>
          <h2 className="mt-1 font-sans text-xl font-bold tracking-tight md:text-2xl">
            Triaje rápido
          </h2>
          <p className="mt-1 max-w-md text-xs text-slate-300">
            Solo lo esencial para brigadas y jornadas. Puede completar la ficha después.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium transition-colors hover:bg-white/20"
        >
          Volver al listado
        </button>
      </div>

      <div className="space-y-5 p-6 md:p-8">
        {hasCarryOver && (
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-xs font-medium text-teal-800">
            Se conservan centro y ubicación del triaje anterior.
            {carryOver?.centroAcopioNombre && (
              <span className="mt-0.5 block font-bold">{carryOver.centroAcopioNombre}</span>
            )}
            {(carryOver?.ciudadMunicipio || carryOver?.estadoProvincia) && (
              <span className="mt-0.5 block text-teal-700/90">
                {[carryOver.ciudadMunicipio, carryOver.estadoProvincia].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        )}

        <OptionalSection
          title="Dictado por voz"
          hint="Micrófono gratuito + IA para llenar campos (revise antes de guardar)"
          enabled={voiceDictationEnabled}
          onToggle={setVoiceDictationEnabled}
        >
          <VoicePatientPanel
            formKey={formKey}
            currentPatient={formData}
            collectionCenters={collectionCenters}
            onApply={handleVoiceApply}
          />
        </OptionalSection>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Nombres
            </label>
            <input
              type="text"
              value={formData.nombres}
              onChange={(e) => {
                setFormData((p) => ({ ...p, nombres: e.target.value }));
                if (formErrors.nombres) setFormErrors((prev) => ({ ...prev, nombres: '' }));
              }}
              placeholder="Ej. Mateo"
              className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 ${
                formErrors.nombres ? 'border-red-300' : 'border-slate-200'
              }`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Apellidos
            </label>
            <input
              type="text"
              value={formData.apellidos}
              onChange={(e) => setFormData((p) => ({ ...p, apellidos: e.target.value }))}
              placeholder="Ej. Gómez"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Documento
            </label>
            <input
              type="text"
              value={formData.documentoIdentidad}
              onChange={(e) => setFormData((p) => ({ ...p, documentoIdentidad: e.target.value }))}
              placeholder="C.I. o pasaporte (si aplica)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10"
            />
            {formErrors.nombres && (
              <p className="mt-1 text-xs font-medium text-red-500">{formErrors.nombres}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Fecha de nacimiento{' '}
            <span className="font-normal normal-case text-slate-400">(opcional)</span>
          </label>
          <input
            type="date"
            value={formData.fechaNacimiento}
            onChange={(e) =>
              setFormData((p) => ({ ...p, fechaNacimiento: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
            {hasExactBirthDate ? 'Edad calculada' : 'Edad tentativa'}
          </label>
          {hasExactBirthDate ? (
            <div className={`grid gap-2 ${isChildAgeProfile ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-700">
                <span className="font-mono font-bold text-slate-800">{formData.edadAnios}</span>
                <span className="text-xs text-slate-500">años</span>
              </div>
              {isChildAgeProfile && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-700">
                  <span className="font-mono font-bold text-slate-800">{formData.edadMeses}</span>
                  <span className="text-xs text-slate-500">meses</span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                value={formData.edadAnios || ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, edadAnios: parseFormNumber(e.target.value) }))
                }
                placeholder="Años"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10"
              />
              <input
                type="number"
                min={0}
                max={11}
                value={formData.edadMeses || ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, edadMeses: parseFormNumber(e.target.value) }))
                }
                placeholder="Meses"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10"
              />
            </div>
          )}
          <p className="mt-1 text-[10px] text-slate-400">
            {hasExactBirthDate
              ? 'Calculada automáticamente desde la fecha de nacimiento.'
              : 'Estimación aproximada cuando no se conoce la fecha exacta.'}
          </p>
        </div>

        {clasificacionManual && (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Clasificación etaria
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GRUPOS_ETARIOS.map((grupo) => (
                <button
                  key={grupo}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, grupoEtario: grupo }))}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all ${
                    formData.grupoEtario === grupo
                      ? 'border-teal-600 bg-teal-50 text-teal-700 ring-2 ring-teal-500/10'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {grupoEtarioLabel(grupo)}
                </button>
              ))}
            </div>
            {formErrors.grupoEtario && (
              <p className="mt-1 text-xs font-medium text-red-500">{formErrors.grupoEtario}</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Género
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Masculino', 'Femenino', 'Otro'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setFormData((p) => ({ ...p, genero: g }))}
                className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                  formData.genero === g
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
          <p className="text-xs font-bold text-teal-900">Punto de triaje</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, puntoRegistroTipo: 'centro' }))}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                formData.puntoRegistroTipo === 'centro'
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
              }`}
            >
              <Warehouse className="h-4 w-4 shrink-0" />
              Centro de acopio
            </button>
            <button
              type="button"
              onClick={() =>
                setFormData((p) => ({
                  ...p,
                  puntoRegistroTipo: 'medico',
                  centroAcopioId: '',
                  centroAcopioNombre: '',
                  centroAcopioLat: null,
                  centroAcopioLng: null,
                }))
              }
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                formData.puntoRegistroTipo === 'medico'
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50'
              }`}
            >
              <Stethoscope className="h-4 w-4 shrink-0" />
              Atención en calle
            </button>
          </div>

          {formData.puntoRegistroTipo === 'centro' && (
            <>
              <CenterPicker
                collectionCenters={collectionCenters}
                recentCenterIds={recentCenterIds}
                selectedCenterId={formData.centroAcopioId}
                selectedCenterName={formData.centroAcopioNombre}
                centerFilter={centerFilter}
                onCenterFilterChange={setCenterFilter}
                onSelectCenter={(center) => applyCenter(center, true)}
                onClearSelection={() =>
                  setFormData((p) => ({
                    ...p,
                    centroAcopioId: '',
                    centroAcopioNombre: '',
                  }))
                }
                inputClass={inputClass}
                placeholder="Buscar centro..."
              />
              <button
                type="button"
                onClick={() => setShowNewCenter(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-teal-300 bg-white px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo centro
              </button>
              {centerNotice && (
                <p className="text-[11px] font-medium text-teal-700">{centerNotice}</p>
              )}
            </>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-bold text-slate-700">Ubicación del paciente</p>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Dirección
            </label>
            <textarea
              value={formData.direccion}
              onChange={(e) => setFormData((p) => ({ ...p, direccion: e.target.value }))}
              rows={2}
              placeholder="Calle, urbanización, apartamento..."
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Ciudad / Municipio
              </label>
              <input
                type="text"
                value={formData.ciudadMunicipio}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, ciudadMunicipio: e.target.value }))
                }
                placeholder="Ej. Chacao"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Estado / Provincia
              </label>
              <input
                type="text"
                value={formData.estadoProvincia}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, estadoProvincia: e.target.value }))
                }
                placeholder="Ej. Miranda"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Punto de referencia
            </label>
            <input
              type="text"
              value={formData.puntoReferencia}
              onChange={(e) =>
                setFormData((p) => ({ ...p, puntoReferencia: e.target.value }))
              }
              placeholder="Ej. Frente a la plaza..."
              className={inputClass}
            />
          </div>
        </div>

        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <ChevronDown className="h-3 w-3" />
          Datos adicionales (active el switch si los tiene)
        </p>

        <div className="space-y-3">
          <OptionalSection
            title="Foto del paciente"
            hint="Cámara o galería"
            enabled={optionalSections.foto}
            onToggle={(v) => setSection('foto', v)}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Vista previa"
                  className="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-cover"
                />
              ) : (
                <PatientPhoto
                  fotoPath={formData.fotoPath}
                  alt="Paciente"
                  className="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-cover"
                  fallbackClassName="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-300"
                />
              )}
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700">
                  <Camera className="h-3.5 w-3.5" />
                  {photoPreview ? 'Cambiar foto' : 'Tomar / subir foto'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
                {photoError && <p className="text-xs font-medium text-red-500">{photoError}</p>}
              </div>
            </div>
          </OptionalSection>

          <OptionalSection
            title="Peso y talla"
            hint="Antropometría de la jornada"
            enabled={optionalSections.antropometria}
            onToggle={(v) => setSection('antropometria', v)}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={formData.peso || ''}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, peso: parseFormNumber(e.target.value) }))
                  }
                  placeholder="Ej. 18.5"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Talla (cm)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.estatura || ''}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, estatura: parseFormNumber(e.target.value) }))
                  }
                  placeholder="Ej. 105"
                  className={inputClass}
                />
              </div>
            </div>
          </OptionalSection>

          {requiereRepresentante && (
          <OptionalSection
            title="Representante / contacto"
            hint="Madre, padre o tutor"
            enabled={optionalSections.representante}
            onToggle={(v) => setSection('representante', v)}
          >
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Nombre del representante
                </label>
                <input
                  type="text"
                  value={formData.nombreRepresentante}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, nombreRepresentante: e.target.value }))
                  }
                  placeholder="Nombre completo"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Parentesco
                  </label>
                  <SelectField
                    value={formData.parentesco}
                    onChange={(parentesco) =>
                      setFormData((p) => ({
                        ...p,
                        parentesco: parentesco as Paciente['parentesco'],
                      }))
                    }
                    options={PARENTESCO_OPTIONS}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Teléfono principal
                  </label>
                  <input
                    type="tel"
                    value={formData.telefonoPrincipal}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, telefonoPrincipal: e.target.value }))
                    }
                    placeholder="Ej. 0414-1234567"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Teléfono de emergencias
                </label>
                <input
                  type="tel"
                  value={formData.telefonoEmergencias}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, telefonoEmergencias: e.target.value }))
                  }
                  placeholder="Opcional"
                  className={inputClass}
                />
              </div>
            </div>
          </OptionalSection>
          )}

          <OptionalSection
            title="Salud"
            hint="Vacunación y alergias"
            enabled={optionalSections.salud}
            onToggle={(v) => setSection('salud', v)}
          >
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Esquema de vacunación
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Completo', 'Incompleto'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, esquemaVacunacion: v }))}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        formData.esquemaVacunacion === v
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  ¿Tiene alergias?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, tieneAlergias: true }))}
                    className={`rounded-xl border py-2 text-xs font-bold ${
                      formData.tieneAlergias
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        tieneAlergias: false,
                        alergiasEspecificas: '',
                      }))
                    }
                    className={`rounded-xl border py-2 text-xs font-bold ${
                      !formData.tieneAlergias
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
              {formData.tieneAlergias && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Alergias específicas
                  </label>
                  <input
                    type="text"
                    value={formData.alergiasEspecificas}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, alergiasEspecificas: e.target.value }))
                    }
                    placeholder="Ej. Penicilina, maní..."
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </OptionalSection>

          <OptionalSection
            title="Educación"
            hint="Escuela o guardería"
            enabled={optionalSections.educacion}
            onToggle={(v) => setSection('educacion', v)}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, asisteEscuela: true }))}
                  className={`rounded-xl border py-2 text-xs font-bold ${
                    formData.asisteEscuela
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  Asiste a escuela
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      asisteEscuela: false,
                      nivelEducativo: '',
                      gradoAnio: '',
                      nombreInstitucion: '',
                    }))
                  }
                  className={`rounded-xl border py-2 text-xs font-bold ${
                    !formData.asisteEscuela
                      ? 'border-slate-400 bg-slate-100 text-slate-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  No asiste
                </button>
              </div>
              {formData.asisteEscuela && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Nivel educativo
                    </label>
                    <SelectField
                      value={formData.nivelEducativo}
                      onChange={(nivelEducativo) =>
                        setFormData((p) => ({
                          ...p,
                          nivelEducativo: nivelEducativo as Paciente['nivelEducativo'],
                        }))
                      }
                      options={NIVEL_EDUCATIVO_OPTIONS}
                      placeholder="Seleccione..."
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Grado / año
                      </label>
                      <input
                        type="text"
                        value={formData.gradoAnio}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, gradoAnio: e.target.value }))
                        }
                        placeholder="Ej. 3er grado"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Institución
                      </label>
                      <input
                        type="text"
                        value={formData.nombreInstitucion}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, nombreInstitucion: e.target.value }))
                        }
                        placeholder="Nombre de la escuela"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </OptionalSection>
        </div>

        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onOpenFullForm}
            className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-teal-700 hover:underline"
          >
            Usar ficha completa (3 pasos)
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Guardar y agregar otro
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar
            </button>
          </div>
        </div>
      </div>

      {showNewCenter && (
        <QuickCenterRegister
          onSaved={handleQuickCenterSaved}
          onCancel={() => setShowNewCenter(false)}
        />
      )}
    </div>
  );
}
