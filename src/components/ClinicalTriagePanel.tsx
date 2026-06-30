import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, ClipboardList, FileText, Loader2, Pill, Plus, Stethoscope } from 'lucide-react';
import { CLINICAL_TRIAGE_LABEL } from '../brand';
import type { Paciente } from '../types';
import type { CareEpisodeBundle, UrgencyClass } from '../care-pathway/types';
import {
  ensureClinicalTriageEpisode,
  getCareEpisodeBundle,
  getPatientCareStatus,
  upsertCareTriage,
  addCareDiagnosis,
  addCareTreatment,
  ensureBackgroundSnapshot,
  addBackgroundHistoryEntry,
} from '../care-pathway/carePathwayApi';
import {
  episodeStatusLabel,
  URGENCY_CLASS_LABELS,
  TREATMENT_KIND_LABELS,
  treatmentKindLabel,
  DIAGNOSIS_KIND_LABELS,
} from '../care-pathway/labels';
import type { TreatmentKindCode } from '../care-pathway/types';

type ClinicalTriagePanelProps = {
  patient: Paciente;
  canManage: boolean;
};

const URGENCY_OPTIONS: { value: UrgencyClass; className: string; activeClass: string }[] = [
  { value: 'green', className: 'border-emerald-200 text-emerald-800', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'yellow', className: 'border-amber-200 text-amber-900', activeClass: 'bg-amber-500 text-white border-amber-500' },
  { value: 'red', className: 'border-rose-200 text-rose-800', activeClass: 'bg-rose-600 text-white border-rose-600' },
  { value: 'unclassified', className: 'border-slate-200 text-slate-600', activeClass: 'bg-slate-600 text-white border-slate-600' },
];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10';

const CLOSED_STATUSES = ['discharged', 'referred', 'cancelled'] as const;

const TREATMENT_KIND_OPTIONS = Object.entries(TREATMENT_KIND_LABELS) as [TreatmentKindCode, string][];

