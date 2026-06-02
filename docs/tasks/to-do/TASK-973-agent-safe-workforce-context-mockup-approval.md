# TASK-973 — Agent-Safe Workforce Context Mockup Approval

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `cross-domain` (`people|platform|ai|api|identity|ui`)
- Blocked by: `TASK-652`
- Branch: `task/TASK-973-agent-safe-workforce-context-mockup-approval`
- Legacy ID: `M08`
- GitHub Issue: `optional`

## Summary

Construir y aprobar el mockup `M08 - Agent-Safe Workforce Context Preview` en `/people/mockup/workforce-agent-context`, mostrando que puede leer Nexa/API/MCP, que queda redacted, y por que.

## Why This Task Exists

EPIC-017 debe evitar que agentes/API/MCP reabran heuristicas tabla-por-tabla o sugieran acciones sobre HR/Payroll/Finance sin autoridad. Este mockup fija una experiencia de read surface segura: field sensitivity, source lineage, capability reason and denied action states.

## Goal

- Crear mockup de contexto workforce seguro para agentes/read APIs.
- Mostrar consumer modes: Nexa, API Platform, MCP.
- Mostrar privileged vs redacted view.
- Mostrar denied actions and required future gates.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Mockup-only. No API Platform route, MCP tool, agent command, DB write or policy implementation.
- This is read-surface preview, not command surface.
- Nexa may explain signals and suggest next safe action, but cannot mutate HR, Payroll, Finance or Documents.
- Denied actions must show capability/audit/kill-switch requirements.
- Sensitive payroll, bank, legal and cost fields are redacted unless capability reason allows.

## Normative Docs

- `docs/tasks/to-do/TASK-652-api-platform-people-workforce-read-surface.md`
- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`

## Dependencies & Impact

### Depends on

- `TASK-652` reframe.
- `TASK-961` redaction/access policy.
- `TASK-962` gap dispositions.

### Blocks / Impacts

- API Platform People/Workforce read-surface UX.
- Future Nexa/MCP workforce context explanations.
- Agent safety review.

### Files owned

- `docs/tasks/to-do/TASK-973-agent-safe-workforce-context-mockup-approval.md`
- `src/app/(dashboard)/people/mockup/workforce-agent-context/page.tsx`
- `src/views/greenhouse/people/mockup/workforce-agent-context/*`
- `scripts/frontend/scenarios/workforce-agent-context-preview.scenario.ts`
- RESEARCH-008 docs, EPIC-017 and `Handoff.md`

## Current Repo State

### Already exists

- `TASK-652` is reframed/deferred until Person 360 workforce + redaction policy.
- `TASK-961` and `TASK-962` define upstream read/redaction work.

### Gap

- No approved visual contract exists for showing agent-readable workforce context, redaction and denied actions safely.

<!-- ZONE 2 intentionally empty -->

## Scope

### Slice 1 — Route and Context Data

- Create `/people/mockup/workforce-agent-context`.
- Define typed mock fields with sensitivity tiers, source read model and capability reason.
- Include consumer modes: Nexa, API Platform and MCP.

### Slice 2 — Agent-Safe UI

- Build context header, field map, source lineage, denied-action panel and insight preview.
- Add toggles for consumer mode and privileged/redacted view.
- Add lineage popover/drawer for selected fields.

### Slice 3 — GVC and Approval Docs

- Add `workforce-agent-context-preview` GVC scenario.
- Capture redacted vs privileged context, lineage and denied action.
- After approval, lock M08 in `TASK-652`/RESEARCH-008 or create follow-up if `TASK-652` remains deferred.

## Out of Scope

- API Platform implementation.
- MCP tools.
- Nexa runtime changes.
- Any agent command or write path.

## Detailed Spec

Route target:

```txt
/people/mockup/workforce-agent-context
```

Field map minimum:

- field name;
- displayed/redacted value;
- sensitivity tier;
- source read model;
- capability reason;
- allowed consumers.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3. Do not approve if the mockup implies agent writes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Agent command implied by UI | ai/platform/hr | high | Denied-action panel and read-only labels | UI shows execute/apply |
| Sensitive data exposed by pattern | identity/payroll/finance | medium | Redacted default state | Raw legal/bank/cost fields visible |
| Source lineage missing | platform/data | medium | Field-level source rows | Agent context looks authoritative without source |

### Feature flags / cutover

Repo-only mockup route under `/people/mockup/**`; no production nav entry, no feature flag and no cutover. Mitigation is route isolation plus denied-action states that keep agent/API/MCP behavior read-only.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert route/data | <5 min | si |
| Slice 2 | Revert view | <10 min | si |
| Slice 3 | Revert scenario/docs | <5 min | si |

### Production verification sequence

No production rollout.

## Acceptance Criteria

- [ ] `/people/mockup/workforce-agent-context` renders.
- [ ] Consumer modes and redaction modes are visible.
- [ ] Field rows show sensitivity, source and capability reason.
- [ ] Denied actions clearly block mutation.
- [ ] GVC captures redacted, privileged, lineage and denied-action states.

## Verification

- `pnpm exec eslint <created-files>`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm fe:capture workforce-agent-context-preview --env=local`
- `pnpm fe:capture:review <capture-dir>`
- `git diff --check`

## Closing Protocol

- [ ] Update approval docs after human approval.
- [ ] Update `Handoff.md`.
