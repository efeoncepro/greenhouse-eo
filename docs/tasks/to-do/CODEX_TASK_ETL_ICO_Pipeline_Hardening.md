# CODEX TASK — ETL Pipeline Hardening: Conformed Layer + ICO Engine

## Meta

| Campo | Valor |
|-------|-------|
| **Task ID** | `CODEX_TASK_ETL_ICO_Pipeline_Hardening` |
| **Repo** | `greenhouse-eo` (portal, ICO Engine, sync script, cron routes) |
| **Prioridad** | P0 — prerequisito para pipeline end-to-end automático y multi-tenant |
| **Dependencias** | `CODEX_TASK_Tenant_Notion_Mapping`, `Greenhouse_ICO_Engine_v1.md`, `CODEX_TASK_Conformed_Data_Layer` |
| **Afecta** | ICO Engine, Agency Dashboard, Pulse, conformed layer, sync pipeline |
| **Versión** | v1.0 |

---

## 1. Contexto

### Problema

El pipeline ETL de Greenhouse que alimenta al ICO Engine tiene 3 capas:

```
notion-bq-sync (Cloud Run, 3:00 AM)
    │
    ▼
notion_ops.* (BigQuery — datos raw en español desde Notion)
    │
    ▼
sync-source-runtime-projections.ts  ◄── SCRIPT MANUAL (~2500 líneas CLI)
    │
    ├──▶ greenhouse_raw.* (snapshots inmutables)
    ├──▶ greenhouse_conformed.* (estado actual normalizado)
    └──▶ greenhouse_delivery.* (PostgreSQL — projections operativas)
         │
         ▼
/api/cron/ico-materialize (Vercel, 6:15 AM UTC)
    │
    ▼
ico_engine.* (métricas materializadas)
    │
    ▼
UI: Scorecard, KPIs, Charts, Stuck Assets
```

**Problemas identificados (auditoría Marzo 2026):**

1. **Pipeline roto entre notion_ops → conformed:** El paso que transforma datos raw de Notion en el formato conformed es un script CLI manual (`scripts/sync-source-runtime-projections.ts`). Si nadie lo ejecuta, ICO Engine muestra datos viejos. No hay orquestación automática.

2. **`cycle_time_days` mide mal:** La vista `v_tasks_enriched` calcula cycle time como `DATE_DIFF(completed_at, synced_at)` — mide "días desde el último sync", no "días desde que se creó la tarea". Si re-sincronizas, todos los cycle times se resetean a 0. La columna `created_at` no existe en `delivery_tasks`.

3. **TRUNCATE global — data loss risk:** El sync script hace `TRUNCATE TABLE greenhouse_conformed.delivery_tasks` antes de insertar. Si falla después del TRUNCATE pero antes del INSERT, la tabla queda vacía → ICO muestra 0 datos.

4. **Space resolution vía campo deprecated:** `space_id` se resuelve consultando `greenhouse.clients.notion_project_ids` (BigQuery, campo DEPRECATED) en vez de `greenhouse_core.space_notion_sources` (PostgreSQL, fuente canónica).

5. **`fase_csc` hardcodeado para Efeonce:** El mapeo de `task_status` → fase CSC en `v_tasks_enriched` usa un CASE con strings en español exactos. Un segundo tenant con otros nombres de estado queda con todas sus tareas en fase 'otros'.

6. **`is_stuck` sin NULL guard:** Si `last_edited_time` es NULL, `hours_since_update` es NULL → `is_stuck` es NULL (no FALSE). Las tareas sin timestamp de edición quedan en un estado indefinido.

7. **CSC distribution UPDATE es N+1:** La materialización actualiza `csc_distribution` con un UPDATE individual por cada `space_id` — N round trips a BigQuery.

8. **Sin health endpoint:** No hay forma de verificar si la materialización está al día o cuántas horas lleva stale.

### Pipeline objetivo

