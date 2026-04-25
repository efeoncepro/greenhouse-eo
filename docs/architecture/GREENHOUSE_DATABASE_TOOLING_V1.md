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
5. **Types auto-regenerate.** `pnpm migrate:up` and `migrate:down` automatically run `kysely-codegen` after applying. Skip with `MIGRATE_SKIP_TYPES=true`.

### Timestamp Rules (critical)

`node-pg-migrate` orders migrations by their filename timestamp. It **refuses to execute** any migration whose timestamp is earlier than the last applied migration in `pgmigrations`.

1. **ALWAYS** use `pnpm migrate:create <name>` to generate files. It produces the correct UTC timestamp automatically.
2. **NEVER** rename a migration file's timestamp manually. This breaks the ordering chain.
3. **NEVER** create migration files by hand with invented timestamps. If the timestamp falls before the baseline (`20260401120000`), the migration will be silently skipped or error out.
4. **If two pending migrations must run in a specific order**, combine them into a single file rather than manipulating timestamps.
5. **If a migration was already applied** and you need to change it, create a new migration that alters/corrects — never edit an applied migration.

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

## 5. Connectivity & Credentials

### Critical: Cloud SQL is NOT directly accessible via TCP

The Cloud SQL public IP (`34.86.135.144`) has **no authorized networks** configured. Connecting directly via TCP will fail with `ETIMEDOUT` or `connection timeout`.

### Preferred method: Cloud SQL Connector (all environments)

The `@google-cloud/cloud-sql-connector` npm library connects **without TCP** — it negotiates a secure tunnel via the Cloud SQL Admin API. This is the preferred method for **all environments**: Vercel runtime, local development, AI agents, and CI.

When `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` is set, `src/lib/postgres/client.ts` (line 133) uses the Connector automatically, taking priority over `GREENHOUSE_POSTGRES_HOST`.

**Prerequisites:**
- `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev`
- Valid GCP credentials: `GOOGLE_APPLICATION_CREDENTIALS_JSON` in env, ADC (`gcloud auth application-default login`), or WIF (Vercel)
- Service account needs `roles/cloudsql.client`

**This covers ALL Node.js tools**: `pnpm migrate:*`, `pnpm db:generate-types`, `pnpm setup:postgres:*`, `pnpm pg:doctor`, backfill scripts, and the portal runtime.

### Automated: `pg-connect.sh` (recommended for interactive use)

The script `scripts/pg-connect.sh` automates the entire connectivity lifecycle — ADC verification, proxy startup, user selection, and operation execution — in a single command.

```bash
pnpm pg:connect              # Verify ADC + start proxy + test connection
pnpm pg:connect:migrate      # Above + apply pending migrations (pnpm migrate:up)
pnpm pg:connect:status       # Above + show migration status (pnpm migrate:status)
pnpm pg:connect:shell        # Above + open interactive SQL shell (as admin)
```

**What it does automatically:**

1. **ADC check** — verifies `gcloud auth application-default print-access-token`. If expired, runs `gcloud auth application-default login`.
2. **Port cleanup** — kills any existing process on port 15432 to avoid conflicts.
3. **Proxy start** — launches `cloud-sql-proxy` on `127.0.0.1:15432` as a background process.
4. **User resolution** — selects the correct PostgreSQL user per operation:
   - `connect`, `migrate`, `status` → `GREENHOUSE_POSTGRES_OPS_USER` / `GREENHOUSE_POSTGRES_OPS_PASSWORD`
   - `shell` → `GREENHOUSE_POSTGRES_ADMIN_USER` / `GREENHOUSE_POSTGRES_ADMIN_PASSWORD`
5. **Connection test** — verifies the connection works before proceeding with the operation.
6. **Operation execution** — runs the requested operation (`migrate:up`, `migrate:status`, or `psql`).

**Prerequisites:**

| Requirement | How to satisfy |
|-------------|---------------|
| `cloud-sql-proxy` binary | `gcloud components install cloud-sql-proxy` |
| `.env.local` with PG credentials | Must contain `GREENHOUSE_POSTGRES_OPS_USER`, `GREENHOUSE_POSTGRES_OPS_PASSWORD`, `GREENHOUSE_POSTGRES_ADMIN_USER`, `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` |
| GCP project access | `gcloud auth application-default login` (script handles renewal) |

**Configuration:**

| Constant | Default | Override |
|----------|---------|----------|
| `INSTANCE` | `efeonce-group:us-east4:greenhouse-pg-dev` | Edit script |
| `PORT` | `15432` | Edit script |
| `DATABASE` | `greenhouse_app` | Edit script |
| `CLOUD_SQL_PROXY` | Auto-detected via `which` | `CLOUD_SQL_PROXY_BIN` env var |

### Fallback: Cloud SQL Auth Proxy (manual)

For standalone binaries or when `pg-connect.sh` is not suitable, start the proxy manually:

```bash
# Install (once)
gcloud components install cloud-sql-proxy

# Start proxy (each session)
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432

# Configure .env.local for standalone binaries
GREENHOUSE_POSTGRES_HOST="127.0.0.1"
GREENHOUSE_POSTGRES_PORT="15432"
GREENHOUSE_POSTGRES_SSL="false"
```

The proxy authenticates via Application Default Credentials (`gcloud auth application-default login`).

### Two connection paths

