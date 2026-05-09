# TASK-844 — Cross-Runtime Observability: Sentry Init Canónico para Cloud Run Services

## Status

- Lifecycle: `in-progress`
- Priority: `P0` (bloquea TASK-813b webhook→PG sync end-to-end)
- Impact: `Alto` — 207 callsites de `captureWithDomain` en `src/lib/` operan ciegas en 3 Cloud Run services hoy
- Effort: `Medio` — 8 slices, ~5-7h trabajo end-to-end
- Type: `hardening`
- Domain: `platform` / `observability`
- Blocked by: `none`
- Branch: `develop` (instrucción del usuario, sin branch dedicada)
- Closes: `ISSUE-074`

## Summary

Cierra el runtime polymorphism gap de `src/lib/observability/capture.ts`. Hoy importa `@sentry/nextjs` (Next.js-específico) y eso quiebra silentemente en `ops-worker`, `commercial-cost-worker`, `ico-batch` (3 Cloud Run Node services genéricos). Reemplaza por `@sentry/node` runtime-portable + helper canónico `initSentryForService` invocado por cada Cloud Run service en su `server.ts` antes de cualquier import de `@/lib/**`.

Detectado durante smoke test post-merge PR #113 (TASK-836 follow-up): `hubspot_services_intake` projection falla con `Sentry.captureException is not a function`. El fix dual-format del webhook handler funciona, pero el pipeline async se rompe en el reactive consumer porque ops-worker nunca tuvo Sentry inicializado.

## Architectural decision (canonical)

**Reemplazar `@sentry/nextjs` por `@sentry/node` en el wrapper canónico**. `@sentry/node` es el underlying SDK que `@sentry/nextjs` envuelve — corre tanto en Next.js server runtime como en generic Node. El hub de Sentry es global singleton: si Vercel inicializa via `@sentry/nextjs` y código compartido importa `@sentry/node`, accede al mismo hub.

### 4-pillar score

| Pillar | Eval |
|---|---|
| **Safety** | ✅ Cero cambios a 207 callsites (mismo signature). Blast radius: 1 wrapper + 4 service entry points. DSN missing = graceful no-op. Reversible. |
| **Robustness** | ✅ 4 runtimes uniformes. Sentry hub idempotente ante doble init. Errores SDK nunca bloquean path principal (Sentry no-op fallback interno). |
| **Resilience** | ✅ Reliability signal nuevo `observability.cloud_run_silent_failure_rate`. Cloud Logging stderr fallback siempre. PG `outbox_reactive_log.last_error` audit redundante. |
| **Scalability** | ✅ Helper `services/_shared/sentry-init.ts` reusable por N futuros Cloud Run services (1-line invoke). Sin overhead per-service. UN DSN, NO scaling per-service Sentry projects. |

### Alternativas rechazadas

| Opción | Razón rechazo |
|---|---|
| Shim `@sentry/nextjs` no-op (Opt A ISSUE-074) | Sacrifica observabilidad. Errors Cloud Run desaparecen silente. |
| Agregar `@sentry/nextjs` real a ops-worker (Opt B) | SDK incorrecto — requiere Next.js framework hooks. |
| Dynamic import async (Opt C) | Cambia API sync→async. Rompe 207 callsites. |
| Per-service Sentry projects | Operacionalmente caro. Ya rechazado en `capture.ts` doc. |

## Implementation Slices

### Slice 1 — Foundation: switch wrapper a `@sentry/node`

- Edit `src/lib/observability/capture.ts`: `import * as Sentry from '@sentry/nextjs'` → `import * as Sentry from '@sentry/node'`
- Add `@sentry/node` como dep explícita en root `package.json`
- Verificar tests existentes verdes (Vercel runtime path)
- **Test fixture nuevo**: `src/lib/observability/capture.test.ts` — tests unitarios del wrapper con mock de `@sentry/node`

**Verification criteria**:
- `pnpm test src/lib/observability/capture` verde
- `npx tsc --noEmit` clean
- `pnpm build` verde (Vercel build path)
- Sentry.captureException sigue siendo invocada con misma shape de tags/extra/level

**Rollback plan**: Edit↔Edit reversible. Si Vercel runtime falla post-deploy, revert commit.

### Slice 2 — Canonical service init helper

- Crear `services/_shared/sentry-init.ts` con `initSentryForService(serviceName)`:
  - Lee `SENTRY_DSN` env var
  - DSN missing → `console.warn` + early return (graceful degradation)
  - DSN present → `Sentry.init({ dsn, environment, serverName, release })`
  - Idempotente (Sentry hub singleton tolera doble init)

- Tests: `services/_shared/sentry-init.test.ts`:
  - `initSentryForService('test')` con DSN=undefined → no throw, console.warn called
  - `initSentryForService('test')` con DSN set → Sentry.init invoked con shape correcto
  - Doble invocación segura (idempotente)

**Verification criteria**:
- Tests Vitest verdes
- TypeScript clean

### Slice 3 — ops-worker init + cierre ISSUE-074

