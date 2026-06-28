// Vercel Serverless Function — gestión de usuarios (admin / super admin).
// Usa la SERVICE_ROLE key (secreta, solo en el servidor) tras verificar
// que quien llama tiene permisos. Nunca expongas esta clave al cliente.
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function userRole(user) {
  return user?.app_metadata?.role || 'registrador';
}

// Devuelve el usuario si el token es válido y tiene rol de gestión; si no, null.
async function requireManager(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return ['super_admin', 'admin'].includes(userRole(data.user)) ? data.user : null;
}

const rolNormalizado = (r) => (r === 'admin' ? 'admin' : 'registrador');
const normalizePhone = (value) => String(value || '').trim().replace(/[\s()-]/g, '');
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isPhone = (value) => /^\+\d{8,15}$/.test(value);

function allowedCreateRole(actorRole, requestedRole) {
  if (actorRole === 'super_admin') return rolNormalizado(requestedRole);
  return 'registrador';
}

function canManageTarget(actorRole, targetRole) {
  if (targetRole === 'super_admin') return false;
  if (actorRole === 'super_admin') return ['admin', 'registrador'].includes(targetRole);
  return targetRole === 'registrador';
}

async function getTargetUser(id) {
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data?.user) return { user: null, error };
  return { user: data.user, error: null };
}

export default async function handler(req, res) {
  const me = await requireManager(req);
  if (!me) return res.status(401).json({ error: 'No autorizado' });
  const actorRole = userRole(me);

  if (req.method === 'GET') {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) return res.status(500).json({ error: error.message });
    const users = data.users
      .filter((u) => userRole(u) !== 'super_admin')
      .map((u) => ({
        id: u.id,
        email: u.email || null,
        phone: u.phone || null,
        role: userRole(u),
        disabled: !!u.banned_until && new Date(u.banned_until) > new Date(),
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        manageable: u.id !== me.id && canManageTarget(actorRole, userRole(u)),
      }));
    return res.json({
      users,
      role: actorRole,
      canCreateRoles: actorRole === 'super_admin' ? ['admin', 'registrador'] : ['registrador'],
    });
  }

  if (req.method === 'POST') {
    const { email, password, role } = req.body || {};
    const phone = normalizePhone(req.body?.phone);
    if (!password || (!email && !phone)) {
      return res.status(400).json({ error: 'Se requiere contraseña y correo o teléfono' });
    }
    if (phone && !isPhone(phone)) {
      return res.status(400).json({ error: 'El teléfono debe estar en formato internacional, por ejemplo +584141234567' });
    }
    const newRole = allowedCreateRole(actorRole, role);
    const { data, error } = await admin.auth.admin.createUser({
      email: email || undefined,
      phone: phone || undefined,
      password,
      email_confirm: !!email,
      phone_confirm: !!phone,
      app_metadata: { role: newRole },
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true, id: data.user.id });
  }

  if (req.method === 'PATCH') {
    const { id, action, password, role, email } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Falta id' });
    if (id === me.id) return res.status(400).json({ error: 'No puedes modificar tu propia cuenta aquí' });
    const { user: target, error: targetError } = await getTargetUser(id);
    if (targetError || !target) return res.status(404).json({ error: 'Usuario no encontrado' });
    const targetRole = userRole(target);
    if (!canManageTarget(actorRole, targetRole)) {
      return res.status(403).json({ error: 'No tienes permisos para modificar esta cuenta' });
    }

    let attrs;
    if (action === 'disable') attrs = { ban_duration: '876000h' };
    else if (action === 'enable') attrs = { ban_duration: 'none' };
    else if (action === 'reset' && password) attrs = { password };
    else if (action === 'role' && role) {
      const nextRole = rolNormalizado(role);
      if (actorRole !== 'super_admin' && nextRole !== 'registrador') {
        return res.status(403).json({ error: 'Solo el super admin puede asignar rol admin' });
      }
      attrs = { app_metadata: { role: nextRole } };
    }
    else if (action === 'contact') {
      attrs = {};
      if (hasOwn(req.body || {}, 'email') && email) { attrs.email = email; attrs.email_confirm = true; }
      if (hasOwn(req.body || {}, 'phone')) {
        const phone = normalizePhone(req.body.phone);
        if (!phone) return res.status(400).json({ error: 'Falta teléfono' });
        if (!isPhone(phone)) {
          return res.status(400).json({ error: 'El teléfono debe estar en formato internacional, por ejemplo +584141234567' });
        }
        attrs.phone = phone;
        attrs.phone_confirm = true;
      }
      if (!attrs.email && !attrs.phone) return res.status(400).json({ error: 'Falta correo o teléfono' });
    } else return res.status(400).json({ error: 'Acción inválida' });
    const { error } = await admin.auth.admin.updateUserById(id, attrs);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
