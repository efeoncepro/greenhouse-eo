# TASK-426 — Finance Metric Cross-Domain References (v2)

## Delta 2026-05-05 — pre-execution hardening (scalability pillar)

`externalRef: { registry: 'ico', metricId }` declarado en spec original es válido como feature, pero **subusa el patrón**: es el extension point natural para un **MetricRegistryRouter** que resuelve cualquier registry de la plataforma analítica. Si emerge Capacity registry, Staffing registry, Partnership registry, Talent registry, Delivery registry — todos consumen el mismo router sin trabajo adicional. La spec V1 anticipa estos registries.

### Decisión canónica — formalizar MetricRegistryRouter como extension point

Promover Slice 4 ("Documentation") a **Slice 4 nuevo: MetricRegistryRouter primitive** (50 líneas TS adicionales pero define el extension point de toda la plataforma analítica futura).

**Contract**:

```ts
// src/lib/metric-registries/router.ts
export type RegistryName = 'finance' | 'ico' | 'capacity' | 'staffing' | 'partnership' | 'talent' | 'delivery'

export interface MetricRegistryAdapter {
  getMetric(metricId: string, opts?: { asOf?: Date; locale?: string }): ResolvedMetric | null
  listMetrics(): readonly ResolvedMetric[]
}

const REGISTRY_ADAPTERS: Record<RegistryName, MetricRegistryAdapter | null> = {
  finance: financeAdapter,        // TASK-416
  ico: icoAdapter,                // TASK-426 v1 (este task)
  capacity: null,                 // reservado — sin implementer aún
  staffing: null,
  partnership: null,
  talent: null,
  delivery: null,
}

export function resolveExternalMetric(
  ref: { registry: RegistryName; metricId: string },
  opts?: { asOf?: Date; locale?: string }
): ResolvedMetric | null {
  const adapter = REGISTRY_ADAPTERS[ref.registry]
  if (!adapter) return null  // unknown registry — degraded honesty
  return adapter.getMetric(ref.metricId, opts)
}
```

**Reglas duras**:

- **NUNCA** importar `ICO_METRIC_REGISTRY` directo desde finance code. Toda lectura cross-domain pasa por `resolveExternalMetric`.
- **NUNCA** mutar definiciones via cross-ref. Read-only por construcción.
- **NUNCA** registrar adapter sin declararlo en `REGISTRY_ADAPTERS`. TS exhaustiveness check enforce.
- Cuando emerja un nuevo registry de dominio (Capacity TASK-XXX, Staffing TASK-YYY), agregar entry al map + crear adapter — cero refactor de finance.

### Sinergia con i18n / `LocalizedString`

El `ResolvedMetric` que devuelve cualquier adapter ya viene con labels localizados via `LocalizedString` (TASK-416 contract). Cuando finance pide ICO `Revenue Enabled` para el LLM prompt, recibe la versión locale-correcta sin trabajo adicional.

### Sinergia con TASK-422 + TASK-425

External metrics también pueden estar `stale` o `recomputing`. El adapter debe exponer `lastMaterializedAt` + `freshnessStatus`. Si ICO `Revenue Enabled` está stale, el LLM prompt de finance signal recibe disclaimer "Contexto cross-domain: Revenue Enabled está stale (última actualización: hace X)" para que el LLM no asuma data fresh.

### Acceptance criteria adicionales

- [ ] `MetricRegistryRouter` declarado con shape canónico (TS exhaustiveness enforced)
- [ ] `resolveExternalMetric` implementado con adapter ICO funcional (5 registries reservados sin implementer)
- [ ] Lint rule `greenhouse/no-cross-registry-direct-import` (modo `warn` v1, promover a `error` cuando emerja segundo registry implementer)
- [ ] Tests: cross-registry resolve + degraded honesty cuando registry no tiene adapter + locale fallback
- [ ] Doc canónico `docs/architecture/GREENHOUSE_METRIC_REGISTRY_PLATFORM_V1.md` declarando el router como extension point de toda la plataforma analítica (subordina TASK-426 al pattern, no al revés)

### Out of scope (defer hasta segundo implementer)

- Bidireccional (ICO referencing Finance) — queda hasta que emerja necesidad real con telemetría.
- Per-adapter caching policy — adapter decide; v1 es per-request.

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
