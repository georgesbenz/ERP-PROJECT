# Phase 6 — ERP Module Development / Développement des modules ERP

## Overview / Vue d'ensemble

Phase 6 delivers the three remaining backend business modules (POS, Reports, Settings) and
their corresponding frontend pages, completing the full ERP feature surface.  
All new code is fully typed in TypeScript with zero `tsc --noEmit` errors at the end of the phase.

---

## Backend — New Modules / Modules backend

### 1. POS Module (`backend/src/modules/pos/`)

Point-of-sale checkout with atomic transaction guarantees.

**Files**
| File | Purpose |
|---|---|
| `dto/pos-checkout.dto.ts` | `PosItemDto`, `PosCheckoutDto` validated with `class-validator` |
| `pos.service.ts` | `checkout()`, `getSession()` |
| `pos.controller.ts` | `POST /pos/checkout`, `GET /pos/session` |
| `pos.module.ts` | NestJS module wiring |

**`checkout()` transaction sequence (Prisma `$transaction`)**
1. Validate all `productId`s exist in the tenant.
2. If `warehouseId` provided, verify each product has sufficient stock.
3. Create `Sale` with status `CONFIRMED` and server-computed totals.
4. Create `SaleLines` (one per item, with unit price, discount, tax, total).
5. Create `Payment` with status `COMPLETED`.
6. For each non-service product: create `InventoryMovement(OUT)` and decrement `Inventory.quantity`.
7. Return `{ sale, receipt }` where `receipt` is a structured print-ready object.

**`getSession()`** — returns `salesToday` (count of `POS-*` references today) and `revenueToday`.

---

### 2. Reports Module (`backend/src/modules/reports/`)

Five pre-built report types, all filtered by `tenantId`.

**Files**
| File | Purpose |
|---|---|
| `dto/report-query.dto.ts` | `ReportType` enum, `ReportGroupBy` enum, `ReportQueryDto` |
| `reports.service.ts` | Five report methods |
| `reports.controller.ts` | `GET /reports?type=...&startDate=...&endDate=...&groupBy=...` |
| `reports.module.ts` | NestJS module wiring |

**Report types**

| `type` | Description |
|---|---|
| `sales_by_period` | Revenue, count, and collected amounts grouped by day/week/month |
| `inventory_valuation` | Cost value and sale value of current stock per product/warehouse |
| `customer_aging` | Outstanding invoices bucketed: Current / 1–30 / 31–60 / 61–90 / Over 90 |
| `purchases_by_period` | PO count and total spend grouped by period |
| `profit_loss` | Gross revenue → tax → discounts → net revenue → COGS → gross profit + margin % |

---

### 3. Settings Module (`backend/src/modules/settings/`)

Tenant-scoped configuration: company profile, branch management, role and permission management.

**Files**
| File | Purpose |
|---|---|
| `dto/update-company.dto.ts` | `UpdateCompanyDto` (name, email, phone, address, city, country, currency, locale, timezone, logoUrl) |
| `dto/branch.dto.ts` | `CreateBranchDto`, `UpdateBranchDto` |
| `dto/role.dto.ts` | `CreateRoleDto`, `UpdateRoleDto`, `AssignPermissionsDto` |
| `settings.service.ts` | Company, Branch, Role, Permission methods |
| `settings.controller.ts` | Full REST endpoints (see below) |
| `settings.module.ts` | NestJS module wiring |

**REST endpoints**

| Method | Path | Action |
|---|---|---|
| `GET` | `/settings/company` | Get company profile |
| `PATCH` | `/settings/company` | Update company profile |
| `GET` | `/settings/branches` | List branches |
| `GET` | `/settings/branches/:id` | Get one branch |
| `POST` | `/settings/branches` | Create branch |
| `PATCH` | `/settings/branches/:id` | Update branch |
| `DELETE` | `/settings/branches/:id` | Soft-delete (sets `isActive = false`) |
| `GET` | `/settings/roles` | List roles with permissions |
| `GET` | `/settings/roles/:id` | Get one role |
| `POST` | `/settings/roles` | Create custom role |
| `PATCH` | `/settings/roles/:id` | Update role (blocks system roles) |
| `DELETE` | `/settings/roles/:id` | Delete role (blocks system roles) |
| `PUT` | `/settings/roles/:id/permissions` | Replace all permissions on a role |
| `GET` | `/settings/permissions` | List all available permissions |

**Business rules**
- System roles (`isSystem = true`) cannot be updated or deleted.
- `assignPermissions` replaces the full set atomically (`deleteMany` + `createMany` in transaction).
- Branch `DELETE` is a soft delete — sets `isActive = false`, never removes the row.

---

### `app.module.ts` update

