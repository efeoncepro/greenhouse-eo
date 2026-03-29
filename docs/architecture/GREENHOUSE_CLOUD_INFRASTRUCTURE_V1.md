# Greenhouse EO — Cloud Infrastructure Reference

> **Version:** 1.0
> **Last updated:** 2026-03-29
> **Audience:** Platform engineers, DevOps, on-call operators

---

## Delta 2026-03-29 — Runtime auth baseline + Cloud SQL verified posture

- El repo ya no depende solo de `GOOGLE_APPLICATION_CREDENTIALS_JSON` para su runtime Vercel.
- La capa canónica ahora vive en:
  - `src/lib/google-credentials.ts`
  - `src/lib/cloud/gcp-auth.ts`
  - `src/lib/cloud/postgres.ts`
- El orden efectivo de autenticación GCP en runtime quedó formalizado así:
  1. `Workload Identity Federation` vía `VERCEL_OIDC_TOKEN` + `GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT_EMAIL`
  2. fallback a `GOOGLE_APPLICATION_CREDENTIALS_JSON` o `_BASE64`
  3. `ambient ADC` cuando el entorno ya provee credenciales implícitas
- Consumers principales ya alineados:
  - `src/lib/bigquery.ts`
  - `src/lib/postgres/client.ts`
  - `src/lib/storage/greenhouse-media.ts`
  - `src/lib/ai/google-genai.ts`
- Scripts legacy que parseaban SA key manualmente también quedaron migrados al helper canónico en esta sesión.
- Estado real verificado de `greenhouse-pg-dev` al 2026-03-29:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - `replicationLogArchivingEnabled=true`
  - flags `log_min_duration_statement=1000` y `log_statement=ddl`
  - sigue pendiente el hardening externo:
    - `authorizedNetworks` incluye `0.0.0.0/0`
    - `sslMode=ALLOW_UNENCRYPTED_AND_ENCRYPTED`
    - `requireSsl=false`
- Rollout externo WIF ya materializado en GCP:
  - project number `183008134038`
  - Workload Identity Pool `vercel`
  - Provider `greenhouse-eo`
  - service account runtime actual: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
  - bindings `roles/iam.workloadIdentityUser` aplicados para principals de `development`, `preview`, `staging` y `production`
- Estado Vercel verificado al 2026-03-29:
  - `development`, `staging` y `production` ya tienen `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT_EMAIL` y `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`
  - el preview de la rama `feature/codex-task-096-wif-baseline` necesitó además `GCP_PROJECT` + credenciales runtime Postgres para validar health end-to-end
  - tras ese redeploy, el preview `greenhouse-i3cak6akh-efeonce-7670142f.vercel.app` respondió `200 OK` en `/api/internal/health` con:
    - `auth.mode=wif`
    - BigQuery reachable
    - Cloud SQL reachable vía connector usando `efeonce-group:us-east4:greenhouse-pg-dev`
  - también se detectó drift de configuración/env mapping:
    - varios envs siguen almacenados con sufijo literal `\n`
    - `dev-greenhouse.efeoncepro.com/api/internal/health` respondió el 2026-03-29 desde un deployment `preview` de `develop` (`version=7a2ecec`, `auth.mode=service_account_key`), no desde un target `staging` inequívoco

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
| `requireSsl` | `false` |
| Authorized networks | `0.0.0.0/0` (**see Security Notes**) |
| Backup window | Daily at **07:00 UTC**, 7-day retention |
| PITR | `Enabled` |
| WAL retention | `7 days` |
| Replication log archiving | `Enabled` |
| Database flags | `log_min_duration_statement=1000`, `log_statement=ddl` |

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

- **Cloud SQL Connector** (preferred) — metadata/auth tokens now resolve through the shared WIF-aware helper in `src/lib/google-credentials.ts`; Postgres app access still uses runtime username/password and **not** IAM DB auth.
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
| Shared non-prod URL | `dev-greenhouse.efeoncepro.com` |
| Framework | Next.js **16.1** with Turbopack |
| Build system | Vercel (automatic deploys from Git) |

### Deployment Notes

