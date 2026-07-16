# ANAM RevOps Schema Reconciliation

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Mode:** read-only design based on live HubSpot inventory
> **Status:** proposed implementation contract; no schema or record writes authorized by this document

## Outcome

ANAM does not need a parallel CRM model. The correct target extends the native HubSpot chain already in use:

```text
Contact -> Lead -> Company -> Deal -> Quote + line items -> Service
                                                      |          |
                                                      |          +-> renewal Service
                                                      |          +-> Ticket
                                                      +------------> Billing Event
```

Customer Agent, forms and people feed this same model. The agent resolves documented demand and captures context; people own qualification, commitments, exceptions and sensitive actions. HubSpot coordinates both.

The implementation priority remains commercial first and operations second:

1. identity, Lead, Deal, quotation, line items, Service and renewal;
2. Data Quality, Growth, Retention and Loyalty reporting;
3. Ticket routing, billing synchronization and operational reporting.

## Live baseline

| Object | Records | Custom properties | Finding |
|---|---:|---:|---|
| Contact | 8,859 | 6 | Active identity base; Contact RUT is not Company identity. |
| Company | 1,023 | 28 | Only 18 Companies have `rut`; one normalized duplicate pair blocks uniqueness. |
| Lead (`0-136`) | 291 | 0 | Native Lead is active and associated to Contact/Company. Reuse it. |
| Deal | 1,240 | 25 | Main commercial history; 1,239 have `amount`. |
| Line item | 506 | 0 | 501 are associated to Deals; recurrence is captured on only eight. |
| Quote | 10 | 0 | Eight drafts, two expired, none accepted, none with line items and only two associated to one Deal. |
| Product | Access pending | Access pending | Kortex installation lacks Product Library object scope. |
| Service (`0-162`) | 1 | 2 | Native object exists but is not yet a production portfolio. |
| Ticket | 18 | 0 | Default pipeline; broad category is blank on every Ticket. |
| Invoice | 0 | 0 | Native object exists but does not represent pre-invoice/EDP states. |
| Custom schemas | 0 | 0 | Live limit is 10 object types; Billing Event is viable after approval. |

## Decision rules

- Reuse native objects, properties and associations when their business grain matches.
- Do not copy the same mutable fact across Company, Deal and Service.
- Store repeatable commercial components as line items, not multi-value text on Deal.
- Derive retention movement from comparable prior/current Services; do not capture Down-sell as income.
- Treat reports as projections of governed source facts, not as a reason to create fields.
- Do not archive populated legacy fields until consumers and record migration are verified.

## Object reconciliation

### Company and Contact

| Action | Contract | Reason / gate |
|---|---|---|
| Reuse | Company `rut` for current forms and visible legal identifier. | Both live forms already write it. |
| Remediate | Normalize the 18 populated Company RUTs and resolve the duplicate pair. | Uniqueness cannot be enabled while duplicates exist. |
| Create after remediation | `anam_normalized_rut`, unique text, integration-managed. | Durable matching key; never populated from Contact RUT. |
| Reuse | Native Parent Company / Child Company associations. | The native relationship already exists. |
| Reuse and govern | Company `region_de_chile` for legal/HQ region. | Keep Deal `zona` as execution geography; do not blind-copy multi-region values. |
| Reuse after taxonomy approval | Company `sector_estrategico`. | The field exists but has zero adoption and taxonomy drift. |
| Create only if source confirms | `anam_account_unit_code`. | Must first decide whether the code identifies a legal Company or operating unit. |
| Add association labels | Decision-maker, technical, commercial and billing Contact roles. | Roles belong to the Company-Contact relationship, not duplicate booleans on Contact. |

`hs_tax_id` is hidden and not used by current forms. It does not replace the active `rut` field in this cut.

The only normalized duplicate is ANAM itself:

| Company ID | Current identity | Associations |
|---|---|---|
| `31284841882` | no name/domain; razón social `ANAM`; form-created | 2 unique Deals, 1 unique Contact |
| `31433962165` | name `ANAM`, domain `anam.cl`; razón social incorrectly says `aguas`; form-created | 1 unique Ticket, 2 unique Contacts |

This is a real association split, not a harmless duplicate value. Before enabling normalized-RUT uniqueness, choose the surviving Company, correct its legal identity and merge or reassociate the other record through a reviewed change. Do not auto-merge based on RUT alone; first check external references and overlapping Contacts. No merge was performed during this inventory.

### Lead

Reuse native Lead. Current adoption is 291 records: 84 New, 5 Attempting, 117 Connected and 85 Qualified. Do not create a custom prospect object.

