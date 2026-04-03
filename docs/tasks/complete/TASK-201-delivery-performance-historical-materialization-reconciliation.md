# TASK-201 - Delivery Performance Historical Materialization Reconciliation

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Cerrada`
- Rank: `57`
- Domain: `data`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Recalcular y reconciliar `Marzo 2026` en Greenhouse sobre materializaciones históricas sanas para que el baseline de paridad no dependa de fallbacks incompletos o buckets nulos en `metrics_by_member`.

Esta task toma las definiciones ya separadas en las subtasks previas y las lleva a una validación concreta sobre datasets y snapshots mensuales.

## Why This Task Exists

Hoy el baseline histórico no es confiable:

- `performance_report_monthly` no tiene snapshot `agency` para `2026-03`
- `agency_performance_reports` tampoco lo tiene
- `metrics_by_member` tiene `on_time_count` y `late_drop_count` nulos en `2026-03`
- `metric_snapshots_monthly` mantiene filas legacy para `2026-03` con buckets nulos y totales incompatibles con el contrato actual
- `ico_engine.v_tasks_enriched` en BigQuery sigue sin rehidratar el contrato de `TASK-199`; no expone todavía `primary_owner_*`

Eso significa que la comparación contra Notion hoy cae en fallback y no en una materialización canónica del período.

## Goal

- Recalcular `Marzo 2026` con la semántica objetivo.
- Materializar snapshots y buckets históricos confiables.
- Dejar reconciliación explícita `Notion vs Greenhouse` para el período de calibración.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `docs/tasks/in-progress/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`

Reglas obligatorias:

- no declarar paridad sobre fallbacks incompletos
- toda reconciliación debe ser reproducible por período y por miembro
- el baseline de marzo debe quedar auditable con cifras y explicación de gaps residuales

## Dependencies & Impact

### Depends on

- `TASK-197 - Delivery Source Sync Assignee & Project Relation Parity`
- `TASK-198 - Delivery Notion Assignee Identity Coverage`
- `TASK-199 - Delivery Performance Owner Attribution Contract`
- `TASK-200 - Delivery Performance Metric Semantic Contract`
- datasets `greenhouse_conformed.*`, `ico_engine.*`, `greenhouse_serving.*`
- readers y materializers de `ICO`

### Impacts to

- `TASK-202 - Delivery Performance Report Publication & Notion Consumption Cutover`
- scorecards mensuales y dashboards Delivery
- cualquier validación posterior de `Abril 2026`

### Files owned

- `docs/tasks/complete/TASK-201-delivery-performance-historical-materialization-reconciliation.md`
- materializers o scripts de backfill que se creen para la lane
- readers mensuales de `ICO`
- tablas o vistas históricas que se ajusten para el cierre del reporte

## Current Repo State

### Ya existe

- foundation de métricas Delivery en `ICO`
- datasets y serving tables para snapshots mensuales
- baseline documental de `Marzo 2026` en Notion

### Gap actual

- faltan snapshots mensuales confiables para `2026-03`
- buckets históricos relevantes están nulos o incompletos
- el view runtime `ico_engine.v_tasks_enriched` está desalineado respecto al contrato actual de owner attribution y no puede sostener una rematerialización histórica sana
- no existe reconciliación tarea por tarea y miembro por miembro documentada como artefacto reproducible

## Scope

### Slice 1 - Backfill y materialización

- rehidratar la infraestructura ejecutable mínima del engine en BigQuery para que el período pueda recalcularse con el contrato actual
- recalcular `Marzo 2026`
- poblar snapshots faltantes
- validar buckets por miembro y agregados agencia

### Slice 2 - Reconciliación explícita

- comparar Greenhouse contra Notion
- documentar diferencias residuales
- dejar evidencia por miembro y por agregado

### Slice 3 - Readiness para abril

- definir qué condiciones deben cumplirse para confiar en `Abril 2026`
- dejar checklist de cierre mensual sobre materialización

## Out of Scope

- rediseñar dashboards o UI de Delivery
- resolver publicación a Notion
- generalizar todavía el baseline a otros spaces sin calibración

## Acceptance Criteria

- [x] `ico_engine.v_tasks_enriched` queda rehidratado con el contrato vigente antes de recalcular `2026-03`.
- [x] `Marzo 2026` queda materializado en Greenhouse con snapshots consistentes.
- [x] Existe reconciliación documentada `Notion vs Greenhouse` para el período.
- [x] Existen cifras verificables por miembro y agregadas para el baseline.
- [x] Queda claro qué residual, si existe, sigue abierto antes de operar `Abril 2026`.

## Delta 2026-04-02

- Auditoría ejecutada antes de implementación:
  - `ico_engine.performance_report_monthly` sigue sin fila `agency` para `2026-03`
  - `greenhouse_serving.agency_performance_reports` sigue vacío para `2026-03`
  - `ico_engine.metrics_by_member` y `metric_snapshots_monthly` mantienen buckets nulos legacy para `2026-03`
  - `ico_engine.v_tasks_enriched` sigue viejo en BigQuery y no expone `primary_owner_source_id`, `primary_owner_member_id`, `primary_owner_type` ni `has_co_assignees`
- La task deja explícito que el primer paso ya no es solo “backfill marzo”, sino rehidratar la infraestructura ejecutable del engine para que la rematerialización use el contrato cerrado en `TASK-199` y `TASK-200`.

## Delta 2026-04-02 — Cierre ejecutado

- `sync-notion-conformed` se reejecutó y confirmó que el problema de `Sky` no era ausencia real de status sino un snapshot conformed stale:
  - `notion_ops.tareas` ya traía `estado_1`
  - el contrato Notion ahora acepta `Estado 1` como alias de `task_status`
  - `greenhouse_conformed.delivery_tasks` volvió a hidratar `task_status` para `Sky`
- Se endureció `ICO` para reconciliación histórica:
  - `ico_engine.v_tasks_enriched` ya expone `primary_owner_*`, `performance_indicator_label` y `original_due_date`
  - el engine ya puede materializar el período aun cuando un space haya usado la variante `Estado 1`
- Se agregó snapshot mensual congelado por tarea:
  - tabla BigQuery `ico_engine.delivery_task_monthly_snapshots`
  - fuente preferida para reportes históricos cuando existe snapshot `locked`
  - fallback al view vivo solo cuando el período no fue congelado todavía
- Se agregó operación explícita de cierre:
  - `pnpm freeze:delivery-performance-period 2026 3`
  - congela tareas del período, rematerializa `ICO` y refresca `agency_performance_reports`
- Se agregó reconciliación reproducible:
  - `pnpm reconcile:delivery-performance-history 2026 3`
  - congela el snapshot antes de comparar `Greenhouse vs Notion`
- Verificación real para marzo 2026:
  - `delivery_task_monthly_snapshots`: `294` filas `locked`
  - `performance_report_monthly`: `293` tareas clasificadas, `84.3% OT`, `247 on-time`, `25 late drops`, `21 overdue`
  - `agency_performance_reports`: fila `agency` refrescada para `2026-03`
- Residual ya explicado:
  - Notion baseline de marzo sigue en `67.5% OT`, `283` tareas, `75` late drops
  - Greenhouse congelado queda en `84.3% OT`, `293` tareas, `25` late drops
  - el drift remanente ya no apunta a fórmula ni ingestión, sino a historia mutable en Notion:
    - hoy `Sky` aparece casi completo como `Aprobado`
    - múltiples tareas muestran `completed_at <= due_date` en el estado actual
    - el reporte histórico parece haber sido calculado antes de ediciones posteriores sobre fechas y/o cierre
- Decisión operativa:
  - `Marzo 2026` queda como baseline calibrado con drift explicado
  - `Abril 2026` en adelante debe operar con snapshot mensual congelado al cierre y no recalcularse desde el estado vivo de Notion

## Verification

- queries sobre `ico_engine.performance_report_monthly`
- queries sobre `greenhouse_serving.agency_performance_reports`
- comparación por miembro y total agencia contra el reporte de Notion
