# Cloud Infrastructure — CI/CD (GitHub Actions + Workload Identity Federation)

> **Estado vigente** · Updated: 2026-08-05 (TASK-1646) · Cronología: [HISTORIAL.md](HISTORIAL.md)
> **SoT workflows:** `.github/workflows/*-deploy.yml` · Ordering pnpm/Node canónico:
> CLAUDE.md §GitHub Actions workflows.

## Overview

Los deploys de servicios Cloud Run se automatizan vía GitHub Actions con autenticación
**Workload Identity Federation (WIF)** — sin llaves de service account persistentes en ningún
sistema.

```
Push a develop/main (paths match)
    │
    ▼
GitHub Actions runner
    │ (mints OIDC token via https://token.actions.githubusercontent.com)
    ▼
Google STS — token exchange
    │ (valida: repo == efeoncepro/greenhouse-eo)
    ▼
Federated principal impersonates github-actions-deployer@efeonce-group
    │
    ├── gcloud builds submit --async (Cloud Build)
    ├── gcloud run deploy (nueva revisión, 100% traffic)
    ├── gcloud scheduler jobs create/update (jobs declarativos)
    └── gcloud run services describe (health verification)
```

## Workflows de deploy (7, verificados 2026-08-05)

| Workflow | Target | Nota |
| --- | --- | --- |
| `ops-worker-deploy.yml` | Cloud Run `ops-worker` | push `develop`/`main` + dispatch; **una capacidad worker-only queda live al mergear a `develop`** (ver [TOPOLOGY.md](TOPOLOGY.md) §1) |
| `commercial-cost-worker-deploy.yml` | Cloud Run `commercial-cost-worker` | path triggers cubren servicio + librerías compartidas que alteran su runtime |
| `ico-batch-deploy.yml` | Cloud Run `ico-batch-worker` | |
| `hubspot-greenhouse-integration-deploy.yml` | Cloud Run `hubspot-greenhouse-integration` | health check `/health` + `/contract` |
| `artifact-worker-deploy.yml` | Cloud Run **Job** `artifact-worker` | **staging-only**; promoción a production exige integrarlo a `RELEASE_DEPLOY_WORKFLOWS` + sign-off |
| `azure-teams-bot-deploy.yml` | Azure (Teams Bot) | WIF Azure, no GCP |
| `azure-teams-deploy.yml` | Azure Logic Apps (Teams notifications, Bicep) | WIF Azure, no GCP |

Regla del release control plane: cualquier workflow nuevo de deploy **production** se agrega a
`RELEASE_DEPLOY_WORKFLOWS` (`src/lib/release/workflow-allowlist.ts`) ANTES del primer deploy.

**Criterio de path triggers:** el trigger cubre no sólo `services/<worker>/**` sino el set
mínimo de librerías compartidas que cambian el runtime real del worker (`src/lib/sync/**`,
`db`, event publishing, materializadores compartidos, `src/types/db.d.ts`, lockfile,
tsconfig). Esto evita drift entre el monorepo y el worker.

## Identity architecture

### WIF Pool + Provider (CI/CD)

| Recurso | Valor |
|---|---|
| Pool ID | `github-actions` (location `global`) |
| Provider ID | `efeoncepro-greenhouse-eo` |
| Issuer URI | `https://token.actions.githubusercontent.com` |
| Attribute condition | `assertion.repository == 'efeoncepro/greenhouse-eo'` |
| Attribute mapping | `google.subject=assertion.sub`, `attribute.repository`, `attribute.repository_owner`, `attribute.ref`, `attribute.actor` |

La attribute condition **restringe por repositorio**: tokens de cualquier otro repo son
rechazados en el exchange. No hay fallback a credentials por defecto.

> El WIF de **runtime Vercel** es un pool distinto (`vercel` / provider `greenhouse-eo`): ver
> [SECRETS.md](SECRETS.md) §Auth runtime GCP.

### Deployer service account

`github-actions-deployer@efeonce-group.iam.gserviceaccount.com` — identidad de deploy para
TODOS los workflows CI/CD del repo.

**Un solo deployer SA, no uno por servicio.** La identidad de deploy es distinta de la de
runtime: el deployer puede CONFIGURAR que un servicio corra como `greenhouse-portal@` pero no
puede ACTUAR como él. Eso limita el blast radius de un workflow comprometido (puede
redesplegar — auditable vía Cloud Build + revision history — pero no leer datos de
producción). Crear un deployer por servicio escala O(n), crea drift de roles y no agrega
seguridad real; sólo crear un segundo deployer si un workflow necesita roles que ningún otro
debería tener.

### IAM roles del deployer

Project-level:

| Role | Propósito |
|---|---|
| `roles/cloudbuild.builds.editor` | Submit + describe Cloud Build jobs |
| `roles/run.admin` | Deploy/update/describe Cloud Run |
| `roles/cloudscheduler.admin` | CRUD Cloud Scheduler jobs |
| `roles/secretmanager.admin` | Grant `secretAccessor` sobre secrets individuales a runtime SAs |
| `roles/storage.admin` | Cloud Build staging bucket + private assets |
| `roles/artifactregistry.writer` | Push de imágenes |
| `roles/logging.viewer` | Leer logs Cloud Build (`CLOUD_LOGGING_ONLY`) |

