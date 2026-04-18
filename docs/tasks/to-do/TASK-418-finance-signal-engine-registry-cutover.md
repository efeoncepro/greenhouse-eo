# TASK-418 — Finance Signal Engine Cutover to Registry

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `refactor`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416, TASK-417`
- Branch: `task/TASK-418-finance-signal-engine-registry-cutover`

## Summary

Migrar el Finance Signal Engine (TASK-245) para consumir el `FinanceMetricRegistry` como source de verdad de métricas, detection config, quality gates y LLM glossary. Reemplaza el registry ad-hoc actual en `finance-signal-types.ts`. Incluye regression test que garantiza que el detector produce señales equivalentes antes/después del cutover.

## Why This Task Exists

TASK-245 creó un `FINANCE_METRIC_REGISTRY` local ad-hoc con 6 métricas, thresholds globales, y glosario LLM hardcoded. Con el registry canónico disponible (TASK-416), este local debe deprecarse para eliminar drift entre lo que el signal engine detecta y lo que el dashboard muestra. También activa `detection.strategies[]` combinables (DSO con Z-score Y threshold absoluto) y `causalChain` direccional en el prompt.

## Goal

- `src/lib/finance/ai/anomaly-detector.ts` lee detection config por métrica del registry (no hardcoded)
- `src/lib/finance/ai/llm-provider.ts` construye glosario y causal chain del registry dinámicamente
- `src/lib/finance/ai/finance-signal-types.ts` deja de exportar registry local; re-exporta del canónico
- Prompt LLM gana direccionalidad causal (revenue ↓ → margin ↓ explícito)
- Signal engine produce el mismo set de señales antes/después sobre fixture de datos idénticos

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §7 — extensiones al signal engine
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — contrato glosario + causal chain

Reglas obligatorias:

- Prompt LLM NO hardcodea métricas; todas vienen del registry via `getMetric`
- Detection usa `detection.strategies` (array) + `combine`
- Advisory-only preserved: signal engine nunca bloquea workflows

## Dependencies & Impact

### Depends on

- TASK-416 (Registry foundation)
- TASK-417 (Reader primitives)

### Blocks / Impacts

- Deprecación del registry local en `finance-signal-types.ts`
- Ajuste del prompt hash — `prompt_version` sube a `finance_signal_enrichment_v2`

### Files owned

- `src/lib/finance/ai/anomaly-detector.ts`
- `src/lib/finance/ai/llm-provider.ts`
- `src/lib/finance/ai/finance-signal-types.ts`
- `src/lib/finance/ai/llm-enrichment-worker.ts` (ajustes menores)
- Tests de regression

## Current Repo State

### Already exists

- Pipeline completo de Finance Signal Engine (TASK-245): detector, LLM worker, reader, Cloud Run endpoints
- `FINANCE_METRIC_REGISTRY` local con 6 métricas + prompt hardcoded en `finance-signal-types.ts`

### Gap

- Registry local duplica conocimiento del canónico
- Causal chain es string libre sin dirección
- Detection usa Z-score único; DSO no puede combinar Z-score + threshold absoluto

## Scope

### Slice 1 — Detector reads registry

- `anomaly-detector.ts` itera métricas con `detection.strategies.length > 0`
- Por cada métrica, aplica todas las strategies y combina según `combine: 'any' | 'all'`
- Quality gates: skip si `qualityGates.requiredInputs` no satisfechas (v1 parcial — full enforcement en TASK-422)
- Regression test con fixture de TASK-245: output idéntico

### Slice 2 — LLM provider consumes registry

- `buildFinancePrompt()` genera glosario a partir de métricas activas del registry + `llmGlossary`
- `causalChain` direccional se renderiza en el prompt como lista estructurada (no string libre)
- Prompt version bump a `finance_signal_enrichment_v2`
- Snapshot test del prompt generado

### Slice 3 — Deprecate local registry

- `finance-signal-types.ts` re-exporta tipos + helpers del registry canónico
- Entries locales eliminadas
- `FINANCE_METRIC_REGISTRY` local marca `@deprecated` con link al canónico

## Out of Scope

- Quality gates runtime enforcement completo → TASK-422
- Per-scope thresholds → TASK-423
- LLM glossary scoping (prompt cost) → TASK-424

## Acceptance Criteria

- [ ] Detector no referencia métricas hardcoded; todas vienen de `getMetric`
- [ ] Prompt LLM se construye 100% desde registry + causal chain direccional
- [ ] Regression test: signal engine sobre fixture produce el mismo set que antes del cutover
- [ ] Local `FINANCE_METRIC_REGISTRY` en `finance-signal-types.ts` eliminado o degradado a re-export
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- Regression test: run detector antes y después sobre datos idénticos, diff vacío
- Manual: disparar `POST /finance/llm-enrich` en staging y verificar que `explanation_json` conserva calidad narrativa
- Snapshot test del prompt

## Closing Protocol

- [ ] Lifecycle + carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] Actualizar `GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` con delta confirmando que signal engine es consumer
- [ ] Cross-check TASK-245: marcar como impactada + archivar registry local

## Follow-ups

- TASK-422 (quality gates runtime)
- TASK-424 (prompt scoping) una vez llegue a >30 métricas
