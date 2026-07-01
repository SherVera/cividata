import { describe, expect, it } from 'vitest';
import { createEmptyPatient } from './patientDefaults';
import {
  applyVoiceDraft,
  matchCenterByName,
  normalizeGenero,
  normalizeGrupoEtarioVoice,
  normalizeParentesco,
  parseVoicePatientDraftResponse,
} from './voicePatientDraft';
import type { CollectionCenter } from './collectionCentersApi';

const centers: CollectionCenter[] = [
  {
    id: 'c1',
    name: 'Centro Salud Chacao',
    address: 'Av. Principal',
    geo_lat: 10.5,
    geo_lng: -66.8,
    active: true,
    facility_type: 'acopio',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    name: 'Ambulatorio Petare',
    address: '',
    geo_lat: 10.48,
    geo_lng: -66.82,
    active: true,
    facility_type: 'acopio',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c3',
    name: 'Centro Médico Este',
    address: '',
    geo_lat: 10.49,
    geo_lng: -66.81,
    active: true,
    facility_type: 'acopio',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('voice normalizers', () => {
  it('mapea género y parentesco desde sinónimos', () => {
    expect(normalizeGenero('niña')).toBe('Femenino');
    expect(normalizeParentesco('mamá')).toBe('Madre');
    expect(normalizeGrupoEtarioVoice('tercera edad')).toBe('tercera_edad');
  });
});

describe('matchCenterByName', () => {
  it('encuentra centro por coincidencia parcial única', () => {
    expect(matchCenterByName(centers, 'Chacao')?.id).toBe('c1');
  });

  it('no asigna si hay varias coincidencias', () => {
    expect(matchCenterByName(centers, 'Centro')).toBeNull();
  });
});

describe('applyVoiceDraft', () => {
  it('rellena identidad y edad desde borrador de voz', () => {
    const current = createEmptyPatient();
    const result = applyVoiceDraft(current, {
      fields: {
        nombres: { value: 'María', confidence: 'high' },
        apellidos: { value: 'García', confidence: 'high' },
        edadAnios: { value: 5, confidence: 'high' },
        genero: { value: 'Femenino', confidence: 'high' },
        nombreRepresentante: { value: 'Ana López', confidence: 'high' },
        parentesco: { value: 'Madre', confidence: 'high' },
      },
    }, centers);

    expect(result.patch.nombres).toBe('María');
    expect(result.patch.edadAnios).toBe(5);
    expect(result.patch.genero).toBe('Femenino');
    expect(result.sections.representante).toBe(true);
    expect(result.missingRequired).toHaveLength(0);
  });

  it('marca obligatorios faltantes sin inventar valores', () => {
    const current = createEmptyPatient();
    const result = applyVoiceDraft(current, {
      fields: {
        genero: { value: 'Masculino', confidence: 'high' },
      },
    }, centers);

    expect(result.patch.genero).toBe('Masculino');
    expect(result.patch.nombres).toBeUndefined();
    expect(result.missingRequired.some((item) => item.key === 'nombres')).toBe(true);
    expect(result.missingRequired.some((item) => item.key === 'grupoEtario')).toBe(true);
  });
});

describe('parseVoicePatientDraftResponse', () => {
  it('ignora campos desconocidos y normaliza confidence', () => {
    const draft = parseVoicePatientDraftResponse({
      fields: {
        nombres: { value: 'Luis', confidence: 'high' },
        foo: { value: 'bar', confidence: 'weird' },
      },
    });
    expect(draft.fields.nombres?.value).toBe('Luis');
    expect((draft.fields as Record<string, unknown>).foo).toBeUndefined();
  });
});
