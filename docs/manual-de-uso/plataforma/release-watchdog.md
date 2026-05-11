# Manual de uso — Release Watchdog

> **Tipo de documento:** Manual operativo (lenguaje simple, paso a paso)
> **Version:** 1.0
> **Creado:** 2026-05-10 por TASK-849 V1.1
> **Ultima actualizacion:** 2026-05-10
> **Documentacion tecnica:** [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md), [runbook operativo](../../operations/runbooks/production-release-watchdog.md)

## Para que sirve

El **Release Watchdog** es el sistema que vigila los workflows de despliegue a produccion (`Ops Worker`, `Commercial Cost Worker`, `ICO Batch Worker`, `HubSpot Integration`, `Azure Teams`) y alerta cuando algo se traba. Cierra el bucle de un incidente real (2026-04-26 → 2026-05-09) donde 3 workflows quedaron bloqueados 14-22 dias **sin que nadie se diera cuenta**.

Hace 3 cosas:

1. **Detecta aprobaciones colgadas**: cuando un deploy a produccion queda esperando approval mas de 24h.
2. **Detecta deploys "fantasma"**: runs que se quedan en pending sin jobs durante mas de 5 min (sintoma de deadlock por concurrency).
3. **Detecta drift de revisiones**: cuando la version corriendo en Cloud Run NO matchea la del ultimo deploy verde (alguien deployo manual o un deploy fallo silente).

## Antes de empezar

Para que el Watchdog opere correctamente:

| Pre-requisito | Estado | Como verificar |
|---|---|---|
| GitHub App instalada | ✅ live | https://github.com/organizations/efeoncepro/settings/apps/greenhouse-release-watchdog |
| Vercel env vars production | ✅ live | `vercel env ls \| grep GITHUB_APP` (3 vars deben existir) |
| GCP secret private key | ✅ live | `gcloud secrets describe greenhouse-github-app-private-key --project=efeonce-group` |
| Workflow scheduled | ⚠️ pending merge develop→main | `gh workflow list \| grep -i watchdog` |
| Workers con GIT_SHA env var | ⚠️ pending re-deploy post-merge | `gcloud run services describe ops-worker --region=us-east4 --format='value(spec.template.spec.containers[0].env)' \| grep GIT_SHA` |

## Como ver el estado del Watchdog

### Opcion A — Dashboard (recomendado, no requiere CLI)

1. Visitar https://greenhouse.efeoncepro.com/admin/operations
2. Buscar el subsystem **"Platform Release"** (se renderiza automaticamente desde el reliability registry)
3. Veras 3 signals con su severity actual:
   - 🟢 `platform.release.stale_approval` — verde si no hay approvals colgados >24h
   - 🟢 `platform.release.pending_without_jobs` — verde si no hay deploys "fantasma"
   - 🟢 `platform.release.worker_revision_drift` — verde si las revisions Cloud Run matchean los deploys verdes

Cada signal muestra:

- **Severity**: `ok` / `warning` / `error` / `unknown`
- **Summary**: descripcion legible del estado actual
- **Evidence**: detalle (count + run IDs + commands para remediar)

### Opcion B — Comando local (para troubleshooting)

```bash
# Si tenes acceso a gcloud + las env vars del GH App (caso comun: debug mid-incident)
GCP_PROJECT=efeonce-group \
  GITHUB_APP_ID=3665723 \
  GITHUB_APP_INSTALLATION_ID=131127026 \
  GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF=greenhouse-github-app-private-key \
  pnpm release:watchdog --json

# Output:
# {
#   "aggregateSeverity": "ok",
#   "signals": [
#     {"signalId": "platform.release.stale_approval", "severity": "ok", ...},
#     {"signalId": "platform.release.pending_without_jobs", "severity": "ok", ...},
#     {"signalId": "platform.release.worker_revision_drift", "severity": "ok", ...}
#   ]
# }
```

## Que significan los estados

### 🟢 `ok` — todo bien

Sin blockers detectados. El Watchdog confirma que el control plane production esta saludable. **No requiere accion.**

### 🟡 `warning` — atencion

Algo emergiendo pero no critico. Casos comunes:

- **stale_approval `warning` (>2h)**: hay un deploy esperando approval entre 2 y 24 horas. Visible pero no urgente. Revisar en el proximo ciclo de trabajo.
- **worker_revision_drift `warning` (data_missing)**: gcloud no esta disponible en el runtime que corrio el watchdog, O un worker fue deployado sin GIT_SHA env var (versiones pre TASK-849). Re-deployar el worker resuelve el caso.

### 🔴 `error` — accion HOY

Bug en vivo que requiere atencion. Casos comunes:

- **stale_approval `error` (>24h)**: deploy esperando approval >1 dia. Cancelar el run viejo (esta superseded por commits mas recientes).
- **pending_without_jobs `error` (>5min)**: el bug class del incidente historico se reprodujo. Investigar.
- **worker_revision_drift `error`**: la revision Cloud Run no matchea el ultimo deploy verde. Si el worker drifted es `hubspot-greenhouse-integration`, ejecutar el recovery del runbook con `hubspot-greenhouse-integration-deploy.yml`, `environment=production`, `expected_sha=<release target_sha>` y `skip_tests=false`; luego verificar `/health`, `/contract` y watchdog `drift_count=0`.

### 🟠 `critical` — INCIDENT MODE

Deteccion del estado del incidente historico:

- **stale_approval `critical` (>7d)**: aprobacion abandonada — exactamente lo que paso 2026-04-26→2026-05-09. Cancelar inmediatamente.
- **worker_revision_drift `critical`**: drift confirmado prolongado. Iniciar incident response + post-mortem.

### ❓ `unknown` — degraded mode

El Watchdog no pudo consultar GitHub API o Cloud Run. Causas comunes:

- Falta `GITHUB_RELEASE_OBSERVER_TOKEN` o las env vars del GH App
- gcloud no disponible en el runtime
- GitHub API rate-limited o down

