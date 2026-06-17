'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Printer, Search, ArrowRight, Phone, Mail, Calendar, FileText, CheckCircle,
  Target, TrendingUp, Activity, Megaphone, BarChart2, Users, Trash2,
} from 'lucide-react';
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
import { crmService } from '@/services/crm.service';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { printTable } from '@/lib/print-utils';
import { useT } from '@/hooks/useT';
import type { PaginationMeta } from '@/lib/api';

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'leads',      label: 'Leads',      icon: Users },
  { id: 'pipeline',   label: 'Pipeline',   icon: Target },
  { id: 'activities', label: 'Activités',  icon: Activity },
  { id: 'campaigns',  label: 'Campagnes',  icon: Megaphone },
  { id: 'metrics',    label: 'Métriques',  icon: BarChart2 },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Schemas ───────────────────────────────────────────────────────────────────
const leadSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName:  z.string().min(1, 'Nom requis'),
  email:     z.string().email('Email invalide').optional().or(z.literal('')),
  phone:     z.string().optional(),
  company:   z.string().optional(),
  source:    z.string().optional(),
});
type LeadForm = z.infer<typeof leadSchema>;

const oppSchema = z.object({
  title:             z.string().min(1, 'Titre requis'),
  pipelineId:        z.string().optional(),
  value:             z.coerce.number().min(0).optional(),
  probability:       z.coerce.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  notes:             z.string().optional(),
});
type OppForm = z.infer<typeof oppSchema>;

const activitySchema = z.object({
  type:        z.enum(['EMAIL', 'CALL', 'MEETING', 'TASK', 'NOTE']),
  subject:     z.string().min(1, 'Sujet requis'),
  description: z.string().optional(),
  dueDate:     z.string().optional(),
});
type ActivityForm = z.infer<typeof activitySchema>;

