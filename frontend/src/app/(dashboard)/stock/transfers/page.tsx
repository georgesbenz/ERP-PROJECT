'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Send, PackageCheck, XCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageLoader } from '@/components/ui/Spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { stockService } from '@/services/stock.service';
import { inventoryService } from '@/services/inventory.service';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-stone-100 text-slate-600' },
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  IN_TRANSIT: { label: 'En transit', color: 'bg-sky-100 text-sky-700' },
  PARTIALLY_RECEIVED: { label: 'Partiellement reçu', color: 'bg-orange-100 text-orange-700' },
  COMPLETED: { label: 'Terminé', color: 'bg-indigo-100 text-indigo-700' },
  CANCELLED: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-stone-100 text-slate-600' };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── New Transfer Form ─────────────────────────────────────────────────────────
function NewTransferForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<
    { productId: string; requestedQty: number; unitCost: number }[]
  >([{ productId: '', requestedQty: 1, unitCost: 0 }]);

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
    queryKey: ['stock-levels-from', fromWarehouseId],
    queryFn: () =>
      fromWarehouseId ? stockService.getStockLevels({ warehouseId: fromWarehouseId }) : Promise.resolve([]),
    enabled: !!fromWarehouseId,
  });

  const getAvailable = (productId: string) => {
    const inv = (stockLevels as any[]).find((s: any) => s.productId === productId);
    return inv ? Number(inv.available) : 0;
  };

  const mutation = useMutation({
    mutationFn: stockService.createTransfer,
    onSuccess: onCreated,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromWarehouseId === toWarehouseId) {
      alert('Les entrepôts source et destination doivent être différents');
      return;
    }
    const validLines = lines.filter((l) => l.productId && l.requestedQty > 0);
    mutation.mutate({ fromWarehouseId, toWarehouseId, notes, lines: validLines });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Entrepôt source *</label>
          <select
            required
            value={fromWarehouseId}
            onChange={(e) => setFromWarehouseId(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            <option value="">Sélectionner…</option>
            {(warehouses as any[]).map((w: any) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Entrepôt destination *</label>
          <select
            required
            value={toWarehouseId}
            onChange={(e) => setToWarehouseId(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            <option value="">Sélectionner…</option>
            {(warehouses as any[])
              .filter((w: any) => w.id !== fromWarehouseId)
              .map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
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
          <label className="text-sm font-medium text-slate-700">Articles à transférer</label>
          <button
            type="button"
            onClick={() => setLines((p) => [...p, { productId: '', requestedQty: 1, unitCost: 0 }])}
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
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Disponible</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Qté à transférer</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Coût unit.</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lines.map((line, idx) => {
                const available = line.productId ? getAvailable(line.productId) : 0;
                return (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <select
                        required
                        value={line.productId}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) => i === idx ? { ...l, productId: e.target.value } : l)
                          )
                        }
                        className="w-full rounded border border-stone-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                      >
                        <option value="">Sélectionner…</option>
                        {products.filter((p: any) => !p.isService).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-xs font-semibold tabular-nums ${available <= 0 ? 'text-red-600' : 'text-slate-600'}`}>
                        {available.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        required
                        value={line.requestedQty}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) => i === idx ? { ...l, requestedQty: parseFloat(e.target.value) || 0 } : l)
                          )
                        }
                        className="w-24 rounded border border-stone-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none"
                      />
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
        <Button type="submit" loading={mutation.isPending}>Créer le transfert</Button>
      </div>
    </form>
  );
}

// ── Receive Transfer Modal ────────────────────────────────────────────────────
function ReceiveModal({
  transfer,
  onClose,
  onReceived,
}: {
  transfer: any;
  onClose: () => void;
  onReceived: () => void;
}) {
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>(
    Object.fromEntries(
      transfer.lines.map((l: any) => [l.id, Number(l.sentQty) - Number(l.receivedQty)])
    )
  );

  const mutation = useMutation({
    mutationFn: (lines: any) => stockService.receiveTransfer(transfer.id, { lines }),
    onSuccess: onReceived,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = Object.entries(receivedQtys)
      .filter(([, qty]) => qty > 0)
      .map(([lineId, receivedQty]) => ({ lineId, receivedQty }));
    mutation.mutate(lines);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Transfert <strong>{transfer.reference}</strong>: {transfer.fromWarehouse?.name} → {transfer.toWarehouse?.name}
      </p>
      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Produit</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Envoyé</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Déjà reçu</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Qté reçue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {transfer.lines.map((line: any) => {
              const pending = Number(line.sentQty) - Number(line.receivedQty);
              return (
                <tr key={line.id}>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {line.product?.name ?? '—'}
                    <span className="ml-1 text-xs text-slate-400">({line.product?.sku})</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                    {Number(line.sentQty).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                    {Number(line.receivedQty).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      max={pending}
                      value={receivedQtys[line.id] ?? 0}
                      onChange={(e) =>
                        setReceivedQtys((prev) => ({
                          ...prev,
                          [line.id]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-24 rounded border border-stone-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          {(mutation.error as any)?.response?.data?.message ?? 'Erreur lors de la réception'}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
        <Button type="submit" loading={mutation.isPending}>Confirmer la réception</Button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TransfersPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [receiveTransfer, setReceiveTransfer] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', statusFilter, page],
    queryFn: () => stockService.getTransfers({ status: statusFilter || undefined, page }),
  });

  const transfers: any[] = (data as any)?.data ?? [];

  const sendMutation = useMutation({
    mutationFn: (id: string) => stockService.sendTransfer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => stockService.cancelTransfer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }),
  });

  return (
    <>
      <Header title="Transferts d'Entrepôt" />
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
            Liste des transferts
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'new'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Nouveau transfert
          </button>
        </div>

        {activeTab === 'new' ? (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm max-w-4xl">
            <h2 className="mb-4 text-base font-semibold text-slate-700">Créer un transfert d'entrepôt</h2>
            <NewTransferForm
              onClose={() => setActiveTab('list')}
              onCreated={() => {
                qc.invalidateQueries({ queryKey: ['transfers'] });
                setActiveTab('list');
              }}
            />
          </div>
        ) : (
          <>
            {/* Filter */}
            <div className="flex items-center gap-3">
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
                      <Th>Source → Destination</Th>
                      <Th className="text-right">Lignes</Th>
                      <Th>Statut</Th>
                      <Th>Créé par</Th>
                      <Th>Actions</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {transfers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                          Aucun transfert trouvé
                        </td>
                      </tr>
                    )}
                    {transfers.map((t: any) => (
                      <Tr key={t.id}>
                        <Td className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                        </Td>
                        <Td className="font-mono text-xs font-medium text-slate-700">{t.reference}</Td>
                        <Td className="text-slate-700">
                          <span className="font-medium">{t.fromWarehouse?.name}</span>
                          <span className="mx-1.5 text-slate-400">→</span>
                          <span className="font-medium">{t.toWarehouse?.name}</span>
                        </Td>
                        <Td className="text-right tabular-nums">{t.lines?.length ?? 0}</Td>
                        <Td><StatusBadge status={t.status} /></Td>
                        <Td className="text-xs text-slate-400">
                          {t.createdBy ? t.createdBy.slice(0, 8) + '…' : '—'}
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1.5">
                            {(t.status === 'DRAFT' || t.status === 'PENDING') && (
                              <button
                                title="Envoyer"
                                onClick={() => sendMutation.mutate(t.id)}
                                className="text-sky-600 hover:text-sky-800"
                                disabled={sendMutation.isPending}
                              >
                                <Send size={15} />
                              </button>
                            )}
                            {(t.status === 'IN_TRANSIT' || t.status === 'PARTIALLY_RECEIVED') && (
                              <button
                                title="Réceptionner"
                                onClick={() => setReceiveTransfer(t)}
                                className="text-emerald-600 hover:text-emerald-800"
                              >
                                <PackageCheck size={15} />
                              </button>
                            )}
                            {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                              <button
                                title="Annuler"
                                onClick={() => cancelMutation.mutate(t.id)}
                                className="text-red-500 hover:text-red-700"
                                disabled={cancelMutation.isPending}
                              >
                                <XCircle size={15} />
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

      {/* Receive Modal */}
      {receiveTransfer && (
        <Modal
          open
          onClose={() => setReceiveTransfer(null)}
          title="Réceptionner le transfert"
        >
          <ReceiveModal
            transfer={receiveTransfer}
            onClose={() => setReceiveTransfer(null)}
            onReceived={() => {
              qc.invalidateQueries({ queryKey: ['transfers'] });
              setReceiveTransfer(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
