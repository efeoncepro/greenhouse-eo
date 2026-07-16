# ANAM Phase 3 — Panel-first Service Readiness

> **Date:** 2026-07-16
> **Client:** ANAM, client of Efeonce
> **Client portal:** HubSpot `19893546`
> **Mode:** live read-only audit and dashboard contract design
> **Status:** panel contracts and forward-capture contract defined; historical Service migration `NO-GO`
> **HubSpot writes:** none

## Client-engagement boundary

This work is delivered by Efeonce for ANAM. ANAM owns its HubSpot portal, CRM records, business definitions and resulting dashboards. This engagement is not a Greenhouse product initiative, internal dashboard or Efeonce CRM dataset; any separate representation of ANAM in Greenhouse does not transfer ownership of the client's HubSpot data or make this portal work an internal capability.

Greenhouse stores the canonical engagement documentation, decisions, QA evidence and agent skills. Kortex provides only the approved, portal-scoped OAuth and executable integration path. Client records remain in ANAM's HubSpot portal and must not be copied into Greenhouse CRM, Finance, Income, Account 360 or product analytics.

## Decision

Phase 3 advances panel-first. A complete Product catalog rebuild is not a prerequisite: 505 of 506 line items already reference a Product, and all 220 line items attached to Closed Won Deals resolve to one of the 22 existing Products. Product identity is therefore sufficient for the current Service dry run; catalog mutation remains deferred.

The blocker is Service evidence. The live portal does not yet contain enough deterministic Company, dates, recurrence, renewal eligibility and lifecycle data to create a trustworthy historical Service portfolio or the final Retention and Loyalty panels.

## Dashboard contracts

### 1. Service and contract portfolio

**Question:** what awarded services are active, for whom, under which owner and for what total contract value?

- Grain: one native HubSpot Service (`0-162`) per awarded service component, normally one won Deal line item.
- Required eligibility: production Service with deterministic Company and originating Deal/line item.
- Measures: Service count and line-item TCV, always separated by original currency.
- Dimensions: service family, Company, owner and Service lifecycle stage.
- Presentation: KPI cards, family/owner distribution and an exact-record table.
- Current gate: the sole existing Service is sample-like and must not be presented as a client portfolio.

### 2. Expiry and renewal queue

**Question:** which active Services require action in the next 30, 60 or 90 days?

- Grain: active Service with target end date and reviewed renewal eligibility.
- Measures: expiring Service count and TCV by original currency; ARR only for a reviewed recurring/renewable cohort.
- Dimensions: expiry window, owner, family, Company and renewal status.
- Presentation: 30/60/90 KPI cards plus an actionable record table.
- Current gate: the existing Deal-based Renewal report remains explicitly a proxy until governed Service coverage exists.

### 3. Retention

**Question:** what happened to the complete renewable cohort?

- Grain: prior renewable Service linked to a reviewed outcome and, when renewed, to its successor Service.
- Outcomes: expanded, stable, contracted and lost.
- Measures: prior and renewed ARR for the same original currency and a complete reviewed recurring/renewable cohort.
- Presentation: cohort counts/value movements with the underlying lineage table.
- Current gate: no GRR/NRR and no churn claims until the renewable cohort is complete. `Down-sell` is not Deal income; it is a derived Retention movement.

### 4. Loyalty action queue

**Question:** which active customer relationships require preventive commercial attention?

- Grain: active Service associated to Company, owner and expiry, enriched only with reviewed activity/contact/risk signals.
- Measures: action-eligible Services by signal and owner; no synthetic health score.
- Presentation: prioritized action queue with reason, evidence, owner and next review date.
- Current gate: thresholds and the requested commercial-action program require ANAM ratification. Do not invent red/amber/green health.

## Live read-only audit

Readback cutoff: `2026-07-16T16:46:00Z`.

### Portal baseline

| Population | Count |
|---|---:|
| Products | 22 |
| Line items | 506 |
| Deals | 1,240 |
| Closed Won Deals | 494 |
| Closed Won Deals with line items | 219 |
| Closed Won line items | 220 |
| Native Services | 1 sample-like record |

