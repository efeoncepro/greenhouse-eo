# TASK-1220 — Worker Cloud Run Node 24 runtime cutover

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `cron`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1220-worker-cloud-run-node-24-runtime-cutover`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

TASK-845 corto el portal, CI, Playwright y Vercel app/tests a Node.js `24.x`, pero los workers Node de Cloud Run siguen construyendo y corriendo sobre `node:22-slim`. Esta task migra los workers Node (`ops-worker`, `commercial-cost-worker`, `ico-batch-worker`) a Node 24 de forma staging-first, con build/runtime gates, deploy trazable por GitHub Actions y verificacion Cloud Run/Scheduler antes de tocar produccion.

## Why This Task Exists

El runtime del portal ya esta alineado a Node 24 via `package.json#engines.node`, `.nvmrc`, `.node-version` y workflows GitHub. Los workers quedaron explicitamente fuera de TASK-845 porque son runtime container separado: Dockerfiles, esbuild targets, Cloud Run revisions, Scheduler jobs, Secret Manager IAM y rollback por traffic split. Mezclarlos con el corte del portal habria aumentado el blast radius.

El gap ahora es de coherencia operacional: el mismo repo corre app/tests en Node 24, pero sus procesos batch/reactivos Node siguen en Node 22. Aunque Node 22 no bloquea el portal, mantener dos runtimes aumenta drift de dependencias, diferencias V8/OpenSSL/fetch/Web APIs, y riesgo de descubrir incompatibilidades cuando una imagen base quede deprecada o una dependencia asuma Node 24.

## Goal

