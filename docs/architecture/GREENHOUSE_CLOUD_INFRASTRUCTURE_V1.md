# Greenhouse EO — Cloud Infrastructure Reference

> **Version:** 1.1
> **Last updated:** 2026-04-04
> **Audience:** Platform engineers, DevOps, on-call operators

---

## Delta 2026-04-04 — Workload placement policy: batch processing goes to GCP Cloud

TASK-239 expuso que la materialización ICO completa excede el timeout de Vercel Functions (120s). La decisión de arquitectura es:

**Todo proceso de datos que no sea request-response de portal debe ejecutarse en el servicio, artefacto o primitiva de GCP más idóneo — no en Vercel Functions.**

Esto aplica a:
- Materialización de snapshots y métricas (ICO Engine, conformed layer)
- Pipelines de enriquecimiento AI/LLM (señales, enrichments, scoring)
- Sync batch de fuentes externas (Notion, HubSpot, Nubox)
- Transformaciones ETL, backfills y re-procesamientos
- Cualquier proceso que exceda 30s o que no requiera contexto de sesión de usuario

**Criterio de selección de artefacto GCP:**

| Característica | Cloud Run | Cloud Functions (Gen 2) | Cloud Scheduler | Cloud Tasks |
|---|---|---|---|---|
| Proceso HTTP con timeout largo (>30s) | **Idóneo** | Alternativa | — | — |
| Job periódico (cron) | — | — | **Idóneo** (trigger) | — |
| Fan-out paralelo (N items) | — | — | — | **Idóneo** |
| Sync con API externa (webhook/poll) | **Idóneo** (ya probado) | Alternativa | Trigger | — |
| Pipeline AI/LLM (múltiples llamadas) | **Idóneo** (timeout configurable) | — | Trigger | — |

**Vercel Functions** quedan reservados para:
- API routes que sirven al portal (request-response < 30s)
- Cron triggers livianos que disparan servicios GCP (fire-and-forget)
- Reactive consumers del outbox (procesan eventos individualmente, < 30s cada uno)

**Referencia de implementación:** TASK-241 materializa esta política con el primer servicio Cloud Run para ICO batch processing.

Sección completa: §1.1 Workload Placement Policy.

---

## Delta 2026-03-31 — Shared asset buckets fully provisioned and cut over

- La topología dedicada de assets ya no es una decisión futura; quedó provisionada y en uso:
  - `efeonce-group-greenhouse-public-media-dev`
  - `efeonce-group-greenhouse-public-media-staging`
  - `efeonce-group-greenhouse-public-media-prod`
  - `efeonce-group-greenhouse-private-assets-dev`
  - `efeonce-group-greenhouse-private-assets-staging`
  - `efeonce-group-greenhouse-private-assets-prod`
- Verificación operativa ejecutada en GCP:
  - upload autenticado a bucket público: `200`
  - upload autenticado a bucket privado: `200`
  - lectura anónima en bucket público: `200`
  - lectura anónima en bucket privado: `401`
  - cleanup autenticado de probes: `204`
- Estado efectivo de runtime:
  - `development` usa buckets `dev`
  - `staging` usa buckets `staging`
  - `production` usa buckets `prod`
  - `preview (develop)` usa buckets `staging`
- Compatibilidad transicional:
  - `GREENHOUSE_PUBLIC_MEDIA_BUCKET` es el carril canónico de media pública
  - `GREENHOUSE_PRIVATE_ASSETS_BUCKET` es el carril canónico de adjuntos privados
  - `GREENHOUSE_MEDIA_BUCKET` queda solo como fallback legacy para surfaces públicas aún no cortadas completamente

## Delta 2026-03-29 — Health runtime ya no degrada por perfiles Postgres de tooling

- El repo cerró `TASK-131` para corregir el warning residual del health cloud.
- `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` siguen documentados como perfiles de tooling, no como dependencias del runtime del portal.
- La postura operativa mantiene su visibilidad, pero el `overallStatus` del health ya no debe degradarse solo por esos perfiles ausentes.

## Delta 2026-03-31 — Shared attachments storage topology approved

- `TASK-173` fija la decisión arquitectónica para adjuntos/archivos del portal.
- Greenhouse no debe seguir creciendo sobre un único bucket genérico para todos los casos de uso.
- Topología aprobada de aquí en adelante:
  - `public media` por entorno
  - `private assets` por entorno
- Convención base recomendada:
  - `${GCP_PROJECT}-greenhouse-public-media-dev`
  - `${GCP_PROJECT}-greenhouse-public-media-staging`
  - `${GCP_PROJECT}-greenhouse-public-media-prod`
  - `${GCP_PROJECT}-greenhouse-private-assets-dev`
  - `${GCP_PROJECT}-greenhouse-private-assets-staging`
  - `${GCP_PROJECT}-greenhouse-private-assets-prod`
