/**
 * ERP Excel Export Engine
 * Generates multi-sheet workbooks with embedded chart images per module.
 * All generation is client-side — no server round-trip needed.
 *
 * ExcelJS is loaded from /exceljs.min.js (public static asset) at runtime
 * so the container's node_modules does not need the package.
 */

// ─── ExcelJS Loader ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcelJSAny = any;

let _excelJSPromise: Promise<ExcelJSAny> | null = null;

function loadExcelJS(): Promise<ExcelJSAny> {
  if (_excelJSPromise) return _excelJSPromise;
  _excelJSPromise = new Promise<ExcelJSAny>((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('Not in browser')); return; }
    // Already loaded (e.g. hot reload)
    if ((window as ExcelJSAny).ExcelJS) { resolve((window as ExcelJSAny).ExcelJS); return; }
    const script = document.createElement('script');
    script.src = '/exceljs.min.js';
    script.onload  = () => resolve((window as ExcelJSAny).ExcelJS);
    script.onerror = () => reject(new Error('Failed to load /exceljs.min.js'));
    document.head.appendChild(script);
  });
  return _excelJSPromise;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportRow {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ChartDataset {
  label: string;
  values: number[];
  color?: string;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

const THEME = {
  primary:   'FF4F46E5',   // indigo-600
  secondary: 'FF818CF8',   // indigo-400
  accent:    'FF10B981',   // emerald-500
  warning:   'FFF59E0B',   // amber-400
  danger:    'FFEF4444',   // red-500
  headerBg:  'FF1E1B4B',   // indigo-950
  headerFg:  'FFFFFFFF',
  stripeBg:  'FFF5F3FF',   // indigo-50
  border:    'FFE5E7EB',
  mutedFg:   'FF6B7280',
  titleFg:   'FF111827',
} as const;

const CHART_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16',
];

// ─── Canvas Chart Helpers ─────────────────────────────────────────────────────

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function drawBarChart(
  labels: string[],
  datasets: ChartDataset[],
  title: string,
  options: { width?: number; height?: number; stacked?: boolean } = {},
): string {
  const W = options.width ?? 700;
  const H = options.height ?? 380;
  const PAD = { top: 56, right: 24, bottom: 72, left: 70 };
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d')!;

  // Background + subtle border
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  // Title
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 34);

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const n = labels.length;
  const ds = datasets;
  const allVals = ds.flatMap((d) => d.values);
  const maxVal = Math.max(...allVals.filter(Boolean), 1);

  // Grid lines (5 intervals)
  for (let i = 0; i <= 5; i++) {
    const y = PAD.top + chartH - (i / 5) * chartH;
    ctx.strokeStyle = i === 0 ? '#9CA3AF' : '#E5E7EB';
    ctx.lineWidth = i === 0 ? 1.5 : 1;
    ctx.setLineDash(i === 0 ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (i > 0) {
      const val = (i / 5) * maxVal;
      const label = val >= 1e6
        ? (val / 1e6).toFixed(1) + 'M'
        : val >= 1e3
          ? (val / 1e3).toFixed(0) + 'k'
          : val.toFixed(0);
      ctx.fillStyle = '#6B7280';
      ctx.font = '11px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(label, PAD.left - 6, y + 4);
    }
  }

  // Bars (grouped)
  const groupW = chartW / n;
  const barW = Math.min((groupW * 0.7) / ds.length, 40);
  const groupGap = (groupW - barW * ds.length) / 2;

  ds.forEach((dataset, di) => {
    const color = dataset.color ?? CHART_COLORS[di % CHART_COLORS.length];
    dataset.values.forEach((val, i) => {
      const x = PAD.left + i * groupW + groupGap + di * barW;
      const bh = Math.max((val / maxVal) * chartH, 2);
      const y = PAD.top + chartH - bh;

      const grad = ctx.createLinearGradient(x, y, x, y + bh);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '88');
      ctx.fillStyle = grad;

      const r = Math.min(4, barW / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, y + bh);
      ctx.lineTo(x, y + bh);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      // Value label
      if (val > 0) {
        const vl = val >= 1e6 ? (val / 1e6).toFixed(1) + 'M'
          : val >= 1e3 ? (val / 1e3).toFixed(0) + 'k'
          : val.toFixed(0);
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 10px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(vl, x + barW / 2, y - 4);
      }
    });
  });

  // X labels
  labels.forEach((lbl, i) => {
    ctx.fillStyle = '#374151';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    const x = PAD.left + i * groupW + groupW / 2;
    const short = lbl.length > 12 ? lbl.slice(0, 11) + '…' : lbl;
    ctx.fillText(short, x, H - PAD.bottom + 18);
  });

  // Legend
  if (ds.length > 1) {
    const lx = PAD.left;
    const ly = H - 18;
    ds.forEach((d, i) => {
      const color = d.color ?? CHART_COLORS[i % CHART_COLORS.length];
      const xx = lx + i * 120;
      ctx.fillStyle = color;
      ctx.fillRect(xx, ly - 8, 12, 8);
      ctx.fillStyle = '#374151';
      ctx.font = '11px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(d.label, xx + 16, ly);
    });
  }

  return c.toDataURL('image/png').split(',')[1];
}

