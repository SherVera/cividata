import type { SelectOption } from '../components/SelectField';
import type { CollectionCenter } from './collectionCentersApi';
import {
  OPTIONAL_SECTION_DEFAULTS,
  type OptionalSectionKey,
} from './optionalPatientSections';
import { NIVEL_EDUCATIVO_OPTIONS, PARENTESCO_OPTIONS } from './selectOptions';
import {
  GrupoEtario,
  Paciente,
  normalizeGrupoEtario,
  pacienteTieneEdad,
} from '../types';
import { parseFormNumber, validatePatientSection1 } from './patientValidation';

export type FieldConfidence = 'high' | 'medium' | 'missing' | 'ambiguous';

export type VoiceFieldDraft<T = unknown> = {
  value: T | null;
  confidence: FieldConfidence;
};

export const VOICE_PATIENT_FIELD_KEYS = [
  'nombres',
  'apellidos',
  'documentoIdentidad',
  'fechaNacimiento',
  'edadAnios',
  'edadMeses',
  'grupoEtario',
  'genero',
  'nacionalidad',
  'direccion',
  'ciudadMunicipio',
  'estadoProvincia',
  'puntoReferencia',
  'nombreRepresentante',
  'parentesco',
  'documentoRepresentante',
  'telefonoPrincipal',
  'telefonoEmergencias',
  'correo',
  'ocupacion',
  'peso',
  'estatura',
  'grupoSanguineo',
  'tieneAlergias',
  'alergiasEspecificas',
  'tieneCondicionMedica',
  'condicionMedicaEspecifica',
  'tomaMedicamentos',
  'medicamentosEspecificos',
  'esquemaVacunacion',
  'asisteEscuela',
  'nivelEducativo',
  'gradoAnio',
  'nombreInstitucion',
  'puntoRegistroTipo',
  'centroAcopioNombre',
] as const;

export type VoicePatientFieldKey = (typeof VOICE_PATIENT_FIELD_KEYS)[number];

export type VoicePatientDraft = {
  fields: Partial<Record<VoicePatientFieldKey, VoiceFieldDraft>>;
};

export type VoiceAssignedField = {
  key: VoicePatientFieldKey;
  label: string;
  display: string;
};

export type VoiceFieldIssue = {
  key: VoicePatientFieldKey | 'grupoEtario';
  label: string;
  kind: 'ambiguous' | 'missing_required';
};

export type ApplyVoiceDraftResult = {
  patch: Partial<Paciente>;
  centerMatch: CollectionCenter | null;
  sections: Record<OptionalSectionKey, boolean>;
  assigned: VoiceAssignedField[];
  issues: VoiceFieldIssue[];
  missingRequired: VoiceFieldIssue[];
};

export const VOICE_FIELD_LABELS: Record<VoicePatientFieldKey, string> = {
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  documentoIdentidad: 'Documento',
  fechaNacimiento: 'Fecha de nacimiento',
  edadAnios: 'Edad (años)',
  edadMeses: 'Edad (meses)',
  grupoEtario: 'Clasificación etaria',
  genero: 'Género',
  nacionalidad: 'Nacionalidad',
  direccion: 'Dirección',
  ciudadMunicipio: 'Ciudad / municipio',
  estadoProvincia: 'Estado / provincia',
  puntoReferencia: 'Punto de referencia',
  nombreRepresentante: 'Representante',
  parentesco: 'Parentesco',
  documentoRepresentante: 'Documento del representante',
  telefonoPrincipal: 'Teléfono principal',
  telefonoEmergencias: 'Teléfono de emergencias',
  correo: 'Correo',
  ocupacion: 'Ocupación',
  peso: 'Peso',
  estatura: 'Talla',
  grupoSanguineo: 'Grupo sanguíneo',
  tieneAlergias: 'Alergias',
  alergiasEspecificas: 'Alergias específicas',
  tieneCondicionMedica: 'Condición médica',
  condicionMedicaEspecifica: 'Condición médica específica',
  tomaMedicamentos: 'Medicamentos',
  medicamentosEspecificos: 'Medicamentos específicos',
  esquemaVacunacion: 'Esquema de vacunación',
  asisteEscuela: 'Asiste a escuela',
  nivelEducativo: 'Nivel educativo',
  gradoAnio: 'Grado / año',
  nombreInstitucion: 'Institución',
  puntoRegistroTipo: 'Punto de captura',
  centroAcopioNombre: 'Centro de acopio',
};

