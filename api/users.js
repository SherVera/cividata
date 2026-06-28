// Vercel Serverless Function — gestión de usuarios (solo admin).
// Usa la SERVICE_ROLE key (secreta, solo en el servidor) tras verificar
// que quien llama tiene rol 'admin'. Nunca expongas esta clave al cliente.
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Devuelve el usuario si el token es válido Y es admin; si no, null.
async function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.app_metadata?.role === 'admin' ? data.user : null;
}

const rolNormalizado = (r) => (r === 'admin' ? 'admin' : 'registrador');

export default async function handler(req, res) {
  const me = await requireAdmin(req);
  if (!me) return res.status(401).json({ error: 'No autorizado' });

  if (req.method === 'GET') {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) return res.status(500).json({ error: error.message });
    const users = data.users.map((u) => ({
      id: u.id,
      email: u.email || null,
      phone: u.phone || null,
      role: u.app_metadata?.role || 'registrador',
      disabled: !!u.banned_until && new Date(u.banned_until) > new Date(),
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
    }));
    return res.json({ users });
  }

  if (req.method === 'POST') {
    const { email, phone, password, role } = req.body || {};
    if (!password || (!email && !phone)) {
      return res.status(400).json({ error: 'Se requiere contraseña y correo o teléfono' });
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: email || undefined,
      phone: phone || undefined,
      password,
      email_confirm: !!email,
      phone_confirm: !!phone,
      app_metadata: { role: rolNormalizado(role) },
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true, id: data.user.id });
  }

  if (req.method === 'PATCH') {
    const { id, action, password, role, email, phone } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Falta id' });
    if (id === me.id) return res.status(400).json({ error: 'No puedes modificar tu propia cuenta aquí' });
    let attrs;
    if (action === 'disable') attrs = { ban_duration: '876000h' };
    else if (action === 'enable') attrs = { ban_duration: 'none' };
    else if (action === 'reset' && password) attrs = { password };
    else if (action === 'role' && role) attrs = { app_metadata: { role: rolNormalizado(role) } };
    else if (action === 'contact') {
      attrs = {};
      if (email) { attrs.email = email; attrs.email_confirm = true; }
      if (phone) { attrs.phone = phone; attrs.phone_confirm = true; }
      if (!email && !phone) return res.status(400).json({ error: 'Falta correo o teléfono' });
    } else return res.status(400).json({ error: 'Acción inválida' });
    const { error } = await admin.auth.admin.updateUserById(id, attrs);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
