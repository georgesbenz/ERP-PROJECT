# PHASE 4 — BACKEND DEVELOPMENT / DÉVELOPPEMENT BACKEND

> **EN** — This phase builds the complete production-grade NestJS backend. Every architectural
> decision is explained: module boundaries, cross-cutting concerns, security layers, real-time
> events, and scalability patterns. All code lives under `backend/src/`.
>
> **FR** — Cette phase construit le backend NestJS complet et prêt pour la production. Chaque
> décision architecturale est expliquée : frontières des modules, préoccupations transversales,
> couches de sécurité, événements temps réel et patterns de scalabilité. Tout le code réside
> sous `backend/src/`.

---

## 0. WHAT WAS CREATED / CE QUI A ÉTÉ CRÉÉ

| File / Fichier | Role / Rôle |
|---|---|
| `src/main.ts` | Bootstrap: Helmet, CORS, versioning, Swagger, ValidationPipe |
| `src/app.module.ts` | Root module — wires all features + global providers |
| `src/config/env.validation.ts` | Joi-based env var validation (fail-fast on startup) |
| `src/prisma/prisma.service.ts` | Prisma client as an injectable NestJS service |
| `src/health/health.controller.ts` | `GET /api/v1/health` — liveness probe for Docker/K8s |
| `src/common/**` | Guards, interceptors, filters, decorators, DTOs, types |
| `src/modules/auth/**` | JWT authentication + refresh tokens + RBAC |
| `src/modules/users/**` | User management (CRUD + role assignment) |
| `src/modules/inventory/**` | Products, categories, warehouses, stock movements |
| `src/modules/sales/**` | Customers, sales orders, line items, payments |
| `src/modules/purchases/**` | Suppliers, purchase orders, line items, receiving |
| `src/modules/finance/**` | Payments, invoices, chart of accounts, journal entries, taxes |
| `src/modules/crm/**` | Leads, opportunities, pipelines, campaigns |
| `src/modules/budgeting/**` | Budget plans, allocations, approval workflow |
| `src/modules/analytics/**` | KPIs, forecasts, revenue/expense/cash-flow summaries |
| `src/modules/notifications/**` | In-app notifications + Socket.io real-time gateway |
| `src/modules/dashboard/**` | Aggregated overview KPIs + recent activity feed |

---

## 1. ARCHITECTURE CONCEPTS / CONCEPTS D'ARCHITECTURE

### EN — Why NestJS?

NestJS is the only Node.js framework built around **enterprise patterns** from day one:
- **Dependency Injection** (DI) — services are loosely coupled and independently testable.
- **Module system** — each business domain is encapsulated with its own controllers, services, and
  DTOs. Modules can be lazy-loaded or extracted to a microservice without touching other code.
- **Decorator-based programming** — guards, interceptors, pipes, and filters attach cleanly to
  any route or class without polluting business logic.
- **Native TypeScript** — type safety at compile time reduces whole classes of runtime bugs.
- **First-class OpenAPI** — Swagger docs are auto-generated from decorators; no manual spec.

### FR — Pourquoi NestJS ?

NestJS est le seul framework Node.js conçu dès le départ autour des **patterns entreprise** :
- **Injection de dépendances (DI)** — services faiblement couplés, testables indépendamment.
- **Système de modules** — chaque domaine métier est encapsulé. Un module peut être extrait en
  microservice sans toucher aux autres.
- **Programmation par décorateurs** — guards, intercepteurs, pipes et filtres s'attachent
  proprement sans polluer la logique métier.
- **TypeScript natif** — la sécurité des types à la compilation élimine des classes entières de
  bugs à l'exécution.
- **OpenAPI de première classe** — les docs Swagger sont générées automatiquement depuis les
  décorateurs.

---

## 2. ENTRY POINT / POINT D'ENTRÉE — `src/main.ts`

```
bootstrap()
  ├── helmet()                          Security headers (XSS, HSTS, CSP…)
  ├── enableCors({ origin: CORS_ORIGIN })  Whitelist-only CORS
  ├── setGlobalPrefix('api')            All routes: /api/…
  ├── enableVersioning(URI, v1)         All routes: /api/v1/…
  ├── useGlobalPipes(ValidationPipe)    Whitelist + transform + forbidNonWhitelisted
  ├── SwaggerModule.setup('/api/docs')  Interactive API docs
  └── app.listen(PORT, '0.0.0.0')      Binds on all interfaces (required for Docker)
```

### EN — Key decisions

