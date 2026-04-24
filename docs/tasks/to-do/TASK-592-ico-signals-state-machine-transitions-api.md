# TASK-592 — Signal state machine + transitions API (EPIC-006 child 3/8)

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
- Branch: `task/TASK-592-ico-signals-state-machine-api`

## Summary

Implementar state machine explícita de lifecycle de signals (`open → acknowledged → acting → resolved | suppressed | auto_resolved`) con CRUD de transiciones expuesto vía API, RBAC por capability, y audit trail append-only en `signal_events`. Es la superficie para que humanos, agentes AI, y webhooks externos modifiquen el estado de un signal sin bypasear la governance.

## Why This Task Exists

Hoy un signal no tiene estado gestionable — existe o no existe. No se puede marcar como "visto", "en acción", "falso positivo". Sin state machine no hay inbox operativo, no hay MTTA/MTTR medible, no hay audit trail. Este task instala la capa de acciones sobre los signals.

## Goal

- State machine con transiciones válidas enforcadas en DB + código.
- Endpoints `POST /api/signals/:signal_key/{acknowledge|resolve|suppress|reopen|reenrich}`.
- Capabilities `signals.acknowledge`, `signals.resolve`, `signals.suppress`.
- Todas las transiciones escriben `signal_events` con `actor_type + actor_id + reason`.
- `resolved` es terminal para ese ciclo; re-detectar abre nuevo ciclo con `detected_at` nuevo.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

## Dependencies & Impact

### Depends on
- `TASK-590` — tablas `signals_v2` y `signal_events` existen.

### Blocks / Impacts
- `TASK-595` — UI inbox consume esta API.
- `TASK-596` — webhooks outbound se disparan desde transiciones.

### Files owned
- `src/app/api/signals/[signalKey]/acknowledge/route.ts` (nuevo)
- `src/app/api/signals/[signalKey]/resolve/route.ts` (nuevo)
- `src/app/api/signals/[signalKey]/suppress/route.ts` (nuevo)
- `src/app/api/signals/[signalKey]/reopen/route.ts` (nuevo)
- `src/app/api/signals/[signalKey]/reenrich/route.ts` (nuevo)
- `src/app/api/signals/route.ts` (listar)
- `src/lib/ico-engine/ai/signal-transitions.ts` (state machine core)
- `src/lib/ico-engine/ai/signal-transitions.test.ts`
- `src/config/capability-registry.ts` — nuevas capabilities.

## Current Repo State

### Already exists
- Schema v2 con columnas lifecycle (TASK-590).
- Auth/tenant context helpers en `src/lib/tenant/`.
- Capability system en `src/config/capability-registry.ts` + middleware.

### Gap
- No hay endpoints de transición.
- No hay state machine validator.
- No hay capabilities `signals.*`.

## Scope

### Slice 1 — State machine core

- `signal-transitions.ts` con:
  - `VALID_TRANSITIONS: Record<SignalStatus, SignalStatus[]>` matrix.
  - `applyTransition(signalKey, target, actor, reason)` con validación.
  - Atomicidad: un UPDATE + un INSERT a `signal_events` en transacción.
- Tests exhaustivos de cada transición válida + inválida.

### Slice 2 — Endpoints REST

- `POST /api/signals/:signal_key/acknowledge` — capability `signals.acknowledge`.
- `POST /api/signals/:signal_key/resolve` — capability `signals.resolve`, requires `reason`.
- `POST /api/signals/:signal_key/suppress` — capability `signals.suppress`, requires `until` + `reason`.
- `POST /api/signals/:signal_key/reopen` — valido solo desde `auto_resolved`; abre ciclo nuevo.
- `POST /api/signals/:signal_key/reenrich` — capability `signals.reenrich`, fuerza regenerar LLM narrative.
- `GET /api/signals` — list con filtros (`space_id`, `status`, `severity`, `period_year`, `period_month`, `dimension`).
- `GET /api/signals/:signal_key` — detail + timeline de eventos.

### Slice 3 — Capabilities + entitlements

- Nuevas capabilities en `capability-registry.ts`:
  - `signals.read` — default a todos.
  - `signals.acknowledge` — default a operators + admins.
  - `signals.resolve` — admins + delivery managers.
  - `signals.suppress` — admins solo.
  - `signals.reenrich` — admins solo.

### Slice 4 — Tests

- Integration tests con mock de tenant + capability.
- Test de audit trail: tras `acknowledge`, `signal_events` tiene fila con actor/reason.
- Test de transición inválida: `POST resolve` sobre signal `open` sin `acknowledged` primero debe fallar 409.

## Out of Scope

- UI no se toca (TASK-595).
- Webhook outbound (TASK-596).
- Escritura a v1 (no aplica — v2 only).

## Acceptance Criteria

- [ ] 6 endpoints implementados con RBAC correcto.
- [ ] State machine enforcea transiciones válidas en código + check constraint DB.
- [ ] Cada transición escribe `signal_events` append-only con actor + reason.
- [ ] Test de integración cubre todas las transiciones happy + unhappy.
- [ ] `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` clean.

## Verification

- Tests unitarios + integración.
- Manual: dado un signal `open`, invocar la cadena completa de transiciones vía curl con token válido + inválido.

## Closing Protocol

- [ ] Lifecycle sincronizado.
- [ ] EPIC-006 child 3/8 marcado complete.
- [ ] API documentada en `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md`.

## Follow-ups

- Capability fine-grained por severity (ej. solo admins pueden resolver critical).
- Bulk acknowledge para inbox UX.
