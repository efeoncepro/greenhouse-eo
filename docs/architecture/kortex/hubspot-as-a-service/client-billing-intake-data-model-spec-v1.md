# Client Billing Intake Data Model Spec V1

> **Date:** 2026-07-16
> **First tenant:** ANAM
> **ANAM target HubSpot portal:** `19893546`
> **Status:** Proposed implementation spec; no migration, infrastructure or HubSpot writes authorized
> **Task:** `TASK-1423`

## 1. Purpose and ownership boundary

This spec models client-owned operational billing workbooks for the HubSpot as a Service offering. ANAM is the first tenant and owns the source data. Efeonce/Greenhouse operates the managed ingestion, validation and synchronization service.

The boundary is load-bearing:

- ANAM customers, Account Units, Deals, Services and Billing Events belong to ANAM and its HubSpot portal.
- Greenhouse is the tenant-scoped control plane for private assets, import runs, validation, approval, audit and replay.
- No source row becomes an Efeonce/Greenhouse Company, Deal, Service, invoice, income or Account 360 fact.
- The Greenhouse ANAM organization/space is an authorization and isolation anchor only; it is not the company represented by each row.
- No record is projected to the Efeonce/Kortex default HubSpot portal. The only eventual sink for this dataset is the approved ANAM installation for portal `19893546`.

## 2. Source workbook baseline

Local evidence file:

`docs/architecture/kortex/hubspot-as-a-service/anam-source-attachments-2026-07-16/maria-paz-haeger/2026-07-01_ticket-facturacion.xlsx`

The binary contains client financial and identity data. It is operational evidence, not a safe test fixture. Automated tests must use synthetic/redacted fixtures and must not commit real RUTs, names, amounts or observations.

### Verified manifest

| Attribute | Verified value |
|---|---:|
| Workbook SHA-256 | `b788febee3818889a6e279317c423975e1c95ae0490702a4d4263a2f719f2bd1` |
| Sheet | `query` |
| Data rows | 16,898 |
| Columns | 22 |
| Nonblank unique source IDs | 16,898 |
| Raw Código ANAM values | 1,554 |
| Company-title values | 1,860 |
| RUT values | 1,306 |
| Source owners | 30 |
| Service months | 70, from `12-2003` through `11-2026` |

### Status and currency profile

| Source status | Rows | Canonical group |
|---|---:|---|
| `Facturado` | 15,706 | `invoiced` |
| `Rechazo Externo` | 814 | `external_block` |
| `Rechazo Interno` | 193 | `internal_block` |
| `Creada` | 119 | `preparation` |
| `Facturar` | 63 | `ready_to_invoice` |
| `EDP Enviado al Cliente` | 2 | `external_validation` |
| `Refacturado` | 1 | `invoiced_adjusted` |

| Currency | Rows | Treatment |
|---|---:|---|
| `CLP` | 8,667 | Preserve original amount and currency |
| `UF` | 8,229 | Preserve original amount; no CLP conversion without approved valuation date/rate |
| `USD` | 1 | Quarantine for currency/value review |
| blank | 1 | Quarantine |

Additional verified conditions:

- 112 zero-amount rows and no negative amounts;
- five `Facturado` rows without invoice number;
- 818 non-invoiced rows already carrying an invoice number, mostly `Rechazo Externo`;
- 132 repeated invoice strings cover 428 rows, up to ten rows per invoice;
- eight repeated invoice strings mix currencies;
- no row has service end before service start;
- `Mes Servicio` matches the start-date month for all 16,898 rows;
- CLP mean `2,427,724.65` versus median `454,093`;
- UF mean `1,790.48` versus median `14.84`, indicating material outliers/misclassification.

These values are acceptance benchmarks for the reference parser. Any different result must be explained as a deliberate normalization change, not silently accepted.

## 3. Business grain

### 3.1 Source file

One immutable workbook uploaded by an authorized client user for an explicitly selected reporting period. The current workbook is a full snapshot, not a proven monthly delta.

### 3.2 Import run

One attempt to scan, parse, validate and plan changes from one source asset. Reprocessing the same asset may create an auditable replay attempt, but it must not create duplicate Billing Events.

