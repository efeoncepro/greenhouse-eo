# Greenhouse Sync Pipelines — Operational Reference V1

## Overview
Greenhouse uses a multi-layer sync architecture to move data between external sources (Notion, HubSpot, Frame.io), BigQuery (warehouse), PostgreSQL (operational store), and the Next.js application.

## Pipeline Inventory

### 1. Notion → BigQuery (notion-bq-sync)
- Type: Custom Cloud Run service
- URL: https://notion-bq-sync-y6egnifl6a-uc.a.run.app
- Schedule: Daily 3:00 AM Chile (Cloud Scheduler: notion-bq-daily-sync)
- Function: Multi-tenant Notion database sync. Reads configured Notion databases per space, writes to greenhouse_raw (notion_*_snapshots) and greenhouse_conformed (delivery_*)
- Config: Space-to-Notion bindings in PostgreSQL (greenhouse_core.notion_workspaces + greenhouse_delivery.space_property_mappings)
- Onboarding: Run notion-schema-discovery.ts → seed mappings → execute sync

### 2. HubSpot → BigQuery (hubspot-bq-sync)
- Type: Cloud Function (Python 3.12)
- URL: https://hubspot-bq-sync-y6egnifl6a-uc.a.run.app
- Schedule: Daily 3:30 AM Chile (Cloud Scheduler: hubspot-bq-daily-sync)
- Function: Full CRM sync — companies, contacts, deals, owners, leads, line_items, quotes, products, pipelines, tickets, calls, emails, meetings, notes, tasks. Writes current state + _history tables to hubspot_crm dataset. Also writes to greenhouse_raw (hubspot_*_snapshots) and greenhouse_conformed (crm_*)
- Auth: HubSpot PAT + GREENHOUSE_INTEGRATION_API_TOKEN (Secret Manager)
- Config env: BQ_DATASET=hubspot_crm, GCP_PROJECT=efeonce-group
- Also calls Greenhouse integration API to sync tenant capabilities

### 3. HubSpot → Notion Deal Sync (hubspot-notion-deal-sync)
- Type: Cloud Function (Python 3.12)
- URL: https://hubspot-notion-deal-sync-y6egnifl6a-uc.a.run.app
- Schedule: Every 15 min (Cloud Scheduler: hubspot-notion-deal-poll)
- Function: Creates/updates Notion project pages from HubSpot deals. Uses project_anchor_registry in hubspot_notion_sync dataset for idempotent mapping.
- HubSpot Portal: 48713323
- Notion DBs: Proyectos + Tareas databases

### 4. Notion → HubSpot Reverse Sync (notion-hubspot-reverse-sync)
- Type: Cloud Function (Python 3.12)
- URL: https://notion-hubspot-reverse-sync-y6egnifl6a-uc.a.run.app
- Schedule: Every 15 min offset (7,22,37,52 min marks) (Cloud Scheduler: notion-hubspot-reverse-poll)
- Function: Syncs Notion task status changes back to HubSpot deal/task properties
- BQ Dataset: notion_hubspot_reverse_sync (sync_log, sync_watermark)

### 5. Notion ↔ Frame.io (notion-frameio-sync)
- Type: Cloud Function (Python 3.12)
- URL: https://notion-frameio-sync-y6egnifl6a-uc.a.run.app
- Schedule: On-demand (no scheduler)
- Function: Syncs Frame.io review statuses (Approved, Changes Requested, In Progress, Needs Review) to Notion page properties. Also syncs frame URLs and version counts.
- Notion DB: Creative review database (3a54f090...)
- Notion Props: Estado, URL Frame.io, Frame Comments, Frame Versions

### 6. Notion → MS Teams (notion-teams-notify)
- Type: Cloud Function (Python 3.12)
- URL: https://notion-teams-notify-y6egnifl6a-uc.a.run.app
- Schedule: On-demand
- Function: Sends MS Teams channel notifications for Notion task events (new tasks, status changes, due dates)
- Teams Channel: 19:762417213c...@thread.v2
- Auth: MS Graph API (Secret Manager for MS_CLIENT_SECRET)

