# TASK-216 - ICO Metric Trust Model: Benchmark Registry, Quality Gates & Confidence Metadata

## Delta 2026-04-03

- `TASK-214` ya dejó congelada la semántica base que esta lane debe tratar como foundation cerrada:
  - completitud canónica = `completed_at + terminal status`
  - buckets canónicos iguales en live, materialización y serving
  - `greenhouse_serving.ico_member_metrics` ya quedó alineado a `metrics_by_member` para buckets member-level
- Implicación:
  - esta task no necesita volver a tocar fórmulas base en `shared.ts`
  - debe construir trust metadata encima del contrato ya estabilizado, no volver a discutir qué cuenta como `on_time`, `late_drop`, `overdue`, `carry_over` u `overdue_carried_forward`

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `2`
- Domain: `delivery / ico / serving`

## Summary

Institucionalizar una capa de trust para `ICO Engine` que acompañe cada KPI con metadata de benchmark, calidad de insumo y nivel de confianza. El objetivo es que `ICO` no publique solo valores, sino también su interpretabilidad operativa.

## Why This Task Exists

La investigación externa ya dejó claro que no todas las métricas tienen el mismo tipo de estándar:

- `OTD` sí tiene benchmark externo fuerte
- `FTR` usa benchmark por análogo
- `RpA` usa benchmark creativo adaptado
- otras métricas son policy interna

Hoy esa distinción vive en documentos, pero no en el runtime. Tampoco existe una capa estándar para decir si el valor viene con insumo `healthy`, `degraded` o `broken`.

## Goal

- Crear un registry canónico de benchmark semantics por métrica.
- Definir quality gates y confidence metadata por métrica / período / dimensión.
- Hacer que el engine exponga trust metadata reusable por `Agency`, `Payroll`, `People` y reportes.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`

Reglas obligatorias:

- benchmark metadata no debe redefinir la fórmula del KPI
- quality gates no deben vivir hardcodeadas solo en la UI
- confidence metadata debe ser reusable por readers y serving layers

## Dependencies & Impact

### Depends on

- `TASK-214`
- `TASK-215`
- `TASK-208`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` § `A.5.5`

### Impacts to

- `TASK-217`
- `TASK-160`
- `Agency > Delivery`
- `Ops Health`
- `People > ICO`
- `Payroll`

### Files owned

- `src/lib/ico-engine/metric-registry.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/*trust*`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Ya existe

- benchmarks documentados en arquitectura
- monitoreo de data quality del pipeline Delivery
- inventario canónico de métricas y preguntas de negocio

### Gap actual

- no existe `benchmark_type` en runtime
- no existe `confidence_level` canónico por métrica
- no existe `quality_gate_status` propagable a serving y consumers

## Scope

### Slice 1 - Benchmark registry

- modelar por métrica: `external`, `analog`, `internal`
- documentar y versionar el registry

### Slice 2 - Quality gates

- definir indicadores mínimos por KPI
- clasificar métricas como `healthy`, `degraded`, `broken`

### Slice 3 - Confidence metadata

- exponer `confidence_level`
- agregar metadata reusable en readers/materializaciones/serving

## Out of Scope

- rediseñar completamente las vistas Agency
- arreglar upstreams externos fuente de drift
- recalibrar todos los thresholds productivos en la misma lane

## Acceptance Criteria

- [ ] Existe un registry canónico de benchmark semantics por métrica
- [ ] Existe quality gate policy por métrica con estados `healthy / degraded / broken`
- [ ] El engine expone confidence metadata reusable por consumers
- [ ] `OTD`, `FTR`, `RpA` pueden distinguirse claramente como `external`, `analog`, `internal/adapted` según policy documentada

## Verification

- `pnpm exec vitest run src/lib/ico-engine/*.test.ts`
- `pnpm exec eslint src/lib/ico-engine/metric-registry.ts src/lib/ico-engine/read-metrics.ts`
- revisión manual de outputs en readers o fixtures representativos
