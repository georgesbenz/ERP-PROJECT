'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, PackageCheck, Download } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, statusVariant } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { purchasesService } from '@/services/purchases.service';
import { inventoryService } from '@/services/inventory.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';
import type { Supplier, Product, Purchase } from '@/types/models';

// ── Schema ─────────────────────────────────────────────────────────────────────

const lineSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity:  z.coerce.number().min(0.001, 'Must be > 0'),
  unitCost:  z.coerce.number().min(0, 'Must be ≥ 0'),
  discount:  z.coerce.number().min(0).max(100).optional(),
  taxRate:   z.coerce.number().min(0).max(100).optional(),
});

const poSchema = z.object({
  supplierId:   z.string().optional(),
  expectedDate: z.string().optional(),
  notes:        z.string().optional(),
  lines:        z.array(lineSchema).min(1, 'Add at least one line'),
});

type PoForm = z.infer<typeof poSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function lineTotal(qty: number, cost: number, disc = 0, tax = 0) {
  const base = qty * cost * (1 - disc / 100);
  return base * (1 + tax / 100);
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportPurchasesToExcel } = await import('@/lib/excel-export');
      const res = await purchasesService.listPurchases(1, 1000);
      await exportPurchasesToExcel({ orders: (res as { data: Purchase[] }).data });
    } finally {
      setExporting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page],
    queryFn: () => purchasesService.listPurchases(page, 20),
  });

  const receiveMutation = useMutation({
    mutationFn: purchasesService.receivePurchase,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  });

  return (
    <>
      <Header title="Purchases / Achats" />
      <div className="p-6 space-y-4">

        <div className="flex items-center justify-between">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search purchases…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
              <Download size={13} /> Export
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New Purchase Order
            </Button>
          </div>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Supplier</Th>
                  <Th>Order Date</Th>
                  <Th>Expected</Th>
                  <Th>Lines</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </Thead>
              <Tbody>
                {data?.data?.length === 0 && (
                  <tr><Td className="text-gray-400">No purchase orders yet</Td></tr>
                )}
                {data?.data?.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-mono font-medium text-indigo-700">{p.reference}</Td>
                    <Td>{p.supplier?.name ?? '—'}</Td>
                    <Td>{formatDate(p.orderDate)}</Td>
                    <Td>{p.expectedDate ? formatDate(p.expectedDate) : '—'}</Td>
                    <Td className="text-gray-500">{p.lines?.length ?? 0} items</Td>
                    <Td className="font-semibold">{formatCurrency(Number(p.total))}</Td>
                    <Td><Badge variant={statusVariant(p.status)}>{p.status}</Badge></Td>
                    <Td>
                      {p.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={receiveMutation.isPending}
                          onClick={() => receiveMutation.mutate(p.id)}
                          title="Mark goods as received"
                        >
                          <PackageCheck size={13} /> Receive
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {data?.meta && <Pagination meta={data.meta as PaginationMeta} onPageChange={setPage} />}
          </>
        )}
      </div>

      {showCreate && (
        <CreatePoModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['purchases'] });
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}

// ── Create PO Modal ─────────────────────────────────────────────────────────────

function CreatePoModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: suppliersRes } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => purchasesService.listSuppliers(1, 200),
  });
  const suppliers: Supplier[] = suppliersRes?.data ?? [];

  const { data: productsRes } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => inventoryService.listProducts(1, 200),
  });
  const products: Product[] = productsRes?.data ?? [];

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<PoForm>({
    resolver: zodResolver(poSchema) as any,
    defaultValues: { lines: [{ productId: '', quantity: 1, unitCost: 0, discount: 0, taxRate: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const watchedLines = watch('lines');

  const subtotal = watchedLines?.reduce((sum, l) => {
    const qty = Number(l.quantity) || 0;
    const cost = Number(l.unitCost) || 0;
    const disc = Number(l.discount) || 0;
    return sum + qty * cost * (1 - disc / 100);
  }, 0) ?? 0;

  const taxTotal = watchedLines?.reduce((sum, l) => {
    const qty = Number(l.quantity) || 0;
    const cost = Number(l.unitCost) || 0;
    const disc = Number(l.discount) || 0;
    const tax = Number(l.taxRate) || 0;
    const base = qty * cost * (1 - disc / 100);
    return sum + base * (tax / 100);
  }, 0) ?? 0;

  const total = subtotal + taxTotal;

  const createMutation = useMutation({
    mutationFn: purchasesService.createPurchase,
    onSuccess:  onCreated,
  });

  const onSubmit = (d: PoForm) => {
    createMutation.mutate({
      supplierId:   d.supplierId || undefined,
      expectedDate: d.expectedDate || undefined,
      notes:        d.notes,
      lines: d.lines.map((l) => ({
        productId: l.productId,
        quantity:  Number(l.quantity),
        unitCost:  Number(l.unitCost),
        discount:  Number(l.discount) || 0,
        taxRate:   Number(l.taxRate)  || 0,
      })),
    });
  };

  return (
    <Modal open onClose={onClose} title="New Purchase Order" className="max-w-3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Header fields */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Supplier</label>
            <select
              {...register('supplierId')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— No supplier —</option>
              {suppliers.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <Input label="Expected Delivery Date" type="date" {...register('expectedDate')} />
          <Input label="Notes" {...register('notes')} />
        </div>

        {/* Line items */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Order Lines</h3>
            <button
              type="button"
              onClick={() => append({ productId: '', quantity: 1, unitCost: 0, discount: 0, taxRate: 0 })}
              className="flex items-center gap-1 rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
            >
              <Plus size={12} /> Add Line
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500">
                  <th className="px-3 py-2 text-left w-48">Product</th>
                  <th className="px-3 py-2 text-right w-24">Qty</th>
                  <th className="px-3 py-2 text-right w-28">Unit Cost</th>
                  <th className="px-3 py-2 text-right w-20">Disc %</th>
                  <th className="px-3 py-2 text-right w-20">Tax %</th>
                  <th className="px-3 py-2 text-right w-24">Line Total</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => {
                  const l = watchedLines?.[idx];
                  const qty  = Number(l?.quantity) || 0;
                  const cost = Number(l?.unitCost)  || 0;
                  const disc = Number(l?.discount)  || 0;
                  const tax  = Number(l?.taxRate)   || 0;
                  const lt   = lineTotal(qty, cost, disc, tax);
                  const err  = (errors.lines as any)?.[idx];

                  return (
                    <tr key={field.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        <select
                          {...register(`lines.${idx}.productId`)}
                          className={`w-full rounded border px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none ${err?.productId ? 'border-red-400' : 'border-gray-200'}`}
                        >
                          <option value="">Select…</option>
                          {products.filter((p) => p.isActive && !p.isService).map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" step="0.001" min="0.001"
                          {...register(`lines.${idx}.quantity`)}
                          className={`w-full rounded border px-2 py-1.5 text-right text-sm focus:border-indigo-500 focus:outline-none ${err?.quantity ? 'border-red-400' : 'border-gray-200'}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" step="0.01" min="0"
                          {...register(`lines.${idx}.unitCost`)}
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" step="0.01" min="0" max="100"
                          {...register(`lines.${idx}.discount`)}
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" step="0.01" min="0" max="100"
                          {...register(`lines.${idx}.taxRate`)}
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {formatCurrency(lt)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(idx)} className="text-gray-300 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(errors.lines as any)?.message && (
            <p className="mt-1 text-xs text-red-600">{(errors.lines as any).message}</p>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Tax</span>
              <span>{formatCurrency(taxTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {createMutation.isError && (
          <p className="text-sm text-red-600">
            {(createMutation.error as any)?.response?.data?.message ?? 'Failed to create purchase order'}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Create Purchase Order</Button>
        </div>
      </form>
    </Modal>
  );
}
