# ANAM Commercial-First HubSpot Operating Model

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** canonical objective, gap map and implementation sequence
> **Priority:** Commercial first; Operations second

## Primary client objective

ANAM is not buying isolated properties, dashboards or a chatbot. The objective is to operate one customer and revenue lifecycle in HubSpot where clients, the Customer Agent, commercial executives, Services and Contracts, Quality and Administration share context, ownership and measurable outcomes.

```text
need -> resolution/qualification -> quotation -> award -> contracted service
     -> follow-up/support -> loyalty -> renewal/expansion/contraction/churn
```

HubSpot is the coordination and system-of-record layer. The Customer Agent resolves documented, repeatable demand and gathers context; people retain commercial judgment, commitments, relationship management, investigations and sensitive actions. Dashboards are projections of that operation, not substitutes for it.

## Delivery order

### 1. Commercial enablement

Close the lifecycle from demand to awarded revenue and make Growth, Retention and Loyalty commercially actionable.

1. Company and Contact identity/associations.
2. Lead qualification and Deal creation.
3. Deal stages, quotation scope, quoted and awarded value.
4. Product/line-item service catalog.
5. Closed-won Deal -> associated Service.
6. Service expiry -> renewal Deal -> renewed Service lineage.
7. Commercial data-quality, Growth, Retention and Loyalty dashboards.

### 2. Operations enablement

Once the commercial contract is stable, connect delivery and exceptions without changing commercial definitions.

1. Ticket taxonomy for Quality, claims, billing, administration and follow-up.
2. Queues, owners, SLAs, escalation and resolution.
3. Billing/EDP synchronization with an approved source and unique key.
4. Service execution, rejection aging and operational dashboards.
5. Customer Agent operational intents and handoffs connected to the correct Ticket/Service.

Operations may supply commercial risk signals early, but it must not drive the initial schema sequence.

## Current object inventory

| Object | Current evidence | Readiness |
|---|---|---|
| Contact | 8,859 records; 406 properties; 6 custom. | Identity exists; relationship roles and adoption need review. |
| Company | 1,023 records; 268 properties; 28 custom. | Account base exists; RUT, region, sector and hierarchy coverage are weak. |
| Deal | 1,240 records; 262 properties; 25 custom. | Strongest current object; taxonomy, stage integrity and value facts need reconciliation. |
| Service (`0-162`) | Active; 43 properties; 2 custom; one sample-like record. | Not yet a production contract portfolio. |
| Ticket | Legacy/default pipeline and no detected ANAM custom taxonomy. | Not ready for operational reporting. |
| Lead | Process discussed and required for lifecycle separation. | Runtime configuration/adoption not yet audited. |
| Product/line item | Required for service components and quotation scope. | Runtime catalog and usage not yet audited. |

## Current commercial facts

| Fact | Current state | Decision |
|---|---|---|
| Service line | `linea_de_negocio_anam`: 1,239/1,240 Deals. | Keep as current classifier pending catalog mapping. |
| Commercial process | `tipo_proceso_comercial_anam`: 1,229/1,240. | Keep and define stage ownership. |
| Income type | `tipo_de_ingreso`: 908/1,240. | Keep single-select; `Down-sell` stays hidden because it is not an income type. |
| Quote variance | `variacion_contrato`: 0/1,240. | Visible vocabulary reconciled; still needs quoted/awarded monetary facts. |
| Retention result | `resultado_de_retencion`: 12/1,240 and one dependent rule. | Do not retire or repurpose until its contract and consumers are inspected. |
| Legacy renewal | Boolean populated on 557 Deals. | Migrate only after target renewal model and exception queue are approved. |
| Execution geography | Deal `zona`: 399/1,240. | Keep distinct from Company legal/HQ region. |
| Contract/service facts | Service expiry and original amount exist with zero coverage. | Build the Service dictionary and migration dry-run. |

`Down-sell` is a retention movement: a continuing comparable contract/service whose renewed value or quantity is lower. It is not a type of income, not a first award below quotation and not churn. Current runtime keeps the legacy option hidden in `tipo_de_ingreso` to preserve compatibility without exposing it for capture.