- El branch preview actual validado para `TASK-096` es `feature/codex-task-096-wif-baseline`.
- El redeploy verificado con health OK fue `version=7638f85` en `greenhouse-i3cak6akh-efeonce-7670142f.vercel.app`.
- `dev-greenhouse.efeoncepro.com` no debe asumirse como `staging` canónico sin revalidación: al 2026-03-29 respondió desde un deployment `preview` de `develop`.

### Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_SECRET` | NextAuth.js session encryption |
| `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` | Azure AD SSO provider |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth provider |
| `GCP_PROJECT` | Project ID efectivo para BigQuery/clients GCP |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Pool Provider resource name for Vercel OIDC |
| `GCP_SERVICE_ACCOUNT_EMAIL` | Service account to impersonate from Vercel via WIF |
| `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` | Cloud SQL instance connection name para Cloud SQL Connector |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Transitional fallback SA key for Preview/local or runtimes where WIF is not yet active |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` | Transitional fallback SA key variant |

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

> **Full security posture, secret management strategy, and hardening plan:** see [GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md](GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md).
> The sections below are retained for quick reference but the posture doc is authoritative.

### Current Gaps

| Issue | Severity | Current State | Recommendation | Task |
|-------|----------|---------------|----------------|------|
| Cloud SQL authorized network | **High** | `0.0.0.0/0` — any IP can attempt connection | Restrict to Vercel edge IPs, Cloud Run egress, and developer VPN CIDR blocks | TASK-096 Fase 1 |
| Cloud SQL SSL enforcement | **Medium** | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` — SSL optional | Set to `ENCRYPTED_ONLY` to enforce TLS for all connections | TASK-096 Fase 1 |
| Plaintext API tokens | **Medium** | Most Cloud Functions store tokens in env vars | Migrate critical secrets to Secret Manager | TASK-096 Fase 3 |
| Cloud SQL Connector adoption | **Low** | Preview WIF path ya quedó validado con connector, pero `develop/dev-greenhouse` sigue observándose con host directo | Estandarizar connector en el entorno compartido antes del hardening externo | TASK-096 Fase 2 |
| Service account key in Vercel | **Medium** | WIF ya existe y quedó validado en preview, pero la SA key sigue presente como fallback transicional | Retirar la SA key después de validar entorno compartido y producción | TASK-096 Fase 2 |
| No security headers | **Medium** | No middleware.ts, no CSP/HSTS/X-Frame-Options | Create middleware.ts with security headers | TASK-099 |
| Silent production failures | **High** | console.error() only, zero alerting | Sentry + health endpoint + Slack alerts | TASK-098 |
| Inconsistent cron auth | **Medium** | 2 patterns, some fail-open, no timing-safe | Centralized requireCronAuth() helper | TASK-101 |
| Restore test pendiente | **Medium** | PITR ya está habilitado, pero el restore test no quedó cerrado | Completar prueba de restore y documentar evidencia | TASK-102 |
| No cost visibility | **Low** | Zero budget alerts | GCP budget alerts + BigQuery cost guards | TASK-103 |

### Priority Actions

1. **Restrict Cloud SQL network access** — replace `0.0.0.0/0` with explicit CIDR ranges (TASK-096 Fase 1).
2. **Enforce SSL** — change SSL mode to `ENCRYPTED_ONLY` (TASK-096 Fase 1).
3. **Add tests to CI** — 86 test files not running in pipeline (TASK-100).
4. **Security headers middleware** — CSP, HSTS, X-Frame-Options (TASK-099).
5. **Workload Identity Federation** — eliminate static SA key (TASK-096 Fase 2).
6. **Observability MVP** — Sentry + health endpoint + Slack cron alerts (TASK-098).
7. **Migrate critical secrets** — 6 secrets to Secret Manager (TASK-096 Fase 3).
8. **Standardize cron auth** — single timing-safe helper for 18 routes (TASK-101).
9. **Database resilience** — PITR, slow query logging, pool sizing, restore test (TASK-102).
10. **Budget alerts** — GCP billing + BigQuery cost guards (TASK-103).

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
