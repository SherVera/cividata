import type {
  CareBackgroundSnapshot,
  CareDiagnosis,
  CareEpisode,
  CareEpisodeSummary,
  CareExam,
  CareTriage,
  CareTreatment,
  TreatmentKindCode,
} from './types';
import {
  statusImpliesCareStarted,
  statusImpliesInTreatment,
  statusImpliesTriageDone,
} from './transitions';

const ELECTROLYTE_KIND: TreatmentKindCode = 'electrolyte_panel';
const SALINE_KIND: TreatmentKindCode = 'saline_solution';

export function classifyTreatmentKind(text: string): TreatmentKindCode {
  const value = (text || '').trim().toLowerCase();
  if (!value) return 'other';
  if (/(electrolit|electrolyte)/.test(value)) return 'electrolyte_panel';
  if (/(salina|saline|suero|ssn|nacl)/.test(value)) return 'saline_solution';
  if (/(hidrat|rehidrat|oral rehydration)/.test(value)) return 'hydration';
  if (/(medic|antib|amox|ibupro|paracet|acetamin)/.test(value)) return 'medication';
  return 'general';
}

export function buildCareEpisodeSummary(input: {
  episode: CareEpisode;
  triage?: CareTriage | null;
  background?: CareBackgroundSnapshot | null;
  diagnoses?: CareDiagnosis[];
  treatments?: CareTreatment[];
  exams?: CareExam[];
}): CareEpisodeSummary {
  const triage = input.triage ?? null;
  const background = input.background ?? null;
  const diagnoses = input.diagnoses ?? [];
  const treatments = input.treatments ?? [];
  const exams = input.exams ?? [];

  const triageCompleted = triage?.status === 'completed';
  const startedTreatments = treatments.filter((t) =>
    ['active', 'completed'].includes(t.status)
  ).length;

  return {
    hasTriage: triageCompleted || statusImpliesTriageDone(input.episode.status),
    triageStarted: !!triage || input.episode.status !== 'registered',
    careStarted:
      statusImpliesCareStarted(input.episode.status) ||
      diagnoses.length > 0 ||
      treatments.length > 0 ||
      exams.length > 0,
    treatmentStarted:
      statusImpliesInTreatment(input.episode.status) || startedTreatments > 0,
    hasDiagnoses: diagnoses.length > 0,
    hasExams: exams.length > 0,
    hasCompletedExams: exams.some((e) => e.status === 'completed'),
    pendingExams: exams.filter((e) => e.status === 'requested').length,
    activeTreatments: treatments.filter((t) => t.status === 'active').length,
    hasElectrolytePanel: treatments.some((t) => t.kindCode === ELECTROLYTE_KIND),
    hasSalineSolution: treatments.some((t) => t.kindCode === SALINE_KIND),
    hasAllergies: (background?.allergies.length ?? 0) > 0,
    hasChronicCondition: (background?.conditions.length ?? 0) > 0,
    hasMedicalHistory: (background?.historyEntries.length ?? 0) > 0,
  };
}
