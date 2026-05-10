# Production Release Watchdog Runbook

> **Audience:** EFEONCE_ADMIN + DEVOPS_OPERATOR
> **Spec canónico:** [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md) §2.9
> **Source task:** TASK-849
> **Last updated:** 2026-05-10

Este runbook opera el watchdog scheduled que detecta y alerta temprano sobre approvals obsoletos de Production, runs productivos sin jobs y drift de deploy de workers.

## 1. Qué detecta

| Signal | Trigger | Severity ladder |
|---|---|---|
| `platform.release.stale_approval` | Run production en `status=waiting` con `pending_deployments[].environment.name == "Production"` y edad > umbral | warning >2h, error >24h, critical >7d |
| `platform.release.pending_without_jobs` | Run en `queued|pending|in_progress` con `jobs.length === 0` y edad > umbral | warning >5min, error >30min |
| `platform.release.worker_revision_drift` | Cloud Run latest ready revision SHA ≠ último workflow run success SHA | error si drift confirmado, warning si data missing |

## 2. Cómo corre

| Modo | Cuándo | Comando |
|---|---|---|
| **Scheduled GH Actions** | Cada 30 min, automático | `.github/workflows/production-release-watchdog.yml` |
| **Manual GH dispatch** | Operator quiere validar ad-hoc | UI Actions → Production Release Watchdog → Run workflow |
| **CLI local** | Pre-release verification | `pnpm release:watchdog` |
| **CLI local con alertas Teams** | Validar dispatch end-to-end | `ENABLE_TEAMS_DISPATCH=true pnpm release:watchdog --enable-teams` |
| **CLI dry-run** | Ver qué se enviaría sin enviar | `pnpm release:watchdog --enable-teams --dry-run` |
| **CLI fail-on-error** | Pre-release gate | `pnpm release:watchdog --fail-on-error --json` |

## 3. Interpretación de severities

### `ok`
Sin blockers detectados. Los 3 signals están en steady state. Operador no necesita acción.

### `warning`
- **stale_approval**: aprobación pendiente entre 2h y 24h. Visible pero no bloqueante. Operador debe revisar el run en el próximo ciclo de trabajo.
- **pending_without_jobs**: deploy entre 5min y 30min sin jobs. Probablemente concurrency normal; verificar que no escale.
- **worker_revision_drift**: data missing en >=1 worker (gcloud absent o GIT_SHA no inyectado aún). NO es drift falso — el reader lo distingue. Re-deploy el worker para activar GIT_SHA.

### `error`
- **stale_approval >24h**: aprobación lleva un día completo sin acción. Operador debe revisar y decidir cancel/approve.
- **pending_without_jobs >30min**: bug clase concurrency deadlock. Cancelar el run viejo bloqueante (ver §4 Stale approval recovery).
- **worker_revision_drift confirmado**: revision Cloud Run no matchea el último deploy verde. Investigar deploy fallido o manual deployment.

### `critical`
- **stale_approval >7d**: aprobación abandonada. Cancelar inmediatamente. Es el síntoma del incidente histórico 2026-04-26 → 2026-05-09.

## 4. Stale approval recovery (procedimiento canónico)

Cuando recibes alerta Teams `[WARNING|ERROR|CRITICAL] Approval pendiente production`:

1. **Identificar el run blocker** (Teams alert + workflow link incluyen el run ID):
   ```bash
   gh run list --status waiting --workflow="Ops Worker Deploy"
   gh run view <run_id>
   ```

2. **Decidir cancel vs approve**:
   - Si el run viejo no debe deployar (e.g. commit ya superado por nuevos pushes) → cancelar
   - Si el run debe deployar (era valido pero quedo esperando approval) → aprobar via UI

3. **Cancelar run stale** (path canónico para recovery 99% de los casos):
   ```bash
   gh run cancel <run_id>
   ```

4. **Verificar que pushes nuevos pueden avanzar**:
   ```bash
   gh run list --status pending --workflow="Ops Worker Deploy"
   # Si quedo algun pending, debería arrancar dentro de los próximos 30s
   gh run watch <new_run_id>
   ```

5. **Confirmar Teams recovery alert**: el watchdog detecta resolución en el próximo cron run y emite `[RECOVERED] stale_approval — Ops Worker Deploy` automáticamente.

## 5. Pending-without-jobs recovery

Cuando recibes alerta `[ERROR] Deploy pending sin jobs (concurrency deadlock)`:

