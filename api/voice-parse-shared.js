export function envString(name, fallback) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function envFloat(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const DEFAULT_SYSTEM_PROMPT = `Eres un asistente que extrae datos estructurados de registros de pacientes en español (Venezuela).
Recibes SOLO texto ya transcrito. Devuelve JSON según el esquema.

Formato preferido del texto (más eficiente): una línea por campo, «Etiqueta: valor».
Etiquetas habituales: Nombres, Apellidos, Documento, Edad años, Edad meses, Fecha nacimiento, Grupo etario, Centro, Género, Representante, Parentesco, Teléfono, Dirección, Ciudad, Estado, Peso kg, Talla cm, Vacunación, Alergias.
Mapeo: Representante→nombreRepresentante, Teléfono→telefonoPrincipal, Ciudad→ciudadMunicipio, Estado→estadoProvincia, Peso kg→peso, Talla cm→estatura, Vacunación→esquemaVacunacion, Centro→centroAcopioNombre (muy importante en jornadas de campo), Documento→documentoIdentidad.
Si el texto sigue este formato, extrae directamente. Si no, interpreta lenguaje natural con las reglas siguientes.

Reglas:
- Si un dato NO se menciona con claridad: value null y confidence "missing".
- Si se menciona pero es dudoso: confidence "ambiguous".
- NO inventes cédulas, teléfonos, fechas ni nombres.
- genero: solo Masculino, Femenino u Otro.
- parentesco: solo Madre, Padre, Abuelo/a, Tutor legal.
- grupoEtario: solo si no hay edad ni fecha; valores nino, adulto, tercera_edad (cualquier edad, no solo niños).
- fechaNacimiento: formato ISO YYYY-MM-DD si se dice la fecha exacta.
- edadAnios/edadMeses: si dicen "Edad años: 5" o "cinco años", edadAnios 5.
- Booleans: true/false solo si fue explícito (Alergias: Sí / Vacunación completa / no asiste a escuela).
- esquemaVacunacion: Completo o Incompleto.
- puntoRegistroTipo: centro (centro de acopio/salud) o medico (atención en calle).
- Ignora líneas vacías y etiquetas sin valor.`;

export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    fields: {
      type: 'object',
      properties: {
        nombres: fieldSchema(),
        apellidos: fieldSchema(),
        documentoIdentidad: fieldSchema(),
        fechaNacimiento: fieldSchema('YYYY-MM-DD o null'),
        edadAnios: fieldSchema('número entero o null'),
        edadMeses: fieldSchema('número entero 0-11 o null'),
        grupoEtario: fieldSchema('nino | adulto | tercera_edad o null'),
        genero: fieldSchema('Masculino | Femenino | Otro o null'),
        nacionalidad: fieldSchema(),
        direccion: fieldSchema(),
        ciudadMunicipio: fieldSchema(),
        estadoProvincia: fieldSchema(),
        puntoReferencia: fieldSchema(),
        nombreRepresentante: fieldSchema(),
        parentesco: fieldSchema('Madre | Padre | Abuelo/a | Tutor legal o null'),
        documentoRepresentante: fieldSchema(),
        telefonoPrincipal: fieldSchema(),
        telefonoEmergencias: fieldSchema(),
        correo: fieldSchema(),
        ocupacion: fieldSchema(),
        peso: fieldSchema('kg, número o null'),
        estatura: fieldSchema('cm, número o null'),
        grupoSanguineo: fieldSchema(),
        tieneAlergias: fieldSchema('boolean o null'),
        alergiasEspecificas: fieldSchema(),
        tieneCondicionMedica: fieldSchema('boolean o null'),
        condicionMedicaEspecifica: fieldSchema(),
        tomaMedicamentos: fieldSchema('boolean o null'),
        medicamentosEspecificos: fieldSchema(),
        esquemaVacunacion: fieldSchema('Completo | Incompleto o null'),
        asisteEscuela: fieldSchema('boolean o null'),
        nivelEducativo: fieldSchema(
          'Maternal | Preescolar / Inicial | Primaria | Secundaria o null'
        ),
        gradoAnio: fieldSchema(),
        nombreInstitucion: fieldSchema(),
        puntoRegistroTipo: fieldSchema('centro | medico o null'),
        centroAcopioNombre: fieldSchema('nombre del centro si se menciona'),
      },
    },
  },
  required: ['fields'],
};

function fieldSchema(hint = 'texto o null') {
  return {
    type: 'object',
    properties: {
      value: { description: hint },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'missing', 'ambiguous'],
      },
    },
    required: ['value', 'confidence'],
  };
}

const SUPPORTED_PROVIDERS = ['gemini', 'groq', 'openrouter', 'openai'];

export function detectVoiceParseProvider() {
  const explicit = envString('VOICE_PARSE_PROVIDER', '').toLowerCase();
  if (explicit) return explicit;
  if (envString('GROQ_API_KEY', '')) return 'groq';
  if (envString('OPENROUTER_API_KEY', '')) return 'openrouter';
  if (envString('OPENAI_API_KEY', '')) return 'openai';
  if (envString('GEMINI_API_KEY', '') || envString('GOOGLE_API_KEY', '')) return 'gemini';
  return '';
}

