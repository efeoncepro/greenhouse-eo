# Greenhouse Source Sync Pipelines V1

## Purpose

Define how Greenhouse should ingest, back up, normalize, and serve data that currently comes from external operational systems such as Notion and HubSpot.

This document answers four practical questions:
- where raw source backups should live
- where normalized source data should live
- what subset must be projected into PostgreSQL for runtime calculations
- how Greenhouse should stop depending on live Notion/HubSpot reads in product request paths

Use together with:
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `project_context.md`

## Core Decision

Greenhouse will not calculate business logic directly from Notion or HubSpot APIs at request time.

The correct serving model is:
1. external sources are ingested and backed up into BigQuery raw tables
2. normalized source models are built in BigQuery conformed tables
3. only the runtime-critical subset is projected into PostgreSQL
4. product modules calculate from PostgreSQL or from BigQuery marts, never from raw source APIs

This means:
- Notion and HubSpot remain source systems
- BigQuery becomes the historical and analytical landing zone
- PostgreSQL becomes the operational serving layer for fast reads and transactional calculations

## End-to-End Topology

### Source to platform flow

1. `Notion` and `HubSpot` are pulled by scheduled sync jobs.
2. Each pull writes an append-only snapshot into `BigQuery raw`.
3. BigQuery builds `conformed` current-state tables from those snapshots.
4. Greenhouse projects selected conformed entities into PostgreSQL.
5. Product modules read:
   - `PostgreSQL` for operational runtime and low-latency calculations
   - `BigQuery marts` for analytical and historical views

### Reverse analytical flow

1. Product writes happen in PostgreSQL.
2. Postgres emits outbox events.
3. BigQuery marts receive operational truth asynchronously.
4. `360`, BI and executive dashboards read from BigQuery.

## Data Layer Responsibilities

### 1. BigQuery raw

Purpose:
- immutable backup
- audit trail
- replay and recovery
- source-diff support

Rules:
- append-only
- partitioned by ingestion date
- clustered by source object id when possible
- stores full source payload plus sync metadata

### 2. BigQuery conformed

Purpose:
- normalize source schemas
- flatten properties
- resolve enums and timestamps
- expose stable input shapes for downstream serving

Rules:
- one conformed table per business concept
- preserves source ids
- no UI or API should consume source raw tables directly

### 3. PostgreSQL operational projections

Purpose:
- provide fast local joins and calculations for runtime modules
- remove direct dependence on Notion/HubSpot latency
- anchor external context to canonical ids already living in `greenhouse_core`

Rules:
- only selected serving slices are projected here
- do not copy every raw source object into Postgres
- every projected row must keep source ids and sync metadata

### 4. BigQuery marts

Purpose:
- historical KPIs
- 360 views
- heavy joins
- AI and BI context

Rules:
- denormalized and analytical
- rebuilt from raw, conformed, and synced operational truth

## Canonical Datasets and Schemas

### BigQuery target datasets

Recommended target datasets:
- `greenhouse_raw`
- `greenhouse_conformed`
- `greenhouse_marts`

Legacy datasets currently in use:
- `hubspot_crm`
- `notion_ops`
- `greenhouse`

Migration rule:
- legacy datasets can remain as phase-one inputs
- new sync logic should target `greenhouse_raw` and `greenhouse_conformed`
- feature code should progressively stop reading `hubspot_crm.*` and `notion_ops.*`

### PostgreSQL target schemas

Existing:
- `greenhouse_core`
- `greenhouse_serving`
- `greenhouse_sync`
- `greenhouse_hr`

New serving schemas recommended for external-source projections:
- `greenhouse_crm`
- `greenhouse_delivery`

Purpose:
- `greenhouse_crm`: operational projection of commercial source slices
- `greenhouse_delivery`: operational projection of projects, sprints and tasks used by runtime features

## Raw Backup Model

All source ingestions should persist the following metadata fields.

### Common raw columns

- `sync_run_id`
- `source_system`
- `source_object_type`
- `source_object_id`
- `source_parent_object_id`
- `source_created_at`
- `source_updated_at`
- `source_deleted_at`
- `is_deleted`
- `payload_json`
- `payload_hash`
- `ingested_at`
- `ingested_date`

### Why append-only raw matters

This gives Greenhouse:
- replayable history
- point-in-time reconstruction
- source drift detection
- safe rebuild of conformed tables
- an internal backup even if Notion or HubSpot data changes unexpectedly

