# RESEARCH-008 Appendix - Payroll Backlog Triage for Unified Workforce Foundation

## Status

- Lifecycle: `Research Appendix`
- State: `Active`
- Date: 2026-05-31
- Parent research: [RESEARCH-008 - Unified Workforce Foundation](RESEARCH-008-unified-workforce-foundation.md)
- Related gap analysis: [RESEARCH-008-current-state-gap-analysis-2026-05-31.md](RESEARCH-008-current-state-gap-analysis-2026-05-31.md)
- Related pre-task gate: [RESEARCH-008-pre-task-considerations.md](RESEARCH-008-pre-task-considerations.md)
- Related epic: [EPIC-017 - Unified Workforce Foundation Iterative Program](../epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md)
- Scope: `docs/tasks/to-do` Payroll/Workforce/Compensation backlog triage
- Runtime changes: none
- Task creation: none

## Purpose

This appendix records which existing Payroll-adjacent backlog items can support the Unified Workforce Foundation objective, and which ones must be reframed before execution.

It does not change task lifecycle, reserve new IDs or authorize implementation. It is an intake guide for EPIC-017 so Greenhouse can reuse existing backlog instead of creating duplicate tasks.

## Triage Labels

| Label | Meaning |
| --- | --- |
| `Keep as first` | Already matches the next safe step for EPIC-017. |
| `Reframe before execution` | Useful source material, but executing the current task as written would reinforce an older model or premature write path. |
| `Align lightly` | Mostly compatible; add EPIC-017 references, dependencies or read-model consumption notes when the task becomes active. |
| `Keep separate` | Valid Payroll/Finance/Compliance work, but not a driver for the unified workforce foundation. |
| `Defer for this objective` | Not useful for this strategic objective right now. |

## Executive Triage

The existing backlog has strong reusable material. The main risk is sequence.

Several tasks were written before Greenhouse adopted the person-centered workforce framing:

```text
Person -> WorkRelationship -> WorkAssignment -> CompensationProfile -> ComplianceRail -> PaymentRail -> WorkforceTimeline
```

Because of that, the backlog should not be executed in numeric order or by local symptom. The safe sequence is:

1. Keep `TASK-959` as the first EPIC-017 task.
2. Use the results of `TASK-959` to reframe `TASK-338` into a `CompensationProfile` read-model/foundation task.
3. Only then revisit bridge/write-path tasks such as `TASK-340`, `TASK-788`, `TASK-745` and activation/transition flows.
4. Keep payroll compliance, Previred, receipts, close gates and payment-order work in their own lanes unless they consume the workforce read model later.

## Directly Useful For EPIC-017

| Task | Triage | Why it matters | Required action before execution |
| --- | --- | --- | --- |
| `TASK-959` Workforce Foundation Read-Only Object Map Audit | `Keep as first` | It is the correct first learning loop: read-only map from person to relationship, assignment candidate, compensation candidate, payment rail and gaps. | Execute before reframing deeper tasks. Keep strict no writes, no UI, no migrations unless a later checkpoint approves otherwise. |
| `TASK-338` Compensation Arrangement Canonical Runtime Foundation | `Reframe before execution` | It is very close to the missing compensation foundation, but the old `CompensationArrangement` framing may conflict with the newer `CompensationProfile` doctrine. | Rewrite around EPIC-017 Phase 2. Scope must be relationship/assignment-aware, read-model first and non-mutating. Declare whether `CompensationProfile` supersedes or aliases `CompensationArrangement`. |
| `TASK-340` Compensation Arrangement Payroll Bridge | `Reframe before execution` | The bridge is useful, but only after compensation scope and parity are proven. | Move to EPIC-017 Phase 4 or later. Block on `TASK-959`, reframed `TASK-338`, and an accepted/revised architecture checkpoint. No payroll amount changes without before/after gates. |
| `TASK-614` People / Payroll Economy Facet & Entitlements Hardening | `Reframe before execution` | This is the natural Person 360/People surface for compensation, payroll, benefits and financial impact. | Make it consume the workforce read model instead of inventing a parallel person economy projection. Keep views + entitlements split explicit. |
| `TASK-652` API Platform People/Workforce Read Surface | `Reframe before execution` | This is the future API/agent substrate for workforce context. | Defer until the read model and redaction policy exist. Add EPIC-017 dependency and field-level sensitivity gates. |
| `TASK-788` Workforce Role Title Effective Dating + Promotion Flow | `Reframe before execution` | Strong fit for `WorkAssignment` and promotion/compensation journey. | Split if needed: assignment/title effective-dating read model first; atomic promotion/write command later. Do not couple compensation writes before `CompensationProfile` is settled. |
| `TASK-798` Contractor Reliability Ops Control Plane | `Reframe before execution` | Can become a cross-rail reliability/control-plane layer for contractor/payment/provider drift. | Re-scope after `TASK-959` so signals reuse EPIC-017 gap codes and do not duplicate contractor-local projections. |
| `TASK-955` Contractor Provider Settlement Split EOR | `Align lightly` | Very aligned with `PaymentRail`: provider payee vs person cost attribution. | Keep deferred until real provider/EOR need, but link future execution to EPIC-017 payment rail lineage. |

## Useful As Secondary Inputs