- `services/ops-worker/server.ts` línea 1 (antes de cualquier otro import): `import { initSentryForService } from '../_shared/sentry-init'; initSentryForService('ops-worker')`
- `services/ops-worker/Dockerfile` no cambia (pnpm install --prod ya tiene @sentry/node tras Slice 1)
- `services/ops-worker/deploy.sh`: agregar `--update-secrets=SENTRY_DSN=sentry-dsn:latest` (verificar secret name canónico)
- Re-deploy ops-worker via GitHub Actions workflow `ops-worker-deploy.yml` o `bash services/ops-worker/deploy.sh` manual (autorizar primero)
- Smoke test live:
  - PATCH HubSpot service `551522263821` (Aguas Andinas) `ef_engagement_kind` regular→pilot
  - Verificar `webhook_inbox_events` status=processed (~1s)
  - Verificar `outbox_events` status=published (~2min via Cloud Scheduler ops-outbox-publish)
  - Verificar `outbox_reactive_log` result=success (no más Sentry error)
  - Verificar `greenhouse_core.services.hubspot_last_synced_at` actualiza < 30s post-publish
  - Revertir PATCH (pilot → regular)

**Verification criteria**:
- Smoke test pasa end-to-end
- ISSUE-074 movido a `resolved/`

### Slice 4 — Mirror a otros Cloud Run Node services

- `services/commercial-cost-worker/server.ts`: agregar `initSentryForService('commercial-cost-worker')`
- `services/ico-batch/server.ts`: agregar `initSentryForService('ico-batch')`
- Update deploy.sh respectivos con `SENTRY_DSN` secret
- **NOTA**: `services/hubspot_greenhouse_integration/` es Python, fuera de scope (si tiene Sentry init, es otro path).

**Verification criteria**:
- Tests deploy contract por servicio (si existen)
- Re-deploy queda gated tras autorización del usuario

### Slice 5 — Reliability signal anti-regresión

- Reader: `src/lib/reliability/queries/observability-cloud-run-silent-failures.ts`
- Detecta: count > 0 de filas en `outbox_reactive_log` con `last_error LIKE '%captureException is not a function%'` últimos 24h
- Wire-up en `getReliabilityOverview` bajo subsystem existente `Identity & Access` o nuevo `Observability Health`
- Steady state = 0
- Tests: 4 casos (zero/warning/degraded reader/SQL anti-regresión)

**Verification criteria**:
- Tests Vitest verdes
- Signal aparece en `/admin/operations` con steady=0 post-deploy

### Slice 6 — Lint rule mecánica

- `eslint-plugins/greenhouse/rules/cloud-run-services-must-init-sentry.mjs`
- Detecta: archivos `services/*/server.ts` (no `_shared/`) que importan `@/lib/**` sin `initSentryForService` call previa en el archivo
- Modo `warn` durante slice 4-5; promueve a `error` después de slice 7

**Verification criteria**:
- Rule corre clean en repo actual (post Slice 4)
- Rule falla intencionalmente si remuevo `initSentryForService` de un service.ts

### Slice 7 — CLAUDE.md Hard Rule

- Sección nueva en CLAUDE.md: "Cross-runtime observability — Sentry init invariant"
- Incluye:
  - Tabla 4 runtimes × init path canónico
  - Hard rules NUNCA/SIEMPRE
  - Helper canónico signature
  - Reliability signal anti-regresión

### Slice 8 — Spec canonization + close

- Update `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` Delta 2026-05-09 con runtime polymorphism contract
- Update Handoff.md + changelog.md con resolución
- Move ISSUE-074 a resolved con bitácora live
- Lifecycle complete + sync `docs/tasks/README.md`

## Hard Rules canonizadas

```
NUNCA importar `@sentry/nextjs` directamente en código bajo `src/lib/`. Usar wrapper
canónico `captureWithDomain` que abstrae `@sentry/node` runtime-portable.

NUNCA crear nuevo Cloud Run Node service sin `initSentryForService(name)` como primera
llamada en `server.ts`, antes de cualquier import de `@/lib/**`. Lint rule lo bloquea.

NUNCA invocar `Sentry.captureException()` directo en code path con dominio claro. Usar
`captureWithDomain(err, '<domain>', { extra })` desde `src/lib/observability/capture.ts`.

SIEMPRE que un nuevo runtime aparezca, validar que `@sentry/node` corre allí. La
superficie de import nunca cambia.
```

## Dependencies & Impact

**Depende de**: nada. Fix arquitectónico independiente.

**Impacta a**:
- `src/lib/observability/capture.ts` (1 archivo cambia)
- `services/_shared/sentry-init.ts` (archivo nuevo)
- `services/ops-worker/server.ts`, `services/commercial-cost-worker/server.ts`, `services/ico-batch/server.ts` (1-line addition cada uno)
- `services/*/deploy.sh` (1-line secret mount cada uno)
- 207 callsites de `captureWithDomain` en `src/lib/**` — **NO cambian** (mismo signature)
- Sentry billing — sin cambio (mismo DSN)

**Cierra**: ISSUE-074

## Open questions deliberadas

- **Tracing/Performance Monitoring**: out of scope. `tracesSampleRate: 0` en Slice 2 mantiene status quo.
- **Source maps en Cloud Run release tracking**: follow-up post-cierre, no bloquea ISSUE-074.
- **Per-domain alert rules en Sentry UI**: trabajo manual ops, no arquitectura.

## Verification end-to-end (post Slice 3)

Smoke test canónico replicable:
1. PATCH HubSpot service via `curl` con `HUBSPOT_ACCESS_TOKEN`
2. Verificar `webhook_inbox_events` status=processed < 5s
3. Verificar `outbox_events` aggregate_id=service_id status=published < 2min
4. Verificar `outbox_reactive_log` result=success (sin Sentry error)
5. Verificar `greenhouse_core.services.hubspot_last_synced_at` actualiza
6. Revertir PATCH

## Lifecycle history

- `2026-05-09 18:35` — ISSUE-074 detectado durante smoke test post-merge PR #113
- `2026-05-09 18:50` — TASK-844 spec creada con autorización del usuario para implementación end-to-end en develop
