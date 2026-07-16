# ANAM Account Unit and Billing Event Converged Model

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** Proposed model; no schema, association or record writes authorized
> **Sources:** `Segmentacion clientes.xlsx`, `Ticket facturacion_010726.xlsx`, live HubSpot schema readback

## Decision

Model the two candidate workbooks together, not as independent Company imports:

```text
Company (legal/account identity)
  |--< Account Unit ANAM (one normalized ANAM/CeCo code)
  |      |--< Billing Event (one SharePoint billing item)
  |      `--< optional Service association when scope is unit-specific
  |--< Deal --< line item --> Service
  `--< Billing Event (direct reporting association after deterministic reconciliation)

Service --< Billing Event
Deal    --< Billing Event (originating Deal only when deterministic)
```

`Cuenta/Unidad ANAM` is the provisional label for the operational customer/unit code grain. Its exact business label must be ratified before schema creation, but the grain is clear enough to reject a unique Código ANAM property on Company.

## Why the intermediate object is necessary

The segmentation workbook contains 2,611 source rows. Splitting the 72 comma-separated multi-code rows produces 2,882 unique normalized code tokens with no duplicate token inside that source. The billing ledger contains 1,491 normalized codes across 16,897 of 16,898 rows.

Cross-source reconciliation found:

| Evidence | Result |
|---|---:|
| Codes present in both workbooks | 772 |
| Billing rows covered by those codes | 7,971 / 16,898 (47.2%) |
| Shared codes with one normalized RUT in billing | 744 codes / 5,773 rows |
| Shared codes with one RUT and one exact normalized title | 629 codes / 3,444 rows |
| Billing codes associated with multiple normalized RUT values | 106 |
| Billing codes associated with multiple normalized Company titles | 298 |

The evidence means:

- one legal Company can have multiple operational codes;
- one source segmentation row can represent multiple codes;
- names drift and cannot be the key;
- some code-to-RUT relationships are inconsistent and require quarantine/review;
- a text or multi-checkbox field on Company cannot provide unique identity, associations, history or an exception queue.

## Object grains

| Object | Grain | Source of truth | Primary responsibility |
|---|---|---|---|
| Company | One governed legal/account entity | Commercial/legal master | Legal identity, domain, normalized RUT, parent-child, canonical HQ geography and strategic sector |
| Account Unit ANAM | One normalized ANAM/CeCo code | Approved ANAM customer/unit master | Operational code identity, source aliases, unit location and source segment evidence |
| Deal | One commercial opportunity/quotation/award | HubSpot Commercial | Pipeline, quote/award and income movement |
| Service | One awarded service component/scope | Service & Contracts | Term, recurrence, comparable value and renewal lineage |
| Billing Event | One SharePoint billing-list item | Billing source during transition | Original amount/currency, service period, billing state, invoice/EDP/OC/HES/LIMS references |

Do not represent Account Units as child Companies unless ANAM proves that every code is a CRM-manageable branch/account with its own relationship ownership. Do not collapse multiple codes into a Company text field.

## Proposed Account Unit schema

### Object settings

| Setting | Proposed value |
|---|---|
| Singular label | `Cuenta/Unidad ANAM` pending client naming |
| Plural label | `Cuentas/Unidades ANAM` |
| Candidate object name | `anam_account_unit` |
| Primary display property | `anam_account_unit_name` |
| Unique property | `anam_account_unit_code` |
| Initial workflows | None |
| User editing during staging | Disabled/governed |

### Properties

| Label | Internal name | Type | Rule/source |
|---|---|---|---|
| Nombre de cuenta/unidad | `anam_account_unit_name` | text | Derived `{code} - {source trade/name}` |
| Código ANAM | `anam_account_unit_code` | text, unique | One normalized token from `CeCo_Clientes` |
| Grupo CeCo original | `anam_ceco_group_source` | textarea | Unmodified source cell before splitting |
| Razón social informada | `anam_legal_name_source` | text | Source evidence; never authoritative by itself |
| Nombre de fantasía informado | `anam_trade_name_source` | text | Source evidence/alias |
| Descripción informada | `anam_description_source` | textarea | `Descripción_CeCo` |
| Comuna informada | `anam_commune_source` | text | Unit/source location, not Company legal location |
| Región informada | `anam_region_code_source` | text | Preserve raw numeric/anomalous code until mapping approval |
| Giro informado | `anam_business_activity_source` | textarea | Source business activity |
| Código de segmento informado | `anam_segment_code_source` | text | Cached source result/prefix evidence |
| Segmento informado | `anam_segment_label_source` | text | Raw 22-label source taxonomy, not canonical Company sector |
| Versión de taxonomía | `anam_taxonomy_version` | text | `segmentacion_clientes_2026-04-01` initially |
| Estado de conciliación | `anam_reconciliation_status` | select | `unmatched`, `candidate`, `conflict`, `reviewed`, `quarantined` |
| Método de conciliación | `anam_reconciliation_method` | select | `code_rut`, `code_name`, `manual_review`, `none` |
| Hash de origen | `anam_source_version_hash` | text | Canonical payload hash for replay/change detection |
| Última sincronización | `anam_last_synced_at` | datetime | Integration timestamp |

