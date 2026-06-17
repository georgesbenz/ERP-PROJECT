# PHASE 11 — SaaS, Monitoring & DevOps
# PHASE 11 — SaaS, Surveillance & DevOps

## Overview / Vue d'ensemble

Phase 11 adds platform-level operational capabilities: structured JSON logging (Winston),
enhanced health monitoring (Redis + memory), a super-admin panel for managing all tenants,
and a CI/CD pipeline that automatically builds and pushes Docker images on every merge to `main`.

La Phase 11 ajoute des capacités opérationnelles au niveau plateforme : journalisation JSON
structurée (Winston), surveillance de santé étendue (Redis + mémoire), un panneau super-admin
pour gérer tous les locataires, et un pipeline CI/CD qui construit et publie les images Docker
automatiquement à chaque fusion sur `main`.

---

## 1. Winston Structured Logging / Journalisation Structurée

**Package / Paquet :** `nest-winston` + `winston` (déjà installés dans le conteneur)

**Files modified / Fichiers modifiés :**
- `backend/src/main.ts` — Winston logger replaces NestJS built-in logger
- `backend/src/common/interceptors/logging.interceptor.ts` — structured JSON per request

### Log format (development) / Format dev
```
11:28:55 [HTTP] info: {"method":"GET","url":"/api/v1/sales","statusCode":200,"duration":51,"tenantId":"...","userId":"..."}
```

### Log format (production) / Format prod
```json
{"level":"info","timestamp":"2026-06-17T11:28:55.000Z","message":"{...}","context":"HTTP"}
```

### Production log files / Fichiers journaux prod
| File | Content |
|---|---|
| `/var/log/erp/combined.log` | All log levels |
| `/var/log/erp/error.log` | Errors only |

### Per-request fields / Champs par requête
| Field | Description |
|---|---|
| `method` | HTTP method (GET, POST…) |
| `url` | Full request URL |
| `statusCode` | HTTP response status |
| `duration` | Response time in ms |
| `tenantId` | Tenant from JWT (null for public routes) |
| `userId` | User from JWT (null for public routes) |
| `error` | Error message (error logs only) |

---

## 2. Enhanced Health Endpoint / Endpoint de Santé Amélioré

**Endpoint :** `GET /api/v1/health` (public — no auth required)

**Files modified / Fichiers modifiés :**
- `backend/src/health/health.controller.ts` — added Redis ping + memory checks

### Response example / Exemple de réponse
```json
{
  "status": "ok",
  "database": "up",
  "redis": "up",
  "memory": { "rss": 147, "heapUsed": 54, "heapTotal": 57, "unit": "MB" },
  "uptime": 48,
  "timestamp": "2026-06-17T11:29:28.710Z"
}
```

| Field | Values | Description |
|---|---|---|
| `status` | `ok` / `degraded` | Overall health — ok only if both DB and Redis are up |
| `database` | `up` / `down` | PostgreSQL via Prisma `SELECT 1` |
| `redis` | `up` / `down` | Redis via cache `set` + `get` round-trip |
| `memory.heapUsed` | MB | Node.js V8 heap in use |
| `uptime` | seconds | Process uptime |

The load balancer / Docker health check at `wget -qO- http://localhost:4000/api/v1/health` now
validates Redis connectivity in addition to the database.

---

## 3. Super-Admin Panel / Panneau Super-Admin

A platform-level admin panel for managing all tenants across the SaaS platform.
Un panneau d'administration au niveau plateforme pour gérer tous les locataires.

### Backend / Côté serveur

**Files new / Fichiers nouveaux :**
- `backend/src/modules/admin/admin.service.ts` — cross-tenant queries
- `backend/src/modules/admin/admin.controller.ts` — REST endpoints
- `backend/src/modules/admin/admin.module.ts`
- `backend/src/common/guards/platform-admin.guard.ts`

