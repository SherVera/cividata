import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Edit3, Loader2, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
import { appRoleLabel } from '../lib/authRoles';
import {
  directoryDisplayName,
  listDirectoryUsers,
  mutateUser,
  type DirectoryUser,
} from '../lib/usersApi';
import ListPagination from './ListPagination';
import { paginate, useListPageSize } from '../lib/pagination';
import StaffUserEditModal from './StaffUserEditModal';

type TeamPanelProps = {
  onBack?: () => void;
  currentUserId?: string | null;
};

export default function TeamPanel({ onBack, currentUserId }: TeamPanelProps) {
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useListPageSize();

  const loadUsers = async (accessToken: string) => {
    setIsLoading(true);
    setError('');
    const result = await listDirectoryUsers(accessToken);
    if (result.error) {
      setError(result.error);
      setUsers([]);
    } else {
      setUsers(result.users || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token || null;
      setToken(accessToken);
      if (accessToken) void loadUsers(accessToken);
      else setIsLoading(false);
    });
  }, []);

  const pagination = useMemo(() => paginate(users, page, pageSize), [users, page, pageSize]);

  useEffect(() => {
    if (page > pagination.totalPages) setPage(pagination.totalPages);
  }, [page, pagination.totalPages]);

  const handleSave = async (payload: {
    username?: string;
    contact?: { email?: string; phone?: string };
    profile?: Record<string, string>;
  }) => {
    if (!token || !selectedUser) return;
    setIsSaving(true);

    if (payload.username) {
      const result = await mutateUser(token, {
        id: selectedUser.id,
        action: 'username',
        username: payload.username,
      });
      if (result.error) {
        setIsSaving(false);
        setError(result.error);
        return;
      }
    }

    if (payload.contact) {
      const result = await mutateUser(token, {
        id: selectedUser.id,
        action: 'contact',
        ...payload.contact,
      });
      if (result.error) {
        setIsSaving(false);
        setError(result.error);
        return;
      }
    }

    if (payload.profile) {
      const result = await mutateUser(token, {
        id: selectedUser.id,
        action: 'profile',
        ...payload.profile,
      });
      if (result.error) {
        setIsSaving(false);
        setError(result.error);
        return;
      }
    }

    setIsSaving(false);
    setSelectedUser(null);
    await loadUsers(token);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          )}
          <div>
            <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900">
              <Users className="h-5 w-5 text-blue-600" />
              Equipo
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Directorio del personal. Solo puede editar su propia cuenta; los administradores gestionan cuentas de menor nivel.
            </p>
          </div>
        </div>
        {token && (
          <button
            type="button"
            onClick={() => void loadUsers(token)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
          >
            Actualizar
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Cargando equipo…
          </div>
        ) : (
          <>
            <div className="border-b border-slate-100 px-5 py-4">
              <ListPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-bold">Nombre</th>
                    <th className="px-5 py-3 font-bold">Rol</th>
                    <th className="px-5 py-3 font-bold">Especialidad / centro</th>
                    <th className="px-5 py-3 font-bold">Contacto</th>
                    <th className="px-5 py-3 font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.pageItems.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const canEdit = user.canEditContact || user.canEditProfile;
                    return (
                      <tr key={user.id} className={isSelf ? 'bg-blue-50/40' : undefined}>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">
                            {directoryDisplayName(user)}
                            {isSelf && (
                              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                Usted
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-slate-400">{user.username || 'Sin usuario'}</div>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">{appRoleLabel(user.role)}</td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {[user.profile.specialty, user.profile.workplace].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {user.profile.contact_phone || user.phone || user.email || '—'}
                        </td>
                        <td className="px-5 py-4">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => setSelectedUser(user)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              {isSelf ? 'Mi perfil' : 'Editar'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">Solo lectura</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selectedUser && (
        <StaffUserEditModal
          user={selectedUser}
          isSaving={isSaving}
          onClose={() => setSelectedUser(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