| Path | Used by | How |
|------|---------|-----|
| **Cloud SQL Connector** | All Node.js contexts (Vercel, local, agents, CI) | `@google-cloud/cloud-sql-connector` + IAM auth, via `src/lib/postgres/client.ts`. Preferred. |
| **Cloud SQL Auth Proxy** | Standalone binaries (`pg_dump`, `psql`) | TCP tunnel via `cloud-sql-proxy`, connects to `127.0.0.1:15432`. Fallback only. |

These are two different mechanisms for the same database. The Connector is embedded in the Node.js runtime; the Proxy is a standalone binary that creates a local TCP tunnel. Both authenticate via GCP IAM.

### Runtime (portal application)

Uses Cloud SQL Connector + Secret Manager. No changes needed. Connection is managed by `src/lib/postgres/client.ts`.

### CLI tools (migrations, setup, codegen)

Use Cloud SQL Connector automatically when `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` is set. No proxy needed.

| Variable | Required | Value with proxy |
|----------|----------|-----------------|
| `GREENHOUSE_POSTGRES_HOST` | Yes | `127.0.0.1` |
| `GREENHOUSE_POSTGRES_PORT` | Yes | `15432` |
| `GREENHOUSE_POSTGRES_DATABASE` | Yes | `greenhouse_app` |
| `GREENHOUSE_POSTGRES_MIGRATOR_USER` | For DDL | `greenhouse_migrator_user` |
| `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` | For DDL | Secret Manager: `greenhouse-pg-dev-migrator-password` |
| `GREENHOUSE_POSTGRES_SSL` | Yes | `false` (proxy handles encryption) |

### Error Prefix Taxonomy

`scripts/pg-connect.sh` y `scripts/migrate.ts` etiquetan sus errores con prefijos mutuamente excluyentes para acelerar triage:

| Prefijo | Qué significa | Primera acción |
|---------|---------------|----------------|
| `[ADC]` | Credenciales GCP expiradas o ausentes | `gcloud auth application-default login` |
| `[PROXY]` | `cloud-sql-proxy` binary missing, no arrancó, o murió durante el handshake | Revisa `which cloud-sql-proxy` y el tail del log impreso; `gcloud components install cloud-sql-proxy` si falta |
| `[NETWORK]` | TCP llega al proxy pero el handshake TLS con Cloud SQL no completa (típico PMTUD blackhole en puerto 3307 sin MSS clamping) | Cambiar red / hotspot / Cloud Shell / `sudo route add -host 34.86.135.144 -mtu 900`. Si ICMP está bloqueado pero TCP funciona, usar `GREENHOUSE_SKIP_PREFLIGHT=true` |
| `[SQL]` | Conexión + TLS OK pero falla auth, query, DDL, o codegen | Leer el mensaje SQL específico; verificar perfil/credenciales/permisos |
| `[CONFIG]` | `.env.local` ausente o variables requeridas no resueltas | Revisar `.env.local` vs perfiles en `scripts/lib/load-greenhouse-tool-env.ts` |

### Preflight de red

`pg-connect.sh` ejecuta un `ping -D -s 1200` a `34.86.135.144` antes de arrancar el proxy. Si los paquetes DF > 1000B se droppean pero los pequeños llegan, clasifica como `[NETWORK]` en <5s y sugiere acciones concretas — en vez de colgar 30s esperando el TLS handshake.

Saltar el preflight (útil si tu red bloquea ICMP pero TCP 3307 funciona):

```bash
GREENHOUSE_SKIP_PREFLIGHT=true pnpm pg:connect:migrate
```

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `[CONFIG] GREENHOUSE_POSTGRES_HOST=... is not reachable` | Fail-fast de `migrate.ts` vs IP pública directa | Usar `pnpm pg:connect:migrate` o arrancar el proxy antes |
| `[NETWORK] red local bloquea paquetes DF > 1000B` | PMTUD blackhole en puerto 3307 | Hotspot / Cloud Shell / MSS clamp / `GREENHOUSE_SKIP_PREFLIGHT=true` |
| `[NETWORK] TCP al proxy llega pero Cloud SQL no completa TLS` | Handshake congelado (PMTUD o middlebox) | Mismo que arriba |
| `[PROXY] cloud-sql-proxy no encontrado` | Binary faltante | `gcloud components install cloud-sql-proxy` |
| `[PROXY] no reportó 'ready for new connections' en 10s` | Proxy arranca pero no completa handshake inicial | Revisar ADC, conectividad a `cloudsql.googleapis.com`, tail del log impreso |
| `[ADC] no se pudo renovar ADC` | Browser flow falló o sin acceso a GCP | `gcloud auth application-default login` manual |
| `[SQL] password authentication failed` | Credenciales mal o perfil equivocado | Verificar perfil en `.env.local` vs Secret Manager |
| `[SQL] permission denied for table X` | Object owned by different user | Usar perfil `greenhouse_ops` (canonical owner) |
| `ECONNREFUSED 127.0.0.1:15432` (sin prefijo) | Proxy no está corriendo y se invocó `pnpm migrate:up` directo | Usar `pnpm pg:connect:migrate` |
| `SSL SYSCALL error` | SSL encima del túnel del proxy | `GREENHOUSE_POSTGRES_SSL=false` (el proxy ya cifra) |

---

## 6. Directory Structure

```
greenhouse-eo/
├── migrations/                              # Versioned SQL migrations
│   └── 20260401120000000_initial-baseline.sql  # Baseline (no-op)
├── scripts/
│   ├── pg-connect.sh                        # Automated Cloud SQL connectivity (ADC + proxy + connect)
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