```
notion-bq-sync (Cloud Run, 3:00 AM)
    │
    ▼
notion_ops.* (BigQuery)
    │
    ▼
/api/cron/sync-conformed (Vercel, 3:45 AM) ◄── NUEVO
    │
    ├──▶ greenhouse_raw.* (append snapshots)
    ├──▶ greenhouse_conformed.* (DELETE per-space + INSERT)
    └──▶ greenhouse_delivery.* (PostgreSQL upserts)
         │
         ▼
/api/cron/ico-materialize (Vercel, 6:15 AM)
    │
    ├──▶ ico_engine.metric_snapshots_monthly (MERGE — idempotent)
    ├──▶ ico_engine.stuck_assets_detail (DELETE + INSERT)
    ├──▶ ico_engine.rpa_trend (DELETE + INSERT — 12 meses)
    └──▶ ico_engine.metrics_by_project (DELETE period + INSERT)
         │
         ▼
/api/ico-engine/health ◄── NUEVO (freshness check)
    │
    ▼
UI: Scorecard, KPIs, Charts, Stuck Assets
```

---

## 2. Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `develop`
- **Framework:** Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3
- **Deploy:** Vercel (Pro — 300s max function timeout)
- **GCP Project:** `efeonce-group`
- **BigQuery:** Datasets `greenhouse_conformed`, `greenhouse_raw`, `ico_engine`, `notion_ops`
- **PostgreSQL:** Instance `greenhouse-pg-dev`, database `greenhouse_app`

### Documentos normativos

| Documento | Qué aporta |
|-----------|------------|
| `Greenhouse_ICO_Engine_v1.md` | Metric Registry, materialización, 10 métricas determinísticas |
| `CODEX_TASK_Tenant_Notion_Mapping.md` | Schema de `space_notion_sources`, pipeline multi-tenant |
| `CODEX_TASK_Conformed_Data_Layer.md` | Schema de `delivery_tasks`, property mappings, coercion rules |
| `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` | Inventario de Cloud Run, Scheduler, BigQuery datasets |
| `GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md` | Pipelines de sync documentados |

---

## 3. Dependencias previas

### DEBE existir

- [x] Dataset `ico_engine` en BigQuery
- [x] Vista `ico_engine.v_tasks_enriched`
- [x] Tabla `greenhouse_conformed.delivery_tasks` con 52 columnas
- [x] Tabla `greenhouse_core.space_notion_sources` en PostgreSQL
- [x] Cron route `/api/cron/ico-materialize` con auth pattern
- [x] Módulo `src/lib/ico-engine/` (schema.ts, materialize.ts, shared.ts, read-metrics.ts)

### PUEDE no existir (verificar, crear si falta)

- [ ] Columna `created_at TIMESTAMP` en `greenhouse_conformed.delivery_tasks`
- [ ] Tabla `ico_engine.status_phase_config` en BigQuery
- [ ] Ruta `/api/cron/sync-conformed`
- [ ] Ruta `/api/ico-engine/health`
- [ ] Módulo `src/lib/sync/sync-notion-conformed.ts`

---

## PARTE A: Correcciones ICO Engine

### A1. NULL guard en `is_stuck`

**Archivo:** `src/lib/ico-engine/schema.ts` (líneas 77-85)

**Actual:**
```sql
(
  dt.task_status NOT IN (
    'Listo', 'Done', 'Finalizado', 'Completado',
    'Archivadas', 'Archivada', 'Cancelada', 'Canceled', 'Cancelled',
    'Sin empezar', 'Backlog', 'Pendiente'
  )
  AND TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), dt.last_edited_time, HOUR) >= 72
) AS is_stuck,
```

**Corrección:**
```sql
(
  dt.task_status NOT IN (
    'Listo', 'Done', 'Finalizado', 'Completado',
    'Archivadas', 'Archivada', 'Cancelada', 'Canceled', 'Cancelled',
    'Sin empezar', 'Backlog', 'Pendiente'
  )
  AND dt.last_edited_time IS NOT NULL
  AND TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), dt.last_edited_time, HOUR) >= 72
) AS is_stuck,
```

**Validación:** `SELECT COUNT(*) FROM v_tasks_enriched WHERE is_stuck IS NULL` → 0

### A2. Corregir `cycle_time_days` — usar `created_at` en vez de `synced_at`