| Decision | Why |
|---|---|
| **Helmet** | Adds 11 security-related HTTP headers in one call (XSS protection, HSTS, no-sniff…) |
| **Strict CORS** | Only origins in `CORS_ORIGIN` env var can send credentialed requests |
| **URI versioning `/v1`** | Breaking changes go to `/v2` without removing `/v1`; clients are not forced to upgrade instantly |
| **`whitelist: true`** on ValidationPipe | Unknown DTO fields are silently stripped — protects against mass-assignment attacks |
| **`transform: true`** | Plain-object request bodies are auto-converted to typed DTO class instances |
| **Port `0.0.0.0`** | Required when running inside a Docker container so the port is reachable from outside |

### FR — Décisions clés

| Décision | Pourquoi |
|---|---|
| **Helmet** | Ajoute 11 en-têtes HTTP de sécurité en un seul appel |
| **CORS strict** | Seules les origines de `CORS_ORIGIN` peuvent envoyer des requêtes avec credentials |
| **Versioning URI `/v1`** | Les ruptures de compatibilité vont en `/v2` sans supprimer `/v1` |
| **`whitelist: true`** | Les champs inconnus dans les DTOs sont silencieusement supprimés — protection contre les attaques mass-assignment |
| **`transform: true`** | Les corps de requêtes sont convertis en instances de classes DTO typées |
| **Port `0.0.0.0`** | Requis dans Docker pour que le port soit accessible depuis l'extérieur |

---

## 3. FOLDER STRUCTURE / STRUCTURE DES DOSSIERS

```
backend/src/
│
├── main.ts                         # Bootstrap: security, versioning, Swagger
├── app.module.ts                   # Root module — all imports + global providers
│
├── config/
│   └── env.validation.ts           # Joi schema — app crashes fast if env is wrong
│
├── prisma/
│   ├── prisma.module.ts            # Exports PrismaService globally
│   └── prisma.service.ts           # Prisma client with lifecycle hooks
│
├── health/
│   └── health.controller.ts        # GET /health — Docker/K8s liveness probe
│
├── common/                         # Cross-cutting concerns (shared across all modules)
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser() — extracts user from JWT context
│   │   ├── permissions.decorator.ts    # @RequirePermissions('product:write') — RBAC
│   │   └── public.decorator.ts         # @Public() — bypasses JwtAuthGuard
│   ├── dto/
│   │   ├── api-response.dto.ts         # Uniform { data, meta, error } envelope
│   │   └── pagination.dto.ts           # page, limit, search + skip/take helpers
│   ├── filters/
│   │   └── all-exceptions.filter.ts    # Catches every thrown error → structured JSON
│   ├── guards/
│   │   ├── jwt-auth.guard.ts           # Global — verifies Bearer token (skips @Public)
│   │   └── permissions.guard.ts        # Checks @RequirePermissions against JWT roles
│   ├── interceptors/
│   │   ├── audit.interceptor.ts        # Writes AuditLog row for every write mutation
│   │   ├── logging.interceptor.ts      # Logs method + path + duration to stdout
│   │   └── response-transform.interceptor.ts  # Wraps every response in ApiResponse envelope
│   └── types/
│       ├── authenticated-request.type.ts  # Express Request extended with req.user
│       └── jwt-payload.type.ts            # Shape of the decoded JWT
│
└── modules/                        # Feature modules — one per business domain
    ├── auth/
    ├── users/
    ├── inventory/
    ├── sales/
    ├── purchases/
    ├── finance/
    ├── crm/
    ├── budgeting/
    ├── analytics/
    ├── notifications/
    └── dashboard/
```

### EN — Why this structure?

Each module folder contains only what belongs to that domain. No service in `sales/` imports from `finance/` directly — cross-domain communication goes through explicit service injection declared in each module's `imports` array. This enforces **domain boundaries** and makes the codebase maintainable as it grows.

### FR — Pourquoi cette structure ?

Chaque dossier de module ne contient que ce qui appartient à ce domaine. Aucun service dans `sales/` n'importe directement depuis `finance/` — la communication inter-domaines passe par une injection de service déclarée explicitement dans le tableau `imports` du module. Cela garantit les **frontières de domaine** et maintient la maintenabilité à mesure que la base de code grandit.

---

## 4. CROSS-CUTTING CONCERNS / PRÉOCCUPATIONS TRANSVERSALES

These components are declared **globally** in `app.module.ts` and apply automatically to every route in the application without any per-route configuration.

Ces composants sont déclarés **globalement** dans `app.module.ts` et s'appliquent automatiquement à chaque route de l'application sans configuration par route.

### 4.1 Global Guards / Guards globaux

```
JwtAuthGuard (APP_GUARD)
  └── Reads Bearer token from Authorization header
  └── Validates signature against JWT_ACCESS_SECRET
  └── Skips routes decorated with @Public()
  └── Populates req.user with { userId, tenantId, email, roles }

PermissionsGuard (APP_GUARD)
  └── Reads @RequirePermissions() metadata from the route handler
  └── Checks that req.user.roles includes a role with the required permission
  └── No-ops if @RequirePermissions() is absent (authenticated = sufficient)
```

