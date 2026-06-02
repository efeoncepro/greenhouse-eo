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
- Applied to task specs: 2026-05-31

## Purpose

This appendix records which existing Payroll-adjacent backlog items can support the Unified Workforce Foundation objective, and which ones must be reframed before execution.

The original triage did not change task lifecycle, reserve new IDs or authorize implementation. It remains an intake guide for EPIC-017 so Greenhouse can reuse existing backlog instead of creating duplicate tasks.

## Applied Disposition Update - 2026-05-31

The triage below has now been applied in two passes:

- Reframed / frozen: `TASK-338`, `TASK-340`, `TASK-341`, `TASK-342`, `TASK-614`, `TASK-652`, `TASK-788`, `TASK-798`.
- Lightly aligned / kept separate: `TASK-787`, `TASK-797`, `TASK-955`, `TASK-960`.
- Umbrella adjusted: `TASK-336` now treats the old compensation thread as historical and subordinates the sequence to EPIC-017.
- New missing lanes opened: `TASK-963` People List Workforce Overview, `TASK-964` Person Workforce Documents Rail + EPIC-001 Alignment, `TASK-965` Unified Worker Create/Edit Workflow, `TASK-966` Workforce Reporting Foundation, `TASK-967` Workforce Reliability Signals Control Plane.

No lifecycle was moved and no runtime behavior changed in either pass. The second pass reserved `TASK-963` through `TASK-967` to cover Deel-like lanes outside the payroll backlog itself.

## Triage Labels

| Label | Meaning |
| --- | --- |
| `Keep as first` | Already matches the next safe step for EPIC-017. |
| `Promote now` | Already created or ready as the next active EPIC-017 lane. |
| `Reframe before execution` | Useful source material, but executing the current task as written would reinforce an older model or premature write path. |
| `Align lightly` | Mostly compatible; add EPIC-017 references, dependencies or read-model consumption notes when the task becomes active. |
| `Keep separate` | Valid Payroll/Finance/Compliance work, but not a driver for the unified workforce foundation. |
| `Defer for this objective` | Not useful for this strategic objective right now. |
| `Supersede / absorb` | Do not execute as-is; the useful scope should be absorbed into a newer EPIC-017 task or closed as obsolete after review. |

## Executive Triage

The existing backlog has strong reusable material. The main risk is sequence.

Several tasks were written before Greenhouse adopted the person-centered workforce framing:

```text
Person -> WorkRelationship -> WorkAssignment -> CompensationProfile -> ComplianceRail -> PaymentRail -> WorkforceTimeline
```

Because of that, the backlog should not be executed in numeric order or by local symptom.

Delta after `TASK-959` and the Deel People/Worker Profile correction:

- `TASK-959` proved the read-only map is feasible for the real active cohort.
- `TASK-961` was created to promote the existing People/Person 360 hub before deeper compensation/write-path convergence.
- Person 360/People is now the product hub for workforce state. Payroll remains a specialized rail for calculations, periods, receipts and statutory outputs.
- The remaining data gaps (`current compensation 5/9`, readiness blocked/unresolved `8/9`) must be explained before treating the hub as operationally complete.

The safe sequence is now:

1. Keep `TASK-959` as the first EPIC-017 task.
2. Execute `TASK-961` to make Person 360 the visible read-only workforce hub.
3. Open and execute `TASK-962` as a read-only coverage/readiness remediation plan for the compensation/readiness gaps found by `TASK-959`.
4. Use the results of `TASK-961`/`TASK-962` to reframe `TASK-338` into a `CompensationProfile` read-model/foundation task.
5. Reframe `TASK-788` into a WorkAssignment effective-dating read model, with promotion/write command split later.
6. Only then revisit bridge/write-path tasks such as `TASK-340`, `TASK-745` and activation/transition flows.
7. Keep payroll compliance, Previred, receipts, close gates and payment-order work in their own lanes unless they consume the workforce read model later.

## Directly Useful For EPIC-017

