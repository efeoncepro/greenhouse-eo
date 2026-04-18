# TASK-425 — Finance Metric Dependency DAG Runtime Propagation (v2)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416, TASK-417, TASK-422`
- Branch: `task/TASK-425-finance-metric-dependency-dag-runtime-propagation`

## Summary

Activar el DAG de dependencias declarado en el registry como mecanismo reactivo: cuando una métrica upstream cambia (ej: `revenue_accrual_clp` re-materializa), el outbox reactor invalida / recomputa automáticamente las downstream (`gross_margin_pct`, `net_margin_pct`, `revenue_per_fte`). Reemplaza la política estática de cron único con propagación dirigida.

## Why This Task Exists

v1 del registry declara `dependsOn` pero solo lo enforce estáticamente en build. En runtime, cuando `commercial_cost_attribution` se rematerializa para un período, las métricas downstream no saben que deben invalidarse. Hoy se confía en el cron nocturno que re-materializa todo. Eso funciona pero genera inconsistencias durante el día (change → dashboard muestra data obsoleta hasta la próxima corrida).

## Goal

- Outbox reactor nuevo `metric-dag-invalidator` que escucha eventos de re-materialization y dispatcha recomputación de downstream
- Tabla `greenhouse_serving.metric_materialization_state` que tracke últimas materializaciones por métrica × scope × period
- `getMetric` expone `lastMaterializedAt` para que el dashboard sepa si hay que esperar
- Observability: métricas stale en Ops Health disparan alerting

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §11 (debt)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — patrón canónico
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — naming

Reglas obligatorias:

- Propagation follows registry DAG — no hardcoded
- Idempotent: recomputaciones duplicadas no corrompen histórico
- Backpressure: rate-limit cascadas largas
- Observability: ops-health surface visibiliza cascadas en progreso

## Dependencies & Impact

### Depends on

- TASK-416, TASK-417 (foundation)
- TASK-422 (quality gates como foundation conceptual)

### Blocks / Impacts

- Reduce latency percibida de dashboards financieros
- Cost Intelligence gana reactivity real cross-métrica

### Files owned

- `src/lib/sync/projections/metric-dag-invalidator.ts`
- Migration `greenhouse_serving.metric_materialization_state`
- Event catalog entries
- Integración Ops Health panel

## Current Repo State

### Already exists

- Outbox + reactive projections pattern (TASK-379 hardening)
- Registry con DAG declarada

### Gap

- DAG es solo documentación en runtime

## Scope

### Slice 1 — State table

- Migration crea `metric_materialization_state`
- Backfill con materializaciones recientes conocidas

### Slice 2 — Invalidator projection

- Escucha eventos de re-materialization (ej: `finance.client_economics.materialized`)
- Consulta registry DAG para encontrar descendants
- Dispatcha recomputación (o marca stale si no hay pipeline de recomputo automático)

### Slice 3 — Dashboard surfacing

- KPI cards muestran "recomputando..." cuando scope está en cascada
- UX sutil, no bloquea interacción

### Slice 4 — Observability

- Panel Ops Health con estado de cascadas
- Alerting si cascada >N minutos sin avanzar

## Out of Scope

- Query-time recomputación (siempre es offline / reactive)
- Adaptive scheduling inteligente (queda para v3)

## Acceptance Criteria

- [ ] DAG real driving propagación en runtime
- [ ] State table + projection operativos
- [ ] Dashboard muestra cascadas sutilmente
- [ ] Ops Health visibiliza estado
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- Deliberadamente disparar re-materialization de `commercial_cost_attribution`
- Verificar que `gross_margin_clp`, `net_margin_clp` descendants se recomputan en orden
- Verificar que Ops Health muestra cascada

## Closing Protocol

- [ ] Delta en spec documentando DAG runtime
- [ ] Delta en `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- [ ] Lifecycle + carpeta sincronizados

## Follow-ups

- Adaptive scheduling basado en frequency-of-change
