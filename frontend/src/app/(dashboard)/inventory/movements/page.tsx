'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Printer, RotateCcw, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { inventoryService } from '@/services/inventory.service';
import { formatDate } from '@/lib/utils';
import { printTable } from '@/lib/print-utils';
import { useT } from '@/hooks/useT';
import type { PaginationMeta } from '@/lib/api';
import type { MovementType } from '@/types/models';

// ── Movement type display config ───────────────────────────────────────────────

const TYPE_CONFIG: Record<MovementType, { label: string; color: string; sign: string }> = {
  IN:         { label: 'Purchase / Receipt', color: 'bg-emerald-100 text-emerald-700', sign: '+' },
  OUT:        { label: 'Sale / Issue',        color: 'bg-red-100    text-red-700',      sign: '−' },
  ADJUSTMENT: { label: 'Adjustment',          color: 'bg-amber-100  text-amber-700',    sign: '±' },
  TRANSFER:   { label: 'Transfer',            color: 'bg-sky-100    text-sky-700',      sign: '→' },
  RETURN:     { label: 'Return',              color: 'bg-purple-100 text-purple-700',   sign: '+' },
};

const MOVEMENT_TYPES: MovementType[] = ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN'];

// ── Record movement form schema ────────────────────────────────────────────────

const movementSchema = z.object({
  productId:   z.string().min(1, 'Select a product'),
  warehouseId: z.string().min(1, 'Select a warehouse'),
  type:        z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN']),
  quantity:    z.coerce.number().min(0.001, 'Must be > 0'),
  unitCost:    z.coerce.number().min(0).optional(),
  reference:   z.string().optional(),
  notes:       z.string().optional(),
});
type MovementForm = z.infer<typeof movementSchema>;

// ── Page ───────────────────────────────────────────────────────────────────────

