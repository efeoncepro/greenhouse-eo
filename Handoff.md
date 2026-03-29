# Handoff.md

## Uso

Este archivo es el snapshot operativo entre agentes. Debe priorizar claridad y continuidad.

## Sesión 2026-03-29 — TASK-131 creada para separar runtime health vs tooling posture

### Completado
- Se creó `TASK-131` como follow-on explícito del warning residual observado en `production`:
  - `overallStatus=degraded`
  - runtime `postgres/bigquery/observability` sanos
  - gap real concentrado en perfiles Postgres `migrator/admin` no cargados en el runtime del portal
- Decisión recomendada capturada en backlog:
  - no cargar credenciales privilegiadas en `production` solo para poner verde el panel
  - corregir la semántica de `src/lib/cloud/health.ts` y `src/lib/cloud/secrets.ts` para separar runtime crítico de tooling posture

### Pendiente inmediato
- Resolver `TASK-131` en `develop/staging` antes de considerar cualquier workaround con `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` o `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` en el portal productivo.

## Sesión 2026-03-29 — TASK-125 cerrada con validación E2E real en staging

### Completado
- `TASK-125` ya quedó validada end-to-end en `staging`.
- Se confirmó que el proyecto ya tenía `Protection Bypass for Automation` activo en Vercel.
- `WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET` quedó cargado en `staging`.
- La canary subscription `wh-sub-canary` quedó apuntando al deployment protegido con `x-vercel-protection-bypass`.
- Validación real:
  - `eventsMatched=1`
  - `deliveriesAttempted=1`
  - `succeeded=1`
  - `HTTP 200` en el canary
  - `webhook_delivery_id=wh-del-b9dc275a-f5b5-4104-adcd-d9519fa3794c`
- Ajustes de baseline dejados en repo:
  - `seed-canary` usa `finance.income.nubox_synced` como familia activa observada en `staging`
  - el dispatcher ya prioriza eventos `published` más recientes para no hambrear subscriptions nuevas

## Sesión 2026-03-29 — TASK-125 canary soporta bypass opcional de Vercel

### Completado
- `POST /api/admin/ops/webhooks/seed-canary` ya puede registrar el target del canary con bypass opcional de `Deployment Protection`.
- Contrato soportado:
  - `WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET`
  - fallback a `VERCEL_AUTOMATION_BYPASS_SECRET`

## Sesión 2026-03-29 — TASK-125 casi cerrada, bloqueada por Vercel Deployment Protection

### Completado
- `WEBHOOK_CANARY_SECRET_SECRET_REF` quedó cargado en Vercel `staging`.
- El schema de webhooks quedó provisionado en la base usada por `develop/staging`; antes solo existía `outbox_events`.
- Se activó `wh-sub-canary` en DB y se validó el dispatcher con tráfico real:
  - `eventsMatched=3`
  - `deliveriesAttempted=3`
  - attempts registrados en `greenhouse_sync.webhook_delivery_attempts`
- Se verificó también que la base usada por `production/main` ya ve las tablas de webhooks provisionadas.

### Bloqueo real
- El self-loop a `https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/canary` no falla por firma ni por schema.
- Falla por `Vercel Deployment Protection`: los attempts reciben `401 Authentication Required` antes de llegar al route handler.
- El remanente real de `TASK-125` ya no es repo ni Postgres; es definir el mecanismo de bypass/target para que el canary pueda atravesar la protección de Vercel en entornos compartidos.

## Sesión 2026-03-29 — TASK-125 canary alineada a Secret Manager

### Completado
- `src/lib/webhooks/signing.ts` ya no resuelve secretos solo por env plano; ahora usa el helper canónico de Secret Manager.
- Impacto práctico:
  - inbound webhooks
  - outbound deliveries
  - `POST /api/internal/webhooks/canary`
  ya soportan `*_SECRET_REF` además del env legacy.
- `TASK-125` ya no requiere exponer `WEBHOOK_CANARY_SECRET` crudo en Vercel si el secreto ya existe en Secret Manager.

## Sesión 2026-03-29 — TASK-127 creada como follow-on de consolidación Cloud

### Completado
- Se creó `TASK-127` para capturar la siguiente necesidad institucional del dominio Cloud:
  - scorecard semáforo por dominio
  - cleanup de drift documental residual
  - plan corto de “next hardening wave”
- La task no reabre lanes ya cerradas; sirve para consolidar la lectura post-baseline después de `TASK-096`, `TASK-098`, `TASK-099`, `TASK-102`, `TASK-103`, `TASK-124` y `TASK-126`.

## Sesión 2026-03-29 — TASK-102 cerrada

### Completado
- Se completó el restore test end-to-end con el clone efímero `greenhouse-pg-restore-test-20260329d`.
- Verificación SQL real sobre el clone:
  - `payroll_entries=6`
  - `identity_profiles=40`
  - `outbox_events=1188`
  - schemata presentes: `greenhouse_core`, `greenhouse_payroll`, `greenhouse_sync`
- El clone fue eliminado después de validar datos y `gcloud sql instances list` volvió a mostrar solo `greenhouse-pg-dev`.
- `TASK-102` ya no queda abierta:
  - PITR y WAL retention verificados
  - slow query logging con evidencia real en Cloud Logging
  - runtime health confirmado en `staging` y `production`
  - restore verification ya documentada de punta a punta

## Sesión 2026-03-29 — TASK-102 validación externa casi cerrada

### Completado
- Se confirmó postura real de `greenhouse-pg-dev` en GCP:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
  - `sslMode=ENCRYPTED_ONLY`
