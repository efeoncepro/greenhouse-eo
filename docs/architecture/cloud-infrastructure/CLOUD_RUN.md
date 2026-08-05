# Cloud Infrastructure — Cloud Run (services, Functions legacy, Jobs)

> **Estado vigente** · Updated: 2026-08-05 (TASK-1646) · Cronología: [HISTORIAL.md](HISTORIAL.md)
> **SoT:** `services/<worker>/deploy.sh` (config declarativa) + `gcloud run services|jobs list`
> (estado live). Inventario live completo auditado por última vez el 2026-04-23 (`13`
> serverless: 5 Cloud Run custom + 8 Functions Gen 2); re-baseline pendiente (`TASK-127`).

## Cloud Run custom (services)

| Service | Region | Identity | Exposure | Secret posture | Nota |
| --- | --- | --- | --- | --- | --- |
| `ops-worker` | `us-east4` | `greenhouse-portal@...` | IAM only | Secret Manager | Worker reactivo moderno, OIDC desde Scheduler. **Servicio ÚNICO compartido por staging y producción** (misma revisión, mismos scheduler jobs, misma Cloud SQL); `ENV` sólo elige secret refs de NextAuth/Resend — topología canónica, ver [TOPOLOGY.md](TOPOLOGY.md) §1 |
| `commercial-cost-worker` | `us-east4` | `greenhouse-portal@...` | IAM only | Secret Manager | Worker dedicado del commercial cost basis engine (TASK-483) |
| `ico-batch-worker` | `us-east4` | `greenhouse-portal@...` | IAM only | **mixto** | mantiene `GREENHOUSE_POSTGRES_PASSWORD` en env plano (gap en [SECURITY.md](SECURITY.md)) |
| `hubspot-greenhouse-integration` | `us-central1` | default compute SA | **public** (`allUsers`) | parcial | revisar si el exposure público es realmente el deseado |
| `notion-bq-sync` | `us-central1` | default compute SA | **public** (`allUsers`) | Secret Manager | exposición pública innecesaria para un sync interno; `minScale=0` desde 2026-04-24 |

## Cloud Run Jobs

Un Cloud Run **Job** no es un service: **no expone HTTP**, se invoca por `jobs.run` (Jobs API)
y una ejecución termina. El primero (y único hoy) del ecosistema (TASK-1391, 2026-07-12):

| Job | Region | Identity | Invocación | Recursos | Nota |
| --- | --- | --- | --- | --- | --- |
| `artifact-worker` | `us-east4` | `greenhouse-portal@...` | IAM only — `jobs.run` **sin overrides** desde el dispatcher del `ops-worker` (`roles/run.invoker`) | `cpu=2`, `mem=2Gi`, `task-timeout=900s`, `tasks=1`, `parallelism=1`, `max-retries=0` | Render de artefactos del Artifact Composer (Chromium/Playwright **pinneado** a la versión de `@playwright/test`). Secrets vía Secret Manager. Flag `ARTIFACT_RENDER_JOBS_ENABLED` (SoT: `services/artifact-worker/deploy.sh`). **Staging-only** hasta sign-off + release control plane |

- `max-retries=0` es deliberado: **el retry es del dominio** (`proposal_render_jobs.attempts`),
  no de Cloud Run — ninguna re-ejecución ocurre fuera del contrato del job record.
- Un fallo **gobernado** sale con **exit 0** (el código queda en `failure_code`); un
  **exit ≠ 0** es un bug del worker (Sentry `domain=commercial`, tag `source=artifact_worker`).
- La imagen corre un **selftest dentro de Cloud Build** (catálogo + checksums de fuentes +
  Chromium + render probe): si falla, **no hay deploy**.
