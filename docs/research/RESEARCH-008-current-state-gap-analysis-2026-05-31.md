# RESEARCH-008 Appendix - Current State Gap Analysis

## Status

- Lifecycle: `Research Appendix`
- State: `Active`
- Date: 2026-05-31
- Parent research: [RESEARCH-008 - Unified Workforce Foundation](RESEARCH-008-unified-workforce-foundation.md)
- Related architecture: [GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md](../architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md)
- Related epic: [EPIC-017 - Unified Workforce Foundation Iterative Program](../epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md)
- Scope: market signal, Greenhouse codebase, live dev PostgreSQL, stack readiness, gap analysis
- Runtime changes: none
- Task creation: none

## Executive Read

The Deel article is not mainly a UI announcement. It is a platform-positioning signal: workforce systems are moving away from fragmented employee/contractor/EOR objects and toward a shared person-centered data foundation that powers reporting, workflows, compensation history, documents, payments and AI agents.

Greenhouse is already directionally aligned, but incompletely:

- The stack is sufficient for this path: Next.js, PostgreSQL, Kysely/pg, migrations, outbox/reliability patterns, Person 360, Playwright/GVC and Vitest are already in place.
- The codebase already has strong primitives: `identity_profiles`, Person 360 facets, `person_legal_entity_relationships`, relationship transitions, contractor engagements, compensation versions, payment obligations and reliability signals.
- The live dev database shows the current gap clearly: `members` has 146 rows, but `person_legal_entity_relationships` has only 11 rows; 5 active demo international/internal members have no active employee or contractor relationship coverage.
- The current architecture can support a unified workforce foundation, but Greenhouse still lacks the canonical cross-domain projection that answers: who is this person, what relationship is current, what assignment is current, what compensation applies, which rail pays, what compliance gates remain, and what history explains it.

Recommended interpretation:

> Greenhouse should not rewrite payroll or contractor systems. It should first build a read-only person-centered workforce map over existing sources, then add reliability signals, then promote the map into Person 360 and later converge write paths only after parity is proven.

## Deel Article Interpretation

Source: Deel, "What Happens When Your Whole Workforce Runs on the Same System", last updated 2026-04-09.

### What Deel is really shipping

Deel frames the change as every worker type sharing the same foundation. The article names direct employees, EOR, contractors, PEO and COR as different worker types that now share the same structure for compensation, work history and source of truth.

The concrete product moves are:

- the person becomes the center of the platform;
- onboarding, role changes, compensation and reporting connect through one unified profile;
- People List, dashboards, AI agents and reports pull from one consistent dataset;
- compensation gets structured fields such as base pay and part-time salary handling;
- HR teams use one workflow pattern across worker types;
- documents and e-signatures live in the same platform;
- future layers such as job architecture, workforce planning, compensation management, performance reviews and anonymous reporting build on the same worker data.

### Interpretation for Greenhouse

The important point is not that every worker has identical business rules. The point is that every worker is addressable through the same conceptual spine.

For Greenhouse, that spine should be:

```text
Person
  -> WorkRelationship
  -> WorkAssignment
  -> CompensationProfile
  -> ComplianceRail
  -> PaymentRail
  -> DocumentCase
  -> WorkforceEventTimeline
```

This keeps payroll, contractor payables, EOR/provider rails and Finance settlement specialized, while preventing those rails from becoming separate identities or separate truth trees.

### What Greenhouse should not copy blindly

Deel is a global HR/payroll provider and can collapse more workflows inside its own platform. Greenhouse must preserve stricter internal boundaries:

- payroll formulas and statutory outputs remain payroll-owned;
- contractor payables remain outside payroll entries and final settlements;
- Finance/Payment Orders own treasury execution;
- identity/access and field-level redaction must remain explicit;
- `members.contract_type` cannot be treated as current truth where relationship/engagement state says otherwise.

The right copy is the data foundation doctrine, not a one-shot product clone.

## Market Pattern

Validated as of 2026-05-31 from vendor/public sources.