- `pnpm pg:doctor --profile=runtime` y `pnpm pg:doctor --profile=migrator` pasaron por connector contra `greenhouse-pg-dev`.
- Slow query logging ya quedó verificada con evidencia real en Cloud Logging:
  - `duration: 1203.206 ms`
  - `statement: SELECT pg_sleep(1.2)`
- `staging` y `production` también quedaron revalidadas por `vercel curl /api/internal/health`:
  - `postgres.status=ok`
  - `usesConnector=true`
  - `sslEnabled=true`
  - `maxConnections=15`

### Pendiente inmediato
- En ese momento, el único remanente real de `TASK-102` era el restore test end-to-end.
- Dos clones efímeros fueron creados y limpiados:
  - `greenhouse-pg-restore-test-20260329b`
  - `greenhouse-pg-restore-test-20260329c`
- El primero se eliminó antes de completar la verificación SQL y el segundo quedó demasiado tiempo en `PENDING_CREATE`; ese remanente ya quedó resuelto después con el clone `greenhouse-pg-restore-test-20260329d`.

## Sesión 2026-03-29 — TASK-099 cerrada con `CSP-Report-Only`

### Completado
- `TASK-099` queda cerrada para su baseline segura y reversible.
- `src/proxy.ts` ahora agrega también `Content-Security-Policy-Report-Only` con allowlist amplia para no romper:
  - login `Azure AD` / `Google`
  - MUI / Emotion
  - observabilidad (`Sentry`)
  - assets y uploads
- Validación local ejecutada:
  - `pnpm exec vitest run src/proxy.test.ts`
  - `pnpm exec eslint src/proxy.ts src/proxy.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Decisión explícita
- La task no intenta endurecer a `Content-Security-Policy` enforce.
- Cualquier tightening posterior (`Report-Only` tuning, nonces, eliminación de `unsafe-*`) queda como mejora futura y ya no bloquea el hardening baseline.
- Esa mejora futura ya quedó registrada como `TASK-126`.

## Sesión 2026-03-29 — TASK-099 re-acotada al baseline real

### Completado
- Se revisó `TASK-099` contra el estado real de `src/proxy.ts` y `src/proxy.test.ts`.
- Hallazgo consolidado:
  - el repo ya tiene validado el baseline de headers estáticos
  - la task seguía abierta con criterios mezclados de un lote futuro de `Content-Security-Policy`
- Se re-acotó la task para reflejar correctamente el slice actual:
  - `Status real` pasa a `Slice 1 validado`
  - `CSP` queda explícitamente como follow-on pendiente
  - el baseline ya no exige en falso login/uploads/dashboard bajo `CSP`

### Pendiente inmediato
- Decidir si `CSP` se implementa todavía dentro de `TASK-099` como `Report-Only` o si conviene derivarla a una task nueva para no inflar esta lane.

## Sesión 2026-03-29 — TASK-096 cerrada

### Completado
- `TASK-096` deja de seguir `in-progress` y pasa a `complete`.
- Razón de cierre:
  - baseline WIF-aware ya validada en `preview`, `staging` y `production`
  - hardening externo de Cloud SQL ya aplicado
  - la Fase 3 de Secret Manager ya quedó absorbida y cerrada por `TASK-124`
- La task queda como referencia histórica del track cloud, no como lane activa.

## Sesión 2026-03-29 — TASK-098 cerrada en `production`

### Completado
- `production` recibió el merge `main <- develop` en `bcbd0c3`.
- Se cargaron las variables externas de observabilidad en `production`:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- Hubo que reescribir `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF` en `production` y redeployar para corregir drift de la ref.
- Deployment validado:
  - `dpl_5fyHqra7AgV865QmHSuZ2iqYWcYk`
  - `GET /api/internal/health` con `postureChecks.observability.status=ok`
  - `GET /api/auth/session` con respuesta `{}`
- `TASK-098` ya puede moverse a `complete`.

### Pendiente no bloqueante
- Rotar el webhook de Slack expuesto en una captura previa.

## Sesión 2026-03-29 — TASK-098 validación end-to-end en `staging`

### Completado
- Se confirmó que `staging` ya no tiene solo postura configurada, sino observabilidad operativa real:
  - `vercel curl /api/internal/health --deployment dpl_G5L2467CPUF6T2GxEaoB3tWhB41K`
  - `observability.summary=Sentry runtime + source maps listos · Slack alerts configuradas`
  - `postureChecks.observability.status=ok`
- Smoke real de Slack:
  - envío con el webhook resuelto desde `greenhouse-slack-alerts-webhook`
  - respuesta `HTTP 200`
- Smoke real de Sentry:
  - se emitió `task-098-staging-sentry-smoke-1774792462445`
  - el issue quedó visible en el dashboard del proyecto `javascript-nextjs`
- Hallazgo importante:
  - el único remanente operativo de `TASK-098` ya no está en `develop/staging`
  - queda concentrado en `main/production`

### Pendiente inmediato
- Replicar en `production`:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- Validar `main/production` con smoke equivalente antes de mover `TASK-098` a `complete`
- Rotar el webhook de Slack expuesto en una captura previa cuando se decida hacerlo

## Sesión 2026-03-29 — TASK-098 Secret Manager slice para Slack alerts

### Completado
- Se abrió `feature/codex-task-098-observability-secret-refs` desde `develop`.
- `SLACK_ALERTS_WEBHOOK_URL` quedó alineado al helper canónico:
  - valor legacy `SLACK_ALERTS_WEBHOOK_URL`
  - ref opcional `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
  - resolución efectiva `Secret Manager -> env fallback`