const campaignSchema = z.object({
  name:      z.string().min(1, 'Nom requis'),
  type:      z.enum(['EMAIL', 'SMS', 'SOCIAL_MEDIA', 'PUSH_NOTIFICATION']),
  subject:   z.string().optional(),
  startDate: z.string().optional(),
  endDate:   z.string().optional(),
  budget:    z.coerce.number().min(0).optional(),
});
type CampaignForm = z.infer<typeof campaignSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────
function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, React.ElementType> = {
    EMAIL: Mail, CALL: Phone, MEETING: Calendar, TASK: CheckCircle, NOTE: FileText,
  };
  const Icon = map[type] ?? Activity;
  return <Icon size={14} className="text-slate-400" />;
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function FunnelBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('leads');
  const [leadPage, setLeadPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actPage, setActPage] = useState(1);
  const [campPage, setCampPage] = useState(1);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showCreateOpp, setShowCreateOpp] = useState(false);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────
  const leadsQ = useQuery({
    queryKey: ['leads', leadPage, search],
    queryFn: () => crmService.listLeads(leadPage, 20, search || undefined),
    enabled: tab === 'leads',
  });
  const pipelinesQ = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => crmService.listPipelines(),
    enabled: tab === 'pipeline' || tab === 'leads',
  });
  const activitiesQ = useQuery({
    queryKey: ['crm-activities', actPage],
    queryFn: () => crmService.listActivities({ page: actPage, limit: 20 }),
    enabled: tab === 'activities',
  });
  const campaignsQ = useQuery({
    queryKey: ['campaigns', campPage],
    queryFn: () => crmService.listCampaigns(campPage, 20),
    enabled: tab === 'campaigns',
  });
  const metricsQ = useQuery({
    queryKey: ['crm-metrics'],
    queryFn: () => crmService.getMetrics(),
    enabled: tab === 'metrics',
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const leadForm = useForm<LeadForm>({ resolver: zodResolver(leadSchema) });
  const createLeadM = useMutation({
    mutationFn: crmService.createLead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); leadForm.reset(); setShowCreateLead(false); },
  });
  const convertLeadM = useMutation({
    mutationFn: crmService.convertLead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });

  const oppForm = useForm<OppForm>({ resolver: zodResolver(oppSchema) as any });
  const createOppM = useMutation({
    mutationFn: crmService.createOpportunity,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }); oppForm.reset(); setShowCreateOpp(false); },
  });
  const moveStageM = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) => crmService.moveOpportunityStage(id, stageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const actForm = useForm<ActivityForm>({ resolver: zodResolver(activitySchema), defaultValues: { type: 'CALL' } });
  const createActivityM = useMutation({
    mutationFn: crmService.createActivity,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-activities'] }); actForm.reset(); setShowCreateActivity(false); },
  });
  const completeActivityM = useMutation({
    mutationFn: crmService.completeActivity,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-activities'] }),
  });
  const deleteActivityM = useMutation({
    mutationFn: crmService.deleteActivity,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-activities'] }),
  });

  const campForm = useForm<CampaignForm>({ resolver: zodResolver(campaignSchema) as any, defaultValues: { type: 'EMAIL' } });
  const createCampaignM = useMutation({
    mutationFn: crmService.createCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); campForm.reset(); setShowCreateCampaign(false); },
  }) as any;
  const launchCampaignM = useMutation({
    mutationFn: crmService.launchCampaign,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return (
    <>
      <Header title={t('crm.title')} />
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

        {/* ── LEADS ─────────────────────────────────────────────────────── */}
        {tab === 'leads' && (
          <>
            <div className="no-print flex items-center justify-between gap-4">
              <div className="relative w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setLeadPage(1); }}
                  placeholder={t('crm.searchPlaceholder')}
                  className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => printTable({
                  title: `${t('crm.title')} — ${t('crm.tabs.leads')}`,
                  rows: leadsQ.data?.data ?? [],
                  columns: [
                    { header: t('common.name'), value: (l) => `${l.firstName} ${l.lastName}` },
                    { header: t('common.email'), value: (l) => l.email ?? '—' },
                    { header: t('crm.company'), value: (l) => l.company ?? '—' },
                    { header: t('crm.source'), value: (l) => l.source ?? '—' },
                    { header: t('common.status'), value: (l) => l.status },
                    { header: t('common.date'), value: (l) => formatDate(l.createdAt) },
                  ],
                })}>
                  <Printer size={13} /> {t('common.print')}
                </Button>
                <Button onClick={() => setShowCreateLead(true)}><Plus size={15} /> {t('crm.newLead')}</Button>
              </div>
            </div>

            {leadsQ.isLoading ? <PageLoader /> : (
              <>
                <Table>
                  <Thead>
                    <tr><Th>{t('common.name')}</Th><Th>{t('common.email')}</Th><Th>{t('crm.company')}</Th><Th>{t('crm.source')}</Th><Th>{t('common.status')}</Th><Th>{t('common.date')}</Th><Th></Th></tr>
                  </Thead>
                  <Tbody>
                    {(leadsQ.data?.data ?? []).map((lead: any) => (
                      <Tr key={lead.id}>
                        <Td className="font-medium">{lead.firstName} {lead.lastName}</Td>
                        <Td>{lead.email ?? '—'}</Td>
                        <Td>{lead.company ?? '—'}</Td>
                        <Td>{lead.source ?? '—'}</Td>
                        <Td><Badge variant={statusVariant(lead.status)}>{lead.status}</Badge></Td>
                        <Td>{formatDate(lead.createdAt)}</Td>
                        <Td>
                          {lead.status !== 'CONVERTED' && (
                            <button onClick={() => convertLeadM.mutate(lead.id)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                              <ArrowRight size={13} /> {t('crm.convert')}
                            </button>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {leadsQ.data?.meta && (
                  <Pagination meta={leadsQ.data.meta as PaginationMeta} onPageChange={setLeadPage} />
                )}
              </>
            )}

            <Modal open={showCreateLead} onClose={() => setShowCreateLead(false)} title="Nouveau lead">
              <form onSubmit={leadForm.handleSubmit((d) => createLeadM.mutate(d))} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Prénom *</label>
                    <Input {...leadForm.register('firstName')} placeholder="Jean" className="mt-1" />
                    {leadForm.formState.errors.firstName && <p className="text-xs text-red-500 mt-0.5">{leadForm.formState.errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Nom *</label>
                    <Input {...leadForm.register('lastName')} placeholder="Dupont" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Email</label>
                  <Input {...leadForm.register('email')} type="email" placeholder="jean@exemple.com" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Téléphone</label>
                    <Input {...leadForm.register('phone')} placeholder="+237 6XX XXX XXX" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Société</label>
                    <Input {...leadForm.register('company')} placeholder="Acme SA" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Source</label>
                  <select {...leadForm.register('source')} className="mt-1 w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none">
                    <option value="">— Sélectionner —</option>
                    {['Référence', 'Site web', 'Réseaux sociaux', 'Événement', 'Appel sortant', 'Autre'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateLead(false)}>Annuler</Button>
                  <Button type="submit" disabled={createLeadM.isPending}>Créer</Button>
                </div>
              </form>
            </Modal>
          </>
        )}

        {/* ── PIPELINE KANBAN ───────────────────────────────────────────── */}
        {tab === 'pipeline' && (
          <>
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateOpp(true)}><Plus size={15} /> Nouvelle opportunité</Button>
            </div>

            {pipelinesQ.isLoading ? <PageLoader /> : (
              <div className="space-y-8">
                {(pipelinesQ.data ?? []).map((pipeline: any) => (
                  <div key={pipeline.id}>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">{pipeline.name}</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {(pipeline.stages ?? []).map((stage: any) => {
                        const cards = (pipeline.opportunities ?? []).filter((o: any) => o.stageId === stage.id);
                        return (
                          <div key={stage.id} className="min-w-52 flex-shrink-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{stage.name}</span>
                              <span className="text-xs bg-stone-100 text-slate-500 rounded-full px-2 py-0.5">{cards.length}</span>
                            </div>
                            <div className="space-y-2 min-h-16 bg-stone-50 rounded-lg p-2">
                              {cards.map((opp: any) => (
                                <div key={opp.id} className="bg-white border border-stone-200 rounded-lg p-3 shadow-sm">
                                  <p className="text-sm font-medium text-slate-800 truncate">{opp.title}</p>
                                  {opp.customer && <p className="text-xs text-slate-500 mt-0.5">{opp.customer.name}</p>}
                                  {opp.value > 0 && <p className="text-xs font-semibold text-emerald-600 mt-1">{formatCurrency(opp.value)}</p>}
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {(pipeline.stages ?? [])
                                      .filter((s: any) => s.id !== stage.id)
                                      .slice(0, 2)
                                      .map((s: any) => (
                                        <button key={s.id} onClick={() => moveStageM.mutate({ id: opp.id, stageId: s.id })} className="text-xs text-blue-500 hover:underline">
                                          → {s.name}
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {(pipelinesQ.data ?? []).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-12">Aucun pipeline configuré.</p>
                )}
              </div>
            )}

            <Modal open={showCreateOpp} onClose={() => setShowCreateOpp(false)} title="Nouvelle opportunité">
              <form onSubmit={oppForm.handleSubmit((d) => createOppM.mutate(d))} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Titre *</label>
                  <Input {...oppForm.register('title')} placeholder="Contrat annuel Acme" className="mt-1" />
                  {oppForm.formState.errors.title && <p className="text-xs text-red-500 mt-0.5">{oppForm.formState.errors.title.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Valeur (FCFA)</label>
                    <Input {...oppForm.register('value')} type="number" placeholder="0" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Probabilité (%)</label>
                    <Input {...oppForm.register('probability')} type="number" min="0" max="100" placeholder="50" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Pipeline</label>
                  <select {...oppForm.register('pipelineId')} className="mt-1 w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none">
                    <option value="">— Sélectionner —</option>
                    {(pipelinesQ.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Date de clôture prévue</label>
                  <Input {...oppForm.register('expectedCloseDate')} type="date" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Notes</label>
                  <textarea {...oppForm.register('notes')} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateOpp(false)}>Annuler</Button>
                  <Button type="submit" disabled={createOppM.isPending}>Créer</Button>
                </div>
              </form>
            </Modal>
          </>
        )}

        {/* ── ACTIVITIES ────────────────────────────────────────────────── */}
        {tab === 'activities' && (
          <>
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateActivity(true)}><Plus size={15} /> Nouvelle activité</Button>
            </div>

            {activitiesQ.isLoading ? <PageLoader /> : (
              <>
                <Table>
                  <Thead>
                    <tr><Th>Type</Th><Th>Sujet</Th><Th>Lié à</Th><Th>Échéance</Th><Th>Statut</Th><Th></Th></tr>
                  </Thead>
                  <Tbody>
                    {(activitiesQ.data?.data ?? []).map((act: any) => (
                      <Tr key={act.id}>
                        <Td>
                          <span className="flex items-center gap-1.5 text-sm text-slate-600">
                            <ActivityIcon type={act.type} /> {act.type}
                          </span>
                        </Td>
                        <Td className="font-medium max-w-xs truncate">{act.subject}</Td>
                        <Td className="text-xs text-slate-500">
                          {act.lead ? `Lead: ${act.lead.firstName} ${act.lead.lastName}` :
                           act.opportunity ? `Opp: ${act.opportunity.title}` : '—'}
                        </Td>
                        <Td>{act.dueDate ? formatDate(act.dueDate) : '—'}</Td>
                        <Td>
                          {act.completedAt
                            ? <Badge variant="success">Terminé</Badge>
                            : <Badge variant="warning">En cours</Badge>}
                        </Td>
                        <Td>
                          <div className="flex gap-2">
                            {!act.completedAt && (
                              <button onClick={() => completeActivityM.mutate(act.id)} title="Marquer terminé">
                                <CheckCircle size={15} className="text-emerald-500 hover:text-emerald-700" />
                              </button>
                            )}
                            <button onClick={() => deleteActivityM.mutate(act.id)} title="Supprimer">
                              <Trash2 size={15} className="text-red-400 hover:text-red-600" />
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {activitiesQ.data?.meta && (
                  <Pagination meta={activitiesQ.data.meta as PaginationMeta} onPageChange={setActPage} />
                )}
              </>
            )}

            <Modal open={showCreateActivity} onClose={() => setShowCreateActivity(false)} title="Nouvelle activité">
              <form onSubmit={actForm.handleSubmit((d) => createActivityM.mutate(d))} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Type *</label>
                  <select {...actForm.register('type')} className="mt-1 w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none">
                    {['EMAIL', 'CALL', 'MEETING', 'TASK', 'NOTE'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Sujet *</label>
                  <Input {...actForm.register('subject')} placeholder="Appel de suivi" className="mt-1" />
                  {actForm.formState.errors.subject && <p className="text-xs text-red-500 mt-0.5">{actForm.formState.errors.subject.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Description</label>
                  <textarea {...actForm.register('description')} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Date d'échéance</label>
                  <Input {...actForm.register('dueDate')} type="date" className="mt-1" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateActivity(false)}>Annuler</Button>
                  <Button type="submit" disabled={createActivityM.isPending}>Créer</Button>
                </div>
              </form>
            </Modal>
          </>
        )}

        {/* ── CAMPAIGNS ─────────────────────────────────────────────────── */}
        {tab === 'campaigns' && (
          <>
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateCampaign(true)}><Plus size={15} /> Nouvelle campagne</Button>
            </div>

            {campaignsQ.isLoading ? <PageLoader /> : (
              <>
                <Table>
                  <Thead>
                    <tr><Th>Nom</Th><Th>Type</Th><Th>Statut</Th><Th>Contacts</Th><Th>Envois</Th><Th>Ouvertures</Th><Th></Th></tr>
                  </Thead>
                  <Tbody>
                    {(campaignsQ.data?.data ?? []).map((camp: any) => (
                      <Tr key={camp.id}>
                        <Td className="font-medium">{camp.name}</Td>
                        <Td><Badge variant="default">{camp.type}</Badge></Td>
                        <Td><Badge variant={statusVariant(camp.status)}>{camp.status}</Badge></Td>
                        <Td>{camp._count?.contacts ?? 0}</Td>
                        <Td>{camp.sentCount}</Td>
                        <Td>{camp.openCount}</Td>
                        <Td>
                          {camp.status === 'DRAFT' && (
                            <button onClick={() => launchCampaignM.mutate(camp.id)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                              <TrendingUp size={13} /> Lancer
                            </button>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {campaignsQ.data?.meta && (
                  <Pagination meta={campaignsQ.data.meta as PaginationMeta} onPageChange={setCampPage} />
                )}
              </>
            )}

            <Modal open={showCreateCampaign} onClose={() => setShowCreateCampaign(false)} title="Nouvelle campagne">
              <form onSubmit={campForm.handleSubmit((d) => createCampaignM.mutate(d))} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Nom *</label>
                  <Input {...campForm.register('name')} placeholder="Campagne Black Friday" className="mt-1" />
                  {campForm.formState.errors.name && <p className="text-xs text-red-500 mt-0.5">{campForm.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Type *</label>
                  <select {...campForm.register('type')} className="mt-1 w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:outline-none">
                    {['EMAIL', 'SMS', 'SOCIAL_MEDIA', 'PUSH_NOTIFICATION'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Sujet / Objet</label>
                  <Input {...campForm.register('subject')} placeholder="Offre exclusive pour vous" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Date début</label>
                    <Input {...campForm.register('startDate')} type="date" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Date fin</label>
                    <Input {...campForm.register('endDate')} type="date" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Budget (FCFA)</label>
                  <Input {...campForm.register('budget')} type="number" placeholder="0" className="mt-1" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateCampaign(false)}>Annuler</Button>
                  <Button type="submit" disabled={createCampaignM.isPending}>Créer</Button>
                </div>
              </form>
            </Modal>
          </>
        )}

        {/* ── METRICS ───────────────────────────────────────────────────── */}
        {tab === 'metrics' && (
          metricsQ.isLoading ? <PageLoader /> : metricsQ.data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricCard label="Activités aujourd'hui" value={metricsQ.data.activitiesToday} color="text-blue-600" />
                <MetricCard label="Opportunités ouvertes" value={metricsQ.data.opportunities.open} color="text-amber-600" />
                <MetricCard
                  label="Taux de gain"
                  value={`${metricsQ.data.opportunities.winRate}%`}
                  sub={`${metricsQ.data.opportunities.won} gagnées / ${metricsQ.data.opportunities.total}`}
                  color="text-emerald-600"
                />
                <MetricCard label="Valeur gagnée" value={formatCurrency(metricsQ.data.opportunities.wonValue)} color="text-purple-600" />
              </div>

              <Card>
                <CardHeader><CardTitle>Entonnoir de leads</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const funnel = metricsQ.data!.leadFunnel;
                    const maxVal = Math.max(...Object.values(funnel));
                    const colorMap: Record<string, string> = {
                      NEW: 'bg-blue-400', CONTACTED: 'bg-amber-400',
                      QUALIFIED: 'bg-emerald-400', CONVERTED: 'bg-purple-400', LOST: 'bg-red-300',
                    };
                    return Object.entries(funnel).map(([stage, count]) => (
                      <FunnelBar key={stage} label={stage} count={count} max={maxVal} color={colorMap[stage] ?? 'bg-slate-300'} />
                    ));
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Pipeline des opportunités</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {[
                      { label: 'Total', value: metricsQ.data.opportunities.total, color: 'text-slate-700' },
                      { label: 'Ouvertes', value: metricsQ.data.opportunities.open, color: 'text-amber-600' },
                      { label: 'Gagnées', value: metricsQ.data.opportunities.won, color: 'text-emerald-600' },
                      { label: 'Perdues', value: metricsQ.data.opportunities.lost, color: 'text-red-500' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Valeur totale du pipeline</p>
                      <p className="text-lg font-bold text-slate-800">{formatCurrency(metricsQ.data.opportunities.totalValue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Valeur gagnée</p>
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(metricsQ.data.opportunities.wonValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null
        )}

      </div>
    </>
  );
}