## Missing commercial contracts

### Company and Contact

- normalized account/external identifier and governed RUT rule;
- parent/child coverage;
- legal/HQ region and strategic sector;
- associated Contact roles for decision-maker, technical, commercial and billing contacts.

### Deal and quotation

- final income-type taxonomy and capture stage;
- quoted amount, awarded amount, currency and UF/CLP normalization;
- line items for service, quantity, frequency and recurring detail;
- stage entry/exit rules and correction of the `Radar 0%` closed-state anomaly;
- originating intent/source and owner without duplicating native attribution.

### Service and renewal

- external contract/service ID;
- originating Deal and Company associations;
- service category/line and owner;
- start/end dates, periodicity, currency and comparable recurring value;
- prior/renewed Service lineage;
- renewal status and renewal Deal association;
- deterministic movement: expansion, no material change, contraction or churn.

Renewal is a Retention process. Its economic movement is a separate dimension. A renewal may be stable, expanded through upsell/cross-sell, contracted through Down-sell or lost as churn.

## Missing commercial automations

1. Agent/form/manual intake -> deduplicated Contact/Company and qualified Lead/Deal.
2. Stage gates with required facts and explicit exception handling.
3. Closed-won Deal -> Service creation/association.
4. Service expiry window -> renewal Deal and owner task.
5. Renewal outcome -> renewed Service lineage and calculated movement.
6. Data-quality queues for missing classifications, associations and monetary facts.
7. Customer Agent handoff with preserved commercial context, without automatic escalation for resolvable questions.

## Commercial dashboards

| Dashboard | Decisions enabled | Minimum denominator |
|---|---|---|
| Data Quality | Which reports are trustworthy and who must correct records? | Total eligible records by object/period. |
| Growth | Where do new and expansion revenue, pipeline and win rate come from? | Eligible Growth Deals with won/lost stages and normalized amount. |
| Retention | What renewable revenue was retained, expanded, contracted or lost? | Full renewable Service cohort with prior/current comparable value. |
| Loyalty | Which relationships and services need preventive action before renewal? | Active Service portfolio, expiry, activity, contacts and risk signals. |
| Quotation | Where is value gained or lost between quote and award? | Deals with both quoted and awarded values. |

Growth measures acquisition and expansion. Retention measures the economic renewal outcome. Loyalty measures the human and operational actions/signals that precede that outcome. These dashboards must not reuse one classification as if it answered all three questions.

## Operations second

After the commercial lifecycle is stable, implement:

- Ticket type/subtype, priority, SLA, owner, resolution and reopen reason;
- Service/Company/Contact associations on each case;
- Customer Agent resolution, escalation reason and handoff outcome;
- billing source, unique key and governed synchronization;
- operational workload, SLA, quality, billing backlog and rejection-aging dashboards.

The 16,898-row billing dataset must be brought into the HubSpot operating model to connect sold/awarded value with billable and invoiced actuals by Company. It must not be flattened into Deal, Company or customer Ticket: each SharePoint row is a billing event with a unique source ID, seven billing statuses and mixed CLP/UF/USD amounts, associated to Company and where possible to Service and originating Deal. Historical ingestion, currency normalization, incremental sync and the future Operations cutover require approval. Customer Tickets remain a separate grain for Service follow-up, Billing inquiries and Quality cases. See [`anam-email-attachment-synthesis-2026-07-16.md`](anam-email-attachment-synthesis-2026-07-16.md).

## Immediate next slice

Produce a commercial foundation change set, in this order:

1. Audit Lead, product/line-item and current dashboard runtime.
2. Approve the commercial data dictionary for Company, Contact, Deal and Service.
3. Define Deal -> Service -> renewal lineage and monetary normalization.
4. Prepare a no-write migration/backfill report with coverage and conflicts.
5. Implement schema and associations only after exact approval.
6. Build Data Quality and Growth first; Retention and Loyalty follow when Service data is sufficient.

No Ticket/billing schema expansion should pre-empt these commercial foundations.