**EN** — Guards run before any controller logic. By registering `JwtAuthGuard` as `APP_GUARD`, every endpoint is JWT-protected by default. Opt-out with `@Public()`. This is the **secure-by-default** principle: new routes are automatically protected.

**FR** — Les guards s'exécutent avant toute logique de contrôleur. En enregistrant `JwtAuthGuard` comme `APP_GUARD`, chaque endpoint est protégé par JWT par défaut. On désactive avec `@Public()`. C'est le principe **sécurisé par défaut** : les nouvelles routes sont automatiquement protégées.

### 4.2 Global Interceptors / Intercepteurs globaux

```
LoggingInterceptor
  └── Logs: [METHOD] /path → 200 in 42ms
  └── Provides observability without instrumenting individual services

ResponseTransformInterceptor
  └── Wraps every successful response: { data: <original>, meta?: <pagination> }
  └── Clients always receive a predictable envelope — no ad-hoc response shapes

AuditInterceptor
  └── Fires only on POST / PUT / PATCH / DELETE and only for authenticated users
  └── Writes one AuditLog row per mutation: action, entity, entityId, ip, userAgent
  └── Non-blocking: failures are caught and logged — never break the original request
```

### 4.3 Global Exception Filter / Filtre d'exceptions global

```
AllExceptionsFilter
  └── Catches: HttpException, PrismaClientKnownRequestError, Error
  └── Maps Prisma P2002 (unique) → 409 Conflict
  └── Maps Prisma P2025 (not found) → 404 Not Found
  └── Returns structured JSON: { statusCode, message, timestamp, path }
  └── Never leaks stack traces to the client in production
```

### 4.4 Decorators / Décorateurs

| Decorator | Usage | Effect |
|---|---|---|
| `@Public()` | Controller or route method | Bypasses `JwtAuthGuard` |
| `@CurrentUser()` | Method parameter | Injects typed `AuthenticatedUser` from request |
| `@RequirePermissions('res:action')` | Route method | `PermissionsGuard` enforces the permission |

---

## 5. MODULES IN DETAIL / MODULES EN DÉTAIL

### 5.1 Auth Module — `src/modules/auth/`

**EN** — Handles the full authentication lifecycle: tenant + user registration, login, JWT token issuance, refresh token rotation, logout, and profile retrieval.

**FR** — Gère le cycle de vie complet de l'authentification : inscription tenant + utilisateur, connexion, émission de jetons JWT, rotation des refresh tokens, déconnexion et récupération du profil.

#### API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Create tenant + first admin user |
| `POST` | `/api/v1/auth/login` | Public | Login → access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Refresh token | Get new access token |
| `POST` | `/api/v1/auth/logout` | JWT | Invalidate refresh token |
| `GET` | `/api/v1/auth/me` | JWT | Current user + roles + permissions |

#### Security Flow / Flux de sécurité

```
Register / Login
  ├── bcrypt.hash(password, 12)           Hash with cost 12 (slow for brute-force)
  ├── sign accessToken (15 min)           Short-lived — limits damage if stolen
  ├── sign refreshToken (7 days)          Long-lived — used ONLY to get new access tokens
  ├── bcrypt.hash(refreshToken, 12)       Refresh token is HASHED before DB storage
  └── Store hash in user.refreshToken     Raw token never persists in the database

Refresh
  ├── Verify refresh JWT (jwt-refresh strategy)
  ├── Load user from DB
  ├── bcrypt.compare(raw, stored hash)    Prevents replay if DB is compromised
  └── Issue new accessToken only          Refresh token is NOT rotated (simpler, secure enough)

Logout
  └── SET user.refreshToken = NULL        All sessions invalidated immediately
```

#### DTOs

| DTO | Fields |
|---|---|
| `RegisterDto` | `companyName`, `companySlug`, `firstName`, `lastName`, `email`, `password`, `currency?` |
| `LoginDto` | `email`, `password` |
| `RefreshTokenDto` | `refreshToken` |
| `AuthResponse` | `accessToken`, `refreshToken`, `user: { id, email, firstName, lastName, tenantId, roles }` |

---

### 5.2 Users Module — `src/modules/users/`

**EN** — Tenant-scoped user management. All queries are filtered by `tenantId` from the JWT — users can never see or modify data outside their tenant.

**FR** — Gestion des utilisateurs délimitée par tenant. Toutes les requêtes sont filtrées par `tenantId` issu du JWT — les utilisateurs ne peuvent jamais voir ni modifier des données en dehors de leur tenant.

