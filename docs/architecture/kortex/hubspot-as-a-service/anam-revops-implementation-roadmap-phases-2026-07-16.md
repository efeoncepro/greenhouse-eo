# ANAM RevOps Implementation Roadmap by Phase

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** canonical delivery sequence
> **Priority:** Commercial first; Operations second

> **Client boundary:** ANAM is an Efeonce client. This roadmap governs work in ANAM's HubSpot portal; it does not define a Greenhouse product capability, tenant dashboard or Efeonce CRM dataset.

The consolidated backlog after the 2026-07-17 pipeline rollout lives in
[`anam-open-work-and-exit-gates-2026-07-17.md`](anam-open-work-and-exit-gates-2026-07-17.md). It is the current
source for priorities, owners, approvals and definition of done; this roadmap continues to own phase sequencing.

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
| 0. Customer Agent and landing | Resolve documented demand and gather context before human handoff. | Live landing, configured agent, Markdown knowledge, QA and Maria Paz handoff. | Configuration complete; runtime blocked by ANAM billing administration until credit usage and a new conversation are verified. |
| 1. Commercial reporting foundation | Turn already-ratified business definitions into trustworthy current-state reports. | Existing-report inventory, Data Quality control tower and Commercial Growth dashboard. | Complete: Data Quality, Growth, Renewal proxy, Q1-Q2 queue and exact-stage outcome reporting are published and verified. |
| 2. Catalog and sale composition | Confirm what each Deal sold without relying on uncontrolled free text. | Product/line-item mapping and governed service-family catalog. | Minimum mapping is sufficient: 505/506 line items reference Products and all 220 Closed Won line items resolve to known Products. Full catalog rebuild is deferred. |
| 3. Service and contract portfolio | Represent each awarded service after the Deal is won. | Approved Service dictionary, controlled pilot and activation review. | Pilot live: group + 10 properties, association labels, five controlled Services and activation-review workflow are live/read back. Synthetic activation inputs make the five calculate `fields_ready` for QA only; ANAM ratification and historical migration remain pending/`NO-GO`. |
| 4. Renewal automation | Create a controlled path from expiring Service to renewal Deal and renewed Service. | Expiry queue, owner tasks, renewal linkage and exception handling. | Pipeline foundation live: semantic stages, `Por revisar` entry rule and stage gates. Service-triggered creation, lineage and owner-task workflow remain blocked by Phase 3 facts/materializer. |
| 5. Commercial management dashboards | Measure portfolio, renewal, Retention and Loyalty from reliable Services. | Service portfolio, Renewal, Retention and Loyalty dashboards. | Pilot live: Retention has four verified reports and Fidelización three. They use five synthetic-marked QA Services and are not official; production KPIs remain blocked by ratified coverage, periods and denominators. |
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

Post-close data-quality slice: Company `segmento_de_mercado_anam` and headquarters region are live/read back on
471 exact/unique Companies; 65 of those also have a direct conservative strategic-sector mapping. This enables
Company composition analysis but does not reopen or invalidate the Phase 1 close. Three separately approved
historical diagnostics are now live in Growth: segment `340896790`, strategic sector `340897291` and HQ region
`340897635`. Their titles say `histórico parcial`, their exact cohort is `Ganado` plus a known dimension and they
report Deal commercial value rather than invoicing. Official revenue by segment, sector or region remains gated
because only 629/1,240 Deals have a Company association; official publication requires >=95% eligible
Deal-to-Company and dimension coverage. Execution/rollback contract:
[`anam-sector-geography-kpi-slice-change-set-2026-07-16.md`](anam-sector-geography-kpi-slice-change-set-2026-07-16.md).
The first association-remediation slice is also complete: after exact-table approval, the 34 explicit Contact-chain
pairs were imported as Primary and read back 34/34; 113 domain-only candidates still require manual review and 498
remain held. Global coverage is only 50.73%, so owner-led remediation remains an operating program rather
than a one-shot backfill. Canon:
[`anam-deal-company-association-remediation-dry-run-2026-07-16.md`](anam-deal-company-association-remediation-dry-run-2026-07-16.md).

## Phase 2 - Catalog and sale composition

Products are checked only to explain the content of a sale. If the 22 Products and 506 line items already provide stable identity and service-family mapping, they are reused without mutation. Any ambiguity is quarantined and presented for approval; this phase must not become a catalog rebuild by default.

The live readback confirms that the minimum mapping is already usable: 505 of 506 line items reference a Product and all 220 Closed Won line items resolve to known Products. Full Product cleanup, renaming or creation is therefore deferred as standalone work rather than blocking the panels.

## Phase 3 - Service and contract portfolio

Deal remains the commercial opportunity. Native Service (`0-162`) becomes the awarded service/contract grain. A Deal can produce more than one Service when it contains multiple awarded components. No schema or Service records are created until the dry run proves deterministic identity, associations, dates, owner, currency and comparable value.

