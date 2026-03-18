# Greenhouse Data Platform Architecture V1

## Purpose

Define the target data-platform architecture for Greenhouse so the portal can stop using BigQuery as a mixed operational and analytical store.

This document establishes:
- which data concerns stay in BigQuery
- which data concerns must move to PostgreSQL
- how raw, conformed, canonical, and serving layers should work together
- how to migrate without breaking the current portal

Use together with:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `project_context.md`

## Problem Statement

Greenhouse currently uses BigQuery for too many responsibilities at once:
- raw ingestion from HubSpot and Notion
- canonical business objects under `greenhouse.*`
- operational writes from product modules
- executive dashboards and 360 reads

This causes recurring operational problems:
- BigQuery table update quota exhaustion
- slow request paths due to analytical joins in transactional flows
- runtime schema bootstrap from web requests
- inconsistent module behavior when infra is missing or partially seeded
- too much coupling between UI/API flows and raw source datasets

BigQuery is excellent for analytics and warehouse-style composition.
It is not the right primary system for mutable application workflows such as HR leave requests, payroll processing, reconciliation, wallets, or access mutations.

## Target Architecture

Greenhouse should operate on two complementary data systems:

### 1. PostgreSQL as OLTP

PostgreSQL becomes the operational source of truth for:
- mutable product workflows
- transactional writes
- approval flows
- balances and state machines
- canonical app master data that must support low-latency reads and frequent updates

Recommended managed runtime on Google Cloud:
- primary recommendation: `Cloud SQL for PostgreSQL`
- later evolution if scale justifies it: `AlloyDB for PostgreSQL`

### 2. BigQuery as OLAP

BigQuery remains the analytical and integration warehouse for:
- raw ingestion layers
- historical snapshots
- conformed datasets
- cross-source semantic models
- 360 read models
- dashboards, reporting, AI context, and heavy aggregation

## Canonical Layering Model

Greenhouse should adopt four explicit data layers.

### Layer A. Raw

Purpose:
- keep source data immutable and traceable

Examples:
- `hubspot_crm.*`
- `notion_ops.*`
- future ads, GA4, Search Console, Teams, or billing feeds

Rules:
- raw tables are never used directly from feature routes
- no business logic lives here
- no portal UI should depend directly on raw source schemas

### Layer B. Conformed

Purpose:
- normalize source-system fields into stable shapes
- resolve source-specific quirks before business modules consume them

Examples:
- normalized HubSpot company view
- normalized Notion tasks/projects/sprints views
- cleaned source enums and timestamps

Rules:
- preserve source IDs
- unify naming and types
- centralize source cleanup logic instead of repeating it in endpoints

Implementation status (2026-03-18):
- `greenhouse_conformed.delivery_tasks` — fully implemented, config-driven property mappings
- `greenhouse_conformed.crm_companies` / `crm_deals` — implemented via HubSpot sync
- Property normalization is **config-driven**: `greenhouse_delivery.space_property_mappings` (Postgres) stores per-Space property name → conformed field mappings with type coercion rules
- Spaces without explicit config fall back to hardcoded default mapping (backward compatible)
- See `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` § "Conformed Data Layer" for full details

### Layer C. Core / Canonical

Purpose:
- represent platform-wide business objects with stable identity

Expected objects:
- Client
- Space
- Collaborator
- Identity Profile
- Provider
- Service Module
- Client Capability Assignment

Rules:
- every shared object has one canonical anchor
- source IDs remain references, not primary platform identity
- write-heavy modules may extend these objects but cannot replace their identity

### Client Versus Space

Greenhouse must stop treating the commercial tenant and the operational workspace as the same object.

Rule:
- `client` is the commercial and contractual boundary
- `space` is the operational boundary that owns delivery/ICO context

Implications:
- a client company may map to one or more `client_space` workspaces
- internal agency workspaces like `Efeonce` must be modeled as `internal_space`
- `space` can exist without `client_id`
- `Agency`, `delivery`, and ICO metrics should resolve against `space_id`
- `CRM` and `Finance` should resolve against `client_id`

