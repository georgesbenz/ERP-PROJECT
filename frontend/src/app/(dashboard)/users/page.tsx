'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldPlus, X, ChevronRight, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/Header';
import { Badge, statusVariant } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { settingsService, type Permission, type UserPermission, type Role } from '@/services/settings.service';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types/models';
import type { PaginationMeta } from '@/lib/api';

const createUserSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  email:     z.string().email('Invalid email'),
  password:  z.string().min(8, 'Minimum 8 characters'),
  phone:     z.string().optional(),
  roleId:    z.string().optional(),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [permUser, setPermUser] = useState<User | null>(null);

  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const canManageUsers = me?.roles?.some((r: string) =>
    ['Super Admin', 'Admin', 'HR Manager'].includes(r)
  ) ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: async () => {
      const res = await api.get('/users', { params: { page, limit: 20, search: search || undefined } });
      return res.data.data as { data: User[]; meta: PaginationMeta };
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: settingsService.listRoles,
    enabled: canManageUsers,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema) as any,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateUserForm) => api.post('/users', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      reset();
    },
  });

  return (
    <>
      <Header title="Users / Utilisateurs" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search users…"
              className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          {canManageUsers && (
            <Button size="sm" onClick={() => { reset(); setShowCreate(true); }}>
              <UserPlus size={14} /> Add User
            </Button>
          )}
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Roles</Th>
                  <Th>Status</Th>
                  <Th>Last Login</Th>
                  <Th>Joined</Th>
                  {canManageUsers && <Th />}
                </tr>
              </Thead>
              <Tbody>
                {data?.data?.length === 0 && <tr><Td className="text-slate-400">No users</Td></tr>}
                {data?.data?.map((u) => (
                  <Tr key={u.id}>
                    <Td className="font-medium text-slate-800">{u.firstName} {u.lastName}</Td>
                    <Td>{u.email}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r.role.id} variant="purple">{r.role.name}</Badge>
                        ))}
                      </div>
                    </Td>
                    <Td><Badge variant={statusVariant(u.status)}>{u.status}</Badge></Td>
                    <Td>{u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}</Td>
                    <Td>{formatDate(u.createdAt)}</Td>
                    {canManageUsers && (
                      <Td>
                        <button
                          className="flex items-center gap-1 rounded-md border border-indigo-200 px-2 py-1 text-xs text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50"
                          onClick={() => setPermUser(u)}
                          title="Manage permission overrides"
                        >
                          <ShieldPlus size={12} /> Permissions
                          <ChevronRight size={11} />
                        </button>
                      </Td>
                    )}
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>

      {/* ── Create User Modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New User">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
            <Input
              label="Last Name *"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
          </div>
          <Input
            label="Email *"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Password *"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          <Input
            label="Phone"
            type="tel"
            {...register('phone')}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select
              {...register('roleId')}
              className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            >
              <option value="">— No role assigned —</option>
              {(roles as Role[]).filter((r) => r.isActive).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.description ? ` — ${r.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-red-600">
              {(createMutation.error as any)?.response?.data?.message ?? 'Failed to create user'}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Permission Overrides Modal ── */}
      {permUser && (
        <UserPermissionsModal user={permUser} onClose={() => setPermUser(null)} />
      )}
    </>
  );
}

// ─── User Permissions Modal ────────────────────────────────────────────────────

function UserPermissionsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient();
  const [addingPerm, setAddingPerm] = useState(false);
  const [selectedPermId, setSelectedPermId] = useState('');

  const { data: userPerms = [], isLoading: permsLoading } = useQuery({
    queryKey: ['user-perms', user.id],
    queryFn: () => settingsService.getUserPermissions(user.id),
  });

  const { data: allPerms = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: settingsService.listPermissions,
  });

  const addMutation = useMutation({
    mutationFn: (permissionId: string) =>
      settingsService.addUserPermission(user.id, permissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-perms', user.id] });
      setSelectedPermId('');
      setAddingPerm(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (permissionId: string) =>
      settingsService.removeUserPermission(user.id, permissionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-perms', user.id] }),
  });

  const grantedIds = new Set(userPerms.map((up: UserPermission) => up.permissionId));
  const available = allPerms.filter((p: Permission) => !grantedIds.has(p.id));

  const grouped = userPerms.reduce<Record<string, UserPermission[]>>((acc, up: UserPermission) => {
    const mod = up.permission.module;
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(up);
    return acc;
  }, {});

  const ACTION_COLORS: Record<string, string> = {
    READ:            'bg-sky-100 text-sky-700',
    CREATE:          'bg-emerald-100 text-emerald-700',
    UPDATE:          'bg-amber-100 text-amber-700',
    DELETE:          'bg-red-100 text-red-700',
    APPROVE:         'bg-purple-100 text-purple-700',
    MANAGE_ROLES:    'bg-indigo-100 text-indigo-700',
    MANAGE_SETTINGS: 'bg-stone-200 text-slate-700',
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Permission Overrides — ${user.firstName} ${user.lastName}`}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          These permissions are granted <strong>directly</strong> to this user, in addition to their role permissions.
        </p>

        {permsLoading ? (
          <PageLoader />
        ) : Object.keys(grouped).length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-200 py-6 text-center text-sm text-slate-400">
            No extra permissions granted to this user
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([mod, perms]) => (
              <div key={mod} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{mod}</p>
                <div className="flex flex-wrap gap-1.5">
                  {perms.map((up: UserPermission) => (
                    <span
                      key={up.permissionId}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTION_COLORS[up.permission.action] ?? 'bg-stone-100 text-slate-600'}`}
                    >
                      {up.permission.action}
                      <button
                        className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
                        onClick={() => removeMutation.mutate(up.permissionId)}
                        title="Remove this permission"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!addingPerm ? (
          <Button size="sm" variant="outline" onClick={() => setAddingPerm(true)}>
            <ShieldPlus size={13} /> Add Permission Override
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedPermId}
              onChange={(e) => setSelectedPermId(e.target.value)}
              className="flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            >
              <option value="">Select a permission…</option>
              {available.map((p: Permission) => (
                <option key={p.id} value={p.id}>
                  {p.module}:{p.action}{p.description ? ` — ${p.description}` : ''}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!selectedPermId}
              loading={addMutation.isPending}
              onClick={() => selectedPermId && addMutation.mutate(selectedPermId)}
            >
              Grant
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setAddingPerm(false); setSelectedPermId(''); }}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
