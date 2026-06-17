'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Printer, Search, Download, FileText } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusVariant } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { salesService } from '@/services/sales.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { printTable } from '@/lib/print-utils';
import { useT } from '@/hooks/useT';
import type { PaginationMeta } from '@/lib/api';
import type { Sale } from '@/types/models';

export default function SalesPage() {
  const { t } = useT();
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
      <Header title={t('sales.title')} />
      <div className="p-6 space-y-4">
        <div className="no-print flex items-center justify-between">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder={t('sales.searchPlaceholder')} className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
              <Download size={13} /> {t('common.export')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => printTable({
              title: t('sales.title'),
              rows: data?.data ?? [],
              columns: [
                { header: t('common.reference'), value: (s) => s.reference },
                { header: t('sales.customer'), value: (s) => s.customer?.name ?? t('sales.walkIn') },
                { header: t('common.date'), value: (s) => formatDate(s.saleDate) },
                { header: t('sales.totalTTC'), value: (s) => formatCurrency(Number(s.total)) },
                { header: t('sales.paid'), value: (s) => formatCurrency(Number(s.paidAmount)) },
                { header: t('common.status'), value: (s) => s.status },
              ],
            })}>
              <Printer size={13} /> {t('common.print')}
            </Button>
            <Button><Plus size={16} /> {t('sales.newSale')}</Button>
          </div>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>{t('common.reference')}</Th>
                  <Th>{t('sales.customer')}</Th>
                  <Th>{t('common.date')}</Th>
                  <Th>{t('common.total')}</Th>
                  <Th>{t('sales.paid')}</Th>
                  <Th>{t('common.status')}</Th>
                  <Th>PDF</Th>
                </tr>
              </Thead>
              <Tbody>
                {data?.data?.length === 0 && (
                  <tr><Td className="text-slate-400">{t('sales.noSales')}</Td></tr>
                )}
                {data?.data?.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-mono font-medium text-indigo-700">{s.reference}</Td>
                    <Td>{s.customer?.name ?? t('sales.walkIn')}</Td>
                    <Td>{formatDate(s.saleDate)}</Td>
                    <Td className="font-semibold">{formatCurrency(Number(s.total))}</Td>
                    <Td>{formatCurrency(Number(s.paidAmount))}</Td>
                    <Td><Badge variant={statusVariant(s.status)}>{s.status}</Badge></Td>
                    <Td>
                      <button onClick={() => salesService.downloadInvoicePdf(s.id)} title="Télécharger Facture PDF" className="text-indigo-600 hover:text-indigo-800">
                        <FileText size={15} />
                      </button>
                    </Td>
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
