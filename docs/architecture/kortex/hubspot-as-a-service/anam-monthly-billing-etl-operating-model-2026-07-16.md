# ANAM Monthly Billing ETL Operating Model

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** Proposed operating model; no infrastructure or HubSpot writes authorized
> **Source candidate:** `Ticket facturacion_010726.xlsx`

## Plain-language decision

ANAM needs an integration service, not one HubSpot Service record per Excel row.

- **Integration service:** receives the monthly file or reads the SharePoint List, validates it, preserves the raw snapshot, transforms it and upserts HubSpot Billing Events.
- **HubSpot Service object:** represents an awarded contract/service scope created from a won Deal and line item. Billing Events may associate to it later, but the billing ETL must not invent Services from invoice rows.

The recommended initial operating model is the managed billing intake UI defined in [`anam-managed-billing-intake-ui-2026-07-16.md`](anam-managed-billing-intake-ui-2026-07-16.md), backed by the tenant-scoped model in [`client-billing-intake-data-model-spec-v1.md`](client-billing-intake-data-model-spec-v1.md). It reuses the canonical Greenhouse private-asset registry and scan/quarantine path, exposes validation and requires explicit approval before HubSpot mutation. ANAM owns the data; Greenhouse operates only the isolated control plane. SharePoint remains an optional source adapter, not a required dependency.

## Business and integration model

```text
ANAM operator
  -> managed billing intake UI (monthly XLSX snapshot)
  -> canonical Greenhouse private asset + scan/quarantine
  -> ANAM Billing Sync (ETL service)
       -> immutable raw file + ingestion ledger
       -> normalization + validation + quarantine
       -> Account Unit/Company/Service/Deal crosswalk
       -> HubSpot upsert/readback
  -> HubSpot Account Unit + Billing Event
  -> dashboards, exception queues and monthly reconciliation
```

HubSpot receives conformed operational facts. It is not the only place where raw uploads, row history, replay state and exception evidence live.

## Recommended technical placement

| Layer | Recommended implementation |
|---|---|
| Operator intake | Authenticated Greenhouse ANAM surface; standalone Cloud Run + IAP only as fallback |
| Initial source | Canonical Greenhouse private-asset upload, tenant ownership and scan/quarantine |
| Optional adapter | Existing SharePoint List through Microsoft Graph delta/incremental reads |
| Orchestrator | Cloud Run Job `anam-billing-sync`, monthly schedule plus approved on-demand run |
| Raw evidence | `greenhouse_core.assets` + private GCS object containing exact workbook and SHA-256 |
| ETL control/staging | PostgreSQL/Cloud SQL tables for runs, raw rows, projections, crosswalk and exceptions |
| HubSpot sink | Governed Kortex HubSpot OAuth adapter; batch upsert and association commands |
| Notifications | Run receipt and exception summary to the named ANAM/Efeonce operators |

This placement avoids a second unmanaged HubSpot credential and preserves replay/audit outside mutable CRM records. Final deploy ownership must follow the existing Kortex/Greenhouse runtime boundary before implementation.

## Monthly upload contract

### File convention

- Filename: `ticket_facturacion_YYYY-MM-DD.xlsx`.
- One workbook, one sheet named `query`.
- Initial mode: **full snapshot**, not an assumed monthly delta.
- The operator uploads through the managed UI; the run advances from quarantine only after validation and explicit approval.
- Re-uploading the same hash is idempotent and creates no HubSpot changes.
- Missing rows in a later full snapshot do not delete/archive HubSpot records automatically; they enter a source-removal review queue.

### Required existing columns

The current 22-column contract is accepted as source input: `ID`, `Creado`, `Title`, `Responsable`, `Zona`, `Código ANAM`, `RUT`, `N° Cotización o EDP`, `OC`, `HAS/HES`, service dates/month, description, net amount, currency, observation, LIMS, status, invoice number, item type and source path.

### Required source improvements

Add these columns or obtain them directly from the List API:

| Field | Why it is required |
|---|---|
| SharePoint site/list immutable ID | Makes `source_key` globally safe if a List is recreated |
| `Modified` timestamp | Distinguishes status corrections from unchanged rows and enables incremental sync |
| Source version/ETag | Supports optimistic replay and change detection |
| Invoice date | Required for invoice lead time and period-correct invoiced reporting |
| Status-change timestamp | Required for time in billing state and SLA/aging |
| Cancellation/credit-note reference | Required before net invoiced value is financially reliable |

Until these exist, the ETL uses a canonical row hash for change detection and cannot claim true status-transition time or invoice lead time.

## ETL stages

### 1. Intake

- validate extension, size, workbook/sheet/header contract and malware controls;
- compute file SHA-256;
- create an immutable ingestion run with uploader, received timestamp, source period and mode;
- reject exact duplicate files without executing downstream writes.

### 2. Raw load

- store every cell value unchanged with source row number and file hash;
- preserve raw RUT, code, amount, currency, dates, status and references;
- generate `source_key = ANAM-BILL:<site>:<list>:<ID>`;
- generate a canonical payload hash per row.

### 3. Normalize

- normalize Código ANAM without changing the raw value;
- normalize RUT format and checksum state without treating RUT as universal identity;
- parse service dates and `Mes Servicio` into an explicit service period;
- preserve original amount and currency as separate typed values;
- map only approved status labels to canonical groups;
- preserve multi-value LIMS/reference fields as raw text in V1.

### 4. Validate and quarantine

Quarantine rather than repair silently:

- duplicate or blank source ID;
- blank/unknown currency;
- invalid service period or impossible future/legacy date;
- non-numeric/zero/negative amount under an unapproved rule;
- amount outside approved currency-specific thresholds;
- code associated with multiple RUTs;
- unexpected status or schema drift;
- invoice number reused across currencies;
- one event apparently spanning multiple Services without allocation.

### 5. Reconcile identity

- exact code -> Account Unit;
- reviewed Account Unit -> Company;
- structured quotation/version -> originating Deal when available;
- stable awarded-line/Service key -> Service when available;
- fuzzy/name/numeric-token candidates remain suggestions only.

### 6. Plan changes

Each row becomes exactly one outcome:

- `new`;
- `changed`;
- `unchanged`;
- `quarantined`;
- `source_missing_review`.

The run produces a dry-run report before HubSpot mutation: counts and original amounts by currency, status and service month; association coverage; exceptions; proposed creates/updates/associations.

### 7. HubSpot projection

- upsert Account Units by unique normalized code only after schema approval;
- upsert Billing Events by unique source key;
- preserve raw source fields and current projection state;
- create only deterministic associations;
- use batch APIs with partial-success capture and replay IDs;
- never create Companies from source names and never create Services from Billing Events.

### 8. Readback and close

- independently read back projected source keys and hashes;
- reconcile row counts and original amounts by currency/status/period;
- verify no association fan-out duplicates report amounts;
- publish accepted/quarantined counts and unresolved value;
- retain raw file, run manifest, dry-run, HubSpot result and exception ledger.

## Integration control tables

These live in the tenant-scoped ETL control plane, not as HubSpot custom objects. Physical names are client-generic; ANAM is a dataset configuration:

| Table | Purpose |
|---|---|
| `client_billing_datasets` | Tenant/source/target binding; ANAM portal `19893546` is configuration, not request input |
| `client_billing_import_runs` | File/run identity, hash, uploader, mode, counts, status and timestamps |
| `client_billing_raw_rows` | Immutable source payload by run and source row |
| `client_billing_event_projections` | Latest normalized row, source key/hash and intended client-HubSpot state |
| `client_billing_identity_crosswalks` | Effective-dated code -> reviewed client Company/Unit identity |
| `client_billing_exceptions` | Quarantine reason, value at risk, owner and resolution |

ANAM HubSpot stores the accepted operational projection; the tenant-scoped control plane stores ingestion and replay truth. None of these facts project into Efeonce CRM or Finance.