#### API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/users` | List users (paginated + search) |
| `GET` | `/api/v1/users/:id` | Get user by ID |
| `POST` | `/api/v1/users` | Create user |
| `PATCH` | `/api/v1/users/:id` | Update user |
| `DELETE` | `/api/v1/users/:id` | Soft-delete user |
| `POST` | `/api/v1/users/:id/roles` | Assign role to user |
| `DELETE` | `/api/v1/users/:id/roles/:roleId` | Remove role from user |

---

### 5.3 Inventory Module — `src/modules/inventory/`

**EN** — Manages the product catalog, warehouse locations, real-time stock levels, and transactional stock movements. All stock mutations happen inside a Prisma transaction so the movement log and the stock counter are always consistent.

**FR** — Gère le catalogue produits, les entrepôts, les niveaux de stock en temps réel et les mouvements de stock transactionnels. Toutes les mutations de stock s'exécutent dans une transaction Prisma pour que le journal de mouvement et le compteur de stock soient toujours cohérents.

#### API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/inventory/products` | List products (paginated + search) |
| `GET` | `/api/v1/inventory/products/:id` | Get product + stock levels per warehouse |
| `POST` | `/api/v1/inventory/products` | Create product |
| `PATCH` | `/api/v1/inventory/products/:id` | Update product |
| `DELETE` | `/api/v1/inventory/products/:id` | Soft-delete product |
| `GET` | `/api/v1/inventory/categories` | List categories (tree) |
| `POST` | `/api/v1/inventory/categories` | Create category |
| `GET` | `/api/v1/inventory/warehouses` | List warehouses |
| `GET` | `/api/v1/inventory/stock` | Stock levels (paginated) |
| `POST` | `/api/v1/inventory/movements` | Record stock movement (IN/OUT/ADJUST/RETURN) |
| `GET` | `/api/v1/inventory/movements` | Movement history (paginated) |

#### Transactional Stock Movement / Mouvement de stock transactionnel

```typescript
prisma.$transaction(async (tx) => {
  // 1. Write the immutable movement record
  await tx.inventoryMovement.create({ ... });

  // 2. Upsert the running balance
  await tx.inventory.upsert({
    update: { quantity: { increment: delta } },
    create: { quantity: delta, ... },
  });
});
// If either write fails, BOTH are rolled back → no phantom stock
```

---

### 5.4 Sales Module — `src/modules/sales/`

**EN** — Customers and sales orders. A sale carries a header (customer, branch, dates, totals) and N line items. Totals are computed server-side from the lines — the client never sends pre-calculated totals to prevent manipulation.

**FR** — Clients et commandes de vente. Une vente porte un en-tête (client, succursale, dates, totaux) et N lignes. Les totaux sont calculés côté serveur depuis les lignes — le client n'envoie jamais de totaux précalculés pour éviter la manipulation.

#### API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/sales/customers` | List customers |
| `GET` | `/api/v1/sales/customers/:id` | Get customer |
| `POST` | `/api/v1/sales/customers` | Create customer |
| `PATCH` | `/api/v1/sales/customers/:id` | Update customer |
| `DELETE` | `/api/v1/sales/customers/:id` | Soft-delete customer |
| `GET` | `/api/v1/sales` | List sales (paginated) |
| `GET` | `/api/v1/sales/:id` | Get sale + lines + payments |
| `POST` | `/api/v1/sales` | Create sale with line items |
| `POST` | `/api/v1/sales/:id/confirm` | Confirm sale (DRAFT → CONFIRMED) |
| `POST` | `/api/v1/sales/:id/cancel` | Cancel sale |

#### Total Calculation / Calcul des totaux

```
For each line:
  base     = quantity × unitPrice × (1 − discount%)
  lineTax  = base × taxRate%
  lineTotal = base + lineTax

Sale:
  subtotal   = Σ base
  taxAmount  = Σ lineTax
  total      = subtotal + taxAmount
```

---

### 5.5 Purchases Module — `src/modules/purchases/`

**EN** — Mirrors the sales module for the procurement side: suppliers and purchase orders with the same line-item + totals pattern. Adding a `receivePurchase()` action transitions the PO to `RECEIVED` and stamps a `receivedDate`.

**FR** — Miroir du module ventes pour le côté approvisionnement : fournisseurs et bons de commande avec le même pattern lignes + totaux. L'action `receivePurchase()` fait passer le BC à l'état `RECEIVED` et horodate `receivedDate`.

#### API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET/POST` | `/api/v1/purchases/suppliers` | List / create suppliers |
| `GET/PATCH/DELETE` | `/api/v1/purchases/suppliers/:id` | Get / update / soft-delete |
| `GET/POST` | `/api/v1/purchases` | List / create purchase orders |
| `GET` | `/api/v1/purchases/:id` | Get PO + lines + payments |
| `POST` | `/api/v1/purchases/:id/receive` | Mark PO as received |