1. **Verificar que el concurrency fix Opcion A está activo** (TASK-848 Slice 3):
   ```bash
   grep -A 3 "concurrency:" .github/workflows/ops-worker-deploy.yml
   # Debe mostrar:
   #   cancel-in-progress: ${{ (github.event_name == 'workflow_dispatch' && ...) || github.ref == 'refs/heads/main' }}
   ```

   Si NO está activo → REGRESION grave. Restaurar el fix de TASK-848 Slice 3 + investigar quién lo revirtió.

2. **Identificar runs stale upstream** que están bloqueando:
   ```bash
   gh run list --status waiting --workflow="<workflow_name>"
   ```

3. **Cancelar runs stale** (sec. 4 procedure).

4. **El watchdog automaticamente detecta resolución** y emite recovery alert.

## 6. Worker revision drift recovery

Cuando recibes alerta `[ERROR] Worker revision drift — <workflow>`:

1. **Verificar SHAs**:
   ```bash
   # GH last successful workflow run SHA
   gh run list --workflow="Ops Worker Deploy" --status=success --limit=1 --json headSha

   # Cloud Run latest ready revision GIT_SHA
   gcloud run services describe ops-worker \
     --region=us-east4 --project=efeonce-group \
     --format="value(spec.template.spec.containers[0].env.filter('name','GIT_SHA').extract('value'))"
   ```

2. **Si difieren**: deploy reciente falló silente o alguien deployó manualmente sin pasar por workflow.
   - Re-trigger workflow normal: `gh workflow run "Ops Worker Deploy" --ref main`
   - Verificar que el deploy completa con `gh run watch <run_id>`

3. **Si Cloud Run muestra `unknown`**: worker fue deployado antes de TASK-849 Slice 1 (GIT_SHA injection). Re-deploy el worker via workflow normal — el GIT_SHA se poblará en la nueva revision.

## 7. Dedup state operations

El watchdog usa `greenhouse_sync.release_watchdog_alert_state` para evitar spam Teams. Operaciones útiles:

```bash
# Ver alerts activas
psql -c "SELECT workflow_name, run_id, alert_kind, last_alerted_severity, last_alerted_at, alert_count FROM greenhouse_sync.release_watchdog_alert_state ORDER BY last_alerted_at DESC"

# Forzar re-alert de un blocker (borrar dedup row → próximo cron alerta de nuevo)
psql -c "DELETE FROM greenhouse_sync.release_watchdog_alert_state WHERE workflow_name='Ops Worker Deploy' AND run_id=<run_id> AND alert_kind='stale_approval'"

# Limpiar dedup state completo (CUIDADO: re-alerta todo lo que sigue activo)
psql -c "DELETE FROM greenhouse_sync.release_watchdog_alert_state"
```

## 8. Configuración requerida

### 8.1. GitHub token para los readers (opcional pero recomendado)

Sin token, los 3 readers degradan a `severity='unknown'` con summary explicativo. NO crashean. Pero el operador NO ve los blockers automaticamente.

```bash
# Crear PAT con scopes: actions:read, deployments:read
# Agregar a Vercel env vars production:
gh auth token | vercel env add GITHUB_RELEASE_OBSERVER_TOKEN production

# El watchdog scheduled usa GITHUB_TOKEN auto-provisto (no requiere PAT extra
# en GH Actions runner). Solo Vercel runtime necesita el PAT manual.
```

### 8.2. Teams destination

`production-release-alerts` ya está registrado en `src/config/manual-teams-announcements.ts`. V1 placeholder apunta al chat EO Team. Para cambiar:

1. Crear chat dedicado en Teams (sugerido: `Production Releases`)
2. Obtener `recipientChatId` via Teams Admin API o Bot Framework helpers
3. PR actualizando `recipientChatId` en `src/config/manual-teams-announcements.ts`

### 8.3. WIF para gcloud (drift detection)

El workflow YA usa WIF via `google-github-actions/auth@v3` con el SA `github-actions-deployer`. Si emerge error de WIF:

```bash
# Verificar subjects WIF
gcloud iam workload-identity-pools providers describe github-actions-provider \
  --location=global --workload-identity-pool=github-actions-pool \
  --project=efeonce-group --format='value(attributeCondition)'
```

Subject canónico: `assertion.repository == 'efeoncepro/greenhouse-eo'`.

## 9. Decision tree — alert vs ignore vs incident

```text
                    ┌────────────────────────┐
                    │ Watchdog Teams alert   │
                    └──────────┬─────────────┘
                               ▼
                  ┌────────────────────────────┐
                  │  Severity?                 │
                  └─┬────────┬───────┬─────────┘
              warning  error    critical
                    │      │       │
                    ▼      ▼       ▼
            ┌────────┐ ┌──────┐ ┌────────────┐
            │ Revisar│ │Action│ │ INCIDENT   │
            │ proximo│ │HOY   │ │ MODE       │
            │ ciclo  │ │      │ │ (P1/P0)    │
            │        │ │      │ │ post-mortem│
            └────────┘ └──────┘ └────────────┘
```

