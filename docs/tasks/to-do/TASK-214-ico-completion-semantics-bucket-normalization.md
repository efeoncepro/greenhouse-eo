# TASK-214 - ICO Completion Semantics & Bucket Normalization

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
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
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Ya existe

- `completed_at + terminal status` ya endurece completitud
- `Carry-Over` y `Overdue Carried Forward` ya fueron separados semánticamente
- el contrato `A.5.4` ya documenta buckets y preguntas de negocio

### Gap actual

- falta garantizar paridad total entre readers live, snapshots y serving
- falta congelar taxonomía de estados terminales y edge cases por source
- falta convertir la semántica actual en baseline de regresión exhaustiva

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

- [ ] `OTD`, `FTR`, `RpA`, `throughput` y `cycle time` comparten la misma regla de completitud
- [ ] Ninguna tarea no terminal puede computar como completada por `completed_at` o por `performance_indicator_code`
- [ ] La semántica de buckets queda igual en compute live, snapshots y serving
- [ ] Existen tests y evidencia reproducible para los edge cases principales

## Verification

- `pnpm exec vitest run src/lib/ico-engine/shared.test.ts`
- `pnpm exec eslint src/lib/ico-engine/shared.ts src/lib/ico-engine/shared.test.ts`
- validación manual contra BigQuery para casos reales de `Sky` y `Efeonce`

