# GREENHOUSE_DATABASE_TOOLING_V1

> Versioned migrations, centralized connection, and typed query builder for PostgreSQL.

**Status:** Active
**Created:** 2026-04-01
**Origin:** TASK-184 + TASK-185

---

## 1. Overview

Greenhouse operates 9+ PostgreSQL schemas on Cloud SQL (`greenhouse-pg-dev`, Postgres 16, `us-east4`). This document describes the database tooling foundation that provides:

1. **Centralized connection** — single import point for all PostgreSQL access
2. **Versioned migrations** — SQL-first DDL tracking via `node-pg-migrate`
3. **Typed query builder** — Kysely for type-safe queries in new modules

### Design Principles

- **Wrap, don't replace.** The existing `src/lib/postgres/client.ts` singleton (Cloud SQL Connector + Secret Manager + retry logic) remains the authoritative connection source. New tooling wraps it.
- **SQL-first migrations.** Migrations are plain `.sql` files, not JavaScript DSL. Agents and operators can read and write them without framework knowledge.
- **Forward-only Kysely.** Existing modules continue using `runGreenhousePostgresQuery()`. New modules should use Kysely for type safety. No retroactive migration.
- **Profile-based credentials.** Migrations reuse the existing three-profile system (`runtime`, `migrator`, `admin`) from `scripts/lib/load-greenhouse-tool-env.ts`.

---

## 2. Connection Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  src/lib/db.ts                            │
│  ┌───────────────────────┬──────────────────────────┐    │
│  │   Re-exports          │   Kysely instance         │    │
│  │   query()             │   getDb() → Kysely<DB>    │    │
│  │   withTransaction()   │   (lazy, shares Pool)     │    │
│  │   getPool()           │                           │    │
│  └──────────┬────────────┴──────────┬───────────────┘    │
│             │                       │                     │
│             ▼                       ▼                     │
│  ┌──────────────────────────────────────────────────┐    │
│  │         src/lib/postgres/client.ts                │    │
│  │  - Cloud SQL Connector + TCP fallback             │    │
│  │  - Secret Manager password resolution             │    │
│  │  - Automatic retry on transient failures          │    │
│  │  - Global singleton via globalThis                │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Import Rules

| Use case | Import |
|----------|--------|
| Raw SQL query (existing pattern) | `import { query } from '@/lib/db'` |
| Transaction | `import { withTransaction } from '@/lib/db'` |
| Kysely typed query (new modules) | `import { getDb } from '@/lib/db'` |
| Pool instance (rare) | `import { getGreenhousePostgresPool } from '@/lib/db'` |
| Type for function signatures | `import type { PoolClient } from 'pg'` (allowed) |

### Prohibitions

- **Never** create `new Pool()` outside `src/lib/postgres/client.ts`
- **Never** read `GREENHOUSE_POSTGRES_*` env vars outside `client.ts`
- **Never** import `Pool` from `pg` directly in application code

---

## 3. Migration Framework

### Tool: `node-pg-migrate`

| Property | Value |
|----------|-------|
| Package | `node-pg-migrate` (devDependency) |
| Migrations directory | `migrations/` (project root) |
| Tracking table | `public.pgmigrations` |
| File format | SQL (`.sql`), UTC timestamps |
| Naming convention | `YYYYMMDDHHMMSS_description-kebab-case.sql` |
| Wrapper | `scripts/migrate.ts` (TypeScript) |

### Commands

```bash
pnpm migrate:create <name>    # Create new migration file
pnpm migrate:up                # Apply pending migrations
pnpm migrate:down              # Revert last migration
pnpm migrate:status            # Show pending vs applied (dry-run)
```

### How It Works

```
scripts/migrate.ts
  1. loadGreenhouseToolEnv()        ← reads .env.local
  2. applyGreenhousePostgresProfile('migrator')  ← switches to migrator creds
  3. builds DATABASE_URL internally ← from GREENHOUSE_POSTGRES_HOST/DATABASE/USER/PASSWORD
  4. exec node-pg-migrate CLI       ← passes DATABASE_URL as env var
```

The wrapper uses the `migrator` profile by default. Override with `MIGRATE_PROFILE=admin` for break-glass operations.

### Migration Rules

1. **Every DDL change must be a migration.** No manual `ALTER TABLE` or `CREATE INDEX`.
2. **Migration before deploy.** Vercel cannot run migrations at deploy time. Apply migrations, then deploy.
3. **Backward-compatible first.** Add nullable columns → deploy code → backfill → add constraints.
4. **Set search_path.** Every migration must start with `SET search_path = <target_schema>, greenhouse_core, public;`
5. **Regenerate types after migration.** Run `pnpm db:generate-types` after `pnpm migrate:up`.

### Migration vs Legacy Setup Scripts

