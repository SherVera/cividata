export type CareEpisodeStatus =
  | 'registered'
  | 'triage_in_progress'
  | 'triage_completed'
  | 'waiting'
  | 'care_started'
  | 'exams_pending'
  | 'exams_completed'
  | 'in_treatment'
  | 'discharged'
  | 'referred'
  | 'cancelled';

export type CareEpisodeSource = 'live' | 'backfill';

export type TriageStatus = 'in_progress' | 'completed' | 'cancelled';
export type TreatmentStatus = 'pending' | 'active' | 'completed' | 'suspended';
export type ExamStatus = 'requested' | 'completed' | 'cancelled';
export type DiagnosisKind = 'primary' | 'secondary';
export type UrgencyClass = 'green' | 'yellow' | 'red' | 'unclassified';

export type TreatmentKindCode =
  | 'general'
  | 'electrolyte_panel'
  | 'saline_solution'
  | 'medication'
  | 'hydration'
  | 'other';

export interface CareEpisode {
  id: string;
  patientId: string | null;
  previousEpisodeId: string | null;
  status: CareEpisodeStatus;
  collectionCenterId: string | null;
  source: CareEpisodeSource;
  startedAt: string;
  closedAt: string | null;
  createdBy: string | null;
}

export interface CareTriage {
  id: string;
  episodeId: string;
  status: TriageStatus;
  weightKg: number | null;
  heightCm: number | null;
  chiefComplaint: string;
  urgencyClass: UrgencyClass;
  completedAt: string | null;
}

export interface CareSnapshotAllergy {
  id: string;
  allergyText: string;
}

export interface CareSnapshotCondition {
  id: string;
  conditionText: string;
}

export interface CareSnapshotHistoryEntry {
  id: string;
  entryText: string;
}

export interface CareSnapshotMedication {
  id: string;
  medicationText: string;
}

export interface CareBackgroundSnapshot {
  id: string;
  episodeId: string;
  capturedAt: string;
  allergies: CareSnapshotAllergy[];
  conditions: CareSnapshotCondition[];
  historyEntries: CareSnapshotHistoryEntry[];
  medications: CareSnapshotMedication[];
}

export interface CareDiagnosis {
  id: string;
  episodeId: string;
  diagnosisText: string;
  kind: DiagnosisKind;
  recordedAt: string;
}

export interface CareTreatment {
  id: string;
  episodeId: string;
  kindCode: TreatmentKindCode | string;
  status: TreatmentStatus;
  startedAt: string | null;
  endedAt: string | null;
  notes: string;
}

export interface CareExam {
  id: string;
  episodeId: string;
  name: string;
  status: ExamStatus;
  resultText: string;
  requestedAt: string;
  completedAt: string | null;
}

export interface CareStatusEvent {
  id: number;
  episodeId: string;
  fromStatus: CareEpisodeStatus | null;
  toStatus: CareEpisodeStatus;
  actor: string | null;
  createdAt: string;
}

export interface CareEpisodeSummary {
  hasTriage: boolean;
  triageStarted: boolean;
  careStarted: boolean;
  treatmentStarted: boolean;
  hasDiagnoses: boolean;
  hasExams: boolean;
  hasCompletedExams: boolean;
  pendingExams: number;
  activeTreatments: number;
  hasElectrolytePanel: boolean;
  hasSalineSolution: boolean;
  hasAllergies: boolean;
  hasChronicCondition: boolean;
  hasMedicalHistory: boolean;
}

export interface CareEpisodeBundle {
  episode: CareEpisode;
  triage: CareTriage | null;
  background: CareBackgroundSnapshot | null;
  diagnoses: CareDiagnosis[];
  treatments: CareTreatment[];
  exams: CareExam[];
  summary: CareEpisodeSummary;
}

export interface PatientCareStatus {
  patientId: string;
  episodeId: string | null;
  episodeStatus: CareEpisodeStatus | null;
  source: CareEpisodeSource | null;
  summary: CareEpisodeSummary | null;
  isLegacyOnly: boolean;
  canStartNewEpisode: boolean;
}

export interface CreateCareEpisodeInput {
  patientId?: string | null;
  collectionCenterId?: string | null;
  status?: CareEpisodeStatus;
  /** Precarga antecedentes del último episodio cerrado (default: true). */
  carryOverFromLastEpisode?: boolean;
}
