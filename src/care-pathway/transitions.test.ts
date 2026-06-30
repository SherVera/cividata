import { describe, expect, it } from 'vitest';
import {
  canCreateCareEpisode,
  canTransition,
  getLatestClosedEpisode,
  isTerminalStatus,
  statusImpliesCareStarted,
  statusImpliesTriageDone,
  VALID_TRANSITIONS,
} from './transitions';
import type { CareEpisode } from './types';

const episode = (status: CareEpisode['status'], startedAt: string): CareEpisode => ({
  id: `ep-${startedAt}`,
  patientId: 'p-1',
  previousEpisodeId: null,
  status,
  collectionCenterId: null,
  source: 'live',
  startedAt,
  closedAt: null,
  createdBy: null,
});

describe('care pathway transitions', () => {
  it('allows registrador flow through triage', () => {
    expect(canTransition('registered', 'triage_in_progress')).toBe(true);
    expect(canTransition('triage_in_progress', 'triage_completed')).toBe(true);
    expect(canTransition('registered', 'care_started')).toBe(false);
  });

  it('allows medical flow after triage', () => {
    expect(canTransition('triage_completed', 'care_started')).toBe(true);
    expect(canTransition('care_started', 'exams_pending')).toBe(true);
    expect(canTransition('care_started', 'in_treatment')).toBe(true);
    expect(canTransition('exams_pending', 'exams_completed')).toBe(true);
  });

  it('blocks transitions from terminal states', () => {
    for (const terminal of ['discharged', 'referred', 'cancelled'] as const) {
      expect(isTerminalStatus(terminal)).toBe(true);
      expect(VALID_TRANSITIONS[terminal]).toEqual([]);
    }
  });

  it('derives triage and care flags from status', () => {
    expect(statusImpliesTriageDone('triage_completed')).toBe(true);
    expect(statusImpliesTriageDone('registered')).toBe(false);
    expect(statusImpliesCareStarted('care_started')).toBe(true);
    expect(statusImpliesCareStarted('triage_completed')).toBe(false);
  });

  it('allows a new episode only when the previous one is closed', () => {
    const episodes = [
      episode('discharged', '2026-01-01T00:00:00Z'),
      episode('in_treatment', '2026-01-02T00:00:00Z'),
    ];
    expect(canCreateCareEpisode(episodes)).toBe(false);

    const closedOnly = [episode('discharged', '2026-01-01T00:00:00Z')];
    expect(canCreateCareEpisode(closedOnly)).toBe(true);
    expect(getLatestClosedEpisode(closedOnly)?.id).toBe('ep-2026-01-01T00:00:00Z');
  });
});
