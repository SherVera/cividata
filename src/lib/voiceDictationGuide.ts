export type VoiceDictationField = {
  /** Etiqueta fija al dictar (formato «Etiqueta: valor»). */
  label: string;
  /** Obligatorio para guardar el paciente. */
  required: boolean;
  /** Muy recomendado en jornadas de campo (p. ej. centro de acopio). */
  important?: boolean;
  hint: string;
  example: string;
};

/** Una etiqueta por dato — mismo orden siempre, menos tokens y menos errores de IA. */
export const VOICE_DICTATION_FIELDS: VoiceDictationField[] = [
  { label: 'Nombres', required: true, hint: 'Nombre(s) del paciente', example: 'María' },
  { label: 'Apellidos', required: true, hint: 'Apellido(s); basta uno con nombres', example: 'García' },
  { label: 'Documento', required: false, hint: 'Cédula o pasaporte', example: 'V-12345678' },
  { label: 'Edad años', required: true, hint: 'Número de años', example: '5' },
  { label: 'Edad meses', required: false, hint: '0–11 si aplica', example: '3' },
  { label: 'Fecha nacimiento', required: false, hint: 'AAAA-MM-DD si se conoce', example: '2019-05-03' },
  {
    label: 'Grupo etario',
    required: false,
    hint: 'Solo si no hay edad: niño, adulto o tercera edad',
    example: 'niño',
  },
  {
    label: 'Centro',
    required: false,
    important: true,
    hint: 'Centro de acopio o salud donde se registra (nombre exacto)',
    example: 'Centro Salud Chacao',
  },
  { label: 'Género', required: false, hint: 'masculino, femenino u otro', example: 'femenino' },
  { label: 'Representante', required: false, hint: 'Nombre del tutor o madre/padre', example: 'Ana López' },
  { label: 'Parentesco', required: false, hint: 'Madre, Padre, Abuelo/a o Tutor legal', example: 'Madre' },
  { label: 'Teléfono', required: false, hint: 'Contacto principal', example: '0414-1234567' },
  { label: 'Dirección', required: false, hint: 'Calle o urbanización', example: 'Los Palos Grandes' },
  { label: 'Ciudad', required: false, hint: 'Municipio o ciudad', example: 'Chacao' },
  { label: 'Estado', required: false, hint: 'Estado o provincia', example: 'Miranda' },
  { label: 'Peso kg', required: false, hint: 'Kilogramos', example: '18' },
  { label: 'Talla cm', required: false, hint: 'Centímetros', example: '105' },
  { label: 'Vacunación', required: false, hint: 'Completo o Incompleto', example: 'Completo' },
  { label: 'Alergias', required: false, hint: 'Sí o No; detalle si aplica', example: 'No' },
];

export const VOICE_DICTATION_FORMAT_HINT =
  'Use «Etiqueta: valor», un dato por línea. * = obligatorio para guardar. + = muy importante (centro de registro).';

export const VOICE_DICTATION_PLACEHOLDER =
  'Nombres: María. Apellidos: García. Edad años: 5. Centro: Centro Salud Chacao. Género: femenino.';

function linesFromFields(
  fields: VoiceDictationField[],
  valueFor: (field: VoiceDictationField) => string
): string {
  return fields.map((field) => `${field.label}: ${valueFor(field)}`).join('\n');
}

/** Plantilla vacía para dictar o completar campo por campo. */
export function buildVoiceDictationTemplate(): string {
  return linesFromFields(VOICE_DICTATION_FIELDS, () => '');
}

/** Ejemplo completo en el mismo formato. */
export function buildVoiceDictationExample(): string {
  return linesFromFields(VOICE_DICTATION_FIELDS, (field) => field.example);
}

/** Etiquetas para el prompt de IA (servidor). */
export const VOICE_DICTATION_LABELS_FOR_AI = VOICE_DICTATION_FIELDS.map(
  (field) => field.label
).join(', ');