function drawLineChart(
  labels: string[],
  datasets: ChartDataset[],
  title: string,
  options: { width?: number; height?: number } = {},
): string {
  const W = options.width ?? 700;
  const H = options.height ?? 360;
  const PAD = { top: 56, right: 24, bottom: 72, left: 70 };
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 34);

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const n = labels.length;
  const allVals = datasets.flatMap((d) => d.values);
  const maxVal = Math.max(...allVals.filter(Boolean), 1);
  const minVal = 0;

  // Grid
  for (let i = 0; i <= 5; i++) {
    const y = PAD.top + chartH - (i / 5) * chartH;
    ctx.strokeStyle = i === 0 ? '#9CA3AF' : '#E5E7EB';
    ctx.lineWidth = i === 0 ? 1.5 : 1;
    ctx.setLineDash(i === 0 ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (i > 0) {
      const val = (i / 5) * maxVal;
      const lbl = val >= 1e6 ? (val / 1e6).toFixed(1) + 'M' : val >= 1e3 ? (val / 1e3).toFixed(0) + 'k' : val.toFixed(0);
      ctx.fillStyle = '#6B7280';
      ctx.font = '11px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(lbl, PAD.left - 6, y + 4);
    }
  }

  const xStep = n > 1 ? chartW / (n - 1) : chartW;

  datasets.forEach((dataset, di) => {
    const color = dataset.color ?? CHART_COLORS[di % CHART_COLORS.length];
    const pts = dataset.values.map((v, i) => ({
      x: PAD.left + i * xStep,
      y: PAD.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH,
    }));

    // Area fill
    ctx.beginPath();
    ctx.moveTo(pts[0].x, PAD.top + chartH);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, PAD.top + chartH);
    ctx.closePath();
    ctx.fillStyle = color + '22';
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });

  // X labels
  labels.forEach((lbl, i) => {
    const x = PAD.left + i * xStep;
    const short = lbl.length > 8 ? lbl.slice(0, 7) + '…' : lbl;
    ctx.fillStyle = '#374151';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(short, x, H - PAD.bottom + 18);
  });

  // Legend
  if (datasets.length > 1) {
    const ly = H - 18;
    datasets.forEach((d, i) => {
      const color = d.color ?? CHART_COLORS[i % CHART_COLORS.length];
      const xx = PAD.left + i * 130;
      ctx.fillStyle = color;
      ctx.fillRect(xx, ly - 8, 20, 3);
      ctx.fillStyle = '#374151';
      ctx.font = '11px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(d.label, xx + 26, ly);
    });
  }

  return c.toDataURL('image/png').split(',')[1];
}

function drawDonutChart(
  labels: string[],
  values: number[],
  title: string,
  options: { width?: number; height?: number } = {},
): string {
  const W = options.width ?? 500;
  const H = options.height ?? 380;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 34);

  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return c.toDataURL('image/png').split(',')[1];

  const cx = W * 0.38;
  const cy = H / 2 + 10;
  const outerR = Math.min(W, H) * 0.28;
  const innerR = outerR * 0.55;

  let angle = -Math.PI / 2;
  values.forEach((val, i) => {
    const slice = (val / total) * 2 * Math.PI;
    const color = CHART_COLORS[i % CHART_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    angle += slice;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Center label
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Total', cx, cy - 6);
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText(total >= 1e6 ? (total / 1e6).toFixed(1) + 'M' : total >= 1e3 ? (total / 1e3).toFixed(0) + 'k' : String(total), cx, cy + 14);

  // Legend
  const lx = W * 0.68;
  let ly = H / 2 - (labels.length * 20) / 2 + 10;
  labels.forEach((lbl, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx + 6, ly - 4, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#374151';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'left';
    const short = lbl.length > 18 ? lbl.slice(0, 17) + '…' : lbl;
    ctx.fillText(`${short} (${pct}%)`, lx + 16, ly);
    ly += 22;
  });

  return c.toDataURL('image/png').split(',')[1];
}

// ─── ExcelJS Workbook Helpers ─────────────────────────────────────────────────

type ExcelJSWorkbook = import('exceljs').Workbook;
type ExcelJSWorksheet = import('exceljs').Worksheet;
type ExcelJSStyle = Partial<import('exceljs').Style>;

function styleHeader(ws: ExcelJSWorksheet, rowNum: number) {
  const row = ws.getRow(rowNum);
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font   = { bold: true, color: { argb: THEME.headerFg }, size: 11 };
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
    cell.border = {
      bottom: { style: 'thin', color: { argb: THEME.border } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  row.height = 26;
}

function styleData(ws: ExcelJSWorksheet, rowNum: number, stripe: boolean) {
  const row = ws.getRow(rowNum);
  row.eachCell({ includeEmpty: true }, (cell) => {
    if (stripe) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.stripeBg } };
    }
    cell.border = {
      bottom: { style: 'hair', color: { argb: THEME.border } },
    };
    cell.alignment = { vertical: 'middle' };
  });
  row.height = 20;
}

function addSheetTitle(ws: ExcelJSWorksheet, text: string, colspan: number) {
  ws.spliceRows(1, 0, []);
  ws.spliceRows(1, 0, []);
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = text;
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: THEME.primary } };
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
  ws.mergeCells(1, 1, 1, colspan);
  titleRow.height = 32;

  const subRow = ws.getRow(2);
  subRow.getCell(1).value = `Generated: ${new Date().toLocaleString()}`;
  subRow.getCell(1).font = { italic: true, size: 9, color: { argb: THEME.mutedFg } };
  ws.mergeCells(2, 1, 2, colspan);
  subRow.height = 16;
}

