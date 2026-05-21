# TASK-916 — RpA V2 productive compute + writeback siblings

<!-- ZONE 0 -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Domain: `delivery|ico|integrations|reliability`
- Blocked by: `TASK-912 (captura productiva debe poblar task_status_transitions)`
- Branch: `task/TASK-916-rpa-v2-productive-compute-writeback`
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
2. `notionRpaComputeProjection`: trigger `notion.task.transition_captured` → `calculateRpaV2` → persist snapshot → chain `notion.task.metrics_writeback_requested`.
3. `notionRpaWritebackProjection`: trigger writeback → re-read PG → PATCH `[GH] RpA v2` (token productivo) → mark written. Gated `NOTION_RPA_WRITEBACK_ENABLED`.
4. Reliability signals prod (mirror de los demo) + wire en `get-reliability-overview`.
5. Tests anti-regresión (mirror de los 108 tests demo).

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

- [ ] `task_rpa_snapshots` creada + tipos regenerados.
- [ ] Compute projection persiste snapshot desde `task_status_transitions` (Efeonce/Sky).
- [ ] Writeback projection (gated) escribe `[GH] RpA v2` cuando `NOTION_RPA_WRITEBACK_ENABLED=true`.
- [ ] Signals prod wired + steady=0 esperado.
- [ ] Tests verde (mirror demo) + tsc + lint.

## Verification

`pnpm test` (focal + projections) + `pnpm build` + smoke con una tarea real Efeonce (flag on en staging).