### Layer D. Serving / Marts

Purpose:
- optimize for dashboards, drilldowns, 360 views, and AI context

Examples:
- `client_360`
- `member_360`
- `provider_360`
- finance marts
- payroll marts
- capability-level operational views

Rules:
- read-optimized only
- safe to denormalize for speed and usability
- rebuilt from raw/conformed/core, not used as write targets

## Operational Data Placement

### Must move to PostgreSQL first

These domains are operational and write-heavy:

#### HR Core
- departments
- member profiles
- leave types
- leave balances
- leave requests
- leave request actions
- attendance daily records

#### HR Payroll
- compensation versions
- payroll periods
- payroll entries
- payroll bonus config

#### Finance operational workflows
- reconciliation periods
- bank statement rows
- account balances and mutable account metadata
- expense/income states that change due to reconciliation or approvals

#### AI Tooling operational workflows
- wallets
- credit ledger
- member licenses
- tool assignments and other mutable admin records

#### Access and governance
- client users
- user role assignments
- project scopes
- campaign scopes
- feature flags
- audit events

### Should move to PostgreSQL after phase one

Shared master data should progressively move to Postgres as canonical application state:
- `clients`
- `team_members`
- `identity_profiles`
- `identity_profile_source_links`
- `providers`
- `service_modules`
- `client_service_modules`

BigQuery should continue receiving these objects as synced replicas for analytics.

## BigQuery Responsibilities After Migration

BigQuery should remain responsible for:
- source ingestion
- historical retention
- conformed external views
- analytics and reporting
- executive dashboard payloads
- cross-tenant and cross-module marts
- 360 read models for AI and BI workloads

BigQuery should stop being responsible for:
- request-time DDL
- operational approvals and mutable balances
- write-path state machines
- primary app transactions

## Serving Contract Between PostgreSQL and BigQuery

### Write path

1. User action writes to PostgreSQL.
2. Domain rules and transactions complete in PostgreSQL.
3. Change events are emitted or captured.
4. BigQuery is updated asynchronously.

### Read path

- operational screens read from PostgreSQL-backed application services
- analytical screens read from BigQuery marts or cached read models
- hybrid 360 screens may combine both, but through application services, never by exposing raw warehouse access directly

## Sync Strategy

The recommended default is:
- PostgreSQL is authoritative for operational data
- BigQuery is updated asynchronously through an outbox or CDC pattern

Acceptable phase-one patterns:
- scheduled sync jobs
- append-only export jobs
- event/outbox table consumed by a worker

Preferred steady-state pattern:
- transactional outbox from Postgres
- worker/stream to BigQuery conformed and mart layers

## External Source Sync Boundary

Notion and HubSpot must stop being treated as request-time calculation backends.

The target boundary is:
- source APIs feed `BigQuery raw`
- Greenhouse builds `BigQuery conformed`
- runtime-critical subsets are projected into PostgreSQL
- product calculations run from PostgreSQL or BigQuery marts, not from source APIs

The operational blueprint for this is defined in:
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

## Migration Order

### Phase 1. Stop the bleeding

- remove runtime schema bootstraps from request paths
- make missing schema fail fast with structured errors
- provision missing infra outside the app runtime

### Phase 2. Stand up operational Postgres

- provision Cloud SQL for PostgreSQL
- define operational schema for HR, Payroll, AI Tooling, Finance operational flows, and auth/access
- add repository/service boundaries so feature code stops querying BigQuery directly for mutable workflows

### Phase 3. Migrate write-heavy modules

Priority order:
1. `HR > Permisos`
2. `HR Payroll`
3. `AI Tooling` wallets/licenses/ledger
4. `Finance` reconciliation and mutable operational finance flows

### Phase 4. Move shared canonical master data