---

### 5.6 Finance Module — `src/modules/finance/`

**EN** — Double-entry accounting primitives: chart of accounts, journals, journal entries with debit/credit lines, invoices, payments, and taxes. All financial aggregation (profit/loss, balance sheet) is derived from journal entries.

**FR** — Primitives comptables en partie double : plan comptable, journaux, écritures comptables avec lignes débit/crédit, factures, paiements et taxes. Toutes les agrégations financières (compte de résultat, bilan) sont dérivées des écritures comptables.

#### API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/finance/accounts` | Chart of accounts (tree) |
| `GET/POST` | `/api/v1/finance/journal-entries` | List / create journal entries |
| `GET` | `/api/v1/finance/invoices` | List invoices |
| `GET` | `/api/v1/finance/invoices/:id` | Get invoice + payments |
| `GET/POST` | `/api/v1/finance/payments` | List / create payments |
| `GET` | `/api/v1/finance/taxes` | List active taxes |

---

### 5.7 CRM Module — `src/modules/crm/`

**EN** — Complete customer relationship management: leads flow through a pipeline of stages, can be converted to customers, generate opportunities, and track activities (calls, meetings, tasks, notes). Campaigns manage bulk outreach.

**FR** — Gestion complète de la relation client : les leads progressent dans un pipeline d'étapes, peuvent être convertis en clients, génèrent des opportunités et suivent les activités (appels, réunions, tâches, notes). Les campagnes gèrent les démarches en masse.

#### Lead Lifecycle / Cycle de vie d'un lead

```
NEW → CONTACTED → QUALIFIED → CONVERTED (→ Customer created)
                            → LOST
```

#### API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET/POST` | `/api/v1/crm/leads` | List / create leads |
| `GET/PATCH/DELETE` | `/api/v1/crm/leads/:id` | Get / update / soft-delete |
| `POST` | `/api/v1/crm/leads/:id/convert` | Convert lead → Customer |
| `GET/POST` | `/api/v1/crm/opportunities` | List / create opportunities |
| `GET/PATCH` | `/api/v1/crm/opportunities/:id` | Get / update opportunity |
| `GET` | `/api/v1/crm/pipelines` | List pipelines + stages |
| `GET` | `/api/v1/crm/campaigns` | List campaigns |

---

### 5.8 Budgeting Module — `src/modules/budgeting/`

**EN** — Enterprise budgeting with a formal approval workflow. A budget plan moves through statuses (`DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → CLOSED`). Every approval creates an immutable revision snapshot in `BudgetRevision` for audit purposes.

**FR** — Budgétisation d'entreprise avec un workflow d'approbation formel. Un plan budgétaire progresse à travers des statuts (`DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → CLOSED`). Chaque approbation crée un instantané de révision immuable dans `BudgetRevision` à des fins d'audit.

#### Approval Flow / Flux d'approbation

```
createPlan()         → status: DRAFT
submitForApproval()  → status: PENDING_APPROVAL, creates BudgetApproval{PENDING}
approvePlan()        → status: APPROVED
                       BudgetApproval → APPROVED
                       BudgetRevision snapshot created (immutable audit trail)
```

#### API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET/POST` | `/api/v1/budgeting/plans` | List / create budget plans |
| `GET` | `/api/v1/budgeting/plans/:id` | Get plan + allocations + approvals |
| `POST` | `/api/v1/budgeting/plans/:id/submit` | Submit for approval |
| `POST` | `/api/v1/budgeting/plans/:id/approve` | Approve plan |
| `GET` | `/api/v1/budgeting/categories` | Budget category tree |
| `GET` | `/api/v1/budgeting/departments` | Departments + cost centers |

---

### 5.9 Analytics Module — `src/modules/analytics/`

**EN** — Read-only aggregation endpoints. Analytics data is either pre-computed and stored in dedicated tables (`FinancialAnalytic`, `RevenueAnalytic`, etc.) or computed on-the-fly from live transactional data. Pre-computed tables are updated by background jobs (BullMQ, added in a later phase).

**FR** — Endpoints d'agrégation en lecture seule. Les données analytiques sont soit précalculées et stockées dans des tables dédiées (`FinancialAnalytic`, `RevenueAnalytic`, etc.), soit calculées à la volée depuis les données transactionnelles en direct. Les tables précalculées sont mises à jour par des tâches en arrière-plan (BullMQ, ajouté dans une phase ultérieure).

