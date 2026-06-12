'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Line,
} from 'recharts';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';
import { analyticsService } from '@/services/analytics.service';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Package, DollarSign } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtM = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)    return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};
const fmtXAF = (v: unknown) => formatCurrency(Number(v ?? 0));
const pct = (cur: number, prev: number) =>
  prev === 0 ? null : (((cur - prev) / prev) * 100).toFixed(1);

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="py-5 flex items-start gap-4">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <strong>{fmtXAF(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Empty chart placeholder ───────────────────────────────────────────────────
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2">
      <AlertTriangle className="w-8 h-8 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { data: salesSummary, isLoading: ls } = useQuery({
    queryKey: ['analytics-sales'],
    queryFn: analyticsService.getSalesSummary,
  });
  const { data: inventory } = useQuery({
    queryKey: ['analytics-inventory'],
    queryFn: analyticsService.getInventorySummary,
  });
  const { data: revenue } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: analyticsService.getRevenueSummary,
  });
  const { data: financial } = useQuery({
    queryKey: ['analytics-financial'],
    queryFn: () => analyticsService.getFinancialSummary(),
  });
  const { data: cashflow } = useQuery({
    queryKey: ['analytics-cashflow'],
    queryFn: analyticsService.getCashFlowForecast,
  });
  const { data: kpis } = useQuery({
    queryKey: ['analytics-kpis'],
    queryFn: analyticsService.getKpis,
  });

  if (ls) return <><Header title="Analytics" /><PageLoader /></>;

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalRevenue   = Number(salesSummary?.totalRevenue ?? 0);
  const outstanding    = Number(salesSummary?.outstanding  ?? 0);
  const totalSales     = salesSummary?.totalSales ?? 0;
  const lowStockCount  = inventory?.lowStockItems?.length ?? 0;
  const totalProducts  = inventory?.totalProducts ?? 0;

  // Revenue trend: last vs second-to-last period
  const revRows: any[] = Array.isArray(revenue) ? revenue : [];
  const lastRev  = Number(revRows[revRows.length - 1]?.totalRevenue ?? 0);
  const prevRev  = Number(revRows[revRows.length - 2]?.totalRevenue ?? 0);
  const revTrend = pct(lastRev, prevRev);

  // Financial P&L rows (last 12, ordered asc by the service)
  const finRows: any[] = Array.isArray(financial)
    ? [...financial].sort((a, b) => a.period < b.period ? -1 : 1).slice(-12)
    : [];

  // Cash flow rows — already ordered asc (last 24)
  const cfRows: any[] = Array.isArray(cashflow) ? cashflow : [];

  return (
    <>
      <Header title="Analytics" />
      <div className="p-6 space-y-6">

        {/* ── KPI Row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total Ventes" value={String(totalSales)} sub="tous statuts"
            color="bg-indigo-500" icon={TrendingUp} />
          <KpiCard label="Chiffre d'Affaires" value={fmtXAF(totalRevenue)} sub="confirmé + livré"
            color="bg-emerald-500" icon={DollarSign} />
          <KpiCard label="Impayés" value={fmtXAF(outstanding)} sub="en attente"
            color="bg-amber-500" icon={AlertTriangle} />
          <KpiCard label="Produits" value={String(totalProducts)} sub="actifs"
            color="bg-sky-500" icon={Package} />
          <KpiCard label="Stock Faible" value={String(lowStockCount)} sub="alertes"
            color={lowStockCount > 0 ? 'bg-red-500' : 'bg-gray-400'} icon={AlertTriangle} />
          <KpiCard
            label="Tendance CA" value={revTrend ? `${Number(revTrend) > 0 ? '+' : ''}${revTrend}%` : '—'}
            sub="vs période préc."
            color={Number(revTrend) >= 0 ? 'bg-emerald-600' : 'bg-red-500'}
            icon={Number(revTrend) >= 0 ? TrendingUp : TrendingDown}
          />
        </div>

        {/* ── Revenue area chart ───────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution du Chiffre d'Affaires</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Dernières {revRows.length} périodes · source : RevenueAnalytic
            </p>
          </CardHeader>
          <CardContent>
            {revRows.length === 0
              ? <EmptyChart label="Aucune donnée de chiffre d'affaires disponible" />
              : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revRows} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="totalRevenue"
                    name="Chiffre d'Affaires"
                    stroke="#6366f1"
                    fill="url(#revGrad)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── P&L bars (revenue vs expenses vs net profit) ─────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Compte de Résultat — Revenus / Charges / Bénéfice</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Dernières {finRows.length} périodes · source : FinancialAnalytic
            </p>
          </CardHeader>
          <CardContent>
            {finRows.length === 0
              ? <EmptyChart label="Aucune donnée financière disponible" />
              : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={finRows} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue"   name="Revenus"  fill="#6366f1" radius={[4,4,0,0]} barSize={14} />
                  <Bar dataKey="expenses"  name="Charges"  fill="#f87171" radius={[4,4,0,0]} barSize={14} />
                  <Line
                    type="monotone" dataKey="netProfit" name="Bénéfice net"
                    stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Cash Flow bar chart ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Flux de Trésorerie — Entrées / Sorties / Solde</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              {cfRows.length} périodes · source : CashFlowForecast
            </p>
          </CardHeader>
          <CardContent>
            {cfRows.length === 0
              ? <EmptyChart label="Aucune donnée de flux de trésorerie disponible" />
              : (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={cfRows} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inflows"  name="Entrées"  fill="#10b981" radius={[4,4,0,0]} barSize={12} />
                  <Bar dataKey="outflows" name="Sorties"  fill="#f59e0b" radius={[4,4,0,0]} barSize={12} />
                  <Line
                    type="monotone" dataKey="closingBalance" name="Solde clôture"
                    stroke="#6366f1" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Bottom row: KPI trackers + low stock ────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* KPI Trackers */}
          <Card>
            <CardHeader><CardTitle>KPI Trackers</CardTitle></CardHeader>
            <CardContent>
              {(!kpis || kpis.length === 0)
                ? <p className="text-sm text-gray-400">Aucun KPI configuré.</p>
                : (
                <div className="space-y-3">
                  {kpis.slice(0, 8).map((k: any) => {
                    const target  = Number(k.target ?? 0);
                    const actual  = Number(k.actual ?? 0);
                    const progress = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
                    const achieved = actual >= target;
                    return (
                      <div key={k.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 truncate max-w-[60%]">{k.name}</span>
                          <span className={`text-xs font-semibold ${achieved ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {fmtM(actual)} / {fmtM(target)} {k.unit ?? ''}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${achieved ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low stock + inventory health */}
          <Card>
            <CardHeader><CardTitle>Santé du Stock</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-6 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Produits actifs</p>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {lowStockCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Stock faible</p>
                </div>
              </div>
              {lowStockCount === 0
                ? <p className="text-sm text-emerald-600 flex items-center gap-2"><Target className="w-4 h-4" /> Tous les stocks au-dessus du minimum</p>
                : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {inventory.lowStockItems.map((i: any) => (
                    <div key={i.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{i.product?.name}</p>
                        <p className="text-xs text-gray-400">{i.warehouse?.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <span className="text-red-600 font-semibold">{Number(i.quantity).toFixed(0)}</span>
                        <span className="text-gray-400"> / min {Number(i.product?.minStock).toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
}
