# TASK-424 — Finance Metric LLM Glossary Prompt Scoping (v2)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `optimization`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-418`
- Branch: `task/TASK-424-finance-metric-llm-glossary-prompt-scoping`

## Summary

Optimizar el prompt del Finance Signal Engine para incluir en el glosario LLM **solamente** las métricas relevantes a la señal que se está enriqueciendo (la métrica de la señal + su DAG de dependencias + descendants inmediatos), en vez de las 18+ métricas del registry completo. Reduce tokens por enrichment y mejora foco del LLM.

## Why This Task Exists

Cuando el registry supere las ~25-30 métricas (v1 arranca con 18 + 4 indicators), incluir el glosario completo en cada prompt es ~600-800 tokens adicionales per signal enrichment. Con 500+ signals mensuales y Gemini 2.5 Flash, el costo se nota. Además el LLM trabaja mejor con glosario acotado: menos ruido, más foco en las métricas verdaderamente causalmente relacionadas.

**Trigger para activar esta task:** cuando el registry llegue a 25+ entradas, o cuando el costo mensual de Gemini en signal enrichment supere el umbral acordado con Finance/Ops.

## Goal

- `llmGlossary.scopingStrategy` agregado al contrato del registry con valores `'full' | 'metric_plus_causal' | 'metric_only'`
- LLM provider (en `src/lib/finance/ai/llm-provider.ts`) resuelve glosario scopeado según strategy + métrica de la señal
- Default `metric_plus_causal`: incluye la métrica + todas las del `causalChain` (from) + descendents de primer nivel
- Telemetría: loggear tokens antes/después del cambio

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §11 (debt #7)
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — contrato LLM

Reglas obligatorias:

- Calidad de narrativa del LLM no debe degradarse (validar con snapshot tests)
- Prompt version bump a `v3` tras cambio

## Dependencies & Impact

### Depends on

- TASK-418 (Signal engine cutover)

### Blocks / Impacts

- Costo Gemini baja
- Calidad narrativa puede requerir ajuste de causal chain directional

### Files owned

- `src/lib/finance/metric-registry/types.ts` (nuevo campo scopingStrategy)
- `src/lib/finance/metric-registry/definitions/*.ts` (declarar strategy per-metric)
- `src/lib/finance/ai/llm-provider.ts` (nuevo helper `buildScopedGlossary`)
- Prompt snapshot tests

## Current Repo State

### Already exists (tras TASK-418)

- Prompt LLM construido desde registry con glosario completo

### Gap

- Glosario completo escala linealmente con registry size

## Scope

### Slice 1 — Contract extension

- Agregar `scopingStrategy` al shape de `FinanceMetricDefinition` o como top-level config

### Slice 2 — Helper `buildScopedGlossary`

- Dado `metricId` objetivo, retorna set de métricas relevantes
- Recursión controlada (depth <= 2 por default)

### Slice 3 — Prompt generation update

- `llm-provider.ts` usa scoped glossary
- Bump `FINANCE_LLM_PROMPT_VERSION` a `v3`

### Slice 4 — Telemetry + validation

- Loggear tokensIn antes/después en snapshot comparison
- Snapshot tests de prompts asegurando contenido aún coherente

## Out of Scope

- Deep reasoning sobre DAG causal completo (solo depth 2)
- Adaptive scoping por histórico de signals

## Acceptance Criteria

- [ ] `scopingStrategy` en contrato
- [ ] Helper implementado y testeado
- [ ] Prompt version bumped a v3
- [ ] Métricas token por enrichment reducidas (reporte en delta)
- [ ] Narrative quality snapshot tests pasan
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- Run enrichment sobre fixture conocido antes/después
- Comparar tokens + calidad de output
- Validación manual: Nexa insights sigue siendo legible

## Closing Protocol

- [ ] Delta en spec documentando scoping strategy
- [ ] Lifecycle + carpeta sincronizados

## Follow-ups

- Si Nexa escala a Capacity / Staffing / Partnership engines, mismo pattern