## Source Table Blueprint

### Notion raw tables

Minimum raw tables:
- `greenhouse_raw.notion_projects_snapshots`
- `greenhouse_raw.notion_tasks_snapshots`
- `greenhouse_raw.notion_sprints_snapshots`
- `greenhouse_raw.notion_people_snapshots`
- `greenhouse_raw.notion_databases_snapshots`

Primary incremental watermark:
- `last_edited_time`

Deletion/tombstone fields:
- `archived`
- `in_trash`

Expected keys:
- `source_object_id = notion page id`
- `source_parent_object_id = notion database id or parent page id`

### HubSpot raw tables

Minimum raw tables:
- `greenhouse_raw.hubspot_companies_snapshots`
- `greenhouse_raw.hubspot_deals_snapshots`
- `greenhouse_raw.hubspot_contacts_snapshots`
- `greenhouse_raw.hubspot_owners_snapshots`
- `greenhouse_raw.hubspot_line_items_snapshots`

Primary incremental watermark:
- `updatedAt` when available
- otherwise `hs_lastmodifieddate`

Deletion/tombstone fields:
- `archived`
- source diff-based tombstones if the endpoint does not emit deletes directly

Expected keys:
- `source_object_id = HubSpot object id`

## Conformed Model Blueprint

Conformed tables should strip away source quirks and expose stable business semantics.

### Notion conformed tables

Recommended tables:
- `greenhouse_conformed.delivery_projects`
- `greenhouse_conformed.delivery_tasks`
- `greenhouse_conformed.delivery_sprints`

Recommended business fields for tasks:
- `task_source_id`
- `project_source_id`
- `sprint_source_id`
- `client_source_id`
- `client_id`
- `module_code`
- `module_id`
- `task_name`
- `task_status`
- `task_phase`
- `task_priority`
- `assignee_source_id`
- `assignee_member_id`
- `due_date`
- `completed_at`
- `last_edited_time`
- `is_deleted`
- `sync_run_id`

### HubSpot conformed tables

Recommended tables:
- `greenhouse_conformed.crm_companies`
- `greenhouse_conformed.crm_deals`
- `greenhouse_conformed.crm_contacts`
- `greenhouse_conformed.crm_owners`

Recommended business fields for deals:
- `deal_source_id`
- `company_source_id`
- `client_id`
- `pipeline_id`
- `stage_id`
- `stage_name`
- `deal_name`
- `amount`
- `currency`
- `close_date`
- `owner_source_id`
- `owner_user_id`
- `is_closed_won`
- `is_closed_lost`
- `updated_at`
- `is_deleted`
- `sync_run_id`

## PostgreSQL Projection Blueprint

### What must be projected into PostgreSQL

Only the slices required by product runtime and operational calculations.

### `greenhouse_crm`

Recommended tables:
- `greenhouse_crm.companies`
- `greenhouse_crm.deals`
- `greenhouse_crm.contacts`

These tables should keep:
- canonical foreign keys such as `client_id`
- source ids such as `hubspot_company_id` and `hubspot_deal_id`
- sync metadata:
  - `source_updated_at`
  - `synced_at`
  - `sync_run_id`
  - `payload_hash`

Primary uses:
- Finance and admin runtime that needs client/commercial context fast
- tenant provisioning context
- pipeline-aware UI without live HubSpot calls

### `greenhouse_delivery`

Recommended tables:
- `greenhouse_delivery.projects`
- `greenhouse_delivery.sprints`
- `greenhouse_delivery.tasks`

These tables should keep:
- canonical foreign keys:
  - `client_id`
  - `module_id`
  - `member_id`
- source ids:
  - `notion_project_id`
  - `notion_task_id`
  - `notion_sprint_id`
- operational fields needed by runtime:
  - status
  - phase
  - due date
  - completion state
  - effort/load markers
  - current assignee
- sync metadata:
  - `source_updated_at`
  - `synced_at`
  - `sync_run_id`
  - `payload_hash`

Primary uses:
- capability runtime
- agency and capacity surfaces
- task-derived operational calculations
- cached drilldowns without live Notion access

## What stays in BigQuery only

These should stay analytical-first unless product proves they are needed in low-latency runtime:
- full source payload history
- long-tail CRM properties not used by runtime
- long-tail Notion properties not used by runtime
- historical task status event reconstruction
- heavy multi-period KPI computation
- executive BI and AI context marts

