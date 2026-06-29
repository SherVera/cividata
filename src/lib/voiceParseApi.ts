import { parseVoicePatientDraftResponse, type VoicePatientDraft } from './voicePatientDraft';
import { voiceConfig } from './voiceConfig';
import { countLabelTranscriptFields, parseLabelTranscript } from './parseLabelTranscript';

export type ParseTranscriptMode = 'local' | 'ai' | 'auto';

/** Análisis local gratuito (formato Etiqueta: valor). No usa cuota de Gemini. */
export function parsePatientTranscriptLocal(transcript: string): VoicePatientDraft {
  const text = transcript.trim();
  if (text.length < voiceConfig.parseMinChars) {
    throw new Error(
      `El texto debe tener al menos ${voiceConfig.parseMinChars} caracteres para analizar.`
    );
  }
  const draft = parseLabelTranscript(text);
  if (countLabelTranscriptFields(text) === 0) {
    throw new Error(
      'No se detectaron etiquetas. Use el formato «Etiqueta: valor» (ej. Nombres: María).'
    );
  }
  return draft;
}

export async function parsePatientTranscript(
  transcript: string,
  mode: ParseTranscriptMode = 'auto'
): Promise<VoicePatientDraft> {
  const text = transcript.trim();
  if (text.length < voiceConfig.parseMinChars) {
    throw new Error(
      `El texto debe tener al menos ${voiceConfig.parseMinChars} caracteres para analizar.`
    );
  }
  if (text.length > voiceConfig.parseMaxChars) {
    throw new Error(`El texto no puede superar ${voiceConfig.parseMaxChars} caracteres.`);
  }

  const hasLabels = countLabelTranscriptFields(text) > 0;
  if (mode === 'local') {
    return parsePatientTranscriptLocal(text);
  }
  if (mode === 'auto' && hasLabels && voiceConfig.preferLocalParse) {
    return parsePatientTranscriptLocal(text);
  }

  try {
    return await parsePatientTranscriptWithAi(text);
  } catch (err) {
    if (mode === 'auto' && hasLabels) {
      return parsePatientTranscriptLocal(text);
    }
    throw err;
  }
}

async function parsePatientTranscriptWithAi(transcript: string): Promise<VoicePatientDraft> {
  const response = await fetch(voiceConfig.parseApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        'Servicio de IA no disponible. Reinicie npm run dev o verifique el despliegue.'
      );
    }
    const message =
      typeof data.error === 'string' && data.error.trim()
        ? data.error
        : `No se pudo analizar el texto con IA (código ${response.status}).`;
    throw new Error(message);
  }

  return parseVoicePatientDraftResponse(data);
}
