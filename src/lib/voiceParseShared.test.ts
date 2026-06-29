import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  detectVoiceParseProvider,
  missingProviderMessage,
  openAiJsonSystemPrompt,
  parseJsonFromModelText,
  providerCredentials,
  validateVoiceParsePayload,
} from '../../api/voice-parse-shared.js';

describe('voice-parse-shared', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.VOICE_PARSE_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('detecta groq cuando VOICE_PARSE_PROVIDER=groq', () => {
    process.env.VOICE_PARSE_PROVIDER = 'groq';
    expect(detectVoiceParseProvider()).toBe('groq');
  });

  it('auto-detecta groq si solo hay GROQ_API_KEY', () => {
    process.env.GROQ_API_KEY = 'gsk_test';
    expect(detectVoiceParseProvider()).toBe('groq');
  });

  it('prioriza proveedor explícito sobre auto-detección', () => {
    process.env.VOICE_PARSE_PROVIDER = 'openai';
    process.env.GROQ_API_KEY = 'gsk_test';
    expect(detectVoiceParseProvider()).toBe('openai');
  });

  it('resuelve credenciales de groq', () => {
    process.env.GROQ_API_KEY = 'gsk_test';
    const creds = providerCredentials('groq');
    expect(creds.label).toBe('Groq');
    expect(creds.apiKey).toBe('gsk_test');
    expect(creds.model).toContain('llama');
  });

  it('parsea JSON con o sin fence markdown', () => {
    const payload = { fields: { nombres: { value: 'Ana', confidence: 'high' } } };
    expect(parseJsonFromModelText(JSON.stringify(payload))).toEqual(payload);
    expect(
      parseJsonFromModelText('```json\n' + JSON.stringify(payload) + '\n```')
    ).toEqual(payload);
  });

  it('valida payload con fields', () => {
    expect(validateVoiceParsePayload({ fields: {} })).toBeNull();
    expect(validateVoiceParsePayload({})).toBeTruthy();
  });

  it('mensaje de proveedor faltante menciona VOICE_PARSE_PROVIDER', () => {
    expect(missingProviderMessage('')).toMatch(/VOICE_PARSE_PROVIDER/);
    expect(missingProviderMessage('groq')).toMatch(/GROQ_API_KEY/);
  });

  it('añade instrucción JSON al prompt OpenAI-compatible', () => {
    expect(openAiJsonSystemPrompt('Base')).toMatch(/JSON válido/);
    expect(openAiJsonSystemPrompt('Base')).toContain('Base');
  });
});