#### API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/analytics/financial` | Financial summary (last 12 periods) |
| `GET` | `/api/v1/analytics/revenue` | Revenue by period |
| `GET` | `/api/v1/analytics/expenses` | Expenses by period |
| `GET` | `/api/v1/analytics/cash-flow` | Cash flow forecast (next 24 months) |
| `GET` | `/api/v1/analytics/kpis` | KPI tracker records |
| `GET` | `/api/v1/analytics/forecasts` | Revenue/expense forecasts |
| `GET` | `/api/v1/analytics/goals` | Goal tracker |
| `GET` | `/api/v1/analytics/sales-summary` | Live: total sales, revenue, outstanding |
| `GET` | `/api/v1/analytics/inventory-summary` | Live: product count + low-stock alerts |

---

### 5.10 Notifications Module — `src/modules/notifications/`

**EN** — Two-channel notification system:
1. **Persistent** — notifications are stored in the database and fetched by the client on demand.
2. **Real-time push** — a Socket.io gateway broadcasts events instantly to connected clients.

**FR** — Système de notification à deux canaux :
1. **Persistant** — les notifications sont stockées en base et récupérées par le client à la demande.
2. **Push temps réel** — une gateway Socket.io diffuse instantanément les événements aux clients connectés.

#### Socket.io Gateway / Passerelle Socket.io

```
Namespace: /events

Client connects:
  └── Joins room tenant:<tenantId>  (broadcast to all users of a tenant)

Client emits 'join-user' { userId }:
  └── Joins room user:<userId>      (targeted personal notifications)

Server emits to user:
  └── gateway.emitToUser(userId, 'notification', payload)

Server emits to tenant:
  └── gateway.emitToTenant(tenantId, 'event', payload)
```

#### API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/notifications` | My notifications (paginated) |
| `GET` | `/api/v1/notifications/unread-count` | Unread badge count |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark one as read |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all as read |

---

### 5.11 Dashboard Module — `src/modules/dashboard/`

**EN** — Aggregates KPIs from multiple domains in parallel using `Promise.all()` — a single HTTP request returns a full dashboard payload without N+1 round-trips from the frontend.

**FR** — Agrège les KPIs de plusieurs domaines en parallèle avec `Promise.all()` — une seule requête HTTP renvoie un payload complet de tableau de bord sans N+1 aller-retours depuis le frontend.

#### API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/dashboard/overview` | KPIs: customers, products, sales MTD, revenue MTD, leads, opportunities… |
| `GET` | `/api/v1/dashboard/recent-activity` | Last 5 sales, purchases, leads |
| `GET` | `/api/v1/dashboard/audit-log` | Last 20 audit log entries |

#### Overview Response Shape

```json
{
  "totalCustomers": 142,
  "totalProducts": 89,
  "salesThisMonth": 34,
  "revenueThisMonth": "12500.00",
  "pendingPurchases": 3,
  "openLeads": 17,
  "openOpportunities": 8,
  "unreadNotifications": 5,
  "lowStockCount": 2,
  "activeBudgets": 4
}
```

---

## 6. SECURITY ARCHITECTURE / ARCHITECTURE DE SÉCURITÉ

### EN — Defense in Depth

The backend implements **defense in depth** — multiple independent security layers so that a bypass of one layer does not compromise the system.

### FR — Défense en profondeur

Le backend implémente la **défense en profondeur** — plusieurs couches de sécurité indépendantes pour que le contournement d'une couche ne compromette pas le système.

```
Layer 1: Network
  └── Nginx reverse proxy terminates TLS — the NestJS app never sees raw HTTPS
  └── Rate limiting: 100 requests / 60 seconds per IP (ThrottlerModule)

Layer 2: HTTP
  └── Helmet: X-Content-Type-Options, X-Frame-Options, HSTS, CSP, Referrer-Policy…
  └── CORS: only listed origins can send credentialed requests

Layer 3: Authentication
  └── JWT access token signed with HS256 + JWT_ACCESS_SECRET
  └── Access token TTL: 15 minutes (reduces window if stolen)
  └── Refresh token TTL: 7 days, hashed with bcrypt(cost=12) before storage
  └── @Public() must be explicit — all routes are protected by default

Layer 4: Authorization
  └── RBAC: roles are resolved from the JWT at request time (no extra DB call)
  └── @RequirePermissions('resource:action') for fine-grained control
  └── tenantId injected from JWT — never trusted from the request body

Layer 5: Input validation
  └── ValidationPipe whitelist: unknown fields stripped (mass-assignment protection)
  └── class-validator decorators on every DTO: type, length, format constraints
  └── Prisma parameterized queries: SQL injection is structurally impossible

Layer 6: Audit
  └── AuditInterceptor writes AuditLog for every POST/PUT/PATCH/DELETE
  └── IP address and User-Agent stored per entry
  └── Logs are append-only (no update/delete route exists)
```

### Multi-Tenancy Isolation / Isolation Multi-tenant

```typescript
// EVERY service method begins with:
const where = { tenantId, ...otherFilters };
// tenantId comes ONLY from req.user (JWT) — never from user input
// A tenant can never read another tenant's data even with a valid token
```