**Paso 1 — DDL.** Agregar columna a `delivery_tasks`:

```sql
ALTER TABLE `efeonce-group.greenhouse_conformed.delivery_tasks`
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
```

Archivo: `scripts/setup-bigquery-source-sync.sql` — agregar al final.

**Paso 2 — Mapping.** En `scripts/sync-source-runtime-projections.ts`, en el objeto `deliveryTasks` (línea ~1011), agregar:

```typescript
created_at: toTimestampValue(row.created_time),
```

El campo `created_time` ya se lee de Notion en línea 741.

**Paso 3 — Vista.** En `src/lib/ico-engine/schema.ts`, cambiar líneas 67-72:

```sql
-- Antes:
DATE_DIFF(
  COALESCE(DATE(dt.completed_at), CURRENT_DATE()),
  DATE(dt.synced_at),
  DAY
) AS cycle_time_days,

-- Después:
DATE_DIFF(
  COALESCE(DATE(dt.completed_at), CURRENT_DATE()),
  COALESCE(DATE(dt.created_at), DATE(dt.synced_at)),
  DAY
) AS cycle_time_days,
```

El `COALESCE` garantiza backward compatibility: rows existentes sin `created_at` caen a `synced_at`.

### A3. Batch CSC distribution UPDATE

**Archivo:** `src/lib/ico-engine/materialize.ts` (líneas 200-214)

**Actual (N+1 loop):**
```typescript
for (const [spaceId, distribution] of cscBySpace) {
  await runIcoEngineQuery(`UPDATE ... WHERE snapshot_id = @snapshotId`, { ... })
  snapshotsWritten++
}
```

