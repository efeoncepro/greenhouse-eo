# RESEARCH-008 Appendix - EPIC-017 Mockup Execution Plan

## Status

- Lifecycle: `active`
- Date: `2026-05-31`
- Parent research: [RESEARCH-008 - Unified Workforce Foundation](RESEARCH-008-unified-workforce-foundation.md)
- Related epic: [EPIC-017 - Unified Workforce Foundation Iterative Program](../epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md)
- Guardrail contract: [RESEARCH-008 Approved Mockup Contracts](RESEARCH-008-approved-mockup-contracts-2026-05-31.md)
- Scope: concrete execution plan for the EPIC-017 mockup portfolio

## Purpose

The approved mockup contracts define what cannot move. This plan defines what must be built, in what order, with what route, layout, data story, interactions and GVC evidence.

Implementation agents should use this as the build plan for the remaining EPIC-017 mockups. Once a mockup is approved visually, the owning implementation task should wire real read models into the approved route/component structure instead of redesigning the flow.

## Skills Invoked For This Plan

- `greenhouse-product-ui-architect`: route/surface mapping, primitives, access/copy decisions, responsive/GVC plan.
- `greenhouse-mockup-builder`: mockups must be real Next.js portal routes with typed mock data and Greenhouse primitives.
- `greenhouse-payroll-auditor`: Payroll, contractor, Deel/EOR, honorarios, compensation and readiness boundaries.

## Portfolio Summary

| ID | Mockup | Planned route | Primary task | Purpose |
| --- | --- | --- | --- | --- |
| `M01` | Person 360 Workforce Command Profile - Daniela | `/people/mockup/daniela-workforce` | `TASK-961` | Approved individual person/workforce hub. Built. |
| `M02` | People Workforce Command Center | `/people/mockup/workforce-command` | `TASK-963` | Approved `/people` command surface mockup: roster, filters, exception queues, workforce coverage and inspector. |
| `M03` | Workforce Coverage & Readiness Control Room | `/people/mockup/workforce-readiness` | `TASK-962` | Diagnostic planning surface for gaps, dispositions and remediation candidates. |
| `M04` | Person Workforce Documents & Signature Rail | `/people/mockup/workforce-documents` | `TASK-964` | Documents/signature evidence as People rail, consuming EPIC-001. |
| `M05` | Workforce Reliability Signals Control Plane | `/people/mockup/workforce-reliability` | `TASK-967` | Cross-rail confidence signals and owner-domain runbooks. |
| `M06` | Workforce Reporting Foundation | `/people/mockup/workforce-reporting` | `TASK-966` | Aggregate workforce reporting without double-counting. |
| `M07` | Unified Worker Create/Edit Workflow | `/people/mockup/worker-change-workflow` | `TASK-965` | Future write-path shell with command gates and preview/apply states. |
| `M08` | Agent-Safe Workforce Context Preview | `/people/mockup/workforce-agent-context` | `TASK-652` reframe | Safe read surface for Nexa/API/MCP context. |

## M01 - Person 360 Workforce Command Profile

### Current state

- Built route: `/people/mockup/daniela-workforce`
- Built scenario: `person-daniela-workforce-profile`
- Persona: Daniela Ferreira.
- Approval status: approved as the target Person 360 direction.

### What it establishes

- Person-first header and identity context.
- Workforce snapshot with relationship, assignment, compensation and payment rail.
- Mandatory preservation of ICO metrics and Nexa insights.
- No-regression map for current People tabs.
- Documents, Payroll & payments, History and Compliance as evidence rails.
- Action drawer as intent preview, not a real write path.

### Implementation implication

`TASK-961` should wire this visual model into the real Person 360 facet/tab architecture. The agent should not redesign the person detail experience during wiring.

## M02 - People Workforce Command Center

### Route and ownership

- Approved route: `/people/mockup/workforce-command`
- View folder: `src/views/greenhouse/people/mockup/workforce-command/*`
- Scenario: `people-workforce-command-center`
- Owning task: `TASK-963`

### Current state

- Built route: `/people/mockup/workforce-command`
- Built scenario: `people-workforce-command-center`
- Approval status: approved as the target People Workforce Command Center direction after density and hydration fixes.
- Last approved visual evidence candidate: `.captures/2026-05-31T15-44-37_people-workforce-command-center`

### Product question

