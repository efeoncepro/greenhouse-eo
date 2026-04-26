# GREENHOUSE_NOTION_DELIVERY_SYNC_V1

> **Type**: Canonical architecture spec
> **Version**: 1.0
> **Status**: Production
> **Created**: 2026-04-26
> **Owners**: Reliability + Delivery
> **Supersedes**: ad-hoc `pnpm sync:source-runtime-projections` script as the production PG-projection path

## Purpose

Single source of truth for how Notion-sourced delivery entities (tasks, projects,
sprints) flow from Notion → BigQuery raw → BigQuery conformed → Postgres
runtime store. Defines the trigger topology, the failure modes that have hit
production before, and the rules that prevent regression.

This spec was promoted to canonical after the 2026-04-26 incident where
`greenhouse_delivery.{tasks,projects,sprints}` drifted **24 days** behind BQ
conformed because the only path that wrote to Postgres was a manual ad-hoc
script (`pnpm sync:source-runtime-projections`) that was never scheduled. The
admin "Notion untitled pages" reliability queue surfaced 3,041 Sky Airline
tasks as untitled — when in fact BQ conformed had the resolved titles via the
multi-property cascade, but Postgres never saw them.

## Pipeline overview

```
[Notion Workspaces]
       │  (notion-bq-sync Cloud Run, sibling repo)
       ▼
[BQ raw: notion_ops.{tareas,proyectos,sprints}]
       │
       │  Step 1 — runNotionSyncOrchestration
       │  (BQ raw → BQ conformed staged-swap)
       ▼
[BQ conformed: greenhouse_conformed.delivery_{projects,tasks,sprints}]
       │
       │  Step 2 — syncBqConformedToPostgres (UNCONDITIONAL)
       │  (BQ conformed → PG via projectNotionDeliveryToPostgres)
       ▼
[PG runtime: greenhouse_delivery.{projects,tasks,sprints}]
       │
       │  consumed by every UI (Agency, Pulse, ICO, Person Activity, etc.),
       │  reliability dashboard, MCP read endpoints, exports, ...
       ▼
[Surfaces]
```

## Trigger topology (canonical)

| Trigger                                                           | Cron / freq            | Path                                                                                              | Purpose                                                                                                       |
| ----------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Cloud Scheduler `ops-notion-conformed-sync`**                   | `20 7 * * *` (Santiago) | Cloud Run `ops-worker POST /notion-conformed/sync` → Step 1 + Step 2                              | Daily canonical sync. Always runs both steps regardless of skip on Step 1.                                    |
| **Admin manual** `POST /api/admin/integrations/notion/trigger-…`  | on-demand              | Vercel route auth'd via admin tenant context → calls `runNotionSyncOrchestration` then PG drain    | Recovery path when ops needs to force a run without rotating CRON_SECRET.                                      |
| **Vercel cron `/api/cron/sync-conformed`**                        | `20 7 * * *`           | Vercel serverless → `runNotionConformedCycle` (which now also runs PG drain inline tail step)      | Historical fallback. Kept for backwards compat. Cloud Run path is preferred (no 800s timeout, retry, OIDC).    |
| **Manual script `pnpm sync:source-runtime-projections`**          | dev ad-hoc only        | Local Node script writing BQ raw + conformed + PG                                                  | Developer-only. NOT for production. Kept because some dev workflows still seed BQ raw from CSV imports.        |

## Step 1 — `runNotionSyncOrchestration`

Lives in `src/lib/integrations/notion-sync-orchestration.ts`.

- Reads BQ raw `notion_ops.{tareas,proyectos,sprints}`.
- Detects ready spaces via `getNotionRawFreshnessGate()`.
- For each ready space, runs `runNotionConformedCycle()` which:
  - Resolves titles via `buildCoalescingTitleExpression` cascade (`nombre_de_tarea` → `nombre_de_la_tarea` for Sky).
  - Validates parity vs raw.
  - Writes BQ conformed via `replaceBigQueryTablesWithStagedSwap` (atomic per-table swap with `preserveWhereSql` for partial syncs).
  - Records run in `source_sync_runs`.
- **Skip case**: when conformed is already up-to-date for the requested spaces, returns early with `notes='Conformed sync already current for requested spaces; write skipped'`. This is intentional, NOT a bug.

## Step 2 — `syncBqConformedToPostgres` (UNCONDITIONAL)

Lives in `src/lib/sync/sync-bq-conformed-to-postgres.ts`. **The piece that closes the historical gap.**

- Reads `greenhouse_conformed.delivery_{projects,tasks,sprints}` directly from BQ.
- Maps to PG row shape, coercing fractional BQ-formula values to PG INTEGER via `toInteger()` (`Math.trunc`, not `Math.round`, to preserve "days passed so far" semantics).
- Calls `projectNotionDeliveryToPostgres({ ... })` which UPSERTs by `notion_*_id` per row.
- Optionally marks rows missing from the batch as `is_deleted=TRUE` (mirrors the BQ staged-swap semantics) when `replaceMissingForSpaces=true`.