- **NO** se usa `runWithOverrides` (permiso que `run.invoker` no incluye): el worker hace el
  **claim atómico** de su propio job (`FOR UPDATE SKIP LOCKED`) — menos privilegio y
  concurrencia segura por construcción (ISSUE-121 · #1).
- Spec: [`GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`](../GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md).

## Cloud Functions Gen 2 / servicios legacy

Servicios activos (as-of 2026-04-23): `hubspot-bq-sync`, `hubspot-notion-deal-sync`,
`hubspot-notion-deal-sync-staging`, `notion-frameio-sync`, `notion-frameio-sync-staging`,
`notion-hubspot-reverse-sync`, `notion-hubspot-reverse-sync-staging`, `notion-teams-notify`.

Patrón operativo observado:

- corren mayoritariamente con la default compute service account
- varios siguen resolviendo tokens sensibles desde env plano
- representan la capa más heterogénea y más alejada del estándar moderno del repo

## Contratos de endpoints del `ops-worker`

El catálogo completo vive en `services/ops-worker/server.ts` + los jobs que los disparan en
[SCHEDULING.md](SCHEDULING.md). Contratos destacados fijados por task:

- **Lanes reactivos** (TASK-254): `/reactive/process-domain`, `/reactive/recover` — reemplazan
  los Vercel crons `outbox-react*` / `projection-recovery`; run tracking en
  `greenhouse_sync.source_sync_runs` (`source_system='reactive_worker'`); las rutas API Vercel
  originales persisten sólo como fallback manual.
- **Outbox publisher** (TASK-773): `/outbox/publish-batch` — publisher canónico del event bus
  (Cloud Scheduler `ops-outbox-publish`, no Vercel cron).
- **VAT ledger** (TASK-533): `POST /vat-ledger/materialize` — `{ year, month }` recomputa un
  período; `{}` hace backfill bulk. Lane manual/replay; el trigger normal nace de la projection
  reactiva `vat_monthly_position`.
- **Cost attribution** (TASK-279): `POST /cost-attribution/materialize` — pipeline pesado
  (3 CTEs + LATERAL JOIN + FX) que excede Vercel serverless; `recomputeEconomics` (default
  `true`) recomputa `client_economics` después.
- **Email transaccional**: el deploy propaga `EMAIL_FROM` y acepta
  `RESEND_API_KEY_SECRET_REF`; si el worker procesa proyecciones que envían correo y esa
  variable falta, el canal email queda degradado aunque el portal tenga `RESEND_API_KEY`.
- **Nubox** (contrato env/secrets): ver [CICD_WIF.md](CICD_WIF.md) §Nubox.

## `commercial-cost-worker`

- Source: `services/commercial-cost-worker/` — mismo patrón esbuild + shims ESM/CJS del
  `ops-worker`.
- Topología objetivo de la base de costos comercial (people + tools + bundle); el `ops-worker`
  conserva `/cost-attribution/materialize` como fallback/manual lane.
- Trazabilidad por corrida en `greenhouse_sync.source_sync_runs`
  (`source_system='commercial_cost_worker'`) y por período/scope en
  `greenhouse_commercial.commercial_cost_basis_snapshots`.
- Endpoints de roles / quote repricing / margin feedback nacieron `501` reservados hasta las
  tasks del programa que los completen.

## Deploy scripts — reglas compartidas

- `--set-env-vars` de los `deploy.sh` es **destructivo**: toda var agregada out-of-band
  desaparece en el próximo deploy. Declarar siempre en el script.
- Los deploy scripts que otorgan `roles/secretmanager.secretAccessor` usan el helper compartido
  `services/_shared/gcloud-secret-iam.sh` (ver [SECRETS.md](SECRETS.md)).
- `deploy.sh` del ops-worker exige `ENV` explícito, sin default silencioso (topología
  compartida).

## Logs / health (lectura puntual 2026-04-23)

- `commercial-cost-worker`, `ico-batch-worker` y `hubspot-greenhouse-integration` sin errores
  recientes repetitivos en Cloud Logging.
- `ops-worker` con un error aislado en una revisión reciente, sin degradación sistémica del
  lane reactivo.
