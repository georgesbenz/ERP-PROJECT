'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download, Upload, FileSpreadsheet, Package, ShoppingCart,
  Truck, BarChart3, RefreshCw, CheckCircle, AlertCircle, ChevronDown,
  Users, Building2, Receipt, TrendingUp,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { inventoryService } from '@/services/inventory.service';
import { salesService } from '@/services/sales.service';
import { purchasesService } from '@/services/purchases.service';
import { reportsService } from '@/services/reports.service';
import {
  exportInventoryToExcel,
  exportSalesToExcel,
  exportPurchasesToExcel,
  exportFullERP,
  downloadImportTemplate,
} from '@/lib/excel-export';
import { formatCurrency } from '@/lib/utils';
import type { Product, StockLevel, StockMovement, Sale, Purchase } from '@/types/models';
import type { PaginationMeta } from '@/lib/api';
import { useT } from '@/hooks/useT';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';
interface ModuleExportState { status: ExportStatus; message?: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status, message }: { status: ExportStatus; message?: string }) {
  if (status === 'idle')    return null;
  if (status === 'loading') return (
    <span className="flex items-center gap-1.5 text-sm text-indigo-600">
      <RefreshCw size={13} className="animate-spin" /> Generating Excel…
    </span>
  );
  if (status === 'success') return (
    <span className="flex items-center gap-1.5 text-sm text-emerald-600">
      <CheckCircle size={13} /> Downloaded!
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-sm text-red-500">
      <AlertCircle size={13} /> {message ?? 'Failed'}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-indigo-700">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

// ─── Import Panel ─────────────────────────────────────────────────────────────

function ImportPanel() {
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [status, setStatus]   = useState<ExportStatus>('idle');
  const [message, setMessage] = useState('');

  const parseFile = useCallback(async (f: File) => {
    try {
      // Load exceljs from public static bundle (avoids npm resolution in Docker)
      if (!(window as any).ExcelJS) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script');
          s.src = '/exceljs.min.js';
          s.onload = () => res(); s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const ExcelJS = (window as any).ExcelJS;
      const wb = new ExcelJS.Workbook();
      const buffer = await f.arrayBuffer();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (!ws) { setMessage('No worksheet found'); setStatus('error'); return; }

      const headers: string[] = [];
      const rows: Record<string, string>[] = [];

      ws.eachRow((row: any, ri: number) => {
        if (ri === 1 && String(row.getCell(1).value ?? '').startsWith('PRODUCT IMPORT TEMPLATE')) return;
        if (ri <= 2) {
          row.eachCell({ includeEmpty: true }, (cell: any, ci: number) => {
            headers[ci - 1] = String(cell.value ?? '').replace(' *', '').trim();
          });
          return;
        }
        const record: Record<string, string> = {};
        row.eachCell({ includeEmpty: true }, (cell: any, ci: number) => {
          if (headers[ci - 1]) record[headers[ci - 1]] = String(cell.value ?? '');
        });
        if (record['name'] || record['sku']) rows.push(record);
      });

      setPreview(rows);
      setStatus('idle');
    } catch {
      setMessage('Could not parse file. Make sure it is a valid .xlsx file.');
      setStatus('error');
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); parseFile(f); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); parseFile(f); }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setStatus('loading');
    let ok = 0; let failed = 0;
    for (const row of preview) {
      if (!row['name'] || !row['sku']) { failed++; continue; }
      try {
        await inventoryService.createProduct({
          name:        row['name'],
          sku:         row['sku'],
          salePrice:   parseFloat(row['salePrice'] ?? '0') || 0,
          costPrice:   parseFloat(row['costPrice'] ?? '0') || 0,
          description: row['description'] || undefined,
          isService:   row['isService']?.toLowerCase() === 'true',
          minStock:    row['minStock'] ? parseInt(row['minStock']) : undefined,
        });
        ok++;
      } catch { failed++; }
    }
    setMessage(`Imported ${ok} product(s)${failed > 0 ? `, ${failed} failed` : ''}.`);
    setStatus(failed > 0 && ok === 0 ? 'error' : 'success');
    setPreview([]);
    setFile(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload size={18} className="text-emerald-600" />
          Import Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="no-print flex items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            Upload a filled-in template to bulk-create products.
          </p>
          <Button variant="outline" size="sm" onClick={() => downloadImportTemplate('products')}>
            <Download size={13} /> Download Template
          </Button>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-100"
          onClick={() => document.getElementById('import-file-input')?.click()}
        >
          <FileSpreadsheet size={28} className="text-indigo-400" />
          {file ? (
            <p className="text-sm font-medium text-indigo-700">{file.name}</p>
          ) : (
            <p className="text-sm text-indigo-600">
              Drag &amp; drop an Excel file here, or <span className="font-semibold underline">click to browse</span>
            </p>
          )}
          <input id="import-file-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleChange} />
        </div>

        {preview.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Preview — {preview.length} row(s) ready to import
            </p>
            <div className="overflow-x-auto rounded-lg border border-stone-200">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-stone-50">
                    {Object.keys(preview[0]).map((h) => (
                      <th key={h} className="border-b border-stone-200 px-3 py-1.5 text-left font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-stone-50'}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="border-b border-stone-100 px-3 py-1.5 text-slate-700">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 5 && (
                <p className="px-3 py-1.5 text-xs text-slate-400">…and {preview.length - 5} more row(s)</p>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Button onClick={handleImport} loading={status === 'loading'} size="sm">
                <Upload size={13} /> Import {preview.length} rows
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => { setFile(null); setPreview([]); setStatus('idle'); }}>
                Clear
              </Button>
              <StatusBadge status={status} message={message} />
            </div>
          </div>
        )}
        {status !== 'idle' && preview.length === 0 && <StatusBadge status={status} message={message} />}
      </CardContent>
    </Card>
  );
}

// ─── Analytics Report Tabs ────────────────────────────────────────────────────

type AnalyticsTab = 'employees' | 'branches' | 'tax' | 'margin';

function AnalyticsSection() {
  const [tab, setTab] = useState<AnalyticsTab>('employees');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params = { startDate: startDate || undefined, endDate: endDate || undefined };

  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ['report-employees', startDate, endDate],
    queryFn: () => reportsService.employeeReport(params.startDate, params.endDate),
    enabled: tab === 'employees',
  });
  const { data: branchData, isLoading: branchLoading } = useQuery({
    queryKey: ['report-branches', startDate, endDate],
    queryFn: () => reportsService.branchReport(params.startDate, params.endDate),
    enabled: tab === 'branches',
  });
  const { data: taxData, isLoading: taxLoading } = useQuery({
    queryKey: ['report-tax', startDate, endDate],
    queryFn: () => reportsService.taxReport(params.startDate, params.endDate),
    enabled: tab === 'tax',
  });
  const { data: marginData, isLoading: marginLoading } = useQuery({
    queryKey: ['report-margin', startDate, endDate],
    queryFn: () => reportsService.marginReport(params.startDate, params.endDate),
    enabled: tab === 'margin',
  });

  const tabs: { key: AnalyticsTab; label: string; icon: React.ElementType }[] = [
    { key: 'employees', label: 'Employee Sales', icon: Users },
    { key: 'branches',  label: 'Branch Sales',   icon: Building2 },
    { key: 'tax',       label: 'Tax / VAT',       icon: Receipt },
    { key: 'margin',    label: 'Gross Margin',     icon: TrendingUp },
  ];

  const isLoading = tab === 'employees' ? empLoading
    : tab === 'branches' ? branchLoading
    : tab === 'tax' ? taxLoading
    : marginLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 size={18} className="text-indigo-600" />
          Analytics Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-stone-200 px-2 py-1 text-xs focus:border-indigo-300 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-stone-200 px-2 py-1 text-xs focus:border-indigo-300 focus:outline-none" />
          </div>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-slate-400 hover:text-slate-700">Clear</button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
          </div>
        ) : tab === 'employees' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone-100">
                <th className="py-2 text-left font-semibold text-slate-600">Employee</th>
                <th className="py-2 text-right font-semibold text-slate-600">Sales</th>
                <th className="py-2 text-right font-semibold text-slate-600">Revenue</th>
                <th className="py-2 text-right font-semibold text-slate-600">Avg / Sale</th>
              </tr></thead>
              <tbody>
                {(empData ?? []).map((r) => (
                  <tr key={r.userId} className="border-b border-stone-50 hover:bg-stone-50">
                    <td className="py-2 font-medium text-slate-800">{r.name}</td>
                    <td className="py-2 text-right text-slate-600">{r.salesCount}</td>
                    <td className="py-2 text-right font-semibold text-indigo-700">{formatCurrency(r.revenue)}</td>
                    <td className="py-2 text-right text-slate-500">
                      {r.salesCount > 0 ? formatCurrency(r.revenue / r.salesCount) : '—'}
                    </td>
                  </tr>
                ))}
                {(empData ?? []).length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">No data for this period</td></tr>
                )}
              </tbody>
              {(empData ?? []).length > 0 && (
                <tfoot><tr className="border-t-2 border-stone-200">
                  <td className="py-2 font-bold text-slate-800">Total</td>
                  <td className="py-2 text-right font-bold">{(empData ?? []).reduce((s, r) => s + r.salesCount, 0)}</td>
                  <td className="py-2 text-right font-bold text-indigo-700">{formatCurrency((empData ?? []).reduce((s, r) => s + r.revenue, 0))}</td>
                  <td />
                </tr></tfoot>
              )}
            </table>
          </div>
        ) : tab === 'branches' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone-100">
                <th className="py-2 text-left font-semibold text-slate-600">Branch</th>
                <th className="py-2 text-right font-semibold text-slate-600">Sales</th>
                <th className="py-2 text-right font-semibold text-slate-600">Revenue</th>
                <th className="py-2 text-right font-semibold text-slate-600">Share</th>
              </tr></thead>
              <tbody>
                {(() => {
                  const grandTotal = (branchData ?? []).reduce((s, r) => s + r.revenue, 0);
                  return (branchData ?? []).map((r) => (
                    <tr key={r.branchId ?? 'no-branch'} className="border-b border-stone-50 hover:bg-stone-50">
                      <td className="py-2 font-medium text-slate-800">{r.name || 'No Branch'}</td>
                      <td className="py-2 text-right text-slate-600">{r.salesCount}</td>
                      <td className="py-2 text-right font-semibold text-indigo-700">{formatCurrency(r.revenue)}</td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-stone-200 overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${grandTotal > 0 ? (r.revenue / grandTotal) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8">
                            {grandTotal > 0 ? `${((r.revenue / grandTotal) * 100).toFixed(0)}%` : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
                {(branchData ?? []).length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">No data for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : tab === 'tax' ? (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-stone-100">
                  <th className="py-2 text-left font-semibold text-slate-600">Taux TVA</th>
                  <th className="py-2 text-right font-semibold text-slate-600">Factures</th>
                  <th className="py-2 text-right font-semibold text-slate-600">HT</th>
                  <th className="py-2 text-right font-semibold text-slate-600">TVA collectée</th>
                </tr></thead>
                <tbody>
                  {(taxData ?? []).map((r) => (
                    <tr key={r.taxRate} className="border-b border-stone-50 hover:bg-stone-50">
                      <td className="py-2 font-medium text-slate-800">{r.taxRate}%</td>
                      <td className="py-2 text-right text-slate-600">{r.invoiceCount}</td>
                      <td className="py-2 text-right text-slate-700">{formatCurrency(r.taxableAmount)}</td>
                      <td className="py-2 text-right font-semibold text-emerald-700">{formatCurrency(r.taxAmount)}</td>
                    </tr>
                  ))}
                  {(taxData ?? []).length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">No data for this period</td></tr>
                  )}
                </tbody>
                {(taxData ?? []).length > 0 && (
                  <tfoot><tr className="border-t-2 border-stone-200">
                    <td className="py-2 font-bold">Total</td>
                    <td className="py-2 text-right font-bold">{(taxData ?? []).reduce((s, r) => s + r.invoiceCount, 0)}</td>
                    <td className="py-2 text-right font-bold">{formatCurrency((taxData ?? []).reduce((s, r) => s + r.taxableAmount, 0))}</td>
                    <td className="py-2 text-right font-bold text-emerald-700">{formatCurrency((taxData ?? []).reduce((s, r) => s + r.taxAmount, 0))}</td>
                  </tr></tfoot>
                )}
              </table>
            </div>
          </div>
        ) : (
          /* Gross Margin */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone-100">
                <th className="py-2 text-left font-semibold text-slate-600">Product</th>
                <th className="py-2 text-right font-semibold text-slate-600">Revenue</th>
                <th className="py-2 text-right font-semibold text-slate-600">Cost</th>
                <th className="py-2 text-right font-semibold text-slate-600">Gross</th>
                <th className="py-2 text-right font-semibold text-slate-600">Margin %</th>
              </tr></thead>
              <tbody>
                {(marginData ?? []).map((r) => (
                  <tr key={r.productId} className="border-b border-stone-50 hover:bg-stone-50">
                    <td className="py-2 font-medium text-slate-800">{r.name}</td>
                    <td className="py-2 text-right text-slate-700">{formatCurrency(r.revenue)}</td>
                    <td className="py-2 text-right text-slate-500">{formatCurrency(r.cost)}</td>
                    <td className={`py-2 text-right font-semibold ${r.gross >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCurrency(r.gross)}
                    </td>
                    <td className="py-2 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.marginPct >= 30 ? 'bg-emerald-100 text-emerald-700'
                        : r.marginPct >= 10 ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                      }`}>
                        {r.marginPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {(marginData ?? []).length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No data for this period</td></tr>
                )}
              </tbody>
              {(marginData ?? []).length > 0 && (
                <tfoot><tr className="border-t-2 border-stone-200">
                  <td className="py-2 font-bold">Total</td>
                  <td className="py-2 text-right font-bold">{formatCurrency((marginData ?? []).reduce((s, r) => s + r.revenue, 0))}</td>
                  <td className="py-2 text-right font-bold">{formatCurrency((marginData ?? []).reduce((s, r) => s + r.cost, 0))}</td>
                  <td className={`py-2 text-right font-bold ${(marginData ?? []).reduce((s, r) => s + r.gross, 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrency((marginData ?? []).reduce((s, r) => s + r.gross, 0))}
                  </td>
                  <td />
                </tr></tfoot>
              )}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { t } = useT();
  const [states, setStates] = useState<Record<string, ModuleExportState>>({
    inventory: { status: 'idle' },
    sales:     { status: 'idle' },
    purchases: { status: 'idle' },
    full:      { status: 'idle' },
  });

  const set = (key: string, s: ModuleExportState) =>
    setStates((prev) => ({ ...prev, [key]: s }));

  const { data: invData }   = useQuery({ queryKey: ['products', 1, ''], queryFn: () => inventoryService.listProducts(1, 1) });
  const { data: salesData } = useQuery({ queryKey: ['sales', 1],        queryFn: () => salesService.listSales(1, 1) });
  const { data: poData }    = useQuery({ queryKey: ['purchases', 1],    queryFn: () => purchasesService.listPurchases(1, 1) });

  const handleInventoryExport = async () => {
    set('inventory', { status: 'loading' });
    try {
      const [prodRes, stockRes, movRes] = await Promise.all([
        inventoryService.listProducts(1, 500),
        inventoryService.getStockLevels(1, 500),
        inventoryService.listMovements({ page: 1, limit: 500 }),
      ]);
      await exportInventoryToExcel({
        products:    prodRes.data as Product[],
        stockLevels: (stockRes as { data: StockLevel[] }).data,
        movements:   movRes.data as StockMovement[],
      });
      set('inventory', { status: 'success' });
    } catch (e: unknown) {
      set('inventory', { status: 'error', message: (e as Error)?.message });
    }
  };

  const handleSalesExport = async () => {
    set('sales', { status: 'loading' });
    try {
      const res = await salesService.listSales(1, 1000);
      await exportSalesToExcel({ sales: (res as { data: Sale[] }).data });
      set('sales', { status: 'success' });
    } catch (e: unknown) {
      set('sales', { status: 'error', message: (e as Error)?.message });
    }
  };

  const handlePurchasesExport = async () => {
    set('purchases', { status: 'loading' });
    try {
      const res = await purchasesService.listPurchases(1, 1000);
      await exportPurchasesToExcel({ orders: (res as { data: Purchase[] }).data });
      set('purchases', { status: 'success' });
    } catch (e: unknown) {
      set('purchases', { status: 'error', message: (e as Error)?.message });
    }
  };

  const handleFullExport = async () => {
    set('full', { status: 'loading' });
    try {
      const [prodRes, stockRes, movRes, salesRes, poRes] = await Promise.all([
        inventoryService.listProducts(1, 500),
        inventoryService.getStockLevels(1, 500),
        inventoryService.listMovements({ page: 1, limit: 500 }),
        salesService.listSales(1, 1000),
        purchasesService.listPurchases(1, 1000),
      ]);
      await exportFullERP({
        inventory: {
          products:    prodRes.data as Product[],
          stockLevels: (stockRes as { data: StockLevel[] }).data,
          movements:   movRes.data as StockMovement[],
        },
        sales:     { sales: (salesRes as { data: Sale[] }).data },
        purchases: { orders: (poRes as { data: Purchase[] }).data },
      });
      set('full', { status: 'success' });
    } catch (e: unknown) {
      set('full', { status: 'error', message: (e as Error)?.message });
    }
  };

  const modules = [
    {
      key: 'inventory', icon: Package,
      color: 'text-indigo-600', bg: 'bg-indigo-50', accent: 'bg-indigo-500', border: 'border-indigo-200',
      label: 'Inventory',
      desc:  'Products, stock levels, and movements with analytics',
      sheets: ['📊 Summary', '📦 Products', '🏭 Stock Levels', '↕️ Movements', '📈 Charts'],
      count: (invData as { meta?: PaginationMeta })?.meta?.total ?? '—',
      unit:  'products',
      onExport: handleInventoryExport,
    },
    {
      key: 'sales', icon: ShoppingCart,
      color: 'text-emerald-600', bg: 'bg-emerald-50', accent: 'bg-emerald-500', border: 'border-emerald-200',
      label: 'Sales',
      desc:  'Sales orders, monthly revenue trend, status breakdown',
      sheets: ['📊 Summary', '🛒 Sales Orders', '📅 Monthly Trend', '📈 Charts'],
      count: (salesData as { meta?: PaginationMeta })?.meta?.total ?? '—',
      unit:  'orders',
      onExport: handleSalesExport,
    },
    {
      key: 'purchases', icon: Truck,
      color: 'text-amber-600', bg: 'bg-amber-50', accent: 'bg-amber-500', border: 'border-amber-200',
      label: 'Purchases',
      desc:  'POs, spend by supplier, status distribution',
      sheets: ['📊 Summary', '📋 Purchase Orders', '🏢 By Supplier', '📈 Charts'],
      count: (poData as { meta?: PaginationMeta })?.meta?.total ?? '—',
      unit:  'POs',
      onExport: handlePurchasesExport,
    },
  ];

  return (
    <>
      <Header title={t('reports.title')} />
      <div className="p-4 space-y-4 md:p-6 md:space-y-6">

        {/* Analytics tabs */}
        <AnalyticsSection />

        {/* Full ERP hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 text-white shadow-xl">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-24 h-28 w-28 rounded-full bg-white/5" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <FileSpreadsheet size={28} />
                <h1 className="text-2xl font-bold">Full ERP Report</h1>
              </div>
              <p className="max-w-lg text-indigo-200">
                Export everything — Inventory, Sales and Purchases — into one comprehensive
                Excel workbook with multiple sheets and embedded charts.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['🏠 Overview', '📦 Products', '🛒 Sales', '📋 Purchases', '📈 Charts'].map((s) => (
                  <span key={s} className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <Button
                onClick={handleFullExport}
                loading={states.full.status === 'loading'}
                className="bg-white !text-indigo-700 hover:bg-indigo-50 font-semibold shadow-lg"
                size="sm"
              >
                <Download size={14} /> Export All Modules
              </Button>
              <StatusBadge status={states.full.status} message={states.full.message} />
            </div>
          </div>
        </div>

        {/* Per-module cards */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-slate-800">Export by Module</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const s = states[mod.key];
              return (
                <Card key={mod.key} className={`border ${mod.border} overflow-hidden`}>
                  <div className={`h-1.5 w-full ${mod.accent}`} />
                  <CardContent className="pt-5">
                    <div className="mb-4 flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mod.bg}`}>
                        <Icon size={20} className={mod.color} />
                      </div>
                      <Stat label={mod.unit} value={mod.count} />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">{mod.label}</h3>
                    <p className="mt-1 text-xs text-slate-500">{mod.desc}</p>

                    <details className="mt-3">
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                        <ChevronDown size={12} /> Sheets included
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {mod.sheets.map((sh) => (
                          <span key={sh} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-slate-600">{sh}</span>
                        ))}
                      </div>
                    </details>

                    <div className="mt-4">
                      <Button size="sm" loading={s.status === 'loading'} onClick={mod.onExport} className="w-full">
                        <Download size={13} /> Export Excel
                      </Button>
                    </div>
                    <div className="mt-2 min-h-[20px]">
                      <StatusBadge status={s.status} message={s.message} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CSV Server-side Export */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-slate-800">Export CSV (Server-side)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(['sales', 'purchases', 'inventory', 'customers', 'expenses'] as const).map((type) => (
              <button
                key={type}
                onClick={() => reportsService.downloadCsv(type)}
                className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <Download size={14} />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">CSV files open directly in Excel — UTF-8 with BOM, semicolon separator, all records (no pagination limit)</p>
        </div>

        {/* Import panel */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-slate-800">Import Data</h2>
          <ImportPanel />
        </div>

        {/* Info card */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-4">
              <BarChart3 size={24} className="mt-0.5 shrink-0 text-indigo-500" />
              <div>
                <h3 className="font-semibold text-slate-800">About the Excel Export</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  <li>• Each module exports as a <strong>.xlsx</strong> workbook with 4–5 sheets</li>
                  <li>• The <strong>Summary sheet</strong> shows KPI cards with key metrics at a glance</li>
                  <li>• Data sheets have <strong>AutoFilter</strong> and <strong>frozen headers</strong> for easy navigation</li>
                  <li>• The <strong>Charts sheet</strong> embeds bar, line and donut charts generated from your live data</li>
                  <li>• Numbers use proper Excel number formats — you can add pivot tables or formulas on top</li>
                  <li>• Import accepts the provided template; fill the Products sheet and upload it here</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
