// Vercel Serverless — extrae campos de paciente desde texto transcrito (sin audio).
// Proveedores: gemini (default), groq, openrouter, openai — ver VOICE_PARSE_PROVIDER en .env.

import {
  missingProviderMessage,
  openAiJsonSystemPrompt,
  parseJsonFromModelText,
  providerClientError,
  providerCredentials,
  RESPONSE_SCHEMA,
  validateVoiceParsePayload,
  voiceParseConfig,
} from './voice-parse-shared.js';

async function parseWithGemini(credentials, config, transcript) {
  const url = `${credentials.baseUrl}/models/${encodeURIComponent(credentials.model)}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': credentials.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: config.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: transcript }] }],
      generationConfig: {
        temperature: config.temperature,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      error: providerClientError(credentials.label, response.status, data),
      data,
    };
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof rawText !== 'string') {
    return { ok: false, error: 'La IA no devolvió un resultado válido.', data };
  }

  try {
    const parsed = JSON.parse(rawText);
    const validationError = validateVoiceParsePayload(parsed);
    if (validationError) {
      return { ok: false, error: validationError, data };
    }
    return { ok: true, parsed };
  } catch {
    return { ok: false, error: 'La IA devolvió JSON inválido.', data };
  }
}

async function parseWithOpenAiCompatible(credentials, config, transcript) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${credentials.apiKey}`,
  };

  if (credentials.provider === 'openrouter') {
    const referer =
      process.env.SITE_URL?.trim() ||
      process.env.VITE_SITE_URL?.trim() ||
      'https://cividata.app';
    headers['HTTP-Referer'] = referer;
    headers['X-Title'] = 'Cividata';
  }

  const response = await fetch(`${credentials.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: credentials.model,
      temperature: config.temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: openAiJsonSystemPrompt(config.systemPrompt) },
        { role: 'user', content: transcript },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      error: providerClientError(credentials.label, response.status, data),
      data,
    };
  }

  const rawText = data?.choices?.[0]?.message?.content;
  if (typeof rawText !== 'string') {
    return { ok: false, error: 'La IA no devolvió un resultado válido.', data };
  }

  try {
    const parsed = parseJsonFromModelText(rawText);
    const validationError = validateVoiceParsePayload(parsed);
    if (validationError) {
      return { ok: false, error: validationError, data };
    }
    return { ok: true, parsed };
  } catch {
    return { ok: false, error: 'La IA devolvió JSON inválido.', data };
  }
}

async function parseTranscriptWithProvider(credentials, config, transcript) {
  if (credentials.provider === 'gemini') {
    return parseWithGemini(credentials, config, transcript);
  }
  return parseWithOpenAiCompatible(credentials, config, transcript);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const config = voiceParseConfig();
  const credentials = providerCredentials(config.provider);

  if (!config.provider || !credentials.apiKey) {
    return res.status(503).json({
      error: missingProviderMessage(config.provider),
    });
  }

  const transcript =
    typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';
  if (transcript.length < config.minChars) {
    return res.status(400).json({
      error: `El texto debe tener al menos ${config.minChars} caracteres para analizar.`,
    });
  }
  if (transcript.length > config.maxChars) {
    return res.status(400).json({
      error: `El texto no puede superar ${config.maxChars} caracteres.`,
    });
  }

  try {
    const result = await parseTranscriptWithProvider(credentials, config, transcript);
    if (!result.ok) {
      console.error(`voice-parse ${credentials.provider} failed`, result.data);
      return res.status(502).json({ error: result.error });
    }
    return res.json(result.parsed);
  } catch (err) {
    console.error('voice-parse error', err);
    return res.status(502).json({
      error: 'Error al procesar el texto. Intente de nuevo.',
    });
  }
}