| Task | Triage | Use under EPIC-017 |
| --- | --- | --- |
| `TASK-005` HR Payroll Attendance / Leave / Work Entries | `Reframe before execution` | Legacy broad task. Can feed `WorkAssignment` / `WorkEntry`, but should be modernized and split before execution. |
| `TASK-072` Compensation Versioning UX Clarity | `Reframe before execution` | Useful later for compensation history clarity. Defer until `CompensationProfile` terminology and read model are stable. |
| `TASK-342` Executive Compensation Cost Intelligence Integration | `Reframe before execution` | Useful for total workforce cost, but should consume person + relationship + assignment lineage, not only executive compensation. |
| `TASK-433` Payroll Signal Engine | `Reframe before execution` | AI/signal work should wait for deterministic workforce gap signals. Avoid LLM-first signal design before foundation reliability exists. |
| `TASK-717` Payroll Reclassification Intents | `Reframe before execution` | Can inform finance/payment lineage, but it mutates finance classifications. Do not use as a foundation starter. |
| `TASK-731` Payroll Pre-Close Validator | `Align lightly` | Keep as Payroll close gate. Later consume workforce gap codes for relationship, compensation and rail readiness. |
| `TASK-732` Payroll ICO Safety Gate and KPI Provenance | `Align lightly` | KPI provenance can become evidence for variable compensation. Keep payroll-specific gates intact. |
| `TASK-745` Payroll Adjustments Foundation | `Reframe before execution` | Sensitive money-changing write path. Run only after read-model parity and with explicit lineage to person/relationship/compensation. |
| `TASK-856` Previred Preflight Fixtures Mapping Hardening | `Align lightly` | ComplianceRail input for Chile dependent payroll. Keep standalone; later attach person/legal profile context if needed. |
| `TASK-896` Payroll Projection Shadow Compare Wiring | `Align lightly` | Useful confidence signal for payroll outcome vs projection. Later map anomalies back to workforce/compensation gap categories. |
| `TASK-898` Payroll Participation Window Receipt PDF DB Layer | `Align lightly` | Participation window is relevant to current work relationship and period eligibility. Keep Payroll-owned, expose as read-model input later. |

## Keep Separate From The Foundation Program For Now

These tasks can remain valid Payroll, Compliance, Receipt or Operations work. They should not drive the unified workforce foundation unless a later task explicitly consumes their outputs.

| Task | Triage | Reason |
| --- | --- | --- |
| `TASK-025` HR Payroll Module Delta FTR | `Keep separate` | Too broad/legacy to use as direct EPIC-017 driver. |
| `TASK-250` Payroll Export Email React Key Warning | `Defer for this objective` | UI/runtime bug class, not strategic foundation work. |
| `TASK-414` Payroll Reopen Policy Engine Hardening | `Keep separate` | Payroll policy hardening, not workforce source-of-truth work. |
| `TASK-707` Previred Canonical Payment Runtime and Backfill | `Keep separate` | Compliance/payment-specific. |
| `TASK-707a` Previred Detection and Canonical State Runtime | `Keep separate` | Compliance-specific. |
| `TASK-707b` Previred Historical Backfill and Rematerialize | `Keep separate` | Compliance/backfill-specific. |
| `TASK-707c` Previred Componentization Runtime | `Keep separate` | UI/runtime componentization for Previred. |
| `TASK-730` Payroll E2E Smoke Lane | `Keep separate` | Useful as verification lane, not architecture driver. |
| `TASK-756` Payroll Orders Auto Generation | `Keep separate` | Payment operations; may align later with PaymentRail but should not lead foundation sequencing. |
| `TASK-759c` Payslip Cancellation Revision Compensation | `Keep separate` | Payslip/revision-specific. |
| `TASK-868` Payroll Receipt Documents Aggregate | `Keep separate` | Document/receipt aggregate, not foundation source-of-truth. |
| `TASK-940` Payroll May Close Readiness Gate | `Keep separate` | Period-specific operational close gate. |

## Reframe Rules For Existing Tasks

When any existing task above is pulled into EPIC-017, apply these rules before moving it to `in-progress`:

1. Add `Epic: EPIC-017` in `## Status` if the task becomes part of the program.
2. State the EPIC phase explicitly.
3. Replace Payroll-as-root language with the target spine where applicable.
4. State whether the task is read-only, projection-only, UI-only, or write-path.
5. If it can affect amount, eligibility, final settlement, contractor payable or payment rail, require before/after evidence and no-regression gates.
6. Preserve boundaries:
   - Payroll calculates payroll.
   - Contractor payables do not become payroll entries.
   - Finance/Payment Orders owns payment execution.
   - Provider/Deel IDs are execution references, not person identity.
   - `member.contract_type` is employment-history compatibility state, not universal current truth.
7. Use gap codes or reliability signals from `TASK-959` instead of inventing local drift categories.
8. Do not promote a `Proposed` ADR into runtime behavior without a documented checkpoint.

## Recommended Post-TASK-959 Order

If `TASK-959` validates that the read-only map is feasible, the next candidates should be:

1. Reframed `TASK-338` as `CompensationProfile` read model/foundation.
2. Reframed `TASK-788` assignment/title effective-dating read model, with promotion write path split out if needed.
3. Reframed `TASK-614` Person workforce/economy facet consuming the foundation.
4. Reframed `TASK-652` API/agent-safe workforce read surface.
5. Reframed `TASK-340` bridge/write-path convergence only after parity and architecture checkpoint.

If `TASK-959` finds major data coverage gaps, do not proceed to these tasks as product work. Open a targeted coverage/remediation task first.
