# TASK-098 — Observability MVP (Sentry + Health + Slack Alerts)

## Delta 2026-03-29 — Lane iniciada con posture de observabilidad

- `TASK-098` pasa a `in-progress`.
- Slice inicial elegido por seguridad y reversibilidad:
  - formalizar postura de observabilidad en `GET /api/internal/health`
  - proyectar si existen `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` y `SLACK_ALERTS_WEBHOOK_URL`
  - dejar tests unitarios del contrato antes de conectar integraciones externas reales
- Fuera de este primer lote:
  - instalar `@sentry/nextjs`
  - wiring real de Slack alerts en crons
  - rollout de variables en Vercel

## Delta 2026-03-29 — Baseline parcial absorbida por TASK-124

- Parte del endurecimiento del payload de `GET /api/internal/health` ya fue absorbido por `TASK-124`:
  - ahora proyecta postura de secretos críticos sin exponer valores
  - el remanente de esta task ya no es crear ese bloque, sino completar observabilidad externa y el contract final del endpoint

## Delta 2026-03-29 — Baseline cloud ya adelantada

- Parte del baseline ya quedó adelantado:
  - `GET /api/internal/health` ya existe
  - la capa cloud ya proyecta postura de auth, Postgres y secretos
- Lo pendiente real de esta task se concentra ahora en:
  - integración Sentry
  - endurecimiento del payload/contract del health endpoint
  - wiring operativo final de `SLACK_ALERTS_WEBHOOK_URL`

## Delta 2026-03-29 — Slice 1 implementado

- `GET /api/internal/health` ahora proyecta también `observability`.
- El contract del endpoint quedó separado en:
  - `runtimeChecks`
  - `postureChecks`
  - `overallStatus`
  - `summary`
- `503` sigue dependiendo solo de checks runtime; posture incompleta ahora se reporta como `degraded`.
- Nuevo contrato mínimo:
  - `sentry.dsnConfigured`
  - `sentry.authTokenConfigured`
  - `sentry.enabled`
  - `slack.alertsWebhookConfigured`
  - `slack.enabled`
  - `summary`
- Nueva capa canónica:
  - `src/lib/cloud/observability.ts`
- Variables documentadas en `.env.example`:
  - `SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SLACK_ALERTS_WEBHOOK_URL`
