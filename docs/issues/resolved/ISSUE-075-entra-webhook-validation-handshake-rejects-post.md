# ISSUE-075 — Entra webhook validation handshake rejects POST (subscription create/renew fails)

> **Estado:** Resolved 2026-05-13 — fix + hardening shipped a producción via canonical orchestrator release (run `25825280928`, manifest `e02cb32e9c30-5acb894c-f164-486c-99c0-074d42aefbeb`, target_sha `e02cb32e9c3049c2993cfc5d7767e9a9c804da90`). All 4 Cloud Run workers + Vercel production deploy on target SHA, post-release watchdog SUCCESS (zero drift), post-release health green.
> **Detectado:** 2026-05-13 06:00:03 -04 vía Sentry alert `JAVASCRIPT-NEXTJS-4T`
> **Severidad:** Alta — bloquea creación/renovación de Microsoft Graph webhook subscription para Entra ID user changes. Cuando la subscription expira, Greenhouse pierde 100% de notifications de cambios de profiles (resolución vía cron diario `entra-profile-sync` de respaldo, pero con latencia ~24h vs <10s nativo)
> **Canal de detección:** Sentry (project `javascript-nextjs`, environment `production`)
> **Origen del error:** Cloud Run `ops-worker` cron `entra-webhook-renew` (TASK-775 lane)
> **Domain rollup:** `identity` (subsystem `Identity & Access`)

## Ambiente

production (ops-worker Cloud Run + notification endpoint en Vercel Next.js).

## Detectado

2026-05-13 06:00:03 a.m. -04 — primera ejecución del cron `ops-entra-webhook-renew` (schedule `0 6 */2 * * America/Santiago`) tras expiración / pérdida de la subscription existente en Microsoft Graph. Error capturado por `wrapCronHandler` con `domain: 'identity'` y emitido a Sentry vía `captureWithDomain`.

Sentry event ID: `a7964f96092746378de8b706f06fd7f4`.

## Síntoma

Cron `entra-webhook-renew` falla con:

```
Error: [entra-webhook] Subscription creation failed (400):
{"error":{"code":"ValidationError",
 "message":"Subscription validation request failed. HTTP status code is 'BadRequest'.
            Notification endpoint must respond with 200 OK to validation request.",
 "innerError":{"date":"2026-05-13T10:00:03",
               "request-id":"c6d2ba21-dbde-44af-88c0-162e54c60591"}}}
```

Stack (Cloud Run server.mjs):
- `createOrRenewSubscription` (line 79490)
- `runEntraWebhookRenew` (line 82777)
- HTTP handler (line 85226)

Cron retry exhausts → next attempt 2 días después con mismo bug class hasta fix.

## Causa raíz

Boundary contract incompleto con Microsoft Graph webhook subscription validation handshake.

Microsoft Graph valida la `notificationUrl` enviando una request con `?validationToken=xxx` query param. El endpoint debe responder `200 OK` con el token echoed en `text/plain` dentro de 10 segundos. Históricamente la validation era `GET`, pero en versiones actuales de Graph API v1 Microsoft envía **POST**.

El handler POST en `src/app/api/webhooks/entra-user-change/route.ts` (HEAD pre-fix `86890bae`):

1. NO leía `validationToken` del query string
2. Iba directo a `body.parse()` + validación de `clientState` con el body
3. Body es `null` (Microsoft NO envía body durante el handshake) o `clientState` mismatch
4. Respondía 400/401 al handshake → Microsoft Graph rechaza la subscription create con `ValidationError`

El handler GET sí respondía correctamente al token, pero Microsoft NO usa GET para el handshake.

**Por qué emerge ahora**: la subscription existente (creada en una iteración pasada) seguía vigente mientras PATCH renew (que NO triggera handshake) funcionara. Cuando la subscription expira (~3 días sin PATCH exitoso) o el `subscriptionId` persistido apunta a una subscription que Microsoft ya purgó, el flow cae al path `POST /subscriptions` (create new) → handshake → falla determinístico.

## Impacto

- Microsoft Graph subscription para cambios de users (`/users` resource, `changeType: 'updated'`) NO puede crearse ni renovarse → blast radius: 1 integration crítica
- Greenhouse pierde notifications en tiempo real de cambios de profiles en Entra ID
- Mitigación natural: cron diario `entra-profile-sync` (separate path) sigue corriendo y resincroniza state via Graph API GET. Latencia degrada de <10s a ~24h máximo
- Reporting hierarchy governance scans (que dispara el handler POST de notifications) NO corre por cambios reales → drift puede acumularse hasta el próximo diff cron
- NO data loss (el cron diff lo recupera). NO cross-tenant. NO security implication.

