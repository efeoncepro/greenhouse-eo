# Greenhouse EO — Cloud Infrastructure Reference

> **Version:** 1.0
> **Last updated:** 2026-03-18
> **Audience:** Platform engineers, DevOps, on-call operators

---

## 1. Overview

Greenhouse EO runs on **Google Cloud Platform** under the project **`efeonce-group`**, with Vercel handling the Next.js frontend and API routes. The workload is spread across three GCP regions chosen for latency, cost, and service availability:

| Concern | Region | Rationale |
|---------|--------|-----------|
| Cloud SQL (PostgreSQL) | `us-east4` (Northern Virginia) | Low-latency transactional DB |
| Cloud Run / Cloud Functions | `us-central1` (Iowa) | Broadest service catalog, default for serverless |
| BigQuery | `US` (multi-region) | Maximizes co-location with Cloud Functions and analytics exports |

All inter-service communication stays within GCP, except for Vercel-originated calls to Cloud Run/Cloud SQL and external webhook traffic from Notion, HubSpot, and Frame.io.

---

## 2. Cloud SQL (PostgreSQL)

### Instance Details

| Property | Value |
|----------|-------|
| Instance name | `greenhouse-pg-dev` |
| Engine | PostgreSQL **16.13** |
| Zone | `us-east4-a` |
| Machine type | `db-custom-1-3840` (1 vCPU, 3.75 GB RAM) |
| Storage | 20 GB SSD, **auto-resize enabled** |
| Public IP | `34.86.135.144` |
| SSL mode | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` |
| Authorized networks | `0.0.0.0/0` (**see Security Notes**) |
| Backup window | Daily at **07:00 UTC**, 7-day retention |

### Databases

| Database | Role |
|----------|------|
| `postgres` | Default system database |
| `greenhouse_app` | Application database (all product schemas) |

### Schemas in `greenhouse_app`

| Schema | Domain |
|--------|--------|
| `greenhouse_core` | Tenants, users, roles, permissions, feature flags |
| `greenhouse_serving` | Materialized views and API-optimized projections |
| `greenhouse_sync` | Outbox, watermarks, sync state |
| `greenhouse_hr` | People, org charts, employment records |
| `greenhouse_payroll` | Payroll entries, periods, calculations |
| `greenhouse_finance` | Accounts, transactions, exchange rates, expenses |
| `greenhouse_delivery` | Projects, tasks, sprints, capacity |
| `greenhouse_crm` | Companies, contacts, deals (CRM mirror) |
| `greenhouse_ai` | AI scoring, recommendations, embeddings |

### Access Model

| Role | Purpose | Privileges |
|------|---------|------------|
| `postgres` | Superuser / admin | Full DDL + DML on all schemas |
| `greenhouse_migrator` | Schema migrations (CI/CD) | DDL on application schemas |
| `greenhouse_runtime` | Application runtime | DML only (SELECT, INSERT, UPDATE, DELETE) |

### Connectivity

- **Cloud SQL Connector** (preferred) — uses IAM-based authentication; no IP allowlisting required.
- **Direct IP** — connect to `34.86.135.144:5432` with username/password. Currently allowed from any IP.

---

## 3. BigQuery Datasets

The analytics warehouse is organized into 13 datasets. Tables marked *legacy* are still queryable but are being superseded by the conformed layer.

| Dataset | Tables | Purpose | Status |
|---------|--------|---------|--------|
| `greenhouse` | 41 | Core platform tables: auth, finance, HR, payroll, AI, identity, service modules | **Active** |
| `greenhouse_raw` | 11 | Immutable source snapshots — Notion (projects, tasks, sprints, people, databases), HubSpot (companies, contacts, deals, owners, line_items), Postgres outbox events | **Active** |
| `greenhouse_conformed` | 6 | Normalized analytical tables: `delivery_projects`, `delivery_tasks`, `delivery_sprints`, `crm_companies`, `crm_deals`, `crm_contacts`. Partitioned by `synced_at`, clustered by key dimensions | **Active** |
| `greenhouse_marts` | 5 views | Outbox-derived marts: `fin_accounts_from_outbox`, `fin_expenses_from_outbox`, `payroll_entries_from_outbox`, `outbox_entity_latest`, `outbox_event_volume` | **Active** |
| `ico_engine` | 5 tables + 2 views | ICO metrics engine: `metric_snapshots_monthly` (range-partitioned by year), `ai_metric_scores`, `stuck_assets_detail`, `rpa_trend`, `metrics_by_project`; views `v_tasks_enriched`, `v_metric_latest` | **Active** |
| `hubspot_crm` | 35 | HubSpot CRM mirror — companies, contacts, deals, owners, leads, line_items, quotes, products, pipelines, tickets, calls, emails, meetings, notes, tasks + `*_history` tables + `integration_bridge_log` + `greenhouse_capability_catalog` + `greenhouse_tenant_pulls` + `sync_log` | **Active** (legacy, being replaced by `greenhouse_conformed`) |
| `notion_ops` | 10 | Legacy Notion sync — `proyectos`, `tareas`, `sprints`, `revisiones` + `stg_*` staging tables + `raw_pages_snapshot` + `sync_log` | **Active** (legacy, being replaced by `greenhouse_conformed`) |
| `hubspot_notion_sync` | 3 | HubSpot to Notion deal sync: `project_anchor_registry`, `sync_log`, `sync_watermark` | **Active** |
| `notion_hubspot_reverse_sync` | 2 | Notion to HubSpot reverse sync: `sync_log`, `sync_watermark` | **Active** |
| `hubspot_notion_sync_staging` | 3 | Staging variant of deal sync | **Staging** |
| `notion_hubspot_sync_staging` | 2 | Staging variant of reverse sync | **Staging** |
| `analytics_486264460` | 50+ daily | Google Analytics 4 event exports (`events_YYYYMMDD` sharded tables, accumulating since December 2025) | **Active** (external) |
| `searchconsole` | 3 | Google Search Console data: `ExportLog`, `searchdata_site_impression`, `searchdata_url_impression` | **Active** (external) |

### Dataset Lineage

```
greenhouse_raw  ──►  greenhouse_conformed  ──►  greenhouse_marts
                                                ico_engine
