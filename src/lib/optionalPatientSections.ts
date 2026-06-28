import { Paciente } from '../types';

export type OptionalSectionKey =
  | 'foto'
  | 'antropometria'
  | 'representante'
  | 'salud'
  | 'educacion';

export const OPTIONAL_SECTION_DEFAULTS: Record<OptionalSectionKey, boolean> = {
  foto: false,
  antropometria: false,
  representante: false,
  salud: false,
  educacion: false,
};

export function optionalSectionsFromPatient(p: Paciente): Record<OptionalSectionKey, boolean> {
  return {
    foto: !!p.fotoPath,
    antropometria: p.peso > 0 || p.estatura > 0,
    representante: !!(
      p.nombreRepresentante.trim() ||
      p.documentoRepresentante.trim() ||
      p.telefonoPrincipal.trim() ||
      p.telefonoEmergencias.trim() ||
      p.correo.trim() ||
      p.ocupacion.trim()
    ),
    salud: !!(
      p.tieneAlergias ||
      p.tieneCondicionMedica ||
      p.tomaMedicamentos ||
      p.alergiasEspecificas.trim() ||
      p.condicionMedicaEspecifica.trim() ||
      p.medicamentosEspecificos.trim() ||
      p.grupoSanguineo.trim()
    ),
    educacion: !!(
      p.asisteEscuela ||
      p.nivelEducativo ||
      p.gradoAnio.trim() ||
      p.nombreInstitucion.trim()
    ),
  };
}
