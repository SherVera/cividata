import {
  GrupoEtario,
  NotaClinica,
  Paciente,
  grupoEtarioFromAge,
  pacienteTieneEdad,
} from '../types';

export type PatientFormErrors = Record<string, string>;

export type PatientIdentityInput = Pick<
  Paciente,
  | 'nombres'
  | 'apellidos'
  | 'documentoIdentidad'
  | 'fechaNacimiento'
  | 'edadAnios'
  | 'edadMeses'
  | 'grupoEtario'
>;

export type ClinicalNoteInput = Pick<
  NotaClinica,
  'fecha' | 'peso' | 'estatura' | 'motivo' | 'diagnostico' | 'tratamiento'
>;

/** Valida identidad mínima y clasificación etaria del paso 1 del formulario. */
export function validatePatientSection1(data: PatientIdentityInput): PatientFormErrors {
  const errors: PatientFormErrors = {};

  const hasIdentity =
    data.nombres.trim() || data.apellidos.trim() || data.documentoIdentidad.trim();
  if (!hasIdentity) {
    errors.nombres = 'Indique al menos nombre, apellido o documento del paciente';
  }
  if (!pacienteTieneEdad(data) && !data.grupoEtario) {
    errors.grupoEtario = 'Seleccione la clasificación etaria manualmente';
  }

  return errors;
}

export const FORM_SECTION_COUNT = 4;

/** Valida todas las secciones antes de guardar (solo la sección 1 tiene reglas hoy). */
export function validatePatientForm(data: PatientIdentityInput): {
  ok: boolean;
  errors: PatientFormErrors;
  firstInvalidSection: number;
} {
  for (let section = 1; section <= FORM_SECTION_COUNT; section++) {
    if (section === 1) {
      const errors = validatePatientSection1(data);
      if (Object.keys(errors).length > 0) {
        return { ok: false, errors, firstInvalidSection: 1 };
      }
    }
  }
  return { ok: true, errors: {}, firstInvalidSection: 0 };
}

/** Clasificación etaria que se persiste: automática con edad; manual sin edad. */
export function resolveAgeGroupForSave(
  p: Pick<Paciente, 'fechaNacimiento' | 'edadAnios' | 'edadMeses' | 'grupoEtario'>
): GrupoEtario | null {
  if (pacienteTieneEdad(p)) return grupoEtarioFromAge(p.edadAnios);
  return p.grupoEtario ?? null;
}

/** Valida una nota clínica antes de agregarla al historial. */
export function validateClinicalNote(note: ClinicalNoteInput): string | null {
  if (!note.motivo.trim() || !note.diagnostico.trim() || !note.tratamiento.trim()) {
    return 'Por favor complete todos los campos de la consulta.';
  }
  const peso = Number(note.peso);
  const estatura = Number(note.estatura);
  if (!Number.isFinite(peso) || !Number.isFinite(estatura) || peso <= 0 || estatura <= 0) {
    return 'El peso y la estatura deben ser mayores a 0.';
  }
  return null;
}

/** Parsea números de inputs HTML sin producir NaN. */
export function parseFormNumber(value: string): number {
  if (value === '') return 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