"From the People entrypoint, who is active, what type of worker are they, what rail are they on, what needs attention, and where should the operator go next?"

This is the mockup previously described as the People command surface. It is not only a table. It is the future People operational command center, with the roster as the core working area.

### Target audience

- HR / People operators.
- Operations leadership.
- Finance/Payroll-adjacent users with redacted compensation views.
- Admin users doing workforce cleanup/review.

### Layout plan

1. Header band:
   - Title: People.
   - Context: active workforce as of timestamp.
   - Primary actions: `Add worker` gated as future `TASK-965`, `Export view` disabled/redacted if not available, `Saved views`.
   - Global status chips: active, blocked, missing compensation, missing payment rail.

2. Command summary:
   - Active workforce.
   - Needs attention.
   - Compensation coverage.
   - Payment rail coverage.
   - Documents/signature attention.
   - Readiness blocked/unresolved.

3. Exception queue:
   - Compact queue for `needs_attention`.
   - Grouped by disposition: source data debt, payment rail setup, missing current compensation, document/signature pending, readiness blocked.
   - Each item opens inspector, not an inline mutation.

4. Filter and saved-view rail:
   - Search.
   - Worker type.
   - Country.
   - Team/assignment.
   - Manager.
   - Payment rail.
   - Compensation state.
   - Readiness state.
   - Documents state.
   - View presets: All workforce, Needs attention, Contractors, International rails, Missing comp, Payment setup.
   - Approved treatment: lightweight pills/segmented controls. Do not replace with large filled buttons unless product explicitly re-approves the density.

5. Workforce roster:
   - Columns: person, status, worker type, country, assignment/title, manager, payment rail, compensation coverage, readiness, documents, attention.
   - Row density: operational, scannable, no mini-profile cards.
   - Sensitive values: redacted by default; show coverage/status instead of money unless capability allows.
   - Approved evidence treatment: each row shows one primary evidence/readiness state plus concise count/summary text. Multi-chip evidence stacks in the row are too dense and must move to the inspector.
   - Approved responsive behavior: desktop/laptop must not create page-level horizontal scroll.

6. Right inspector:
   - Opens on row click.
   - Shows person summary, gap/evidence stack, latest signals, safe next action, and links to Person 360/Payroll/Docs/Finance.
   - Does not duplicate the full Daniela profile.

### Data story

Mock data should include at least:

- Daniela Ferreira: healthy international employee via external payroll rail.
- Melkin Hernandez: honorarios/pay-as-you-go rail with document/payment evidence.
- A Chile dependent employee ready for payroll.
- A contractor via Deel missing one document.
- An active person missing current compensation.
- A not-started worker with intentional lifecycle gap.
- An offboarding person with final-settlement document pending.
- A demo/fixture row clearly excluded from real active workforce when showing diagnostics.

### Microinteractions

- Filter chips animate into applied state and can be removed individually.
- Saved view selector swaps table + summary counts.
- Row hover reveals secondary quick link only; primary action remains inspector.
- Row click opens inspector with a 160-220ms drawer transition.
- Inspector sections collapse/expand: Evidence, Payroll/payment rail, Documents, Signals.
- "High confidence" or "Needs attention" chips show popover with source lineage.
- Keyboard affordance: `Esc` closes inspector; focus returns to selected row.
- Empty states per filter: no dramatic illustration, just operational state and reset filters action.

### Payroll boundaries

- Do not display statutory deduction detail or payroll period calculations.
- Display payroll/payment as `rail`, `coverage`, `latest evidence`, `next payroll link`.
- International/Deel rows must not imply Chile payroll calculation.
- Honorarios rows must not be shown as dependent payroll.
- Cost/salary values remain redacted unless access allows.

### GVC plan

- Scenario: `people-workforce-command-center`.
- Markers:
  - `people-command-header`
  - `people-command-summary`
  - `people-command-exception-queue`
  - `people-command-roster`
  - `people-command-inspector`
  - `people-command-mobile-list`
- Viewports: desktop, laptop, mobile/narrow.
- Interactions:
  - open saved view;
  - apply `Needs attention`;
  - open Daniela inspector;
  - open missing-comp inspector;
  - close inspector;
  - capture mobile stacked state.

## M03 - Workforce Coverage & Readiness Control Room

### Route and ownership

- Planned route: `/people/mockup/workforce-readiness`
- View folder: `src/views/greenhouse/people/mockup/workforce-readiness/*`
- Scenario: `workforce-readiness-control-room`
- Owning task: `TASK-962`

