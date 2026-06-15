# TASK-1134 — Nexa Chat auto-router + model selection truth

## Delta 2026-06-15

- **Prerequisito satisfecho:** TASK-1129 (telemetría de turno) está **complete**. El ledger `greenhouse_ai.nexa_turn_telemetry` ya persiste por turno el `primaryProvider`/`resolvedProvider`/`resolvedModel`/`didFailover`/`failoverFrom`/`providerStepCount` + `detail.providerSteps[]` (latencia + ok por step) + `outcome`. El gate de esta task ("TASK-1129 debe persistir provider plan/outcome" / "no activar producción sin telemetry mínima de TASK-1129") queda cubierto. La signal `nexa.turn.degraded_outcomes` (módulo Home) ya mide `did_failover` en 24h → al activar el auto-router, el provider mix / failover rate es auditable desde el ledger. — cerrado por trabajo en TASK-1129.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|platform|ai|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1134-nexa-chat-auto-router-model-selection-truth`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Hacer que el ruteo de modelos de Nexa Chat sea verdadero y auditable. Hoy `NexaService` soporta
auto-router Gemini/Claude, pero `/api/home/nexa` fuerza un `requestedModel` resuelto desde el picker,
por lo que el primer paso del provider plan gana y el router no se alcanza en el chat principal.

## Why This Task Exists

La arquitectura dice que Claude es router-internal para preguntas de Knowledge, pero el flujo principal
del chat envia siempre un modelo soportado. Eso vuelve ambiguo el runtime: el sistema soporta
auto-router, pero la superficie viva puede quedarse siempre en Gemini. Nexa necesita una decision
explicita: `auto` como modo real, o picker manual como override consciente y observable.

## Goal

- Separar modo `auto` de seleccion manual de modelo.
- Garantizar que Knowledge questions del chat puedan usar auto-router/failover cuando el modo lo permite.
- Mantener Claude como router-internal, no como opcion visible arbitraria.
- Dejar tests y docs que prueben la precedencia real.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/nexa-intelligence/behavior/behavior-and-routing.md`
- `docs/architecture/nexa-intelligence/technical/llm-models.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`
- `docs/tasks/complete/TASK-1091-nexa-provider-abstraction-anthropic-adapter.md`

Reglas obligatorias:

- No exponer Claude como picker libre de usuario.
- El router/failover debe quedar server-side y flag-gated.
- Si un modelo manual se mantiene, debe ser un override explicito y persistido como tal.
- No romper el fallback Gemini default cuando los flags estan OFF.

## Normative Docs

- `docs/architecture/nexa-intelligence/README.md`
- `docs/tasks/to-do/TASK-1129-nexa-prompt-turn-telemetry.md`

## Dependencies & Impact

### Depends on

- `src/config/nexa-models.ts`
- `src/lib/nexa/nexa-service.ts`
- `src/lib/nexa/nexa-model-router.ts`
- `src/lib/nexa/use-nexa-runtime.ts`
- `src/app/api/home/nexa/route.ts`

### Blocks / Impacts

- `TASK-1127` QA nightly contra staging necesita saber si el chat realmente enruta a Claude.
- `TASK-1129` debe persistir provider plan/outcome.
- `TASK-1112` streaming/answer-turn debe consumir el mismo contrato de routing.

### Files owned

- `src/config/nexa-models.ts`
- `src/lib/nexa/nexa-service.ts`
- `src/lib/nexa/use-nexa-runtime.ts`
- `src/app/api/home/nexa/route.ts`
- `src/lib/nexa/nexa-service-routing.test.ts`
- `docs/architecture/nexa-intelligence/behavior/behavior-and-routing.md`
- `docs/architecture/nexa-intelligence/technical/llm-models.md`

## Current Repo State

### Already exists

- `NexaService.buildProviderPlan` soporta `requestedModel > NEXA_PROVIDER > auto-router > default`.
- `NEXA_AUTO_ROUTER_ENABLED` y `NEXA_PROVIDER` existen.
- `NEXA_MODEL_OPTIONS` es solo Gemini.

### Gap

- `/api/home/nexa` llama `resolveNexaModel({ requestedModel: model })` y siempre entrega un modelo
  soportado a `NexaService`, incluso cuando el usuario no eligio explicitamente.
- El adapter cliente persiste un modelo default en localStorage y lo manda en cada request.
- La documentacion de "local vs staging/prod" puede prometer router aunque el request lo evite.

<!-- ZONE 2 — PLAN MODE: no llenar al crear la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Contract decision

- Definir `modelMode: 'auto' | 'manual'` o contrato equivalente en el payload del chat.
- Hacer que la ausencia de override manual llegue a `NexaService` como `requestedModel: null`.
- Mantener compatibilidad con clientes viejos que mandan `model`.

### Slice 2 — Runtime wiring

- Ajustar `use-nexa-runtime` para no forzar modelo cuando el modo es `auto`.
- Si la UI conserva selector, etiquetarlo como override avanzado/operador o degradarlo segun decision
  de producto.
- Garantizar que el router se alcance con `NEXA_AUTO_ROUTER_ENABLED=true`.

### Slice 3 — Tests + docs

- Tests de precedencia: auto sin modelo -> router; manual Gemini -> override; `NEXA_PROVIDER` -> pin;
  flags OFF -> Gemini default.
- Actualizar docs de Nexa Intelligence y cualquier caveat local/staging que quede stale.

## Out of Scope

- Streaming SSE y answer-turn contract (`TASK-1112`).
- Persistencia amplia de telemetry (`TASK-1129`).
- Cambiar el prompt V2 salvo que el plan justifique bump de version.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Aumento de costo/latencia por enrutar Knowledge a Claude | ai/cost | medium | flag `NEXA_AUTO_ROUTER_ENABLED`; telemetry TASK-1129 | provider mix / latency p95 |
| Usuarios pierden override manual esperado | UI | medium | compat con payload `model`; comunicar modo auto | feedback del chat |
| Docs prometen un modo distinto al runtime | docs | medium | actualizar Nexa Intelligence en el mismo cambio | `pnpm nexa:doc-gate --changed` |

### Feature flags / cutover

- Reusar `NEXA_AUTO_ROUTER_ENABLED`.
- No activar produccion sin telemetry minima de TASK-1129 o una excepcion documentada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir contrato o tratar `modelMode` ausente como manual Gemini | < 10 min | si |
| Slice 2 | Flag OFF y fallback al payload legacy `model` | < 5 min | si |
| Slice 3 | Docs/tests revertibles | < 10 min | si |

### Production verification sequence

1. Staging con router OFF: chat usa Gemini como antes.
2. Staging con router ON + Knowledge ON: pregunta de manual/proceso resuelve provider esperado.
3. Verificar `modelId` persistido y, si TASK-1129 ya corrio, provider plan.
4. QA matrix staging.

### Out-of-band coordination required

N/A — repo/runtime flag change. Confirmar con operador antes de activar produccion.

## Acceptance Criteria

- [ ] El chat puede correr en modo `auto` sin mandar un `requestedModel` soportado.
- [ ] Preguntas de Knowledge alcanzan auto-router cuando flags ON.
- [ ] Override manual Gemini sigue funcionando de forma explicita.
- [ ] Claude sigue siendo router-internal y no aparece como opcion libre de usuario.
- [ ] Tests cubren precedencia real.

## Verification

- `pnpm vitest run src/lib/nexa/nexa-service-routing.test.ts`
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm nexa:doc-gate --changed`

