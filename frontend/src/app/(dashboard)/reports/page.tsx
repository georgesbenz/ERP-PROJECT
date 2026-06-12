'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download, Upload, FileSpreadsheet, Package, ShoppingCart,
  Truck, BarChart3, RefreshCw, CheckCircle, AlertCircle, ChevronDown,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { inventoryService } from '@/services/inventory.service';
import { salesService } from '@/services/sales.service';
import { purchasesService } from '@/services/purchases.service';
import {
  exportInventoryToExcel,
  exportSalesToExcel,
  exportPurchasesToExcel,
  exportFullERP,
  downloadImportTemplate,
} from '@/lib/excel-export';
import type { Product, StockLevel, StockMovement, Sale, Purchase } from '@/types/models';
import type { PaginationMeta } from '@/lib/api';

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
      <p className="text-xs text-gray-500">{label}</p>
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
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
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
            <p className="mb-2 text-sm font-medium text-gray-700">
              Preview — {preview.length} row(s) ready to import
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    {Object.keys(preview[0]).map((h) => (
                      <th key={h} className="border-b border-gray-200 px-3 py-1.5 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="border-b border-gray-100 px-3 py-1.5 text-gray-700">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 5 && (
                <p className="px-3 py-1.5 text-xs text-gray-400">…and {preview.length - 5} more row(s)</p>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
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
      <Header title="Reports & Export / Rapports" />
      <div className="p-6 space-y-6">

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
          <h2 className="mb-4 text-base font-semibold text-gray-900">Export by Module</h2>
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
                    <h3 className="text-base font-semibold text-gray-900">{mod.label}</h3>
                    <p className="mt-1 text-xs text-gray-500">{mod.desc}</p>

                    <details className="mt-3">
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                        <ChevronDown size={12} /> Sheets included
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {mod.sheets.map((sh) => (
                          <span key={sh} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{sh}</span>
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

        {/* Import panel */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-gray-900">Import Data</h2>
          <ImportPanel />
        </div>

        {/* Info card */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-4">
              <BarChart3 size={24} className="mt-0.5 shrink-0 text-indigo-500" />
              <div>
                <h3 className="font-semibold text-gray-900">About the Excel Export</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
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
