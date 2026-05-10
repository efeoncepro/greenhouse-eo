> **Tipo de documento:** Manual de uso (operador)
> **Version:** 1.0
> **Creado:** 2026-05-10 por Claude
> **Ultima actualizacion:** 2026-05-10 por Claude
> **Documentacion tecnica:** [CLAUDE.md §Production Release Orchestrator invariants (TASK-851)](../../../CLAUDE.md), [Spec TASK-851](../../tasks/in-progress/TASK-851-production-release-orchestrator-workflow.md), [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)

# Production Release Orchestrator

## Para que sirve

Convierte el release `develop → main` en un flujo determinístico, auditable y reversible. Antes de TASK-851 el operador tenía que: (1) correr preflight a mano, (2) crear PR, (3) aprobar el environment Production en cada worker workflow individualmente, (4) inspeccionar logs Vercel y Cloud Run para confirmar que cada deploy quedó READY. Cualquier paso skipeado o desincronizado dejaba el ecosistema en estado mixto.

El orquestador (`production-release.yml`) hace los 8 pasos en una sola corrida, con audit row + outbox event en cada transition + verificación post-deploy de que cada worker está sirviendo el SHA correcto.

## Antes de empezar

- El SHA target debe estar **ya pusheado a `main`** (Vercel deploys automáticamente al push; el orquestador espera el READY).
- Tener capability `platform.release.execute` (EFEONCE_ADMIN o DEVOPS_OPERATOR).
- Si vas a usar `bypass_preflight_reason`: además capability `platform.release.bypass_preflight` (EFEONCE_ADMIN solo) + reason >= 20 chars con post-mortem comprometido.
- Verificar que NO hay otro release activo en `main`: el partial UNIQUE INDEX en DB lo bloquea pero conviene confirmarlo antes via `pnpm pg:connect:shell` → `SELECT * FROM greenhouse_sync.release_manifests WHERE state IN ('preflight','ready','deploying','verifying') AND target_branch='main';`.

## Paso a paso

### 1) Disparar el release

Desde GitHub UI: `Actions → Production Release Orchestrator → Run workflow`. Inputs:

- **target_sha** (obligatorio): 40 chars hex del commit a deployar.
- **force_infra_deploy** (default false): activa el job de Bicep deploy (TASK-853, futuro).
- **bypass_preflight_reason** (default vacío): break-glass. Si vas a usarlo, escribe la razón completa con post-mortem comprometido. >=20 chars o falla.

O desde CLI: `gh workflow run production-release.yml -f target_sha=<sha>` (requiere `gh auth login` con permisos sobre el repo).

### 2) Esperar el preflight

El job `preflight` corre `pnpm release:preflight --json --fail-on-error` con los 12 checks (TASK-850). Si falla, el orquestador aborta antes de tocar nada. Inspecciona el log para ver qué check rojo bloqueó.

### 3) Aprobar la environment Production

El job `approval-gate` queda en `waiting` hasta que un required reviewer (configurado en repo settings) la apruebe desde la UI de GitHub Actions. Timeout 3 días.

### 4) Confirmar workers + Vercel ready

Los jobs `deploy-{ops-worker, commercial-cost-worker, ico-batch, hubspot-integration}` corren en paralelo via `workflow_call`. Cada worker:

1. Hace deploy via `bash services/<worker>/deploy.sh` con `EXPECTED_SHA=<target_sha>`.
2. `deploy.sh` verifica post-deploy que `gcloud run revisions describe <latest>` matchea `GIT_SHA=EXPECTED_SHA`. Mismatch → exit 1 fail-loud.
3. Workflow agrega step "Poll Ready=True bounded" hasta 300s.

En paralelo `wait-vercel` polea Vercel API hasta encontrar deployment production con `meta.githubCommitSha === target_sha` y `state=READY`. Timeout 900s.

### 5) Health check post-release

`post-release-health` pinga `https://greenhouse.efeoncepro.com/api/auth/health`. Si devuelve 200 → release `released`. Si soft-fails (exit 78) → release `degraded`. **Degraded NO aborta** — quedó deployado pero requiere inspección operativa antes de marcar verde.

### 6) Transition final + summary

`transition-released` aplica las 4 transitions de state machine via CLI canónico:

```text
preflight → ready → deploying → verifying → released | degraded
```

Cada transition: UPDATE atomic en `release_manifests` + audit row en `release_state_transitions` + outbox event `platform.release.<state> v1`. Si la state machine guard rechaza (e.g. release ya está en estado terminal por race), el job falla loud.

`summary` escribe tabla en `GITHUB_STEP_SUMMARY` con results + release_id + workflow run link.