## Calculation Policy

### Runtime calculations

Must run from PostgreSQL if they affect:
- interactive screens
- approval flows
- state transitions
- near-real-time operational counters
- joins between external context and canonical identity

Examples:
- current task load per collaborator
- stuck tasks used by a capability runtime
- latest commercial status shown in admin/runtime
- finance or delivery counters rendered inside operational screens

### Analytical calculations

Should run from BigQuery marts if they affect:
- trend analysis
- historical performance
- cross-module reporting
- executive dashboards
- AI enrichment or narrative summaries over large timespans

Examples:
- monthly throughput trends
- multi-quarter revenue by module
- long-range team utilization
- historical CRM conversion analysis

## Sync Control Plane

The sync system itself should have an explicit control plane in PostgreSQL.

Recommended tables under `greenhouse_sync`:
- `source_sync_runs`
- `source_sync_watermarks`
- `source_sync_failures`

### `source_sync_runs`

Tracks each execution:
- `sync_run_id`
- `source_system`
- `source_object_type`
- `started_at`
- `finished_at`
- `status`
- `records_read`
- `records_written_raw`
- `records_written_conformed`
- `records_projected_postgres`

### `source_sync_watermarks`

Tracks incremental checkpoints:
- `source_system`
- `source_object_type`
- `watermark_key`
- `watermark_value`
- `updated_at`

### `source_sync_failures`

Tracks retryable or dead-letter failures:
- `sync_failure_id`
- `sync_run_id`
- `source_system`
- `source_object_type`
- `source_object_id`
- `error_code`
- `error_message`
- `payload_json`
- `created_at`
- `resolved_at`

## Incremental Sync Strategy

### Notion

Incremental read key:
- `last_edited_time`

Sync rule:
- fetch all changed pages since watermark
- write append-only raw snapshot
- rebuild conformed current-state rows for changed objects
- project changed records into `greenhouse_delivery`

### HubSpot

Incremental read key:
- `updatedAt` or `hs_lastmodifieddate`

Sync rule:
- fetch all changed records since watermark
- write append-only raw snapshot
- upsert conformed current-state rows
- project runtime-critical records into `greenhouse_crm`

### Conflict rule

If the incoming `payload_hash` did not change, projection to Postgres can be skipped.

## Suggested Cadence

### Notion

- projects: every `15` minutes
- tasks: every `10` minutes
- sprints: every `15` minutes

### HubSpot

- companies: every `15` minutes
- deals: every `10` minutes
- contacts: every `15` minutes
- owners: every `60` minutes

### BigQuery marts

- near-real-time marts fed from Postgres outbox: every `5` to `15` minutes
- heavier executive marts: hourly or daily, depending on cost and freshness requirements

## Rollout Order

### Phase 1

- formalize raw backup tables for Notion and HubSpot
- formalize sync control plane in `greenhouse_sync`
- stop introducing new runtime reads to `notion_ops.*` and `hubspot_crm.*`

### Phase 2

- build conformed tables:
  - `greenhouse_conformed.delivery_projects`
  - `greenhouse_conformed.delivery_tasks`
  - `greenhouse_conformed.delivery_sprints`
  - `greenhouse_conformed.crm_companies`
  - `greenhouse_conformed.crm_deals`

### Phase 3

- project runtime-critical slices into PostgreSQL:
  - `greenhouse_delivery.*`
  - `greenhouse_crm.*`

### Phase 4

- switch runtime services to PostgreSQL-backed projections
- keep BigQuery as analytics and rebuild layer

### Phase 5

- add marts and historical dashboards from:
  - raw backups
  - conformed external data
  - synced Postgres operational truth

## Non-Negotiable Rules

- no product API should depend on live Notion or HubSpot reads for critical runtime logic
- every synced external row must preserve its source id
- every raw ingestion must be replayable
- every operational projection in PostgreSQL must preserve `source_updated_at` and `synced_at`
- every module must read through Greenhouse service layers, never directly from source raw tables

## Immediate Next Step

The first implementation slice after this document should be:
- create `greenhouse_sync.source_sync_runs`
- create `greenhouse_sync.source_sync_watermarks`
- create BigQuery raw tables for Notion and HubSpot snapshots
- build the first conformed tables for:
  - `delivery_tasks`
  - `delivery_projects`
  - `crm_companies`
  - `crm_deals`

That is the minimum foundation needed before moving more calculations out of direct source reads.
