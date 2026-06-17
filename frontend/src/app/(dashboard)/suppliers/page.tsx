'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Printer, Search, Scale, X, AlertTriangle, MessageCircle } from 'lucide-react';
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
import { purchasesService } from '@/services/purchases.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { printTable } from '@/lib/print-utils';
import { useT } from '@/hooks/useT';
import type { PaginationMeta } from '@/lib/api';
import type { Supplier } from '@/types/models';

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function SuppliersPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [balanceSupplier, setBalanceSupplier] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () => purchasesService.listSuppliers(page, 20, search || undefined),
  });

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['supplier-balance', balanceSupplier?.id],
    queryFn: () => purchasesService.getSupplierBalance(balanceSupplier!.id),
    enabled: !!balanceSupplier,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  const createMutation = useMutation({
    mutationFn: purchasesService.createSupplier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      reset();
      setShowCreate(false);
    },
  });

  return (
    <>
      <Header title={t('suppliers.title')} />
      <div className="p-6 space-y-4">
        <div className="no-print flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('suppliers.searchPlaceholder')}
              className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => printTable({
              title: t('suppliers.title'),
              rows: data?.data ?? [],
              columns: [
                { header: t('common.name'), value: (s) => s.name },
                { header: t('suppliers.code'), value: (s) => s.code },
                { header: t('common.email'), value: (s) => s.email ?? '—' },
                { header: t('common.phone'), value: (s) => s.phone ?? '—' },
                { header: t('common.status'), value: (s) => s.isActive ? t('common.active') : t('common.inactive') },
                { header: t('common.since'), value: (s) => formatDate(s.createdAt) },
              ],
            })}>
              <Printer size={13} /> {t('common.print')}
            </Button>
            <Button onClick={() => setShowCreate(true)}><Plus size={16} /> {t('suppliers.newSupplier')}</Button>
          </div>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <Thead>
                  <Tr>
                    <Th>{t('common.name')}</Th><Th>{t('suppliers.code')}</Th><Th>{t('common.email')}</Th><Th>{t('common.phone')}</Th>
                    <Th>{t('common.status')}</Th><Th>{t('common.since')}</Th><Th>{t('suppliers.balance')}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data?.data?.map((s) => (
                    <Tr key={s.id}>
                      <Td className="font-medium text-slate-800">{s.name}</Td>
                      <Td className="font-mono text-xs">{s.code}</Td>
                      <Td className="text-slate-500">{s.email ?? '—'}</Td>
                      <Td className="text-slate-500">{s.phone ?? '—'}</Td>
                      <Td><Badge variant={s.isActive ? 'success' : 'default'}>{s.isActive ? t('common.active') : t('common.inactive')}</Badge></Td>
                      <Td className="text-slate-500">{formatDate(s.createdAt)}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setBalanceSupplier(s)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Scale size={13} /> {t('suppliers.balance')}
                          </button>
                          {s.phone && (
                            <a
                              href={`https://wa.me/${s.phone.replace(/\D/g, '')}`}
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
                    <Tr><Td colSpan={7} className="text-center text-slate-400 py-8">{t('suppliers.noSuppliers')}</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </div>
            {data?.meta && <Pagination meta={data.meta as PaginationMeta} onPageChange={setPage} />}
          </>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau fournisseur">
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

      {/* ── Balance / Aging Modal ─────────────────────────────────────────────── */}
      {balanceSupplier && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="font-bold text-slate-800">Solde — {balanceSupplier.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{balanceSupplier.code}</p>
              </div>
              <button onClick={() => setBalanceSupplier(null)} className="p-2 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {balanceLoading ? (
              <div className="p-8"><PageLoader /></div>
            ) : balanceData && (
              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                {/* KPI summary */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { label: 'Total dû', value: formatCurrency(Number(balanceData.totalOwed)), color: 'text-slate-800' },
                    { label: 'Déjà payé', value: formatCurrency(Number(balanceData.totalPaid)), color: 'text-green-600' },
                    { label: 'Solde restant', value: formatCurrency(Number(balanceData.balance)), color: Number(balanceData.balance) > 0 ? 'text-red-600' : 'text-green-600' },
                  ].map((k) => (
                    <div key={k.label} className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                      <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Aging table */}
                <div>
                  <h3 className="font-semibold text-slate-700 mb-3 text-sm">Commandes en attente — Échéancier</h3>
                  <Table>
                    <Thead>
                      <Tr><Th>Référence</Th><Th>Date</Th><Th>Statut</Th><Th>Montant</Th><Th>Retard</Th></Tr>
                    </Thead>
                    <Tbody>
                      {balanceData.aging.map((a) => (
                        <Tr key={a.id}>
                          <Td className="font-mono text-xs">{a.reference}</Td>
                          <Td>{formatDate(a.orderDate)}</Td>
                          <Td><Badge variant="warning">{a.status}</Badge></Td>
                          <Td className="font-semibold">{formatCurrency(a.amount)}</Td>
                          <Td>
                            {a.daysPastDue > 0 ? (
                              <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                                <AlertTriangle size={11} /> {a.daysPastDue}j
                              </span>
                            ) : (
                              <span className="text-green-600 text-xs">À jour</span>
                            )}
                          </Td>
                        </Tr>
                      ))}
                      {balanceData.aging.length === 0 && (
                        <Tr><Td colSpan={5} className="text-center text-slate-400 py-6">Aucune commande en attente</Td></Tr>
                      )}
                    </Tbody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