Do not invent an active/inactive status because the workbook has no lifecycle field.

## Segmentation workbook transformation

1. Freeze cached values and source hash; do not execute or trust the workbook's external-reference formulas as runtime logic.
2. Split comma-separated `CeCo_Clientes` into one Account Unit record per normalized token while retaining the original group cell.
3. Preserve all source attributes on the Unit; do not overwrite Company during staging.
4. Treat market segment as a source suggestion. The workbook derives it from the code prefix and has 22 labels, while HubSpot `sector_estrategico` currently has seven unused options.
5. Map a Unit to exactly one Company only after deterministic reviewed evidence. The workbook lacks RUT; billing code-to-RUT evidence can propose a match but cannot create a Company automatically.
6. Promote geography, giro or sector to Company only through explicit precedence:
   - Unit commune/region describes operational location;
   - Company `region_de_chile` remains legal/HQ geography;
   - Company `sector_estrategico` receives only the approved canonical taxonomy;
   - conflicting Unit values create a review case, not last-write-wins.

## Billing Event model refinement

The existing Billing Event object and property dictionary remain valid with this delta:

- `anam_anam_code_source` remains an immutable raw property on Billing Event;
- Billing Event associates to exactly one Account Unit when the normalized code resolves;
- Billing Event associates directly to Company after the Unit-to-Company relationship is reviewed, so reporting does not require fragile multi-hop joins;
- Service and originating Deal remain optional deterministic associations;
- one blank-code billing row is quarantined;
- the 106 mixed-RUT codes are never auto-associated;
- source RUT/title remain evidence and cannot override the reviewed Unit/Company link.

No original monetary amount is stored on Company or Account Unit. Aggregates belong in reports or governed calculated rollups only after fan-out duplication tests.

## Association contract

| From | To | Cardinality | Creation rule |
|---|---|---|---|
| Account Unit | Company | `0:1` during staging, exactly one after review | Reviewed code/RUT/legal-identity crosswalk |
| Billing Event | Account Unit | exactly one when source code is present and valid | Exact normalized code only |
| Billing Event | Company | exactly one after reconciliation | Derived from reviewed Account Unit relationship |
| Billing Event | Service | `0:1` initially | Stable Service key/reviewed awarded-line mapping |
| Billing Event | Deal | `0:1` originating Deal | Structured quotation/version consistent with Service |
| Service | Account Unit | optional | Only if ANAM confirms the contracted scope belongs to one unit |

No fuzzy match creates an association. No event amount is copied once per association.

## Recommended migration slices

### Slice A - source crosswalk, no HubSpot writes

- Produce 2,882 normalized Account Unit candidates and preserve source row/group provenance.
- Reconcile code -> RUT/title from the billing ledger.
- Separate single-RUT, mixed-RUT, unmatched and anomalous-code queues.
- Ratify code lifecycle, reassignment policy and the meaning of CeCo with ANAM.

### Slice B - schema-only proposal

- Revise and approve the Billing Event ADR plus Account Unit schema.
- Verify two custom-object types fit entitlement/association/reporting limits.
- Create no records in the same approval window as schema creation.

### Slice C - Account Unit staging

- Upsert Units by unique code with workflows disabled.
- Associate only reviewed Units to existing Companies; never create Companies from names alone.
- Read back uniqueness, source hashes and exception counts.

### Slice D - Billing Event pilot

- Start from the shared-code cohort, prioritizing the 629 codes/3,444 rows with one normalized RUT and one normalized title.
- Further require an existing reviewed HubSpot Company match; the 3,444 rows are a source-quality ceiling, not automatic GO.
- Reconcile source keys, status/currency distributions and original amounts before expansion.

### Slice E - expansion and sync

- Expand by reviewed amount coverage, not raw row count.
- Keep mixed-RUT codes quarantined.
- Introduce Service/Deal associations only after their keys are production-ready.
- Run two monthly closes in shadow mode before operational cutover.

## Approval gates

1. ANAM confirms what a Código ANAM/CeCo represents, whether it is stable/reassignable and whether one Unit can change legal Company.
2. ANAM approves the canonical 7-or-revised sector taxonomy and mapping from the 22 source labels.
3. Commercial Data Steward approves Company identity precedence and unmatched-Company treatment.
4. Administration/Finance approves Billing Event statuses, Refacturado, currency/UF/FX and netting rules.
5. Service & Contracts approves Service grain and whether a Billing Event can span multiple Services.
6. Efeonce verifies custom-object entitlement, association limits, permissions, rollback and reporting behavior.

## Outcome

`GO` for a no-write crosswalk and exact schema proposal.

`NO-GO` for creating Companies, Account Units, Billing Events, associations or Company segmentation values until the gates above are approved.

The monthly ingestion/runtime contract is specified separately in [`anam-monthly-billing-etl-operating-model-2026-07-16.md`](anam-monthly-billing-etl-operating-model-2026-07-16.md). It distinguishes the ETL integration service from HubSpot Service records and defines file intake, staging, idempotent upsert, reconciliation and KPI grain.
