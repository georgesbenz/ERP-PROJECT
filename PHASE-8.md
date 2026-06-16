# PHASE 8 — Company Settings Audit & Enforcement

## Aperçu / Overview

Cette phase est pilotée par un audit PDF des paramètres société en 20 étapes, couvrant les exigences légales Cameroun/OHADA.
Elle transforme le module `settings` existant (Company, Branches, Roles, Taxes) en un module complet de gestion d'entreprise.

This phase was driven by a 20-step Company Settings Audit PDF covering Cameroon/OHADA legal requirements.
It transforms the existing settings module into a complete Company Management system.

---

## Résultats de l'Audit / Audit Findings

| Catégorie | Avant Phase 8 | Après Phase 8 |
|---|---|---|
| Infos générales | name, email, phone, address, currency, timezone | +tradingName, slogan, industry, dateEstablished, website, logo, description |
| Légal / Statutaire | taxNumber (basique) | RCCM, NIU, CNPS, Patente, n° Statistique, capital, forme juridique |
| Fiscalité | — | TVA activée/numéro, régime fiscal, centre des impôts |
| Adresse | address, city, country | +physicalAddress, postalAddress, district, subdivision, division, region, GPS |
| Contact | email, phone | +email2, phone2, whatsapp |
| Comptes bancaires | — | CRUD complet (banque, titulaire, n° compte, IBAN, SWIFT) |
| Représentants | — | CRUD (nom, titre, fonction, téléphone, email) |
| Documents officiels | — | CRUD (RCCM, NIU, Patente…) + suivi expiration |
| Numérotation | — | Séquences par type (Facture, Commande, BL, Reçu, Devis…) |
| Réseaux sociaux | — | Facebook, Instagram, Twitter, LinkedIn, YouTube, WhatsApp, TikTok |
| Comptabilité | — | OHADA, exercice fiscal (mois début/fin), méthode comptable |
| ERP | locale, timezone, currency | +language, dateFormat, timeFormat, decimalPrecision, multi-branch/warehouse/currency |
| Point de Vente | — | receiptSize, autoPrint, maxDiscount%, mandatoryCashOpen/Close, returnPolicyDays |
| Inventaire | — | lowStockThreshold, criticalStockThreshold, defaultValuationMethod |

---

## Nouvelles Fonctionnalités / New Features

### 1. Schéma de Base de Données / Schema

**Tenant model — ~35 nouveaux champs ajoutés :**
- Général : `tradingName`, `slogan`, `industry`, `dateEstablished`, `businessDescription`, `website`
- Contact : `email2`, `phone2`, `whatsapp`
- Adresse : `physicalAddress`, `postalAddress`, `district`, `subdivision`, `division`, `region`, `gpsCoordinates`
- Légal : `rccm`, `niu`, `taxId`, `cnps`, `patent`, `statisticalNumber`, `shareCapital`, `legalForm`
- Fiscalité : `vatEnabled`, `vatNumber`, `taxRegime`, `taxOffice`
- Comptabilité : `ohadaEnabled`, `fiscalYearStart`, `fiscalYearEnd`, `accountingMethod`
- ERP : `language`, `dateFormat`, `timeFormat`, `decimalPrecision`, `multiBranch`, `multiWarehouse`, `multiCurrency`
- POS : `receiptSize`, `autoPrint`, `maxDiscountPct`, `mandatoryCashOpen`, `mandatoryCashClose`, `returnPolicyDays`
- Inventaire : `lowStockThreshold`, `criticalStockThreshold`, `defaultValuationMethod`

**Nouveaux modèles / New models :**

| Modèle | Table | Description |
|---|---|---|
| `CompanyBankAccount` | `company_bank_accounts` | Comptes bancaires (banque, n° compte, IBAN, SWIFT, devise) |
| `CompanyRepresentative` | `company_representatives` | Représentants légaux (gérant, DG, PDG…) |
| `CompanyDocument` | `company_documents` | Documents officiels avec suivi expiration |
| `CompanyDocumentSequence` | `company_document_sequences` | Numérotation auto par type de document |
| `CompanySocialMedia` | `company_social_media` | Liens réseaux sociaux (unique par plateforme) |

---

### 2. Backend — Nouveaux Endpoints `/api/v1/settings`

