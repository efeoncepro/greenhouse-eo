# Release Watchdog — Documentacion funcional

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-10 por TASK-849 V1.1
> **Ultima actualizacion:** 2026-05-10
> **Documentacion tecnica:** [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
> **Manual operativo:** [release-watchdog manual de uso](../../manual-de-uso/plataforma/release-watchdog.md)

## Que es

El **Release Watchdog** es un sistema automatizado que vigila los despliegues a produccion de Greenhouse y alerta a operadores cuando algo se traba. Forma parte del **Production Release Control Plane** (TASK-848 + TASK-849), el conjunto de herramientas que governance la promocion `develop → main`.

## Por que existe

El 2026-04-26, tres workflows de despliegue de Cloud Run workers (`ops-worker`, `commercial-cost-worker`, `ico-batch-worker`) quedaron bloqueados esperando aprobacion del environment "Production". Los commits mas recientes empezaron a quedar pendientes detras del concurrency group sin nadie darse cuenta.

Pasaron **14 a 22 dias** hasta que un release manual descubrio el deadlock. Durante todo ese tiempo:

- Vercel se estaba deployando normalmente
- Los workers Cloud Run NO se actualizaron
- El portal sirvio codigo desincronizado
- Nadie recibio alerta

El root cause operativo fue una combinacion: `cancel-in-progress: false` + `Production approval` + commits acumulandose. El Release Watchdog **detecta y alerta este patron en menos de 30 minutos**, garantizando que no vuelva a permanecer invisible.

## Como funciona

### Detectores

El Watchdog corre 3 detectores cada 30 minutos:

| Detector | Que detecta | Cuando alerta |
|---|---|---|
| **Stale approvals** | Runs production esperando approval >24h | warning >24h, error >1 dia, critical >7 dias |
| **Pending sin jobs** | Runs queued/in_progress con `jobs.length=0` | error >5 min sostenido |
| **Worker revision drift** | Cloud Run revision SHA != ultimo workflow run success SHA | error si drift confirmado, warning si data missing |

> **Detalle tecnico**: cada detector es un reader en `src/lib/reliability/queries/release-*.ts`. Los 3 estan registrados en `src/lib/reliability/registry.ts` bajo el subsystem `Platform Release`. Codigo: [release-stale-approval.ts](../../../src/lib/reliability/queries/release-stale-approval.ts), [release-pending-without-jobs.ts](../../../src/lib/reliability/queries/release-pending-without-jobs.ts), [release-worker-revision-drift.ts](../../../src/lib/reliability/queries/release-worker-revision-drift.ts).

### Workflows monitoreados

El Watchdog vigila exclusivamente los 6 workflows que despliegan a produccion:

- `Ops Worker Deploy`
- `Commercial Cost Worker Deploy`
- `ICO Batch Worker Deploy`
- `HubSpot Greenhouse Integration Deploy`
- `Azure Teams Deploy`
- `Azure Teams Bot Deploy`

> **Detalle tecnico**: la lista canonica vive en [src/lib/release/workflow-allowlist.ts](../../../src/lib/release/workflow-allowlist.ts). Cualquier workflow nuevo de deploy production debe agregarse aqui ANTES del primer deploy.

### Cuando se ejecuta

| Trigger | Frecuencia | Donde corre |
|---|---|---|
| **Cron scheduled** | Cada 30 min, automatico | GitHub Actions runner |
| **Manual dispatch** | Bajo demanda | UI Actions o `gh workflow run` |
| **CLI local** | Bajo demanda | Computadora del operador |

> **Detalle tecnico**: workflow [.github/workflows/production-release-watchdog.yml](../../../.github/workflows/production-release-watchdog.yml). El cron `*/30 * * * *` solo activa cuando el workflow esta en la default branch (`main`).

### Como alerta

Cuando un detector encuentra un blocker con severity `warning` o superior:

1. **Verifica dedup**: lookup en `greenhouse_sync.release_watchdog_alert_state` por `(workflow_name, run_id, alert_kind)` para evitar spam
2. **Decide enviar**: si es blocker nuevo, escalation severity, o ultimo alert >24h → enviar
3. **Envia Teams alert** al canal `production-release-alerts` con: titulo + severity + workflow + run ID + URL + accion recomendada
4. **Persiste dedup state** SOLO si Teams send fue exitoso (at-least-once delivery)

Cuando el blocker se resuelve, el Watchdog detecta automaticamente y envia recovery alert + borra el row dedup.

> **Detalle tecnico**: dispatcher canonico [src/lib/release/watchdog-alerts-dispatcher.ts](../../../src/lib/release/watchdog-alerts-dispatcher.ts). Tabla dedup creada en [migrations/20260510122723670_task-849-watchdog-alert-state.sql](../../../migrations/20260510122723670_task-849-watchdog-alert-state.sql). Helper Teams: [src/lib/communications/manual-teams-announcements.ts](../../../src/lib/communications/manual-teams-announcements.ts) destination key `production-release-alerts`.

## Estados del Watchdog

### Severity ladder operativo

```text
ok     →  Todo limpio. No accion.
warning →  Algo emergiendo. Revisar en proximo ciclo.
error   →  Action HOY. Cancel run viejo o investigar.
critical →  INCIDENT MODE. Open postmortem.
unknown →  Config faltante o GitHub/Cloud Run down. NO es bug del watchdog.
```

### Subsystem rollup

Los 3 signals se agregan al subsystem **"Platform Release"** en `/admin/operations`. La severity del subsystem es la maxima de los 3 signals.

> **Detalle tecnico**: rollup logic en `src/lib/reliability/get-reliability-overview.ts`. Module canonical key `platform`, domain `release`.

## Auth y seguridad

### GitHub App (canonical V1.1)

El Watchdog usa un **GitHub App** llamado `Greenhouse Release Watchdog` para consultar GitHub API. NO usa PATs personales.

| Atributo | Valor |
|---|---|
| App ID | `3665723` |
| Installation ID | `131127026` |
| Organization | `efeoncepro` |
| Permissions | Actions:read, Deployments:read, Metadata:read |
| Private key | GCP Secret Manager `greenhouse-github-app-private-key` |

**Beneficios sobre PAT**:

- Token NO ligado a usuario individual (sobrevive si la persona sale del equipo)
- Rate limit 15K req/h vs 5K para PAT personal
- Auditoria per-installation visible en GitHub UI
- Tokens caducos en 1h (renovados automaticamente)

> **Detalle tecnico**: resolver [src/lib/release/github-app-token-resolver.ts](../../../src/lib/release/github-app-token-resolver.ts) mintea JWT firmado con private key (auto-detect PKCS#1/#8) y lo intercambia por installation token con cache 1h. Fallback a PAT solo si GH App no esta configurado.

### Capability granular

Acceso al estado del Watchdog (lectura) requiere `platform.release.watchdog.read`. Reservada para EFEONCE_ADMIN + DEVOPS_OPERATOR + read-only platform observers.

NO confunde con:

- `platform.release.execute` — disparar release production (TASK-848)
- `platform.release.rollback` — disparar rollback (TASK-848)
- `platform.release.bypass_preflight` — break-glass skip preflight

> **Detalle tecnico**: catalog en [src/config/entitlements-catalog.ts](../../../src/config/entitlements-catalog.ts). Migration: [migrations/20260510111229586_task-848-release-control-plane-foundation.sql](../../../migrations/20260510111229586_task-848-release-control-plane-foundation.sql).

## Costos

| Componente | Costo / mes |
|---|---|
| GitHub App | $0 (gratis en cualquier plan) |
| GCP Secret Manager (private key) | ~$0.06/mes (1 secret + ~720 access calls/mes) |
| GitHub Actions runner (cron `*/30 *`) | $0 en plan free GitHub (~720 runs/mes, ~3 min cada uno = ~36 hrs/mes muy debajo del 2000 hrs/mes free tier) |
| Cloud Run gcloud queries | $0 (read-only via API directa) |
| Vercel runtime extra | $0 (3 readers que ya corren al renderizar /admin/operations) |
| **Total** | **~$0.72 / año** |

## Limitaciones conocidas (V1.1)

1. **Per-finding alerts vs aggregate**: el CLI alerta sobre el signal aggregate, no per-workflow individual. Si emerge necesidad operativa de saber QUE workflow + QUE run_id en cada alert, expandir parser de evidence (TASK derivada V1.2).
2. **CI gate workflow allowlist**: si alguien agrega un workflow nuevo de deploy production sin agregarlo al `RELEASE_DEPLOY_WORKFLOWS` en `workflow-allowlist.ts`, el Watchdog NO lo detecta. Sin un CI gate que valide esto, queda como discipline manual.
3. **GH Actions schedule reliability**: GitHub Actions cron puede tener delays >30min en horarios pico GitHub. Para warning threshold 2h es OK; si emerge unreliability sostenida (5+ skipped runs en 7 dias), considerar fallback a Cloud Scheduler.
4. **Workers sin GIT_SHA**: workers deployados pre TASK-849 Slice 1 no tienen `GIT_SHA` env var → `worker_revision_drift` retorna `data_missing`, NO falso positivo. Re-deployar resuelve.

## Roadmap futuro

| Mejora | Cuando | Trigger |
|---|---|---|
| Per-finding alerts (vs aggregate) | V1.2 conditional | Necesidad operativa real reportada por operador |
| CI gate workflow allowlist | V1.2 conditional | Workflow nuevo agregado sin allowlist update detectado |
| GH Actions schedule reliability monitor | V1.2 conditional | 5+ skipped runs en 7 dias |
| Migracion a Cloud Scheduler | V2 conditional | Si GH Actions reliability resulta inadecuada sostenida |
| Dashboard `/admin/releases` UI | TASK-855 V1.1 (TASK-848 follow-up) | Cuando emerja necesidad operativa de UI dedicada |

## Que documentos relacionados leer

- **Manual operativo**: [release-watchdog manual de uso](../../manual-de-uso/plataforma/release-watchdog.md) — paso a paso para operadores
- **Runbook ops**: [production-release-watchdog.md](../../operations/runbooks/production-release-watchdog.md) — flujo detallado + troubleshooting + setup
- **Spec arquitectonica**: [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md) — diseño completo del control plane
- **Hard rules CLAUDE.md**: seccion "Production Release Watchdog invariants (TASK-849)" — invariantes que cualquier agente debe respetar
- **Spec del control plane release**: TASK-848 (foundation) — manifest table, state machine, capabilities
