# TASK-1184 — Nexa Governed Action on Insight (Bridge Slice 4)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `task/TASK-1184-nexa-governed-action-on-insight`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Plano 4 del Nexa Insight ↔ Conversation Bridge: desde el chat, el usuario puede **actuar** sobre un insight de delivery (reconocer / posponer / asignar la recomendación) mediante el runtime de acción gobernada `propose → confirm → execute` (TASK-1137) — el LLM nunca escribe, muta sólo el endpoint de confirmación humana. Introduce un estado de interacción de insight (tabla nueva) + capability + acciones registradas. Requiere ADR propio de tier de autonomía.

## Why This Task Exists

Slices 1-3 hicieron que Nexa y los Insights se **conozcan** (leer, enfocar, citar). El paso de "conocerse" a "operar juntos" es actuar sobre el insight sin salir de la conversación. Hoy un insight es read-only: no existe forma gobernada de marcar uno como reconocido, posponerlo o asignar su recomendación a alguien. Esta task cierra el bridge habilitando el write — pero como toca el dominio delivery con un LLM en el loop, exige el patrón gobernado completo (capability fina + propose→confirm→execute + audit) y un ADR de tier de autonomía, sin violar el boundary ICO.

## Goal

- ADR de tier de autonomía: qué acciones, qué tier, qué modelo de estado de interacción de insight.
- Estado de interacción de insight persistido (acknowledge / snooze / assign-recommendation) con migración + capability fina + grant.
- Acciones registradas en el action runtime de Nexa (`src/lib/nexa/actions/`) que el LLM **propone** y un humano **confirma**; mutación solo en el endpoint de confirmación.
- Boundary ICO respetado: NUNCA tocar `payroll_entries`/`compensation_versions`/`final_settlements` ni recalcular métricas; el insight de origen (`ico_ai_signal_enrichments`) es read-only — el estado de interacción vive en una tabla aparte.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_DECISION_V1.md` (ADR — Plano 4, declarado "requires ADR propio")
- `docs/architecture/GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_V1.md` (spec — §2.4)
- `docs/architecture/GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md` (§Autonomy Boundary — tiers)
- `docs/architecture/nexa-intelligence/behavior/behavior-and-routing.md` (§Acciones gobernadas TASK-1137)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (capability gobernada + propose→confirm→execute)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability + grant)
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` (boundary ICO + append-only)

Reglas obligatorias:

- **NUNCA** el LLM ejecuta el write: el loop es `propose → confirm → execute`; muta sólo el endpoint de confirmación humana (`/api/nexa/actions/[actionKey]/confirm`, TASK-1137).
- **NUNCA** mutar `ico_ai_signal_enrichments`/`ico_ai_signals` (append-only / serving): el estado de interacción vive en una tabla nueva con FK al insight.
- **NUNCA** una acción sobre la recomendación de un insight toca payroll/compensation/finiquito ni recalcula métricas ICO (boundary ICO duro).
- **SIEMPRE** capability fina nueva + grant a ≥1 rol real en el mismo PR (coverage test TASK-873/935); NUNCA admin-coarse.
- **SIEMPRE** la migración empieza con `-- Up Migration` + DO block anti pre-up-marker + audit/append-only para el log de interacciones.

## Normative Docs

- `.claude/skills/greenhouse-nexa-conversational/skill.md` (action runtime + doc-gate)
- `.claude/skills/greenhouse-ico` (boundary delivery; el bonus/metrics NO se tocan)
- `docs/tasks/complete/TASK-1137-*.md` [verificar] — el patrón pilot `mark_notifications_read` (registry + confirm endpoint + events store)

## Dependencies & Impact

### Depends on

