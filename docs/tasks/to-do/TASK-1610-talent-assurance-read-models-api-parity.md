# TASK-1610 — Talent Assurance Read Models and API Parity

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader|api`
- Epic: `EPIC-038`
- Status real: `Readers de dominio existen; proyección compuesta/API parity Talent Assurance no implementada`
- Rank: `EPIC-038-phase-1`
- Domain: `hiring|workforce|delivery|client|data`
- Blocked by: `TASK-1602`, `TASK-1603`, `TASK-1605`, `TASK-1606`, `TASK-1607`
- Branch: `task/TASK-1610-talent-assurance-read-models-api-parity`
- GitHub Issue: `none`

## Summary

Expone proyecciones browser-safe y agent-safe de completeness, claims, outcomes, continuity y feasibility sobre fuentes existentes, con Full API Parity.

## Why This Task Exists

Los consumidores necesitan una lectura coherente de assurance sin consultar tablas raw ni reconstruir joins distintos en UI, Nexa, MCP o workers.

## Goal

- Definir readers y DTOs con source IDs, freshness, confidence, policy version y scope.
- Exponer la misma capability por API/UI/Nexa/MCP sin duplicar lógica.
- Aplicar privacy, tenant scope, retention y no leakage.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1602` a `TASK-1607` según proyección.

### Blocks / Impacts

- `TASK-1611` cockpit y agent consumers.

### Files owned

- `src/lib/talent-assurance/**`
- `src/app/api/**`
- capability registry/tests y docs

## Current Repo State

### Already exists

- Los readers de Hiring validity, handoff/activation, Workforce capacity y Finance pricing permanecen como fuentes
  de sus dominios. `TASK-1718` puede añadir después un reader candidate-review acotado; no es DTO assurance
  cross-domain ni superficie de claim.

### Gap / start blockers

- No existen `src/lib/talent-assurance/**`, contrato compuesto, capability/grant de proyección, paridad Nexa/MCP ni
  señales unificadas freshness/reconciliation. UI y agentes no deben componer tablas raw ni joins browser-side.
- Comienza sólo a medida que cada contrato upstream esté aceptado e implementado: claims (`1602`), completeness
  (`1603` más `1719`), outcomes (`1605`), continuity (`1606`) y feasibility (`1607`).

## Modular Placement Contract

- Topology impact: `api|domain-package`
- Current home: readers API actuales de Hiring, Workforce, Client y Finance
- Future candidate home: `domain-package`
- Boundary: projections only; source owners remain Hiring/Workforce/Finance/Client/People
- Server/browser split: server joins/auth; browser receives redacted typed DTO
- Build impact: `none`
- Extraction blocker: cross-domain authorization, lineage and freshness

## Backend/Data Contract

- Backend rigor: `backend-critical`
- Impacto principal: `reader|api`
- Invariantes: no new source of truth; every field has lineage/freshness; client-safe projection; no raw tables
- Full API parity: API platform + Nexa/MCP + UI use same reader/command contract
- Access: capability per projection and tenant/resource subject
- Error: canonical degraded vs not-found vs unauthorized; no raw errors
- Rollout: additive readers, consumer by consumer, no cutover of existing source
- Rollback: stop consumers; keep source readers intact

## Scope

### Slice 1 — Projection contracts

- Claim/evidence, hiring quality, outcome, continuity and economics DTOs.

### Slice 2 — API/capability parity

- Routes/readers, grants, coverage and agent-safe projection.

### Slice 3 — Reliability and freshness

- Stale/missing/contradictory evidence signals and reconciliation.

## Out of Scope

- Cockpit UI and new autonomous commands.

## Acceptance Criteria

- [ ] Every field has source, timestamp, freshness and authorization semantics.
- [ ] UI/API/Nexa/MCP parity tests pass.
- [ ] Tenant/PII negatives and degraded states are explicit.
- [ ] No duplicate identity, skills, portfolio, finance or performance store exists.

## Rollout Plan & Risk Matrix

Reader shadow → API internal → agent observe → cockpit consumer. Additive and reversible per consumer.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Projection drift | data | medium | freshness/reconciliation signal | `assurance.projection_drift` |
| Cross-tenant leak | client/identity | low | subject-aware query and negatives | `assurance.scope_violation` |

## Verification & Definition of Done

- [ ] Contract, capability grant, API parity, access and freshness tests.
- [ ] Read-only live smoke with synthetic and real non-sensitive fixtures.
