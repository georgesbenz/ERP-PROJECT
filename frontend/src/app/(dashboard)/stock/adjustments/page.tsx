'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Printer, Trash2, CheckCircle, XCircle, PlayCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/ui/Spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { stockService } from '@/services/stock.service';
import { inventoryService } from '@/services/inventory.service';
import { printTable } from '@/lib/print-utils';
import { useT } from '@/hooks/useT';

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-stone-100 text-slate-600' },
  PENDING_APPROVAL: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-700' },
  APPLIED: { label: 'Appliqué', color: 'bg-indigo-100 text-indigo-700' },
};

const REASONS = [
  { value: 'PHYSICAL_COUNT', label: 'Inventaire physique' },
  { value: 'DAMAGE', label: 'Dommage' },
  { value: 'EXPIRY', label: 'Expiration' },
  { value: 'FOUND_STOCK', label: 'Stock trouvé' },
  { value: 'OTHER', label: 'Autre' },
];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-stone-100 text-slate-600' };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── New Adjustment Form ───────────────────────────────────────────────────────
function NewAdjustmentForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState('');
  const [reason, setReason] = useState('PHYSICAL_COUNT');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<
    { productId: string; systemQty: number; physicalQty: number; unitCost: number }[]
  >([{ productId: '', systemQty: 0, physicalQty: 0, unitCost: 0 }]);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: inventoryService.listWarehouses,
  });
  const { data: productsRes } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => inventoryService.listProducts(1, 200),
  });
  const products = (productsRes as any)?.data ?? [];

  const { data: stockLevels = [] } = useQuery({
    queryKey: ['stock-levels-wh', warehouseId],
    queryFn: () => warehouseId ? stockService.getStockLevels({ warehouseId }) : Promise.resolve([]),
    enabled: !!warehouseId,
  });

  const getSystemQty = useCallback(
    (productId: string) => {
      if (!warehouseId) return 0;
      const inv = (stockLevels as any[]).find((s: any) => s.productId === productId);
      return inv ? Number(inv.available) : 0;
    },
    [stockLevels, warehouseId],
  );

  const handleProductChange = (idx: number, productId: string) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, productId, systemQty: getSystemQty(productId) } : l,
      ),
    );
  };

  const mutation = useMutation({
    mutationFn: stockService.createAdjustment,
    onSuccess: onCreated,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) return;
    const validLines = lines.filter((l) => l.productId);
    mutation.mutate({
      warehouseId,
      reason,
      notes,
      lines: validLines.map((l) => ({
        ...l,
        systemQty: l.systemQty,
        physicalQty: l.physicalQty,
        unitCost: l.unitCost,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Entrepôt *</label>
          <select
            required
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            <option value="">Sélectionner…</option>
            {(warehouses as any[]).map((w: any) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Raison *</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
          placeholder="Notes optionnelles…"
        />
      </div>

      {/* Lines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Lignes d'ajustement</label>
          <button
            type="button"
            onClick={() => setLines((p) => [...p, { productId: '', systemQty: 0, physicalQty: 0, unitCost: 0 }])}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
          >
            <Plus size={13} /> Ajouter ligne
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Produit</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Qté système</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Qté physique</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Écart</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Coût unit.</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lines.map((line, idx) => {
                const variance = line.physicalQty - line.systemQty;
                return (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <select
                        required
                        value={line.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full rounded border border-stone-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                      >
                        <option value="">Sélectionner…</option>
                        {products.filter((p: any) => !p.isService).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.001"
                        value={line.systemQty}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) => i === idx ? { ...l, systemQty: parseFloat(e.target.value) || 0 } : l)
                          )
                        }
                        className="w-24 rounded border border-stone-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={line.physicalQty}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) => i === idx ? { ...l, physicalQty: parseFloat(e.target.value) || 0 } : l)
                          )
                        }
                        className="w-24 rounded border border-stone-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-semibold tabular-nums ${variance > 0 ? 'text-emerald-600' : variance < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {variance > 0 ? '+' : ''}{variance.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.unitCost}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) => i === idx ? { ...l, unitCost: parseFloat(e.target.value) || 0 } : l)
                          )
                        }
                        className="w-24 rounded border border-stone-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500"
                        disabled={lines.length <= 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          {(mutation.error as any)?.response?.data?.message ?? 'Erreur lors de la création'}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
        <Button type="submit" loading={mutation.isPending}>Créer l'ajustement</Button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdjustmentsPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [approveModal, setApproveModal] = useState<{ id: string; approve: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adjustments', statusFilter, page],
    queryFn: () => stockService.getAdjustments({ status: statusFilter || undefined, page }),
  });

  const adjustments: any[] = (data as any)?.data ?? [];

  const submitMutation = useMutation({
    mutationFn: (id: string) => stockService.submitAdjustment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adjustments'] }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      stockService.approveAdjustment(id, { approved }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adjustments'] });
      setApproveModal(null);
    },
  });

  const applyMutation = useMutation({
    mutationFn: (id: string) => stockService.applyAdjustment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adjustments'] }),
  });

  return (
    <>
      <Header title={t('stock.adjustments.title')} />
      <div className="p-6 space-y-4">

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1 w-fit">
          <button
            onClick={() => setActiveTab('list')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'list'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Liste des ajustements
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'new'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Nouvel ajustement
          </button>
        </div>

        {activeTab === 'new' ? (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm max-w-4xl">
            <h2 className="mb-4 text-base font-semibold text-slate-700">Créer un ajustement de stock</h2>
            <NewAdjustmentForm
              onClose={() => setActiveTab('list')}
              onCreated={() => {
                qc.invalidateQueries({ queryKey: ['adjustments'] });
                setActiveTab('list');
              }}
            />
          </div>
        ) : (
          <>
            {/* Filter + print */}
            <div className="no-print flex items-center gap-3 justify-between">
              <label className="text-xs font-medium text-slate-500">Statut :</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <button
                onClick={() => printTable({
                  title: 'Ajustements de Stock',
                  rows: adjustments,
                  columns: [
                    { header: 'Date', value: (a) => new Date(a.createdAt).toLocaleDateString('fr-FR') },
                    { header: 'Référence', value: (a) => a.reference },
                    { header: 'Entrepôt', value: (a) => a.warehouse?.name ?? '—' },
                    { header: 'Raison', value: (a) => a.reason },
                    { header: 'Lignes', value: (a) => a.totalLines },
                    { header: 'Statut', value: (a) => a.status },
                  ],
                })}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-stone-50 transition-colors"
              >
                <Printer size={13} /> Imprimer
              </button>
            </div>

            {isLoading ? (
              <PageLoader />
            ) : (
              <div className="overflow-hidden rounded-xl border border-stone-200 shadow-sm">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Référence</Th>
                      <Th>Entrepôt</Th>
                      <Th>Raison</Th>
                      <Th className="text-right">Lignes</Th>
                      <Th>Statut</Th>
                      <Th>Créé par</Th>
                      <Th>Actions</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {adjustments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                          Aucun ajustement trouvé
                        </td>
                      </tr>
                    )}
                    {adjustments.map((adj: any) => (
                      <Tr key={adj.id}>
                        <Td className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(adj.createdAt).toLocaleDateString('fr-FR')}
                        </Td>
                        <Td className="font-mono text-xs font-medium text-slate-700">{adj.reference}</Td>
                        <Td className="text-slate-600">{adj.warehouse?.name ?? '—'}</Td>
                        <Td className="text-slate-600">{adj.reason}</Td>
                        <Td className="text-right tabular-nums">{adj.totalLines}</Td>
                        <Td><StatusBadge status={adj.status} /></Td>
                        <Td className="text-xs text-slate-400">
                          {adj.createdBy ? adj.createdBy.slice(0, 8) + '…' : '—'}
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1.5">
                            {adj.status === 'DRAFT' && (
                              <button
                                title="Soumettre pour approbation"
                                onClick={() => submitMutation.mutate(adj.id)}
                                className="rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-100"
                                disabled={submitMutation.isPending}
                              >
                                Soumettre
                              </button>
                            )}
                            {adj.status === 'PENDING_APPROVAL' && (
                              <>
                                <button
                                  title="Approuver"
                                  onClick={() => setApproveModal({ id: adj.id, approve: true })}
                                  className="text-emerald-600 hover:text-emerald-800"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  title="Rejeter"
                                  onClick={() => setApproveModal({ id: adj.id, approve: false })}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            {(adj.status === 'APPROVED' || adj.status === 'DRAFT') && (
                              <button
                                title="Appliquer"
                                onClick={() => applyMutation.mutate(adj.id)}
                                className="text-indigo-600 hover:text-indigo-800"
                                disabled={applyMutation.isPending}
                              >
                                <PlayCircle size={16} />
                              </button>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Approve/Reject Modal */}
      {approveModal && (
        <Modal
          open
          onClose={() => setApproveModal(null)}
          title={approveModal.approve ? 'Approuver l\'ajustement' : 'Rejeter l\'ajustement'}
        >
          <p className="text-sm text-slate-600 mb-4">
            {approveModal.approve
              ? 'Confirmez-vous l\'approbation de cet ajustement ?'
              : 'Confirmez-vous le rejet de cet ajustement ?'}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setApproveModal(null)}>Annuler</Button>
            <Button
              variant={approveModal.approve ? 'primary' : 'danger'}
              loading={approveMutation.isPending}
              onClick={() =>
                approveMutation.mutate({ id: approveModal.id, approved: approveModal.approve })
              }
            >
              {approveModal.approve ? 'Approuver' : 'Rejeter'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
