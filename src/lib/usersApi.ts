import { useEffect, useState } from 'react';
import type { StaffAuditEntry, StaffProfile } from '../types';

export type AppUserRole = 'super_admin' | 'admin' | 'personal_medico' | 'registrador';

export type DirectoryUser = {
  id: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  profile: StaffProfile;
  role: AppUserRole | string;
  disabled: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  created_by: string | null;
  manageable?: boolean;
  canEditContact?: boolean;
  canEditProfile?: boolean;
  canResetPassword?: boolean;
  canToggle?: boolean;
  canChangeRole?: boolean;
};

export type UsersListResponse = {
  users?: DirectoryUser[];
  role?: string;
  canCreateRoles?: string[];
  error?: string;
};

export type AuditListResponse = {
  audit?: StaffAuditEntry[];
  error?: string;
};

async function usersRequest<T>(
  token: string,
  method: 'GET' | 'POST' | 'PATCH',
  body?: unknown,
  query = '',
): Promise<T> {
  const response = await fetch(`/api/users${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json() as Promise<T>;
}

export async function listDirectoryUsers(token: string): Promise<UsersListResponse> {
  return usersRequest<UsersListResponse>(token, 'GET');
}

export async function listStaffAudit(token: string): Promise<AuditListResponse> {
  return usersRequest<AuditListResponse>(token, 'GET', undefined, '?audit=1');
}

export async function mutateUser(
  token: string,
  body: Record<string, unknown>,
): Promise<{ ok?: boolean; error?: string; id?: string }> {
  return usersRequest(token, 'PATCH', body);
}

export async function createManagedUser(
  token: string,
  body: Record<string, unknown>,
): Promise<{ ok?: boolean; error?: string; id?: string }> {
  return usersRequest(token, 'POST', body);
}

export function directoryDisplayName(user: Pick<DirectoryUser, 'profile' | 'username' | 'email' | 'phone' | 'id'>) {
  const full = [user.profile.first_name, user.profile.last_name].filter(Boolean).join(' ').trim();
  return full || user.username || user.email || user.phone || user.id.slice(0, 8);
}

export function buildStaffNameMap(users: DirectoryUser[]): Map<string, string> {
  return new Map(users.map((user) => [user.id, directoryDisplayName(user)]));
}

export function staffDisplayName(map: Map<string, string>, userId: string | null | undefined): string | null {
  if (!userId) return null;
  return map.get(userId) || `${userId.slice(0, 8)}…`;
}

export function useStaffNameMap(accessToken: string | undefined): Map<string, string> {
  const [map, setMap] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    if (!accessToken) {
      setMap(new Map());
      return;
    }
    let cancelled = false;
    listDirectoryUsers(accessToken).then((result) => {
      if (cancelled || !result.users) return;
      setMap(buildStaffNameMap(result.users));
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return map;
}
