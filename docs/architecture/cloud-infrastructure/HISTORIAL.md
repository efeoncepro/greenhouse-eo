# Cloud Infrastructure — HISTORIAL (cronología append-only)

> Este archivo preserva **verbatim** las 25 secciones `Delta` del monolito
> `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (v1.9, particionado el 2026-08-05 por TASK-1646), en
> el mismo orden en que estaban apiladas (aproximadamente newest-first), más los snapshots de
> inventario que quedaron superseded por el runtime actual. **El estado vigente vive en los
> docs temáticos de esta carpeta** — este archivo es cronología, no contrato.
>
> Anotaciones `⚠️ Superseded` agregadas por TASK-1646 donde un delta quedó contradicho por
> estado posterior verificado contra runtime.

## Delta 2026-08-05 — La topología compartida del `ops-worker` es CANÓNICA, no transitoria (TASK-1302)

El rollout de TASK-1302 obligó a cerrar una ambigüedad que arrastraba el Delta 2026-04-15 ("staging y
production no tienen workers ni instancias PostgreSQL separadas **por ahora**"). Ese "por ahora" ya no
describe la realidad: `services/ops-worker/deploy.sh` (§Environment) lo declara textualmente —
*"The ops-worker is a SINGLE Cloud Run service intentionally shared by both staging and production
(same DB, same scheduler jobs, same runtime revision). **This is the canonical topology, not a
temporary shortcut.**"*

Lo que hay que leer de ahí, y que el doc omitía:

- **`ENV` no parte la infraestructura.** `ENV=staging|production` sólo selecciona qué secret refs de
  NextAuth/Resend se montan sobre el **mismo** servicio, la **misma** revisión y los **mismos** Cloud
  Scheduler jobs. Un `ENV` equivocado no crea un ambiente aparte: intercambia credenciales en un
  servicio vivo compartido (por eso el script exige `ENV` explícito y no tiene default silencioso).
- **No existe un flip "sólo staging"** para nada hospedado en el `ops-worker`: flags, crons y
  credenciales quedan efectivos para todos los ambientes a la vez. El rollout gradual real se gatea
  **en datos** (per-org / per-perfil / opt-in persistido), no por ambiente.
- **Una capacidad que vive sólo en el worker queda LIVE al mergear a `develop`.** El deploy se dispara
  desde `develop` vía `.github/workflows/ops-worker-deploy.yml`; no hay promoción a `main` ni paso por
  el release control plane. El blast radius se declara antes del merge.
- **Tampoco hay "migrar primero en staging".** Sigue habiendo una única instancia Cloud SQL
  (`greenhouse-pg-dev`): una migración aplicada es una migración aplicada en producción.
- **Un runtime nuevo necesita su propia copia de la config.** Un reader que antes sólo corría en rutas
  Vercel no hereda nada al empezar a correr en Cloud Run: flag, credenciales y `*_SECRET_REF` se
  declaran otra vez en `deploy.sh`, y el check previo a prender es
  `gcloud run services describe ops-worker --region us-east4 --format=json` contra la revisión activa
  (TASK-1302 movió el reader de Google Search Console al worker sin ninguna de sus variables; misma bug
  class que ISSUE-113, `PERPLEXITY_ENABLED` ON con su secret ref nunca cableado).
- **El estado de pausa de un Cloud Scheduler job es declarativo.** `upsert_scheduler_job` recibe un 5º
  argumento `paused` y lo **re-aplica en cada deploy**: un `gcloud scheduler jobs resume|pause` a mano se
  revierte solo en el siguiente deploy, en silencio — el mismo patrón que un env var aplicado sólo con
  `--update-env-vars` frente al `--set-env-vars` destructivo del script.

Invariantes de agente derivados: `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
§`Cloud Run ops-worker`.

## Delta 2026-07-12 — `artifact-worker`: el PRIMER Cloud Run **Job** del ecosistema (TASK-1391)

Hasta hoy el inventario de §4 solo tenía **services** (Cloud Run HTTP + Cloud Functions). `artifact-worker`
inaugura una **categoría nueva**: un Cloud Run **Job** — no expone HTTP, se invoca por `jobs.run` y
escala a cero de verdad. Renderiza artefactos del Artifact Composer (Chromium/Playwright pinneado) a
partir de filas de `greenhouse_commercial.proposal_render_jobs`. **Frontera autorizada por excepción
documentada de EPIC-027.**

