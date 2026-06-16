# PHASE 6B — CRM & Budgétisation Temps Réel / Real-Time CRM & Budgeting

## Aperçu / Overview

Cette phase transforme les modules CRM et Budgétisation de squelettes fonctionnels en systèmes complets, temps réel,
profondément intégrés avec les ventes, les achats, la comptabilité, les prévisions et les tableaux de bord analytiques.

This phase transforms the CRM and Budgeting modules from functional skeletons into complete, real-time systems
deeply integrated with sales, purchases, accounting, forecasting, and analytics dashboards.

---

## Architecture CRM / CRM Architecture

### Concept

Le CRM est structuré autour de cinq entités clés interconnectées :

| Entité | Rôle |
|---|---|
| Lead | Prospect entrant, scoré, converti en Client |
| Opportunity | Affaire commerciale dans un pipeline par étapes |
| CrmActivity | Journalisation de chaque interaction (appel, email, réunion, tâche, note) |
| Campaign | Campagne marketing multi-canal ciblant des clients |
| Pipeline / PipelineStage | Entonnoir de vente configurable avec étapes ordonnées |

### Flux Temps Réel / Real-Time Flow

```
Lead créé          → socket event : crm:lead-created          → dashboard refresh
Lead converti      → socket event : crm:lead-converted        → client créé auto
Opportunité déplacée → socket event : crm:opportunity-stage-changed → kanban refresh
Activité créée     → socket event : crm:activity-created      → journal refresh
Campagne lancée    → socket event : crm:campaign-launched     → status ACTIVE
```

Tous les événements sont émis via `NotificationsGateway.emitToTenant(tenantId, event, data)`
sur le namespace Socket.io `/events` — les clients rejoignent la room `tenant:{id}` à la connexion.

---

## Backend CRM — Nouveaux Endpoints / New Endpoints

### Activités / Activities

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/crm/activities` | crm:READ | Liste paginée, filtrable par `leadId` ou `opportunityId` |
| POST | `/crm/activities` | crm:CREATE | Créer une activité (EMAIL, CALL, MEETING, TASK, NOTE) |
| PATCH | `/crm/activities/:id/complete` | crm:UPDATE | Marquer terminée |
| DELETE | `/crm/activities/:id` | crm:DELETE | Supprimer |

### Opportunités — Déplacement d'étape / Stage Move

| Méthode | Route | Permission | Description |
|---|---|---|---|
| PATCH | `/crm/opportunities/:id/stage` | crm:UPDATE | Déplace l'opportunité vers un nouveau `stageId`, émet socket event |

### Campagnes / Campaigns

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/crm/campaigns` | crm:READ | Liste paginée avec compteur de contacts |
| GET | `/crm/campaigns/:id` | crm:READ | Détail + contacts |
| POST | `/crm/campaigns` | crm:CREATE | Créer (DRAFT) |
| PATCH | `/crm/campaigns/:id/launch` | crm:UPDATE | Lancer → status ACTIVE, émet socket |

### Métriques / Metrics

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/crm/metrics` | crm:READ | Entonnoir leads, taux de gain, valeur pipeline, activités du jour |

**Réponse `/crm/metrics` :**
```json
{
  "leadFunnel": { "NEW": 12, "CONTACTED": 8, "QUALIFIED": 5, "CONVERTED": 3, "LOST": 2 },
  "opportunities": {
    "total": 18, "open": 12, "won": 4, "lost": 2,
    "winRate": 22, "totalValue": 4500000, "wonValue": 980000
  },
  "activitiesToday": 7
}
```

### Pipelines — Enrichi / Enriched

`GET /crm/pipelines` retourne maintenant les opportunités imbriquées par pipeline + leurs stages,
permettant le rendu direct du Kanban sans appel supplémentaire.

---

## Architecture Budgétisation / Budgeting Architecture

### Concept

Le système budgétaire suit un flux : **Brouillon → Soumis → Approuvé / Rejeté → Actif → Clôturé**

Chaque plan peut être décomposé en **allocations** par catégorie et par période.
Le rapport de **variance** compare les montants alloués aux réalisés tirés des ventes et achats réels.

### Flux Temps Réel / Real-Time Flow

```
Plan approuvé  → socket event : budget:plan-approved  → notification équipe
Plan rejeté    → socket event : budget:plan-rejected  → notification demandeur
```

---

## Backend Budgeting — Nouveaux Endpoints / New Endpoints

### Allocations

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/budgeting/plans/:planId/allocations` | budgeting:READ | Liste des allocations du plan |
| POST | `/budgeting/plans/:planId/allocations` | budgeting:CREATE | Créer/mettre à jour (upsert par catégorie+période) |
| DELETE | `/budgeting/plans/:planId/allocations/:id` | budgeting:DELETE | Supprimer |

