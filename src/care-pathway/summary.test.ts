import { describe, expect, it } from 'vitest';
import { buildCareEpisodeSummary, classifyTreatmentKind } from './summary';
import type { CareEpisode } from './types';

const baseEpisode = (status: CareEpisode['status']): CareEpisode => ({
  id: 'ep-1',
  patientId: 'p-1',
  previousEpisodeId: null,
  status,
  collectionCenterId: null,
  source: 'live',
  startedAt: '2026-01-01T00:00:00Z',
  closedAt: null,
  createdBy: null,
});

describe('classifyTreatmentKind', () => {
  it('detects electrolyte panel and saline solution', () => {
    expect(classifyTreatmentKind('Panel de electrolitos')).toBe('electrolyte_panel');
    expect(classifyTreatmentKind('Solución salina 0.9%')).toBe('saline_solution');
    expect(classifyTreatmentKind('Hidratación oral')).toBe('hydration');
  });
});

describe('buildCareEpisodeSummary', () => {
  it('marks triage and treatment flags', () => {
    const summary = buildCareEpisodeSummary({
      episode: baseEpisode('in_treatment'),
      triage: {
        id: 't1',
        episodeId: 'ep-1',
        status: 'completed',
        weightKg: 12,
        heightCm: 90,
        chiefComplaint: 'Fiebre',
        urgencyClass: 'yellow',
        completedAt: '2026-01-01T01:00:00Z',
      },
      background: {
        id: 's1',
        episodeId: 'ep-1',
        capturedAt: '2026-01-01T01:00:00Z',
        allergies: [{ id: 'a1', allergyText: 'Penicilina' }],
        conditions: [{ id: 'c1', conditionText: 'Asma' }],
        historyEntries: [{ id: 'h1', entryText: 'Hospitalización 2024' }],
        medications: [],
      },
      diagnoses: [
        {
          id: 'd1',
          episodeId: 'ep-1',
          diagnosisText: 'Gastroenteritis',
          kind: 'primary',
          recordedAt: '2026-01-01T02:00:00Z',
        },
      ],
      treatments: [
        {
          id: 'tr1',
          episodeId: 'ep-1',
          kindCode: 'electrolyte_panel',
          status: 'active',
          startedAt: '2026-01-01T02:00:00Z',
          endedAt: null,
          notes: 'Panel solicitado',
        },
      ],
      exams: [
        {
          id: 'e1',
          episodeId: 'ep-1',
          name: 'Hemograma',
          status: 'completed',
          resultText: 'Normal',
          requestedAt: '2026-01-01T02:00:00Z',
          completedAt: '2026-01-01T03:00:00Z',
        },
      ],
    });

    expect(summary.hasTriage).toBe(true);
    expect(summary.careStarted).toBe(true);
    expect(summary.treatmentStarted).toBe(true);
    expect(summary.hasDiagnoses).toBe(true);
    expect(summary.hasCompletedExams).toBe(true);
    expect(summary.hasElectrolytePanel).toBe(true);
    expect(summary.hasAllergies).toBe(true);
    expect(summary.hasChronicCondition).toBe(true);
    expect(summary.hasMedicalHistory).toBe(true);
  });

  it('reports empty episode without clinical data', () => {
    const summary = buildCareEpisodeSummary({
      episode: baseEpisode('registered'),
    });
    expect(summary.hasTriage).toBe(false);
    expect(summary.treatmentStarted).toBe(false);
  });
});