const GENERO_ALIASES: Record<string, Paciente['genero']> = {
  masculino: 'Masculino',
  hombre: 'Masculino',
  varon: 'Masculino',
  varón: 'Masculino',
  niño: 'Masculino',
  nino: 'Masculino',
  femenino: 'Femenino',
  mujer: 'Femenino',
  niña: 'Femenino',
  nina: 'Femenino',
  otro: 'Otro',
};

const GRUPO_ETARIO_ALIASES: Record<string, GrupoEtario> = {
  nino: 'nino',
  'niño': 'nino',
  'niña': 'nino',
  nina: 'nino',
  infantil: 'nino',
  adulto: 'adulto',
  'tercera edad': 'tercera_edad',
  tercera_edad: 'tercera_edad',
  anciano: 'tercera_edad',
  anciana: 'tercera_edad',
};

const PARENTESCO_ALIASES: Record<string, Paciente['parentesco']> = {
  madre: 'Madre',
  mama: 'Madre',
  mamá: 'Madre',
  padre: 'Padre',
  papa: 'Padre',
  papá: 'Padre',
  'abuelo/a': 'Abuelo/a',
  abuelo: 'Abuelo/a',
  abuela: 'Abuelo/a',
  'tutor legal': 'Tutor legal',
  tutor: 'Tutor legal',
};

function fieldDraft<T>(
  draft: VoicePatientDraft,
  key: VoicePatientFieldKey
): VoiceFieldDraft<T> | undefined {
  return draft.fields[key] as VoiceFieldDraft<T> | undefined;
}

function normalizeText(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  return value || null;
}

export function normalizeGenero(raw: unknown): Paciente['genero'] | null {
  const direct = String(raw ?? '').trim();
  if (direct === 'Masculino' || direct === 'Femenino' || direct === 'Otro') return direct;
  const alias = GENERO_ALIASES[direct.toLowerCase()];
  return alias ?? null;
}

export function normalizeGrupoEtarioVoice(raw: unknown): GrupoEtario | null {
  const normalized = normalizeGrupoEtario(raw);
  if (normalized) return normalized;
  const alias = GRUPO_ETARIO_ALIASES[String(raw ?? '').trim().toLowerCase()];
  return alias ?? null;
}

export function normalizeSelectValue(raw: unknown, options: SelectOption[]): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const exact = options.find((option) => option.value === value);
  if (exact?.value) return exact.value;
  const byLabel = options.find(
    (option) => option.label.toLowerCase() === value.toLowerCase()
  );
  return byLabel?.value || null;
}

export function normalizeParentesco(raw: unknown): Paciente['parentesco'] | null {
  const direct = normalizeSelectValue(raw, PARENTESCO_OPTIONS);
  if (direct) return direct as Paciente['parentesco'];
  const alias = PARENTESCO_ALIASES[String(raw ?? '').trim().toLowerCase()];
  return alias ?? null;
}

export function normalizeNivelEducativo(raw: unknown): Paciente['nivelEducativo'] | null {
  const value = normalizeSelectValue(raw, NIVEL_EDUCATIVO_OPTIONS);
  if (!value) return null;
  return value as Paciente['nivelEducativo'];
}

export function normalizeFechaNacimiento(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : value;
  }
  return null;
}

export function normalizeBooleanField(
  raw: unknown,
  confidence: FieldConfidence
): boolean | null {
  if (confidence === 'missing') return null;
  if (typeof raw === 'boolean') return raw;
  const value = String(raw ?? '').trim().toLowerCase();
  if (['true', 'si', 'sí', 'yes'].includes(value)) return true;
  if (['false', 'no'].includes(value)) return false;
  return null;
}

export function normalizeEsquemaVacunacion(raw: unknown): Paciente['esquemaVacunacion'] | null {
  const value = String(raw ?? '').trim().toLowerCase();
  if (value === 'completo') return 'Completo';
  if (value === 'incompleto') return 'Incompleto';
  if (raw === 'Completo' || raw === 'Incompleto') return raw;
  return null;
}

export function normalizePuntoRegistroTipo(raw: unknown): Paciente['puntoRegistroTipo'] | null {
  const value = String(raw ?? '').trim().toLowerCase();
  if (value === 'centro' || value === 'centro de acopio' || value === 'centro de apoyo') return 'centro';
  if (value === 'medico' || value === 'médico' || value === 'atencion en calle') return 'medico';
  if (raw === 'centro' || raw === 'medico') return raw;
  return null;
}

