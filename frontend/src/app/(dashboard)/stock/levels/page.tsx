'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Search, RotateCcw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/ui/Spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { stockService } from '@/services/stock.service';
import { inventoryService } from '@/services/inventory.service';
import { printTable } from '@/lib/print-utils';
import { useT } from '@/hooks/useT';

// ── Status badge ──────────────────────────────────────────────────────────────
function StockStatusBadge({ isOut, isLow }: { isOut: boolean; isLow: boolean }) {
  if (isOut)
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Rupture
      </span>
    );
  if (isLow)
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Stock faible
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> OK
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StockLevelsPage() {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ['stock-levels', warehouseId, search, lowStockOnly],
    queryFn: () =>
      stockService.getStockLevels({
        warehouseId: warehouseId || undefined,
        search: search || undefined,
        lowStockOnly: lowStockOnly || undefined,
      }),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: inventoryService.listWarehouses,
  });

  const reset = () => {
    setSearch('');
    setWarehouseId('');
    setLowStockOnly(false);
  };

  const hasFilters = search || warehouseId || lowStockOnly;

  return (
    <>
      <Header title={t('stock.levels.title')} />
      <div className="p-6 space-y-4">

        {/* Filters */}
        <div className="no-print rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher produit ou SKU…"
                className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-1.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>

            {/* Warehouse */}
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-medium text-slate-500">Entrepôt</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value="">Tous les entrepôts</option>
                {(warehouses as any[]).map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Low stock toggle */}
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="rounded border-stone-200 text-indigo-600 focus:ring-blue-300"
              />
              Stock faible uniquement
            </label>

            {hasFilters && (
              <button
                onClick={reset}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-stone-50"
              >
                <RotateCcw size={13} /> Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Summary + print */}
        {!isLoading && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {(levels as any[]).length} entrée{(levels as any[]).length !== 1 ? 's' : ''} trouvée{(levels as any[]).length !== 1 ? 's' : ''}
              {hasFilters ? ' (filtré)' : ''}
            </p>
            <button
              onClick={() => printTable({
                  title: 'Niveaux de Stock',
                  rows: levels as any[],
                  columns: [
                    { header: 'Produit', value: (i: any) => i.product?.name ?? '—' },
                    { header: 'SKU', value: (i: any) => i.product?.sku ?? '—' },
                    { header: 'Entrepôt', value: (i: any) => i.warehouse?.name ?? '—' },
                    { header: 'Disponible', value: (i: any) => Number(i.available).toLocaleString() },
                    { header: 'Réservé', value: (i: any) => Number(i.reserved).toLocaleString() },
                    { header: 'Endommagé', value: (i: any) => Number(i.damaged).toLocaleString() },
                    { header: 'En transit', value: (i: any) => Number(i.inTransit).toLocaleString() },
                    { header: 'Stock min', value: (i: any) => i.minStock ?? '—' },
                    { header: 'Statut', value: (i: any) => i.isOutOfStock ? 'Rupture' : i.isLowStock ? 'Stock faible' : 'Normal' },
                  ],
              })}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-stone-50 transition-colors"
            >
              <Printer size={13} /> Imprimer
            </button>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <PageLoader />
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 shadow-sm">
            <Table>
              <Thead>
                <tr>
                  <Th>{t('stock.levels.product')}</Th>
                  <Th>{t('stock.levels.sku')}</Th>
                  <Th>{t('stock.levels.warehouse')}</Th>
                  <Th className="text-right">{t('stock.levels.available')}</Th>
                  <Th className="text-right">{t('stock.levels.reserved')}</Th>
                  <Th className="text-right">{t('stock.levels.damaged')}</Th>
                  <Th className="text-right">{t('stock.levels.inTransit')}</Th>
                  <Th className="text-right">{t('stock.levels.totalPhysical')}</Th>
                  <Th className="text-right">{t('stock.levels.minStock')}</Th>
                  <Th>{t('common.status')}</Th>
                </tr>
              </Thead>
              <Tbody>
                {(levels as any[]).length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-sm text-slate-400">
                      {t('stock.levels.noStock')}
                    </td>
                  </tr>
                )}
                {(levels as any[]).map((item: any) => (
                  <Tr key={item.id}>
                    <Td className="font-medium text-slate-800 max-w-[160px] truncate">
                      {item.product?.name ?? '—'}
                    </Td>
                    <Td className="font-mono text-xs text-slate-500">{item.product?.sku ?? '—'}</Td>
                    <Td className="text-slate-600">{item.warehouse?.name ?? '—'}</Td>
                    <Td className="text-right">
                      <span className={`font-semibold tabular-nums ${item.isOutOfStock ? 'text-red-600' : item.isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>
                        {Number(item.available).toLocaleString()}
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums text-slate-600">
                      {Number(item.reserved).toLocaleString()}
                    </Td>
                    <Td className="text-right tabular-nums text-slate-600">
                      {Number(item.damaged).toLocaleString()}
                    </Td>
                    <Td className="text-right tabular-nums text-slate-500">
                      {Number(item.inTransit).toLocaleString()}
                    </Td>
                    <Td className="text-right tabular-nums font-medium text-slate-700">
                      {Number(item.physical).toLocaleString()}
                    </Td>
                    <Td className="text-right tabular-nums text-slate-500">
                      {Number(item.product?.minStock ?? 0).toLocaleString()}
                    </Td>
                    <Td>
                      <StockStatusBadge isOut={item.isOutOfStock} isLow={item.isLowStock} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
