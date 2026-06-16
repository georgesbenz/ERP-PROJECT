'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCircle, XCircle, Trash2, FileText, BarChart3 } from 'lucide-react';
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
import { expensesService, type ExpenseEntry } from '@/services/expenses.service';
import { formatCurrency } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';

// ── Enums ─────────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'CREDIT'];
const EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'];

const statusColor: Record<string, string> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  PAID: 'info',
};

// ── Zod schemas ───────────────────────────────────────────────────────────────
const categorySchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  code: z.string().min(1, 'Code requis'),
  description: z.string().optional(),
});

const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Catégorie requise'),
  description: z.string().min(1, 'Description requise'),
  amount: z.coerce.number().min(0.01, 'Montant requis'),
  taxAmount: z.coerce.number().min(0).optional(),
  expenseDate: z.string().min(1, 'Date requise'),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  supplierId: z.string().optional(),
});

type CategoryForm = z.infer<typeof categorySchema>;
type ExpenseForm = z.infer<typeof expenseSchema>;

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ['Dépenses', 'Catégories', 'Rapport'] as const;
type Tab = (typeof TABS)[number];

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('Dépenses');

  // Expenses state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Categories state
  const [showCatModal, setShowCatModal] = useState(false);

  // Report state
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expensesService.listCategories(),
  });
  const categories = catData ?? [];

  const { data: expData, isLoading: expLoading } = useQuery({
    queryKey: ['expenses', page, search, filterCategory, filterStatus],
    queryFn: () => expensesService.listExpenses(page, 20, search || undefined, filterCategory || undefined, filterStatus || undefined),
    enabled: tab === 'Dépenses',
  });
  const expenses = (expData as any)?.data ?? [];
  const expMeta = (expData as any)?.meta as PaginationMeta | undefined;

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['expense-report', reportFrom, reportTo],
    queryFn: () => expensesService.getReport(reportFrom || undefined, reportTo || undefined),
    enabled: tab === 'Rapport',
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createCatM = useMutation({ mutationFn: expensesService.createCategory, onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense-categories'] }); setShowCatModal(false); } });
  const createExpM = useMutation({ mutationFn: expensesService.createExpense, onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setShowExpenseModal(false); } });
  const approveM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      expensesService.approveExpense(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
  const deleteExpM = useMutation({ mutationFn: expensesService.deleteExpense, onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }) });

  // ── Forms ────────────────────────────────────────────────────────────────────
  const catForm = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) });
  const expForm = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema) as any });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header title="Gestion des Dépenses / Expense Management" />

      <div className="flex-1 p-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'Dépenses' && <FileText className="inline w-4 h-4 mr-1" />}
              {t === 'Catégories' && <BarChart3 className="inline w-4 h-4 mr-1" />}
              {t === 'Rapport' && <BarChart3 className="inline w-4 h-4 mr-1" />}
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab: Dépenses ─────────────────────────────────────────────────── */}
        {tab === 'Dépenses' && (
          <>
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <div className="flex gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Rechercher…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterCategory}
                  onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                >
                  <option value="">Toutes catégories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                >
                  <option value="">Tous statuts</option>
                  {EXPENSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <Button onClick={() => setShowExpenseModal(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Nouvelle dépense
              </Button>
            </div>

            {expLoading ? <PageLoader /> : (
              <>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Référence</Th><Th>Description</Th><Th>Catégorie</Th>
                        <Th>Date</Th><Th>Montant</Th><Th>Statut</Th><Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {expenses.map((e: ExpenseEntry) => (
                        <Tr key={e.id}>
                          <Td className="font-mono text-xs">{e.reference}</Td>
                          <Td>{e.description}</Td>
                          <Td>{e.category?.name}</Td>
                          <Td>{new Date(e.expenseDate).toLocaleDateString('fr-FR')}</Td>
                          <Td className="font-semibold">{formatCurrency(Number(e.totalAmount))}</Td>
                          <Td>
                            <Badge variant={statusColor[e.status] as any}>{e.status}</Badge>
                          </Td>
                          <Td>
                            <div className="flex gap-1">
                              {e.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => approveM.mutate({ id: e.id, status: 'APPROVED' })}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Approuver"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => approveM.mutate({ id: e.id, status: 'REJECTED' })}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    title="Rejeter"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => { if (confirm('Supprimer cette dépense ?')) deleteExpM.mutate(e.id); }}
                                    className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      ))}
                      {expenses.length === 0 && (
                        <Tr><Td colSpan={7} className="text-center text-slate-400 py-8">Aucune dépense</Td></Tr>
                      )}
                    </Tbody>
                  </Table>
                </div>
                {expMeta && <Pagination meta={expMeta} onPageChange={setPage} />}
              </>
            )}
          </>
        )}

        {/* ── Tab: Catégories ───────────────────────────────────────────────── */}
        {tab === 'Catégories' && (
          <>
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowCatModal(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Nouvelle catégorie
              </Button>
            </div>
            {catLoading ? <PageLoader /> : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <Thead>
                    <Tr><Th>Code</Th><Th>Nom</Th><Th>Description</Th><Th>Statut</Th></Tr>
                  </Thead>
                  <Tbody>
                    {categories.map((c) => (
                      <Tr key={c.id}>
                        <Td className="font-mono text-xs">{c.code}</Td>
                        <Td className="font-medium">{c.name}</Td>
                        <Td className="text-slate-500 text-sm">{c.description ?? '—'}</Td>
                        <Td><Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Actif' : 'Inactif'}</Badge></Td>
                      </Tr>
                    ))}
                    {categories.length === 0 && (
                      <Tr><Td colSpan={4} className="text-center text-slate-400 py-8">Aucune catégorie</Td></Tr>
                    )}
                  </Tbody>
                </Table>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Rapport ──────────────────────────────────────────────────── */}
        {tab === 'Rapport' && (
          <>
            <div className="flex gap-3 mb-6 items-center">
              <label className="text-sm text-slate-600">Du :</label>
              <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <label className="text-sm text-slate-600">Au :</label>
              <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {reportLoading ? <PageLoader /> : reportData && (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total entrées', value: reportData.totals.count.toString() },
                    { label: 'Montant HT', value: formatCurrency(Number(reportData.totals.amount)) },
                    { label: 'Taxes', value: formatCurrency(Number(reportData.totals.taxAmount)) },
                    { label: 'Total TTC', value: formatCurrency(Number(reportData.totals.totalAmount)) },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                      <p className="text-xl font-bold text-slate-800">{kpi.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* By Category */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-700 mb-3">Par catégorie</h3>
                    <div className="space-y-2">
                      {reportData.byCategory.map((b) => {
                        const pct = reportData.totals.totalAmount > 0
                          ? (Number(b.totalAmount) / Number(reportData.totals.totalAmount)) * 100 : 0;
                        return (
                          <div key={b.category.id}>
                            <div className="flex justify-between text-sm mb-0.5">
                              <span className="text-slate-700">{b.category.name}</span>
                              <span className="font-semibold">{formatCurrency(Number(b.totalAmount))}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct.toFixed(1)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* By Status */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-700 mb-3">Par statut</h3>
                    <div className="space-y-2">
                      {reportData.byStatus.map((b) => (
                        <div key={b.status} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={statusColor[b.status] as any}>{b.status}</Badge>
                            <span className="text-sm text-slate-500">{b.count} entrée{b.count !== 1 ? 's' : ''}</span>
                          </div>
                          <span className="font-semibold text-slate-800">{formatCurrency(Number(b.totalAmount))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Modal: Nouvelle dépense ─────────────────────────────────────────── */}
      <Modal open={showExpenseModal} onClose={() => { setShowExpenseModal(false); expForm.reset(); }} title="Nouvelle dépense">
        <form onSubmit={expForm.handleSubmit((d) => createExpM.mutate(d) as any)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie *</label>
            <select {...expForm.register('categoryId')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sélectionner…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {expForm.formState.errors.categoryId && <p className="text-xs text-red-500 mt-1">{expForm.formState.errors.categoryId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
            <Input {...expForm.register('description')} placeholder="Description de la dépense" />
            {expForm.formState.errors.description && <p className="text-xs text-red-500 mt-1">{expForm.formState.errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Montant HT *</label>
              <Input {...expForm.register('amount')} type="number" step="0.01" placeholder="0.00" />
              {expForm.formState.errors.amount && <p className="text-xs text-red-500 mt-1">{expForm.formState.errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Taxe</label>
              <Input {...expForm.register('taxAmount')} type="number" step="0.01" placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <Input {...expForm.register('expenseDate')} type="date" />
              {expForm.formState.errors.expenseDate && <p className="text-xs text-red-500 mt-1">{expForm.formState.errors.expenseDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mode de paiement</label>
              <select {...expForm.register('paymentMethod')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea {...expForm.register('notes')} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notes optionnelles…" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowExpenseModal(false)}>Annuler</Button>
            <Button type="submit" disabled={createExpM.isPending}>
              {createExpM.isPending ? 'Enregistrement…' : 'Créer la dépense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Nouvelle catégorie ────────────────────────────────────────── */}
      <Modal open={showCatModal} onClose={() => { setShowCatModal(false); catForm.reset(); }} title="Nouvelle catégorie">
        <form onSubmit={catForm.handleSubmit((d) => createCatM.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
            <Input {...catForm.register('name')} placeholder="Nom de la catégorie" />
            {catForm.formState.errors.name && <p className="text-xs text-red-500 mt-1">{catForm.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
            <Input {...catForm.register('code')} placeholder="Code unique (ex: TRANS)" />
            {catForm.formState.errors.code && <p className="text-xs text-red-500 mt-1">{catForm.formState.errors.code.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <Input {...catForm.register('description')} placeholder="Description optionnelle" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCatModal(false)}>Annuler</Button>
            <Button type="submit" disabled={createCatM.isPending}>
              {createCatM.isPending ? 'Enregistrement…' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
