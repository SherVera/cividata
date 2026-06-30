import { describe, expect, it } from 'vitest';
import {
  edadPacienteTexto,
  grupoEtarioFromAge,
  grupoEtarioLabel,
  normalizeGrupoEtario,
  pacienteTieneEdad,
  resolveGrupoEtario,
  pacienteRequiereRepresentante,
  tituloHistoriaClinica,
  tituloDatosPersonales,
} from './types';

describe('grupoEtarioFromAge', () => {
  it('aplica umbrales pediátrico, adulto y tercera edad', () => {
    expect(grupoEtarioFromAge(0)).toBe('nino');
    expect(grupoEtarioFromAge(17)).toBe('nino');
    expect(grupoEtarioFromAge(18)).toBe('adulto');
    expect(grupoEtarioFromAge(59)).toBe('adulto');
    expect(grupoEtarioFromAge(60)).toBe('tercera_edad');
  });
});

describe('pacienteTieneEdad', () => {
  it('detecta fecha, años o meses tentativos', () => {
    expect(pacienteTieneEdad({ fechaNacimiento: '2020-01-01', edadAnios: 0, edadMeses: 0 })).toBe(true);
    expect(pacienteTieneEdad({ fechaNacimiento: '', edadAnios: 3, edadMeses: 0 })).toBe(true);
    expect(pacienteTieneEdad({ fechaNacimiento: '', edadAnios: 0, edadMeses: 4 })).toBe(true);
    expect(pacienteTieneEdad({ fechaNacimiento: '', edadAnios: 0, edadMeses: 0 })).toBe(false);
  });
});

describe('resolveGrupoEtario', () => {
  it('prioriza cálculo automático cuando hay edad', () => {
    expect(
      resolveGrupoEtario({
        fechaNacimiento: '',
        edadAnios: 30,
        edadMeses: 0,
        grupoEtario: 'nino',
      })
    ).toBe('adulto');
  });

  it('conserva clasificación manual sin edad', () => {
    expect(
      resolveGrupoEtario({
        fechaNacimiento: '',
        edadAnios: 0,
        edadMeses: 0,
        grupoEtario: 'nino',
      })
    ).toBe('nino');
  });
});

describe('normalizeGrupoEtario', () => {
  it('acepta solo valores del catálogo', () => {
    expect(normalizeGrupoEtario('nino')).toBe('nino');
    expect(normalizeGrupoEtario('invalido')).toBeNull();
    expect(normalizeGrupoEtario(null)).toBeNull();
  });
});

describe('grupoEtarioLabel', () => {
  it('etiqueta valores conocidos y ausentes', () => {
    expect(grupoEtarioLabel('nino')).toBe('Niño/a');
    expect(grupoEtarioLabel(null)).toBe('Sin clasificar');
  });
});

describe('tituloHistoriaClinica', () => {
  it('adapta el encabezado a la clasificación etaria', () => {
    expect(
      tituloHistoriaClinica({
        fechaNacimiento: '',
        edadAnios: 40,
        edadMeses: 0,
        grupoEtario: null,
      })
    ).toBe('Historia clínica · Adulto');
    expect(
      tituloDatosPersonales({
        fechaNacimiento: '',
        edadAnios: 5,
        edadMeses: 0,
        grupoEtario: null,
      })
    ).toBe('1. Datos personales (Niño/a)');
  });
});

describe('pacienteRequiereRepresentante', () => {
  it('solo aplica a niños/as', () => {
    expect(
      pacienteRequiereRepresentante({
        fechaNacimiento: '',
        edadAnios: 8,
        edadMeses: 0,
        grupoEtario: null,
      })
    ).toBe(true);
    expect(
      pacienteRequiereRepresentante({
        fechaNacimiento: '',
        edadAnios: 25,
        edadMeses: 0,
        grupoEtario: null,
      })
    ).toBe(false);
    expect(
      pacienteRequiereRepresentante({
        fechaNacimiento: '',
        edadAnios: 0,
        edadMeses: 0,
        grupoEtario: 'adulto',
      })
    ).toBe(false);
    expect(
      pacienteRequiereRepresentante({
        fechaNacimiento: '',
        edadAnios: 0,
        edadMeses: 0,
        grupoEtario: 'nino',
      })
    ).toBe(true);
  });
});

describe('edadPacienteTexto', () => {
  it('distingue edad exacta, tentativa y sin registrar', () => {
    expect(
      edadPacienteTexto({ fechaNacimiento: '2020-01-01', edadAnios: 6, edadMeses: 2 })
    ).toBe('6 años');
    expect(
      edadPacienteTexto({ fechaNacimiento: '2024-01-01', edadAnios: 0, edadMeses: 8 })
    ).toBe('8 meses');
    expect(
      edadPacienteTexto({ fechaNacimiento: '', edadAnios: 4, edadMeses: 3 })
    ).toBe('~4 años (aprox.)');
    expect(
      edadPacienteTexto({ fechaNacimiento: '', edadAnios: 0, edadMeses: 6 })
    ).toBe('~6 meses (aprox.)');
    expect(edadPacienteTexto({ fechaNacimiento: '', edadAnios: 0, edadMeses: 0 })).toBe(
      'Sin registrar'
    );
  });
});
