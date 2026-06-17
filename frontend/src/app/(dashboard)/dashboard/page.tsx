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
import { useT } from '@/hooks/useT';

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
  const { t } = useT();

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

  if (loadingOverview) return <><Header title={t('dashboard.title')} /><PageLoader /></>;

  return (
    <>
      <Header title={t('dashboard.title')} />
      <div className="p-4 space-y-4 md:p-6 md:space-y-6">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label={t('nav.customers')} value={overview?.totalCustomers ?? 0} icon={Users} color="bg-indigo-500" />
          <KpiCard label={t('nav.products')} value={overview?.totalProducts ?? 0} icon={Package} color="bg-cyan-500" />
          <KpiCard label={t('dashboard.totalSales')} value={overview?.salesThisMonth ?? 0} icon={ShoppingCart} color="bg-emerald-500" />
          <KpiCard label={t('dashboard.totalRevenue')} value={formatCurrency(Number(overview?.revenueThisMonth ?? 0))} icon={DollarSign} color="bg-green-600" />
          <KpiCard label={t('dashboard.pendingPurchases')} value={overview?.pendingPurchases ?? 0} icon={Truck} color="bg-amber-500" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label={t('dashboard.activeLeads')} value={overview?.openLeads ?? 0} icon={UserCheck} color="bg-purple-500" />
          <KpiCard label={t('crm.tabs.opportunities')} value={overview?.openOpportunities ?? 0} icon={TrendingUp} color="bg-pink-500" />
          <KpiCard label="Notifications" value={overview?.unreadNotifications ?? 0} icon={Bell} color="bg-sky-500" />
          <KpiCard label={t('dashboard.lowStock')} value={overview?.lowStockCount ?? 0} icon={AlertTriangle} color="bg-red-500" />
          <KpiCard label={t('nav.budgeting')} value={overview?.activeBudgets ?? 0} icon={PiggyBank} color="bg-teal-500" />
        </div>

        {/* Top Products + Cash Summary */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Products */}
          <Card>
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3">
              <Trophy size={14} className="text-amber-500" />
              <span className="text-sm font-semibold text-slate-700">{t('dashboard.topProducts')}</span>
            </div>
            <ul className="divide-y divide-slate-50">
              {(topProducts ?? []).slice(0, 5).map((p, i) => (
                <li key={p.product.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.product.name}</p>
                    <p className="text-xs text-slate-400">{p.quantity} · {p.transactions}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{formatCurrency(p.revenue)}</span>
                </li>
              ))}
              {(!topProducts || topProducts.length === 0) && (
                <li className="px-5 py-4 text-sm text-slate-400 text-center">{t('sales.noSales')}</li>
              )}
            </ul>
          </Card>

          {/* Cash Summary */}
          <Card>
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3">
              <Wallet size={14} className="text-green-600" />
              <span className="text-sm font-semibold text-slate-700">{t('pos.sessionSummary')}</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                {cashSummary?.openSession ? (
                  <>
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span className="text-sm text-green-700 font-medium">{t('pos.openSession')}</span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {cashSummary.openSession.openedAt ? new Date(cashSummary.openSession.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} className="text-red-400" />
                    <span className="text-sm text-red-600 font-medium">{t('pos.openSessionFirst')}</span>
                  </>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { label: t('finance.income'), value: cashSummary?.today.cashIn ?? 0, color: 'text-green-600' },
                  { label: t('finance.expense'), value: cashSummary?.today.cashOut ?? 0, color: 'text-red-500' },
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
                {t('dashboard.recentSales')}
              </div>
              <ul className="divide-y divide-gray-50">
                {activity.recentSales?.length === 0 && (
                  <li className="px-5 py-3 text-sm text-slate-400">{t('sales.noSales')}</li>
                )}
                {activity.recentSales?.map((s: { id: string; reference: string; customer?: { name: string }; total: number; createdAt: string }) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.reference}</p>
                      <p className="text-xs text-slate-400">{s.customer?.name ?? t('sales.walkIn')}</p>
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
                {t('purchases.title')}
              </div>
              <ul className="divide-y divide-gray-50">
                {activity.recentPurchases?.length === 0 && (
                  <li className="px-5 py-3 text-sm text-slate-400">{t('purchases.noPurchases')}</li>
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
                {t('crm.tabs.leads')}
              </div>
              <ul className="divide-y divide-gray-50">
                {activity.recentLeads?.length === 0 && (
                  <li className="px-5 py-3 text-sm text-slate-400">{t('crm.noLeads')}</li>
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