| Vendor/source | Market signal | Greenhouse implication |
| --- | --- | --- |
| Deel | One data foundation for direct employees, EOR, contractors, PEO and COR; shared compensation/work history; People List, dashboards, reports and AI agents over one dataset. | Confirms the person-centered workforce foundation thesis. |
| Rippling Global HRIS | Modern HRIS as central hub / single source of truth for employee data; manages and pays full-time, part-time and independent contractors across locations; one system from onboarding to offboarding. | Confirms the value is the shared data substrate and automation layer, not only HR screens. |
| Remote | Global employment infrastructure with payroll, contracts, compliance data, org structure, API/webhooks/CLI, and MCP for AI agents on employment data. | Confirms workforce foundation as an integration and agent substrate. |
| Workday HCM | HCM includes core HR database, skills intelligence foundation, process automation, workforce management and benefits; recommends object-oriented data models and skills/persona foundations. | Confirms mature enterprise HR models need object orientation and reusable worker data, not isolated modules. |
| ADP Workforce Suite | Unified time, pay and HR experience across countries; workforce management integrated into payroll/HCM with consolidated data, dashboards, analytics and compliance. | Confirms payroll/HCM vendors are converging toward one global workforce view, while keeping payroll/compliance rules specialized. |

Sources:

- Deel: https://www.deel.com/blog/what-happens-when-your-workforce-runs-on-the-same-system/
- Rippling: https://www.rippling.com/products/global/global-hris
- Remote: https://remote.com/
- Workday: https://www.workday.com/en-us/products/human-capital-management/overview.html
- ADP: https://www.adp.com/what-we-offer/time-and-attendance/workforce-management.aspx
- ADP press release: https://mediacenter.adp.com/2025-11-20-ADP-Launches-Unified-Global-Workforce-Management-Suite-Across-HCM-Platforms

## Stack Readiness

Greenhouse does not appear blocked by framework or infrastructure choice.

Current stack anchors observed in `package.json`:

- Next.js `16.1.1`, React `19.2.3`, TypeScript `5.9.3`.
- PostgreSQL access through `pg` and Kysely.
- `node-pg-migrate` migration workflow.
- NextAuth for authenticated surfaces.
- MUI/Vuexy for portal UI.
- Vitest, Playwright and Greenhouse Visual Capture for test/evidence.
- Local-first scripts: `pnpm pg:doctor`, `pnpm pg:connect`, `pnpm migrate:*`, `pnpm docs:context-check`, `pnpm fe:capture`.

Stack verdict:

- Sufficient for read-only projections, runtime APIs, reliability signals and Person 360 facets.
- Sufficient for future event/outbox-backed projections.
- Sufficient for field-level redaction and capability-gated views.
- Not sufficient by itself to solve the domain issue; the missing piece is a canonical workforce contract and projection.

## Codebase Capability Map

### Person and profile foundation

Observed anchors:

- `src/lib/person-360/person-complete-360.ts`
- `greenhouse_serving.person_360`
- `greenhouse_core.identity_profiles`
- `greenhouse_core.members`

What exists:

- Person 360 already resolves a person/member and composes facets such as identity, assignments, organization, leave, payroll, delivery, costs and staff augmentation.
- The resolver has field redaction, facet selection and caching patterns.

Gap:

- There is no dedicated `workforce` or `work relationship journey` facet yet.
- `members` still carries a large amount of operational truth and compatibility state.
- Person 360 can display pieces of work state, but it is not yet the canonical read model for relationship, compensation, compliance and payment rail state.

### Work relationships

Observed anchors:

- `src/lib/account-360/person-legal-entity-relationships.ts`
- `src/lib/workforce/relationship-transition/employee-to-contractor.ts`
- `src/lib/contractor-engagements/transition-from-employee.ts`
- `greenhouse_core.person_legal_entity_relationships`

What exists:

- `person_legal_entity_relationships` separates person, legal entity, relationship type, lifecycle dates, source of truth, source record and metadata.
- Employee-to-contractor transition closes the employee relationship and opens a contractor relationship without mutating the legacy member contract tuple.
- The connected contractor command composes relationship transition plus contractor engagement in one transaction.

Gap:

- Relationship coverage is sparse in live dev data compared with `members`.
- The system has a relationship root, but not a universal `WorkRelationship` read model or invariant bundle yet.
- Some relationship sync still starts from `members`, which keeps `members` functionally heavier than the target doctrine.

### Current work classification

Observed anchor:

