# ANAM RevOps Implementation Roadmap by Phase

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** canonical delivery sequence
> **Priority:** Commercial first; Operations second

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
| 1. Commercial reporting foundation | Turn already-ratified business definitions into trustworthy current-state reports. | Existing-report inventory, Data Quality control tower and Commercial Growth dashboard. | In progress: inventory, first DQ controls and current-quarter Growth are published; outcome semantics and bounded adoption remain. |
| 2. Catalog and sale composition | Confirm what each Deal sold without relying on uncontrolled free text. | Product/line-item mapping and governed service-family catalog. | Planned after Phase 1 baseline. |
| 3. Service and contract portfolio | Represent each awarded service after the Deal is won. | Approved Service dictionary and no-write Deal/line-item-to-Service dry run. | Proposal exists; not approved or executed. |
| 4. Renewal automation | Create a controlled path from expiring Service to renewal Deal and renewed Service. | Expiry queue, owner tasks, renewal linkage and exception handling. | Blocked by Phase 3. |
| 5. Commercial management dashboards | Measure portfolio, renewal, Retention and Loyalty from reliable Services. | Service portfolio, Renewal, Retention and Loyalty dashboards. | Growth begins in Phase 1; the rest is blocked by Service coverage. |
| 6. Tickets and operational cases | Connect customer cases to the right Company, Contact and Service. | Ticket taxonomy, routing, SLA, resolution and Customer Agent escalation evidence. | Planned after commercial foundations. |
| 7. Billing integration | Connect sold and contracted value with billing execution. | Governed Billing Event sync and billing/EDP dashboards. | Proposed; 16,898-row migration remains no-go. |
| 8. Governance and continuous improvement | Preserve data quality, adoption and conversational accuracy. | Owners, definitions, monitoring cadence, QA regressions and change control. | Runs across every phase. |

## Phase 0 - Customer Agent and landing

The agent and landing are already live and tested. Ongoing work is operational monitoring: autonomous resolution, necessary versus premature transfers, unresolved intents, handoff quality, knowledge freshness and credit consumption. It is not a blocker for the RevOps sequence.

## Phase 1 - Commercial reporting foundation

This phase does not reopen business definitions. Meetings and Notion tasks already establish Growth versus Retention, the income-type vocabulary, quote variance, growth-first reporting and the Q1-Q2 adoption commitment.

Phase 1 now does four things:

1. inventory the reports, workflows and forms already consuming the ratified properties;
2. measure current completeness and invalid combinations;
3. publish the Data Quality control tower;
4. publish the first Commercial Growth reports using current Deal facts, with visible caveats where stage or amount semantics remain imperfect.

Detailed execution contract: [`anam-phase-1-commercial-reporting-foundation-2026-07-16.md`](anam-phase-1-commercial-reporting-foundation-2026-07-16.md).

## Phase 2 - Catalog and sale composition

Products are checked only to explain the content of a sale. If the 22 Products and 506 line items already provide stable identity and service-family mapping, they are reused without mutation. Any ambiguity is quarantined and presented for approval; this phase must not become a catalog rebuild by default.

## Phase 3 - Service and contract portfolio

Deal remains the commercial opportunity. Native Service (`0-162`) becomes the awarded service/contract grain. A Deal can produce more than one Service when it contains multiple awarded components. No schema or Service records are created until the dry run proves deterministic identity, associations, dates, owner, currency and comparable value.

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
