# RESEARCH-008 - Unified Workforce Foundation

## Status

- Lifecycle: `Research Brief`
- State: `Active`
- Domain: `hr` + `payroll` + `finance` + `identity` + `platform`
- Owner: `Greenhouse product / architecture`
- Architecture candidate: [GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md](../architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md)
- ADR candidate: [GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md](../architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md)
- Current-state gap analysis: [RESEARCH-008-current-state-gap-analysis-2026-05-31.md](RESEARCH-008-current-state-gap-analysis-2026-05-31.md)
- Pre-task considerations: [RESEARCH-008-pre-task-considerations.md](RESEARCH-008-pre-task-considerations.md)
- Resulting tasks: `TBD` only after research + ADR review

## Summary

Greenhouse needs to decide whether the workforce domain is organized around contracts/payroll rails or around a canonical person with versioned work, compensation, compliance, document and payment facets.

This brief exists because recent contractor, payroll and Person 360 work exposed a deeper system shape: `TASK-958`-style tuple drift is not the core problem. The core problem is that Greenhouse can still hold parallel truths about who a person is, what relationship is active, what work they perform, what compensation applies, and which rail should pay or report that work.

The recommended research thesis is:

> Greenhouse should operate as one workforce foundation with multiple legal, payroll and finance rails. The person is the root; contracts, engagements, compensation, documents and payment obligations are governed facets, not competing identities.

## Why This Brief Exists

Greenhouse has already moved toward a person-centered model in pieces:

- Person 360 centralizes person data and facets.
- Person Legal Entity Relationships distinguish person, legal entity and relationship.
- Contractor Engagements separate contractor work and payables from payroll/finiquito.
- Payroll architecture protects contract/payroll tuples and sensitive statutory calculations.
- Payment Orders separates payroll calculation from treasury execution.

Those moves are directionally consistent, but the product and architecture do not yet state the larger doctrine. Without a doctrine, every new workflow can accidentally choose a different root:

- `members.contract_type` as the root for work state.
- `contractor_engagements` as a parallel person/work identity.
- `compensation_versions` as the source for current classification.
- Payroll entries or payables as implied workforce truth.
- UI routes that expose employment type before the person journey.

This research brief reframes those symptoms as a single architecture question.

## Market Signal

Validated as of: 2026-05-31.

| Source | Signal | Relevance to Greenhouse |
| --- | --- | --- |
| Deel, "What Happens When Your Whole Workforce Runs on the Same System" (last update 2026-04-09) | Deel describes a unified data foundation across worker types, redesigned people profiles that lead with the person, compensation profiles with totals/history, consistent workflows across employment types, and documents/e-signatures in the same platform. | Directly validates the product direction: person-centered profile, compensation history, and one workflow with different rails. |
| Rippling HRIS | Rippling positions HR data as living in one place, automatically updating everywhere, with reporting, workflows, permissions and automation over a single source of employee data. | Validates that the platform value is not only HR UI; it is a shared data substrate that powers automation and permissions. |
| Remote | Remote frames global employment as hiring/paying/managing anyone through one platform, and explicitly exposes payroll, contracts, compliance data and org structure to agents via MCP. | Validates the "workforce foundation as agent substrate" angle for Greenhouse/Nexa/MCP. |
| Workday HCM + VNDLY | Workday emphasizes people at the center, a unified data core, and VNDLY worker profiles for contingent workforce with unique worker IDs, worker status and assignment history. | Validates that total workforce visibility includes employees and contingent workers, not just direct payroll employees. |

Sources:

- https://www.deel.com/blog/what-happens-when-your-workforce-runs-on-the-same-system/
- https://www.rippling.com/products/hr/hris
- https://remote.com/
- https://www.workday.com/en-us/products/human-capital-management/overview.html
- https://www.workday.com/en-us/products/vndly-vms/worker-profile-management.html

## Archetype Classification

Primary archetype:

- `B2B SaaS multi-tenant`: tenant-scoped workforce data, roles, visibility, field-level redaction and audit must stay correct.

Secondary archetypes:

- `Internal tool / admin`: HR, Finance and Admin users perform state-changing operations with payroll and compliance consequences.
- `Data platform / analytical`: reporting, total compensation, headcount and cost analysis depend on consistent source-of-truth boundaries.
- `Event-driven`: lifecycle changes must feed projections, reliability signals, payment obligations, documents and notifications.
- `Agentic AI system`: Nexa/MCP/agent workflows need trusted person/workforce context and scoped actions.

## Current Greenhouse Baseline

### Existing strengths

- Person 360 already expresses the idea that a person is a canonical enriched object with facets.
- `person_legal_entity_relationships` already separates person identity from legal/economic relationships.
- Contractor transitions now preserve employment history rather than mutating `members.contract_type` into "current reality".
- Contractor payables flow through Finance/Payment Orders rather than payroll entries or final settlements.
- Payroll has explicit contract tuple governance and reliability signals.
- Identity/access already distinguishes visible `views` from fine-grained `entitlements`.

### Structural gap

Greenhouse lacks one explicit cross-domain contract that says:

- what the canonical workforce root is;
- how current work state is resolved;
- how compensation history attaches to a relationship or assignment;
- which rails are legal/compliance/payment execution details;
- which tables are compatibility projections rather than root truth;
- which UI flows must feel unified even when gates differ internally.

### Symptoms this doctrine should prevent

