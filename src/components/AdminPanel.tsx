import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Edit3,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  KeyRound,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient';
import type { StaffAuditEntry, StaffProfile, StaffSignupRequest } from '../types';
import { listPendingSignupRequests, updateSignupRequestStatus } from '../lib/preSignupApi';
import ListPagination from './ListPagination';
import SelectField from './SelectField';
import { paginate, TABLE_LIST_PAGE_SIZE } from '../lib/pagination';
import { ROLE_OPTIONS } from '../lib/selectOptions';
import {
  normalizeSpecialty,
  profileSpecialtyForDisplay,
  profileSpecialtyForSave,
} from '../lib/specialty';

type UserRole = 'super_admin' | 'admin' | 'personal_medico' | 'registrador';

type AdminUser = {
  id: string;
  email: string | null;
  phone: string | null;
  profile: StaffProfile;
  role: UserRole | string;
  disabled: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  manageable?: boolean;
  canEditContact?: boolean;
  canEditProfile?: boolean;
  canResetPassword?: boolean;
  canToggle?: boolean;
  canChangeRole?: boolean;
};

const PROFILE_FIELDS: { key: keyof StaffProfile; label: string; placeholder: string }[] = [
  { key: 'first_name', label: 'Nombres', placeholder: 'Ej. María' },
  { key: 'last_name', label: 'Apellidos', placeholder: 'Ej. Pérez' },
  { key: 'id_document', label: 'Documento de identidad', placeholder: 'V-12345678' },
  { key: 'specialty', label: 'Especialidad / cargo', placeholder: 'Pediatría, enfermería…' },
  { key: 'workplace', label: 'Centro de trabajo', placeholder: 'Hospital, ambulatorio…' },
  { key: 'contact_phone', label: 'Teléfono de contacto', placeholder: '+584141234567' },
  { key: 'address', label: 'Dirección', placeholder: 'Opcional' },
  { key: 'professional_license', label: 'Cédula profesional', placeholder: 'Opcional' },
];

type Notice = { type: 'success' | 'error' | 'info'; message: string } | null;

function displayName(user: AdminUser) {
  const full = [user.profile.first_name, user.profile.last_name].filter(Boolean).join(' ').trim();
  return full || user.email || user.phone || user.id.slice(0, 8);
}

function identity(user: AdminUser) {
  return displayName(user);
}

function profileSummary(user: AdminUser) {
  const parts = [
    user.profile.id_document,
    user.profile.specialty ? profileSpecialtyForDisplay(user.profile.specialty) : '',
    user.profile.workplace,
  ].filter(Boolean);
  return parts.join(' · ');
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    create: 'Alta de usuario',
    contact_update: 'Contacto de acceso',
    profile_update: 'Datos personales',
    role_change: 'Cambio de rol',
    password_reset: 'Contraseña',
    enable: 'Activación',
    disable: 'Deshabilitación',
  };
  return labels[action] || action;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('es') : 'Sin acceso reciente';
}

function signupDisplayName(request: StaffSignupRequest) {
  return [request.first_name, request.last_name].filter(Boolean).join(' ').trim();
}

function formatSignupDate(value: string) {
  return new Date(value).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
}

function normalizePhone(value: string) {
  return value.trim().replace(/[\s()-]/g, '');
}

