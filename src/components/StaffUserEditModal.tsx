import React, { useMemo, useState } from 'react';
import { Check, Loader2, Mail, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { StaffProfile } from '../types';
import { isValidAuthPhone, normalizeAuthPhone } from '../lib/authPhone';
import { isValidUsername, normalizeUsername, suggestUsername } from '../lib/authUsername';
import { directoryDisplayName, type DirectoryUser } from '../lib/usersApi';
import {
  normalizeSpecialty,
  profileSpecialtyForDisplay,
  profileSpecialtyForSave,
} from '../lib/specialty';

const PROFILE_FIELDS: { key: keyof StaffProfile; label: string; placeholder: string }[] = [
  { key: 'first_name', label: 'Nombres', placeholder: 'Ej. María' },
  { key: 'last_name', label: 'Apellidos', placeholder: 'Ej. Pérez' },
  { key: 'id_document', label: 'Documento de identidad', placeholder: 'V-12345678' },
  { key: 'specialty', label: 'Especialidad / cargo', placeholder: 'Pediatría, enfermería…' },
  { key: 'workplace', label: 'Centro de trabajo', placeholder: 'Hospital, ambulatorio…' },
  { key: 'contact_phone', label: 'Teléfono de contacto', placeholder: '0414-1234567' },
  { key: 'contact_email', label: 'Correo de contacto', placeholder: 'correo@ejemplo.com' },
  { key: 'address', label: 'Dirección', placeholder: 'Opcional' },
  { key: 'professional_license', label: 'Cédula profesional', placeholder: 'Opcional' },
];

type StaffUserEditModalProps = {
  user: DirectoryUser;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    username?: string;
    contact?: { email?: string; phone?: string };
    profile?: Partial<StaffProfile>;
  }) => void;
};

export default function StaffUserEditModal({ user, isSaving, onClose, onSave }: StaffUserEditModalProps) {
  const canEditProfile = user.canEditProfile !== false;
  const canEditContact = user.canEditContact !== false;

  const [username, setUsername] = useState(
    user.username || suggestUsername(user.profile.first_name, user.profile.last_name),
  );
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [profile, setProfile] = useState<StaffProfile>(() => ({
    ...user.profile,
    specialty: profileSpecialtyForDisplay(user.profile.specialty) || user.profile.specialty,
  }));

  const usernameChanged = useMemo(
    () => canEditContact && normalizeUsername(username) !== (user.username || ''),
    [canEditContact, username, user.username],
  );

  const contactChanged = useMemo(() => {
    if (!canEditContact) return false;
    return email.trim() !== (user.email || '') || normalizeAuthPhone(phone) !== (user.phone || '');
  }, [canEditContact, email, phone, user.email, user.phone]);

  const profileChanged = useMemo(() => {
    if (!canEditProfile) return false;
    return PROFILE_FIELDS.some(({ key }) => {
      const current = (profile[key] || '').trim();
      const original = (user.profile[key] || '').trim();
      if (key === 'specialty') return normalizeSpecialty(current) !== normalizeSpecialty(original);
      return current !== original;
    });
  }, [canEditProfile, profile, user.profile]);

  const cleanUsername = normalizeUsername(username);
  const usernameSubmissionValid = !usernameChanged || isValidUsername(cleanUsername);
  const hasChanges = usernameChanged || contactChanged || profileChanged;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasChanges) return;

    const payload: {
      username?: string;
      contact?: { email?: string; phone?: string };
      profile?: Partial<StaffProfile>;
    } = {};

    if (usernameChanged) payload.username = cleanUsername;
    if (contactChanged) {
      payload.contact = { email: email.trim(), phone: normalizeAuthPhone(phone) };
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
              Datos personales y contacto de acceso para{' '}
              <strong className="text-slate-700">{directoryDisplayName(user)}</strong>.
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
          {canEditProfile && (
            <section>
              <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Datos personales (opcional)
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
                  <label key={key} className={key === 'address' ? 'block sm:col-span-2' : 'block'}>
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {label}
                    </span>
                    <input
                      value={profile[key] || ''}
                      onChange={(event) => setProfile((prev) => ({ ...prev, [key]: event.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {canEditContact && (
            <section>
              <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Acceso</h4>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <UserRound className="h-3.5 w-3.5" /> Usuario
                  </span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="maria.perez"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Mail className="h-3.5 w-3.5" /> Correo de acceso
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
                    <Phone className="h-3.5 w-3.5" /> Teléfono de acceso
                  </span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="0414-1234567"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              </div>
            </section>
          )}
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
            disabled={!hasChanges || isSaving || !usernameSubmissionValid}
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
