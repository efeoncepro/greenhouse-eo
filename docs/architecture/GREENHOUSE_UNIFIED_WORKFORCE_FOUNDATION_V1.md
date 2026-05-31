# GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1

## Status

- Status: `Draft`
- Date: 2026-05-31
- Owner: HR / Payroll / Finance / Identity / Platform
- Related research: [RESEARCH-008 - Unified Workforce Foundation](../research/RESEARCH-008-unified-workforce-foundation.md)
- Current-state gap analysis: [RESEARCH-008-current-state-gap-analysis-2026-05-31.md](../research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md)
- Related ADR: [GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md](GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md)
- Implementation tasks: none yet

## Purpose

This document defines a draft target architecture for Greenhouse as a unified workforce foundation.

It does not change runtime behavior by itself. It exists to align the product and architecture conversation before opening implementation tasks.

The core premise:

> Greenhouse should model workforce operations around a canonical person and versioned work facets. Contract type, payment rail, provider, compliance path and document status are facets of the person journey, not the root organizing principle.

## Existing Architecture Context

Use this document together with:

- [GREENHOUSE_360_OBJECT_MODEL_V1.md](GREENHOUSE_360_OBJECT_MODEL_V1.md)
- [GREENHOUSE_PERSON_COMPLETE_360_V1.md](GREENHOUSE_PERSON_COMPLETE_360_V1.md)
- [GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md](GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md)
- [GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md](GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md)
- [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
- [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)
- [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)
- [GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md](GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md)

## Design Doctrine

### One workforce, multiple rails

All worker types should share a common conceptual spine:

1. person identity;
2. work relationship;
3. work assignment;
4. compensation profile;
5. readiness and compliance;
6. payment obligation and settlement;
7. documents and audit trail;
8. event timeline.

Different rails still matter:

- Chile dependent payroll;
- Chile honorarios;
- international contractor through Deel;
- EOR/provider;
- international internal;
- future legal entities or providers.

The rails decide gates, formulas, documents, taxes, payment execution and audit requirements. They should not create competing definitions of the person or current work state.

### Person-centered, not contract-centered

The person profile should answer:

- Who is this person?
- What work relationships have existed?
- Which relationship is active now?
- What work do they perform now?
- What compensation applies now and what changed over time?
- Which payment/compliance rails are active?
- Which obligations/documents/events belong to the journey?

The contract remains important, but it becomes a governed artifact or facet. It should not be the primary object that defines the whole profile.

## Draft Canonical Object Model

This is a target model, not a schema proposal.

```text
Person
  -> WorkRelationship[]
       -> WorkAssignment[]
       -> CompensationProfile[]
       -> ComplianceRail[]
       -> PaymentRail[]
       -> DocumentCase[]
       -> WorkforceEventTimeline
```

### Person

The durable human root.

Candidate current anchors:

- `identity_profiles`
- Person 360 resolver and facets
- `members` as current compatibility/operational roster

Target rule:

- New cross-domain workforce flows should resolve the person first.
- A provider, contract, payroll entry, payable or document must not create a parallel person identity.

### WorkRelationship

The legal/economic relationship between a person and a Greenhouse operating/legal entity.

Candidate current anchors:

- `person_legal_entity_relationships`
- offboarding cases
- contractor transition primitives
- contractor engagement links

Target rule:

- Employee, contractor, honorarios, EOR and international internal states should be represented as relationship lifecycle, not as destructive mutation of history.
- A person can have sequential relationships and, where explicitly supported, multiple active relationships.
- Relationship closure should not erase or reinterpret prior payroll/finiquito state.

### WorkAssignment

The work being performed: role, title, seniority, team, manager, scope, space/client allocation and operating context.

Candidate current anchors:

- workforce role/title governance;
- assignments and People 360 facets;
- future job architecture/workforce planning primitives.

Target rule:

- Assignment changes should not be encoded as contract changes unless the legal/payroll relation actually changes.
- Reporting should distinguish headcount relationship from assignment capacity.

### CompensationProfile

The versioned compensation facts for a relationship or assignment.

Candidate current anchors:

- `compensation_versions`
- payroll compensation requirements
- contractor payable snapshots
- variable compensation / KPI sources

Target rule:

- Compensation must be historical, dated and non-destructive.
- The current compensation projection should be derived from valid versions and relationship state.
- Fixed compensation, target compensation and direct compensation should be distinguishable for reporting.
- Payroll output or payables consume compensation facts; they do not become the compensation source of truth.

### PaymentRail

The mechanism that turns work/compensation into payable obligations and settlements.

Candidate current anchors:

- `payroll_via`
- payroll entries
- contractor payables
- Payment Orders
- Deel contract IDs and future provider identifiers

Target rule:

- Payroll calculates payroll obligations.
- Contractor engagements create contractor payables.
- Finance/Treasury creates and settles payment orders.
- Provider or payment rail identifiers are execution references, not workforce identity.

### ComplianceRail

The legal, tax, HR and document readiness rules that gate work and payment.

Candidate current anchors:

- Person Legal Profile;
- Payroll Chile compliance;
- honorarios readiness;
- legal review references;
- Previred/LRE exports;
- final settlement documents;
- future e-signature/doc cases.

Target rule:

- Compliance gates are rail-specific but should be visible as part of the same person/work relationship journey.
- Missing compliance evidence should block the relevant rail, not force a new person/work object.

### WorkforceEventTimeline

The append-only timeline of lifecycle observations and state changes.

Candidate current anchors:

- relationship events;
- member contract type audit log;
- payroll adjustment/events;
- contractor payable events;
- outbox events;
- offboarding/final settlement events.

Target rule:

- Historical observations answer "what happened when" and should be append-only.
- Current-state screens should read canonical projections/views over events and source tables.

## Source-of-Truth Boundaries

### `members`

Current reality:

- `members` is still heavily used as an operational roster and compatibility source.

Target doctrine:

- `members` should not be treated as the universal root of workforce truth.
- Over time, it should behave more like an operational projection/adapter over person + relationship + assignment where feasible.
- Until a migration exists, code must respect its current role and avoid speculative rewrites.

### `person_legal_entity_relationships`

Current reality:

- Already carries key relationship semantics for person/legal entity transitions.

Target doctrine:

- This is the strongest candidate root for `WorkRelationship`.
- Research must decide whether to extend it directly or layer a `WorkRelationship` projection/resolver above it.

### `contractor_engagements`

Current reality:

- Owns contractor operational/payable workflow.

Target doctrine:

- It should remain a specialized aggregate for contractor work evidence and payables.
- It should not become a second person identity.
- It should link cleanly to the work relationship it operationalizes.

### `compensation_versions`

Current reality:

- Owns versioned compensation facts but still carries tuple/classification risk.

Target doctrine:

- It should feed a `CompensationProfile`.
- Future architecture must decide whether compensation versions are scoped to member, relationship, assignment or a composite.
- Compensation changes should be explainable in the person timeline.

### Payroll entries, contractor payables and payment obligations

Current reality:

- They materialize obligations and payment flows.

Target doctrine:

- They are financial/payroll artifacts derived from relationships, compensation and evidence.
- They must never be used as the source of current workforce classification.

## Unified Workflow Spine

The same high-level workflow should apply across worker types:

```text
Create/adopt person
  -> Open relationship
  -> Assign work
  -> Define compensation
  -> Resolve compliance readiness
  -> Resolve payment rail readiness
  -> Activate
  -> Change role/compensation/rail over time
  -> Close relationship
  -> Preserve timeline/reporting
```

Rails customize gates and outputs:

| Flow step | Shared question | Rail-specific examples |
| --- | --- | --- |
| Open relationship | Who is contracting with whom, from when, and under which relationship type? | Chile employee, honorarios, Deel contractor, EOR, international internal. |
| Define compensation | What is fixed/variable/target/direct compensation and when is it effective? | Chile taxable salary, SII withholding base, Deel passthrough amount, contractor payable amount. |
| Resolve readiness | What evidence is missing before activation/payment? | RUT/legal profile, Deel contract ID, boleta, legal review reference, payment profile. |
| Pay | Which obligation engine owns payment creation? | Payroll entry, contractor payable, Payment Order, provider settlement. |
| Close | What closes and what stays historical? | Finiquito for dependent Chile, contractor closure, provider offboarding, relationship ended. |

## UI / Product Contract

Target user experience:

- Person 360 or its successor is the main person/workforce profile.
- The first profile layer leads with the person and current work state.
- Contract, engagement, payroll, documents and payment rail are tabs/sections/facets.
- HR/Admin can move across people without returning to list screens.
- Compensation history is explicit and dated.
- Status is relationship-based: active, not started, offboarding, inactive, or needs attention.

Do not infer from this draft that a UI redesign is approved. This section defines product direction only.

## Access Model

The existing dual-plane access model still applies:

- `views` / `authorizedViews` / `view_code` govern visible surfaces.
- `entitlements` / `capabilities` govern fine actions and data access.

The unified workforce foundation increases the importance of field-level and facet-level authorization:

- self-service can see personal/payroll/payment data scoped to self;
- HR can manage activation, relationship and compliance;
- Finance can see payment rail, obligations and cost fields;
- Admin can govern cross-domain configuration;
- client-safe views must be explicitly projected and redacted.

No new roles are introduced by this document.

## Event And Projection Doctrine

Use the existing Greenhouse persistence dichotomy:

- mutable current state -> upsert/merge with clear owner;
- historical observations -> append-only event log + canonical current-state view/projection.

Recommended projection candidates:

- current work classification;
- active work relationship;
- active compensation profile;
- workforce readiness;
- workforce total cost/headcount reporting;
- person workforce timeline.

## Migration Posture

This must be a strangler migration, not a rewrite.

1. Document current source-of-truth boundaries.
2. Add read-only projections/resolvers before write-path migrations.
3. Validate projections against existing payroll/contractor/person 360 output.
4. Move surfaces to projections one at a time.
5. Add write-path changes only after parity and reliability signals exist.
6. Keep payroll/finiquito/contractor hard rules intact during transition.

Hard non-regression rules:

- Do not mutate historical employee contracts to express current contractor status.
- Do not route contractor pay through payroll entries unless explicitly designed.
- Do not create Payment Orders directly from workforce state; use the owning obligation aggregate.
- Do not use contract type as the only current work classifier.
- Do not create a parallel person identity for provider/contractor/employee rails.

## Observability Requirements

Future implementation should include reliability signals for:

- person without current classification projection;
- active relationship without payment rail readiness;
- compensation version without valid relationship/assignment scope;
- worker active in more than one paying rail for same period without explicit approval;
- payment obligation without source relationship/evidence;
- document/compliance blocker overdue;
- projection drift between legacy roster and unified workforce projection.

## Self-Critique

### What breaks in 12 months?

If Greenhouse keeps adding contractor, international and finance workflows without this foundation, the most likely failure is reporting disagreement: HR sees one active workforce, Payroll sees another, Finance sees obligations without clean worker lineage.

### What breaks in 36 months?

The biggest risk is cognitive debt: future agents and engineers will know many local rules but not the root model. The platform could become hard to extend for new countries, providers, legal entities or AI workflows.

### What is locked in?

Accepting this doctrine locks Greenhouse into person-centered workforce semantics. It does not lock a specific schema yet. The one-way part begins only when write paths and migrations move to the target model.

### What is not observable yet?

Current Greenhouse has useful reliability signals, but not yet a complete "workforce truth drift" control plane across person, relationship, assignment, compensation and payment rail.

### AI-specific risk

AI agents need trusted workforce context. If agents read contract/payroll/provider tables directly without a canonical projection, they can recommend or execute actions from stale or conflicting state.

### Regional/compliance risk

Chile payroll, honorarios, international contractors and future legal entities cannot share formulas. The unified model must unify the workflow spine, not flatten compliance rules.

## Revisit When

- A new country/legal entity is added.
- Greenhouse introduces provider/EOR rails beyond Deel.
- Person 360 is redesigned.
- Compensation management becomes a dedicated module.
- AI agents gain execute-level autonomy over HR/payroll/finance workflows.
- Reporting requires total workforce cost/headcount across all rails.
