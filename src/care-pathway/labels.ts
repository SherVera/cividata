import type { CareEpisode, CareEpisodeStatus, DiagnosisKind, TreatmentKindCode, UrgencyClass } from './types';

export const EPISODE_STATUS_LABELS: Record<CareEpisodeStatus, string> = {
  registered: 'Registrado',
  triage_in_progress: 'Triaje en curso',
  triage_completed: 'Triaje completado',
  waiting: 'En espera',
  care_started: 'Atención iniciada',
  exams_pending: 'Exámenes pendientes',
  exams_completed: 'Exámenes realizados',
  in_treatment: 'En tratamiento',
  discharged: 'Alta',
  referred: 'Derivado',
  cancelled: 'Cancelado',
};

export const TREATMENT_KIND_LABELS: Record<TreatmentKindCode, string> = {
  general: 'Tratamiento general',
  electrolyte_panel: 'Panel de electrolitos',
  saline_solution: 'Solución salina',
  medication: 'Medicamento',
  hydration: 'Hidratación',
  other: 'Otro',
};

export const TRIAGE_STATUS_LABELS = {
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
} as const;

export const EXAM_STATUS_LABELS = {
  requested: 'Solicitado',
  completed: 'Realizado',
  cancelled: 'Cancelado',
} as const;

export const URGENCY_CLASS_LABELS: Record<UrgencyClass, string> = {
  green: 'Verde',
  yellow: 'Amarillo',
  red: 'Rojo',
  unclassified: 'Sin clasificar',
};

export const DIAGNOSIS_KIND_LABELS: Record<DiagnosisKind, string> = {
  primary: 'Principal',
  secondary: 'Secundario',
};

export function episodeStatusLabel(status: CareEpisodeStatus | null | undefined): string {
  if (!status) return 'Sin atención nueva';
  return EPISODE_STATUS_LABELS[status] ?? status;
}

export function treatmentKindLabel(kind: string): string {
  return TREATMENT_KIND_LABELS[kind as TreatmentKindCode] ?? kind;
}

export function patientCareBadge(episode: CareEpisode | null, isLegacyOnly: boolean): string {
  if (isLegacyOnly) return 'Legacy';
  if (!episode) return 'Sin atención nueva';
  if (episode.source === 'backfill') return `Importado · ${episodeStatusLabel(episode.status)}`;
  return episodeStatusLabel(episode.status);
}
