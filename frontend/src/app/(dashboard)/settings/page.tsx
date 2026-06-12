'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, GitBranch, ShieldCheck, User, Plus, Trash2, Check,
  Lock, Pencil, Users, ChevronRight, Shield, Copy, ToggleLeft, ToggleRight,
  Percent,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import {
  settingsService,
  type Branch, type Role, type Permission, type TaxCode,
} from '@/services/settings.service';
import { useAuthStore, type AuthUser } from '@/store/auth.store';

type Tab = 'profile' | 'company' | 'branches' | 'roles' | 'taxes';

const companySchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});
type CompanyForm = z.infer<typeof companySchema>;

const branchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});
type BranchForm = z.infer<typeof branchSchema>;

const roleSchema = z.object({ name: z.string().min(1), description: z.string().optional() });
type RoleForm = z.infer<typeof roleSchema>;

// All possible actions across the system
const ALL_ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'] as const;

// Human-readable module labels
const MODULE_LABELS: Record<string, string> = {
  users: 'Users',
  inventory: 'Inventory',
  sales: 'Sales',
  purchases: 'Purchases',
  finance: 'Finance',
  crm: 'CRM',
  analytics: 'Analytics',
  budgeting: 'Budgeting',
};

// Colour per action for the chips
const ACTION_COLORS: Record<string, string> = {
  READ:    'bg-sky-50 border-sky-300 text-sky-700',
  CREATE:  'bg-emerald-50 border-emerald-300 text-emerald-700',
  UPDATE:  'bg-amber-50 border-amber-300 text-amber-700',
  DELETE:  'bg-red-50 border-red-300 text-red-700',
  APPROVE: 'bg-purple-50 border-purple-300 text-purple-700',
};
const ACTION_CHECKED: Record<string, string> = {
  READ:    'bg-sky-500 border-sky-500 text-white',
  CREATE:  'bg-emerald-500 border-emerald-500 text-white',
  UPDATE:  'bg-amber-500 border-amber-500 text-white',
  DELETE:  'bg-red-500 border-red-500 text-white',
  APPROVE: 'bg-purple-500 border-purple-500 text-white',
};