- Regla operativa:
  - `public media` sirve logos, avatars y assets visuales de baja sensibilidad
  - `private assets` sirve adjuntos operativos, documentos HR, receipts, payroll PDFs y respaldos
  - la separación por módulo debe vivir primero en prefixes y metadata, no en proliferación de buckets
- Prefixes base aprobados para `private assets`:
  - `leave/`
  - `hr-documents/`
  - `expense-reports/`
  - `payroll-receipts/`
  - `payroll-exports/`
  - `providers/`
  - `tooling/`
- El bucket actual `${GCP_PROJECT}-greenhouse-media` pasa a leerse como baseline legacy/transicional; no debe seguir siendo el destino por defecto para nuevas capacidades documentales privadas.

## Delta 2026-03-31 — Shared attachments bootstrap path

El repo ya incluye el bootstrap canónico de la foundation shared:

- `scripts/setup-postgres-shared-assets.sql`
- `scripts/setup-postgres-shared-assets.ts`
- comando `pnpm setup:postgres:shared-assets`

Estado real:

- el DDL ya quedó aplicado remotamente en `greenhouse-pg-dev / greenhouse_app`
- `greenhouse_sync.schema_migrations` ya registra `shared-assets-platform-v1`
- `greenhouse_migrator_user` ya puede reejecutar `pnpm setup:postgres:shared-assets` sin depender de `postgres`

Regla operativa:

- no volver a introducir ownership drift en tablas shared que bloquee la reejecución con `migrator`
- no promover consumers que dependan de buckets dedicados por entorno hasta que esos buckets existan realmente en GCP

## Delta 2026-03-31 — Runtime bucket pinning while dedicated buckets remain pending

- La topología dedicada ya quedó provisionada realmente en GCP:
  - `efeonce-group-greenhouse-public-media-dev`
  - `efeonce-group-greenhouse-public-media-staging`
  - `efeonce-group-greenhouse-public-media-prod`
  - `efeonce-group-greenhouse-private-assets-dev`
  - `efeonce-group-greenhouse-private-assets-staging`
  - `efeonce-group-greenhouse-private-assets-prod`
