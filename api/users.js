// Vercel Serverless Function — gestión de usuarios (admin / super admin).
// Usa la SERVICE_ROLE key (secreta, solo en el servidor) tras verificar
// que quien llama tiene permisos. Nunca expongas esta clave al cliente.
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ROLE_PERSONAL_MEDICO = 'personal_medico';

const PROFILE_KEYS = [
  'first_name',
  'last_name',
  'id_document',
  'specialty',
  'workplace',
  'contact_phone',
  'address',
  'professional_license',
];

function userRole(user) {
  const role = user?.app_metadata?.role;
  if (role === 'super_admin' || role === 'admin') return role;
  if (role === 'registrador') return ROLE_PERSONAL_MEDICO;
  return role || ROLE_PERSONAL_MEDICO;
}

function isPersonalMedico(role) {
  return role === ROLE_PERSONAL_MEDICO || role === 'registrador';
}

function staffProfile(user) {
  const raw = user?.user_metadata?.staff_profile;
  if (!raw || typeof raw !== 'object') return {};
  const profile = {};
  for (const key of PROFILE_KEYS) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) profile[key] = value.trim();
  }
  return profile;
}

function extractProfile(body) {
  const profile = {};
  for (const key of PROFILE_KEYS) {
    if (!hasOwn(body || {}, key)) continue;
    const value = String(body[key] ?? '').trim();
    if (value) profile[key] = value;
  }
  return profile;
}

function profileDiff(before, after) {
  const changes = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after), ...PROFILE_KEYS]);
  for (const key of keys) {
    const prev = before[key] ?? null;
    const next = after[key] ?? null;
    if (prev !== next) changes[key] = { before: prev, after: next };
  }
  return changes;
}

async function requireManager(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return ['super_admin', 'admin'].includes(userRole(data.user)) ? data.user : null;
}

const rolNormalizado = (r) => (r === 'admin' ? 'admin' : ROLE_PERSONAL_MEDICO);
const normalizePhone = (value) => String(value || '').trim().replace(/[\s()-]/g, '');
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function allowedCreateRole(actorRole, requestedRole) {
  if (actorRole === 'super_admin') return rolNormalizado(requestedRole);
  return ROLE_PERSONAL_MEDICO;
}

function actionPermissions(actor, target) {
  const actorRole = userRole(actor);
  const targetRole = userRole(target);
  const isSelf = actor.id === target.id;
  const targetIsVisible = targetRole !== 'super_admin' || isSelf;
  const canManageVisibleTarget =
    targetIsVisible &&
    !isSelf &&
    (actorRole === 'super_admin' || (actorRole === 'admin' && isPersonalMedico(targetRole)));

  return {
    visible: targetIsVisible,
    canEditContact: isSelf || canManageVisibleTarget,
    canEditProfile: isSelf || canManageVisibleTarget,
    canResetPassword: isSelf || canManageVisibleTarget,
    canToggle: canManageVisibleTarget,
    canChangeRole: actorRole === 'super_admin' && !isSelf && (targetRole === 'admin' || isPersonalMedico(targetRole)),
  };
}

function serializeUser(u, permissions) {
  return {
    id: u.id,
    email: u.email || null,
    phone: u.phone || null,
    profile: staffProfile(u),
    role: userRole(u),
    disabled: !!u.banned_until && new Date(u.banned_until) > new Date(),
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at || null,
    manageable:
      permissions.canEditContact ||
      permissions.canEditProfile ||
      permissions.canResetPassword ||
      permissions.canToggle ||
      permissions.canChangeRole,
    ...permissions,
  };
}

async function getTargetUser(id) {
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data?.user) return { user: null, error };
  return { user: data.user, error: null };
}

async function logStaffAudit({ targetUserId, action, actor, changes }) {
  const entry = {
    target_user_id: targetUserId,
    action,
    actor: actor.id,
    actor_email: actor.email || null,
    actor_role: userRole(actor),
    changes: changes || {},
  };
  const { error } = await admin.from('staff_audit_log').insert(entry);
  if (error) console.error('staff_audit_log:', error.message);
}

function contactSnapshot(user) {
  return { email: user.email || null, phone: user.phone || null };
}

function hasCredential(email, phone) {
  return Boolean(String(email || '').trim() || normalizePhone(phone));
}

