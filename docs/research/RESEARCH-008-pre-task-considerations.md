# RESEARCH-008 - Pre-Task Considerations

## Status

- Lifecycle: `Research Appendix`
- State: `Active`
- Date: 2026-05-31
- Parent research: [RESEARCH-008 - Unified Workforce Foundation](RESEARCH-008-unified-workforce-foundation.md)
- Current-state gap analysis: [RESEARCH-008-current-state-gap-analysis-2026-05-31.md](RESEARCH-008-current-state-gap-analysis-2026-05-31.md)
- Related epic: [EPIC-017 - Unified Workforce Foundation Iterative Program](../epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md)
- Runtime changes: none
- Task creation: none

## Purpose

This document captures what Greenhouse must explicitly consider before opening the first implementation task under EPIC-017.

The goal is to avoid turning the unified workforce foundation into a broad rewrite. The first task should be a narrow learning loop that validates the model against the current codebase and live data without changing payroll, contractor, finance or identity behavior.

## Recommended First Question

The first executable task should not be "build the unified workforce foundation".

It should validate this smaller question:

> Can Greenhouse build a trustworthy read-only map of `Person -> current WorkRelationship -> CompensationProfile -> PaymentRail -> readiness/compliance` using the sources that already exist?

If the answer is yes, future tasks can promote the projection, add reliability signals and eventually expose it in Person 360. If the answer is no, the task should return precise gaps instead of forcing a premature schema or UI decision.

## Pre-Task Considerations

### 1. Decision to validate first

Before opening a task, define the exact decision the task should answer.

Preferred first decision:

- whether a read-only person-centered workforce map can be derived from current sources;
- whether the map agrees with current work classification and known payroll/contractor boundaries;
- which gaps are data coverage problems vs model problems.

Avoid first tasks that:

- introduce write paths;
- migrate ownership of compensation;
- redesign Person 360;
- mutate `members`;
- change payroll formulas or contractor payables.

### 2. Person identity doctrine

The task must state how it resolves the durable human root.

Objects to consider:

- `greenhouse_core.identity_profiles`
- `greenhouse_core.members`
- `greenhouse_core.person_memberships`
- `greenhouse_serving.person_360`

Questions to answer:

- Is `identity_profiles.profile_id` the durable person root for this projection?
- When is `members.member_id` an operational roster identity vs a compatibility projection?
- How should the projection behave for profile-without-member, member-without-relationship or multiple membership cases?
- What should happen when external provider identifiers exist, such as Deel contract IDs?

Initial stance:

- Person should be the durable root.
- Provider, payroll, payable and document IDs are references, not person identity.
- `members` remains respected as an active runtime dependency, but should not be promoted as the universal workforce root.

### 3. Relationship coverage expectation

The first task must define expected relationship coverage before relying on `person_legal_entity_relationships`.

Known live dev signal from 2026-05-31:

- `members`: 146 rows.
- `person_legal_entity_relationships`: 11 rows.
- 5 active demo international/internal members had no active employee/contractor relationship.

Questions to answer:

- Which active members must have active employee or contractor relationships?
- Which demo/fixture rows can be tolerated?
- Which missing relationship states should be warning vs error?
- Should the first reliability signal be `workforce.relationship_coverage` or a narrower active-member coverage check?

Initial stance:

- Missing coverage should not be silently inferred.
- The first read model may include explicit `coverage_status` / `gap_codes` instead of hiding uncertainty.

### 4. Compensation ownership and scope

The first task must not move compensation ownership. It should only map current compensation to candidate workforce concepts.

Objects to consider:

- `greenhouse_payroll.compensation_versions`
- payroll compensation readers/builders
- contractor payable snapshots
- `src/types/hr-contracts.ts`

Questions to answer:

- Does current compensation attach to member, relationship, assignment, or a composite?
- What can be mapped confidently today?
- What must remain `unknown` until a later ADR/delta?
- How should compensation tuple constraints be represented in the read model?

Initial stance:

- Keep `compensation_versions` unchanged.
- Build a read-only `CompensationProfile` interpretation with explicit confidence/gap markers.
- Do not alter payroll output, payables, final settlements or tuple rules.

### 5. Work assignment shape