**Endpoints :**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/stats` | Platform-level totals (tenants, users, monthly sales) |
| `GET` | `/api/v1/admin/tenants` | All tenants with usage metrics |
| `PATCH` | `/api/v1/admin/tenants/:id/suspend` | Suspend a tenant (`isActive=false`) |
| `PATCH` | `/api/v1/admin/tenants/:id/activate` | Re-activate a suspended tenant |

**Access control / Contrôle d'accès :**

The `PlatformAdminGuard` checks the authenticated user's email against the `PLATFORM_ADMIN_EMAILS`
environment variable (comma-separated list). No DB migration needed.

```bash
# docker-compose.yml / .env
PLATFORM_ADMIN_EMAILS=admin@mycompany.com,cto@mycompany.com
```

### Frontend / Côté client

**File new / Fichier nouveau :** `frontend/src/app/(dashboard)/admin/page.tsx`

Navigate directly to `/admin` — the page is not listed in the sidebar (admin-only).
If the user's email is not in `PLATFORM_ADMIN_EMAILS`, the API returns 403 and the page
shows an "Access Denied" message.

**Features / Fonctionnalités :**
- 5 stat cards: Total tenants, Active, Suspended, Total users, Sales this month
- Tenant table with: company name, slug, plan badge (starter/pro/enterprise), user count,
  sale count, product count, active/suspended badge, registration date
- Suspend / Activate button per row with optimistic query invalidation

---

## 4. CD Pipeline — Docker Build & Push / Pipeline CD

**File new / Fichier nouveau :** `.github/workflows/cd.yml`

Triggers on push to `main` (merges). Builds multi-arch Docker images and pushes them to
GitHub Container Registry (GHCR) with both `latest` and `sha-<commit>` tags.

```
Push to main
  ↓
Build backend image (./backend/Dockerfile, target: production)
  ↓ Push → ghcr.io/<owner>/<repo>/backend:latest + :sha-<commit>
Build frontend image (./frontend/Dockerfile, target: production)
  ↓ Push → ghcr.io/<owner>/<repo>/frontend:latest + :sha-<commit>
```

**Features / Fonctionnalités :**
- GitHub Actions cache (`type=gha`) for fast incremental rebuilds
- Separate backend and frontend jobs with distinct tags
- Job summary printed to GitHub UI after each run
- `GITHUB_TOKEN` used for GHCR auth (no secrets to configure)

**Pull images on server / Récupérer les images :**
```bash
docker pull ghcr.io/<owner>/<repo>/backend:latest
docker pull ghcr.io/<owner>/<repo>/frontend:latest
```

---

## 5. Security Notes / Notes de Sécurité

- `PLATFORM_ADMIN_EMAILS` should never be committed to git. Set it via Docker environment or
  a secrets manager in production.
- The admin endpoints require a valid JWT **plus** matching email — two-layer check.
- Suspended tenants still have their data; suspension only blocks login/API calls if your
  `JwtAuthGuard` checks `tenant.isActive`. Consider adding that check for full enforcement.

---

## Files Modified / Fichiers Modifiés

### Backend
- `backend/src/main.ts` — Winston logger, structured JSON output
- `backend/src/common/interceptors/logging.interceptor.ts` — per-request JSON logs with tenantId/userId
- `backend/src/health/health.controller.ts` — Redis + memory health checks
- `backend/src/app.module.ts` — imports AdminModule
- `backend/src/modules/admin/admin.module.ts` — **NEW**
- `backend/src/modules/admin/admin.controller.ts` — **NEW**
- `backend/src/modules/admin/admin.service.ts` — **NEW**
- `backend/src/common/guards/platform-admin.guard.ts` — **NEW**

### Frontend
- `frontend/src/app/(dashboard)/admin/page.tsx` — **NEW** — platform admin panel

### Infrastructure
- `.github/workflows/cd.yml` — **NEW** — Docker build + push to GHCR on main
- `docker-compose.yml` — added `PLATFORM_ADMIN_EMAILS` env var

---

*Phase 11 complète. La plateforme ERP est maintenant prête pour la production SaaS.*
*Phase 11 complete. The ERP platform is now production-ready for SaaS deployment.*
