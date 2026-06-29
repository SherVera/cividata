import type { User } from '@supabase/supabase-js';

export type AppRole = 'super_admin' | 'admin' | 'personal_medico' | 'registrador';

export function resolveAppRole(user: User | null | undefined): AppRole {
  const role = user?.app_metadata?.role as string | undefined;
  if (role === 'super_admin') return 'super_admin';
  if (role === 'admin') return 'admin';
  if (role === 'registrador') return 'registrador';
  return 'personal_medico';
}

export function isAppAdmin(role: AppRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdmin(role: AppRole): boolean {
  return role === 'super_admin';
}

export function isRegistrador(role: AppRole): boolean {
  return role === 'registrador';
}

export function isPersonalMedico(role: AppRole): boolean {
  return role === 'personal_medico';
}

/** Puede editar fichas de paciente y registrar evolución clínica. */
export function canManageClinicalData(role: AppRole): boolean {
  return isPersonalMedico(role) || isAppAdmin(role);
}

export function defaultHomeTab(role: AppRole): 'listado' | 'estadisticas' {
  if (isRegistrador(role)) return 'listado';
  return 'estadisticas';
}