hubspot_crm (legacy)  ─┐
notion_ops  (legacy)   ─┤──►  greenhouse_conformed (replacement target)
```

---

## 4. Cloud Run Services (us-central1)

### Production Services

#### 1. notion-bq-sync

| Property | Value |
|----------|-------|
| Type | Custom Cloud Run service |
| Purpose | Multi-tenant Notion to BigQuery sync. Pulls projects, tasks, sprints, and reviews from Notion workspaces and writes to `greenhouse_raw` + `greenhouse_conformed` tables. |

#### 2. hubspot-bq-sync

| Property | Value |
|----------|-------|
| Type | Cloud Function (Gen 2) |
| Runtime | Python 3.12 |
| Memory | 1024 MB |
| Max instances | 3 |
| Secrets | `GREENHOUSE_INTEGRATION_API_TOKEN` (Secret Manager) |
| Purpose | Full HubSpot CRM sync to BigQuery. Pulls all CRM object types into `hubspot_crm` and `greenhouse_raw`. |

#### 3. hubspot-greenhouse-integration

| Property | Value |
|----------|-------|
| Type | Custom Cloud Run service |
| Purpose | Bidirectional HubSpot and Greenhouse integration. Manages company profiles, contacts, and owners. Called from the Next.js application layer. |

#### 4. hubspot-notion-deal-sync

| Property | Value |
|----------|-------|
| Type | Cloud Function (Gen 2) |
| Runtime | Python 3.12 |
| Memory | 512 MB |
| Max instances | 5 |
| Timeout | 600 s |
| BQ dataset | `hubspot_notion_sync` |
| Purpose | Syncs HubSpot deals to Notion project pages. Polls for new/updated deals and creates or updates corresponding Notion pages. |

#### 5. notion-hubspot-reverse-sync

| Property | Value |
|----------|-------|
| Type | Cloud Function (Gen 2) |
| Runtime | Python 3.12 |
| Memory | 512 MB |
| Max instances | 5 |
| Timeout | 300 s |
| BQ dataset | `notion_hubspot_reverse_sync` |
| Purpose | Reverse sync: Notion task property changes are pushed back to HubSpot deal properties. |

#### 6. notion-frameio-sync

| Property | Value |
|----------|-------|
| Type | Cloud Function (Gen 2) |
| Runtime | Python 3.12 |
| Memory | 256 MB |
| Max instances | 10 |
| Timeout | 60 s |
| Purpose | Syncs Frame.io review statuses to Notion page properties. Keeps creative review state in sync across both platforms. |

#### 7. notion-teams-notify

| Property | Value |
|----------|-------|
| Type | Cloud Function (Gen 2) |
| Runtime | Python 3.12 |
| Memory | 256 MB |
| Max instances | 5 |
| Timeout | 30 s |
| Secrets | `MS_CLIENT_SECRET`, `NOTION_TOKEN` (Secret Manager) |
| Purpose | Sends Microsoft Teams channel notifications triggered by Notion task events (assignments, status changes, due-date alerts). |

### Staging Services

| # | Service | Mirrors |
|---|---------|---------|
| 8 | `hubspot-notion-deal-sync-staging` | `hubspot-notion-deal-sync` |
| 9 | `notion-frameio-sync-staging` | `notion-frameio-sync` |
| 10 | `notion-hubspot-reverse-sync-staging` | `notion-hubspot-reverse-sync` |

Staging services share the same configuration as their production counterparts but target `*_staging` BigQuery datasets and are triggered by paused scheduler jobs (manually invocable for testing).

---

## 5. Cloud Scheduler Jobs (us-central1)

### Active Jobs

| Job | Schedule | Target Service | Timezone |
|-----|----------|----------------|----------|
| `notion-bq-daily-sync` | `0 3 * * *` (daily at 3:00 AM) | `notion-bq-sync` | America/Santiago |
| `hubspot-bq-daily-sync` | `30 3 * * *` (daily at 3:30 AM) | `hubspot-bq-sync` | America/Santiago |
| `hubspot-notion-deal-poll` | `*/15 * * * *` (every 15 min) | `hubspot-notion-deal-sync` | America/Santiago |
| `notion-hubspot-reverse-poll` | `7,22,37,52 * * * *` (every 15 min, offset by 7 min) | `notion-hubspot-reverse-sync` | America/Santiago |

The 7-minute offset on `notion-hubspot-reverse-poll` prevents overlap with the forward sync job, reducing contention on shared Notion API rate limits.

### Paused Jobs (Staging)

| Job | Schedule | Target Service |
|-----|----------|----------------|
| `hubspot-notion-deal-poll-staging` | `*/15 * * * *` | `hubspot-notion-deal-sync-staging` |
| `notion-hubspot-reverse-poll-staging` | `7,22,37,52 * * * *` | `notion-hubspot-reverse-sync-staging` |

---

## 6. Vercel Crons

Defined in `vercel.json` at the repository root. These are Next.js API routes invoked by Vercel's built-in cron scheduler.

| Path | Schedule (UTC) | Purpose |
|------|----------------|---------|
| `/api/cron/outbox-publish` | `*/5 * * * *` (every 5 min) | Consumes the Postgres transactional outbox and publishes events to BigQuery |
| `/api/cron/sync-conformed` | `45 3 * * *` (daily 3:45 AM) | Transforms raw Notion data (`notion_ops`) into normalized conformed layer (`greenhouse_conformed`) with PostgreSQL projections. Runs after `notion-bq-sync` (3:00 AM) and before ICO materialization |
| `/api/cron/ico-materialize` | `15 6 * * *` (daily 6:15 AM) | Materializes ICO Engine monthly metric snapshots from conformed and raw data |
| `/api/finance/exchange-rates/sync` | `5 23 * * *` (daily 11:05 PM) | Fetches latest currency exchange rates and persists to Postgres |

---

## 7. Vercel Deployment

| Property | Value |
|----------|-------|
| Production URL | `greenhouse.efeoncepro.com` |
| Staging URL | `dev-greenhouse.efeoncepro.com` |
| Framework | Next.js **16.1** with Turbopack |
| Build system | Vercel (automatic deploys from Git) |

### Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_SECRET` | NextAuth.js session encryption |
| `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` | Azure AD SSO provider |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth provider |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | GCP service account key (JSON) for BigQuery and Cloud SQL access from Vercel |

