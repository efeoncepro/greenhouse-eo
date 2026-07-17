# ANAM Billing Event Schema Preview

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** Proposed change set; no writes authorized
> **Depends on:** acceptance of [`anam-billing-event-hubspot-decision-v1.md`](anam-billing-event-hubspot-decision-v1.md) and the Account Unit refinement in [`anam-account-unit-billing-event-converged-model-2026-07-16.md`](anam-account-unit-billing-event-converged-model-2026-07-16.md)

## Purpose

This is the exact schema preview for connecting ANAM commercial value to operational billing value in HubSpot. It separates three actions that must not be executed as one blind import:

1. establish durable Company, Deal and Service identity;
2. create the Billing Event projection and its associations;
3. backfill only records that pass reconciliation and matching gates.

The proposed custom object represents one SharePoint billing-list item, not a customer Ticket and not an invoice payment.

## Naming and object settings

| Setting | Proposed value |
|---|---|
| Singular label | `Evento de facturación` |
| Plural label | `Eventos de facturación` |
| Candidate object name | `anam_billing_event` |
| Primary display property | `anam_billing_event_name` |
| Secondary display properties | `anam_source_status`, `anam_original_net_amount`, `anam_original_currency` |
| Searchable properties | `anam_source_item_id`, `anam_anam_code_source`, `anam_rut_source`, `anam_quotation_edp_source`, `anam_purchase_order_source`, `anam_invoice_number` |
| Required associations | Account Unit by exact code; Company after reviewed Unit reconciliation |
| Optional deterministic associations | Service and originating Deal |
| User editing during staging | Disabled by permissions/process |
| Initial workflows | None |

HubSpot may assign an account-specific fully qualified object type after schema creation. That returned identifier becomes the integration contract.

## Prerequisite schema

### Company

| Label | Internal name | Type | Source / owner | Requiredness |
|---|---|---|---|---|
| RUT normalizado | `anam_normalized_rut` | string / text | Legal RUT / Commercial Data Steward | Required for applicable Chilean entities |
| Estado de conciliación de identidad | `anam_identity_reconciliation_status` | enumeration / select | RevOps reconciliation | Required during remediation |

The existing Company `rut` remains the visible/form field during migration. Only 18 Companies use it and one normalized duplicate pair affects two records. Do not create or mark `anam_normalized_rut` unique until that duplicate is reconciled. Código ANAM is no longer proposed on Company: model each normalized code as an Account Unit using the converged model, then associate the reviewed Unit to Company.

### Deal

| Label | Internal name | Type | Source / owner | Requiredness |
|---|---|---|---|---|
| Cotización primaria | reuse native Quote association `Deal with Primary Quote` | association | HubSpot Quote / Deal owner | Required at the approved quotation stage |
| ID y versión de cotización | reuse Quote `hs_quote_number` and `hs_quote_version` | native Quote fields | HubSpot Quote / Deal owner | Required when Quote is used |
| Monto cotizado | reuse Quote `hs_quote_amount`/`hs_tcv` after semantic validation | native Quote amount | HubSpot Quote / Commercial | Required at quotation-issued stage |
| Monto adjudicado | reuse Deal `amount` after stage semantic validation | native currency amount | Award/OC / Commercial | Required at closed-won stage |
| Moneda comercial | reuse native `deal_currency_code` | native currency | Commercial | Required with amounts |

Do not infer quotation identity from numeric tokens in Deal names. HubSpot already exposes native Quote amount, number, version, currency, status, expiry and Deal/line-item associations. Existing Deal `monto_original` has only three records and equals `amount` in all three, so it is a migration candidate rather than a new baseline. Add an external quotation key only if a real source system requires idempotent mapping. Existing `amount` and the meaning of Quote amount versus TCV still need ratified stage semantics.

### Service

