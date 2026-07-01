import { Paciente } from '../types';
import { DEFAULT_MAP_CENTER } from './geo';

/** Campos que se reutilizan al pulsar «Guardar y agregar otro» (solo en memoria, no en localStorage). */
export type PatientCarryOver = Pick<
  Paciente,
  | 'ciudadMunicipio'
  | 'estadoProvincia'
  | 'puntoRegistroTipo'
  | 'centroAcopioId'
  | 'centroAcopioNombre'
  | 'centroAcopioLat'
  | 'centroAcopioLng'
  | 'registroLat'
  | 'registroLng'
>;

const BASE_DEFAULTS: Omit<Paciente, 'id' | 'fechaRegistro' | 'notasClinicas'> = {
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
  edadAnios: 0,
  edadMeses: 0,
  genero: 'Masculino',
  documentoIdentidad: '',
  nacionalidad: 'Venezolana',
  fotoPath: null,
  grupoEtario: null,
  direccion: '',
  ciudadMunicipio: '',
  estadoProvincia: '',
  puntoReferencia: '',
  nombreRepresentante: '',
  parentesco: 'Madre',
  documentoRepresentante: '',
  ocupacion: '',
  telefonoPrincipal: '',
  telefonoEmergencias: '',
  correo: '',
  estatura: 0,
  peso: 0,
  grupoSanguineo: '',
  tieneAlergias: false,
  alergiasEspecificas: '',
  tieneCondicionMedica: false,
  condicionMedicaEspecifica: '',
  tomaMedicamentos: false,
  medicamentosEspecificos: '',
  esquemaVacunacion: 'Completo',
  asisteEscuela: false,
  nivelEducativo: '',
  gradoAnio: '',
  nombreInstitucion: '',
  centroAcopioId: '',
  centroAcopioNombre: '',
  puntoRegistroTipo: 'centro',
  centroAcopioLat: null,
  centroAcopioLng: null,
  registroLat: DEFAULT_MAP_CENTER.lat,
  registroLng: DEFAULT_MAP_CENTER.lng,
  registrantLat: null,
  registrantLng: null,
  registradoPorId: null,
};

export function createEmptyPatient(carryOver?: Partial<PatientCarryOver>): Paciente {
  return {
    ...BASE_DEFAULTS,
    ...carryOver,
    id: 'pac-' + Math.random().toString(36).slice(2, 11),
    fechaRegistro: new Date().toISOString().split('T')[0],
    notasClinicas: [],
    registroLat: carryOver?.registroLat ?? BASE_DEFAULTS.registroLat,
    registroLng: carryOver?.registroLng ?? BASE_DEFAULTS.registroLng,
    puntoRegistroTipo: carryOver?.puntoRegistroTipo ?? BASE_DEFAULTS.puntoRegistroTipo,
  };
}

export function extractPatientCarryOver(p: Paciente): PatientCarryOver {
  return {
    ciudadMunicipio: p.ciudadMunicipio,
    estadoProvincia: p.estadoProvincia,
    puntoRegistroTipo: p.puntoRegistroTipo,
    centroAcopioId: p.centroAcopioId,
    centroAcopioNombre: p.centroAcopioNombre,
    centroAcopioLat: p.centroAcopioLat,
    centroAcopioLng: p.centroAcopioLng,
    registroLat: p.registroLat,
    registroLng: p.registroLng,
  };
}

export function patientDisplayName(
  p: Pick<Paciente, 'nombres' | 'apellidos' | 'documentoIdentidad'>
): string {
  const name = [p.nombres, p.apellidos].filter(Boolean).join(' ').trim();
  return name || p.documentoIdentidad.trim() || 'paciente';
}