## Solución

### Fix immediate (shipped 2026-05-13 commit `86890bae`)

Extraer `respondToValidationToken(request)` helper compartido por GET y POST. POST handler invoca el helper ANTES del parse del body — si `validationToken` está presente, responde 200 + text/plain echo y aborta antes de cualquier validación de `clientState`. Idempotente: notifications normales (sin token en query) caen al path normal.

Archivos:
- `src/app/api/webhooks/entra-user-change/route.ts` — extracción helper + aplicación dual GET/POST
- `src/app/api/webhooks/entra-user-change/route.test.ts` — tests anti-regresión cubriendo GET + POST con token (2 tests verdes)
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` §Notification endpoint — corrección de contract description (Microsoft envía POST, no GET)

### Hardening pendiente (planificado, este ISSUE)

**Resilience — Reliability signal canónico**:
- Nuevo signal `integrations.entra.webhook_subscription_health` (kind=`drift`, severity=`error` si `expirationDateTime < now()+12h`, severity=`warning` si `< now()+48h`, steady=0)
- Reader `src/lib/reliability/queries/entra-webhook-subscription-health.ts` consulta `greenhouse_sync.integration_registry.metadata` para `integration_key='entra-graph-webhook'`
- Wire-up en `getReliabilityOverview` bajo módulo `identity` (subsystem `Identity & Access`)
- Operador detecta proactivamente cuando subscription se acerca a expirar, en vez de esperar a que el cron falle y emita Sentry

**Robustness — Persist completo del subscription state**:
- `persistSubscriptionId` (private helper) renombrado a `persistSubscriptionState({subscriptionId, expirationDateTime, notificationUrl})`
- `metadata` JSONB ahora incluye `expirationDateTime`, `lastRenewedAt`, `notificationUrl` además de `subscriptionId` — fuente para el signal
- Sin migration (es JSONB; campos adicionales backward-compatible). Antiguos rows con solo `subscriptionId` quedan; el signal lo trata como `expiration unknown` → warning

**Scalability — `notificationUrl` env-aware**:
- Hoy `webhook-subscription.ts:71` hardcodea `https://greenhouse.efeoncepro.com/api/webhooks/entra-user-change`
- Migración a resolver via `process.env.GREENHOUSE_PUBLIC_BASE_URL ?? process.env.NEXTAUTH_URL ?? 'https://greenhouse.efeoncepro.com'`
- Habilita testing en staging (`dev-greenhouse.efeoncepro.com`) y preview
- Decisión explícita: staging custom domain con SSO bypass NO sirve aquí (Microsoft no envía bypass header). Staging dev queda OFF para Entra webhook hasta que el endpoint sea SSO-bypassable o se publique una URL alternativa.

### Follow-up explícito (V1.1, fuera del scope inmediato)

- `clientState` desacoplado del `SCIM_BEARER_TOKEN` (hoy `slice(0, 16)` de ese secret) → secret independiente `entra-webhook-client-state` rotable sin acoplar SCIM
- Runbook `docs/operations/runbooks/entra-webhook-subscription-recovery.md` con steps detect → expiry check → manual renew → escalation

## Verificación

### Fix immediate (shipped, pre-verify)

- [x] `pnpm tsc --noEmit` verde
- [x] `pnpm lint` verde (full repo)
- [x] `pnpm vitest run src/app/api/webhooks/entra-user-change/route.test.ts` — 2/2 tests verdes
- [x] Pre-push hook (`pnpm lint` + `pnpm tsc --noEmit`) verde
- [x] Commit `86890bae` pusheado a `develop`
- [x] Vercel deploy de develop a staging completado (`greenhouse-2fi700uvq` Ready 2026-05-13). `POST /api/webhooks/entra-user-change?validationToken=test-handshake-2026-05-13` con bypass devuelve HTTP 200 + `Content-Type: text/plain` + body `test-handshake-2026-05-13` (token echoed correctamente)
- [ ] **Promoción `develop → main`** via release orquestado (TASK-848/851 path canónico) — 51 commits ahead, requiere preflight + orchestrator workflow, NO hotfix unilateral. Owner: usuario.
- [ ] Vercel deploy de main a producción completado tras promoción
- [ ] Trigger manual del cron `gcloud scheduler jobs run ops-entra-webhook-renew --location=us-east4 --project=efeonce-group` retorna success (depende del bullet anterior)
- [ ] Sentry: 0 nuevos eventos de `JAVASCRIPT-NEXTJS-4T` después del trigger
- [ ] Reliability signal `identity.entra.webhook_subscription_health` visible en `/admin/operations` bajo subsystem `Identity & Access` con severity `ok` (post primer renew exitoso poblará `expirationDateTime`)

