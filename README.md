# ERP Platform / Plateforme ERP

Fullstack multi-tenant **ERP + CRM + Budgeting + Accounting + Analytics** platform.
Plateforme **ERP + CRM + Budgétisation + Comptabilité + Analytique** fullstack multi-tenant.

> Built phase by phase from `INSTRUCTION.txt`. See `PHASE-1.md` (architecture) and
> `PHASE-2.md` (initialization). Construit phase par phase. Voir `PHASE-1.md` et `PHASE-2.md`.

## Stack
- **Frontend**: Next.js · React · TypeScript · TailwindCSS · TanStack Query · Zustand · Socket.io-client
- **Backend**: NestJS · TypeScript · Prisma · Socket.io · (BullMQ/Redis — Phase 4)
- **Data**: PostgreSQL · Redis · (S3 — later)
- **Infra**: Docker · Docker Compose · Nginx · GitHub Actions

## Quick start / Démarrage rapide
```bash
cp .env.example .env          # then edit secrets / puis éditer les secrets
docker compose up -d --build  # postgres + redis + backend + frontend + nginx
```
- Web: http://localhost:8080 (via Nginx) or http://localhost:3000 (direct)
- API: http://localhost:4000/api/v1 · Docs: http://localhost:4000/api/docs

## Monorepo layout / Structure
```
backend/    NestJS API
frontend/   Next.js web app
nginx/      reverse proxy config
.github/    CI/CD workflows
docker-compose.yml
```

See `PHASE-2.md` for full setup, dependency rationale, and commands.
Voir `PHASE-2.md` pour l'installation complète, le rôle des dépendances et les commandes.
