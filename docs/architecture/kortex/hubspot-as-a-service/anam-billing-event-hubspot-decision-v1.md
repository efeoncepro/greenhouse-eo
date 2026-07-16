# ANAM Billing Event -> HubSpot Decision V1

> **Status:** Proposed
> **Date:** 2026-07-16
> **Owner:** ANAM Administration/Billing + Service & Contracts + Commercial, operated by Efeonce RevOps
> **Scope:** HubSpot portal `19893546`, SharePoint billing ledger, Company, Deal, Service, reporting and migration
> **Reversibility:** two-way-but-slow
> **Confidence:** medium
> **Validated as of:** 2026-07-16

## Context

ANAM records the operational billing workflow outside HubSpot in a Microsoft/SharePoint List. The reviewed export contains 16,898 unique rows with Company identity, quotation/EDP, service period, net amount, currency, billing status, invoice reference and operational ownership.

The business objective is to connect what Commercial sold and awarded with what Operations delivered, marked billable and invoiced:

```text
Company -> Deal -> Service -> Billing Event
```

HubSpot Tickets remain customer cases with SLA. A billing inquiry can be a Ticket; the operational row that carries the amount is a Billing Event.

This decision is required because the work changes billing semantics, source of truth, CRM schema, historical backfill, external synchronization and reporting.

## Decision

### Proposed target

Create a HubSpot custom object with singular label `Evento de facturación` and plural label `Eventos de facturación` as the operational CRM representation of one source ledger item.

This target is supported by live portal evidence, not only by design assumption. On 16 July 2026 HubSpot returned a custom-object-type limit of 10, usage of 0 and percentage of 0% for ANAM. The Kortex project already declared `crm.schemas.custom.write` as a conditional scope; ANAM reconsented to that scope and its runtime installation now has 109 granted scopes. The object must still pass final schema approval and Kortex release-candidate controls before creation.

Each Billing Event must:

- be idempotently keyed by an immutable composite source key;
- preserve source amount, source currency and source status;
- associate directly to Company;
- associate to Service and originating Deal only when matching is deterministic;
- preserve source timestamps, source version/hash and synchronization timestamps;
- expose match status/confidence and never silently force an ambiguous association.

Invoices and Commerce Payments may be added later as native projections when ANAM needs those HubSpot commerce experiences. They do not replace the Billing Event grain.

### Object chain

| Object | Grain | Business owner |
|---|---|---|
| Company | Legal/account or governed ANAM operating unit. | Commercial / account governance. |
| Deal | One opportunity, quotation and award. | Commercial. |
| Line item | One quoted service component, quantity, frequency and price. | Commercial. |
| Service | One awarded service/contract scope with term and renewal lineage. | Service & Contracts. |
| Billing Event | One operational EDP/facturation-list item and its current workflow state. | Administration/Billing. |
| Ticket | One customer request, billing inquiry, appeal, complaint or follow-up case. | Service/Quality/Billing queue. |

### Identity

```text
source_key = ANAM-BILL:<sharepoint-site-or-tenant>:<list-id>:<item-id>
```

The current numeric `ID` is unique in the snapshot but is not globally safe if a List is recreated or migrated. `source_key` must be unique in HubSpot. Updates use batch upsert; they do not create a new Billing Event for a status change.

Proposed related keys:

- Company: HubSpot record ID plus governed ANAM external account/unit code; normalized RUT is secondary matching evidence, not universal identity.
- Deal: HubSpot record ID plus normalized quotation ID and version.
- Service: `ANAM-SVC:<source>:<contract-or-quotation>:<awarded-line>` or another stable key approved by ANAM.

### Associations

- Company `1:N` Billing Event.
- Deal `1:N` Service.
- Service `1:N` Billing Event.
- Billing Event `0:1` originating Deal for reporting convenience, constrained to match its Service lineage.

If one Billing Event covers multiple Services, do not repeat the full amount across associations. Reopen this decision to introduce an allocation grain with amounts that reconcile to the parent event.

### Monetary contract

Preserve and report separately:

- original amount and original unit (`CLP`, `UF/CLF`, `USD`);
- valuation/economic date;
- conversion rate, source and version;
- normalized CLP amount;
- normalized UF/CLF amount.

ANAM's HubSpot company currency is CLF and 1,239 of 1,240 Deals currently use CLF. The billing ledger mixes CLP, UF and USD. No report may sum original amounts across units. Normalization needs dated, governed FX/UF snapshots and must preserve the unconverted source value.

### Operational state

The Billing Event record represents the item. Source status changes update the current projection and append an integration/audit observation outside mutable properties when the integration runtime owns history.

| Source status | Canonical group |
|---|---|
| Creada | Preparation |
| Facturar | Ready to invoice |
| EDP Enviado al Cliente | External validation |
| Rechazo Interno | Internal block |
| Rechazo Externo | External block |
| Facturado | Invoiced |
| Refacturado | Invoiced with adjustment |

The source status remains available verbatim. Refacturation, credit notes, cancellation and corrections need explicit business rules before financial totals are accepted.

## Migration and cutover contract

