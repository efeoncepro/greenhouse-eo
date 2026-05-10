# Production Release Runbook

> **Audience:** EFEONCE_ADMIN + DEVOPS_OPERATOR
> **Spec canónico:** [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
> **Source task:** TASK-848 V1 (parcial; V1.1 follow-ups en TASK-850..855)
> **Last updated:** 2026-05-10

Este runbook es el contrato operativo para promover `develop` → `main` y para ejecutar rollback de emergencia.

## 1. Decision tree (flujo normal)

```text
                                    ┌─────────────────────────────────┐
                                    │  develop está verde (CI + Smoke)│
                                    └───────────────┬─────────────────┘
                                                    │
                              ┌─────────────────────┴──────────────────────┐
                              │                                            │
                              ▼                                            ▼
                  ┌──────────────────────┐                ┌────────────────────────┐
                  │   PROCEDIMIENTO V1   │                │  PROCEDIMIENTO V1.1    │
                  │   (manual hoy)       │                │  (cuando exista        │
                  │                      │                │   production-release.yml)│
                  └──────────┬───────────┘                └────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │ 1. Preflight checks manuales │
              │    (sec. 2 abajo)             │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 2. PR develop → main         │
              │    revisar diff + approve    │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 3. Merge a main              │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 4. Workflows automáticos     │
              │    aprobar gate Production   │
              │    en GitHub UI per workflow │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ 5. Post-deploy verification  │
              │    (sec. 4 abajo)            │
              └──────────────────────────────┘
```

## 2. Preflight checklist (V1 manual)

Antes de crear PR `develop → main`, ejecutar estos checks. **Cualquier check rojo bloquea el release.**

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

### 2.1. Verificación WIF subjects (manual hoy, automatizado en V1.1)

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

**Workflows que requieren approval del environment `Production`** (allowlist canónica):

- `Ops Worker Deploy`
- `Commercial Cost Worker Deploy`
- `ICO Batch Worker Deploy`
- `HubSpot Greenhouse Integration Deploy`
- `Azure Teams Deploy`
- `Azure Teams Bot Deploy`

Cuando merges `develop → main`, cada workflow trigger es bloqueado en `waiting` hasta que un EFEONCE_ADMIN apruebe el environment via GitHub UI:

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
- CLI: [scripts/release/production-rollback.ts](../../../scripts/release/production-rollback.ts)
- Reliability: [src/lib/reliability/queries/release-stale-approval.ts](../../../src/lib/reliability/queries/release-stale-approval.ts), [release-pending-without-jobs.ts](../../../src/lib/reliability/queries/release-pending-without-jobs.ts)
- Workflows fix Opcion A: `.github/workflows/{ops-worker,commercial-cost-worker,ico-batch}-deploy.yml`
- Capabilities: `platform.release.execute`, `platform.release.rollback`, `platform.release.bypass_preflight`

## V1 limitations & V1.1 roadmap

V1 entrega foundation + concurrency fix + 2 signals + rollback CLI skeleton. V1.1 (TASKs derivativas):

- **TASK-850** Production Preflight CLI completo (automatiza sec. 2 + WIF subjects + GH API blockers)
- **TASK-851** `production-release.yml` workflow orchestrator (state machine + advisory lock + manifest writes automáticos)
- **TASK-852** Worker SHA verification (input `expected_sha` + Ready=True polling)
- **TASK-853** Azure infra release gating (Bicep diff detector + manual rollback runbook ampliado)
- **TASK-854** 2 signals adicionales (deploy_duration_p95 + last_status)
- **TASK-855** Dashboard `/admin/releases` (manifest viewer + rollback CTA)
