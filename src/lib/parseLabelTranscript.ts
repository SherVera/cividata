import type { VoicePatientDraft, VoicePatientFieldKey } from './voicePatientDraft';
import { VOICE_DICTATION_FIELDS } from './voiceDictationGuide';

const LABEL_ALIASES: Record<string, VoicePatientFieldKey> = {
  nombres: 'nombres',
  nombre: 'nombres',
  apellidos: 'apellidos',
  apellido: 'apellidos',
  documento: 'documentoIdentidad',
  'documento identidad': 'documentoIdentidad',
  cedula: 'documentoIdentidad',
  cédula: 'documentoIdentidad',
  'edad años': 'edadAnios',
  'edad anos': 'edadAnios',
  edad: 'edadAnios',
  años: 'edadAnios',
  anos: 'edadAnios',
  'edad meses': 'edadMeses',
  meses: 'edadMeses',
  'fecha nacimiento': 'fechaNacimiento',
  'fecha de nacimiento': 'fechaNacimiento',
  nacimiento: 'fechaNacimiento',
  'grupo etario': 'grupoEtario',
  centro: 'centroAcopioNombre',
  'centro de acopio': 'centroAcopioNombre',
  genero: 'genero',
  género: 'genero',
  representante: 'nombreRepresentante',
  'nombre representante': 'nombreRepresentante',
  parentesco: 'parentesco',
  telefono: 'telefonoPrincipal',
  teléfono: 'telefonoPrincipal',
  'telefono principal': 'telefonoPrincipal',
  direccion: 'direccion',
  dirección: 'direccion',
  ciudad: 'ciudadMunicipio',
  'ciudad municipio': 'ciudadMunicipio',
  municipio: 'ciudadMunicipio',
  estado: 'estadoProvincia',
  'estado provincia': 'estadoProvincia',
  provincia: 'estadoProvincia',
  'peso kg': 'peso',
  peso: 'peso',
  'talla cm': 'estatura',
  talla: 'estatura',
  estatura: 'estatura',
  vacunacion: 'esquemaVacunacion',
  vacunación: 'esquemaVacunacion',
  alergias: 'tieneAlergias',
};

for (const field of VOICE_DICTATION_FIELDS) {
  const key = field.label.toLowerCase();
  if (!LABEL_ALIASES[key]) {
    LABEL_ALIASES[key] = labelToFieldKey(field.label);
  }
}

function labelToFieldKey(label: string): VoicePatientFieldKey | undefined {
  const map: Record<string, VoicePatientFieldKey> = {
    Nombres: 'nombres',
    Apellidos: 'apellidos',
    Documento: 'documentoIdentidad',
    'Edad años': 'edadAnios',
    'Edad meses': 'edadMeses',
    'Fecha nacimiento': 'fechaNacimiento',
    'Grupo etario': 'grupoEtario',
    Centro: 'centroAcopioNombre',
    Género: 'genero',
    Representante: 'nombreRepresentante',
    Parentesco: 'parentesco',
    Teléfono: 'telefonoPrincipal',
    Dirección: 'direccion',
    Ciudad: 'ciudadMunicipio',
    Estado: 'estadoProvincia',
    'Peso kg': 'peso',
    'Talla cm': 'estatura',
    Vacunación: 'esquemaVacunacion',
    Alergias: 'tieneAlergias',
  };
  return map[label];
}

function normalizeLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function parseBooleanValue(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (['si', 'sí', 'yes', 'true', '1'].includes(value)) return true;
  if (['no', 'false', '0', 'ninguna', 'ninguno', 'sin alergias'].includes(value)) return false;
  return null;
}

function coerceFieldValue(key: VoicePatientFieldKey, raw: string): unknown {
  const value = raw.trim();
  if (!value) return null;

  if (key === 'edadAnios' || key === 'edadMeses' || key === 'peso' || key === 'estatura') {
    const num = parseFloat(value.replace(',', '.'));
    return Number.isFinite(num) ? num : value;
  }

  if (key === 'tieneAlergias') {
    const bool = parseBooleanValue(value);
    return bool ?? value;
  }

  return value;
}

/** Convierte texto «Etiqueta: valor» a borrador sin llamar a la API (sin cuota). */
export function parseLabelTranscript(transcript: string): VoicePatientDraft {
  const fields: VoicePatientDraft['fields'] = {};
  const normalizedText = transcript
    .replace(/\r\n/g, '\n')
    .replace(/\.\s+(?=[*\wÁÉÍÓÚáéíóúÑñ])/g, '\n');

  for (const line of normalizedText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^\*?\+?(.+?)\s*:\s*(.+)$/);
    if (!match) continue;

    const fieldKey = LABEL_ALIASES[normalizeLabel(match[1])];
    if (!fieldKey) continue;

    const rawValue = match[2].trim();
    if (!rawValue) continue;

    if (fieldKey === 'tieneAlergias') {
      const bool = parseBooleanValue(rawValue);
      if (bool !== null) {
        fields.tieneAlergias = { value: bool, confidence: 'high' };
      } else {
        fields.tieneAlergias = { value: true, confidence: 'high' };
        fields.alergiasEspecificas = { value: rawValue, confidence: 'high' };
      }
      continue;
    }

    fields[fieldKey] = {
      value: coerceFieldValue(fieldKey, rawValue),
      confidence: 'high',
    };
  }

  return { fields };
}

export function countLabelTranscriptFields(transcript: string): number {
  return Object.keys(parseLabelTranscript(transcript).fields).length;
}

export function isQuotaOrRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('cuota') ||
    lower.includes('quota') ||
    lower.includes('rate') ||
    lower.includes('límite') ||
    lower.includes('limit') ||
    lower.includes('429') ||
    lower.includes('resource_exhausted')
  );
}
