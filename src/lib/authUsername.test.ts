import { describe, expect, it } from 'vitest';
import {
  isAuthLoginEmail,
  isValidUsername,
  normalizeUsername,
  suggestUsername,
  usernameFromAuthEmail,
  usernameToAuthEmail,
} from './authUsername';

describe('normalizeUsername', () => {
  it('lowercases and trims', () => {
    expect(normalizeUsername('  Dr.Garcia  ')).toBe('dr.garcia');
  });
});

describe('isValidUsername', () => {
  it('accepts common usernames', () => {
    expect(isValidUsername('maria.perez')).toBe(true);
    expect(isValidUsername('dr_garcia01')).toBe(true);
  });

  it('rejects too-short usernames', () => {
    expect(isValidUsername('ab')).toBe(false);
  });
});

describe('usernameToAuthEmail', () => {
  it('builds synthetic login email', () => {
    expect(usernameToAuthEmail('maria.perez')).toBe('maria.perez@login.cividata.app');
  });
});

describe('usernameFromAuthEmail', () => {
  it('extracts username from synthetic email', () => {
    expect(usernameFromAuthEmail('maria.perez@login.cividata.app')).toBe('maria.perez');
    expect(usernameFromAuthEmail('real@example.com')).toBeNull();
  });
});

describe('isAuthLoginEmail', () => {
  it('detects synthetic login emails', () => {
    expect(isAuthLoginEmail('maria.perez@login.cividata.app')).toBe(true);
    expect(isAuthLoginEmail('real@example.com')).toBe(false);
  });
});

describe('suggestUsername', () => {
  it('builds a username from full name', () => {
    expect(suggestUsername('María', 'Pérez')).toBe('maria.perez');
  });
});