### Product question

"Which workforce gaps are real blockers, which are intentional lifecycle states, and what should be remediated later?"

### Layout plan

1. Header:
   - Read-only diagnostic label.
   - Last audit time.
   - Cohort scope: active real workers vs include demo/fixture.

2. Baseline matrix:
   - Relationship coverage.
   - Classification parity.
   - Compensation coverage.
   - Payment rail evidence.
   - Readiness state.

3. Disposition board:
   - Columns or segmented view by disposition.
   - Rows show count, severity, owner domain and sample refs.

4. Gap detail drawer:
   - Evidence sample.
   - Source code/gap code.
   - Masked person reference.
   - Owner domain.
   - Proposed follow-up task, if any.

5. Remediation plan preview:
   - Ordered queue of future tasks.
   - Explicit "not fixed here" state.

### Data story

Use the `TASK-959` known shape:

- 9 active real workers.
- 9/9 relationship coverage.
- 9/9 current classification parity.
- 5/9 current compensation coverage.
- 8/9 payment rail evidence.
- unresolved/blocked readiness examples.
- 0 error-severity gaps.

### Microinteractions

- Scope toggle updates counts with a brief skeleton.
- Clicking a disposition opens detail drawer.
- Severity badges show source lineage popover.
- "Create follow-up" appears as disabled/planned, not executable.
- Steady-state empty view shows when filters isolate zero gaps.

### Payroll boundaries

- No remediation write controls.
- No direct payroll recalculation.
- Missing compensation is a coverage/readiness signal, not proof of underpayment.
- Any future payroll-impacting fix requires a separate task with before/after gates.

### GVC plan

- Scenario: `workforce-readiness-control-room`.
- Markers: header, baseline matrix, disposition board, gap drawer, remediation queue, steady-state.
- Interactions: toggle cohort, open missing compensation gap, open readiness gap, close drawer.

## M04 - Person Workforce Documents & Signature Rail

### Route and ownership

- Planned route: `/people/mockup/workforce-documents`
- View folder: `src/views/greenhouse/people/mockup/workforce-documents/*`
- Scenario: `person-workforce-documents-rail`
- Owning task: `TASK-964`
- Platform dependency: `EPIC-001`

### Product question

"For this worker, what documents and signatures prove the workforce journey, and what is missing or pending?"

### Layout plan

1. Person document header:
   - Worker identity.
   - Document readiness.
   - Signature readiness.
   - Confidential/redaction state.

2. Evidence timeline:
   - Contract.
   - Addendum.
   - Policy acknowledgement.
   - Payroll receipt or remittance advice.
   - Final settlement/finiquito when applicable.

3. Document rail:
   - Group by employment/contract/payment/compliance.
   - Card rows with owner, source, version, signature status, last event.

4. Signature detail drawer:
   - Signers.
   - Pending owner.
   - Last webhook/source event.
   - Canonical EPIC-001 link.

5. Missing evidence state:
   - Missing doc shown as requirement/evidence gap, not local upload hack.

### Microinteractions

- Timeline hover highlights matching document row.
- Status chip opens source lineage.
- Signature drawer shows event progression.
- Redacted documents show locked state with capability reason.

### Payroll boundaries

- Payroll receipts/remittance/finiquito are linked documents/evidence.
- People does not recalculate payroll receipt or final settlement.
- Document generation/signing remains EPIC-001-owned.

### GVC plan

- Scenario: `person-workforce-documents-rail`.
- Markers: header, evidence timeline, document groups, signature drawer, redacted state.
- Interactions: filter by pending signature, open signature detail, open redacted doc.

## M05 - Workforce Reliability Signals Control Plane

### Route and ownership

- Planned route: `/people/mockup/workforce-reliability`
- View folder: `src/views/greenhouse/people/mockup/workforce-reliability/*`
- Scenario: `workforce-reliability-signals`
- Owning task: `TASK-967`

### Product question

"Can operators trust the workforce foundation right now, and who owns each drift signal?"

### Layout plan

1. Reliability header:
   - Overall confidence.
   - Signal steady-state status.
   - Last evaluation time.

2. Signal groups:
   - Relationship coverage.
   - Compensation coverage.
   - Payment rail evidence.
   - Readiness unresolved/blocked.
   - Double-rail risk.
   - Stale projection.

