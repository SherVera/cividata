/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NotaClinica {
  id: string;
  fecha: string;
  peso: number; // en kg
  estatura: number; // en cm
  motivo: string;
  diagnostico: string;
  tratamiento: string;
}

export interface Paciente {
  id: string;
  // 1. Datos Personales
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  edadAnios: number;
  edadMeses: number;
  genero: 'Masculino' | 'Femenino' | 'Otro';
  documentoIdentidad: string;
  nacionalidad: string;
  /** Ruta en Supabase Storage (bucket patient-photos). Opcional. */
  fotoPath: string | null;

  // 2. Información de Vivienda
  direccion: string;
  ciudadMunicipio: string;
  estadoProvincia: string;
  puntoReferencia: string;

  // 3. Representante Legal
  nombreRepresentante: string;
  parentesco: 'Madre' | 'Padre' | 'Abuelo/a' | 'Tutor legal';
  documentoRepresentante: string;
  ocupacion: string;
  telefonoPrincipal: string;
  telefonoEmergencias: string;
  correo: string;

  // 4. Salud y Nutrición
  estatura: number; // cm
  peso: number; // kg
  grupoSanguineo: string;
  tieneAlergias: boolean;
  alergiasEspecificas: string;
  tieneCondicionMedica: boolean;
  condicionMedicaEspecifica: string;
  tomaMedicamentos: boolean;
  medicamentosEspecificos: string;
  esquemaVacunacion: 'Completo' | 'Incompleto';

  // 5. Datos Educativos
  asisteEscuela: boolean;
  nivelEducativo: 'Maternal' | 'Preescolar / Inicial' | 'Primaria' | 'Secundaria' | '';
  gradoAnio: string;
  nombreInstitucion: string;

  // Notas e historial médico adicional
  notasClinicas: NotaClinica[];
  fechaRegistro: string;

  // Punto de captura / centro de acopio
  /** 'centro' = centro de salud o acopio; 'medico' = atención en calle u otro sitio sin centro */
  puntoRegistroTipo: 'centro' | 'medico';
  centroAcopioId: string;
  centroAcopioNombre: string;
  centroAcopioLat: number | null;
  centroAcopioLng: number | null;
  registroLat: number | null;
  registroLng: number | null;
  /** Device location of the user who saved the record (internal, not shown in UI). */
  registrantLat: number | null;
  registrantLng: number | null;
}

export interface CensoStats {
  totalPacientes: number;
  esquemaCompleto: number;
  esquemaIncompleto: number;
  asisteEscuelaCount: number;
  noAsisteEscuelaCount: number;
  generos: {
    masculino: number;
    femenino: number;
    otro: number;
  };
  rangosEdad: {
    bebes: number; // 0-2 años
    preescolar: number; // 3-5 años
    escolar: number; // 6-12 años
    adolescentes: number; // 13+ años
  };
}

export function puntoRegistroEtiqueta(
  p: Pick<Paciente, 'puntoRegistroTipo' | 'centroAcopioNombre'>
): string {
  if (p.puntoRegistroTipo === 'medico') return 'Atención por médico';
  return p.centroAcopioNombre;
}

/** Datos personales opcionales del personal médico / admin (user_metadata.staff_profile). */
export interface StaffProfile {
  first_name?: string;
  last_name?: string;
  id_document?: string;
  specialty?: string;
  workplace?: string;
  contact_phone?: string;
  address?: string;
  professional_license?: string;
}

export type StaffAuditAction =
  | 'create'
  | 'contact_update'
  | 'profile_update'
  | 'role_change'
  | 'password_reset'
  | 'enable'
  | 'disable';

export interface StaffAuditEntry {
  id: number;
  target_user_id: string;
  action: StaffAuditAction;
  actor: string | null;
  actor_email: string | null;
  actor_role: string | null;
  changes: Record<string, { before: unknown; after: unknown }>;
  created_at: string;
}
