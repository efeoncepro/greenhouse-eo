# Greenhouse PostgreSQL Canonical 360 V1

## Purpose

Define the first canonical PostgreSQL model that will support Greenhouse as:
- the operational source of truth for mutable workflows
- the canonical identity and relationship graph for shared business objects
- the base for future `360` read models served both from Postgres and BigQuery marts

This document complements:
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`

## Design Goal

If Greenhouse is going to migrate out of BigQuery for write-heavy flows, the target cannot be just “a Postgres copy of current tables”.

The target must be:
- a canonical operational backbone
- with stable shared IDs
- with domain schemas that can extend the core
- with serving views that expose coherent `360` shapes
- and with an outbox/sync layer that keeps BigQuery useful without keeping it in the write path

## Schema Layout

The initial PostgreSQL layout is split into three foundational schemas plus domain extensions.

### 1. `greenhouse_core`

Canonical business objects and operational anchors.

This schema owns:
- `clients`
- `spaces`
- `space_source_bindings`
- `identity_profiles`
- `identity_profile_source_links`
- `client_users`
- `departments`
- `members`
- `providers`
- `service_modules`
- `client_service_modules`
- `roles`
- `user_role_assignments`
- `entity_source_links`

Rule:
- shared identities live here first
- domain modules extend these objects, but do not replace them

### 2. `greenhouse_serving`

Read-optimized views built from `greenhouse_core`.

Initial views:
- `client_360`
- `space_360`
- `member_360`
- `provider_360`
- `user_360`
- `client_capability_360`

Rule:
- these are read models only
- no write path should target this schema

### 3. `greenhouse_sync`

Cross-system synchronization and publication support.

Initial tables:
- `outbox_events`

Rule:
- PostgreSQL emits operational truth here
- workers move those changes into BigQuery conformed/mart layers

### 4. Domain schemas

Domain workflows extend the canonical core from dedicated schemas instead of pushing module-specific mutable state back into `greenhouse_core`.

#### `greenhouse_hr`

- `leave_types`
- `leave_balances`
- `leave_requests`
- `leave_request_actions`

#### `greenhouse_payroll`

- `compensation_versions` — salary/compensation history per collaborator
- `payroll_periods` — monthly processing periods with lifecycle states
- `payroll_entries` — per-member calculation snapshots (compensation + KPIs + deductions)
- `payroll_bonus_config` — global bonus qualification thresholds

Rule:
- domain tables reference `greenhouse_core` anchors via FK
- write-heavy workflows live here
- the core identity graph remains shared and stable

## Canonical Object Placement

### Client

Anchor:
- `greenhouse_core.clients.client_id`

Important fields:
- `public_id`
- `client_name`
- `legal_name`
- `tenant_type`
- `hubspot_company_id`
- `timezone`
- `billing_currency`
- `status`
- `active`

### Space

Anchor:
- `greenhouse_core.spaces.space_id`

Important fields:
- `client_id` nullable
- `space_name`
- `space_type`
- `primary_project_database_source_id`
- `status`
- `active`

Bridge:
- `greenhouse_core.space_source_bindings`

Rules:
- `client` is the commercial boundary
- `space` is the operational workspace boundary
- client-facing workspaces are `client_space`
- internal agency workspaces like `Efeonce` are `internal_space`
- a space may exist without `client_id`
- delivery objects should resolve to `space_id` first, then optionally to `client_id`

### Identity Profile

Anchor:
- `greenhouse_core.identity_profiles.profile_id`

Important fields:
- `public_id`
- `profile_type`
- `canonical_email`
- `full_name`
- `job_title`
- `status`
- `active`
- `default_auth_mode`
- `primary_source_system`
- `primary_source_object_type`
- `primary_source_object_id`

Bridge:
- `greenhouse_core.identity_profile_source_links`

### Auth Principal

Anchor:
- `greenhouse_core.client_users.user_id`

Important fields:
- `client_id`
- `identity_profile_id`
- `email`
- `full_name`
- `tenant_type`
- `auth_mode`
- `status`
- `active`

### Collaborator

Anchor:
- `greenhouse_core.members.member_id`

Important fields:
- `identity_profile_id`
- `department_id`
- `reports_to_member_id`
- `display_name`
- `primary_email`
- `job_level`
- `employment_type`
- `daily_required`
- `status`
- `active`

### Provider

Anchor:
- `greenhouse_core.providers.provider_id`

Important fields:
- `public_id`
- `provider_name`
- `provider_type`
- `website_url`
- `primary_email`
- `active`

### Service Module

Anchor:
- `greenhouse_core.service_modules.module_id`

Important fields:
- `module_code`
- `module_name`
- `business_line`
- `status`
- `active`

### Client Capability Assignment

Anchor:
- `greenhouse_core.client_service_modules.assignment_id`

Important fields:
- `client_id`
- `module_id`
- `source_system`
- `source_reference`
- `status`
- `active`

## Why This Model Matters

This model lets us migrate domains without rebuilding identity each time.

Examples:
- `HR Leave` can point to `members.member_id`
- `Payroll` can point to `members.member_id`
- `Finance` can point to `clients.client_id`, `members.member_id`, `providers.provider_id`
- `AI Tooling` can point to `clients.client_id`, `members.member_id`, `providers.provider_id`

The first runtime cutover already follows this pattern:
- `HR > Permisos` resolves user and collaborator identity from `greenhouse_core.client_users` and `greenhouse_core.members`
- `HR > Permisos` stores leave types, balances, requests, and review actions in `greenhouse_hr`

That is the actual platform synergy we want.

## Serving Views

The initial serving layer intentionally starts small.

### `greenhouse_serving.member_payroll_360`

Purpose:
- one stable read shape combining canonical member identity with current compensation

Includes:
- core member fields (display_name, primary_email, job_level, employment_type, status)
- department name
- current compensation version (pay_regime, currency, base_salary, remote_allowance, contract_type)
- total compensation versions count
- total payroll entries count

### `greenhouse_serving.client_360`

Purpose:
- one stable read shape for tenant/client context

Includes:
- core client fields
- active module list
- active user count

### `greenhouse_serving.space_360`

Purpose:
- one stable read shape for operational workspaces

Includes:
- core space fields
- linked client context when it exists
- primary `project_database_source_id`
- source binding count
- linked user count through the client bridge when applicable

### `greenhouse_serving.member_360`

Purpose:
- one stable read shape for collaborator identity + org placement

Includes:
- core member fields
- identity profile data
- department
- manager
- linked auth principal count

### `greenhouse_serving.provider_360`

Purpose:
- one stable read shape for vendor/platform context

### `greenhouse_serving.user_360`

Purpose:
- auth principal with canonical client and identity context

### `greenhouse_serving.client_capability_360`

Purpose:
- normalized client/module relationship for dashboard, admin and provisioning flows

## Data Flow Architecture

### PostgreSQL = OLTP (source of truth)

All transactional writes land in PostgreSQL first. This is the authoritative operational store for:
- identity and access (`greenhouse_core`)
- HR workflows (`greenhouse_hr`)
- payroll processing (`greenhouse_payroll`)
- finance operations (`greenhouse_finance`)

The product runtime reads and writes against PostgreSQL. There is no dual-write path.

### BigQuery = OLAP (analytical replica)

BigQuery is the analytical layer. It does not receive direct product writes.

Instead:
1. product writes land in PostgreSQL
2. changes are recorded in `greenhouse_sync.outbox_events`
3. a worker publishes those changes into BigQuery conformed tables and marts
4. BigQuery continues serving warehouse-style analytics, heavy joins, and cross-domain reporting

This split:
- removes the BigQuery `table update quota` problem from the product runtime
- gives Payroll, HR and Finance sub-second write latency with ACID guarantees
- keeps BigQuery available for dashboards, historical analysis, and BI tools that expect a warehouse
- allows each domain to evolve its PostgreSQL schema independently without breaking analytical consumers

### Outbox consumer (pending)

The outbox consumer that reads `greenhouse_sync.outbox_events` and materializes into BigQuery does not exist yet. Until it is built:
- PostgreSQL is the only source of truth for migrated modules
- BigQuery tables for those modules remain empty or stale
- No data is lost — the outbox accumulates all events for eventual replay

When built, the consumer should:
- process events in order per aggregate (e.g., per `member_id`)
- be idempotent (safe to replay)
- materialize into `greenhouse` dataset tables matching the current BigQuery schema for backward compatibility
- optionally feed conformed mart tables for cross-domain analytics

## Provisioning Status

This model was provisioned on:
- project: `efeonce-group`
- Cloud SQL instance: `greenhouse-pg-dev`
- database: `greenhouse_app`

The bootstrap created:
- `greenhouse_core`
- `greenhouse_serving`
- `greenhouse_sync`
- `greenhouse_hr`
- `greenhouse_payroll`
- `greenhouse_finance`
- canonical tables
- `360` serving views (`member_360`, `member_payroll_360`, `client_360`, etc.)
- grants for application user `greenhouse_app`

### Operational cutovers completed

#### HR Leave (`greenhouse_hr`)
- `GET /api/hr/core/meta`
- `GET /api/hr/core/leave/balances`
- `GET /api/hr/core/leave/requests`
- `GET /api/hr/core/leave/requests/[requestId]`
- `POST /api/hr/core/leave/requests`
- `POST /api/hr/core/leave/requests/[requestId]/review`

#### Payroll (`greenhouse_payroll`)
- `GET/POST /api/hr/payroll/compensation`
- `GET/POST /api/hr/payroll/periods`
- `GET /api/hr/payroll/entries`
- `GET /api/hr/payroll/members`
- `POST /api/hr/payroll/periods/[periodId]/approve`
- payroll calculation, recalculation, export, and entry persistence

All migrated routes prefer PostgreSQL when the environment is configured (`isPayrollPostgresEnabled()` / `isHrCoreLeavePostgresEnabled()`), with automatic fallback to BigQuery when PostgreSQL credentials are not present.

## Immediate Migration Implication

When a module migrates next:
- it should attach to `greenhouse_core` IDs first
- it should publish outbox events
- it should use `greenhouse_serving` only for reads
- it should stop inventing module-local copies of `client`, `member`, or `provider`

## Migration Checklist

For each domain module migrating from BigQuery to PostgreSQL:

1. **Schema**: create `greenhouse_<domain>` schema with FK references to `greenhouse_core`
2. **Store**: create `postgres-store.ts` with `is<Module>PostgresEnabled()` guard and `assert<Module>PostgresReady()` TTL check
3. **Guards**: wrap all business logic functions with Postgres-first / BigQuery-fallback pattern
4. **Outbox**: publish domain events to `greenhouse_sync.outbox_events`
5. **Serving view**: add `greenhouse_serving.<entity>_<domain>_360` if cross-domain reads are needed
6. **Provisioning script**: add `scripts/setup-postgres-<domain>.sql` + `.ts` runner + `package.json` script
7. **Backfill**: if BigQuery has historical data, create `scripts/backfill-postgres-<domain>.ts`
8. **TypeScript check**: `pnpm tsc --noEmit` must pass with zero errors
9. **Deploy**: verify on Vercel preview before merging
