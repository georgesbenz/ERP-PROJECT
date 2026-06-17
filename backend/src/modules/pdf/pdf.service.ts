import { Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Layout constants (A4 = 595.28 × 841.89 pt) ─────────────────────────────
const ML = 50;
const MR = 545;
const CW = MR - ML;

type Doc = InstanceType<typeof PDFDocument>;
type CompanyInfo = Awaited<ReturnType<PdfService['getCompany']>>;

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) {}

  // ─── Public generators ────────────────────────────────────────────────────

  async salesInvoice(tenantId: string, saleId: string, res: Response) {
    const [sale, company] = await Promise.all([
      this.prisma.sale.findFirst({
        where: { id: saleId, tenantId, deletedAt: null },
        include: {
          customer: true,
          lines: { include: { product: { select: { name: true, sku: true } } }, orderBy: { sortOrder: 'asc' } },
          creator: { select: { firstName: true, lastName: true } },
        },
      }),
      this.getCompany(tenantId),
    ]);
    if (!sale) throw new NotFoundException('Sale not found');

    const doc = this.createDoc(res, `FACTURE-${sale.reference}.pdf`);
    this.drawHeader(doc, company, 'FACTURE / INVOICE', sale.reference, sale.saleDate);

    if (sale.customer) {
      this.drawBillTo(doc, sale.customer.name, sale.customer.address ?? '', sale.customer.email ?? '', sale.customer.phone ?? '');
    }

    const lineRows = sale.lines.map((l) => [
      l.product.sku,
      l.product.name + (l.description ? `\n${l.description}` : ''),
      this.fmt(l.quantity),
      this.curr(l.unitPrice),
      `${Number(l.discount)}%`,
      `${Number(l.taxRate)}%`,
      this.curr(l.total),
    ]);
    this.drawLinesTable(doc, ['SKU', 'Désignation', 'Qté', 'P.U.', 'Rem.', 'TVA', 'Total'], lineRows);

    this.drawTotals(doc, [
      ['Sous-total / Subtotal', this.curr(sale.subtotal)],
      ['Remises / Discounts', `- ${this.curr(sale.discountAmount)}`],
      ['TVA / Tax', this.curr(sale.taxAmount)],
      ['Montant payé / Paid', this.curr(sale.paidAmount)],
    ], this.curr(sale.total), Number(sale.paidAmount) >= Number(sale.total) ? 'PAYÉ' : 'DÛ');

    if (sale.notes) this.drawNotes(doc, sale.notes);
    this.drawFooter(doc, company);
    doc.end();
  }

  async purchaseOrder(tenantId: string, purchaseId: string, res: Response) {
    const [purchase, company] = await Promise.all([
      this.prisma.purchase.findFirst({
        where: { id: purchaseId, tenantId, deletedAt: null },
        include: {
          supplier: true,
          lines: { include: { product: { select: { name: true, sku: true } } }, orderBy: { sortOrder: 'asc' } },
          creator: { select: { firstName: true, lastName: true } },
        },
      }),
      this.getCompany(tenantId),
    ]);
    if (!purchase) throw new NotFoundException('Purchase not found');

    const doc = this.createDoc(res, `BON-COMMANDE-${purchase.reference}.pdf`);
    this.drawHeader(doc, company, 'BON DE COMMANDE / PURCHASE ORDER', purchase.reference, purchase.orderDate);

    if (purchase.supplier) {
      this.drawBillTo(doc, purchase.supplier.name, purchase.supplier.address ?? '', purchase.supplier.email ?? '', purchase.supplier.phone ?? '', 'Fournisseur / Supplier');
    }

    const lineRows = purchase.lines.map((l) => [
      l.product.sku,
      l.product.name + (l.description ? `\n${l.description}` : ''),
      this.fmt(l.quantity),
      this.curr(l.unitCost),
      `${Number(l.discount)}%`,
      `${Number(l.taxRate)}%`,
      this.curr(l.total),
    ]);
    this.drawLinesTable(doc, ['SKU', 'Désignation', 'Qté', 'P.U.', 'Rem.', 'TVA', 'Total'], lineRows);

    this.drawTotals(doc, [
      ['Sous-total / Subtotal', this.curr(purchase.subtotal)],
      ['Remises / Discounts', `- ${this.curr(purchase.discountAmount)}`],
      ['TVA / Tax', this.curr(purchase.taxAmount)],
    ], this.curr(purchase.total));

    if (purchase.notes) this.drawNotes(doc, purchase.notes);
    this.drawFooter(doc, company);
    doc.end();
  }

  async posReceipt(tenantId: string, saleId: string, res: Response) {
    const [sale, company] = await Promise.all([
      this.prisma.sale.findFirst({
        where: { id: saleId, tenantId, deletedAt: null },
        include: {
          customer: { select: { name: true } },
          lines: { include: { product: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } },
        },
      }),
      this.getCompany(tenantId),
    ]);
    if (!sale) throw new NotFoundException('Sale not found');

    const W = 226;
    const LM = 10;
    const doc = new PDFDocument({ size: [W, 600], margin: LM, autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="RECU-${sale.reference}.pdf"`);
    doc.pipe(res);

    doc.fontSize(9).font('Helvetica-Bold').text(company.name, LM, 12, { width: W - 20, align: 'center' });
    if (company.address) doc.fontSize(7).font('Helvetica').text(company.address, LM, doc.y, { width: W - 20, align: 'center' });
    if (company.phone)   doc.fontSize(7).text(company.phone, LM, doc.y, { width: W - 20, align: 'center' });
    if (company.niu)     doc.fontSize(7).text(`NIU: ${company.niu}`, LM, doc.y, { width: W - 20, align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica-Bold').text('─── REÇU / RECEIPT ───', LM, doc.y, { width: W - 20, align: 'center' });
    doc.fontSize(7).font('Helvetica').text(`Réf: ${sale.reference}`, LM, doc.y);
    doc.text(`Date: ${new Date(sale.saleDate).toLocaleDateString('fr-FR')}`, LM, doc.y);
    if (sale.customer) doc.text(`Client: ${sale.customer.name}`, LM, doc.y);

    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(7).text('Article', LM, doc.y);
    doc.font('Helvetica').fontSize(7);

    for (const line of sale.lines) {
      const nameY = doc.y;
      doc.text(line.product.name, LM, nameY, { width: W - 80 });
      doc.text(`${this.fmt(line.quantity)} × ${this.curr(line.unitPrice)}`, W - 80, nameY, { width: 70, align: 'right' });
      doc.text(this.curr(line.total), LM, doc.y, { width: W - 20, align: 'right' });
    }

    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(8).text(`TOTAL: ${this.curr(sale.total)}`, LM, doc.y, { width: W - 20, align: 'right' });
    if (Number(sale.taxAmount) > 0) {
      doc.font('Helvetica').fontSize(7).text(`(dont TVA: ${this.curr(sale.taxAmount)})`, LM, doc.y, { width: W - 20, align: 'right' });
    }
    doc.moveDown(0.5);
    doc.fontSize(7).font('Helvetica').text('Merci pour votre achat! / Thank you!', LM, doc.y, { width: W - 20, align: 'center' });
    doc.end();
  }

  // ─── PDF building blocks ──────────────────────────────────────────────────

  private createDoc(res: Response, filename: string): Doc {
    const doc = new PDFDocument({ size: 'A4', margin: ML, autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);
    return doc;
  }

  private drawHeader(doc: Doc, company: CompanyInfo, title: string, ref: string, date: Date) {
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e3a5f').text(company.tradingName || company.name, ML, 50);
    doc.fontSize(8).font('Helvetica').fillColor('#475569');
    const info = [company.address, company.city, company.phone, company.email, company.niu ? `NIU: ${company.niu}` : null, company.rccm ? `RCCM: ${company.rccm}` : null].filter(Boolean);
    info.forEach((line) => { doc.text(line as string); });

    const rightX = 360;
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e3a5f').text(title, rightX, 50, { width: MR - rightX, align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    doc.text(`N° ${ref}`, rightX, doc.y, { width: MR - rightX, align: 'right' });
    doc.text(`Date: ${new Date(date).toLocaleDateString('fr-FR')}`, rightX, doc.y, { width: MR - rightX, align: 'right' });

    doc.moveTo(ML, 165).lineTo(MR, 165).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.y = 180;
    doc.fillColor('#0f172a');
  }

  private drawBillTo(doc: Doc, name: string, address: string, email: string, phone: string, label = 'Facturé à / Bill to') {
    const y = doc.y;
    doc.rect(ML, y, CW, 70).fillColor('#f8fafc').fill();
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b').text(label.toUpperCase(), ML + 10, y + 8);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(name, ML + 10, y + 20);
    doc.fontSize(8).font('Helvetica').fillColor('#475569');
    if (address) doc.text(address, ML + 10, doc.y);
    if (email)   doc.text(email, ML + 10, doc.y);
    if (phone)   doc.text(phone, ML + 10, doc.y);
    doc.y = y + 80;
    doc.fillColor('#0f172a');
  }

  private drawLinesTable(doc: Doc, headers: string[], rows: string[][]) {
    const colWidths = [50, 170, 40, 70, 40, 40, 75];
    const rowH = 20;
    const startY = doc.y + 10;

    doc.rect(ML, startY, CW, rowH).fillColor('#1e3a5f').fill();
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    let x = ML + 4;
    headers.forEach((h, i) => {
      doc.text(h, x, startY + 6, { width: colWidths[i] - 4, align: i >= 2 ? 'right' : 'left' });
      x += colWidths[i];
    });

    doc.font('Helvetica').fontSize(8);
    rows.forEach((row, ri) => {
      const rowY = startY + rowH + ri * rowH;
      if (ri % 2 === 0) doc.rect(ML, rowY, CW, rowH).fillColor('#f8fafc').fill();
      doc.fillColor('#0f172a');
      x = ML + 4;
      row.forEach((cell, ci) => {
        doc.text(cell, x, rowY + 6, { width: colWidths[ci] - 4, align: ci >= 2 ? 'right' : 'left' });
        x += colWidths[ci];
      });
    });

    doc.y = startY + rowH + rows.length * rowH + 10;
    doc.fillColor('#0f172a');
  }

  private drawTotals(doc: Doc, subtotals: [string, string][], grandTotal: string, badge?: string) {
    const totalBoxW = 220;
    const totalBoxX = MR - totalBoxW;
    let y = doc.y + 5;

    subtotals.forEach(([label, value]) => {
      doc.fontSize(8).font('Helvetica').fillColor('#475569').text(label, totalBoxX, y, { width: totalBoxW - 70 });
      doc.fillColor('#0f172a').text(value, totalBoxX + totalBoxW - 70, y, { width: 66, align: 'right' });
      y += 16;
    });

    doc.rect(totalBoxX, y, totalBoxW, 24).fillColor('#1e3a5f').fill();
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('TOTAL', totalBoxX + 6, y + 7, { width: totalBoxW - 70 });
    doc.text(grandTotal, totalBoxX + totalBoxW - 70, y + 7, { width: 66, align: 'right' });

    if (badge) {
      const badgeColor = badge === 'PAYÉ' ? '#16a34a' : '#dc2626';
      doc.roundedRect(ML, y, 60, 24, 4).fillColor(badgeColor).fill();
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff').text(badge, ML + 4, y + 7, { width: 52, align: 'center' });
    }

    doc.y = y + 34;
    doc.fillColor('#0f172a');
  }

  private drawNotes(doc: Doc, notes: string) {
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text('Notes / Remarques');
    doc.fontSize(8).font('Helvetica').fillColor('#0f172a').text(notes, { width: CW });
  }

  private drawFooter(doc: Doc, company: CompanyInfo) {
    const footerY = 780;
    doc.moveTo(ML, footerY).lineTo(MR, footerY).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    const parts = [company.name, company.rccm ? `RCCM: ${company.rccm}` : null, company.niu ? `NIU: ${company.niu}` : null, company.email, company.phone].filter(Boolean).join('  ·  ');
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8').text(parts, ML, footerY + 6, { width: CW, align: 'center' });
  }

  // ─── CSV Export ───────────────────────────────────────────────────────────

  async exportCsv(tenantId: string, type: string, startDate: string | undefined, endDate: string | undefined, res: Response) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 86_400_000);
    const end   = endDate   ? new Date(endDate)   : new Date();

    let filename: string;
    let rows: string[][];
    let headers: string[];

    switch (type) {
      case 'sales': {
        const data = await this.prisma.sale.findMany({
          where: { tenantId, deletedAt: null, saleDate: { gte: start, lte: end } },
          include: { customer: { select: { name: true } } },
          orderBy: { saleDate: 'desc' },
        });
        headers = ['Référence', 'Date', 'Client', 'Statut', 'Sous-total', 'TVA', 'Remise', 'Total', 'Payé'];
        rows = data.map((s) => [s.reference, this.csvDate(s.saleDate), s.customer?.name ?? '', s.status, this.csvNum(s.subtotal), this.csvNum(s.taxAmount), this.csvNum(s.discountAmount), this.csvNum(s.total), this.csvNum(s.paidAmount)]);
        filename = `ventes-${this.fileDate()}.csv`;
        break;
      }
      case 'purchases': {
        const data = await this.prisma.purchase.findMany({
          where: { tenantId, deletedAt: null, orderDate: { gte: start, lte: end } },
          include: { supplier: { select: { name: true } } },
          orderBy: { orderDate: 'desc' },
        });
        headers = ['Référence', 'Date', 'Fournisseur', 'Statut', 'Sous-total', 'TVA', 'Remise', 'Total', 'Payé'];
        rows = data.map((p) => [p.reference, this.csvDate(p.orderDate), p.supplier?.name ?? '', p.status, this.csvNum(p.subtotal), this.csvNum(p.taxAmount), this.csvNum(p.discountAmount), this.csvNum(p.total), this.csvNum(p.paidAmount)]);
        filename = `achats-${this.fileDate()}.csv`;
        break;
      }
      case 'inventory': {
        const data = await this.prisma.inventory.findMany({
          where: { tenantId },
          include: {
            product: { select: { name: true, sku: true, costPrice: true, salePrice: true, minStock: true } },
            warehouse: { select: { name: true } },
          },
          orderBy: { product: { name: 'asc' } },
        });
        headers = ['SKU', 'Produit', 'Entrepôt', 'Quantité', 'Stock min', 'P. Achat', 'P. Vente', 'Valeur coût', 'Valeur vente'];
        rows = data.map((i) => [i.product.sku, i.product.name, i.warehouse.name, this.csvNum(i.quantity), String(i.product.minStock ?? 0), this.csvNum(i.product.costPrice ?? 0), this.csvNum(i.product.salePrice), this.csvNum(Number(i.quantity) * Number(i.product.costPrice ?? 0)), this.csvNum(Number(i.quantity) * Number(i.product.salePrice))]);
        filename = `inventaire-${this.fileDate()}.csv`;
        break;
      }
      case 'customers': {
        const data = await this.prisma.customer.findMany({
          where: { tenantId, deletedAt: null },
          orderBy: { name: 'asc' },
        });
        headers = ['Nom', 'Email', 'Téléphone', 'Adresse', 'Ville', 'Limite crédit', 'Actif'];
        rows = data.map((c) => [c.name, c.email ?? '', c.phone ?? '', c.address ?? '', c.city ?? '', this.csvNum(c.creditLimit ?? 0), c.isActive ? 'Oui' : 'Non']);
        filename = `clients-${this.fileDate()}.csv`;
        break;
      }
      case 'expenses': {
        const data = await this.prisma.expense.findMany({
          where: { tenantId, expenseDate: { gte: start, lte: end } },
          include: {
            category: { select: { name: true } },
            creator: { select: { firstName: true, lastName: true } },
          },
          orderBy: { expenseDate: 'desc' },
        });
        headers = ['Référence', 'Description', 'Date', 'Catégorie', 'Statut', 'Montant', 'Créé par'];
        rows = data.map((e) => [e.reference, e.description, this.csvDate(e.expenseDate), e.category?.name ?? '', e.status, this.csvNum(e.totalAmount), `${e.creator?.firstName ?? ''} ${e.creator?.lastName ?? ''}`.trim()]);
        filename = `depenses-${this.fileDate()}.csv`;
        break;
      }
      default:
        throw new NotFoundException(`Unknown export type: ${type}`);
    }

    const bom = '﻿'; // UTF-8 BOM for Excel compatibility
    const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async getCompany(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, tradingName: true, address: true, city: true, phone: true, email: true, niu: true, rccm: true, logoUrl: true, currency: true },
    });
    return t ?? { name: 'ERP Platform', tradingName: null, address: null, city: null, phone: null, email: null, niu: null, rccm: null, logoUrl: null, currency: 'XAF' };
  }

  private curr(val: number | string | { toString(): string } | null | undefined): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(val ?? 0)) + ' FCFA';
  }

  private fmt(val: number | string | { toString(): string } | null | undefined): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(val ?? 0));
  }

  private csvNum(val: unknown): string { return String(Number(val ?? 0)); }
  private csvDate(d: Date): string { return new Date(d).toLocaleDateString('fr-FR'); }
  private fileDate(): string { return new Date().toISOString().slice(0, 10); }
}
