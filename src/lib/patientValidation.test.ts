import { describe, expect, it } from 'vitest';
import type { GrupoEtario } from '../types';
import {
  parseFormNumber,
  resolveAgeGroupForSave,
  validateClinicalNote,
  validatePatientForm,
  validatePatientSection1,
} from './patientValidation';

const basePatient = {
  nombres: '',
  apellidos: '',
  documentoIdentidad: '',
  fechaNacimiento: '',
  edadAnios: 0,
  edadMeses: 0,
  grupoEtario: null as GrupoEtario | null,
};

describe('validatePatientSection1', () => {
  it('no marca error de identidad con nombre, apellido o documento', () => {
    expect(validatePatientSection1({ ...basePatient, nombres: 'Ana' }).nombres).toBeUndefined();
    expect(validatePatientSection1({ ...basePatient, apellidos: 'Pérez' }).nombres).toBeUndefined();
    expect(validatePatientSection1({ ...basePatient, documentoIdentidad: 'V-123' }).nombres).toBeUndefined();
  });

  it('rechaza registro sin ningún dato de identidad', () => {
    const errors = validatePatientSection1(basePatient);
    expect(errors.nombres).toBeTruthy();
  });

  it('exige clasificación manual cuando no hay edad', () => {
    const errors = validatePatientSection1({ ...basePatient, nombres: 'Luis' });
    expect(errors.grupoEtario).toBeTruthy();
  });

  it('acepta clasificación manual sin fecha ni edad tentativa', () => {
    const errors = validatePatientSection1({
      ...basePatient,
      nombres: 'Luis',
      grupoEtario: 'adulto',
    });
    expect(errors).toEqual({});
  });

  it('no exige clasificación manual con fecha de nacimiento', () => {
    const errors = validatePatientSection1({
      ...basePatient,
      nombres: 'Ana',
      fechaNacimiento: '2020-05-10',
      edadAnios: 5,
    });
    expect(errors).toEqual({});
  });

  it('no exige clasificación manual con edad tentativa solo en meses', () => {
    const errors = validatePatientSection1({
      ...basePatient,
      apellidos: 'Gómez',
      edadMeses: 6,
    });
    expect(errors).toEqual({});
  });
});

describe('validatePatientForm', () => {
  it('marca la sección 1 como primera inválida', () => {
    const result = validatePatientForm(basePatient);
    expect(result.ok).toBe(false);
    expect(result.firstInvalidSection).toBe(1);
    expect(result.errors.nombres).toBeTruthy();
  });

  it('aprueba un registro mínimo válido', () => {
    const result = validatePatientForm({
      ...basePatient,
      nombres: 'María',
      fechaNacimiento: '2018-01-01',
      edadAnios: 7,
    });
    expect(result).toEqual({ ok: true, errors: {}, firstInvalidSection: 0 });
  });
});

describe('resolveAgeGroupForSave', () => {
  it('calcula grupo desde edad conocida', () => {
    expect(
      resolveAgeGroupForSave({
        fechaNacimiento: '2015-01-01',
        edadAnios: 10,
        edadMeses: 0,
        grupoEtario: 'adulto',
      })
    ).toBe('nino');
  });

  it('usa clasificación manual sin edad', () => {
    expect(
      resolveAgeGroupForSave({
        fechaNacimiento: '',
        edadAnios: 0,
        edadMeses: 0,
        grupoEtario: 'tercera_edad',
      })
    ).toBe('tercera_edad');
  });

  it('persiste null sin edad ni clasificación manual', () => {
    expect(
      resolveAgeGroupForSave({
        fechaNacimiento: '',
        edadAnios: 0,
        edadMeses: 0,
        grupoEtario: null,
      })
    ).toBeNull();
  });

  it('clasifica adulto y tercera edad por umbrales', () => {
    expect(
      resolveAgeGroupForSave({
        fechaNacimiento: '',
        edadAnios: 25,
        edadMeses: 0,
        grupoEtario: null,
      })
    ).toBe('adulto');
    expect(
      resolveAgeGroupForSave({
        fechaNacimiento: '',
        edadAnios: 65,
        edadMeses: 0,
        grupoEtario: null,
      })
    ).toBe('tercera_edad');
  });
});

describe('validateClinicalNote', () => {
  const validNote = {
    fecha: '2026-06-28',
    peso: 12.5,
    estatura: 95,
    motivo: 'Control',
    diagnostico: 'Sano',
    tratamiento: 'Hidratación',
  };

  it('acepta nota completa con medidas positivas', () => {
    expect(validateClinicalNote(validNote)).toBeNull();
  });

  it('rechaza campos de texto vacíos', () => {
    expect(validateClinicalNote({ ...validNote, motivo: '  ' })).toBeTruthy();
    expect(validateClinicalNote({ ...validNote, diagnostico: '' })).toBeTruthy();
    expect(validateClinicalNote({ ...validNote, tratamiento: '' })).toBeTruthy();
  });

  it('rechaza peso o estatura inválidos', () => {
    expect(validateClinicalNote({ ...validNote, peso: 0 })).toBeTruthy();
    expect(validateClinicalNote({ ...validNote, estatura: -3 })).toBeTruthy();
    expect(validateClinicalNote({ ...validNote, peso: Number.NaN })).toBeTruthy();
    expect(validateClinicalNote({ ...validNote, estatura: Number.NaN })).toBeTruthy();
  });
});

describe('parseFormNumber', () => {
  it('convierte vacío a cero sin NaN', () => {
    expect(parseFormNumber('')).toBe(0);
  });

  it('parsea decimales válidos', () => {
    expect(parseFormNumber('12.5')).toBe(12.5);
  });

  it('devuelve cero ante texto no numérico', () => {
    expect(parseFormNumber('abc')).toBe(0);
  });
});
