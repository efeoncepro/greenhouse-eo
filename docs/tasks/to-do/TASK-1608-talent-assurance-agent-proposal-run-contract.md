# TASK-1608 — Talent Assurance Agent Proposal, Policy and Run Contract

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Muy alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command|reader|integration`
- Epic: `EPIC-038`
- Status real: `Runtime compartido reutilizable verificado; adapter/proposal Talent Assurance no autorizado ni implementado`
- Rank: `EPIC-038-phase-2`
- Domain: `agents|hiring|workforce|delivery|finance`
- Blocked by: `TASK-1602`, `TASK-1603`, `TASK-1607`
- Branch: `task/TASK-1608-talent-assurance-agent-proposal-run-contract`
- GitHub Issue: `none`

## Summary

Extiende el runtime agentic existente para Talent Assurance con roles lógicos, proposal ledger, policy bindings, run state, approval expiry, evidence refs, idempotency y bounded execution.

## Why This Task Exists

El epic requiere agentes que observen, recomienden, propongan y ejecuten acciones acotadas, pero no autoriza un runtime paralelo ni decisiones autónomas sobre personas, clientes o economics.

## Goal

- Operar `observe → recommend → propose → execute_bounded` sobre readers/commands existentes.
- Persistir evidencia observable y proposed-vs-confirmed diff, nunca chain-of-thought.
- Rechazar aprobación reutilizada, scope incorrecto, payload alterado o acción no allowlisted.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/AGENT_RUNTIME_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1602`, `TASK-1603`, `TASK-1607`; Nexa proposal ledger/capabilities existentes.

### Blocks / Impacts

- `TASK-1609`, `TASK-1610`, agent role workstreams downstream.

### Files owned

- `src/lib/nexa/**`, `src/lib/agents/**`, capabilities, proposals, audit y docs

## Current Repo State

### Already exists

- Nexa/agent runtime, capabilities y domain readers son foundations compartidas. `TASK-1718` es un input planeado,
  acotado y read-only de candidate review Hiring; no emite un claim ni una propuesta Talent Assurance.

### Gap / start blockers

- No existen role adapter Talent Assurance, binding de run/proposal ledger, chequeo de expiración de aprobación,
  allowlist, reconciliación de efectos ni drill de kill switch. Un runtime genérico no es evidencia de implementación.
- Bloqueada por semántica aceptada de claim/quality/economics de `TASK-1602`, `TASK-1603`/`TASK-1719` y `TASK-1607`.
  No puede promover ningún rol más allá de capabilities gobernadas existentes antes de evidencia `TASK-1609`.

## Modular Placement Contract

- Topology impact: `api|worker`
- Current home: Nexa/agent runtime compartido y domain adapters
- Future candidate home: `remain-shared`
- Boundary: agent consumes allowlisted projections and dispatches canonical commands
- Server/browser split: model/provider/secrets/stores server/worker only; browser sees proposal DTO
- Build impact: worker/runtime dependencies explicit
- Extraction blocker: shared policy/capability/audit and transaction boundaries

## Backend/Data Contract

- Backend rigor: `backend-critical`
- Impacto principal: `command|reader|integration`
- Invariantes: human gate for hire/reject/verify/revoke/staffing/price/termination; no raw cross-domain tables
- Idempotency: run/command/tool idempotency and unknown-outcome reconciliation
- Audit/outbox: append-only agent run, proposal, approval and effect trail
- Access: capability + tenant/resource scope + delegated actor
- Rollout: flag OFF, observe-only, then recommend/propose; execute bounded only after promotion
- Rollback: kill switch, cancel pending proposals, command compensation where explicitly supported

## Scope

### Slice 1 — Run and proposal contract

- Implement/extend state machine, evidence envelope, policy version, expiry and proposed-vs-confirmed diff.

### Slice 2 — Role adapters

- Demand Advisor, Role Calibrator, Candidate Evidence Analyst, Continuity Planner y Economics Advisor as bounded adapters, not separate runtimes.

### Slice 3 — Bounded command bridge

- Bind only allowlisted existing commands with pre/post checkpoint, readback and audit.

## Out of Scope

- Autonomous hire/reject, claim verification, price, assignment, termination or new agent platform.

## Acceptance Criteria

- [ ] Proposal cannot bypass human gate or reuse approval for another resource.
- [ ] Run is reconstructible without hidden reasoning.
- [ ] Unauthorized action, tenant leak, timeout and replay tests are covered.
- [ ] Full API parity exists for every bounded capability.

## Rollout Plan & Risk Matrix

Observe-only → recommend → propose with human confirm → bounded execution per action. Every promotion needs eval evidence from `TASK-1609`.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Acción no autorizada | agents/hiring | low | capability gate, allowlist, kill switch | `agent.talent_assurance_unauthorized_action` |
| Timeout con efecto desconocido | integrations | medium | readback/reconciliation, no blind retry | `agent.external_effect_unknown` |

## Verification & Definition of Done

- [ ] Contract tests, replay/expiry/tenant negatives y audit readback.
- [ ] Human override and kill-switch drill.
- [ ] Staged observe/recommend evidence.
