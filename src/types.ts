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
