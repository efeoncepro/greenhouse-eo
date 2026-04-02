# Greenhouse Source Sync Pipelines V1

## Delta 2026-04-02 — Project to Tasks association model for Notion parity

La relación `Proyecto -> Tareas` de Notion ya tiene un espejo parcial en Greenhouse, pero hoy no está modelada con fidelidad completa.

Estado actual confirmado en runtime:

- `greenhouse_conformed.delivery_tasks` preserva `project_source_id` singular
- `greenhouse_delivery.tasks` preserva `project_record_id` y `notion_project_id` singular
- el sync actual toma la primera relación disponible desde `proyecto_ids?.[0]`
- la lectura `Proyecto -> Tareas` ya puede reconstruirse por join, pero se pierde fidelidad si una tarea trae más de una relación o si queremos auditar exactamente el array de relaciones de Notion

Decisión arquitectónica:

- Greenhouse debe tratar la relación canónica operativa como `task belongs to primary project`
- pero debe preservar además la fidelidad del array de relaciones de Notion para auditoría y paridad

Modelo objetivo:

### 1. Raw fidelity

En `notion_ops` y `greenhouse_conformed` debemos preservar:

- `project_source_ids ARRAY<STRING>` en tareas
- `task_source_ids ARRAY<STRING>` en proyectos cuando la fuente lo permita

Regla:

- el array preserva la relación exacta de Notion
- no debe degradarse a solo la primera relación sin guardar el resto

### 2. Canonical operational relation

Para runtime y joins rápidos, Greenhouse debe exponer:

- `primary_project_source_id` en tareas de conformed
- `project_record_id` en PostgreSQL runtime

Regla:

- la relación operativa principal se usa para APIs, readers y scorecards
- si una tarea viene con más de un proyecto relacionado, Greenhouse debe escoger una relación primaria explícita y además conservar el resto en el carril de fidelidad

### 3. Bridge for future many-to-many fidelity

Si el workspace empieza a usar relaciones `task <-> project` genuinamente many-to-many, el patrón recomendado es un bridge explícito:

- `greenhouse_conformed.delivery_task_project_links`
- `greenhouse_delivery.task_project_links`

Campos mínimos sugeridos:

- `task_source_id`
- `project_source_id`
- `is_primary`
- `source_relation_count`
- `sync_run_id`
- `synced_at`

Regla:

- no crear el bridge solo por teoría
- activarlo cuando la auditoría detecte tareas con múltiples proyectos reales o cuando un módulo necesite esa fidelidad explícita

### 4. Project 360 read model

La lectura correcta de un proyecto con sus asociaciones no debe depender de una columna rollup tipo Notion.

Debe resolverse por join desde tareas y exponer:

- metadatos del proyecto
- lista de tareas asociadas
- counts por estado
- overdue, on-time, late drops, carry-over
- responsables
- bloqueos
- fechas relevantes
- KPIs agregados del conjunto de tareas

Regla:

- `Proyecto -> Tareas` en Greenhouse debe ser un read-model calculado, no un string o label precalculado opaco

### 5. Publishing back to Notion

Si Greenhouse publica de vuelta a Notion:

- Notion puede consumir rollups o scorecards derivados de Greenhouse
- pero la verdad operativa del vínculo `project -> tasks` debe seguir viviendo en Greenhouse como join auditable

Vía recomendada de implementación:

1. ampliar `greenhouse_conformed.delivery_tasks` para preservar `project_source_ids`
2. mantener `project_source_id` actual como `primary_project_source_id`
3. evaluar si `delivery_projects` necesita también `task_source_ids` o si el join desde tasks es suficiente
4. construir un reader `Project 360` sobre `delivery_projects + delivery_tasks`
5. si aparecen casos reales many-to-many, introducir el bridge `task_project_links`

## Delta 2026-04-02 — TASK-197 source sync parity implemented

Se implementó un primer slice técnico de paridad para responsables y relación `Proyecto -> Tareas`.

Cambios aplicados:

- `greenhouse_conformed.delivery_tasks` ahora preserva `project_source_ids ARRAY<STRING>` además de `project_source_id`
- `sync-notion-conformed.ts` ahora valida cobertura de assignee por `space_id`, no solo globalmente
- `scripts/sync-source-runtime-projections.ts` ya normaliza `responsables_ids` y `responsable_ids` en el mismo carril
- `greenhouse_delivery.tasks` queda preparado para persistir:
  - `assignee_source_id`
  - `assignee_member_ids`
  - `project_source_ids`

