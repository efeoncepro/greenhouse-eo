# TASK-1607 — Recruitability and Economic Feasibility Gate

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader|command`
- Epic: `EPIC-038`
- Status real: `Diseño económico pendiente de aceptación`
- Rank: `EPIC-038-phase-0`
- Domain: `workforce|finance|commercial|hiring`
- Blocked by: `TASK-1602`
- Branch: `task/TASK-1607-recruitability-economic-feasibility-gate`
- GitHub Issue: `none`

## Summary

Antes de publicar una demanda o comprometer capacidad, calcula recruitability y viabilidad económica usando Finance/CPQ y Workforce existentes, sin inventar costo ni margen.

## Why This Task Exists

La presión competitiva puede reducir el presupuesto hasta hacer inviable reclutar, retener, gestionar y reemplazar el estándar prometido.

## Goal

- Leer disponibilidad/recruitability, seniority, dedicación, loaded cost, management, backup y reemplazo.
- Proponer `go`, `re-scope`, `re-price`, `borrow` o `no-go` con evidencia.
- Mantener Finance/Commercial como dueños de números y decisiones económicas.

## Architecture Alignment

- `docs/business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1602`; Finance/CPQ, Workforce/ICO, Team Capacity, TalentDemand.

### Blocks / Impacts

- `TASK-1608` Economics Advisor y demand flow.

### Files owned

- `src/lib/workforce/**`, `src/lib/finance/**`, `src/lib/hiring/**`, API/readers y docs

## Modular Placement Contract

- Topology impact: `api`
- Current home: Workforce + Finance/CPQ + Hiring
- Future candidate home: `domain-package`
- Boundary: reader consumes approved finance snapshots; command proposes options, no price write
- Server/browser split: financial data and calculations server-only; client receives redacted verdict
- Build impact: `none`
- Extraction blocker: cross-domain snapshot consistency and finance authorization

## Backend/Data Contract

- Backend rigor: `backend-critical`
- Impacto principal: `reader|command`
- Invariantes: no salary/tax invention; no margin mutation; snapshot time/freshness; no hidden discount
- Idempotency: proposal keyed by demand/version/assumption set
- Audit/outbox: feasibility proposal and human confirm audit
- Access: Finance/Commercial capabilities; no client raw cost leakage
- Rollout: read-only calculator/shadow before blocking publish
- Rollback: disable gate, preserve proposal history, no financial mutation

## Scope

### Slice 1 — Feasibility reader

- Expose recruitability/economic inputs with freshness and missing data.

### Slice 2 — Decision options and publish gate

- Generate governed options; require human commercial/finance confirmation for commitments.

## Out of Scope

- Pricing engine rewrite, compensation changes, autonomous no-go or client-facing quote.

## Acceptance Criteria

- [ ] Gate identifies when budget cannot support the declared standard.
- [ ] Alternatives preserve explicit quality/scope trade-offs.
- [ ] Finance/Commercial can audit inputs and override with reason.
- [ ] No client sees loaded cost or internal margin.

## Rollout Plan & Risk Matrix

Read-only → shadow on real demand → human gate for selected offers → staged enforcement. Signal `workforce.recruitability_stale` and `commercial.talent_feasibility_blocked`.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Decisión con snapshot stale | finance/workforce | medium | freshness gate y abstention | `commercial.talent_feasibility_stale` |
| Precio/compensación inferidos | finance | low | owner boundary y redaction | `finance.unauthorized_talent_economics_access` |

## Verification & Definition of Done

- [ ] Synthetic go/re-scope/re-price/borrow/no-go cases.
- [ ] Finance reconciliation y access negatives.
- [ ] Pilot real con human sign-off.