- Migrar los Dockerfiles Node de Cloud Run de `node:22-slim` a `node:24-slim`.
- Actualizar los targets esbuild de workers Node de `node22` a `node24` cuando corresponda.
- Validar que `pnpm worker:runtime-deps-gate`, builds Docker y health checks de Cloud Run siguen verdes bajo Node 24.
- Desplegar staging por los workflows canonicos y verificar endpoints/jobs antes de promover produccion.
- Mantener el bridge `hubspot-greenhouse-integration` fuera de scope porque es Python (`python:3.12-slim`), no Node.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`
- `project_context.md` — TASK-845 y frontera workers Node 22

Reglas obligatorias:

- El deploy canonico de workers Cloud Run es GitHub Actions + WIF; deploy local manual solo hotfix justificado.
- No tocar production por push directo de worker; production normal vive en release/orchestrator o workflow production aprobado.
- Reusar `services/_shared/gcloud-secret-iam.sh` si algun deploy script necesita bindings Secret Manager; no reimplementar IAM inline.
- Conservar y correr el guard `pnpm worker:runtime-deps-gate`; no bypassear paquetes externalizados ni mover deps a `devDependencies` si entran en bundles worker.
- Conservar el boundary `@core`/worker: workers no deben importar `src/@core`, `@menu`, `@layouts` ni assets UI.
- Cualquier cambio de worker debe verificar runtime real Cloud Run o dejar estado `code complete, rollout pendiente`; no basta con que Docker build pase.

## Normative Docs

- `docs/tasks/complete/TASK-845-node-24-app-test-runtime-upgrade.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` si emerge algun flag/env de rollout

## Dependencies & Impact

### Depends on

- Node 24 app/test runtime ya cerrado por TASK-845.
- Dockerfiles Node existentes:
  - `services/ops-worker/Dockerfile`
  - `services/commercial-cost-worker/Dockerfile`
  - `services/ico-batch/Dockerfile`
- Deploy scripts/workflows existentes:
  - `services/ops-worker/deploy.sh`
  - `services/commercial-cost-worker/deploy.sh`
  - `services/ico-batch/deploy.sh`
  - `.github/workflows/ops-worker-deploy.yml`
  - `.github/workflows/commercial-cost-worker-deploy.yml`
  - `.github/workflows/ico-batch-deploy.yml`

### Blocks / Impacts

- Reduce drift operativo post-TASK-845.
- Impacta Cloud Run services:
  - `ops-worker`
  - `commercial-cost-worker`
  - `ico-batch-worker`
- Impacta Cloud Scheduler jobs que invocan esos services.
- No impacta `hubspot-greenhouse-integration` porque su runtime es Python.

### Files owned

- `services/ops-worker/Dockerfile`
- `services/commercial-cost-worker/Dockerfile`
- `services/ico-batch/Dockerfile`
- `services/*/README.md` si documentan runtime Node 22
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` si se actualiza baseline
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Portal/app/tests: Node `24.x` por TASK-845.
- Local version files: `.nvmrc=24`, `.node-version=24`.
- Workers Node actuales:
  - `services/ops-worker/Dockerfile`: `FROM node:22-slim AS builder`, `FROM node:22-slim AS runner`, esbuild `--target=node22`.
  - `services/commercial-cost-worker/Dockerfile`: `FROM node:22-slim AS builder`, `FROM node:22-slim AS runner`, esbuild `--target=node22`.
  - `services/ico-batch/Dockerfile`: `FROM node:22-slim AS builder`, `FROM node:22-slim AS runner`, esbuild `--target=node22`.
- Worker guard: `pnpm worker:runtime-deps-gate`.
- Cloud Run deploy drift guard para `ops-worker` ya distingue HEAD documental vs runtime SHA.

### Gap

- Workers Node no usan el mismo major runtime que el portal y CI.
- No hay evidencia Docker/Cloud Run bajo Node 24 para los bundles worker.
- No esta documentado el rollout worker Node 24 como cierre separado de TASK-845.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `cron`
- Source of truth afectado: `Cloud Run worker container runtime`
- Consumidores afectados: `Cloud Scheduler jobs, reactive projections, cost materialization, ICO batch/enrichment, reliability signals`
- Runtime target: `staging -> production`

### Contract surface

- Contrato existente a respetar: Dockerfiles + deploy scripts + GitHub Actions worker workflows + Cloud Run service health endpoints.
- Contrato nuevo o modificado: base image Node `24-slim` y esbuild target `node24` para workers Node.
- Backward compatibility: `compatible` si endpoints/paths/envs no cambian.
- Full API parity: N/A — no introduce capability; cambia runtime container de primitives existentes.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna por schema.
- Invariantes que no se pueden romper:
  - Los endpoints Cloud Run existentes siguen respondiendo con el mismo contract.
  - Cloud Scheduler jobs siguen apuntando al service correcto y autenticados.
  - Secret Manager refs/env vars existentes se preservan.
  - Source sync runs / reliability signals no cambian semantica por el runtime cutover.
- Tenant/space boundary: sin cambio.
- Idempotency/concurrency: sin cambio; preservar concurrency config de cada service.
- Audit/outbox/history: sin cambio; deployments trazados por GitHub Actions/Cloud Run revision.

### Migration, backfill and rollout

- Migration posture: `none` (no DB migration).
- Default state: `staging first`; production solo tras health/smoke.
- Backfill plan: N/A.
- Rollback path: Cloud Run traffic split a revision previa Node 22 o revert PR + redeploy.
- External coordination: GitHub Actions WIF, Cloud Build, Cloud Run, Cloud Scheduler; no secretos nuevos esperados.

### Security and access

- Auth/access gate: Cloud Run IAM + Scheduler OIDC existentes.
- Sensitive data posture: secrets via Secret Manager/env existentes; no imprimir valores en logs.
- Error contract: health endpoints/logs sanitizados existentes.
- Abuse/rate-limit posture: sin cambio.

### Runtime evidence

- Local checks:
  - `pnpm worker:runtime-deps-gate`
  - Docker build de cada worker Node bajo Node 24 base
  - smoke local container `/health` cuando aplique
- DB/runtime checks:
  - `gcloud run services describe <service>` con revision Node 24
  - `/health` de cada service o endpoint equivalente
  - verificar `GIT_SHA`/revision y traffic 100% en staging
- Integration checks:
  - Ejecutar o verificar al menos un job Scheduler/endpoint representativo por worker en staging.
- Reliability signals/logs:
  - Cloud Logging sin startup crash (`ERR_MODULE_NOT_FOUND`, import `@core`, deps faltantes).
  - Signals de worker/cron en steady tras deploy.
- Production verification sequence:
  - repetir staging evidence antes de promotion; monitorear 24h si el worker corre scheduled diario.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime evidence is listed for the worker runtime change.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

N/A — no capability. This task changes the runtime container for existing worker primitives; it does not introduce or modify business capabilities.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Inventory + local worker build proof

- Confirmar todos los Dockerfiles Node que siguen en `node:22-slim`.
- Confirmar que `hubspot-greenhouse-integration` queda fuera por Python.
- Cambiar base images Node de workers Node a `node:24-slim`.
- Cambiar esbuild target `node22` -> `node24` en los workers Node.
- Ejecutar `pnpm worker:runtime-deps-gate`.
- Ejecutar Docker build de `ops-worker`, `commercial-cost-worker` e `ico-batch-worker`.

### Slice 2 — Staging deploy + smoke

- Usar workflows GitHub Actions canonicos para deploy staging de cada worker afectado.
- Verificar Cloud Run revisions, `GIT_SHA`, traffic y Ready.
- Verificar `/health` o endpoint equivalente por service.
- Ejecutar un endpoint/job representativo por worker:
  - `ops-worker`: `/health` + endpoint liviano/safe del runtime.
  - `commercial-cost-worker`: health/materialization dry-run o endpoint safe disponible.
  - `ico-batch-worker`: `/health` y/o materialize/enrich dry-run controlado.
- Revisar Cloud Logging por startup crash/import/dependency errors.

### Slice 3 — Production promotion + rollback readiness

- Promover production solo via release/orchestrator o workflow production aprobado.
- Registrar revision previa Node 22 como rollback target.
- Verificar traffic split 100% a revision Node 24 tras smoke.
- Verificar Scheduler jobs y reliability signals despues del primer ciclo natural o trigger manual seguro.
- Documentar rollback con `gcloud run services update-traffic <service> --to-revisions=<previous>=100`.

### Slice 4 — Documentation closure

- Actualizar `project_context.md`, `Handoff.md`, `changelog.md`.
- Actualizar `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` si el baseline Cloud Run Node cambia.
- Cerrar la task solo si staging + production runtime evidence existe o marcar `code complete, rollout pendiente`.

## Out of Scope

- Portal/Vercel runtime Node 24: ya cerrado por TASK-845.
- Local developer Node 24 setup: operacion inmediata, no parte de esta task.
- `hubspot-greenhouse-integration`: runtime Python `3.12-slim`, no Node.
- Cambios de logica de negocio, endpoints, Scheduler cadence, secrets o DB schema.
- Migrar servicios externos/sibling repos fuera de `greenhouse-eo`.

## Detailed Spec

Cambio esperado en cada Dockerfile Node:

```Dockerfile
FROM node:24-slim AS builder
...
esbuild ... --target=node24 ...
FROM node:24-slim AS runner
```

Mantener `PNPM_VERSION=10.32.1` salvo que Discovery demuestre incompatibilidad real. No cambiar `--packages=external`, shims de Next/Auth/Bcrypt/Vercel OIDC ni aliases `@`/`@core` salvo que el build falle por una causa raiz verificada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (local build proof) DEBE cerrar antes de Slice 2.
- Slice 2 (staging deploy/smoke) DEBE cerrar antes de Slice 3.
- Slice 3 production NO se ejecuta por deploy local manual; usar workflow/release aprobado.
- Slice 4 docs se completa despues de la evidencia real o documenta `rollout pendiente`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Worker arranca en Node 24 pero falla por paquete externalizado no instalado | Cloud Run workers | medium | `pnpm worker:runtime-deps-gate` + Docker build + Cloud Logging startup check | `ERR_MODULE_NOT_FOUND`, container not listening on 8080 |
| Import de `@core`/UI se cuela en bundle worker | Cloud Run workers | low | conservar alias/loud build fail + worker runtime deps gate | esbuild `Could not resolve @core` |
| Diferencia Node 24 cambia comportamiento de fetch/crypto/OpenSSL/V8 en job batch | ops/cron | medium | staging smoke por endpoint/job representativo antes de prod | job failed / source_sync_runs failed |
| Production deploy de worker sin rollback target | release | low | registrar revision previa y rollback command antes de traffic 100% | release degraded |
| HubSpot Python bridge se toca por error | integrations | low | fuera de scope explicito; no modificar su Dockerfile | diff inesperado en `services/hubspot_greenhouse_integration` |

### Feature flags / cutover

- Sin feature flag — runtime container cutover por Cloud Run revision.
- Cutover controlado por Cloud Run traffic split y GitHub Actions environment.
- Revert: traffic a revision previa Node 22; no requiere DB rollback.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR de Dockerfiles/targets | <10 min | si |
| Slice 2 | redeploy staging revision previa o traffic split a revision anterior | <15 min | si |
| Slice 3 | `gcloud run services update-traffic <service> --to-revisions=<previous>=100` | <10 min por service | si |
| Slice 4 | revert docs si no reflejan runtime real | <10 min | si |

### Production verification sequence

1. Confirmar staging Node 24 Ready para los tres workers Node.
2. Confirmar logs sin startup crash durante al menos un smoke por worker.
3. Registrar revision previa Node 22 por service.
4. Promover production por workflow/release aprobado.
5. Verificar health + representative job/endpoint por worker.
6. Monitorear Cloud Logging/source_sync_runs/reliability signals por 24h o hasta el primer ciclo scheduled de cada worker.

### Out-of-band coordination required

- GitHub Actions environments / approvals para production.
- GCP Cloud Run y Cloud Scheduler via WIF/gcloud.
- No secretos nuevos esperados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `services/ops-worker/Dockerfile`, `services/commercial-cost-worker/Dockerfile` y `services/ico-batch/Dockerfile` usan `node:24-slim` en builder y runner.
- [ ] Los targets esbuild de los tres workers Node usan `node24`.
- [ ] `pnpm worker:runtime-deps-gate` pasa bajo Node 24.
- [ ] Docker build local o CI de los tres workers Node pasa.
- [ ] Staging Cloud Run revisions de los tres workers Node estan Ready con Node 24 y traffic esperado.
- [ ] Smoke staging por worker confirma health/endpoint/job representativo sin startup/import/dependency errors.
- [ ] Production promotion se ejecuta por workflow/release aprobado o queda explicitamente `rollout pendiente`.
- [ ] Rollback target por worker documentado antes de production traffic 100%.
- [ ] `project_context.md`, `Handoff.md`, `changelog.md` y arquitectura Cloud Run quedan sincronizados con la evidencia real.

## Verification

- `pnpm worker:runtime-deps-gate`
- `docker build -f services/ops-worker/Dockerfile .`
- `docker build -f services/commercial-cost-worker/Dockerfile .`
- `docker build -f services/ico-batch/Dockerfile .`
- `gh run watch <worker-deploy-run-id>` por workflow staging
- `gcloud run services describe <service> --project=efeonce-group --region=us-east4`
- Cloud Logging startup check por service
- Scheduler/endpoint smoke representativo por service
- `pnpm task:lint --task TASK-1220`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- `pnpm qa:gates --changed --agent codex --docs --runtime`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real.
- [ ] Archivo movido a `docs/tasks/complete/` solo cuando runtime evidence exista o el cierre declare explicitamente `code complete, rollout pendiente`.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [ ] `Handoff.md` actualizado con evidencia y cualquier rollback target.
- [ ] `changelog.md` actualizado.
