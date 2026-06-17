# Phase 12 — Feature Completion

## EN — English

### Overview
Phase 12 implements all remaining features from the original ERP specification that were not covered in Phases 1–11.

---

### 1. Password Reset Flow
**Backend:** `auth.service.ts`, `auth.controller.ts`, DTOs `forgot-password.dto.ts`, `reset-password.dto.ts`  
**Frontend:** `/forgot-password`, `/reset-password`, link added to login page  
**Schema:** `passwordResetToken String? @unique`, `passwordResetExpiry DateTime?` added to User model

- `POST /auth/forgot-password` — generates SHA-256 hashed token, stores expiry (1 hour), logs reset URL to console in dev mode
- `POST /auth/reset-password` — validates token hash + expiry, hashes new password, clears token + refresh token
- Reset URL format: `{FRONTEND_URL}/reset-password?token={rawToken}`

---

### 2. POS — Multi-Payment + Barcode Scanner + Loyalty Points
**Backend:** `pos.service.ts`, `pos.controller.ts`, `dto/pos-checkout.dto.ts`  
**Frontend:** `/pos/page.tsx`, `services/pos.service.ts`

**Multi-payment:**
- Checkout now accepts `payments: [{ method, amount }]` array instead of single `paymentMethod`/`paymentAmount`
- Frontend shows dynamic split-payment rows (add/remove rows per method)
- Change calculated only on CASH portion

**Barcode scanner:**
- Global keydown listener buffers characters (< 300ms between keystrokes = scan)
- On Enter: searches loaded products by SKU match → adds 1 unit to cart
- Falls back to triggering search field for unrecognized barcodes
- Status indicator "Scan ready" shown in session bar

**Loyalty points:**
- Customer search dropdown shows point balance
- Redemption input (1 point = 1 FCFA discount, capped at customer balance)
- Receipt shows `loyaltyDiscount` and `loyaltyPointsEarned`
- Award rate: 1 point per 100 FCFA spent

---

### 3. Customer AR Aging + WhatsApp
**Frontend:** `/customers/page.tsx`

- WhatsApp button (click-to-chat via `wa.me/`) on each customer row when phone is present
- History modal now has two tabs: **Sales History** and **AR Aging**
- AR Aging tab shows:
  - Credit limit / credit balance KPIs
  - Loyalty points balance with FCFA equivalent
  - Aging buckets: 0–30j, 31–60j, 61–90j, 90j+
  - Outstanding invoices table with age in days

---

### 4. Supplier WhatsApp Buttons
**Frontend:** `/suppliers/page.tsx`

- WhatsApp click-to-chat button on each supplier row when phone is present

---

### 5. Analytics Reports — 4 New Tabs
**Backend:** `reports.service.ts`, `reports.controller.ts`  
**Frontend:** `/reports/page.tsx`, `services/reports.service.ts`

New endpoints (all require `analytics:READ`):
- `GET /reports/employees` — sales count + revenue grouped by user (creator)
- `GET /reports/branches` — sales count + revenue grouped by branch with % share
- `GET /reports/tax` — VAT collected by tax rate bucket (taxable HT + TVA)
- `GET /reports/margin` — gross margin per product (revenue, cost, gross, margin%)

Frontend: `AnalyticsSection` component at top of Reports page with date filter + 4 tabs.

---

### 6. Inventory Cycle Count (Inventaire physique)
**Backend:** `stock.service.ts`, `stock.controller.ts`  
**Frontend:** `/stock/count/page.tsx`, `services/stock.service.ts`

- `GET /stock/counts` — list all cycle counts
- `POST /stock/counts` — create new count (auto-generates lines from current inventory)
- `GET /stock/counts/:id` — get count with lines
- `PATCH /stock/counts/:id/lines/:lineId` — update `countedQty`, auto-computes `variance`
- `PATCH /stock/counts/:id/complete` — validate all lines counted, set COMPLETED

UI: list view + slide-over detail panel with inline quantity editing.

---

### 7. Smart Reorder Suggestions
**Backend:** `stock.service.ts`  
**Frontend:** `/stock/reorder/page.tsx`

- `GET /stock/reorder-suggestions` — products with `quantity <= minStock`
- Calculates 30-day velocity from `inventoryMovement` (type=OUT)
- Suggested quantity = `max(minStock * 1.5 - currentQty, velocity * 14 days)`
- Urgency: CRITICAL (qty=0), HIGH (qty < minStock/2), MEDIUM (otherwise)
- Estimated cost = suggestedQty × costPrice

---

### 8. AI Assistant
**Backend:** `modules/assistant/` (new module)  
**Frontend:** `/assistant/page.tsx`, `services/assistant.service.ts`