Target contract:

- every qualified commercial intake is associated to one primary Contact and Company;
- qualification creates or associates a Deal only once;
- disqualification reason and source use native fields where available;
- quote requests from forms or Customer Agent enter Lead/Deal, not operational Ticket.

### Deal, Quote, Product and line items

| Action | Contract | Reason / gate |
|---|---|---|
| Reuse | Deal `amount` as current expected/awarded Deal value under an approved stage rule. | It is populated on 1,239 Deals; its exact mutation point must be ratified. |
| Reuse | `deal_currency_code`. | Native currency source. |
| Reuse | Quote `hs_quote_amount`, `hs_quote_number`, `hs_quote_version`, `hs_currency`, status and expiry. | Avoid duplicate quote identity/value properties on Deal. |
| Reconcile | Deal `monto_original`. | Only three records use it and all equal `amount`; retain temporarily, then migrate/retire after quote-source validation. |
| Keep | Deal `tipo_de_ingreso`: Venta nueva, Upsell, Cross-sell, Renovación. | Down-sell stays hidden because it is a retention movement. |
| Keep | Deal `variacion_contrato` visible as Igual/Mayor/Menor. | Derive only when quoted and awarded values are trustworthy. |
| Reuse | Native line-item name, quantity, price, amount, TCV, ACV, billing frequency and term. | 506 line items already exist; recurrence coverage must be improved. |
| Audit then reuse | Product Library as the canonical service catalog. | Product scopes are missing from the current installation. |
| Keep distinct | `linea_de_negocio_anam` as current Deal classifier. | It has 1,239/1,240 coverage; map products/services to it without replacing history. |

Do not create `anam_quoted_amount`, `anam_awarded_amount`, `anam_quotation_id` or `anam_quotation_version` on Deal by default. Native Quote plus Deal amount are the prospective owners of those facts, but the ten existing Quotes are not a historical baseline: six have zero amount, none has line items and only two share one Deal. Add a governed quoted-value snapshot on Deal only if the approved historical backfill/reporting design cannot resolve the accepted Primary Quote deterministically. Add an external quotation key only if the source system cannot map to HubSpot quote number/version.

### Service and renewal

The target grain is one awarded service component or contracted scope, usually produced from one won Deal line item. Native Deal-Service (`795`), Company-Service (`792`), Ticket-Service (`796`) and Service-Service (`951`) associations already exist. There is no default Service-Line item association, so source line-item provenance needs a property.

| Action | Property / relationship | Source |
|---|---|---|
| Reuse | `hs_start_date`, `hs_target_end_date`, `hs_status`, pipeline/stage and owner. | Award/contract. |
| Validate before reuse | `hs_total_cost` as Service comparable value. | Its label is cost; ANAM must confirm it represents contracted revenue rather than delivery cost. |
| Create | `anam_service_external_key`, unique text. | Integration/creation workflow. |
| Create | `anam_source_line_item_id`, text. | Won Deal line item provenance. |
| Create | `anam_service_family`, select. | Approved service catalog/business-line mapping. |
| Create | `anam_service_frequency`, select. | Line-item recurrence/contract. |
| Create | `anam_service_currency`, select. | Awarded line/contract. |
| Create | `anam_renewal_eligibility`, select. | Contract rule. |
| Create | `anam_renewal_status`, select. | Renewal workflow. |
| Associate | Prior Service -> renewed Service using a governed Service self-association label. | Renewal workflow. |
| Associate | Service -> originating and renewal Deals. | Commercial lineage. |
| Defer | `anam_retention_movement`. | Prefer calculation/projection after comparable values exist; do not make it free-form manual capture. |

The existing custom `fecha_de_vencimiento_del_contrato` and Service `monto_original` have zero records. Retire them only after the native replacements and all consumers are verified.

Renewal means continuity of an eligible Service. Its outcome is derived by comparing prior and renewed scope/value:

- expansion: renewed comparable value is higher;
- stable: no material change;
- contraction/Down-sell: Service continues at lower comparable value;
- churn: eligible Service does not renew.

### Ticket

Ticket represents one request or case requiring tracked human work. It does not represent a quote component, Service contract or billing-ledger row.

| Action | Contract |
|---|---|
| Reuse | Native `hs_ticket_category` for General inquiry, Service problem and Billing problem. |
| Create | `anam_case_subtype` for approved Service follow-up, Billing, Quality/claim and administrative subtypes. |
| Reuse | Native priority, owner, source, Customer Agent status and SLA properties where licensed. |
| Require by process | Company and Contact; Service when the case concerns an active service. |
| Create if not native | escalation reason, resolution outcome and reopen reason. |
| Route elsewhere | quotation requests to Lead/Deal; informational questions resolved by Customer Agent create no Ticket. |

