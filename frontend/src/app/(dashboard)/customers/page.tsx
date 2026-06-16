'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, History, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { salesService } from '@/services/sales.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';
import type { Customer } from '@/types/models';

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CustomersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => salesService.listCustomers(page, 20, search || undefined),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['customer-history', historyCustomer?.id],
    queryFn: () => salesService.getCustomerHistory(historyCustomer!.id),
    enabled: !!historyCustomer,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  const createMutation = useMutation({
    mutationFn: salesService.createCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      reset();
      setShowCreate(false);
    },
  });

  return (
    <>
      <Header title="Customers / Clients" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher clients…"
              className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nouveau client</Button>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Nom</Th><Th>Code</Th><Th>Email</Th><Th>Téléphone</Th>
                    <Th>Statut</Th><Th>Depuis</Th><Th>Historique</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data?.data?.map((c) => (
                    <Tr key={c.id}>
                      <Td className="font-medium text-slate-800">{c.name}</Td>
                      <Td className="font-mono text-xs">{c.code}</Td>
                      <Td className="text-slate-500">{c.email ?? '—'}</Td>
                      <Td className="text-slate-500">{c.phone ?? '—'}</Td>
                      <Td><Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Actif' : 'Inactif'}</Badge></Td>
                      <Td className="text-slate-500">{formatDate(c.createdAt)}</Td>
                      <Td>
                        <button
                          onClick={() => setHistoryCustomer(c)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <History size={13} /> Historique
                        </button>
                      </Td>
                    </Tr>
                  ))}
                  {data?.data?.length === 0 && (
                    <Tr><Td colSpan={7} className="text-center text-slate-400 py-8">Aucun client</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </div>
            {data?.meta && <Pagination meta={data.meta as PaginationMeta} onPageChange={setPage} />}
          </>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau client">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom *" {...register('name')} error={errors.name?.message} className="col-span-2" />
            <Input label="Code *" {...register('code')} error={errors.code?.message} />
            <Input label="Téléphone" {...register('phone')} />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <Input label="Adresse" {...register('address')} className="col-span-2" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button type="submit" loading={createMutation.isPending}>Créer</Button>
          </div>
        </form>
      </Modal>

      {/* ── Purchase History Modal ────────────────────────────────────────────── */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="font-bold text-slate-800">Historique — {historyCustomer.name}</h2>
                {historyData && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {historyData.totalOrders} commandes · Total : {formatCurrency(Number(historyData.totalSpent))}
                  </p>
                )}
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="p-2 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="p-8"><PageLoader /></div>
              ) : (
                <Table>
                  <Thead>
                    <Tr><Th>Référence</Th><Th>Date</Th><Th>Articles</Th><Th>Total</Th><Th>Statut</Th></Tr>
                  </Thead>
                  <Tbody>
                    {historyData?.sales.map((s) => (
                      <Tr key={s.id}>
                        <Td className="font-mono text-xs">{s.reference}</Td>
                        <Td>{formatDate(s.saleDate ?? s.createdAt)}</Td>
                        <Td className="text-sm text-slate-500">
                          {s.lines?.map((l: any) => l.product?.name).join(', ').substring(0, 40) || '—'}
                          {s.lines?.length > 2 ? '…' : ''}
                        </Td>
                        <Td className="font-semibold">{formatCurrency(Number(s.total))}</Td>
                        <Td><Badge variant="success">{s.status}</Badge></Td>
                      </Tr>
                    ))}
                    {historyData?.sales.length === 0 && (
                      <Tr><Td colSpan={5} className="text-center text-slate-400 py-8">Aucun achat enregistré</Td></Tr>
                    )}
                  </Tbody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