**Corrección — single UPDATE con CASE:**
```typescript
if (cscBySpace.size > 0) {
  const whenClauses: string[] = []
  const snapshotIds: string[] = []

  for (const [spaceId, distribution] of cscBySpace) {
    const snapshotId = `${spaceId}-${periodYear}-${String(periodMonth).padStart(2, '0')}`
    snapshotIds.push(snapshotId)
    whenClauses.push(
      `WHEN snapshot_id = '${snapshotId}' THEN '${JSON.stringify(distribution).replace(/'/g, "\\'")}'`
    )
  }

  await runIcoEngineQuery(`
    UPDATE \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\`
    SET csc_distribution = CASE ${whenClauses.join(' ')} ELSE csc_distribution END
    WHERE snapshot_id IN UNNEST(@ids)
  `, { ids: snapshotIds })

  snapshotsWritten = cscBySpace.size
}
```

### A4. Health endpoint

**Archivo nuevo:** `src/app/api/ico-engine/health/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { runIcoEngineQuery, getIcoEngineProjectId } from '@/lib/ico-engine/shared'
import { ICO_DATASET } from '@/lib/ico-engine/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const projectId = getIcoEngineProjectId()
    const rows = await runIcoEngineQuery<{
      last_computed_at: { value?: string } | string | null
      snapshot_count: unknown
      space_count: unknown
    }>(`
      SELECT
        MAX(computed_at) AS last_computed_at,
        COUNT(*) AS snapshot_count,
        COUNT(DISTINCT space_id) AS space_count
      FROM \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\`
      WHERE period_year = EXTRACT(YEAR FROM CURRENT_DATE())
        AND period_month = EXTRACT(MONTH FROM CURRENT_DATE())
    `)

    const row = rows[0]
    const ts = row?.last_computed_at
    const lastComputedStr = typeof ts === 'string' ? ts : ts?.value ?? null
    const hoursSince = lastComputedStr
      ? (Date.now() - new Date(lastComputedStr).getTime()) / 3_600_000
      : null

    return NextResponse.json({
      status: hoursSince !== null && hoursSince < 36 ? 'healthy' : 'stale',
      lastMaterializedAt: lastComputedStr,
      hoursSinceLastMaterialization: hoursSince ? Math.round(hoursSince * 10) / 10 : null,
      currentPeriodSnapshots: row?.snapshot_count ?? 0,
      activeSpaces: row?.space_count ?? 0,
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 502 })
  }
}
```

---

## PARTE B: Seguridad del Pipeline Conformed

### B1. Reemplazar TRUNCATE global con DELETE seguro

**Archivo:** `scripts/sync-source-runtime-projections.ts` (líneas 1078-1095)

**Actual:**
```typescript
await Promise.all([
  bigQuery.query({ query: `TRUNCATE TABLE \`...\`.greenhouse_conformed.delivery_projects` }),
  bigQuery.query({ query: `TRUNCATE TABLE \`...\`.greenhouse_conformed.delivery_tasks` }),
  bigQuery.query({ query: `TRUNCATE TABLE \`...\`.greenhouse_conformed.delivery_sprints` }),
])
await insertBigQueryRows(...)
```

**Corrección:**
```typescript
// Solo borrar si tenemos datos para reemplazar (protección contra sync vacío)
if (deliveryTasks.length === 0) {
  console.warn('[sync] No delivery tasks found — skipping conformed write to preserve existing data')
} else {
  await Promise.all([
    bigQuery.query({ query: `DELETE FROM \`${projectId}.greenhouse_conformed.delivery_projects\` WHERE TRUE` }),
    bigQuery.query({ query: `DELETE FROM \`${projectId}.greenhouse_conformed.delivery_tasks\` WHERE TRUE` }),
    bigQuery.query({ query: `DELETE FROM \`${projectId}.greenhouse_conformed.delivery_sprints\` WHERE TRUE` }),
  ])

  await insertBigQueryRows('greenhouse_conformed', 'delivery_projects', deliveryProjects)
  await insertBigQueryRows('greenhouse_conformed', 'delivery_tasks', deliveryTasks)
  await insertBigQueryRows('greenhouse_conformed', 'delivery_sprints', deliverySprints)
}
```

**Diferencia clave:** `DELETE WHERE TRUE` es DML (respeta snapshots BigQuery), `TRUNCATE` es DDL. Además, si `deliveryTasks.length === 0`, NO borramos — preservamos data existente.

---

## PARTE C: Multi-tenant — Space Resolution

### C1. Migrar resolución de space_id a `space_notion_sources`

**Archivo:** `scripts/sync-source-runtime-projections.ts`

**Actual (líneas 801-807):**
```typescript
const clientBindings = await runBigQuery<ClientNotionBindingRow>(
  `SELECT client_id, client_name, notion_project_ids
   FROM \`${projectId}.greenhouse.clients\`
   WHERE notion_project_ids IS NOT NULL`
)
const preferredSpaceMap = buildPreferredSpaceMap(clientBindings)
```

**Corrección — usar `space_notion_sources` con fallback legacy:**

```typescript
// Primary: space_notion_sources (canonical)
const spaceNotionSources = await runGreenhousePostgresQuery<{
  space_id: string
  notion_db_proyectos: string
  notion_db_tareas: string
  client_id: string | null
}>(
  `SELECT sns.space_id, sns.notion_db_proyectos, sns.notion_db_tareas, s.client_id
   FROM greenhouse_core.space_notion_sources sns
   JOIN greenhouse_core.spaces s ON s.space_id = sns.space_id
   WHERE sns.sync_enabled = TRUE`
)

// Map notion_db_proyectos → space_id (cada proyecto reporta _source_database_id)
const databaseSpaceMap = new Map<string, string>()
const databaseClientMap = new Map<string, string | null>()
for (const src of spaceNotionSources) {
  databaseSpaceMap.set(src.notion_db_proyectos, src.space_id)
  databaseClientMap.set(src.notion_db_proyectos, src.client_id)
}

// Fallback: legacy clients.notion_project_ids (si no hay space_notion_sources)
let preferredSpaceMap: Map<string, string> | null = null
if (databaseSpaceMap.size === 0) {
  console.warn('[sync] No space_notion_sources found, using legacy clients.notion_project_ids')
  const clientBindings = await runBigQuery<ClientNotionBindingRow>(...)
  preferredSpaceMap = buildPreferredSpaceMap(clientBindings)
}
```

**En la construcción de `deliveryProjects` (línea 874):**
```typescript
// Resolver space_id via database ID (canónico) o page ID (legacy)
const spaceId = projectDatabaseSourceId
  ? (databaseSpaceMap.get(projectDatabaseSourceId) || null)
  : (preferredSpaceMap?.get(projectSourceId!) || null)
