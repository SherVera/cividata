import {
  isValidUsername,
  normalizeUsername,
  usernameToAuthEmail,
} from './authUsername.js';

/** Normaliza teléfonos venezolanos a E.164 (+58 + 10 dígitos). */
export function normalizeAuthPhone(value) {
  let phone = String(value || '').trim().replace(/[\s().-]/g, '');
  if (!phone) return '';

  if (phone.startsWith('+58')) return phone;
  if (phone.startsWith('58') && phone.length >= 12) return `+${phone}`;
  if (phone.startsWith('0') && phone.length === 11) return `+58${phone.slice(1)}`;
  if (phone.length === 10 && /^\d+$/.test(phone)) return `+58${phone}`;
  if (phone.startsWith('+')) return phone;

  if (/^\d+$/.test(phone)) {
    const digits = phone.startsWith('0') ? phone.slice(1) : phone;
    if (digits.length === 10) return `+58${digits}`;
  }

  return phone;
}

export function isValidAuthPhone(value) {
  return /^\+58\d{10}$/.test(normalizeAuthPhone(value));
}

export function looksLikePhoneIdentity(value) {
  const cleaned = String(value || '').trim().replace(/[\s().-]/g, '');
  if (!cleaned || cleaned.includes('@')) return false;
  if (cleaned.startsWith('+')) return true;
  if (cleaned.startsWith('0') && /^\d+$/.test(cleaned)) return true;
  return /^\d{10,}$/.test(cleaned);
}

export function phoneLoginVariants(value) {
  const cleaned = String(value || '').trim().replace(/[\s().-]/g, '');
  const variants = new Set();

  if (cleaned) variants.add(normalizeAuthPhone(cleaned));

  if (cleaned.startsWith('+58')) {
    variants.add(cleaned);
    variants.add(cleaned.slice(1));
    variants.add(`0${cleaned.slice(3)}`);
    variants.add(cleaned.slice(3));
  } else if (cleaned.startsWith('58') && cleaned.length >= 12) {
    variants.add(`+${cleaned}`);
    variants.add(cleaned);
    variants.add(`0${cleaned.slice(2)}`);
    variants.add(cleaned.slice(2));
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    variants.add(cleaned);
    variants.add(cleaned.slice(1));
    variants.add(`+58${cleaned.slice(1)}`);
    variants.add(`58${cleaned.slice(1)}`);
  } else if (/^\d{10}$/.test(cleaned)) {
    variants.add(cleaned);
    variants.add(`0${cleaned}`);
    variants.add(`+58${cleaned}`);
    variants.add(`58${cleaned}`);
  }

  return [...variants].filter(Boolean);
}

export function resolveAuthIdentity(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  if (trimmed.includes('@')) return { email: trimmed };
  if (looksLikePhoneIdentity(trimmed)) return { phone: normalizeAuthPhone(trimmed) };
  const username = normalizeUsername(trimmed);
  if (isValidUsername(username)) return { email: usernameToAuthEmail(username) };
  return { email: usernameToAuthEmail(username) };
}