Resource-level:

| Role | Resource | Propósito |
|---|---|---|
| `roles/iam.serviceAccountUser` | `greenhouse-portal@efeonce-group` | setear ese SA como runtime identity |
| `roles/iam.serviceAccountUser` | `183008134038-compute@developer.gserviceaccount.com` | usar el default SA para Cloud Build |
| `roles/iam.workloadIdentityUser` | `github-actions-deployer` (self) | impersonación desde el principalSet federado |

## GitHub-side configuration

| Item | Valor |
|---|---|
| Repo secret `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/183008134038/locations/global/workloadIdentityPools/github-actions/providers/efeoncepro-greenhouse-eo` |
| Environment `staging` | branch `develop`, auto-deploy |
| Environment `production` | branch `main`, required reviewer `cesargrowth11` |

## Cloud Build — async submit + polling

`deploy.sh` usa `gcloud builds submit --async` (el modo sincrónico streamea logs desde un
bucket GCS que exige `roles/viewer` project-level):

1. Submit retorna inmediato con el build ID
2. Polling cada 10s vía `gcloud builds describe` hasta `SUCCESS | FAILURE | TIMEOUT | CANCELLED`
3. Max 60 polls (10 min timeout)

Config inline incluye `options.logging: CLOUD_LOGGING_ONLY` (logs en Cloud Logging, donde
`roles/logging.viewer` aplica).

## Health verification

En CI (`GITHUB_ACTIONS=true`) el health check de `deploy.sh` se omite — lo hace el step
separado del workflow vía `gcloud run services describe` (latest ready revision +
`status.conditions[0].status == True`). No requiere identity token, proxy ni curl autenticado
(`gcloud run services proxy` instala un component que cuelga el step).

## Pitfalls resueltos

| Pitfall | Síntoma | Fix |
|---|---|---|
| `gcloud builds submit` cuelga en CI | timeout 25min con build SUCCESS | `--async` + polling por build ID |
| Logs Cloud Build en GCS bucket | `ERROR: This tool can only stream logs if you are Viewer/Owner` | `options.logging: CLOUD_LOGGING_ONLY` |
| `gcloud run services proxy` cuelga | component install crea subprocess inmortal | skip proxy en CI, usar `describe` |
| `print-identity-token --audiences` falla con WIF | `Invalid account type for --audiences` | verificar vía describe, sin identity tokens |
| `deploy.sh` con default `ENV=staging` silencioso | secrets equivocados montados en servicio compartido | `ENV` explícito obligatorio, abort si falta |
| Cloud Build SA permission denied | deployer no puede act-as el default compute SA | `iam.serviceAccountUser` sobre `<project-number>-compute@developer` |

## Agregar un nuevo workflow

1. Crear `.github/workflows/<name>.yml` con `google-github-actions/auth@v2`,
   `permissions: {contents: read, id-token: write}`, referenciando
   `${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}` + el deployer SA.
2. Si necesita un role que el deployer no tiene: agregarlo a `PROJECT_ROLES` en
   `scripts/setup-github-actions-wif.sh` y re-correr (idempotente).
3. **No** crear WIF pool/provider/SA nuevos salvo aislamiento real (extremadamente raro).

## Disaster recovery

Si el setup WIF se corrompe o borra:

1. `bash scripts/setup-github-actions-wif.sh` con un usuario `roles/owner`
2. Copiar el provider resource name del output
3. Actualizar `GCP_WORKLOAD_IDENTITY_PROVIDER` en GitHub repo secrets
4. Disparar un workflow para confirmar

Tiempo total: <5 min. WIF es attribute-based, no almacena material secreto.

## Nubox — contrato env/secrets del ops-worker

`ops-worker` es dueño de `/nubox/sync`, `/nubox/quotes-hot-sync`, `/nubox/balance-sync`. Como
`deploy.sh` usa `--set-env-vars` (destructivo), las vars Nubox son parte del contrato
declarativo del deploy:

- `NUBOX_API_BASE_URL` (config no-secreta)
- `NUBOX_BEARER_TOKEN_SECRET_REF` + `NUBOX_X_API_KEY_SECRET_REF` (refs Secret Manager)

El script setea defaults por ambiente y grantea `roles/secretmanager.secretAccessor` al runtime
SA. Tokens crudos Nubox nunca como env plano ni en logs. La frescura del runtime se verifica
vía `greenhouse_sync.source_sync_runs`, no sólo por el status de Cloud Scheduler: un 2xx/200
puede seguir degradado si `raw_sync` falló y las fases downstream reprocesaron snapshots
stale.

## Archivos de referencia

| Archivo | Propósito |
|---|---|
| `.github/workflows/*-deploy.yml` | Workflows de deploy (7, tabla arriba) |
| `.github/DEPLOY.md` | Contrato de deployment para contributors |
| `scripts/setup-github-actions-wif.sh` | Provisioning idempotente de pool, provider, SA, roles |
| `services/<worker>/deploy.sh` | Scripts de deploy ejecutados por los workflows |