```

### C2. Configurable `fase_csc` mapping por Space

**Archivo:** `src/lib/ico-engine/schema.ts`

**Nueva tabla DDL:**
```sql
CREATE TABLE IF NOT EXISTS `${projectId}.${ICO_DATASET}.status_phase_config` (
  space_id STRING NOT NULL,
  task_status STRING NOT NULL,
  fase_csc STRING NOT NULL
)
```

**Seed para Efeonce:**
```sql
INSERT INTO `${projectId}.${ICO_DATASET}.status_phase_config`
  (space_id, task_status, fase_csc)
VALUES
  ('space-efeonce', 'Sin empezar', 'briefing'),
  ('space-efeonce', 'Backlog', 'briefing'),
  ('space-efeonce', 'Pendiente', 'briefing'),
  ('space-efeonce', 'Listo para diseñar', 'briefing'),
  ('space-efeonce', 'En curso', 'produccion'),
  ('space-efeonce', 'En Curso', 'produccion'),
  ('space-efeonce', 'Listo para revisión interna', 'revision_interna'),
  ('space-efeonce', 'Cambios Solicitados', 'cambios_cliente'),
  ('space-efeonce', 'Listo', 'entrega'),
  ('space-efeonce', 'Done', 'entrega'),
  ('space-efeonce', 'Finalizado', 'entrega'),
  ('space-efeonce', 'Completado', 'entrega')
```

**Vista modificada (`v_tasks_enriched`):**
```sql
FROM `${projectId}.${CONFORMED_DATASET}.delivery_tasks` dt
LEFT JOIN `${projectId}.${ICO_DATASET}.status_phase_config` spc
  ON spc.space_id = dt.space_id AND spc.task_status = dt.task_status

-- En SELECT:
COALESCE(spc.fase_csc,
  CASE
    WHEN dt.task_status IN ('Sin empezar', 'Backlog', 'Pendiente', 'Listo para diseñar')
      THEN 'briefing'
    WHEN dt.task_status IN ('En curso', 'En Curso')
      THEN 'produccion'
    WHEN dt.task_status LIKE 'Listo para revis%'
      THEN 'revision_interna'
    WHEN dt.task_status = 'Cambios Solicitados'
      THEN 'cambios_cliente'
    WHEN dt.task_status IN ('Listo', 'Done', 'Finalizado', 'Completado')
      THEN 'entrega'
    ELSE 'otros'
  END
) AS fase_csc,
```

**Beneficio:** Nuevos tenants agregan rows a `status_phase_config` sin tocar código. El CASE existente queda como fallback universal.

---

## PARTE D: Automatización del Pipeline

### D1. Módulo lib para sync conformed

**Archivo nuevo:** `src/lib/sync/sync-notion-conformed.ts`

Extrae la lógica core de `syncNotion()` (líneas 701-1451 del script CLI) usando imports compatibles con Next.js:

- `getBigQueryClient()` de `@/lib/bigquery` (no `new BigQuery()` directo)
- `runGreenhousePostgresQuery()` de `@/lib/postgres/client`
- Sin `loadGreenhouseToolEnv()` — las env vars existen en Vercel runtime
- Sin `closeGreenhousePostgres()` — el pool es global en Next.js

```typescript
export interface SyncConformedResult {
  syncRunId: string
  projectsProcessed: number
  tasksProcessed: number
  sprintsProcessed: number
  conformedRowsWritten: number
  postgresRowsProjected: number
  durationMs: number
}