- move client, collaborator, identity, provider, and capability registry state to PostgreSQL
- keep BigQuery copies synced for 360 and reporting

### Phase 5. Harden marts and retire direct raw dependencies

- replace feature-level joins to `hubspot_crm.*` and `notion_ops.*` with conformed/core/mart reads
- keep raw datasets available for lineage and recovery only

## Google Cloud Recommendation

For Greenhouse, the recommended first operational database is:
- `Cloud SQL for PostgreSQL`

Reasons:
- managed PostgreSQL with lower complexity than AlloyDB
- enough for Greenhouse’s current operational scale
- integrates well with Cloud Run, VPC, IAM, backups, and migration tooling
- allows a clean `OLTP + OLAP` split without overengineering the first move

AlloyDB should be evaluated later only if:
- write throughput grows significantly
- latency/HA requirements exceed Cloud SQL comfort
- the platform evolves into a much heavier operational core

## Initial Provisioning Status

As of `2026-03-15`, the first operational PostgreSQL foundation was provisioned in Google Cloud.

Provisioned runtime:
- project: `efeonce-group`
- instance: `greenhouse-pg-dev`
- engine: `POSTGRES_16`
- region: `us-east4`
- zone: `us-east4-a`
- machine: `db-custom-1-3840`
- storage: `20 GB SSD`
- connection name: `efeonce-group:us-east4:greenhouse-pg-dev`

Initial database objects created:
- database: `greenhouse_app`
- application user: `greenhouse_app`
- migration user: `greenhouse_migrator_user` (DDL permissions)
- canonical PostgreSQL schemas:
  - `greenhouse_core`
  - `greenhouse_serving`
  - `greenhouse_sync`
  - `greenhouse_delivery`
  - `greenhouse_hr`
  - `greenhouse_finance`
  - `greenhouse_crm`
- initial serving views:
  - `client_360`
  - `member_360`
  - `provider_360`
  - `user_360`
  - `client_capability_360`
- delivery projection tables:
  - `greenhouse_delivery.tasks` — runtime projection of conformed delivery tasks
  - `greenhouse_delivery.projects` — runtime projection of conformed delivery projects
  - `greenhouse_delivery.sprints` — runtime projection of conformed delivery sprints
  - `greenhouse_delivery.space_property_mappings` — config table for per-Space Notion property → conformed field mappings (added 2026-03-18)

Initial secret material stored in Secret Manager:
- `greenhouse-pg-dev-postgres-password`
- `greenhouse-pg-dev-app-password`

Boundary of this provisioning:
- this is the operational foundation only
- the Greenhouse app is not yet cut over to PostgreSQL
- feature migration must happen behind repository/service boundaries
- BigQuery remains the active runtime store until each domain is explicitly migrated
- the canonical PostgreSQL backbone is now materialized and received an initial backfill from BigQuery for:
  - `clients`
  - `identity_profiles`
  - `identity_profile_source_links`
  - `client_users`
  - `members`
  - `providers`
  - `service_modules`
  - `client_service_modules`
  - `roles`
  - `user_role_assignments`

## Non-Negotiable Rules

1. No request-time DDL on feature routes.
2. BigQuery is not the primary write store for mutable workflows.
3. Raw datasets are not consumed directly by UI modules.
4. All shared business entities must resolve through canonical IDs.
5. New modules must declare whether they are operational, analytical, or hybrid before choosing their storage pattern.

## Immediate Outcome Expected

When this architecture is adopted:
- Greenhouse stops hitting recurring BigQuery table update quota issues in product workflows
- operational modules become faster and more predictable
- BigQuery becomes simpler and cheaper to reason about
- 360 views become safer because they are built from stable canonical data, not ad hoc runtime joins
- the platform can scale with clearer boundaries between operations and analytics

## Runtime Reality Notes (March 2026)

