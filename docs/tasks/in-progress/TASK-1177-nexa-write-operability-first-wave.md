# TASK-1177 — Nexa write operability — primera ola de acciones gobernadas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `optional`
- Status real: `Diseño — derivada de TASK-1172 (gap ledger). Rank #1 del backlog de parity por valor-Nexa.`
- Rank: `TBD`
- Domain: `nexa|platform|agent-governance`
- Blocked by: `none (consume el action runtime TASK-1137 ya existente)`
- Branch: `task/TASK-1177-nexa-write-operability-first-wave`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Extender el action registry de Nexa de **1 acción** (`mark_notifications_read`) a las **top-N capabilities de escritura gobernadas de alta frecuencia** (aprobaciones, transiciones de lifecycle, notificaciones), cada una vía el loop `propose → confirm → execute`. Cierra el gap North Star #1 medido por TASK-1172: **0% de las 217 capabilities del catálogo son accionables por Nexa hoy**.

## Why This Task Exists

La directiva CEO 2026-06-19 fija que Nexa debe operar TODO el portal. El gap ledger (TASK-1172) midió que Nexa cubre **lectura** de 7 dominios (51% por módulo) pero su único write gobernado no es siquiera una capability del catálogo. Toda acción operativa de alta frecuencia (aprobar, transicionar, recover) tiene contrato de lectura pero ningún camino de escritura Nexa-invocable. Sin esta ola, Nexa sigue siendo read-only en la práctica.

## Goal

