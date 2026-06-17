'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, ChevronRight, CheckCircle, Clock, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { stockService, type CycleCount, type CycleCountLine } from '@/services/stock.service';
import { formatDate } from '@/lib/utils';

function statusVariant(status: string) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'warning';
  return 'default';
}

function CountDetailPanel({
  count,
  onClose,
  onComplete,
}: {
  count: CycleCount;
  onClose: () => void;
  onComplete: () => void;
}) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cycle-count', count.id],
    queryFn: () => stockService.getCycleCount(count.id),
  });

  const updateLine = useMutation({
    mutationFn: ({ lineId, countedQty }: { lineId: string; countedQty: number }) =>
      stockService.updateCycleCountLine(count.id, lineId, countedQty),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycle-count', count.id] }),
  });

  const completeM = useMutation({
    mutationFn: () => stockService.completeCycleCount(count.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycle-counts'] });
      qc.invalidateQueries({ queryKey: ['cycle-count', count.id] });
      onComplete();
    },
  });

  const lines: CycleCountLine[] = data?.lines ?? [];
  const countedLines = lines.filter((l) => l.countedQty !== null).length;
  const allCounted = lines.length > 0 && countedLines === lines.length;
  const isCompleted = (data?.status ?? count.status) === 'COMPLETED';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-indigo-600" />
              {count.reference}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {count.warehouse?.name ?? 'Entrepôt principal'} · {countedLines}/{lines.length} lignes comptées
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isCompleted && allCounted && (
              <Button
                size="sm"
                onClick={() => completeM.mutate()}
                loading={completeM.isPending}
              >
                <CheckCircle size={14} /> Valider le comptage
              </Button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Lines */}
        <div className="overflow-y-auto flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="p-8"><PageLoader /></div>
          ) : (
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Produit</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">SKU</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Qté système</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Qté comptée</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Écart</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const variance = line.countedQty !== null ? line.countedQty - line.systemQty : null;
                  return (
                    <tr key={line.id} className="border-b border-stone-50 hover:bg-stone-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {line.product?.name ?? line.productId}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-400">
                        {line.product?.sku ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{line.systemQty}</td>
                      <td className="px-4 py-3 text-right">
                        {isCompleted ? (
                          <span className="font-medium">{line.countedQty ?? '—'}</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            defaultValue={line.countedQty ?? ''}
                            placeholder="—"
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) updateLine.mutate({ lineId: line.id, countedQty: v });
                            }}
                            className="w-24 rounded border border-stone-200 px-2 py-1 text-right text-sm focus:border-indigo-300 focus:outline-none"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {variance !== null ? (
                          <span className={`font-semibold text-sm ${variance === 0 ? 'text-emerald-600' : variance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {variance > 0 ? `+${variance}` : variance}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {lines.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucun article</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StockCountPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<CycleCount | null>(null);

  const { data: counts, isLoading } = useQuery({
    queryKey: ['cycle-counts'],
    queryFn: stockService.listCycleCounts,
  });

  const createM = useMutation({
    mutationFn: () => stockService.createCycleCount(),
    onSuccess: (newCount) => {
      qc.invalidateQueries({ queryKey: ['cycle-counts'] });
      setSelected(newCount);
    },
  });

  return (
    <>
      <Header title="Inventaire physique" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Créez un comptage physique pour comparer les quantités système avec les quantités réelles.
          </p>
          <Button onClick={() => createM.mutate()} loading={createM.isPending}>
            <Plus size={16} /> Nouveau comptage
          </Button>
        </div>

        {isLoading ? <PageLoader /> : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Référence</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Entrepôt</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Articles</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(counts ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{c.reference}</td>
                    <td className="px-4 py-3 text-slate-600">{c.warehouse?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(c.status)}>
                        {c.status === 'COMPLETED' ? (
                          <><CheckCircle size={11} className="inline mr-1" />Validé</>
                        ) : (
                          <><Clock size={11} className="inline mr-1" />En cours</>
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{c._count?.lines ?? 0}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(c)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Ouvrir <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {(counts ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucun comptage. Créez-en un pour commencer.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <CountDetailPanel
          count={selected}
          onClose={() => setSelected(null)}
          onComplete={() => setSelected(null)}
        />
      )}
    </>
  );
}