## What the current data says about metrics

### Amount distribution

| Currency | Rows | Total original | Mean per row | Median per row | Finding |
|---|---:|---:|---:|---:|---|
| CLP | 8,667 | 21,041,089,514.98 | 2,427,724.65 | 454,093 | Strong skew; mean alone overstates a typical event |
| UF | 8,229 | 14,733,860.65 | 1,790.48 | 14.84 | Mean is invalidated by severe outliers/misclassification |
| USD | 1 | 1,729,029 | 1,729,029 | 1,729,029 | Almost certainly requires currency/value review |
| Blank | 1 | 0 | 0 | 0 | Quarantine |

Examples requiring quarantine include UF 14,106,359, UF 116,698, UF 75,198 and the sole USD 1,729,029. Service periods range from 2003-12 through future 2026-11 despite a 2026-07 file, so period validation cannot be optional.

### Invoice grain

- 16,520 rows have invoice number.
- 16,224 unique invoice strings exist.
- 132 invoice numbers appear on multiple rows, covering 428 rows.
- One invoice can cover up to ten event rows.
- Eight repeated invoice strings mix currencies and require review.

Therefore `average invoice amount` must first aggregate Billing Events by normalized invoice number and currency. It is not the average of raw rows.

## Governed KPI definitions

All monetary KPIs remain separated by original currency until dated normalization is approved.

| KPI | Definition |
|---|---|
| Billing events | Count of eligible Billing Events in the selected service/status period |
| Original billable amount | Sum of original amounts in approved billable statuses, grouped by currency |
| Invoiced amount | Sum of eligible `Facturado`/approved `Refacturado` events, grouped by currency and netting policy |
| Pending amount | Sum of Preparation + Ready + External Validation, grouped by currency |
| Rejected amount | Internal and external rejection shown separately |
| Mean event amount | Eligible original amount / eligible event count, one currency at a time |
| Median event amount | Median eligible Billing Event amount; mandatory companion to mean because the distribution is skewed |
| Mean invoice amount | Sum after invoice-number+currency aggregation / distinct eligible invoices |
| Mean monthly amount per Account Unit | Monthly eligible amount / distinct matched Units with eligible events |
| Mean monthly amount per Company | Monthly eligible amount / distinct matched Companies with eligible events |
| Billing realization | Invoiced amount / eligible billable amount for the same currency, scope and period |
| Unmatched value | Eligible amount without deterministic Account Unit/Company association |

Do not call current Deal amount revenue billed. Award-to-invoice requires comparable Service/Deal scope and approved currency normalization.

## Monthly run acceptance

A run is accepted only when:

1. file hash is new or explicitly approved for replay;
2. header/schema and source-key uniqueness pass;
3. new/changed/unchanged/quarantined counts are explained;
4. totals reconcile exactly by original currency, source status and service month;
5. no unexpected status/currency is silently mapped;
6. quarantined value is visible and assigned;
7. HubSpot upsert/readback counts and hashes reconcile;
8. association coverage and unmatched value are reported;
9. dashboards use only accepted records and expose exclusions;
10. rollback/replay artifacts are retained.

## Delivery sequence

1. Build a no-write profiler and dry-run using the current workbook.
2. Agree the monthly full-snapshot template, authorized users, retention and approval ownership.
3. Build the upload-only managed intake path and decide later whether a SharePoint adapter adds value.
4. Approve Account Unit and Billing Event schemas separately from record migration.
5. Run one reviewed closed-month pilot with workflows disabled.
6. Validate Company/Unit associations, amounts, averages and report fan-out.
7. Expand by reviewed amount coverage, then run two shadow monthly closes.
8. Activate dashboards/alerts and retire manual dual entry only after cutover approval.

## Current outcome

`GO` for designing/building the no-write ETL profiler, upload contract and reconciliation report.

`NO-GO` for creating custom objects, importing the historical ledger, normalizing money or publishing financial KPIs until the corresponding approval gates close.