## Que significan los estados

| Estado | Significa | Acción |
|---|---|---|
| `preflight` | INSERT inicial, antes de approval gate | Esperar approval |
| `ready` | Approval recibido | Workers van a empezar |
| `deploying` | Workers en deploy | Esperar Ready=True |
| `verifying` | Workers OK, Vercel READY, health pendiente | Esperar health check |
| `released` | Todo verde end-to-end | Release exitoso |
| `degraded` | Health soft-failed pero workers + Vercel OK | Inspeccionar dashboard, decidir rollback o forward-fix |
| `rolled_back` | Operador disparó `pnpm release:rollback` | Revertido |
| `aborted` | Job falló mid-flight (preflight, deploy, etc) | Investigar logs + re-INSERT con attempt_n + 1 |

## Que NO hacer

- **NUNCA** modificar `release_manifests` directamente via SQL. Anti-immutable trigger lo bloquea para campos identity.
- **NUNCA** correr `production-release.yml` en paralelo con el mismo `target_sha`. La concurrency group lo enforce a nivel workflow.
- **NUNCA** correr `production-release.yml` cuando hay otro release ACTIVO en `main` con SHA distinto. El partial UNIQUE INDEX en DB lo bloquea (recordReleaseStarted falla); operador debe esperar a que el activo termine o abortarlo manualmente.
- **NUNCA** forzar transitions fuera de la matrix canónica via CLI. `assertValidReleaseStateTransition` lo throw fail-loud.
- **NUNCA** flagear `--override-batch-policy` (en preflight) sin reason >=20 chars + capability + post-mortem comprometido. Audit row registra la decisión.
- **NUNCA** disparar el orquestador cuando staging tiene blockers (Sentry critical issues, watchdog alertando). Resolverlos primero.

## Problemas comunes

| Síntoma | Causa probable | Fix |
|---|---|---|
| `preflight` falla con `release_batch_policy=split_batch` | Diff mezcla dominios sensibles independientes (e.g. payroll + finance) | Dividir release en 2 batches O agregar `[release-coupled: <razon>]` en commit body |
| `preflight` falla con `release_batch_policy=requires_break_glass` | Diff toca migrations / auth / payroll / finance / cloud_release | Si legítimo: `bypass_preflight_reason` con razón completa + post-mortem |
| `record-started` falla con "release ya activo en main" | Otro release en `preflight|ready|deploying|verifying` | Esperar terminación o abortar manualmente via `pnpm release:orchestrator-transition-state --to-state=aborted` |
| Worker deploy falla con "GIT_SHA mismatch" | Cloud Build cache stale, tag drift, deploy aborted mid-flight | Re-run el workflow; si persiste investigar Cloud Build console |
| `wait-vercel` timeout 900s | Vercel deploy lento o no triggered | Verificar `vercel ls greenhouse-eo --target=production`; si no hay deployment, push manual a main |
| `post-release-health` soft-fail (release `degraded`) | `/api/auth/health` no devolvió 200 en 3 attempts | Inspeccionar `/admin/operations` dashboard; decidir rollback (`pnpm release:rollback`) o forward-fix |
| `transition-released` falla con "race con otro actor" | Otro proceso ya transicionó el state | Investigar `release_state_transitions` audit log para ver qué pasó |

## Referencias técnicas

- Spec: [TASK-851](../../tasks/in-progress/TASK-851-production-release-orchestrator-workflow.md)
- Workflow: [.github/workflows/production-release.yml](../../../.github/workflows/production-release.yml)
- CLI scripts: [scripts/release/orchestrator-record-started.ts](../../../scripts/release/orchestrator-record-started.ts), [scripts/release/orchestrator-transition-state.ts](../../../scripts/release/orchestrator-transition-state.ts)
- Helpers: [src/lib/release/manifest-store.ts](../../../src/lib/release/manifest-store.ts), [src/lib/release/state-machine.ts](../../../src/lib/release/state-machine.ts)
- Worker workflows: `.github/workflows/{ops-worker, commercial-cost-worker, ico-batch, hubspot-greenhouse-integration}-deploy.yml`
- Worker deploy.sh: `services/{ops-worker, commercial-cost-worker, ico-batch, hubspot_greenhouse_integration}/deploy.sh`
- CLAUDE.md sección "Production Release Orchestrator invariants (TASK-851)"
- Doc funcional: [release-orchestrator.md](../../documentation/plataforma/release-orchestrator.md)
- Runbook production-release: [production-release.md](../../operations/runbooks/production-release.md)
- Manual preflight: [release-preflight.md](release-preflight.md)
- Manual watchdog: [release-watchdog.md](release-watchdog.md)