- Sigue pendiente:
  - integración real de `@sentry/nextjs`
  - wiring real de Slack alerts en crons críticos

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Implementación` |
| Rank | — |
| Domain | Infrastructure / Observability |
| Sequence | Cloud Posture Hardening **3 of 6** — after TASK-100, TASK-099 |

## Summary

Implementar observabilidad mínima viable: Sentry para error tracking automático, endpoint `/api/internal/health` para validación de deploy, y Slack webhook para alertas de crons críticos. Hoy el 100% de los errores en producción son silenciosos.

## Why This Task Exists

Greenhouse tiene 18 cron jobs (outbox cada 5 min, webhook dispatch cada 2 min, materialización diaria), 238 API routes, y múltiples pipelines de sync — todo con `console.error()` como único "monitoring". Si un cron falla, una projection se corrompe, o una conexión a Cloud SQL se agota, nadie se entera hasta que un usuario reporta el síntoma.

### Evidencia del gap

- **171 `console.error/warn/log`** distribuidos en 109 archivos — sin destino externo
- **Zero health checks** — Vercel deploys no validan conectividad post-deploy
- **Zero alerting** — cron failures, webhook dead-letters, pool exhaustion son todos silenciosos
- **Zero request tracing** — sin correlation IDs, sin request context en errores
- **Error boundaries** solo en 2 componentes client-side (`SectionErrorBoundary`, `TenantDetailErrorBoundary`)

## Goal

Que cualquier error no-manejado en producción sea capturado, deduplicado y notificado en <5 minutos. Que cada deploy valide conectividad a servicios críticos antes de aceptar tráfico.

## Architecture Alignment

- Patrón Next.js: `instrumentation.ts` hook (stable en Next.js 15+)
- Sentry SDK: `@sentry/nextjs` (server + client + edge)
- Health check: server-only route sin auth
- Slack: webhook URL simple, sin bot ni app

## Dependencies & Impact

- **Depende de:**
  - TASK-096 Fase 1 (Cloud SQL network hardening) — el health check valida conectividad post-hardening
  - Cuenta Sentry (free tier: 5K errores/mes, 1 usuario)
  - Slack webhook URL configurado
- **Impacta a:**
  - TASK-096 Fase 2-3 — health check puede validar WIF y Secret Manager
  - TASK-101 (Cron Auth) — estandarizar crons facilita agregar alerting consistente
  - TASK-102 (DB Resilience) — health check valida pool y slow queries
  - Todas las tasks futuras — errores se capturan automáticamente sin código adicional
- **Archivos owned:**
  - `src/instrumentation.ts` (nuevo)
  - `sentry.client.config.ts` (nuevo)
  - `sentry.server.config.ts` (nuevo)
  - `sentry.edge.config.ts` (nuevo)
  - `src/app/api/internal/health/route.ts` (nuevo)
  - `src/lib/alerts/slack-notify.ts` (nuevo)

## Scope

### Slice 1 — Sentry Integration (~4h)

1. `pnpm add @sentry/nextjs`
2. Ejecutar `npx @sentry/wizard@latest -i nextjs` para scaffold
3. Configurar `sentry.server.config.ts`:
   ```typescript
   import * as Sentry from '@sentry/nextjs'

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.VERCEL_ENV ?? 'development',
     tracesSampleRate: 0.1,  // 10% de traces (suficiente para 1 dev)
     beforeSend(event) {
       // Filtrar errores de desarrollo
       if (process.env.NODE_ENV === 'development') return null
       return event
     },
   })
   ```
4. Configurar `sentry.client.config.ts` con replay deshabilitado (no necesario)
5. Crear `src/instrumentation.ts`:
   ```typescript
   export async function register() {
     if (process.env.NEXT_RUNTIME === 'nodejs') {
       await import('../sentry.server.config')
     }
     if (process.env.NEXT_RUNTIME === 'edge') {
       await import('../sentry.edge.config')
     }
   }
   ```
6. Agregar `SENTRY_DSN` a Vercel env vars (production + staging)
7. Agregar `SENTRY_AUTH_TOKEN` para source maps en build
8. Verificar que errores llegan al dashboard de Sentry

### Slice 2 — Health Endpoint (~2h)

1. Crear `src/app/api/internal/health/route.ts`:
   ```typescript
   export async function GET() {
     const checks = {
       postgres: await checkPostgres(),
       bigquery: await checkBigQuery(),
       timestamp: new Date().toISOString(),
       version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
       environment: process.env.VERCEL_ENV ?? 'development',
     }

     const healthy = checks.postgres.ok && checks.bigquery.ok
     return Response.json(checks, { status: healthy ? 200 : 503 })
   }
   ```
2. `checkPostgres()`: ejecutar `SELECT 1` con timeout de 5s
3. `checkBigQuery()`: ejecutar query liviana con timeout de 5s
4. Sin auth (es health check — pero no exponer detalles internos en el body si unhealthy)
5. Integrar con Sentry cron monitoring si se usa Sentry Crons feature

### Slice 3 — Slack Alerts para Crons Críticos (~2h)

1. Crear `src/lib/alerts/slack-notify.ts`:
   ```typescript
   const SLACK_WEBHOOK_URL = process.env.SLACK_ALERTS_WEBHOOK_URL

   export async function alertCronFailure(cronName: string, error: unknown) {
     if (!SLACK_WEBHOOK_URL) return

     await fetch(SLACK_WEBHOOK_URL, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         text: `:warning: *Cron failure: ${cronName}*\n\`\`\`${String(error).slice(0, 500)}\`\`\`\nEnv: ${process.env.VERCEL_ENV ?? 'unknown'}`,
       }),
     }).catch(() => {}) // fire-and-forget, no fallar por el alert
   }
   ```
2. Integrar en los 5 crons más críticos:
   - `/api/cron/outbox-publish` (cada 5 min — motor del outbox)
   - `/api/cron/webhook-dispatch` (cada 2 min — delivery de webhooks)
   - `/api/cron/sync-conformed` (diario — sync pipeline)
   - `/api/cron/ico-materialize` (diario — métricas ICO)
   - `/api/cron/nubox-sync` (diario — datos tributarios)
3. Agregar `SLACK_ALERTS_WEBHOOK_URL` a Vercel env vars
4. Crear canal `#greenhouse-alerts` en Slack workspace

## Out of Scope

- Datadog, New Relic, o APM con costo ($$$)
- OpenTelemetry distributed tracing (monolito, no aplica)
- Structured logging library (Pino/Winston) — Sentry captura lo que importa
- Uptime monitoring externo (Pingdom, Better Uptime) — health endpoint lo habilita para futuro
- Métricas custom de negocio (projection latency, outbox throughput) — mejora futura
- Request correlation IDs — mejora futura post-Sentry

## Acceptance Criteria

- [ ] `@sentry/nextjs` instalado y configurado
- [ ] `instrumentation.ts` registra Sentry en server y edge
- [ ] Un error forzado en staging aparece en Sentry dashboard en <2 min
- [ ] `GET /api/internal/health` retorna 200 con estado de Postgres y BigQuery
- [ ] `GET /api/internal/health` retorna 503 si algún servicio no responde
- [ ] `alertCronFailure()` envía mensaje a Slack cuando un cron falla
- [ ] Los 5 crons críticos tienen alerting integrado
- [ ] `SENTRY_DSN` y `SLACK_ALERTS_WEBHOOK_URL` configurados en Vercel
- [ ] Source maps subidos a Sentry en build
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

```bash
# Sentry
curl -X POST https://dev-greenhouse.efeoncepro.com/api/test-sentry-error  # (temporal)
# Verificar en Sentry dashboard

# Health
curl -s https://dev-greenhouse.efeoncepro.com/api/internal/health | jq .

# Slack (simular fallo de cron)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://dev-greenhouse.efeoncepro.com/api/cron/outbox-publish
# Verificar #greenhouse-alerts
```
