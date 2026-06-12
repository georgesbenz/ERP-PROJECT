'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Download } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusVariant } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { salesService } from '@/services/sales.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';
import type { Sale } from '@/types/models';

export default function SalesPage() {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportSalesToExcel } = await import('@/lib/excel-export');
      const res = await salesService.listSales(1, 1000);
      await exportSalesToExcel({ sales: (res as { data: Sale[] }).data });
    } finally {
      setExporting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page],
    queryFn: () => salesService.listSales(page, 20),
  });

  return (
    <>
      <Header title="Sales / Ventes" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search sales…" className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
              <Download size={13} /> Export
            </Button>
            <Button><Plus size={16} /> New Sale</Button>
          </div>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Customer</Th>
                  <Th>Date</Th>
                  <Th>Total</Th>
                  <Th>Paid</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <Tbody>
                {data?.data?.length === 0 && (
                  <tr><Td className="text-slate-400">No sales yet</Td></tr>
                )}
                {data?.data?.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-mono font-medium text-indigo-700">{s.reference}</Td>
                    <Td>{s.customer?.name ?? 'Walk-in'}</Td>
                    <Td>{formatDate(s.saleDate)}</Td>
                    <Td className="font-semibold">{formatCurrency(Number(s.total))}</Td>
                    <Td>{formatCurrency(Number(s.paidAmount))}</Td>
                    <Td><Badge variant={statusVariant(s.status)}>{s.status}</Badge></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {data?.meta && <Pagination meta={data.meta as PaginationMeta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </>
  );
}
