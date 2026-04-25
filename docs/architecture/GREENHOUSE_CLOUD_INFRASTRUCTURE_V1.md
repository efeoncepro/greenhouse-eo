# Greenhouse EO — Cloud Infrastructure Reference

> **Version:** 1.7
> **Last updated:** 2026-04-23
> **Audience:** Platform engineers, DevOps, on-call operators

## Delta 2026-04-23 — Auditoria live rebaselinea el inventario cloud real

Se ejecuto una auditoria read-only directamente sobre GCP (`gcloud`, `bq`) y PostgreSQL live. La documentacion de infraestructura debe asumir desde ahora este baseline, no los supuestos previos de marzo.

Inventario live confirmado:

- `1` instancia Cloud SQL compartida: `greenhouse-pg-dev`
- `13` servicios serverless en total:
  - `5` servicios Cloud Run custom
  - `8` servicios Cloud Functions Gen 2 / Cloud Run gestionados por Functions
- `16` jobs activos de Cloud Scheduler en `us-east4`
- `29` secretos en GCP Secret Manager
- `13` datasets en BigQuery
- PostgreSQL live:
  - `261` tablas base
  - `18` views
  - tamaño actual `148 MB`

Hallazgos que cambian el baseline documental:

- Cloud SQL ya no tiene `authorizedNetworks=0.0.0.0/0`; hoy la lista esta vacia y `sslMode=ENCRYPTED_ONLY`.
- El hardening de Cloud SQL sigue **incompleto**:
  - `connectorEnforcement=NOT_REQUIRED`
  - `deletionProtection=false`
  - IP publica aun habilitada
- Secret Manager ya no es un rollout “de dos servicios”; hoy hay adopcion mixta:
  - workers nuevos (`ops-worker`, `commercial-cost-worker`) usan secretos montados correctamente
  - parte del runtime legacy sigue con tokens/passwords sensibles en env plano