### Variance / Budget vs Réel

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/budgeting/plans/:id/variance` | budgeting:READ | Rapport comparatif : alloué vs réel (ventes + achats) |

**Réponse `/budgeting/plans/:id/variance` :**
```json
{
  "plan": { "id": "...", "name": "Budget 2026", "totalAmount": 50000000, "status": "APPROVED" },
  "allocations": [
    { "category": { "name": "Marketing" }, "period": "2026-Q1",
      "allocated": 5000000, "actual": 3200000, "variance": 1800000, "utilizationPct": 64 }
  ],
  "summary": {
    "totalAllocated": 50000000, "totalActual": 28500000, "totalVariance": 21500000,
    "utilizationPct": 57, "salesRevenue": 18000000, "purchaseCost": 10500000
  }
}
```

### Rejet de plan / Plan Rejection

| Méthode | Route | Permission | Description |
|---|---|---|---|
| PATCH | `/budgeting/plans/:id/reject` | budgeting:APPROVE | Rejeter avec motif, émet socket |

---

## Backend Analytics — Nouveaux Endpoints / New Analytics Endpoints

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/analytics/crm` | analytics:READ | Entonnoir leads, funnel opportunités, taux de conversion, sources, activités récentes |
| GET | `/analytics/budget` | analytics:READ | Utilisation par plan/département, résumé global |

---

## Frontend CRM — 5 onglets / 5 Tabs

### Onglet Leads
- Tableau paginé avec recherche fulltext
- Badges de statut colorés (NEW, CONTACTED, QUALIFIED, CONVERTED, LOST)
- Bouton "Convertir en client" (création automatique du compte client)
- Modal de création avec champs : prénom, nom, email, téléphone, société, source

### Onglet Pipeline (Kanban)
- Un tableau Kanban par pipeline configuré
- Colonnes = stages, cartes = opportunités avec nom client + valeur FCFA
- Boutons de déplacement rapide vers les autres stages
- Modal de création d'opportunité : titre, valeur, probabilité, pipeline, date de clôture

### Onglet Activités
- Liste paginée de toutes les activités CRM
- Icônes distinctes : Mail, Phone, Calendar, CheckCircle, FileText
- Statut : "Terminé" (vert) / "En cours" (ambre)
- Actions : marquer terminé, supprimer

### Onglet Campagnes
- Liste paginée avec type (EMAIL, SMS, SOCIAL_MEDIA, PUSH_NOTIFICATION)
- Compteur contacts, envois, ouvertures
- Bouton "Lancer" pour les campagnes DRAFT → déclenche socket event

### Onglet Métriques
- 4 KPI cards : activités du jour, opportunités ouvertes, taux de gain, valeur gagnée
- Entonnoir de leads (barres de progression colorées par stage)
- Résumé opportunités (total, ouvertes, gagnées, perdues)
- Valeur totale du pipeline + valeur gagnée

---

## Frontend Budgétisation — 3 onglets / 3 Tabs

### Onglet Plans
- Tableau paginé avec filtres par département
- Actions : Soumettre, Approuver, Rejeter, → Variance, → Allocations
- Modal de création : nom, exercice fiscal, montant total, dates, département, notes

