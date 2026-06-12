# SAFIRA ERP — Architecture V2
## Professional-Grade ERP: Complete Design Specification

> **Author:** Senior ERP Solution Architect & Product Owner  
> **Date:** 2026-06-12  
> **Scope:** Inventory Traceability · POS Cash Management · Finance Integration · Tax Engine · Audit System  
> **Status:** Approved for Implementation

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Architecture Principles](#2-architecture-principles)
3. [Database Schema Changes](#3-database-schema-changes)
4. [Inventory Engine Redesign](#4-inventory-engine-redesign)
5. [POS Cash Management System](#5-pos-cash-management-system)
6. [Finance Auto-Integration](#6-finance-auto-integration)
7. [Tax Engine](#7-tax-engine)
8. [Audit System](#8-audit-system)
9. [API Design](#9-api-design)
10. [UI/UX Recommendations](#10-uiux-recommendations)
11. [Business Rules & Validation](#11-business-rules--validation)
12. [Implementation Plan](#12-implementation-plan)

---

## 1. EXECUTIVE SUMMARY

The current ERP stores inventory quantities as mutable values (`Inventory.quantity`), has no POS shift management, generates no automatic accounting entries, and has an incomplete audit trail. This specification transforms the system into a professional-grade platform where:

- **Every franc is traceable** — from POS sale to bank account
- **Every unit is accounted for** — from purchase receipt to customer delivery
- **Every action is auditable** — who, what, when, where, why
- **Finance writes itself** — zero double-entry; journals are auto-generated

### Current vs Target State

| Dimension | Current | Target |
|---|---|---|
| Inventory storage | Mutable `quantity` field | Calculated from stock ledger |
| POS cash | Sale only | Full session + cash drawer |
| Accounting | Manual | Auto-generated on every transaction |
| Tax | Stored on product | Centralized engine, auto-calculated |
| Audit | Partial | Complete — old/new values on every change |
| Expenses | Not in POS | Direct POS entry with categories |
| Reports | Basic | PDF, Excel, CSV on every module |

---

## 2. ARCHITECTURE PRINCIPLES

### P1 — Transaction Completeness
Every transaction produces five records atomically (in one DB transaction):

```
Business Transaction  (Sale, Purchase, POS Sale, etc.)
  └── Inventory Movements  (one per product line, if applicable)
  └── Journal Entries      (debit/credit pairs, auto-generated)
  └── Tax Records          (per tax code, per line)
  └── Audit Log Entry      (user, IP, old state, new state)
```

If any one of these fails, the entire transaction rolls back.

### P2 — Immutable Stock Ledger
The `Inventory.quantity` field is a **read-only materialized cache**.
It is **never** set directly by business logic.
It is recalculated from `InventoryMovement` records by a dedicated service.
The recalculation runs:
- Synchronously on every movement creation (within the same transaction)
- On-demand via Stock Reconciliation function
- On a scheduled job nightly as a safety net

### P3 — Double-Entry by Default
No transaction touches cash, receivables, payables, or inventory accounts manually.
The `JournalEngine` service listens to domain events and generates entries automatically.

### P4 — Immutable Audit Trail
Audit log entries are insert-only. No updates. No deletes.
They capture `oldValues` and `newValues` as JSON snapshots.

### P5 — Tax Calculation Centralized
All tax computation runs through a single `TaxEngine` service.
No component calculates tax on its own.

---

## 3. DATABASE SCHEMA CHANGES

### 3.1 Expand MovementType Enum

**Current:**
```
IN | OUT | ADJUSTMENT | TRANSFER | RETURN
```

**Replace with:**
```prisma
enum MovementType {
  PURCHASE_RECEIPT          // Goods received from supplier
  PURCHASE_RETURN           // Goods returned to supplier
  SALE_DELIVERY             // Goods delivered to customer
  POS_SALE                  // Goods sold via POS terminal
  CUSTOMER_RETURN           // Goods returned by customer
  SUPPLIER_RETURN           // Goods sent back to supplier
  STOCK_ADJUSTMENT_IN       // Manual adjustment — add stock
  STOCK_ADJUSTMENT_OUT      // Manual adjustment — remove stock
  WAREHOUSE_TRANSFER_IN     // Transfer received at this warehouse
  WAREHOUSE_TRANSFER_OUT    // Transfer sent from this warehouse
  PRODUCTION_IN             // Finished goods from production
  PRODUCTION_OUT            // Raw materials consumed
  OPENING_STOCK             // Initial stock count
  WRITE_OFF                 // Damaged / expired / lost
  RECOUNT                   // Physical count correction
}
```

### 3.2 Enhance InventoryMovement Model

```prisma
model InventoryMovement {
  id               String        @id @default(uuid())
  tenantId         String
  productId        String
  warehouseId      String
  branchId         String?
  type             MovementType
  direction        Int           // +1 = IN, -1 = OUT (computed from type)
  quantity         Decimal       @db.Decimal(15,4)
  unitCost         Decimal?      @db.Decimal(15,4)
  totalCost        Decimal?      @db.Decimal(15,2)
  runningBalance   Decimal?      @db.Decimal(15,4)  // stock after this movement
  referenceType    String?       // "PURCHASE" | "SALE" | "POS_SESSION" | "TRANSFER" | "MANUAL"
  referenceId      String?       // FK to the source document
  transferPairId   String?       // links TRANSFER_OUT to TRANSFER_IN
  sessionId        String?       // POS session if POS_SALE
  reason           String?
  notes            String?
  approvalStatus   String        @default("AUTO")   // AUTO | PENDING | APPROVED | REJECTED
  approvedBy       String?
  approvedAt       DateTime?
  createdBy        String?
  createdAt        DateTime      @default(now())

  tenant    Tenant    @relation(...)
  product   Product   @relation(...)
  warehouse Warehouse @relation(...)

  @@index([tenantId, productId, warehouseId])
  @@index([tenantId, type])
  @@index([tenantId, createdAt])
  @@index([tenantId, referenceId])
  @@map("inventory_movements")
}
```

### 3.3 New: WarehouseTransfer Model

```prisma
model WarehouseTransfer {
  id              String    @id @default(uuid())
  tenantId        String
  reference       String
  fromWarehouseId String
  toWarehouseId   String
  status          String    @default("DRAFT")  // DRAFT | IN_TRANSIT | COMPLETED | CANCELLED
  transferDate    DateTime  @default(now())
  completedAt     DateTime?
  notes           String?
  createdBy       String?
  approvedBy      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  lines TransferLine[]

  @@unique([tenantId, reference])
  @@map("warehouse_transfers")
}

model TransferLine {
  id           String  @id @default(uuid())
  transferId   String
  productId    String
  quantity     Decimal @db.Decimal(15,4)
  unitCost     Decimal @db.Decimal(15,4)
  receivedQty  Decimal @db.Decimal(15,4) @default(0)
  sortOrder    Int     @default(0)

  transfer WarehouseTransfer @relation(...)
  product  Product           @relation(...)
  @@map("transfer_lines")
}
```

### 3.4 New: POS Session Management

```prisma
enum PosSessionStatus {
  OPEN
  CLOSING
  CLOSED
  RECONCILED
  DISPUTED
  @@map("pos_session_status")
}

model PosSession {
  id              String           @id @default(uuid())
  tenantId        String
  branchId        String
  warehouseId     String?
  cashierId       String
  reference       String           // SESSION-2026-001
  status          PosSessionStatus @default(OPEN)
  openingCash     Decimal          @db.Decimal(15,2)
  openedAt        DateTime         @default(now())
  closedAt        DateTime?
  expectedCash    Decimal?         @db.Decimal(15,2)
  countedCash     Decimal?         @db.Decimal(15,2)
  variance        Decimal?         @db.Decimal(15,2)
  salesTotal      Decimal          @db.Decimal(15,2) @default(0)
  cashInTotal     Decimal          @db.Decimal(15,2) @default(0)
  cashOutTotal    Decimal          @db.Decimal(15,2) @default(0)
  expensesTotal   Decimal          @db.Decimal(15,2) @default(0)
  incomeTotal     Decimal          @db.Decimal(15,2) @default(0)
  notes           String?
  closingNotes    String?
  approvedBy      String?
  approvedAt      DateTime?
  reconciliationAt DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  tenant    Tenant        @relation(...)
  branch    Branch        @relation(...)
  cashier   User          @relation(...)
  entries   CashEntry[]
  sales     Sale[]
  @@unique([tenantId, reference])
  @@map("pos_sessions")
}
```

### 3.5 New: Cash Entry (Cash In / Cash Out / Expense / Income)

```prisma
enum CashEntryType {
  OPENING_FLOAT     // Initial cash in drawer
  SALE_CASH         // Cash collected from sale
  CASH_IN           // Ad hoc cash added to drawer
  CASH_OUT          // Ad hoc cash removed from drawer
  EXPENSE           // Operating expense paid from cash
  INCOME            // Non-sale income received in cash
  CLOSING_WITHDRAWAL // Cash removed at shift close
  @@map("cash_entry_type")
}

enum CashEntryCategory {
  // Expenses
  FUEL | TRANSPORT | INTERNET | CLEANING | OFFICE_SUPPLIES
  MAINTENANCE | REPAIRS | UTILITIES | MARKETING | SALARY_ADVANCE
  SUPPLIER_PAYMENT | CUSTOMS | OTHER_EXPENSE
  // Income
  CONSULTING | SERVICE_FEE | DELIVERY_CHARGES | RENTAL
  COMMISSION | INTEREST | OTHER_INCOME
  @@map("cash_entry_category")
}

model CashEntry {
  id          String           @id @default(uuid())
  tenantId    String
  sessionId   String?
  branchId    String?
  type        CashEntryType
  category    String?
  amount      Decimal          @db.Decimal(15,2)
  description String?
  reference   String?
  receiptUrl  String?
  userId      String
  approvedBy  String?
  requiresApproval Boolean    @default(false)
  saleId      String?
  journalEntryId String?      // auto-generated accounting entry
  createdAt   DateTime        @default(now())

  tenant  Tenant      @relation(...)
  session PosSession? @relation(...)
  user    User        @relation(...)
  @@index([tenantId, sessionId])
  @@index([tenantId, type])
  @@index([tenantId, createdAt])
  @@map("cash_entries")
}
```

### 3.6 New: Stock Valuation Snapshot

```prisma
model StockValuationSnapshot {
  id              String   @id @default(uuid())
  tenantId        String
  productId       String
  warehouseId     String
  snapshotDate    DateTime
  openingQty      Decimal  @db.Decimal(15,4)
  receivedQty     Decimal  @db.Decimal(15,4)
  issuedQty       Decimal  @db.Decimal(15,4)
  closingQty      Decimal  @db.Decimal(15,4)
  avgUnitCost     Decimal  @db.Decimal(15,4)
  totalValue      Decimal  @db.Decimal(15,2)
  valuationMethod String   @default("WEIGHTED_AVG")
  createdAt       DateTime @default(now())

  @@unique([tenantId, productId, warehouseId, snapshotDate])
  @@map("stock_valuation_snapshots")
}
```

### 3.7 Enhance Product Model

Add these fields to `Product`:

```prisma
reorderPoint    Decimal?  @db.Decimal(15,4)   // triggers reorder alert
safetyStock     Decimal?  @db.Decimal(15,4)   // never go below this
isTracked       Boolean   @default(true)       // false = service items
valuationMethod String    @default("WEIGHTED_AVG")  // FIFO | LIFO | WEIGHTED_AVG
```

### 3.8 New: Tax Line (per-transaction tax detail)

```prisma
model TaxLine {
  id           String   @id @default(uuid())
  tenantId     String
  taxId        String
  taxCode      String
  taxRate      Decimal  @db.Decimal(5,2)
  taxableAmount Decimal @db.Decimal(15,2)
  taxAmount    Decimal  @db.Decimal(15,2)
  referenceType String   // SALE | PURCHASE | POS_SALE
  referenceId   String
  lineId        String?
  createdAt    DateTime @default(now())

  tax Tax @relation(...)
  @@index([tenantId, referenceId])
  @@index([tenantId, taxId])
  @@map("tax_lines")
}
```

### 3.9 Enhance AuditLog Model

Add to the existing `AuditLog`:

```prisma
module      String?    // INVENTORY | SALES | PURCHASES | POS | FINANCE | CRM
subModule   String?    // MOVEMENT | ADJUSTMENT | TRANSFER | etc.
severity    String     @default("INFO")   // INFO | WARNING | CRITICAL
branchId    String?
warehouseId String?
sessionId   String?
changeReason String?
checksum    String?    // hash of the record for tamper detection
```

---

## 4. INVENTORY ENGINE REDESIGN

### 4.1 Stock Calculation Service

The `StockLedgerService` is the single source of truth for stock quantities.

```typescript
class StockLedgerService {

  // Get current stock for one product in one warehouse
  async getStock(productId: string, warehouseId: string): Promise<StockPosition>

  // Get stock across all warehouses for a product
  async getStockAllWarehouses(productId: string): Promise<WarehouseStockMap>

  // Record a movement (the ONLY way to change stock)
  async recordMovement(dto: CreateMovementDto, tx: PrismaTransactionClient): Promise<InventoryMovement>

  // Reconcile: recalculate Inventory.quantity from scratch
  async reconcile(tenantId: string, warehouseId?: string): Promise<ReconciliationReport>

  // Get stock valuation (FIFO / Weighted Average)
  async getValuation(tenantId: string, warehouseId?: string): Promise<ValuationReport>
}

interface StockPosition {
  productId:   string
  warehouseId: string
  physical:    number   // SUM(IN movements) - SUM(OUT movements)
  reserved:    number   // qty on confirmed but undelivered sales
  available:   number   // physical - reserved
  incoming:    number   // qty on ordered but unreceived purchases
  reorderPoint: number
  minStock:    number
  maxStock:    number | null
  isLowStock:  boolean
  isOutOfStock: boolean
  isOverStock: boolean
}
```

### 4.2 Movement Direction Rules

| Movement Type | Direction | Updates Inventory |
|---|---|---|
| PURCHASE_RECEIPT | +1 (IN) | Yes |
| PURCHASE_RETURN | -1 (OUT) | Yes |
| SALE_DELIVERY | -1 (OUT) | Yes |
| POS_SALE | -1 (OUT) | Yes |
| CUSTOMER_RETURN | +1 (IN) | Yes |
| SUPPLIER_RETURN | -1 (OUT) | Yes |
| STOCK_ADJUSTMENT_IN | +1 (IN) | Yes — requires approval |
| STOCK_ADJUSTMENT_OUT | -1 (OUT) | Yes — requires approval |
| WAREHOUSE_TRANSFER_IN | +1 (IN) | Yes |
| WAREHOUSE_TRANSFER_OUT | -1 (OUT) | Yes |
| OPENING_STOCK | +1 (IN) | Yes |
| WRITE_OFF | -1 (OUT) | Yes — requires approval + reason |

### 4.3 Warehouse Transfer Workflow

```
1. User creates Transfer Request (DRAFT)
   → Validates stock availability at source
   → Creates TransferLine records

2. Manager approves (IN_TRANSIT)
   → Creates WAREHOUSE_TRANSFER_OUT movements at source
   → Reduces stock at source warehouse

3. Destination warehouse confirms receipt (COMPLETED)
   → Creates WAREHOUSE_TRANSFER_IN movements at destination
   → Increases stock at destination warehouse

4. Both movements reference same transferPairId
   → Full traceability: "Stock left WH-AKW at 14:32, arrived WH-BON at 16:15"
```

### 4.4 Stock Adjustment Workflow

```
1. Warehouse manager creates adjustment (PENDING_APPROVAL)
   → Records: product, warehouse, qty diff, reason, evidence

2. System validates:
   → If ADJUSTMENT_OUT > available stock → REJECT
   → If abs(qty) > threshold (e.g. 10 units or 100,000 XAF) → require approval

3. Finance/Admin approves
   → Creates STOCK_ADJUSTMENT_IN or STOCK_ADJUSTMENT_OUT movement
   → Updates Inventory.quantity atomically
   → Creates AuditLog entry
   → Creates JournalEntry (if value significant)
```

### 4.5 Real-Time Stock Visibility — Data Structure

```
GET /api/v1/inventory/products/:id/stock

Response:
{
  productId: "...",
  productName: "Laptop Dell XPS 15",
  sku: "PC-DEL-XPS",
  totalPhysical: 190,
  totalReserved: 25,
  totalAvailable: 165,
  totalIncoming: 40,
  warehouseBreakdown: [
    {
      warehouseId: "...",
      warehouseName: "Entrepôt Principal – Akwa",
      code: "WH-AKW",
      physical: 120,
      reserved: 15,
      available: 105,
      incoming: 30
    },
    {
      warehouseId: "...",
      warehouseName: "Entrepôt Bonaberi",
      code: "WH-BON",
      physical: 50,
      reserved: 10,
      available: 40,
      incoming: 10
    },
    {
      warehouseId: "...",
      warehouseName: "Magasin Yaoundé",
      code: "WH-YDE",
      physical: 20,
      reserved: 0,
      available: 20,
      incoming: 0
    }
  ],
  alerts: {
    isLowStock: false,
    isOutOfStock: false,
    isOverStock: false,
    reorderPoint: 30,
    minStock: 10,
    maxStock: 250
  },
  valuation: {
    method: "WEIGHTED_AVG",
    avgUnitCost: 345000,
    totalValue: 65550000
  }
}
```

---

## 5. POS CASH MANAGEMENT SYSTEM

### 5.1 POS Sidebar Navigation

```
POS
├── 🛒  Nouvelle Vente
├── 🔓  Ouvrir une Session
├── 💵  Entrée de Fonds
├── 💸  Sortie de Fonds
├── 📋  Dépenses
├── 💰  Revenus Divers
├── 📊  Rapport de Caisse
└── 🔒  Clôturer la Session
```

### 5.2 Shift Lifecycle

```
START OF DAY
   │
   ▼
[Shift Opening]
   Cashier: Nadège ATANGANA
   Opening Float: 100,000 XAF
   Confirmed by: Manager (PIN or approval)
   → Creates PosSession (status: OPEN)
   → Creates CashEntry (type: OPENING_FLOAT, amount: 100,000)
   → Creates JournalEntry: Dr Cash 100,000 / Cr Float Account 100,000
   │
   ▼
[DURING SHIFT] ──────────────────────────────────────────────────────────
   │                                                                      │
   ▼                                                                      │
[Sale]                                   [Cash In / Cash Out]            │
 Debit: Cash / AR                         Example: Received advance      │
 Credit: Sales Revenue                    from main safe                 │
 Credit: TVA Collectée                                                   │
   │                                                                      │
   ▼                                                                      │
[Expense Entry]                          [Income Entry]                  │
 Example: Fuel 15,000 XAF                Example: Delivery fee 5,000    │
 Debit: Fuel Expense                      Debit: Cash                    │
 Credit: Cash                             Credit: Service Income         │
──────────────────────────────────────────────────────────────────────────
   │
   ▼
[Shift Closing]
   Cashier submits count sheet:
   Opening Float:    100,000
   + Sales Cash:     250,000
   + Cash In:         20,000
   - Cash Out:       -10,000
   - Expenses:       -15,000
   ──────────────────────────
   Expected Cash:    345,000
   Counted Cash:     342,500
   Variance:          -2,500
   │
   ▼
[Reconciliation Approval]
   If |variance| <= 5,000 XAF → auto-approved
   If |variance| > 5,000 XAF → Manager must review and approve/dispute
   → Creates JournalEntry for variance (Dr Cash Variance / Cr Cash)
   → PosSession status: RECONCILED
   → Locks session — no further entries
```

### 5.3 Misc Expense Entry Screen (POS)

```
╔══════════════════════════════════════════════════════╗
║  💸  Enregistrer une Dépense                         ║
╠══════════════════════════════════════════════════════╣
║  Catégorie  [ Carburant ▼ ]                          ║
║             [ Transport        ]                     ║
║             [ Internet/Téléphone]                    ║
║             [ Nettoyage         ]                    ║
║             [ Fournitures bureau]                    ║
║             [ Maintenance       ]                    ║
║             [ Réparations       ]                    ║
║             [ Charges générales ]                    ║
║             [ Marketing         ]                    ║
║             [ Avance personnel  ]                    ║
║             [ Autre dépense     ]                    ║
║                                                      ║
║  Montant    [ 15 000 XAF      ]                      ║
║  Description[ Carburant livraison Bonanjo ]          ║
║  Référence  [ FUEL-20260612-001 ] (auto)             ║
║  Reçu       [ 📎 Joindre photo ]                     ║
║                                                      ║
║  [ Annuler ]              [ ✅ Enregistrer ]         ║
╚══════════════════════════════════════════════════════╝
```

### 5.4 Misc Income Entry Screen (POS)

```
╔══════════════════════════════════════════════════════╗
║  💰  Enregistrer un Revenu Divers                    ║
╠══════════════════════════════════════════════════════╣
║  Catégorie  [ Frais de livraison ▼ ]                 ║
║             [ Consulting          ]                  ║
║             [ Prestation service  ]                  ║
║             [ Location            ]                  ║
║             [ Commission          ]                  ║
║             [ Autre revenu        ]                  ║
║                                                      ║
║  Montant    [ 5 000 XAF ]                            ║
║  Description[ Livraison cliente Mme OWONO ]          ║
║  Référence  [ INC-20260612-001 ] (auto)              ║
║                                                      ║
║  [ Annuler ]              [ ✅ Enregistrer ]         ║
╚══════════════════════════════════════════════════════╝
```

### 5.5 Cash Reconciliation Screen

```
╔══════════════════════════════════════════════════════════╗
║  📊  Réconciliation de Caisse — Session #2026-001        ║
║  Caissière: Nadège ATANGANA · 12/06/2026 · Siège Akwa   ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  MOUVEMENT                     MONTANT          ║
║  ─────────────────────────────────────────────  ║
║  Fonds de caisse (ouverture)   100 000 XAF      ║
║  + Ventes (espèces)            250 000 XAF      ║
║  + Ventes (mobile money)        45 000 XAF      ║
║  + Entrées de fonds             20 000 XAF      ║
║  + Revenus divers                5 000 XAF      ║
║  - Sorties de fonds            -10 000 XAF      ║
║  - Dépenses enregistrées       -15 000 XAF      ║
║  ─────────────────────────────────────────────  ║
║  ENCAISSE THÉORIQUE            395 000 XAF      ║
║                                                  ║
║  Espèces comptées              392 500 XAF  ←─ cashier enters  ║
║  Mobile Money confirmé          45 000 XAF  ←─ auto from system║
║  ─────────────────────────────────────────────  ║
║  ÉCART ESPÈCES                  -2 500 XAF  🟡  ║
║                                                  ║
║  Commentaires: [                              ]  ║
║                                                  ║
║  [ Soumettre pour approbation ]                  ║
╚══════════════════════════════════════════════════╝

Manager view (approval):
[ ✅ Approuver l'écart ]  [ ❌ Contester — ouvrir enquête ]
```

### 5.6 POS Stock Validation Rule

```
Before completing any POS sale:

FOR EACH line item:
  available = StockLedger.getAvailable(productId, sessionWarehouseId)
  IF requested > available:
    IF product.allowBackorder = true:
      WARN: "Stock insuffisant — vente en backorder"
      CREATE backorder record
    ELSE:
      BLOCK: "Stock insuffisant : disponible = X, demandé = Y"
      Prevent checkout

AFTER successful checkout:
  FOR EACH line item:
    StockLedger.recordMovement(POS_SALE, -qty, sessionId, saleId)
```

---

## 6. FINANCE AUTO-INTEGRATION

### 6.1 Journal Engine Architecture

```typescript
@Injectable()
class JournalEngine {

  // Called by SalesService after creating a sale
  async onSaleCreated(sale: Sale, lines: SaleLine[]): Promise<JournalEntry>

  // Called by PurchaseService after receiving goods
  async onPurchaseReceived(po: Purchase, lines: PurchaseLine[]): Promise<JournalEntry>

  // Called by CashEntryService after each cash movement
  async onCashEntry(entry: CashEntry): Promise<JournalEntry>

  // Called by StockAdjustmentService after approval
  async onStockAdjustment(movement: InventoryMovement): Promise<JournalEntry>

  // Called by PaymentService after payment recorded
  async onPaymentRecorded(payment: Payment): Promise<JournalEntry>
}
```

### 6.2 Auto-Generated Journal Entry Rules

**SALE (DELIVERED):**
```
Debit:  411 Clients                          Total TTC
Credit: 701 Ventes de marchandises           Subtotal HT
Credit: 4431 TVA collectée                   TVA amount
```

**PAYMENT RECEIVED (from customer):**
```
Debit:  521 Banque / 5711 Caisse             Amount paid
Credit: 411 Clients                          Amount paid
```

**PURCHASE ORDER (RECEIVED):**
```
Debit:  311 Stocks de marchandises           Total TTC
Credit: 401 Fournisseurs                     Total TTC
```

**PURCHASE PAYMENT (to supplier):**
```
Debit:  401 Fournisseurs                     Amount paid
Credit: 521 Banque / 5711 Caisse             Amount paid
```

**POS SALE (CASH):**
```
Debit:  5711 Caisse principale               Total TTC
Credit: 701 Ventes de marchandises           Subtotal HT
Credit: 4431 TVA collectée                   TVA amount
```

**POS SALE (MOBILE MONEY):**
```
Debit:  5712 Caisse Mobile Money             Total TTC
Credit: 701 Ventes de marchandises           Subtotal HT
Credit: 4431 TVA collectée                   TVA amount
```

**MISC EXPENSE (from POS):**
```
Debit:  601-699 [mapped expense account]     Amount
Credit: 5711 Caisse principale               Amount
```

**MISC INCOME (from POS):**
```
Debit:  5711 Caisse principale               Amount
Credit: 706 Prestations de services          Amount
```

**STOCK WRITE-OFF:**
```
Debit:  658 Charges diverses / Perte stocks  Value (qty × avg cost)
Credit: 311 Stocks de marchandises           Value
```

**WAREHOUSE TRANSFER:** (no P&L impact — just reclassification)
```
Debit:  311 Stocks WH-BON                    Value
Credit: 311 Stocks WH-AKW                    Value
```

### 6.3 Account Mapping Configuration

Store in `Settings` table:
```
finance.account.sales_revenue       = "701"
finance.account.accounts_receivable = "411"
finance.account.vat_collected       = "4431"
finance.account.vat_deductible      = "4411"
finance.account.inventory           = "311"
finance.account.accounts_payable    = "401"
finance.account.cash_main           = "5711"
finance.account.cash_mobile         = "5712"
finance.account.bank_bicec          = "521"
finance.expense.fuel                = "624"
finance.expense.transport           = "6241"
finance.expense.internet            = "626"
finance.expense.maintenance         = "615"
finance.income.service_fee          = "706"
finance.income.delivery             = "7087"
```

---

## 7. TAX ENGINE

### 7.1 Tax Code Structure

```
Code        Name              Rate    Type        Applies To
─────────────────────────────────────────────────────────────
EXEMPT      Exonéré TVA       0.00%   EXEMPTION   Products, Customers
TVA_0       TVA taux zéro     0.00%   ZERO_RATED  Exports
TVA_5       TVA réduit 5%     5.00%   STANDARD    Food basics
TVA_19      TVA standard      19.25%  STANDARD    Most goods/services
DROITS      Droits de douane  varies  IMPORT      Imported goods
IRCM        IR sur comm.      5.50%   WITHHOLDING Commissions
```

### 7.2 Tax Calculation Service

```typescript
class TaxEngine {

  // Calculate tax for a sale/purchase line
  calculateLineTax(
    unitPrice: number,
    quantity: number,
    discountPct: number,
    taxCode: string
  ): {
    subtotal: number,       // price × qty
    discountAmount: number, // subtotal × discount%
    taxableAmount: number,  // subtotal - discount
    taxRate: number,        // e.g. 19.25
    taxAmount: number,      // taxableAmount × taxRate/100
    total: number           // taxableAmount + taxAmount
  }

  // Get effective tax code for a product+customer combination
  getEffectiveTaxCode(
    productTaxCode: string,
    customerTaxExempt: boolean,
    transactionType: 'SALE' | 'PURCHASE'
  ): string

  // Validate tax codes and rates on save
  validateTaxConfig(tenantId: string): ValidationResult[]
}
```

### 7.3 Tax Reporting

```
Monthly Tax Summary Report:
──────────────────────────────────────────────────────────────────
Period: Juin 2026

VENTES
  TVA collectée (19.25%)    Taxable: 18,500,000   TVA: 3,561,250
  Exonérées                 Taxable:  2,300,000   TVA:         0
  ─────────────────────────────────────────────────────────────
  Total ventes              Taxable: 20,800,000   TVA: 3,561,250

ACHATS
  TVA déductible (19.25%)   Taxable: 12,000,000   TVA: 2,310,000
  ─────────────────────────────────────────────────────────────
  Total achats              Taxable: 12,000,000   TVA: 2,310,000

TVA NETTE À REVERSER                               TVA: 1,251,250
──────────────────────────────────────────────────────────────────
```

---

## 8. AUDIT SYSTEM

### 8.1 Audit Interceptor (NestJS)

All write operations (POST, PUT, PATCH, DELETE) on sensitive modules automatically log via an `AuditInterceptor`:

```typescript
@Injectable()
class AuditInterceptor implements NestInterceptor {
  // Before handler: capture old state
  // After handler: capture new state
  // On exception: log failed attempt
  // Always log: user, IP, timestamp, module, action, entity, old, new
}
```

Sensitive modules: `inventory`, `sales`, `purchases`, `finance`, `pos`, `users`, `settings`

### 8.2 Audit Log Entry Examples

**Stock Adjustment:**
```json
{
  "userId": "uuid-admin",
  "userName": "Jean-Baptiste MBARGA",
  "module": "INVENTORY",
  "subModule": "STOCK_ADJUSTMENT",
  "action": "STOCK_ADJUSTMENT_OUT",
  "entity": "InventoryMovement",
  "entityId": "uuid-movement",
  "branchId": "uuid-hq",
  "warehouseId": "uuid-wh-akw",
  "oldValues": { "quantity": 120 },
  "newValues": { "quantity": 117 },
  "changeReason": "3 unités endommagées — réf. rapport #DMG-2026-001",
  "ipAddress": "192.168.1.45",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2026-06-12T10:43:00.000Z",
  "severity": "WARNING"
}
```

**Price Change:**
```json
{
  "module": "INVENTORY",
  "subModule": "PRODUCT",
  "action": "UPDATE",
  "entity": "Product",
  "entityId": "uuid-product",
  "oldValues": { "salePrice": "249000.0000", "costPrice": "195000.0000" },
  "newValues": { "salePrice": "259000.0000", "costPrice": "195000.0000" },
  "changeReason": "Ajustement prix suite hausse fournisseur",
  "severity": "INFO"
}
```

**Unauthorized Access Attempt:**
```json
{
  "module": "FINANCE",
  "action": "ACCESS_DENIED",
  "entity": "JournalEntry",
  "oldValues": null,
  "newValues": null,
  "changeReason": "Permission insuffisante — rôle Commercial ne peut pas accéder aux journaux",
  "severity": "WARNING"
}
```

### 8.3 Audit Trail Screen

```
╔══════════════════════════════════════════════════════════════════════╗
║  🔍  Journal d'Audit                                                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  Filtres:  Module [Tous ▼]  Action [Toutes ▼]  User [Tous ▼]        ║
║            Date du [12/06/2026] au [12/06/2026]  Sévérité [Toutes ▼]║
╠══════════════════════════════════════════════════════════════════════╣
║  DATE/HEURE        USER          MODULE        ACTION        SÉVÉRITÉ║
║  ─────────────────────────────────────────────────────────────────── ║
║  12/06 10:43       J-B.MBARGA   INVENTORY    ADJUSTMENT ⚠  WARNING  ║
║  12/06 10:31       N.ATANGANA   POS          POS_SALE       INFO     ║
║  12/06 10:15       B.NGUELE     PURCHASES    RECEIVE        INFO     ║
║  12/06 09:58       M.FOUDA      FINANCE      JOURNAL_POST   INFO     ║
║  12/06 09:44       [UNKNOWN]    FINANCE      ACCESS_DENIED  ⚠ WARN  ║
║                                                                      ║
║  [View Detail]  [Export CSV]  [Export PDF]                           ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 9. API DESIGN

### 9.1 Inventory APIs

```
GET    /api/v1/inventory/products/:id/stock            # Real-time stock position
GET    /api/v1/inventory/products/:id/movements        # Movement history
GET    /api/v1/inventory/stock/all                     # All products stock summary
GET    /api/v1/inventory/stock/low-stock               # Products below reorder point
GET    /api/v1/inventory/stock/out-of-stock            # Zero stock products
GET    /api/v1/inventory/valuation                     # Stock valuation report

POST   /api/v1/inventory/movements                     # Create manual movement
POST   /api/v1/inventory/adjustments                   # Create stock adjustment (pending approval)
POST   /api/v1/inventory/adjustments/:id/approve       # Approve adjustment
POST   /api/v1/inventory/transfers                     # Create warehouse transfer
POST   /api/v1/inventory/transfers/:id/send            # Mark in-transit
POST   /api/v1/inventory/transfers/:id/receive         # Confirm receipt
POST   /api/v1/inventory/reconcile                     # Trigger reconciliation

GET    /api/v1/inventory/movements?warehouse=&product=&type=&from=&to=&user=
```

### 9.2 POS Session APIs

```
POST   /api/v1/pos/sessions                            # Open shift
GET    /api/v1/pos/sessions/active                     # Get current open session
GET    /api/v1/pos/sessions/:id                        # Session detail
POST   /api/v1/pos/sessions/:id/close                  # Submit closing count
POST   /api/v1/pos/sessions/:id/reconcile              # Manager reconciles
GET    /api/v1/pos/sessions/:id/report                 # Session report

POST   /api/v1/pos/cash-entries                        # Cash In / Cash Out / Expense / Income
GET    /api/v1/pos/cash-entries?session=&type=&from=&to=

GET    /api/v1/pos/sessions/:id/cash-summary           # Running totals
```

### 9.3 Finance APIs

```
GET    /api/v1/finance/journal-entries?journal=&from=&to=&status=
GET    /api/v1/finance/journal-entries/:id
POST   /api/v1/finance/journal-entries/:id/post        # Post a draft entry
POST   /api/v1/finance/journal-entries/:id/reverse     # Reverse a posted entry

GET    /api/v1/finance/tax-report?from=&to=            # Monthly tax summary
GET    /api/v1/finance/trial-balance?date=             # Trial balance
GET    /api/v1/finance/income-statement?from=&to=      # P&L
GET    /api/v1/finance/balance-sheet?date=             # Balance sheet
```

### 9.4 Audit APIs

```
GET    /api/v1/audit?module=&action=&user=&from=&to=&severity=
GET    /api/v1/audit/:id
GET    /api/v1/audit/entity/:type/:id                  # All changes to one record
GET    /api/v1/audit/export?format=csv|pdf             # Export audit log
```

### 9.5 Reports APIs

```
GET    /api/v1/reports/inventory-movements?from=&to=&warehouse=&format=pdf|csv|xlsx
GET    /api/v1/reports/inventory-valuation?date=&format=pdf|csv|xlsx
GET    /api/v1/reports/sales?from=&to=&customer=&format=
GET    /api/v1/reports/purchases?from=&to=&supplier=&format=
GET    /api/v1/reports/cash-flow?from=&to=&branch=&format=
GET    /api/v1/reports/tax?from=&to=&format=
GET    /api/v1/reports/profitability?from=&to=&format=
GET    /api/v1/reports/warehouse-activity?warehouse=&from=&to=&format=
GET    /api/v1/reports/pos-session/:id?format=
```

---

## 10. UI/UX RECOMMENDATIONS

### 10.1 Revised Sidebar Navigation

```
📊  Tableau de bord
─────────────────────
🛒  POS / Caisse
    ├── Nouvelle Vente
    ├── Ouvrir Session
    ├── Entrées / Sorties
    ├── Dépenses
    ├── Revenus Divers
    └── Clôture de Caisse
─────────────────────
📦  Inventaire
    ├── Produits
    ├── Entrepôts
    ├── Mouvements de Stock
    ├── Transferts
    ├── Ajustements
    ├── Valorisation
    ├── Alertes Stock
    └── Réconciliation
─────────────────────
💰  Ventes
    ├── Bons de Vente
    ├── Clients
    ├── Factures
    └── Paiements Clients
─────────────────────
🏭  Achats
    ├── Bons de Commande
    ├── Fournisseurs
    ├── Réceptions
    └── Paiements Fournisseurs
─────────────────────
📒  Finance
    ├── Journaux
    ├── Plan Comptable
    ├── Écritures
    └── Rapports Financiers
─────────────────────
📈  CRM
─────────────────────
💼  Budgets
─────────────────────
📤  Rapports
    ├── Inventaire
    ├── Ventes
    ├── Achats
    ├── Trésorerie
    ├── Taxes
    └── Rentabilité
─────────────────────
⚙️  Paramètres
    ├── Entreprise
    ├── Taxes
    ├── Comptes
    ├── Rôles & Permissions
    └── Journal d'Audit
```

### 10.2 Dashboard Design

```
╔════════════════════════════════════════════════════════════════════╗
║  TABLEAU DE BORD — Groupe SAFIRA Distribution                      ║
║  12 Juin 2026  ·  Siège Social Akwa  ·  Jean-Baptiste MBARGA       ║
╠════╦════════════╦════════════╦════════════╦════════════╦═══════════╣
║ 💰 ║  VENTES    ║  ACHATS    ║  ENCAISSE  ║  STOCK     ║ BÉNÉFICE  ║
║    ║ Aujourd'hui║ Ce mois    ║  Caisse    ║  Alertes   ║ Ce mois   ║
║    ║ 1,245,000  ║ 38,500,000 ║  892,500   ║  🔴 3 rupt.║ 7,230,000 ║
║    ║ XAF        ║ XAF        ║  XAF       ║  🟡 8 faib ║ XAF       ║
╠════╩════════════╩════════════╩════════════╩════════════╩═══════════╣
║                                                                    ║
║  Valeur Stock Total    Top Produits (30j)    Sessions POS actives  ║
║  ─────────────────     ────────────────     ─────────────────────  ║
║  248,500,000 XAF      1. TV Samsung 43"    Nadège ATANGANA (open) ║
║                        2. Laptop Dell XPS   Session #2026-048      ║
║  Produits en rupture   3. Climatiseur Daikin Ouvert 08:00          ║
║  3 produits → 0 stock  4. HP Toner 85A      Cash: 750,000 XAF     ║
║                        5. Samsung A54                              ║
╚════════════════════════════════════════════════════════════════════╝
```

### 10.3 Product Stock Panel (in Product detail page)

```
╔══════════════════════════════════════════════════════════════╗
║  📦  Stock en temps réel — Laptop Dell Inspiron 15 i5        ║
╠══════════════════════════════════════════════════════════════╣
║  ENTREPÔT              PHYSIQUE   RÉSERVÉ   DISPONIBLE        ║
║  ────────────────────────────────────────────────────────    ║
║  🏢 Entrepôt Akwa        120        15          105           ║
║  🏭 Entrepôt Bonaberi     50        10           40           ║
║  🏪 Magasin Yaoundé       20         0           20           ║
║  ────────────────────────────────────────────────────────    ║
║  TOTAL                   190        25          165           ║
║                                                              ║
║  Entrées attendues: +40   (2 commandes fournisseurs)         ║
║  Seuil de réapprovisionnement: 30   ✅ OK                    ║
║  Stock minimum: 10         Stock maximum: 250                ║
║                                                              ║
║  Valeur moyenne unitaire: 345,000 XAF                        ║
║  Valeur totale stock: 65,550,000 XAF                         ║
║                                                              ║
║  [ 📋 Voir mouvements ] [ 🔄 Transférer ] [ ✏️ Ajuster ]     ║
╚══════════════════════════════════════════════════════════════╝
```

### 10.4 Stock Movements Screen Filters

```
╔══════════════════════════════════════════════════════════════════╗
║  📦  Mouvements de Stock                                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Période  [01/01/2026] → [12/06/2026]                            ║
║  Entrepôt [Tous ▼]   Produit [Rechercher...]                     ║
║  Type     [PURCHASE_RECEIPT ▼  SALE ▼  ADJUSTMENT ▼  (multi)]   ║
║  Utilisateur [Tous ▼]  Succursale [Toutes ▼]                     ║
║  [ 🔍 Filtrer ]  [ 🔄 Réinitialiser ]  [ 📥 Exporter ]          ║
╠══════════════════════════════════════════════════════════════════╣
║  DATE         PRODUIT       ENTREPÔT    TYPE         QTÉ  COÛT   ║
║  12/06 10:31  Laptop Dell   WH-AKW      POS_SALE      -2  690k   ║
║  12/06 09:15  HP Toner 85A  WH-YDE      PURCHASE_REC  +20  18.5k ║
║  12/06 08:44  TV Samsung 43 WH-BON      TRANSFER_IN   +5  195k   ║
║  11/06 16:22  Clé USB 32GB  WH-AKW      SALE_DELIVERY -10  5.5k  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 11. BUSINESS RULES & VALIDATION

### 11.1 Inventory Rules

| Rule | Description |
|---|---|
| INV-001 | Stock quantity can NEVER be directly edited. All changes via movements. |
| INV-002 | SALE movement blocked if available stock < requested quantity (unless backorder enabled) |
| INV-003 | WRITE_OFF requires a mandatory reason + manager approval if value > 100,000 XAF |
| INV-004 | STOCK_ADJUSTMENT requires approval if abs(qty) > 10 OR value > 50,000 XAF |
| INV-005 | WAREHOUSE_TRANSFER must be confirmed by receiving warehouse before stock reflects |
| INV-006 | OPENING_STOCK can only be created once per product/warehouse (or via adjustment) |
| INV-007 | Inventory is negative stock: BLOCKED by default (configurable per product) |
| INV-008 | Low stock alert fires when physical <= reorderPoint |
| INV-009 | Out-of-stock alert fires when physical = 0 |
| INV-010 | Valuation method (FIFO/WACC) is set per product and cannot change if there is stock |

### 11.2 POS Rules

| Rule | Description |
|---|---|
| POS-001 | Only ONE open session per cashier per branch at a time |
| POS-002 | Opening float must be confirmed/counted before session is marked OPEN |
| POS-003 | Sales can only be created within an OPEN session |
| POS-004 | Cash entries (expense/income) require a session to be open |
| POS-005 | Variance <= 5,000 XAF → auto-approved; > 5,000 XAF → manager must approve |
| POS-006 | Session cannot be closed while there are unprocessed pending payments |
| POS-007 | Cash withdrawal at shift close must be recorded as CLOSING_WITHDRAWAL |
| POS-008 | Expenses > 50,000 XAF require a scanned receipt attachment |

### 11.3 Finance Rules

| Rule | Description |
|---|---|
| FIN-001 | Journal entries are auto-generated — never manually duplicated |
| FIN-002 | A posted journal entry CANNOT be edited; it can only be reversed |
| FIN-003 | Every journal entry must balance: totalDebit = totalCredit |
| FIN-004 | Tax lines are created automatically from the TaxEngine — never manually |
| FIN-005 | Account codes must match the configured SYSCOHADA chart |
| FIN-006 | Period locking: entries in a closed fiscal period require admin override |
| FIN-007 | Payment in a different currency must record the exchange rate |

### 11.4 Audit Rules

| Rule | Description |
|---|---|
| AUD-001 | Audit log entries are IMMUTABLE — no UPDATE, no DELETE |
| AUD-002 | Every write to: Product, Sale, Purchase, Payment, Inventory, User, Role → audit log |
| AUD-003 | Failed login attempts must be logged |
| AUD-004 | Permission denials must be logged |
| AUD-005 | All exports (PDF, Excel, CSV) must be logged with user and timestamp |
| AUD-006 | Stock adjustments require a mandatory reason field (min 10 chars) |

---

## 12. IMPLEMENTATION PLAN

### Phase 1 — Stock Ledger Foundation (Week 1–2)

**Objective:** Replace mutable inventory with a calculated stock ledger.

| Task | Files | Effort |
|---|---|---|
| Expand `MovementType` enum in schema | `prisma/schema.prisma` | 2h |
| Add fields to `InventoryMovement` | `prisma/schema.prisma` | 2h |
| Add `reorderPoint`, `safetyStock`, `isTracked` to Product | `prisma/schema.prisma` | 1h |
| Create `WarehouseTransfer` + `TransferLine` models | `prisma/schema.prisma` | 2h |
| Create `StockValuationSnapshot` model | `prisma/schema.prisma` | 1h |
| Write + run migration | `prisma/migrations/` | 1h |
| Implement `StockLedgerService` | `src/modules/inventory/stock-ledger.service.ts` | 8h |
| Refactor `InventoryService` to use ledger | `src/modules/inventory/inventory.service.ts` | 6h |
| Update `SalesService` to create movements | `src/modules/sales/sales.service.ts` | 4h |
| Update `PurchasesService` to create movements | `src/modules/purchases/purchases.service.ts` | 4h |
| Add `GET /inventory/products/:id/stock` API | `src/modules/inventory/` | 3h |
| Add warehouse transfer endpoints | `src/modules/inventory/transfer.controller.ts` | 5h |
| Unit tests for stock ledger | `src/modules/inventory/*.spec.ts` | 4h |
| **Frontend:** Product stock panel component | `frontend/src/components/StockPanel.tsx` | 4h |
| **Frontend:** Stock Movements screen | `frontend/src/app/(dashboard)/inventory/movements/` | 6h |
| **Frontend:** Warehouse Transfer screen | `frontend/src/app/(dashboard)/inventory/transfers/` | 6h |

**Total Phase 1: ~59h (~1.5 weeks)**

---

### Phase 2 — POS Cash Management (Week 3–4)

**Objective:** Full shift management, cash drawer, expenses, income, reconciliation.

| Task | Files | Effort |
|---|---|---|
| Add `PosSession`, `CashEntry` models to schema | `prisma/schema.prisma` | 3h |
| Write + run migration | `prisma/migrations/` | 1h |
| Implement `PosSessionService` | `src/modules/pos/pos-session.service.ts` | 8h |
| Implement `CashEntryService` | `src/modules/pos/cash-entry.service.ts` | 6h |
| Add session-aware sale creation | `src/modules/pos/pos.service.ts` | 4h |
| POS stock validation before checkout | `src/modules/pos/pos.service.ts` | 3h |
| Session API endpoints | `src/modules/pos/pos-session.controller.ts` | 4h |
| Cash entry API endpoints | `src/modules/pos/cash-entry.controller.ts` | 3h |
| **Frontend:** Shift Opening modal | `frontend/src/app/(dashboard)/pos/` | 4h |
| **Frontend:** Cash In / Cash Out modals | `frontend/src/app/(dashboard)/pos/` | 4h |
| **Frontend:** Expense entry screen | `frontend/src/app/(dashboard)/pos/expenses/` | 5h |
| **Frontend:** Income entry screen | `frontend/src/app/(dashboard)/pos/income/` | 4h |
| **Frontend:** Reconciliation screen | `frontend/src/app/(dashboard)/pos/reconciliation/` | 8h |
| **Frontend:** POS Session report | `frontend/src/app/(dashboard)/pos/reports/` | 5h |
| **Frontend:** POS sidebar update | `frontend/src/components/Sidebar.tsx` | 2h |

**Total Phase 2: ~64h (~1.5 weeks)**

---

### Phase 3 — Finance Auto-Integration (Week 5–6)

**Objective:** Auto-generate journal entries on every transaction.

| Task | Files | Effort |
|---|---|---|
| Add `TaxLine` model to schema | `prisma/schema.prisma` | 2h |
| Enhance `AuditLog` with new fields | `prisma/schema.prisma` | 1h |
| Implement `TaxEngine` service | `src/modules/finance/tax-engine.service.ts` | 8h |
| Implement `JournalEngine` service | `src/modules/finance/journal-engine.service.ts` | 12h |
| Wire journal engine to Sales events | `src/modules/sales/sales.service.ts` | 3h |
| Wire journal engine to Purchase events | `src/modules/purchases/purchases.service.ts` | 3h |
| Wire journal engine to POS events | `src/modules/pos/pos.service.ts` | 3h |
| Wire journal engine to Cash entries | `src/modules/pos/cash-entry.service.ts` | 2h |
| Account mapping configuration service | `src/modules/finance/account-mapping.service.ts` | 4h |
| Tax report API | `src/modules/finance/finance.controller.ts` | 4h |
| Trial balance API | `src/modules/finance/finance.controller.ts` | 3h |
| **Frontend:** Auto-journal viewer on transaction detail | Various pages | 6h |
| **Frontend:** Tax Report screen | `frontend/src/app/(dashboard)/finance/tax-report/` | 6h |
| **Frontend:** Account mapping settings screen | `frontend/src/app/(dashboard)/settings/` | 5h |

**Total Phase 3: ~62h (~1.5 weeks)**

---

### Phase 4 — Audit Trail & Security (Week 7)

**Objective:** Complete, immutable, searchable audit trail.

| Task | Files | Effort |
|---|---|---|
| Implement `AuditService` (injectable) | `src/common/audit/audit.service.ts` | 6h |
| Create `AuditInterceptor` (NestJS) | `src/common/audit/audit.interceptor.ts` | 4h |
| Register interceptor on all write endpoints | `src/app.module.ts` + decorators | 3h |
| Capture before/after state on updates | All services that modify data | 8h |
| Audit API endpoints with filters | `src/modules/audit/audit.controller.ts` | 4h |
| Audit export (CSV/PDF) | `src/modules/audit/audit.service.ts` | 4h |
| **Frontend:** Audit Trail screen | `frontend/src/app/(dashboard)/settings/audit/` | 8h |
| **Frontend:** Per-record change history modal | Reusable component | 5h |

**Total Phase 4: ~42h (~1 week)**

---

### Phase 5 — Low Stock Alerts & Inventory Reports (Week 8)

**Objective:** Proactive stock management and reporting.

| Task | Files | Effort |
|---|---|---|
| Low stock calculation query | `src/modules/inventory/stock-ledger.service.ts` | 3h |
| Alert generation service (on each movement) | `src/modules/inventory/stock-alert.service.ts` | 4h |
| Real-time notification (WebSocket) for low stock | `src/modules/notifications/` | 4h |
| Stock valuation (WACC algorithm) | `src/modules/inventory/valuation.service.ts` | 6h |
| Stock reconciliation report API | `src/modules/inventory/reconciliation.service.ts` | 4h |
| Inventory movement export (PDF/Excel/CSV) | `src/modules/reports/` | 5h |
| Valuation report export | `src/modules/reports/` | 4h |
| **Frontend:** Low Stock Alerts screen | `frontend/src/app/(dashboard)/inventory/alerts/` | 5h |
| **Frontend:** Stock Valuation screen | `frontend/src/app/(dashboard)/inventory/valuation/` | 5h |
| **Frontend:** Stock Reconciliation screen | `frontend/src/app/(dashboard)/inventory/reconciliation/` | 6h |
| **Frontend:** Dashboard enhancements (KPI widgets) | `frontend/src/app/(dashboard)/page.tsx` | 6h |

**Total Phase 5: ~52h (~1.5 weeks)**

---

### Phase 6 — Reports & Export (Week 9)

**Objective:** PDF, Excel, CSV for every module.

| Task | Effort |
|---|---|
| PDF report service (using pdfmake or puppeteer) | 8h |
| Sales report (PDF/Excel/CSV) | 4h |
| Purchases report (PDF/Excel/CSV) | 4h |
| Cash flow report (PDF/Excel/CSV) | 4h |
| Tax report (PDF/Excel/CSV) | 3h |
| Profitability report (PDF/Excel/CSV) | 4h |
| POS session report (PDF) | 3h |
| Warehouse activity report (PDF/Excel) | 3h |
| **Frontend:** Reports hub page with all exports | 6h |

**Total Phase 6: ~39h (~1 week)**

---

### Summary Timeline

```
Week 1–2:   Phase 1 — Stock Ledger Foundation      (~59h)
Week 3–4:   Phase 2 — POS Cash Management          (~64h)
Week 5–6:   Phase 3 — Finance Auto-Integration     (~62h)
Week 7:     Phase 4 — Audit Trail & Security       (~42h)
Week 8:     Phase 5 — Low Stock Alerts & Reports   (~52h)
Week 9:     Phase 6 — Reports & Export             (~39h)
─────────────────────────────────────────────────────────
TOTAL:      9 weeks · ~318 hours
```

### Priority Order (if phasing is required)

1. **CRITICAL — Phase 1** (Stock Ledger): Foundational. Without this, inventory is unreliable.
2. **HIGH — Phase 2** (POS Cash): Direct revenue impact. Cash traceability.
3. **HIGH — Phase 3** (Finance Integration): Compliance and audit requirement.
4. **MEDIUM — Phase 4** (Audit Trail): Required for ISO and regulatory compliance.
5. **MEDIUM — Phase 5** (Alerts & Valuation): Operational efficiency.
6. **LOW — Phase 6** (Reports): Enhances existing partial reporting.

---

## APPENDIX A — Movement Type → Journal Entry Mapping

| Movement Type | Debit Account | Credit Account |
|---|---|---|
| PURCHASE_RECEIPT | 311 Stocks | 401 Fournisseurs |
| PURCHASE_RETURN | 401 Fournisseurs | 311 Stocks |
| SALE_DELIVERY | 601 COGS | 311 Stocks |
| POS_SALE | 5711 Caisse | 701 Ventes + 4431 TVA |
| CUSTOMER_RETURN | 701 Ventes | 411 Clients (reverse) |
| STOCK_ADJUSTMENT_IN | 311 Stocks | 758 Produits divers |
| STOCK_ADJUSTMENT_OUT | 658 Charges div. | 311 Stocks |
| WAREHOUSE_TRANSFER_* | 311 WH dest. | 311 WH source |
| WRITE_OFF | 658 Pertes stocks | 311 Stocks |

---

## APPENDIX B — Role Permission Matrix for New Features

| Feature | Super Admin | Finance | Resp. Commercial | Resp. Achats | Resp. Stock | Caissier | Auditeur |
|---|---|---|---|---|---|---|---|
| Open POS Session | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | 👁 |
| Close POS Session | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | 👁 |
| Enter POS Expense | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | 👁 |
| Approve POS Variance | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 👁 |
| Create Stock Adjustment | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | 👁 |
| Approve Stock Adjustment | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | 👁 |
| Create Warehouse Transfer | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | 👁 |
| Post Journal Entry | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 👁 |
| View Audit Trail | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Export Any Report | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

Legend: ✅ Full access · 👁 Read only · ❌ No access

---

*Document version: 2.0 · Last updated: 2026-06-12 · Status: Ready for Sprint Planning*