| Aspect | Migrations (`migrations/`) | Setup scripts (`scripts/setup-*.ts`) |
|--------|---------------------------|--------------------------------------|
| Tracking | `pgmigrations` table, versioned | None — idempotent re-run |
| Rollback | `down` migration | Manual |
| Use for | Schema evolution (ALTER, new tables) | Initial bootstrap only |
| Going forward | **All new DDL** | Archived, not for new work |

The 30+ existing SQL files in `scripts/migrations/` are legacy ad-hoc migrations that predate the framework. They remain as-is. All new schema changes use `pnpm migrate:create`.

---

## 4. Kysely — Typed Query Builder

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Kysely instance | `src/lib/db.ts` → `getDb()` | Typed query builder sharing the Pool |
| Generated types | `src/types/db.d.ts` | TypeScript interfaces for all tables |
| Type generator | `kysely-codegen` (devDependency) | Introspects live DB schema |
| Regeneration | `pnpm db:generate-types` | Run after any migration |

### Usage Example

```typescript
import { getDb } from '@/lib/db'

const db = await getDb()

// Typed — autocomplete on table and column names
const members = await db
  .selectFrom('greenhouse_hr.members')
  .select(['member_id', 'full_name', 'status'])
  .where('space_id', '=', spaceId)
  .where('status', '=', 'active')
  .execute()
```

### Coexistence Rules

- **Existing modules:** Continue using `runGreenhousePostgresQuery()` (via `query()` alias). No retroactive migration.
- **New modules:** Should use `getDb()` for type safety.
- **Complex queries:** CTEs, UNNEST, raw SQL — use `query()` or Kysely's `sql` tagged template.

---

## 5. Credential Requirements

### Runtime (portal application)

Uses Cloud SQL Connector + Secret Manager. No changes needed.

### Migrations (CLI)

Requires **direct TCP connection** — Cloud SQL Connector is not available in CLI context.

| Variable | Required for migrations | Source |
|----------|------------------------|--------|
| `GREENHOUSE_POSTGRES_HOST` | Yes | Direct IP/hostname of Cloud SQL |
| `GREENHOUSE_POSTGRES_PORT` | Yes (default 5432) | — |
| `GREENHOUSE_POSTGRES_DATABASE` | Yes | `greenhouse_app` |
| `GREENHOUSE_POSTGRES_MIGRATOR_USER` | Yes | `greenhouse_migrator_user` |
| `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` | Yes | From Secret Manager or env |
| `GREENHOUSE_POSTGRES_SSL` | Optional | `false` for direct connection |

These must be present in `.env.local` for local migration execution. In CI, they would be injected as environment variables.

### Type Generation

Uses the same connection as migrations (direct TCP to introspect schema). Requires `DATABASE_URL` or equivalent constructed by `scripts/generate-db-types.ts`.

---

## 6. Directory Structure

```
greenhouse-eo/
├── migrations/                              # Versioned SQL migrations
│   └── 20260401120000_initial-baseline.sql  # Baseline (no-op)
├── scripts/
│   ├── migrate.ts                           # Migration CLI wrapper
│   ├── generate-db-types.ts                 # Kysely codegen wrapper
│   └── lib/
│       ├── load-greenhouse-tool-env.ts      # Profile system (reused)
│       └── postgres-script-runner.ts        # Legacy SQL runner (reused)
├── src/
│   ├── lib/
│   │   ├── db.ts                            # Centralized DB module (NEW)
│   │   └── postgres/
│   │       └── client.ts                    # Connection singleton (existing)
│   └── types/
│       └── db.d.ts                          # Generated Kysely types
└── package.json                             # migrate:* and db:* scripts
```

---

## 7. Operational Procedures

### Creating a New Migration

```bash
pnpm migrate:create add-hr-performance-tables
# Creates: migrations/20260401HHMMSS_add-hr-performance-tables.sql
# Edit the file with your DDL
pnpm migrate:up
pnpm db:generate-types
```

### Applying Across Environments

```
1. Develop + test migration locally against dev DB
2. Merge PR to develop
3. Run pnpm migrate:up against staging
4. Verify in staging
5. Merge develop to main
6. Run pnpm migrate:up against production
7. Vercel deploys code that uses new schema
```

### Rolling Back

```bash
pnpm migrate:down    # Reverts the last applied migration
```

Note: `node-pg-migrate` only supports reverting the last migration. For multi-step rollback, run `down` multiple times.

---

## 8. Related Documents

| Document | Relationship |
|----------|-------------|
| `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` | Defines the three access profiles (runtime/migrator/admin) |
| `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` | Dual-store strategy, schema layering |
| `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` | Canonical object placement in schemas |
| `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` | Event-driven projections that consume schema changes |
| `GREENHOUSE_EVENT_CATALOG_V1.md` | Outbox event infrastructure |
| `AGENTS.md` | Operational rules for Database Connection and Migrations sections |

---

*Greenhouse EO -- Efeonce Group -- Abril 2026*
*Documento de arquitectura canonico para database tooling.*