### Confirmed Operational
- PostgreSQL instance `greenhouse-pg-dev` deployed (Postgres 16, us-east4, db-custom-1-3840)
- Database: `greenhouse_app` with schemas: greenhouse_core, greenhouse_serving, greenhouse_sync, greenhouse_hr, greenhouse_payroll, greenhouse_finance, greenhouse_delivery, greenhouse_crm, greenhouse_ai
- Outbox consumer operational (Vercel cron every 5 min, publishes to `greenhouse_raw.postgres_outbox_events`)
- Outbox marts deployed: `greenhouse_marts` with 5 views (fin_accounts, fin_expenses, payroll_entries from outbox)
- `greenhouse_raw` dataset exists with 11 tables (Notion + HubSpot snapshots + outbox events)
- `greenhouse_conformed` dataset has 6 tables (delivery_projects/tasks/sprints, crm_companies/deals/contacts) — all partitioned + clustered

### Migration Status by Module
| Module | Postgres-First | BigQuery Fallback | Notes |
|--------|---------------|-------------------|-------|
| Finance — Income/Expenses | ✅ | ✅ | Dual-store operational |
| Finance — Accounts/Suppliers | ❌ | Primary | Still BigQuery-only in API routes |
| Finance — Reconciliation | ❌ | Primary | BigQuery-only |
| Finance — Exchange Rates | ❌ | Primary | BigQuery + Vercel cron sync |
| Finance — Intelligence | ❌ | Primary | BigQuery analytical queries |
| HR Payroll | ✅ | ✅ | Postgres-first for periods, entries, compensation |
| HR Core (leave, attendance) | ✅ (Postgres) | ✅ (BigQuery schema bootstrap) | Mixed: leave store is Postgres, schema.ts bootstraps BigQuery tables |
| AI Tooling | ✅ | ✅ | Postgres-primary with BigQuery fallback |
| Account 360 | ✅ | ❌ | Postgres-only |
| Team Admin | ✅ | ❌ | Postgres-only |
| ICO Engine | ❌ | Primary | BigQuery-only (analytical, correct per architecture) |
| Dashboard | ❌ | Primary | BigQuery-only (read model) |
| People | ❌ | Primary | BigQuery for list/detail queries |
| Projects/Sprints | ❌ | Primary | BigQuery (notion_ops legacy + greenhouse_conformed) |

### Legacy Dataset Status
- `hubspot_crm` (35 tables): Still actively read by Finance client queries and dashboard. Target: migrate to greenhouse_conformed.crm_* + Postgres projections
- `notion_ops` (10 tables): Still actively read by delivery/project queries and ICO Engine. Target: migrate to greenhouse_conformed.delivery_*
- `greenhouse` dataset (41 tables): Mix of canonical tables and operational tables. Some should migrate to Postgres, others remain as BigQuery source of truth

### External Sync Pipeline Infrastructure
7 Cloud Functions/Cloud Run services in us-central1:
- notion-bq-sync (Cloud Run, daily 3AM CL)
- hubspot-bq-sync (Cloud Function, daily 3:30AM CL)
- hubspot-notion-deal-sync (Cloud Function, every 15min)
- notion-hubspot-reverse-sync (Cloud Function, every 15min)
- notion-frameio-sync (Cloud Function, on-demand)
- notion-teams-notify (Cloud Function, on-demand)
- hubspot-greenhouse-integration (Cloud Run, on-demand)

4 active Cloud Scheduler jobs + 2 paused staging jobs orchestrating the above.

4 Vercel Crons (in-app):
- `/api/cron/outbox-publish` — every 5 min (Postgres outbox → BigQuery)
- `/api/cron/sync-conformed` — daily 3:45 AM UTC (notion_ops → greenhouse_conformed, automated since 2026-03-18)
- `/api/cron/ico-materialize` — daily 6:15 AM UTC (conformed → ICO Engine snapshots)
- `/api/finance/exchange-rates/sync` — daily 11:05 PM UTC

Automated pipeline: notion-bq-sync (3:00 AM) → sync-conformed (3:45 AM) → ico-materialize (6:15 AM)