| Méthode | Route | Description |
|---|---|---|
| PATCH | `/settings/company` | Mise à jour société (tous champs) |
| GET/POST | `/settings/bank-accounts` | Liste / créer compte bancaire |
| PATCH/DELETE | `/settings/bank-accounts/:id` | Modifier / supprimer |
| GET/POST | `/settings/representatives` | Liste / créer représentant |
| PATCH/DELETE | `/settings/representatives/:id` | Modifier / supprimer |
| GET/POST | `/settings/documents` | Liste / créer document officiel |
| PATCH/DELETE | `/settings/documents/:id` | Modifier / supprimer |
| GET | `/settings/document-sequences` | Liste des séquences de numérotation |
| PUT | `/settings/document-sequences` | Upsert (créer ou mettre à jour) une séquence |
| GET | `/settings/social-media` | Liste des réseaux sociaux |
| PUT | `/settings/social-media` | Upsert (créer ou mettre à jour) un réseau social |
| DELETE | `/settings/social-media/:id` | Supprimer un lien |

---

### 3. Frontend — Page Settings Reconstruite (18 onglets)

**Compte**
- **Mon Profil** — Informations utilisateur + Tenant ID

**Société**
- **Général** — Raison sociale, nom commercial, slogan, secteur, date création, site web, logo, description
- **Légal / Statut** — Forme juridique (SA/SARL/SAS…), RCCM, NIU, CNPS, Patente, n° Statistique, capital social
- **Fiscalité** — Toggle TVA, numéro TVA, régime fiscal, centre des impôts
- **Adresse** — Adresse physique, postale/BP, ville, arrondissement, département, région (10 régions Cameroun), GPS
- **Contact** — Email x2, Téléphone x2, WhatsApp
- **Comptes Bancaires** — CRUD : banque, titulaire, numéro, IBAN, SWIFT, agence, devise, défaut
- **Représentants** — CRUD : nom, titre, fonction, téléphone, email
- **Documents** — CRUD : intitulé, type, URL fichier, expiration (alerte rouge)
- **Numérotation** — Séquences pour 8 types de documents avec aperçu en temps réel (préfixe + padding)
- **Réseaux Sociaux** — 7 plateformes (Facebook, Instagram, Twitter, LinkedIn, YouTube, WhatsApp, TikTok)

**Paramètres ERP**
- **Comptabilité** — OHADA toggle, exercice fiscal (mois début/fin), méthode (droits constatés / trésorerie)
- **Général ERP** — Langue, devise, fuseau horaire, format date/heure, décimales, multi-agences/entrepôts/devises
- **Point de Vente** — Format reçu, impression auto, remise max, caisse obligatoire, jours retour
- **Inventaire** — Seuil stock bas / critique, méthode valorisation (FIFO/LIFO/CUMP)

**Organisation**
- **Agences** — CRUD branches (anciennement dans Company)
- **Rôles & Permissions** — Matrice de permissions (inchangée, enrichie avec module `expenses`)
- **Codes TVA** — CRUD codes TVA (préréglages adaptés Cameroun)

---

## Migration Base de Données / Database Migration

**Migration** : `20260616200000_company_settings`

```sql
-- Expand tenants table: ~35 new columns
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "tradingName" TEXT, ...

-- 5 new tables
CREATE TABLE "company_bank_accounts" (...);
CREATE TABLE "company_representatives" (...);
CREATE TABLE "company_documents" (...);
CREATE TABLE "company_document_sequences" (...);
CREATE TABLE "company_social_media" (...);
```

---

## Qualité du Code / Code Quality

`npx tsc --noEmit` — **0 erreurs** (backend et frontend).

Corrections appliquées :
- `createDocument` / `updateDocument` : utilise destructuring au lieu de `Record<string, unknown>` pour la compatibilité Prisma
- `updateCompany` : idem pour `dateEstablished`

---

## Fichiers Modifiés / Modified Files

### Backend
- `backend/prisma/schema.prisma` — Tenant étendu + 5 nouveaux modèles
- `backend/prisma/migrations/20260616200000_company_settings/migration.sql` — **NEW**
- `backend/src/modules/settings/dto/update-company.dto.ts` — ~70 champs optionnels
- `backend/src/modules/settings/dto/company-entities.dto.ts` — **NEW** (8 DTOs)
- `backend/src/modules/settings/settings.service.ts` — CRUD pour 5 nouvelles entités
- `backend/src/modules/settings/settings.controller.ts` — 14 nouveaux endpoints

### Frontend
- `frontend/src/services/settings.service.ts` — 6 nouvelles interfaces + 14 nouvelles méthodes API
- `frontend/src/app/(dashboard)/settings/page.tsx` — **REÉCRIT** — 18 onglets (anciens + 13 nouveaux)

---

*Phase 8 complète. Prête pour la prochaine phase.*
*Phase 8 complete. Ready for the next phase.*
