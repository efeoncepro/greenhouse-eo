# Production Release Runbook

> **Audience:** EFEONCE_ADMIN + DEVOPS_OPERATOR
> **Spec canónico:** [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
> **Source task:** TASK-848 V1 (parcial; V1.1 follow-ups en TASK-850..855)
> **Last updated:** 2026-05-11

Este runbook es el contrato operativo para promover `develop` → `main` y para ejecutar rollback de emergencia.

## 1. Decision tree (flujo normal canonico)

```text
                                    ┌─────────────────────────────────┐
                                    │  develop está verde (CI + Smoke)│
                                    └───────────────┬─────────────────┘
                                                    │
              ┌──────────────────────────────┐
              │ 1. Promover el SHA a main    │
              │    via PR/merge controlado   │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 2. Disparar orquestador      │
              │    production-release.yml    │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 3. Preflight TASK-850        │
              │    bloquea antes de deploy   │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 4. Aprobar gate Production   │
              │    del orquestador           │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 5. Orquestador despliega     │
              │    workers + espera Vercel   │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 6. Health + manifest         │
              │    released/degraded         │
              └──────────────────────────────┘
```

`production-release.yml` es el brazo activo canonico del release a
produccion. Los workflows individuales de workers conservan `push` y
`workflow_dispatch` por compatibilidad, staging y break-glass documentado, pero
el flujo normal NO consiste en aprobar workers sueltos uno por uno. El
orquestador invoca los workers via `workflow_call`, pasa `expected_sha`, espera
Vercel production READY y transiciona `greenhouse_sync.release_manifests`.

## 2. Preflight checklist (V1 manual + TASK-850 CLI canonico)

**TASK-850 SHIPPED 2026-05-10** — la tabla manual de abajo queda como referencia conceptual. Ejecutar **siempre** `pnpm release:preflight` que automatiza los 12 checks, incluido `release_batch_policy`, en una sola llamada con output JSON machine-readable.

```bash
# Pre-PR (operador local)
pnpm release:preflight                       # human output, todos los 12 checks
pnpm release:preflight --json                # JSON machine-readable

# CI gate (TASK-851 orchestrator workflow)
pnpm release:preflight --json --fail-on-error   # exit 1 si overallStatus=blocked

# Break-glass (EFEONCE_ADMIN solo, requiere capability + audit)
pnpm release:preflight --override-batch-policy --fail-on-error
```

Flags:

- `--target-sha=<sha>` (default git HEAD)
- `--target-branch=<branch>` (default main)
- `--json`, `--fail-on-error`, `--override-batch-policy`

Output canonico: `ProductionPreflightV1` (versionado `contractVersion='production-preflight.v1'`). Operator decide en base a `readyToDeploy: SI | NO`.

Si por algun motivo el CLI no esta disponible (e.g. local sin checkout, o auth expirada), la tabla manual abajo sirve como fallback documental. **Cualquier check rojo bloquea el release.**

| # | Check | Cómo verificar | Bloqueante |
|---|---|---|---|
| 1 | CI verde en commit cabeza de develop | `gh run list --branch develop --workflow=CI --limit 1` | Sí |
| 2 | Playwright smoke verde | `gh run list --branch develop --workflow="Playwright E2E smoke" --limit 1` | Sí |
| 3 | Sin runs production "stale waiting" | `gh run list --status waiting` y verificar que ninguno > 24h en allowlist | Sí |
| 4 | Sin runs "pending sin jobs" | `gh run list --status queued` + inspect cada uno con `gh run view <id>` | Sí |
| 5 | Vercel staging Ready | `vercel ls greenhouse-eo --target=staging --limit 1` ✓ Ready | Sí |
| 6 | Postgres health | `pnpm pg:doctor` | Sí |
| 7 | Outbox sin dead-letter pendiente | `psql -c "SELECT count(*) FROM greenhouse_sync.outbox_events WHERE status='dead_letter'"` debe ser 0 | Recomendado |
| 8 | Sentry sin incidents critical 24h | Vercel/Sentry UI o `/admin/operations` Cloud subsystem | Sí |
| 9 | Reliability dashboard `/admin/operations` sin signals `error` | Inspeccionar UI | Sí |
| 10 | WIF subjects GCP + Azure correctos | Sec 2.1 abajo | Sí (después de cualquier cambio infra) |
| 11 | Batch size policy OK | Sec 2.2 abajo; V1.1 lo automatiza en TASK-850 | Sí |

### 2.1. Verificación WIF subjects (fallback manual)

**GCP**:

```bash
gcloud iam workload-identity-pools providers describe github-actions-provider \
  --location=global \
  --workload-identity-pool=github-actions-pool \
  --project=efeonce-group \
  --format='value(attributeCondition)'
```

Debe permitir AMBOS:
- `assertion.ref == 'refs/heads/main'`
- `assertion.environment == 'production'` (si algún workflow declara `environment: production`)

**Azure** (App Registration `Greenhouse Bot Registration`):

```bash
az ad app federated-credential list --id <AZURE_CLIENT_ID> --query "[].subject"
```

Debe incluir AMBOS:
- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/main`
- `repo:efeoncepro/greenhouse-eo:environment:production`

**Si falta**: agregar via `az ad app federated-credential create --id <CLIENT_ID> --parameters '{...}'` ANTES del release.

### 2.2. Production release batch size policy

Greenhouse promueve a producción en lotes pequeños, coherentes y reversibles. La unidad de decisión no es el
número de commits: es **blast radius + reversibilidad + evidencia de validación**.

Regla base:

- Un release normal debe contener **un bloque funcional coherente**.
- Ese bloque puede tener varios commits si todos pertenecen al mismo objetivo y comparten rollback.
- No mezclar dominios sensibles salvo dependencia directa documentada.

Matriz operativa:

| Tipo de cambio | Política de batch | Bloquea si se mezcla con |
|---|---|---|
| Docs-only / task specs | Agrupable si no cambia runtime | Nada, salvo que oculte cambio runtime |
| UI bajo riesgo | Hasta 2-3 cambios relacionados | DB/auth/payroll/finance/infra no relacionados |
| Payroll / Previred / compliance | 1 causa raíz por release | Finance/auth/cloud/migrations no requeridas |
| Finance / billing / accounting | 1 causa raíz por release | Payroll/auth/cloud/migrations no requeridas |
| Auth / access / entitlements | 1 causa raíz por release | Payroll/finance/cloud no requeridas |
| Cloud / deploy / release infra | 1 slice por release | Cambios funcionales no requeridos |
| DB migration | Release dedicado o acoplado solo a su consumer directo | Refactors/UI no requeridos |
| Hotfix | 1 cambio mínimo y reversible | Cualquier mejora oportunista |

Bloqueantes:

- más de un cambio irreversible en el mismo release;
- más de un dominio sensible sin dependencia declarada;
- rollback no explicable en una frase;
- staging no valida el flujo afectado;
- signals `error` en `/admin/operations`;
- stale approvals o pending runs sin jobs;
- el release se describe naturalmente con "también incluye...".

Excepción break-glass:

- solo para incidente productivo activo;
- requiere razón escrita, owner humano, rollback explícito y actualización de `Handoff.md`;
- no permite agregar mejoras no relacionadas.

## 3. Approval del environment Production

En el flujo canonico se aprueba el job `approval-gate` del workflow
`Production Release Orchestrator`. Despues de esa aprobacion, el orquestador
coordina en paralelo los deploys que corresponden y registra el estado en
`greenhouse_sync.release_manifests`.

**Workflows que requieren approval del environment `Production`** (allowlist canónica):

- `Ops Worker Deploy`
- `Commercial Cost Worker Deploy`
- `ICO Batch Worker Deploy`
- `HubSpot Greenhouse Integration Deploy`
- `Azure Teams Deploy`
- `Azure Teams Bot Deploy`

Estos workflows individuales siguen protegidos porque tambien pueden ejecutarse
por `push` o `workflow_dispatch` en escenarios legacy/break-glass. Si aparecen
runs individuales esperando approval tras un push a `main`, NO asumir que eso
reemplaza el orquestador. Validar primero si hay un run
`Production Release Orchestrator` activo para el mismo `target_sha`.

Approval desde GitHub UI:

```
Repo → Actions → <Workflow> → <Run> → Review pending deployments → Approve & deploy
```

**⚠️ Crítico**: NO aprobar runs viejos (>24h). Si hay runs antiguos waiting, **cancelar primero**:

```bash
gh run list --status waiting --workflow=<name>
gh run cancel <stale_run_id>
```

Reason: el concurrency fix Opcion A (TASK-848 Slice 3) cancela pending nuevos cuando se aprueba runs stale. Runs en `waiting` por > 24h son detectados por reliability signal `platform.release.stale_approval`.

## 4. Post-deploy verification

| # | Check | Cómo verificar |
|---|---|---|
| 1 | Vercel production Ready | `vercel ls greenhouse-eo --target=production --limit 1` |
| 2 | Cloud Run workers Ready | `gcloud run services list --project=efeonce-group --region=us-east4` — todos Ready=True |
| 3 | Sentry sin nuevos errors | Sentry UI filter `release:<sha>` últimos 30min |
| 4 | Smoke flows críticos | Browser real: login, `/finance/cash-out`, `/agency/operations`, `/admin/operations` |
| 5 | Reliability signals OK | `/admin/operations` subsystem `Platform Release` debe estar OK |

### 4.1. HubSpot drift recovery

Si `platform.release.worker_revision_drift` reporta solo
`hubspot-greenhouse-integration` drifted y el `target_sha` del ultimo release en
`greenhouse_sync.release_manifests` ya fue verificado, usar forward-fix con el
workflow canonico del bridge:

```bash
gh workflow run hubspot-greenhouse-integration-deploy.yml \
  --ref main \
  -f environment=production \
  -f expected_sha=<release target_sha> \
  -f skip_tests=false
```

Luego verificar:

```bash
curl https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/health
curl https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/contract
GITHUB_RELEASE_OBSERVER_TOKEN="$(gh auth token)" pnpm release:watchdog --json
```

Steady state esperado: `drift_count=0` y `4/4 workers synced`.

Hard rules:

- No editar `greenhouse_sync.release_manifests` por SQL para "arreglar" drift.
- No cambiar `push:main` ni path filters como hotfix dentro de esta remediation.
- No usar `skip_tests=true` salvo break-glass aprobado y documentado en `Handoff.md`.
- No tocar rutas, payloads, webhooks ni secretos del bridge si el problema es solo revision drift.

## 5. Rollback automatizado (Vercel + Cloud Run)

Si post-deploy verification falla, ejecutar rollback. Capability requerida: `platform.release.rollback` (EFEONCE_ADMIN solo).

### 5.1. Identificar release a hacer rollback

```bash
# Última fila de release_manifests para target_branch=main:
psql -c "SELECT release_id, target_sha, vercel_deployment_url, previous_vercel_deployment_url, previous_worker_revisions FROM greenhouse_sync.release_manifests WHERE target_branch='main' ORDER BY started_at DESC LIMIT 1"
```

Anotar:
- `release_id` (formato `<short_sha>-<uuid>`)
- `previous_vercel_deployment_url`
- Cada revision de `previous_worker_revisions` JSONB

### 5.2. Exportar env vars

```bash
export PREV_VERCEL_URL='https://greenhouse-eo-<previous-deployment>.vercel.app'
export PREV_OPS_WORKER_REVISION='ops-worker-00174-abc'
export PREV_COMMERCIAL_COST_WORKER_REVISION='commercial-cost-worker-00098-xyz'
export PREV_ICO_BATCH_WORKER_REVISION='ico-batch-worker-00045-def'
export PREV_HUBSPOT_INTEGRATION_REVISION='hubspot-greenhouse-integration-00067-ghi'
```

### 5.3. Dry-run primero

```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/release/production-rollback.ts \
  --release-id=<release_id> \
  --reason="Release degraded: post-release health check fallo en /finance/cash-out con 5xx" \
  --dry-run
```

Verificar el plan emitido. Si es correcto, re-correr SIN `--dry-run`.

### 5.4. Apply rollback

```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/release/production-rollback.ts \
  --release-id=<release_id> \
  --reason="Release degraded: post-release health check fallo en /finance/cash-out con 5xx"
```

El CLI:

1. Vercel alias swap: `vercel alias set <PREV_VERCEL_URL> greenhouse.efeoncepro.com`
2. Cloud Run workers traffic split: per worker, `gcloud run services update-traffic ... --to-revisions=<prev>=100`
3. HubSpot integration mismo patron

### 5.5. Post-rollback verification

Mismo checklist sec. 4 pero contra el deployment previo. Esperar 2-3 min para que tráfico se estabilice.

## 6. Rollback manual de Azure config / Bicep (V1 manual)

**⚠️ Azure NO tiene rollback automatizado V1**. Reapply de Bicep templates puede ser destructivo (e.g. delete-on-deletion, federated credential rotation, App Service config reset).

Procedimiento:

1. **Identificar Bicep deployment previo**:
   ```bash
   az deployment group list \
     --resource-group greenhouse-prod \
     --query "[?provisioningState=='Succeeded'] | sort_by(@, &timestamp) | reverse(@) | [0:5].{name:name, timestamp:timestamp, deployment:properties.templateLink.uri}"
   ```

2. **Verificar template previo en repo**:
   ```bash
   git log --oneline infra/azure/<service>/main.bicep | head -10
   git show <previous_commit>:infra/azure/<service>/main.bicep
   ```

3. **Dry-run with what-if**:
   ```bash
   az deployment group what-if \
     --resource-group greenhouse-prod \
     --template-file infra/azure/<service>/main.bicep \
     --parameters @infra/azure/<service>/main.parameters.json
   ```

4. **Apply solo si what-if NO muestra deletes** o solo muestra updates esperados:
   ```bash
   az deployment group create \
     --resource-group greenhouse-prod \
     --template-file infra/azure/<service>/main.bicep \
     --parameters @infra/azure/<service>/main.parameters.json
   ```

5. **Verificar funcionalidad post-apply**: smoke test del Teams Bot + Logic Apps + Notifications.

### 6.1. Azure infra release gating (TASK-853, automatizado en orquestador)

A partir de TASK-853 SHIPPED 2026-05-10, los 2 Azure workflows (`azure-teams-deploy.yml` + `azure-teams-bot-deploy.yml`) operan en gating mode automatico cuando se invocan desde el orquestador `production-release.yml`:

- **Health check Azure (preflight-style)** corre SIEMPRE: WIF login + provider register + RG ensure. Si WIF roto o providers no registrados, el job falla loud antes de tocar Bicep.
- **Bicep apply real** corre solo cuando:
  - `force_infra_deploy=true` en el dispatch del orquestador (operator override explicito), O
  - Diff detectado en `infra/azure/<sub>/**` entre `origin/main~1` y el `target_sha` del release (auto detection)
- **Skip silencioso NO**: el workflow agrega annotation `::notice::` + entry en `GITHUB_STEP_SUMMARY` con la razon del skip (`force_infra_deploy=true` | `push_path_filter_matched` | `infra_diff_detected` | `no_infra_diff`).

Ejemplo de invocacion via orquestador:

```bash
gh workflow run production-release.yml \
  -f target_sha=<sha> \
  -f force_infra_deploy=false   # default; Bicep solo si diff detectado
```

Force apply (e.g. cuando un Bicep template cambio sin diff de paths trivial):

```bash
gh workflow run production-release.yml \
  -f target_sha=<sha> \
  -f force_infra_deploy=true
```

### 6.2. WIF subjects canonicos Azure

Federated credential del Azure AD App Registration (tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4`) acepta los siguientes subjects desde el repo `efeoncepro/greenhouse-eo`:

- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/main` (deploys auto via push:main)
- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/develop` (staging)
- `repo:efeoncepro/greenhouse-eo:environment:production` (cuando workflow declara `environment: production`)

Verificar via:

```bash
az ad app federated-credential list --id <AZURE_CLIENT_ID> -o table
```

Si emerge un subject nuevo (e.g. nuevo workflow, nuevo branch), agregar via:

```bash
az ad app federated-credential create --id <AZURE_CLIENT_ID> --parameters '{
  "name": "gh-actions-<descriptor>",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:efeoncepro/greenhouse-eo:<subject>",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

### 6.3. Rollback automatizado Azure (V2 contingente)

Azure NO tiene rollback automatico V1 porque:

- Bicep templates pueden contener `delete-on-deletion` semantics
- Federated credentials rotation puede dejar el WIF sin acceso temporalmente
- App Service config reset puede invalidar webhooks externos

V2 contingente (cuando emerja necesidad):

- `az deployment group what-if` mandatory antes de cualquier apply
- Restoration desde Bicep template del commit previo (`git show <prev>:infra/azure/<sub>/main.bicep`)
- Smoke test obligatorio post-restore (Teams Bot + Logic Apps healthy)
- Out of scope para TASK-853; queda como follow-up cuando el orquestador acumule incident data suficiente para justificarlo.

## 7. Decision tree: rollback vs forward-fix vs incident mode bypass

```text
                          ┌────────────────────────┐
                          │  Release degraded?     │
                          └───────────┬────────────┘
                                      ▼
                  ┌───────────────────────────────────┐
                  │ Severity de impacto en producción │
                  └─────┬─────────┬───────────┬───────┘
                        │         │           │
                  CRÍTICO    DEGRADED   MENOR
                  (5xx,      (slow,    (typo,
                   datos     algunas   estilo,
                   corruptos) features  copy)
                  perdidos)   afectadas
                        │         │           │
                        ▼         ▼           ▼
                ┌──────────┐ ┌────────┐ ┌──────────┐
                │ ROLLBACK │ │FORWARD │ │FORWARD   │
                │ INMEDIATO│ │FIX     │ │FIX next  │
                │ (sec. 5) │ │ASAP    │ │release   │
                │          │ │(<2h)   │ │ciclo     │
                └──────────┘ └────────┘ └──────────┘
```

### 7.1. Cuándo usar `bypass_preflight`

NUNCA en operación normal. Solo en:

- **Incident mode** activo confirmado (P0/P1 incident reported)
- Operador con capability `platform.release.bypass_preflight` (EFEONCE_ADMIN solo)
- Reason >= 20 chars en formato: `"Bypass preflight: <incidente> + post-mortem TBD <fecha>"`
- Audit row escrita automáticamente

## 8. Reliability signals operativos

Visitar [`/admin/operations`](https://greenhouse.efeoncepro.com/admin/operations) subsystem **Platform Release**:

| Signal | Steady | Cuándo alerta |
|---|---|---|
| `platform.release.stale_approval` | 0 | Runs production "waiting" > 24h |
| `platform.release.pending_without_jobs` | 0 | Runs en queued/in_progress > 5min con jobs:[] |
| `platform.release.deploy_duration_p95` (V1.1) | <30min | p95 release > 30min sostenido |
| `platform.release.last_status` (V1.1) | `released` | Último release `degraded\|aborted\|rolled_back` |
| `platform.release.github_webhook_unmatched` (V1.2) | 0 | Webhooks GitHub release `unmatched`/`failed` en 24h |

Si **stale_approval** o **pending_without_jobs** > 0:
1. `gh run list --status waiting --status queued` para identificar runs
2. Cancelar runs antiguos: `gh run cancel <id>`
3. Re-correr el deploy si fue cancelado en cascada

## 9. Configuración requerida (one-time)

### 9.1. GitHub Personal Access Token para reliability signals

Para que los 2 signals nuevos consulten GitHub API, configurar `GITHUB_RELEASE_OBSERVER_TOKEN` en Vercel env vars:

```bash
# Token con scopes: actions:read, deployments:read
gh auth token | vercel env add GITHUB_RELEASE_OBSERVER_TOKEN production
```

Si no se configura, los signals quedan en `severity='unknown'` con summary explicativo (degraded mode honesto).

### 9.2. WIF subjects para production environment

Verificar y documentar en Sec 2.1.

### 9.3. GitHub release webhook

Configurar un repository webhook en `efeoncepro/greenhouse-eo`:

- Payload URL: `https://greenhouse.efeoncepro.com/api/webhooks/github/release-events`
- Content type: `application/json`
- Secret: mismo valor que `GITHUB_RELEASE_WEBHOOK_SECRET` en Vercel/Secret Manager.
- Events: `workflow_run`, `workflow_job`, `deployment_status`, `check_suite`, `check_run`.
- Active: enabled.

Validación operativa:

```bash
pnpm pg:connect -- -c "SELECT processing_status, count(*) FROM greenhouse_sync.github_release_webhook_events WHERE received_at >= now() - interval '24 hours' GROUP BY 1"
```

Regla: `unmatched` debe investigarse, pero no muta releases. `failed` sí es incidente de ingestion/reconciliation porque GitHub va a reintentar y puede bloquear evidencia near-real-time.

## 10. Hard rules (anti-regresión)

- **NUNCA** aprobar runs production "waiting" > 24h. Cancelar primero.
- **NUNCA** ejecutar rollback sin pasar por `production-rollback.ts` (idempotente, audit-safe).
- **NUNCA** usar `bypass_preflight` fuera de incident mode con post-mortem comprometido.
- **NUNCA** rollback manual de Azure Bicep sin `what-if` previo.
- **SIEMPRE** anotar rollback en `Handoff.md` con razón + post-mortem trigger.
- **SIEMPRE** verificar reliability signals OK antes Y después de release.

## 11. Referencias

- Spec: [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
- Tabla: `greenhouse_sync.release_manifests` (manifest persistido)
- Tabla: `greenhouse_sync.release_state_transitions` (audit append-only)
- Tabla: `greenhouse_sync.github_release_webhook_events` (ledger GitHub release webhooks redacted)
- CLI: [scripts/release/production-rollback.ts](../../../scripts/release/production-rollback.ts)
- Reliability: [src/lib/reliability/queries/release-stale-approval.ts](../../../src/lib/reliability/queries/release-stale-approval.ts), [release-pending-without-jobs.ts](../../../src/lib/reliability/queries/release-pending-without-jobs.ts)
- Workflows fix Opcion A: `.github/workflows/{ops-worker,commercial-cost-worker,ico-batch}-deploy.yml`
- Capabilities: `platform.release.execute`, `platform.release.rollback`, `platform.release.bypass_preflight`

## Release control plane shipped scope

V1 entrego foundation + concurrency fix + rollback CLI. V1.1 completo el camino
canonico de release:

- **TASK-850 SHIPPED** Production Preflight CLI completo (12 checks, WIF subjects + GH API blockers + batch policy).
- **TASK-851 SHIPPED** `production-release.yml` workflow orchestrator (state machine + manifest writes automaticos).
- **TASK-852 compactado en TASK-851** Worker SHA verification (`expected_sha` + Ready=True polling).
- **TASK-853 SHIPPED** Azure infra release gating (Bicep diff detector + manual rollback runbook ampliado).
- **TASK-854 SHIPPED** 2 signals adicionales (`deploy_duration_p95` + `last_status`) + dashboard `/admin/releases`.
