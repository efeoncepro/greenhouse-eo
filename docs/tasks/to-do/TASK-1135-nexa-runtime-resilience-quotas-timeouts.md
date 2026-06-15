# TASK-1135 — Nexa runtime resilience: timeouts, abort, circuit breakers and quotas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|platform|reliability|ai|ops`
- Blocked by: `none`
- Branch: `task/TASK-1135-nexa-runtime-resilience-quotas-timeouts`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Endurecer el runtime backend de Nexa para que cada turno tenga presupuesto operativo: abort server-side,
timeouts por provider/tool/suggestions, degradacion honesta, circuit breaker basico y rate limits/cuotas
por usuario/tenant. La meta es que Nexa falle controladamente, no que quede colgado o caro.

## Why This Task Exists

El cliente ya pasa `abortSignal` al `fetch`, pero el backend no tiene un contrato robusto de cancelacion
y presupuesto por request. Los providers ejecutan llamadas externas y tools en paralelo sin timeout
por tool, sin `Promise.allSettled`, sin circuit breaker y sin rate limit server-side visible. Para un
asistente con LLM, esto es deuda de produccion.

## Goal

- Definir budget por turno (`turn`, `provider`, `tool`, `suggestions`) con defaults conservadores.
- Propagar abort/cancelacion desde route -> service -> provider -> tool donde el SDK/reader lo permita.
- Convertir fallas parciales en resultados degradados honestos.
- Agregar rate limit/cuotas server-side por usuario/tenant/model class.
- Emitir metadata para observabilidad (coordinar con TASK-1129).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/nexa-intelligence/behavior/behavior-and-routing.md`
- `docs/architecture/nexa-intelligence/technical/techniques.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- No devolver errores crudos al cliente; coordinar con `TASK-1131`.
- No silenciar fallas del provider sin telemetry; coordinar con `TASK-1129`.
- No rate-limit solo en frontend.
- No meter queries directas del corpus Knowledge; tools siguen usando readers canonicos.

## Normative Docs

- `docs/tasks/to-do/TASK-1131-nexa-chat-endpoint-canonical-error-contract.md`
- `docs/tasks/to-do/TASK-1129-nexa-prompt-turn-telemetry.md`
- `docs/tasks/to-do/TASK-1112-nexa-chat-answers-experience-unification.md`

## Dependencies & Impact

### Depends on

- `src/app/api/home/nexa/route.ts`
- `src/lib/nexa/nexa-service.ts`
- `src/lib/nexa/nexa-provider.ts`
- `src/lib/nexa/providers/gemini.ts`
- `src/lib/nexa/providers/anthropic.ts`
- `src/lib/nexa/nexa-tools.ts`
- `src/lib/nexa/use-nexa-runtime.ts`

### Blocks / Impacts

- `TASK-1112` should reuse this budget/abort contract for streaming.
- `TASK-1129` should persist outcomes and timings emitted by this task.
- Production rollout of Knowledge/Claude benefits from guardrails before broader activation.

### Files owned

- `src/lib/nexa/nexa-runtime-budget.ts` (nuevo, si aplica)
- `src/lib/nexa/nexa-service.ts`
- `src/lib/nexa/nexa-provider.ts`
- `src/lib/nexa/providers/*`
- `src/lib/nexa/nexa-tools.ts`
- `src/app/api/home/nexa/route.ts`
- `src/lib/reliability/queries/nexa-*`

## Current Repo State

### Already exists

- Client adapter usa `abortSignal` en `fetch`.
- Provider abstraction y failover existen.
- Tool `search_knowledge` ya captura errores con `captureWithDomain`.
- Vertex permission denied tiene fallback amigable.

### Gap

- No hay budget central de turno.
- No hay timeout/circuit breaker por tool/provider/suggestions.
- Tool execution usa `Promise.all` y un tool lento puede bloquear el turno completo.
- No hay rate limit/cuota server-side visible.
- Errores de route aun son raw hasta cerrar `TASK-1131`.

<!-- ZONE 2 — PLAN MODE: no llenar al crear la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Budget contract

- Crear contrato server-only para presupuesto de turno: `turnTimeoutMs`, `providerTimeoutMs`,
  `toolTimeoutMs`, `suggestionTimeoutMs`, `maxToolCalls`, `maxKnowledgeChunks`.
- Defaults por env con clamps seguros y tests.

### Slice 2 — Abort + timeout propagation

- Pasar `AbortSignal`/deadline desde route a `NexaService`.
- Providers respetan abort/timeouts cuando el SDK lo permita; si no, wrapper con deadline y resultado
  degradado.
- Suggestions no bloquean la respuesta principal.

### Slice 3 — Tool isolation

- Ejecutar tool calls con timeout por tool y `Promise.allSettled`.
- Convertir cada failure en `NexaToolResult.available=false` con causa segura.
- Mantener `search_knowledge` y tools operativos dentro de sus readers canonicos.

### Slice 4 — Quotas/rate limits

- Agregar rate limit server-side por user/tenant/model class.
- Definir response canonica para quota exceeded.
- No depender de localStorage ni state del cliente para controlar abuso/costo.

### Slice 5 — Signals and docs

- Reliability signals: timeout rate, quota rate, provider failure/failover rate, tool degraded rate.
- Actualizar Nexa Intelligence technical/behavior docs.

## Out of Scope

- Streaming SSE (`TASK-1112`).
- Acciones mutativas de Nexa (`TASK-1137`).
- RAG vector/hybrid (`TASK-1136`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Timeouts demasiado agresivos degradan respuestas utiles | ai/runtime | medium | env clamps + staging soak | `nexa.turn.timeout_rate` |
| Rate limit bloquea usuarios legitimos | product | medium | limites por rol/tenant + modo warn-first si aplica | `nexa.turn.quota_limited_rate` |
| SDK no cancela realmente llamada en curso | ai/provider | medium | deadline wrapper + telemetry + circuit breaker | latency p95 |
| Tool operativo lento bloquea todo | data | medium | per-tool timeout + allSettled | `nexa.tool.degraded_rate` |

### Feature flags / cutover

- Introducir envs default conservadores.
- Rate limit puede iniciar en `report_only` si el plan lo justifica.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Env a defaults legacy o revert helper | < 10 min | si |
| Slice 2 | Desactivar deadline wrapper por env | < 10 min | si |
| Slice 3 | Volver a execution legacy con flag | < 10 min | si |
| Slice 4 | `NEXA_RATE_LIMIT_MODE=off` | < 5 min | si |
| Slice 5 | Signals/docs revertibles | < 10 min | si |

### Production verification sequence

1. Tests unitarios/focales.
2. Staging con budgets amplios: parity behavior.
3. Staging con budgets reales: QA matrix + manual chat.
4. Verificar signals por 24h antes de prod strict.

### Out-of-band coordination required

Puede requerir decision de limites por rol/tenant y presupuesto de costo mensual.

## Acceptance Criteria

- [ ] Cada turno tiene deadline server-side controlado.
- [ ] Cada provider/tool/suggestion puede degradar sin colgar todo el turno.
- [ ] Existe rate limit/cuota server-side.
- [ ] Existen signals para timeout, quota, provider failure/failover y tool degradation.
- [ ] El cliente recibe errores canonicos, no detalles tecnicos.

## Verification

- `pnpm vitest run src/lib/nexa`
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm nexa:doc-gate --changed`

