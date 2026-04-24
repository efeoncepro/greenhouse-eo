# TASK-593 — LLM enrichment con versioning + budget + quality gate (EPIC-006 child 4/8)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-006`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-590`
- Branch: `task/TASK-593-ico-signals-llm-enrichment-governance`

## Summary

Refactorizar el LLM enrichment worker para que sea idempotente por `signal_key + prompt_hash`, versione narrativas históricas, respete budgets por tenant, aplique quality gate y circuit breaker. Hoy regenera en cada corrida aunque nada material haya cambiado, genera huérfanos cuando el signal parent se borra, y no tiene governance de costo ni calidad.

## Why This Task Exists

El enrichment actual es caro y ruidoso: regenera narrativa en cada materialize, gasta tokens aunque la data sea idéntica, propaga narrativas low-confidence a UI, y deja huérfanos en PG cuando el signal parent se borra. Enterprise-grade requiere: versionar cada narrativa con el contexto que la produjo, regenerar solo cuando algo cambió material mente, respetar un budget cap por tenant, y descartar outputs de baja calidad.

## Goal

- Tabla `signal_enrichments_v2` versionada (de TASK-590) poblada por el worker.
- Política: solo regenerar si `severity_band` cambió O `prompt_hash` cambió O manual override.
- Budget cap por tenant: tokens/día, costo USD/mes.
- Quality gate: descartar `quality_score < 0.6`, fallback templated.
- Circuit breaker: latencia p95 > 10s por 5min → suspend + flag.
- Cache por `prompt_hash` para dedup entre signals con mismo contexto.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` (baseline)

## Dependencies & Impact

### Depends on
- `TASK-590` — tabla `signal_enrichments_v2` + `enrichment_budgets`.

### Blocks / Impacts
- `TASK-594` — SLIs de enrichment latency + quality.
- `TASK-595` — UI lee narrativas versionadas.
- `TASK-597` — cutover asume enrichment en v2.

### Files owned
- `src/lib/ico-engine/ai/llm-enrichment-worker.ts` (refactor mayor)
- `src/lib/ico-engine/ai/enrichment-budget.ts` (nuevo)
- `src/lib/ico-engine/ai/enrichment-circuit-breaker.ts` (nuevo)
- `src/lib/ico-engine/ai/prompt-hash.ts` (nuevo)
- `src/lib/ico-engine/ai/__tests__/enrichment-*.test.ts` (nuevos)

## Current Repo State

### Already exists
- `llm-enrichment-worker.ts` — worker actual (regenera todo, sin versioning).
- `enrichSignalPayload` + `sanitizeAiSignalEnrichmentOutput` en `llm-provider.ts` — se mantienen, solo cambia el flow de invocación.
- Tabla v1 `ico_ai_signal_enrichments` — convive, no se toca.

### Gap
- No hay versioning por `prompt_hash`.
- No hay budget control.
- No hay quality gate.
- No hay circuit breaker.
- No hay cache de prompts idénticos.

## Scope

### Slice 1 — Prompt hashing + detección de cambio material

- `computePromptHash(signal, context)` = sha256 del JSON normalizado del prompt.
- Al invocar enrichment, primero buscar `signal_enrichments_v2` con mismo `signal_key + prompt_hash + is_current=true` → skip si existe.

### Slice 2 — Versioning write path

- Al generar narrativa nueva: `UPDATE … SET is_current=false WHERE signal_key=X AND is_current=true; INSERT nueva versión con is_current=true`.
- Histórico se preserva; UI puede mostrar "versión anterior" en timeline.

### Slice 3 — Budget cap

- Tabla `ico_engine.enrichment_budgets` con `space_id + daily_token_cap + monthly_usd_cap`.
- Al invocar LLM: `SELECT SUM tokens hoy WHERE space_id=X`; si supera cap → fallback templated, marcar `enrichment_skipped_reason='budget_exceeded'`.

### Slice 4 — Quality gate

- Si `quality_score < 0.6`: descartar, usar narrativa templated basada en signal metadata, marcar flag.

### Slice 5 — Circuit breaker

- Monitor rolling p95 de latencia por minuto. Si p95 > 10s por 5 min consecutivos → `flag_degraded=true` + notificación.
- Mientras degraded, todos los enrichments caen a templated automáticamente.

### Slice 6 — Tests

- Test: no regenerar cuando prompt_hash idéntico.
- Test: regenerar cuando severity_band cambia.
- Test: budget exceeded → fallback templated.
- Test: quality < 0.6 → fallback templated + log.
- Test: circuit breaker open tras simular latencias altas.

## Out of Scope

- Cambiar el model backend (sigue siendo Gemini).
- Tuning de prompts (es otro frente).
- Tabla de budgets compleja con políticas dinámicas — v1 es caps fijos por tenant.

## Acceptance Criteria

- [ ] Worker no regenera si `signal_key + prompt_hash` ya está `is_current=true`.
- [ ] Histórico preservado en `signal_enrichments_v2` con `is_current=false`.
- [ ] Tests de budget + quality gate + circuit breaker verdes.
- [ ] Reducción medible de tokens vs corridas previas (target: ~80%).
- [ ] `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` clean.

## Verification

- Staging: correr worker 3 días consecutivos, medir tokens consumidos, comparar con baseline v1.
- Unit + integration tests.

## Closing Protocol

- [ ] Lifecycle sincronizado.
- [ ] EPIC-006 child 4/8 marcado complete.
- [ ] Doc de enrichment versioning en `GREENHOUSE_ICO_ENGINE_V2.md`.

## Follow-ups

- Panel Admin para ajustar budgets por tenant sin redeploy.
- Análisis de drift de quality_score como feature engineering.