### 3.3 Raw row

One row from the `query` sheet, preserved exactly enough to reproduce the parser decision and linked to the immutable source asset and row number.

### 3.4 Billing Event

One source List item identified by the source dataset plus `ID`. It is an operational billing fact, not a HubSpot Ticket, Service or Invoice.

### 3.5 Account Unit

One normalized `Código ANAM`/CeCo. It represents the operational customer/unit key used by ANAM and may associate to one governed Company for a defined effective period.

### 3.6 Company

One customer/account entity in ANAM's HubSpot. `Title` and `RUT` from the workbook are matching evidence; they never create or overwrite Company identity automatically.

### 3.7 Invoice grouping

`Número Factura + Moneda` is a report grouping key over Billing Events. V1 does not create a HubSpot Invoice because the workbook lacks invoice date, due date, tax document identity, tax detail, payment and credit-note settlement semantics.

## 4. Reusable physical model

The physical tables are client-generic. ANAM is configuration, not a schema/table prefix.

All tables below require `space_id`. The authenticated session resolves `space_id`; browser/API input must never choose or override it. A dataset binds one client space to one approved HubSpot installation/portal.

### 4.1 `greenhouse_sync.client_billing_datasets`

One configured source-to-target contract.

| Column | Type / invariant |
|---|---|
| `dataset_id` | text PK |
| `space_id` | text, required tenant boundary |
| `source_system` | enum-like text; ANAM initial value `sharepoint_list_export` |
| `source_dataset_key` | stable integration-assigned key, not a mutable folder path |
| `source_timezone` | IANA timezone; ANAM `America/Santiago` |
| `target_system` | `hubspot` |
| `target_installation_id` | governed Kortex installation reference |
| `target_portal_id` | read-only safety assertion; ANAM `19893546` |
| `mode` | initial `full_snapshot` |
| `status` | `draft`, `active`, `suspended`, `retired` |
| `created_at`, `updated_at` | audit timestamps |

Unique: `(space_id, source_dataset_key)`.

`source_dataset_key` for the current export must be assigned before any write. The visible SharePoint path is preserved as evidence but is not sufficiently immutable to be the key. When Microsoft Graph supplies site/list IDs, they become aliases/evidence for the same approved dataset rather than automatically changing Billing Event keys.

### 4.2 `greenhouse_sync.client_billing_import_runs`

One aggregate for upload, validation, review and later synchronization.

| Column | Type / invariant |
|---|---|
| `import_run_id` | text PK |
| `space_id` | required and equal to dataset space |
| `dataset_id` | FK to dataset |
| `source_sync_run_id` | optional FK to canonical `source_sync_runs` heartbeat |
| `source_asset_id` | FK to `greenhouse_core.assets`, private and scan-cleared |
| `file_sha256` | required; equals canonical asset content hash |
| `declared_period` | date, first day of operator-selected month |
| `mode` | `full_snapshot` initially |
| `status` | state machine below |
| count columns | source/new/changed/unchanged/quarantined/missing-review |
| amount summary | JSON by original currency/status; never one mixed-currency total |
| `uploaded_by`, `reviewed_by` | authenticated actor IDs |
| timestamps | uploaded/scanned/validated/reviewed/approved/sync started/finished |
| `failure_code` | canonical redacted code; no row payload in errors |

Unique accepted file: `(dataset_id, file_sha256) WHERE status <> 'rejected'`.

State machine:

```text
draft -> uploading -> uploaded -> scanning -> validating
      -> needs_review -> approved -> syncing -> completed
      -> rejected | failed | quarantined
```

`approved` and all HubSpot write states are reserved for a later task. `TASK-1423` stops at `needs_review` and produces a no-write change plan.

### 4.3 `greenhouse_sync.client_billing_raw_rows`

Append-only evidence by run.

| Column | Type / invariant |
|---|---|
| `import_run_id`, `space_id` | required composite tenant/run boundary |
| `source_row_number` | one-based workbook row, including header offset |
| `source_item_id` | `ID` stored as text |
| `raw_payload_json` | all 22 source cells in canonical column order |
| `raw_schema_version` | parser contract version |
| `business_payload_hash` | SHA-256 of canonical typed business payload |
| `parse_status` | `parsed`, `invalid`, `quarantined` |
| `created_at` | immutable timestamp |