- El inventario de Cloud Run/Functions sigue siendo heterogeneo:
  - parte moderna corre con `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
  - parte legacy aun corre con la default compute service account
  - al menos `hubspot-greenhouse-integration` y `notion-bq-sync` quedaron publicamente invocables (`allUsers`)

## Delta 2026-04-21 — ops-worker materializa VAT ledger mensual (TASK-533)

- El `ops-worker` gana `POST /vat-ledger/materialize` como lane tributaria para recomputo y backfill del libro IVA mensual fuera de Vercel serverless.
- Contrato operativo:
  - acepta `{ year, month }` para recomputar un periodo
  - acepta `{}` para backfill bulk de todos los periodos disponibles
  - reutiliza el mismo patrón de `source_sync_runs` y el mismo bundle/shims del worker actual
- No se agrega scheduler nuevo en esta iteración: el trigger normal nace desde la projection reactiva `vat_monthly_position`; el endpoint queda como lane manual y de replay operativo.

---

## Delta 2026-04-19 — commercial-cost-worker adopta pipeline WIF via GitHub Actions

- El runtime `commercial-cost-worker` ya no debe depender de deploy manual como condición normal de operación.
- Runtime/CD actualizado:
  - workflow `.github/workflows/commercial-cost-worker-deploy.yml`
  - autenticación GitHub Actions -> GCP via el mismo pool/provider WIF canónico del repo
  - impersonación del mismo deployer SA `github-actions-deployer@efeonce-group.iam.gserviceaccount.com`
  - verificación post-deploy via `gcloud run services describe`
- Regla operativa:
  - no crear un deployer SA nuevo para este worker
  - el path trigger debe cubrir tanto `services/commercial-cost-worker/**` como librerías compartidas que alteran su runtime (`commercial-cost-worker`, `commercial-cost-attribution`, `providers`, `db`, `structured-context`, `sync`, `src/types/db.d.ts`, lockfile / tsconfig)
  - producción sigue gateada por GitHub Environment `production`; `develop` despliega a `staging`

## Delta 2026-04-19 — TASK-483 separa el commercial cost basis engine en Cloud Run dedicado

- Greenhouse ya no debe seguir creciendo el `ops-worker` como runtime catch-all para costeo comercial.
- Runtime nuevo:
  - servicio dedicado `commercial-cost-worker` en `us-east4`
  - source `services/commercial-cost-worker/`
  - Dockerfile con el mismo patron esbuild + shims ESM/CJS usado por `ops-worker`
  - scheduler diario `commercial-cost-materialize-daily` -> `POST /cost-basis/materialize`
- Contrato operativo:
  - `ops-worker` sigue materializando `commercial_cost_attribution` como fallback/manual lane existente
  - `commercial-cost-worker` pasa a ser la topologia objetivo para la base de costos comercial (people + tools + bundle)
  - `roles`, `quote repricing` y `margin feedback` quedan reservados en el worker como endpoints `501` hasta las tasks del programa que los completen
  - el worker persiste trazabilidad por corrida en `greenhouse_sync.source_sync_runs` (`source_system='commercial_cost_worker'`) y por periodo/scope en `greenhouse_commercial.commercial_cost_basis_snapshots`

## Delta 2026-04-16 — CI/CD pipeline for ops-worker via GitHub Actions + WIF

Se implemento el pipeline completo de deploy automatico para ops-worker via GitHub Actions con autenticacion Workload Identity Federation (sin llaves de service account). Spec completa en nueva **§11. CI/CD Pipeline**.

Componentes creados:
- `.github/workflows/ops-worker-deploy.yml` — workflow con path triggers + manual dispatch
- `scripts/setup-github-actions-wif.sh` — provisioning idempotente de pool, provider, SA, roles
- `.github/DEPLOY.md` — contrato de deployment para contributors
- GitHub repo secret `GCP_WORKLOAD_IDENTITY_PROVIDER` configurado
- GitHub environments `staging` (auto) y `production` (required reviewer: cesargrowth11)

Lecciones operativas incorporadas al diseño:
1. Cloud Build logs van a Cloud Logging (`CLOUD_LOGGING_ONLY`), no al bucket GCS legacy
2. Build submit es async + polling (no depende de log streaming)
3. Health check en CI usa `gcloud run services describe` (no proxy, que cuelga por component install)
4. `deploy.sh` requiere ENV explicito — sin default silencioso por seguridad de la topologia compartida

Actualizacion a §9 Security Notes: WIF ya esta implementado (antes listado como gap pendiente).

---

## Delta 2026-04-15 — Shared runtime topology formalized for portal + reactive workers

- Greenhouse opera hoy sobre una **infraestructura compartida** para el runtime principal del portal y el runtime reactivo:
  - un único servicio Cloud Run `ops-worker`
  - una única instancia Cloud SQL `greenhouse-pg-dev`
- Esto significa que `staging` y `production` no tienen workers ni instancias PostgreSQL separadas por ahora.
- La separación por ambiente vive en el **contrato de secrets/config**, no en un duplicado de infraestructura base.

Topología vigente:

| Recurso | Estado actual | Regla operativa |
| --- | --- | --- |
| Cloud Run reactive worker | único `ops-worker` | procesa lanes reactivos de todos los dominios |
| Cloud SQL OLTP | única instancia `greenhouse-pg-dev` | sirve al portal y a los workers compartidos |
| Secretos de auth/email | separados por ambiente cuando aplica | `production` y `staging` pueden resolver secrets distintos sobre la misma infraestructura |

Reglas vigentes:

- `ENV=production` en `services/ops-worker/deploy.sh` **no** implica una instancia Cloud SQL separada.
- `ENV=production` sí debe aplicar el contrato productivo de secrets cuando exista diferencia real de ambiente, por ejemplo:
  - `NEXTAUTH_SECRET`
  - `RESEND_API_KEY`
  - cualquier otro secret con blast radius ambiente-específico
- Si en el futuro se crea infraestructura dedicada para producción, el deploy debe evolucionar por overrides explícitos o defaults nuevos, no por asumir refs inexistentes.

## Delta 2026-04-15 — ops-worker adopta contrato explícito para email transaccional

- El worker reactivo de Cloud Run ya no debe asumir que el contrato de email existe solo en Vercel.
- Runtime actualizado:
  - `services/ops-worker/deploy.sh` propaga `EMAIL_FROM`
  - `services/ops-worker/deploy.sh` acepta `RESEND_API_KEY_SECRET_REF` para que el worker resuelva Resend vía Secret Manager
- Regla operativa:
  - si `ops-worker` procesa proyecciones que envían correo, el deploy debe incluir `RESEND_API_KEY_SECRET_REF`
  - dejar esa variable ausente degrada el canal email aunque el portal web siga teniendo `RESEND_API_KEY`

## Delta 2026-04-09 — Secret Manager publication protocol tightened after ISSUE-032

Greenhouse formaliza un protocolo operativo para secretos runtime en GCP Secret Manager:

- publicar secretos scalar como valor crudo
- no envolverlos en comillas
- no agregar `\\n` / `\\r` literal
- no dejar whitespace residual

Patrón recomendado:

```bash
printf %s "$VALOR" | gcloud secrets versions add <secret-id> --data-file=-
```

Regla operativa:

- no usar `JSON.stringify`, copy/paste entre comillas ni blobs multilínea cuando el consumer espera un token/password simple
- después de cada nueva versión o rotación, validar el servicio dependiente real
- si el secreto afecta auth (`NEXTAUTH_SECRET`, client secrets OAuth), considerar explícitamente el impacto de sesión/re-login

## Delta 2026-04-07 — Cost attribution materialization endpoint added to ops-worker (TASK-279)

The `ops-worker` Cloud Run service gains a new endpoint `POST /cost-attribution/materialize` that runs the heavy commercial cost attribution materialization pipeline (3 CTEs + LATERAL JOIN + exchange rate conversion) which times out on Vercel serverless cold-starts. Optionally recomputes `client_economics` snapshots after materialization.

- New endpoint: `POST /cost-attribution/materialize` (§4.9)
- Accepts `{ year, month }` for single-period or omit for bulk (all periods with data)
- `recomputeEconomics` (default `true`): triggers `computeClientEconomicsSnapshots` after materialization
- Active revision: `ops-worker-00006-qtl` serving 100% traffic
- Bug fix: `deploy.sh` scheduler update commands used `--headers` (invalid for `gcloud scheduler jobs update`), changed to `--update-headers`

---

## Delta 2026-06-17 — Reactive workers migrated to Cloud Run (TASK-254)

Three Vercel cron routes (`outbox-react`, `outbox-react-delivery`, `projection-recovery`) migrated to the new `ops-worker` Cloud Run service in `us-east4`. Cloud Scheduler triggers replace the Vercel cron entries. The original Vercel API routes remain as manual fallback endpoints but are no longer scheduled automáticamente.

- New service: `services/ops-worker/` (§4.9)
- New scheduler jobs: `ops-reactive-process`, `ops-reactive-process-delivery`, `ops-reactive-recover` (§5)
- Run tracking via `greenhouse_sync.source_sync_runs` with `source_system='reactive_worker'`
- Operability: Reactive Worker subsystem added to Ops Overview dashboard

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

| Característica                        | Cloud Run                         | Cloud Functions (Gen 2) | Cloud Scheduler      | Cloud Tasks |
| ------------------------------------- | --------------------------------- | ----------------------- | -------------------- | ----------- |
| Proceso HTTP con timeout largo (>30s) | **Idóneo**                        | Alternativa             | —                    | —           |
| Job periódico (cron)                  | —                                 | —                       | **Idóneo** (trigger) | —           |
| Fan-out paralelo (N items)            | —                                 | —                       | —                    | **Idóneo**  |
| Sync con API externa (webhook/poll)   | **Idóneo** (ya probado)           | Alternativa             | Trigger              | —           |
| Pipeline AI/LLM (múltiples llamadas)  | **Idóneo** (timeout configurable) | —                       | Trigger              | —           |

**Vercel Functions** quedan reservados para:

- API routes que sirven al portal (request-response < 30s)
- Cron triggers livianos que disparan servicios GCP (fire-and-forget)
- Cron routes livianos que procesan eventos individualmente y completan consistentemente en < 30s

> **Nota TASK-254:** Los reactive consumers del outbox fueron migrados a Cloud Run (`ops-worker`) porque un batch de 50 eventos puede exceder 30s bajo carga. Las Vercel API routes persisten como fallback manual.

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
  1. `Workload Identity Federation` en runtime real de `Vercel`, resolviendo el token OIDC efímero desde ese entorno y usando `GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT_EMAIL`
  2. fallback a `GOOGLE_APPLICATION_CREDENTIALS_JSON` o `_BASE64`
  3. `ambient ADC` cuando el entorno ya provee credenciales implícitas
- Regla operativa reforzada en 2026-04-10:
  - `VERCEL_OIDC_TOKEN` no se persiste en `.env*`
  - local, scripts y CLI no deben depender de ese token para auth GCP; usan service account key o `ADC`
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
  - en esa fecha todavía seguía pendiente el hardening externo
  - **estado superseded por la auditoría live 2026-04-23**:
    - `authorizedNetworks` vacía
    - `sslMode=ENCRYPTED_ONLY`
    - `requireSsl=false`
    - remanentes: `connectorEnforcement=NOT_REQUIRED`, `deletionProtection=false`, IP pública habilitada
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

| Tipo de proceso                                       | Dónde corre                           | Por qué                                                                                           |
| ----------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| API route que sirve datos al portal (GET/POST < 30s)  | Vercel Functions                      | Es request-response del portal, necesita sesión de usuario                                        |
| Materialización de métricas, snapshots, reports       | **Cloud Run**                         | Excede 30s, no requiere sesión, accede a BigQuery + PostgreSQL                                    |
| Pipeline AI/LLM (scoring, enrichment, evaluación)     | **Cloud Run**                         | Múltiples llamadas a LLM, timeout impredecible, no requiere sesión                                |
| Sync batch de fuente externa (Notion, HubSpot, Nubox) | **Cloud Run / Cloud Functions**       | Ya probado, volumen variable, timeout largo                                                       |
| ETL, backfill, re-procesamiento                       | **Cloud Run**                         | Proceso pesado one-shot, timeout configurable hasta 60 min                                        |
| Trigger periódico (cron)                              | **Cloud Scheduler** → Cloud Run       | Scheduler dispara, Cloud Run ejecuta                                                              |
| Fan-out paralelo (procesar N items)                   | **Cloud Tasks** → Cloud Run/Functions | Distribuye carga, cada item es un HTTP call                                                       |
| Reactive consumer del outbox (batch processing)       | **Cloud Run** (`ops-worker`)          | Batch de 50 eventos puede exceder 30s bajo carga; migrado a Cloud Run para durabilidad (TASK-254) |
| Health checks y triggers fire-and-forget              | Vercel Functions                      | Liviano, solo dispara y retorna                                                                   |

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

| Proceso                      | Ubicación actual                   | Timeout típico  | Acción                                |
| ---------------------------- | ---------------------------------- | --------------- | ------------------------------------- |
| ICO materialización completa | Vercel `/api/cron/ico-materialize` | >120s (falla)   | **Migrar a Cloud Run (TASK-241)**     |
| LLM enrichment pipeline      | Vercel (trigger reactivo)          | 60-90s (riesgo) | **Migrar a Cloud Run (TASK-241)**     |
| ICO member sync              | Vercel `/api/cron/ico-member-sync` | ~45s            | Monitorear, migrar si crece           |
| Sync conformed               | Vercel `/api/cron/sync-conformed`  | ~30-60s         | Monitorear, migrar si crece           |
| Nubox sync                   | Vercel `/api/cron/nubox-sync`      | ~15s            | OK en Vercel por ahora                |
| Exchange rates / indicators  | Vercel cron                        | ~5s             | OK en Vercel                          |
| Outbox publish               | Vercel cron `*/5 min`              | ~5-15s          | OK en Vercel                          |
| Outbox react + recovery      | ~~Vercel cron~~ → Cloud Run        | 5-60s           | **Migrado a `ops-worker` (TASK-254)** |

---

## 2. Cloud SQL (PostgreSQL)

### Instance Details

| Property | Value |
| --- | --- |
| Instance name | `greenhouse-pg-dev` |
| Engine | `POSTGRES_16` |
| Region / availability | `us-east4` / `ZONAL` |
| Machine type | `db-custom-1-3840` |
| Public IP | `34.86.135.144` |
| IPv4 enabled | `true` |
| SSL mode | `ENCRYPTED_ONLY` |
| `requireSsl` | `false` |
| Authorized networks | vacía |
| Connector enforcement | `NOT_REQUIRED` |
| Deletion protection | `false` |
| Backups | habilitados |
| PITR | habilitado |
| WAL retention | `7 days` |
| Database flags | `log_min_duration_statement=1000`, `log_statement=ddl` |

### Databases and Users

Databases:

- `postgres`
- `greenhouse_app`

Usuarios / logins auditados:

- `greenhouse_app`
- `greenhouse_migrator_user`
- `greenhouse_ops`
- `postgres`

### Live Footprint (2026-04-23)

| Metric | Value |
| --- | --- |
| Database size | `148 MB` |
| Base tables | `261` |
| Views | `18` |

Schemas con tablas base en `greenhouse_app`:

| Schema | Base tables |
| --- | --- |
| `greenhouse_core` | `60` |
| `greenhouse_commercial` | `53` |
| `greenhouse_finance` | `30` |
| `greenhouse_serving` | `30` |
| `greenhouse_sync` | `28` |
| `greenhouse_hr` | `16` |
| `greenhouse_payroll` | `14` |
| `greenhouse_ai` | `7` |
| `greenhouse_delivery` | `7` |
| `greenhouse_notifications` | `7` |
| `greenhouse_context` | `3` |
| `greenhouse_crm` | `3` |
| `greenhouse_cost_intelligence` | `2` |
| `public` | `1` |

Tablas mas pesadas al momento de la auditoria:

- `greenhouse_context.context_documents` ~ `34 MB`
- `greenhouse_sync.source_sync_runs` ~ `23 MB`
- `greenhouse_context.context_document_versions` ~ `19 MB`
- `greenhouse_sync.outbox_events` ~ `11 MB`
- `greenhouse_sync.outbox_reactive_log` ~ `11 MB`

### Access Model Notes

- El acceso canónico sigue siendo:
  - `greenhouse_runtime` para runtime
  - `greenhouse_migrator` para DDL/migraciones
  - `greenhouse_ops` como owner / break-glass operacional
- La auditoría live detectó drift real:
  - `greenhouse_app` todavía puede hacer `CREATE` en `greenhouse_serving` y `greenhouse_payroll`
  - eso contradice el modelo canónico y debe tratarse como desviación de grants, no como capacidad aprobada

### Connectivity

- **Cloud SQL Connector** sigue siendo el carril preferido para runtime y tooling moderno.
- **TCP directo** ya no debe asumirse como camino operativo normal:
  - la IP pública sigue existiendo
  - pero no hay `authorizedNetworks` activas
  - el control efectivo hoy está en Connector + credenciales + SSL

---

## 3. BigQuery Datasets

La auditoría live confirmó `13` datasets activos:

| Dataset | Estado / rol |
| --- | --- |
| `analytics_486264460` | export externo GA4 |
| `greenhouse` | dataset base del warehouse |
| `greenhouse_conformed` | capa normalizada |
| `greenhouse_marts` | vistas / marts |
| `greenhouse_raw` | snapshots fuente |
| `hubspot_crm` | espejo CRM legacy |
| `hubspot_notion_sync` | sync HubSpot -> Notion |
| `hubspot_notion_sync_staging` | variante staging |
| `ico_engine` | engine de métricas ICO |
| `notion_hubspot_reverse_sync` | sync Notion -> HubSpot |
| `notion_hubspot_sync_staging` | variante staging |
| `notion_ops` | capa legacy Notion |
| `searchconsole` | export Search Console |

Concentración de storage observada:

- `notion_ops` ~ `2.74 GiB`
- `hubspot_crm` ~ `0.58 GiB`
- `greenhouse_raw` ~ `0.06 GiB`

Tablas más pesadas al momento de la auditoría:

- `notion_ops.raw_pages_snapshot` ~ `2799 MiB`
- `hubspot_crm.emails_history` ~ `491 MiB`
- `hubspot_crm.emails` ~ `70 MiB`
- `greenhouse_raw.notion_tasks_snapshots` ~ `52 MiB`

Lectura operativa:

- BigQuery no muestra hoy un problema de escala inmediata.
- El mayor foco de gobierno/costo está concentrado en `notion_ops` y `hubspot_crm`, no repartido homogéneamente.

---

## 4. Cloud Run Services and Functions

La auditoría live confirmó `13` servicios serverless:

- `5` servicios Cloud Run custom
- `8` servicios Cloud Functions Gen 2 / Cloud Run gestionados por Functions

### Cloud Run custom

| Service | Region | Identity | Exposure | Secret posture | Nota |
| --- | --- | --- | --- | --- | --- |
| `ops-worker` | `us-east4` | `greenhouse-portal@...` | IAM only | Secret Manager | worker moderno, OIDC desde Scheduler |
| `commercial-cost-worker` | `us-east4` | `greenhouse-portal@...` | IAM only | Secret Manager | worker moderno dedicado |
| `ico-batch-worker` | `us-east4` | `greenhouse-portal@...` | IAM only | **mixto** | mantiene `GREENHOUSE_POSTGRES_PASSWORD` en env plano |
| `hubspot-greenhouse-integration` | `us-central1` | default compute SA | **public** (`allUsers`) | parcial | revisar si el exposure público es realmente el deseado |
| `notion-bq-sync` | `us-central1` | default compute SA | **public** (`allUsers`) | Secret Manager | exposición pública innecesaria para un sync interno; `minScale=0` desde `2026-04-24` |

### Cloud Functions Gen 2 / legacy services

Servicios activos:

- `hubspot-bq-sync`
- `hubspot-notion-deal-sync`
- `hubspot-notion-deal-sync-staging`
- `notion-frameio-sync`
- `notion-frameio-sync-staging`
- `notion-hubspot-reverse-sync`
- `notion-hubspot-reverse-sync-staging`
- `notion-teams-notify`

Patrón operativo observado:

- corren mayoritariamente con la default compute service account
- varios siguen resolviendo tokens sensibles desde env plano
- representan hoy la capa más heterogénea y más alejada del estándar moderno del repo

### Logs / health

- `commercial-cost-worker`, `ico-batch-worker` y `hubspot-greenhouse-integration` no mostraron errores recientes repetitivos en la lectura puntual de Cloud Logging
- `ops-worker` mostró un error aislado en una revisión reciente, sin evidencia de degradación sistémica del lane reactivo

---

## 5. Cloud Scheduler Jobs

La auditoría live confirmó `16` jobs activos, todos habilitados en `us-east4`.

### Fan-out reactivo / jobs operativos

- `ops-reactive-organization`
- `ops-reactive-finance`
- `ops-reactive-people`
- `ops-reactive-notifications`
- `ops-reactive-delivery`
- `ops-reactive-cost-intelligence`
- `ops-reactive-recover`
- `ops-product-catalog-drift-detect`
- `ops-quotation-lifecycle`
- `ops-nexa-weekly-digest`

### Materializaciones batch

- `commercial-cost-materialize-daily`
- `margin-feedback-materialize-daily`
- `ico-materialize-daily`
- `ico-llm-enrich-daily`
- `finance-materialize-signals-daily`
- `finance-llm-enrich-daily`

### Auth posture verificada

Se verificó explícitamente que al menos estos jobs usan OIDC con `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` para invocar Cloud Run:

- `ops-reactive-finance` -> `ops-worker`
- `commercial-cost-materialize-daily` -> `commercial-cost-worker`
- `ico-materialize-daily` -> `ico-batch-worker`

Lectura operativa:

- el patrón Scheduler -> OIDC -> Cloud Run está bien aterrizado en la capa nueva
- el riesgo principal ya no está en los jobs, sino en la heterogeneidad de los servicios que reciben esas invocaciones

---

## 6. Vercel Crons (canonical inventory)

Defined in `vercel.json` at the repository root. Next.js API routes invoked by Vercel's built-in cron scheduler. Timezone: UTC.

### Active (13 entries in vercel.json)

| Path | Schedule | maxDuration | Purpose | Placement review |
|---|---|---|---|---|
| `/api/cron/outbox-publish` | `*/5 * * * *` | 60s | Consume Postgres outbox → publish events to BigQuery | Keep — queue ligera, 60s suficiente |
| `/api/cron/webhook-dispatch` | `*/2 * * * *` | 60s | Dispatch pending outbound webhooks | Keep — async dispatch estándar |
| `/api/cron/email-delivery-retry` | `*/5 * * * *` | 60s | Retry failed email deliveries | Keep — retry queue estándar |
| `/api/cron/sync-conformed` | `20 7 * * *` | 120s | Orquestar Notion sync conformed layer + data quality | **Migrar** — orquestación compleja, 120s, retry |
| `/api/cron/sync-conformed-recovery` | `*/30 * * * *` | 120s | Recovery de sync conformed runs fallidos | **Migrar** — backlog-driven recovery, durabilidad crítica |
| `/api/cron/ico-materialize` | `15 10 * * *` | 120s | Materializar snapshots ICO mensuales | Keep — determinístico, 120s suficiente. **Duplicado**: también en Cloud Run `ico-batch-worker` a las 3:15 AM |
| `/api/cron/ico-member-sync` | `30 10 * * *` | — | Sync BQ→PG de métricas ICO por miembro | Evaluar — upserts por fila, sin alerting |
| `/api/cron/notion-delivery-data-quality` | `0 10 * * *` | 120s | Validar paridad de datos Notion delivery | Keep — scan sin backlog |
| `/api/cron/nubox-sync` | `30 7 * * *` | 120s | ETL 3 fases: Nubox API → raw BQ → conformed → PG | Evaluar — multi-fase, fallos parciales tolerados |
| `/api/cron/nubox-balance-sync` | `0 */4 * * *` | 60s | Reconciliación de balances Nubox BQ→PG | Keep — ligero, rápido |
| `/api/cron/entra-profile-sync` | `0 8 * * *` | 300s | Sync Entra: avatar, identity link, datos profesionales | Evaluar — 300s (máximo Vercel), sin retry |
| `/api/cron/entra-webhook-renew` | `0 6 */2 * *` | 30s | Renovar suscripción webhook de Entra | Keep — trigger simple |
| `/api/finance/economic-indicators/sync` | `5 23 * * *` | — | Fetch indicadores económicos (UF, UTM, IPC, exchange rates) | Keep — API call diario |

### Migrated to Cloud Run

| Ruta original (fallback manual) | Cloud Run service | Scheduler job | Desde |
|---|---|---|---|
| `/api/cron/outbox-react` | `ops-worker` | `ops-reactive-process` | TASK-254 |
| `/api/cron/outbox-react-delivery` | `ops-worker` | `ops-reactive-process-delivery` | TASK-254 |
| `/api/cron/projection-recovery` | `ops-worker` | `ops-reactive-recover` | TASK-254 |

> Las rutas API siguen existiendo como endpoints de fallback manual pero ya no están en `vercel.json`.

### Próximos candidatos a migración

| Cron | Razón | Prioridad | Task |
|---|---|---|---|
| `sync-conformed` | Orquestación compleja, 120s, semántica de retry, durabilidad | Alta | TASK-258 |
| `sync-conformed-recovery` | Recovery de backlog, durabilidad crítica, 120s | Alta | TASK-258 |
| `entra-profile-sync` | 300s (máximo Vercel), per-user upserts, sin retry | Media | TASK-259 |
| `nubox-sync` | ETL 3 fases, fallos parciales, observabilidad | Media | TASK-260 |
| `ico-member-sync` | Upserts BQ→PG por fila, sin alerting, latencia | Media | TASK-260 |
| `webhook-dispatch` | Cola con latencia externa, fallo silencioso, cada 2 min | Media | TASK-261 |

| `outbox-publish` | Fundamento del event bus, alimenta al reactor ya en Cloud Run | Alta | TASK-262 |

> **Nota**: con TASK-262, el pipeline completo (publish → react → projections) correrá íntegramente en Cloud Run. Ya no habrá dependencia de Vercel para el event bus.

### Placement decision criteria

Un cron debe migrar a Cloud Run cuando cumple **2 o más** de:
1. Procesa una cola o backlog (no determinístico)
2. Necesita >60s de forma habitual
3. Tiene semántica de retry/recovery
4. Fallo silencioso tiene impacto operativo
5. Se beneficia de run tracking institucional (`source_sync_runs`)

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

Secret Manager adoption is **partial but real**. The live audit confirmed `29` secrets in the project.

### Secret inventory highlights

- PostgreSQL:
  - `greenhouse-pg-dev-postgres-password`
  - `greenhouse-pg-dev-app-password`
  - `greenhouse-pg-dev-migrator-password`
  - `greenhouse-pg-dev-ops-password`
- Auth / session:
  - `greenhouse-nextauth-secret-staging`
  - `greenhouse-nextauth-secret-production`
  - `greenhouse-google-client-secret-shared`
  - `greenhouse-azure-ad-client-secret-staging`
  - `greenhouse-azure-ad-client-secret-production`
- Integrations:
  - `greenhouse-integration-api-token`
  - `hubspot-access-token`
  - `hubspot-app-client-secret`
  - `notion-token`
  - `scim-bearer-token`
  - `webhook-notifications-secret`

### Current adoption pattern

| Runtime slice | Posture |
| --- | --- |
| `ops-worker` | usa secretos montados desde Secret Manager |
| `commercial-cost-worker` | usa secretos montados desde Secret Manager |
| `hubspot-greenhouse-integration` | usa Secret Manager de forma parcial |
| `notion-bq-sync` | usa Secret Manager para `NOTION_TOKEN` |
| `ico-batch-worker` | **todavía mantiene password PostgreSQL en env plano** |
| legacy Functions | postura mixta; varias siguen con tokens sensibles en env plano |

### Rotation notes

- Varios secretos críticos ya tienen `v2`.
- Los passwords de PostgreSQL siguen en `v1`, sin evidencia de rotación posterior a marzo/abril 2026.

---

## 9. Security Notes

> **Full security posture, secret management strategy, and hardening plan:** see [GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md](GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md).
> The sections below are retained for quick reference but the posture doc is authoritative.

### Current Gaps

| Issue | Severity | Current State | Recommendation |
| --- | --- | --- | --- |
| Public Cloud Run invokers | **High** | `hubspot-greenhouse-integration` y `notion-bq-sync` exponen `roles/run.invoker` a `allUsers` | revisar y cerrar exposure donde no sea requisito explícito de producto |
| Default compute SA on legacy services | **High** | varias integraciones legacy siguen corriendo con la default compute SA y permisos amplios | migrar a service accounts dedicadas por servicio |
| Plaintext secrets in runtime configs | **High** | `ico-batch-worker` mantiene password PostgreSQL en env plano; varias Functions legacy también | mover secretos sensibles a Secret Manager y eliminar env plano residual |
| PostgreSQL runtime grant drift | **High** | `greenhouse_app` puede hacer `CREATE` en `greenhouse_serving` y `greenhouse_payroll` | reconciliar grants reales con `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` |
| Shared staging / production topology | **High** | workers y Cloud SQL siguen compartidos para staging y production | priorizar aislamiento progresivo por DB, workers y contratos de deploy |
| Cloud SQL connector enforcement | **Medium** | Cloud SQL ya no está abierto por red, pero `connectorEnforcement=NOT_REQUIRED` | endurecer hacia connector-first cuando el tooling legacy esté listo |
| Cloud SQL deletion protection | **Medium** | `deletionProtection=false` | activar protection y revisar runbook break-glass |
| GitHub Actions deployer breadth | **Medium** | SA deployer mantiene `secretmanager.admin`, `run.admin`, `cloudscheduler.admin`, etc. | reducir permisos o separar responsabilidades de deploy vs IAM |

### Resolved / materially improved

- Cloud SQL ya no expone `authorizedNetworks=0.0.0.0/0`
- `sslMode=ENCRYPTED_ONLY` ya está activo
- el patrón Scheduler -> OIDC -> Cloud Run funciona en la capa nueva
- los workers nuevos ya usan la SA `greenhouse-portal@...` y Secret Manager como baseline

### Priority Actions

1. **Cerrar servicios públicamente invocables** donde no sean requisito real.
2. **Migrar servicios legacy fuera de la default compute SA**.
3. **Eliminar secretos sensibles en env plano**, empezando por `ico-batch-worker` y Functions legacy.
4. **Reconciliar grants runtime de PostgreSQL** y rerun de `pg:doctor`.
5. **Endurecer Cloud SQL restante** (`connectorEnforcement`, `deletionProtection`, revisar IP pública).
6. **Separar staging y production** en DB/workers/secrets cuando el roadmap lo permita.

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

## 11. CI/CD Pipeline — GitHub Actions + Workload Identity Federation

### 11.1 Overview

Los deploys de servicios Cloud Run (actualmente `ops-worker`, `ico-batch-worker` y `commercial-cost-worker`) se automatizan via GitHub Actions con autenticacion **Workload Identity Federation (WIF)** — sin llaves de service account persistentes en ningun sistema.

```
Push a develop/main (paths match)
    │
    ▼