### 7. HubSpot ↔ Greenhouse Integration (hubspot-greenhouse-integration)
- Type: Custom Cloud Run service
- URL: https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app
- Schedule: On-demand (called by Next.js app)
- Function: Bidirectional integration between HubSpot and Greenhouse. Company profiles, contact lists, owner data resolution. Called from src/lib/integrations/greenhouse-integration.ts

### 8. Postgres → BigQuery Outbox (Vercel Cron)
- Path: /api/cron/outbox-publish
- Schedule: Every 5 minutes
- Function: Reads postgres outbox table, publishes events to greenhouse_raw.postgres_outbox_events. Tracks sync runs.
- Consumer: src/lib/sync/outbox-consumer.ts

### 9. Conformed Data Layer Sync (Vercel Cron)
- Path: /api/cron/sync-conformed
- Schedule: Daily 3:45 AM UTC
- Function: Reads notion_ops.* (raw Notion data), transforms to normalized conformed layer. Writes greenhouse_conformed.delivery_tasks/projects/sprints. Uses safe DELETE pattern (no TRUNCATE). Resolves space_id via space_notion_sources (canonical, multi-tenant).
- Source: src/lib/sync/sync-notion-conformed.ts
- Dependency: Runs after notion-bq-sync Cloud Run (3:00 AM) and before ico-materialize (6:15 AM)

### 10. ICO Engine Materialization (Vercel Cron)
- Path: /api/cron/ico-materialize
- Schedule: Daily 6:15 AM UTC
- Function: Computes monthly ICO metrics from greenhouse_conformed.delivery_tasks, writes snapshots to ico_engine.metric_snapshots_monthly + related tables. Batched CSC distribution update. Configurable fase_csc via status_phase_config table.
- Source: src/lib/ico-engine/materialize.ts
- Health: /api/ico-engine/health — returns materialization freshness (status, lastMaterializedAt, hoursSinceLastMaterialization)

### 11. Economic Indicators Sync (Vercel Cron)
- Path: /api/finance/economic-indicators/sync
- Schedule: Daily 11:05 PM UTC
- Function: Fetches latest economic indicators for Chile, writes to `greenhouse_finance.economic_indicators`, and keeps `USD/CLP` compatibility synchronized into `greenhouse_finance.exchange_rates`

### 12. Reactive Payroll Consumers (Vercel Cron)
- Paths:
  - `/api/cron/outbox-react-people`
  - `/api/cron/outbox-react-finance`
- Schedule: According to the shared outbox-react Vercel crons
- Function:
  - consume outbox-backed payroll events published from PostgreSQL
  - refresh `member_capacity_economics`, `person_intelligence` and `client_economics` when payroll period state or entries change
- Canonical payroll event edge:
  - `payroll_period.exported` is the operational close signal for downstream projections
- Note:
  - the reactive architecture assumes `Payroll` is `Postgres-first`; BigQuery compatibility paths do not replace canonical outbox publication

## Data Flow Layers
```
External APIs (Notion, HubSpot, Frame.io)
    ↓ Cloud Functions/Run (us-central1)
BigQuery Raw (greenhouse_raw) — immutable snapshots
    ↓ Transform (within sync services)
BigQuery Conformed (greenhouse_conformed) — normalized tables
    ↓ Outbox / Projection scripts
PostgreSQL (greenhouse_app) — operational store
    ↓ Outbox consumer (Vercel cron)
BigQuery Marts (greenhouse_marts) — derived views
    ↓
Next.js API Routes (Vercel) — reads Postgres-first with BQ fallback
```

## Staging vs Production
Production functions target:
- HubSpot Portal: 48713323
- BigQuery datasets: hubspot_crm, notion_hubspot_reverse_sync, hubspot_notion_sync

Staging functions target:
- HubSpot Portal: 51183921
- BigQuery datasets: hubspot_notion_sync_staging, notion_hubspot_sync_staging
- Currently PAUSED

## Monitoring
- Each sync service writes to sync_log tables with sync_run_id, timestamps, counts
- Watermark tables track incremental sync position
- BigQuery outbox has occurred_at partitioning for event tracking
- No centralized alerting configured yet
