import { describe, expect, it } from 'vitest';
import { isValidAuthPhone, normalizeAuthPhone, phoneLoginVariants, resolveAuthIdentity } from './authPhone';

describe('normalizeAuthPhone', () => {
  it('keeps E.164 with +58', () => {
    expect(normalizeAuthPhone('+584141234567')).toBe('+584141234567');
  });

  it('adds + to 58 prefix', () => {
    expect(normalizeAuthPhone('584141234567')).toBe('+584141234567');
  });

  it('converts local 0-prefix format', () => {
    expect(normalizeAuthPhone('0414-1234567')).toBe('+584141234567');
  });

  it('adds +58 to 10-digit mobile', () => {
    expect(normalizeAuthPhone('4141234567')).toBe('+584141234567');
  });

  it('strips spaces and punctuation', () => {
    expect(normalizeAuthPhone('+58 412-202-7769')).toBe('+584122027769');
  });

  it('normalizes the reported login number', () => {
    expect(normalizeAuthPhone('04122027769')).toBe('+584122027769');
  });
});

describe('phoneLoginVariants', () => {
  it('includes common Venezuelan formats for local numbers', () => {
    expect(phoneLoginVariants('04122027769')).toEqual(
      expect.arrayContaining(['+584122027769', '04122027769', '4122027769', '584122027769']),
    );
  });
});

describe('isValidAuthPhone', () => {
  it('accepts normalized Venezuelan numbers', () => {
    expect(isValidAuthPhone('04141234567')).toBe(true);
  });

  it('rejects too-short numbers', () => {
    expect(isValidAuthPhone('0414')).toBe(false);
  });
});

describe('resolveAuthIdentity', () => {
  it('returns email credentials unchanged', () => {
    expect(resolveAuthIdentity('admin@example.com')).toEqual({ email: 'admin@example.com' });
  });

  it('returns normalized phone credentials', () => {
    expect(resolveAuthIdentity('04141234567')).toEqual({ phone: '+584141234567' });
  });

  it('returns username as synthetic email credentials', () => {
    expect(resolveAuthIdentity('maria.perez')).toEqual({ email: 'maria.perez@login.cividata.app' });
  });
});
