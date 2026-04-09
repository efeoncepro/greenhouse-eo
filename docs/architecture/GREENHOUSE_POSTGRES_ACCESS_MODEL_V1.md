# Greenhouse PostgreSQL Access Model V1

## Delta 2026-04-01 — Ownership consolidation to greenhouse_ops

- **Problema resuelto:** 5 owners distintos (`greenhouse_migrator` 41, `greenhouse_migrator_user` 39, `postgres` 32, `greenhouse_app` 9, `greenhouse_ops` 1) sobre 122 tablas, causando fallos en `pg_dump` y errores de permisos.
- **Acción:** migración `20260402000000000_consolidate-ownership-to-greenhouse-ops.sql` ejecutada — **122/122 tablas, 11/11 schemas, 7 sequences, 17 views** ahora owned by `greenhouse_ops`.
- **Password:** almacenada en Secret Manager como `greenhouse-pg-dev-ops-password`.
- **Default privileges:** configurados para que objetos creados por `greenhouse_ops` otorguen automáticamente DML a `greenhouse_runtime` y ALL a `greenhouse_migrator`.
- **Regla vigente actualizada:**
  - `greenhouse_ops` es ahora el **canonical owner** de todos los objetos de la base de datos
  - El runtime (`greenhouse_app`) sigue usando solo DML via `greenhouse_runtime` grants
  - Migraciones corren como `greenhouse_migrator_user` para DDL cotidiano
  - Para operaciones de ownership o `pg_dump`, usar `greenhouse_ops` (profile admin o break-glass)
  - Schema snapshot baseline regenerado: `docs/architecture/schema-snapshot-baseline.sql` (8636 líneas)

## Delta 2026-03-31 — break-glass ops login for ownership repair

- Se confirmó operativamente un carril adicional de soporte:
  - login `greenhouse_ops`
  - pensado solo para reparaciones de ownership drift y migraciones bloqueadas por split legacy entre `greenhouse_app`, `greenhouse_migrator_user` y `postgres`
- Herencia validada en Cloud SQL:
  - `greenhouse_app`
  - `greenhouse_migrator`
  - `greenhouse_migrator_user`
  - `postgres`
- Regla vigente:
  - `greenhouse_ops` no reemplaza los perfiles canónicos `runtime`, `migrator` y `admin`
  - se usa únicamente como break-glass operacional cuando un bootstrap canónico queda trabado por ownership histórico
  - después de sanear ownership, los setups deben volver a correr con `greenhouse_migrator_user`

## Delta 2026-03-29 — Connector + WIF transition posture

- El runtime canonical de Greenhouse para Vercel ya quedó diseñado para usar:
  - password PostgreSQL de `runtime`
  - Cloud SQL Connector
  - autenticación GCP resuelta por `src/lib/google-credentials.ts`
- Validación real del 2026-03-29:
  - preview `version=7638f85` respondió `Cloud SQL reachable` vía `instanceConnectionName=efeonce-group:us-east4:greenhouse-pg-dev`
  - el path usó WIF y no SA key
- Estado transicional todavía vigente:
  - el entorno compartido `dev-greenhouse.efeoncepro.com` sigue observándose con host directo en lugar de connector
  - Cloud SQL externo aún no fue endurecido (`0.0.0.0/0`, SSL opcional)
  - no retirar el fallback ni cerrar el host path hasta validar ese entorno compartido

## Purpose

Define a scalable access model for Greenhouse PostgreSQL so new domains can be provisioned without repeating manual permission debugging.

This document complements:

- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `project_context.md`

## Problem

The first PostgreSQL domain cuts exposed a recurring friction:

- runtime credentials were also being used for schema setup
- domain setup failed late when foreign keys referenced canonical tables without `REFERENCES`
- local tooling depended on ad hoc env loading and temporary wrappers
- every new schema risked a new round of permission debugging

The platform needs one repeatable rule, not one-off fixes.

## Access Roles

Greenhouse should separate PostgreSQL responsibilities into two role layers.

### 1. `greenhouse_runtime`

Group role for the application runtime.

Capabilities:

- connect through the runtime login user
- `USAGE` on shared schemas
- `SELECT, REFERENCES` on `greenhouse_core`
- `SELECT` on `greenhouse_serving`
- `SELECT, INSERT, UPDATE, DELETE` on `greenhouse_sync`
- `SELECT, INSERT, UPDATE, DELETE` on domain tables it operates

Non-capabilities:

- no schema ownership
- no DDL by default
- no ad hoc grants

Current login mapping:

- `greenhouse_app` inherits `greenhouse_runtime`

### 2. `greenhouse_migrator`

Group role for schema setup, migrations and controlled backfills.

Capabilities:

