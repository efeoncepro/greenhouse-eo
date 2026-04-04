# TASK-216 - ICO Metric Trust Model: Benchmark Registry, Quality Gates & Confidence Metadata

## Delta 2026-04-03

- Implementación cerrada:
  - `metric-registry.ts` ahora modela benchmark semantics y trust config por métrica
  - `src/lib/ico-engine/metric-trust-policy.ts` centraliza `benchmarkType`, `qualityGateStatus`, `confidenceLevel` y evidencia reusable
  - `read-metrics.ts` ya expone trust metadata genérica para `RpA`, `OTD`, `FTR`, `cycle time`, `throughput`, `pipeline velocity` y métricas de stuck
  - `greenhouse_serving.ico_member_metrics` y `greenhouse_serving.agency_performance_reports` ahora persisten `metric_trust_json`
  - `People` y `Agency Performance Report` ya leen trust metadata desde serving con fallback runtime si el JSON todavía no existe
- `TASK-214` ya dejó congelada la semántica base que esta lane debe tratar como foundation cerrada:
  - completitud canónica = `completed_at + terminal status`
  - buckets canónicos iguales en live, materialización y serving
  - `greenhouse_serving.ico_member_metrics` ya quedó alineado a `metrics_by_member` para buckets member-level
- Implicación:
  - esta task no necesita volver a tocar fórmulas base en `shared.ts`
  - debe construir trust metadata encima del contrato ya estabilizado, no volver a discutir qué cuenta como `on_time`, `late_drop`, `overdue`, `carry_over` u `overdue_carried_forward`
- Corrección de auditoría:
  - `RpA` ya tiene contrato canónico de confianza en runtime (`dataStatus`, `confidenceLevel`, `suppressionReason`, `evidence`) vía `rpa-policy.ts` + `read-metrics.ts`
  - el gap real no es "no existe confianza en absoluto", sino "no existe trust model genérico y homogéneo para el resto de las métricas"
  - la taxonomía `healthy / degraded / broken` sí existe en el ecosistema para data quality de integraciones, pero no está aplicada todavía a KPI rows de `ICO`
  - no existe hoy ningún archivo `src/lib/ico-engine/*trust*`; el patrón implementado actual es `src/lib/ico-engine/rpa-policy.ts`

## Status

- Lifecycle: `in-progress`
- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Implementada y verificada`
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
Hoy esa distinción vive en documentos y solo `RpA` ya tiene un contrato runtime parcial; el resto de las métricas todavía no publica semantics homogéneas de benchmark, quality gates y confianza.

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

- resuelto en `metric-registry.ts` + `metric-trust-policy.ts` + `read-metrics.ts`
- serving member-level y report-level ya persisten `metric_trust_json`
- consumers scoped y serving-first ya tienen fallback para no romper rows legacy

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

- [x] Existe un registry canónico de benchmark semantics por métrica
- [x] Existe quality gate policy por métrica con estados `healthy / degraded / broken`
- [x] El engine expone confidence metadata reusable por consumers
- [x] `OTD`, `FTR`, `RpA` pueden distinguirse claramente como `external`, `analog`, `internal/adapted` según policy documentada

## Verification

- `pnpm exec vitest run src/lib/ico-engine/*.test.ts`
- `pnpm exec eslint src/lib/ico-engine/metric-registry.ts src/lib/ico-engine/read-metrics.ts`
- revisión manual de outputs en readers o fixtures representativos
- `pnpm pg:doctor --profile=migrator`
- `pnpm migrate:up`
- `pnpm lint`
- `pnpm build`
