import { describe, expect, it } from 'vitest';
import {
  buildVoiceDictationExample,
  buildVoiceDictationTemplate,
  VOICE_DICTATION_FIELDS,
} from './voiceDictationGuide';

describe('voiceDictationGuide', () => {
  it('genera plantilla con una línea por etiqueta', () => {
    const lines = buildVoiceDictationTemplate().split('\n');
    expect(lines).toHaveLength(VOICE_DICTATION_FIELDS.length);
    expect(lines[0]).toBe('Nombres: ');
    expect(lines.every((line) => line.includes(':'))).toBe(true);
  });

  it('genera ejemplo con valores de muestra', () => {
    const example = buildVoiceDictationExample();
    expect(example).toContain('Nombres: María');
    expect(example).toContain('Edad años: 5');
  });
});