- `GET /api/internal/health` ahora refleja esta resolución real tanto en `observability` como en `secrets`.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/alerts/slack-notify.test.ts src/lib/cloud/observability.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec eslint src/lib/alerts/slack-notify.ts src/lib/alerts/slack-notify.test.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/cloud/secrets.ts src/lib/cloud/secrets.test.ts src/app/api/internal/health/route.ts`
  - `pnpm exec tsc --noEmit --pretty false`

### Decisión explícita
- `CRON_SECRET` sigue `env-only`:
  - moverlo a Secret Manager haría asíncrono `requireCronAuth()` y abriría un cambio transversal en múltiples routes
- `SENTRY_AUTH_TOKEN` sigue `env-only`:
  - hoy se consume en `next.config.ts` durante build
- `SENTRY_DSN` también se deja fuera de este slice:
  - el path client (`NEXT_PUBLIC_SENTRY_DSN`) lo vuelve config pública/operativa, no un secreto crítico prioritario

## Sesión 2026-03-29 — TASK-098 validada en `develop/staging`

### Completado
- `develop` absorbió el slice mínimo de Sentry en `ac11287`.
- El deployment compartido `dev-greenhouse.efeoncepro.com` quedó `READY` sobre ese commit.
- Validación autenticada de `GET /api/internal/health`:
  - `version=ac11287`
  - Postgres `ok`
  - BigQuery `ok`
  - `observability.summary=Observabilidad externa no configurada`
- Hallazgo importante:
  - el repo ya tiene el adapter `src/lib/alerts/slack-notify.ts`
  - los hooks de `alertCronFailure()` ya existen en `outbox-publish`, `webhook-dispatch`, `sync-conformed`, `ico-materialize` y `nubox-sync`
  - por lo tanto el cuello de botella actual de `TASK-098` ya no es de código repo, sino de configuración externa en Vercel

### Pendiente inmediato
- Cargar en Vercel las variables externas de observabilidad:
  - `SENTRY_DSN` o `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL`
- Revalidar `GET /api/internal/health` y confirmar que `postureChecks.observability` deje de salir `unconfigured`.

## Sesión 2026-03-29 — TASK-098 retoma Sentry mínimo sobre branch dedicada

### Completado
- Se retomó `TASK-098` desde `feature/codex-task-098-sentry-resume` sobre una base donde `develop` ya absorbió el baseline de `TASK-098` y `TASK-099`.
- Quedó reconstruido y validado el wiring mínimo de Sentry para App Router:
  - `next.config.ts` con `withSentryConfig`
  - `src/instrumentation.ts`
  - `src/instrumentation-client.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
- La postura de observabilidad quedó endurecida para distinguir:
  - DSN runtime total
  - DSN público (`NEXT_PUBLIC_SENTRY_DSN`)
  - auth token
  - org/project
  - readiness de source maps
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec eslint next.config.ts src/instrumentation.ts src/instrumentation-client.ts sentry.server.config.ts sentry.edge.config.ts src/lib/cloud/contracts.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Pendiente inmediato
- Push de esta branch para obtener Preview Deployment y validar que `/api/internal/health` refleje la postura nueva de Sentry.
- Solo después de esa verificación, decidir si este slice pasa a `develop`.

## Sesión 2026-03-29 — TASK-099 iniciada sobre `develop`

### Completado
- `develop` absorbió el baseline sano de `TASK-098` (`4167650`, `4d485f4`) y el fix de compatibilidad `3463dc8`.
- Se abrió `feature/codex-task-099-security-headers` desde ese `develop` ya integrado.
- `TASK-099` pasa a `in-progress` con un primer slice mínimo:
  - nuevo `src/proxy.ts`
  - headers estáticos cross-cutting
  - matcher conservador para no tocar `_next/*` ni assets
  - `Strict-Transport-Security` solo en `production`

### Pendiente inmediato
- validar lint, tests, `tsc` y `build` del middleware
- decidir si el siguiente slice de `TASK-099` introduce CSP en `Report-Only` o la difiere hasta después de retomar `TASK-098`

## Sesión 2026-03-29 — TASK-098 iniciada con slice seguro de postura

### Completado
- `TASK-098` pasó a `in-progress`.
- Se eligió un primer slice sin integraciones externas para no romper el runtime ya estabilizado:
  - nuevo `src/lib/cloud/observability.ts`
  - `GET /api/internal/health` ahora incluye `observability`
  - el payload proyecta si existen `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` y `SLACK_ALERTS_WEBHOOK_URL`
- El contrato de `GET /api/internal/health` quedó separado en:
  - `runtimeChecks` para dependencias que sí definen `200/503`
  - `postureChecks` para hallazgos operativos que degradan señal pero no cortan tráfico
  - `overallStatus` y `summary` como resumen estable para futuras integraciones
- `GET /api/internal/health` ahora expone también `postgresAccessProfiles`:
  - `runtime`
  - `migrator`
  - `admin`
  manteniendo `postgres` solo para postura runtime del portal
- `.env.example` quedó alineado con esas variables.

### Pendiente inmediato
- Instalar y configurar `@sentry/nextjs`
- decidir si el siguiente slice conecta primero Slack alerts o Sentry
- validar este contrato nuevo en preview antes de cablear integraciones externas

## Sesión 2026-03-29 — TASK-124 validada en `staging`

### Completado
- Se armó una integración mínima desde `origin/develop` para no arrastrar el resto de `feature/codex-task-096-wif-baseline`.
- `develop` quedó promovido a `497cb19` con los tres slices de `TASK-124`:
  - helper canónico `src/lib/secrets/secret-manager.ts`
  - postura de secretos en `GET /api/internal/health`
  - migración de `NUBOX_BEARER_TOKEN`, Postgres secret refs y auth/SSO (`NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`)
- Validación local sobre la base integrada:
  - `pnpm exec eslint ...`
  - `pnpm exec vitest run src/lib/secrets/secret-manager.test.ts src/lib/cloud/secrets.test.ts src/lib/nubox/client.test.ts src/lib/postgres/client.test.ts scripts/lib/load-greenhouse-tool-env.test.ts src/lib/auth-secrets.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm pg:doctor --profile=runtime`