---

## 7. PAGINATION / PAGINATION

All list endpoints accept a consistent query string and return a consistent envelope.

Tous les endpoints de liste acceptent une query string cohérente et renvoient une enveloppe cohérente.

```
Query params:   ?page=1&limit=20&search=keyword

Response:
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

The `PaginationDto` computes `skip = (page - 1) * limit` internally so no controller ever does arithmetic.

Le `PaginationDto` calcule `skip = (page - 1) * limit` en interne, aucun contrôleur ne fait jamais d'arithmétique.

---

## 8. API RESPONSE ENVELOPE / ENVELOPPE DE RÉPONSE API

Every response — success or error — has the same top-level shape, enforced by `ResponseTransformInterceptor` and `AllExceptionsFilter`.

Chaque réponse — succès ou erreur — a la même forme de premier niveau, appliquée par `ResponseTransformInterceptor` et `AllExceptionsFilter`.

```
Success:
{
  "data": <payload>,       // the actual result
  "meta": <pagination?>    // present only for paginated lists
}

Error:
{
  "statusCode": 404,
  "message": "Product not found",
  "timestamp": "2026-06-08T10:30:00.000Z",
  "path": "/api/v1/inventory/products/abc"
}
```

---

## 9. SWAGGER / OPENAPI

The interactive API documentation is automatically available at runtime:

La documentation interactive de l'API est automatiquement disponible à l'exécution :

```
http://localhost:4000/api/docs
```

Every controller uses `@ApiTags()`, `@ApiOperation()`, and `@ApiBearerAuth()` so the Swagger UI shows grouped, documented, and authenticated endpoints. No separate OpenAPI spec file to maintain.

Chaque contrôleur utilise `@ApiTags()`, `@ApiOperation()` et `@ApiBearerAuth()` pour que le UI Swagger affiche des endpoints groupés, documentés et authentifiés. Aucun fichier de spec OpenAPI séparé à maintenir.

---

## 10. HOW TO RUN / COMMENT EXÉCUTER

### Prerequisites / Prérequis

```bash
# 1. Start infrastructure (PostgreSQL + Redis)
docker-compose up -d postgres redis

# 2. Copy environment file
cp backend/.env.example backend/.env
# Edit backend/.env: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# 3. Run database migrations
cd backend
npx prisma migrate dev --name init

# 4. Generate Prisma client (if not already generated)
npx prisma generate

# 5. Start the backend in development mode
npm run start:dev
# API: http://localhost:4000/api/v1
# Docs: http://localhost:4000/api/docs
```

### Environment Variables / Variables d'environnement

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@localhost:5432/erp` | Prisma connection string |
| `JWT_ACCESS_SECRET` | ✅ | 64+ random chars | Signs access tokens |
| `JWT_REFRESH_SECRET` | ✅ | 64+ different random chars | Signs refresh tokens |
| `JWT_ACCESS_TTL` | — | `900` (seconds) | Access token lifetime |
| `JWT_REFRESH_TTL` | — | `604800` (seconds) | Refresh token lifetime |
| `CORS_ORIGIN` | — | `http://localhost:3000` | Comma-separated allowed origins |
| `PORT` | — | `4000` | HTTP port |
| `REDIS_URL` | — | `redis://localhost:6379` | Used by BullMQ (Phase 6) |

---

## 11. SCALABILITY PATTERNS / PATTERNS DE SCALABILITÉ

### EN

| Pattern | Implementation | Benefit |
|---|---|---|
| **Stateless API** | No session state — JWT carries identity | Scale horizontally behind a load balancer |
| **Database connection pooling** | Prisma uses a connection pool | Handles concurrent requests without exhausting DB connections |
| **Soft deletes** | `deletedAt` timestamp instead of `DELETE` | Historical data preserved; queries filter with `deletedAt: null` |
| **Pagination everywhere** | All list queries use `skip/take` | Never loads unbounded result sets into memory |
| **Async-first** | All service methods are `async` | Node.js event loop is never blocked on I/O |
| **Module isolation** | Feature modules have no circular imports | Modules can be extracted to microservices as load demands it |
| **Event-ready** | `NotificationsGateway.emitToTenant()` exists | Any service can broadcast real-time events; BullMQ jobs added in Phase 6 |

### FR