The first task should not pretend Greenhouse already has a fully modeled `WorkAssignment`.

Objects to consider:

- member role/title fields;
- manager/department/org references;
- Person 360 assignment facets;
- future job architecture and workforce planning concepts.

Questions to answer:

- Which fields describe legal relationship vs actual work performed?
- What is the minimal assignment read model needed for reporting and Person 360?
- Which fields are reliable enough to expose now?

Initial stance:

- Treat `WorkAssignment` as a read-only concept first.
- Keep it separate from `WorkRelationship`; a title or manager change is not automatically a legal/payroll relationship change.

### 6. Payroll, contractor and finance hard boundaries

Every task under this program must restate the non-regression boundaries.

Hard rules:

- Payroll calculates payroll.
- Contractor payables do not become payroll entries.
- Finance/Payment Orders owns payment execution.
- `member.contract_type` is not current contractor truth when relationship/engagement state says otherwise.
- Deel/provider IDs are execution references, not identity.
- No first task may change payroll amounts, final settlement behavior, contractor payable behavior or payment order behavior.

Initial stance:

- First task must be read-only.
- Any later task that can affect money, eligibility, final settlement or payment rails needs its own proof, tests and architecture checkpoint.

### 7. Redaction and access model

The first read model should anticipate redaction even if it does not expose UI.

View contexts to consider:

- HR/Admin.
- Finance.
- Self-service worker.
- Client-safe.
- Agent/Nexa/MCP.

Sensitive fields to classify early:

- compensation;
- bank/payment profile;
- tax/legal identifiers;
- compliance documents;
- internal notes;
- provider references;
- classification risk;
- final settlement/offboarding references.

Initial stance:

- Do not create a single unredacted mega object as the canonical API shape.
- Prefer a core internal projection plus view-specific redaction/adapters.
- Agent-safe context must be capability-aware and audit-ready from the start.

### 8. Success criteria for the first task

The first task should be considered successful if it creates evidence, not if it creates a new product surface.

Minimum success criteria:

- Read-only only.
- Runs against current dev PostgreSQL.
- Produces a workforce map for relevant people/members.
- Includes explicit gap codes instead of silent inference.
- Compares against `resolveCurrentWorkClassification`.
- Does not change payroll, contractor, finance, identity or Person 360 runtime behavior.
- Identifies candidate reliability signals.
- Documents whether Person 360 can safely consume the projection later.

## Recommended First Task Shape

Suggested task title:

> Workforce Foundation Read-Only Object Map Audit

Suggested EPIC phase:

- EPIC-017 Phase 0/1.

Suggested task type:

- Research-backed implementation/audit.

Suggested output:

- A server-only read-only mapper or script/projection prototype.
- A dev DB audit report.
- Candidate gap codes.
- Candidate reliability signals.
- No UI.
- No writes.
- No migrations unless the task explicitly proves that a schema artifact is required and gets a follow-up checkpoint.

Suggested primary verification:

- `pnpm pg:doctor`
- targeted unit tests for pure mapping logic, if code is introduced;
- read-only DB run against dev;
- `git diff --check`;
- docs update only if no runtime code is introduced.

## Do Not Start With

- Relationship-first activation command.
- Compensation write-path migration.
- Person 360 UI redesign.
- Payroll participation or payroll amount changes.
- Contractor payable state changes.
- Finance payment obligation rematerialization.
- Agent/MCP tool exposure.
- Broad data backfill.

Those may become valid later, but only after the read-only map and reliability picture are understood.

## Pre-Task Gate Checklist

Before opening the first `TASK-###`, confirm:

- [ ] ADR is accepted, revised, or explicitly allowed to proceed with a read-only discovery slice while still `Proposed`.
- [ ] The task declares `Epic: EPIC-017`.
- [ ] The task states the exact decision it validates.
- [ ] The task is read-only unless a later architecture checkpoint says otherwise.
- [ ] Person identity resolution rules are explicit.
- [ ] Relationship coverage expectations are explicit.
- [ ] Compensation scope remains non-mutating.
- [ ] Payroll/contractor/finance hard boundaries are copied into the task.
- [ ] Redaction/access assumptions are documented.
- [ ] Success criteria emphasize evidence and gap codes, not product launch.