| Label | Internal name | Type | Source / owner | Requiredness |
|---|---|---|---|---|
| Clave externa de servicio ANAM | `anam_service_external_key` | string / text; unique | Won Deal/awarded line / Service & Contracts | Required on production Services |
| Fecha de inicio | reuse `hs_start_date` | native date | Contract/award | Required before activation |
| Fecha de término | reuse `hs_target_end_date` | native date | Contract/award | Required for finite terms |
| ID de line item de origen | `anam_source_line_item_id` | string / text | Won Deal line item | Required for generated Services |
| Familia de servicio | `anam_service_family` | enumeration / select | Product/catalog mapping | Required before activation |
| Periodicidad | `anam_service_frequency` | enumeration / select | Contract/award | Required for recurring Services |
| Monto adjudicado comparable | reuse `hs_total_cost` only if ANAM confirms revenue semantics; otherwise create a dedicated comparable-value field | number / currency | Allocated awarded line | Required for financial comparison |
| Moneda del servicio | `anam_service_currency` | enumeration / select | Contract/award | Required with amount |
| Elegibilidad de renovación | `anam_renewal_eligibility` | enumeration / select | Contract rule | Required for Retention cohort |
| Estado de renovación | `anam_renewal_status` | enumeration / select | Renewal workflow | Required in renewal window |

The standard HubSpot Service object remains the target. Native Service-Service association supports renewal lineage; Deal-Service and Company-Service associations support commercial lineage. No parallel Contract custom object is proposed. Existing custom Service expiry and original-amount fields have zero records and should be retired only after native replacements and consumer checks.

## Billing Event property dictionary

### Identity and display

| Label | Internal name | Type | Unique | Source |
|---|---|---|---:|---|
| Nombre del evento | `anam_billing_event_name` | string / text | No | Derived: Company/title + service month + source ID |
| Clave de origen | `anam_source_key` | string / text | Yes | Immutable composite source key |
| ID del elemento de origen | `anam_source_item_id` | string / text | No | `ID` |
| Sistema de origen | `anam_source_system` | enumeration / select | No | Constant `sharepoint_billing_list` initially |
| Ruta del origen | `anam_source_path` | string / text | No | `Ruta de acceso` |
| Tipo de elemento | `anam_source_item_type` | string / text | No | `Tipo de elemento` |
| Creado en origen | `anam_source_created_at` | datetime / date | No | `Creado` |
| Actualizado en origen | `anam_source_updated_at` | datetime / date | No | Live List metadata; absent from export |
| Hash de versión | `anam_source_version_hash` | string / text | No | Canonical source payload hash |

### Source references

These preserve the intake snapshot and do not replace associations.

| Label | Internal name | Type | Source |
|---|---|---|---|
| Empresa informada | `anam_company_title_source` | string / text | `Title` |
| Responsable informado | `anam_responsible_source` | string / text | `Responsable` |
| Zona informada | `anam_zone_source` | enumeration / select | `Zona` |
| Código ANAM informado | `anam_anam_code_source` | string / text | `Código ANAM` |
| RUT informado | `anam_rut_source` | string / text | `RUT` |
| Cotización o EDP informado | `anam_quotation_edp_source` | string / text | `N° Cotización o EDP` |
| Orden de compra informada | `anam_purchase_order_source` | string / text | `OC` |
| HAS/HES informado | `anam_has_hes_source` | string / text | `HAS/HES` |

### Service and billing facts

| Label | Internal name | Type | Source / rule |
|---|---|---|---|
| Inicio del servicio | `anam_service_start_source` | date / date | `Fecha Inicio Servicio` |
| Término del servicio | `anam_service_end_source` | date / date | `Fecha Fin Servicio` |
| Mes de servicio | `anam_service_period_month` | date / date | First day of normalized `Mes Servicio` |
| Mes original | `anam_service_month_source` | string / text | Raw `Mes Servicio` |
| Descripción del servicio | `anam_service_description_source` | string / textarea | `Descripción Servicio` |
| Monto neto original | `anam_original_net_amount` | number / number | `Monto a Facturar NETO`; never overwritten |
| Moneda original | `anam_original_currency` | enumeration / select | `CLP`, `UF`, `USD`; blank is quarantined |
| Observación | `anam_observation_source` | string / textarea | `Observación` |
| Referencias LIMS | `anam_lims_references_source` | string / textarea | Raw `LIMS` |
| Estado de origen | `anam_source_status` | enumeration / select | Verbatim source status |
| Grupo de estado | `anam_canonical_status_group` | enumeration / select | Derived canonical status |
| Número de factura | `anam_invoice_number` | string / text | `Número Factura` |

`anam_canonical_status_group` uses `preparation`, `ready_to_invoice`, `external_validation`, `internal_block`, `external_block`, `invoiced` and `invoiced_adjusted` as internal values.

### Monetary normalization