- `src/lib/account-360/current-work-classification.ts`

What exists:

- Current work classification resolves active state from `person_legal_entity_relationships` plus active contractor engagement.
- It explicitly treats `member.contract_type` as employment history rather than current state.
- It returns employee, contractor, or none/history classification.

Gap:

- It is a good resolver, but still narrower than the proposed foundation.
- It does not yet produce a full relationship + assignment + compensation + compliance + payment rail projection.
- It should be treated as a core ingredient, not the whole foundation.

### Activation and readiness

Observed anchors:

- `src/lib/workforce/activation/readiness.ts`
- `greenhouse_hr.work_relationship_onboarding_cases`
- `greenhouse_hr.work_relationship_offboarding_cases`

What exists:

- Activation readiness already has lanes for identity/access, work relationship, employment, role/title, compensation, legal profile, payment profile, operational integrations, operational onboarding and contractor engagement.
- Onboarding/offboarding cases already carry profile, member, relationship, legal entity, organization, space, snapshots, start/end dates, rule lanes and execution mode.

Gap:

- Readiness is close to the target spine, but it is not yet the shared foundation read model.
- Some readiness logic remains member-centered and route/workflow-specific.
- There is no unified activation command for person + relationship + assignment + compensation, and there should not be one until read-only parity is proven.

### Compensation

Observed anchors:

- `greenhouse_payroll.compensation_versions`
- `src/types/hr-contracts.ts`
- payroll compensation readers/builders

What exists:

- Compensation is versioned and dated.
- Contract/pay regime/payroll rail tuple constraints exist and are validated in live dev DB.
- The tuple taxonomy now supports Chile/internal (`indefinido`, `plazo_fijo`, `honorarios`) and international (`contractor`, `eor`, `international_internal`) variants.

Gap:

- Compensation is still scoped to `member_id`, not explicitly to relationship/assignment.
- There is no unified `CompensationProfile` projection with total comp, target/direct comp, fixed/variable facets and relationship context.
- Payroll output and contractor payables remain safely separate, but the shared compensation history view is still missing.

### Contractor engagements and payables

Observed anchors:

- `src/lib/contractor-engagements/self-service-projection.ts`
- `src/lib/contractor-engagements/hr-workbench-projection.ts`
- `src/lib/sync/projections/contractor-payable-finance-obligation.ts`
- `greenhouse_hr.contractor_engagements`
- `greenhouse_hr.contractor_payables`

What exists:

- Contractor self-service and HR workbench projections compose engagement, submissions, payables, invoice assets, payment profiles and readiness.
- Contractor payable to Finance bridge creates `payment_obligations` from ready contractor payables.
- Contractor operations are intentionally separate from payroll entries and final settlements.

Gap:

- Live dev has only one contractor engagement and no contractor payables, so projection patterns are architecturally strong but lightly populated.
- Contractor projection is local to contractor surfaces; it is not yet merged into a common workforce journey.
- Payment rail lineage should be visible from the person/relationship view, not only from contractor workbench or Finance.

### Finance and payment obligations

Observed anchors:

- `src/lib/finance/payment-obligations/materialize-payroll.ts`
- `src/lib/sync/projections/payment-obligations-from-payroll.ts`
- `src/lib/sync/projections/contractor-payable-finance-obligation.ts`
- `src/lib/finance/payment-orders/payroll-status-reader.ts`
- `greenhouse_finance.payment_obligations`
- `greenhouse_finance.beneficiary_payment_profiles`

What exists:

- Payroll and contractor payables feed Finance through `payment_obligations`.
- Payment Orders and payment status are downstream of obligations.
- There is an explicit TODO/gap in payroll obligation materialization around `space_id` until a canonical resolver emerges.

Gap:

- Finance can pay obligations, but the shared workforce source lineage is incomplete.
- A unified foundation should provide stable person, relationship, assignment, space and rail context for obligations.
- This would reduce ad hoc null/default behavior such as `space_id NULL` in payroll-derived obligations.

### Reliability/control plane

Observed anchors:

- `src/lib/reliability/queries/*`
- `src/lib/reliability/get-reliability-overview.ts`

What exists:

- Greenhouse already has reliability signals for identity relationship drift, payroll tuple drift, contractor double rail, contractor payable issues, offboarding, role/title and other control-plane checks.

