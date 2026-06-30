import type { SupabaseClient } from '@supabase/supabase-js';

async function signInThroughAuthLoginApi(
  supabase: SupabaseClient,
  identity: string,
  password: string,
) {
  const response = await fetch('/api/auth-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, password }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    session?: { access_token: string; refresh_token: string };
  };

  if (!response.ok || !payload.session) {
    return {
      data: { user: null, session: null },
      error: { message: payload.error || 'Credenciales incorrectas' },
    };
  }

  return supabase.auth.setSession(payload.session);
}

export async function signInWithIdentity(
  supabase: SupabaseClient,
  identity: string,
  password: string,
) {
  const trimmed = identity.trim();
  if (!trimmed || !password) {
    return { data: { user: null, session: null }, error: { message: 'Credenciales inválidas' } };
  }

  return signInThroughAuthLoginApi(supabase, trimmed, password);
}

export { resolveAuthIdentity } from '../../lib/authIdentity.js';