3. Owner-domain filter:
   - People, HR, Payroll, Contractor, Finance, Data.

4. Signal table:
   - Key, severity, count, steady state, owner, disposition, trend.

5. Runbook side panel:
   - What this means.
   - What not to do.
   - Safe next action.
   - Related task/docs.

### Microinteractions

- Severity group selection changes chart/table.
- Owner filter chips.
- Signal row opens runbook side panel.
- Trend mini-sparkline tooltip.
- "Suppressed intentional state" expandable explanation.

### Payroll boundaries

- Payroll signals are observability, not controls.
- No "recalculate", "close", "override" or "pay" action.
- Double-rail signal must link to owner task/runbook, not mutate state.

### GVC plan

- Scenario: `workforce-reliability-signals`.
- Markers: header, signal groups, signal table, runbook side panel, owner filter.
- Interactions: filter Payroll owner, open double-rail signal, open intentional-state suppression detail.

## M06 - Workforce Reporting Foundation

### Route and ownership

- Planned route: `/people/mockup/workforce-reporting`
- View folder: `src/views/greenhouse/people/mockup/workforce-reporting/*`
- Scenario: `workforce-reporting-foundation`
- Owning task: `TASK-966`

### Product question

"What does our total workforce look like across people, worker types, countries, rails and readiness without double-counting?"

### Layout plan

1. Reporting header:
   - As-of timestamp.
   - Read model confidence.
   - Redaction mode.

2. Workforce composition:
   - Active total.
   - Employees.
   - Contractors.
   - Honorarios.
   - International/EOR/Deel rail.

3. Coverage panels:
   - Relationship.
   - Compensation.
   - Payment rail.
   - Documents/signature.
   - Readiness.

4. Breakdowns:
   - By country.
   - By worker type.
   - By payment rail.
   - By assignment/team.

5. Drilldown drawer:
   - Segment members.
   - Links back to People Command Center or Person 360.

### Microinteractions

- Segment click opens drilldown drawer.
- Redaction toggle shows capability explanation.
- Hover on metric shows formula/source lineage.
- Compare period selector can be visual-only in mockup if runtime not ready.

### Payroll boundaries

- Headcount is person-centric.
- Cost reporting is separate and capability-gated.
- Payroll totals must not be mixed with contractor payable totals without explicit semantic labeling.

### GVC plan

- Scenario: `workforce-reporting-foundation`.
- Markers: header, composition, coverage, breakdowns, drilldown, redacted state.
- Interactions: select country segment, open redaction explanation, open payment rail breakdown.

## M07 - Unified Worker Create/Edit Workflow

### Route and ownership

- Planned route: `/people/mockup/worker-change-workflow`
- View folder: `src/views/greenhouse/people/mockup/worker-change-workflow/*`
- Scenario: `worker-change-workflow`
- Owning task: `TASK-965`

### Product question

"How will People eventually create or change a worker while respecting every specialized domain command?"

### Layout plan

1. Workflow shell:
   - Draft ID.
   - Target person/new person.
   - Status: draft, validating, blocked, ready to apply, applying, partial, applied.

2. Stepper:
   - Identity/person.
   - Relationship.
   - Assignment.
   - Compensation.
   - Documents/compliance.
   - Payment rail.
   - Review/apply.

3. Step content:
   - Shows domain owner and command status.
   - Missing command shown explicitly.
   - Validation blockers visible.

4. Preview/apply panel:
   - What changes.
   - What does not change.
   - Payroll/finance/document warnings.
   - Required acknowledgements.

5. Partial failure state:
   - What applied.
   - What failed.
   - Rollback/compensation instructions.

### Microinteractions

- Stepper progress with validation pulse.
- Blocker chip jumps to field/step.
- Preview drawer slides in before apply.
- Acknowledgement checkboxes are sticky in review step.
- Partial failure state expands domain events.

### Payroll boundaries

- This remains mockup-only until architecture checkpoint.
- No direct payroll, finance or document table writes.
- Compensation/payment/legal changes require explicit preview and audit.
- Payment execution remains outside this workflow.

### GVC plan

- Scenario: `worker-change-workflow`.
- Markers: shell, stepper, blocker state, preview drawer, partial failure.
- Interactions: move steps, trigger blocker, open preview, show partial failure.

## M08 - Agent-Safe Workforce Context Preview

### Route and ownership

