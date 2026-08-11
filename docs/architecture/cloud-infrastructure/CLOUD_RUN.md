# Cloud Infrastructure — Cloud Run (services, Functions legacy, Jobs)

> **Estado vigente** · Updated: 2026-08-11 (TASK-1378) · Cronología: [HISTORIAL.md](HISTORIAL.md)
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
| `clamav` | `us-east4` | `greenhouse-portal@...` | IAM only (ingress `all` + `--no-allow-unauthenticated`) | **ninguno** — no lee secretos ni toca PostgreSQL | Escáner de firmas de assets de candidato (TASK-1378). `mem=2Gi`, `cpu=1`, `min=1`, `max=3`, `concurrency=4`, `timeout=120s`. **Servicio ÚNICO para staging y producción** (ver abajo). ≈USD 19/mes |

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

## `clamav`

Escáner de firmas (ClamAV + shim HTTP `POST /scan`) que consume el adapter
`src/lib/storage/asset-scan/clamav-http.ts`. Source: `services/clamav/` — **no bundlea `src/lib`**:
el contrato entre el portal y el servicio es HTTP, no código compartido.

- **Un solo servicio para los dos entornos**, a diferencia del resto de los workers. Es stateless:
  recibe bytes y devuelve un veredicto; no lee secretos, no toca PostgreSQL, no conoce tenants ni
  entornos — y staging y producción ya comparten la misma base
  (`efeonce-group:us-east4:greenhouse-pg-dev`), que es lo único que podría necesitar aislamiento.
  Duplicarlo sólo agregaba ≈USD 19/mes de `min-instances=1` sin aislar nada.
- **El canary de una imagen nueva sale por revisión etiquetada sin tráfico**, no por un servicio
  aparte: `ENV=staging` despliega `--no-traffic --tag canary` con **`min=0`** y `ENV=production`
  promueve la revisión a 100% del tráfico. El `min=0` del canary hay que forzarlo: `minScale` es por
  **revisión**, no por servicio, así que un canary con `min=1` factura igual que un servicio
  duplicado aunque sirva 0% del tráfico. Contrapartida: el canary arranca frío y cargar las firmas
  toma 30-60 s mientras el adapter corta a los 10 s — hay que calentarlo antes de ejercitarlo.
- **Ingress `all`, no `internal`.** Vercel sale por internet pública, así que un Cloud Run
  restringido a la VPC sería inalcanzable desde el route handler que sube el CV — y con el flag ON
  eso es fail-closed sobre todas las postulaciones. El cierre es por IAM:
  `--no-allow-unauthenticated` + `roles/run.invoker` sólo para `greenhouse-portal@`, y el adapter
  presenta un **ID token OIDC** con audiencia derivada del endpoint. `deploy.sh` aborta si aparece
  `allUsers` en la IAM policy.
- **La imagen hornea la base de firmas en build** (etapa `freshclam` del Dockerfile). Sin eso la
  primera instancia arranca descargando ~250 MB y el startup probe expira.
- **El startup probe HTTP contra `/ready` es load-bearing, no cosmético.** Cloud Run da CPU plena
  sólo hasta que el probe pasa; el shim abre el puerto en ~1 s, así que con el probe TCP por defecto
  el boost se corta ahí y clamd queda cargando 3,6 M de firmas con CPU throttled a casi cero: nunca
  termina, `/health` responde `clamd: down` para siempre y el servicio queda inservible **con Cloud
  Run reportando `Ready=True`**. El síntoma se confunde con falta de memoria y no lo es (con 4 GiB
  pasaba igual).
- **`min=1` no se baja** en el runtime que atiende subidas reales: clamd tarda 20-40 s en cargar las
  firmas y el primer CV del día pagaría ese cold start contra un adapter que corta a los 10 s
  (`scanner_timeout`, bloqueante).
- Health del servicio: `/health` (expone `clamd` y `signatureAgeHours`) + el signal
  `storage.asset_scan.signature_freshness`. **No** está mapeado a `cloudRunService` en el
  workflow-allowlist: `production-release.yml` no lo despliega y su imagen sólo cambia con
  `services/clamav/**`, así que la detección de drift por `GIT_SHA` lo marcaría desalineado en cada
  promoción, para siempre.
- Spec: [`../../tasks/in-progress/TASK-1378-clamav-malware-scanner-provisioning-decision.md`](../../tasks/in-progress/TASK-1378-clamav-malware-scanner-provisioning-decision.md).
  Runbook: `docs/manual-de-uso/plataforma/operar-scanner-malware-assets.md`.

## Deploy scripts — reglas compartidas

- `--set-env-vars` de los `deploy.sh` es **destructivo**: toda var agregada out-of-band
  desaparece en el próximo deploy. Declarar siempre en el script.
- Los deploy scripts que otorgan `roles/secretmanager.secretAccessor` usan el helper compartido
  `services/_shared/gcloud-secret-iam.sh` (ver [SECRETS.md](SECRETS.md)).
- `deploy.sh` del ops-worker exige `ENV` explícito, sin default silencioso (topología
  compartida). El de `clamav` también, aunque su `ENV` no nombra el servicio: elige entre promover
  la revisión (`production`) o dejarla como canary sin tráfico (`staging`).

## Logs / health (lectura puntual 2026-04-23)

- `commercial-cost-worker`, `ico-batch-worker` y `hubspot-greenhouse-integration` sin errores
  recientes repetitivos en Cloud Logging.
- `ops-worker` con un error aislado en una revisión reciente, sin degradación sistémica del
  lane reactivo.