**No es un fallo del Watchdog** — es config faltante o servicio externo caido. Configurar las env vars segun [runbook §8.1](../../operations/runbooks/production-release-watchdog.md#81-github-app-canonical-recomendado-v11--token-strategy-robusta).

## Paso a paso: que hacer cuando suena la alerta

### Cuando llega alerta Teams `[ERROR|CRITICAL] Approval pendiente production`

**1. Identificar el run blocker**

El mensaje Teams incluye el run ID + URL. Ejemplo:

```text
[CRITICAL] Approval pendiente production — Ops Worker Deploy

Workflow: Ops Worker Deploy
Run ID: 24970337613
Branch: main
SHA: d5f45b163e6c
Edad: 22d
Accion recomendada: cancelar via `gh run cancel 24970337613`
```

**2. Decidir cancel vs approve**

- ¿El commit es de hace >24h y hay commits mas recientes en `main`? → **CANCELAR** (aprobarlo deployaria codigo viejo)
- ¿El commit es reciente y nadie aprobo aun por descuido? → **APROBAR** via UI

**3. Si cancelar — comando exacto**:

```bash
gh run cancel <run_id>
```

**4. Verificar resolucion**

El Watchdog detecta automaticamente que se resolvio en el proximo cron run (max 30 min). Recibirias alerta Teams `[RECOVERED] stale_approval — Ops Worker Deploy`.

### Cuando llega alerta `[ERROR] Deploy pending sin jobs (concurrency deadlock)`

**1. Verificar concurrency fix activo**:

```bash
grep -A 3 "concurrency:" .github/workflows/ops-worker-deploy.yml
# Debe mostrar:
#   cancel-in-progress: ${{ (github.event_name == 'workflow_dispatch' && ...) || github.ref == 'refs/heads/main' }}
```

Si NO esta activo → REGRESION grave. Restaurar fix de TASK-848 Slice 3 + investigar quien lo revirtio.

**2. Identificar runs stale upstream**:

```bash
gh run list --status waiting --workflow="<workflow_name>"
```

Cancelar cualquier run stale (proceso de seccion anterior).

### Cuando llega alerta `[ERROR] Worker revision drift`

**1. Verificar SHAs**:

```bash
# GH last successful workflow run SHA
gh run list --workflow="Ops Worker Deploy" --status=success --limit=1 --json headSha

# Cloud Run latest ready revision GIT_SHA
gcloud run services describe ops-worker \
  --region=us-east4 --project=efeonce-group \
  --format="value(spec.template.spec.containers[0].env.filter('name','GIT_SHA').extract('value'))"
```

**2. Si difieren** → re-trigger workflow:

```bash
gh workflow run "Ops Worker Deploy" --ref main
gh run watch <new_run_id>
```

**3. Si Cloud Run muestra `unknown`** → worker fue deployado pre TASK-849 Slice 1. Re-deployar resuelve (el GIT_SHA se poblara en la nueva revision).

## Que NO hacer

- ❌ **NUNCA cancelar runs sin entender por que estan colgados**. Puede ser un deploy legitimo esperando approval planeado.
- ❌ **NUNCA cambiar `cancel-in-progress: false` en los 3 worker workflows production**. Reintroduce el bug class del incidente historico.
- ❌ **NUNCA aprobar runs production stale (>24h)**. Casi siempre estan superseded por commits mas recientes.
- ❌ **NUNCA usar tokens GitHub personales (PATs)** para el Watchdog production. La estrategia canonica es GitHub App.
- ❌ **NUNCA committear el private key (`.pem`)** del GitHub App al repo. Solo via GCP Secret Manager.
- ❌ **NUNCA modificar la tabla `release_watchdog_alert_state` directo via SQL** sin entender el dedup logic. Usar `clearDedupRow()` helper si necesitas forzar re-alert.

## Problemas comunes

### "Los signals muestran severity='unknown' siempre"

→ Falta configurar las env vars del GH App en Vercel production. Ejecutar [setup script](../../operations/runbooks/production-release-watchdog.md#setup-github-app-automatizado-recomendado-5-min):

```bash
pnpm release:setup-github-app
```

### "El cron `*/30 *` no esta corriendo"

→ El workflow file `production-release-watchdog.yml` esta en `develop` pero no en `main`. GitHub Actions solo registra crons cuando el workflow esta en la default branch. Hacer merge `develop → main` activa el cron.

### "Worker revision drift dice data_missing siempre"

→ Los workers no tienen `GIT_SHA` env var deployado aun (pre TASK-849 Slice 1). Re-deployar cada worker:

```bash
gh workflow run "Ops Worker Deploy" --ref main
gh workflow run "Commercial Cost Worker Deploy" --ref main
gh workflow run "ICO Batch Worker Deploy" --ref main
```

Despues del deploy, el watchdog detecta GIT_SHA en la nueva revision y devuelve severity `ok`.

### "Recibo el mismo alert Teams cada 30 min — spam"

→ El dedup logic deberia prevenir esto. Verificar:

```bash
psql -c "SELECT * FROM greenhouse_sync.release_watchdog_alert_state WHERE workflow_name='<name>' AND run_id=<run_id>"
```

Si la fila existe pero el alert sigue llegando, revisar el codigo de `dispatchWatchdogAlert()` — bug en escalation detection.

### "El setup script crashea con 'pkcs8 must be PKCS#8 formatted string'"

→ Bug viejo (commit pre `655e653d`). Pull latest develop:

```bash
git pull origin develop
```

El fix usa `crypto.createPrivateKey` que auto-detecta PKCS#1 (que es el formato que GitHub Apps emiten).

## Referencias tecnicas

- **Spec arquitectonica**: [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
- **Runbook operativo completo**: [production-release-watchdog.md](../../operations/runbooks/production-release-watchdog.md)
- **Doc funcional**: [release-watchdog.md](../../documentation/plataforma/release-watchdog.md)
- **Hard rules CLAUDE.md**: seccion "Production Release Watchdog invariants (TASK-849)"
- **Tabla dedup**: `greenhouse_sync.release_watchdog_alert_state`
- **CLI**: `pnpm release:watchdog [--json|--fail-on-error|--enable-teams|--dry-run]`
- **Setup CLI**: `pnpm release:setup-github-app` y `pnpm release:complete-github-app-setup`
- **Capability granular**: `platform.release.watchdog.read`
- **Outbox events**: ninguno V1 (read-only watchdog)
