export type PatientListFilters = {
  searchQuery: string;
  filterGender: string;
  filterVacuna: string;
  filterAgeRange: string;
  filterGrupoEtario: string;
  filterCentro: string;
  filterSalud: string;
  filterRegistro: string;
  filterHistoria: string;
  filterEdad: string;
  filterEscuela: string;
};

export const DEFAULT_PATIENT_LIST_FILTERS: PatientListFilters = {
  searchQuery: '',
  filterGender: 'All',
  filterVacuna: 'All',
  filterAgeRange: 'All',
  filterGrupoEtario: 'All',
  filterCentro: 'All',
  filterSalud: 'All',
  filterRegistro: 'All',
  filterHistoria: 'All',
  filterEdad: 'All',
  filterEscuela: 'All',
};

export type AdminUserRoleFilter =
  | 'all'
  | 'personal_medico'
  | 'registrador'
  | 'admin'
  | 'disabled';

export type MetricDrillDown =
  | { target: 'listado'; filters?: Partial<PatientListFilters> }
  | { target: 'centros'; centerId?: string; panelView?: 'centros' | 'ledger' }
  | { target: 'admin'; roleFilter?: AdminUserRoleFilter };

export function mergePatientListFilters(
  partial?: Partial<PatientListFilters>
): PatientListFilters {
  return { ...DEFAULT_PATIENT_LIST_FILTERS, ...partial };
}