- Configuración aplicada:
  - `US-CENTRAL1`
  - `STANDARD`
  - `uniform bucket-level access=true`
  - buckets privados con `publicAccessPrevention=enforced`
  - buckets públicos con lectura anónima controlada (`roles/storage.objectViewer` para `allUsers`)
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/storage.objectAdmin` bucket-level
- Vercel ya quedó alineado así:
  - `development` -> `public-media-dev` / `private-assets-dev`
  - `staging` -> `public-media-staging` / `private-assets-staging`
  - `production` -> `public-media-prod` / `private-assets-prod`
  - `preview (develop)` -> `public-media-staging` / `private-assets-staging`
- Compatibilidad transicional:
  - `GREENHOUSE_MEDIA_BUCKET` también quedó fijado a los buckets públicos dedicados
  - `src/lib/storage/greenhouse-media.ts` ahora prioriza `GREENHOUSE_PUBLIC_MEDIA_BUCKET` y solo cae a `GREENHOUSE_MEDIA_BUCKET` como fallback legacy
- Regla:
  - no volver a apuntar nuevas capacidades documentales privadas al bucket legacy `${GCP_PROJECT}-greenhouse-media`
  - en este proyecto `Preview` no debe asumirse como entorno shared puro: la presencia de env vars branch-scoped obliga a fijar como mínimo `preview (develop)` si queremos un baseline consistente

## Delta 2026-03-29 — Secret Manager rollout validated in staging + production

- `origin/develop` ya quedó en `497cb19` con los tres slices de `TASK-124`.
- `staging` ya validó ese commit en `dev-greenhouse.efeoncepro.com`.
- `dev-greenhouse.efeoncepro.com/api/internal/health` confirmó en runtime:
  - `GREENHOUSE_POSTGRES_PASSWORD` via `secret_manager`
  - `NEXTAUTH_SECRET` via `secret_manager`
  - `AZURE_AD_CLIENT_SECRET` via `secret_manager`
  - `NUBOX_BEARER_TOKEN` via `secret_manager`
- `production` ya validó el mismo patrón en `greenhouse.efeoncepro.com/api/internal/health` sobre `version=7238a90`.
- El rollout externo previo también dejó preparados en Vercel:
  - `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF`
  - `NEXTAUTH_SECRET_SECRET_REF`
  - `AZURE_AD_CLIENT_SECRET_SECRET_REF`
  - `GOOGLE_CLIENT_SECRET_SECRET_REF`
  - `NUBOX_BEARER_TOKEN_SECRET_REF`
    para `staging` y `production`, sin retirar aún los env vars legacy.
- Estado residual observado en `staging`:
  - `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` no están proyectados en el runtime del portal

## Delta 2026-03-29 — Observability webhook secret ref baseline

- `SLACK_ALERTS_WEBHOOK_URL` quedó alineado al patrón `Secret Manager -> env fallback`.
- Variable nueva documentada para rollout por entorno:
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- Alcance deliberadamente acotado:
  - no cambia todavía `CRON_SECRET`
  - no cambia `SENTRY_AUTH_TOKEN` en build

## Delta 2026-03-29 — Proxy baseline for security headers

- `TASK-099` inició una capa `src/proxy.ts` para headers cross-cutting del portal.
- El slice actual agrega:
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `X-DNS-Prefetch-Control`
  - `Strict-Transport-Security` solo en `production`
- El `Content-Security-Policy` real se difiere a una segunda iteración para no romper MUI/Emotion, OAuth y assets en el primer rollout.

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
    - las variables del rollout WIF/conector ya fueron saneadas en `development`, `staging`, `production`, `preview/develop` y `preview/feature/codex-task-096-wif-baseline`
    - el preview activo ya quedó con baseline mínima de Postgres para validar el connector
    - `dev-greenhouse.efeoncepro.com` quedó confirmado como `target=staging`
    - tras redeploy del staging activo, el entorno compartido respondió con `version=7a2ecec`, `auth.mode=mixed` y `usesConnector=true`
    - eso deja explícito que staging ya tomó el connector y la configuración nueva, pero no aún el baseline WIF final de esta rama

## Delta 2026-03-29 — Secret Manager runtime baseline

- `TASK-124` ya materializó el helper canónico `src/lib/secrets/secret-manager.ts`.
- Nuevo contrato runtime para secretos críticos:
  - valor legacy: `<ENV_VAR>`
  - referencia opcional a Secret Manager: `<ENV_VAR>_SECRET_REF`
  - resolución efectiva: `Secret Manager -> env fallback -> unconfigured`
- `GET /api/internal/health` ahora expone también la postura de secretos críticos sin devolver valores.
- Primer consumer migrado en el portal:
  - `src/lib/nubox/client.ts` para `NUBOX_BEARER_TOKEN`
- La credencial runtime de PostgreSQL también quedó alineada:
  - `src/lib/postgres/client.ts` ya acepta `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF`
  - `scripts/lib/load-greenhouse-tool-env.ts` ya soporta refs para `runtime`, `migrator` y `admin`
- La capa auth del portal también quedó alineada:
  - `src/lib/auth-secrets.ts` resuelve `NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET` y `GOOGLE_CLIENT_SECRET`
  - Microsoft SSO y Google SSO conservan su disponibilidad condicionada por `*_CLIENT_ID` + secret resuelto
- El resto de secretos críticos siguen pendientes de migración por slices posteriores:
  - validación real en `staging` y `production`

## 1. Overview

Greenhouse EO runs on **Google Cloud Platform** under the project **`efeonce-group`**, with Vercel handling the Next.js frontend and API routes. The workload is spread across three GCP regions chosen for latency, cost, and service availability:

| Concern                     | Region                         | Rationale                                                        |
| --------------------------- | ------------------------------ | ---------------------------------------------------------------- |
| Cloud SQL (PostgreSQL)      | `us-east4` (Northern Virginia) | Low-latency transactional DB                                     |
| Cloud Run / Cloud Functions | `us-central1` (Iowa)           | Broadest service catalog, default for serverless                 |
| BigQuery                    | `US` (multi-region)            | Maximizes co-location with Cloud Functions and analytics exports |

All inter-service communication stays within GCP, except for Vercel-originated calls to Cloud Run/Cloud SQL and external webhook traffic from Notion, HubSpot, and Frame.io.

---

## 1.1 Workload Placement Policy

### Principio rector

**El procesamiento de datos que no es interacción directa con el usuario del portal debe ejecutarse en GCP Cloud, no en Vercel Functions.**

Vercel es la capa de presentación y API del portal. GCP Cloud es la capa de procesamiento, transformación y orquestación de datos. La frontera entre ambos está definida por la naturaleza del trabajo, no por conveniencia de implementación.

### Reglas de colocación

| Tipo de proceso | Dónde corre | Por qué |
|---|---|---|
| API route que sirve datos al portal (GET/POST < 30s) | Vercel Functions | Es request-response del portal, necesita sesión de usuario |
| Materialización de métricas, snapshots, reports | **Cloud Run** | Excede 30s, no requiere sesión, accede a BigQuery + PostgreSQL |
| Pipeline AI/LLM (scoring, enrichment, evaluación) | **Cloud Run** | Múltiples llamadas a LLM, timeout impredecible, no requiere sesión |
| Sync batch de fuente externa (Notion, HubSpot, Nubox) | **Cloud Run / Cloud Functions** | Ya probado, volumen variable, timeout largo |
| ETL, backfill, re-procesamiento | **Cloud Run** | Proceso pesado one-shot, timeout configurable hasta 60 min |
| Trigger periódico (cron) | **Cloud Scheduler** → Cloud Run | Scheduler dispara, Cloud Run ejecuta |
| Fan-out paralelo (procesar N items) | **Cloud Tasks** → Cloud Run/Functions | Distribuye carga, cada item es un HTTP call |
| Reactive consumer del outbox (< 30s por evento) | Vercel Functions (cron) | Eventos individuales son livianos, cabe en Vercel |
| Health checks y triggers fire-and-forget | Vercel Functions | Liviano, solo dispara y retorna |

### Regla de decisión rápida

```
¿El proceso necesita sesión de usuario?
  → Sí: Vercel Functions
  → No: ¿Puede completar en < 30s de forma consistente?
    → Sí: Vercel Functions (cron route) es aceptable
    → No: Cloud Run + Cloud Scheduler
