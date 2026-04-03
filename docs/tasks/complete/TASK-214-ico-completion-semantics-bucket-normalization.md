# TASK-214 - ICO Completion Semantics & Bucket Normalization

## Delta 2026-04-03 — implementation closed with serving parity and regression coverage

- La semántica canónica quedó endurecida sin abrir un helper paralelo:
  - `overdue`, `carry_over` y `overdue_carried_forward` ahora exigen explícitamente semántica de tarea abierta
  - el carril CSC activo reutiliza un guardrail canónico común (`CANONICAL_ACTIVE_CSC_TASK_SQL`)
  - `delivery_signal` ya no se deriva desde `completed_at` solamente; requiere `completed_at + terminal status + due_date`
- El drift interno del engine quedó absorbido en los carriles reales que consumen o materializan métricas:
  - `read-metrics.ts`
  - `materialize.ts`
  - `schema.ts`
  - `metric-registry.ts`
- `greenhouse_serving.ico_member_metrics` quedó alineado con el snapshot member-level canónico:
  - columnas nuevas en PG: `on_time_count`, `late_drop_count`, `overdue_count`, `overdue_carried_forward_count`
  - cron/backfill/projection ahora refrescan esos buckets también en serving
- `Person 360` ya expone `overdue_carried_forward` dentro del contexto member-level para no recortar silenciosamente la semántica de deuda
- Verificación ejecutada:
  - `pnpm pg:doctor --profile=migrator`
  - `pnpm migrate:up`
  - `pnpm exec vitest run src/lib/ico-engine/shared.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts`
  - `pnpm lint`
  - `pnpm build`
- Guardrail operativo validado:
  - no se introdujo ningún `new Pool()`
  - Payroll conserva el carril `BQ materialized-first + live fallback`; esta task solo endurece el contrato semántico y el serving member-level aditivo

## Delta 2026-04-03 — audit corrected runtime assumptions before implementation

- La auditoría confirmó que la semántica canónica base ya existe y vive ejecutablemente en `src/lib/ico-engine/shared.ts`; esta task no debe inventar una segunda taxonomía.
- Supuestos corregidos:
  - el gap no se limita a live vs snapshots vs serving; también existe drift dentro del propio repo en:
    - `src/lib/ico-engine/metric-registry.ts`
    - `src/lib/ico-engine/schema.ts`
    - `src/lib/ico-engine/materialize.ts`
  - `greenhouse_serving.ico_member_metrics` sigue desalineado respecto a `ico_engine.metrics_by_member`:
    - faltan buckets/contexto completos (`on_time_count`, `late_drop_count`, `overdue_count`)
    - el cron legacy `src/app/api/cron/ico-member-sync/route.ts` no está al nivel del contrato actual
  - `Person 360` todavía tiene readers/scopes parcialmente fuera del carril ICO:
    - `src/lib/person-360/get-person-ico-profile.ts` no expone `overdue_carried_forward`
    - existen readers operativos legacy que siguen recalculando completitud con listas locales de estados
  - la documentación viva quedó con drift adicional:
    - `schema-snapshot-baseline.sql` no refleja el estado vigente de serving ICO
    - la narrativa del `Performance Report` aún sugiere que top performer sale de `metrics_by_member`, pero el runtime hoy lo recalcula desde `buildDeliveryPeriodSourceSql()`
- Guardrails nuevos para esta task:
  - no abrir helpers paralelos fuera de `shared.ts`
  - no dejar serving member-level con un subconjunto silencioso del snapshot que BQ sí materializa
  - cualquier consumer People o Payroll que necesite buckets debe leer el contrato canónico o un serving alineado, no rearmar reglas locales
  - si un campo o doc de schema quedó legacy, esta task debe corregirlo o documentar explícitamente la deuda

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Cerrada`
- Rank: `1`
- Domain: `delivery / ico / data`

## Summary

Congelar y unificar la semántica canónica de “tarea completada” y de buckets operativos (`on_time`, `late_drop`, `overdue`, `carry_over`, `overdue_carried_forward`) para que `OTD`, `FTR`, `RpA`, `throughput` y `cycle time` no cambien según el reader o la materialización que los consuma.

## Why This Task Exists

Greenhouse ya corrigió un problema grave: `completed_at` no puede bastar si la tarea sigue en estado no terminal. Pero todavía queda trabajo para institucionalizar la misma semántica en todos los carriles:

- live compute
- materializaciones mensuales
- readers por dimensión
- scorecards y reportes

Mientras eso no cierre, el mismo KPI puede variar por semántica y no por negocio.

## Goal

- Definir una taxonomía única de completitud y buckets para `ICO`.
- Garantizar paridad entre compute live, snapshots y serving.
- Reducir al mínimo la ambigüedad entre tarea cerrada, tarea comprometida, deuda arrastrada y carga futura.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`

