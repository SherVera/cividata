import type { CareEpisode, CareEpisodeStatus } from './types';

export const VALID_TRANSITIONS: Record<CareEpisodeStatus, CareEpisodeStatus[]> = {
  registered: ['triage_in_progress', 'triage_completed', 'cancelled'],
  triage_in_progress: ['triage_completed', 'cancelled'],
  triage_completed: ['waiting', 'care_started', 'cancelled'],
  waiting: ['care_started', 'cancelled'],
  care_started: ['exams_pending', 'in_treatment', 'discharged', 'referred'],
  exams_pending: ['exams_completed', 'in_treatment', 'cancelled'],
  exams_completed: ['in_treatment', 'discharged'],
  in_treatment: ['discharged', 'referred', 'exams_pending'],
  discharged: [],
  referred: [],
  cancelled: [],
};

export const TERMINAL_STATUSES: CareEpisodeStatus[] = ['discharged', 'referred', 'cancelled'];

export function canTransition(from: CareEpisodeStatus, to: CareEpisodeStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function isTerminalStatus(status: CareEpisodeStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function statusImpliesTriageDone(status: CareEpisodeStatus): boolean {
  if (status === 'registered' || status === 'triage_in_progress' || status === 'cancelled') {
    return false;
  }
  return true;
}

export function statusImpliesCareStarted(status: CareEpisodeStatus): boolean {
  return [
    'care_started',
    'exams_pending',
    'exams_completed',
    'in_treatment',
    'discharged',
    'referred',
  ].includes(status);
}

export function statusImpliesInTreatment(status: CareEpisodeStatus): boolean {
  return ['in_treatment', 'discharged', 'referred'].includes(status);
}

export function canCreateCareEpisode(episodes: CareEpisode[]): boolean {
  return !episodes.some((episode) => !isTerminalStatus(episode.status));
}

export function getLatestClosedEpisode(episodes: CareEpisode[]): CareEpisode | null {
  const closed = episodes.filter((episode) => isTerminalStatus(episode.status));
  if (closed.length === 0) return null;
  return closed.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}
