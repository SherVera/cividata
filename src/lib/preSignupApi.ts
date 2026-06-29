import { supabase } from './supabaseClient';
import type { StaffSignupRequest } from '../types';

export type PreSignupPayload = {
  fullName: string;
  contactPhone: string;
  specialty: string;
  workplace: string;
  website?: string;
};

export function parseFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

export function normalizeSignupPhone(value: string): string {
  return value.trim().replace(/[\s()-]/g, '');
}

export function validatePreSignup(payload: PreSignupPayload): string | null {
  if (payload.website?.trim()) return null;
  const { first_name } = parseFullName(payload.fullName);
  if (first_name.length < 2) return 'Indique su nombre.';
  if (normalizeSignupPhone(payload.contactPhone).length < 10) return 'Indique un teléfono válido.';
  if (payload.specialty.trim().length < 2) return 'Indique su especialidad o cargo.';
  if (payload.workplace.trim().length < 2) return 'Indique su centro de trabajo.';
  return null;
}

export async function submitPreSignup(
  payload: PreSignupPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (payload.website?.trim()) return { ok: true };

  const validationError = validatePreSignup(payload);
  if (validationError) return { ok: false, error: validationError };

  try {
    const response = await fetch('/api/pre-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (response.ok) return { ok: true };

    if (response.status === 404) {
      return submitPreSignupDirect(payload);
    }

    return { ok: false, error: data.error || 'No se pudo enviar la solicitud. Intente más tarde.' };
  } catch {
    return submitPreSignupDirect(payload);
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
    specialty: payload.specialty.trim(),
    workplace: payload.workplace.trim(),
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