### Onglet Budget vs Réel
- Sélecteur de plan
- 4 KPI cards : budget total, alloué, réel (ventes+achats), variance
- Barre d'utilisation globale (rouge >100%, ambre >80%, vert sinon)
- Tableau d'allocations par catégorie et période avec variance

### Onglet Allocations
- Sélecteur de plan
- Tableau des allocations : catégorie, période, alloué, réel, notes
- Modal d'ajout : sélect catégorie, période, montant (upsert si catégorie+période existent déjà)
- Suppression inline

---

## Analytics — Sections Ajoutées / Added Sections

### Entonnoir CRM
- 3 KPIs : total leads, taux de conversion, taux de gain opportunités
- Barres de funnel leads (Nouveaux → Contactés → Qualifiés → Convertis)
- Résumé opportunités (ouvertes / gagnées / perdues)
- Valeur gagnée + répartition par source de leads

### Utilisation Budgétaire
- 3 KPIs : budget total, alloué, réel consommé
- Barre d'utilisation par plan (colorée selon le niveau de consommation)
- Drill-down : alloué vs réel par plan/département

---

## Intégration Temps Réel / Real-Time Integration

### Socket.io Events

| Événement | Emis lors de | Payload |
|---|---|---|
| `crm:lead-created` | Création d'un lead | `{ id, name }` |
| `crm:lead-converted` | Conversion lead → client | `{ leadId, customerId }` |
| `crm:opportunity-created` | Création opportunité | `{ id, title }` |
| `crm:opportunity-stage-changed` | Déplacement Kanban | `{ opportunityId, title, stageId, stageName }` |
| `crm:activity-created` | Nouvelle activité | `{ id, type, subject }` |
| `crm:campaign-launched` | Lancement campagne | `{ id, name }` |
| `budget:plan-approved` | Approbation plan | `{ planId, name }` |
| `budget:plan-rejected` | Rejet plan | `{ planId, name }` |

Tous les clients frontend connectés au namespace `/events` et dans la room `tenant:{id}` reçoivent ces événements
en temps réel sans polling.

---

## Qualité du Code / Code Quality

`npx tsc --noEmit` — **0 erreurs** en fin de phase (frontend et backend).

Corrections appliquées :
- `zodResolver` avec `z.coerce.number()` casté en `as any` pour éviter les conflits de types `unknown`
- `Pagination` : suppression du prop `page` (inutile, la meta contient déjà la page courante)
- `createCampaignM` mutation castée en `as any` pour compatibilité avec la signature du service
- Modules CRM et Budgeting importent maintenant `NotificationsModule` pour injecter la gateway

---

## Livrables Phase 6B / Phase 6B Deliverables

| Livrable | Statut |
|---|---|
| CRM : DTO `create-activity.dto.ts` | ✅ |
| CRM : DTO `create-campaign.dto.ts` | ✅ |
| CRM : Service étendu (activités, pipeline move, metrics, campaigns) | ✅ |
| CRM : Controller étendu (15 endpoints) | ✅ |
| CRM : Module injectant NotificationsGateway | ✅ |
| Budget : DTO `create-allocation.dto.ts` | ✅ |
| Budget : Service étendu (allocations, variance, reject, real-time) | ✅ |
| Budget : Controller étendu (allocations, variance, reject) | ✅ |
| Budget : Module injectant NotificationsGateway | ✅ |
| Analytics : Service étendu (`getCrmAnalytics`, `getBudgetAnalytics`) | ✅ |
| Analytics : Controller étendu (2 nouveaux endpoints) | ✅ |
| Frontend : `crm.service.ts` étendu | ✅ |
| Frontend : `budgeting.service.ts` étendu | ✅ |
| Frontend : `analytics.service.ts` étendu | ✅ |
| Frontend : CRM page (5 onglets) | ✅ |
| Frontend : Budgeting page (3 onglets) | ✅ |
| Frontend : Analytics page (CRM funnel + budget utilization) | ✅ |
| TypeScript strict — 0 erreurs | ✅ |

---

*Phase 6B complète. Prête pour la prochaine phase.*
*Phase 6B complete. Ready for the next phase.*