function addKpiSheet(
  wb: ExcelJSWorkbook,
  kpis: { label: string; value: string | number; unit?: string; color?: string }[],
  sheetName = '📊 Summary',
  moduleTitle = 'Summary',
): ExcelJSWorksheet {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: THEME.primary } },
  });

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 32;
  ws.getColumn(3).width = 24;
  ws.getColumn(4).width = 16;

  // Title block
  ws.getRow(1).height = 14;
  ws.getRow(2).getCell(2).value = moduleTitle;
  ws.getRow(2).getCell(2).font = { bold: true, size: 20, color: { argb: THEME.primary } };
  ws.getRow(2).height = 34;
  ws.getRow(3).getCell(2).value = `Exported: ${new Date().toLocaleString()}`;
  ws.getRow(3).getCell(2).font = { italic: true, size: 10, color: { argb: THEME.mutedFg } };
  ws.getRow(3).height = 18;
  ws.getRow(4).height = 14;

  kpis.forEach((kpi, i) => {
    const rn = 5 + i * 4;
    const color = kpi.color ?? THEME.primary;
    ws.getRow(rn).height = 14;
    const r1 = ws.getRow(rn + 1);
    r1.getCell(2).value = kpi.label;
    r1.getCell(2).font = { bold: false, size: 10, color: { argb: THEME.mutedFg } };
    r1.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    r1.height = 18;

    const r2 = ws.getRow(rn + 2);
    const valStr = kpi.unit
      ? `${kpi.value} ${kpi.unit}`
      : typeof kpi.value === 'number'
        ? kpi.value.toLocaleString()
        : String(kpi.value);
    r2.getCell(2).value = valStr;
    r2.getCell(2).font = { bold: true, size: 22, color: { argb: color } };
    r2.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    r2.height = 32;
    ws.getRow(rn + 3).height = 14;
  });

  return ws;
}

function addTableSheet<T extends ExportRow>(
  wb: ExcelJSWorkbook,
  sheetName: string,
  columns: { key: keyof T & string; header: string; width?: number; numFmt?: string }[],
  rows: T[],
): ExcelJSWorksheet {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: false, state: 'frozen', ySplit: 3 }],
  });

  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width ?? 18;
    if (col.numFmt) ws.getColumn(i + 1).numFmt = col.numFmt;
  });

  addSheetTitle(ws, sheetName.replace(/^[^\w]+/, ''), columns.length);

  const hRow = ws.addRow(columns.map((c) => c.header));
  styleHeader(ws, hRow.number);

  rows.forEach((row, ri) => {
    const r = ws.addRow(columns.map((c) => row[c.key] ?? ''));
    styleData(ws, r.number, ri % 2 === 1);
  });

  // AutoFilter
  if (rows.length > 0) {
    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to:   { row: 3 + rows.length, column: columns.length },
    };
  }

  return ws;
}

