import { looksLikePhoneIdentity, normalizeAuthPhone } from './authPhone.js';
import { normalizeUsername } from './authUsername.js';

export function resolveAuthIdentity(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  if (trimmed.includes('@')) return { email: trimmed };
  if (looksLikePhoneIdentity(trimmed)) return { phone: normalizeAuthPhone(trimmed) };
  return { username: normalizeUsername(trimmed) };
}
