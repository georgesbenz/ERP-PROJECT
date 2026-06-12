'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/ui/Spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { stockService } from '@/services/stock.service';

// ── Status badge ──────────────────────────────────────────────────────────────
function StockAlertBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; color: string }> = {
    OUT_OF_STOCK: { label: 'Rupture de stock', color: 'bg-red-100 text-red-700' },
    LOW_STOCK: { label: 'Stock faible', color: 'bg-amber-100 text-amber-700' },
    REORDER_NEEDED: { label: 'Réappro. nécessaire', color: 'bg-orange-100 text-orange-700' },
  };
  const cfg = configs[status] ?? { label: status, color: 'bg-stone-100 text-slate-600' };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function ExpiryBadge({ daysLeft }: { daysLeft: number }) {
  const color =
    daysLeft <= 0
      ? 'bg-red-100 text-red-700'
      : daysLeft <= 7
      ? 'bg-red-100 text-red-600'
      : daysLeft <= 30
      ? 'bg-amber-100 text-amber-700'
      : 'bg-yellow-100 text-yellow-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {daysLeft <= 0 ? 'Expiré' : `${daysLeft}j restants`}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StockAlertsPage() {
  const [daysAhead, setDaysAhead] = useState(30);

  const { data: lowStockAlerts = [], isLoading: loadingLow } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: stockService.getLowStockAlerts,
  });

  const { data: expiryAlerts = [], isLoading: loadingExpiry } = useQuery({
    queryKey: ['expiry-alerts', daysAhead],
    queryFn: () => stockService.getExpiryAlerts(daysAhead),
  });

  const today = new Date();

  return (
    <>
      <Header title="Alertes de Stock" />
      <div className="p-6 space-y-8">

        {/* Low Stock Section */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-base font-semibold text-slate-700">
              Stock faible / Ruptures de stock
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {(lowStockAlerts as any[]).length} alerte{(lowStockAlerts as any[]).length !== 1 ? 's' : ''}
            </span>
          </div>

          {loadingLow ? (
            <PageLoader />
          ) : (
            <div className="overflow-hidden rounded-xl border border-stone-200 shadow-sm">
              <Table>
                <Thead>
                  <tr>
                    <Th>Produit</Th>
                    <Th>SKU</Th>
                    <Th>Entrepôt</Th>
                    <Th className="text-right">Stock actuel</Th>
                    <Th className="text-right">Stock min</Th>
                    <Th className="text-right">Point de réappro.</Th>
                    <Th>Statut</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {(lowStockAlerts as any[]).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                        Aucune alerte de stock — tout est en ordre
                      </td>
                    </tr>
                  )}
                  {(lowStockAlerts as any[]).map((alert: any, idx: number) => (
                    <Tr key={`${alert.productId}-${alert.warehouseId}-${idx}`}>
                      <Td className="font-medium text-slate-800">{alert.product?.name ?? '—'}</Td>
                      <Td className="font-mono text-xs text-slate-500">{alert.product?.sku ?? '—'}</Td>
                      <Td className="text-slate-600">{alert.warehouse?.name ?? '—'}</Td>
                      <Td className="text-right">
                        <span className={`font-bold tabular-nums ${
                          Number(alert.available) <= 0 ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {Number(alert.available).toLocaleString()}
                        </span>
                      </Td>
                      <Td className="text-right tabular-nums text-slate-600">
                        {Number(alert.minStock ?? 0).toLocaleString()}
                      </Td>
                      <Td className="text-right tabular-nums text-slate-500">
                        {alert.reorderPoint != null
                          ? Number(alert.reorderPoint).toLocaleString()
                          : '—'}
                      </Td>
                      <Td>
                        <StockAlertBadge status={alert.status} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </section>

        {/* Expiry Alerts Section */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <Clock size={18} className="text-orange-500" />
            <h2 className="text-base font-semibold text-slate-700">
              Alertes d'expiration
            </h2>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              {(expiryAlerts as any[]).length} lot{(expiryAlerts as any[]).length !== 1 ? 's' : ''}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Horizon :</label>
              <select
                value={daysAhead}
                onChange={(e) => setDaysAhead(Number(e.target.value))}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value={7}>7 jours</option>
                <option value={14}>14 jours</option>
                <option value={30}>30 jours</option>
                <option value={60}>60 jours</option>
                <option value={90}>90 jours</option>
              </select>
            </div>
          </div>

          {loadingExpiry ? (
            <PageLoader />
          ) : (
            <div className="overflow-hidden rounded-xl border border-stone-200 shadow-sm">
              <Table>
                <Thead>
                  <tr>
                    <Th>Numéro de lot</Th>
                    <Th>Produit</Th>
                    <Th>Entrepôt</Th>
                    <Th>Date d'expiration</Th>
                    <Th>Jours restants</Th>
                    <Th className="text-right">Quantité</Th>
                    <Th>État</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {(expiryAlerts as any[]).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                        Aucune alerte d'expiration dans les prochains {daysAhead} jours
                      </td>
                    </tr>
                  )}
                  {(expiryAlerts as any[]).map((batch: any) => {
                    const expiryDate = new Date(batch.expiryDate);
                    const daysLeft = Math.ceil(
                      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                    );
                    return (
                      <Tr key={batch.id}>
                        <Td className="font-mono text-xs font-medium text-slate-700">
                          {batch.batchNumber}
                        </Td>
                        <Td className="font-medium text-slate-800">{batch.product?.name ?? '—'}</Td>
                        <Td className="text-slate-600">{batch.warehouse?.name ?? '—'}</Td>
                        <Td className="text-slate-600 whitespace-nowrap">
                          {expiryDate.toLocaleDateString('fr-FR')}
                        </Td>
                        <Td>
                          <ExpiryBadge daysLeft={daysLeft} />
                        </Td>
                        <Td className="text-right tabular-nums font-semibold text-slate-700">
                          {Number(batch.quantity).toLocaleString()}
                        </Td>
                        <Td>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-slate-600">
                            {batch.state}
                          </span>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