Compatibilidad:

- `project_source_id` y `assignee_member_id` siguen existiendo como contrato backward-compatible
- `ICO` puede seguir leyendo `project_source_id` y `assignee_member_ids`
- `Person 360` puede seguir leyendo `assignee_member_id` mientras runtime empieza a cerrar la brecha de fidelidad

Nota operativa:

- la aplicación de la nueva migración quedó bloqueada por drift preexistente en `public.pgmigrations` contra el repo local para una migración anterior de Notion governance; no se debe resolver renombrando timestamps manualmente sin corregir antes esa discrepancia

## Delta 2026-04-01 — Notion DB IDs canónicos para Delivery / ICO

Los teamspaces y databases de Notion que hoy alimentan el baseline operativo de Delivery e `ICO` deben tratarse como referencia arquitectónica viva, no solo como contexto de una task.

Baseline auditado vía MCP:

- `Efeonce`
  - `Proyectos`: `15288d9b-1459-4052-9acc-75439bbd5470`
  - `Tareas`: `3a54f090-4be1-4158-8335-33ba96557a73`
- `Sky Airlines`
  - `Proyectos`: `23039c2f-efe7-817a-8272-ffe6be1a696a`
  - `Tareas`: `23039c2f-efe7-8138-9d1e-c8238fc40523`
- `ANAM`
  - `Proyectos`: `32539c2f-efe7-8053-94f7-c06eb3bbf530`
  - `Tareas`: `32539c2f-efe7-81a4-92f4-f4725309935c`

Uso correcto de estos IDs:

- son `source ids` de Notion, no identidades canónicas de Greenhouse
- son el ancla operativa para auditar `space_notion_sources`, `notion_ops.*`, `greenhouse_conformed.delivery_projects` y `greenhouse_conformed.delivery_tasks`
- si cambian en Notion o se agrega un nuevo Space relevante para `ICO`, actualizar este documento y `TASK-186` en el mismo cambio

Regla operativa:

- para auditorías de métricas Delivery, primero verificar que el sync sigue leyendo estas DBs correctas antes de asumir que el problema está en `ICO` o en el serving layer
- no confiar en memoria conversacional para redescubrir estos IDs; este documento es la referencia viva

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
- `assignee_member_id` — first Notion responsable resolved to Greenhouse member ID (backward compat)
- `assignee_member_ids` — `ARRAY<STRING>` all Notion responsables resolved to Greenhouse member IDs (enables person-level ICO metrics via UNNEST; added 2026-03-18)
- `project_source_ids` — `ARRAY<STRING>` exact Notion project relations preserved for auditability and richer project readers (added 2026-04-02)
- `due_date`
- `completed_at`
- `last_edited_time`
- `is_deleted`
- `sync_run_id`

Delta 2026-04-01:
- `due_date` quedó ratificado como ancla operativa principal del período para `ICO` / `Performance Report`.
- `completed_at` sigue siendo señal de cierre y calidad, pero ya no debe usarse como único criterio de pertenencia mensual.
- El sync no necesita recalcular métricas; su responsabilidad sigue siendo preservar primitivas suficientes para que `ICO` derive período, carry-over y scorecards de forma auditable.

Multi-assignee enrichment:
- `responsables_ids` (Notion array) is mapped through `team_members.notion_user_id` → `member_id`
- `assignee_member_id` keeps first assignee for backward compatibility
- `assignee_member_ids` stores all resolved IDs; `v_tasks_enriched` falls back to wrapping the singular `assignee_member_id` for legacy rows
- Column added idempotently via `ALTER TABLE ADD COLUMN IF NOT EXISTS` at sync time

Guardrails added after payroll/ICO remediation (2026-03-27):
- the conformed sync must fail loudly if source tasks with `responsables_ids` are read but `greenhouse_conformed.delivery_tasks` persists `0` rows with `assignee_source_id`
- as of `TASK-197`, this validation must also hold per `space_id`, so a healthy space like `Efeonce` cannot mask attribution loss in another space like `Sky`
- sync results should expose validation counters at runtime:
  - `sourceTasksWithResponsables`
  - `conformedTasksWithAssigneeSource`
  - `conformedTasksWithAssigneeMember`
  - `conformedTasksWithAssigneeMemberIds`
