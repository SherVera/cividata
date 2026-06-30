export const AUTH_LOGIN_EMAIL_DOMAIN = 'login.cividata.app';

export function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidUsername(value) {
  const username = normalizeUsername(value);
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username);
}

export function usernameToAuthEmail(username) {
  return `${normalizeUsername(username)}@${AUTH_LOGIN_EMAIL_DOMAIN}`;
}

export function isAuthLoginEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .endsWith(`@${AUTH_LOGIN_EMAIL_DOMAIN}`);
}

export function usernameFromAuthEmail(email) {
  if (!isAuthLoginEmail(email)) return null;
  return email.split('@')[0]?.toLowerCase() || null;
}

export function resolveAuthUsername(user) {
  const stored = user?.user_metadata?.username;
  if (typeof stored === 'string' && stored.trim()) return normalizeUsername(stored);
  return usernameFromAuthEmail(user?.email);
}

export function suggestUsername(firstName, lastName) {
  const strip = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .replace(/\.{2,}/g, '.');

  const first = strip(firstName);
  const last = strip(lastName);
  const candidate = [first, last].filter(Boolean).join('.');
  if (!candidate) return '';
  if (isValidUsername(candidate)) return candidate;
  const compact = candidate.replace(/\./g, '');
  if (isValidUsername(compact)) return compact;
  return candidate.slice(0, 32).replace(/[^a-z0-9._-]+/g, '');
}