```

### Anti-patterns

- **No fragmentar un proceso pesado en N endpoints Vercel para esquivar el timeout.** Si el proceso es pesado, va a Cloud Run como unidad.
- **No crear Cloud Functions nuevas cuando Cloud Run sirve.** Cloud Run es más flexible (container, timeout configurable, concurrencia). Cloud Functions solo si el trigger nativo (Pub/Sub, Storage) lo justifica.
- **No asumir que un proceso liviano hoy seguirá siéndolo.** Si un cron route de Vercel empieza a acercarse a 30s, planificar la migración antes de que falle.

### Inventario de procesos por migrar (a 2026-04-04)

| Proceso | Ubicación actual | Timeout típico | Acción |
|---|---|---|---|
| ICO materialización completa | Vercel `/api/cron/ico-materialize` | >120s (falla) | **Migrar a Cloud Run (TASK-241)** |
| LLM enrichment pipeline | Vercel (trigger reactivo) | 60-90s (riesgo) | **Migrar a Cloud Run (TASK-241)** |
| ICO member sync | Vercel `/api/cron/ico-member-sync` | ~45s | Monitorear, migrar si crece |
| Sync conformed | Vercel `/api/cron/sync-conformed` | ~30-60s | Monitorear, migrar si crece |
| Nubox sync | Vercel `/api/cron/nubox-sync` | ~15s | OK en Vercel por ahora |
| Exchange rates / indicators | Vercel cron | ~5s | OK en Vercel |
| Outbox publish / react | Vercel cron `*/5 min` | ~5-15s | OK en Vercel |

---

## 2. Cloud SQL (PostgreSQL)

### Instance Details

| Property                  | Value                                                  |
| ------------------------- | ------------------------------------------------------ |
| Instance name             | `greenhouse-pg-dev`                                    |
| Engine                    | PostgreSQL **16.13**                                   |
| Zone                      | `us-east4-a`                                           |
| Machine type              | `db-custom-1-3840` (1 vCPU, 3.75 GB RAM)               |
| Storage                   | 20 GB SSD, **auto-resize enabled**                     |
| Public IP                 | `34.86.135.144`                                        |
| SSL mode                  | `ALLOW_UNENCRYPTED_AND_ENCRYPTED`                      |
| `requireSsl`              | `false`                                                |
| Authorized networks       | `0.0.0.0/0` (**see Security Notes**)                   |
| Backup window             | Daily at **07:00 UTC**, 7-day retention                |
| PITR                      | `Enabled`                                              |
| WAL retention             | `7 days`                                               |
| Replication log archiving | `Enabled`                                              |
| Database flags            | `log_min_duration_statement=1000`, `log_statement=ddl` |

### Databases

| Database         | Role                                       |
| ---------------- | ------------------------------------------ |
| `postgres`       | Default system database                    |
| `greenhouse_app` | Application database (all product schemas) |

### Schemas in `greenhouse_app`

| Schema                | Domain                                            |
| --------------------- | ------------------------------------------------- |
| `greenhouse_core`     | Tenants, users, roles, permissions, feature flags |
| `greenhouse_serving`  | Materialized views and API-optimized projections  |
| `greenhouse_sync`     | Outbox, watermarks, sync state                    |
| `greenhouse_hr`       | People, org charts, employment records            |
| `greenhouse_payroll`  | Payroll entries, periods, calculations            |
| `greenhouse_finance`  | Accounts, transactions, exchange rates, expenses  |
| `greenhouse_delivery` | Projects, tasks, sprints, capacity                |
| `greenhouse_crm`      | Companies, contacts, deals (CRM mirror)           |
| `greenhouse_ai`       | AI scoring, recommendations, embeddings           |

### Access Model

| Role                  | Purpose                   | Privileges                                |
| --------------------- | ------------------------- | ----------------------------------------- |
| `postgres`            | Superuser / admin         | Full DDL + DML on all schemas             |
| `greenhouse_migrator` | Schema migrations (CI/CD) | DDL on application schemas                |
| `greenhouse_runtime`  | Application runtime       | DML only (SELECT, INSERT, UPDATE, DELETE) |

### Connectivity

- **Cloud SQL Connector** (preferred) — metadata/auth tokens now resolve through the shared WIF-aware helper in `src/lib/google-credentials.ts`; Postgres app access still uses runtime username/password and **not** IAM DB auth.
- **Direct IP** — connect to `34.86.135.144:5432` with username/password. Currently allowed from any IP.

---

## 3. BigQuery Datasets

The analytics warehouse is organized into 13 datasets. Tables marked _legacy_ are still queryable but are being superseded by the conformed layer.

| Dataset                       | Tables             | Purpose                                                                                                                                                                                                                                                                            | Status                                                        |
| ----------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `greenhouse`                  | 41                 | Core platform tables: auth, finance, HR, payroll, AI, identity, service modules                                                                                                                                                                                                    | **Active**                                                    |
| `greenhouse_raw`              | 11                 | Immutable source snapshots — Notion (projects, tasks, sprints, people, databases), HubSpot (companies, contacts, deals, owners, line_items), Postgres outbox events                                                                                                                | **Active**                                                    |
| `greenhouse_conformed`        | 6                  | Normalized analytical tables: `delivery_projects`, `delivery_tasks`, `delivery_sprints`, `crm_companies`, `crm_deals`, `crm_contacts`. Partitioned by `synced_at`, clustered by key dimensions                                                                                     | **Active**                                                    |
| `greenhouse_marts`            | 5 views            | Outbox-derived marts: `fin_accounts_from_outbox`, `fin_expenses_from_outbox`, `payroll_entries_from_outbox`, `outbox_entity_latest`, `outbox_event_volume`                                                                                                                         | **Active**                                                    |
| `ico_engine`                  | 5 tables + 2 views | ICO metrics engine: `metric_snapshots_monthly` (range-partitioned by year), `ai_metric_scores`, `stuck_assets_detail`, `rpa_trend`, `metrics_by_project`; views `v_tasks_enriched`, `v_metric_latest`                                                                              | **Active**                                                    |
| `hubspot_crm`                 | 35                 | HubSpot CRM mirror — companies, contacts, deals, owners, leads, line_items, quotes, products, pipelines, tickets, calls, emails, meetings, notes, tasks + `*_history` tables + `integration_bridge_log` + `greenhouse_capability_catalog` + `greenhouse_tenant_pulls` + `sync_log` | **Active** (legacy, being replaced by `greenhouse_conformed`) |
| `notion_ops`                  | 10                 | Legacy Notion sync — `proyectos`, `tareas`, `sprints`, `revisiones` + `stg_*` staging tables + `raw_pages_snapshot` + `sync_log`                                                                                                                                                   | **Active** (legacy, being replaced by `greenhouse_conformed`) |
| `hubspot_notion_sync`         | 3                  | HubSpot to Notion deal sync: `project_anchor_registry`, `sync_log`, `sync_watermark`                                                                                                                                                                                               | **Active**                                                    |
| `notion_hubspot_reverse_sync` | 2                  | Notion to HubSpot reverse sync: `sync_log`, `sync_watermark`                                                                                                                                                                                                                       | **Active**                                                    |
| `hubspot_notion_sync_staging` | 3                  | Staging variant of deal sync                                                                                                                                                                                                                                                       | **Staging**                                                   |
| `notion_hubspot_sync_staging` | 2                  | Staging variant of reverse sync                                                                                                                                                                                                                                                    | **Staging**                                                   |
| `analytics_486264460`         | 50+ daily          | Google Analytics 4 event exports (`events_YYYYMMDD` sharded tables, accumulating since December 2025)                                                                                                                                                                              | **Active** (external)                                         |
| `searchconsole`               | 3                  | Google Search Console data: `ExportLog`, `searchdata_site_impression`, `searchdata_url_impression`                                                                                                                                                                                 | **Active** (external)                                         |

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

| Property | Value                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type     | Custom Cloud Run service                                                                                                                                                 |
| Purpose  | Multi-tenant Notion to BigQuery sync. Pulls projects, tasks, sprints, and reviews from Notion workspaces and writes to `greenhouse_raw` + `greenhouse_conformed` tables. |

#### 2. hubspot-bq-sync

| Property      | Value                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Type          | Cloud Function (Gen 2)                                                                                 |
| Runtime       | Python 3.12                                                                                            |
| Memory        | 1024 MB                                                                                                |
| Max instances | 3                                                                                                      |
| Secrets       | `GREENHOUSE_INTEGRATION_API_TOKEN` (Secret Manager)                                                    |
| Purpose       | Full HubSpot CRM sync to BigQuery. Pulls all CRM object types into `hubspot_crm` and `greenhouse_raw`. |

#### 3. hubspot-greenhouse-integration

| Property | Value                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Type     | Custom Cloud Run service                                                                                                                     |
| Purpose  | Bidirectional HubSpot and Greenhouse integration. Manages company profiles, contacts, and owners. Called from the Next.js application layer. |

#### 4. hubspot-notion-deal-sync

| Property      | Value                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Type          | Cloud Function (Gen 2)                                                                                                      |
| Runtime       | Python 3.12                                                                                                                 |
| Memory        | 512 MB                                                                                                                      |
| Max instances | 5                                                                                                                           |
| Timeout       | 600 s                                                                                                                       |
| BQ dataset    | `hubspot_notion_sync`                                                                                                       |
| Purpose       | Syncs HubSpot deals to Notion project pages. Polls for new/updated deals and creates or updates corresponding Notion pages. |

#### 5. notion-hubspot-reverse-sync

| Property      | Value                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| Type          | Cloud Function (Gen 2)                                                                 |
| Runtime       | Python 3.12                                                                            |
| Memory        | 512 MB                                                                                 |
| Max instances | 5                                                                                      |
| Timeout       | 300 s                                                                                  |
| BQ dataset    | `notion_hubspot_reverse_sync`                                                          |
| Purpose       | Reverse sync: Notion task property changes are pushed back to HubSpot deal properties. |

#### 6. notion-frameio-sync

| Property      | Value                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Type          | Cloud Function (Gen 2)                                                                                               |
| Runtime       | Python 3.12                                                                                                          |
| Memory        | 256 MB                                                                                                               |
| Max instances | 10                                                                                                                   |
| Timeout       | 60 s                                                                                                                 |
| Purpose       | Syncs Frame.io review statuses to Notion page properties. Keeps creative review state in sync across both platforms. |

#### 7. notion-teams-notify

| Property      | Value                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Type          | Cloud Function (Gen 2)                                                                                                      |
| Runtime       | Python 3.12                                                                                                                 |
| Memory        | 256 MB                                                                                                                      |
| Max instances | 5                                                                                                                           |
| Timeout       | 30 s                                                                                                                        |
| Secrets       | `MS_CLIENT_SECRET`, `NOTION_TOKEN` (Secret Manager)                                                                         |
| Purpose       | Sends Microsoft Teams channel notifications triggered by Notion task events (assignments, status changes, due-date alerts). |

#### 8. ico-batch-worker (us-east4)

| Property      | Value                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Type          | Custom Cloud Run service                                                                                                                      |
| Runtime       | Node.js 22 (via tsx)                                                                                                                          |
| Region        | `us-east4` (co-located with Cloud SQL)                                                                                                        |
| Memory        | 2 GiB                                                                                                                                         |
| CPU           | 2                                                                                                                                             |
| Timeout       | 900 s (15 min)                                                                                                                                |
| Max instances | 2                                                                                                                                             |
| Concurrency   | 1                                                                                                                                             |
| Auth          | IAM (`--no-allow-unauthenticated`)                                                                                                            |
| Source        | `services/ico-batch/` (monorepo, reuses `src/lib/`)                                                                                           |
| Purpose       | Heavy ICO Engine batch processing: monthly materialization (12 steps) and LLM enrichment pipeline. Replaces Vercel cron that exceeded 120s timeout. |
| Endpoints     | `GET /health`, `POST /ico/materialize`, `POST /ico/llm-enrich`                                                                               |
| TASK          | TASK-241                                                                                                                                       |

### Staging Services

| #   | Service                               | Mirrors                       |
| --- | ------------------------------------- | ----------------------------- |
| 8   | `hubspot-notion-deal-sync-staging`    | `hubspot-notion-deal-sync`    |
| 9   | `notion-frameio-sync-staging`         | `notion-frameio-sync`         |
| 10  | `notion-hubspot-reverse-sync-staging` | `notion-hubspot-reverse-sync` |

Staging services share the same configuration as their production counterparts but target `*_staging` BigQuery datasets and are triggered by paused scheduler jobs (manually invocable for testing).

---

## 5. Cloud Scheduler Jobs (us-central1)

### Active Jobs

| Job                           | Schedule                                             | Target Service                | Timezone         |
| ----------------------------- | ---------------------------------------------------- | ----------------------------- | ---------------- |
| `notion-bq-daily-sync`        | `0 3 * * *` (daily at 3:00 AM)                       | `notion-bq-sync`              | America/Santiago |
| `hubspot-bq-daily-sync`       | `30 3 * * *` (daily at 3:30 AM)                      | `hubspot-bq-sync`             | America/Santiago |
| `hubspot-notion-deal-poll`    | `*/15 * * * *` (every 15 min)                        | `hubspot-notion-deal-sync`    | America/Santiago |
| `notion-hubspot-reverse-poll` | `7,22,37,52 * * * *` (every 15 min, offset by 7 min) | `notion-hubspot-reverse-sync` | America/Santiago |
| `ico-materialize-daily`       | `15 3 * * *` (daily at 3:15 AM)                       | `ico-batch-worker` (us-east4) | America/Santiago |
| `ico-llm-enrich-daily`        | `45 3 * * *` (daily at 3:45 AM)                       | `ico-batch-worker` (us-east4) | America/Santiago |

The 7-minute offset on `notion-hubspot-reverse-poll` prevents overlap with the forward sync job, reducing contention on shared Notion API rate limits.

The `ico-materialize-daily` and `ico-llm-enrich-daily` jobs replace the Vercel cron routes that exceeded the 120s timeout. The 30-minute gap between materialization and LLM enrichment ensures outbox events from materialization are published before enrichment reads the signals. Both jobs target the `ico-batch-worker` service in `us-east4` (co-located with Cloud SQL) via IAM OIDC authentication.

### Paused Jobs (Staging)

| Job                                   | Schedule             | Target Service                        |
| ------------------------------------- | -------------------- | ------------------------------------- |
| `hubspot-notion-deal-poll-staging`    | `*/15 * * * *`       | `hubspot-notion-deal-sync-staging`    |
| `notion-hubspot-reverse-poll-staging` | `7,22,37,52 * * * *` | `notion-hubspot-reverse-sync-staging` |

---

## 6. Vercel Crons

Defined in `vercel.json` at the repository root. These are Next.js API routes invoked by Vercel's built-in cron scheduler.

| Path                                    | Schedule (UTC)                | Purpose                                                                                                                                                                                              |
| --------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/cron/outbox-publish`              | `*/5 * * * *` (every 5 min)   | Consumes the Postgres transactional outbox and publishes events to BigQuery                                                                                                                          |
| `/api/cron/outbox-react`                | `*/5 * * * *` (every 5 min)   | Processes reactive projections (all domains sequentially)                                                                                                                                            |
| `/api/cron/webhook-dispatch`            | `*/2 * * * *` (every 2 min)   | Dispatches pending outbound webhooks to subscribed endpoints                                                                                                                                         |
| `/api/cron/email-delivery-retry`        | `*/5 * * * *` (every 5 min)   | Retries failed email deliveries                                                                                                                                                                      |
| `/api/cron/projection-recovery`         | `*/15 * * * *` (every 15 min) | Recovers orphaned projection refresh items stuck as pending/processing >30 min                                                                                                                       |
| `/api/cron/sync-conformed`              | `45 3 * * *` (daily 3:45 AM)  | Transforms raw Notion data (`notion_ops`) into normalized conformed layer (`greenhouse_conformed`) with PostgreSQL projections. Runs after `notion-bq-sync` (3:00 AM) and before ICO materialization |
| `/api/cron/ico-materialize`             | `15 6 * * *` (daily 6:15 AM)  | Materializes ICO Engine monthly metric snapshots from conformed and raw data                                                                                                                         |
| `/api/cron/nubox-sync`                  | `30 7 * * *` (daily 7:30 AM)  | Syncs Nubox DTE and financial data                                                                                                                                                                   |
| `/api/finance/exchange-rates/sync`      | `5 23 * * *` (daily 11:05 PM) | Fetches latest currency exchange rates and persists to Postgres                                                                                                                                      |
| `/api/finance/economic-indicators/sync` | `5 23 * * *` (daily 11:05 PM) | Fetches economic indicators (UF, UTM, IPC)                                                                                                                                                           |

