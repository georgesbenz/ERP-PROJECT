'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import { inventoryService } from '@/services/inventory.service';
import { settingsService } from '@/services/settings.service';
import { formatCurrency } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';
import type { Product, StockLevel, StockMovement } from '@/types/models';

const productSchema = z.object({
  name: z.string().min(1, 'Name required'),
  sku: z.string().min(1, 'SKU required'),
  salePrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  taxId: z.string().optional(),
  isService: z.boolean().optional(),
});
type ProductForm = z.infer<typeof productSchema>;

export default function InventoryPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportInventoryToExcel } = await import('@/lib/excel-export');
      const [prodRes, stockRes, movRes] = await Promise.all([
        inventoryService.listProducts(1, 500),
        inventoryService.getStockLevels(1, 500),
        inventoryService.listMovements({ page: 1, limit: 500 }),
      ]);
      await exportInventoryToExcel({
        products:    prodRes.data as Product[],
        stockLevels: (stockRes as { data: StockLevel[] }).data,
        movements:   movRes.data as StockMovement[],
      });
    } finally {
      setExporting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => inventoryService.listProducts(page, 20, search || undefined),
  });

  const { data: taxes = [] } = useQuery({
    queryKey: ['taxes'],
    queryFn:  settingsService.listTaxes,
  });
  const activeTaxes = taxes.filter((t) => t.isActive);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: { salePrice: 0, costPrice: 0, isService: false },
  });

  const createMutation = useMutation({
    mutationFn: inventoryService.createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      reset();
      setShowCreate(false);
    },
  });

  return (
    <>
      <Header title="Inventory / Inventaire" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search products…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
              {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
              Export
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New Product
            </Button>
          </div>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>SKU</Th>
                  <Th>Sale Price</Th>
                  <Th>Tax</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <Tbody>
                {data?.data?.length === 0 && (
                  <tr><Td className="text-gray-400 col-span-5">No products yet</Td></tr>
                )}
                {data?.data?.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-medium text-gray-900">{p.name}</Td>
                    <Td>{p.sku ?? '—'}</Td>
                    <Td>{formatCurrency(Number(p.salePrice))}</Td>
                    <Td>
                      {p.tax
                        ? <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">{p.tax.code} {Number(p.tax.rate).toFixed(1)}%</span>
                        : <span className="text-gray-400 text-xs">—</span>
                      }
                    </Td>
                    <Td><Badge variant="info">{p.isService ? 'Service' : 'Physical'}</Badge></Td>
                    <Td><Badge variant={statusVariant(p.isActive ? 'ACTIVE' : 'INACTIVE')}>{p.isActive ? 'Active' : 'Inactive'}</Badge></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {data?.meta && (
              <Pagination meta={data.meta as PaginationMeta} onPageChange={setPage} />
            )}
          </>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Product">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <Input label="Product Name *" error={errors.name?.message} {...register('name')} />
          <Input label="SKU *" error={errors.sku?.message} {...register('sku')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sale Price *" type="number" step="0.01" error={errors.salePrice?.message} {...register('salePrice')} />
            <Input label="Cost Price *" type="number" step="0.01" error={errors.costPrice?.message} {...register('costPrice')} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tax Code</label>
            <select
              {...register('taxId')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">No tax / Exempt</option>
              {activeTaxes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({Number(t.rate).toFixed(2)}%)
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('isService')} className="rounded" />
            This is a service (no stock tracking)
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || isSubmitting}>Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
