import type { User } from '@supabase/supabase-js';

export type AppRole = 'super_admin' | 'admin' | 'personal_medico';

export function resolveAppRole(user: User | null | undefined): AppRole {
  const role = user?.app_metadata?.role as string | undefined;
  if (role === 'super_admin') return 'super_admin';
  if (role === 'admin') return 'admin';
  return 'personal_medico';
}

export function isAppAdmin(role: AppRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdmin(role: AppRole): boolean {
  return role === 'super_admin';
}

export function canViewStatsDashboard(role: AppRole): boolean {
  return isAppAdmin(role);
}

export function defaultHomeTab(role: AppRole): 'listado' | 'estadisticas' {
  return 'listado';
}