- `POST /assistant/chat` — proxies to Anthropic API (claude-haiku-4-5-20251001)
- Requires `ANTHROPIC_API_KEY` env var; throws 503 if not configured
- ERP/SAFIRA system prompt with OHADA/Cameroon context
- Frontend: full chat UI with quick-prompt suggestions, bounce animation while loading

---

### 9. Sidebar Navigation Updates
New links added to stock group and main nav:
- `/stock/count` — Inventaire physique (ClipboardList icon)
- `/stock/reorder` — Réapprovisionnement (ShoppingBag icon)
- `/assistant` — Assistant IA (Sparkles icon, no permission required)

Translation keys added (EN + FR) for all three.

---

### Infrastructure
- `prisma db push` run to add `passwordResetToken`/`passwordResetExpiry` to users table
- `ANTHROPIC_API_KEY` env var needed in backend for AI assistant
- `FRONTEND_URL` env var used for password reset link generation

---

## FR — Français

### Vue d'ensemble
La Phase 12 implémente toutes les fonctionnalités restantes du cahier des charges initial qui n'avaient pas été couvertes dans les Phases 1 à 11.

---

### 1. Réinitialisation du mot de passe
**Backend :** `auth.service.ts`, DTOs `forgot-password.dto.ts`, `reset-password.dto.ts`  
**Frontend :** `/forgot-password`, `/reset-password`, lien ajouté à la page de connexion  
**Schéma :** champs `passwordResetToken` et `passwordResetExpiry` ajoutés au modèle User

- Token SHA-256, expiration 1 heure, URL de réinitialisation loguée en console (dev)
- En production : remplacer le log par un appel à un service d'email

---

### 2. PDV — Paiement multiple + Scanner code-barres + Fidélité
**Backend :** `pos.service.ts`, `dto/pos-checkout.dto.ts`  
**Frontend :** `/pos/page.tsx`

- **Paiement fractionné** : tableau de paires `{méthode, montant}` — supporte cash + Mobile Money + carte en même vente
- **Scanner code-barres** : détection automatique par cadence de frappe (<300ms) → ajout au panier par SKU
- **Points de fidélité** : 1 point = 1 FCFA de remise, plafonnée au solde du client. Gain : 1 point / 100 FCFA

---

### 3. Aging AR clients + WhatsApp
**Frontend :** `/customers/page.tsx`

- Bouton WhatsApp sur chaque ligne client (si numéro présent)
- Modal historique avec 2 onglets : Historique des ventes + AR Aging
- Onglet AR Aging : solde crédit, points fidélité, paniers 0–30j / 31–60j / 61–90j / 90j+, liste des factures en attente

---

### 4. WhatsApp fournisseurs
**Frontend :** `/suppliers/page.tsx`

- Bouton WhatsApp sur chaque ligne fournisseur

---

### 5. Rapports analytiques — 4 nouveaux onglets
**Backend :** endpoints `/reports/employees`, `/reports/branches`, `/reports/tax`, `/reports/margin`  
**Frontend :** composant `AnalyticsSection` en haut de la page Rapports

- **Ventes par employé** : nombre de ventes + CA + CA moyen
- **Ventes par agence** : nombre de ventes + CA + part du total (%)
- **Rapport TVA** : montant HT + TVA collectée par taux
- **Marge brute** : CA, coût, marge brute, % marge par produit

---

### 6. Inventaire physique (Cycle Count)
**Backend :** `stock.service.ts` — CRUD complet  
**Frontend :** `/stock/count/page.tsx`

- Création automatique des lignes depuis le stock actuel
- Saisie des quantités comptées avec calcul automatique de l'écart
- Validation finale : statut COMPLETED

---

### 7. Suggestions de réapprovisionnement
**Backend :** `/stock/reorder-suggestions`  
**Frontend :** `/stock/reorder/page.tsx`

- Produits sous seuil minimum, triés par urgence (CRITIQUE / URGENT / MOYEN)
- Vélocité sur 30 jours, quantité suggérée, coût estimé

---

### 8. Assistant IA
**Backend :** module `/assistant/` — proxy Anthropic  
**Frontend :** `/assistant/page.tsx`

- Interface de chat avec historique (20 derniers messages)
- Suggestions rapides : TVA Cameroun, marge brute, réapprovisionnement, inventaire
- Nécessite `ANTHROPIC_API_KEY` dans l'environnement backend

---

### 9. Navigation (Sidebar)
Nouveaux liens : Inventaire physique, Réapprovisionnement, Assistant IA.  
Clés de traduction ajoutées en anglais et en français.
