'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Package,
  TrendingDown,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/ui/Spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { stockService } from '@/services/stock.service';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/hooks/useT';
import Link from 'next/link';

// ── Movement type display ─────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  IN: 'bg-emerald-100 text-emerald-700',
  OUT: 'bg-red-100 text-red-700',
  ADJUSTMENT: 'bg-amber-100 text-amber-700',
  TRANSFER: 'bg-sky-100 text-sky-700',
  RETURN: 'bg-purple-100 text-purple-700',
  PURCHASE_RECEIPT: 'bg-blue-100 text-blue-700',
  SALE_DELIVERY: 'bg-red-100 text-red-700',
  POS_SALE: 'bg-red-100 text-red-700',
  ADJUSTMENT_IN: 'bg-orange-100 text-orange-700',
  ADJUSTMENT_OUT: 'bg-orange-100 text-orange-700',
  TRANSFER_IN: 'bg-purple-100 text-purple-700',
  TRANSFER_OUT: 'bg-purple-100 text-purple-700',
  CUSTOMER_RETURN_RESALABLE: 'bg-green-100 text-green-700',
  CUSTOMER_RETURN_DAMAGED: 'bg-stone-100 text-slate-700',
  DAMAGE_WRITE_OFF: 'bg-stone-100 text-slate-600',
  EXPIRY_WRITE_OFF: 'bg-stone-100 text-slate-600',
  OPENING_STOCK: 'bg-indigo-100 text-indigo-700',
};

const isPositiveType = (type: string) =>
  ['IN', 'RETURN', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'PURCHASE_RECEIPT', 'CUSTOMER_RETURN_RESALABLE', 'OPENING_STOCK', 'CYCLE_COUNT_IN', 'PRODUCTION_IN', 'BACKORDER_FULFILL'].includes(type);

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
  href?: string;
}) {
  const card = (
    <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StockDashboardPage() {
  const { t } = useT();
  const { data: summary, isLoading } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: stockService.getStockSummary,
  });

  const { data: lowStockAlerts = [] } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: stockService.getLowStockAlerts,
  });

  if (isLoading) return <PageLoader />;

  const recentMovements: any[] = summary?.recentMovements ?? [];
  const topLowStock = (lowStockAlerts as any[]).slice(0, 5);

  return (
    <>
      <Header title={t('stock.overview')} />
      <div className="p-4 space-y-4 md:p-6 md:space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Produits en stock"
            value={summary?.totalProducts ?? 0}
            icon={Package}
            color="bg-indigo-50 text-indigo-600"
            href="/stock/levels"
          />
          <KpiCard
            label="Valeur totale"
            value={formatCurrency(summary?.totalStockValue ?? 0)}
            icon={DollarSign}
            color="bg-emerald-50 text-emerald-600"
          />
          <KpiCard
            label="Stock faible"
            value={summary?.lowStockCount ?? 0}
            icon={TrendingDown}
            color="bg-amber-50 text-amber-600"
            sub="produits sous le minimum"
            href="/stock/alerts"
          />
          <KpiCard
            label="Rupture de stock"
            value={summary?.outOfStockCount ?? 0}
            icon={AlertTriangle}
            color="bg-red-50 text-red-600"
            sub="produits sans stock"
            href="/stock/alerts"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Movements */}
          <div className="lg:col-span-2 rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
              <h2 className="font-semibold text-slate-700 text-sm">Mouvements récents</h2>
              <Link href="/stock/movements" className="text-xs text-indigo-600 hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Produit</Th>
                    <Th>Entrepôt</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Qté</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {recentMovements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                        Aucun mouvement récent
                      </td>
                    </tr>
                  )}
                  {recentMovements.map((m: any) => {
                    const positive = isPositiveType(m.type);
                    const color = TYPE_COLORS[m.type] ?? 'bg-stone-100 text-slate-600';
                    return (
                      <Tr key={m.id}>
                        <Td className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                        </Td>
                        <Td className="font-medium text-slate-800 max-w-[140px] truncate">
                          {m.product?.name ?? '—'}
                        </Td>
                        <Td className="text-slate-600 text-xs">{m.warehouse?.name ?? '—'}</Td>
                        <Td>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
                            {m.type.replace(/_/g, ' ')}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <span className={`font-bold tabular-nums text-sm ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {positive ? '+' : '−'}{Number(m.quantity).toLocaleString()}
                          </span>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
          </div>

          {/* Low Stock Items */}
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
              <h2 className="font-semibold text-slate-700 text-sm">Stock critique</h2>
              <Link href="/stock/alerts" className="text-xs text-indigo-600 hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="divide-y divide-gray-50 px-4 py-2">
              {topLowStock.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                  Aucune alerte de stock
                </p>
              )}
              {topLowStock.map((alert: any) => {
                const qty = Number(alert.available ?? 0);
                const min = Number(alert.minStock ?? 1);
                const pct = min > 0 ? Math.min(100, Math.round((qty / min) * 100)) : 0;
                const isOut = qty <= 0;
                return (
                  <div key={`${alert.productId}-${alert.warehouseId}`} className="py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">
                        {alert.product?.name ?? '—'}
                      </span>
                      <span className={`text-xs font-bold ${isOut ? 'text-red-600' : 'text-amber-600'}`}>
                        {qty} / {min}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-stone-100">
                      <div
                        className={`h-1.5 rounded-full ${isOut ? 'bg-red-500' : 'bg-amber-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{alert.warehouse?.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