`PosModule`, `ReportsModule`, and `SettingsModule` added to the `imports` array.

---

## Frontend — New Pages / Nouvelles pages

### Services layer

| File | Exports |
|---|---|
| `src/services/pos.service.ts` | `posService.checkout()`, `posService.getSession()`, `PosReceipt` interface |
| `src/services/reports.service.ts` | `reportsService.generate()`, `ReportType`, `ReportGroupBy` types |
| `src/services/settings.service.ts` | `settingsService.*` (full CRUD for company, branches, roles, permissions), `Branch`, `Role`, `Permission` interfaces |

---

### POS Page (`/pos`)

Full point-of-sale terminal UI.

**Layout**: two-panel split (3/5 left, 2/5 right).

**Left panel — Product grid**
- Session bar: today's sales count and revenue, refresh button.
- Search input filtering `GET /inventory/products?search=...` (30 results).
- Product cards: name, SKU, price, service/product badge. Click adds to cart.

**Right panel — Cart & checkout**
- Line items with +/– quantity controls and remove button.
- Subtotal and total.
- Payment method selector (Cash / Card / Mobile Money / Bank Transfer).
- Amount tendered input with live change calculation.
- "Charge $X" button triggers `POST /pos/checkout`.

**Receipt modal**
- Itemised lines, subtotal, tax, total, payment method, change.
- Print button (`window.print()`).
- Bilingual footer: "Thank you! / Merci !"

---

### Reports Page (`/reports`)

**Controls card**: report type selector, start date, end date, group-by selector
(shown only for period reports), "Run Report" button.

**Result panels** (rendered after API call):

| Report | Display |
|---|---|
| Sales by Period | Table: period, count, revenue, collected, confirmed |
| Inventory Valuation | Table: product, SKU, warehouse, qty, cost value, sale value |
| Customer Aging | 5 bucket summary cards + detailed table with status badges |
| Purchases by Period | Table: period, orders, total, received |
| Profit & Loss | Waterfall card: revenue → tax → discounts → net → COGS → gross profit + margin % |

---

### Settings Page (`/settings`)

Tab-based layout with left sidebar navigation.

**Tabs**

| Tab | Content |
|---|---|
| My Profile | Read-only profile card + tenant ID |
| Company | Editable form: name, email, phone, address, city, country, currency, timezone |
| Branches | CRUD table with create/edit modal; main branch delete is blocked |
| Roles & Permissions | Two-column: role list (left) + permission checkbox grid grouped by resource (right) |

**Roles logic**
- System roles display a lock badge; their permissions are read-only checkboxes.
- Saving permissions calls `PUT /settings/roles/:id/permissions` (full replacement).

---

### Customers Page (`/customers`)

Dedicated customer directory backed by `GET /sales/customers`.  
Features: search, paginated table (name, code, email, phone, status, created date),
create modal with Zod-validated form.

---

### Suppliers Page (`/suppliers`)

Dedicated supplier directory backed by `GET /purchases/suppliers`.  
Same pattern as Customers with an additional contact name field.

---

### Sidebar (`Sidebar.tsx`)

New nav items added:

| Route | Label | Icon |
|---|---|---|
| `/pos` | POS / Caisse | Monitor |
| `/customers` | Customers / Clients | UsersRound |
| `/suppliers` | Suppliers / Fournisseurs | Factory |
| `/reports` | Reports / Rapports | FileBarChart |

Total navigation items: 13 (Dashboard + 12 modules).

---

## TypeScript / Qualité du code

`npx tsc --noEmit` — **0 errors** at end of phase.

Fixes applied during development:
- `Pagination` component receives `meta: PaginationMeta` object, not individual `page`/`totalPages` props — corrected in Customers and Suppliers pages.
- `ProfileTab` typed with explicit `AuthUser | null` instead of inferred `useAuthStore` return type.
- Role badge iterator typed as `string` to satisfy strict implicit-any check.

---

## Phase 6 Deliverables Summary / Récapitulatif des livrables

| Deliverable | Status |
|---|---|
| POS backend module (checkout + receipt) | ✅ |
| Reports backend module (5 types) | ✅ |
| Settings backend module (company, branches, roles) | ✅ |
| `app.module.ts` updated | ✅ |
| POS frontend page | ✅ |
| Reports frontend page | ✅ |
| Settings frontend page (4 tabs) | ✅ |
| Customers dedicated page | ✅ |
| Suppliers dedicated page | ✅ |
| Sidebar updated (13 nav items) | ✅ |
| TypeScript strict — 0 errors | ✅ |

---

*Phase 6 complete. Ready for Phase 7.*  
*Phase 6 terminée. Prête pour la Phase 7.*