- this guardrail exists because person-level `ICO` metrics and payroll variable bonuses depend on `UNNEST(assignee_member_ids)`; silent loss of task attribution is therefore a payroll-impacting incident, not only a delivery analytics issue

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
- `integration_registry` — central registry of native integrations with taxonomy, ownership, readiness status, consumer domains and sync cadence. Introduced by `TASK-188` as Layer 1 of the Native Integrations Layer (`GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`).

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

## Conformed Data Layer — Config-Driven Property Mappings

### Status: Implemented (2026-03-18)

The conformed data layer now supports **config-driven property mappings** via a Postgres configuration table. This enables onboarding new Spaces (clients) with different Notion property names or types without modifying the sync script.

Design rule reinforced after auditing `Efeonce`, `Sky Airlines`, and `ANAM`:

- Spaces may share a broad operational shape (`Proyectos`, `Tareas`, similar KPI intent), but they do not have identical schemas.
- Greenhouse must preserve a **common KPI core contract** for Delivery/ICO while allowing **space-specific extensions** for client, vertical, or project-type particularities.
- The right answer is not a rigid one-size-fits-all schema, nor uncontrolled per-client hardcoding.
- The right answer is:
  - stable core fields for cross-space KPIs
  - config-driven mapping for property name/type drift
  - explicit classification of `space-specific` fields that enrich explanation, workflow, or client context without redefining the KPI core

### Architecture

```
Notion Teamspace (Space A) ─┐
Notion Teamspace (Space B) ─┤  Notion API
Notion Teamspace (Space N) ─┘
        │
        ▼
notion-bq-sync (Python, Cloud Run)
  • Generic service — syncs Notion → BigQuery
  • NO Greenhouse business logic
  • Writes raw to notion_ops.tareas (Spanish names)
        │
        ▼
sync-source-runtime-projections.ts (TypeScript)
  │
  ├── 1. Reads notion_ops.tareas from BigQuery (raw)
  ├── 2. Assigns space_id via preferredSpaceMap (client_notion_bindings)
  ├── 3. Loads property mappings from Postgres (cached per space_id)
  │      └── greenhouse_delivery.space_property_mappings
  ├── 4. For each task:
  │      ├── Builds result with hardcoded default mapping (always)
  │      ├── If space has config mappings → applies overrides via applyPropertyMappings()
  │      │   ├── normalizeNotionKey() matches raw property names
  │      │   ├── applyCoercion() converts types (16 rules)
  │      │   └── Overwrites default result fields with config-driven values
  │      └── If no mappings → uses default result (backward compatible)
  ├── 5. Writes to greenhouse_raw.tasks_snapshots (BQ, immutable)
  ├── 6. Writes to greenhouse_conformed.delivery_tasks (BQ, normalized)
  │      └── validates that assignee attribution was not lost during persistence
  └── 7. Writes to greenhouse_delivery.tasks (Postgres, projection)
```

### Configuration table

Table: `greenhouse_delivery.space_property_mappings` (Postgres)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Unique identifier |
| `space_id` | TEXT NOT NULL | Space that this mapping belongs to |
| `notion_property_name` | TEXT NOT NULL | Exact Notion property name (case-sensitive) |
| `conformed_field_name` | TEXT NOT NULL | Target field in conformed schema (snake_case, English) |
| `notion_type` | TEXT NOT NULL | Notion property type: number, formula, select, rollup, etc. |
| `target_type` | TEXT NOT NULL | Target type: STRING, INTEGER, FLOAT, BOOLEAN, TIMESTAMP |
| `coercion_rule` | TEXT NOT NULL | How to convert: direct, formula_to_int, status_to_string, etc. |
| `is_required` | BOOLEAN | Log warning if property not found |
| `fallback_value` | TEXT | Default value if null (JSON encoded) |

Constraints:
- `UNIQUE (space_id, conformed_field_name)` — one source per conformed field per Space
- `UNIQUE (space_id, notion_property_name)` — one target per Notion property per Space

### Coercion rules

16 built-in rules handle Notion type heterogeneity:

