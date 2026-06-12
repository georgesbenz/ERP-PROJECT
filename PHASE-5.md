# PHASE 5 — FRONTEND DEVELOPMENT / DÉVELOPPEMENT FRONTEND

> **EN** — This phase builds the complete production-grade Next.js 14 frontend. Every architectural
> decision is explained: the App Router route groups, the API layer, state management, reusable
> UI components, authentication flow, real-time notifications, and responsive design.
>
> **FR** — Cette phase construit le frontend Next.js 14 complet et prêt pour la production. Chaque
> décision architecturale est expliquée : groupes de routes App Router, couche API, gestion d'état,
> composants UI réutilisables, flux d'authentification, notifications temps réel et design responsive.

---

## 0. WHAT WAS CREATED / CE QUI A ÉTÉ CRÉÉ

### New dependencies installed / Nouvelles dépendances installées

| Package | Purpose / Rôle |
|---|---|
| `lucide-react` | Icon library — 1 500+ consistent SVG icons |
| `recharts` | Chart library built on D3 — AreaChart, BarChart for analytics |
| `react-hook-form` | Performant forms with minimal re-renders |
| `@hookform/resolvers` | Connects react-hook-form to Zod validation schemas |
| `zod` | Schema declaration and validation — forms + API response types |
| `clsx` + `tailwind-merge` | Utility to merge Tailwind classes without conflicts |

### Files created / Fichiers créés

```
frontend/src/
├── lib/
│   ├── api.ts                  Axios instance + token interceptors + refresh logic
│   ├── socket.ts               Socket.io client — connect/disconnect/join-room
│   ├── utils.ts                cn(), formatCurrency(), formatDate(), getInitials()
│   └── providers.tsx           TanStack Query provider (updated)
│
├── store/
│   ├── auth.store.ts           Zustand persisted auth state (user + tokens)
│   └── notifications.store.ts  Zustand in-memory notification state
│
├── types/
│   └── models.ts               TypeScript interfaces for all 15+ domain entities
│
├── services/
│   ├── auth.service.ts         login, register, logout, me
│   ├── dashboard.service.ts    overview, recent-activity, audit-log
│   ├── inventory.service.ts    products, categories, warehouses, stock, movements
│   ├── sales.service.ts        customers, sales, confirm/cancel
│   ├── purchases.service.ts    suppliers, purchase orders, receive
│   ├── finance.service.ts      accounts, invoices, payments, taxes, journal entries
│   ├── crm.service.ts          leads, opportunities, pipelines, campaigns
│   ├── budgeting.service.ts    budget plans, departments, categories, approval
│   ├── analytics.service.ts    all analytics endpoints
│   └── notifications.service.ts notifications CRUD + unread count
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx          5 variants × 3 sizes + loading spinner
│   │   ├── Input.tsx           Label + error + left icon support
│   │   ├── Select.tsx          Dropdown with options array
│   │   ├── Card.tsx            Card + CardHeader + CardTitle + CardContent
│   │   ├── Badge.tsx           Semantic status badges + statusVariant() helper
│   │   ├── Table.tsx           Table + Thead + Tbody + Th + Td + Tr (clickable)
│   │   ├── Modal.tsx           Accessible modal with Escape-key close
│   │   ├── Spinner.tsx         Spinner + PageLoader (centered)
│   │   └── Pagination.tsx      Previous/Next + "X of Y pages" display
│   └── layout/
│       ├── AuthGuard.tsx       Client component: redirects to /login if not authenticated
│       ├── Sidebar.tsx         Fixed sidebar with nav + user chip + logout
│       └── Header.tsx          Page title + notification bell with unread badge
│
└── app/
    ├── page.tsx                Root → redirect /dashboard
    ├── (auth)/
    │   ├── layout.tsx          Auth shell (no sidebar)
    │   ├── login/page.tsx      Login form with Zod validation
    │   └── register/page.tsx   Register form (company + user)
    └── (dashboard)/
        ├── layout.tsx          Protected shell: AuthGuard + Sidebar + main
        ├── dashboard/page.tsx  10 KPI cards + 3 recent-activity columns
        ├── inventory/page.tsx  Product list + create modal + search
        ├── sales/page.tsx      Sales order list with status badges
        ├── purchases/page.tsx  Purchase order list with status badges
        ├── finance/page.tsx    Accounts + Invoices + Payments tabs
        ├── crm/page.tsx        Lead list + create + convert-to-customer
        ├── budgeting/page.tsx  Budget plans + submit/approve workflow
        ├── analytics/page.tsx  Revenue & cash-flow charts + inventory summary
        ├── users/page.tsx      User list with roles
        └── settings/page.tsx   Profile + tenant info
```

