# GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1

## Status

`Proposed`

## Date

2026-05-31

## Owner

HR / Payroll / Finance / Identity / Platform

## Scope

Person 360, workforce lifecycle, person/legal-entity relationships, contractor engagements, compensation versions, payroll boundaries, payment obligations, document/compliance readiness, reporting projections and AI/agent workforce context.

## Reversibility

`Two-way but slow`

Before implementation, this decision is cheap to revise. After write paths, projections and UI surfaces start depending on it, reversing to a contract-centered model would require multiple months and cross-domain migration work.

## Confidence

`Medium`

The direction is strongly supported by existing Greenhouse architecture and market signals, but the exact schema/projection shape still requires research. This ADR should not be marked `Accepted` until the open questions in the research brief are reviewed.

## Validated as of

2026-05-31

Evidence validated:

- Greenhouse current docs/runtime direction via local architecture docs and recent handoff.
- Deel workforce unification article, last updated 2026-04-09.
- Rippling HRIS platform messaging around one source of employee data.
- Remote global employment platform and MCP messaging around payroll/contracts/compliance/org data.
- Workday HCM/VNDLY messaging around people-centered HCM, unified data core and extended workforce worker profiles.

## Context

Greenhouse already has several partial moves toward person-centered workforce architecture: Person 360, person/legal-entity relationships, contractor engagements, payment orders, payroll compliance boundaries and current work classification. Recent contractor/payroll work exposed that local fixes are not enough: Greenhouse can still drift when relationship state, contract type, compensation versions, payment rail and payroll/payable artifacts encode overlapping truths.

The decision needed now is not how to fix one drift class. The decision is whether Greenhouse should organize workforce workflows around the person and versioned facets, or continue letting contract/payroll/provider rails shape the primary model.

Market direction supports a person/workforce foundation: Deel, Rippling, Remote and Workday all emphasize unified workforce data, total workforce visibility, compensation/reporting consistency and AI/automation over shared workforce context.

## Decision

Greenhouse will pursue a person-centered unified workforce foundation as the target architecture: the canonical root is the person, while work relationships, assignments, compensation profiles, compliance rails, documents, payment rails and workforce events are governed facets of the person journey.

Contract type, provider, payroll rail and payment mechanism must not be treated as the root identity of a worker. They remain critical operational facts, but they are facets with explicit ownership, gates, audit and projections.

This ADR is `Proposed`: it authorizes research and architecture review, not implementation tasks or runtime changes.

## Alternatives Considered

### Alternative 1: Keep the current contract-centered model

This preserves short-term compatibility but keeps the main drift class alive. It encourages each rail to answer "who is this worker now?" differently.

### Alternative 2: Make `members.contract_type` the canonical current work state

Rejected because it collapses history and current state. Recent contractor transitions already showed that mutating employment contract history to represent contractor status risks payroll/finiquito regressions.

### Alternative 3: Create separate employee, contractor, EOR and provider modules

This is tempting locally, but it creates parallel identity, onboarding, compensation and reporting flows. It improves module autonomy while weakening total workforce visibility.

### Alternative 4: Replace existing tables with a new workforce schema immediately

Rejected as too risky. Payroll, contractor payables and finance settlement logic are sensitive and already operational. The correct migration posture is strangler/projection-first.

## Consequences

### Positive

- Greenhouse gains a coherent product thesis: one workforce, multiple rails.
- Person 360 can become the natural hub for work journey, compensation history and status.
- HR, Payroll and Finance can report headcount, total compensation and obligations from aligned projections.
- Contractor, Deel, honorarios and international internal flows can share workflow language without sharing formulas.
- AI agents and MCP tools get safer workforce context from canonical projections instead of table-specific heuristics.

### Negative

- The model introduces a conceptual layer that must be taught to agents and future engineers.
- Some existing tables will need compatibility posture and migration rules.
- There is a risk of over-abstracting if implementation jumps to schema work before proving projections.
- Field-level authorization becomes more important because one profile may aggregate HR, Finance, legal and payment facts.

### Neutral / contextual

- This decision does not remove payroll, contractor, finance or compliance domain ownership.
- This decision does not imply one universal calculation engine.
- Rails remain specialized; only the person/workflow spine is unified.

## Runtime Contract

While status is `Proposed`:

- No runtime behavior changes.
- No migrations are authorized by this ADR.
- No task should claim this model as accepted architecture.

If accepted later:

- New workforce features must start from person + relationship context unless a domain ADR explicitly says otherwise.
- New worker-related read models should avoid using contract type alone as current classification.
- Contractor, payroll, provider and payment rails must link back to the person/work relationship they operationalize.
- Existing payroll/finiquito/contractor hard rules remain intact.
- Implementation must proceed projection-first with parity checks and reliability signals before write-path migration.

## Related Documents

- [RESEARCH-008 - Unified Workforce Foundation](../research/RESEARCH-008-unified-workforce-foundation.md)
- [GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md](GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md)
- [GREENHOUSE_360_OBJECT_MODEL_V1.md](GREENHOUSE_360_OBJECT_MODEL_V1.md)
- [GREENHOUSE_PERSON_COMPLETE_360_V1.md](GREENHOUSE_PERSON_COMPLETE_360_V1.md)
- [GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md](GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md)
- [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
- [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)
- [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)

## Sources / Evidence

- Deel, "What Happens When Your Whole Workforce Runs on the Same System", validated 2026-05-31: https://www.deel.com/blog/what-happens-when-your-workforce-runs-on-the-same-system/
- Rippling HRIS, validated 2026-05-31: https://www.rippling.com/products/hr/hris
- Remote homepage/platform, validated 2026-05-31: https://remote.com/
- Workday HCM overview, validated 2026-05-31: https://www.workday.com/en-us/products/human-capital-management/overview.html
- Workday VNDLY Worker Profile Management, validated 2026-05-31: https://www.workday.com/en-us/products/vndly-vms/worker-profile-management.html

## Revisit When

- The research brief is ready for architecture review.
- A future task proposes a new source of truth for worker lifecycle, compensation, payment rail or current classification.
- Person 360 becomes the primary UI for HR/Payroll/Finance worker journeys.
- Greenhouse adds a new country, legal entity, EOR/provider rail or compensation management module.
- AI agents gain execute-level permissions over workforce workflows.
