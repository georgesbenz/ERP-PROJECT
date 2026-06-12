'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RotateCcw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/ui/Spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { stockService } from '@/services/stock.service';
import { inventoryService } from '@/services/inventory.service';

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
      <Header title="Niveaux de Stock" />
      <div className="p-6 space-y-4">

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher produit ou SKU…"
                className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Warehouse */}
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Entrepôt</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Tous les entrepôts</option>
                {(warehouses as any[]).map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Low stock toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Stock faible uniquement
            </label>

            {hasFilters && (
              <button
                onClick={reset}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
              >
                <RotateCcw size={13} /> Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        {!isLoading && (
          <p className="text-xs text-gray-500">
            {(levels as any[]).length} entrée{(levels as any[]).length !== 1 ? 's' : ''} trouvée{(levels as any[]).length !== 1 ? 's' : ''}
            {hasFilters ? ' (filtré)' : ''}
          </p>
        )}

        {/* Table */}
        {isLoading ? (
          <PageLoader />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <Table>
              <Thead>
                <tr>
                  <Th>Produit</Th>
                  <Th>SKU</Th>
                  <Th>Entrepôt</Th>
                  <Th className="text-right">Disponible</Th>
                  <Th className="text-right">Réservé</Th>
                  <Th className="text-right">Endommagé</Th>
                  <Th className="text-right">En transit</Th>
                  <Th className="text-right">Total physique</Th>
                  <Th className="text-right">Stock min</Th>
                  <Th>Statut</Th>
                </tr>
              </Thead>
              <Tbody>
                {(levels as any[]).length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-sm text-gray-400">
                      Aucun stock trouvé
                    </td>
                  </tr>
                )}
                {(levels as any[]).map((item: any) => (
                  <Tr key={item.id}>
                    <Td className="font-medium text-gray-900 max-w-[160px] truncate">
                      {item.product?.name ?? '—'}
                    </Td>
                    <Td className="font-mono text-xs text-gray-500">{item.product?.sku ?? '—'}</Td>
                    <Td className="text-gray-600">{item.warehouse?.name ?? '—'}</Td>
                    <Td className="text-right">
                      <span className={`font-semibold tabular-nums ${item.isOutOfStock ? 'text-red-600' : item.isLowStock ? 'text-amber-600' : 'text-gray-900'}`}>
                        {Number(item.available).toLocaleString()}
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums text-gray-600">
                      {Number(item.reserved).toLocaleString()}
                    </Td>
                    <Td className="text-right tabular-nums text-gray-600">
                      {Number(item.damaged).toLocaleString()}
                    </Td>
                    <Td className="text-right tabular-nums text-gray-500">
                      {Number(item.inTransit).toLocaleString()}
                    </Td>
                    <Td className="text-right tabular-nums font-medium text-gray-700">
                      {Number(item.physical).toLocaleString()}
                    </Td>
                    <Td className="text-right tabular-nums text-gray-500">
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