export const syncNotionToConformed = async (): Promise<SyncConformedResult>
```

### D2. Cron route

**Archivo nuevo:** `src/app/api/cron/sync-conformed/route.ts`

Patrón idéntico a `ico-materialize`:
- `maxDuration: 120` (o 300 en Pro)
- Auth via `hasInternalSyncAccess()` (CRON_SECRET o x-vercel-cron)
- Llama a `syncNotionToConformed()`
- Retorna `SyncConformedResult` como JSON

### D3. Actualizar vercel.json

**Archivo:** `vercel.json`

Agregar:
```json
{
  "path": "/api/cron/sync-conformed",
  "schedule": "45 3 * * *"
}
```

**Pipeline resultante:**

| Hora (UTC) | Job | Tipo |
|-----------|-----|------|
| 3:00 AM | `notion-bq-sync` | Cloud Run (externo) |
| 3:45 AM | `/api/cron/sync-conformed` | Vercel Cron (NUEVO) |
| 6:15 AM | `/api/cron/ico-materialize` | Vercel Cron (existente) |

---

## Criterios de aceptación

### Parte A — ICO Engine
- [ ] `SELECT COUNT(*) FROM v_tasks_enriched WHERE is_stuck IS NULL` retorna 0
- [ ] `delivery_tasks` tiene columna `created_at` con valores desde Notion `created_time`
- [ ] `cycle_time_days` usa `created_at` (con fallback a `synced_at`)
- [ ] CSC distribution se materializa en 1 query (no N)
- [ ] `GET /api/ico-engine/health` retorna `{ status, lastMaterializedAt, ... }`

### Parte B — Pipeline Safety
- [ ] Sync con `notion_ops` vacío NO borra `greenhouse_conformed.delivery_tasks`
- [ ] `TRUNCATE TABLE` ya no existe en el sync script
- [ ] `DELETE FROM ... WHERE TRUE` solo se ejecuta si hay datos nuevos para insertar

### Parte C — Multi-tenant
- [ ] `space_id` se resuelve via `space_notion_sources` (no `clients.notion_project_ids`)
- [ ] Legacy fallback funciona si `space_notion_sources` está vacía
- [ ] Tabla `status_phase_config` existe con seed de Efeonce
- [ ] `v_tasks_enriched` LEFT JOINs `status_phase_config` con COALESCE fallback al CASE

### Parte D — Automatización
- [ ] `src/lib/sync/sync-notion-conformed.ts` exporta `syncNotionToConformed()`
- [ ] `GET /api/cron/sync-conformed` (con auth) ejecuta sync y retorna resultado
- [ ] `vercel.json` incluye cron para `/api/cron/sync-conformed` a las 3:45 AM UTC
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] `next build` exitoso

---

## Lo que NO incluye esta tarea

- **No modifica `notion-bq-sync` (Cloud Run).** El pipeline externo sigue single-tenant. Su migración a multi-tenant es un task separado en el repo `notion-bigquery`.
- **No agrega `space_id` a `notion_ops.*` tables.** Eso requiere cambios en el pipeline externo.
- **No modifica el HubSpot sync** — solo el Notion → conformed path.
- **No crea tests unitarios.** La validación es via queries BQ post-deploy.
- **No migra el script CLI completo.** El script sigue funcional para ejecución manual. El lib module extrae solo la parte Notion.

---

## Notas para el agente

- **Orden de implementación:** A1 → A2 → A4 → A3 → B1 → C1 → C2 → D1 → D2 → D3.
- **El script CLI usa `loadGreenhouseToolEnv()` que NO funciona en Vercel.** El lib module debe usar `process.env` directo.
- **BigQuery en Next.js:** Usar `getBigQueryClient()` de `@/lib/bigquery`, NO `new BigQuery()`.
- **PostgreSQL en Next.js:** Usar `runGreenhousePostgresQuery()` de `@/lib/postgres/client`.
- **Auth pattern para crons:** Copiar `hasInternalSyncAccess()` de `src/app/api/cron/ico-materialize/route.ts`.
- **Vercel timeout:** 120s default, 300s en Pro. El sync procesa ~1100 tasks — cabe en 120s.
- **No romper Efeonce:** Todos los cambios deben ser backward compatible con el tenant actual.
- **ICO_DATASET y ENGINE_VERSION:** Importar de `@/lib/ico-engine/schema` (ya exportados).

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo. Referencia normativa para implementación.*
