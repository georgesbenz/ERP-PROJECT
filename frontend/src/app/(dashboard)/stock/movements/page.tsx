'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/ui/Spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { stockService } from '@/services/stock.service';
import { inventoryService } from '@/services/inventory.service';
import type { PaginationMeta } from '@/lib/api';

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  IN: { label: 'Entrée', color: 'bg-emerald-100 text-emerald-700' },
  OUT: { label: 'Sortie', color: 'bg-red-100 text-red-700' },
  ADJUSTMENT: { label: 'Ajustement', color: 'bg-amber-100 text-amber-700' },
  TRANSFER: { label: 'Transfert', color: 'bg-sky-100 text-sky-700' },
  RETURN: { label: 'Retour', color: 'bg-purple-100 text-purple-700' },
  PURCHASE_RECEIPT: { label: 'Réception achat', color: 'bg-blue-100 text-blue-700' },
  PURCHASE_PARTIAL_RECEIPT: { label: 'Réception partielle', color: 'bg-blue-100 text-blue-700' },
  PURCHASE_RETURN_SUPPLIER: { label: 'Retour fournisseur', color: 'bg-orange-100 text-orange-700' },
  SALE_DELIVERY: { label: 'Livraison vente', color: 'bg-red-100 text-red-700' },
  SALE_PARTIAL_DELIVERY: { label: 'Livraison partielle', color: 'bg-red-100 text-red-700' },
  CUSTOMER_RETURN_RESALABLE: { label: 'Retour client (bon état)', color: 'bg-green-100 text-green-700' },
  CUSTOMER_RETURN_DAMAGED: { label: 'Retour client (endommagé)', color: 'bg-gray-100 text-gray-700' },
  POS_SALE: { label: 'Vente POS', color: 'bg-red-100 text-red-700' },
  ADJUSTMENT_IN: { label: 'Ajust. positif', color: 'bg-orange-100 text-orange-700' },
  ADJUSTMENT_OUT: { label: 'Ajust. négatif', color: 'bg-orange-100 text-orange-700' },
  DAMAGE_WRITE_OFF: { label: 'Perte dommage', color: 'bg-gray-100 text-gray-600' },
  EXPIRY_WRITE_OFF: { label: 'Perte expiration', color: 'bg-gray-100 text-gray-600' },
  STATE_CHANGE: { label: 'Changement état', color: 'bg-yellow-100 text-yellow-700' },
  TRANSFER_OUT: { label: 'Transfert sortant', color: 'bg-purple-100 text-purple-700' },
  TRANSFER_IN: { label: 'Transfert entrant', color: 'bg-purple-100 text-purple-700' },
  OPENING_STOCK: { label: 'Stock initial', color: 'bg-indigo-100 text-indigo-700' },
  CYCLE_COUNT_IN: { label: 'Inventaire +', color: 'bg-teal-100 text-teal-700' },
  CYCLE_COUNT_OUT: { label: 'Inventaire −', color: 'bg-teal-100 text-teal-700' },
  PRODUCTION_IN: { label: 'Production entrée', color: 'bg-lime-100 text-lime-700' },
  PRODUCTION_OUT: { label: 'Production sortie', color: 'bg-lime-100 text-lime-700' },
  RESERVATION: { label: 'Réservation', color: 'bg-violet-100 text-violet-700' },
  RESERVATION_RELEASE: { label: 'Libér. réservation', color: 'bg-violet-100 text-violet-700' },
  BACKORDER_FULFILL: { label: 'Commande arriérée', color: 'bg-cyan-100 text-cyan-700' },
};