---

## 1. ARCHITECTURE CONCEPTS / CONCEPTS D'ARCHITECTURE

### EN — Why Next.js 14 App Router?

| Feature | Benefit |
|---|---|
| **Route Groups `(auth)` / `(dashboard)`** | Group routes under shared layouts without adding path segments. `/login` and `/register` share the auth shell; all other pages share the sidebar layout. |
| **Server Components by default** | Pages are rendered on the server unless `'use client'` is declared — reduces JS bundle sent to the browser. |
| **`'use client'` where needed** | Only components that use browser APIs (hooks, localStorage, socket events) are client-side. Static shells stay server-side. |
| **File-system routing** | Each `page.tsx` file maps to a URL — no separate router config to maintain. |
| **Layouts** | A layout wraps all its child pages — the sidebar renders once, not on every navigation. |

### FR — Pourquoi Next.js 14 App Router ?

| Fonctionnalité | Bénéfice |
|---|---|
| **Route Groups `(auth)` / `(dashboard)`** | Grouper les routes sous des layouts partagés sans ajouter de segments de chemin. |
| **Server Components par défaut** | Les pages sont rendues côté serveur sauf `'use client'` — réduit le bundle JS. |
| **`'use client'` où nécessaire** | Seuls les composants utilisant des APIs navigateur sont côté client. |
| **Routing système de fichiers** | Chaque `page.tsx` mappe vers une URL — pas de config de routeur séparée. |
| **Layouts** | Un layout enveloppe toutes ses pages enfant — la sidebar se rend une seule fois. |

---

## 2. FOLDER STRUCTURE / STRUCTURE DES DOSSIERS

```
frontend/src/
│
├── lib/            Pure utilities — no React, no business logic
├── store/          Global client state (auth + notifications)
├── types/          TypeScript entity interfaces matching the API
├── services/       One file per backend module — all API calls
├── components/
│   ├── ui/         Design system: reusable, domain-agnostic building blocks
│   └── layout/     App chrome: sidebar, header, auth guard
└── app/            Next.js App Router pages and layouts
```

### EN — Why separate `services/` from `components/`?

Components describe **what the UI looks like**. Services describe **how to talk to the API**. Mixing them creates components that are hard to test and impossible to reuse across pages. With this separation:
- A new page can call `inventoryService.listProducts()` without reimplementing the API call.
- The API base URL is configured in one place (`lib/api.ts`).
- Mocking in tests replaces only the service, not the entire component tree.

### FR — Pourquoi séparer `services/` et `components/` ?

Les composants décrivent **l'apparence de l'UI**. Les services décrivent **comment parler à l'API**. Les mélanger crée des composants difficiles à tester et impossibles à réutiliser. Avec cette séparation : une nouvelle page appelle `inventoryService.listProducts()` sans réimplémenter l'appel API.

---

## 3. API LAYER / COUCHE API — `src/lib/api.ts`

```
api (Axios instance)
  baseURL: NEXT_PUBLIC_API_URL   ← from .env.local
  
Request interceptor:
  → Reads accessToken from localStorage
  → Adds Authorization: Bearer <token> to every request

Response interceptor (401 handler):
  → On 401: attempts token refresh once (_retry flag prevents infinite loop)
  → On success: updates localStorage + retries original request
  → On failure: clears storage + redirects to /login
```

### EN — Why Axios over fetch?

- **Interceptors** — centralize auth token attachment and refresh logic. With `fetch`, this logic must be duplicated in every call.
- **Automatic JSON parsing** — no `.json()` call needed.
- **`_retry` flag** — prevents infinite 401→refresh→401 loops.
- **`withCredentials`** — easily set per-request for cookie-based auth if needed in the future.

### FR — Pourquoi Axios plutôt que fetch ?

- **Intercepteurs** — centralisent l'attachement du token et la logique de rafraîchissement.
- **Parsing JSON automatique** — pas besoin d'appeler `.json()`.
- **Flag `_retry`** — empêche les boucles infinies 401→refresh→401.

---

## 4. STATE MANAGEMENT / GESTION D'ÉTAT

### EN — Two-store Zustand architecture

| Store | Content | Persistence |
|---|---|---|
| `auth.store.ts` | `user`, `accessToken`, `refreshToken`, `isAuthenticated` | `localStorage` via `persist` middleware |
| `notifications.store.ts` | `notifications[]`, `unreadCount` | In-memory only (re-fetched on mount) |