GitHub Actions runner
    │ (mints OIDC token via https://token.actions.githubusercontent.com)
    ▼
Google STS — token exchange
    │ (validates: repo == efeoncepro/greenhouse-eo)
    ▼
Federated principal impersonates github-actions-deployer@efeonce-group
    │
    ├── gcloud builds submit --async (Cloud Build)
    │       └── Docker build → gcr.io/efeonce-group/ops-worker
    │
    ├── gcloud run deploy (Cloud Run)
    │       └── New revision with 100% traffic
    │
    ├── gcloud scheduler jobs create/update (Cloud Scheduler)
    │       └── 7 per-domain reactive jobs
    │
    └── gcloud run services describe (health verification)
            └── Confirm latest revision ready
```

### 11.2 Identity architecture

#### WIF Pool + Provider

| Recurso | Valor |
|---|---|
| Pool ID | `github-actions` |
| Pool location | `global` |
| Provider ID | `efeoncepro-greenhouse-eo` |
| Issuer URI | `https://token.actions.githubusercontent.com` |
| Attribute condition | `assertion.repository == 'efeoncepro/greenhouse-eo'` |
| Attribute mapping | `google.subject=assertion.sub`, `attribute.repository=assertion.repository`, `attribute.repository_owner=assertion.repository_owner`, `attribute.ref=assertion.ref`, `attribute.actor=assertion.actor` |

La attribute condition **restringe por repositorio**: tokens de cualquier otro repo son rechazados en el exchange. No hay fallback a credentials por defecto.

#### Deployer service account

| Campo | Valor |
|---|---|
| Email | `github-actions-deployer@efeonce-group.iam.gserviceaccount.com` |
| Display name | GitHub Actions Deployer |
| Proposito | Identidad de deploy para TODOS los workflows de CI/CD del repo |

**Un solo deployer SA, no uno por servicio.** Razon: la identidad de deploy es diferente de la identidad de runtime. El deployer puede CONFIGURAR que un servicio corra como `greenhouse-portal@efeonce-group` pero no puede ACTUAR como `greenhouse-portal`. Separar deploy identity de runtime identity limita el blast radius de un workflow comprometido: puede redesployar servicios (auditable via Cloud Build + revision history) pero no puede leer datos de produccion.

Crear un deployer SA por servicio (`ops-worker-deployer`, `nexa-deployer`, etc.) escala O(n), crea drift de roles, y no agrega seguridad real. Solo crear un segundo deployer si un workflow necesita roles que ningun otro workflow deberia tener.

### 11.3 IAM roles

#### Project-level roles (en `github-actions-deployer`)

| Role | Proposito |
|---|---|
| `roles/cloudbuild.builds.editor` | Submit + describe Cloud Build jobs |
| `roles/run.admin` | Deploy, update, describe Cloud Run services |
| `roles/cloudscheduler.admin` | CRUD Cloud Scheduler jobs |
| `roles/secretmanager.admin` | Grant `secretAccessor` on individual secrets to runtime SAs |
| `roles/storage.admin` | Read/write Cloud Build staging bucket + private assets |
| `roles/artifactregistry.writer` | Push built container images |
| `roles/logging.viewer` | Read Cloud Build logs (required by `CLOUD_LOGGING_ONLY`) |

#### Resource-level bindings

| Role | Resource | Proposito |
|---|---|---|
| `roles/iam.serviceAccountUser` | `greenhouse-portal@efeonce-group` | Permite al deployer SET este SA como runtime identity de Cloud Run services |
| `roles/iam.serviceAccountUser` | `183008134038-compute@developer.gserviceaccount.com` | Permite al deployer usar el Compute Engine default SA para Cloud Build jobs |
| `roles/iam.workloadIdentityUser` | `github-actions-deployer` (self) | Permite al principalSet federado impersonar al deployer |

### 11.4 GitHub-side configuration

#### Repository secret

| Secret | Valor | Proposito |
|---|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/183008134038/locations/global/workloadIdentityPools/github-actions/providers/efeoncepro-greenhouse-eo` | Identifica el WIF provider para `google-github-actions/auth@v2` |

#### Environments

| Environment | Branch | Required reviewers | Deploy gate |
|---|---|---|---|
| `staging` | `develop` | Ninguno | Auto-deploy on push |
| `production` | `main` | `cesargrowth11` | Pausa hasta aprobacion |

### 11.5 Workflow: ops-worker-deploy.yml

**Triggers:**

```yaml
on:
  push:
    branches: [develop, main]
    paths:
      - 'services/ops-worker/**'
      - 'src/lib/sync/**'
      - 'src/lib/finance/payroll-expense-reactive.ts'
      - 'src/lib/finance/apply-payroll-reliquidation-delta.ts'
      - 'src/lib/payroll/supersede-entry.ts'
      - 'src/lib/payroll/send-payroll-export-ready.ts'
      - 'src/lib/payroll/payroll-export-packages.ts'
      - 'src/lib/email/**'
  workflow_dispatch:
    inputs:
      environment: {type: choice, options: [staging, production]}
```

**Environment routing:**
- Push a `develop` → environment `staging`
- Push a `main` → environment `production` (gated por reviewer)
- Manual dispatch → environment seleccionado

**Concurrency:** `ops-worker-deploy-${{ github.ref }}` — un deploy a la vez por branch.

### 11.5b Workflow: commercial-cost-worker-deploy.yml

**Triggers principales:**

```yaml
on:
  push:
    branches: [develop, main]
    paths:
      - '.github/workflows/commercial-cost-worker-deploy.yml'
      - 'services/commercial-cost-worker/**'
      - 'src/lib/commercial-cost-worker/**'
      - 'src/lib/commercial-cost-attribution/**'
      - 'src/lib/providers/**'
      - 'src/lib/db/**'
      - 'src/lib/structured-context/**'
      - 'src/lib/finance/postgres-store-intelligence.ts'
      - 'src/lib/finance/reporting.ts'
      - 'src/lib/sync/event-catalog.ts'
      - 'src/lib/sync/publish-event.ts'
      - 'src/lib/sync/projections/member-capacity-economics.ts'
      - 'src/types/db.d.ts'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - 'tsconfig.json'
```

**Criterio operativo:** el trigger cubre no solo el servicio, sino el set mínimo de librerías compartidas que cambian su runtime real. Esto evita drift entre el monorepo y el worker cuando cambian `db`, publishing de eventos, tracking de corridas o materializadores reutilizados.

**Concurrency:** `commercial-cost-worker-deploy-${{ github.ref }}` — un deploy a la vez por branch.

### 11.6 Cloud Build — async submit + polling

`deploy.sh` usa `gcloud builds submit --async` en vez del modo sincronico por defecto. Razon: el modo sincronico intenta streamear logs desde un bucket GCS que requiere `roles/viewer` (project-level, demasiado amplio). El modo async:

1. Submit retorna inmediatamente con el build ID
2. Polling cada 10s via `gcloud builds describe` hasta `SUCCESS | FAILURE | TIMEOUT | CANCELLED`
3. Max 60 polls (10 min timeout)

Cloud Build config inline incluye `options.logging: CLOUD_LOGGING_ONLY` para que los logs queden en Cloud Logging (donde `roles/logging.viewer` aplica) en vez del bucket GCS legacy.

### 11.7 Health verification

En CI (`GITHUB_ACTIONS=true`), el health check de `deploy.sh` se omite — la verificacion la hace el step separado del workflow. Razon: `gcloud run services proxy` requiere instalar un gcloud component que crea un proceso background que cuelga el step.

El workflow verifica health via `gcloud run services describe`:
- Confirma el nombre de la latest ready revision
- Confirma que `status.conditions[0].status == True`
- No requiere identity token, proxy, ni curl autenticado

### 11.8 Lecciones operativas (pitfalls resueltos)

| Pitfall | Sintoma | Fix |
|---|---|---|
| `gcloud builds submit` cuelga en CI | Step timeout 25min, build SUCCESS pero gcloud no retorna | `--async` + polling por build ID |
| Cloud Build logs en GCS bucket | `ERROR: This tool can only stream logs if you are Viewer/Owner` | `options.logging: CLOUD_LOGGING_ONLY` |
| `gcloud run services proxy` cuelga | Component install crea subprocess que no muere con `kill` | Skip proxy en CI, usar `gcloud describe` |
| `print-identity-token --audiences` falla con WIF | `Invalid account type for --audiences. Requires valid service account.` | No usar identity tokens — verificar via describe |
| `deploy.sh` default `ENV=staging` silencioso | Deployer manual olvida setear ENV, monta secrets equivocados en servicio compartido | Require explicit ENV, abort si no esta seteado |
| Cloud Build SA permission denied | Deployer puede submit pero no act-as el default Compute Engine SA | `iam.serviceAccountUser` on `<project-number>-compute@developer` |

### 11.9 Agregar un nuevo workflow

1. Crear `.github/workflows/<name>.yml` usando `google-github-actions/auth@v2` con:
   ```yaml
   permissions:
     contents: read
     id-token: write
   ```
   Y referenciando `${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}` + `github-actions-deployer@efeonce-group.iam.gserviceaccount.com`.

2. Si el workflow necesita un role que `github-actions-deployer` no tiene, agregarlo a `PROJECT_ROLES` en `scripts/setup-github-actions-wif.sh` y re-correr el script (idempotente).

3. **No** crear un nuevo WIF pool, provider, ni service account a menos que el workflow necesite aislamiento real (extremadamente raro).

### 11.10 Disaster recovery

Si el setup WIF se corrompe o borra:

1. `bash scripts/setup-github-actions-wif.sh` con un usuario que tenga `roles/owner` en el proyecto
2. Copiar el provider resource name del output
3. Actualizar `GCP_WORKLOAD_IDENTITY_PROVIDER` en GitHub repo secrets
4. Disparar un workflow para confirmar

Tiempo total: <5 min. No hay datos en riesgo — WIF es puramente attribute-based, no almacena material secreto.

### 11.11 Archivos de referencia

| Archivo | Proposito |
|---|---|
| `.github/workflows/ops-worker-deploy.yml` | Workflow de deploy para ops-worker |
| `.github/DEPLOY.md` | Documentacion del contrato de deployment para contributors |
| `scripts/setup-github-actions-wif.sh` | Provisioning idempotente de WIF pool, provider, SA, roles |
| `services/ops-worker/deploy.sh` | Script de deploy ejecutado por el workflow |

---

_End of document._
