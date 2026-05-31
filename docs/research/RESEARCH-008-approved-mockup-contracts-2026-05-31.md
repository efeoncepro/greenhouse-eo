# RESEARCH-008 Appendix - EPIC-017 Approved Mockup Contracts

## Status

- Lifecycle: `active`
- Date: `2026-05-31`
- Parent research: [RESEARCH-008 - Unified Workforce Foundation](RESEARCH-008-unified-workforce-foundation.md)
- Related epic: [EPIC-017 - Unified Workforce Foundation Iterative Program](../epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md)
- Scope: product-approved mockup contracts for EPIC-017 implementation agents
- Decision level: **hard implementation guardrail**

## Purpose

This appendix turns the approved EPIC-017 mockup direction into binding implementation rules.

Agents implementing the EPIC-017 UI lanes must treat these mockups as the approved product contract. The work after approval is wiring real read models, access gates, copy and tests into the approved interaction model. It is not permission to redesign the experience, remove existing Person 360 surfaces, move Payroll ownership into People, or create parallel document/payment systems.

## Skills Invoked For This Contract

- `greenhouse-product-ui-architect`: used to map the mockup portfolio into Greenhouse routes, primitives, copy/access decisions, responsive requirements and GVC verification.
- `greenhouse-payroll-auditor`: used to preserve worker-regime, payroll, contractor, Deel/EOR, compensation and audit boundaries while People becomes the workforce hub.

## Global Non-Negotiables

These rules apply to every EPIC-017 mockup and every implementation task that consumes them.

1. People / Person 360 is the workforce hub.
2. Payroll remains the specialized rail for payroll periods, calculations, receipts, statutory exports, close gates and payroll compliance.
3. Finance / Treasury remains the specialized rail for payment orders, settlement and execution.
4. Contractor Engagements / Payables remains the specialized rail for contractor payable state.
5. Documents and e-signature must consume EPIC-001. EPIC-017 must not create a parallel document vault, signature engine or evidence store.
6. People may show read-only evidence, links, status summaries and guided actions from those rails, but must not recompute payroll, mutate payment execution, or bypass domain commands.
7. The UI must preserve current Person 360 operational value: ICO metrics, Nexa insights, activity history, organization memberships, economy/cost context, payment profiles and AI tooling.
8. Any salary, cost, provider ID, legal ID, bank detail or payroll-sensitive field must pass field-level redaction and capability gates before becoming runtime data.
9. No mockup may introduce roles outside the canonical `ROLE_CODES`.
10. All production implementation must use typed read models/adapters. UI components must not join raw payroll, contractor, finance or document tables directly.
11. All visible UI work must use Greenhouse/Vuexy/MUI primitives already in the repo and must pass GVC evidence before close.
12. Mockup routes are allowed under `/people/mockup/**`; production routes must be decided by the owning task after discovery.

## Current Person 360 Surfaces That Must Survive

The Daniela profile mockup explicitly approved this no-regression map. Implementers must preserve or intentionally place every surface below.

| Current surface | Future placement | Must keep |
| --- | --- | --- |
| `Perfil` | Identity + HR profile + workforce relationship | HR consolidated profile, legal profile readiness, current work classification, role/title governance, lifecycle/access state |
| `Actividad` | ICO & operations | Nexa Insights block, period selector, ICO KPIs, task summary chips, health radar, CSC distribution, pipeline velocity |
| `Organizaciones` | Assignments and org context | memberships, assignments, space/client context, edit membership workflow |
| `Economía` | Compensation + cost + payroll history | current compensation, payroll history, finance cost panel, labor cost distribution, recent payroll receipts |
| `Pago` | Payment rail and beneficiary profiles | payment profiles, currency rails, maker-checker state |
| `Herramientas` | Apps and AI tooling | assigned AI licenses, attributed AI usage, license status |

Removing, hiding or weakening any of these surfaces is a regression unless a later approved ADR/task explicitly supersedes this contract.

## Approved Mockup Portfolio

### M01 - Person 360 Workforce Command Profile

- Status: `approved and built as mockup`
- Current mock route: `/people/mockup/daniela-workforce`
- Source files:
  - `src/app/(dashboard)/people/mockup/daniela-workforce/page.tsx`
  - `src/views/greenhouse/people/mockup/daniela-workforce/DanielaWorkforceProfileMockupView.tsx`
  - `src/views/greenhouse/people/mockup/daniela-workforce/data.ts`
  - `scripts/frontend/scenarios/person-daniela-workforce-profile.scenario.ts`
- Primary task: `TASK-961`
- Product role: approved target for an individual Person 360 workforce hub.

Hard rules:

