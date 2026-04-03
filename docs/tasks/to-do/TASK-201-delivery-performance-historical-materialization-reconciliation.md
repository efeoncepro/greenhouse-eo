# TASK-201 - Delivery Performance Historical Materialization Reconciliation

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
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

- `docs/tasks/to-do/TASK-201-delivery-performance-historical-materialization-reconciliation.md`
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
- no existe reconciliación tarea por tarea y miembro por miembro documentada como artefacto reproducible

## Scope

### Slice 1 - Backfill y materialización

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

- [ ] `Marzo 2026` queda materializado en Greenhouse con snapshots consistentes.
- [ ] Existe reconciliación documentada `Notion vs Greenhouse` para el período.
- [ ] Existen cifras verificables por miembro y agregadas para el baseline.
- [ ] Queda claro qué residual, si existe, sigue abierto antes de operar `Abril 2026`.

## Verification

- queries sobre `ico_engine.performance_report_monthly`
- queries sobre `greenhouse_serving.agency_performance_reports`
- comparación por miembro y total agencia contra el reporte de Notion