| Label | Internal name | Type | Rule |
|---|---|---|---|
| Fecha de valorización | `anam_valuation_date` | date / date | Approved economic date, not guessed from creation date |
| Tasa a CLP | `anam_fx_rate_to_clp` | number / number | Versioned rate for valuation date |
| Fuente de tasa | `anam_fx_rate_source` | string / text | Approved source and series/version |
| Monto normalizado CLP | `anam_normalized_amount_clp` | number / number | Derived after rate validation |
| Monto normalizado CLF | `anam_normalized_amount_clf` | number / number | Derived after rate validation |

These remain blank in staging. HubSpot company currency is `CLF`, while the source says `UF`; the conversion contract must state whether CLF is its reporting representation and which dated indicator is authoritative.

### Match, sync and quarantine controls

| Label | Internal name | Type | Internal values / rule |
|---|---|---|---|
| Estado de asociación | `anam_match_status` | enumeration / select | `unmatched`, `company_only`, `company_service`, `company_service_deal`, `ambiguous`, `quarantined` |
| Método de asociación | `anam_match_method` | enumeration / select | `external_key`, `rut_exact`, `name_exact`, `quotation_exact`, `manual_review` |
| Confianza | `anam_match_confidence` | enumeration / select | `deterministic`, `reviewed`, `heuristic_only`, `none` |
| Motivo de cuarentena | `anam_quarantine_reason` | string / textarea | Required when quarantined |
| Estado de sincronización | `anam_sync_status` | enumeration / select | `staged`, `synced`, `source_changed`, `failed`, `quarantined` |
| Última sincronización | `anam_last_synced_at` | datetime / date | Integration timestamp |
| ID de ejecución | `anam_sync_run_id` | string / text | Correlation/replay identifier |

## Association contract

| From | To | Cardinality | Creation rule |
|---|---|---|---|
| Account Unit | Company | zero or one during staging; exactly one after review | Reviewed code/RUT/legal-identity crosswalk |
| Billing Event | Account Unit | exactly one when source code is present | Exact normalized code only |
| Billing Event | Company | exactly one after remediation | Governed key, reviewed exact mapping or manual review |
| Billing Event | Service | zero or one initially | Stable Service key or reviewed awarded-line mapping |
| Billing Event | Deal | zero or one originating Deal | Structured quotation ID/version consistent with Service |

No fuzzy or numeric-token match creates an association. Ambiguous records remain in the exception queue. If one row belongs to multiple Services, implementation stops until an allocation grain is approved.

## Ownership

| Domain | Authoritative owner | HubSpot write mode |
|---|---|---|
| Source facts/status | SharePoint/List process during migration | Integration-only |
| Company identity | Commercial Data Steward | Governed process |
| Deal quotation/award | Commercial | Required-stage process |
| Service lineage/term | Service & Contracts | Governed process/automation |
| Monetary conversion | Administration/Finance | Integration/calculation only |
| Match/sync controls | Efeonce RevOps integration | Integration-only |

## Excluded from V1

- Payment, collection, tax and accounting settlement facts absent from the source.
- Native HubSpot Invoice or Payment creation.
- Multi-Service allocation, roll-up copies, workflow side effects, fuzzy writes and source deletion propagation.

## Approval and execution gates

### Blocked before schema creation

1. Confirm custom-object entitlement in ANAM's live subscription.
2. Ratify Account Unit naming and confirm Código ANAM/CeCo lifecycle, uniqueness and reassignment policy.
3. Ratify Deal `amount`, quotation/version source, Service grain and external key.
4. Ratify `Refacturado`, cancellation and credit-note treatment.
5. Confirm whether one source item can cover multiple Services.

### Blocked before historical backfill

1. Obtain live List ID/site identity and modified/version metadata.
2. Reach the Company matching target from the dry-run by source amount.
3. Resolve or quarantine UF/USD/blank-currency outliers.
4. Reconcile 100% of source keys and original amounts by currency/status/period.
5. Approve permissions, rollback snapshot, exception owner and staging cohort.

### Blocked before normalized financial dashboards

1. Approve valuation date, dated UF/FX sources and netting rules.
2. Validate report joins do not duplicate amounts through associations.

## Proposed first implementation slice

After ADR and schema approval, create only the prerequisite identity properties and Billing Event schema. Read it back by API, verify uniqueness and options, then stage a small reviewed cohort with workflows disabled. Do not start the 16,898-row backfill in the same change window.