- Rollout externo ya preparado:
  - secretos nuevos creados en GCP Secret Manager para `staging` y `production`
  - `*_SECRET_REF` cargados en Vercel `staging` y `production`
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/secretmanager.secretAccessor` sobre los secretos nuevos
- Validación compartida en `staging`:
  - `dev-greenhouse.efeoncepro.com/api/internal/health` respondió `200`
  - `version=497cb19`
  - `GREENHOUSE_POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET` y `NUBOX_BEARER_TOKEN` reportan `source=secret_manager`
- Ajuste externo mínimo posterior:
  - el secreto heredado `greenhouse-pg-dev-app-password` no tenía IAM para el runtime service account
  - se agregó `roles/secretmanager.secretAccessor` para `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
  - luego de ese binding, `GREENHOUSE_POSTGRES_PASSWORD` pasó también a `source=secret_manager` en `staging`

### Pendiente inmediato
- `production` sigue pendiente de validación real; no se promovió a `main` en esta sesión.
- El remanente ya no es de código en `staging`, sino de rollout/control:
  - decidir cuándo retirar env vars legacy
  - decidir si `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` deben quedar proyectados en el health runtime del portal

## Sesión 2026-03-29 — TASK-096 WIF-aware baseline en progreso

### Completado
- `TASK-096` pasó a `in-progress` sobre el estado actual del repo.
- El repo ya quedó WIF-aware sin romper el runtime actual:
  - `src/lib/google-credentials.ts` resuelve `wif | service_account_key | ambient_adc`
  - el helper ahora también sabe pedir el token OIDC desde runtime Vercel con `@vercel/oidc`, no solo desde `process.env.VERCEL_OIDC_TOKEN`
  - `src/lib/bigquery.ts`, `src/lib/postgres/client.ts`, `src/lib/storage/greenhouse-media.ts` y `src/lib/ai/google-genai.ts` consumen el helper canónico
  - `src/lib/ai/google-genai.ts` ya no usa temp file para credenciales
- Scripts con parsing manual de `GOOGLE_APPLICATION_CREDENTIALS_JSON` quedaron alineados al helper central:
  - `check-ico-bq`
  - `backfill-ico-to-postgres`
  - `materialize-member-metrics`
  - `backfill-task-assignees`
  - `backfill-postgres-payroll`
  - `admin-team-runtime-smoke`
- Arquitectura y docs vivas alineadas:
  - `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
  - `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `project_context.md`
  - `changelog.md`
- Rollout externo ya avanzado y validado sin bigbang:
  - existe Workload Identity Pool `vercel` y provider `greenhouse-eo` en `efeonce-group`
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` ya tiene bindings `roles/iam.workloadIdentityUser` para `development`, `preview`, `staging` y `production`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_SERVICE_ACCOUNT_EMAIL` ya quedaron cargadas en Vercel
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` quedó cargada en Vercel para preparar el cutover hacia Cloud SQL Connector
  - validación local con OIDC + WIF:
    - BigQuery respondió OK sin SA key
    - Cloud SQL Connector respondió `SELECT 1` sin SA key usando `runGreenhousePostgresQuery()`
  - validación real en preview Vercel:
    - se completó el env set mínimo de la branch `feature/codex-task-096-wif-baseline`
    - se forzó redeploy del preview
    - `greenhouse-i3cak6akh-efeonce-7670142f.vercel.app/api/internal/health` respondió `200 OK`
    - posture observada:
      - `auth.mode=wif`
      - BigQuery reachable
      - Cloud SQL reachable con connector e `instanceConnectionName=efeonce-group:us-east4:greenhouse-pg-dev`

### Validación
- `pnpm exec eslint src/lib/google-credentials.ts src/lib/google-credentials.test.ts src/lib/bigquery.ts src/lib/postgres/client.ts src/lib/storage/greenhouse-media.ts src/lib/ai/google-genai.ts scripts/check-ico-bq.ts scripts/backfill-ico-to-postgres.ts scripts/materialize-member-metrics.ts scripts/backfill-task-assignees.ts scripts/backfill-postgres-payroll.ts scripts/admin-team-runtime-smoke.ts`
- `pnpm exec vitest run src/lib/google-credentials.test.ts src/lib/cloud/gcp-auth.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- Smoke adicional externo:
  - BigQuery con `VERCEL_OIDC_TOKEN` y WIF sin SA key
  - Cloud SQL Connector con `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev` y query `SELECT 1::int as ok`

### Pendiente inmediato
- Limpiar drift de Vercel env antes del endurecimiento final:
  - las variables activas del rollout WIF/conector ya fueron corregidas en Vercel
  - el paso pendiente ya no es el formato, sino cerrar el baseline WIF final en `develop/staging`
- Aclarar y corregir el mapa de ambientes Vercel:
  - `dev-greenhouse.efeoncepro.com` ya quedó confirmado como `target=staging`
  - tras redeploy del staging activo respondió `version=7a2ecec`, `auth.mode=mixed` y `usesConnector=true`
- Camino seguro elegido:
  - no desplegar la feature branch al entorno compartido `staging`
  - mantener el flujo `feature -> preview -> develop/staging -> main`