- **warning**: revisar en el próximo ciclo de trabajo (mismo día). NO interrumpir incident response actual.
- **error**: action HOY. Cancel run stale o investigar root cause. Si no se resuelve en <4h, escalar a incidente.
- **critical**: incident mode. Open postmortem ticket. El blocker llegó al estado del incidente histórico (>7d para stale approval o drift confirmado).

## 10. Hard rules (anti-regresión)

- **NUNCA** ejecutar `gh run cancel` o `gh run approve` automáticamente desde el watchdog. El watchdog SOLO recomienda; humano decide.
- **NUNCA** modificar la concurrency config de los 3 worker workflows a `cancel-in-progress: false` para production. Reintroduce el deadlock TASK-848.
- **NUNCA** desactivar el watchdog por más de 7 días sin justificación documentada. Es la única detección activa del bug class del incidente.
- **NUNCA** introducir un signal coarse `platform.release.health` que lumpee los 3 failure modes. Greenhouse pattern (TASK-742, TASK-774, TASK-768) es 1 signal por failure mode.
- **NUNCA** loggear payload completo de respuesta GitHub/Cloud Run sin pasar por `redactSensitive`. GitHub responses pueden incluir email del actor.
- **SIEMPRE** que emerja un workflow nuevo de deploy production, agregarlo a `RELEASE_DEPLOY_WORKFLOWS` en `src/lib/release/workflow-allowlist.ts` ANTES del primer deploy. Sin esto, el watchdog NO lo detecta.
- **SIEMPRE** que el detector cambie su contract JSON output, bumpear version + actualizar consumer en preflight CLI futuro (TASK-850).

## 11. Verificación post-deploy del watchdog

```bash
# 1. Workflow file está válido
gh workflow list | grep "Production Release Watchdog"

# 2. Manual dispatch dry-run
gh workflow run production-release-watchdog.yml --ref develop \
  -f enable_teams=false -f fail_on_error=false

# 3. Verificar que el cron está activo (próximos runs scheduled)
gh workflow view production-release-watchdog.yml --json runs --jq '.runs[0:5]'

# 4. CLI local sin enviar Teams
pnpm release:watchdog --json

# 5. Tabla dedup vacía al inicio
psql -c "SELECT COUNT(*) FROM greenhouse_sync.release_watchdog_alert_state"
# Debe ser 0
```

## 12. Referencias

- Spec V1: [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md) §2.9
- Tabla dedup: `greenhouse_sync.release_watchdog_alert_state`
- CLI: [scripts/release/production-release-watchdog.ts](../../../scripts/release/production-release-watchdog.ts)
- Dispatcher: [src/lib/release/watchdog-alerts-dispatcher.ts](../../../src/lib/release/watchdog-alerts-dispatcher.ts)
- Readers reliability: `src/lib/reliability/queries/release-{stale-approval,pending-without-jobs,worker-revision-drift}.ts`
- Workflow: [.github/workflows/production-release-watchdog.yml](../../../.github/workflows/production-release-watchdog.yml)
- Capability: `platform.release.watchdog.read` (`src/config/entitlements-catalog.ts`)
- Helpers canónicos: `src/lib/release/{github-helpers,workflow-allowlist,severity-resolver}.ts`
- Runbook hermano (release operativo): [production-release.md](production-release.md)

## 13. V1 limitations & V1.1 follow-ups

V1 entrega watchdog + 3 signals + alerting end-to-end con dedup. V1.1 (TASK derivada conditional):

- **Per-finding alerts** (vs aggregate signal alerts): cuando emerja necesidad operativa de saber QUE workflow + QUE run_id en cada alert (en lugar del summary del signal), expandir parser de evidence en CLI dispatch loop.
- **CI gate workflow allowlist**: cuando un workflow nuevo emerge en `.github/workflows/*-deploy.yml` con `environment: production`, CI verifica que aparezca en `RELEASE_DEPLOY_WORKFLOWS`. Sin esto, un workflow nuevo queda invisible al watchdog.
- **GH Actions schedule reliability monitor**: si el watchdog se salta runs por delay >30min sostenido (5+ skipped en 7d), agregar Health endpoint + reliability signal `platform.release.watchdog.run_lag`.
- **Migración a Cloud Scheduler + ops-worker**: si GH Actions reliability resulta inadecuada y el caso es infrastructure-critical, migrar a Cloud Scheduler invocando endpoint en ops-worker.