**Why Zustand over Redux?**
- 3× less boilerplate — no actions, reducers, or selectors to define.
- `persist` middleware handles localStorage serialization automatically.
- Works perfectly with Next.js `'use client'` components.
- Selective subscriptions: `useAuthStore((s) => s.user)` only re-renders when `user` changes.

**Why TanStack Query for server state?**
- Automatic caching with `staleTime: 30s` — the same data is not re-fetched on every navigation.
- `invalidateQueries` after mutations — the list re-fetches automatically after a create.
- `isLoading` / `isError` states out of the box — no manual loading state management.

### FR — Architecture Zustand à deux stores

| Store | Contenu | Persistance |
|---|---|---|
| `auth.store.ts` | `user`, tokens, `isAuthenticated` | `localStorage` via middleware `persist` |
| `notifications.store.ts` | `notifications[]`, `unreadCount` | En mémoire uniquement |

**Pourquoi Zustand plutôt que Redux ?** 3× moins de boilerplate, `persist` middleware intégré, compatible Next.js `'use client'`.

**Pourquoi TanStack Query pour l'état serveur ?** Cache automatique, invalidation après mutations, états `isLoading`/`isError` intégrés.

---

## 5. AUTHENTICATION FLOW / FLUX D'AUTHENTIFICATION

```
User visits /dashboard
  └── AuthGuard (client component)
      └── useAuthStore → isAuthenticated?
          ├── NO  → router.replace('/login')  ← redirect before first render
          └── YES → render the page

User submits /login
  ├── authService.login(email, password) → POST /api/v1/auth/login
  ├── Response: { accessToken, refreshToken, user }
  ├── setTokens(accessToken, refreshToken)  → localStorage + Zustand
  ├── setUser(user)                         → Zustand
  └── router.push('/dashboard')

Subsequent API requests
  └── Axios interceptor → Authorization: Bearer <accessToken>

Access token expires (401)
  └── Axios interceptor → POST /api/v1/auth/refresh
      ├── OK  → new accessToken saved → original request retried
      └── FAIL → localStorage cleared → window.location = /login

Logout
  ├── POST /api/v1/auth/logout  → server clears refreshToken
  └── useAuthStore.logout()     → Zustand + localStorage cleared
```

### EN — Security considerations

- Access tokens are stored in **localStorage** (not cookies). This is simpler for SPAs but means XSS attacks could steal the token. The trade-off is acceptable for an internal enterprise ERP; for public-facing apps, HTTP-only cookies are safer.
- The refresh token is also in localStorage — same trade-off applies.
- Both tokens are cleared immediately on logout.

### FR — Considérations de sécurité

- Les access tokens sont stockés dans **localStorage** (pas les cookies). Compromis acceptable pour un ERP interne. Pour les apps publiques, les cookies HTTP-only sont plus sûrs.
- Les deux tokens sont immédiatement effacés à la déconnexion.

---

## 6. ROUTE GROUPS / GROUPES DE ROUTES

```
app/
├── (auth)/             Route group — NO path prefix added
│   ├── layout.tsx      Minimal shell (no sidebar)
│   ├── login/          → /login
│   └── register/       → /register
│
└── (dashboard)/        Route group — NO path prefix added
    ├── layout.tsx       AuthGuard + Sidebar + <main>
    ├── dashboard/       → /dashboard
    ├── inventory/       → /inventory
    ├── sales/           → /sales
    └── ...              etc.
```

### EN — Why route groups?

Without groups, the `/login` route would need to be outside the protected layout, requiring a separate layout file at the root. Route groups let us colocate the auth layout with auth pages and the dashboard layout with all feature pages — no messy conditional rendering in a single root layout.

### FR — Pourquoi les groupes de routes ?

Les groupes de routes permettent de coloquer le layout d'authentification avec ses pages et le layout du dashboard avec toutes ses pages — sans rendu conditionnel complexe dans un layout racine.

---

## 7. UI COMPONENT SYSTEM / SYSTÈME DE COMPOSANTS UI

### EN — Design principles

1. **Composition over inheritance** — `Card`, `CardHeader`, `CardContent` are composed, not extended.
2. **Prop-driven variants** — `<Button variant="danger">` not `<DangerButton>`. One component, many appearances.
3. **`cn()` utility** — `clsx` + `tailwind-merge` prevent class conflicts. `cn('px-4', conditional && 'px-6')` correctly resolves to just `px-6` when both are truthy.
4. **`forwardRef` on form elements** — `Input` and `Select` forward their ref so `react-hook-form`'s `register()` can attach to the native DOM element.
5. **No business logic** — components are pure presentation. Data fetching, state, and mutations live in page files.