export default function ClinicalTriagePanel({ patient, canManage }: ClinicalTriagePanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [bundle, setBundle] = useState<CareEpisodeBundle | null>(null);
  const [canStartNew, setCanStartNew] = useState(true);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [urgencyClass, setUrgencyClass] = useState<UrgencyClass>('unclassified');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');

  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [historyNotes, setHistoryNotes] = useState('');
  const [treatmentKind, setTreatmentKind] = useState<TreatmentKindCode>('general');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [careSaving, setCareSaving] = useState(false);

  const syncFormFromBundle = useCallback((data: CareEpisodeBundle | null) => {
    const triage = data?.triage;
    setChiefComplaint(triage?.chiefComplaint || '');
    setUrgencyClass(triage?.urgencyClass ?? 'unclassified');
    setWeightKg(
      triage?.weightKg != null
        ? String(triage.weightKg)
        : patient.peso > 0
          ? String(patient.peso)
          : ''
    );
    setHeightCm(
      triage?.heightCm != null
        ? String(triage.heightCm)
        : patient.estatura > 0
          ? String(patient.estatura)
          : ''
    );
  }, [patient.estatura, patient.peso]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const status = await getPatientCareStatus(patient.id);
      setCanStartNew(status.canStartNewEpisode);
      if (!status.episodeId) {
        setBundle(null);
        syncFormFromBundle(null);
        return;
      }
      const data = await getCareEpisodeBundle(status.episodeId);
      setBundle(data);
      syncFormFromBundle(data);
    } catch (err: any) {
      const message = err?.message || '';
      if (message.includes('care_episodes') || message.includes('schema cache')) {
        setError(
          'El módulo de triaje clínico no está activo en la base de datos. Ejecute supabase/care_pathway.sql en Supabase.'
        );
      } else {
        setError(message || 'No se pudo cargar el triaje clínico.');
      }
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [patient.id, syncFormFromBundle]);

  useEffect(() => {
    load();
  }, [load]);

  const episodeEditable =
    bundle &&
    ['registered', 'triage_in_progress'].includes(bundle.episode.status) &&
    bundle.triage?.status !== 'completed';

  const triageCompleted = bundle?.triage?.status === 'completed';
  const episodeOpen = bundle && !CLOSED_STATUSES.includes(bundle.episode.status as typeof CLOSED_STATUSES[number]);
  const canRecordCare = Boolean(canManage && bundle && episodeOpen && triageCompleted);

  const resetCareForms = () => {
    setDiagnosisText('');
    setHistoryNotes('');
    setTreatmentKind('general');
    setTreatmentNotes('');
    setShowHistoryForm(false);
    setShowTreatmentForm(false);
  };

  const handleSaveClinicalHistory = async () => {
    if (!bundle || !canManage) return;
    const diagnosis = diagnosisText.trim();
    if (!diagnosis) {
      setError('Indique el diagnóstico o hallazgo clínico.');
      return;
    }
    setCareSaving(true);
    setError('');
    setNotice('');
    try {
      await addCareDiagnosis(bundle.episode.id, diagnosis, 'primary');
      const notes = historyNotes.trim();
      if (notes) {
        const snapshotId = await ensureBackgroundSnapshot(bundle.episode.id);
        await addBackgroundHistoryEntry(snapshotId, notes);
      }
      resetCareForms();
      await load();
      setNotice('Historial clínico registrado.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar el historial clínico.');
    } finally {
      setCareSaving(false);
    }
  };

  const handleSaveTreatment = async () => {
    if (!bundle || !canManage) return;
    setCareSaving(true);
    setError('');
    setNotice('');
    try {
      await addCareTreatment(bundle.episode.id, {
        kindCode: treatmentKind,
        status: 'active',
        notes: treatmentNotes.trim() || undefined,
      });
      resetCareForms();
      await load();
      setNotice('Tratamiento registrado.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar el tratamiento.');
    } finally {
      setCareSaving(false);
    }
  };

  const handleStart = async () => {
    if (!canManage) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const episode = await ensureClinicalTriageEpisode(
        patient.id,
        patient.centroAcopioId || null
      );
      const data = await getCareEpisodeBundle(episode.id);
      setBundle(data);
      syncFormFromBundle(data);
      setNotice('Atención iniciada. Complete el triaje clínico.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar el triaje clínico.');
    } finally {
      setSaving(false);
    }
  };

  const persistTriage = async (complete: boolean) => {
    if (!bundle || !canManage) return;
    const weight = weightKg.trim() ? Number(weightKg) : null;
    const height = heightCm.trim() ? Number(heightCm) : null;
    if (weight != null && (!Number.isFinite(weight) || weight <= 0)) {
      setError('Indique un peso válido o déjelo vacío.');
      return;
    }
    if (height != null && (!Number.isFinite(height) || height <= 0)) {
      setError('Indique una talla válida o déjela vacía.');
      return;
    }
    if (complete && !chiefComplaint.trim()) {
      setError('Indique el motivo de consulta para completar el triaje clínico.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (bundle.episode.status === 'registered') {
        await ensureClinicalTriageEpisode(patient.id, patient.centroAcopioId || null);
      }
      await upsertCareTriage(bundle.episode.id, {
        status: complete ? 'completed' : 'in_progress',
        chiefComplaint,
        urgencyClass,
        weightKg: weight,
        heightCm: height,
      });
      await load();
      setNotice(complete ? 'Triaje clínico completado.' : 'Progreso guardado.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el triaje clínico.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm print:hidden">
      <div className="flex flex-col gap-2 border-b border-blue-100 bg-blue-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900">
            <Stethoscope className="h-4 w-4" />
            {CLINICAL_TRIAGE_LABEL}
          </h3>
          <p className="mt-0.5 text-[11px] text-blue-800/80">
            Evaluación de urgencia y motivo de consulta en esta visita. Distinto de la captura en censo.
          </p>
        </div>
        {bundle && (
          <span className="inline-flex rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-800">
            {episodeStatusLabel(bundle.episode.status)}
          </span>
        )}
      </div>

      <div className="space-y-4 p-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Cargando triaje clínico…
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                {notice}
              </div>
            )}

            {!bundle && canManage && canStartNew && (
              <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-4 py-5 text-center">
                <p className="text-sm font-semibold text-slate-700">Sin atención clínica abierta</p>
                <p className="mt-1 text-xs text-slate-500">
                  El paciente ya está en el censo. Inicie una visita para clasificar urgencia y motivo.
                </p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleStart()}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Stethoscope className="h-3.5 w-3.5" />}
                  Iniciar triaje clínico
                </button>
              </div>
            )}

            {!bundle && !canManage && (
              <p className="text-xs text-slate-500">
                El triaje clínico solo lo realiza personal médico, admin o super admin.
              </p>
            )}

            {bundle && triageCompleted && (
              <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                  <Check className="h-4 w-4" />
                  Triaje clínico completado
                </div>
                <p className="text-sm text-slate-800">
                  <span className="font-semibold">Motivo:</span>{' '}
                  {bundle.triage?.chiefComplaint || '—'}
                </p>
                <p className="text-sm text-slate-800">
                  <span className="font-semibold">Urgencia:</span>{' '}
                  {URGENCY_CLASS_LABELS[bundle.triage?.urgencyClass ?? 'unclassified']}
                </p>
                <p className="text-xs text-slate-600">
                  Peso {bundle.triage?.weightKg ?? '—'} kg · Talla {bundle.triage?.heightCm ?? '—'} cm
                </p>
              </div>
            )}

            {bundle && triageCompleted && (bundle.diagnoses.length > 0 || bundle.treatments.length > 0) && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                {bundle.diagnoses.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Diagnósticos
                    </p>
                    <ul className="space-y-2">
                      {bundle.diagnoses.map((dx) => (
                        <li key={dx.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                          <span className="font-semibold">{DIAGNOSIS_KIND_LABELS[dx.kind]}:</span>{' '}
                          {dx.diagnosisText}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {bundle.treatments.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Tratamientos
                    </p>
                    <ul className="space-y-2">
                      {bundle.treatments.map((tx) => (
                        <li key={tx.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                          <span className="font-semibold">{treatmentKindLabel(tx.kindCode)}</span>
                          {tx.notes ? <span className="text-slate-600"> — {tx.notes}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {canRecordCare && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Seguimiento de la visita
                </p>
                <div className="flex flex-wrap gap-2">
                  {!showHistoryForm && (
                    <button
                      type="button"
                      disabled={careSaving}
                      onClick={() => {
                        setShowTreatmentForm(false);
                        setShowHistoryForm(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Registrar historial clínico
                    </button>
                  )}
                  {!showTreatmentForm && (
                    <button
                      type="button"
                      disabled={careSaving}
                      onClick={() => {
                        setShowHistoryForm(false);
                        setShowTreatmentForm(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <Pill className="h-3.5 w-3.5" />
                      Registrar tratamiento
                    </button>
                  )}
                </div>

                {showHistoryForm && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <ClipboardList className="h-4 w-4" />
                        Historial clínico
                      </span>
                      <button
                        type="button"
                        onClick={resetCareForms}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                      >
                        Cancelar
                      </button>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Diagnóstico o hallazgo *
                      </label>
                      <input
                        type="text"
                        value={diagnosisText}
                        onChange={(e) => setDiagnosisText(e.target.value)}
                        placeholder="Ej.: Gastroenteritis aguda leve"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Antecedentes u observaciones (opcional)
                      </label>
                      <textarea
                        value={historyNotes}
                        onChange={(e) => setHistoryNotes(e.target.value)}
                        rows={3}
                        placeholder="Evolución, antecedentes relevantes de la consulta…"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={careSaving}
                      onClick={() => void handleSaveClinicalHistory()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {careSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Guardar historial
                    </button>
                  </div>
                )}

                {showTreatmentForm && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Pill className="h-4 w-4" />
                        Tratamiento
                      </span>
                      <button
                        type="button"
                        onClick={resetCareForms}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                      >
                        Cancelar
                      </button>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Tipo de tratamiento
                      </label>
                      <select
                        value={treatmentKind}
                        onChange={(e) => setTreatmentKind(e.target.value as TreatmentKindCode)}
                        className={inputClass}
                      >
                        {TREATMENT_KIND_OPTIONS.map(([code, label]) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Indicaciones (opcional)
                      </label>
                      <textarea
                        value={treatmentNotes}
                        onChange={(e) => setTreatmentNotes(e.target.value)}
                        rows={3}
                        placeholder="Dosis, vía, duración, observaciones…"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={careSaving}
                      onClick={() => void handleSaveTreatment()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {careSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Guardar tratamiento
                    </button>
                  </div>
                )}
              </div>
            )}

            {bundle && triageCompleted && !canManage && (
              <p className="text-xs text-slate-500">
                El historial clínico y los tratamientos solo los registra personal médico, admin o super admin.
              </p>
            )}

            {bundle && episodeEditable && canManage && (
              <>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Clasificación de urgencia
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {URGENCY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setUrgencyClass(option.value)}
                        className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${
                          urgencyClass === option.value ? option.activeClass : option.className
                        }`}
                      >
                        {URGENCY_CLASS_LABELS[option.value]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Motivo de consulta
                  </label>
                  <textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    rows={3}
                    placeholder="Ej.: Fiebre desde ayer, dolor abdominal…"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Talla (cm)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void persistTriage(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Guardar progreso
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void persistTriage(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    Completar triaje clínico
                  </button>
                </div>
              </>
            )}

            {bundle && episodeEditable && !canManage && (
              <p className="text-xs text-slate-500">
                Triaje clínico en curso. Solo lectura para su perfil.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
