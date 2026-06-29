import { describe, expect, it } from 'vitest';
import { normalizeSignupPhone, parseFullName, validatePreSignup } from './preSignupApi';

describe('parseFullName', () => {
  it('splits first and last name', () => {
    expect(parseFullName('María Pérez')).toEqual({ first_name: 'María', last_name: 'Pérez' });
  });

  it('handles multiple last names', () => {
    expect(parseFullName('Juan Carlos Rodríguez López')).toEqual({
      first_name: 'Juan',
      last_name: 'Carlos Rodríguez López',
    });
  });

  it('handles single name', () => {
    expect(parseFullName('Ana')).toEqual({ first_name: 'Ana', last_name: '' });
  });
});

describe('normalizeSignupPhone', () => {
  it('strips spaces and punctuation', () => {
    expect(normalizeSignupPhone('+58 412-202-7769')).toBe('+584122027769');
  });
});

describe('validatePreSignup', () => {
  it('accepts valid payload', () => {
    expect(
      validatePreSignup({
        fullName: 'Dra. García',
        contactPhone: '+584141234567',
        specialty: 'Pediatría',
        workplace: 'Ambulatorio Central',
      }),
    ).toBeNull();
  });

  it('rejects short phone', () => {
    expect(
      validatePreSignup({
        fullName: 'Dra. García',
        contactPhone: '0412',
        specialty: 'Pediatría',
        workplace: 'Ambulatorio Central',
      }),
    ).toBe('Indique un teléfono válido.');
  });
});