export default async function handler(req, res) {
  const me = await requireManager(req);
  if (!me) return res.status(401).json({ error: 'No autorizado' });
  const actorRole = userRole(me);

  if (req.method === 'GET') {
    if (req.query?.audit === '1') {
      const { data, error } = await admin
        .from('staff_audit_log')
        .select('id,target_user_id,action,actor,actor_email,actor_role,changes,created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ audit: data || [] });
    }

    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) return res.status(500).json({ error: error.message });
    const users = data.users
      .map((u) => ({ user: u, permissions: actionPermissions(me, u) }))
      .filter(({ permissions }) => permissions.visible)
      .map(({ user: u, permissions }) => serializeUser(u, permissions));
    return res.json({
      users,
      role: actorRole,
      canCreateRoles: actorRole === 'super_admin' ? ['admin', ROLE_PERSONAL_MEDICO] : [ROLE_PERSONAL_MEDICO],
    });
  }

  if (req.method === 'POST') {
    const { email, password, role } = req.body || {};
    const phone = normalizePhone(req.body?.phone);
    const profile = extractProfile(req.body);
    if (!password || (!email && !phone)) {
      return res.status(400).json({ error: 'Se requiere contraseña y correo o teléfono' });
    }
    const newRole = allowedCreateRole(actorRole, role);
    const userMetadata = Object.keys(profile).length ? { staff_profile: profile } : {};
    const { data, error } = await admin.auth.admin.createUser({
      email: email || undefined,
      phone: phone || undefined,
      password,
      email_confirm: !!email,
      phone_confirm: !!phone,
      app_metadata: { role: newRole },
      user_metadata: userMetadata,
    });
    if (error) return res.status(400).json({ error: error.message });

    await logStaffAudit({
      targetUserId: data.user.id,
      action: 'create',
      actor: me,
      changes: {
        role: { before: null, after: newRole },
        email: { before: null, after: email || null },
        phone: { before: null, after: phone || null },
        profile: { before: null, after: profile },
      },
    });

    return res.json({ ok: true, id: data.user.id });
  }

  if (req.method === 'PATCH') {
    const { id, action, password, role, email } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Falta id' });
    const { user: target, error: targetError } = await getTargetUser(id);
    if (targetError || !target) return res.status(404).json({ error: 'Usuario no encontrado' });
    const targetPermissions = actionPermissions(me, target);
    if (!targetPermissions.visible) return res.status(404).json({ error: 'Usuario no encontrado' });

    let attrs;
    let auditAction;
    let auditChanges;

    if (action === 'disable') {
      if (!targetPermissions.canToggle) return res.status(403).json({ error: 'No tienes permisos para modificar esta cuenta' });
      attrs = { ban_duration: '876000h' };
      auditAction = 'disable';
      auditChanges = { disabled: { before: false, after: true } };
    } else if (action === 'enable') {
      if (!targetPermissions.canToggle) return res.status(403).json({ error: 'No tienes permisos para modificar esta cuenta' });
      attrs = { ban_duration: 'none' };
      auditAction = 'enable';
      auditChanges = { disabled: { before: true, after: false } };
    } else if (action === 'reset' && password) {
      if (!targetPermissions.canResetPassword) return res.status(403).json({ error: 'No tienes permisos para modificar esta cuenta' });
      attrs = { password };
      auditAction = 'password_reset';
      auditChanges = { password: { before: '[oculto]', after: '[restablecida]' } };
    } else if (action === 'role' && role) {
      if (!targetPermissions.canChangeRole) return res.status(403).json({ error: 'No tienes permisos para modificar esta cuenta' });
      const nextRole = rolNormalizado(role);
      attrs = { app_metadata: { ...target.app_metadata, role: nextRole } };
      auditAction = 'role_change';
      auditChanges = { role: { before: userRole(target), after: nextRole } };
    } else if (action === 'contact') {
      if (!targetPermissions.canEditContact) return res.status(403).json({ error: 'No tienes permisos para modificar esta cuenta' });

      const before = contactSnapshot(target);
      const nextEmail = hasOwn(req.body || {}, 'email') ? String(email ?? '').trim() : before.email;
      const nextPhone = hasOwn(req.body || {}, 'phone') ? normalizePhone(req.body.phone) : before.phone;

      if (!hasCredential(nextEmail, nextPhone)) {
        return res.status(400).json({ error: 'Debe quedar al menos un correo o teléfono de acceso' });
      }

      attrs = {};
      if (hasOwn(req.body || {}, 'email')) {
        if (nextEmail) {
          attrs.email = nextEmail;
          attrs.email_confirm = true;
        } else {
          attrs.email = null;
        }
      }
      if (hasOwn(req.body || {}, 'phone')) {
        if (nextPhone) {
          attrs.phone = nextPhone;
          attrs.phone_confirm = true;
        } else {
          attrs.phone = null;
        }
      }

      if (!hasOwn(req.body || {}, 'email') && !hasOwn(req.body || {}, 'phone')) {
        return res.status(400).json({ error: 'Sin cambios de contacto' });
      }

      auditAction = 'contact_update';
      auditChanges = {
        email: { before: before.email, after: nextEmail || null },
        phone: { before: before.phone, after: nextPhone || null },
      };
    } else if (action === 'profile') {
      if (!targetPermissions.canEditProfile) return res.status(403).json({ error: 'No tienes permisos para modificar esta cuenta' });

      const before = staffProfile(target);
      const after = { ...before };
      let touched = false;

      for (const key of PROFILE_KEYS) {
        if (!hasOwn(req.body || {}, key)) continue;
        touched = true;
        const value = String(req.body[key] ?? '').trim();
        if (value) after[key] = value;
        else delete after[key];
      }

      if (!touched) return res.status(400).json({ error: 'Sin cambios de perfil' });

      auditChanges = profileDiff(before, after);
      if (Object.keys(auditChanges).length === 0) {
        return res.status(400).json({ error: 'Sin cambios de perfil' });
      }

      attrs = {
        user_metadata: {
          ...target.user_metadata,
          staff_profile: after,
        },
      };
      auditAction = 'profile_update';
    } else {
      return res.status(400).json({ error: 'Acción inválida' });
    }

    const { error } = await admin.auth.admin.updateUserById(id, attrs);
    if (error) return res.status(400).json({ error: error.message });

    if (auditAction && auditChanges) {
      await logStaffAudit({
        targetUserId: id,
        action: auditAction,
        actor: me,
        changes: auditChanges,
      });
    }

    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