- Validar el entorno compartido con WIF final después de mergear a `develop`, antes de retirar `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- Cerrar Fase 1 externa de Cloud SQL:
  - remover `0.0.0.0/0`
  - pasar `sslMode` a `ENCRYPTED_ONLY`
  - activar `requireSsl=true`
- No declarar `TASK-096` cerrada todavía: el repo quedó listo, pero la postura cloud real sigue transicional.

## Sesión 2026-03-29 — TASK-115 Nexa UI Completion (4 slices)

### Completado
- **Slice A**: Edit inline de mensajes user — pencil hover button + EditComposer con ComposerPrimitive (Guardar/Cancelar)
- **Slice B**: Follow-up suggestions (chips clicables desde `suggestions` del backend) + feedback thumbs (👍/👎 fire-and-forget a `/api/home/nexa/feedback`)
- **Slice C**: Nexa floating portal-wide — FAB sparkles fixed bottom-right, panel 400×550 en desktop, Drawer bottom en mobile, hidden en `/home`
- **Slice D**: Thread history sidebar (Drawer izquierdo, lista agrupada por fecha, new/select thread) + threadId tracking en adapter + NexaPanel.tsx eliminado

### Archivos nuevos
- `src/views/greenhouse/home/components/NexaThreadSidebar.tsx`
- `src/components/greenhouse/NexaFloatingButton.tsx`

### Archivos modificados
- `src/views/greenhouse/home/components/NexaThread.tsx` — edit inline, feedback, suggestions, compact mode, history toggle
- `src/views/greenhouse/home/HomeView.tsx` — threadId tracking, suggestions state, sidebar integration
- `src/app/(dashboard)/layout.tsx` — NexaFloatingButton montado

### Archivos eliminados
- `src/views/greenhouse/home/components/NexaPanel.tsx` (legacy)

## Sesión 2026-03-29 — TASK-122 desarrollada y cerrada

### Completado
- `TASK-122` quedó desarrollada y cerrada como base documental del dominio Cloud.
- Se creó `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` como operating model canónico para institucionalizar `Cloud` como capa interna de platform governance.
- Se agregó una baseline real de código en `src/lib/cloud/*`:
  - `contracts.ts` para checks y snapshots
  - `health.ts` para checks compartidos de Postgres y BigQuery
  - `bigquery.ts` para cost guards base (`maximumBytesBilled`)
  - `cron.ts` para postura mínima de control plane sobre `CRON_SECRET`
- El documento deja explícito:
  - boundary entre `Admin Center`, `Cloud & Integrations` y `Ops Health`
  - control families del dominio Cloud
  - qué debe vivir en UI, qué en code/helpers y qué en runbooks/config
  - el framing operativo de `TASK-100`, `TASK-101`, `TASK-102` y `TASK-103`
- `TASK-100` a `TASK-103` quedaron actualizadas para referenciar esta base, evitando redecidir ownership y scope en cada ejecución.
- `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` quedaron alineados con `TASK-122` en `complete`.
- La conexión con la UI ya es total:
  - `getOperationsOverview()` ahora expone `cloud`
  - `Admin Center`, `Cloud & Integrations` y `Ops Health` consumen el snapshot institucional del dominio Cloud
  - la UI deja de reflejar solo integrations/ops aislados y pasa a mostrar runtime health, cron posture y BigQuery guard

### Pendiente inmediato
- La base ya está lista para ejecutar `TASK-100` a `TASK-103` con framing consistente del dominio Cloud

## Sesión 2026-03-29 — TASK-100 CI test step en progreso

### Completado
- `TASK-100` pasó a `in-progress` como primera lane activa del bloque Cloud hardening.
- `.github/workflows/ci.yml` ahora ejecuta `pnpm test` entre `Lint` y `Build`, con `timeout-minutes: 5`.
- La validación local previa confirmó que la suite actual es apta para CI:
  - `99` archivos de test
  - `488` pruebas verdes
  - runtime total `6.18s`

### Pendiente inmediato
- Confirmar la primera corrida real en GitHub Actions en el próximo push.
- Mantener el commit aislado de `TASK-115`, porque el árbol sigue teniendo cambios paralelos en `Home/Nexa` no relacionados con CI.

## Sesión 2026-03-29 — TASK-100 y TASK-101 cerradas

### Completado
- `TASK-100` quedó cerrada:
  - `.github/workflows/ci.yml` ahora ejecuta `pnpm test` entre `Lint` y `Build`
  - el step de tests tiene `timeout-minutes: 5`
- `TASK-101` quedó cerrada:
  - nuevo helper `src/lib/cron/require-cron-auth.ts`
  - `src/lib/cloud/cron.ts` ahora expone estado del secret y detección reusable de Vercel cron
  - migración de `19` rutas scheduler-driven sin auth inline
  - los endpoints `POST` de Finance preservan fallback a `requireFinanceTenantContext()` cuando no vienen como cron autorizado
- Validación de cierre:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

### Pendiente inmediato
- La siguiente lane del bloque solicitado queda en `TASK-102`, con `TASK-103` después.
- El árbol sigue teniendo cambios paralelos de `TASK-115` en Home/Nexa; no mezclar esos archivos al stage del lote Cloud.

## Sesión 2026-03-29 — Cloud layer robustness expansion

### Completado
- La capa `src/lib/cloud/*` quedó reforzada antes de entrar a `TASK-096`:
  - `src/lib/cloud/gcp-auth.ts` modela la postura runtime GCP (`wif`, `service_account_key`, `mixed`, `unconfigured`)
  - `src/lib/cloud/postgres.ts` modela la postura Cloud SQL (`connector`, `ssl`, `pool`, riesgos)
  - `src/app/api/internal/health/route.ts` expone health institucional para deploy/runtime validation
  - `src/lib/alerts/slack-notify.ts` deja listo el adapter base para alertas operativas
- `getOperationsOverview()` ahora proyecta también posture de auth GCP y posture de Cloud SQL.
- Se agregaron hooks de `alertCronFailure()` a los crons críticos:
  - `outbox-publish`
  - `webhook-dispatch`
  - `sync-conformed`
  - `ico-materialize`
  - `nubox-sync`

### Pendiente inmediato
- `TASK-096` ya puede apoyarse en una postura GCP explícita en código en vez de partir solo desde env vars sueltas.
- `TASK-098` ya no necesita inventar desde cero el health endpoint ni el adapter Slack.
- En ese momento `TASK-099`, `TASK-102` y `TASK-103` seguían abiertas, pero hoy solo queda `TASK-103` como remanente del bloque cloud baseline.

## Sesión 2026-03-29 — TASK-102 en progreso

### Completado
- Cloud SQL `greenhouse-pg-dev` quedó con:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
- `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15` quedó aplicado y verificado en:
  - `Production`
  - `staging`
  - `Preview (develop)`
- El repo quedó alineado:
  - `src/lib/postgres/client.ts` ahora usa `15` como fallback por defecto
  - `.env.example` documenta `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15`
- Validación ejecutada:
  - `pnpm pg:doctor --profile=runtime`
  - `pnpm pg:doctor --profile=migrator`
  - `gcloud sql instances describe greenhouse-pg-dev`
  - `vercel env pull` por entorno para confirmar el valor efectivo

### Pendiente inmediato
- Terminar el restore test:
  - clone iniciado: `greenhouse-pg-restore-test-20260329`
  - seguía en `PENDING_CREATE` al cierre de esta actualización
- Cuando el clone quede `RUNNABLE`:
  - verificar tablas críticas
  - documentar resultado
- Este remanente ya quedó resuelto después con el clone `greenhouse-pg-restore-test-20260329d`.
  - eliminar la instancia efímera

## Sesión 2026-03-29 — TASK-114 backend Nexa + cierre TASK-119/TASK-120

### Completado
- `TASK-114` quedó implementada y cerrada:
  - nuevo store server-only `src/lib/nexa/store.ts`
  - validación de readiness para `greenhouse_ai.nexa_threads`, `greenhouse_ai.nexa_messages`, `greenhouse_ai.nexa_feedback`
  - migración canónica `scripts/migrations/add-nexa-ai-tables.sql` ya aplicada con perfil `migrator`
  - endpoints:
    - `POST /api/home/nexa/feedback`
    - `GET /api/home/nexa/threads`
    - `GET /api/home/nexa/threads/[threadId]`
  - `/api/home/nexa` ahora persiste conversación, retorna `threadId` y genera `suggestions` dinámicas
- `TASK-119` cerrada:
  - verificación manual confirmada para `login -> /auth/landing -> /home`
  - fallback interno y sesiones legadas ya normalizan a `/home`
  - `Control Tower` deja de operar como home y el pattern final queda absorbido por `Admin Center`
- `TASK-120` cerrada por absorción:
  - `/internal/dashboard` redirige a `/admin`
  - el follow-on separado ya no era necesario como lane autónoma
- `TASK-115` quedó actualizada con delta para reflejar que su backend ya está disponible
- `GREENHOUSE_DATA_MODEL_MASTER_V1.md` ya reconoce `nexa_threads`, `nexa_messages` y `nexa_feedback` dentro de `greenhouse_ai`

### Validación
- `pnpm pg:doctor --profile=runtime`
- `pnpm pg:doctor --profile=migrator`
- `pnpm exec tsx scripts/run-migration.ts scripts/migrations/add-nexa-ai-tables.sql --profile=migrator`
- `pnpm exec eslint src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/lib/nexa/nexa-service.test.ts src/lib/nexa/store.ts src/app/api/home/nexa/route.ts src/app/api/home/nexa/feedback/route.ts src/app/api/home/nexa/threads/route.ts src/app/api/home/nexa/threads/[threadId]/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/nexa/nexa-service.test.ts`
- verificación runtime directa de `greenhouse_ai.nexa_threads`, `greenhouse_ai.nexa_messages` y `greenhouse_ai.nexa_feedback` bajo perfil `runtime`

### TASK-121 Admin Center Hardening (5 slices cerrados)
- **Slice 1**: Sorting por todas las columnas en AdminCenterSpacesTable (TableSortLabel)
- **Slice 2**: `loading.tsx` skeleton para `/admin` (hero, KPIs, tabla 8 filas, domain cards)
- **Slice 3**: Health real en domain cards — Cloud & Integrations y Ops Health consumen `getOperationsOverview`
- **Slice 4**: Deep-link con `searchParams` — `/admin?filter=attention&q=empresa` funciona
- **Slice 5**: Bloque "Requiere atencion" con alertas consolidadas cross-dominio

### Pendiente inmediato
- `TASK-115` pasa a ser la siguiente lane natural de Nexa UI porque ya tiene backend real para feedback, suggestions y thread history
- Si se quiere endurecer `TASK-114` más adelante:
  - agregar tests específicos para `src/lib/nexa/store.ts`
  - decidir si el route principal de Nexa debe responder `404/400` en `threadId` inválido en vez de caer al handler genérico
  - agregar smoke o tests de route para ownership y feedback

## Sesión 2026-03-29 — Admin Center + Control Tower unificado

### Completado
- **Admin Center landing redesign v2**: Control Tower absorbido como sección dentro de `/admin`
  - Hero (gradiente purple→cyan) → 4 ExecutiveMiniStatCards → Torre de control (tabla MUI limpia 5 cols, sin scroll horizontal) → Mapa de dominios (outlined cards ricos con avatar, bullets, CTA)
  - Nuevo componente `AdminCenterSpacesTable.tsx`: MUI Table size='small', 5 columnas (Space, Estado, Usuarios, Proyectos, Actividad), paginación 8 filas, filter chips + search + export
  - `/internal/dashboard` redirige a `/admin` (backward compat)
  - Sidebar: removido item "Torre de control" de Gestión; UserDropdown apunta a `/admin`
- `TASK-119` movida a `in-progress`.
- Se aplicó el cutover base de landing para internos/admin:
  - fallback de `portalHomePath` ahora cae en `/home` en vez de `/internal/dashboard`
  - `Home` pasa a ser la entrada principal interna en sidebar y dropdown
  - `Control Tower` queda preservado como surface especialista dentro de `Gestión` y en sugerencias globales
- Se corrigió el drift que seguía mandando a algunos usuarios a `'/internal/dashboard'`:
  - `resolvePortalHomePath()` ahora normaliza también el valor legado en `NextAuth jwt/session`
  - si la sesión trae `'/internal/dashboard'` como home histórico para un interno/admin, el runtime lo reescribe a `'/home'` sin depender de un relogin manual
- Se mantuvieron intactos los landings especializados:
  - `hr_*` sigue cayendo en `/hr/payroll`
  - `finance_*` sigue cayendo en `/finance`
  - `collaborator` puro sigue cayendo en `/my`

### Validación
- `pnpm exec eslint src/lib/tenant/access.ts src/config/greenhouse-nomenclature.ts src/components/layout/vertical/VerticalMenu.tsx src/components/layout/shared/UserDropdown.tsx src/components/layout/shared/search/DefaultSuggestions.tsx src/app/auth/landing/page.tsx src/app/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/auth.ts src/lib/tenant/access.ts src/lib/tenant/resolve-portal-home-path.ts src/lib/tenant/resolve-portal-home-path.test.ts`
- `pnpm exec vitest run src/lib/tenant/resolve-portal-home-path.test.ts`

### Pendiente inmediato
- drift documental resuelto en la sesión posterior: `TASK-119` y `TASK-120` ya no quedan abiertas

## Sesión 2026-03-28 — Resumen

### Completado
- **TASK-104**: Payroll export email redesign (subject español, desglose por régimen, plain text profesional)
- **TASK-106**: Email delivery admin UI en Control Tower (historial + suscripciones + retry)
- **TASK-009 Slice A+B**: Fix del freeze de Home Nexa (timeouts, try/catch, error boundary)
- **TASK-009 Slice E**: NexaPanel migrado a `@assistant-ui/react` con LocalRuntime
- **TASK-009 Home Redesign**: UX prompt-first tipo Notion AI (NexaHero + NexaThread + QuickAccess + OperationStatus)
- **TASK-110**: Spec completo de Nexa assistant-ui feature adoption (29 componentes catalogados)
- **TASK-110 Lane A**: Nexa backend operativo con tool calling real a payroll, OTD, emails, capacidad y facturas; `/api/home/nexa` devuelve `toolInvocations` y Home renderiza cards mínimas inline
- **GREENHOUSE_NEXA_ARCHITECTURE_V1.md**: Doc canónico de Nexa creado
- **TASK-095**: Spec completo (Codex implementó la capa)
- **TASK-111**: Secret ref governance UI — tabla con dirección, auth, owner, scope, estado governance en `/admin/cloud-integrations`
- **TASK-112**: Integration health/freshness UI — tabla con LinearProgress, stale thresholds (6h/24h/48h) en `/admin/cloud-integrations`
- **TASK-113**: Ops audit trail UI — ActivityTimeline con actor, resultado, follow-up en `/admin/ops-health`
- **TASK-110 Lane B / Slice 1**: NexaThread con ActionBar Copy+Reload, Send/Cancel toggle, ScrollToBottom, error UI, animaciones; NexaHero con suggestions self-contained; adapter con throw errors

### Pendiente inmediato

| Prioridad | Task | Qué falta |
|-----------|------|-----------|
| 1 | TASK-110 Slice 1b | EditComposer inline, FollowupSuggestions (requiere backend), deprecar NexaPanel.tsx |
| 2 | TASK-110 Slice 4 | Nexa flotante portal-wide (AssistantModalPrimitive) |
| 5 | TASK-119 | Rollout final de `/home`, `portalHomePath`, sidebar y cutover de `Control Tower` |
| 6 | TASK-120 | Role scoping fino y verification bundle de `Admin Center` |

### Notas de staging
- `dev-greenhouse.efeoncepro.com/home` funcional (Gemini responde, Home carga)
- Chat UI ahora tiene Copy, Reload, Cancel, ScrollToBottom, error states y animaciones (Lane B / Slice 1)
- CI falla por lint debt preexistente (TASK-105), no por cambios de esta sesión
- Playwright MCP registrado en `~/.claude/settings.json`

### Prioridad operativa vigente — hardening `TASK-098` a `TASK-103`
- Orden recomendado: `TASK-100` → `TASK-101` → `TASK-098` → `TASK-099` → `TASK-102` → `TASK-103`.
- Rationale corto: primero guardrails baratos y transversales, luego cron auth, después observabilidad, middleware, resiliencia DB y finalmente costos.

### Prioridad operativa vigente — HRIS `TASK-025` a `TASK-031`
- Orden recomendado: `TASK-026` → `TASK-030` → `TASK-027` → `TASK-028` → `TASK-029` → `TASK-031` → `TASK-025`.
- Rationale corto: primero consolidar el modelo canónico de contratación que desbloquea elegibilidad y branches futuras; luego onboarding/offboarding y document vault como valor operativo inmediato; después expenses, goals y evaluaciones; `TASK-025` se mantiene al final porque sigue en `deferred`.

### Prioridad operativa vigente — Staff Aug `TASK-038` y `TASK-041`
- `TASK-038` se mantiene importante como línea comercial, pero posterior al bloque HRIS operativo y siempre implementada sobre la baseline moderna de Staff Aug, no sobre el brief original.
- `TASK-041` se trata como addendum de integración entre Staff Aug y HRIS; no compite como lane inmediata y debería entrar solo después de `TASK-026` y del baseline efectivo de Staff Aug.

### Prioridad operativa vigente — backlog global `to-do`
- Top ROI ahora: `TASK-100` → `TASK-101` → `TASK-072` → `TASK-098` → `TASK-026` → `TASK-109` → `TASK-117` → `TASK-030`.
- Siguiente ola: `TASK-027` → `TASK-028` → `TASK-116` → `TASK-067` → `TASK-068` → `TASK-070` → `TASK-011` → `TASK-096`.
- Estratégicas pero caras: `TASK-008` → `TASK-005` → `TASK-069` → `TASK-118` → `TASK-018` → `TASK-019`.
- Later / oportunistas: `TASK-029` → `TASK-031` → `TASK-015` → `TASK-016` → `TASK-020` → `TASK-115` → `TASK-107` → `TASK-099` → `TASK-102` → `TASK-103` → `TASK-021` → `TASK-032` → `TASK-053` → `TASK-054` → `TASK-055` → `TASK-058` → `TASK-059` → `TASK-071`.
- No gastar tokens ahora: `TASK-025`, `TASK-033` a `TASK-038`, `TASK-039`, `TASK-041`.

### Hallazgo de backlog
- `TASK-106` ya quedó movida formalmente a `complete`; `TASK-108` puede seguir tratándola como dependencia cerrada dentro de `Admin Center`.

### Release channels y changelog client-facing
- Se documento la policy canonica de releases en `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`.
- Greenhouse operara releases principalmente por modulo/feature visible, con canal opcional de plataforma y disponibilidad separada por `internal | pilot | selected_tenants | general`.
- El esquema de versionado quedo ajustado a modelo hibrido: `CalVer + canal` para modulos/producto visible y `SemVer` solo para APIs o contratos tecnicos versionados.
- Se creo `docs/changelog/CLIENT_CHANGELOG.md` como fuente curada para cambios client-facing; `changelog.md` raiz sigue siendo tecnico-operativo.
- La policy ya incluye una baseline inicial por modulo con version/canal/tag sugerido a `2026-03-29`; los tags reales quedaron pendientes hasta cerrar un commit limpio que represente ese snapshot.

### Nueva task documentada
- `TASK-117` creada en `to-do`: policy de Payroll para dejar el período oficial en `calculated` el último día hábil del mes operativo, reutilizando la utility de calendario y sin alterar el lifecycle base `draft -> calculated -> approved -> exported`.
- La task también deja explícito que `payroll_period.calculated` debería notificar a Julio Reyes y Humberly Henríquez vía `NotificationService`/email delivery, idealmente como consumer reactivo del dominio `notifications`.

### Cierre administrativo de tasks cercanas
- `TASK-009` quedó en `complete` como baseline principal de `Home + Nexa v2`.
- Lo pendiente de `TASK-009` se repartió así:
  - `TASK-119` para rollout final de `/home`, `portalHomePath`, sidebar y cutover de `Control Tower`
  - `TASK-110` sigue como owner de la evolución funcional y visual de Nexa
- `TASK-108` quedó en `complete` como baseline del shell de `Admin Center`.
- Lo pendiente de `TASK-108` se deriva a `TASK-120` para role scoping fino, convivencia con surfaces especialistas y verificación manual consolidada.
- Drift documental corregido en pipeline:
  - `TASK-074` ya no debe tratarse como activa
  - `TASK-110` se trata como `in-progress`
  - `TASK-111`, `TASK-112` y `TASK-113` se tratan como `complete`

### Sesión 2026-03-28 — TASK-110 Lane A
- Archivos tocados: `src/lib/nexa/nexa-tools.ts`, `src/lib/nexa/nexa-service.ts`, `src/app/api/home/nexa/route.ts`, `src/views/greenhouse/home/HomeView.tsx`, `src/views/greenhouse/home/components/NexaToolRenderers.tsx`, docs de task/handoff/changelog.
- Decisión de implementación: mantener la UI actual de `/home`, exponer `toolInvocations` desde backend y mapearlos a `tool-call` parts de assistant-ui. Lane B puede reemplazar el renderer mínimo sin rehacer contratos ni lógica.
- Ajuste adicional de esta sesión: Nexa ya soporta selección de modelo en UI con allowlist segura usando IDs reales de Vertex: `google/gemini-2.5-flash@default`, `google/gemini-2.5-pro@default`, `google/gemini-3-flash-preview@default`, `google/gemini-3-pro-preview@default` y `google/gemini-3.1-pro-preview@default`.
- Claude en Vertex quedó verificado como disponibilidad de plataforma, pero no está conectado al runtime de Nexa; requerirá provider/capa de integración separada.
- Validación ejecutada:
  - `pnpm exec eslint src/app/api/home/nexa/route.ts src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/lib/nexa/nexa-service.test.ts src/lib/nexa/nexa-tools.ts src/views/greenhouse/home/HomeView.tsx src/views/greenhouse/home/components/NexaToolRenderers.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm exec vitest run src/lib/nexa/nexa-service.test.ts`
- Validación adicional del switch:
  - `pnpm exec eslint src/config/nexa-models.ts src/config/nexa-models.test.ts src/lib/ai/google-genai.ts src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/app/api/home/nexa/route.ts src/views/greenhouse/home/HomeView.tsx src/views/greenhouse/home/components/NexaHero.tsx src/views/greenhouse/home/components/NexaThread.tsx src/views/greenhouse/home/components/NexaModelSelector.tsx`
  - `pnpm exec vitest run src/config/nexa-models.test.ts src/lib/nexa/nexa-service.test.ts`
- No se tocó `.env.staging-check`.