Independent of Step 1 — runs even when Step 1 says "skipped" because BQ is already current. PG can be stale even when BQ is fresh; this step ensures they stay aligned.

## Helper layering

```
ops-worker /notion-conformed/sync              ← Cloud Run endpoint (canonical)
  │
  ├─→ runNotionSyncOrchestration               ← Step 1 (BQ side)
  │     │
  │     └─→ runNotionConformedCycle
  │           │
  │           └─→ projectNotionDeliveryToPostgres  ← inline PG write IF Step 1 didn't skip
  │
  └─→ syncBqConformedToPostgres                ← Step 2 (PG drain, ALWAYS runs)
        │
        └─→ projectNotionDeliveryToPostgres    ← reused primitive
```

The primitive `projectNotionDeliveryToPostgres` lives in
`src/lib/sync/project-notion-delivery-to-postgres.ts` and is the single PG
writer. Per-row UPSERT by `notion_{project,task,sprint}_id`. Idempotent. No
table-level locks — safe to interleave with reactive event handlers.

## Schema contract

### BigQuery `greenhouse_conformed.delivery_*`

- `task_name`, `project_name`, `sprint_name` are **NULLABLE** (aligned with PG, see TASK-588). The runtime helper `ensureDeliveryTitleColumnsNullable()` in `sync-notion-conformed.ts` applies `ALTER COLUMN ... DROP NOT NULL` idempotently at sync startup.
- Required-by-Notion-data-model fields: `notion_*_id`, `space_id`.
- Numeric formula fields (`days_late`, `frame_versions`, `client_change_round_final`, etc.) come as STRING from Notion formulas; can be fractional (e.g. `0.117…`).

### Postgres `greenhouse_delivery.{projects,tasks,sprints}`

- `task_name`, `project_name`, `sprint_name` are **NULLABLE** since TASK-588 (migration `20260424082917533_project-title-nullable-sentinel-cleanup.sql`).
- **CHECK constraints prohibit sentinel placeholders** like `'sin nombre'`, `'untitled'`, `'⚠️ Sin título'`. Any writer that injects a sentinel will get rejected by Postgres.
- Numeric columns are typed strictly: `days_late integer`, `frame_versions integer`, etc. The PG drain helper `toInteger()` truncates fractional BQ-formula values via `Math.trunc` before write.

### Display fallback (READ time only)

- DB functions `greenhouse_delivery.{task,project,sprint}_display_name(name, source_id)` (migration `20260426144105255_add-delivery-display-name-functions.sql`) return the trimmed name or a deterministic fallback like `'Tarea sin título · ' || LOWER(SUBSTRING(source_id, 1, 8))`.
- TS mirror in `src/lib/delivery/task-display.ts` exports `displayTaskName / displayProjectName / displaySprintName` with **bit-exact parity** with the SQL functions (regression-tested).
- UI primitives `<TaskNameLabel/>`, `<ProjectNameLabel/>`, `<SprintNameLabel/>` in `src/components/greenhouse/delivery/DeliveryNameLabel.tsx` wrap the helper with the canonical visual treatment (italic + warning icon + tooltip + click-through to Notion to fix at source).

## Tenant safety

