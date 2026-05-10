> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-10 por Claude
> **Ultima actualizacion:** 2026-05-10 por Claude
> **Documentacion tecnica:** [TASK-850](../../tasks/in-progress/TASK-850-production-preflight-cli-complete.md), [CLAUDE.md §Production Preflight CLI invariants](../../../CLAUDE.md), [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)

# Preflight de Release a Produccion

## Que es

Greenhouse promueve codigo de `develop` (staging) a `main` (production) varias veces al mes. Antes de cada promocion, un CLI canonico (`pnpm release:preflight`) corre 12 verificaciones en paralelo y entrega un dictamen unico: **es seguro promover, si o no**.

El preflight es el primer eslabon del control plane de releases junto al watchdog (alerta en runtime), el orchestrator workflow (dispara el deploy) y el rollback (revierte si algo sale mal). Si el preflight dice `READY`, los demas eslabones tienen base solida; si dice `BLOCKED`, ningun deploy se dispara.

## Por que existe

El incidente 2026-04-26 → 2026-05-09 dejo 4 workflows production en estado `waiting` por dias bloqueando el concurrency group. Cada deploy nuevo cancelaba el anterior sin terminar, los workers Cloud Run quedaron desincronizados con `main`, y se descubrio cuando el dashboard reliability empezo a alertar 14 dias despues. La causa raiz fue: nadie verifico antes de empujar que la cadena GH Actions → Vercel → Cloud Run → Postgres → Sentry estaba healthy.

El preflight cierra ese gap. Es la respuesta a "como se que es seguro deployar production hoy?" en una sola llamada.

## Que verifica (12 checks)

| # | Check | Que verifica |
|---|---|---|
| 1 | target_sha_exists | El commit que vas a deployar existe en el repo (no typo, no force-push borrada) |
| 2 | ci_green | Todos los workflows CI corrieron y pasaron success en ese commit |
| 3 | playwright_smoke | Los smoke tests E2E corrieron y pasaron |
| 4 | release_batch_policy | El diff develop vs main no mezcla dominios independientes ni toca cosas irreversibles sin documentar |
| 5 | stale_approvals | No hay workflows production esperando approval > 24h (sintoma del incidente) |
| 6 | pending_without_jobs | No hay workflows zombie queued con jobs vacios > 5min (sintoma deadlock) |
| 7 | vercel_readiness | El ultimo deploy production en Vercel esta READY |
| 8 | postgres_health | `pg:doctor` reporta DB healthy |
| 9 | postgres_migrations | No hay migrations pendientes (race condition con deploy) |
| 10 | gcp_wif_subject | El WIF provider GCP tiene attribute mapping correcto + state ACTIVE |
| 11 | azure_wif_subject | El Azure App tiene federated credential subject production |
| 12 | sentry_critical_issues | No hay >=10 issues criticos sin resolver en las ultimas 24h |

## Como se decide

Cada check produce una **severity**: `ok | warning | error | unknown`. El composer aplica la regla mas conservadora (worst-of-N):

- Cualquier `error` → status global `BLOCKED` → `readyToDeploy: NO`
- Cualquier `warning` (sin errors) → `DEGRADED` → `readyToDeploy: NO`
- Todos `ok` → `HEALTHY` → `readyToDeploy: SI`
- Mezcla con `unknown` (sin error/warning) → `UNKNOWN` → `readyToDeploy: NO`

Adicionalmente cada check baja la `confidence` global cuando degrada (timeout, error, sin token). Confidence es informativa — no es un gate distinto, ayuda al operador a decidir.

> Detalle tecnico: el composer puro vive en [src/lib/release/preflight/composer.ts](../../../src/lib/release/preflight/composer.ts) y reusa el patron canonico TASK-672 platform-health (Promise.all + withSourceTimeout per source).

## Como integra con el ecosystem

```text
Operador / TASK-851 orchestrator
        |
        | pnpm release:preflight --json --fail-on-error
        v
   ┌────────────────────────────────────┐
   │  Composer + 12 checks en paralelo  │
   └────────────────────────────────────┘
        |
        +-- target_sha_exists  -> GitHub API
        +-- ci_green           -> GitHub API
        +-- playwright_smoke   -> GitHub API
        +-- release_batch_policy -> git diff local
        +-- stale_approvals    -> reusa TASK-848 reader
        +-- pending_without_jobs -> reusa TASK-848 reader
        +-- vercel_readiness   -> Vercel API
        +-- postgres_health    -> subprocess pnpm pg:doctor
        +-- postgres_migrations -> subprocess pnpm pg:connect:status
        +-- gcp_wif_subject    -> gcloud CLI
        +-- azure_wif_subject  -> az CLI
        +-- sentry_critical_issues -> Sentry API
        |
        v
   JSON output (ProductionPreflightV1 v1)
        |
        +-- Operador local lee human output
        +-- TASK-851 orchestrator lee JSON + decide gate
        +-- TASK-855 dashboard lee JSON + render UI
```

## Roles + permisos

3 capabilities granulares (least-privilege, mismo patron TASK-848):

| Capability | Quien tiene | Que habilita |
|---|---|---|
| `platform.release.preflight.execute` | EFEONCE_ADMIN, DEVOPS_OPERATOR | Disparar CLI / orchestrator |
| `platform.release.preflight.read_results` | EFEONCE_ADMIN, DEVOPS_OPERATOR, FINANCE_ADMIN | Leer JSON output desde dashboards |
| `platform.release.preflight.override_batch_policy` | EFEONCE_ADMIN solo | Break-glass del check #4 (downgrade error → warning) con audit |

> Detalle tecnico: [src/config/entitlements-catalog.ts](../../../src/config/entitlements-catalog.ts) (closed enum runtime) + `migrations/20260510144012098_task-850-preflight-capabilities.sql` (DB persistencia con anti pre-up-marker bug guard).

## Costos

- Compute local CLI: <10s end-to-end
- GitHub API: ~5 requests por run (target SHA + workflow runs + pending deployments). Trivial vs rate limit 15K/h GH App.
- Vercel API: 2 requests (production + staging deployments)
- Sentry API: 1 request (issues paginated 100)
- gcloud + az CLI: 1 invocacion cada uno (~2-3s)
- Postgres subprocess: lo que tarde `pg:doctor` + `pg:connect:status` (~5-10s combined)
- **Total: ~10s P95 con todos los tokens configurados**

## Roadmap

| Fase | Estado | Descripcion |
|---|---|---|
| V1.0 (TASK-850) | SHIPPED 2026-05-10 | CLI standalone con 12 checks, JSON + human output, 3 capabilities, 69 tests verdes |
| V1.1 (TASK-851) | Por venir | Orchestrator workflow `production-release.yml` consume el CLI como gate non-bypassable |
| V1.2 (TASK-855) | Por venir | Dashboard UI lee preflight runs historicos + per-check trends |
| V2.0 | Eventual | Promote `release_batch_policy` rules de code constants a PG tabla si change frequency justifica |

## Referencias

- [Manual de uso operador](../../manual-de-uso/plataforma/release-preflight.md)
- [Runbook production-release](../../operations/runbooks/production-release.md)
- [Spec arquitectonica completa GREENHOUSE_RELEASE_CONTROL_PLANE_V1](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
- [Decisions index ADR](../../architecture/DECISIONS_INDEX.md)
