'use client';

import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { stockService } from '@/services/stock.service';
import { formatCurrency } from '@/lib/utils';

function urgencyColor(urgency: string) {
  if (urgency === 'CRITICAL') return 'bg-red-100 text-red-700 border-red-200';
  if (urgency === 'HIGH') return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

function urgencyIcon(urgency: string) {
  if (urgency === 'CRITICAL') return AlertTriangle;
  if (urgency === 'HIGH') return TrendingDown;
  return Clock;
}

export default function ReorderSuggestionsPage() {
  const { data: suggestions, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reorder-suggestions'],
    queryFn: stockService.getReorderSuggestions,
    staleTime: 60_000,
  });

  const critical = (suggestions ?? []).filter((s) => s.urgency === 'CRITICAL').length;
  const high = (suggestions ?? []).filter((s) => s.urgency === 'HIGH').length;
  const medium = (suggestions ?? []).filter((s) => s.urgency === 'MEDIUM').length;

  const totalEstimatedCost = (suggestions ?? []).reduce((s, r) => s + (r.estimatedCost ?? 0), 0);

  return (
    <>
      <Header title="Suggestions de réapprovisionnement" />
      <div className="p-6 space-y-5">
        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'CRITIQUE', value: critical, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
            { label: 'URGENT', value: high, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
            { label: 'MOYEN', value: medium, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Coût estimé', value: formatCurrency(totalEstimatedCost), color: 'text-slate-800', bg: 'bg-slate-50 border-slate-200' },
          ].map((k) => (
            <div key={k.label} className={`rounded-xl border p-4 text-center ${k.bg}`}>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-500 mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Produits dont le stock est en dessous du seuil minimum, triés par urgence.
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {isFetching ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>

        {isLoading ? <PageLoader /> : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Produit</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">SKU</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Stock actuel</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Stock min.</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Usage / jour</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Qté suggérée</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Coût estimé</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Urgence</th>
                </tr>
              </thead>
              <tbody>
                {(suggestions ?? []).map((s) => {
                  const Icon = urgencyIcon(s.urgency);
                  return (
                    <tr key={s.productId} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-400">{s.sku ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${s.currentQty === 0 ? 'text-red-600' : 'text-slate-800'}`}>
                          {s.currentQty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{s.minStock}</td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {s.avgDailyUsage > 0 ? s.avgDailyUsage.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-indigo-700">{s.suggestedOrderQty}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {s.estimatedCost != null ? formatCurrency(s.estimatedCost) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${urgencyColor(s.urgency)}`}>
                          <Icon size={10} /> {s.urgency}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(suggestions ?? []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <ShoppingBag size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-400">Tous les stocks sont au-dessus du seuil minimum</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
