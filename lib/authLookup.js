import { looksLikePhoneIdentity, phoneLoginVariants } from './authPhone.js';
import { normalizeUsername, resolveAuthUsername } from './authUsername.js';

export function dedupeLoginAttempts(attempts) {
  const seen = new Set();
  return attempts.filter((attempt) => {
    const key = attempt.email ? `e:${attempt.email.toLowerCase()}` : `p:${attempt.phone}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function findUserByUsername(admin, username, excludeUserId = null) {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;

  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const match = data.users.find((user) => {
      if (excludeUserId && user.id === excludeUserId) return false;
      return resolveAuthUsername(user) === normalized;
    });
    if (match) return match;
    if (data.users.length < 1000) break;
    page += 1;
  }

  return null;
}

export async function findUserByPhone(admin, phone) {
  const inputVariants = new Set(phoneLoginVariants(phone));
  if (inputVariants.size === 0) return null;

  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const match = data.users.find((user) => {
      if (!user.phone) return false;
      return phoneLoginVariants(user.phone).some((variant) => inputVariants.has(variant));
    });
    if (match) return match;
    if (data.users.length < 1000) break;
    page += 1;
  }

  return null;
}

export function loginAttemptsForUser(user) {
  const attempts = [];
  if (user.email) attempts.push({ email: user.email });
  if (user.phone) {
    for (const phone of phoneLoginVariants(user.phone)) {
      attempts.push({ phone });
    }
  }
  return attempts;
}

export function loginAttemptsForIdentity(identity) {
  const trimmed = String(identity || '').trim();
  if (!trimmed) return [];
  if (trimmed.includes('@')) return [{ email: trimmed }];
  if (looksLikePhoneIdentity(trimmed)) {
    return phoneLoginVariants(trimmed).map((phone) => ({ phone }));
  }
  return [];
}

export async function buildLoginAttempts(admin, identity) {
  const trimmed = String(identity || '').trim();
  let attempts = loginAttemptsForIdentity(trimmed);

  if (looksLikePhoneIdentity(trimmed)) {
    const user = await findUserByPhone(admin, trimmed);
    if (user) attempts = [...attempts, ...loginAttemptsForUser(user)];
  } else if (!trimmed.includes('@') && attempts.length === 0) {
    const user = await findUserByUsername(admin, normalizeUsername(trimmed));
    if (user) attempts = loginAttemptsForUser(user);
  }

  return dedupeLoginAttempts(attempts);
}