| Task | Triage | Why it matters | Required action before execution |
| --- | --- | --- | --- |
| `TASK-959` Workforce Foundation Read-Only Object Map Audit | `Keep as first` | It was the correct first learning loop: read-only map from person to relationship, assignment candidate, compensation candidate, payment rail and gaps. | Complete. Use its gap codes, audit script and metrics as input for later tasks. |
| `TASK-961` Person 360 Workforce Facet Read-Only Promotion | `Promote now` | It makes the corrected product model real: People/Person 360 as the hub, Payroll as a specialized rail. | Execute before deeper compensation/write-path convergence. Keep read-only/aditive, with redaction/access/GVC evidence. |
| `TASK-962` Workforce Coverage & Readiness Remediation Plan | `Promote now` | It explains the real gaps found by `TASK-959` before Greenhouse treats the hub as operationally complete. | Open as read-only plan/audit. No data fixes until each gap is classified as intentional state, data debt, or task-worthy remediation. |
| `TASK-338` Compensation Arrangement Canonical Runtime Foundation | `Reframe before execution` | It is very close to the missing compensation foundation, but the old `CompensationArrangement` framing may conflict with the newer `CompensationProfile` doctrine. | Rewrite around EPIC-017 Phase 2. Scope must be relationship/assignment-aware, read-model first and non-mutating. Declare whether `CompensationProfile` supersedes or aliases `CompensationArrangement`. |
| `TASK-340` Compensation Arrangement Payroll Bridge | `Reframe before execution` | The bridge is useful, but only after compensation scope and parity are proven. | Move to EPIC-017 Phase 4 or later. Block on `TASK-959`, reframed `TASK-338`, and an accepted/revised architecture checkpoint. No payroll amount changes without before/after gates. |
| `TASK-614` People / Payroll Economy Facet & Entitlements Hardening | `Supersede / absorb` | The useful part is real, but `TASK-961` now owns the Person 360 hub promotion. Remaining economy/payroll hardening should become a narrower post-961 task. | Do not execute as-is. After `TASK-961`, either close as superseded or rewrite as "People Economy/Payroll Rail Hardening" consuming the `workforce` facet. |
| `TASK-652` API Platform People/Workforce Read Surface | `Reframe before execution` | This is the future API/agent substrate for workforce context. | Defer until the read model and redaction policy exist. Add EPIC-017 dependency and field-level sensitivity gates. |
| `TASK-788` Workforce Role Title Effective Dating + Promotion Flow | `Reframe before execution` | Strong fit for `WorkAssignment` and promotion/compensation journey. | Split if needed: assignment/title effective-dating read model first; atomic promotion/write command later. Do not couple compensation writes before `CompensationProfile` is settled. |
| `TASK-798` Contractor Reliability Ops Control Plane | `Reframe before execution` | Can become a cross-rail reliability/control-plane layer for contractor/payment/provider drift. | Re-scope after `TASK-959` so signals reuse EPIC-017 gap codes and do not duplicate contractor-local projections. |
| `TASK-955` Contractor Provider Settlement Split EOR | `Align lightly` | Very aligned with `PaymentRail`: provider payee vs person cost attribution. | Keep deferred until real provider/EOR need, but link future execution to EPIC-017 payment rail lineage. |
| `TASK-787` Person Country Reconciliation | `Align lightly` | Country confidence matters for compliance rail, tax owner and contractor/provider boundaries. | Keep independent. Later expose its result as ComplianceRail evidence; do not block `TASK-961`. |
| `TASK-797` Contractor Closure + Transition Controls | `Keep separate` | Contractor closure is a valid lifecycle lane, but not the hub foundation. | Keep under contractor program. Later consume Person/Workforce state for closure visibility if needed. |
| `TASK-960` Contractor Remittance Advice | `Keep separate` | Valid contractor/finance/self-service document lane, but not a People hub driver. | Keep under contractor/payables. Person 360 may link to outputs later, but should not own remittance generation. |

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

## Disposition Matrix After TASK-961

This matrix is the current operating answer for "align, rewrite or discard".

| Task | Disposition | Rationale | Next action |
| --- | --- | --- | --- |
| `TASK-338` | Rewrite | Old `CompensationArrangement` language is directionally useful but no longer canonical enough. | Rewrite as `CompensationProfile` read model after `TASK-962`. |
| `TASK-340` | Freeze / rewrite later | Payroll bridge can change money and must wait for compensation parity. | Keep blocked until `TASK-338` rewrite + architecture checkpoint. |
| `TASK-614` | Absorb / supersede | Person 360 hub promotion moved into `TASK-961`; remaining scope is narrower economy/payroll rail hardening. | Do not execute as-is. Reassess after `TASK-961` closes. |
| `TASK-652` | Rewrite later | Agent/API exposure needs redaction policy and stable read model. | Defer until `TASK-961` proves UI facet + redaction. |
| `TASK-788` | Split | Assignment/title effective dating is needed; promotion+compensation write command is too much for one task. | Rewrite into read model first, write command later. |
| `TASK-798` | Rewrite | Contractor-local signals should not duplicate EPIC-017 gap taxonomy. | Re-scope to consume `TASK-959` gap codes and payment rail evidence. |
| `TASK-797` | Keep separate | Contractor closure is valid but a separate lifecycle lane. | Add light dependency on Person/Workforce state only when executing. |
| `TASK-787` | Align lightly | Country reconciliation supports compliance/tax confidence. | Keep independent; later feed ComplianceRail. |
| `TASK-960` | Keep separate | Remittance Advice is contractor payment documentation, not hub foundation. | Keep under contractor/finance/self-service; optional Person 360 link later. |
| `TASK-955` | Keep deferred | Provider/EOR settlement is real but minority/YAGNI until provider scenario appears. | Keep deferred; align future payment rail lineage. |

## Recommended Post-TASK-961 Order

If `TASK-961` validates that the People/Person 360 hub can safely consume the read-only map, the next candidates should be:

1. `TASK-962` coverage/readiness remediation plan if not already completed.
2. `TASK-963` People List Workforce Overview, so the hub is visible at roster level and not only profile level.
3. Reframed `TASK-338` as `CompensationProfile` read model/foundation.
4. Reframed `TASK-788` assignment/title effective-dating read model, with promotion write path split out if needed.
5. `TASK-964` Person Workforce Documents Rail + EPIC-001 Alignment, before any People-local document UI is attempted.
6. `TASK-967` Workforce Reliability Signals Control Plane, once `TASK-962` dispositions are stable.
7. Reframed or superseded `TASK-614` as a narrower People Economy/Payroll rail hardening task.
8. `TASK-966` Workforce Reporting Foundation.
9. Reframed `TASK-652` API/agent-safe workforce read surface.
10. Reframed `TASK-340` bridge/write-path convergence only after parity and architecture checkpoint.
11. `TASK-965` Unified Worker Create/Edit Workflow, only after read models, documents boundary and write-path ADR/checkpoint are accepted.

If `TASK-962` finds that the compensation/readiness gaps are data debt rather than intentional lifecycle states, do not proceed to write paths. Open targeted remediation tasks first.