Reglas obligatorias:

- `OTD`, `FTR`, `RpA`, `throughput` y `cycle time` deben compartir la misma semántica de completitud.
- `Carry-Over` y `Overdue Carried Forward` no deben redefinirse por consumer.
- cualquier helper nuevo debe converger a la semántica de `shared.ts`, no abrir un carril paralelo.

## Dependencies & Impact

### Depends on

- `TASK-200` — semantic contract
- `TASK-204` — carry-over / OCF split
- `TASK-205` — origin parity audit
- `TASK-206` — operational attribution model
- `TASK-207` — sync hardening

### Impacts to

- `TASK-215`
- `TASK-216`
- `TASK-217`
- `Agency > Delivery`
- `Performance Report`
- `People > ICO`
- `Payroll` KPI consumers

### Files owned

- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/shared.test.ts`
- `src/lib/ico-engine/metric-registry.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/sync/projections/ico-member-metrics.ts`
- `src/app/api/cron/ico-member-sync/route.ts`
- `src/lib/person-360/get-person-ico-profile.ts`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Ya existe

- `completed_at + terminal status` ya endurece completitud
- `Carry-Over` y `Overdue Carried Forward` ya fueron separados semánticamente
- el contrato `A.5.4` ya documenta buckets y preguntas de negocio

### Gap actual

- falta cerrar drift interno del engine alrededor de la semántica ya canonizada:
  - metadata/formulas legacy en `metric-registry.ts`
  - `delivery_signal` derivado en `schema.ts`
  - queries auxiliares de `materialize.ts` que aún no comparten todos los guardrails
- falta garantizar paridad total entre readers live, snapshots y serving member-level
- falta alinear `greenhouse_serving.ico_member_metrics` al contrato completo de `metrics_by_member`
- falta exponer la semántica completa en `Person 360` sin perder el scope organization-first
- falta convertir la semántica actual en baseline de regresión exhaustiva con casos edge

## Scope

### Slice 1 - Completion taxonomy

- fijar estados terminales canónicos y alias soportados
- documentar edge cases permitidos y explícitamente no permitidos

### Slice 2 - Bucket normalization

- unificar reglas de clasificación para `on_time`, `late_drop`, `overdue`, `carry_over`, `overdue_carried_forward`
- validar la misma semántica en live compute y materializaciones

### Slice 3 - Regression and reconciliation

- ampliar cobertura de tests y casos reales
- dejar consultas de auditoría reproducibles para regresiones de marzo/abril 2026

## Out of Scope

- arreglar calidad upstream de `rpa_value`
- diseñar badges o UX de confianza en surfaces Agency
- recalibrar thresholds de benchmark

## Acceptance Criteria

- [x] `OTD`, `FTR`, `RpA`, `throughput` y `cycle time` comparten la misma regla de completitud
- [x] Ninguna tarea no terminal puede computar como completada por `completed_at` o por `performance_indicator_code`
- [x] La semántica de buckets queda igual en compute live, snapshots y serving
- [x] Existen tests y evidencia reproducible para los edge cases principales

## Verification

- `pnpm exec vitest run src/lib/ico-engine/shared.test.ts`
- `pnpm exec eslint src/lib/ico-engine/shared.ts src/lib/ico-engine/shared.test.ts`
- validación manual contra BigQuery para casos reales de `Sky` y `Efeonce`
