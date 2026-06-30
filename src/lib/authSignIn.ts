import type { SupabaseClient } from '@supabase/supabase-js';
import { phoneLoginVariants, resolveAuthIdentity } from '../../lib/authPhone.js';

export async function signInWithIdentity(
  supabase: SupabaseClient,
  identity: string,
  password: string,
) {
  const credentials = resolveAuthIdentity(identity);
  if (!credentials) {
    return { data: { user: null, session: null }, error: { message: 'Credenciales inválidas' } };
  }

  let result = await supabase.auth.signInWithPassword({ ...credentials, password });
  if (!result.error || !('phone' in credentials)) return result;

  for (const phone of phoneLoginVariants(identity)) {
    if (phone === credentials.phone) continue;
    const attempt = await supabase.auth.signInWithPassword({ phone, password });
    if (!attempt.error) return attempt;
  }

  return result;
}

export { resolveAuthIdentity } from '../../lib/authPhone.js';