### All line items

| Required fact | Coverage |
|---|---:|
| Product reference | 505 / 506 |
| Exactly one associated Deal | 501 / 506 |
| Amount | 506 / 506 |
| Currency | 506 / 506 |
| SKU | 103 / 506 |
| Billing frequency | 8 / 506 |
| Term | 7 / 506 |
| Start date | 6 / 506 |
| End date | 6 / 506 |

### Closed Won Service candidates

| Required fact | Coverage |
|---|---:|
| Known Product | 220 / 220 |
| Amount and currency | 220 / 220 |
| Deal with one unique Company | 186 / 220 |
| Billing frequency | 5 / 220 |
| Start date | 3 / 220 |
| End date | 3 / 220 |
| Fully migration-ready without inference | 0 / 220 |

Across all 494 Closed Won Deals, 254 have one unique associated Company and 240 have none. For 2026, 182 Deals are Closed Won, 68 contain line items and those Deals contribute 69 line items; 63 have one unique Company, four have frequency and two have both start/end evidence.

At the current Q3-to-date cutoff, the 13 Closed Won Deals contain no line items. The current outcome cohort therefore cannot seed Services.

### Manual-review examples, not migration approvals

Only two historical line items combine one unique Company, a known Product, amount/currency, frequency and start/end dates. They still do not prove Service lifecycle stage, renewal eligibility or reviewed revenue-model semantics.

| Line item | Deal | Company | Product | Amount | Frequency / term | Dates |
|---|---|---|---|---:|---|---|
| `28064204361` — DyCO - Paneles Sensoriales | `32126628695` — 1897 - Armony - Panel Grilla | `16891426189` | `1416492965` | CLF 390 | monthly / `P1M` | 2025-02-10 → 2025-03-10 |
| `54205090640` — M&A - Integral | `59087056546` — Frutícola Olmué - Nuevo tipo de objeto Deal | `53948682568` | `1416509971` | CLF 15.611 | monthly / `P12M` | 2026-06-01 → 2027-05-31 |

## Association readback lesson

HubSpot can return the same Company twice for a Deal through different association labels, for example `deal_to_company` and `deal_to_company_unlabeled`. Cardinality must deduplicate by associated object ID before classifying a Deal as multi-Company. Different association types pointing to the same Company are not two customers and must not be treated as an identity defect.

## Dry-run verdict

### `NO-GO`

- Historical bulk creation of Services.
- Final portfolio, expiry, Retention, churn, GRR/NRR or Loyalty panels.
- Inferring Service start/end from Deal close date.
- Inferring Service lifecycle, renewal eligibility or risk from Product name, Deal pipeline or amount.
- Product catalog rebuild, rename or record mutation.
- Correcting or merging ANAM's duplicate Company records; that separate client CRM data issue remains out of scope.

### `GO` for the next controlled slice

- Apply the governed forward-capture contract for new awarded Deals: line items, exactly one reviewed Company, dates, revenue model, billing-cadence evidence, Service stage, owner and renewal eligibility.
- Manually review the two strongest historical examples that contain Company, Product, amount/currency, frequency and dates; they are examples, not approved migration records.
- Ratify TCV as portfolio contract value and ARR as the recurring Retention comparison value.
- Rerun the Service dry run on the governed forward cohort.
- Propose Service schema only after a separate approval, then execute and read back before publishing final panels.
- Keep the existing Deal-based Renewal report labeled as a proxy until then.

Detailed next-slice contract: [`anam-phase-3-forward-service-capture-contract-2026-07-16.md`](anam-phase-3-forward-service-capture-contract-2026-07-16.md).

## Safety and evidence

The audit used the Kortex portal-scoped runtime only for live readback. It created no properties, Services, reports, workflows, pipelines or record updates in HubSpot. It copied no ANAM client data into Greenhouse runtime or business datasets.
