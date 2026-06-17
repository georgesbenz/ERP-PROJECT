'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Users, Building2, TrendingUp, AlertTriangle, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  city: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  saleCount: number;
  productCount: number;
}

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  thisMonthSales: number;
}

async function fetchStats(): Promise<PlatformStats> {
  const { data } = await api.get('/admin/stats');
  return data.data as PlatformStats;
}

async function fetchTenants(): Promise<Tenant[]> {
  const { data } = await api.get('/admin/tenants');
  return data.data as Tenant[];
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const qc = useQueryClient();
  const [actionId, setActionId] = useState<string | null>(null);

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
    retry: false,
  });

  const { data: tenants, isError: tenantsError } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: fetchTenants,
    retry: false,
  });

  const suspend = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/tenants/${id}/suspend`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin-tenants'] }); void qc.invalidateQueries({ queryKey: ['admin-stats'] }); setActionId(null); },
  });

  const activate = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/tenants/${id}/activate`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin-tenants'] }); void qc.invalidateQueries({ queryKey: ['admin-stats'] }); setActionId(null); },
  });

  if (statsError || tenantsError) {
    return (
      <>
        <Header title="Platform Admin" />
        <div className="p-8 flex flex-col items-center gap-3 text-center">
          <ShieldCheck size={48} className="text-slate-300" />
          <h2 className="text-xl font-semibold text-slate-700">Access Denied</h2>
          <p className="text-sm text-slate-500 max-w-sm">
            This panel requires platform admin access. Make sure your email is in
            <code className="mx-1 bg-slate-100 px-1 rounded text-xs">PLATFORM_ADMIN_EMAILS</code>.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Platform Admin" />
      <div className="p-4 space-y-4 md:p-6 md:space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={Building2} label="Total Tenants" value={stats?.totalTenants ?? '—'} color="bg-indigo-500" />
          <StatCard icon={Check} label="Active" value={stats?.activeTenants ?? '—'} color="bg-emerald-500" />
          <StatCard icon={AlertTriangle} label="Suspended" value={stats?.suspendedTenants ?? '—'} color="bg-red-500" />
          <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? '—'} color="bg-violet-500" />
          <StatCard icon={TrendingUp} label="Sales This Month" value={stats?.thisMonthSales ?? '—'} color="bg-amber-500" />
        </div>

        {/* Tenant table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-slate-800">All Tenants</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Slug</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-right">Users</th>
                  <th className="px-4 py-3 text-right">Sales</th>
                  <th className="px-4 py-3 text-right">Products</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {!tenants && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
                )}
                {tenants?.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{t.name}</div>
                      {t.email && <div className="text-xs text-slate-400">{t.email}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        t.plan === 'enterprise' ? 'bg-violet-100 text-violet-700' :
                        t.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{t.userCount}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{t.saleCount}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{t.productCount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {t.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {t.isActive ? (
                        <button
                          onClick={() => { setActionId(t.id); suspend.mutate(t.id); }}
                          disabled={actionId === t.id}
                          className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => { setActionId(t.id); activate.mutate(t.id); }}
                          disabled={actionId === t.id}
                          className="text-xs px-2 py-1 rounded border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
