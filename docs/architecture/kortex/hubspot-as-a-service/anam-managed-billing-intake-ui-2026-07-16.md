# ANAM Managed Billing Intake UI

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** Recommended architecture; no infrastructure, UI or HubSpot writes authorized
> **Replaces as preferred intake:** mandatory SharePoint monthly file drop

## Decision

Build a small managed upload and review surface for ANAM. Do not build a second CRM and do not make SharePoint a required dependency.

The preferred product placement is an authenticated client-space surface for ANAM inside Greenhouse, while Google Cloud owns the ingestion data plane. ANAM owns the source and CRM data; Greenhouse/Efeonce only operates the tenant-scoped managed control plane. A standalone Cloud Run application protected by IAP/Identity Platform is the fallback only if ANAM users cannot be provisioned safely in the existing Greenhouse access model.

Hosting the existing Greenhouse frontend in Google Cloud is not required. The important boundary is:

- user experience and authorization in the tenant-scoped managed Greenhouse surface;
- private file storage, asynchronous processing and control ledger in GCP;
- approved operational projection in HubSpot;
- commercial and operational dashboards in HubSpot, not duplicated in the upload application.

## Target experience

An authorized ANAM operator can:

1. select the billing period and upload the monthly `.xlsx` snapshot;
2. see the file pass through security, schema and data-quality validation;
3. review row counts, monetary totals by original currency, association coverage and exceptions;
4. download an exception file without exposing unrestricted bucket links;
5. approve or reject the proposed HubSpot synchronization;
6. inspect run history, replay state and final reconciliation.

The upload application is an ingestion control surface. HubSpot remains the working CRM and reporting surface.

## Architecture

```text
ANAM operator
  -> authenticated Greenhouse billing-intake surface
  -> canonical Greenhouse private-asset upload
  -> asset scan/quarantine + tenant ownership
  -> private GCS object behind greenhouse_core.assets
  -> Eventarc / Cloud Tasks
  -> Cloud Run validation and ETL worker
       -> immutable raw snapshot + SHA-256
       -> Cloud SQL control/staging ledger
       -> normalization, crosswalk and exception report
  -> human review and explicit approval
  -> governed Kortex HubSpot OAuth adapter
  -> Account Unit + Billing Event batch upsert/readback
  -> HubSpot dashboards and queues
```

### Placement by layer

| Layer | Preferred placement |
|---|---|
| UI | Existing Greenhouse authenticated client surface |
| Upload/session API | Existing `/api/assets/private` + domain command; no ANAM-specific signed URL API |
| Raw/quarantine storage | Existing `greenhouse_core.assets` + private GCS + canonical scan/quarantine |
| Async dispatch | Eventarc for object finalization and Cloud Tasks for controlled retries |
| ETL worker | Cloud Run service/job |
| Run, row and exception ledger | Existing governed Cloud SQL/PostgreSQL plane |
| Secrets | Secret Manager; no HubSpot token in browser or workbook |
| HubSpot sink | Existing Kortex OAuth installation and governed batch commands |
| Business reporting | HubSpot dashboards after accepted synchronization |

### Standalone fallback

If Greenhouse cannot yet grant external ANAM access, deploy the same narrow UI on Cloud Run and protect it with IAP/Identity Platform or the approved enterprise identity provider. This is technically viable, but it duplicates user lifecycle, authorization and support, so it is not the strategic first choice.

## Run state machine

```text
draft -> uploading -> uploaded -> scanning -> validating
      -> needs_review -> approved -> syncing -> completed
      -> rejected | failed | quarantined
```

No transition from `uploaded` or `validating` may mutate HubSpot. `approved` is an explicit, auditable human decision for the proposed change set.

## Minimum UI

### New upload

- billing period;
- source mode fixed initially to `full_snapshot`;
- `.xlsx` selection with size/type constraints;
- upload progress and checksum receipt.

### Validation summary

- source rows and unique source IDs;
- `new`, `changed`, `unchanged`, `quarantined` and `source_missing_review`;
- totals by original currency and source status;
- Account Unit and Company match coverage by rows and monetary value;
- mean and median by currency;
- schema drift, outliers and reused-invoice warnings.

### Review and approval

