import type { SelectOption } from '../components/SelectField';

export const PARENTESCO_OPTIONS: SelectOption[] = [
  { value: 'Madre', label: 'Madre' },
  { value: 'Padre', label: 'Padre' },
  { value: 'Abuelo/a', label: 'Abuelo/a' },
  { value: 'Tutor legal', label: 'Tutor legal' },
];

export const NIVEL_EDUCATIVO_OPTIONS: SelectOption[] = [
  { value: '', label: 'Seleccione...' },
  { value: 'Maternal', label: 'Maternal' },
  { value: 'Preescolar / Inicial', label: 'Preescolar / Inicial' },
  { value: 'Primaria', label: 'Primaria' },
  { value: 'Secundaria', label: 'Secundaria' },
];

export const SORT_OPTIONS: SelectOption[] = [
  { value: 'recent', label: 'Más recientes primero' },
  { value: 'alphabetical', label: 'Alfabético (A-Z)' },
  { value: 'age-asc', label: 'Edad (Menor a Mayor)' },
  { value: 'age-desc', label: 'Edad (Mayor a Menor)' },
];

export const FILTER_GENDER_OPTIONS: SelectOption[] = [
  { value: 'All', label: 'Todos' },
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Femenino', label: 'Femenino' },
  { value: 'Otro', label: 'Otro' },
];

export const FILTER_VACUNA_OPTIONS: SelectOption[] = [
  { value: 'All', label: 'Todos los esquemas' },
  { value: 'Completo', label: 'Esquema Completo' },
  { value: 'Incompleto', label: 'Esquema Incompleto' },
];

export const FILTER_GRUPO_ETARIO_OPTIONS: SelectOption[] = [
  { value: 'All', label: 'Todas' },
  { value: 'nino', label: 'Niño/a' },
  { value: 'adulto', label: 'Adulto' },
  { value: 'tercera_edad', label: 'Tercera edad' },
];

export const FILTER_AGE_RANGE_OPTIONS: SelectOption[] = [
  { value: 'All', label: 'Todos' },
  { value: 'Bebes', label: 'Bebés (0 - 2 años)' },
  { value: 'Preescolar', label: 'Preescolar (3 - 5 años)' },
  { value: 'Escolar', label: 'Escolar (6 - 12 años)' },
  { value: 'Adolescentes', label: 'Adolescentes (13+ años)' },
];

export const FILTER_SALUD_OPTIONS: SelectOption[] = [
  { value: 'All', label: 'Todos' },
  { value: 'AtencionEspecial', label: 'Alergias o crónicos' },
];

export const FILTER_REGISTRO_OPTIONS: SelectOption[] = [
  { value: 'All', label: 'Cualquier fecha' },
  { value: 'Hoy', label: 'Registrados hoy' },
  { value: 'Ultimos7', label: 'Últimos 7 días' },
];

export const FILTER_HISTORIA_OPTIONS: SelectOption[] = [
  { value: 'All', label: 'Todos' },
  { value: 'ConNotas', label: 'Con historia clínica' },
  { value: 'SinNotas', label: 'Sin notas clínicas' },
];

export const FILTER_EDAD_OPTIONS: SelectOption[] = [
  { value: 'All', label: 'Todos' },
  { value: 'SinEdad', label: 'Sin edad ni fecha' },
];

export const FILTER_ESCUELA_OPTIONS: SelectOption[] = [
  { value: 'All', label: 'Todos' },
  { value: 'Asiste', label: 'Asiste a escuela' },
  { value: 'NoAsiste', label: 'No asiste a escuela' },
];

export const ROLE_OPTIONS: SelectOption[] = [
  { value: 'personal_medico', label: 'Personal médico' },
  { value: 'registrador', label: 'Asistente' },
  { value: 'admin', label: 'Admin' },
];

export function centroFilterOptions(centers: { id: string; name: string }[]): SelectOption[] {
  return [
    { value: 'All', label: 'Todos' },
    { value: 'SinCentro', label: 'Sin centro asignado' },
    { value: 'AtencionMedico', label: 'Atención por médico' },
    ...centers.map((center) => ({ value: center.id, label: center.name })),
  ];
}