const TABS = [
  { key: 'profile',  label: 'My Profile',          icon: User },
  { key: 'company',  label: 'Company',              icon: Building2 },
  { key: 'branches', label: 'Branches',             icon: GitBranch },
  { key: 'roles',    label: 'Roles & Permissions',  icon: ShieldCheck },
  { key: 'taxes',    label: 'Tax Codes',            icon: Percent },
] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const { user } = useAuthStore();
  const isAdmin = (user?.roles?.includes('Admin') || user?.roles?.includes('Super Admin')) ?? false;

  return (
    <>
      <Header title="Settings / Paramètres" />
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <nav className="w-56 shrink-0 border-r border-gray-200 bg-white p-4 space-y-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as Tab)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-auto p-6">
          {tab === 'profile'  && <ProfileTab user={user} />}
          {tab === 'company'  && <CompanyTab />}
          {tab === 'branches' && <BranchesTab />}
          {tab === 'roles'    && <RolesTab isAdmin={isAdmin} />}
          {tab === 'taxes'    && <TaxesTab />}
        </div>
      </div>
    </>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: AuthUser | null }) {
  return (
    <div className="max-w-lg space-y-6">
      <Card>
        <CardHeader><CardTitle>My Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {user?.roles.map((r: string) => (
                  <Badge key={r} variant="info">{r}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Tenant Info</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-1">Tenant ID</p>
          <p className="font-mono text-sm text-gray-900 select-all">{user?.tenantId}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Company Tab ──────────────────────────────────────────────────────────────

function CompanyTab() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: settingsService.getCompany,
  });

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema) as any,
    values: company ?? {},
  });

  const mutation = useMutation({
    mutationFn: (d: CompanyForm) => settingsService.updateCompany(d as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company'] }),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-2 gap-4">
            <Input label="Company Name" {...register('name')} error={errors.name?.message} className="col-span-2" />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <Input label="Phone" {...register('phone')} />
            <Input label="Address" {...register('address')} className="col-span-2" />
            <Input label="City" {...register('city')} />
            <Input label="Country" {...register('country')} />
            <Input label="Currency (e.g. USD)" {...register('currency')} />
            <Input label="Timezone" {...register('timezone')} />
            <div className="col-span-2">
              <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>Save Changes</Button>
              {mutation.isSuccess && <span className="ml-3 text-sm text-emerald-600">Saved!</span>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Branches Tab ─────────────────────────────────────────────────────────────

function BranchesTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: settingsService.listBranches,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema) as any,
  });

  const openCreate = () => { reset({}); setEditing(null); setShowModal(true); };
  const openEdit   = (b: Branch) => { reset(b); setEditing(b); setShowModal(true); };

  const saveMutation = useMutation({
    mutationFn: (d: BranchForm) =>
      editing ? settingsService.updateBranch(editing.id, d) : settingsService.createBranch(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); setShowModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: settingsService.deleteBranch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });

  if (isLoading) return <PageLoader />;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Branches</h2>
        <Button onClick={openCreate} size="sm"><Plus size={14} /> Add Branch</Button>
      </div>
      <Card>
        <Table>
          <Thead>
            <tr><Th>Name</Th><Th>Code</Th><Th>City</Th><Th>Phone</Th><Th>Status</Th><Th /></tr>
          </Thead>
          <Tbody>
            {branches.map((b) => (
              <Tr key={b.id}>
                <Td className="font-medium">
                  {b.name}
                  {b.isMain && <Badge variant="info" className="ml-2 text-[10px]">Main</Badge>}
                </Td>
                <Td className="font-mono text-xs">{b.code}</Td>
                <Td>{b.city ?? '—'}</Td>
                <Td>{b.phone ?? '—'}</Td>
                <Td><Badge variant={b.isActive ? 'success' : 'default'}>{b.isActive ? 'Active' : 'Inactive'}</Badge></Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Edit</Button>
                    {!b.isMain && (
                      <Button variant="danger" size="sm" loading={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(b.id)}>
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {branches.length === 0 && (
              <tr><Td className="text-gray-400">No branches found</Td></tr>
            )}
          </Tbody>
        </Table>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Branch' : 'Add Branch'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="grid grid-cols-2 gap-4">
          <Input label="Name *" {...register('name')} error={errors.name?.message} className="col-span-2" />
          <Input label="Code *" {...register('code')} error={errors.code?.message} />
          <Input label="Phone" {...register('phone')} />
          <Input label="Address" {...register('address')} className="col-span-2" />
          <Input label="City" {...register('city')} />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <div className="col-span-2 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [dirty, setDirty] = useState(false);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: settingsService.listRoles,
  });

  const { data: allPermissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: settingsService.listPermissions,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RoleForm>({
    resolver: zodResolver(roleSchema) as any,
  });

  const saveMutation = useMutation({
    mutationFn: (d: RoleForm) =>
      editingRole
        ? settingsService.updateRole(editingRole.id, d)
        : settingsService.createRole(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setShowRoleModal(false);
      reset();
      setEditingRole(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteRole(id),
    onSuccess: (_data, deletedId) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      if (selectedRole?.id === deletedId) setSelectedRole(null);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: settingsService.cloneRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: settingsService.toggleRole,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      if (selectedRole?.id === updated.id) setSelectedRole(updated);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      settingsService.assignPermissions(roleId, permissionIds),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRole(updated);
      setDirty(false);
    },
  });

  const openRole = (role: Role) => {
    setSelectedRole(role);
    setSelectedPerms(new Set(role.permissions.map((rp) => rp.permission.id)));
    setDirty(false);
  };

  const openCreate = () => { reset({}); setEditingRole(null); setShowRoleModal(true); };
  const openEdit = (role: Role) => { reset({ name: role.name, description: role.description }); setEditingRole(role); setShowRoleModal(true); };

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setDirty(true);
  };

  const toggleModule = (modulePerms: Permission[]) => {
    const ids = modulePerms.map((p) => p.id);
    const allChecked = ids.every((id) => selectedPerms.has(id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (allChecked) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
    setDirty(true);
  };

  const savePermissions = () => {
    if (!selectedRole) return;
    assignMutation.mutate({ roleId: selectedRole.id, permissionIds: Array.from(selectedPerms) });
  };

  // Determine if the current user can edit this role's permissions
  const canEditPerms = (role: Role) => {
    if (!role.isSystem) return true;        // custom roles always editable
    return isAdmin;                          // system roles: admin only
  };

  // Build permission matrix: module → map of action → Permission
  const moduleMap = allPermissions.reduce<Record<string, Record<string, Permission>>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = {};
    acc[p.module][p.action] = p;
    return acc;
  }, {});

  const sortedModules = Object.keys(moduleMap).sort();

  // Role sorting: system roles in defined order first, then custom alphabetically
  const systemOrder = [
    'Super Admin', 'Admin', 'HR Manager', 'Finance Manager', 'Procurement Officer',
    'Sales Manager', 'Inventory Manager', 'Department Manager', 'Employee', 'Auditor',
  ];
  const sortedRoles = [...roles].sort((a, b) => {
    const ai = systemOrder.indexOf(a.name);
    const bi = systemOrder.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  if (rolesLoading || permsLoading) return <PageLoader />;

  const editable = selectedRole ? canEditPerms(selectedRole) : false;

  return (
    <div className="flex gap-6 min-h-0">
      {/* ── Left panel: role list ── */}
      <div className="w-64 shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Roles</h2>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus size={13} /> New
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          {sortedRoles.map((role) => {
            const isActive = selectedRole?.id === role.id;
            const isSuperAdmin = role.name === 'Super Admin';
            return (
              <button
                key={role.id}
                onClick={() => openRole(role)}
                className={`group w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isSuperAdmin
                      ? <Shield size={14} className="shrink-0 text-indigo-600" />
                      : role.isSystem
                        ? <Lock size={13} className="shrink-0 text-amber-500" />
                        : <Users size={13} className="shrink-0 text-gray-400" />
                    }
                    <span className="truncate text-sm font-medium text-gray-900">{role.name}</span>
                  </div>
                  <ChevronRight size={13} className={`shrink-0 transition-transform ${isActive ? 'text-indigo-500 rotate-90' : 'text-gray-300'}`} />
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {isSuperAdmin && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                      Super Admin
                    </span>
                  )}
                  {!isSuperAdmin && role.isSystem && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      System
                    </span>
                  )}
                  {!role.isActive && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      Disabled
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {role._count.users} user{role._count.users !== 1 ? 's' : ''} · {role.permissions.length} perms
                  </span>
                </div>

                {role.description && (
                  <p className="mt-0.5 text-[11px] text-gray-400 leading-snug line-clamp-2">{role.description}</p>
                )}

                {/* Action buttons */}
                {isAdmin && (
                  <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {!isSuperAdmin && (
                      <button
                        className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        onClick={() => openEdit(role)}
                      >
                        <Pencil size={10} /> Edit
                      </button>
                    )}
                    <button
                      className="flex items-center gap-1 rounded-md border border-sky-200 px-2 py-0.5 text-[11px] text-sky-600 hover:border-sky-300 hover:bg-sky-50"
                      onClick={() => cloneMutation.mutate(role.id)}
                      title="Clone this role"
                    >
                      <Copy size={10} /> Clone
                    </button>
                    {!isSuperAdmin && (
                      <button
                        className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
                          role.isActive
                            ? 'border-orange-200 text-orange-600 hover:border-orange-300 hover:bg-orange-50'
                            : 'border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50'
                        }`}
                        onClick={() => toggleMutation.mutate(role.id)}
                        title={role.isActive ? 'Disable this role' : 'Enable this role'}
                      >
                        {role.isActive ? <ToggleRight size={10} /> : <ToggleLeft size={10} />}
                        {role.isActive ? 'Disable' : 'Enable'}
                      </button>
                    )}
                    {!role.isSystem && (
                      <button
                        className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-0.5 text-[11px] text-red-500 hover:border-red-300 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(role.id)}
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: permission matrix ── */}
      <div className="flex-1 min-w-0">
        {!selectedRole ? (
          <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
            Select a role to view or edit its permissions
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {selectedRole.name === 'Super Admin'
                    ? <Shield size={18} className="text-indigo-600" />
                    : selectedRole.isSystem
                      ? <Lock size={16} className="text-amber-500" />
                      : <Users size={16} className="text-gray-500" />
                  }
                  <h2 className="text-lg font-semibold text-gray-900">{selectedRole.name}</h2>
                  {!selectedRole.isActive && (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">Disabled</span>
                  )}
                </div>
                {selectedRole.description && (
                  <p className="mt-0.5 text-sm text-gray-500">{selectedRole.description}</p>
                )}
              </div>

              {editable && (
                <Button
                  size="sm"
                  loading={assignMutation.isPending}
                  disabled={!dirty}
                  onClick={savePermissions}
                >
                  <Check size={14} /> Save changes
                </Button>
              )}

              {!editable && (
                <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
                  <Lock size={12} /> Only the Admin can modify system roles
                </span>
              )}
            </div>

            {/* Legend */}
            <div className="mb-4 flex flex-wrap gap-2">
              {ALL_ACTIONS.map((action) => (
                <span key={action} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${ACTION_CHECKED[action]}`}>
                  {action}
                </span>
              ))}
              <span className="ml-2 text-xs text-gray-400 self-center">— click a cell to toggle · click module name to toggle all</span>
            </div>

            {/* Matrix */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-36">Module</th>
                    {ALL_ACTIONS.map((action) => (
                      <th key={action} className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 w-24">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedModules.map((mod, idx) => {
                    const modulePerms = Object.values(moduleMap[mod]);
                    const allChecked = modulePerms.every((p) => selectedPerms.has(p.id));
                    const someChecked = modulePerms.some((p) => selectedPerms.has(p.id));

                    return (
                      <tr
                        key={mod}
                        className={`border-b border-gray-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        {/* Module name — click to toggle all actions for this module */}
                        <td className="px-4 py-2.5">
                          <button
                            disabled={!editable}
                            onClick={() => toggleModule(modulePerms)}
                            className={`flex items-center gap-1.5 text-left font-medium transition-colors ${
                              editable ? 'cursor-pointer hover:text-indigo-600' : 'cursor-default'
                            } ${allChecked ? 'text-indigo-700' : someChecked ? 'text-gray-700' : 'text-gray-400'}`}
                            title={editable ? `Toggle all ${MODULE_LABELS[mod] ?? mod} permissions` : undefined}
                          >
                            <span className={`inline-block h-2 w-2 rounded-full ${allChecked ? 'bg-indigo-500' : someChecked ? 'bg-amber-400' : 'bg-gray-200'}`} />
                            {MODULE_LABELS[mod] ?? mod}
                          </button>
                        </td>

                        {/* One cell per action */}
                        {ALL_ACTIONS.map((action) => {
                          const perm = moduleMap[mod][action];
                          const checked = perm ? selectedPerms.has(perm.id) : false;

                          return (
                            <td key={action} className="px-3 py-2.5 text-center">
                              {perm ? (
                                <button
                                  disabled={!editable}
                                  onClick={() => togglePerm(perm.id)}
                                  title={`${MODULE_LABELS[mod] ?? mod}: ${action}`}
                                  className={`inline-flex h-7 w-16 items-center justify-center rounded-lg border text-[11px] font-semibold transition-all ${
                                    checked
                                      ? ACTION_CHECKED[action]
                                      : `${ACTION_COLORS[action]} opacity-40`
                                  } ${editable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                                >
                                  {checked ? '✓' : action.slice(0, 3)}
                                </button>
                              ) : (
                                <span className="text-gray-200 text-xs">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {assignMutation.isSuccess && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600">
                <Check size={14} /> Permissions saved successfully
              </p>
            )}
          </>
        )}
      </div>

      {/* Create / Edit role modal */}
      <Modal
        open={showRoleModal}
        onClose={() => { setShowRoleModal(false); setEditingRole(null); }}
        title={editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <Input label="Role Name *" {...register('name')} error={errors.name?.message} />
          <Input label="Description" {...register('description')} />
          <p className="text-xs text-gray-500">
            After creating the role, select it to assign permissions using the matrix.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => { setShowRoleModal(false); setEditingRole(null); }}>
              Cancel
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editingRole ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Taxes Tab ────────────────────────────────────────────────────────────────

const taxSchema = z.object({
  name:        z.string().min(1, 'Required'),
  code:        z.string().min(1, 'Required'),
  rate:        z.coerce.number().min(0).max(100),
  description: z.string().optional(),
});
type TaxForm = z.infer<typeof taxSchema>;

const TAX_PRESETS = [
  { name: 'VAT Exempt',  code: 'EXEMPT',  rate: 0,     description: 'Exempt from tax' },
  { name: 'VAT 0%',      code: 'VAT_0',   rate: 0,     description: 'Zero-rated VAT' },
  { name: 'VAT 5%',      code: 'VAT_5',   rate: 5,     description: 'Reduced rate VAT' },
  { name: 'VAT 10%',     code: 'VAT_10',  rate: 10,    description: 'Standard VAT 10%' },
  { name: 'VAT 19.25%',  code: 'VAT_19',  rate: 19.25, description: 'Standard VAT 19.25%' },
  { name: 'VAT 20%',     code: 'VAT_20',  rate: 20,    description: 'Standard VAT 20%' },
];

function TaxesTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<TaxCode | null>(null);

  const { data: taxes = [], isLoading } = useQuery({
    queryKey: ['taxes'],
    queryFn:  settingsService.listTaxes,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TaxForm>({
    resolver: zodResolver(taxSchema) as any,
  });

  const openCreate = () => { reset({}); setEditing(null); setShowModal(true); };
  const openEdit   = (t: TaxCode) => {
    reset({ name: t.name, code: t.code, rate: t.rate, description: t.description });
    setEditing(t);
    setShowModal(true);
  };
  const applyPreset = (p: typeof TAX_PRESETS[number]) => {
    setValue('name', p.name); setValue('code', p.code);
    setValue('rate', p.rate); setValue('description', p.description);
  };

  const saveMutation = useMutation({
    mutationFn: (d: TaxForm) =>
      editing
        ? settingsService.updateTax(editing.id, d)
        : settingsService.createTax(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['taxes'] }); setShowModal(false); },
  });

  const toggleMutation = useMutation({
    mutationFn: (t: TaxCode) => settingsService.updateTax(t.id, { isActive: !t.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: settingsService.deleteTax,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes'] }),
  });

  if (isLoading) return <PageLoader />;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tax Codes</h2>
          <p className="text-sm text-gray-500">Define VAT rates and tax categories. Assign them to products.</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={14} /> Add Tax Code</Button>
      </div>

      {taxes.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
          <Percent size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No tax codes yet</p>
          <p className="mt-1 text-xs text-gray-400">Create tax codes like VAT 0%, VAT 19.25%, or use a preset.</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={openCreate}>
            <Plus size={13} /> Create first tax code
          </Button>
        </div>
      ) : (
        <Card>
          <Table>
            <Thead>
              <tr><Th>Name</Th><Th>Code</Th><Th className="text-right">Rate</Th><Th>Description</Th><Th>Status</Th><Th /></tr>
            </Thead>
            <Tbody>
              {taxes.map((t) => (
                <Tr key={t.id}>
                  <Td className="font-semibold text-gray-900">{t.name}</Td>
                  <Td><span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs">{t.code}</span></Td>
                  <Td className="text-right font-bold text-indigo-700">{Number(t.rate).toFixed(2)}%</Td>
                  <Td className="text-gray-500 text-sm">{t.description ?? '—'}</Td>
                  <Td>
                    <Badge variant={t.isActive ? 'success' : 'default'}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(t)}>Edit</Button>
                      <Button
                        variant="outline" size="sm"
                        loading={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate(t)}
                        className={t.isActive ? 'text-orange-600 border-orange-200 hover:bg-orange-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}
                      >
                        {t.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="danger" size="sm"
                        loading={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(t.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Tax Code' : 'New Tax Code'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          {!editing && (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Quick presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {TAX_PRESETS.map((p) => (
                  <button
                    key={p.code} type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name *" placeholder="e.g. VAT 19.25%" error={errors.name?.message} {...register('name')} />
            <Input label="Code *" placeholder="e.g. VAT_19" error={errors.code?.message} {...register('code')} />
          </div>
          <Input
            label="Rate (%) *"
            type="number" step="0.01" min="0" max="100"
            placeholder="0.00"
            error={errors.rate?.message}
            {...register('rate')}
          />
          <Input label="Description" placeholder="Optional note…" {...register('description')} />
          {saveMutation.isError && (
            <p className="text-sm text-red-600">
              {(saveMutation.error as any)?.response?.data?.message ?? 'Failed to save'}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