Current evidence: 18 Tickets, only seven associated to Company, 12 to Contact, none to Service and all with blank category. This is a controlled migration, not a new blank schema.

### Billing Event and Invoice

Create the proposed `Evento de facturación` custom object only after its ADR and schema are approved. One object record represents one SharePoint billing-list item, preserving source identity, status, original amount/currency and deterministic Company/Service/Deal associations.

Native Invoice remains an optional downstream projection when an event becomes invoiced. It cannot replace Billing Event because the source includes Creada, Facturar, EDP and rejection states. There are currently zero Invoice records.

## Automations

### Commercial foundation

1. Form/Customer Agent/manual intake deduplicates Contact and Company, then creates or updates native Lead.
2. Qualified Lead creates/associates one Deal with source context preserved.
3. Stage gates enforce service line, process, owner and monetary facts only after backfill readiness passes.
4. Approved quote uses native Quote plus product-backed line items.
5. Closed-won Deal creates one Service per awarded service component and associates Company, Deal and line-item provenance.
6. Service expiry window creates owner task and renewal Deal; it never marks renewal won automatically.
7. Closed renewal creates renewed Service lineage and derives retention movement.
8. Data-quality queues capture missing identity, classification, associations, quote/award values and renewal eligibility.

The current disabled Fidelización workflow incorrectly sets `tipo_de_ingreso=Venta nueva`; it must not be activated. The Growth `Radar 0%` stage marked closed must be corrected in an isolated, dependency-tested change.

### Operations

1. Customer Agent creates a Ticket only for required human action and preserves intent/transcript context.
2. Ticket category/subtype routes owner, queue and SLA.
3. Billing source upserts Billing Events by immutable source key and quarantines ambiguous associations.
4. Finalized invoiced events may project to native Invoice after reconciliation rules are approved.
5. Service/Ticket and Billing Event risk signals feed Loyalty without redefining commercial revenue.

## Reporting contract

| Dashboard | Primary grain | Enabled decisions | Readiness gate |
|---|---|---|---|
| Data Quality | Eligible records by object | What must be corrected and who owns it? | Definitions and denominators approved. |
| Growth | Deal + line items | Pipeline, win rate, new/upsell/cross-sell revenue by source/service/region/owner. | Stage integrity, classification and normalized amount coverage. |
| Quotation | Quote + Deal | Quote-to-award conversion and value variance. | Native quote adoption or governed historical baseline. |
| Retention | Renewable Service cohort | GRR/NRR, expansion, stable, contraction and churn. | Prior/current comparable Services with currency and periods. |
| Loyalty | Company + active Services + activity/risk signals | Accounts needing preventive human action. | Contact roles, expiry, activities and case signals. |
| Billing execution | Billing Event | Billable, invoiced, pending, rejected, aging and unmatched value. | Custom object, source sync and currency rules reconciled. |
| Operations | Ticket | Volume, SLA, backlog, resolution and reopen by case type/service. | Ticket taxonomy, associations and SLA capture. |

Growth, Retention and Loyalty are separate views of the same operating system. Growth measures acquisition/expansion, Retention measures economic continuity and Loyalty measures the relationship/actions that precede the outcome.

## Implementation slices

### Slice 1: commercial identity and catalog

- resolve Company RUT duplicate and approve normalized identity;
- resolve the Product Library OAuth grant blocker, then read the catalog;
- map current Deal/line-item taxonomy to products and Service family;
- ratify Deal amount and native Quote conventions.

### Slice 2: Service and renewal

- approve exact Service properties/options and self-association labels;
- dry-run won Deal line items -> Services;
- test renewal lineage on a reviewed cohort;
- build Data Quality and Growth, then Retention/Loyalty when coverage passes.

### Slice 3: operational cases

- approve Ticket subtype/options, routing and SLA contract;
- migrate/classify the 18 existing Tickets;
- connect Customer Agent handoff without creating avoidable cases.

### Slice 4: billing execution

- accept the Billing Event ADR and exact schema;
- remediate identity/matching;
- stage, reconcile and shadow-run the source sync;
- enable billing and operations dashboards only after financial QA.

## Approval boundary

This reconciliation authorizes no HubSpot write. Before each slice, produce the exact internal names, types/options, association labels, workflow triggers/actions, backfill counts, rollback and report denominators. Execute schema, data migration, workflow activation and dashboard publication as separate verified changes.