| Pattern | Implémentation | Bénéfice |
|---|---|---|
| **API sans état** | Pas de session — le JWT porte l'identité | Scalabilité horizontale derrière un load balancer |
| **Pool de connexions DB** | Prisma utilise un pool de connexions | Gère les requêtes concurrentes sans épuiser les connexions |
| **Suppressions douces** | Horodatage `deletedAt` au lieu de `DELETE` | Données historiques préservées |
| **Pagination partout** | Toutes les listes utilisent `skip/take` | Jamais de résultats non bornés en mémoire |
| **Async-first** | Toutes les méthodes sont `async` | La boucle événementielle Node.js n'est jamais bloquée |
| **Isolation des modules** | Pas d'imports circulaires entre modules | Les modules peuvent être extraits en microservices |
| **Prêt pour les événements** | `emitToTenant()` existe déjà | Tout service peut diffuser des événements temps réel |

---

## 12. ENTERPRISE BEST PRACTICES / BONNES PRATIQUES ENTREPRISE

### EN

1. **Fail fast** — `env.validation.ts` validates all required environment variables on startup. The app refuses to start rather than running in a broken state.
2. **Consistent error codes** — `AllExceptionsFilter` maps Prisma errors to standard HTTP codes. Clients get `409` for duplicate records, `404` for not-found — not raw database error messages.
3. **Never trust client totals** — Prices, taxes, and totals are always re-computed server-side from stored unit prices and rates.
4. **Idempotent reference generation** — Sales references (`SALE-000001`) and PO references (`PO-000001`) are generated server-side; the client never provides them.
5. **Append-only audit** — `AuditLog` has no update or delete endpoint. Past actions cannot be erased.
6. **Single source of truth for identity** — `tenantId` and `userId` come exclusively from the validated JWT, never from request body or query params.
7. **DTO as the API contract** — DTOs use `class-validator` and `class-transformer` decorators. The DTO is the single place where input validation rules live; no validation logic is scattered in services.
8. **Soft deletes everywhere** — Records are never hard-deleted in production. `deletedAt: null` filters are applied consistently. This enables data recovery and preserves relational integrity.

### FR

1. **Échec rapide** — `env.validation.ts` valide toutes les variables d'environnement au démarrage. L'app refuse de démarrer plutôt que de fonctionner dans un état cassé.
2. **Codes d'erreur cohérents** — `AllExceptionsFilter` mappe les erreurs Prisma en codes HTTP standards.
3. **Ne jamais faire confiance aux totaux du client** — Prix, taxes et totaux sont toujours recalculés côté serveur.
4. **Génération de références idempotente** — Les références ventes et BC sont générées côté serveur.
5. **Audit en ajout seul** — `AuditLog` n'a pas d'endpoint de mise à jour ou de suppression. Les actions passées ne peuvent pas être effacées.
6. **Source de vérité unique pour l'identité** — `tenantId` et `userId` viennent exclusivement du JWT validé.
7. **DTO comme contrat API** — Les règles de validation des entrées résident dans les DTOs uniquement.
8. **Suppressions douces partout** — Les enregistrements ne sont jamais supprimés physiquement en production.

---

## 13. ADDING A FUTURE MODULE / AJOUTER UN FUTUR MODULE

**EN** — The pattern for adding any new business domain (e.g., `hr`, `payroll`):

**FR** — Le pattern pour ajouter un nouveau domaine métier (ex. `hr`, `paie`) :

```bash
# 1. Generate the module scaffold
cd backend
nest g module modules/hr
nest g service modules/hr
nest g controller modules/hr

# 2. Create DTOs in src/modules/hr/dto/

# 3. Add to app.module.ts imports array

# 4. Add Prisma models to schema.prisma → run migration
npx prisma migrate dev --name add_hr_module
```

The new module automatically inherits:
- JWT authentication (global guard)
- Audit logging (global interceptor)
- Response envelope (global interceptor)
- Error handling (global filter)
- Swagger docs (auto-generated from decorators)

Le nouveau module hérite automatiquement de : authentification JWT, audit logging, enveloppe de réponse, gestion des erreurs, docs Swagger.

---

## 14. WHAT COMES NEXT / CE QUI VIENT ENSUITE

Phase 5 builds the **Next.js 14 frontend** that consumes this API:
- Authentication flow (login/register with JWT storage)
- Protected route layout with sidebar navigation
- Dashboard page consuming `/api/v1/dashboard/overview`
- Module pages: Inventory, Sales, Purchases, Finance, CRM, Budgeting, Analytics
- Real-time notification bell using the Socket.io `/events` gateway
- TailwindCSS responsive design (mobile-first, iOS/Android via web)

La Phase 5 construit le **frontend Next.js 14** qui consomme cette API :
- Flux d'authentification (login/register avec stockage JWT)
- Layout de routes protégées avec navigation latérale
- Page dashboard consommant `/api/v1/dashboard/overview`
- Pages modules : Inventaire, Ventes, Achats, Finance, CRM, Budgétisation, Analytique
- Cloche de notifications temps réel via la gateway Socket.io `/events`
- Design responsive TailwindCSS (mobile-first, iOS/Android via web)
