# PHASE 10 — PDF Document Generation & Server-Side CSV Export
# PHASE 10 — Génération PDF & Export CSV Côté Serveur

## Overview / Vue d'ensemble

This phase adds professional document generation to the ERP: invoices, purchase orders, and
POS receipts as downloadable PDF files, plus server-side CSV export for all major data modules.
Documents are generated on-demand by the NestJS backend using `pdfkit` — no browser or Chromium
needed, sub-100ms generation time.

Cette phase ajoute la génération de documents professionnels : factures, bons de commande et reçus
POS en PDF téléchargeables, plus l'export CSV côté serveur pour tous les modules de données.
Les documents sont générés à la demande par le backend NestJS via `pdfkit`.

---

## 1. PDF Generation Engine

**Package / Paquet :** `pdfkit` (pure Node.js, Alpine-compatible, no browser dependency)

**Files / Fichiers :**
- `backend/src/modules/pdf/pdf.service.ts` — core document builder
- `backend/src/modules/pdf/pdf.module.ts` — exported for use by other modules

### PDF Documents Generated / Documents PDF Générés

| Document | Endpoint | Format | Description |
|---|---|---|---|
| **Sales Invoice** | `GET /api/v1/sales/:id/invoice.pdf` | A4 | Full OHADA-style invoice with company header, client block, line items, totals, PAYÉ/DÛ badge |
| **POS Receipt** | `GET /api/v1/sales/:id/receipt.pdf` | 80mm thermal | Narrow receipt format for thermal printers |
| **Purchase Order** | `GET /api/v1/purchases/:id/pdf` | A4 | Purchase order with supplier block, line items, totals |

### Invoice Layout / Mise en page facture

```
┌────────────────────────────────────────────────────────────┐
│  SOCIÉTÉ SAFIRA TRADING          FACTURE / INVOICE          │
│  Yaoundé, Cameroun               N° VNT-2026-001            │
│  NIU: M000000000000M             Date: 17/06/2026           │
│  RCCM: RC/YAO/2024/B/001        ────────────────────────── │
├────────────────────────────────────────────────────────────┤
│  FACTURÉ À / BILL TO                                        │
│  Client ABC · Douala · client@abc.cm · 699 000 000         │
├────────────────────────────────────────────────────────────┤
│  SKU   │ Désignation  │ Qté │  P.U.   │ Rem. │ TVA │ Total │
│ ───────┼──────────────┼─────┼─────────┼──────┼─────┼────── │
│ PRD001 │ Produit A    │  10 │ 5 000   │  0%  │ 19% │ 59 500│
│ PRD002 │ Produit B    │   5 │ 12 000  │  5%  │ 19% │ 67 830│
├────────────────────────────────────────────────────────────┤
│                         Sous-total:       54 000 FCFA       │
│ ┌──────┐              Remises:          -  2 700 FCFA       │
│ │ PAYÉ │              TVA:                13 869 FCFA       │
│ └──────┘              TOTAL:             65 169 FCFA       │
├────────────────────────────────────────────────────────────┤
│         Société XYZ · NIU: M000000M · contact@xyz.cm       │
└────────────────────────────────────────────────────────────┘
```

### Company branding / Branding entreprise

The PDF header is automatically populated from the `tenants` table:
- `name` / `tradingName` — company name
- `address`, `city` — location
- `phone`, `email` — contact
- `niu`, `rccm` — OHADA legal identifiers
- `currency` — defaults to `FCFA`

L'en-tête PDF est automatiquement rempli depuis la table `tenants` (paramètres société).

---

## 2. Server-Side CSV Export

**Endpoint / Point d'accès :** `GET /api/v1/reports/csv?type=<type>[&startDate=...&endDate=...]`

| Type | Content | Filename |
|---|---|---|
| `sales` | All sale orders with customer, status, totals | `ventes-YYYY-MM-DD.csv` |
| `purchases` | All purchase orders with supplier, status, totals | `achats-YYYY-MM-DD.csv` |
| `inventory` | All stock positions with cost/sale value | `inventaire-YYYY-MM-DD.csv` |
| `customers` | Full customer list with credit limits | `clients-YYYY-MM-DD.csv` |
| `expenses` | Expense records with category and creator | `depenses-YYYY-MM-DD.csv` |

