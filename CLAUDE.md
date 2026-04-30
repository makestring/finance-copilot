# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

pnpm workspaces (`pnpm@10.29.3`, hoisted linker) with three apps and one shared package:

- `apps/api` — NestJS v11 backend (primary active development)
- `apps/web` — Next.js v16 frontend (scaffolded, active development)
- `apps/mobile` — Expo / React Native (scaffolded only)
- `packages/shared` — Shared TypeScript library (minimal, not yet used)

## Commands

```bash
# Run API in dev/watch mode
pnpm dev:api

# Run mobile
pnpm dev:mobile

# Build all workspaces
pnpm build

# Lint all workspaces
pnpm lint

# Test all workspaces
pnpm test

# API-specific (from apps/api)
pnpm --filter ./apps/api test            # unit tests
pnpm --filter ./apps/api test:e2e        # e2e tests
pnpm --filter ./apps/api test:cov        # coverage
pnpm --filter ./apps/api lint

# Prisma (from apps/api)
pnpm --filter ./apps/api exec prisma migrate dev
pnpm --filter ./apps/api exec prisma generate
pnpm --filter ./apps/api exec prisma studio
```

## API Architecture (NestJS)

The API runs on port 3000 (or `PORT` env var) with CORS open to `http://localhost:3001`.

**Module layout** (`apps/api/src/modules/`):

| Module | Responsibility |
|---|---|
| `onboarding` | Client financial profile creation |
| `snapshot` | Ingest/retrieve periodic financial snapshots |
| `subscriptions` | CRUD for recurring subscriptions |
| `leaks` | Detect spending leaks against thresholds |
| `score` | Compute monthly financial score + explainable drivers |
| `settings` | User preferences (thresholds, billing windows) |
| `cancel-intents` | Track cancellation reasons |
| `insights` | Generate financial insights |
| `actions` | Record + retrieve user action logs |
| `alerts` | Threshold-based alert engine with severity levels |
| `dashboard` | Aggregate data for dashboard view |
| `jobs` | Cron jobs (alert recompute via `@nestjs/schedule`) |
| `outcomes` | Measure deltas from actions (PENDING → MEASURED/PARTIAL/MISSED) |

**Shared infrastructure** (`apps/api/src/shared/`):
- `infrastructure/prisma/` — global `PrismaModule` / `PrismaService` (PostgreSQL via `@prisma/adapter-pg`)
- `events/` — event bus

Each module follows the standard NestJS pattern: one controller, one service, one module file.

## Database (Prisma + Supabase PostgreSQL)

Schema: `apps/api/prisma/schema.prisma`. Migrations in `apps/api/prisma/migrations/` (13 migrations).

Core entity graph:
```
Client
├── FinancialProfile (1:1) → FixedExpense[]
├── Subscription[]
├── UserSettings (1:1)
├── ScoreSnapshot[]
├── CancelIntent[]
├── ActionLog[] → Outcome (soft reference)
├── Outcome[]
└── Alert[]
```

Key enums:
- `OutcomeStatus`: PENDING | MEASURED | PARTIAL | MISSED
- `OutcomeSourceType`: CONFIRM_CANCELLATION | MANUAL_ADJUSTMENT | ALERT_DISMISS | OTHER

Monetary fields are stored in **cents** (integer), e.g. `amountCents`, `monthlyIncomeCents`.

## Web App (Next.js)

**Important:** `apps/web` uses Next.js v16, which has breaking changes from earlier versions. Before writing any Next.js code, read the relevant guide in `apps/web/node_modules/next/dist/docs/`. The app uses the App Router, React 19, and Tailwind CSS v4.

Path alias: `@/*` maps to the project root (`apps/web/`).

## Environment

Copy `.env.example` to `.env` at the repo root and in `apps/api/`. Required variable:
```
DATABASE_URL=postgresql://...   # Supabase connection string
PORT=3000                        # Optional, defaults to 3000
```

## TypeScript / Lint

API TypeScript config has `noImplicitAny: false` and `strictBindCallApply: false` — do not change these. `strictNullChecks` is on. ESLint uses prettier integration; single quotes and trailing commas are enforced (`.prettierrc` in `apps/api`).
