'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users, Package, ShoppingCart, DollarSign,
  Truck, UserCheck, TrendingUp, Bell, AlertTriangle, PiggyBank,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';
import { dashboardService } from '@/services/dashboard.service';
import { formatCurrency, formatDateTime } from '@/lib/utils';

function KpiCard({
  label, value, icon: Icon, color,
}: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-800">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardService.getOverview,
  });

  const { data: activity, isLoading: loadingActivity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: dashboardService.getRecentActivity,
  });

  if (loadingOverview) return <><Header title="Dashboard" /><PageLoader /></>;

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Customers" value={overview?.totalCustomers ?? 0} icon={Users} color="bg-indigo-500" />
          <KpiCard label="Products" value={overview?.totalProducts ?? 0} icon={Package} color="bg-cyan-500" />
          <KpiCard label="Sales this month" value={overview?.salesThisMonth ?? 0} icon={ShoppingCart} color="bg-emerald-500" />
          <KpiCard label="Revenue MTD" value={formatCurrency(Number(overview?.revenueThisMonth ?? 0))} icon={DollarSign} color="bg-green-600" />
          <KpiCard label="Pending POs" value={overview?.pendingPurchases ?? 0} icon={Truck} color="bg-amber-500" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Open Leads" value={overview?.openLeads ?? 0} icon={UserCheck} color="bg-purple-500" />
          <KpiCard label="Opportunities" value={overview?.openOpportunities ?? 0} icon={TrendingUp} color="bg-pink-500" />
          <KpiCard label="Notifications" value={overview?.unreadNotifications ?? 0} icon={Bell} color="bg-sky-500" />
          <KpiCard label="Low Stock" value={overview?.lowStockCount ?? 0} icon={AlertTriangle} color="bg-red-500" />
          <KpiCard label="Active Budgets" value={overview?.activeBudgets ?? 0} icon={PiggyBank} color="bg-teal-500" />
        </div>

        {/* Recent Activity */}
        {!loadingActivity && activity && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <div className="border-b border-stone-100 px-5 py-3 text-sm font-semibold text-slate-700">
                Recent Sales
              </div>
              <ul className="divide-y divide-gray-50">
                {activity.recentSales?.length === 0 && (
                  <li className="px-5 py-3 text-sm text-slate-400">No sales yet</li>
                )}
                {activity.recentSales?.map((s: { id: string; reference: string; customer?: { name: string }; total: number; createdAt: string }) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.reference}</p>
                      <p className="text-xs text-slate-400">{s.customer?.name ?? 'Walk-in'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(Number(s.total))}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(s.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <div className="border-b border-stone-100 px-5 py-3 text-sm font-semibold text-slate-700">
                Recent Purchases
              </div>
              <ul className="divide-y divide-gray-50">
                {activity.recentPurchases?.length === 0 && (
                  <li className="px-5 py-3 text-sm text-slate-400">No purchases yet</li>
                )}
                {activity.recentPurchases?.map((p: { id: string; reference: string; supplier?: { name: string }; total: number; createdAt: string }) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.reference}</p>
                      <p className="text-xs text-slate-400">{p.supplier?.name ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(Number(p.total))}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(p.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <div className="border-b border-stone-100 px-5 py-3 text-sm font-semibold text-slate-700">
                Recent Leads
              </div>
              <ul className="divide-y divide-gray-50">
                {activity.recentLeads?.length === 0 && (
                  <li className="px-5 py-3 text-sm text-slate-400">No leads yet</li>
                )}
                {activity.recentLeads?.map((l: { id: string; firstName: string; lastName: string; status: string; createdAt: string }) => (
                  <li key={l.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{l.firstName} {l.lastName}</p>
                      <p className="text-xs text-slate-400">{l.status}</p>
                    </div>
                    <p className="text-xs text-slate-400">{formatDateTime(l.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
