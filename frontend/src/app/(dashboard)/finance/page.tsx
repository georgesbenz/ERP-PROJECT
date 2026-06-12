'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Badge, statusVariant } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { financeService } from '@/services/finance.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';

export default function FinancePage() {
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', invoicePage],
    queryFn: () => financeService.listInvoices(invoicePage, 10),
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', paymentPage],
    queryFn: () => financeService.listPayments(paymentPage, 10),
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: financeService.listAccounts,
  });

  return (
    <>
      <Header title="Finance" />
      <div className="p-6 space-y-6">

        {/* Chart of Accounts Summary */}
        <Card>
          <CardHeader><CardTitle>Chart of Accounts / Plan Comptable</CardTitle></CardHeader>
          <CardContent>
            {!accounts?.length && <p className="text-sm text-gray-400">No accounts configured yet.</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {accounts?.slice(0, 8).map((a) => (
                <div key={a.id} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs font-mono text-gray-500">{a.code}</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.type}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Invoices / Factures</h2>
          {loadingInvoices ? <PageLoader /> : (
            <>
              <Table>
                <Thead>
                  <tr>
                    <Th>Number</Th>
                    <Th>Customer</Th>
                    <Th>Issue Date</Th>
                    <Th>Due Date</Th>
                    <Th>Total</Th>
                    <Th>Status</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {invoices?.data?.length === 0 && <tr><Td className="text-gray-400">No invoices yet</Td></tr>}
                  {invoices?.data?.map((inv) => (
                    <Tr key={inv.id}>
                      <Td className="font-mono">{inv.number}</Td>
                      <Td>{inv.customer?.name ?? '—'}</Td>
                      <Td>{formatDate(inv.issueDate)}</Td>
                      <Td>{inv.dueDate ? formatDate(inv.dueDate) : '—'}</Td>
                      <Td>{formatCurrency(Number(inv.total))}</Td>
                      <Td><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {invoices?.meta && <Pagination meta={invoices.meta as PaginationMeta} onPageChange={setInvoicePage} />}
            </>
          )}
        </div>

        {/* Payments */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Payments / Paiements</h2>
          {loadingPayments ? <PageLoader /> : (
            <>
              <Table>
                <Thead>
                  <tr><Th>Reference</Th><Th>Method</Th><Th>Amount</Th><Th>Date</Th><Th>Status</Th></tr>
                </Thead>
                <Tbody>
                  {payments?.data?.length === 0 && <tr><Td className="text-gray-400">No payments yet</Td></tr>}
                  {payments?.data?.map((p) => (
                    <Tr key={p.id}>
                      <Td className="font-mono">{p.reference}</Td>
                      <Td>{p.method}</Td>
                      <Td className="font-semibold">{formatCurrency(Number(p.amount))}</Td>
                      <Td>{formatDate(p.paidAt)}</Td>
                      <Td><Badge variant={statusVariant(p.status)}>{p.status}</Badge></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {payments?.meta && <Pagination meta={payments.meta as PaginationMeta} onPageChange={setPaymentPage} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
