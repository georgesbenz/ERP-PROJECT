'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, Clock, XCircle, BarChart2, ListChecks, FileText, Trash2 } from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { budgetingService } from '@/services/budgeting.service';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'plans',      label: 'Plans',          icon: FileText },
  { id: 'variance',   label: 'Budget vs Réel', icon: BarChart2 },
  { id: 'allocations', label: 'Allocations',   icon: ListChecks },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Schemas ───────────────────────────────────────────────────────────────────
const planSchema = z.object({
  name:         z.string().min(1, 'Nom requis'),
  fiscalYear:   z.coerce.number().min(2020).max(2099),
  startDate:    z.string().min(1, 'Date début requise'),
  endDate:      z.string().min(1, 'Date fin requise'),
  totalAmount:  z.coerce.number().min(0),
  departmentId: z.string().optional(),
  notes:        z.string().optional(),
});
type PlanForm = z.infer<typeof planSchema>;

const allocSchema = z.object({
  categoryId: z.string().min(1, 'Catégorie requise'),
  period:     z.string().min(1, 'Période requise'),
  allocated:  z.coerce.number().min(0),
  notes:      z.string().optional(),
});
type AllocForm = z.infer<typeof allocSchema>;

// ── Utilization bar ───────────────────────────────────────────────────────────
function UtilBar({ pct, label }: { pct: number; label: string }) {
  const color = pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="space-y-1 w-full">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BudgetingPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('plans');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showAddAlloc, setShowAddAlloc] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────
  const plansQ = useQuery({
    queryKey: ['budget-plans', page],
    queryFn: () => budgetingService.listPlans(page, 20),
  });
  const deptQ = useQuery({ queryKey: ['budget-departments'], queryFn: budgetingService.listDepartments });
  const catQ  = useQuery({ queryKey: ['budget-categories'], queryFn: budgetingService.listCategories, enabled: tab === 'allocations' });
  const varianceQ = useQuery({
    queryKey: ['budget-variance', selectedPlanId],
    queryFn: () => budgetingService.getVariance(selectedPlanId!),
    enabled: tab === 'variance' && !!selectedPlanId,
  });
  const allocQ = useQuery({
    queryKey: ['budget-allocs', selectedPlanId],
    queryFn: () => budgetingService.listAllocations(selectedPlanId!),
    enabled: tab === 'allocations' && !!selectedPlanId,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const planForm = useForm<PlanForm>({ resolver: zodResolver(planSchema) as any, defaultValues: { fiscalYear: new Date().getFullYear() } });
  const createM = useMutation({
    mutationFn: budgetingService.createPlan,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-plans'] }); planForm.reset(); setShowCreate(false); },
  });
  const submitM = useMutation({
    mutationFn: budgetingService.submitForApproval,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-plans'] }),
  });
  const approveM = useMutation({
    mutationFn: (id: string) => budgetingService.approvePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-plans'] }),
  });
  const rejectM = useMutation({
    mutationFn: (id: string) => budgetingService.rejectPlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-plans'] }),
  });

  const allocForm = useForm<AllocForm>({ resolver: zodResolver(allocSchema) as any });
  const createAllocM = useMutation({
    mutationFn: (d: AllocForm) => budgetingService.createAllocation(selectedPlanId!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-allocs'] }); allocForm.reset(); setShowAddAlloc(false); },
  });
  const deleteAllocM = useMutation({
    mutationFn: (id: string) => budgetingService.deleteAllocation(selectedPlanId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-allocs'] }),
  });

  const plans = plansQ.data?.data ?? [];
  const currentPlan = plans.find((p: any) => p.id === selectedPlanId);

  return (
    <>
      <Header title="Budgétisation" />
      <div className="p-6 space-y-4">

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-stone-200">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                tab === id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-stone-50',
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── PLANS ─────────────────────────────────────────────────────── */}
        {tab === 'plans' && (
          <>
            <div className="flex justify-end">
              <Button onClick={() => setShowCreate(true)}><Plus size={15} /> Nouveau plan</Button>
            </div>

            {plansQ.isLoading ? <PageLoader /> : (
              <>
                <Table>
                  <Thead>
                    <tr><Th>Nom</Th><Th>Exercice</Th><Th>Période</Th><Th>Budget total</Th><Th>Département</Th><Th>Statut</Th><Th>Actions</Th></tr>
                  </Thead>
                  <Tbody>
                    {plans.map((p: any) => (
                      <Tr key={p.id}>
                        <Td className="font-medium">{p.name}</Td>
                        <Td>{p.fiscalYear}</Td>
                        <Td className="text-xs text-slate-500">{formatDate(p.startDate)} – {formatDate(p.endDate)}</Td>
                        <Td className="font-semibold">{formatCurrency(Number(p.totalAmount))}</Td>
                        <Td>{p.department?.name ?? '—'}</Td>
                        <Td><Badge variant={statusVariant(p.status)}>{p.status}</Badge></Td>
                        <Td>
                          <div className="flex gap-2 flex-wrap">
                            {p.status === 'DRAFT' && (
                              <button onClick={() => submitM.mutate(p.id)} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800">
                                <Clock size={13} /> Soumettre
                              </button>
                            )}
                            {p.status === 'PENDING_APPROVAL' && (
                              <>
                                <button onClick={() => approveM.mutate(p.id)} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800">
                                  <CheckCircle size={13} /> Approuver
                                </button>
                                <button onClick={() => rejectM.mutate(p.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                                  <XCircle size={13} /> Rejeter
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => { setSelectedPlanId(p.id); setTab('variance'); }}
                              className="text-xs text-blue-500 hover:underline"
                            >
                              Variance →
                            </button>
                            <button
                              onClick={() => { setSelectedPlanId(p.id); setTab('allocations'); }}
                              className="text-xs text-slate-500 hover:underline"
                            >
                              Allocations →
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {plansQ.data?.meta && (
                  <Pagination meta={plansQ.data.meta as PaginationMeta} onPageChange={setPage} />
                )}
              </>
            )}

            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau plan budgétaire">
              <form onSubmit={planForm.handleSubmit((d) => createM.mutate(d))} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Nom du plan *</label>
                  <Input {...planForm.register('name')} placeholder="Budget annuel 2026" className="mt-1" />
                  {planForm.formState.errors.name && <p className="text-xs text-red-500 mt-0.5">{planForm.formState.errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Exercice fiscal *</label>
                    <Input {...planForm.register('fiscalYear')} type="number" placeholder="2026" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Montant total *</label>
                    <Input {...planForm.register('totalAmount')} type="number" step="0.01" placeholder="0" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Date début *</label>
                    <Input {...planForm.register('startDate')} type="date" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Date fin *</label>
                    <Input {...planForm.register('endDate')} type="date" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Département</label>
                  <select {...planForm.register('departmentId')} className="mt-1 w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none">
                    <option value="">— Global —</option>
                    {(deptQ.data ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Notes</label>
                  <textarea {...planForm.register('notes')} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Annuler</Button>
                  <Button type="submit" disabled={createM.isPending}>Créer</Button>
                </div>
              </form>
            </Modal>
          </>
        )}

        {/* ── VARIANCE ──────────────────────────────────────────────────── */}
        {tab === 'variance' && (
          <>
            {/* Plan selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600">Plan :</label>
              <select
                value={selectedPlanId ?? ''}
                onChange={(e) => setSelectedPlanId(e.target.value || null)}
                className="rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">— Sélectionner un plan —</option>
                {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.fiscalYear})</option>)}
              </select>
            </div>

            {!selectedPlanId && <p className="text-sm text-slate-400 text-center py-12">Sélectionnez un plan pour voir le rapport de variance.</p>}
            {selectedPlanId && varianceQ.isLoading && <PageLoader />}
            {selectedPlanId && varianceQ.data && (() => {
              const { plan, allocations, summary } = varianceQ.data;
              return (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Budget total', value: formatCurrency(plan.totalAmount), color: 'text-slate-700' },
                      { label: 'Alloué', value: formatCurrency(summary.totalAllocated), color: 'text-blue-600' },
                      { label: 'Réel (ventes + achats)', value: formatCurrency(summary.totalActual), color: 'text-amber-600' },
                      { label: 'Variance', value: formatCurrency(summary.totalVariance), color: summary.totalVariance >= 0 ? 'text-emerald-600' : 'text-red-500' },
                    ].map(({ label, value, color }) => (
                      <Card key={label}>
                        <CardContent className="py-4">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Utilization bar */}
                  <Card>
                    <CardContent className="py-4 space-y-3">
                      <UtilBar pct={summary.utilizationPct} label={`Utilisation globale — ${summary.utilizationPct}%`} />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Chiffre d'affaires (ventes)</p>
                          <p className="font-semibold text-emerald-600">{formatCurrency(summary.salesRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Coût achats</p>
                          <p className="font-semibold text-amber-600">{formatCurrency(summary.purchaseCost)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Allocations table */}
                  {allocations.length > 0 && (
                    <Table>
                      <Thead>
                        <tr><Th>Catégorie</Th><Th>Période</Th><Th>Alloué</Th><Th>Réel</Th><Th>Variance</Th><Th>Utilisation</Th></tr>
                      </Thead>
                      <Tbody>
                        {allocations.map((a: any) => (
                          <Tr key={a.id}>
                            <Td>{a.category?.name ?? '—'}</Td>
                            <Td>{a.period}</Td>
                            <Td>{formatCurrency(a.allocated)}</Td>
                            <Td>{formatCurrency(a.actual)}</Td>
                            <Td className={a.variance >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                              {a.variance >= 0 ? '+' : ''}{formatCurrency(a.variance)}
                            </Td>
                            <Td><UtilBar pct={a.utilizationPct} label="" /></Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                  {allocations.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">Aucune allocation définie pour ce plan. Ajoutez-en dans l'onglet Allocations.</p>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* ── ALLOCATIONS ───────────────────────────────────────────────── */}
        {tab === 'allocations' && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-600">Plan :</label>
                <select
                  value={selectedPlanId ?? ''}
                  onChange={(e) => setSelectedPlanId(e.target.value || null)}
                  className="rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">— Sélectionner un plan —</option>
                  {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.fiscalYear})</option>)}
                </select>
              </div>
              {selectedPlanId && (
                <Button onClick={() => setShowAddAlloc(true)}><Plus size={15} /> Ajouter allocation</Button>
              )}
            </div>

            {!selectedPlanId && <p className="text-sm text-slate-400 text-center py-12">Sélectionnez un plan pour gérer ses allocations.</p>}
            {selectedPlanId && allocQ.isLoading && <PageLoader />}
            {selectedPlanId && allocQ.data && (
              <Table>
                <Thead>
                  <tr><Th>Catégorie</Th><Th>Période</Th><Th>Alloué</Th><Th>Réel</Th><Th>Notes</Th><Th></Th></tr>
                </Thead>
                <Tbody>
                  {(allocQ.data ?? []).map((a: any) => (
                    <Tr key={a.id}>
                      <Td>{a.category?.name ?? '—'}</Td>
                      <Td>{a.period}</Td>
                      <Td className="font-semibold">{formatCurrency(Number(a.allocated))}</Td>
                      <Td>{formatCurrency(Number(a.actual))}</Td>
                      <Td className="text-xs text-slate-500">{a.notes ?? '—'}</Td>
                      <Td>
                        <button onClick={() => deleteAllocM.mutate(a.id)} title="Supprimer">
                          <Trash2 size={14} className="text-red-400 hover:text-red-600" />
                        </button>
                      </Td>
                    </Tr>
                  ))}
                  {(allocQ.data ?? []).length === 0 && (
                    <tr><Td className="text-slate-400">Aucune allocation pour ce plan.</Td></tr>
                  )}
                </Tbody>
              </Table>
            )}

            <Modal open={showAddAlloc} onClose={() => setShowAddAlloc(false)} title="Ajouter une allocation">
              <form onSubmit={allocForm.handleSubmit((d) => createAllocM.mutate(d))} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Catégorie budgétaire *</label>
                  <select {...allocForm.register('categoryId')} className="mt-1 w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none">
                    <option value="">— Sélectionner —</option>
                    {(catQ.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {allocForm.formState.errors.categoryId && <p className="text-xs text-red-500 mt-0.5">{allocForm.formState.errors.categoryId.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Période *</label>
                    <Input {...allocForm.register('period')} placeholder="2026-01 ou 2026-Q1" className="mt-1" />
                    {allocForm.formState.errors.period && <p className="text-xs text-red-500 mt-0.5">{allocForm.formState.errors.period.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Montant alloué *</label>
                    <Input {...allocForm.register('allocated')} type="number" step="0.01" placeholder="0" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Notes</label>
                  <textarea {...allocForm.register('notes')} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowAddAlloc(false)}>Annuler</Button>
                  <Button type="submit" disabled={createAllocM.isPending}>Ajouter</Button>
                </div>
              </form>
            </Modal>
          </>
        )}

      </div>
    </>
  );
}
