import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mic, MicOff, Sparkles } from 'lucide-react';
import type { CollectionCenter } from '../lib/collectionCentersApi';
import type { Paciente } from '../types';
import type { OptionalSectionKey } from '../lib/optionalPatientSections';
import { applyVoiceDraft, type VoiceFieldIssue } from '../lib/voicePatientDraft';
import { parsePatientTranscript } from '../lib/voiceParseApi';
import { voiceConfig } from '../lib/voiceConfig';
import {
  buildVoiceDictationExample,
  buildVoiceDictationTemplate,
  VOICE_DICTATION_FIELDS,
  VOICE_DICTATION_FORMAT_HINT,
  VOICE_DICTATION_PLACEHOLDER,
} from '../lib/voiceDictationGuide';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10';

export type VoiceApplyPayload = {
  patch: Partial<Paciente>;
  sections: Partial<Record<OptionalSectionKey, boolean>>;
  centerMatch: CollectionCenter | null;
  assignedCount: number;
  issues: VoiceFieldIssue[];
  missingRequired: VoiceFieldIssue[];
};

type VoicePatientPanelProps = {
  formKey?: number;
  currentPatient: Paciente;
  collectionCenters: CollectionCenter[];
  onApply: (payload: VoiceApplyPayload) => void;
};

export default function VoicePatientPanel({
  formKey = 0,
  currentPatient,
  collectionCenters,
  onApply,
}: VoicePatientPanelProps) {
  const speech = useSpeechRecognition(voiceConfig.speechLang, {
    maxSeconds: voiceConfig.speechMaxSeconds,
  });
  const [parseError, setParseError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [lastSummary, setLastSummary] = useState<VoiceApplyPayload | null>(null);

  useEffect(() => {
    speech.setTranscript('');
    speech.stop();
    setParseError('');
    setLastSummary(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey]);

  const applyDraftToForm = (draft: Awaited<ReturnType<typeof parsePatientTranscript>>) => {
    const result = applyVoiceDraft(currentPatient, draft, collectionCenters);
    const payload: VoiceApplyPayload = {
      patch: result.patch,
      sections: result.sections,
      centerMatch: result.centerMatch,
      assignedCount: result.assigned.length,
      issues: result.issues,
      missingRequired: result.missingRequired,
    };
    setLastSummary(payload);
    onApply(payload);
    return payload;
  };

  const handleAnalyzeWithAi = async () => {
    const text = speech.transcript.trim();
    if (text.length < voiceConfig.parseMinChars) {
      setParseError(
        `Escriba o dicte al menos ${voiceConfig.parseMinChars} caracteres antes de analizar.`
      );
      return;
    }

    setParsing(true);
    setParseError('');
    setLastSummary(null);

    try {
      applyDraftToForm(await parsePatientTranscript(text, 'ai'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo analizar el texto.';
      setParseError(message);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[11px] leading-relaxed text-indigo-800/90">
          {VOICE_DICTATION_FORMAT_HINT} Revise antes de guardar.
        </p>
        <div className="flex gap-2">
          {speech.listening ? (
            <button
              type="button"
              onClick={speech.stop}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              <MicOff className="h-3.5 w-3.5" />
              Detener
            </button>
          ) : (
            <button
              type="button"
              onClick={speech.start}
              disabled={!speech.supported}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:bg-slate-300"
            >
              <Mic className="h-3.5 w-3.5" />
              Dictar
            </button>
          )}
        </div>
      </div>

      {!speech.supported && (
        <p className="text-xs font-medium text-amber-800">
          Dictado no disponible en este navegador. Puede escribir o pegar el texto manualmente.
        </p>
      )}

      {speech.listening && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-red-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Escuchando… hable con claridad
          {speech.remainingSeconds !== null && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
              {speech.remainingSeconds}s restantes
            </span>
          )}
        </p>
      )}

      {speech.limitReached && voiceConfig.speechMaxSeconds > 0 && (
        <p className="text-xs font-medium text-amber-800">
          Tiempo máximo de dictado alcanzado ({voiceConfig.speechMaxSeconds}s). Revise el texto y
          analice con IA.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-dashed border-indigo-200 bg-white/80 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-slate-700">{VOICE_DICTATION_FORMAT_HINT}</p>
          <ul className="max-h-36 space-y-1 overflow-y-auto text-[11px] text-slate-600">
            {VOICE_DICTATION_FIELDS.map((field) => (
              <li
                key={field.label}
                className={`flex gap-1.5 ${field.important ? 'rounded-md bg-teal-50/80 px-1 py-0.5' : ''}`}
              >
                <span className="shrink-0 font-mono font-semibold text-indigo-800">
                  {field.required ? '*' : ''}
                  {field.important ? '+' : ''}
                  {field.label}:
                </span>
                <span className={field.important ? 'font-medium text-teal-800' : 'text-slate-500'}>
                  {field.hint}
                </span>
              </li>
            ))}
          </ul>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Ejemplo de referencia
            </p>
            <pre className="max-h-36 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-slate-700 whitespace-pre-wrap">
              {buildVoiceDictationExample()}
            </pre>
          </div>
          <button
            type="button"
            onClick={() => speech.setTranscript(buildVoiceDictationTemplate())}
            className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-800 hover:bg-indigo-50"
          >
            Insertar plantilla vacía
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Texto transcrito
          </label>
          <textarea
            value={speech.transcript}
            onChange={(e) => speech.setTranscript(e.target.value)}
            rows={14}
            placeholder={VOICE_DICTATION_PLACEHOLDER}
            className={`${inputClass} min-h-[220px] font-mono text-[13px] leading-relaxed`}
          />
          {speech.listening && speech.interimTranscript && (
            <p className="mt-1 text-[11px] italic text-slate-500">{speech.interimTranscript}</p>
          )}
          <p className="mt-1 text-[10px] text-slate-500">
            Dicte «Etiqueta: valor» siguiendo el ejemplo. Corrija antes de analizar.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAnalyzeWithAi}
          disabled={parsing || speech.transcript.trim().length < voiceConfig.parseMinChars}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {parsing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Analizar con IA
        </button>
        <p className="text-[10px] text-slate-500">
          Groq, OpenRouter o Gemini según configuración del servidor.
        </p>
      </div>

      {(speech.error || parseError) && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {speech.error || parseError}
        </p>
      )}

      {lastSummary && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
          <p className="flex items-center gap-1.5 font-bold text-teal-800">
            <CheckCircle2 className="h-4 w-4" />
            {lastSummary.assignedCount > 0
              ? `${lastSummary.assignedCount} campo(s) asignado(s) al formulario`
              : 'No se detectaron campos claros'}
          </p>

          {lastSummary.missingRequired.length > 0 && (
            <div>
              <p className="font-semibold text-red-700">Falta (obligatorio):</p>
              <ul className="mt-1 list-inside list-disc text-red-600">
                {lastSummary.missingRequired.map((item) => (
                  <li key={item.key}>{item.label}</li>
                ))}
              </ul>
            </div>
          )}

          {lastSummary.issues.length > 0 && (
            <div>
              <p className="font-semibold text-amber-700">Revisar (dudoso o sin coincidencia):</p>
              <ul className="mt-1 list-inside list-disc text-amber-700">
                {lastSummary.issues.map((item) => (
                  <li key={item.key}>{item.label}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