PK: `(import_run_id, source_row_number)`. Unique: `(import_run_id, source_item_id)`.

No `UPDATE` or `DELETE` in normal operation. The source asset remains the byte-level evidence; this table is parsed evidence.

### 4.4 `greenhouse_sync.client_billing_event_projections`

Latest conformed state and proposed HubSpot projection, one row per durable source item.

| Column family | Contents |
|---|---|
| Identity | `space_id`, `dataset_id`, `source_item_id`, `source_key`, first/last seen run |
| Version | current business payload hash, source-created/modified/version evidence |
| Source party | title, responsible, zone, raw/normalized RUT and checksum state |
| Account Unit | raw code, normalized code, match status and crosswalk reference |
| Commercial refs | quotation/EDP, OC, HAS/HES as raw values plus conservative parsed kind/key |
| Service facts | start/end date, service month, description |
| Billing facts | original net amount `numeric(20,6)`, original currency, observation, LIMS raw, source/canonical status |
| Invoice grouping | raw invoice string, normalized invoice key |
| Match | target Company/Account Unit/Service/Deal IDs only when deterministic/reviewed |
| Plan | `new`, `changed`, `unchanged`, `quarantined`, `source_missing_review` |
| HubSpot | target object ID, last synced hash/time/status; unused in `TASK-1423` |

Unique: `(space_id, dataset_id, source_item_id)` and `source_key`.

`source_key` is derived from the approved stable dataset key and text source ID. The display path, filename, upload date and client name are not key material.

### 4.5 `greenhouse_sync.client_billing_identity_crosswalks`

Reviewed, effective-dated mapping between a source Account Unit code and ANAM HubSpot records.

Required fields:

- `space_id`, `dataset_id`, normalized Account Unit code;
- effective-from/effective-to service dates;
- target ANAM HubSpot Account Unit ID;
- target ANAM HubSpot Company ID;
- match method and evidence digest;
- status `proposed`, `reviewed`, `rejected`, `retired`;
- reviewer and review timestamp.

No overlapping reviewed effective periods for the same `(space_id, dataset_id, normalized_code)`. RUT/title evidence may propose a crosswalk but cannot review it.

### 4.6 `greenhouse_sync.client_billing_exceptions`

One rule finding per run/row or run-wide schema issue.

Required fields:

- tenant/run/source-row/source-key anchors;
- stable `rule_code`, severity and affected field;
- redacted summary plus structured safe details;
- original currency and amount only where authorized for reviewer display;
- state `open`, `resolved`, `waived`, `superseded`;
- resolution actor, note and timestamp.

Do not persist RUT, observations, emails or complete raw payloads in generic logs/error messages. Reviewers reach raw evidence through authorized readers.

### 4.7 Later write-plane tables

`client_billing_change_sets`, `client_billing_change_set_items` and HubSpot batch/readback results are reserved for the approval/sync task. They must reference an immutable validated run. They are not required for the no-write profiler.

## 5. Column contract

