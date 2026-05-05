# TASK-790 — Contractor Engagements Runtime + Classification Risk

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-789`
- Branch: `task/TASK-790-contractor-engagements-runtime`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar `ContractorEngagement` como agregado canonico para contratos contractor/honorarios: payment model, cadence, scope, tax/compliance owner, provider refs, classification risk y lifecycle.

## Why This Task Exists

Sin engagement canonico, contractor queda entre payroll legacy, payment profiles, expenses y notas manuales. Esto impide readiness, auditoria, approvals y separacion correcta entre Chile honorarios, contractor internacional directo, provider contractor y EOR.

## Goal

- Crear schema/runtime para `greenhouse_hr.contractor_engagements`.
- Modelar fixed, PAYG, milestone, weekly/on-invoice and provider-owned lanes.
- Hacer first-class el riesgo de reclasificacion laboral.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- Contractor engagement lives under Workforce/HR, not Payroll.
- Payroll can consume compatibility snapshots, but does not own contractor payables.
- Classification risk can block approval/payment readiness.

## Dependencies & Impact

### Depends on

- `TASK-789`.
- `TASK-784` for person legal identity.
- `TASK-787` for declared/tax country reconciliation when available.

### Blocks / Impacts

- Blocks `TASK-791` to `TASK-798`.
- Impacts HR profile, People 360, entitlements and payroll exclusion logic.

### Files owned

- `migrations/**`
- `src/lib/contractor-engagements/**`
- `src/app/api/hr/contractors/**`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`

## Current Repo State

### Already exists

- `src/types/hr-contracts.ts` models `honorarios`, `contractor`, `eor`.
- Payroll skill and architecture define classification boundaries.
- Payment profiles/orders foundation exists downstream.

### Gap

- No source aggregate for contractor contracts, payment cadence, tax owner or risk review.

## Scope

### Slice 1 — Schema and types

- Add `contractor_engagements` with lifecycle, relationship refs, payment model, currency, tax owner, provider refs and risk status.
- Add audit/event table if local pattern requires it.

### Slice 2 — Runtime helpers/readers

- Create canonical readers and mutations using repo DB primitives.
- Add idempotent create/update/pause/end commands.

### Slice 3 — Classification risk gates

- Implement deterministic risk flags for red flags from architecture.
- Add legal review required status and readiness blocker.

### Slice 4 — Access model

- Add capabilities for read/manage/review classification.
- Keep routeGroups/views separate from entitlements.

## Out of Scope

- Invoice upload/assets.
- Payables bridge.
- Full UI self-service.
- Legal advice or global tax engine.

## Acceptance Criteria

- [ ] `ContractorEngagement` can be created for an active contractor relationship.
- [ ] Payment model and cadence are explicit and validated.
- [ ] Tax/compliance owner is mandatory.
- [ ] Classification risk status is computed/stored and can block readiness.
- [ ] Events/audit capture material lifecycle changes.

## Verification

- `pnpm pg:doctor`
- `pnpm exec tsc --noEmit --pretty false`
- Focused unit tests for readers, mutations and risk gates.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] `changelog.md` updated if behavior visible.
