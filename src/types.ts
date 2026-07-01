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
  /** Clasificación etaria: manual sin edad; calculada desde edad cuando hay fecha o tentativa. */
  grupoEtario: GrupoEtario | null;

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
  /** UUID del usuario que registró la captura (auditoría interna). */
  registradoPorId: string | null;

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
  gruposEtarios: {
    nino: number;
    adulto: number;
    tercera_edad: number;
  };
  rangosEdad: {
    bebes: number; // 0-2 años
    preescolar: number; // 3-5 años
    escolar: number; // 6-12 años
    adolescentes: number; // 13+ años
  };
  /** Pacientes sin fecha ni edad tentativa. */
  sinEdad: number;
}

export function puntoRegistroEtiqueta(
  p: Pick<Paciente, 'puntoRegistroTipo' | 'centroAcopioNombre'>
): string {
  if (p.puntoRegistroTipo === 'medico') return 'Atención por médico';
  return p.centroAcopioNombre;
}

export type GrupoEtario = 'nino' | 'adulto' | 'tercera_edad';

export const GRUPOS_ETARIOS: GrupoEtario[] = ['nino', 'adulto', 'tercera_edad'];

export function grupoEtarioLabel(grupo: GrupoEtario | null | undefined): string {
  if (!grupo) return 'Sin clasificar';
  if (grupo === 'nino') return 'Niño/a';
  if (grupo === 'adulto') return 'Adulto';
  return 'Tercera edad';
}

/** Encabezado de ficha según clasificación etaria (no asume pediátrico). */
export function tituloHistoriaClinica(
  p: Pick<Paciente, 'fechaNacimiento' | 'edadAnios' | 'edadMeses' | 'grupoEtario'>
): string {
  const grupo = resolveGrupoEtario(p);
  if (!grupo) return 'Historia clínica';
  return `Historia clínica · ${grupoEtarioLabel(grupo)}`;
}

/** Sección de identidad en ficha/detalle según clasificación. */
export function tituloDatosPersonales(
  p: Pick<Paciente, 'fechaNacimiento' | 'edadAnios' | 'edadMeses' | 'grupoEtario'>
): string {
  const grupo = resolveGrupoEtario(p);
  if (!grupo) return '1. Datos personales del paciente';
  return `1. Datos personales (${grupoEtarioLabel(grupo)})`;
}

/** Umbrales: <18 niño/a, <60 adulto, 60+ tercera edad. */
export function grupoEtarioFromAge(years: number): GrupoEtario {
  if (years < 18) return 'nino';
  if (years < 60) return 'adulto';
  return 'tercera_edad';
}

export function normalizeGrupoEtario(value: unknown): GrupoEtario | null {
  if (value === 'nino' || value === 'adulto' || value === 'tercera_edad') return value;
  return null;
}

export function edadPacienteTexto(
  p: Pick<Paciente, 'fechaNacimiento' | 'edadAnios' | 'edadMeses'>
): string {
  const yearsLabel = (years: number) => `${years} ${years === 1 ? 'año' : 'años'}`;
  const monthsLabel = (months: number) => `${months} ${months === 1 ? 'mes' : 'meses'}`;

  if (p.fechaNacimiento) {
    if (p.edadAnios === 0) return monthsLabel(p.edadMeses);
    return yearsLabel(p.edadAnios);
  }
  if (p.edadAnios > 0) {
    return `~${yearsLabel(p.edadAnios)} (aprox.)`;
  }
  if (p.edadMeses > 0) {
    return `~${monthsLabel(p.edadMeses)} (aprox.)`;
  }
  return 'Sin registrar';
}

export function pacienteTieneEdad(p: Pick<Paciente, 'fechaNacimiento' | 'edadAnios' | 'edadMeses'>): boolean {
  return !!p.fechaNacimiento || p.edadAnios > 0 || p.edadMeses > 0;
}

/** Clasificación efectiva: calculada con edad conocida; manual en caso contrario. */
export function resolveGrupoEtario(
  p: Pick<Paciente, 'fechaNacimiento' | 'edadAnios' | 'edadMeses' | 'grupoEtario'>
): GrupoEtario | null {
  if (pacienteTieneEdad(p)) return grupoEtarioFromAge(p.edadAnios);
  return p.grupoEtario ?? null;
}

/** Solo niños/as llevan representante legal (padre, madre o tutor). */
export function pacienteRequiereRepresentante(
  p: Pick<Paciente, 'fechaNacimiento' | 'edadAnios' | 'edadMeses' | 'grupoEtario'>
): boolean {
  return resolveGrupoEtario(p) === 'nino';
}

export const EMPTY_GUARDIAN_FIELDS: Pick<
  Paciente,
  | 'nombreRepresentante'
  | 'parentesco'
  | 'documentoRepresentante'
  | 'ocupacion'
  | 'telefonoPrincipal'
  | 'telefonoEmergencias'
  | 'correo'
> = {
  nombreRepresentante: '',
  parentesco: 'Madre',
  documentoRepresentante: '',
  ocupacion: '',
  telefonoPrincipal: '',
  telefonoEmergencias: '',
  correo: '',
};

/** Datos personales opcionales del personal médico / admin (user_metadata.staff_profile). */
export interface StaffProfile {
  first_name?: string;
  last_name?: string;
  id_document?: string;
  specialty?: string;
  workplace?: string;
  contact_phone?: string;
  contact_email?: string;
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

export type StaffSignupStatus = 'pending' | 'approved' | 'rejected';

export interface StaffSignupRequest {
  id: string;
  first_name: string;
  last_name: string;
  contact_phone: string;
  contact_email: string;
  specialty: string;
  workplace: string;
  requested_role?: 'personal_medico' | 'registrador';
  status: StaffSignupStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_user_id?: string | null;
}
