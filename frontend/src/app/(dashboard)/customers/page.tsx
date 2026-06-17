'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Printer, Search, History, X, MessageCircle, Star, Clock } from 'lucide-react';
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
import { printTable } from '@/lib/print-utils';
import { useT } from '@/hooks/useT';
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
  const { t } = useT();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyTab, setHistoryTab] = useState<'history' | 'aging'>('history');

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
      <Header title={t('customers.title')} />
      <div className="p-6 space-y-4">
        <div className="no-print flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('customers.searchPlaceholder')}
              className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => printTable({
              title: t('customers.title'),
              rows: data?.data ?? [],
              columns: [
                { header: t('common.name'), value: (c) => c.name },
                { header: t('customers.code'), value: (c) => c.code },
                { header: t('common.email'), value: (c) => c.email ?? '—' },
                { header: t('common.phone'), value: (c) => c.phone ?? '—' },
                { header: t('common.address'), value: (c) => c.address ?? '—' },
                { header: t('common.since'), value: (c) => formatDate(c.createdAt) },
              ],
            })}>
              <Printer size={13} /> {t('common.print')}
            </Button>
            <Button onClick={() => setShowCreate(true)}><Plus size={16} /> {t('customers.newCustomer')}</Button>
          </div>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <Thead>
                  <Tr>
                    <Th>{t('common.name')}</Th><Th>{t('customers.code')}</Th><Th>{t('common.email')}</Th><Th>{t('common.phone')}</Th>
                    <Th>{t('common.status')}</Th><Th>{t('common.since')}</Th><Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data?.data?.map((c) => (
                    <Tr key={c.id}>
                      <Td className="font-medium text-slate-800">{c.name}</Td>
                      <Td className="font-mono text-xs">{c.code}</Td>
                      <Td className="text-slate-500">{c.email ?? '—'}</Td>
                      <Td className="text-slate-500">{c.phone ?? '—'}</Td>
                      <Td><Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? t('common.active') : t('common.inactive')}</Badge></Td>
                      <Td className="text-slate-500">{formatDate(c.createdAt)}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setHistoryCustomer(c)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <History size={13} /> History
                          </button>
                          {c.phone && (
                            <a
                              href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                  {data?.data?.length === 0 && (
                    <Tr><Td colSpan={7} className="text-center text-slate-400 py-8">{t('customers.noCustomers')}</Td></Tr>
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

      {/* ── Customer History + AR Aging Modal ───────────────────────────────── */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="font-bold text-slate-800">{historyCustomer.name}</h2>
                {historyData && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {historyData.totalOrders} commandes · Total : {formatCurrency(Number(historyData.totalSpent))}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {historyCustomer.phone && (
                  <a
                    href={`https://wa.me/${historyCustomer.phone.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                )}
                <button onClick={() => { setHistoryCustomer(null); setHistoryTab('history'); }} className="p-2 rounded-lg hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6">
              {[
                { key: 'history', label: 'Historique des ventes', icon: History },
                { key: 'aging', label: 'AR Aging', icon: Clock },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setHistoryTab(key as 'history' | 'aging')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    historyTab === key
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="p-8"><PageLoader /></div>
              ) : historyTab === 'history' ? (
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
              ) : (
                /* AR Aging view — bucket outstanding sales by days */
                (() => {
                  const now = Date.now();
                  const outstanding = (historyData?.sales ?? []).filter(
                    (s: any) => s.status !== 'CONFIRMED' && s.status !== 'CANCELLED'
                  );
                  const buckets = [
                    { label: 'Current (0–30j)', min: 0, max: 30 },
                    { label: '31–60j', min: 31, max: 60 },
                    { label: '61–90j', min: 61, max: 90 },
                    { label: '90j+', min: 91, max: Infinity },
                  ];
                  const totals = buckets.map((b) => {
                    const rows = outstanding.filter((s: any) => {
                      const days = Math.floor((now - new Date(s.saleDate ?? s.createdAt).getTime()) / 86400000);
                      return days >= b.min && days <= b.max;
                    });
                    return { ...b, rows, total: rows.reduce((sum: number, s: any) => sum + Number(s.total), 0) };
                  });
                  const grandTotal = totals.reduce((s, b) => s + b.total, 0);
                  return (
                    <div className="p-4 space-y-4">
                      {/* Credit info */}
                      {(historyCustomer.creditLimit || historyCustomer.creditBalance) && (
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Limite crédit', value: formatCurrency(Number(historyCustomer.creditLimit ?? 0)), color: 'text-slate-800' },
                            { label: 'Solde crédit', value: formatCurrency(Number(historyCustomer.creditBalance ?? 0)), color: 'text-blue-700' },
                            { label: 'Total AR', value: formatCurrency(grandTotal), color: grandTotal > 0 ? 'text-red-600' : 'text-green-600' },
                          ].map((k) => (
                            <div key={k.label} className="bg-slate-50 rounded-xl p-3 text-center">
                              <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                              <p className={`text-base font-bold ${k.color}`}>{k.value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Loyalty points */}
                      {historyCustomer.loyaltyPoints != null && historyCustomer.loyaltyPoints > 0 && (
                        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2">
                          <Star size={14} className="text-amber-500" />
                          <span className="text-sm font-medium text-amber-800">
                            {historyCustomer.loyaltyPoints.toLocaleString()} points de fidélité
                            = {formatCurrency(historyCustomer.loyaltyPoints)}
                          </span>
                        </div>
                      )}

                      {/* Aging buckets */}
                      <div className="grid grid-cols-4 gap-2">
                        {totals.map((b) => (
                          <div key={b.label} className={`rounded-lg border p-3 text-center ${b.total > 0 && b.min > 30 ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-white'}`}>
                            <p className="text-xs text-slate-500 mb-1">{b.label}</p>
                            <p className={`text-sm font-bold ${b.total > 0 && b.min > 30 ? 'text-red-700' : 'text-slate-800'}`}>
                              {formatCurrency(b.total)}
                            </p>
                            <p className="text-xs text-slate-400">{b.rows.length} facture(s)</p>
                          </div>
                        ))}
                      </div>

                      {/* Outstanding invoices list */}
                      <Table>
                        <Thead>
                          <Tr><Th>Référence</Th><Th>Date</Th><Th>Montant</Th><Th>Statut</Th><Th>Jours</Th></Tr>
                        </Thead>
                        <Tbody>
                          {outstanding.map((s: any) => {
                            const days = Math.floor((now - new Date(s.saleDate ?? s.createdAt).getTime()) / 86400000);
                            return (
                              <Tr key={s.id}>
                                <Td className="font-mono text-xs">{s.reference}</Td>
                                <Td>{formatDate(s.saleDate ?? s.createdAt)}</Td>
                                <Td className="font-semibold">{formatCurrency(Number(s.total))}</Td>
                                <Td><Badge variant="warning">{s.status}</Badge></Td>
                                <Td>
                                  <span className={`text-xs font-medium ${days > 30 ? 'text-red-600' : 'text-slate-600'}`}>
                                    {days}j
                                  </span>
                                </Td>
                              </Tr>
                            );
                          })}
                          {outstanding.length === 0 && (
                            <Tr><Td colSpan={5} className="text-center text-slate-400 py-8">Aucune facture en attente</Td></Tr>
                          )}
                        </Tbody>
                      </Table>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
