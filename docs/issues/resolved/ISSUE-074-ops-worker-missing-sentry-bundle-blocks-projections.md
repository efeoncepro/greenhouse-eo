# ISSUE-074 — ops-worker missing `@sentry/nextjs` bundle bloquea reactive projections

> **Estado:** Resolved
> **Detectado:** 2026-05-09 durante smoke test post-merge PR #113 (TASK-836 follow-up)
> **Resuelto:** 2026-05-09 19:30:04Z (verified live end-to-end)
> **Severidad:** Alta — bloquea sync end-to-end de webhooks HubSpot services + cualquier projection que invoque `captureWithDomain`
> **Detectado por:** Claude (smoke test verification)
> **Resolución canónica:** TASK-844 (Cross-Runtime Observability: Sentry Init Canónico para Cloud Run Services)

## Resolución (TASK-844, 2026-05-09)

**Decisión arquitectónica adoptada**: Reemplazar `@sentry/nextjs` por `@sentry/node` en wrapper canónico + helper `initSentryForService` invocado por cada Cloud Run service.

**8 slices completados end-to-end en develop**:
- Slice 1: switch wrapper a `@sentry/node` (runtime-portable)
- Slice 2: helper canónico `services/_shared/sentry-init.ts` (8 tests verdes)
- Slice 3: ops-worker init + Dockerfile COPY + deploy.sh secret mount opcional
- Slice 3b: HUBSPOT_ACCESS_TOKEN secret mount (gap descubierto en smoke)
- Slice 4: mirror commercial-cost-worker + ico-batch
- Slice 5: reliability signal `observability.cloud_run.silent_failure_rate` (9 tests verdes)
- Slice 6: lint rule `greenhouse/cloud-run-services-must-init-sentry` (10 tests verdes, modo `error`)
- Slice 7: CLAUDE.md Hard Rule canonizada (8 reglas + 3 capas defense-in-depth)
- Slice 8: spec + close (este).

**Smoke test verificación live (2026-05-09 19:30:04Z)**:
- PATCH HubSpot service `551522263821` `ef_engagement_kind`: regular→trial
- Webhook arrived 19:26:27 (~1s post-PATCH)
- Outbox event `outbox-131d128c-...` published 19:28:03 (cron */2min)
- Reactive consumer `hubspot_services_intake` materialized=1/1 failures=0 a 19:30:04
- `greenhouse_core.services.engagement_kind` = 'trial' (matches PATCH) ✅
- `hubspot_last_synced_at` actualizado 52s post-materialization ✅
- Revert `engagement_kind` regular completado

**Anti-regresión activa**:
1. Lint rule `greenhouse/cloud-run-services-must-init-sentry` modo `error` bloquea commits que crean `services/<svc>/server.ts` con import `@/lib/**` sin init.
2. Reliability signal `observability.cloud_run.silent_failure_rate` cuenta `outbox_reactive_log.last_error LIKE '%captureException is not a function%'` últimas 24h. Steady=0.
3. Cloud Logging stderr fallback siempre disponible.

**Spec canónica**: `docs/tasks/complete/TASK-844-cross-runtime-observability-sentry-init.md` (movida post Slice 8).

---

## Histórico — descripción original

## Síntoma

Cuando una projection registrada en `src/lib/sync/projections/` corre en el ops-worker (Cloud Run) y necesita capturar un error con `captureWithDomain(err, 'domain', ...)`, falla con:

```
Sentry.captureException is not a function
```

El error se persiste en `greenhouse_sync.outbox_reactive_log.last_error` con `result='retry'` y la projection nunca completa su trabajo. El outbox event queda en loop hasta agotar `OUTBOX_MAX_PUBLISH_ATTEMPTS`.

## Impacto operativo

**Específicamente confirmado en producción 2026-05-09T18:30:38Z:**

- Webhook HubSpot service `551522263821` (Aguas Andinas) llegó correctamente a `webhook_inbox_events` (status=processed).
- Outbox event `outbox-bd980077-3a93-4959-896c-246a49ff2bc8` emitido y publicado.
- Reactive consumer `hubspot_services_intake:commercial.service_engagement.intake_requested` falló al primer intento con el error Sentry.
- `greenhouse_core.services.hubspot_last_synced_at` para ese service NO se actualizó (sigue en `2026-05-09 13:41:42` del backfill TASK-836).

