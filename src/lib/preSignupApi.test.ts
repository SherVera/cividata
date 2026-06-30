import { describe, expect, it } from 'vitest';
import { normalizeSignupPhone, parseFullName, validatePreSignup, isValidSignupEmail } from './preSignupApi';

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

  it('converts local Venezuelan format', () => {
    expect(normalizeSignupPhone('0414-1234567')).toBe('+584141234567');
  });
});

describe('validatePreSignup', () => {
  it('accepts valid payload', () => {
    expect(
      validatePreSignup({
        fullName: 'Dra. García',
        contactPhone: '+584141234567',
        contactEmail: 'maria@ejemplo.com',
        specialty: 'Pediatría',
        workplace: 'Ambulatorio Central',
      }),
    ).toBeNull();
  });

  it('accepts assistant signup without medical specialty', () => {
    expect(
      validatePreSignup({
        fullName: 'Ana López',
        contactPhone: '+584141234567',
        contactEmail: 'ana@ejemplo.com',
        specialty: 'asistente',
        workplace: 'Centro de acopio Norte',
        requestedRole: 'registrador',
      }),
    ).toBeNull();
  });

  it('accepts signup without workplace', () => {
    expect(
      validatePreSignup({
        fullName: 'Dra. García',
        contactPhone: '+584141234567',
        contactEmail: 'maria@ejemplo.com',
        specialty: 'Pediatría',
        workplace: '',
      }),
    ).toBeNull();
  });

  it('accepts signup without email', () => {
    expect(
      validatePreSignup({
        fullName: 'Dra. García',
        contactPhone: '+584141234567',
        contactEmail: '',
        specialty: 'Pediatría',
        workplace: '',
      }),
    ).toBeNull();
  });

  it('rejects short phone', () => {
    expect(
      validatePreSignup({
        fullName: 'Dra. García',
        contactPhone: '0412',
        contactEmail: 'maria@ejemplo.com',
        specialty: 'Pediatría',
        workplace: 'Ambulatorio Central',
      }),
    ).toBe('Indique un teléfono válido.');
  });

  it('rejects invalid email', () => {
    expect(
      validatePreSignup({
        fullName: 'Dra. García',
        contactPhone: '+584141234567',
        contactEmail: 'correo-invalido',
        specialty: 'Pediatría',
        workplace: 'Ambulatorio Central',
      }),
    ).toBe('Indique un correo electrónico válido.');
  });
});

describe('isValidSignupEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidSignupEmail('maria@ejemplo.com')).toBe(true);
    expect(isValidSignupEmail('  Ana.Lopez@Hospital.ORG  ')).toBe(true);
  });

  it('accepts empty email as optional', () => {
    expect(isValidSignupEmail('')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidSignupEmail('sin-arroba')).toBe(false);
  });
});