export default function StockMovementsPage() {
  const { t } = useT();
  const qc = useQueryClient();

  // Filters
  const [page, setPage]             = useState(1);
  const [productId, setProductId]   = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const resetFilters = () => {
    setProductId(''); setWarehouseId(''); setTypeFilter('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasFilters = productId || warehouseId || typeFilter || dateFrom || dateTo;

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['movements', page, productId, warehouseId, typeFilter, dateFrom, dateTo],
    queryFn: () => inventoryService.listMovements({
      page,
      limit: 30,
      productId:   productId   || undefined,
      warehouseId: warehouseId || undefined,
      type:        typeFilter  || undefined,
      dateFrom:    dateFrom    || undefined,
      dateTo:      dateTo      || undefined,
    }),
  });

  const { data: productsRes } = useQuery({
    queryKey: ['products-all'],
    queryFn:  () => inventoryService.listProducts(1, 200),
  });
  const products = productsRes?.data ?? [];

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn:  inventoryService.listWarehouses,
  });

  return (
    <>
      <Header title={t('inventory.movements')} />
      <div className="p-6 space-y-4">

        {/* ── Filters bar ── */}
        <div className="no-print rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            {/* Product filter */}
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-medium text-slate-500">Product</label>
              <select
                value={productId}
                onChange={(e) => { setProductId(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            {/* Warehouse filter */}
            <div className="min-w-[160px]">
              <label className="mb-1 block text-xs font-medium text-slate-500">Warehouse</label>
              <select
                value={warehouseId}
                onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value="">All warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Type filter */}
            <div className="min-w-[160px]">
              <label className="mb-1 block text-xs font-medium text-slate-500">Movement Type</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value="">All types</option>
                {MOVEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>

            <div className="flex gap-2 ml-auto">
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-stone-50"
                >
                  <RotateCcw size={13} /> Reset
                </button>
              )}
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Record Movement
              </Button>
            </div>
          </div>

          {/* Active filter summary */}
          {hasFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Filter size={12} className="text-slate-400" />
              <span className="text-xs text-slate-400">Filtering by:</span>
              {productId && <FilterChip label={`Product: ${products.find((p) => p.id === productId)?.name ?? productId}`} onRemove={() => setProductId('')} />}
              {warehouseId && <FilterChip label={`Warehouse: ${warehouses.find((w) => w.id === warehouseId)?.name ?? warehouseId}`} onRemove={() => setWarehouseId('')} />}
              {typeFilter && <FilterChip label={`Type: ${TYPE_CONFIG[typeFilter as MovementType]?.label ?? typeFilter}`} onRemove={() => setTypeFilter('')} />}
              {dateFrom && <FilterChip label={`From: ${dateFrom}`} onRemove={() => setDateFrom('')} />}
              {dateTo   && <FilterChip label={`To: ${dateTo}`}     onRemove={() => setDateTo('')} />}
            </div>
          )}
        </div>

        {/* ── Results summary ── */}
        {!isLoading && data?.meta && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {data.meta.total} movement{data.meta.total !== 1 ? 's' : ''} found
              {hasFilters ? ' (filtered)' : ''}
            </p>
            <button
              onClick={() => printTable({
                title: 'Stock Movements / Mouvements de Stock',
                rows: data?.data ?? [],
                columns: [
                  { header: 'Date', value: (m) => new Date(m.createdAt).toLocaleString('fr-FR') },
                  { header: 'Product', value: (m) => m.product?.name ?? '—' },
                  { header: 'SKU', value: (m) => m.product?.sku ?? '—' },
                  { header: 'Warehouse', value: (m) => m.warehouse?.name ?? '—' },
                  { header: 'Type', value: (m) => m.type },
                  { header: 'Quantity', value: (m) => Number(m.quantity).toLocaleString() },
                  { header: 'Unit Cost', value: (m) => m.unitCost ? Number(m.unitCost).toLocaleString() : '—' },
                  { header: 'Reference', value: (m) => m.reference ?? '—' },
                ],
              })}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-stone-50 transition-colors"
            >
              <Printer size={13} /> Print
            </button>
          </div>
        )}

        {/* ── Table ── */}
        {isLoading ? <PageLoader /> : (
          <>
            <div className="overflow-hidden rounded-xl border border-stone-200 shadow-sm">
              <Table>
                <Thead>
                  <tr>
                    <Th>Date &amp; Time</Th>
                    <Th>Product</Th>
                    <Th>SKU</Th>
                    <Th>Warehouse</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Quantity</Th>
                    <Th className="text-right">Unit Cost</Th>
                    <Th>Reference</Th>
                    <Th>Notes</Th>
                    <Th>By</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {data?.data?.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400 text-sm">
                        No stock movements found
                        {hasFilters && ' — try adjusting your filters'}
                      </td>
                    </tr>
                  )}
                  {data?.data?.map((m) => {
                    const cfg = TYPE_CONFIG[m.type];
                    const isPositive = ['IN', 'RETURN'].includes(m.type);
                    return (
                      <Tr key={m.id}>
                        <Td className="whitespace-nowrap text-xs text-slate-500">
                          {new Date(m.createdAt).toLocaleString()}
                        </Td>
                        <Td className="font-medium text-slate-800">{m.product?.name ?? '—'}</Td>
                        <Td className="font-mono text-xs text-slate-500">{m.product?.sku ?? '—'}</Td>
                        <Td className="text-slate-600">{m.warehouse?.name ?? '—'}</Td>
                        <Td>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <span className={`font-bold tabular-nums ${isPositive ? 'text-emerald-600' : m.type === 'ADJUSTMENT' ? 'text-amber-600' : 'text-red-600'}`}>
                            {cfg.sign}{Number(m.quantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                          </span>
                        </Td>
                        <Td className="text-right text-slate-600">
                          {m.unitCost != null ? Number(m.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </Td>
                        <Td className="font-mono text-xs text-slate-500">{m.reference ?? '—'}</Td>
                        <Td className="text-xs text-slate-500"><span title={m.notes ?? undefined} className="block max-w-[160px] truncate">{m.notes ?? '—'}</span></Td>
                        <Td className="text-xs text-slate-400">{m.createdBy ? m.createdBy.slice(0, 8) + '…' : '—'}</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
            {data?.meta && (
              <Pagination meta={data.meta as PaginationMeta} onPageChange={setPage} />
            )}
          </>
        )}
      </div>

      {showCreate && (
        <RecordMovementModal
          products={products}
          warehouses={warehouses}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['movements'] });
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}

// ── Filter chip ────────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {label}
      <button onClick={onRemove} className="ml-0.5 rounded-full hover:bg-indigo-100 p-0.5 leading-none">✕</button>
    </span>
  );
}

// ── Record Movement Modal ──────────────────────────────────────────────────────

function RecordMovementModal({
  products,
  warehouses,
  onClose,
  onCreated,
}: {
  products: import('@/types/models').Product[];
  warehouses: import('@/types/models').Warehouse[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<MovementForm>({
    resolver: zodResolver(movementSchema) as any,
    defaultValues: { type: 'IN', quantity: 1 },
  });

  const selectedType = watch('type') as MovementType;
  const cfg = TYPE_CONFIG[selectedType] ?? TYPE_CONFIG.IN;

  const mutation = useMutation({
    mutationFn: inventoryService.recordMovement,
    onSuccess: onCreated,
  });

  return (
    <Modal open onClose={onClose} title="Record Stock Movement">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">

        {/* Type selector — big buttons */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Movement Type</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {MOVEMENT_TYPES.map((t) => {
              const c = TYPE_CONFIG[t];
              const isSelected = selectedType === t;
              return (
                <label
                  key={t}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 py-3 text-center transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-stone-200 hover:border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input type="radio" value={t} {...register('type')} className="sr-only" />
                  <span className={`mb-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${c.color}`}>
                    {c.sign}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight text-center">{t}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-400">{cfg.label}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Product */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Product <span className="text-red-500">*</span></label>
            <select
              {...register('productId')}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 ${errors.productId ? 'border-red-400' : 'border-stone-200'}`}
            >
              <option value="">Select product…</option>
              {products.filter((p) => !p.isService).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
            {errors.productId && <p className="mt-1 text-xs text-red-600">{errors.productId.message}</p>}
          </div>

          {/* Warehouse */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Warehouse <span className="text-red-500">*</span></label>
            <select
              {...register('warehouseId')}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 ${errors.warehouseId ? 'border-red-400' : 'border-stone-200'}`}
            >
              <option value="">Select warehouse…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} {w.code ? `(${w.code})` : ''}</option>
              ))}
            </select>
            {errors.warehouseId && <p className="mt-1 text-xs text-red-600">{errors.warehouseId.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Quantity *"
            type="number"
            step="0.001"
            min="0.001"
            error={errors.quantity?.message}
            {...register('quantity')}
          />
          <Input
            label="Unit Cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('unitCost')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Reference" placeholder="e.g. PO-000001" {...register('reference')} />
          <Input label="Notes" placeholder="Optional note…" {...register('notes')} />
        </div>

        {/* Effect hint */}
        <div className={`rounded-lg p-3 text-sm ${['IN', 'RETURN'].includes(selectedType) ? 'bg-emerald-50 text-emerald-700' : selectedType === 'ADJUSTMENT' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
          {selectedType === 'IN'         && '↑ Stock will increase by the entered quantity'}
          {selectedType === 'RETURN'     && '↑ Stock will increase (customer return)'}
          {selectedType === 'OUT'        && '↓ Stock will decrease by the entered quantity'}
          {selectedType === 'ADJUSTMENT' && '↓ Stock will be reduced by the entered quantity (use for corrections)'}
          {selectedType === 'TRANSFER'   && '↓ Stock will decrease at source warehouse'}
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600">
            {(mutation.error as any)?.response?.data?.message ?? 'Failed to record movement'}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Record Movement</Button>
        </div>
      </form>
    </Modal>
  );
}