- Seleccionar la primera ola de capabilities accionables (criterio: alta frecuencia operativa + bajo blast-radius reversible + contrato gobernado ya existente).
- Registrar cada una en el action registry de Nexa con su preview read-only + ejecución idempotente en el endpoint de confirmación humana.
- El LLM nunca ejecuta el write: solo propone `actionKey`; el humano confirma.
- Re-correr el reader de TASK-1172 y mostrar el avance (`accionables por Nexa` > 0).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` + `agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` — governed action runtime.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — North Star.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_GAP_LEDGER_V1.md` — backlog priorizado (rank #1).
- Skills: `greenhouse-nexa-conversational`, `greenhouse-backend`, `arch-architect`.

Reglas obligatorias:

- **NUNCA** el LLM ejecuta un write: loop `propose → confirm → execute`, mutación solo en el endpoint de confirmación humana.
- **NUNCA** registrar una acción sin capability gobernada + idempotencia + audit/outbox cuando aplique.
- **SIEMPRE** reusar el command canónico de dominio; el action runtime es un consumer, no una implementación paralela.

## Normative Docs

- `src/lib/nexa/actions/registry.ts` + `src/lib/nexa/actions/events-store.ts` (runtime existente).

## Dependencies & Impact

### Depends on

- Action runtime TASK-1137 (`propose_action` tool) — existe.
- Commands canónicos de cada capability seleccionada — existen (verificar per-acción).

### Blocks / Impacts

- Alimenta TASK-1002 (first-wave parity) con el eje de write operability.
- Mueve el indicador "accionables por Nexa" del reader TASK-1172.

### Files owned

- `src/lib/nexa/actions/registry.ts` — registrar acciones nuevas
- `src/lib/nexa/nexa-tools.ts` — descripción de `propose_action` (lista de acciones)
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` — Delta

## Current Repo State

### Already exists

- `propose_action` tool + registry + events-store + reliability signal `nexa.action.unauthorized_proposal_rate`.
- 1 acción registrada: `mark_notifications_read`.

### Gap

- 0 capabilities del catálogo accionables por Nexa.
- No hay selección priorizada de la primera ola.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (writes gobernados vía confirmación humana)
- Impacto principal: `command`
- Source of truth afectado: ninguno nuevo (reusa commands de dominio)
- Consumidores afectados: Nexa action runtime
- Runtime target: `staging` → `Production` detrás de flag

### Contract surface

- Contrato existente a respetar: action registry + `propose → confirm → execute`
- Contrato nuevo: N acciones registradas (actionKey estable por capability)
- Backward compatibility: `compatible` (additive)
- Full API parity: cada acción reusa el command canónico (un primitive, muchos consumers)

### Data model and invariants

- Entidades: action registry entries + audit events
- Invariantes: idempotencia por `idempotencyKey`; capability check en confirm; LLM nunca muta
- Tenant/space boundary: heredado del command de dominio (tenant-safe)
- Idempotency/concurrency: idempotencyKey por proposal
- Audit/outbox/history: `recordNexaActionEvent` + audit del command

### Migration, backfill and rollout

- Migration posture: `none` (registry es código)
- Default state: flag `NEXA_ACTION_RUNTIME_ENABLED` controla disponibilidad
- Backfill plan: N/A
- Rollback path: quitar entries del registry + revert PR
- External coordination: ninguna

### Security and access

- Auth/access gate: capability de la acción + confirmación humana
- Sensitive data posture: preview read-only sin PII cruda
- Error contract: `canonicalErrorResponse` + `captureWithDomain('knowledge'|dominio)`
- Abuse/rate-limit posture: signal `nexa.action.unauthorized_proposal_rate`

### Runtime evidence

- Local checks: tests del registry + proposal preview
- DB/runtime checks: confirm ejecuta el command real y muta una vez
- Integration checks: Nexa propone → humano confirma → side effect verificado
- Reliability signals/logs: signal de proposals no autorizados en steady
- Production verification sequence: flag staging → smoke → flip prod

### Acceptance criteria additions

- [ ] ≥3 capabilities del catálogo accionables por Nexa vía registry.
- [ ] Cada acción: preview read-only + confirm idempotente + capability check.
- [ ] Reader TASK-1172 muestra `accionables por Nexa` > 0.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que tome la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Selección de la primera ola

Definir con Product/Nexa las N capabilities accionables (criterio frecuencia + reversibilidad + contrato existente). Candidatas: aprobaciones (payroll adjustment, payment profile), transiciones de lifecycle (onboarding case), notificaciones. Documentar el criterio.

### Slice 2 — Registrar acciones + preview

Para cada capability: registrar `actionKey` en el registry con su builder de preview read-only (reusa el reader de dominio) y su ejecución (reusa el command). Tests del registry.

### Slice 3 — Confirm idempotente + audit + signals

Verificar idempotencia, audit/outbox y el signal de proposals no autorizados. Re-correr el reader de TASK-1172 y registrar el delta.

## Out of Scope

- Construir tools de lectura nuevos (eso es TASK-1179).
- Backfill de `can()` en routes (eso es TASK-1178).
- Que el LLM ejecute writes directo (prohibido por invariante).

## Detailed Spec

Reusar el patrón de `mark_notifications_read`: cada acción es un entry del registry con `intent`, `sensitivity`, `buildPreview` (read-only) y `execute` (delega al command canónico). El criterio de selección lo fija la §Open Questions con Product/Nexa.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (selección) → Slice 2 (registrar + preview) → Slice 3 (confirm idempotente + signals). No registrar una acción sin su command canónico verificado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| LLM induce una acción no autorizada | nexa | medium | capability check en confirm + gap honesto | `nexa.action.unauthorized_proposal_rate` |
| Write no idempotente se duplica | command/dominio | low | idempotencyKey + command idempotente | logs del command |
| Acción de alto blast-radius en la primera ola | dominio | low | criterio: solo reversibles/baja sensibilidad en V1 | review humano |

### Feature flags / cutover

- `NEXA_ACTION_RUNTIME_ENABLED` (existente) controla disponibilidad. Las acciones nuevas heredan el flag; flip post-smoke en staging.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert doc | <5 min | sí |
| 2-3 | quitar entries del registry + revert PR | <10 min | sí |

### Production verification sequence

1. Registrar acciones detrás de flag en staging.
2. Nexa propone cada acción → humano confirma → verificar side effect + idempotencia.
3. Verificar signal de proposals no autorizados en steady.
4. Flip prod + monitor 7d.

### Out-of-band coordination required

- Sign-off Product/Nexa sobre la lista de acciones de la primera ola.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ≥3 capabilities accionables por Nexa vía `propose → confirm → execute`.
- [ ] Cada acción reusa el command canónico (sin lógica paralela).
- [ ] Confirm idempotente + capability check + audit.
- [ ] Reader TASK-1172 muestra `accionables por Nexa` > 0.
- [ ] `pnpm lint` + `pnpm tsc --noEmit` + tests verdes.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/nexa`
- Nexa propone → confirma → side effect verificado en staging.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md`
- [ ] chequeo de impacto cruzado (TASK-1172, TASK-1002)
- [ ] reader TASK-1172 re-corrido con delta registrado

## Follow-ups

- Segunda ola de write operability (más dominios).
- Surface viva de cobertura de acciones de Nexa.

## Open Questions

- ¿Qué N capabilities entran en la primera ola? (definir con Product/Nexa: frecuencia + reversibilidad).
- ¿Umbral de sensibilidad permitido en V1? (probable: solo baja/media, reversibles).
