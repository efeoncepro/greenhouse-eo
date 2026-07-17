# ANAM RevOps Meeting Synthesis

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Sources:** ANAM meetings documented in Notion from 2025-11-07 through 2026-07-06, Maria Paz email threads, runtime schema and authenticated portal inspection
> **Purpose:** convert meeting history into an implementable RevOps contract without treating tentative discussion as approved schema

## Executive synthesis

The meetings converge on a five-object operating model:

```text
Contact -> Lead -> Company -> Deal -> Service
                               |        |
                               |        +-> contracted service, term, recurrence and renewal
                               +-> opportunity, quotation, award and commercial movement

Ticket -> request, claim, billing case, SLA and human resolution
```

The standard HubSpot `Service` object (`0-162`) is already active in ANAM. This resolves the main grain question discussed on 17 June: a Deal represents the commercial opportunity and a Service represents each adjudicated service or contract after the win. Company stores durable account facts; repeated quote components belong in line items or a governed quotation-scope model; Tickets store cases, not contracts.

## Decision trail

| Meeting period | Stable decision | Remaining ambiguity |
|---|---|---|
| 7-10 Nov 2025 | Separate Lead from Deal; Company is the customer; Growth and Retention need separate views. | Billing source of truth across SAP, Labware, Excel, HubSpot, Azure and Power BI. |
| 9 Mar 2026 | Monthly KPI cadence; UF primary and CLP auxiliary; Service & Contracts owns recurrence and retention. | Final region and sector definitions; backlog and billing sources. |
| 18 Mar-24 Apr 2026 | `tipo_de_ingreso` lives on Deal; Growth = new and expansion; Retention = renewal and contraction; quoted versus awarded amount is required. | A single-select cannot encode compound expansion cases without a secondary grain. |
| 3-10 Jun 2026 | Commercial and retention vocabularies were discussed; technical quotation requires service-specific questions; historical AI classification needs human validation. | Final separation between income type and retention movement. |
| 17 Jun 2026 | Standard `Service` is the post-award service/contract grain; Deal is the requested/quoted service; renewal automation starts from Service. | Final Service dictionary, associations and migration from operational sources. |
| 19 Jun-6 Jul 2026 | Data adoption precedes trustworthy dashboards; first reports are sales by type and rep; deterministic handoffs and training are required. | Unique billing key, service-engineer targets, market-size dataset and EDP source. |

## Canonical business definitions

- **Venta nueva:** first sale to a new customer or to a branch/unit not previously served.
- **Upsell:** more revenue from the same service for an existing account.
- **Cross-sell:** a different service sold to an existing account.
- **Renovación:** continuation under materially comparable prior conditions.
- **Down-sell:** retention movement on a renewal/continuation with lower comparable quantity or value; it is not an income type.
- **Churn:** loss or non-renewal; it is not an income type.
- **Variación vs. cotizado:** comparison of awarded amount with quoted amount: `Igual`, `Mayor`, `Menor`.

`Down-sell` is not a first sale awarded below quote. That case belongs to `Variación vs. cotizado`. It is also not churn because continuity remains.

## Target object ownership

| Object | Grain and source role | Primary reporting enabled |
|---|---|---|
| Contact | Person and relationship/role with ANAM or a Company. | Stakeholder coverage, channel and handoff. |
| Lead | Pre-opportunity prospecting/qualification. | Lead volume and lead-to-opportunity conversion. |
| Company | Durable legal/account identity, parent-child hierarchy, sector and headquarters geography. | Account penetration, sector and portfolio concentration. |
| Deal | One commercial opportunity: process, quote, award, owner and primary income classification. | Pipeline, win rate, cycle, quoted/awarded value and Growth/Retention proxy. |
| Line item | Quoted components, service lines, quantities, frequency and recurring commercial detail. | Quote composition and compound opportunity analysis. |
| Service (`0-162`) | One adjudicated/contracted service associated to Company and originating Deal. | Active services, contract expiry, recurrence, renewal cohort, GRR/NRR once values are complete. |
| Ticket | One support, quality, claim, billing or administrative case with SLA and resolution. | Volume, SLA, aging, escalation and reopen rate. |

## Runtime Service readback

Authenticated inspection found:

- one Service record: `Muestreo y Análisis de agua - nestlé`;
- Company association to Nestlé, but no originating Deal association;
- default English pipeline stages `New`, `In progress`, `Closed`, without stage rules;
- 43 properties, with two custom properties: `fecha_de_vencimiento_del_contrato` and `monto_original`, both at zero coverage;
- standard fields for category, total cost, state, start date, target end date, close date, paid amount, remaining amount, pipeline, stage and owner;
- the sample record uses a mismatched category (`Incorporación a Marketing Hub`), so it is evidence of activation, not of an accepted production taxonomy.

The current CLI credential cannot read Service schema through API because it lacks `crm.objects.services.read`. The authenticated portal readback is therefore the evidence boundary for this inventory.

## Implemented low-risk reconciliation and correction

With explicit operator authorization, consumer inspection and runtime readback:

1. `variacion_contrato` was relabelled `Variación vs. cotizado`, documented, and its visible options changed to `Igual`, `Mayor`, `Menor`; internal values remain `Mismo valor`, `Mayor valor`, `Menor valor`.
2. `Down-sell` was briefly exposed and immediately returned to `hidden=true` after the operator clarified that it had intentionally been removed because it is not a type of income.
3. No Deal record, pipeline, requiredness rule, workflow or backfill was changed.

Current runtime has 1,240 Deals: Venta nueva 446, Upsell 141, Cross-sell 87, Renovación 234, Down-sell 0 and `variacion_contrato` populated on 0. The legacy Down-sell option remains hidden for compatibility.

## Structural implementation gates

Do not expand the schema until these decisions are closed:

1. **Compound opportunities:** retain one primary `tipo_de_ingreso` on Deal; represent components with line items and, only if reporting requires it, a separate governed expansion mechanism.
2. **Service contract:** define Service category, contract external ID, originating Deal association, comparable recurring value, currency/periodicity, start/end dates, owner and status.
3. **Billing sync:** approve source system, unique key, update semantics and whether billing execution enriches Service or uses a separate synchronized record grain.
4. **Geography:** Company region means legal/HQ geography; Deal zone means execution geography. Do not copy one blindly into the other.
5. **Sector:** ratify one strategic-sector catalog before backfill or market dashboards.
6. **Data ownership:** Maria Paz/Service & Contracts owns acceptance of contract and retention definitions; commercial owners validate historical Deal classification.

## Commercial-first dashboard sequence

1. Data Quality Control Tower: coverage, stale records, invalid combinations and readiness denominators.
2. Commercial Growth: new/upsell/cross-sell pipeline, win rate, amount, cycle and owner.
3. Service and contract portfolio: active services, expiry cohorts and renewal queue after Service backfill.
4. Retention: renewal, expansion, contraction/Down-sell and churn from comparable Services.
5. Loyalty: preventive activity, relationship coverage, risk and upcoming renewals.
6. Operational/billing: only after the commercial lifecycle is stable; Ticket SLA and synchronized billing backlog require an approved source contract.

## Next implementation slice

Follow [`anam-commercial-first-operating-model-2026-07-16.md`](anam-commercial-first-operating-model-2026-07-16.md). Audit Lead and line items, then prepare the Company/Contact/Deal/Service commercial data dictionary and migration dry-run. Ticket and billing expansion follows after the commercial lifecycle is stable.