| Excel column | Typed field | Rule and target meaning |
|---|---|---|
| `ID` | `source_item_id` text | Required and unique inside the run; durable item identity within dataset |
| `Creado` | source created timestamp | Interpret source wall-clock with dataset timezone; preserve raw cell representation |
| `Title` | source company title | Evidence only; never auto-create/overwrite Company |
| `Responsable` | source responsible name | Preserve; map to ANAM HubSpot owner only through an approved owner crosswalk |
| `Zona` | source zone | Preserve; candidate Account Unit attribute, not Company legal/HQ geography |
| `Código ANAM` | raw + normalized Account Unit code | Exact normalized lookup; blank quarantined |
| `RUT` | raw + normalized + checksum state | Matching evidence; not universal identity and not auto-write |
| `N° Cotización o EDP` | raw reference + parsed kind/key | Candidate Deal/Quote association only when structured and exact |
| `OC` | source purchase-order reference | Preserve raw; no Purchase Order object in V1 |
| `HAS/HES` | source acceptance reference | Preserve raw; normalize known null markers separately |
| `Fecha Inicio Servicio` | date | Date-only source fact |
| `Fecha Fin Servicio` | date | Date-only; must be on/after start |
| `Mes Servicio` | first day of month + raw | Must match `M-YYYY` and service-start month under current contract |
| `Descripción Servicio` | source description | Preserve raw; classification is a later catalog mapping |
| `Monto a Facturar NETO` | `numeric(20,6)` | Never float; preserve exact original amount |
| `Moneda` | `CLP`, `UF`, `USD` or invalid | Never sum across currencies; blank/unknown quarantined |
| `Observación` | source observation | Sensitive free text; authorized views only |
| `LIMS` | raw references | Preserve line breaks; tokenization is a derived array, not separate CRM records |
| `Estatus` | raw + canonical group | Closed allowlist from verified seven values; unexpected status quarantined |
| `Número Factura` | raw + normalized grouping key | Group by invoice key + currency; no Invoice object in V1 |
| `Tipo de elemento` | source metadata | Preserve; expected `Elemento`, not a business dimension |
| `Ruta de acceso` | source path evidence | Preserve; not identity/key material |

## 6. Normalization rules

### Account Unit code

1. Unicode NFKC.
2. Trim outer whitespace.
3. Uppercase.
4. Replace Unicode dash variants with ASCII `-`.
5. Remove whitespace around `-` and collapse remaining repeated whitespace.
6. Preserve all other punctuation; do not strip characters that may distinguish codes.

Store raw and normalized values plus an alias/evidence trail. The prior exploratory benchmark of 1,491 normalized billing codes must be reproduced or its delta explained by the versioned reference parser.

### RUT

Store raw. Derive uppercase normalized digits/check digit and a checksum state: `valid`, `invalid`, `unverifiable`, `blank`. Do not enforce global uniqueness and do not use it alone when one operational unit can share a legal entity.

### Null markers

Values such as `N/A`, `NA`, `n/a`, `-` remain raw but may produce a derived semantic null for matching. The parser must not replace the raw payload.

### Dates

- service dates are `date`, not timestamps;
- `Mes Servicio` becomes the first day of its month;
- source-created timestamps use the configured IANA timezone and preserve parsing provenance;
- future or legacy periods create findings; they are not silently corrected.

### Amount and currency

- parse with decimal-safe arithmetic;
- store one original amount and one original currency;
- zero is a review condition, not automatically invalid;
- no CLP/CLF normalized amount until valuation date, source and version are approved;
- USD and severe UF outliers remain quarantined in the initial cohort.

### Invoice key

Unicode normalize, trim, uppercase and collapse whitespace. Preserve prefixes such as `FAC`; do not assume the numeric token alone is globally unique. Reports aggregate by `(normalized_invoice_key, original_currency)` before computing invoice averages.

## 7. Validation and quarantine

### Run-blocking errors

- workbook/sheet/header mismatch;
- duplicate or blank `ID`;
- unsupported file type or failed asset scan;
- parser cannot produce exact decimal/date values;
- tenant/dataset/target portal binding mismatch.

### Row quarantine

- blank Account Unit code;
- blank/unknown currency;
- unknown status;
- invalid service period or end before start;
- code has ambiguous reviewed crosswalk for the event period;
- invoice grouping mixes currencies unexpectedly;
- apparent multi-Service allocation without an approved allocation grain;
- source value violates an approved currency-specific outlier threshold.

### Review warnings

- zero amount;
- invoiced status without invoice number;
- non-invoiced status with invoice number;
- invalid/unverifiable RUT checksum;
- source title/RUT drift against reviewed crosswalk;
- future/legacy service period;
- owner name without an approved HubSpot owner crosswalk.

A warning never repairs a row silently. A quarantine finding prevents that row from entering a future HubSpot change set but does not reject unrelated valid rows.

## 8. Snapshot and idempotency semantics

