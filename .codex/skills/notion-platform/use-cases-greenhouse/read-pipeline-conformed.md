# Use case canonical — Read pipeline conformed (Notion → BQ → PG)

> **Pipeline canonical actual al 2026-05-17**: legacy `notion-bq-sync` Cloud Run → BQ raw → `runNotionSyncOrchestration` → BQ conformed → `syncBqConformedToPostgres` → PG runtime tables
> **Documentado en CLAUDE.md** § "Notion sync canónico — Cloud Run + Cloud Scheduler"
> **Last verified**: 2026-05-17

## 1. El flow canonical actual

```
Notion data sources (Efeonce/Sky Tasks + Projects + Sprints)
    ↓ poll via @notionhq/client (legacy notion-bq-sync Cloud Run)
greenhouse_raw.notion_ops_*  (BQ raw)
    ↓ runNotionSyncOrchestration (Cloud Scheduler @ 7:20 AM Santiago daily)
greenhouse_conformed.delivery_{tasks,projects,sprints}  (BQ conformed)
    ↓ syncBqConformedToPostgres (UNCONDICIONAL post Step 1)
greenhouse_delivery.{tasks,projects,sprints}  (PG runtime — source of truth para UI)
    ↓ downstream consumers
ICO Engine materializer + Pulse + Portfolio Health + Person 360
```

**Trigger canonical**: Cloud Scheduler job `ops-notion-conformed-sync @ 20 7 * * * America/Santiago` → POST `/notion-conformed/sync` en ops-worker Cloud Run.

## 2. 2 steps obligatorios

### Step 1 — `runNotionSyncOrchestration`
- Lee notion_ops (BQ raw) → escribe `greenhouse_conformed.delivery_*` (BQ)
- **PUEDE SKIPEAR** si BQ conformed ya está fresh contra raw ("Conformed sync already current; write skipped")
- Esto NO es bug — comportamiento intencional

### Step 2 — `syncBqConformedToPostgres` (UNCONDICIONAL)
- Lee BQ `greenhouse_conformed.delivery_*` → escribe `greenhouse_delivery.{projects,tasks,sprints}` PG
- **DEBE correr siempre** regardless del skip de Step 1
- Por qué: BQ puede estar fresh y PG stale (que es exactamente el bug que llevó 24 días sin detectar antes — caso real CLAUDE.md docs)

## 3. Hard rules canonical (CLAUDE.md mirror)

- **NUNCA** mover el PG step adentro del path no-skip de Step 1 (regresión grave — PG stale silenciosa)
- **NUNCA** crear cron Vercel scheduled para `/api/cron/sync-conformed` — Vercel cron solo corre en Production, staging quedaría sin sync. Trigger canonical es Cloud Scheduler en ops-worker
- **NUNCA** depender del script manual `pnpm sync:source-runtime-projections` para producción — sirve solo para developer ad-hoc
- **NUNCA** inyectar sentinels (`'sin nombre'`, `'⚠️ Sin título'`) en `*_name` columns — TASK-588 prohíbe vía CHECK constraints. NULL = unknown
- **NUNCA** castear directo `Number(value)` para escribir BQ-formula columns a PG INTEGER (e.g. `days_late`) — BQ formulas pueden devolver fraccionales, PG INT los rechaza. Usar `toInteger()` con `Math.trunc`

## 4. Manual triggers / recovery

```bash
# Cloud Scheduler manual trigger
gcloud scheduler jobs run ops-notion-conformed-sync \
  --location=us-east4 \
  --project=efeonce-group

# Admin endpoint Vercel (no requiere CRON_SECRET — agent auth)
curl -X POST 'https://greenhouse.efeoncepro.com/api/admin/integrations/notion/trigger-conformed-sync' \
  -H "Cookie: <agent-session>"

# Vercel cron fallback (CRON_SECRET, legacy path)
curl -X POST 'https://greenhouse.efeoncepro.com/api/cron/sync-conformed' \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 5. Defensas anti-tenant-cross-contamination

- `replaceMissingForSpaces` filtra `WHERE space_id = ANY(targetSpaceIds)` — nunca toca rows fuera del cycle
- UPSERT por `notion_*_id` (PK natural Notion) es idempotente y order-independent
- Cascade de title `nombre_de_tarea` / `nombre_de_la_tarea` resuelve correctamente para ambos tenants (verificado live)

## 6. Kill-switch defensivo

```bash
GREENHOUSE_NOTION_PG_PROJECTION_ENABLED=false
```

Revierte el step PG dentro de `runNotionConformedCycle` sin requerir deploy. **NO** afecta el step PG del endpoint Cloud Run (que vive en `services/ops-worker/server.ts`), ese es UNCONDICIONAL.

## 7. Schema constraints relevantes

- BQ `delivery_*.{task_name,project_name,sprint_name}` están **NULLABLE** (alineado con TASK-588 PG decision)
- Helper `ensureDeliveryTitleColumnsNullable` en `sync-notion-conformed.ts` aplica `ALTER COLUMN ... DROP NOT NULL` idempotente al startup
- PG `greenhouse_delivery.*` tiene CHECK constraints anti-sentinel desde TASK-588 (migration `20260424082917533`)
- DB functions `greenhouse_delivery.{task,project,sprint}_display_name` producen fallback display data-derived al READ time

## 8. Admin queue de hygiene

`/admin/data-quality/notion-titles` lista pages con `*_name IS NULL` agrupadas por space, con CTA "Editar en Notion" → page_url. Cuando operador edita el title en Notion, el next sync drena el cambio y la row sale del queue.

## 9. Pendientes / open questions canonical

### Audit pendiente — Notion-Version legacy
El sync legacy probablemente corre `Notion-Version: 2022-06-28` (pre 2025-09-03). Bumpear a `2026-03-11` requiere:
- Identificar todos los call sites en `notion-bq-sync` y `sync-notion-conformed.ts`
- Migrate `/v1/databases/{id}/query` → `/v1/data_sources/{id}/query` si aún en legacy
- Shadow mode comparison
- Capturar en TASK derivada cuando emerja necesidad operativa

### Decision pendiente — TASK-577 reemplazo de notion-bq-sync
Cuando TASK-577 emerja, decidir:
- Reemplazar legacy con Worker Notion Database Sync (Beta, requires Workers GA)
- O reemplazar con Cloud Run custom canonical (mantener stack Greenhouse)

Ver `decision-frameworks/workers-vs-cloud-run.md` para decision framework.

## 10. Cross-refs

- CLAUDE.md § "Notion sync canónico — Cloud Run + Cloud Scheduler" — fuente canonical
- `greenhouse-runtime/notion-bq-sync.md` (stub) — service detail
- `developer-platform-2026/worker-syncs.md` — alternativa Database Sync futura
- TASK-577 (Greenhouse) — sync infra roadmap
- TASK-879 (Greenhouse) — Developer Platform readiness eval
