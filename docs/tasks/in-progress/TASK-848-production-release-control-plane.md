# TASK-848 — Production Release Control Plane

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops / platform / cloud / reliability`
- Blocked by: `none`
- Branch: `task/TASK-848-production-release-control-plane`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear un control plane canonico para promocionar `develop` a produccion sin depender de una secuencia manual larga, fragil y dificil de auditar. El entregable debe convertir el pase a produccion en un flujo deterministico con preflight, deploy coordinado, health checks, deteccion de approvals/concurrency blockers obsoletos, manifest de release y rollback first-class.

## Why This Task Exists

El pase a produccion del 2026-05-09/2026-05-10 completo el deploy de `main`, Vercel Production, CI, HubSpot Integration y Azure Teams, pero expuso fallas sistemicas de orquestacion:

- Los workflows de Cloud Run workers quedaron bloqueados por runs antiguos de `main` esperando approval de `Production`; los runs nuevos quedaron en cola de `concurrency`, sin jobs materializados, y fueron cancelados/reemplazados.
- Azure Teams fallo primero por secrets faltantes en el environment `Production` y luego por mismatch de Workload Identity Federation entre `environment:production` y el subject configurado solo para `ref:refs/heads/main`.
- El release mezclo gates de app, workers, infra y observabilidad en una secuencia manual sin manifest unico, sin declaracion explicita de rollback y sin criterio automatizado para decidir que workflows deben correr.
- Produccion quedo funcional, pero el costo operativo fue alto y el sistema no impidio ni explico temprano los estados invalidos.

### Workflows bloqueados observados

Estos runs quedaron cancelados durante el release del commit `d5f45b163e6c405b34b532ade91ddba68563cc15` porque no llegaron a tomar el slot de `concurrency` del workflow:

| Workflow | Run | Event | Estado final | Sintoma |
| --- | --- | --- | --- | --- |
| `Ops Worker Deploy` | `25614899662` | `push` | `cancelled` | `jobs: []`; pendiente detras del concurrency blocker |
| `Commercial Cost Worker Deploy` | `25614899674` | `push` | `cancelled` | `jobs: []`; pendiente detras del concurrency blocker |
| `ICO Batch Worker Deploy` | `25614899686` | `push` | `cancelled` | `jobs: []`; pendiente detras del concurrency blocker |
| `Ops Worker Deploy` | `25615587227` | `workflow_dispatch` | `cancelled` | `jobs: []`; reemplazo al pending anterior y luego se cancelo |
| `Commercial Cost Worker Deploy` | `25615587234` | `workflow_dispatch` | `cancelled` | `jobs: []`; reemplazo al pending anterior y luego se cancelo |
| `ICO Batch Worker Deploy` | `25615587237` | `workflow_dispatch` | `cancelled` | `jobs: []`; reemplazo al pending anterior y luego se cancelo |

Runs antiguos que seguian bloqueando `main`:

| Workflow | Run | Created | Estado | Causa |
| --- | --- | --- | --- | --- |
| `Ops Worker Deploy` | `24970337613` | 2026-04-26 | `waiting` | job esperando approval de environment `Production` |
| `Commercial Cost Worker Deploy` | `24970337616` | 2026-04-26 | `waiting` | job esperando approval de environment `Production` |
| `ICO Batch Worker Deploy` | `24594085240` | 2026-04-18 | `waiting` | job esperando approval de environment `Production` |

Diagnostico actual:

- No fue un fallo dentro de `services/*/deploy.sh`: los runs nuevos no llegaron a crear jobs.
- No fue causado directamente por TASK-607/version bump de actions: despues de `7f3de12e`, los worker deploys en `develop` ejecutaron jobs y terminaron `success` con `checkout@v5`, `google-github-actions/auth@v3` y `setup-gcloud@v3`.
- La causa raiz operativa fue la combinacion `environment Production approval pendiente` + `concurrency.group: <worker>-deploy-${{ github.ref }}` + `cancel-in-progress: false`.
- GitHub Actions permite un running/waiting y un pending por concurrency group; pushes nuevos reemplazaron el pending anterior, pero no avanzaron porque el run viejo seguia esperando approval.
- El control plane debe detectar tanto stale waiting approvals con jobs `status=waiting` como pending runs con `jobs.length=0` bloqueados por el mismo concurrency group.

## Goal

- Construir un workflow canonico `production-release` que coordine app, workers, infra y verificacion post-release.
- Agregar preflight fail-fast para GitHub Actions, Vercel, Postgres, GCP, Azure WIF, secrets y health checks.
- Detectar y resolver approvals/concurrency blockers obsoletos antes de que consuman horas de espera manual.
- Hacer deploy de workers Cloud Run de forma deterministica por SHA esperado, con health check de revision y manifest.
- Separar app release de infra release: Azure/Bicep solo debe correr cuando el diff toque infra o cuando el operador lo pida explicitamente.
- Dejar rollback auditable para Vercel, Cloud Run workers y cambios de config externa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Esta task cambia contratos de deploy/cloud/secrets; debe identificar ADR existente o proponer `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` antes de implementar.
- No ocultar failures de produccion con warnings non-blocking cuando afecten deploy, worker freshness, WIF, DB migrations o rollback.
- No introducir secretos en logs ni en artifacts.
- El release debe ser reproducible por commit SHA y ambiente, no por memoria conversacional.
- Los deploys de infra no deben correr por defecto en todo release de app si no hay diff material de infra.

## Normative Docs

- `AGENTS.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `.github/workflows/ci.yml`
- `.github/workflows/playwright.yml`
- `.github/workflows/ops-worker-deploy.yml`
- `.github/workflows/commercial-cost-worker-deploy.yml`
- `.github/workflows/ico-batch-deploy.yml`
- `.github/workflows/hubspot-greenhouse-integration-deploy.yml`
- `.github/workflows/azure-teams-deploy.yml`
- `.github/workflows/azure-teams-bot-deploy.yml`
- `services/ops-worker/deploy.sh`
- `services/commercial-cost-worker/deploy.sh`
- `services/ico-batch/deploy.sh`
- `package.json`
- `scripts/`

### Blocks / Impacts

- Futuras promociones `develop` -> `main`.
- Worker deploy reliability para `ops-worker`, `commercial-cost-worker` e `ico-batch-worker`.
- Operacion de Azure Teams Bot y Azure Teams Notifications.
- Vercel Production release discipline.
- Handoff y auditoria post-release.

### Files owned

- `.github/workflows/production-release.yml`
- `.github/workflows/*deploy*.yml`
- `scripts/release/**`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release.md`
- `docs/tasks/to-do/TASK-848-production-release-control-plane.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- CI y Playwright ya existen como gates separados.
- Vercel Production esta asociado a `main`; Staging a `develop` segun contrato operativo.
- Workflows separados ya despliegan Cloud Run workers con WIF GCP:
  - `Ops Worker Deploy`
  - `Commercial Cost Worker Deploy`
  - `ICO Batch Worker Deploy`
- Workflows separados ya despliegan HubSpot integration y Azure Teams.
- `pnpm pg:doctor` y `pnpm pg:connect:status` existen para validar Postgres/migrations.
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` ya gobierna reliability signals y smoke lanes.

### Gap

- No hay workflow unico de release production que orqueste preflight, deploy, verification y rollback.
- No hay detector canonico para GitHub Actions production runs en `waiting` por approvals obsoletos ni para pending runs sin jobs bloqueados por `concurrency`.
- Los workers pueden quedar pendientes/cancelados/reemplazados sin que el release sepa si la revision esperada llego realmente a Cloud Run.
- Azure WIF/secrets se validan tarde, cuando el workflow ya fallo.
- No hay manifest versionado que capture SHA, deployments Vercel, Cloud Run revisions, workflow run IDs, health status y rollback target.
- No hay regla codificada para decidir si Azure/Bicep debe correr como deploy real o solo como health/preflight.
- WIF subjects de GCP y Azure estan configurados solo para `ref:refs/heads/main` y no aceptan `environment:production`; cualquier job que declare `environment: production` falla la federacion (causa del fallo Azure Teams del release 2026-05-09).
- Concurrency groups de los 3 worker workflows usan `cancel-in-progress: false`, lo que combinado con stale waiting approval crea deadlock determinista (no es flake, es bug class de GitHub Actions).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — ADR + release contract + manifest persistido

- Crear `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (ADR check confirmo spec dedicada; no consolidar con Reliability porque el lifecycle y dueno operativo son distintos).
- Indexar la decision en `docs/architecture/DECISIONS_INDEX.md`.
- Definir estados canonicos enum cerrado: `preflight | ready | deploying | verifying | released | degraded | rolled_back | aborted`. Documentar transiciones permitidas + transiciones prohibidas.
- Crear migration `greenhouse_ops.release_manifests` (tabla append-only, NO operator-blind):
  - PK `release_id TEXT` formato `<targetSha[:12]>-<UUIDv7>` (idempotencia + orden temporal nativo + permite N intentos del mismo SHA).
  - Columnas estructurales: `target_sha`, `source_branch`, `target_branch`, `state`, `started_at`, `completed_at`, `operator_member_id` (FK `team_members.member_id`), `attempt_n INT NOT NULL DEFAULT 1`.
  - Columnas de payload: `vercel_deployment_url`, `previous_vercel_deployment_url`, `worker_revisions JSONB`, `previous_worker_revisions JSONB`, `workflow_runs JSONB`, `preflight_result JSONB`, `post_release_health JSONB`, `rollback_plan JSONB`.
  - CHECK constraint `release_state_canonical_check` enum cerrado.
  - Partial UNIQUE INDEX `release_manifests_one_active_release_idx ON (target_branch) WHERE state IN ('preflight','deploying','verifying')` — garantiza 1 release activo a la vez por branch.
  - Anti-UPDATE/DELETE triggers (mismo patron `payment_order_state_transitions` de TASK-765): `release_manifests_no_destructive_update_trigger` (permite UPDATE solo en columnas no-PK + `state` + `completed_at` + payload mutables; bloquea cualquier UPDATE que toque `release_id`/`target_sha`/`started_at`/`operator_member_id`).
  - GRANTs: `greenhouse_runtime` SELECT/INSERT/UPDATE; `greenhouse_ops` ownership; NO DELETE para nadie.
- Crear tabla auxiliar `greenhouse_ops.release_state_transitions` append-only para audit granular (mirror del patron `payment_order_state_transitions`):
  - `transition_id UUID PK`, `release_id FK`, `from_state`, `to_state`, `actor_member_id`, `transitioned_at`, `reason TEXT NOT NULL CHECK (length(reason) >= 5)`, `metadata_json JSONB`.
  - Anti-UPDATE/DELETE trigger.
- Outbox events versionados v1: `platform.release.{started, deploying, verifying, released, degraded, rolled_back, aborted} v1`. Documentar en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.
- Capabilities granulares NUEVAS (least privilege, no reusar `platform.admin` catch-all):
  - `platform.release.execute` — disparar release production. EFEONCE_ADMIN + DEVOPS_OPERATOR.
  - `platform.release.rollback` — disparar rollback. EFEONCE_ADMIN solo.
  - `platform.release.bypass_preflight` — break-glass skip preflight. EFEONCE_ADMIN solo, requiere `reason >= 20 chars`, audit log obligatorio.
- GitHub Actions artifact del manifest (mirror humano legible) queda como salida del workflow, NO como source of truth. Postgres es source of truth.

### Slice 2 — Preflight CLI

- Crear `scripts/release/production-preflight.ts`. Idempotente, ejecutable local (operator go/no-go) Y como primer job del workflow CI (gate non-bypassable).
- Validar branch/SHA, `develop` green, `main` merge target, Vercel staging/production readiness, Postgres doctor/status, GitHub Actions health, GCP WIF/secrets, Azure WIF/secrets y Sentry critical/high issues segun politica acordada.
- **Verificacion explicita de WIF subjects** (causa del fallo Azure Teams del 2026-05-09):
  - GCP: `gcloud iam workload-identity-pools providers describe <provider> --location=global --workload-identity-pool=<pool>` y verificar que `attributeCondition` permite ambos `assertion.ref == 'refs/heads/main'` Y `assertion.environment == 'production'`. Si falta cualquiera de los dos, fail loud con comando exacto de remediacion.
  - Azure: `az ad app federated-credential list --id <app-client-id>` y verificar que existen subjects para `repo:efeoncepro/greenhouse-eo:ref:refs/heads/main` Y `repo:efeoncepro/greenhouse-eo:environment:production`. Fail loud con comando de remediacion via `az ad app federated-credential create`.
- Detectar blockers de GitHub Actions con GitHub API:
  - run antiguo `status=waiting` con job `status=waiting` y `pending_deployments[].environment.name == "Production"`;
  - run nuevo `status=pending` por mas de umbral configurable con `jobs.length === 0`;
  - ambos en el mismo workflow/ref/concurrency group de production;
  - workflow dentro de la allowlist de deploys production.
- Detectar y permitir resolucion guiada (no automatica): el preflight reporta los run IDs bloqueantes y propone comando exacto (`gh run cancel <id>` o aprobacion via UI) — operator decide.
- Emitir salida machine-readable JSON (consumible por workflow CI step) y resumen humano (consumible por operator local).
- Retry bounded N=3 con backoff exponencial para flake tolerance en GitHub/GCP/Azure API; fail loud despues de N.
- Redact con `redactErrorForResponse` de cualquier error que cruce a logs/summary.

### Slice 3 — Production release workflow + concurrency fix canonica

- Crear `.github/workflows/production-release.yml` con `workflow_dispatch` explicito + inputs `target_sha` (required), `force_infra_deploy` (default false), `bypass_preflight_reason` (default empty, requiere capability `platform.release.bypass_preflight`).
- Orquestar gates en orden: preflight -> merge validation -> manifest INSERT (`state=preflight`) -> approval gate -> Vercel -> workers -> integrations -> post-release health -> manifest UPDATE (`state=released | degraded | aborted`).
- Concurrency: usar `group: production-release-${{ inputs.target_sha }}` + `cancel-in-progress: false` para el orquestador (un solo release activo por SHA, intentos seriales).
- Advisory lock Postgres en el primer job: `SELECT pg_try_advisory_lock(hashtext('production-release'))` para serializar dos dispatchers concurrentes contra el mismo branch (defense in depth sobre el partial UNIQUE INDEX `release_manifests_one_active_release_idx`).
- Exigir environment `production` solo en el job de approval gate (no en preflight ni en manifest INSERT inicial).
- Registrar summary con links a runs, deployments, manifest URL en `/admin/releases/<release_id>`, y comando de rollback exacto.

**Concurrency fix canonica para workers (decision Opcion A V1, Opcion B V2):**

- **V1 (esta task)**: cambiar los 3 worker workflows (`ops-worker-deploy.yml`, `commercial-cost-worker-deploy.yml`, `ico-batch-deploy.yml`) a `cancel-in-progress: true` SOLO para runs cuyo job declare `environment: production`. Mata la clase de bug en su origen — pushes nuevos cancelan pending stale en lugar de quedar deadlocked. Riesgo aceptable: cancela un deploy in-flight si llega push nuevo (deploy real toma <5min, retry barato).
  - Path technico: agregar input opcional `cancel_pending_production` al concurrency expression, o partir el workflow en dos jobs (uno para `environment=staging` con `cancel-in-progress: false`, otro para `environment=production` con `cancel-in-progress: true`).
- **V2 (TASK derivada conditional)**: refactor a pattern `workflow_call`: el orquestador `production-release.yml` invoca `ops-worker-deploy.yml` via `workflow_call` con concurrency group dedicado `production-release-${{ inputs.releaseId }}-ops-worker`. Workers conservan su concurrency actual para path `push:develop` (staging deploys siguen sin cancelarse). Mas limpio pero deja viva la posibilidad de que alguien dispare worker directamente y reproduzca deadlock — por eso la fix V1 sigue siendo necesaria.
- Documentar la decision A vs B en el ADR (Slice 1) con razon explicita: "GitHub Actions concurrency es black-box; A mata el bug, B lo desacopla, ambos son complementarios".

### Slice 4 — Worker deploy deterministico

- Ajustar workflows/scripts de `ops-worker`, `commercial-cost-worker` e `ico-batch-worker` para aceptar SHA esperado (input `expected_sha`) y para ser llamados por el release control plane via `workflow_call` (Opcion B preparation).
- Verificar que la revision Cloud Run desplegada corresponde al commit esperado: post-deploy, query `gcloud run revisions describe <revision> --format="value(spec.containers[0].env[?name=='GIT_SHA'].value)"` y comparar contra `expected_sha`. Mismatch = fail loud + state `degraded`.
- Verificar revision `Ready=True`: poll `gcloud run revisions describe <revision> --format="value(status.conditions[?type=='Ready'].status)"` con timeout 5min. Fail loud si no llega a `True` o si emite `False`.
- Fallar loud si GitHub crea run sin jobs (`jobs.length === 0` despues de N segundos), si no existe revision nueva cuando debia existir, o si la revision no queda `Ready=True`.
- Conservar deploy directo por `workflow_dispatch` para break-glass, pero con preflight y resumen consistente.

**Test de regresion del deadlock observado** (anti-regresion obligatorio):

- Agregar `tests/release/concurrency-deadlock-regression.test.ts` que reproduzca exactamente el escenario observado 2026-04-26 -> 2026-05-09:
  1. Mock GitHub API: crear run viejo `status=waiting` con `pending_deployments[].environment.name == "Production"`.
  2. Mock GitHub API: crear run nuevo `status=pending` con `jobs.length === 0` en mismo concurrency group.
  3. Invocar el detector del preflight CLI.
  4. Assert: detector clasifica AMBOS runs como blockers, emite comando de remediacion exacto (`gh run cancel <id>`), y bloquea el release con exit code != 0.
- Agregar `tests/release/concurrency-fix-verification.test.ts` que verifica que con la fix Opcion A aplicada (`cancel-in-progress: true` para production), el deadlock NO se reproduce desde:
  - push trigger,
  - workflow_dispatch directo,
  - workflow_dispatch desde orquestador.
- Test de integracion (manual o CI): correr release dry-run en staging-equivalent y verificar que un push concurrente al mismo branch cancela el pending stale en lugar de quedar deadlocked.

### Slice 5 — Infra release gating

- Separar health checks de infra y deploy real de infra.
- Azure Teams workflows deben validar secrets/WIF temprano.
- Bicep/Azure deploy real debe correr solo si el diff toca paths de infra o si `force_infra_deploy=true` en dispatch.
- Documentar subject WIF requerido para `ref:refs/heads/main` y `environment:production`.

### Slice 6 — Rollback + runbook (split automated vs manual)

- Crear `scripts/release/production-rollback.ts` idempotente que lee del `release_manifests` el `previousVercelDeploymentUrl` + `previousWorkerRevisions` y ejecuta rollback automatico para:
  - **Vercel** (mandatory automated): `vercel alias set <previous_deployment_url> greenhouse.efeoncepro.com` via Vercel CLI. Reversible, atomic, observable. Capability `platform.release.rollback`.
  - **Cloud Run workers** (mandatory automated): `gcloud run services update-traffic <service> --to-revisions=<previous_revision>=100` por cada worker. Reversible, atomic, traffic split safe.
  - **HubSpot integration Cloud Run** (mandatory automated): mismo patron Cloud Run traffic split.
- **Azure config changes** (manual gated en V1): rollback automatizado de Azure deployments (Bicep, App Service config, federated credentials) NO es seguro en V1 — requiere reapply Bicep que puede ser destructivo. Documentar como **manual guarded step** en runbook con comandos exactos `az deployment group create --template-file <previous-bicep>` + checklist humano de verificacion. Capability `platform.release.rollback` requerida para autorizar.
- Cada rollback persiste row en `release_state_transitions` con `from_state -> 'rolled_back'`, emite outbox event `platform.release.rolled_back v1`.
- Crear `docs/operations/runbooks/production-release.md` con:
  - flujo normal release (operator-facing),
  - flujo rollback automatizado (Vercel + Cloud Run),
  - flujo rollback manual Azure (con comandos exactos),
  - decision tree: cuando usar rollback vs forward-fix vs incident mode bypass.

### Slice 7 — Reliability signals (4 separados, NO uno coarse) + docs closeout

Greenhouse pattern (TASK-742, TASK-774, TASK-768): un signal por failure mode, steady=0, severity diferenciada. Reemplazar el single signal coarse por 4 signals separados bajo nuevo subsystem `Platform Release` en `getReliabilityOverview`:

- **`platform.release.stale_approval`** (kind=`drift`, severity=`warning` si edad >24h, `error` si >7d). Cuenta runs en workflows del allowlist con `status=waiting` + `pending_deployments[].environment.name == "Production"` + `created_at < now() - 24h`. Reader: `src/lib/reliability/queries/release-stale-approval.ts`. Steady=0.
- **`platform.release.pending_without_jobs`** (kind=`drift`, severity=`error` si count >0 sostenido >5min). Cuenta runs `status in ('queued','pending','in_progress')` con `jobs.length === 0` por mas de 5 min. Reader: `src/lib/reliability/queries/release-pending-without-jobs.ts`. Steady=0. **Es el sintoma exacto del incidente** — alerta inmediata.
- **`platform.release.deploy_duration_p95`** (kind=`lag`, severity=`warning` si p95 >30min, `error` si >60min). Lee de `release_manifests` ventana 30 dias `EXTRACT(EPOCH FROM completed_at - started_at)`. Reader: `src/lib/reliability/queries/release-deploy-duration.ts`. Steady variable, alerta drift.
- **`platform.release.last_status`** (kind=`drift`, severity=`error` si ultimo release en estado `degraded|aborted|rolled_back` en ultimas 24h, `warning` si en 24h-7d). Reader: `src/lib/reliability/queries/release-last-status.ts`. Steady=`released`.

Wire-up de los 4 readers en `getReliabilityOverview` bajo subsystem rollup `Platform Release` (nuevo). Documentar en `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` Delta YYYY-MM-DD.

Actualizar `Handoff.md`, `project_context.md` si cambia contrato operativo, `changelog.md` y `docs/tasks/README.md`.

## Out of Scope

- No cambiar producto funcional de Greenhouse.
- No redisenar todos los workflows CI no relacionados.
- No reemplazar Vercel como plataforma de app.
- No mover Cloud Run workers a otra plataforma.
- No automatizar acciones destructivas sin guardrails humanos.
- No cerrar TASK-847 ni desplegar PgBouncer; esa task sigue contingente y data-driven.
- No introducir aprobaciones via SMS/Slack/Teams/Discord en V1; GitHub environment approval es el unico gate humano. Notificaciones a Teams sobre release status SI son scope (via outbox events `platform.release.*`), pero NO como gate.
- No automatizar rollback de Azure config/Bicep en V1; queda manual gated en runbook.
- No implementar la Opcion B (`workflow_call` orchestrator pattern) en V1; queda como TASK derivada conditional para V2.
- No cambiar el contrato de smoke lanes ni de Playwright.
- No introducir tabla nueva para tracking de workflow runs paralela a `source_sync_runs` ni a `release_state_transitions` (extender lo existente, no parallelizar).

## Detailed Spec

### Estado bloqueado obligatorio a detectar

El detector debe tratar como blocker de production cualquier run de deploy que cumpla:

```txt
status == "waiting"
AND jobs[].status contains "waiting"
AND pending_deployments[].environment.name == "Production"
AND age > STALE_PRODUCTION_APPROVAL_THRESHOLD
AND workflowName in releaseDeployWorkflowAllowlist
```

Tambien debe detectar el sintoma downstream:

```txt
status in ["queued", "pending", "in_progress"] durante mas de PENDING_CONCURRENCY_THRESHOLD
AND jobs.length == 0
AND exists stale waiting blocker for same workflow/ref
```

Para runs ya cancelados/completados con `jobs: []`, el preflight debe reportarlos como evidencia historica no bloqueante y confirmar que no queda run activo bloqueando el mismo workflow/ref.

### Manifest minimo

El manifest debe incluir:

- `releaseId`
- `targetSha`
- `sourceBranch`
- `targetBranch`
- `startedAt`
- `operator`
- `vercelDeploymentUrl`
- `previousVercelDeploymentUrl`
- `workerRevisions`
- `previousWorkerRevisions`
- `workflowRuns`
- `preflightResult`
- `postReleaseHealth`
- `rollbackPlan`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### Spec + manifest

- [ ] Existe `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` indexado en `DECISIONS_INDEX.md`.
- [ ] Migration `release_manifests` aplicada con CHECK enum, partial UNIQUE INDEX `WHERE state IN (...)`, anti-UPDATE/DELETE triggers, GRANTs correctos.
- [ ] Migration `release_state_transitions` aplicada append-only con anti-UPDATE/DELETE triggers.
- [ ] `releaseId` formato `<targetSha[:12]>-<UUIDv7>` documentado y enforced.
- [ ] 3 capabilities granulares creadas: `platform.release.execute`, `platform.release.rollback`, `platform.release.bypass_preflight`. Seedeadas en `capabilities_registry`.
- [ ] 7 outbox events `platform.release.* v1` documentados en `GREENHOUSE_EVENT_CATALOG_V1.md`.

### Workflow + concurrency

- [ ] Existe `production-release.yml` dispatchable con inputs `target_sha`, `force_infra_deploy`, `bypass_preflight_reason`.
- [ ] Concurrency group del orquestador `production-release-${{ inputs.target_sha }}` con `cancel-in-progress: false`.
- [ ] Advisory lock Postgres `pg_try_advisory_lock(hashtext('production-release'))` en primer job del orquestador.
- [ ] Los 3 worker workflows (`ops-worker`, `commercial-cost-worker`, `ico-batch`) corregidos con `cancel-in-progress: true` para path `environment=production` (Opcion A V1).
- [ ] **El deadlock concurrency+stale-approval observado 2026-04-26 -> 2026-05-09 NO es reproducible desde push, dispatch directo, ni dispatch desde orquestador.** Test `tests/release/concurrency-fix-verification.test.ts` cubre los 3 entrypoints.
- [ ] Test `tests/release/concurrency-deadlock-regression.test.ts` reproduce el escenario historico y assert detector lo clasifica como blocker.

### Preflight

- [ ] `production-preflight` falla loud ante secrets/WIF faltantes, DB no sana, Vercel no Ready, CI/Playwright rojos o approvals/concurrency blockers activos.
- [ ] El detector identifica los 2 casos observados: stale `waiting` approvals de `Production` y runs nuevos con `jobs: []` bloqueados por `concurrency`.
- [ ] **WIF subjects de GCP y Azure aceptan ambos `ref:refs/heads/main` y `environment:production`.** Preflight verifica via `gcloud iam workload-identity-pools providers describe` y `az ad app federated-credential list`, y falla loud con comando exacto de remediacion si falta alguno.
- [ ] Preflight emite salida JSON machine-readable + resumen humano.
- [ ] Preflight retry bounded N=3 con backoff exponencial; fail loud despues.

### Workers + revision verification

- [ ] Los workers Cloud Run se verifican por SHA esperado (env `GIT_SHA` en revision) antes de marcar release como sano.
- [ ] Revision `Ready=True` verificado con timeout 5min; fail loud si no llega o emite `False`.
- [ ] Workers aceptan input `expected_sha` para invocacion futura via `workflow_call` (V2 preparation).

### Infra + Azure

- [ ] Azure deploy real (Bicep) queda gated por diff de paths de infra o input explicito `force_infra_deploy=true`, no por cada release de app.
- [ ] Azure config rollback documentado como manual gated step en runbook con comandos exactos.

### Rollback

- [ ] `production-rollback.ts` automatiza Vercel alias swap + Cloud Run traffic split por worker + HubSpot integration revision swap. Idempotente.
- [ ] Rollback persiste row en `release_state_transitions` y emite outbox event `platform.release.rolled_back v1`.

### Reliability

- [ ] **4 reliability signals separados** wired en `getReliabilityOverview` bajo subsystem `Platform Release`: `platform.release.stale_approval`, `platform.release.pending_without_jobs`, `platform.release.deploy_duration_p95`, `platform.release.last_status`.
- [ ] Visibles en `/admin/operations` con steady states correctos.

### Docs + closeout

- [ ] Existe `docs/operations/runbooks/production-release.md` con flujo normal, rollback automatizado, rollback manual Azure, decision tree.
- [ ] Doc funcional `docs/documentation/plataforma/release-control-plane.md` para operators.
- [ ] `Handoff.md` + `changelog.md` + `docs/tasks/README.md` actualizados.

### Seguridad

- [ ] No se imprimen secretos ni tokens en logs, summaries o artifacts. `redactErrorForResponse` aplicado en todo error que cruce boundary.
- [ ] `bypass_preflight_reason` requiere capability `platform.release.bypass_preflight` + reason >=20 chars + audit row obligatoria.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test scripts/release`
- `pnpm pg:doctor`
- `pnpm pg:connect:status`
- `gh workflow run production-release.yml` en modo dry-run o staging-equivalent antes de production real
- Validacion manual de un release dry-run con manifest y detector de approvals/concurrency blockers

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done.
Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se registro evidencia de release dry-run o production release real con links a workflows/deployments

## Defense-in-depth (7-layer template TASK-742)

| Capa | Implementacion | Slice |
| --- | --- | --- |
| DB constraint | CHECK enum sobre `release_manifests.state` + partial UNIQUE INDEX `WHERE state IN ('preflight','deploying','verifying')` (1 release activo por branch) | 1 |
| Application guard | Capability `platform.release.execute` granular (least privilege, NO `platform.admin` catch-all) + advisory lock `pg_try_advisory_lock(hashtext('production-release'))` en orquestador | 1, 3 |
| UI affordance | Dashboard `/admin/releases` con last release status, manifest viewer, comando rollback exacto, banner si `platform.release.last_status` esta degradado | 7 |
| Reliability signal | 4 signals separados bajo subsystem `Platform Release` (stale_approval, pending_without_jobs, deploy_duration_p95, last_status), steady=0 con severity diferenciada | 7 |
| Audit log | `release_manifests` (estado actual) + `release_state_transitions` (granular, append-only, anti-UPDATE/DELETE triggers) | 1 |
| Approval workflow | GitHub environment `Production` approval (gate humano) + capability `platform.release.bypass_preflight` para break-glass con reason >=20 chars + audit obligatoria | 3 |
| Outbox event v1 | `platform.release.{started, deploying, verifying, released, degraded, rolled_back, aborted} v1` para downstream notifications (Teams notifications, dashboard refresh, downstream BQ projection) | 1 |

## 4-Pillar Score

### Safety

- **What can go wrong**: deploy parcial deja workers desincronizados con Vercel; rollback destruye estado bueno por aplicar revision incorrecta; secret leak en logs/manifest; operador no autorizado dispara release.
- **Gates**: capability `platform.release.execute` granular (FINANCE_ADMIN != release operator); GitHub environment `Production` approval; preflight CLI verifica WIF + secrets antes de tocar cloud; `bypass_preflight` requiere capability separada + reason + audit.
- **Blast radius si falla**: plataforma completa (es el control plane de release). Cross-tenant porque el release es global, no por-tenant.
- **Verified by**: capability check en `production-release.yml` job 1; `redactErrorForResponse` aplicado a todo summary/log; audit log append-only en `release_manifests` + `release_state_transitions`; partial UNIQUE INDEX previene 2 releases activos en simultaneo.
- **Residual risk**: GitHub Actions `concurrency` + `pending_deployments` es black-box; el detector mitiga pero no elimina la clase de bug. Si en 6 meses GitHub cambia el modelo, el detector puede volverse falso negativo. **Mitigacion**: synthetic monitor follow-up (ver Follow-ups).

### Robustness

- **Idempotency**: `releaseId = <targetSha[:12]>-<UUIDv7>`; re-correr mismo SHA crea row nueva con `attempt_n` incrementado (no dedup, version explicita). Rollback script idempotente — re-ejecutar es safe.
- **Atomicity**: imposible atomic real cross-cloud (Vercel + Cloud Run + Azure son sistemas independientes). Patron **saga compensable**: cada step deja rollback target en manifest, fallo dispara compensaciones registradas en `release_state_transitions`.
- **Race protection**: concurrency group por orquestador `production-release-${{ inputs.target_sha }}` + advisory lock PG `pg_try_advisory_lock(hashtext('production-release'))` para serializar dispatchers concurrentes contra el mismo branch + partial UNIQUE INDEX `WHERE state IN ('preflight','deploying','verifying')` (defense in depth).
- **Constraint coverage**: CHECK enum sobre `state`; FK a `team_members.member_id` para `operator_member_id`; reason CHECK `length >= 5` en `release_state_transitions`; anti-UPDATE/DELETE triggers en ambas tablas.
- **Verified by**: test concurrencia 2 dispatchers (assert advisory lock serializa); test reproduce deadlock historico (assert detector lo bloquea); test fix concurrency Opcion A (assert no reproducible desde 3 entrypoints).

### Resilience

- **Retry policy**: workers Cloud Run ya tienen retry exponencial via Cloud Run platform; preflight CLI retry bounded N=3 con backoff exponencial para flake tolerance API; orquestador NO retry automatico de release completo (humano decide forward-fix vs rollback vs incident mode).
- **Dead letter**: release con `state='aborted'` queda en `release_manifests` para forensic; reliability signal `platform.release.last_status` lo expone a operator en `/admin/operations`.
- **Reliability signal**: 4 signals separados bajo subsystem `Platform Release` (ver Slice 7).
- **Audit trail**: `release_manifests` + `release_state_transitions` append-only con anti-UPDATE/DELETE triggers; outbox events v1 para downstream replay.
- **Recovery procedure**: `production-rollback.ts` idempotente leyendo del manifest; runbook `docs/operations/runbooks/production-release.md` con decision tree rollback vs forward-fix vs incident mode bypass.

### Scalability

- **Hot path Big-O**: O(N) sobre workers (3 hoy), O(M) sobre workflows (~7). No escala con datos de usuario.
- **Index coverage**: PK `release_id`, partial UNIQUE INDEX para active release, INDEX `(target_branch, started_at DESC)` para query "ultimo release", INDEX `(state, started_at DESC)` para reliability signals.
- **Async paths**: post-release health checks corren async via outbox `platform.release.released v1` -> reactive consumer (no bloquean el orquestador).
- **Cost at 10x**: 10 releases/dia sigue trivial (~30 rows/dia en `release_manifests`, ~210 rows/dia en transitions). 10x workers (30) sigue trivial — coordination overhead, no contention point.
- **Pagination**: dashboard `/admin/releases` usa cursor pagination sobre `started_at DESC`.

## Hard Rules (anti-regresion)

- **NUNCA** disparar release production sin pasar por `production-release.yml`. Disparos directos de worker workflows en path `environment=production` quedan reservados para break-glass documentado, NO operacion normal.
- **NUNCA** modificar `release_manifests.target_sha`, `started_at`, `operator_member_id` despues del INSERT inicial. Anti-UPDATE trigger lo bloquea — no bypass via SQL directo.
- **NUNCA** hacer DELETE de filas en `release_manifests` o `release_state_transitions`. Append-only enforced por trigger. Para correcciones, INSERT nueva fila con `metadata_json.correction_of=<previous_id>`.
- **NUNCA** transicionar `state` fuera del matrix canonico. Allowed: `preflight -> ready -> deploying -> verifying -> released | degraded | aborted`; `released -> rolled_back`; `degraded -> rolled_back | released`. Cualquier otra transicion es bug.
- **NUNCA** introducir un signal coarse `platform.release.pipeline_health` que lumpee multiples failure modes. Greenhouse pattern es 1 signal por failure mode (TASK-742, TASK-774, TASK-768).
- **NUNCA** loggear secrets, tokens, JWT, refresh tokens, ni payload completo de Vercel/GCP/Azure response sin pasar por `redactErrorForResponse` o `redactSensitive`.
- **NUNCA** invocar `Sentry.captureException` directo en el control plane. Usar `captureWithDomain(err, 'cloud', { tags: { source: 'production_release', stage: '<...>' } })` para que el rollup `Platform Release` lo recoja.
- **NUNCA** rollback automatizado de Azure config/Bicep en V1. Es manual gated en runbook hasta que se demuestre que reapply es safe + reversible.
- **NUNCA** crear tabla nueva paralela a `release_manifests` para tracking de workflow runs (extender, no parallelizar). Si emerge necesidad, agregar columna JSONB o tabla auxiliar con FK.
- **NUNCA** mezclar dimensiones en el state machine: `state` es lifecycle del release; el outcome de cada step (Vercel ok, worker ok, Azure ok) vive en `post_release_health JSONB`, NO como variantes del enum.
- **SIEMPRE** que un release entre `state IN ('degraded','aborted','rolled_back')`, escalar via outbox event + Teams notification al operator + reliability signal `platform.release.last_status` rojo.
- **SIEMPRE** que emerja un workflow nuevo de deploy production, agregarlo al `releaseDeployWorkflowAllowlist` del detector + a la verificacion WIF subject + al gating del orquestador.
- **SIEMPRE** que se cambie el state machine, actualizar: CHECK constraint DB + tipo TS `ReleaseState` + tabla en este spec + ADR.

## Follow-ups

- **Synthetic monitor del concurrency model** (TASK derivada conditional): cron 1h dispara workflow no-op con misma estructura `concurrency + environment Production approval + cancel-in-progress: true`, verifica que no quede stuck. Si emite, GitHub cambio el modelo y el detector puede volverse falso negativo. Crear como TASK-### derivada despues de 30 dias steady-state de TASK-848 V1.
- **Opcion B `workflow_call` orchestrator pattern** (TASK derivada conditional): refactor del orquestador para invocar workers via `workflow_call` con concurrency group dedicado por release. Desacopla orchestrated path del directo. Crear TASK derivada despues de 60 dias steady-state V1.
- **Externalizar worker deploy orchestration fuera de Actions** (TASK derivada si el detector confirma bug/restriccion no mitigable): mover workers a deploy pull-based (Cloud Build trigger consultando manifest tag) o a Cloud Deploy. NO ejecutar sin evidencia post-V1.
- **Signal tuning Sentry/GCP/Vercel** (TASK focalizada conditional): si los 4 signals nuevos producen falsos positivos en steady-state, crear task de tuning. NO relajar el release gate global sin evidencia.
- **Opt-in rollback automatizado de Azure** (TASK derivada V2): solo despues de demostrar que reapply Bicep es safe + reversible en al menos 5 dry-runs en environment de prueba.
- **Dashboard `/admin/releases`** (puede vivir en esta task o derivada): UI para listar releases, ver manifest, comando rollback. V1 minimo: tabla read-only ordenada por `started_at DESC` con last 30 dias.

## Delta 2026-05-10

Task creada a partir del release `develop` -> `main` del commit `d5f45b163e6c405b34b532ade91ddba68563cc15` y del analisis con `software-architect-2026`.

## Delta 2026-05-09 — Refinamiento arquitectonico (arch-architect)

Aplicado contra el spec original:

- **Slice 1**: cerrada Open Question manifest. Postgres canonico (`release_manifests` + `release_state_transitions`), append-only con anti-UPDATE/DELETE triggers, partial UNIQUE INDEX para 1 release activo. GitHub artifact queda como mirror humano legible, NO source of truth.
- **Slice 1**: agregadas 3 capabilities granulares (`execute`, `rollback`, `bypass_preflight`) + 7 outbox events `platform.release.* v1`.
- **Slice 2**: agregada verificacion explicita de WIF subjects GCP + Azure (causa del fallo Azure Teams del 2026-05-09 confirmada como gap).
- **Slice 3**: declarada explicitamente Opcion A (V1, kill bug class via `cancel-in-progress: true` para production) vs Opcion B (V2, `workflow_call` pattern). A va en esta task; B queda como follow-up conditional.
- **Slice 4**: agregados 2 tests anti-regresion (`concurrency-deadlock-regression.test.ts` + `concurrency-fix-verification.test.ts`).
- **Slice 6**: separado rollback automatico (Vercel + Cloud Run mandatory) de manual gated (Azure).
- **Slice 7**: reemplazado single signal coarse `platform.release.pipeline_health` por 4 signals separados bajo subsystem `Platform Release` (Greenhouse pattern TASK-742/774/768).
- Agregadas secciones **Defense-in-depth (7-layer)**, **4-Pillar Score**, **Hard Rules**.
- Cerrada Open Question manifest persistence.
- Agregados 6 follow-ups conditional con criterios de activacion.

## Open Questions

- Confirmar si `EPIC-007` es el epic final correcto para Release Control Plane o si conviene abrir un epic dedicado de platform operations (`EPIC-PLATFORM-OPS` propuesto).
- Decidir umbrales finales de los 4 reliability signals tras 30 dias de steady-state observados (los valores en Slice 7 son baseline conservador).
- Decidir si el dashboard `/admin/releases` vive en esta task o como TASK derivada V1.1.