| Rule | Converts | Example |
|------|----------|---------|
| `direct` | Same type cast | `number → INTEGER` |
| `formula_to_int/float/string/bool` | Notion formula result | `"2.0" → 2` |
| `rollup_to_int/float/string` | Notion rollup result | `"5" → 5` |
| `select_to_string` / `status_to_string` | Select/Status objects | `{name:"Done"} → "Done"` |
| `checkbox_to_bool` | Checkbox | `true → true` |
| `extract_number_from_text` | First number from text | `"v2.1" → 2.1` |
| `relation_first_id` | First ID from relation | `["abc","def"] → "abc"` |
| `people_first_email` | First email from people | `["a@b.com"] → "a@b.com"` |
| `ignore` | Excluded from output | — |

### Fallback behavior

Spaces without entries in `space_property_mappings` use the hardcoded default mapping. This is the permanent fallback for Efeonce and any Space whose Notion properties match the default schema.

Important nuance:

- “matches the default schema” does not mean “is identical to Efeonce”
- a Space can share the KPI core and still require additional fields or different semantics for project-specific use cases
- when that happens, prefer extending mappings and downstream contracts explicitly instead of silently overfitting the default schema

If the Postgres query for mappings fails (connection error, table missing), the pipeline logs a warning and continues with the default mapping. The sync never blocks on a configuration error.

Current nuance after `TASK-187`:

- the active cron lane `src/lib/sync/sync-notion-conformed.ts` still consumes default/runtime mappings and does not yet read `space_property_mappings` as its primary contract source
- `space_property_mappings` remains the governance/config table for explicit overrides, discovery output and future runtime convergence
- per-space Notion governance is now persisted in:
  - `greenhouse_sync.notion_space_schema_snapshots`
  - `greenhouse_sync.notion_space_schema_drift_events`
  - `greenhouse_sync.notion_space_kpi_readiness`
- admin surfaces for that governance live under:
  - `GET /api/admin/tenants/[id]/notion-governance`
  - `POST /api/admin/tenants/[id]/notion-governance/refresh`

### Discovery script

`scripts/notion-schema-discovery.ts` automates new Space onboarding:

```bash
npx tsx scripts/notion-schema-discovery.ts --space-id EO-SPC-SKY
```

Output:
1. `discovery_report.md` — property catalog, suggested mappings with confidence levels, type conflicts, seed SQL
2. `discovery_raw.json` — full raw schema data

The script reads Space configurations from `greenhouse_core.space_notion_sources`, calls the Notion API to enumerate database properties, and matches them against the conformed schema using name patterns and type compatibility.

### New Space onboarding workflow

1. Register Space in Greenhouse (API: `POST /api/admin/spaces`)
2. Register Notion DB bindings (UI `TenantNotionPanel` or `POST /api/integrations/notion/register`)
3. Refresh/persist governance snapshots (best-effort from register or explicit `POST /api/admin/tenants/[id]/notion-governance/refresh`)
4. Run discovery script when a human needs a richer audit/export: `npx tsx scripts/notion-schema-discovery.ts --space-id <SPACE_ID>`
5. Review `discovery_report.md` — adjust mappings as needed
6. Execute seed SQL in Postgres (from the report) when explicit overrides are required
7. Run sync: shared control plane `POST /api/admin/integrations/notion/sync` or cron `GET /api/cron/sync-conformed`
8. Verify data in `greenhouse_conformed.delivery_tasks` filtered by `space_id`
9. Run ICO materialization: `npx tsx scripts/materialize-ico.ts`

### Operational remediation runbook

When payroll or person-level `ICO` metrics show missing KPI despite real completed work:

1. Audit `notion_ops.tareas` for rows with `responsables_ids`
2. Compare against `greenhouse_conformed.delivery_tasks`:
   - `assignee_source_id`
   - `assignee_member_id`
   - `assignee_member_ids`
3. If attribution was lost, run the canonical remediation:
   - `pnpm exec tsx scripts/remediate-ico-assignee-attribution.ts <year> <month>`
4. Re-verify:
   - `greenhouse_conformed.delivery_tasks` attribution counters
   - `ico_engine.metrics_by_member` for the affected period
   - downstream consumers such as projected payroll

This remediation is safe to rerun and is the canonical recovery path for attribution-driven KPI gaps.

---

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
