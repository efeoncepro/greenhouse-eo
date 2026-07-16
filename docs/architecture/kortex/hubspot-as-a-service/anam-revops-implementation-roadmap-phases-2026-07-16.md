# ANAM RevOps Implementation Roadmap by Phase

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** canonical delivery sequence
> **Priority:** Commercial first; Operations second

> **Client boundary:** ANAM is an Efeonce client. This roadmap governs work in ANAM's HubSpot portal; it does not define a Greenhouse product capability, tenant dashboard or Efeonce CRM dataset.

## Outcome

HubSpot must connect the complete ANAM lifecycle:

```text
demand -> opportunity -> quotation -> award -> contracted Service
       -> delivery/support -> billing -> renewal/expansion/contraction/churn
```

The phases below are delivery increments, not separate projects. Each phase must leave an operable result, measured evidence and a clear gate for the next phase.

## Phase map

| Phase | Purpose | Principal output | Current state |
|---|---|---|---|
| 0. Customer Agent and landing | Resolve documented demand and gather context before human handoff. | Live landing, configured agent, Markdown knowledge, QA and Maria Paz handoff. | Complete; monitor in operation. |
| 1. Commercial reporting foundation | Turn already-ratified business definitions into trustworthy current-state reports. | Existing-report inventory, Data Quality control tower and Commercial Growth dashboard. | Complete: Data Quality, Growth, Renewal proxy, Q1-Q2 queue and exact-stage outcome reporting are published and verified. |
| 2. Catalog and sale composition | Confirm what each Deal sold without relying on uncontrolled free text. | Product/line-item mapping and governed service-family catalog. | Minimum mapping is sufficient: 505/506 line items reference Products and all 220 Closed Won line items resolve to known Products. Full catalog rebuild is deferred. |
| 3. Service and contract portfolio | Represent each awarded service after the Deal is won. | Approved Service dictionary and no-write Deal/line-item-to-Service dry run. | In progress, panel-first/read-only: panel contracts are defined; historical migration is `NO-GO` because Company, dates, recurrence and renewal facts are incomplete. |
| 4. Renewal automation | Create a controlled path from expiring Service to renewal Deal and renewed Service. | Expiry queue, owner tasks, renewal linkage and exception handling. | Blocked by Phase 3. |
| 5. Commercial management dashboards | Measure portfolio, renewal, Retention and Loyalty from reliable Services. | Service portfolio, Renewal, Retention and Loyalty dashboards. | Panel contracts are defined; publication is blocked by real Service coverage, not Product identity. |
| 6. Tickets and operational cases | Connect customer cases to the right Company, Contact and Service. | Ticket taxonomy, routing, SLA, resolution and Customer Agent escalation evidence. | Planned after commercial foundations. |
| 7. Billing integration | Connect sold and contracted value with billing execution. | Governed Billing Event sync and billing/EDP dashboards. | Proposed; 16,898-row migration remains no-go. |
| 8. Governance and continuous improvement | Preserve data quality, adoption and conversational accuracy. | Owners, definitions, monitoring cadence, QA regressions and change control. | Runs across every phase. |

## Phase 0 - Customer Agent and landing

The agent and landing are already live and tested. Ongoing work is operational monitoring: autonomous resolution, necessary versus premature transfers, unresolved intents, handoff quality, knowledge freshness and credit consumption. It is not a blocker for the RevOps sequence.

## Phase 1 - Commercial reporting foundation

This phase does not reopen business definitions. Meetings and Notion tasks already establish Growth versus Retention, the income-type vocabulary, quote variance, growth-first reporting and the Q1-Q2 adoption commitment.

Phase 1 delivered four things:

1. inventory the reports, workflows and forms already consuming the ratified properties;
2. measure current completeness and invalid combinations;
3. publish the Data Quality control tower;
4. publish the first Commercial Growth reports using current Deal facts, with visible caveats where stage or amount semantics remain imperfect.

Detailed execution contract: [`anam-phase-1-commercial-reporting-foundation-2026-07-16.md`](anam-phase-1-commercial-reporting-foundation-2026-07-16.md).

## Phase 2 - Catalog and sale composition

Products are checked only to explain the content of a sale. If the 22 Products and 506 line items already provide stable identity and service-family mapping, they are reused without mutation. Any ambiguity is quarantined and presented for approval; this phase must not become a catalog rebuild by default.

The live readback confirms that the minimum mapping is already usable: 505 of 506 line items reference a Product and all 220 Closed Won line items resolve to known Products. Full Product cleanup, renaming or creation is therefore deferred as standalone work rather than blocking the panels.

## Phase 3 - Service and contract portfolio

Deal remains the commercial opportunity. Native Service (`0-162`) becomes the awarded service/contract grain. A Deal can produce more than one Service when it contains multiple awarded components. No schema or Service records are created until the dry run proves deterministic identity, associations, dates, owner, currency and comparable value.

The panel-first contract and live no-write evidence are documented in [`anam-phase-3-panel-first-service-readiness-2026-07-16.md`](anam-phase-3-panel-first-service-readiness-2026-07-16.md). The current historical cohort has zero fully migration-ready line items without inference, so the next slice is governed forward capture plus manual review—not bulk backfill.

## Phase 4 - Renewal automation

An expiring Service creates a review queue and owner task. A renewal Deal is opened or linked only under approved rules. Winning it creates a new Service linked to the prior Service; historical Services are never overwritten. Automation must not mark a renewal won or invent value.

## Phase 5 - Commercial management dashboards

This phase adds views that cannot be trusted from Deal classification alone:

- active Service portfolio and expiry cohorts;
- renewal pipeline and amount at risk;
- Retention outcomes: expanded, stable, contracted and lost;
- GRR/NRR only with a complete renewable cohort and comparable money;
- Loyalty as preventive relationship/activity/risk signals, not another name for Retention.

## Phase 6 - Tickets and operational cases

Tickets represent human work: service follow-up, Quality, claims, billing inquiries and administrative requests requiring action. They receive type, subtype, priority, owner, SLA, resolution and associations. Informational questions resolved by the Customer Agent do not need a Ticket by default.

## Phase 7 - Billing integration

Each external SharePoint row is a billing event, not a Company/Deal property and not a customer Ticket. Historical import begins only after unique identity, Company/Service/Deal association, currency rules, reconciliation totals and incremental-update semantics pass a no-write dry run.

## Phase 8 - Governance and continuous improvement

Every property, workflow, report and knowledge source needs an owner, definition, capture point, quality rule and review cadence. Changes enter through inventory, impact assessment, approval, execution and readback. No email, meeting note or isolated data error is direct authorization for schema or record mutation.

## Hard boundaries

- Do not modify or merge the duplicate ANAM Company records; they are an out-of-scope CRM data error.
- Do not expose Down-sell in `tipo_de_ingreso`; it is a Retention movement.
- Do not publish GRR/NRR from Deal labels alone.
- Do not create duplicate Product, Quote, Company or Service fields before checking native capabilities and consumers.
- Do not import Billing Events before the documented no-go gates close.