---

## 8. Secret Manager Usage

Secret Manager adoption is **partial**. Only two services currently use it:

| Service | Secrets Managed |
|---------|----------------|
| `hubspot-bq-sync` | `GREENHOUSE_INTEGRATION_API_TOKEN` |
| `notion-teams-notify` | `MS_CLIENT_SECRET`, `NOTION_TOKEN` |

All other Cloud Functions and Cloud Run services store API tokens and credentials as **plaintext environment variables** in their service configurations. See **Security Notes** for the recommended migration path.

---

## 9. Security Notes

### Current Gaps

| Issue | Severity | Current State | Recommendation |
|-------|----------|---------------|----------------|
| Cloud SQL authorized network | **High** | `0.0.0.0/0` — any IP can attempt connection | Restrict to Vercel edge IPs, Cloud Run egress, and developer VPN CIDR blocks |
| Cloud SQL SSL enforcement | **Medium** | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` — SSL optional | Set to `ENCRYPTED_ONLY` to enforce TLS for all connections |
| Plaintext API tokens | **Medium** | Most Cloud Functions store tokens in env vars | Migrate all secrets to Secret Manager; reference via `--set-secrets` at deploy time |
| Cloud SQL Connector adoption | **Low** | Available but not enforced | Standardize on Cloud SQL Connector with IAM authentication to eliminate password-based access |
| Service account key in Vercel | **Medium** | `GOOGLE_APPLICATION_CREDENTIALS_JSON` contains a full JSON key | Consider Workload Identity Federation for keyless authentication from Vercel |

### Priority Actions

1. **Restrict Cloud SQL network access** — replace `0.0.0.0/0` with explicit CIDR ranges.
2. **Enforce SSL** — change SSL mode to `ENCRYPTED_ONLY`.
3. **Migrate secrets** — move all plaintext tokens to Secret Manager across all Cloud Functions.
4. **Audit IAM bindings** — ensure each service uses a dedicated service account with minimal permissions.

---

## 10. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SOURCES                              │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Notion  │ HubSpot  │ Frame.io │   GA4    │  Search  │  Exchange Rate  │
│   API    │   API    │   API    │  Export  │  Console │     APIs        │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴────────┬───────┘
     │          │          │          │          │              │
     ▼          ▼          ▼          │          │              │
┌─────────────────────────────────┐   │          │              │
│    CLOUD RUN / CLOUD FUNCTIONS  │   │          │              │
│         (us-central1)           │   │          │              │
│                                 │   │          │              │
│  notion-bq-sync                │   │          │              │
│  hubspot-bq-sync               │   │          │              │
│  hubspot-greenhouse-integration │   │          │              │
│  hubspot-notion-deal-sync       │   │          │              │
│  notion-hubspot-reverse-sync    │   │          │              │
│  notion-frameio-sync            │   │          │              │
│  notion-teams-notify            │   │          │              │
└────────┬───────────┬────────────┘   │          │              │
         │           │                │          │              │
         ▼           │                ▼          ▼              │
┌─────────────────────────────────────────────────────────┐    │
│                   BIGQUERY (US multi-region)             │    │
│                                                          │    │
│  greenhouse_raw ──► greenhouse_conformed ──► greenhouse_marts │
│  hubspot_crm          ico_engine                         │    │
│  notion_ops           hubspot_notion_sync                │    │
│  analytics_*          searchconsole                      │    │
└────────────────────────┬─────────────────────────────────┘    │
                         │                                      │
                         │  (ICO materialization,               │
                         │   outbox publish)                    │
                         ▼                                      │
┌──────────────────────────────────────────────────────────┐    │
│              CLOUD SQL — PostgreSQL 16                    │    │
│              greenhouse-pg-dev (us-east4)                 │    │
│                                                          │    │
│  greenhouse_core    greenhouse_finance                   │    │
│  greenhouse_hr      greenhouse_payroll                   │    │
│  greenhouse_crm     greenhouse_delivery                  │    │
│  greenhouse_sync    greenhouse_serving                   │    │
│  greenhouse_ai                                           │    │
└────────────────────────┬─────────────────────────────────┘    │
                         │                                      │
                         ▼                                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                     VERCEL (Next.js 16.1)                        │
│                                                                  │
│  Production:  greenhouse.efeoncepro.com                          │
│  Staging:     dev-greenhouse.efeoncepro.com                      │
│                                                                  │
│  Crons:                                                          │
│    /api/cron/outbox-publish        (every 5 min)                 │
│    /api/cron/ico-materialize       (daily 6:15 AM UTC)           │
│    /api/finance/exchange-rates/sync (daily 11:05 PM UTC)         │
│                                                                  │
│  Auth: Azure AD SSO + Google OAuth                               │
└──────────────────────────────────────────────────────────────────┘
```

### Flow Summary

1. **Ingest** — Cloud Scheduler triggers Cloud Functions/Run services on schedule. Each service pulls from its external source (Notion, HubSpot, Frame.io) and writes to BigQuery.
2. **Conform** — Raw data in `greenhouse_raw` is transformed into `greenhouse_conformed` tables during the sync process, producing clean, partitioned, source-agnostic tables.
3. **Materialize** — Vercel crons run the outbox consumer (Postgres to BigQuery) and ICO Engine materialization (BigQuery to BigQuery and Cloud SQL).
4. **Serve** — The Next.js application reads from Cloud SQL (transactional queries) and BigQuery (analytical queries) to render dashboards, reports, and operational views.
5. **Sync back** — Bidirectional syncs (HubSpot to Notion deals, Notion to HubSpot reverse sync) keep external systems aligned with Greenhouse state.
6. **Notify** — `notion-teams-notify` pushes task-level events to Microsoft Teams channels for real-time team awareness.

---

*End of document.*
