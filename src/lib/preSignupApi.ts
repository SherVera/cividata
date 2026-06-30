import { supabase } from './supabaseClient';
import type { StaffSignupRequest } from '../types';
import type { SignupProfileType } from './authRoles';
import { normalizeSpecialty } from './specialty';
import { isValidAuthPhone, normalizeAuthPhone } from './authPhone';

export type PreSignupPayload = {
  fullName: string;
  contactPhone: string;
  specialty: string;
  workplace: string;
  requestedRole?: SignupProfileType;
  website?: string;
};

export function resolveSignupRequestedRole(payload: PreSignupPayload): SignupProfileType {
  return payload.requestedRole === 'registrador' ? 'registrador' : 'personal_medico';
}

export function resolveSignupSpecialty(payload: PreSignupPayload): string {
  if (resolveSignupRequestedRole(payload) === 'registrador') {
    return 'asistente';
  }
  return normalizeSpecialty(payload.specialty);
}

export function parseFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

export function normalizeSignupPhone(value: string): string {
  return normalizeAuthPhone(value);
}

export function validatePreSignup(payload: PreSignupPayload): string | null {
  if (payload.website?.trim()) return null;
  const { first_name } = parseFullName(payload.fullName);
  if (first_name.length < 2) return 'Indique su nombre.';
  if (!isValidAuthPhone(payload.contactPhone)) return 'Indique un teléfono válido.';
  if (resolveSignupRequestedRole(payload) === 'personal_medico' && normalizeSpecialty(payload.specialty).length < 2) {
    return 'Indique su especialidad o cargo.';
  }
  if (payload.workplace.trim().length < 2) return 'Indique su centro de trabajo.';
  return null;
}

export async function submitPreSignup(
  payload: PreSignupPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (payload.website?.trim()) return { ok: true };

  const validationError = validatePreSignup(payload);
  if (validationError) return { ok: false, error: validationError };

  const body = {
    ...payload,
    specialty: resolveSignupSpecialty(payload),
    requestedRole: resolveSignupRequestedRole(payload),
  };

  try {
    const response = await fetch('/api/pre-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (response.ok) return { ok: true };

    if (response.status === 404) {
      return submitPreSignupDirect(body);
    }

    return { ok: false, error: data.error || 'No se pudo enviar la solicitud. Intente más tarde.' };
  } catch {
    return submitPreSignupDirect(body);
  }
}

async function submitPreSignupDirect(
  payload: PreSignupPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Servicio no disponible.' };

  const { first_name, last_name } = parseFullName(payload.fullName);
  const contact_phone = normalizeSignupPhone(payload.contactPhone);

  const { error } = await supabase.from('staff_signup_requests').insert({
    first_name,
    last_name,
    contact_phone,
    specialty: resolveSignupSpecialty(payload),
    workplace: payload.workplace.trim(),
    requested_role: resolveSignupRequestedRole(payload),
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Ya hay una solicitud pendiente con este teléfono.' };
    }
    return { ok: false, error: 'No se pudo enviar la solicitud. Intente más tarde.' };
  }

  return { ok: true };
}

export async function listPendingSignupRequests(): Promise<StaffSignupRequest[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('staff_signup_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as StaffSignupRequest[];
}

export async function updateSignupRequestStatus(
  id: string,
  status: 'approved' | 'rejected',
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Servicio no disponible.' };

  const { error } = await supabase
    .from('staff_signup_requests')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