- A person being active as contractor while legacy payroll still sees them as an active employee.
- A compensation version drifting from the relationship/payroll classification it is supposed to represent.
- A contractor engagement becoming a second person record in practice.
- Payment rail (`internal`, `deel`, future provider) being confused with worker identity.
- HR onboarding, contractor onboarding and payroll activation becoming separate user experiences for the same conceptual workflow.

## Product Thesis

Greenhouse should converge toward:

> One workforce, multiple rails.

In product terms:

- HR/Admin opens a person profile and sees their full journey.
- Work relationships, assignments, compensation, documents, compliance status, and payment rails are facets of that journey.
- Employees, contractors, EOR/provider workers, international internal workers and honorarios share a workflow spine.
- Each rail still has its own gates, formulas, documents, tax rules, capabilities and audit requirements.

## Candidate Canonical Concepts

These are research concepts, not schema commitments yet.

| Concept | Candidate responsibility | Existing anchors to evaluate |
| --- | --- | --- |
| `Person` | Human identity and durable profile across roles, systems and relationships. | `identity_profiles`, Person 360, `members` compatibility. |
| `WorkRelationship` | Legal/economic relationship between a person and an operating/legal entity, with lifecycle dates and type. | `person_legal_entity_relationships`, offboarding cases, contractor transition primitives. |
| `WorkAssignment` | What work the person performs: title, seniority, manager, team, scope, client/space allocation. | Workforce role/title governance, assignments, People 360 facets. |
| `CompensationProfile` | Versioned compensation facts and history for a relationship/assignment. | `compensation_versions`, payroll requirements, contractor payables snapshots. |
| `PaymentRail` | How obligations are created and paid: payroll internal, Deel, contractor payable, future provider. | `payroll_via`, Payment Orders, contractor payables, Deel contract IDs. |
| `ComplianceRail` | Statutory, tax, legal and document rules that gate the relationship or payment. | Payroll compliance, legal profile, contractor readiness, Previred/LRE, SII/honorarios. |
| `DocumentCase` | Documents, signatures, audit trails and templates tied to the person journey. | final settlement documents, assets, future e-signature layer. |
| `WorkforceEventTimeline` | Append-only history of changes: start, role change, compensation change, transition, closure. | audit logs, outbox events, relationship events, contractor payable events. |

## User Flows To Research As One Spine

The research should map these as one workflow family before any task breakdown:

1. Create or adopt a person.
2. Open a work relationship.
3. Assign work: title, team, manager, scope, location, client/space if applicable.
4. Define compensation profile.
5. Resolve legal/compliance readiness.
6. Resolve payment rail readiness.
7. Activate worker.
8. Change role, manager, scope or compensation.
9. Transition relationship type or payment rail.
10. Offboard/close relationship.
11. Report total workforce, headcount, cost and compensation history.

## Open Architecture Questions

1. Does `members` remain a mutable operational roster, or should it become a compatibility projection over person + relationship + assignment?
2. Is `person_legal_entity_relationships` sufficient as the canonical relationship root, or does Greenhouse need a richer `WorkRelationship` abstraction/projection?
3. Should `contractor_engagements` become a specialized facet of relationship, or remain a distinct aggregate linked to a relationship?
4. Does compensation attach primarily to person, relationship, assignment, or a composite of relationship + assignment?
5. How does a compensation change flow into payroll, contractor payables and Finance without creating double rails?
6. What is the canonical "current work classification" resolver and which surfaces must use it?
7. Which events should be append-only domain history vs current-state projections?
8. What field-level redaction rules apply across self-service, HR, Finance, Admin and client-safe views?
9. What is the minimal migration path that avoids rewriting payroll or contractor systems in one jump?
10. What should an AI agent be allowed to observe, recommend or execute against this foundation?

## Non-Goals For This Research Phase

- No schema migration.
- No task breakdown.
- No UI redesign.
- No backfill plan.
- No payroll formula change.
- No replacement of Person 360.
- No change to existing contractor/payroll/final settlement boundaries.

## Ready For Architecture Review When

- The team agrees on the root doctrine: person-centered vs contract-centered.
- Existing Greenhouse objects are mapped to candidate canonical concepts.
- At least one target flow is written end-to-end across HR, payroll, contractor and Finance.
- The compatibility posture for `members`, `compensation_versions` and `contractor_engagements` is explicit.
- The ADR can be accepted or rejected without needing a task plan.

## Ready For Tasks When

Only after the ADR is accepted, downstream tasks can be opened for bounded slices such as:

- read-only workforce foundation projection;
- current work classification resolver hardening;
- compensation profile timeline;
- unified activation/readiness surface;
- relationship event timeline;
- migration audits and reliability signals.

Do not create those tasks from this research brief alone.

## Delta 2026-05-31 - Current State Gap Analysis

Added the deep-dive appendix [RESEARCH-008-current-state-gap-analysis-2026-05-31.md](RESEARCH-008-current-state-gap-analysis-2026-05-31.md), covering the Deel article interpretation, market parallels, Greenhouse stack/codebase/DB audit, and the contrast between current capabilities and the foundation needed before implementation planning.

Added [RESEARCH-008-pre-task-considerations.md](RESEARCH-008-pre-task-considerations.md) as the gate checklist before opening the first `TASK-###`. It captures the recommended first question, identity/relationship/compensation/readiness/redaction considerations, and why the first task should be a read-only object map audit.