export function voiceParseConfig() {
  const provider = detectVoiceParseProvider();
  return {
    provider,
    temperature: envFloat(
      'VOICE_PARSE_TEMPERATURE',
      envFloat('GEMINI_VOICE_PARSE_TEMPERATURE', 0.1)
    ),
    minChars: envInt('VOICE_PARSE_MIN_CHARS', envInt('GEMINI_VOICE_PARSE_MIN_CHARS', 8)),
    maxChars: envInt('VOICE_PARSE_MAX_CHARS', envInt('GEMINI_VOICE_PARSE_MAX_CHARS', 2500)),
    systemPrompt: envString(
      'VOICE_PARSE_SYSTEM_PROMPT',
      envString('GEMINI_VOICE_PARSE_SYSTEM_PROMPT', DEFAULT_SYSTEM_PROMPT)
    ),
  };
}

export function providerCredentials(provider) {
  switch (provider) {
    case 'groq':
      return {
        provider: 'groq',
        label: 'Groq',
        apiKey: envString('GROQ_API_KEY', ''),
        model: envString('VOICE_PARSE_MODEL', envString('GROQ_MODEL', 'llama-3.3-70b-versatile')),
        baseUrl: envString('GROQ_API_BASE_URL', 'https://api.groq.com/openai/v1'),
      };
    case 'openrouter':
      return {
        provider: 'openrouter',
        label: 'OpenRouter',
        apiKey: envString('OPENROUTER_API_KEY', ''),
        model: envString(
          'VOICE_PARSE_MODEL',
          envString('OPENROUTER_MODEL', 'google/gemma-2-9b-it:free')
        ),
        baseUrl: envString('OPENROUTER_API_BASE_URL', 'https://openrouter.ai/api/v1'),
      };
    case 'openai':
      return {
        provider: 'openai',
        label: 'OpenAI',
        apiKey: envString('OPENAI_API_KEY', ''),
        model: envString('VOICE_PARSE_MODEL', envString('OPENAI_MODEL', 'gpt-4o-mini')),
        baseUrl: envString('OPENAI_API_BASE_URL', 'https://api.openai.com/v1'),
      };
    case 'gemini':
    default:
      return {
        provider: 'gemini',
        label: 'Gemini',
        apiKey: envString('GEMINI_API_KEY', envString('GOOGLE_API_KEY', '')),
        model: envString('VOICE_PARSE_MODEL', envString('GEMINI_MODEL', 'gemini-2.0-flash')),
        baseUrl: envString(
          'GEMINI_API_BASE_URL',
          'https://generativelanguage.googleapis.com/v1beta'
        ),
      };
  }
}

export function missingProviderMessage(provider) {
  if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
    return 'El análisis con IA no está configurado. Defina VOICE_PARSE_PROVIDER y la API key del proveedor en .env o Vercel (gemini, groq, openrouter, openai).';
  }
  const keyNames = {
    gemini: 'GEMINI_API_KEY',
    groq: 'GROQ_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    openai: 'OPENAI_API_KEY',
  };
  return `El análisis con IA (${provider}) no está configurado. Agregue ${keyNames[provider]} en .env (local) o en Vercel.`;
}

export function providerClientError(providerLabel, status, data) {
  const message =
    typeof data?.error?.message === 'string'
      ? data.error.message
      : typeof data?.error === 'string'
        ? data.error
        : '';
  const lower = message.toLowerCase();

  if (status === 401 || status === 403 || lower.includes('api key') || lower.includes('unauthorized')) {
    if (providerLabel === 'Gemini' && lower.includes('access_token_type_unsupported')) {
      return 'La clave AQ. de Gemini no fue aceptada. Regenérela en Google AI Studio o use VOICE_PARSE_PROVIDER=groq.';
    }
    return `Clave de ${providerLabel} rechazada. Verifique la API key en las variables de entorno.`;
  }
  if (status === 404 || lower.includes('not found') || lower.includes('model')) {
    return `Modelo de ${providerLabel} no encontrado. Revise el modelo en las variables de entorno.`;
  }
  if (
    lower.includes('quota') ||
    lower.includes('rate') ||
    lower.includes('limit') ||
    lower.includes('exhausted') ||
    status === 429
  ) {
    return `Cuota o límite de ${providerLabel} alcanzado. Cambie de proveedor (VOICE_PARSE_PROVIDER) o espere a que se renueve la cuota.`;
  }
  if (message) return message;
  return 'No se pudo analizar el texto. Intente de nuevo o complete el formulario manualmente.';
}

export function openAiJsonSystemPrompt(basePrompt) {
  return `${basePrompt}

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown ni texto extra) con esta forma:
{"fields":{"nombres":{"value":null,"confidence":"missing"},"apellidos":{"value":null,"confidence":"missing"}}}
Incluye solo los campos mencionados o inferibles; cada campo debe tener "value" y "confidence" (high, medium, missing, ambiguous).`;
}

export function parseJsonFromModelText(rawText) {
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }
  return JSON.parse(trimmed);
}

export function validateVoiceParsePayload(parsed) {
  if (!parsed?.fields || typeof parsed.fields !== 'object') {
    return 'Formato de respuesta inválido.';
  }
  return null;
}