- `replaceMissingForSpaces` filters `WHERE space_id = ANY(targetSpaceIds)` — Sky updates never touch Efeonce rows and vice versa.
- UPSERT by `notion_*_id` (Notion's natural PK) is order-independent and idempotent.
- Title cascade `nombre_de_tarea` → `nombre_de_la_tarea` covers both observed Notion property names: Efeonce uses the first, Sky the second. Verified live against the Notion REST API and Notion MCP on 2026-04-26.
- Pages whose Notion title is literally `[]` (created by automations that didn't set the title) flow through as `NULL` in conformed and PG. Surfaces in the admin queue `/admin/data-quality/notion-titles` for human cleanup in Notion.

## Operational guardrails

### Kill switches

| Switch                                          | Path                                                            | Effect                                                                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `GREENHOUSE_NOTION_PG_PROJECTION_ENABLED=false` | env on Vercel runtime                                            | Disables the PG-write step that lives **inside** `runNotionConformedCycle`. Does NOT affect the Cloud Run path (which is unconditional). |
| Cloud Scheduler job pause                       | `gcloud scheduler jobs pause ops-notion-conformed-sync ...`     | Pauses the daily Cloud Run sync. Vercel cron and admin manual trigger remain available as fallback.                                      |

### Manual triggers

- Cloud Scheduler manual run: `gcloud scheduler jobs run ops-notion-conformed-sync --location=us-east4 --project=efeonce-group`
- Admin endpoint (auth via agent session): `POST /api/admin/integrations/notion/trigger-conformed-sync`
- Vercel cron with secret: `curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/sync-conformed`

### Observability

- `source_sync_runs` records every cycle with `source_system='notion'` and notes like "Conformed sync converged successfully" or "Conformed sync already current; write skipped".
- ops-worker logs in Cloud Logging — search `resource.labels.service_name="ops-worker" AND textPayload:"PG drain"` for the per-run summary line: `read=Xp/Ys/Zt, written=Xp/Ys/Zt, deleted=Xp/Ys/Zt, Nms`.
- `source_sync_failures` with `error_code='sync_warning_missing_title'` lists pages whose title was empty at write time (the admin queue queries this).
- Reliability Control Plane Notion Delivery DQ signal reads from `integration_data_quality_runs` (independent of the sync writer).

## Failure modes seen in production (and how they're prevented now)

| Failure                                                                                                                  | Date                | Root cause                                                                                                                  | Prevention                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 28 Sky tasks created by Nexa Insights bulk import had `title: []` literally empty in Notion → BQ load REQUIRED rejected. | 2026-04-26          | BQ `delivery_*.task_name` was `REQUIRED`. PG was `NULLABLE` post-TASK-588 but BQ side was never aligned.                    | `ensureDeliveryTitleColumnsNullable()` runtime helper in `sync-notion-conformed.ts` applies `ALTER COLUMN DROP NOT NULL` idempotently at sync startup. NULL flows through, surfaces in admin queue.                                                |
| `greenhouse_delivery.tasks` was 24 days stale in Postgres (last write 2026-04-02) even though BQ conformed was fresh.    | 2026-04-26          | Only `pnpm sync:source-runtime-projections` (manual, unscheduled) wrote PG. Daily Vercel cron only wrote BQ conformed.       | Cloud Scheduler `ops-notion-conformed-sync` triggers Cloud Run endpoint that runs Step 1 + Step 2 (PG drain) every day. Vercel cron also got the inline PG step. Multiple paths, all idempotent.                                                  |
| BQ formula values `days_late=0.1176…` rejected by PG `INTEGER` column.                                                   | 2026-04-26          | `Number()` cast preserves the fractional part; PG `INTEGER` rejects.                                                        | `toInteger()` helper truncates via `Math.trunc` before write. Applied to all BQ-formula → PG INTEGER mappings (`days_late`, `frame_versions`, `client_change_round_final`, `frame_comments`, `open_frame_comments`, `blocker_count`, etc.).        |
| Sentinel `'⚠️ Sin título'` introduced as a "fix" violated TASK-588 anti-sentinel CHECK constraints.                        | 2026-04-26          | Mistaken assumption that PG required non-NULL.                                                                              | NULL = unknown is the canonical contract. Display fallback happens at READ time via DB function + TS helper, never written to canonical column. CLAUDE.md and AGENTS.md document this rule.                                                          |
| Reliability dashboard showed 3,041 "untitled" pages when in fact BQ conformed had names — only PG was stale.             | 2026-04-26          | Admin queue read `WHERE task_name IS NULL` from PG. PG was stale 24 days.                                                   | Once Step 2 unconditional drain landed, the queue dropped from 3,041 → 94 (the truly-empty Notion pages, verified via Notion REST + MCP).                                                                                                            |

## Files

- Helpers: `src/lib/sync/project-notion-delivery-to-postgres.ts`, `src/lib/sync/sync-bq-conformed-to-postgres.ts`
- Orchestrator: `src/lib/integrations/notion-sync-orchestration.ts`
- BQ writer: `src/lib/sync/sync-notion-conformed.ts`
- Cloud Run endpoint: `services/ops-worker/server.ts` (`POST /notion-conformed/sync`)
- Cloud Scheduler job definition: `services/ops-worker/deploy.sh` (`upsert_scheduler_job "ops-notion-conformed-sync" "20 7 * * *" "/notion-conformed/sync" '{"executionSource":"scheduled_primary"}'`)
- Vercel cron route: `src/app/api/cron/sync-conformed/route.ts` (fallback)
- Vercel admin route: `src/app/api/admin/integrations/notion/trigger-conformed-sync/route.ts` (manual)
- Display fallback: `migrations/20260426144105255_add-delivery-display-name-functions.sql`, `src/lib/delivery/task-display.ts`, `src/components/greenhouse/delivery/DeliveryNameLabel.tsx`
- Admin queue: `src/app/(dashboard)/admin/data-quality/notion-titles/page.tsx`, `src/lib/delivery/get-untitled-pages-overview.ts`
- TASK-588 anti-sentinel migration: `migrations/20260424082917533_project-title-nullable-sentinel-cleanup.sql`

## Related

- TASK-588 — NULLABLE titles + anti-sentinel CHECK constraints (PG side).
- `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — broader playbook for outbox + projection recovery.
- `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — ops-worker Cloud Run topology (§4.9, §5).
- `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — strategic decoupling of Notion/HubSpot sources.

## Change history

| Version | Date       | Change                                                                                                                          |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-04-26 | Initial spec promoted to canonical after the PG drift incident. Cloud Run path declared canonical, manual script demoted.        |