- `USAGE` on shared schemas
- `SELECT, REFERENCES` on `greenhouse_core`
- `SELECT` on `greenhouse_serving`
- `SELECT, INSERT, UPDATE, DELETE` on `greenhouse_sync`
- `USAGE, CREATE` on domain schemas
- broad table privileges on domain schemas for setup and migration work

Non-capabilities:

- should not be used by the web runtime

Current admin mapping:

- `postgres` inherits `greenhouse_migrator`
- optional dedicated login user:
  - `greenhouse_migrator_user`

## Shared Schema Contract

The following schemas are platform-level shared surfaces:

- `greenhouse_core`
- `greenhouse_serving`
- `greenhouse_sync`

Rules:

- domains reference `greenhouse_core`
- domains publish operational truth to `greenhouse_sync.outbox_events`
- read models can be exposed via `greenhouse_serving`
- runtime does not own these schemas
- projection-owned serving caches can receive explicit per-table DML grants when a runtime or worker must materialize them; those exceptions must be documented in the owning domain bootstrap and kept narrow
- `greenhouse_serving.projected_payroll_snapshots` is one of those narrow exceptions: Payroll runtime may write the projection cache to promote projected payroll into an official draft, but the official transactional write path remains `greenhouse_payroll`
- `greenhouse_sync.outbox_reactive_log` and `greenhouse_sync.projection_refresh_queue` are also narrow shared exceptions: they back the reactive projection engine and should be provisioned by shared setup, not ad hoc runtime DDL

## Domain Schema Contract

Each operational domain must live in its own schema:

- `greenhouse_hr`
- `greenhouse_payroll`
- `greenhouse_finance`
- `greenhouse_delivery` — runtime projection of external source data (tasks, projects, sprints) + config tables (space_property_mappings)
- `greenhouse_crm` — runtime projection of CRM data (companies, deals, contacts)
- future: `greenhouse_ai`, `greenhouse_access`, etc.

Each domain schema must follow this pattern:

- runtime receives DML privileges through `greenhouse_runtime`
- migrations/backfills receive elevated privileges through `greenhouse_migrator`
- domain tables reference canonical anchors in `greenhouse_core`
- domain setup remains idempotent

## Tooling Model

Greenhouse tooling should support three profiles:

### `runtime`

- uses:
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD`

### `migrator`

- uses:
  - `GREENHOUSE_POSTGRES_MIGRATOR_USER`
  - `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD`

### `admin`

- uses:
  - `GREENHOUSE_POSTGRES_ADMIN_USER`
  - `GREENHOUSE_POSTGRES_ADMIN_PASSWORD`

Operational rule:

- app code only uses `runtime`
- setup scripts use `migrator`
- access bootstrap uses `admin`
- todos los entornos Node.js (Vercel, local, agentes AI, CI) usan Cloud SQL Connector vía `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`. El Connector toma prioridad sobre `GREENHOUSE_POSTGRES_HOST` en `src/lib/postgres/client.ts`.
  - TCP directo (`GREENHOUSE_POSTGRES_HOST`) queda solo como fallback para binarios standalone (`pg_dump`, `psql`) via Cloud SQL Auth Proxy

## Required Tooling

### `pnpm setup:postgres:access`

- creates and grants the access model
- materializes `greenhouse_sync.schema_migrations`
- establishes runtime/migrator role inheritance

### `pnpm pg:doctor`

- validates env loading
- validates current user/profile
- validates role membership
- validates schema privileges on:
  - shared schemas
  - domain schemas

### Setup scripts

- must auto-load `.env.local` / local env files
- must apply the intended profile before importing the Postgres client

## Why This Scales Better

This pattern avoids repeating the same failure mode on each module:

- no more using runtime credentials for DDL accidentally
- no more hidden failures on `REFERENCES` to `greenhouse_core`
- no more temporary env wrappers to run scripts locally
- no more domain-specific grant debugging as the primary workflow

It also aligns with the 360 model:

- identity and shared objects remain centralized
- domain schemas stay operational
- access follows the architecture instead of fighting it

## Rollout Guidance

### Immediate

- bootstrap `greenhouse_runtime` and `greenhouse_migrator`
- map `greenhouse_app` to runtime
- keep `postgres` as temporary admin/migrator fallback
- use `pg:doctor` before each new cut

### Short term

- create dedicated login user `greenhouse_migrator_user`
- store its password in Secret Manager
- stop using `postgres` for routine migrations
- passwords publicados en Secret Manager deben ser scalar crudo:
  - sin comillas envolventes
  - sin `\n` / `\r` literal
  - sin whitespace residual
- después de rotar cualquier password PostgreSQL, ejecutar `pnpm pg:doctor` o una conexión real antes de asumir que el perfil quedó sano

### Steady state

- runtime uses only runtime credentials
- migrations and setup use only migrator credentials
- admin role is reserved for rare platform-level changes
- writable serving materializations remain exceptional and must be explicitly granted per table, not via broad schema ownership