function roleLabel(role: string) {
  if (role === 'super_admin') return 'Super admin';
  if (role === 'admin') return 'Admin';
  if (role === 'registrador') return 'Registrador';
  if (role === 'personal_medico') return 'Personal médico';
  return role;
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

async function requestAudit(token: string) {
  const response = await fetch('/api/users?audit=1', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

function UserEditModal({
  user,
  isSaving,
  onClose,
  onSave,
}: {
  user: AdminUser;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: { contact?: { email?: string; phone?: string }; profile?: Partial<StaffProfile> }) => void;
}) {
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [profile, setProfile] = useState<StaffProfile>(() => ({
    ...user.profile,
    specialty: profileSpecialtyForDisplay(user.profile.specialty) || user.profile.specialty,
  }));

  const contactChanged = useMemo(() => {
    return email.trim() !== (user.email || '') || normalizePhone(phone) !== (user.phone || '');
  }, [email, phone, user.email, user.phone]);

  const profileChanged = useMemo(() => {
    return PROFILE_FIELDS.some(({ key }) => {
      const current = (profile[key] || '').trim();
      const original = (user.profile[key] || '').trim();
      if (key === 'specialty') {
        return normalizeSpecialty(current) !== normalizeSpecialty(original);
      }
      return current !== original;
    });
  }, [profile, user.profile]);

  const hasChanges = contactChanged || profileChanged;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasChanges) return;

    const payload: { contact?: { email?: string; phone?: string }; profile?: Partial<StaffProfile> } = {};

    if (contactChanged) {
      payload.contact = {
        email: email.trim(),
        phone: normalizePhone(phone),
      };
    }

    if (profileChanged) {
      const nextProfile: Partial<StaffProfile> = {};
      for (const { key } of PROFILE_FIELDS) {
        const raw = (profile[key] || '').trim();
        nextProfile[key] = key === 'specialty' ? profileSpecialtyForSave(raw) : raw;
      }
      payload.profile = nextProfile;
    }

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
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700">
              <ShieldCheck className="h-3 w-3" /> Usuario
            </span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900">Editar usuario</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Datos personales opcionales y contacto de acceso para <strong className="text-slate-700">{displayName(user)}</strong>.
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

        <div className="space-y-6 px-6 py-5">
          <section>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Datos personales (opcional)</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
                <label key={key} className={key === 'address' ? 'block sm:col-span-2' : 'block'}>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                  <input
                    value={profile[key] || ''}
                    onChange={(event) => setProfile((prev) => ({ ...prev, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Dejar un campo vacío y guardar lo oculta del perfil. Los cambios quedan registrados en auditoría.
            </p>
          </section>

          <section>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Contacto de acceso</h4>
            <div className="space-y-3">
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
            </div>
          </section>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            Debe permanecer al menos un correo o teléfono de acceso. Las eliminaciones y cambios sensibles quedan en el registro de auditoría.
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
            Guardar cambios
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function CreateUserModal({
  roles,
  isSaving,
  initialValues,
  onClose,
  onSave,
}: {
  roles: string[];
  isSaving: boolean;
  initialValues?: { phone?: string; profile?: Partial<StaffProfile> };
  onClose: () => void;
  onSave: (payload: {
    email?: string;
    phone?: string;
    password: string;
    role: string;
    profile?: Partial<StaffProfile>;
  }) => void;
}) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(roles[0] || 'personal_medico');
  const [profile, setProfile] = useState<StaffProfile>(() => {
    const base = initialValues?.profile || {};
    return {
      ...base,
      specialty: base.specialty ? profileSpecialtyForDisplay(base.specialty) : base.specialty,
    };
  });
  const cleanPhone = normalizePhone(phone);
  const canSubmit = password.length >= 6 && (!!email.trim() || !!cleanPhone);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const nextProfile: Partial<StaffProfile> = {};
    for (const { key } of PROFILE_FIELDS) {
      const value = (profile[key] || '').trim();
      if (value) nextProfile[key] = key === 'specialty' ? profileSpecialtyForSave(value) : value;
    }

    onSave({
      email: email.trim() || undefined,
      phone: cleanPhone || undefined,
      password,
      role,
      profile: Object.keys(nextProfile).length ? nextProfile : undefined,
    });
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
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700">
              <UserPlus className="h-3 w-3" /> Nuevo acceso
            </span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900">Crear usuario</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Registre una cuenta y, si lo desea, datos personales para identificación y auditoría.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Acceso</h4>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Mail className="h-3.5 w-3.5" /> Correo
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Lock className="h-3.5 w-3.5" /> Contraseña temporal
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Rol</span>
                <SelectField
                  value={role}
                  onChange={setRole}
                  options={roles.map((availableRole) => ({
                    value: availableRole,
                    label: roleLabel(availableRole),
                  }))}
                  accent="blue"
                />
                {role === 'registrador' && (
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    Personal no médico autorizado por una entidad o el equipo clínico para registrar pacientes en campo.
                  </p>
                )}
              </label>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Datos personales (opcional)</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
                <label key={key} className={key === 'address' ? 'block sm:col-span-2' : 'block'}>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                  <input
                    value={profile[key] || ''}
                    onChange={(event) => setProfile((prev) => ({ ...prev, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Crear usuario
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function PasswordResetModal({
  user,
  isSaving,
  onClose,
  onSave,
}: {
  user: AdminUser;
  isSaving: boolean;
  onClose: () => void;
  onSave: (password: string) => void;
}) {
  const [password, setPassword] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) return;
    onSave(password);
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
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700">
              <KeyRound className="h-3 w-3" /> Seguridad
            </span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900">Cambiar contraseña</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Nueva contraseña para <strong className="text-slate-700">{identity(user)}</strong>.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={password.length < 6 || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar contraseña
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

interface AdminPanelProps {
  onBack?: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [canCreateRoles, setCanCreateRoles] = useState<string[]>([]);
  const [identityInput, setIdentityInput] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLog, setAuditLog] = useState<StaffAuditEntry[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [signupPrefill, setSignupPrefill] = useState<StaffSignupRequest | null>(null);
  const [pendingSignups, setPendingSignups] = useState<StaffSignupRequest[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

  const showNotice = (nextNotice: Notice) => {
    setNotice(nextNotice);
    if (nextNotice) window.setTimeout(() => setNotice(null), 3500);
  };

  const loadPendingSignups = async () => {
    const requests = await listPendingSignupRequests();
    setPendingSignups(requests);
  };

  const loadUsers = async (accessToken: string) => {
    setIsLoading(true);
    const [result, auditResult] = await Promise.all([
      requestUsers(accessToken, 'GET'),
      requestAudit(accessToken),
      loadPendingSignups(),
    ]);
    if (result.error) {
      showNotice({ type: 'error', message: result.error });
      setUsers([]);
    } else {
      setUsers(result.users || []);
      setCurrentRole((result.role || null) as UserRole | null);
      setCanCreateRoles(result.canCreateRoles || []);
    }
    if (!auditResult.error) setAuditLog(auditResult.audit || []);
    setIsLoading(false);
  };

  const usersPagination = useMemo(
    () => paginate(users, usersPage, TABLE_LIST_PAGE_SIZE),
    [users, usersPage]
  );

  const auditPagination = useMemo(
    () => paginate(auditLog, auditPage, TABLE_LIST_PAGE_SIZE),
    [auditLog, auditPage]
  );

  useEffect(() => {
    setUsersPage(1);
  }, [users.length]);

  useEffect(() => {
    if (usersPage > usersPagination.totalPages) {
      setUsersPage(usersPagination.totalPages);
    }
  }, [usersPage, usersPagination.totalPages]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditLog.length]);

  useEffect(() => {
    if (auditPage > auditPagination.totalPages) {
      setAuditPage(auditPagination.totalPages);
    }
  }, [auditPage, auditPagination.totalPages]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      const role = session?.user.app_metadata?.role as UserRole | undefined;
      const admin = role === 'admin' || role === 'super_admin';
      setToken(session?.access_token || null);
      setIsAdmin(Boolean(admin));
      setCurrentRole(role || null);
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
      : { phone: cleanIdentity.replace(/[\s()-]/g, ''), password };

    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error || !data.session) {
      showNotice({ type: 'error', message: 'Credenciales incorrectas.' });
      setIsLoading(false);
      return;
    }

    const role = data.session.user.app_metadata?.role as UserRole | undefined;
    const admin = role === 'admin' || role === 'super_admin';
    setToken(data.session.access_token);
    setIsAdmin(Boolean(admin));
    setCurrentRole(role || null);
    if (!admin) {
      showNotice({ type: 'error', message: 'Esta cuenta no tiene permisos de administrador.' });
      setIsLoading(false);
      return;
    }

    await loadUsers(data.session.access_token);
  };

  const handleUpdateUser = async (payload: {
    contact?: { email?: string; phone?: string };
    profile?: Partial<StaffProfile>;
  }) => {
    if (!token || !selectedUser) return;
    setIsSaving(true);

    if (payload.contact) {
      const result = await requestUsers(token, 'PATCH', {
        id: selectedUser.id,
        action: 'contact',
        ...payload.contact,
      });
      if (result.error) {
        setIsSaving(false);
        showNotice({ type: 'error', message: result.error });
        return;
      }
    }

    if (payload.profile) {
      const result = await requestUsers(token, 'PATCH', {
        id: selectedUser.id,
        action: 'profile',
        ...payload.profile,
      });
      if (result.error) {
        setIsSaving(false);
        showNotice({ type: 'error', message: result.error });
        return;
      }
    }

    setIsSaving(false);
    setSelectedUser(null);
    showNotice({ type: 'success', message: 'Usuario actualizado correctamente.' });
    await loadUsers(token);
  };

  const handleCreateUser = async (payload: {
    email?: string;
    phone?: string;
    password: string;
    role: string;
    profile?: Partial<StaffProfile>;
  }) => {
    if (!token) return;
    const signupId = signupPrefill?.id;
    setIsSaving(true);
    const result = await requestUsers(token, 'POST', payload);
    setIsSaving(false);

    if (result.error) {
      showNotice({ type: 'error', message: result.error });
      return;
    }

    if (signupId) {
      const statusResult = await updateSignupRequestStatus(signupId, 'approved');
      if (!statusResult.ok) {
        showNotice({
          type: 'info',
          message: 'Usuario creado, pero no se pudo marcar la solicitud como aprobada.',
        });
      }
    }

    setShowCreateUser(false);
    setSignupPrefill(null);
    showNotice({ type: 'success', message: 'Usuario creado correctamente.' });
    await loadUsers(token);
  };

  const handleRejectSignup = async (request: StaffSignupRequest) => {
    if (!token) return;
    setIsSaving(true);
    const result = await updateSignupRequestStatus(request.id, 'rejected');
    setIsSaving(false);

    if (!result.ok) {
      showNotice({ type: 'error', message: result.error || 'No se pudo rechazar la solicitud.' });
      return;
    }

    showNotice({ type: 'success', message: 'Solicitud rechazada.' });
    await loadPendingSignups();
  };

  const handleApproveSignup = (request: StaffSignupRequest) => {
    setSignupPrefill(request);
    setShowCreateUser(true);
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!token || !resetUser) return;
    setIsSaving(true);
    const result = await requestUsers(token, 'PATCH', {
      id: resetUser.id,
      action: 'reset',
      password: newPassword,
    });
    setIsSaving(false);

    if (result.error) {
      showNotice({ type: 'error', message: result.error });
      return;
    }

    setResetUser(null);
    showNotice({ type: 'success', message: 'Contraseña actualizada correctamente.' });
  };

  const handleRoleChange = async (user: AdminUser, nextRole: string) => {
    if (!token || user.role === nextRole) return;
    setIsSaving(true);
    const result = await requestUsers(token, 'PATCH', {
      id: user.id,
      action: 'role',
      role: nextRole,
    });
    setIsSaving(false);

    if (result.error) {
      showNotice({ type: 'error', message: result.error });
      return;
    }

    showNotice({ type: 'success', message: 'Rol actualizado correctamente.' });
    await loadUsers(token);
  };

  const handleToggleUser = async (user: AdminUser) => {
    if (!token) return;
    setIsSaving(true);
    const result = await requestUsers(token, 'PATCH', {
      id: user.id,
      action: user.disabled ? 'enable' : 'disable',
    });
    setIsSaving(false);

    if (result.error) {
      showNotice({ type: 'error', message: result.error });
      return;
    }

    showNotice({ type: 'success', message: user.disabled ? 'Usuario activado correctamente.' : 'Usuario deshabilitado correctamente.' });
    await loadUsers(token);
  };

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    setToken(null);
    setIsAdmin(false);
    setCurrentRole(null);
    setCanCreateRoles([]);
    setUsers([]);
    setAuditLog([]);
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
              <p className="text-xs text-slate-400">Correo o teléfono con rol autorizado.</p>
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
          <p className="mt-1 text-sm text-slate-300">
            {currentRole === 'super_admin'
              ? 'Gestiona administradores y personal médico. Las cuentas super admin permanecen protegidas.'
              : 'Gestiona personal médico. Las cuentas admin y super admin están protegidas.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Pantalla principal
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10"
          >
            Cerrar sesión admin
          </button>
        </div>
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

      {pendingSignups.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 shadow-sm">
          <div className="border-b border-amber-100 px-5 py-4">
            <h3 className="text-sm font-bold text-amber-950">Solicitudes de acceso</h3>
            <p className="text-xs text-amber-800/80">
              {pendingSignups.length} pendiente(s). Apruebe para crear la cuenta; hasta entonces no pueden entrar.
            </p>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingSignups.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{signupDisplayName(request)}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {profileSpecialtyForDisplay(request.specialty)} · {request.workplace}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    {request.contact_phone} · {formatSignupDate(request.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApproveSignup(request)}
                    disabled={isSaving}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectSignup(request)}
                    disabled={isSaving}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Usuarios del sistema</h3>
            <p className="text-xs text-slate-400">{users.length} cuentas cargadas</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSignupPrefill(null);
                setShowCreateUser(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/10 hover:bg-blue-700"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Nuevo usuario
            </button>
            <button
              onClick={() => token && loadUsers(token)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm font-semibold text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando usuarios...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-5 pt-4">
              <ListPagination
                page={usersPagination.page}
                totalPages={usersPagination.totalPages}
                totalItems={usersPagination.total}
                startIndex={usersPagination.startIndex}
                endIndex={usersPagination.endIndex}
                onPageChange={setUsersPage}
              />
            </div>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Identidad</th>
                  <th className="px-5 py-3 font-bold">Datos personales</th>
                  <th className="px-5 py-3 font-bold">Contacto acceso</th>
                  <th className="px-5 py-3 font-bold">Rol</th>
                  <th className="px-5 py-3 font-bold">Estado</th>
                  <th className="px-5 py-3 font-bold">Último acceso</th>
                  <th className="px-5 py-3 font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersPagination.pageItems.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{displayName(user)}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-400">{user.id.slice(0, 12)}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {profileSummary(user) ? (
                        <div className="max-w-[220px] leading-relaxed">{profileSummary(user)}</div>
                      ) : (
                        <span className="text-slate-300">Sin datos adicionales</span>
                      )}
                      {user.profile.contact_phone && (
                        <div className="mt-1 font-mono text-[11px] text-slate-400">{user.profile.contact_phone}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div className="font-medium">{user.email || 'Sin correo'}</div>
                      <div className="mt-1 font-mono">{user.phone || 'Sin teléfono'}</div>
                    </td>
                    <td className="px-5 py-4">
                      {user.canChangeRole && currentRole === 'super_admin' ? (
                        <SelectField
                          value={user.role}
                          onChange={(nextRole) => handleRoleChange(user, nextRole)}
                          disabled={isSaving}
                          options={ROLE_OPTIONS}
                          size="sm"
                          accent="blue"
                          className="min-w-[9.5rem]"
                        />
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin'
                            ? 'bg-blue-50 text-blue-700'
                            : user.role === 'registrador'
                              ? 'bg-teal-50 text-teal-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {roleLabel(user.role)}
                        </span>
                      )}
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
                      {user.canEditContact || user.canEditProfile || user.canResetPassword || user.canToggle ? (
                        <div className="flex flex-wrap gap-2">
                          {(user.canEditContact || user.canEditProfile) && (
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/10 transition-colors hover:bg-blue-700"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Editar
                            </button>
                          )}
                          {user.canResetPassword && (
                            <button
                              onClick={() => setResetUser(user)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              Clave
                            </button>
                          )}
                          {user.canToggle && (
                            <button
                              onClick={() => handleToggleUser(user)}
                              disabled={isSaving}
                              className={`inline-flex items-center rounded-xl px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                user.disabled
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              {user.disabled ? 'Activar' : 'Deshabilitar'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && (
          <div className="px-5 pb-5">
            <ListPagination
              page={usersPagination.page}
              totalPages={usersPagination.totalPages}
              totalItems={usersPagination.total}
              startIndex={usersPagination.startIndex}
              endIndex={usersPagination.endIndex}
              onPageChange={setUsersPage}
            />
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Auditoría de usuarios</h3>
            <p className="text-xs text-slate-400">
              Registro de altas, cambios de contacto, datos personales, roles y contraseñas.
            </p>
          </div>
          <button
            onClick={() => token && loadUsers(token)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
          >
            Actualizar
          </button>
        </div>

        {auditLog.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            Sin registros de auditoría todavía. Ejecute el SQL nuevo en Supabase si la tabla no existe.
          </div>
        ) : (
          <div className="space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Fecha</th>
                  <th className="px-5 py-3 font-bold">Acción</th>
                  <th className="px-5 py-3 font-bold">Actor</th>
                  <th className="px-5 py-3 font-bold">Usuario afectado</th>
                  <th className="px-5 py-3 font-bold">Cambios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditPagination.pageItems.map((entry) => {
                  const target = users.find((user) => user.id === entry.target_user_id);
                  const changeSummary = Object.entries(entry.changes || {})
                    .map(([field, value]) => {
                      const diff = value as { before: unknown; after: unknown };
                      if (diff.before == null && diff.after != null) return `${field}: +`;
                      if (diff.before != null && diff.after == null) return `${field}: eliminado`;
                      return `${field}: modificado`;
                    })
                    .join(', ');

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 text-xs text-slate-500">{formatDate(entry.created_at)}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-slate-700">{auditActionLabel(entry.action)}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        <div>{entry.actor_email || 'Sin correo'}</div>
                        <div className="text-[10px] uppercase text-slate-400">{entry.actor_role}</div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {target ? displayName(target) : entry.target_user_id.slice(0, 12)}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{changeSummary || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-5">
            <ListPagination
              page={auditPagination.page}
              totalPages={auditPagination.totalPages}
              totalItems={auditPagination.total}
              startIndex={auditPagination.startIndex}
              endIndex={auditPagination.endIndex}
              onPageChange={setAuditPage}
            />
          </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <UserPlus className="mr-1 inline h-4 w-4 text-blue-600" />
        Los datos personales son opcionales. Borrar un campo lo oculta del perfil, pero el historial permanece en auditoría.
      </div>

      <AnimatePresence>
        {showCreateUser && (
          <div key={signupPrefill?.id || 'new-user'}>
            <CreateUserModal
              roles={canCreateRoles.length > 0 ? canCreateRoles : ['personal_medico']}
              isSaving={isSaving}
              initialValues={
                signupPrefill
                  ? {
                      phone: signupPrefill.contact_phone,
                      profile: {
                        first_name: signupPrefill.first_name,
                        last_name: signupPrefill.last_name,
                        specialty: signupPrefill.specialty,
                        workplace: signupPrefill.workplace,
                        contact_phone: signupPrefill.contact_phone,
                      },
                    }
                  : undefined
              }
              onClose={() => {
                setShowCreateUser(false);
                setSignupPrefill(null);
              }}
              onSave={handleCreateUser}
            />
          </div>
        )}
        {selectedUser && (
          <UserEditModal
            user={selectedUser}
            isSaving={isSaving}
            onClose={() => setSelectedUser(null)}
            onSave={handleUpdateUser}
          />
        )}
        {resetUser && (
          <PasswordResetModal
            user={resetUser}
            isSaving={isSaving}
            onClose={() => setResetUser(null)}
            onSave={handleResetPassword}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