export function matchCenterByName(
  centers: CollectionCenter[],
  name: string
): CollectionCenter | null {
  const query = name.trim().toLowerCase();
  if (!query) return null;

  const active = centers.filter((center) => center.active);
  const exact = active.find((center) => center.name.toLowerCase() === query);
  if (exact) return exact;

  const partial = active.filter(
    (center) =>
      center.name.toLowerCase().includes(query) || query.includes(center.name.toLowerCase())
  );
  if (partial.length === 1) return partial[0];
  return null;
}

function displayValue(key: VoicePatientFieldKey, value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (key === 'grupoEtario') {
    const grupo = normalizeGrupoEtarioVoice(value);
    if (grupo === 'nino') return 'Niño/a';
    if (grupo === 'adulto') return 'Adulto';
    if (grupo === 'tercera_edad') return 'Tercera edad';
  }
  if (key === 'puntoRegistroTipo') {
    return value === 'medico' ? 'Atención en calle' : 'Centro de acopio';
  }
  return String(value ?? '');
}

function shouldFlagAmbiguous(confidence: FieldConfidence, assigned: boolean): boolean {
  return !assigned && (confidence === 'ambiguous' || confidence === 'medium');
}

export function applyVoiceDraft(
  current: Paciente,
  draft: VoicePatientDraft,
  centers: CollectionCenter[]
): ApplyVoiceDraftResult {
  const patch: Partial<Paciente> = {};
  const assigned: VoiceAssignedField[] = [];
  const issues: VoiceFieldIssue[] = [];
  let centerMatch: CollectionCenter | null = null;

  const assign = <K extends keyof Paciente>(
    key: K,
    value: Paciente[K] | null | undefined,
    confidence: FieldConfidence
  ) => {
    if (value === null || value === undefined || value === '') {
      if (shouldFlagAmbiguous(confidence, false)) {
        issues.push({
          key: key as VoicePatientFieldKey,
          label: VOICE_FIELD_LABELS[key as VoicePatientFieldKey] ?? String(key),
          kind: 'ambiguous',
        });
      }
      return;
    }
    patch[key] = value;
    assigned.push({
      key: key as VoicePatientFieldKey,
      label: VOICE_FIELD_LABELS[key as VoicePatientFieldKey] ?? String(key),
      display: displayValue(key as VoicePatientFieldKey, value),
    });
  };

  const raw = (key: VoicePatientFieldKey) => fieldDraft(draft, key);

  assign('nombres', normalizeText(raw('nombres')?.value), raw('nombres')?.confidence ?? 'missing');
  assign(
    'apellidos',
    normalizeText(raw('apellidos')?.value),
    raw('apellidos')?.confidence ?? 'missing'
  );
  assign(
    'documentoIdentidad',
    normalizeText(raw('documentoIdentidad')?.value),
    raw('documentoIdentidad')?.confidence ?? 'missing'
  );

  const fecha = normalizeFechaNacimiento(raw('fechaNacimiento')?.value);
  assign('fechaNacimiento', fecha, raw('fechaNacimiento')?.confidence ?? 'missing');

  const edadAniosRaw = raw('edadAnios');
  const edadMesesRaw = raw('edadMeses');
  const edadAnios =
    edadAniosRaw?.value === null || edadAniosRaw?.value === undefined
      ? null
      : parseFormNumber(String(edadAniosRaw.value));
  const edadMeses =
    edadMesesRaw?.value === null || edadMesesRaw?.value === undefined
      ? null
      : parseFormNumber(String(edadMesesRaw.value));

  if (edadAnios !== null && edadAnios > 0) {
    assign('edadAnios', edadAnios, edadAniosRaw?.confidence ?? 'missing');
  } else if (shouldFlagAmbiguous(edadAniosRaw?.confidence ?? 'missing', false)) {
    issues.push({ key: 'edadAnios', label: VOICE_FIELD_LABELS.edadAnios, kind: 'ambiguous' });
  }

  if (edadMeses !== null && edadMeses > 0) {
    assign('edadMeses', edadMeses, edadMesesRaw?.confidence ?? 'missing');
  }

  const mergedForAge = { ...current, ...patch };
  if (!pacienteTieneEdad(mergedForAge)) {
    const grupo = normalizeGrupoEtarioVoice(raw('grupoEtario')?.value);
    assign('grupoEtario', grupo, raw('grupoEtario')?.confidence ?? 'missing');
  }

  assign('genero', normalizeGenero(raw('genero')?.value), raw('genero')?.confidence ?? 'missing');
  assign(
    'nacionalidad',
    normalizeText(raw('nacionalidad')?.value),
    raw('nacionalidad')?.confidence ?? 'missing'
  );
  assign('direccion', normalizeText(raw('direccion')?.value), raw('direccion')?.confidence ?? 'missing');
  assign(
    'ciudadMunicipio',
    normalizeText(raw('ciudadMunicipio')?.value),
    raw('ciudadMunicipio')?.confidence ?? 'missing'
  );
  assign(
    'estadoProvincia',
    normalizeText(raw('estadoProvincia')?.value),
    raw('estadoProvincia')?.confidence ?? 'missing'
  );
  assign(
    'puntoReferencia',
    normalizeText(raw('puntoReferencia')?.value),
    raw('puntoReferencia')?.confidence ?? 'missing'
  );

  assign(
    'nombreRepresentante',
    normalizeText(raw('nombreRepresentante')?.value),
    raw('nombreRepresentante')?.confidence ?? 'missing'
  );
  assign(
    'parentesco',
    normalizeParentesco(raw('parentesco')?.value),
    raw('parentesco')?.confidence ?? 'missing'
  );
  assign(
    'documentoRepresentante',
    normalizeText(raw('documentoRepresentante')?.value),
    raw('documentoRepresentante')?.confidence ?? 'missing'
  );
  assign(
    'telefonoPrincipal',
    normalizeText(raw('telefonoPrincipal')?.value),
    raw('telefonoPrincipal')?.confidence ?? 'missing'
  );
  assign(
    'telefonoEmergencias',
    normalizeText(raw('telefonoEmergencias')?.value),
    raw('telefonoEmergencias')?.confidence ?? 'missing'
  );
  assign('correo', normalizeText(raw('correo')?.value), raw('correo')?.confidence ?? 'missing');
  assign(
    'ocupacion',
    normalizeText(raw('ocupacion')?.value),
    raw('ocupacion')?.confidence ?? 'missing'
  );

  const pesoRaw = raw('peso');
  const peso =
    pesoRaw?.value === null || pesoRaw?.value === undefined
      ? null
      : parseFormNumber(String(pesoRaw.value));
  if (peso !== null && peso > 0) assign('peso', peso, pesoRaw?.confidence ?? 'missing');

  const estaturaRaw = raw('estatura');
  const estatura =
    estaturaRaw?.value === null || estaturaRaw?.value === undefined
      ? null
      : parseFormNumber(String(estaturaRaw.value));
  if (estatura !== null && estatura > 0) {
    assign('estatura', estatura, estaturaRaw?.confidence ?? 'missing');
  }

  assign(
    'grupoSanguineo',
    normalizeText(raw('grupoSanguineo')?.value),
    raw('grupoSanguineo')?.confidence ?? 'missing'
  );

  const alergiasConfidence = raw('tieneAlergias')?.confidence ?? 'missing';
  const tieneAlergias = normalizeBooleanField(raw('tieneAlergias')?.value, alergiasConfidence);
  if (tieneAlergias !== null) assign('tieneAlergias', tieneAlergias, alergiasConfidence);
  assign(
    'alergiasEspecificas',
    normalizeText(raw('alergiasEspecificas')?.value),
    raw('alergiasEspecificas')?.confidence ?? 'missing'
  );

  const condicionConfidence = raw('tieneCondicionMedica')?.confidence ?? 'missing';
  const tieneCondicion = normalizeBooleanField(
    raw('tieneCondicionMedica')?.value,
    condicionConfidence
  );
  if (tieneCondicion !== null) {
    assign('tieneCondicionMedica', tieneCondicion, condicionConfidence);
  }
  assign(
    'condicionMedicaEspecifica',
    normalizeText(raw('condicionMedicaEspecifica')?.value),
    raw('condicionMedicaEspecifica')?.confidence ?? 'missing'
  );

  const medicamentosConfidence = raw('tomaMedicamentos')?.confidence ?? 'missing';
  const tomaMedicamentos = normalizeBooleanField(
    raw('tomaMedicamentos')?.value,
    medicamentosConfidence
  );
  if (tomaMedicamentos !== null) {
    assign('tomaMedicamentos', tomaMedicamentos, medicamentosConfidence);
  }
  assign(
    'medicamentosEspecificos',
    normalizeText(raw('medicamentosEspecificos')?.value),
    raw('medicamentosEspecificos')?.confidence ?? 'missing'
  );

  assign(
    'esquemaVacunacion',
    normalizeEsquemaVacunacion(raw('esquemaVacunacion')?.value),
    raw('esquemaVacunacion')?.confidence ?? 'missing'
  );

  const escuelaConfidence = raw('asisteEscuela')?.confidence ?? 'missing';
  const asisteEscuela = normalizeBooleanField(raw('asisteEscuela')?.value, escuelaConfidence);
  if (asisteEscuela !== null) assign('asisteEscuela', asisteEscuela, escuelaConfidence);
  assign(
    'nivelEducativo',
    normalizeNivelEducativo(raw('nivelEducativo')?.value),
    raw('nivelEducativo')?.confidence ?? 'missing'
  );
  assign('gradoAnio', normalizeText(raw('gradoAnio')?.value), raw('gradoAnio')?.confidence ?? 'missing');
  assign(
    'nombreInstitucion',
    normalizeText(raw('nombreInstitucion')?.value),
    raw('nombreInstitucion')?.confidence ?? 'missing'
  );

  const puntoTipo = normalizePuntoRegistroTipo(raw('puntoRegistroTipo')?.value);
  if (puntoTipo) assign('puntoRegistroTipo', puntoTipo, raw('puntoRegistroTipo')?.confidence ?? 'missing');

  const centerName = normalizeText(raw('centroAcopioNombre')?.value);
  if (centerName) {
    centerMatch = matchCenterByName(centers, centerName);
    if (centerMatch) {
      patch.centroAcopioId = centerMatch.id;
      patch.centroAcopioNombre = centerMatch.name;
      patch.centroAcopioLat = centerMatch.geo_lat;
      patch.centroAcopioLng = centerMatch.geo_lng;
      patch.registroLat = centerMatch.geo_lat;
      patch.registroLng = centerMatch.geo_lng;
      patch.puntoRegistroTipo = 'centro';
      assigned.push({
        key: 'centroAcopioNombre',
        label: VOICE_FIELD_LABELS.centroAcopioNombre,
        display: centerMatch.name,
      });
    } else {
      issues.push({
        key: 'centroAcopioNombre',
        label: VOICE_FIELD_LABELS.centroAcopioNombre,
        kind: 'ambiguous',
      });
    }
  }

  const sections: Record<OptionalSectionKey, boolean> = { ...OPTIONAL_SECTION_DEFAULTS };
  if ((patch.peso ?? 0) > 0 || (patch.estatura ?? 0) > 0) sections.antropometria = true;
  if (
    patch.nombreRepresentante?.trim() ||
    patch.telefonoPrincipal?.trim() ||
    patch.documentoRepresentante?.trim()
  ) {
    sections.representante = true;
  }
  if (
    patch.tieneAlergias ||
    patch.tieneCondicionMedica ||
    patch.tomaMedicamentos ||
    patch.alergiasEspecificas?.trim() ||
    patch.condicionMedicaEspecifica?.trim() ||
    patch.medicamentosEspecificos?.trim() ||
    patch.grupoSanguineo?.trim() ||
    patch.esquemaVacunacion
  ) {
    sections.salud = true;
  }
  if (
    patch.asisteEscuela ||
    patch.nivelEducativo ||
    patch.gradoAnio?.trim() ||
    patch.nombreInstitucion?.trim()
  ) {
    sections.educacion = true;
  }

  const merged = { ...current, ...patch };
  const validationErrors = validatePatientSection1(merged);
  const missingRequired: VoiceFieldIssue[] = [];

  if (validationErrors.nombres) {
    missingRequired.push({
      key: 'nombres',
      label: 'Identidad del paciente',
      kind: 'missing_required',
    });
  }
  if (validationErrors.grupoEtario) {
    missingRequired.push({
      key: 'grupoEtario',
      label: VOICE_FIELD_LABELS.grupoEtario,
      kind: 'missing_required',
    });
  }

  return {
    patch,
    centerMatch,
    sections,
    assigned,
    issues,
    missingRequired,
  };
}

/** Convierte la respuesta cruda de la API en un borrador tipado. */
export function parseVoicePatientDraftResponse(data: unknown): VoicePatientDraft {
  if (!data || typeof data !== 'object') return { fields: {} };
  const record = data as { fields?: unknown };
  if (!record.fields || typeof record.fields !== 'object') return { fields: {} };

  const fields: VoicePatientDraft['fields'] = {};
  for (const key of VOICE_PATIENT_FIELD_KEYS) {
    const entry = (record.fields as Record<string, unknown>)[key];
    if (!entry || typeof entry !== 'object') continue;
    const value = (entry as { value?: unknown }).value ?? null;
    const confidence = (entry as { confidence?: unknown }).confidence;
    const normalizedConfidence: FieldConfidence =
      confidence === 'high' ||
      confidence === 'medium' ||
      confidence === 'missing' ||
      confidence === 'ambiguous'
        ? confidence
        : 'ambiguous';
    fields[key] = { value, confidence: normalizedConfidence };
  }
  return { fields };
}