### FR — Principes de conception

1. **Composition plutôt qu'héritage** — `Card`, `CardHeader`, `CardContent` sont composés, pas étendus.
2. **Variantes pilotées par props** — `<Button variant="danger">`, pas `<DangerButton>`.
3. **Utilitaire `cn()`** — `clsx` + `tailwind-merge` évitent les conflits de classes Tailwind.
4. **`forwardRef` sur les éléments de formulaire** — `Input` et `Select` forward leur ref pour `react-hook-form`.
5. **Pas de logique métier** — les composants sont purement de présentation.

### Component inventory / Inventaire des composants

| Component | Variants / Props | Key feature |
|---|---|---|
| `Button` | `primary` `secondary` `danger` `ghost` `outline` × `sm` `md` `lg` | `loading` prop shows spinner |
| `Input` | — | `label`, `error`, `leftIcon` |
| `Select` | — | `options: { value, label }[]` |
| `Card` | — | Composed: `CardHeader` + `CardTitle` + `CardContent` |
| `Badge` | `default` `success` `warning` `danger` `info` `purple` | `statusVariant(status)` auto-maps strings |
| `Table` | — | `Table` `Thead` `Tbody` `Th` `Td` `Tr` (clickable) |
| `Modal` | — | Backdrop click + Escape key close |
| `Pagination` | — | prev/next + "X of Y pages" |
| `Spinner` / `PageLoader` | — | Centered full-section loader |

### `statusVariant()` mapping

```typescript
'CONFIRMED' | 'ACTIVE' | 'APPROVED' | 'WON' | 'RECEIVED' → 'success'  (green)
'PENDING'   | 'DRAFT'  | 'NEW'      | 'ORDERED'          → 'warning'  (amber)
'CANCELLED' | 'LOST'   | 'INACTIVE' | 'CLOSED'           → 'danger'   (red)
'OPEN'      | 'CONTACTED' | 'QUALIFIED' | 'ON_HOLD'       → 'info'     (blue)
```

---

## 8. REAL-TIME NOTIFICATIONS / NOTIFICATIONS TEMPS RÉEL — `src/lib/socket.ts`

```
getSocket(tenantId)
  └── Creates Socket.io connection to /events namespace
  └── Joins tenant:<tenantId> room automatically on connect

joinUserRoom(userId)
  └── Emits 'join-user' → joins user:<userId> room
  └── Backend emitToUser() targets this room for personal notifications

Reconnection: 5 attempts with exponential backoff (socket.io default)
```

The `Header` component polls the unread count every 30 seconds via TanStack Query. When the Socket.io gateway emits a `notification` event, the `NotificationsStore` is updated in real-time via a socket listener (connected in the `Providers` wrapper — to be wired in a future iteration after the user connects).

---

## 9. FORM VALIDATION / VALIDATION DES FORMULAIRES

Every form uses the same pattern:

```typescript
// 1. Define schema with Zod
const schema = z.object({
  email: z.string().email('Invalid email'),
  unitPrice: z.coerce.number().min(0),
});
type FormData = z.infer<typeof schema>;

// 2. Connect to react-hook-form
const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});

// 3. Use in JSX — Input forwards errors automatically
<Input
  label="Email"
  error={errors.email?.message}
  {...register('email')}
/>
```

### EN — Why this stack?

- **Zod** — schema-first approach: the same schema validates forms AND can validate API responses.
- **react-hook-form** — uncontrolled inputs = no re-render per keystroke = better performance.
- **zodResolver** — bridges both libraries with a single `resolver` prop.
- **Error messages** — defined once in the schema, displayed in the Input component automatically.

### FR — Pourquoi cette stack ?

- **Zod** — approche schema-first : le même schéma valide les formulaires ET les réponses API.
- **react-hook-form** — inputs non contrôlés = aucun re-render par frappe = meilleures performances.

---

## 10. MODULE PAGES OVERVIEW / VUE D'ENSEMBLE DES PAGES DE MODULES

