import { describe, expect, it } from 'vitest';
import { buildPatientListCsv, exportDocumentTitle, patientListRow, sanitizeExportSlug } from './documentExport';
import { createEmptyPatient } from './patientDefaults';
import { PATIENT_FILE_LABEL } from '../brand';

describe('documentExport', () => {
  it('sanitiza nombres de archivo', () => {
    expect(sanitizeExportSlug('García López')).toBe('Garcia_Lopez');
    expect(sanitizeExportSlug('  ')).toBe('');
  });

  it('genera filas de listado', () => {
    const p = createEmptyPatient();
    p.nombres = 'Ana';
    p.apellidos = 'Pérez';
    p.esquemaVacunacion = 'Completo';
    p.fechaRegistro = '2026-06-30';

    const row = patientListRow(p);
    expect(row[0]).toBe('Ana');
    expect(row[1]).toBe('Pérez');
    expect(row).toHaveLength(8);
  });

  it('escapa comillas en CSV', () => {
    const p = createEmptyPatient();
    p.nombres = 'Niño "especial"';
    p.apellidos = 'Test';
    const csv = buildPatientListCsv([p]);
    expect(csv).toContain('"Niño ""especial"""');
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('titulo de exportación según nivel', () => {
    const p = createEmptyPatient();
    p.grupoEtario = 'nino';
    expect(exportDocumentTitle(p, 'asistente')).toBe(PATIENT_FILE_LABEL);
    expect(exportDocumentTitle(p, 'clinico')).toContain('Historia clínica');
    expect(exportDocumentTitle(p, 'admin')).toContain('auditoría');
  });
});