### Hardening (shipped 2026-05-13 commit `fde07952`)

- [x] Reliability signal `identity.entra.webhook_subscription_health` shipped (`src/lib/reliability/queries/entra-webhook-subscription-health.ts`) + wired en `getReliabilityOverview` bajo módulo `identity`. State machine 6 estados (unknown/legacy_metadata/expired/imminent/approaching/healthy).
- [x] `persistSubscriptionState` extendido con `expirationDateTime + notificationUrl + lastRenewedAt`. Llamado en AMBOS paths (create + renew, antes solo create). Backward-compatible con rows legacy.
- [x] `resolveNotificationUrl(env)` exportado. Resolución canónica: `GREENHOUSE_ENTRA_NOTIFICATION_URL` > `GREENHOUSE_PUBLIC_BASE_URL` > `NEXTAUTH_URL` > hardcoded prod fallback. Normaliza trailing slashes + whitespace.
- [x] 22 tests anti-regresión verdes (`webhook-subscription.test.ts` + `entra-webhook-subscription-health.test.ts`)
- [x] `pnpm tsc --noEmit` + `pnpm lint` + `pnpm test` verde (pre-push hook ejecutó full suite)
- [ ] `metadata.expirationDateTime` populated en producción — requiere promoción a main + primer renew exitoso post-deploy
- [ ] Signal `identity.entra.webhook_subscription_health` reportando `ok` en `/admin/operations` (depende del bullet anterior)

## Estado

**open** — fix immediate + hardening completos en `develop` (commits `86890bae` + `fde07952`); validados end-to-end en staging via curl (HTTP 200 + token echoed). Cierre formal pendiente exclusivamente de la **promoción orquestada `develop → main`** (51 commits ahead requieren release path canónico TASK-848/851, NO hotfix). Moverá a `resolved/` cuando:

1. Usuario apruebe la promoción a main vía release orquestado o decisión equivalente
2. Vercel desplegue prod
3. Trigger manual del cron en producción retorne success
4. Sentry `JAVASCRIPT-NEXTJS-4T` no emita nuevos eventos en ≥24h
5. Reliability signal `identity.entra.webhook_subscription_health` reporte `ok` con `expirationDateTime` válido en `metadata`

## Relacionado

- **Spec arquitectónica**: `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` (corregida en mismo commit `86890bae`)
- **Cron lane**: TASK-775 (Vercel cron → Cloud Scheduler + ops-worker migration)
- **Observability platform**: TASK-844 (Cross-Runtime Observability Sentry init) — sin esto el error no aparecería en Sentry desde Cloud Run
- **Cron wrapper canónico**: `services/ops-worker/cron-handler-wrapper.ts` (`wrapCronHandler` con `domain: 'identity'`)
- **Reliability registry**: `src/lib/reliability/registry.ts` módulo `identity` (signal nuevo wired vía `getReliabilityOverview`)
- **Reader del signal**: `src/lib/reliability/queries/entra-webhook-subscription-health.ts` (TASK ISSUE-075 hardening)
- **Helper env-aware URL**: `src/lib/entra/webhook-subscription.ts` (`resolveNotificationUrl`)
- **Commit fix immediate**: `86890bae` en `develop` (2026-05-13)
- **Commit hardening**: `fde07952` en `develop` (2026-05-13)
- **Sentry event**: `a7964f96092746378de8b706f06fd7f4`
- **Promoción producción pendiente**: TASK-848 release control plane / TASK-851 orchestrator workflow

## Lección operativa

Cuando un endpoint expone un **boundary contract con un servicio externo** (Microsoft Graph, HubSpot, Slack, Teams, etc.) que envía **validation handshakes durante setup/lifecycle**, hay que:

1. **Soportar todos los métodos HTTP** que el contract permite (Graph envía POST hoy; podría agregar GET o PUT mañana — diseñar para tolerar)
2. **Responder al handshake ANTES** de cualquier validación de payload (`clientState`, HMAC, etc.). El handshake no carga ese metadata
3. **Tests anti-regresión** que pinneen el comportamiento: el handler debe responder 200 + token echo con body vacío y sin headers de auth
4. **Reliability signal** del subscription health (expiry approaching) — no esperar a que el cron falle para detectar el problema
5. **Audit trail** del subscription lifecycle (created, renewed, expired, recreated) en una columna estructurada (`metadata` JSONB con timestamps), no solo en logs

Patrón canónico Greenhouse para webhooks externos (HubSpot TASK-706/813, Teams Bot TASK-671): handler GET para validation handshakes + handler POST para notifications, ambos con response 200 + echo del token cuando el query param está presente. Replicar end-to-end.