function addChartSheet(
  wb: ExcelJSWorkbook,
  sheetName: string,
  charts: { title: string; base64: string; width: number; height: number }[],
): void {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: 'FF6366F1' } },
  });

  ws.getRow(1).getCell(1).value = sheetName.replace(/^[^\w]+/, '');
  ws.getRow(1).getCell(1).font = { bold: true, size: 16, color: { argb: THEME.primary } };
  ws.getRow(1).height = 32;
  ws.getColumn(1).width = 2;

  let currentRow = 3;
  let colStart = 2;

  charts.forEach((chart, i) => {
    const imgId = wb.addImage({ base64: chart.base64, extension: 'png' });
    const colSpan = Math.ceil(chart.width / 70);
    const rowSpan = Math.ceil(chart.height / 20);

    ws.addImage(imgId, {
      tl: { col: colStart - 1, row: currentRow - 1 },
      ext: { width: chart.width, height: chart.height },
    });

    // Move to next position (two per row)
    if (i % 2 === 0) {
      colStart += colSpan + 1;
    } else {
      currentRow += rowSpan + 2;
      colStart = 2;
    }
  });
}

// ─── Downloader ───────────────────────────────────────────────────────────────

async function downloadWorkbook(wb: ExcelJSWorkbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Module Exports ───────────────────────────────────────────────────────────

export async function exportInventoryToExcel(data: {
  products: Array<{
    name: string; sku?: string; salePrice: number; costPrice: number;
    isService: boolean; isActive: boolean; category?: { name: string };
    tax?: { code: string; rate: number }; minStock?: number;
  }>;
  stockLevels: Array<{
    product: { name: string; sku?: string };
    warehouse: { name: string; code: string };
    quantity: number;
  }>;
  movements: Array<{
    createdAt: string; product: { name: string; sku?: string };
    warehouse: { name: string }; type: string; quantity: number;
    unitCost?: number; reference?: string; createdBy?: string;
  }>;
}): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERP System';
  wb.created = new Date();

  // ── KPI Summary ──
  const totalProducts = data.products.length;
  const physicalProducts = data.products.filter((p) => !p.isService).length;
  const totalInventoryValue = data.stockLevels.reduce(
    (sum, s) => sum + s.quantity * (data.products.find((p) => p.name === s.product.name)?.costPrice ?? 0),
    0,
  );
  const lowStockItems = data.stockLevels.filter((s) => {
    const prod = data.products.find((p) => p.name === s.product.name);
    return prod?.minStock && s.quantity < prod.minStock;
  }).length;

  addKpiSheet(wb, [
    { label: 'Total Products',      value: totalProducts,                          color: THEME.primary },
    { label: 'Physical Items',      value: physicalProducts,                        color: THEME.secondary },
    { label: 'Inventory Value',     value: totalInventoryValue.toFixed(2),          color: THEME.accent, unit: 'XAF' },
    { label: 'Low Stock Alerts',    value: lowStockItems,                           color: THEME.danger },
  ], '📊 Summary', 'Inventory Report');

  // ── Products table ──
  addTableSheet(wb, '📦 Products', [
    { key: 'name',     header: 'Product Name',  width: 28 },
    { key: 'sku',      header: 'SKU',           width: 16 },
    { key: 'category', header: 'Category',      width: 18 },
    { key: 'salePrice',header: 'Sale Price',    width: 14, numFmt: '#,##0.00' },
    { key: 'costPrice',header: 'Cost Price',    width: 14, numFmt: '#,##0.00' },
    { key: 'margin',   header: 'Margin %',      width: 12, numFmt: '0.00"%"' },
    { key: 'tax',      header: 'Tax Code',      width: 14 },
    { key: 'type',     header: 'Type',          width: 12 },
    { key: 'status',   header: 'Status',        width: 12 },
    { key: 'minStock', header: 'Min Stock',     width: 12 },
  ], data.products.map((p) => ({
    name:      p.name,
    sku:       p.sku ?? '',
    category:  p.category?.name ?? '—',
    salePrice: p.salePrice,
    costPrice: p.costPrice,
    margin:    p.costPrice > 0 ? (((p.salePrice - p.costPrice) / p.salePrice) * 100).toFixed(2) : '—',
    tax:       p.tax ? `${p.tax.code} (${p.tax.rate}%)` : '—',
    type:      p.isService ? 'Service' : 'Physical',
    status:    p.isActive ? 'Active' : 'Inactive',
    minStock:  p.minStock ?? '',
  })));

  // ── Stock Levels ──
  addTableSheet(wb, '🏭 Stock Levels', [
    { key: 'product',   header: 'Product',   width: 28 },
    { key: 'sku',       header: 'SKU',       width: 16 },
    { key: 'warehouse', header: 'Warehouse', width: 20 },
    { key: 'quantity',  header: 'Qty on Hand', width: 14, numFmt: '#,##0' },
  ], data.stockLevels.map((s) => ({
    product:   s.product.name,
    sku:       s.product.sku ?? '',
    warehouse: s.warehouse.name,
    quantity:  s.quantity,
  })));

  // ── Movements ──
  addTableSheet(wb, '↕️ Movements', [
    { key: 'date',      header: 'Date / Time', width: 20 },
    { key: 'product',   header: 'Product',     width: 26 },
    { key: 'warehouse', header: 'Warehouse',   width: 20 },
    { key: 'type',      header: 'Type',        width: 14 },
    { key: 'quantity',  header: 'Quantity',    width: 12, numFmt: '#,##0' },
    { key: 'unitCost',  header: 'Unit Cost',   width: 14, numFmt: '#,##0.00' },
    { key: 'reference', header: 'Reference',   width: 16 },
    { key: 'by',        header: 'Created By',  width: 16 },
  ], data.movements.map((m) => ({
    date:      new Date(m.createdAt).toLocaleString(),
    product:   m.product.name,
    warehouse: m.warehouse.name,
    type:      m.type,
    quantity:  m.quantity,
    unitCost:  m.unitCost ?? '',
    reference: m.reference ?? '',
    by:        m.createdBy ? m.createdBy.slice(0, 8) : '',
  })));

  // ── Charts ──
  const catCounts: Record<string, number> = {};
  data.products.forEach((p) => {
    const cat = p.category?.name ?? 'Uncategorized';
    catCounts[cat] = (catCounts[cat] ?? 0) + 1;
  });
  const catLabels = Object.keys(catCounts).slice(0, 10);
  const catValues = catLabels.map((k) => catCounts[k]);

  const typeCounts = {
    Physical: data.products.filter((p) => !p.isService).length,
    Service:  data.products.filter((p) => p.isService).length,
  };

  const movTypeCounts: Record<string, number> = {};
  data.movements.forEach((m) => { movTypeCounts[m.type] = (movTypeCounts[m.type] ?? 0) + 1; });

  addChartSheet(wb, '📈 Charts', [
    {
      title: 'Products by Category',
      base64: drawBarChart(catLabels, [{ label: 'Products', values: catValues }], 'Products by Category'),
      width: 680, height: 360,
    },
    {
      title: 'Physical vs Services',
      base64: drawDonutChart(['Physical', 'Service'], [typeCounts.Physical, typeCounts.Service], 'Physical vs Services'),
      width: 480, height: 360,
    },
    {
      title: 'Movements by Type',
      base64: drawBarChart(
        Object.keys(movTypeCounts),
        [{ label: 'Movements', values: Object.values(movTypeCounts), color: '#10B981' }],
        'Stock Movements by Type',
      ),
      width: 680, height: 360,
    },
  ]);

  await downloadWorkbook(wb, `inventory-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportSalesToExcel(data: {
  sales: Array<{
    reference: string; status: string; saleDate: string;
    customer?: { name: string }; subtotal: number; taxAmount: number; total: number;
    paidAmount: number; lines?: Array<{ product?: { name: string }; quantity: number; unitPrice: number; total: number }>;
  }>;
}): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERP System';
  wb.created = new Date();

  const totalRevenue = data.sales.reduce((s, o) => s + Number(o.total), 0);
  const totalTax     = data.sales.reduce((s, o) => s + Number(o.taxAmount), 0);
  const avgOrder     = data.sales.length > 0 ? totalRevenue / data.sales.length : 0;
  const confirmed    = data.sales.filter((s) => s.status === 'CONFIRMED').length;

  addKpiSheet(wb, [
    { label: 'Total Orders',    value: data.sales.length,       color: THEME.primary },
    { label: 'Confirmed',       value: confirmed,               color: THEME.accent },
    { label: 'Total Revenue',   value: totalRevenue.toFixed(2), color: THEME.accent,   unit: 'XAF' },
    { label: 'Tax Collected',   value: totalTax.toFixed(2),     color: THEME.warning,  unit: 'XAF' },
    { label: 'Average Order',   value: avgOrder.toFixed(2),     color: THEME.secondary, unit: 'XAF' },
  ], '📊 Summary', 'Sales Report');

  addTableSheet(wb, '🛒 Sales Orders', [
    { key: 'reference', header: 'Reference',   width: 18 },
    { key: 'date',      header: 'Date',        width: 20 },
    { key: 'customer',  header: 'Customer',    width: 24 },
    { key: 'status',    header: 'Status',      width: 14 },
    { key: 'subtotal',  header: 'Subtotal',    width: 16, numFmt: '#,##0.00' },
    { key: 'taxAmount', header: 'Tax',         width: 14, numFmt: '#,##0.00' },
    { key: 'total',     header: 'Total',       width: 16, numFmt: '#,##0.00' },
    { key: 'paid',      header: 'Paid',        width: 14, numFmt: '#,##0.00' },
    { key: 'balance',   header: 'Balance',     width: 14, numFmt: '#,##0.00' },
  ], data.sales.map((s) => ({
    reference: s.reference,
    date:      new Date(s.saleDate).toLocaleDateString(),
    customer:  s.customer?.name ?? 'Walk-in',
    status:    s.status,
    subtotal:  Number(s.subtotal),
    taxAmount: Number(s.taxAmount),
    total:     Number(s.total),
    paid:      Number(s.paidAmount),
    balance:   Number(s.total) - Number(s.paidAmount),
  })));

  // Monthly aggregation
  const byMonth: Record<string, { revenue: number; count: number }> = {};
  data.sales.forEach((s) => {
    const key = new Date(s.saleDate).toLocaleDateString('en', { year: 'numeric', month: 'short' });
    if (!byMonth[key]) byMonth[key] = { revenue: 0, count: 0 };
    byMonth[key].revenue += Number(s.total);
    byMonth[key].count   += 1;
  });

  addTableSheet(wb, '📅 Monthly Trend', [
    { key: 'month',   header: 'Month',   width: 16 },
    { key: 'orders',  header: 'Orders',  width: 12, numFmt: '#,##0' },
    { key: 'revenue', header: 'Revenue', width: 18, numFmt: '#,##0.00' },
  ], Object.entries(byMonth).map(([month, v]) => ({ month, orders: v.count, revenue: v.revenue })));

  // Status distribution
  const statusCounts: Record<string, number> = {};
  data.sales.forEach((s) => { statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1; });

  const months = Object.keys(byMonth).slice(-12);
  const revenueByMonth = months.map((m) => byMonth[m]?.revenue ?? 0);

  addChartSheet(wb, '📈 Charts', [
    {
      title: 'Revenue by Month',
      base64: drawLineChart(months, [{ label: 'Revenue', values: revenueByMonth, color: '#4F46E5' }], 'Revenue Trend'),
      width: 700, height: 360,
    },
    {
      title: 'Orders by Status',
      base64: drawDonutChart(Object.keys(statusCounts), Object.values(statusCounts), 'Orders by Status'),
      width: 480, height: 360,
    },
    {
      title: 'Monthly Orders',
      base64: drawBarChart(
        months, [{ label: 'Orders', values: months.map((m) => byMonth[m]?.count ?? 0), color: '#10B981' }],
        'Monthly Order Count',
      ),
      width: 700, height: 360,
    },
  ]);

  await downloadWorkbook(wb, `sales-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportPurchasesToExcel(data: {
  orders: Array<{
    reference: string; status: string; orderDate: string; expectedDate?: string;
    supplier?: { name: string }; subtotal: number; taxAmount: number; total: number;
    lines?: Array<{ product?: { name: string }; quantity: number; unitCost: number; total: number }>;
  }>;
}): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERP System';
  wb.created = new Date();

  const totalSpend   = data.orders.reduce((s, o) => s + Number(o.total), 0);
  const pendingOrders = data.orders.filter((o) => o.status === 'DRAFT' || o.status === 'ORDERED').length;
  const received     = data.orders.filter((o) => o.status === 'RECEIVED').length;

  addKpiSheet(wb, [
    { label: 'Total Orders',   value: data.orders.length,    color: THEME.primary },
    { label: 'Pending',        value: pendingOrders,          color: THEME.warning },
    { label: 'Received',       value: received,               color: THEME.accent },
    { label: 'Total Spend',    value: totalSpend.toFixed(2), color: THEME.danger, unit: 'XAF' },
  ], '📊 Summary', 'Purchases Report');

  addTableSheet(wb, '📋 Purchase Orders', [
    { key: 'reference',    header: 'Reference',    width: 18 },
    { key: 'supplier',     header: 'Supplier',     width: 24 },
    { key: 'orderDate',    header: 'Order Date',   width: 16 },
    { key: 'expectedDate', header: 'Expected',     width: 16 },
    { key: 'status',       header: 'Status',       width: 14 },
    { key: 'subtotal',     header: 'Subtotal',     width: 16, numFmt: '#,##0.00' },
    { key: 'tax',          header: 'Tax',          width: 14, numFmt: '#,##0.00' },
    { key: 'total',        header: 'Total',        width: 16, numFmt: '#,##0.00' },
  ], data.orders.map((o) => ({
    reference:    o.reference,
    supplier:     o.supplier?.name ?? '—',
    orderDate:    new Date(o.orderDate).toLocaleDateString(),
    expectedDate: o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : '—',
    status:       o.status,
    subtotal:     Number(o.subtotal),
    tax:          Number(o.taxAmount),
    total:        Number(o.total),
  })));

  // By supplier
  const bySupplier: Record<string, { orders: number; total: number }> = {};
  data.orders.forEach((o) => {
    const key = o.supplier?.name ?? 'Unknown';
    if (!bySupplier[key]) bySupplier[key] = { orders: 0, total: 0 };
    bySupplier[key].orders += 1;
    bySupplier[key].total  += Number(o.total);
  });

  addTableSheet(wb, '🏢 By Supplier', [
    { key: 'supplier', header: 'Supplier',     width: 28 },
    { key: 'orders',   header: '# Orders',     width: 12, numFmt: '#,##0' },
    { key: 'total',    header: 'Total Spend',  width: 18, numFmt: '#,##0.00' },
  ], Object.entries(bySupplier).map(([supplier, v]) => ({ supplier, orders: v.orders, total: v.total })));

  const supplierLabels = Object.keys(bySupplier).slice(0, 10);
  const statusCounts: Record<string, number> = {};
  data.orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1; });

  addChartSheet(wb, '📈 Charts', [
    {
      title: 'Spend by Supplier',
      base64: drawBarChart(
        supplierLabels,
        [{ label: 'Total Spend', values: supplierLabels.map((k) => bySupplier[k].total) }],
        'Spend by Supplier',
      ),
      width: 700, height: 360,
    },
    {
      title: 'Orders by Status',
      base64: drawDonutChart(Object.keys(statusCounts), Object.values(statusCounts), 'PO Status Distribution'),
      width: 480, height: 360,
    },
  ]);

  await downloadWorkbook(wb, `purchases-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportFullERP(data: {
  inventory: Parameters<typeof exportInventoryToExcel>[0];
  sales:     Parameters<typeof exportSalesToExcel>[0];
  purchases: Parameters<typeof exportPurchasesToExcel>[0];
}): Promise<void> {
  // For full ERP export, we merge everything into one workbook
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERP System';
  wb.created = new Date();

  // Cover sheet
  const cover = wb.addWorksheet('🏠 Overview', { views: [{ showGridLines: false }] });
  cover.getColumn(1).width = 2;
  cover.getColumn(2).width = 40;
  cover.getColumn(3).width = 24;

  cover.getRow(2).getCell(2).value = 'ERP System — Full Export';
  cover.getRow(2).getCell(2).font = { bold: true, size: 24, color: { argb: THEME.primary } };
  cover.getRow(2).height = 40;
  cover.getRow(3).getCell(2).value = `Generated: ${new Date().toLocaleString()}`;
  cover.getRow(3).getCell(2).font = { italic: true, size: 11, color: { argb: THEME.mutedFg } };
  cover.getRow(3).height = 22;
  cover.getRow(4).height = 14;

  const sections = [
    { label: '📦 Inventory',  count: data.inventory.products.length,  unit: 'products' },
    { label: '🛒 Sales',       count: data.sales.sales.length,          unit: 'orders' },
    { label: '📋 Purchases',   count: data.purchases.orders.length,     unit: 'POs' },
  ];
  sections.forEach((s, i) => {
    const r = cover.getRow(6 + i * 3);
    r.getCell(2).value = s.label;
    r.getCell(2).font = { bold: true, size: 13, color: { argb: THEME.primary } };
    r.getCell(3).value = `${s.count} ${s.unit}`;
    r.getCell(3).font = { size: 12, color: { argb: THEME.mutedFg } };
    r.height = 24;
  });

  // Inventory sheets
  addTableSheet(wb, '📦 Products', [
    { key: 'name',     header: 'Product Name', width: 28 },
    { key: 'sku',      header: 'SKU',          width: 16 },
    { key: 'category', header: 'Category',     width: 18 },
    { key: 'salePrice',header: 'Sale Price',   width: 14, numFmt: '#,##0.00' },
    { key: 'type',     header: 'Type',         width: 12 },
    { key: 'status',   header: 'Status',       width: 12 },
  ], data.inventory.products.map((p) => ({
    name: p.name, sku: p.sku ?? '', category: p.category?.name ?? '—',
    salePrice: p.salePrice, type: p.isService ? 'Service' : 'Physical',
    status: p.isActive ? 'Active' : 'Inactive',
  })));

  addTableSheet(wb, '🛒 Sales', [
    { key: 'reference', header: 'Reference', width: 18 },
    { key: 'date',      header: 'Date',      width: 16 },
    { key: 'customer',  header: 'Customer',  width: 22 },
    { key: 'total',     header: 'Total',     width: 16, numFmt: '#,##0.00' },
    { key: 'status',    header: 'Status',    width: 14 },
  ], data.sales.sales.map((s) => ({
    reference: s.reference, date: new Date(s.saleDate).toLocaleDateString(),
    customer: s.customer?.name ?? 'Walk-in', total: Number(s.total), status: s.status,
  })));

  addTableSheet(wb, '📋 Purchases', [
    { key: 'reference', header: 'Reference', width: 18 },
    { key: 'date',      header: 'Date',      width: 16 },
    { key: 'supplier',  header: 'Supplier',  width: 22 },
    { key: 'total',     header: 'Total',     width: 16, numFmt: '#,##0.00' },
    { key: 'status',    header: 'Status',    width: 14 },
  ], data.purchases.orders.map((o) => ({
    reference: o.reference, date: new Date(o.orderDate).toLocaleDateString(),
    supplier: o.supplier?.name ?? '—', total: Number(o.total), status: o.status,
  })));

  // Combined charts
  const salesRevenue = data.sales.sales.reduce((s, o) => s + Number(o.total), 0);
  const purchasesSpend = data.purchases.orders.reduce((s, o) => s + Number(o.total), 0);

  addChartSheet(wb, '📈 Overview Charts', [
    {
      title: 'Revenue vs Spend',
      base64: drawBarChart(
        ['Sales Revenue', 'Purchase Spend'],
        [{ label: 'Amount (XAF)', values: [salesRevenue, purchasesSpend], color: '#4F46E5' }],
        'Revenue vs Purchase Spend',
      ),
      width: 600, height: 360,
    },
    {
      title: 'Inventory Value',
      base64: drawDonutChart(
        ['Physical', 'Service'],
        [data.inventory.products.filter((p) => !p.isService).length,
         data.inventory.products.filter((p) => p.isService).length],
        'Product Mix',
      ),
      width: 480, height: 360,
    },
  ]);

  await downloadWorkbook(wb, `erp-full-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Import Template Generator ────────────────────────────────────────────────

export async function downloadImportTemplate(module: 'products'): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERP System';

  const ws = wb.addWorksheet('Products', { views: [{ showGridLines: false }] });
  ws.getRow(1).getCell(1).value = 'PRODUCT IMPORT TEMPLATE — Do not modify column headers';
  ws.getRow(1).getCell(1).font = { bold: true, color: { argb: THEME.danger } };
  ws.getRow(1).height = 20;
  ws.mergeCells(1, 1, 1, 8);

  const columns = [
    { header: 'name *',       key: 'name',       width: 28 },
    { header: 'sku *',        key: 'sku',        width: 16 },
    { header: 'salePrice *',  key: 'salePrice',  width: 14 },
    { header: 'costPrice *',  key: 'costPrice',  width: 14 },
    { header: 'description',  key: 'description',width: 30 },
    { header: 'isService',    key: 'isService',  width: 14 },
    { header: 'minStock',     key: 'minStock',   width: 12 },
    { header: 'taxCode',      key: 'taxCode',    width: 14 },
  ];

  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
    const cell = ws.getRow(2).getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: THEME.headerFg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  ws.getRow(2).height = 24;

  // Sample rows
  const samples = [
    ['Widget A', 'WGT-001', 9999, 6500, 'Blue plastic widget', 'false', 10, 'VAT_19'],
    ['Service B', 'SVC-001', 25000, 0, 'Consulting service', 'true', '', 'EXEMPT'],
    ['Product C', 'PRD-003', 5500, 3200, 'Standard product', 'false', 5, ''],
  ];
  samples.forEach((row, i) => {
    const r = ws.addRow(row);
    r.eachCell((cell: ExcelJSAny) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : THEME.stripeBg } };
      cell.border = { bottom: { style: 'hair', color: { argb: THEME.border } } };
    });
    r.height = 20;
  });

  // Notes sheet
  const notes = wb.addWorksheet('Instructions', { views: [{ showGridLines: false }] });
  notes.getColumn(1).width = 3;
  notes.getColumn(2).width = 60;
  const noteLines = [
    ['', ''],
    ['', 'IMPORT INSTRUCTIONS'],
    ['', ''],
    ['', '1. Fill in the "Products" sheet — do not rename or reorder columns.'],
    ['', '2. name, sku, salePrice, costPrice are required (*).'],
    ['', '3. isService: use "true" for services (no stock tracking), "false" for physical products.'],
    ['', '4. taxCode: enter the exact tax code (e.g. VAT_19, EXEMPT, VAT_0). Leave blank for no tax.'],
    ['', '5. minStock: minimum stock level for low-stock alerts (physical products only).'],
    ['', '6. Delete the sample rows before importing.'],
    ['', '7. Upload this file via Settings → Import → Products.'],
  ];
  noteLines.forEach((line, i) => {
    const r = notes.addRow(line);
    if (i === 1) {
      r.getCell(2).font = { bold: true, size: 14, color: { argb: THEME.primary } };
      r.height = 28;
    } else if (i > 2) {
      r.getCell(2).font = { size: 11 };
      r.height = 22;
    }
  });

  await downloadWorkbook(wb, `product-import-template.xlsx`);
}
