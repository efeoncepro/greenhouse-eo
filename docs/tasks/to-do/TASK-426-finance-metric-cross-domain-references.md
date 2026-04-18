# TASK-426 — Finance Metric Cross-Domain References (v2)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416, TASK-417`
- Branch: `task/TASK-426-finance-metric-cross-domain-references`

## Summary

Soportar `externalRef` en el `FinanceMetricRegistry` para referenciar métricas de otros dominios (ICO `Revenue Enabled`, `Throughput Expandido`) sin duplicarlas. Permite que el LLM prompt de Finance incluya métricas operacionales causalmente relacionadas cuando enriquece signals financieras, sin que Finance tenga que reimplementar el computo.

## Why This Task Exists

Algunas métricas viven en el boundary Finance/Operations: `Revenue Enabled` es ICO-owned pero financieramente consumible, `Throughput` afecta costos, `Cycle Time` afecta working capital. Si Finance duplica estas entradas, drift garantizado. Si las ignora, el LLM enriqueciendo una signal financiera no tiene acceso al contexto operacional completo para explicar el cambio.

## Goal

- Campo `externalRef?: { registry: 'ico', metricId: string }` en `FinanceMetricDefinition`
- `getMetric` resuelve `externalRef` llamando al registry externo (read-only)
- LLM prompt construye glosario incluyendo externalRefs relevantes
- UI respeta visibility del registry externo

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §5.2
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` — ICO_METRIC_REGISTRY

Reglas obligatorias:

- Cross-ref es read-only — Finance no edita definiciones de ICO
- Ownership del metric permanece en dominio original
- Cambios upstream (ICO) visibles en Finance en el siguiente render

## Dependencies & Impact

### Depends on

- TASK-416, TASK-417

### Blocks / Impacts

- LLM prompts Finance ganan contexto operacional
- Reduce tentación de duplicar métricas ICO en Finance

### Files owned

- `src/lib/finance/metric-registry/external-refs.ts`
- Definiciones ampliadas con externalRef

## Current Repo State

### Already exists

- ICO_METRIC_REGISTRY con sus propias métricas
- Finance registry (TASK-416) sin cross-reference

### Gap

- Finance no puede referenciar ICO sin duplicar

## Scope

### Slice 1 — Contract extension

- Agregar `externalRef` como variante de `FinanceMetricDefinition`

### Slice 2 — Resolver

- `resolveExternalMetric(ref)` llama al registry ICO y retorna shape compatible
- Cache por request

### Slice 3 — LLM prompt integration

- Glosario incluye externalRef labels con prefix identificable (ej: `[ICO] Revenue Enabled`)

### Slice 4 — Documentation

- Documentar boundary ICO ↔ Finance con ejemplos

## Out of Scope

- Bidireccional (ICO referencing Finance) — queda como follow-up si emerge

## Acceptance Criteria

- [ ] Contract extendido con externalRef
- [ ] Resolver funciona y está testeado
- [ ] LLM prompt incluye referencias sin duplicar definiciones
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- Signal enrichment que referencia Revenue Enabled tiene contexto cruzado
- Validación manual del prompt resultante

## Closing Protocol

- [ ] Delta en spec documentando cross-domain refs
- [ ] Lifecycle + carpeta sincronizados

## Follow-ups

- Registry central de registries (meta-registry) si aparecen más dominios