The panel-first contract and live no-write evidence are documented in [`anam-phase-3-panel-first-service-readiness-2026-07-16.md`](anam-phase-3-panel-first-service-readiness-2026-07-16.md). The governed award/activation gates, TCV/ARR semantics and minimal property design are documented in [`anam-phase-3-forward-service-capture-contract-2026-07-16.md`](anam-phase-3-forward-service-capture-contract-2026-07-16.md). The dedicated Service group and ten properties are live/read back. The separately approved five-record forward pilot was subsequently executed, associated and enrolled in activation review; marked synthetic facts make its records `fields_ready` for QA only. The historical cohort still has zero fully migration-ready line items without inference, so bulk backfill remains `NO-GO` and the next Service work is ANAM ratification plus a deterministic per-line-item materializer—not another blind pilot.

The five-row simulation in [`anam-phase-3-forward-pilot-dry-run-2026-07-16.md`](anam-phase-3-forward-pilot-dry-run-2026-07-16.md) proved the award projection. With separate operator approvals, those exact rows became the controlled pilot recorded in [`anam-phase-3-forward-pilot-execution-2026-07-16.md`](anam-phase-3-forward-pilot-execution-2026-07-16.md), entered the activation-review workflow and received conspicuously marked synthetic activation inputs for panel QA. They now calculate `fields_ready`, but they are still not an ANAM-ratified portfolio cohort or authorization for backfill. Current dashboard evidence and rollback boundary live in [`anam-phase-3-pilot-dashboard-execution-2026-07-16.md`](anam-phase-3-pilot-dashboard-execution-2026-07-16.md).

## Phase 4 - Renewal automation

An expiring Service creates a review queue and owner task. A renewal Deal is opened or linked only under approved rules. Winning it creates a new Service linked to the prior Service; historical Services are never overwritten. Automation must not mark a renewal won or invent value.

The 2026-07-17 governance slice completed the Deal-side foundation without claiming Service automation: the
same Renewal stage IDs now express `Por revisar`, eligibility, contact, negotiation and the three terminal
outcomes; normal creation is limited to `Por revisar`; open stages require `Paso siguiente`; positive/negative
outcomes require geography or loss reason. Growth received equivalent capture gates while `Radar 0%` remained
unchanged because pre-qualification belongs to Lead. The eight owner-task actions remain designed but
unpublished until their due-date/notification/dedupe contract and a future-entry test are approved. Canon:
[`anam-commercial-pipeline-governance-change-set-2026-07-17.md`](anam-commercial-pipeline-governance-change-set-2026-07-17.md).

## Phase 5 - Commercial management dashboards

This phase adds views that cannot be trusted from Deal classification alone:

- active Service portfolio and expiry cohorts;
- renewal pipeline and amount at risk;
- Retention outcomes: expanded, stable, contracted and lost;
- GRR/NRR only with a complete renewable cohort and comparable money;
- Loyalty as preventive relationship/activity/risk signals, not another name for Retention.

The pilot surface is now live: Retention dashboard `21152855` has four verified reports and Fidelización `21152950` has three. These prove report construction and formula behavior, not production measurement. Their inputs are explicitly synthetic-marked, the five-row sample is not a complete renewable cohort and no GRR/NRR, NPS or deterministic health score is claimed. Removing `(PILOTO)` requires ANAM-ratified Service facts plus reconciled coverage, periods and denominators.

## Meeting-to-phase reconciliation checkpoint

The next continuation must begin with a live Notion review of ANAM meetings and linked tasks in the evidenced 2025-11-07 through 2026-07-06 window plus any newer ANAM pages. The agent must map each stable decision, tentative note, completed/open task and superseded item to a phase, compare it with runtime evidence and state the remaining gap and approval owner. The local meeting synthesis is an index, not a replacement for live Notion. This checkpoint is read-only: no HubSpot or Notion mutation is authorized by the review itself.

## Phase 6 - Tickets and operational cases

Tickets represent human work: service follow-up, Quality, claims, billing inquiries and administrative requests requiring action. They receive type, subtype, priority, owner, SLA, resolution and associations. Informational questions resolved by the Customer Agent do not need a Ticket by default.

## Phase 7 - Billing integration

Each source item is a billing event, not a Company/Deal property and not a customer Ticket. The primary designed intake is an authenticated managed surface backed by private assets/GCS and a tenant-scoped `client_billing_*` control plane; SharePoint is an optional source adapter. The next construction slice is a no-write profiler. Historical import begins only after unique identity, Account Unit/Company/Service/Deal association, currency rules, reconciliation totals, idempotency and rollback pass review and explicit approval.

## Phase 8 - Governance and continuous improvement

Every property, workflow, report and knowledge source needs an owner, definition, capture point, quality rule and review cadence. Changes enter through inventory, impact assessment, approval, execution and readback. No email, meeting note or isolated data error is direct authorization for schema or record mutation.

## Hard boundaries

- Do not modify or merge the duplicate ANAM Company records; they are an out-of-scope CRM data error.
- Do not expose Down-sell in `tipo_de_ingreso`; it is a Retention movement.
- Do not publish GRR/NRR from Deal labels alone.
- Do not create duplicate Product, Quote, Company or Service fields before checking native capabilities and consumers.
- Do not import Billing Events before the documented no-go gates close.