- Header must lead with the person, not Payroll.
- First fold must expose identity, worker status, relationship type, country, confidence, worker ID and primary actions.
- The approved section model is: `Overview`, `ICO & operations`, `Workforce`, `Compensation`, `Documents`, `Payroll & payments`, `History`, `Compliance`.
- `ICO & operations` and Nexa insights are mandatory, not optional decoration.
- Workforce cards must show relationship, assignment, compensation and payment rail as evidence-backed read-only state.
- Compensation can display approved read-model values, but must not calculate payroll or infer legal deductions.
- Payroll/payment area must be labelled as a rail and link/evidence surface, not as payroll operations replacement.
- Documents area must show document/signature evidence and consume EPIC-001 semantics.
- The action drawer may preview edit intent, but any real write path belongs to `TASK-965` or a later approved command task.
- Evidence popovers, sticky sidecar, hover states and collapse/details interactions are part of the approved microinteraction model.
- GVC must cover desktop, laptop and mobile/narrow viewports with markers for header, ICO/Nexa, no-regression map and sidecar.

### M02 - People List Workforce Overview

- Status: `approved and built as mockup`
- Current mock route: `/people/mockup/workforce-command`
- Source files:
  - `src/app/(dashboard)/people/mockup/workforce-command/page.tsx`
  - `src/views/greenhouse/people/mockup/workforce-command/PeopleWorkforceCommandMockupView.tsx`
  - `src/views/greenhouse/people/mockup/workforce-command/data.ts`
  - `scripts/frontend/scenarios/people-workforce-command-center.scenario.ts`
- Primary task: `TASK-963`
- Product role: People Workforce Command Center: roster-level command surface with exception queue, workforce filters, summary coverage and row inspector.

Hard rules:

- This is not just a table. It is the approved future `/people` command surface, with the roster as the main working area.
- The list must stay scan-friendly; do not turn every row into a mini profile.
- Rows must expose person status, worker type, country, assignment/title, manager, payment rail, compensation coverage, readiness and attention state.
- Row evidence must stay summarized: one primary state plus concise count/summary text. Detailed compensation, document, readiness and rail evidence belongs in the inspector/drawer.
- Summary cards must prioritize exceptions and readiness, not vanity totals.
- Filters must include worker type, country, assignment/team, manager, payment rail, compensation coverage and readiness.
- Filter and saved-view controls must remain lightweight pills/segmented controls; large dominant filled buttons are not approved for this command surface.
- Row selection should open an inspector/drawer with evidence and next safe action; it must not duplicate every row action inline.
- Salary/cost fields are redacted by default unless the user has the correct capability.
- Payroll state in the list is a summary/link. It must not show payroll calculations, statutory deductions or period-close operations.
- The approved desktop/laptop layout must not generate page-level horizontal scroll. Horizontal overflow is a regression unless explicitly re-approved.
- Hydration/dev-overlay issues are blockers for approval: MUI inputs or persistent controls that generate unstable SSR/client IDs must receive stable IDs.
- GVC must prove filter changes, row inspector, horizontal density and mobile behavior.

### M03 - Workforce Coverage & Readiness Control Room

- Status: `approved to design/build as mockup`
- Planned mock route: `/people/mockup/workforce-readiness`
- Primary task: `TASK-962`
- Product role: read-only gap classification and remediation planning surface.

Hard rules:

- This surface is diagnostic, not a fix console.
- It must show gap counts, dispositions, owner domain, severity, evidence sample and next safe action.
- Dispositions must reuse `TASK-959`/`TASK-962` taxonomy before adding categories.
- Demo/fixture residue must be visually separated from real active worker gaps.
- Intentional lifecycle states must not be presented as production errors.
- No inline "fix now" button is allowed unless a later task defines a domain command and approval gate.
- Payroll-sensitive examples must be masked.
- GVC must capture baseline summary, disposition detail, masked sample drawer and empty/steady-state view.

### M04 - Person Workforce Documents & Signature Rail

- Status: `approved to design/build as mockup`
- Planned mock route: `/people/mockup/workforce-documents`
- Primary task: `TASK-964`
- Related epic: `EPIC-001`
- Product role: People-facing evidence rail for contracts, addenda, receipts/remittance/final-settlement linked documents and signature status.

Hard rules:

- EPIC-001 remains the document/signature platform.
- Person 360 shows evidence, status, lineage and links; it does not own storage or signing orchestration.
- Contract, addendum, policy acknowledgement, remittance advice, payroll receipt and final settlement documents must be visually distinguishable.
- Signature status must show signer, pending owner, last event and source system.
- Document actions must be capability-gated and should route to the canonical document/signature workflow.
- Payroll receipts and finiquito/final settlement documents must not imply People can recalculate payroll or settlements.
- GVC must capture document rail, signature detail, missing-document state and permission-redacted state.