- Planned route: `/people/mockup/workforce-agent-context`
- View folder: `src/views/greenhouse/people/mockup/workforce-agent-context/*`
- Scenario: `workforce-agent-context-preview`
- Owning task: `TASK-652` reframe or later EPIC-017 child task

### Product question

"What exactly can Nexa/API/MCP read about workforce state, why, and what is redacted?"

### Layout plan

1. Context header:
   - Subject person or cohort.
   - Consumer: Nexa, API, MCP.
   - Capability mode.

2. Field map:
   - Field name.
   - Value/redacted value.
   - Sensitivity tier.
   - Source read model.
   - Capability reason.

3. Source lineage:
   - Person.
   - WorkforceFoundationMap.
   - Payroll summary/evidence.
   - Documents evidence.
   - Reliability signals.

4. Denied-action panel:
   - Examples of things agents cannot do.
   - Required future gate if command is ever allowed.

5. Insight preview:
   - Nexa may explain a signal and suggest safe next action.
   - No mutation path.

### Microinteractions

- Toggle consumer mode.
- Toggle privileged/redacted view.
- Field row opens lineage popover.
- Denied action shows capability/audit explanation.

### Payroll boundaries

- No payroll calculations exposed.
- No bank/legal sensitive details unless field-level access allows.
- Agent suggestions are explanatory, not executable payroll/finance instructions.

### GVC plan

- Scenario: `workforce-agent-context-preview`.
- Markers: header, field map, redacted state, lineage popover, denied action.
- Interactions: switch consumer, open lineage, show denied action.

## Execution Batches

### Batch A - People hub and command surfaces

1. Finish/keep M01 as approved baseline.
2. Build M02 People Workforce Command Center.

Why first: it aligns the individual profile and the `/people` landing surface. This gives the team a shared visual target for "People is the hub" without waiting for write paths.

### Batch B - Readiness and evidence rails

3. Build M03 Workforce Coverage & Readiness Control Room.
4. Build M04 Person Workforce Documents & Signature Rail.

Why second: readiness and documents are the two most likely areas where agents could otherwise invent local fixes or duplicate EPIC-001.

### Batch C - Control plane and reporting

5. Build M05 Workforce Reliability Signals.
6. Build M06 Workforce Reporting Foundation.

Why third: these depend on stable dispositions and list/profile semantics.

### Batch D - Future orchestration and agent read surface

7. Build M07 Unified Worker Create/Edit Workflow.
8. Build M08 Agent-Safe Workforce Context.

Why last: these are the highest-risk surfaces because they can imply writes or agent authority. They must stay mockup-only until the corresponding tasks and architecture checkpoints are ready.

## Shared Mock Data Model

Use a shared typed mock data shape across the portfolio when practical:

```ts
type WorkforceMockPerson = {
  id: string
  displayName: string
  workerId: string
  status: 'active' | 'not_started' | 'offboarding' | 'inactive'
  workerType: 'employee' | 'contractor' | 'honorarios' | 'eor' | 'mixed' | 'unknown'
  country: string
  assignment: string
  manager: string | null
  paymentRail: 'internal_payroll' | 'honorarios' | 'deel_payroll' | 'contractor_payable' | 'missing' | 'unknown'
  compensationCoverage: 'available' | 'missing' | 'redacted' | 'not_applicable'
  readiness: 'ready' | 'warning' | 'blocked' | 'intentional' | 'unknown'
  documents: 'complete' | 'pending_signature' | 'missing' | 'redacted'
  attentionCodes: string[]
}
```

The exact runtime names may change during implementation, but the mockups should keep this semantic consistency.

## Shared GVC Requirements

Every mockup must have a scenario under `scripts/frontend/scenarios/`.

Minimum requirements:

- desktop, laptop and mobile/narrow viewport;
- capture first fold and at least one below-fold section;
- capture one interaction state;
- assert no login redirect and no blocking error page;
- use stable `data-capture` markers;
- include reviewer-readable marker names in the scenario.

## Design Acceptance Bar

A mockup is ready to request approval when:

- route loads inside the real dashboard shell;
- it uses Greenhouse/Vuexy/MUI primitives;
- it has typed mock data;
- it preserves the approved Payroll/Finance/Documents boundaries;
- it includes empty/blocked/redacted states where relevant;
- it has GVC evidence;
- text does not overflow in desktop or mobile;
- future implementation can replace mock data/readers without reinterpreting the product direction.
