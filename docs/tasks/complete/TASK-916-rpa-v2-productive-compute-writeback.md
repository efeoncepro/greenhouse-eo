# TASK-916 — RpA V2 productive compute + writeback siblings

<!-- ZONE 0 -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Complete (2026-05-21, develop) — writeback gated OFF, property + activación → TASK-917 Flip A`
- Domain: `delivery|ico|integrations|reliability`
- Blocked by: `TASK-912 captura SHIPPED (Slices 1-2, flag OFF) — desbloqueado para clonar siblings prod (writeback gated default OFF hasta TASK-917 Flip A)`
- Branch: `develop` (sesión 2026-05-21 — implementación directa en develop por instrucción del operador, sin branch dedicado)
- Parent: `TASK-915 (umbrella cutover)`

## Delta 2026-05-21 — TASK-912 captura SHIPPED (Slices 1-2): blocker parcialmente resuelto

La captura productiva (TASK-912 Slices 1-2) está shippeada en `develop` (commits `2f8754de` + `7cb6937d`): webhook handler `notion-status-transitions` + consumer `notion-status-transition-capture` que persiste en `task_status_transitions` (Efeonce/Sky) vía re-fetch pattern + resolución autoritativa de workspace. **Flag OFF** (`NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED`) — dormant hasta que el operador cree el secret + active el flag. Cuando esté activo, `countCorrectionTransitions` retorna `sourceMode='canonical'` y este task (compute prod) puede consumir `task_status_transitions` poblado. El consumer de captura ya emite `notion.task.status_transitioned` (canonical, con from/to) — TASK-916 puede usarlo como trigger del compute. **NOTA**: la parte BQ de TASK-912 (materializer + `cycle_time_days`) quedó diferida; NO es prerequisito de TASK-916 (RpA no depende de cycle time).

## Summary

Construir los siblings PRODUCTIVOS de compute + writeback de RpA V2 (los equivalentes de `notion-rpa-compute-demo` + `notion-rpa-writeback-demo`, ya probados en TASK-914): consumer reactivo que computa `calculateRpaV2` desde `task_status_transitions`, persiste en una tabla `task_rpa_snapshots` productiva, y escribe `[GH] RpA v2` en Efeonce/Sky. Gated por `NOTION_RPA_WRITEBACK_ENABLED` (default false).

## Why This Task Exists

`calculateRpaV2` existe pero **no está conectado a ningún consumer productivo**. El pipeline demo (TASK-913/914) probó la mecánica end-to-end (RpA=2 escrito en Notion demo). Este task replica esos siblings para producción — repointing, no rediseño — escribiendo en una propiedad separada (`[GH] RpA v2`) que coexiste con la fórmula legacy. Sin esto no hay valor V2 en producción para validar paridad ni para el cutover de bono.

## Goal

- Consumer reactivo `notionRpaComputeProjection` (sibling de demo) → `task_rpa_snapshots`.
- Consumer reactivo `notionRpaWritebackProjection` → PATCH `[GH] RpA v2` en Efeonce/Sky.
- Tabla `task_rpa_snapshots` productiva (sibling de `task_rpa_demo_snapshots`).
- Reliability signals productivos (paridad, dead-letter, refetch).

## Architecture Alignment

- `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` (Delta 2026-05-20 — re-fetch capture pattern, aplica igual).
- `metrics/RPA_V1.md` §9.1 (pre-conditions writeback).
- Patrón fuente: `src/lib/sync/projections/notion-rpa-compute-demo.ts` + `notion-rpa-writeback-demo.ts` (TASK-913/914).

## Dependencies & Current Repo State

- **Depende de**: TASK-912 (captura productiva poblando `task_status_transitions`) + `calculateRpaV2` (existe) + propiedad `[GH] RpA v2` en Efeonce/Sky [verificar existe].
- ⚠️ **Completeness para el bono (TASK-917 Flip B)**: el snapshot per-tarea que este task computa solo es **completo** si `task_status_transitions` está backfilled (TASK-908 Slice 9). Para display (Flip A) basta la captura live (incompleto = honesto vía `dataStatus`); para el bono, V2 necesita el historial completo per-tarea. Este task computa correctamente lo que haya en la tabla — la completitud es responsabilidad de la captura+backfill upstream.
- **Ya existe**: helpers de cómputo + los siblings demo como blueprint + cliente Notion productivo (`NOTION_TOKEN`).
- **Gap**: tabla `task_rpa_snapshots` prod, 2 projections prod, signals prod, evento chain prod (`notion.task.metrics_writeback_requested` sin `.demo`).

## Scope (slices)

1. Migración: tabla `task_rpa_snapshots` (sibling de demo, sin CHECK `workspace_id='demo'`; con `workspace_id IN ('efeonce','sky')`).
2. `notionRpaComputeProjection`: trigger **`notion.task.status_transitioned`** (lo que emite la captura prod TASK-912 — NO `transition_captured`, que solo existe en `.demo`) → `calculateRpaV2` (ya productivo, lee `task_status_transitions`) → persist snapshot → chain `notion.task.metrics_writeback_requested` (evento nuevo, sin sufijo `.demo`).
3. `notionRpaWritebackProjection`: trigger `notion.task.metrics_writeback_requested` → re-read PG → PATCH `[GH] RpA v2` (vía `notionRequest`, `NOTION_TOKEN`) → mark written. Gated `NOTION_RPA_WRITEBACK_ENABLED`.
4. Reliability signals prod (mirror de los demo, sin sufijo `_demo`) + wire en `get-reliability-overview`.
5. Tests anti-regresión (mirror de los 108 tests demo).

## Receta de clonado (mecánica — ejecutar en la próxima sesión)

> **Premisa**: TASK-916 es **clonar siblings demo probados + repointear**, NO rediseñar. La lógica difícil (idempotencia, re-fetch, echo-loop, retry/dead-letter, snapshot guard, chain events) ya está peleada en TASK-913/914. Verificado 2026-05-21 contra los archivos reales.

### Lo que YA existe y se reusa tal cual (NO clonar)

| Pieza | Path | Nota |
|---|---|---|
| Helper de cómputo | `src/lib/notion-metrics/calculate-rpa-v2.ts` | Ya es productivo, lee `task_status_transitions` (no `_demo`) vía `countCorrectionTransitions`. **NO se necesita variante.** |
| Cliente Notion prod | `src/lib/space-notion/notion-client.ts` | `notionRequest<T>()` ya resuelve `NOTION_TOKEN` + Notion-Version `2022-06-28`. `NOTION_TOKEN` ya está montado en ops-worker (deploy.sh, commit `beb382fc`). |
| Captura productiva | `src/lib/sync/projections/notion-status-transition-capture.ts` | Ya emite `notion.task.status_transitioned` (canonical, con from/to) → es el **trigger del compute**. |
| Evento `notion.task.status_transitioned` | `event-catalog.ts:817` (`notionTaskStatusTransitioned`) | Ya existe. |

### Archivo por archivo (clonar + repointear)

**1. Migración `task_rpa_snapshots`** — `pnpm migrate:create task-916-rpa-v2-snapshots`
Clonar `migrations/20260519130951001_task-913-rpa-v2-demo-snapshot-foundation.sql` con estos cambios:
- Tabla `task_rpa_demo_snapshots` → `task_rpa_snapshots`
- `workspace_id ... CHECK (workspace_id = 'demo')` → `CHECK (workspace_id IN ('efeonce','sky'))`, **sin** `DEFAULT 'demo'` (el INSERT lo setea desde el payload)
- Renombrar todos los índices/triggers/funciones `task_rpa_demo_snapshots_*` → `task_rpa_snapshots_*`
- Anti pre-up-marker guard: actualizar nombres + mensaje `TASK-916`
- Mantener idéntico: columnas, triggers append-only (con excepción writeback), grants `greenhouse_ops`/`greenhouse_runtime`, índices (source_event UNIQUE, task_latest, writeback_pending, paridad)

**2. Evento nuevo** — `src/lib/sync/event-catalog.ts`
Agregar junto a `notionTaskMetricsWritebackRequestedDemo` (línea ~796):
```ts
notionTaskMetricsWritebackRequested: 'notion.task.metrics_writeback_requested',
```

**3. Compute projection** — clonar `notion-rpa-compute-demo.ts` → `notion-rpa-compute.ts`
- `calculateRpaV2Demo` → `calculateRpaV2` (import de `calculate-rpa-v2`, no `-demo`)
- `triggerEvents: [notionTaskTransitionCapturedDemo]` → `[notionTaskStatusTransitioned]`
- Quitar filtros `demo_mode === true` + `workspaceId === 'demo'`. En su lugar: aceptar `workspaceId IN ('efeonce','sky')` (lo trae el payload de `status_transitioned`); skip si no.
- INSERT a `task_rpa_snapshots` con `workspace_id` del payload (no hardcode `'demo'`)
- Chain event: `notionTaskMetricsWritebackRequestedDemo` → `notionTaskMetricsWritebackRequested`, sin `metadata.demo_mode`
- name `notion_rpa_compute_demo` → `notion_rpa_compute`
- **OJO completeness**: el trigger `status_transitioned` se emite por *cada* transición. `calculateRpaV2` recomputa el total de la tarea desde `task_status_transitions` cada vez → idempotente y siempre refleja el estado completo de la tabla. Correcto.

**4. Writeback projection** — clonar `notion-rpa-writeback-demo.ts` → `notion-rpa-writeback.ts`
- `patchNotionDemoPage` (de `notion-demo-client`) → PATCH vía `notionRequest('/pages/${id}', { method:'PATCH', body: JSON.stringify({ properties }) })` del cliente prod. Conviene agregar un thin helper `patchNotionPage(pageId, properties)` en `notion-client.ts` (mirror de `patchNotionDemoPage`).
- `NOTION_PROPERTY_RPA_V2 = 'RpA'` → `'[GH] RpA v2'` (nombre prod que coexiste con legacy) **[verificar que la propiedad exista en Efeonce/Sky antes; si no, crearla read-only para operadores]**
- Gate: reemplazar `isDemoNotionWritebackConfigured()` por flag **`NOTION_RPA_WRITEBACK_ENABLED === 'true'`** (default false → skip honest). Token siempre disponible vía `NOTION_TOKEN`.
- Tabla `task_rpa_demo_snapshots` → `task_rpa_snapshots` en read/mark queries; quitar `AND workspace_id='demo'`
- Quitar filtros `demo_mode`/`workspaceId==='demo'`; aceptar `efeonce`/`sky`
- name `notion_rpa_writeback_demo` → `notion_rpa_writeback`; `maxRetries: 4` igual

**5. Registrar las 2 projections** — donde se registran las demo (`src/lib/sync/projections/index.ts` o equivalente `registerProjection`). Buscar `notionRpaComputeDemoProjection` y agregar los siblings prod al lado.

**6. Reliability signals** — clonar de `notion-metrics-demo-signals.ts` los 2 relevantes:
- `notion.metrics.writeback_dead_letter` (cuenta `task_rpa_snapshots` con `notion_writeback_attempt_count >= 4 AND written_to_notion_at IS NULL`)
- `notion.metrics.writeback_lag` (snapshots `valid` + `written_to_notion_at IS NULL` + `computed_at` > 30 min)
- Wire en `get-reliability-overview.ts` (subsystem `delivery`). `shadow_paridad_rpa` (V2 vs legacy) puede quedar para TASK-917 (es donde se materializa `rpa_avg_v2` para comparar).

**7. Tests** — clonar los 3 archivos `.test.ts` demo (compute, writeback, helper ya tiene `calculate-rpa-v2.test.ts`), repointear nombres + quitar asserts de `demo_mode`.

### Verificación post-deploy (todo flag OFF)
- `pnpm test` (focal projections + helper) + `pnpm build` + `pnpm migrate:up` local
- Projections registradas + signals en `unknown`/`ok`
- **NO activar** `NOTION_RPA_WRITEBACK_ENABLED` hasta TASK-917 Flip A (y solo tras ~3-4 semanas de acumulación de `task_status_transitions` vía la captura TASK-912)

## Out of Scope

- Materialización `rpa_avg_v2` + repoint UI + flag bono → TASK-917.
- Captura → TASK-912.

## Rollout Plan & Risk Matrix

- **Slice ordering hard rule**: migración (1) antes que projections (2-3). Writeback (3) gated por flag default false — no escribe a Notion hasta flip explícito.
- **Risk matrix**:

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Writeback escribe a Notion antes de validar | integrations | Baja | flag `NOTION_RPA_WRITEBACK_ENABLED=false` default | writeback signals |
| Snapshot duplicado | delivery | Baja | UNIQUE partial `source_event_id` + ON CONFLICT DO NOTHING (patrón demo) | — |
| Re-fetch falla (token prod) | integrations | Media | re-fetch errors → outbox retry → dead-letter + signal | refetch_failed prod |

- **Feature flags / cutover**: `NOTION_RPA_WRITEBACK_ENABLED` (default false). Aditivo — no toca runtime productivo hasta activar.
- **Rollback plan**: revert PR + redeploy (aditivo, projections nuevas + tabla nueva, cero impacto en V1).
- **Production verification**: tras deploy, confirmar projections registradas + signals en `unknown`/`ok`; activar flag en Flip A (TASK-917).

## Acceptance Criteria

- [x] `task_rpa_snapshots` creada + tipos regenerados (migration `20260521182825984`, CHECK `workspace_id IN ('efeonce','sky')`, append-only triggers, smoke PG: CHECK rechaza `demo`).
- [x] Compute projection persiste snapshot desde `task_status_transitions` (Efeonce/Sky) — `notion-rpa-compute.ts`, trigger `notion.task.status_transitioned`, filter dual `demo_mode !== true` + workspace prod.
- [x] Writeback projection (gated) escribe `[GH] RpA v2` cuando `NOTION_RPA_WRITEBACK_ENABLED=true` — `notion-rpa-writeback.ts`, default OFF (skip honest `flag_disabled`), maxRetries=4, re-read PG defensive.
- [x] Signals prod wired + steady=0 (smoke PG: dead_letter=0, lag=0) — `notion-metrics-rpa-signals.ts` + wire en `get-reliability-overview` (source `notionMetricsRpa`).
- [x] Tests verde (44 focal compute+writeback) + tsc 0 + lint 0 errors + `pnpm build` ✓ + full suite 5197 passed.

## Delta 2026-05-21 — SHIPPED V1.0 (develop, writeback flag OFF)

Clonado mecánico de los siblings demo (TASK-913/914) repointeado a producción, verificado contra los 3 skills (ICO/arquitectura/Notion) + smoke PG real:

- **Migration** `20260521182825984_task-916-rpa-v2-snapshots.sql` — `greenhouse_delivery.task_rpa_snapshots` (sibling de `task_rpa_demo_snapshots`, `CHECK workspace_id IN ('efeonce','sky')` sin DEFAULT, append-only triggers con excepción writeback, UNIQUE parcial source_event_id, anti pre-up-marker guard). Tipos regenerados.
- **Evento** `notion.task.metrics_writeback_requested` v1 (event-catalog, sin `.demo`) + helper `patchNotionPage(pageId, properties)` en `notion-client.ts` (mirror de `patchNotionDemoPage`, vía `notionRequest`/`NOTION_TOKEN`/`2022-06-28`).
- **Compute** `notionRpaComputeProjection` (`notion-rpa-compute.ts`) — trigger `notion.task.status_transitioned` (captura TASK-912), `calculateRpaV2` (lee `task_status_transitions`) → snapshot → chain event cuando `valid`. Filter dual `demo_mode !== true` + `workspaceId IN ('efeonce','sky')`.
- **Writeback** `notionRpaWritebackProjection` (`notion-rpa-writeback.ts`) — trigger del chain event → re-read PG → PATCH `[GH] RpA v2` → mark written. **Gated `NOTION_RPA_WRITEBACK_ENABLED` (default OFF → skip honest)**. maxRetries=4.
- **Signals** `notion.metrics.writeback_dead_letter` + `notion.metrics.writeback_lag` (`notion-metrics-rpa-signals.ts`) wired en `get-reliability-overview` (source `notionMetricsRpa`, subsystem `delivery`). Steady=0 verificado.
- **Tests** 44 focales (compute 20 + writeback 24) + full suite verde.

**Open Question resuelta**: la propiedad `[GH] RpA v2` NO existe en Efeonce ni Sky (verificado vía Notion `data_sources` API — solo `RpA` legacy + `Semáforo RpA`). **Decisión: NO crearla en este task**. El writeback está gated OFF; la propiedad no es necesaria para los acceptance criteria. Crearla ahora pondría una propiedad vacía visible en el workspace del cliente (Sky) semanas antes del flip. Se difiere a **TASK-917 Flip A** como precondición explícita (crear `[GH] RpA v2` read-only para operadores + activar flag bajo los 8 stop-gates ADR Strangler + ~3-4 semanas de captura acumulada vía TASK-912).

**No-interferencia**: aditivo puro. V1 legacy (formula Notion `RpA` + `metrics_by_member.rpa_avg` + bonus path productivo) intacto. Writeback OFF → cero escrituras a Notion productivo. Echo-loop descartado: el writeback escribe un number, no el status → la captura prod re-fetchea STATUS → noop → no recompute.

**Pendiente TASK-917 Flip A**: crear propiedad `[GH] RpA v2` en Efeonce/Sky + activar `NOTION_RPA_WRITEBACK_ENABLED` + materializar `rpa_avg_v2` + paridad shadow vs legacy + flip bono.

## Verification

`pnpm test` (full 5197 passed) + `pnpm build` (✓ compiled) + `pnpm lint` (0 errors) + `pnpm tsc --noEmit` (0) + smoke PG real (tabla queryable 0 rows, signals dead_letter/lag = 0, CHECK rechaza `workspace='demo'`). Smoke con tarea real Efeonce + flag ON queda para TASK-917 Flip A staging.