**Implicancia más amplia**: TASK-813b (async intake p_services HubSpot via webhook → outbox → reactive consumer) **nunca ha funcionado end-to-end en producción** desde su deploy. La única razón por la que no había evidencia previa es que TASK-836 follow-up (PR #113, fix dual-format webhook) era el bug upstream que dropeaba todos los events 2025.2 antes de llegar a la projection. Hoy 2026-05-09 con el fix dual-format desplegado, los events finalmente llegan al consumer y exponen este segundo root cause.

## Causa raíz

`captureWithDomain` (`src/lib/observability/capture.ts`) es el wrapper canónico para Sentry y hace `import * as Sentry from '@sentry/nextjs'`. La función `Sentry.captureException` se llama en línea 68.

`services/ops-worker/package.json` **NO tiene `@sentry/nextjs` como dependencia**. El bundle esbuild de ops-worker usa `--packages=external`, que mantiene los imports como referencias resueltas en runtime contra `node_modules`. Como el package no está instalado, el require falla silenciosamente y `Sentry.captureException` queda como `undefined`.

`services/ops-worker/Dockerfile` tiene aliases para `next-auth`, `next/server`, `next/headers`, `server-only` (shims), pero **no para `@sentry/nextjs`**. El package legítimamente nunca ingresa al bundle.

## Verificación

```bash
# 1. Confirmar package missing
grep sentry services/ops-worker/package.json
# (no output)

# 2. Confirmar el use site en projection
grep -n captureWithDomain src/lib/sync/projections/hubspot-services-intake.ts
# múltiples invocaciones en error paths

# 3. Confirmar el chain del wrapper
grep -n Sentry src/lib/observability/capture.ts
# import * as Sentry from '@sentry/nextjs' (línea 1)
# Sentry.captureException(...) (línea 68)
```

## Solución propuesta (3 opciones, ordenadas por preferencia)

### Opción A — Sentry shim minimal en ops-worker (recommended)

Crear `services/ops-worker/sentry-shim.js` con un módulo dummy que expone `captureException`, `captureMessage`, `setTag`, `withScope` como no-ops. Agregar alias en `Dockerfile`:

```dockerfile
--alias:@sentry/nextjs=./sentry-shim.js
```

Ventaja: zero new dependencies, mismo patrón que los otros shims (next-auth, next/server, server-only). El captureWithDomain fallback graceful se preserva — los errors se loggean a stderr (Cloud Logging captura) pero no van a Sentry desde ops-worker. Sentry sigue funcionando 100% en Vercel handlers donde `@sentry/nextjs` está disponible.

Drawback: pierde observability de Sentry para errores que ocurren dentro de ops-worker. Mitigación: Cloud Logging + reliability signals downstream.

### Opción B — Agregar `@sentry/nextjs` real a ops-worker

Agregar a `services/ops-worker/package.json`:
```json
"@sentry/nextjs": "^9.x"
```

Requiere init explícito en `services/ops-worker/server.ts`:
```ts
import * as Sentry from '@sentry/nextjs'
Sentry.init({ dsn: process.env.SENTRY_DSN, ... })
```

Ventaja: Sentry funciona end-to-end también en ops-worker.

Drawback: `@sentry/nextjs` está pensado para apps Next.js (instrumenta server actions, route handlers). En un Cloud Run service generic Node, agrega overhead innecesario. Mejor usar `@sentry/node` directo si vamos por esta vía.

### Opción C — Refactor `captureWithDomain` con dynamic import

Modificar `src/lib/observability/capture.ts` para hacer dynamic import de Sentry:

```ts
let SentryModule: typeof import('@sentry/nextjs') | null = null
const getSentry = async () => {
  if (SentryModule) return SentryModule
  try {
    SentryModule = await import('@sentry/nextjs')
    return SentryModule
  } catch {
    return null
  }
}

export const captureWithDomain = async (err, domain, ctx) => {
  const Sentry = await getSentry()
  if (!Sentry) {
    console.error(`[${domain}] error (Sentry unavailable):`, err)
    return null
  }
  return Sentry.captureException(err, { tags: { domain }, ...ctx })
}
```

Ventaja: graceful fallback en runtimes sin Sentry. No requiere shim ni dep nueva.

Drawback: cambia la firma de `captureWithDomain` de sync a async. Requiere actualizar ~50+ callsites en el repo. Alta superficie, alto riesgo de regresión.

## Recomendación

**Opción A** (shim). Es la consistente con el patrón ops-worker actual (next-auth, server-only shims), zero new deps, preserva el comportamiento de Sentry en el path donde sí está activo (Vercel), y degrada honestamente en ops-worker.

## Próximos pasos

1. Implementar Opción A en una task derivada (TASK-844 o similar).
2. Re-deploy ops-worker.
3. Re-correr smoke test del webhook handler (PATCH `ef_engagement_kind`) y verificar `hubspot_last_synced_at` actualiza < 30s post-projection-cron-tick.
4. Cerrar este issue cuando el chain end-to-end webhook → PG core.services esté verificado vivo.

## Tareas asociadas

- **TASK-836 follow-up** (cerrada hoy 2026-05-09): fix dual-format webhook handler. EL fix funciona — fue lo que hizo que este issue saliera a la luz.
- **TASK-813b** (Slice b de TASK-813): async intake p_services. La projection `hubspot_services_intake` afectada está bloqueada hasta que esto se resuelva.

## Workaround temporal

Mientras el fix esté pendiente, las actualizaciones automáticas de services HubSpot via webhook NO se materializan en `greenhouse_core.services`. Para mantener sync:

1. **Manual sync**: `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/services/backfill-from-hubspot.ts --apply`
2. **Cron diario** (TASK-536) eventualmente captura los cambios — sweep diario.
3. **HubSpot retry policy**: HubSpot reintenta webhooks que fallan up to 10x — pero como el webhook responde 200 (status processed en inbox), HubSpot no reintenta. La pérdida es permanente hasta backfill manual.

**Hard rule**: no marcar TASK-813b como funcional end-to-end hasta cerrar este issue.
