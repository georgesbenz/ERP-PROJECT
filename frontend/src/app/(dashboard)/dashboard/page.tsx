'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users, Package, ShoppingCart, DollarSign,
  Truck, UserCheck, TrendingUp, Bell, AlertTriangle, PiggyBank,
  Trophy, Wallet, CheckCircle2, XCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

  const { data: topProducts } = useQuery({
    queryKey: ['dashboard-top-products'],
    queryFn: dashboardService.getTopProducts,
  });

  const { data: cashSummary } = useQuery({
    queryKey: ['dashboard-cash-summary'],
    queryFn: dashboardService.getCashSummary,
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

        {/* Top Products + Cash Summary */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Products */}
          <Card>
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3">
              <Trophy size={14} className="text-amber-500" />
              <span className="text-sm font-semibold text-slate-700">Top Produits ce mois</span>
            </div>
            <ul className="divide-y divide-slate-50">
              {(topProducts ?? []).slice(0, 5).map((p, i) => (
                <li key={p.product.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.product.name}</p>
                    <p className="text-xs text-slate-400">{p.quantity} unités · {p.transactions} ventes</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{formatCurrency(p.revenue)}</span>
                </li>
              ))}
              {(!topProducts || topProducts.length === 0) && (
                <li className="px-5 py-4 text-sm text-slate-400 text-center">Aucune vente ce mois</li>
              )}
            </ul>
          </Card>

          {/* Cash Summary */}
          <Card>
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3">
              <Wallet size={14} className="text-green-600" />
              <span className="text-sm font-semibold text-slate-700">Caisse — Résumé du jour</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* Session status */}
              <div className="flex items-center gap-2">
                {cashSummary?.openSession ? (
                  <>
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span className="text-sm text-green-700 font-medium">Session ouverte</span>
                    <span className="text-xs text-slate-400 ml-auto">
                      depuis {cashSummary.openSession.openedAt ? new Date(cashSummary.openSession.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} className="text-red-400" />
                    <span className="text-sm text-red-600 font-medium">Aucune session ouverte</span>
                  </>
                )}
              </div>
              {/* Today totals */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { label: 'Entrées', value: cashSummary?.today.cashIn ?? 0, color: 'text-green-600' },
                  { label: 'Sorties', value: cashSummary?.today.cashOut ?? 0, color: 'text-red-500' },
                  { label: 'Net', value: cashSummary?.today.net ?? 0, color: 'text-slate-800' },
                ].map((k) => (
                  <div key={k.label} className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-500">{k.label}</p>
                    <p className={`text-sm font-bold ${k.color}`}>{formatCurrency(k.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
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