const POSITIVE_TYPES = new Set([
  'IN', 'RETURN', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'PURCHASE_RECEIPT',
  'PURCHASE_PARTIAL_RECEIPT', 'CUSTOMER_RETURN_RESALABLE', 'OPENING_STOCK',
  'CYCLE_COUNT_IN', 'PRODUCTION_IN', 'BACKORDER_FULFILL', 'RESERVATION_RELEASE',
]);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StockMovementsPage() {
  const [page, setPage] = useState(1);
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const resetFilters = () => {
    setWarehouseId(''); setProductId(''); setTypeFilter('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };
  const hasFilters = warehouseId || productId || typeFilter || dateFrom || dateTo;

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', page, warehouseId, productId, typeFilter, dateFrom, dateTo],
    queryFn: () =>
      stockService.getMovements({
        page,
        limit: 30,
        warehouseId: warehouseId || undefined,
        productId: productId || undefined,
        type: typeFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      }),
  });

  const { data: productsRes } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => inventoryService.listProducts(1, 200),
  });
  const products = (productsRes as any)?.data ?? [];

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: inventoryService.listWarehouses,
  });

  const movements: any[] = (data as any)?.data ?? [];
  const meta: PaginationMeta | undefined = (data as any)?.meta;

  return (
    <>
      <Header title="Mouvements de Stock" />
      <div className="p-6 space-y-4">

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Produit</label>
              <select
                value={productId}
                onChange={(e) => { setProductId(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Tous les produits</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            <div className="min-w-[160px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Entrepôt</label>
              <select
                value={warehouseId}
                onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Tous les entrepôts</option>
                {(warehouses as any[]).map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Type de mouvement</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Tous les types</option>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Du</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Au</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {hasFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
              >
                <RotateCcw size={13} /> Réinitialiser
              </button>
            )}
          </div>
        </div>

        {!isLoading && meta && (
          <p className="text-xs text-gray-500">
            {meta.total} mouvement{meta.total !== 1 ? 's' : ''} trouvé{meta.total !== 1 ? 's' : ''}
            {hasFilters ? ' (filtré)' : ''}
          </p>
        )}

        {isLoading ? (
          <PageLoader />
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
              <Table>
                <Thead>
                  <tr>
                    <Th>Date/Heure</Th>
                    <Th>Produit</Th>
                    <Th>SKU</Th>
                    <Th>Entrepôt</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Quantité</Th>
                    <Th className="text-right">Coût unit.</Th>
                    <Th>Référence</Th>
                    <Th>Raison</Th>
                    <Th>Par</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-sm text-gray-400">
                        Aucun mouvement trouvé{hasFilters ? ' — modifiez vos filtres' : ''}
                      </td>
                    </tr>
                  )}
                  {movements.map((m: any) => {
                    const cfg = TYPE_CONFIG[m.type] ?? { label: m.type, color: 'bg-gray-100 text-gray-600' };
                    const positive = POSITIVE_TYPES.has(m.type);
                    return (
                      <Tr key={m.id}>
                        <Td className="whitespace-nowrap text-xs text-gray-500">
                          {new Date(m.createdAt).toLocaleString('fr-FR')}
                        </Td>
                        <Td className="font-medium text-gray-900 max-w-[140px] truncate">
                          {m.product?.name ?? '—'}
                        </Td>
                        <Td className="font-mono text-xs text-gray-500">{m.product?.sku ?? '—'}</Td>
                        <Td className="text-gray-600">{m.warehouse?.name ?? '—'}</Td>
                        <Td>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <span className={`font-bold tabular-nums ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {positive ? '+' : '−'}{Number(m.quantity).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                          </span>
                        </Td>
                        <Td className="text-right text-gray-600 tabular-nums">
                          {m.unitCost != null
                            ? Number(m.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2 })
                            : '—'}
                        </Td>
                        <Td className="font-mono text-xs text-gray-500">{m.reference ?? '—'}</Td>
                        <Td className="text-xs text-gray-500 max-w-[120px] truncate">
                          {m.reason ?? m.notes ?? '—'}
                        </Td>
                        <Td className="text-xs text-gray-400">
                          {m.createdBy ? m.createdBy.slice(0, 8) + '…' : '—'}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </>
  );
}