| Page | Route | Key features |
|---|---|---|
| Dashboard | `/dashboard` | 10 KPIs in 2 rows + recent sales/purchases/leads in parallel |
| Inventory | `/inventory` | Paginated product list + debounced search + create modal |
| Sales | `/sales` | Paginated sales list with status + totals |
| Purchases | `/purchases` | Paginated purchase order list + status |
| Finance | `/finance` | Chart of accounts cards + invoices + payments |
| CRM | `/crm` | Lead list + create + convert-to-customer action |
| Budgeting | `/budgeting` | Budget plans + DRAFT→submit→PENDING_APPROVAL→approve workflow |
| Analytics | `/analytics` | Revenue area chart + cash flow bar chart + inventory summary |
| Users | `/users` | User list with roles and login date |
| Settings | `/settings` | Current user profile + tenant ID |

---

## 11. RESPONSIVE DESIGN / DESIGN RESPONSIVE

All layouts use Tailwind's responsive prefixes:

```
Mobile (< 640px):    Single column, sidebar hidden (future: hamburger menu)
Tablet (640px–1024px): 2 columns for KPI grid
Desktop (≥ 1024px):  5 columns for KPI grid, full sidebar visible

Example — Dashboard KPI grid:
className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
```

The sidebar is always visible on desktop. Mobile sidebar (hamburger + slide-in drawer) is the next enhancement after the base feature set.

### FR — Design responsive

Tous les layouts utilisent les préfixes responsive de Tailwind. La sidebar est toujours visible sur desktop. Le tiroir mobile (hamburger + slide-in) est la prochaine amélioration.

---

## 12. HOW TO RUN / COMMENT EXÉCUTER

```bash
# 1. Copy the env file
cp frontend/.env.example frontend/.env.local
# Edit .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
#   NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# 2. Install dependencies (if not done)
cd frontend && npm install

# 3. Start in development mode
npm run dev
# App: http://localhost:3000

# 4. Build for production
npm run build && npm start
```

### Environment Variables / Variables d'environnement

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | Backend REST API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:4000` | Socket.io server URL (same as backend, different path) |

---

## 13. SCALABILITY PATTERNS / PATTERNS DE SCALABILITÉ

| Pattern | Implementation | Benefit |
|---|---|---|
| **TanStack Query caching** | `staleTime: 30s` per query | Same data is not re-fetched on every navigation |
| **Route groups** | `(auth)` / `(dashboard)` | Each group has its own layout — adding a new section doesn't affect others |
| **Service layer** | One file per backend module | New pages call existing services — no duplicated API logic |
| **Zustand slices** | Separate auth and notifications stores | Each store is imported only where needed — no global re-renders |
| **`invalidateQueries`** | After every mutation | Cache is always fresh without manual re-fetches |
| **Server Components** | Default in App Router | Static/server-rendered pages reduce client JS bundle |

---

## 14. ADDING A NEW MODULE PAGE / AJOUTER UNE NOUVELLE PAGE DE MODULE

```
1. Create the service:
   src/services/hr.service.ts  ← all API calls for the HR domain

2. Add types:
   src/types/models.ts  ← add HrEmployee, HrDepartment interfaces

3. Create the page:
   src/app/(dashboard)/hr/page.tsx

4. Add to the sidebar:
   src/components/layout/Sidebar.tsx  ← add { href: '/hr', label: 'HR', icon: Briefcase }
```

The new page automatically inherits:
- Authentication (AuthGuard on the layout)
- Sidebar navigation
- Header with notification bell
- All UI components (Button, Table, Modal, etc.)
- TanStack Query (Providers wrapper)

---

## 15. WHAT COMES NEXT / CE QUI VIENT ENSUITE

Phase 6 develops each **ERP module** in full depth:
- **Authentication module**: user invitation flow, password reset, 2FA
- **POS / Cash Register**: real-time cart, payment processing, receipt printing
- **Inventory**: low-stock alerts via Socket.io, barcode scanning, warehouse transfers
- **Sales**: full invoice generation, PDF export, payment recording
- **Purchases**: goods receipt, supplier evaluation
- **Accounting**: full journal entry UI, bank reconciliation, financial statements
- **Reporting**: PDF/Excel export, scheduled reports
- **Multi-company / Multi-branch**: company switcher, branch selector

Phase 6B adds:
- **CRM deep features**: activity timeline, meeting scheduler, campaign email sequences
- **Budgeting real-time**: live budget vs. actual comparison, spend alerts
- **Analytics AI-ready**: anomaly detection hooks, predictive forecast charts

La Phase 6 développe chaque **module ERP** en profondeur. La Phase 6B ajoute les fonctionnalités avancées CRM, budgétisation temps réel et analytique prête pour l'IA.