- Inventario en §4 → nueva subsección **"Cloud Run Jobs"** (región `us-east4`, SA `greenhouse-portal@`,
  2 vCPU / 2 GiB, `task-timeout=900 s`, `tasks=1`/`parallelism=1`, `max-retries=0`).
- Scheduler nuevo en §5: `ops-artifact-render-dispatch` (`*/2 * * * *` → `POST /artifact-render/dispatch`
  del `ops-worker`).
- **Invocación:** el dispatcher (en `ops-worker`, misma SA) hace `jobs.run` **simple** con
  `roles/run.invoker`. **NO** se usa `runWithOverrides` (permiso que `run.invoker` no incluye): el worker
  hace el **claim atómico** de su propio job (`FOR UPDATE SKIP LOCKED`) — menos privilegio y concurrencia
  segura por construcción (ISSUE-121 · #1).
- **Flag multi-runtime ×3:** `ARTIFACT_RENDER_JOBS_ENABLED` se lee en Vercel (enqueue), `ops-worker`
  (dispatch) y el Job. SoT en Cloud Run = los `deploy.sh` (`--set-env-vars` es destructivo).
- **Deploy:** `.github/workflows/artifact-worker-deploy.yml` — **staging-only**. La promoción a
  production exige integrarlo al release control plane (`RELEASE_DEPLOY_WORKFLOWS`) + sign-off.
- Spec canónica: **`GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`**.

## Delta 2026-06-06 — Secret Manager IAM binding helper para deploys Cloud Run

Un fallo de GitHub Actions en `Commercial Cost Worker Deploy` expuso una carrera real en los deploy scripts: varios workers pueden mutar bindings IAM de los mismos secrets de Secret Manager en paralelo, y `gcloud secrets add-iam-policy-binding` puede devolver `409 concurrent policy changes` aunque la intención sea idempotente.

Contrato vigente:

- Los deploy scripts que otorgan `roles/secretmanager.secretAccessor` al runtime service account deben usar `services/_shared/gcloud-secret-iam.sh`.
- El helper verifica si el binding ya existe antes de mutar IAM.
- Los `409`/`ABORTED` por escritura concurrente se reintentan con backoff acotado y jitter; errores permanentes siguen fallando loud.
- No se imprimen valores de secretos, no se amplían roles y no se introducen service account keys.
- `services/ops-worker/deploy.sh`, `services/commercial-cost-worker/deploy.sh` y `services/hubspot_greenhouse_integration/deploy.sh` consumen el helper compartido. Nuevos deploy scripts Cloud Run deben reutilizarlo en vez de reimplementar `add-iam-policy-binding` inline.

## Delta 2026-04-23 — Auditoria live rebaselinea el inventario cloud real

> **⚠️ Superseded en los conteos (TASK-1646, 2026-08-05):** este baseline siguió creciendo — a
> 2026-08-05 `services/ops-worker/deploy.sh` declara 46 scheduler jobs (no 16) y `vercel.json`
> tiene 8 crons. Los hallazgos cualitativos (hardening incompleto, adopción mixta de Secret
> Manager, heterogeneidad Cloud Run) siguen recogidos en los docs temáticos.

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

## Delta 2026-04-15 — Shared runtime topology formalized for portal + reactive workers

> **⚠️ Superseded en parte por el Delta 2026-08-05 (TASK-1302):** el "por ahora" de abajo ya no aplica. La
> topología compartida del `ops-worker` (un servicio para staging y producción) es **canónica**, no
> transitoria, y trae consecuencias operativas duras (no hay flip sólo-staging; worker-only queda live al
> mergear a `develop`). Leer ese delta antes que este.

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

## Delta 2026-06-17 — Reactive workers migrated to Cloud Run (TASK-254)

> **Nota TASK-1646:** la fecha `2026-06-17` venía así en el monolito, pero TASK-254 cerró en
> abril 2026 (el delta estaba archivado entre los de 2026-04-07 y 2026-04-04); se preserva
> verbatim en su posición original.

Three Vercel cron routes (`outbox-react`, `outbox-react-delivery`, `projection-recovery`) migrated to the new `ops-worker` Cloud Run service in `us-east4`. Cloud Scheduler triggers replace the Vercel cron entries. The original Vercel API routes remain as manual fallback endpoints but are no longer scheduled automáticamente.

- New service: `services/ops-worker/` (§4.9)
- New scheduler jobs: `ops-reactive-process`, `ops-reactive-process-delivery`, `ops-reactive-recover` (§5)
- Run tracking via `greenhouse_sync.source_sync_runs` with `source_system='reactive_worker'`
- Operability: Reactive Worker subsystem added to Ops Overview dashboard

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

### Inventario de procesos por migrar (a 2026-04-04)

> **⚠️ Superseded (TASK-1646):** todas las migraciones marcadas se ejecutaron
> (TASK-241/254/258/259/260/261/262/773/775). Inventario vigente: `SCHEDULING.md`.

| Proceso                      | Ubicación actual                   | Timeout típico  | Acción                                |
| ---------------------------- | ---------------------------------- | --------------- | ------------------------------------- |
| ICO materialización completa | Vercel `/api/cron/ico-materialize` | >120s (falla)   | **Migrar a Cloud Run (TASK-241)**     |
| LLM enrichment pipeline      | Vercel (trigger reactivo)          | 60-90s (riesgo) | **Migrar a Cloud Run (TASK-241)**     |
| ICO member sync              | Vercel `/api/cron/ico-member-sync` | ~45s            | Monitorear, migrar si crece           |
| Sync conformed               | Vercel `/api/cron/sync-conformed`  | ~30-60s         | Monitorear, migrar si crece           |
| Nubox sync                   | Vercel `/api/cron/nubox-sync`      | ~15s            | OK en Vercel por ahora                |
| Nubox quotes hot sync        | Vercel `/api/cron/nubox-quotes-hot-sync` | <10s esperado | OK en Vercel; carril liviano de frescura |
| Exchange rates / indicators  | Vercel cron                        | ~5s             | OK en Vercel                          |
| Outbox publish               | Vercel cron `*/5 min`              | ~5-15s          | OK en Vercel                          |
| Outbox react + recovery      | ~~Vercel cron~~ → Cloud Run        | 5-60s           | **Migrado a `ops-worker` (TASK-254)** |

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
- Delta 2026-04-26: `NUBOX_X_API_KEY` también adopta el helper canónico `Secret Manager -> env fallback`; su referencia operativa es `NUBOX_X_API_KEY_SECRET_REF`.
- El baseline externo de Nubox Secret Manager quedó provisionado para `Development`, `Preview`, `staging` y `Production`:
  - `NUBOX_BEARER_TOKEN_SECRET_REF`
  - `NUBOX_X_API_KEY_SECRET_REF`
- `production` ya validó el mismo patrón en `greenhouse.efeoncepro.com/api/internal/health` sobre `version=7238a90`.
- El rollout externo previo también dejó preparados en Vercel:
  - `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF`
  - `NEXTAUTH_SECRET_SECRET_REF`
  - `AZURE_AD_CLIENT_SECRET_SECRET_REF`
  - `GOOGLE_CLIENT_SECRET_SECRET_REF`
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

## Delta 2026-07-08 — Vercel docs-only ignored build step

> Venía embebido como `### Delta` dentro de §7 Vercel Deployment del monolito. Estado vigente:
> `VERCEL.md`.

`vercel.json` declara `ignoreCommand: "node scripts/ci/vercel-ignore-build.mjs"`
para cortar builds Vercel cuando el diff Git-triggered es demostrablemente
docs-only o contexto local de agentes. El comando usa `VERCEL_GIT_PREVIOUS_SHA`
vs `VERCEL_GIT_COMMIT_SHA`, que Vercel expone para Ignored Build Step, y respeta
la semántica oficial: exit `0` cancela/ignora el build; exit `1` continúa.

(Contrato completo en `VERCEL.md` §Ignored build step.)

---

# Snapshots de inventario superseded (preservados por cero-pérdida)

## §5 del monolito — Cloud Scheduler Jobs (as-of auditoría 2026-04-23)

> **⚠️ Superseded:** a 2026-08-05 `services/ops-worker/deploy.sh` declara 46 jobs. Inventario
> vigente: `SCHEDULING.md`.

La auditoría live confirmó `16` jobs activos, todos habilitados en `us-east4`.

Fan-out reactivo / jobs operativos: `ops-reactive-organization`, `ops-reactive-finance`,
`ops-reactive-people`, `ops-reactive-notifications`, `ops-reactive-delivery`,
`ops-reactive-cost-intelligence`, `ops-reactive-recover`, `ops-product-catalog-drift-detect`,
`ops-quotation-lifecycle`, `ops-nexa-weekly-digest`, `ops-artifact-render-dispatch`
(2026-07-12, TASK-1391).

Materializaciones batch: `commercial-cost-materialize-daily`,
`margin-feedback-materialize-daily`, `ico-materialize-daily`, `ico-llm-enrich-daily`,
`finance-materialize-signals-daily`, `finance-llm-enrich-daily`.

Auth posture verificada (OIDC con `greenhouse-portal@...`): `ops-reactive-finance` →
`ops-worker`; `commercial-cost-materialize-daily` → `commercial-cost-worker`;
`ico-materialize-daily` → `ico-batch-worker`.

Lectura operativa: el patrón Scheduler → OIDC → Cloud Run está bien aterrizado en la capa
nueva; el riesgo principal ya no está en los jobs, sino en la heterogeneidad de los servicios
que reciben esas invocaciones.

## §6 del monolito — Vercel Crons (as-of ~2026-04/05)

> **⚠️ Superseded:** a 2026-08-05 `vercel.json` tiene 8 crons y ninguno de los listados abajo
> sigue ahí (migrados por TASK-254/258/259/260/261/262/773/775). Inventario vigente:
> `SCHEDULING.md`.

Active (13 entries in vercel.json):

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
| `/api/cron/nubox-quotes-hot-sync` | `*/15 * * * *` | 60s | Hot lane de cotizaciones Nubox COT/DTE 52 → raw BQ → conformed → PG | Keep — liviano, idempotente, freshness comercial |
| `/api/cron/nubox-balance-sync` | `0 */4 * * *` | 60s | Reconciliación de balances Nubox BQ→PG | Keep — ligero, rápido |
| `/api/cron/entra-profile-sync` | `0 8 * * *` | 300s | Sync Entra: avatar, identity link, datos profesionales | Evaluar — 300s (máximo Vercel), sin retry |
| `/api/cron/entra-webhook-renew` | `0 6 */2 * *` | 30s | Renovar suscripción webhook de Entra | Keep — trigger simple |
| `/api/finance/economic-indicators/sync` | `5 23 * * *` | — | Fetch indicadores económicos (UF, UTM, IPC, exchange rates) | Keep — API call diario |

Migrated to Cloud Run:

| Ruta original (fallback manual) | Cloud Run service | Scheduler job | Desde |
|---|---|---|---|
| `/api/cron/outbox-react` | `ops-worker` | `ops-reactive-process` | TASK-254 |
| `/api/cron/outbox-react-delivery` | `ops-worker` | `ops-reactive-process-delivery` | TASK-254 |
| `/api/cron/projection-recovery` | `ops-worker` | `ops-reactive-recover` | TASK-254 |

Próximos candidatos a migración (todos ejecutados después):

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

## §7 del monolito — Deployment Notes (stale)

- El branch preview validado para `TASK-096` fue `feature/codex-task-096-wif-baseline`.
- El redeploy verificado con health OK fue `version=7638f85` en `greenhouse-i3cak6akh-efeonce-7670142f.vercel.app`.
- `dev-greenhouse.efeoncepro.com` no debía asumirse como `staging` canónico sin revalidación: al 2026-03-29 respondió desde un deployment `preview` de `develop`. (Estado posterior: es el custom domain del environment `staging`.)

## §1 del monolito — tabla de regiones original

> **⚠️ Superseded:** decía "Cloud Run / Cloud Functions → `us-central1` (Broadest service
> catalog, default for serverless)". A 2026-08-05 toda la capa moderna de workers corre en
> `us-east4`; `us-central1` quedó sólo para la capa legacy de Functions/syncs. Vigente:
> `README.md` de esta carpeta.