### Why server-side CSV vs client-side Excel? / Pourquoi CSV côté serveur vs Excel côté client ?

| | Client-side Excel | Server-side CSV |
|---|---|---|
| Data volume | Limited by browser memory (~5K rows) | **Unlimited** — streams directly from DB |
| Auth | Uses already-loaded React Query cache | Requires auth header in fetch call |
| Format | Rich: styled, multi-sheet, charts | Plain: universal, opens in any tool |
| Speed | Slow for large datasets | Fast — single DB query, stream to client |

Both approaches are complementary. The existing Excel export works great for styled reports with
charts; the new CSV export handles large bulk data extraction.

Les deux approches sont complémentaires. L'export Excel existant est idéal pour les rapports stylisés
avec graphiques ; le nouvel export CSV gère les gros volumes de données.

**CSV format / Format CSV :**
- UTF-8 with BOM (Excel auto-detects encoding)
- Semicolon separator (`;`) — matches French locale
- All values quoted (handles commas in product names)
- Date format: `DD/MM/YYYY` (French locale)

---

## 3. Frontend Integration

### Sales page — Invoice PDF button
Each row in the Sales table now has a `FileText` icon button that fetches and downloads the
invoice PDF for that sale.

**Flow / Flux :**
```
User clicks FileText icon
  → salesService.downloadInvoicePdf(saleId)
    → fetch /api/v1/sales/:id/invoice.pdf with Bearer token
      → pdfkit generates A4 invoice
        → Blob URL created → <a> click → browser saves file
```

### Reports page — CSV export panel
A new "Export CSV (Server-side)" section with 5 buttons (Sales, Purchases, Inventory, Customers,
Expenses) above the Import panel. Downloads the full dataset without pagination limits.

---

## 4. Backend Wiring

### Modules modified / Modules modifiés

| Module | Change |
|---|---|
| `SalesModule` | imports `PdfModule`; controller adds `GET /:id/invoice.pdf` and `GET /:id/receipt.pdf` |
| `PurchasesModule` | imports `PdfModule`; controller adds `GET /:id/pdf` |
| `ReportsModule` | imports `PdfModule`; controller adds `GET /csv` |

All PDF endpoints require the module's existing `READ` permission. No new permissions added.

Tous les endpoints PDF utilisent la permission `READ` existante du module. Aucune nouvelle permission.

---

## 5. Code Quality / Qualité du Code

`npx tsc --noEmit` (inside backend container) — **0 errors**

---

## Files Modified / Fichiers Modifiés

### Backend
- `backend/src/modules/pdf/pdf.service.ts` — **NEW** — pdfkit document builder
- `backend/src/modules/pdf/pdf.module.ts` — **NEW**
- `backend/src/modules/sales/sales.controller.ts` — added invoice.pdf + receipt.pdf endpoints
- `backend/src/modules/sales/sales.module.ts` — imports PdfModule
- `backend/src/modules/purchases/purchases.controller.ts` — added pdf endpoint
- `backend/src/modules/purchases/purchases.module.ts` — imports PdfModule
- `backend/src/modules/reports/reports.controller.ts` — added CSV export endpoint
- `backend/src/modules/reports/reports.module.ts` — imports PdfModule

### Frontend
- `frontend/src/services/sales.service.ts` — `downloadInvoicePdf()` + `downloadReceiptPdf()`
- `frontend/src/services/purchases.service.ts` — `downloadPdf()`
- `frontend/src/services/reports.service.ts` — `downloadCsv()`
- `frontend/src/app/(dashboard)/sales/page.tsx` — FileText icon per row → downloads invoice PDF
- `frontend/src/app/(dashboard)/reports/page.tsx` — CSV export panel with 5 module buttons

---

*Phase 10 complète. Prête pour la prochaine phase.*
*Phase 10 complete. Ready for the next phase.*