---

## 7. Vercel Deployment

| Property            | Value                               |
| ------------------- | ----------------------------------- |
| Production URL      | `greenhouse.efeoncepro.com`         |
| Shared non-prod URL | `dev-greenhouse.efeoncepro.com`     |
| Framework           | Next.js **16.1** with Turbopack     |
| Build system        | Vercel (automatic deploys from Git) |

### Deployment Notes

- El branch preview actual validado para `TASK-096` es `feature/codex-task-096-wif-baseline`.
- El redeploy verificado con health OK fue `version=7638f85` en `greenhouse-i3cak6akh-efeonce-7670142f.vercel.app`.
- `dev-greenhouse.efeoncepro.com` no debe asumirse como `staging` canónico sin revalidación: al 2026-03-29 respondió desde un deployment `preview` de `develop`.

### Key Environment Variables

| Variable                                                             | Purpose                                                                                |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`                                                    | NextAuth.js session encryption                                                         |
| `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` | Azure AD SSO provider                                                                  |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                           | Google OAuth provider                                                                  |
| `GCP_PROJECT`                                                        | Project ID efectivo para BigQuery/clients GCP                                          |
| `GCP_WORKLOAD_IDENTITY_PROVIDER`                                     | Workload Identity Pool Provider resource name for Vercel OIDC                          |
| `GCP_SERVICE_ACCOUNT_EMAIL`                                          | Service account to impersonate from Vercel via WIF                                     |
| `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`                       | Cloud SQL instance connection name para Cloud SQL Connector                            |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON`                                | Transitional fallback SA key for Preview/local or runtimes where WIF is not yet active |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64`                         | Transitional fallback SA key variant                                                   |
| `GREENHOUSE_POSTGRES_HOST`                                           | Direct TCP host for CLI tools (migrations, type generation) — not used by runtime      |
| `GREENHOUSE_POSTGRES_MIGRATOR_USER`, `..._PASSWORD`                  | Migrator profile credentials for `node-pg-migrate` DDL operations                      |

---

## 8. Secret Manager Usage

Secret Manager adoption is **partial**. Only two services currently use it:

| Service               | Secrets Managed                    |
| --------------------- | ---------------------------------- |
| `hubspot-bq-sync`     | `GREENHOUSE_INTEGRATION_API_TOKEN` |
| `notion-teams-notify` | `MS_CLIENT_SECRET`, `NOTION_TOKEN` |

All other Cloud Functions and Cloud Run services store API tokens and credentials as **plaintext environment variables** in their service configurations. See **Security Notes** for the recommended migration path.

---

## 9. Security Notes

> **Full security posture, secret management strategy, and hardening plan:** see [GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md](GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md).
> The sections below are retained for quick reference but the posture doc is authoritative.

### Current Gaps

| Issue                         | Severity     | Current State                                                                                                       | Recommendation                                                               | Task            |
| ----------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------- |
| Cloud SQL authorized network  | **High**     | `0.0.0.0/0` — any IP can attempt connection                                                                         | Restrict to Vercel edge IPs, Cloud Run egress, and developer VPN CIDR blocks | TASK-096 Fase 1 |
| Cloud SQL SSL enforcement     | **Medium**   | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` — SSL optional                                                                    | Set to `ENCRYPTED_ONLY` to enforce TLS for all connections                   | TASK-096 Fase 1 |
| Plaintext API tokens          | **Medium**   | Most Cloud Functions store tokens in env vars                                                                       | Migrate critical secrets to Secret Manager                                   | TASK-096 Fase 3 |
| Cloud SQL Connector adoption  | **Low**      | Preview WIF path ya quedó validado con connector, pero `develop/dev-greenhouse` sigue observándose con host directo | Estandarizar connector en el entorno compartido antes del hardening externo  | TASK-096 Fase 2 |
| Service account key in Vercel | **Medium**   | WIF ya existe y quedó validado en preview, pero la SA key sigue presente como fallback transicional                 | Retirar la SA key después de validar entorno compartido y producción         | TASK-096 Fase 2 |
| No security headers           | **Medium**   | No middleware.ts, no CSP/HSTS/X-Frame-Options                                                                       | Create middleware.ts with security headers                                   | TASK-099        |
| Silent production failures    | **High**     | console.error() only, zero alerting                                                                                 | Sentry + health endpoint + Slack alerts                                      | TASK-098        |
| Inconsistent cron auth        | **Medium**   | 2 patterns, some fail-open, no timing-safe                                                                          | Centralized requireCronAuth() helper                                         | TASK-101        |
| Restore test pendiente        | **Resolved** | Restore test ya quedó verificado con clone efímero y evidencia SQL documentada                                      | Mantener runbook y repetir ante cambios mayores de postura                   | TASK-102        |
| No cost visibility            | **Low**      | Zero budget alerts                                                                                                  | GCP budget alerts + BigQuery cost guards                                     | TASK-103        |

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

_End of document._
