import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Edit3,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient';

type AdminUser = {
  id: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'registrador' | string;
  disabled: boolean;
  created_at: string;
  last_sign_in_at: string | null;
};

type Notice = { type: 'success' | 'error' | 'info'; message: string } | null;

function identity(user: AdminUser) {
  return user.email || user.phone || user.id.slice(0, 8);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('es') : 'Sin acceso reciente';
}

async function requestUsers(token: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown) {
  const response = await fetch('/api/users', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

function ContactEditModal({
  user,
  isSaving,
  onClose,
  onSave,
}: {
  user: AdminUser;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: { email?: string; phone?: string }) => void;
}) {
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');

  const hasChanges = useMemo(() => {
    return email.trim() !== (user.email || '') || phone.trim().replace(/[\s-]/g, '') !== (user.phone || '');
  }, [email, phone, user.email, user.phone]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasChanges) return;

    const payload: { email?: string; phone?: string } = {};
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');

    if (cleanEmail && cleanEmail !== user.email) payload.email = cleanEmail;
    if (cleanPhone && cleanPhone !== user.phone) payload.phone = cleanPhone;
    onSave(payload);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.form
        onSubmit={handleSubmit}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700">
              <ShieldCheck className="h-3 w-3" /> Usuario
            </span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900">Editar contacto</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Actualiza el correo o teléfono de acceso para <strong className="text-slate-700">{identity(user)}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Mail className="h-3.5 w-3.5" /> Correo
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Phone className="h-3.5 w-3.5" /> Teléfono
            </span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+584141234567"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </label>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            Verifique los datos antes de guardar. Los cambios afectan el acceso del usuario al sistema.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!hasChanges || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/15 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar contacto
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

export default function AdminPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [identityInput, setIdentityInput] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const showNotice = (nextNotice: Notice) => {
    setNotice(nextNotice);
    if (nextNotice) window.setTimeout(() => setNotice(null), 3500);
  };

  const loadUsers = async (accessToken: string) => {
    setIsLoading(true);
    const result = await requestUsers(accessToken, 'GET');
    if (result.error) {
      showNotice({ type: 'error', message: result.error });
      setUsers([]);
    } else {
      setUsers(result.users || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      const admin = session?.user.app_metadata?.role === 'admin';
      setToken(session?.access_token || null);
      setIsAdmin(Boolean(admin));
      if (session?.access_token && admin) loadUsers(session.access_token);
      else setIsLoading(false);
    });
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setIsLoading(true);
    const cleanIdentity = identityInput.trim();
    const credentials = cleanIdentity.includes('@')
      ? { email: cleanIdentity, password }
      : { phone: cleanIdentity.replace(/[\s-]/g, ''), password };

    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error || !data.session) {
      showNotice({ type: 'error', message: 'Credenciales incorrectas.' });
      setIsLoading(false);
      return;
    }

    const admin = data.session.user.app_metadata?.role === 'admin';
    setToken(data.session.access_token);
    setIsAdmin(Boolean(admin));
    if (!admin) {
      showNotice({ type: 'error', message: 'Esta cuenta no tiene permisos de administrador.' });
      setIsLoading(false);
      return;
    }

    await loadUsers(data.session.access_token);
  };

  const handleUpdateContact = async (payload: { email?: string; phone?: string }) => {
    if (!token || !selectedUser) return;
    setIsSaving(true);
    const result = await requestUsers(token, 'PATCH', {
      id: selectedUser.id,
      action: 'contact',
      ...payload,
    });
    setIsSaving(false);

    if (result.error) {
      showNotice({ type: 'error', message: result.error });
      return;
    }

    setSelectedUser(null);
    showNotice({ type: 'success', message: 'Contacto actualizado correctamente.' });
    await loadUsers(token);
  };

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    setToken(null);
    setIsAdmin(false);
    setUsers([]);
  };

  if (!hasSupabaseConfig) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <AlertTriangle className="mb-3 h-7 w-7" />
        <h2 className="text-lg font-bold">Servicio no disponible</h2>
        <p className="mt-2 text-sm leading-relaxed">
          No se pudo iniciar la conexión segura. Contacte al administrador del sistema.
        </p>
      </div>
    );
  }

  if (!token || !isAdmin) {
    return (
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_420px] md:items-center">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700">
            <Lock className="h-3.5 w-3.5" /> Acceso admin
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Panel de administración</h2>
          <p className="max-w-xl text-sm leading-relaxed text-slate-500">
            Gestiona las cuentas autorizadas para acceder al registro clínico.
          </p>
        </div>

        <form onSubmit={handleLogin} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Ingresar como admin</h3>
              <p className="text-xs text-slate-400">Correo o teléfono con rol administrador.</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              value={identityInput}
              onChange={(event) => setIdentityInput(event.target.value)}
              placeholder="correo@ejemplo.com o +58..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>

          {notice && (
            <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {notice.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/15 transition-all hover:bg-blue-700 disabled:bg-slate-300"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Acceder
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xl md:flex-row md:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-100">
            <Users className="h-3.5 w-3.5" /> Administración
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight">Gestión de usuarios</h2>
          <p className="mt-1 text-sm text-slate-300">Administra accesos y datos de contacto de las cuentas del sistema.</p>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10"
        >
          Cerrar sesión admin
        </button>
      </div>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          notice.type === 'success'
            ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
            : notice.type === 'error'
              ? 'border-rose-100 bg-rose-50 text-rose-700'
              : 'border-blue-100 bg-blue-50 text-blue-700'
        }`}>
          {notice.message}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Usuarios del sistema</h3>
            <p className="text-xs text-slate-400">{users.length} cuentas cargadas</p>
          </div>
          <button
            onClick={() => token && loadUsers(token)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
          >
            Actualizar
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm font-semibold text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando usuarios...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Identidad</th>
                  <th className="px-5 py-3 font-bold">Rol</th>
                  <th className="px-5 py-3 font-bold">Estado</th>
                  <th className="px-5 py-3 font-bold">Último acceso</th>
                  <th className="px-5 py-3 font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{identity(user)}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-400">{user.id.slice(0, 12)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        user.disabled ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {user.disabled ? 'Deshabilitado' : 'Activo'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-500">{formatDate(user.last_sign_in_at)}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/10 transition-colors hover:bg-blue-700"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Editar contacto
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <UserPlus className="mr-1 inline h-4 w-4 text-blue-600" />
        La creación de usuarios y cambios de rol se gestionan desde la administración segura del sistema.
      </div>

      <AnimatePresence>
        {selectedUser && (
          <ContactEditModal
            user={selectedUser}
            isSaving={isSaving}
            onClose={() => setSelectedUser(null)}
            onSave={handleUpdateContact}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