### M05 - Workforce Reliability Signals Control Plane

- Status: `approved to design/build as mockup`
- Planned mock route: `/people/mockup/workforce-reliability`
- Primary task: `TASK-967`
- Related task: `TASK-798` reframe
- Product role: cross-rail operational confidence surface.

Hard rules:

- Signals are read-only.
- Signal keys must map to existing gap codes/dispositions where available.
- Each signal must declare steady state, owner domain, severity, sample refs, safe next action and runbook link.
- Contractor, Payroll, Finance and People signals may roll up here, but their source domains keep ownership.
- Avoid false-critical noise for intentional onboarding/offboarding states.
- No auto-remediation control is allowed in this mockup.
- GVC must capture signal overview, severity grouping, owner-domain filter, signal detail and steady-state view.

### M06 - Workforce Reporting Foundation

- Status: `approved to design/build as mockup`
- Planned mock route: `/people/mockup/workforce-reporting`
- Primary task: `TASK-966`
- Product role: aggregate workforce reporting without double-counting.

Hard rules:

- Headcount metrics must be person-centric and must not double-count people with multiple rails.
- Cost/compensation reporting must distinguish person, relationship, assignment, compensation and payment obligation.
- Sensitive money metrics must have clear redaction state.
- The first reporting view should answer workforce composition, coverage and readiness before detailed cost analytics.
- Reporting must display "as of" timestamp and source/read-model confidence.
- Drilldowns must lead back to People/List/Profile and not create another source of truth.
- GVC must capture aggregate view, redacted view, drilldown/segment selection and mobile responsive state.

### M07 - Unified Worker Create/Edit Workflow

- Status: `approved to design/build as mockup only; runtime write path gated`
- Planned mock route: `/people/mockup/worker-change-workflow`
- Primary task: `TASK-965`
- Product role: future People-first create/edit workflow shell.

Hard rules:

- This mockup may show workflow orchestration but must not imply writes are already approved.
- Steps must be: identity/person, relationship, assignment, compensation, documents/compliance, payment rail, review/apply.
- Each step must identify the domain command or explicitly say the command is missing.
- Money, contract, payroll, payment rail and legal-status changes require preview, acknowledgement and audit.
- Partial completion and blocked states must be first-class states.
- Compensation writes must wait for the CompensationProfile/assignment architecture checkpoint.
- Payment execution must remain outside this workflow.
- GVC must capture stepper progression, validation blockers, preview/apply drawer and partial-failure state.

### M08 - Agent-Safe Workforce Context Preview

- Status: `approved as future mockup candidate after TASK-652 reframe`
- Planned mock route: `/people/mockup/workforce-agent-context`
- Primary task: `TASK-652` reframe or a later EPIC-017 child task
- Product role: show what Nexa/API/MCP may read safely from workforce context.

Hard rules:

- This is a read-surface preview, not an agent command surface.
- It must show field sensitivity, redaction, source lineage and capability reason.
- Nexa can explain signals and suggest next safe action, but cannot mutate HR, Payroll, Finance or Documents.
- Any future agent action must require capability, audit, confirmation and kill switch.
- GVC must capture redacted vs privileged context, source lineage popover and denied-action state.

## Implementation Sequence

The approved sequence is:

1. M01 as the Person 360 target contract for `TASK-961`.
2. M02 People Workforce Command Center, so the `/people` entrypoint is planned as a real command surface and not a simple list retrofit.
3. M03 before data remediation, so gaps are understood before being "fixed".
4. M04 before any People-local document UI, because EPIC-001 owns the platform.
5. M05 after M03 dispositions stabilize.
6. M06 after M01/M02/M03 semantics are stable enough to aggregate.
7. M07 last, after read models, CompensationProfile and assignment effective-dating are settled.
8. M08 only after `TASK-652` is reframed with redaction/capability contracts.

## Implementation Agent Checklist

Before implementing any approved mockup into runtime:

- [ ] Read this appendix and the owning task.
- [ ] Confirm the source-of-truth boundary for every field.
- [ ] Confirm whether the work is read-only or write-path gated.
- [ ] Use existing Greenhouse primitives/Vuexy/MUI wrappers.
- [ ] Put reusable copy in canonical copy files.
- [ ] Add capability/redaction handling for sensitive fields.
- [ ] Preserve the no-regression Person 360 surface map.
- [ ] Add or update a GVC scenario with desktop, laptop and narrow/mobile coverage.
- [ ] Run `pnpm design:lint`.
- [ ] Document any deviation from this contract in the task plan before code changes.

Any deviation that changes layout intent, removes preserved surfaces, changes Payroll/Finance/Documents ownership, exposes sensitive data differently, or turns a read-only mockup into a write path requires explicit human approval and an architecture/task update first.