- TASK-1137 — action runtime `propose → confirm → execute` (`src/lib/nexa/actions/*`, endpoint confirm, events store, flag `NEXA_ACTION_RUNTIME_ENABLED`)
- TASK-1181 — los insight tools (el usuario llega al insight por conversación)
- `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts` — para resolver/validar el insight objetivo (subject anti-oracle)
- `capabilities_registry` + `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capability + grant)
- `src/lib/api/executeApiPlatformCommand` (idempotencia/command foundation TASK-655)

### Blocks / Impacts

- Es el último plano del bridge. Habilita la generalización "actuar sobre una señal" a otros dominios (Finance signals) como follow-up.

### Files owned

- `docs/architecture/GREENHOUSE_NEXA_INSIGHT_ACTION_DECISION_V1.md` (ADR nuevo) [crear]
- `migrations/<ts>_task-1184-insight-interaction-state.sql`
- `src/lib/<dominio>/insight-interactions/*` (command + store del estado de interacción) [definir ubicación canónica: `src/lib/ico-engine/ai/` o `src/lib/nexa/`]
- `src/lib/nexa/actions/registry.ts` (+ definiciones de acción) + `src/lib/nexa/actions/<insight-actions>.ts`
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts`
- `src/lib/reliability/queries/*` (signal de la acción, si aplica)

## Current Repo State

### Already exists

- Action runtime completo (`propose → confirm → execute`) con pilot `mark_notifications_read` (TASK-1137): registry, resolver determinista, confirm endpoint, events store, 2 reliability signals.
- Insight resolvible por el reader anti-oracle (TASK-1181/947).
- Patrón capability + grant + coverage test (TASK-873/935).

### Gap

- No existe estado de interacción de insight (acknowledge/snooze/assign) — el insight es read-only.
- No hay acciones de insight en el registry del action runtime.
- No hay ADR de tier de autonomía para este write.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: tabla nueva de interacción de insight (no `ico_ai_signal_enrichments`)
- Consumidores afectados: `Nexa chat (propose) + confirm endpoint (execute) + futuras surfaces`
- Runtime target: `staging` (flag OFF) → `production` (decisión del operador)

### Contract surface

- Contrato existente a respetar: action runtime `nexa-action-proposal.v1` + confirm endpoint + `executeApiPlatformCommand`
- Contrato nuevo o modificado: acciones registradas (`acknowledge_insight`, `snooze_insight`, `assign_insight_recommendation` — set final a decidir en el ADR) + command que muta el estado de interacción + reader del estado
- Backward compatibility: `gated` (flag `NEXA_ACTION_RUNTIME_ENABLED` + allowlist de acciones; default OFF)
- Full API parity: command gobernado reusable por todos los consumers (UI futura, Nexa, MCP); NO un handler acoplado al chat

### Data model and invariants

- Entidades/tablas/views afectadas: tabla nueva `*_insight_interactions` (FK lógico al `signal_id`/`enrichment_id`); `ico_ai_signal_enrichments` queda **read-only**
- Invariantes que no se pueden romper:
  - El insight de origen es append-only/serving: NUNCA se muta.
  - El estado de interacción es append-only (audit) o state-machine con audit; nunca DELETE.
  - El LLM solo propone; la mutación ocurre solo en el confirm endpoint.
  - Boundary ICO: cero efecto en payroll/compensation/métricas.
- Tenant/space boundary: el insight objetivo se valida con el subject anti-oracle (solo internos; self/broad según rol)
- Idempotency/concurrency: idempotencyKey del proposal (TASK-1137) — doble confirm = replay, no doble apply
- Audit/outbox/history: log append-only de interacciones + evento outbox versionado si downstream lo consume

### Migration, backfill and rollout

- Migration posture: `additive` (tabla nueva + capability seed; `-- Up Migration` + DO block de verificación)
- Default state: `flag OFF` (`NEXA_ACTION_RUNTIME_ENABLED` + allowlist de las acciones de insight)
- Backfill plan: N/A (estado nuevo)
- Rollback path: `flag off` (quita las acciones del allowlist) + revert PR; la tabla queda inerte
- External coordination: N/A — repo-only; sign-off del operador para flip de allowlist

### Security and access

- Auth/access gate: `capability` fina nueva (`delivery.insight.interaction.manage` o similar) + grant a roles internos reales; el confirm endpoint re-valida (TASK-1137)
- Sensitive data posture: delivery scoped; sin PII payroll/finance
- Error contract: canónico es-CL + `captureWithDomain`; gaps honestos del resolver
- Abuse/rate-limit posture: heredado del action runtime; LLM no alcanza el executor

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/nexa src/lib/payroll src/lib/workforce/offboarding` (este último para confirmar boundary ICO/payroll intacto)
- DB/runtime checks: `migrate:up` + verificación `information_schema` de la tabla; smoke del propose→confirm con agent-session
- Integration checks: confirm endpoint muta el estado de interacción + audit; el insight de origen no cambia
- Reliability signals/logs: signal de la acción (failure_rate / unauthorized_proposal) en el patrón TASK-1137
- Production verification sequence: ver §Rollout

### Acceptance criteria additions

- [ ] Source of truth (tabla nueva), command, capability+grant y consumers nombrados con paths reales.
- [ ] Invariante boundary ICO + insight read-only explícitos, con test que prueba que payroll/offboarding no regresan.
- [ ] Migración aditiva con marker + DO block; rollback por flag verificado.
- [ ] propose→confirm→execute: el LLM nunca muta; confirm endpoint re-valida.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive (command en `src/lib/**`), no en la UI ni en el tool.
- [ ] Modelada como command/aggregate (estado de interacción), no click-handler.
- [ ] Write con command semantics + authz fina + idempotencia + audit/outbox + errores canónicos + observabilidad.
- [ ] Capability + grant a ≥1 rol real en el mismo PR + coverage test.
- [ ] Camino programático: el command sirve a Nexa (propose→confirm) y a futuras surfaces/MCP.
- [ ] Write apto para propose→confirm→execute (es el patrón nativo de esta task).
- [ ] Un primitive, muchos consumers: cero lógica duplicada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — ADR de tier de autonomía + modelo de estado de interacción

- ADR `GREENHOUSE_NEXA_INSIGHT_ACTION_DECISION_V1.md`: qué acciones entran (acknowledge / snooze / assign-recommendation), qué tier (`execute_requires_confirmation`), el modelo de estado de interacción (tabla, state machine vs append-only), boundary ICO, y la capability.
- Registrar en `DECISIONS_INDEX.md`.

### Slice 2 — Migración + command + capability

- Migración aditiva de la tabla de interacción (marker + DO block + GRANTs).
- Command + store del estado de interacción (mutación atómica + audit/outbox).
- Capability fina + grant a roles internos reales + coverage test.

### Slice 3 — Acciones registradas en el action runtime

- Definiciones de acción (`acknowledge_insight`, etc.) en `src/lib/nexa/actions/registry.ts` con preview read-only + confirm que invoca el command.
- Reliability signal de la acción.
- Tests: propose (read-only) → confirm (muta) → estado reflejado; LLM no alcanza el executor; boundary ICO intacto.

## Out of Scope

- UI dedicada de "actuar sobre insight" (se reusa el confirm-card genérico de TASK-1137; una surface visible propia sería follow-up).
- Generalizar a Finance AI signals (follow-up).
- Cualquier cambio a los tools de lectura (TASK-1181) o al materializer ICO.

## Detailed Spec

El set exacto de acciones, el modelo de estado (append-only vs state machine) y la capability se deciden en el ADR (Slice 1) antes de codear. Patrón base: el pilot `mark_notifications_read` de TASK-1137 (registry + resolver + confirm endpoint + events store + signals).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (ADR + modelo) → Slice 2 (migración + command + capability) → Slice 3 (acciones registradas). El gate (capability + flag) DEBE existir antes de exponer la acción al LLM.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una acción muta payroll/métricas (boundary ICO roto) | payroll / delivery | low | Command escribe solo la tabla de interacción; test que prueba payroll/offboarding verde | regresión en `vitest src/lib/payroll` |
| LLM inducido a proponer una acción prohibida | nexa / security | medium | Resolver determinista + allowlist + capability; signal `unauthorized_proposal_rate` (TASK-1137) | `nexa.action.unauthorized_proposal_rate` |
| Migración silent-fail (marker invertido) | db | low | `-- Up Migration` + DO block anti pre-up-marker + verificación `information_schema` | migrate verify falla |
| Doble confirm aplica dos veces | nexa / data | low | idempotencyKey del proposal (TASK-1137) → replay | audit del events store |

### Feature flags / cutover

`NEXA_ACTION_RUNTIME_ENABLED` (existe, default OFF) + allowlist de las acciones de insight en el registry. Flip a ON en staging tras smoke; producción = decisión del operador. Revert: quitar del allowlist + flag OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (ADR) | revert PR (doc) | <5 min | sí |
| Slice 2 (migración + command) | flag OFF + revert PR; tabla inerte (no DROP en hot path) | <15 min | sí (tabla queda sin uso) |
| Slice 3 (acciones) | quitar del allowlist + revert PR | <10 min | sí |

### Production verification sequence

1. `migrate:up` staging + verificar tabla con `information_schema`.
2. Deploy con flag OFF + verificar que el chat no propone acciones de insight.
3. Flip allowlist/flag ON en staging + agent-session interno: pedir "marca este insight como reconocido" → Nexa propone → confirm humano → estado reflejado + audit; insight de origen sin cambios.
4. `vitest src/lib/payroll src/lib/workforce/offboarding` verde (boundary ICO/payroll intacto).
5. Producción con cooldown + sign-off del operador.

### Out-of-band coordination required

Sign-off del operador para el flip del allowlist en producción (introduce un write conversacional nuevo). Repo-only en lo demás.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR de tier de autonomía creado + registrado en `DECISIONS_INDEX.md`.
- [ ] Tabla de interacción de insight con migración aditiva (marker + DO block); `ico_ai_signal_enrichments` sin mutar.
- [ ] Command gobernado + capability fina + grant a rol real + coverage test, todo en el mismo PR.
- [ ] Acciones registradas: el LLM propone (read-only), el confirm endpoint muta; el LLM nunca alcanza el executor.
- [ ] Boundary ICO probado: `vitest src/lib/payroll src/lib/workforce/offboarding` verde; cero efecto en payroll/métricas.
- [ ] Flag/allowlist default OFF; rollback por flag verificado en staging.
- [ ] Reliability signal de la acción activo (steady=0).

## Verification

- `pnpm migrate:up` + verificación `information_schema`
- `pnpm vitest run src/lib/nexa src/lib/payroll src/lib/workforce/offboarding`
- `pnpm local:check` (lint + tsc) + `pnpm test` + `pnpm build`
- `pnpm nexa:doc-gate --changed`
- Smoke propose→confirm con agent-session en staging (flag ON)

## Closing Protocol

- [ ] `Lifecycle` sincronizado · archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] ADR + `DECISIONS_INDEX.md` + `## Delta` en el spec del bridge marcando Slice 4 hecho (bridge completo)
- [ ] `EVENT_CATALOG` Delta si se agrega evento outbox
- [ ] doc funcional + manual si la acción es operable por un humano
- [ ] `pnpm test` full + `pnpm build` antes de mover a `complete/`
- [ ] Runtime Rollout Gate: si queda flag OFF en prod → reportar `code complete, rollout pendiente`

## Follow-ups

- Surface visible dedicada de "actuar sobre insight" (más allá del confirm-card genérico).
- Generalizar "actuar sobre una señal" a Finance AI signals (mismo patrón).

## Open Questions

- Set exacto de acciones V1 (¿solo acknowledge/snooze, o también assign-recommendation que cruza a People/asignación?) — se decide en el ADR (Slice 1).
- Modelo de estado: append-only de interacciones vs state machine con `current` — se decide en el ADR.
- Ubicación canónica del command/store: `src/lib/ico-engine/ai/` (cerca del insight) vs `src/lib/nexa/` — se decide en el ADR.
