function envInt(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBool(value: string | undefined, fallback: boolean): boolean {
  if (!value?.trim()) return fallback;
  return value.trim().toLowerCase() === 'true';
}

/** Configuración del dictado y análisis por voz (variables VITE_ en build). */
export const voiceConfig = {
  parseApiUrl: import.meta.env.VITE_VOICE_PARSE_API_URL?.trim() || '/api/voice-parse',
  parseMinChars: envInt(import.meta.env.VITE_VOICE_PARSE_MIN_CHARS, 8),
  parseMaxChars: envInt(import.meta.env.VITE_VOICE_PARSE_MAX_CHARS, 2500),
  speechLang: import.meta.env.VITE_SPEECH_RECOGNITION_LANG?.trim() || 'es-VE',
  /** Si true, no llama a Gemini cuando el texto tiene etiquetas (ahorra cuota). */
  preferLocalParse: envBool(import.meta.env.VITE_VOICE_PARSE_PREFER_LOCAL, true),
};