1. Clean Company identity and add the governed ANAM account/unit key.
2. Add structured quotation identity to Deal and establish Deal -> Service lineage.
3. Create the custom object and properties without workflows or user editing.
4. Backfill by upsert into a staging/read-only state.
5. Resolve deterministic Company/Service/Deal associations and route exceptions to a review queue.
6. Reconcile row counts, status/currency distributions and amounts by source period.
7. Run at least two monthly closes in shadow mode.
8. Activate dashboards and alerts only after reconciliation passes.
9. Choose the final operating model:
   - HubSpot becomes the operational entry surface and the old List becomes read-only; or
   - the List/source remains authoritative and HubSpot is continuously synchronized.
10. Never operate manual dual entry.

If Greenhouse or Kortex executes the sync, use the native integration pattern:

```text
Source Adapter -> Sync Planner -> Raw Ledger -> Conformed Snapshot
-> HubSpot Projection -> Readiness -> Replay
```

The connector requires watermark/overlap, idempotent upsert, partial-success handling, schema-drift detection, retry/dead-letter, replay and an unresolved-association queue.

## Reporting contract

| Metric | Definition gate |
|---|---|
| Awarded value | Comparable Deal/Service award for the same scope and period. |
| Billable value | Billing Events eligible under an approved status policy. |
| Invoiced value | Invoiced/refactured policy without double counting. |
| Pending value | Preparation + ready + external validation, separated by state. |
| Rejected value | Internal and external rejection reported separately. |
| Billing realization | Invoiced / eligible billable value. |
| Award-to-invoice | Invoiced / comparable awarded value for the same period/scope. |
| Invoice lead time | Invoice date minus service-period end date. |
| Unmatched value | Billing amount without deterministic Company/Service/Deal. |

Every amount report must select one unit or a governed normalized amount. Billing Event must be the primary report source to avoid association fan-out duplicating amounts.

## Alternatives considered

### Flatten into Company, Deal or Service properties

Rejected. Repeated EDP/invoice events lose history and overwrite one another.

### Use HubSpot Tickets

Rejected for the monetary ledger. Tickets are customer cases and SLA/resolution units, not economic execution rows.

### Use line items

Rejected as ledger grain. Line items describe quoted or invoiced components and are parent-bound; they do not represent independent workflow events. ANAM has 506 line items and 501 are associated to Deals, which makes them useful commercial/service-component provenance but still not a billing-event ledger.

### Use native Invoice as the only object

Rejected as the primary model. The source includes pre-invoice, rejection and EDP workflow states. Native Invoice can be an optional downstream projection for finalized invoices.

### Keep the spreadsheet/List outside HubSpot without integration

Rejected. It does not satisfy the objective of connecting sales, Services and actual billing by Company.

### Replace the source immediately with HubSpot

Rejected for the initial migration. Current CRM identity coverage is insufficient for a safe big-bang cutover.

## Consequences

### Benefits

- Actual billing becomes visible from Company, Deal and Service.
- Commercial dashboards stop using won Deal amount as a proxy for invoicing.
- Operations can manage backlog, rejection and aging against the same customer context.
- Historical backfill and incremental updates are idempotent and replayable.

### Costs and risks

- Company, Deal and Service identities need remediation before the ledger can be associated reliably.
- Custom-object workflows/reporting require Enterprise entitlement and must be verified against the live portal.
- Association fan-out can duplicate amounts in reports.
- CLP/UF/USD normalization introduces governed financial reference data.
- Moving operational entry to HubSpot requires training, permissions and a controlled cutover.

## Runtime evidence

Read-only evidence on 2026-07-16:

- HubSpot Limits Tracking API: custom-object capacity `500,000`, usage `0`.
- Kortex control plane: no custom objects currently exist; OAuth active with custom object, Service, Invoice, line-item and commerce scopes.
- Kortex hub profile indicates Marketing Hub Enterprise, Sales Hub Professional and Service Hub Professional by high-confidence scope inference; commercial entitlement still needs a final portal/contract check before creation.
- Dry-run: [`anam-billing-event-migration-dry-run-2026-07-16.md`](anam-billing-event-migration-dry-run-2026-07-16.md).

Official HubSpot references:

- [Custom objects API](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/custom-objects/guide)
- [CRM schemas API](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/schemas/guide)
- [Services API](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/services/guide)
- [Invoices API](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/invoices/guide)
- [Line items API](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/line-items/guide)
- [HubSpot Limits Tracking API](https://developers.hubspot.com/docs/api-reference/latest/crm/limits-tracking/guide)

## Runtime contract

This ADR is `Proposed`. It authorizes no schema, association, workflow, import or synchronization writes.

If accepted, the source of truth for implementation becomes:

- this decision for object grain, identity and associations;
- the approved [`anam-billing-event-schema-preview-2026-07-16.md`](anam-billing-event-schema-preview-2026-07-16.md) for exact schema;
- an approved migration runbook for backfill and cutover;
- the source ledger plus reconciliation report for data acceptance.

## Revisit when

- ANAM confirms that one source row can cover multiple Services;
- the source adds credit notes, payments, taxes or accounting settlement;
- HubSpot native Invoices/Payments become the desired operational surface;
- the custom-object entitlement or association limits differ from current evidence;
- DataNAM/SAP/Labware/Azure becomes the authoritative billing source;
- ANAM chooses HubSpot entry versus permanent external synchronization.
