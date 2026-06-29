import { describe, expect, it } from 'vitest';
import { formatSpecialty, normalizeSpecialty } from './specialty';

describe('normalizeSpecialty', () => {
  it('pasa a minúsculas y recorta espacios', () => {
    expect(normalizeSpecialty('  Pediatría  ')).toBe('pediatría');
    expect(normalizeSpecialty('MEDICINA GENERAL')).toBe('medicina general');
  });

  it('colapsa espacios internos', () => {
    expect(normalizeSpecialty('Medicina   general')).toBe('medicina general');
  });
});

describe('formatSpecialty', () => {
  it('capitaliza para mostrar', () => {
    expect(formatSpecialty('pediatría')).toBe('Pediatría');
    expect(formatSpecialty('medicina general')).toBe('Medicina general');
  });

  it('normaliza antes de formatear', () => {
    expect(formatSpecialty('  ENFERMERÍA ')).toBe('Enfermería');
  });
});