Gap:

- There is no unified workforce foundation signal bundle yet.
- Needed signals include relationship coverage, active member without relationship, relationship without classification, compensation without relationship, rail without evidence, obligation without workforce lineage and agent-context readiness.

## Live Dev PostgreSQL Findings

Environment checked through `pnpm pg:doctor`:

- GCP CLI and ADC healthy.
- Database user/database: `greenhouse_app`.
- Instance: `efeonce-group:us-east4:greenhouse-pg-dev`.
- Schemas available include `greenhouse_core`, `greenhouse_hr`, `greenhouse_payroll`, `greenhouse_finance`, `greenhouse_serving`, `greenhouse_sync`.
- Superadmin session baseline healthy.

### Relevant row counts

| Area | Table/view | Count |
| --- | --- | ---: |
| Core | `greenhouse_core.identity_profiles` | 165 |
| Core | `greenhouse_core.members` | 146 |
| Core | `greenhouse_core.person_memberships` | 155 |
| Core | `greenhouse_core.person_legal_entity_relationships` | 11 |
| HR | `greenhouse_hr.contractor_engagements` | 1 |
| HR | `greenhouse_hr.contractor_payables` | 0 |
| HR | `greenhouse_hr.contractor_work_submissions` | 0 |
| HR | `greenhouse_hr.work_relationship_onboarding_cases` | 2 |
| HR | `greenhouse_hr.work_relationship_offboarding_cases` | 4 |
| Payroll | `greenhouse_payroll.compensation_versions` | 14 |
| Payroll | `greenhouse_payroll.payroll_entries` | 16 |
| Payroll | `greenhouse_payroll.payroll_periods` | 3 |
| Finance | `greenhouse_finance.payment_obligations` | 14 |
| Finance | `greenhouse_finance.payment_orders` | 8 |
| Finance | `greenhouse_finance.payment_order_lines` | 10 |
| Finance | `greenhouse_finance.beneficiary_payment_profiles` | 15 |
| Serving | `greenhouse_serving.person_360` | 164 |

### Member contract tuple distribution

Active members:

- `international_internal / international / internal`: 5
- `contractor / international / deel`: 4
- `honorarios / chile / internal`: 3
- `indefinido / chile / internal`: 2

Inactive members:

- `indefinido / chile / internal`: 132

Interpretation:

- `members` still contains the broad operational roster.
- The current contract tuple matrix is coherent, but it is still a member-level compatibility representation.

### Relationship distribution

- `employee / active`: 8
- `contractor / active`: 1
- `employee / ended`: 1
- `shareholder_current_account_holder / active`: 1

Interpretation:

- The relationship table already models more than employment, which supports a generalized relationship concept.
- It is not yet populated enough to replace member-derived assumptions.

### Active relationship coverage anomaly

Live query found 5 active demo international/internal members with no active employee or contractor relationship:

- Demo Ana Internacional
- Demo Carlos Internacional
- Demo Juan Internacional
- Demo Maria Internacional
- Demo Pedro Internacional

Interpretation:

- This may be intentional demo data, but it proves the migration gap class.
- A future `workforce.relationship_coverage` reliability signal should distinguish demo/fixture tolerated gaps from real production drift.

### Contractor engagement state

Live dev has one contractor engagement:

- subtype: `honorarios_cl`
- payroll rail: `internal`
- status: `draft`
- classification risk: `needs_review`

Interpretation:

- The contractor aggregate exists and is wired, but current data volume is not enough to prove general-purpose workforce reporting.
- This argues for read-only parity and reliability work before write-path convergence.

### Compensation tuple drift

Live query returned zero current compensation tuple drift at the time of research.

Interpretation:

- Recent remediation appears directionally successful in dev.
- The lack of drift now does not remove the architectural need; it shows that local symptoms can be fixed while the broader source-of-truth question remains.

### Relevant constraints

Live constraints are validated for the key contract/payroll tuple checks:

- `members_contract_payroll_tuple_check`
- `compensation_versions_contract_pay_regime_check`
- `person_legal_entity_relationships_relationship_type_check`
- contractor engagement checks around payroll rail and relationship subtype
- payment obligation checks including `contractor_payable` source kind

Interpretation:

- The database has meaningful guardrails.
- Those guardrails validate local tuples and enums, but they do not yet enforce cross-domain workforce lineage.

### Payment obligations

Live distribution is payroll-heavy:

- payroll `employee_net_pay`, `paid`: 6
- payroll `provider_payroll`, `cancelled`: 3
- payroll `employee_withheld_component`, `generated/cancelled`: 3 total
- payroll `employer_social_security`, `generated/cancelled`: 2 total
- no live `contractor_payable` obligations yet

Interpretation:

- Finance bridge exists, but dev data does not yet exercise contractor payable obligations.
- The unified foundation should make payment obligation provenance explainable by person, relationship, assignment, compensation profile and rail.

## Contrast: What We Have vs What We Need

| Domain | What Greenhouse has | What Greenhouse needs before advancing |
| --- | --- | --- |
| Root identity | `identity_profiles`, `members`, Person 360, session/person projections. | Explicit rule that Person is the durable root for cross-domain workforce flows. |
| Work relationship | `person_legal_entity_relationships`, transition primitives, onboarding/offboarding cases. | Relationship coverage map, canonical resolver/projection, reliability signal for missing or conflicting coverage. |
| Current state | `resolveCurrentWorkClassification` from relationship + contractor engagement. | Wider projection: relationship + assignment + compensation + compliance + payment rail + redaction. |
| Assignment | Role/title, org, manager, department and assignment facets exist across member/Person 360/workforce areas. | A defined `WorkAssignment` concept that separates work scope from legal contract and payment rail. |
| Compensation | `compensation_versions` with tuple constraints and history. | `CompensationProfile` read model scoped to relationship/assignment or a declared composite, with total/current/history semantics. |
| Contractor rail | Engagements, self-service projection, HR workbench, payable bridge. | Contractor rail as a facet in the shared person journey, not only a separate contractor product surface. |
| Payroll rail | Payroll formulas, periods, entries, tuple governance, payment obligation materialization. | Payroll as a consumer/output rail of workforce context, not the source of current worker identity. |
| Finance rail | Payment obligations, payment orders, beneficiary profiles, payroll status reader. | Stable workforce lineage on obligations: person, relationship, assignment/space, compensation source and rail. |
| Readiness/compliance | Activation lanes, legal profile/payment profile readiness, contractor readiness. | One readiness view that is rail-specific internally but person-centered externally. |
| Reliability | Many domain signals already exist. | Workforce foundation signal bundle with steady-state expectations. |
| AI/agent substrate | Platform has enough structure for agent-safe readers later; Remote-style market signal supports this. | A redacted, capability-aware workforce context projection; no agent should infer state table-by-table. |

## Recommended Iterative Path

Do not create implementation tasks until the architecture checkpoint is accepted or deliberately revised.

Recommended next sequence:

1. Architecture review of the ADR and this appendix.
2. Phase 0/1 task only if accepted: read-only workforce object map over current tables.
3. Add reliability signals for relationship coverage and cross-rail lineage before changing write paths.
4. Promote a read-only `workforce` facet into Person 360 after parity is proven.
5. Define `CompensationProfile` scope before moving any compensation write path.
6. Only then evaluate relationship-first activation or compensation-change commands.
7. Expose agent-safe context last, with field redaction, capabilities, audit and kill-switch.

## Non-Negotiables

- Do not rewrite payroll as part of the foundation.
- Do not merge contractor payables into payroll entries.
- Do not mutate `members.contract_type` to represent current contractor state.
- Do not treat payment provider IDs as person identity.
- Do not create UI surfaces before the read model and capability/redaction plan are clear.
- Do not let agents/Nexa/MCP infer workforce state from raw table heuristics.
- Do not open broad task batches from this document; use EPIC-017 intake one task at a time.

## Evidence Commands

Commands used in this appendix:

```bash
pnpm pg:doctor
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs
```

Codebase evidence was gathered with read-only file inspection across:

- `src/lib/person-360/`
- `src/lib/account-360/`
- `src/lib/workforce/`
- `src/lib/contractor-engagements/`
- `src/lib/payroll/`
- `src/lib/finance/`
- `src/lib/sync/projections/`
- `src/lib/reliability/queries/`

No runtime, migration or product code was changed for this research appendix.
