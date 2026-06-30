import { createClient } from '@supabase/supabase-js';
import { buildLoginAttempts } from '../lib/authLookup.js';

const anon = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

const admin = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Servicio no disponible.' });
  }

  const { identity, password } = req.body || {};
  const trimmed = String(identity || '').trim();
  if (!trimmed || !password) {
    return res.status(400).json({ error: 'Faltan credenciales.' });
  }

  const attempts = await buildLoginAttempts(admin(), trimmed);
  if (attempts.length === 0) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  for (const attempt of attempts) {
    const { data, error } = await anon().auth.signInWithPassword({ ...attempt, password });
    if (!error && data.session) {
      return res.json({
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
      });
    }
  }

  return res.status(401).json({ error: 'Credenciales incorrectas' });
}