- proposed HubSpot creates, updates and associations;
- downloadable exceptions;
- material changes from the previous accepted snapshot;
- approve/reject action with actor, timestamp and optional note;
- final readback and reconciliation result.

### History

- immutable file/run identity and SHA-256;
- uploader, reviewer and execution actor;
- status, duration, accepted/quarantined counts and value;
- replay/rollback evidence without destructive CRM deletion.

## Authorization

Use three narrow roles:

| Role | Capability |
|---|---|
| `billing_uploader` | Create an upload and read its validation |
| `billing_reviewer` | Review exceptions and approve/reject a run |
| `billing_operator` | Replay failed batches, manage crosswalk decisions and inspect audit evidence |

Upload and approval should be separable even if the pilot temporarily assigns both roles to the same named operator. HubSpot permissions remain independent from application permissions.

## Security and privacy controls

The workbook contains RUT and financial/operational data. It must never use a public bucket or durable anonymous download URL.

- enable uniform bucket-level access and public access prevention;
- reuse the canonical private-asset API, registry and scan gate; signed URLs may be an internal ephemeral mechanism but never a domain contract;
- constrain extension, content type and size before accepting the run;
- quarantine before parsing and run approved malware/content controls;
- compute SHA-256 and retain immutable provenance;
- use separate least-privilege service accounts for intake, ETL and HubSpot projection;
- exclude row payloads, RUT and amount details from application logs;
- configure retention, soft-delete/versioning and deletion policy explicitly;
- keep secrets in Secret Manager and never expose OAuth credentials to the browser;
- retain Cloud Audit Logs plus the application run/approval ledger.

All run, row and asset reads are filtered by session-derived client `space_id`. ANAM data never becomes Efeonce/Greenhouse CRM, Finance, Income or Account 360 data.

## Idempotency and monthly snapshot semantics

- Re-uploading the same file hash creates no downstream mutation.
- `source_key` plus canonical row hash classifies rows as new, changed or unchanged.
- A row absent from a later full snapshot enters `source_missing_review`; absence never deletes a HubSpot record automatically.
- The raw source remains immutable; corrections become a new source version/run.
- Only deterministic Account Unit/Company/Service/Deal associations are proposed.
- One source row produces one Billing Event projection. It never creates one HubSpot Service per row.

## Product boundary

The application should report ingestion health, not recreate the CRM:

- **UI owns:** upload, validation, exception review, approval, history and replay evidence.
- **ETL control plane owns:** raw truth, normalization, row hashes, crosswalk, run state and sync results.
- **HubSpot owns:** accepted Account Units/Billing Events, CRM workflows, operational queues and dashboards.
- **Service/Deal lineage owns:** sold/adjudicated commercial scope; billing data only associates when deterministic.

## Delivery slices

1. Confirm ANAM users, role model, retention and privacy requirements; produce the UI/API contract.
2. Implement authenticated upload to private quarantine storage with no HubSpot writes.
3. Add workbook profiler, validation report, exception export and previous-snapshot comparison.
4. Add explicit approval and a no-write HubSpot change-plan preview.
5. Pilot one closed month with reviewed batch upsert and independent readback.
6. Run two shadow monthly closes, then activate HubSpot dashboards and retire manual dual entry.

## SharePoint disposition

SharePoint remains a possible source adapter for clients that already operate there. It is not required for ANAM's managed billing service. If later enabled, Microsoft Graph/List ingestion must produce the same immutable upload/run contract and pass through the same validation and approval state machine.

## Current verdict

`GO` for architecture, access design and an upload-only/no-write prototype.

`NO-GO` for provisioning production infrastructure, accepting real financial uploads or mutating HubSpot until identity, retention, privacy, schema and approval gates are accepted.

## Primary platform references

- [Cloud Storage signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls)
- [Uniform bucket-level access](https://docs.cloud.google.com/storage/docs/uniform-bucket-level-access)
- [Public access prevention](https://docs.cloud.google.com/storage/docs/public-access-prevention)
- [Cloud Storage events to Cloud Run with Eventarc](https://docs.cloud.google.com/run/docs/triggering/storage-triggers)
- [Cloud Tasks with Cloud Run](https://docs.cloud.google.com/run/docs/triggering/using-tasks)
- [Identity-Aware Proxy for Cloud Run](https://docs.cloud.google.com/iap/docs/enabling-cloud-run)