- The immutable asset content hash deduplicates identical file bytes.
- `dataset + source_item_id` identifies the event across monthly snapshots.
- The canonical business payload hash classifies `new`, `changed` and `unchanged`.
- A row absent from a later full snapshot becomes `source_missing_review`; absence never archives/deletes a HubSpot record automatically.
- Re-uploading identical bytes returns an idempotent outcome and performs no HubSpot mutation.
- Corrections arrive as a new asset/run and preserve prior raw rows.
- The parser, normalization and rule-pack versions are stored on every run so historical results are reproducible.

## 9. HubSpot projection boundary

Future approved synchronization targets ANAM portal `19893546` only:

| Source/conformed entity | ANAM HubSpot projection |
|---|---|
| Account Unit code | Proposed custom object `Cuenta/Unidad ANAM` |
| Billing Event | Proposed custom object `Evento de facturación` |
| Company evidence | Association to an existing/reviewed ANAM customer Company |
| Quote/EDP | Optional exact association to originating Deal/Quote |
| Contracted scope | Optional exact association to existing ANAM Service |
| Invoice number | Billing Event property/grouping key only in V1 |

Forbidden projections:

- HubSpot Ticket from each workbook row;
- HubSpot Service from each workbook row;
- Company creation from `Title` alone;
- native HubSpot Invoice/Payment without the missing financial document dataset;
- writes to Efeonce/Greenhouse CRM or finance;
- fuzzy/numeric-token associations;
- currency-normalized dashboards before valuation governance.

## 10. No-write profiler contract (`TASK-1423`)

The first implementation exposes one canonical command and one reader:

```text
profileClientBillingWorkbook({ assetId, declaredPeriod, idempotencyKey })
readClientBillingImportRun({ importRunId })
```

The authenticated context supplies `space_id`; neither command accepts it from browser input. The dataset determines the target installation and portal.

The profiler must produce:

- immutable run manifest and parser/rule versions;
- exact source/schema/count profile;
- new/changed/unchanged/quarantined/missing-review plan;
- totals by original currency, status and service month;
- mean and median per currency;
- invoice grouping profile;
- Account Unit/Company association coverage by count and amount;
- row/run findings with stable rule codes;
- no HubSpot API calls and no CRM/finance projections.

## 11. Access, privacy and retention

- Reuse `greenhouse_core.assets`, `createPrivatePendingAsset`, asset scanning and `attachAssetToAggregate`; do not create an ANAM bucket or signed-URL API.
- The private asset is owned by the authenticated ANAM client space and attached to the import run only after scan clearance.
- Client roles will later separate uploader, reviewer and operator.
- Reader queries always filter by session-derived `space_id` before run/asset IDs.
- Logs contain run IDs, counts and stable error codes, not RUTs, names, observations or row payloads.
- Retention, export and deletion policy must be approved contractually before accepting production uploads.
- Removing the managed service must support export of run manifests and client-owned source assets under the approved retention policy.

## 12. Acceptance decisions still required

1. ANAM confirms the lifecycle and reassignment semantics of Código ANAM/CeCo.
2. ANAM names uploader, reviewer and exception owners.
3. ANAM approves retention/deletion/export terms for source workbooks and parsed rows.
4. Administration/Finance ratifies zero amounts, `Refacturado`, invoice-number reuse and cancellation/credit-note treatment.
5. Service & Contracts confirms whether one source row can span multiple contracted Services.
6. RevOps approves the Account Unit and Billing Event HubSpot schemas before any schema write.

## 13. Delivery sequence

1. `TASK-1423`: tenant-scoped model, synthetic fixtures and no-write profiler over the current workbook.
2. `TASK-1424`: authenticated client UI consuming the run command/reader and shared private-asset uploader.
3. Approval/sync task: immutable change set, maker-checker approval, Kortex OAuth batch upsert and readback.
4. Pilot and cutover: reviewed closed month, two shadow closes, then HubSpot dashboards and retirement of manual dual entry.

## 14. Current verdict

`GO` for the tenant-scoped schema proposal, synthetic parser fixtures and no-write profiling of the current local workbook.

`NO-GO` for production uploads, HubSpot schema/record writes, financial normalization or Efeonce internal projections.
