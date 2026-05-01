# TASK-742 — Auth Resilience 7-Layer Architecture

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Crítico`
- Effort: `Alto`
- Type: `epic`
- Status real: `Implementación`
- Domain: `identity`
- Blocked by: `none`
- Branch: `feature/TASK-742-auth-resilience-7-layers`
- Trigger incident: 2026-04-30 — Daniela Ferreira (y todo internal user) no puede entrar vía Microsoft SSO; URL devuelve `?error=Callback`. Su last_login_at fue 2026-04-13. Algo cambió post-2026-04-13 que rompió el callback de Azure AD. Sin observabilidad estructurada, NextAuth swallow-eó el error real.

## Summary

Cierra 6 fallas estructurales del sistema de autenticación que permitieron que Microsoft SSO se rompiera silenciosamente para todos los users internal sin alertar al equipo. Implementa 7 capas defensivas: hygiene de secrets, readiness contract, observability, schema integrity, self-recovery (magic-link), smoke lane sintética y rotation playbook.

## Why This Task Exists

El incidente del 2026-04-30 expuso que el sistema de auth depende de configuración (secretos, redirect URIs, env vars) sin ningún mecanismo de:

1. **Validar formato** de los secrets al boot — un payload contaminado se acepta y rompe runtime.
2. **Detectar provider degraded** — la app boot-ea aunque Azure rechazará todos los logins.
3. **Capturar la causa real del error** — NextAuth devuelve `error=Callback` opaco y sin telemetría estructurada.
4. **Forzar consistencia de schema** — usuarios con `auth_mode='both'` y `password_hash=NULL` (estado imposible).
5. **Auto-recuperar al usuario** — sin password y SSO roto = imposible entrar sin operador con acceso PG.
6. **Detectar antes que el usuario** — sin smoke lane sintética, el sistema descubre la falla solo cuando un humano la reporta.
7. **Rotar secretos de forma segura** — sin verify-before-cutover, una rotación mal hecha rompe producción inmediatamente.

## Goal

- Microsoft SSO degraded mode automático cuando readiness check falla.
- Todo intento de login (success/failure/reason) persistido en tabla append-only con domain tag.
- Magic-link como airbag para usuarios atrapados sin password+SSO funcional.
- Smoke lane `identity.auth.providers` corriendo cada 5min.
- Schema CHECK constraint que prohíbe estados imposibles de `auth_mode`.
- Playbook idempotente `pnpm secrets:rotate` con verify-before-cutover.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — modelo de identidad y acceso
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — Platform Health V1 contract
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry, signals, AI Observer
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` — secret hygiene
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`

Reglas obligatorias:

- Secret payloads se validan con `printf %s` canónico; sin comillas/whitespace/newlines.
- Sentry incidents usan `captureWithDomain(err, 'identity', { extra })`.
- Smoke lane runs van a `greenhouse_sync.smoke_lane_runs`.
- Reliability registry debe incluir `incidentDomainTag='identity'` para roll-up.

## Dependencies & Impact

### Depends on

- `greenhouse_core.client_users` (existente)
- `greenhouse_sync.smoke_lane_runs` (existente, TASK-579)
- `RELIABILITY_REGISTRY` (existente)
- Cloud Run `ops-worker` (existente)

### Blocks / Impacts

- TASK-727 (post-fix): valida que `supervisorAccess` lookup en JWT callback no rompe SSO si PG está degraded.
- ISSUE-XXX-microsoft-sso-callback-rejection (a crear): este task lo cierra parcialmente vía observability.

### Files owned

- `src/lib/secrets/secret-manager.ts` (extensión Capa 1)
- `src/lib/auth-secrets.ts` (validación Capa 1)
- `src/lib/auth/readiness.ts` (Capa 2 — nuevo)
- `src/lib/auth.ts` (wrapping observability Capa 3)
- `src/lib/auth/attempt-store.ts` (Capa 3 — nuevo)
- `src/lib/auth/magic-link.ts` (Capa 5 — nuevo)
- `src/app/api/auth/magic-link/route.ts` (Capa 5 — nuevo)
- `services/ops-worker/server.ts` (Capa 6 — extensión)
- `scripts/secrets/rotate.ts`, `scripts/secrets/audit.ts` (Capa 7 — nuevo)
- `migrations/20260430-task-742-*` (Capas 3/4/5)

## Current Repo State

### Already exists

- `resolveSecret` en `src/lib/secrets/secret-manager.ts` con normalización básica (limpia comillas/`\\n` literales)
- NextAuth con providers Azure AD + Google + Credentials en `src/lib/auth.ts`
- `captureWithDomain(err, domain, ...)` con domains incluyendo identity
- Reliability Control Plane registry + signals
- Smoke lane infra `greenhouse_sync.smoke_lane_runs` + `pnpm sync:smoke-lane`
- Platform Health V1 composer en `src/lib/platform-health/`

### Gap

- No hay validación de formato de secret payloads
- No hay readiness contract para auth providers
- No hay structured observability del flujo SSO (errors swallow-eados)
- No hay CHECK constraint sobre `auth_mode` × `password_hash`
- No hay magic-link / passwordless fallback
- No hay smoke lane sintética del flujo SSO
- No hay rotation playbook idempotente

## Scope

### Slice 1 — Secret hygiene (Capa 1)

- `validateSecretFormat(envVarName, value)` con reglas por secret crítico:
  - `NEXTAUTH_SECRET`: ≥32 bytes, ASCII printable, sin whitespace
  - `AZURE_AD_CLIENT_SECRET`: 30–60 chars, charset `[A-Za-z0-9~_.-]`
  - `GOOGLE_CLIENT_SECRET`: 20–80 chars, charset `[A-Za-z0-9_-]`
  - `CRON_SECRET`, `AGENT_AUTH_SECRET`, `NEXTAUTH_URL`: validation por shape
- `resolveSecret` rechaza payloads inválidos y emite `captureWithDomain` warning.
- Telemetría: cada caída a `source='env'` en producción emite Sentry warning.

### Slice 2 — Auth readiness contract (Capa 2)

- `validateAuthSecrets()` ejecuta:
  - OIDC discovery `https://login.microsoftonline.com/common/.well-known/openid-configuration` (timeout 5s)
  - Symmetric self-test JWT sign+verify con `NEXTAUTH_SECRET`
  - Format validation de `AZURE_AD_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `NEXTAUTH_URL`
- `getAuthProvidersHealth()` cached 30s expone status por provider (`ready`/`degraded`/`unconfigured`).
- `/api/auth/providers` extendido con `_health` field (sin romper shape NextAuth).
- UI login lee health y oculta/deshabilita botón con mensaje accionable cuando provider está degraded.
- Platform Health composer: nuevo source `auth.providers` con timeout 5s.

### Slice 3 — Observability del flujo SSO (Capa 3)

- Migration `auth_attempts`: append-only, retention 90 days, columnas `(attempt_id, attempted_at, provider, stage, outcome, reason_code, reason_redacted, user_id_resolved, email_redacted, oid_redacted, microsoft_tenant_id, ip_hashed, user_agent_hash, request_id)`.
- Wrapper canónico `recordAuthAttempt(...)` con redacción.
- `signIn` y `jwt` callbacks de NextAuth: try/catch + `captureWithDomain(err, 'identity', { extra: { provider, stage } })` + `recordAuthAttempt(...)`.
- Outbox event `login.callback_failed` con `stage` (token_exchange/jwt_sign/signin_callback/lookup_failed).
- Reliability registry: módulo `identity` recibe `incidentDomainTag='identity'`.

### Slice 4 — Schema integrity (Capa 4)

- Migration: CHECK constraint `client_users_auth_mode_check`:
  - `auth_mode IN ('credentials','both')` ⇒ `password_hash IS NOT NULL`
  - `auth_mode = 'microsoft_sso'` ⇒ `microsoft_oid IS NOT NULL`
  - `auth_mode = 'google_sso'` ⇒ `google_sub IS NOT NULL`
- Backfill script `scripts/identity/normalize-auth-mode.ts`: idempotente, emite outbox `identity.user.auth_mode_normalized`.
- Daniela Ferreira pasa de `auth_mode='both'` a `'microsoft_sso'` (tiene microsoft_oid pero no password_hash).

### Slice 5 — Self-recovery magic-link (Capa 5)

- Migration `auth_magic_links`: `(token_id, user_id, token_hash_bcrypt, requested_ip_hashed, requested_at, expires_at, used_at, used_ip_hashed)`.
- Endpoint `POST /api/auth/magic-link/request`: rate-limited (60s cooldown por user, 5 req/hour por IP).
- Endpoint `GET /api/auth/magic-link/consume?token=...`: single-use, 15min TTL, sets NextAuth session cookie.
- Email template `magic-link-login` con React Email + delivery vía Resend.
- UI link en `/login`: "¿Atrapado? Recibe link mágico por email" — surface debajo de "¿Olvidaste tu contraseña?".

### Slice 6 — Smoke lane sintética (Capa 6)

- Endpoint Cloud Run `POST /smoke/identity-auth-providers`:
  - `GET /api/auth/providers` (own deploy) → expecta shape válido con azure-ad
  - HEAD `https://login.microsoftonline.com/common/.well-known/openid-configuration` → 200
  - In-process JWT sign+verify roundtrip con `NEXTAUTH_SECRET`
  - Persiste `smoke_lane_runs` con `lane_key='identity.auth.providers'`
- Cloud Scheduler job cada 5min en `services/ops-worker/deploy.sh`.
- Reliability subsystem `Identity Auth Providers` consume `lane_key='identity.auth.providers'`.

### Slice 7 — Secret rotation playbook (Capa 7)

- `scripts/secrets/rotate.ts`: rotación atómica con verify-before-cutover.
  1. Read old version, validate format.
  2. `printf %s "$VALUE" | gcloud secrets versions add` (canónico).
  3. Trigger Vercel redeploy o `gcloud run services update` según secret.
  4. Poll `/api/auth/providers` + `/api/admin/platform-health` hasta green (timeout 5min).
  5. Solo entonces: `gcloud secrets versions disable <prev-version>`.
  6. Si paso 4 falla → revert: re-enable prev, abort.
- `scripts/secrets/audit.ts`: itera secrets críticos, reporta source, rotation date, hygiene score (length, charset, anomalies). Output JSON consumible.
- `pnpm secrets:rotate <secret-id>`, `pnpm secrets:audit`.

## Out of Scope

- Cambiar la Azure App Registration (redirect URIs, tenant config) — eso requiere acceso administrativo y se documenta como follow-up runbook.
- Migrar a NextAuth v5 / Auth.js — preserved for TASK-516.
- WebAuthn / passkeys — TASK derivada futura.
- Multi-region active-active de auth — fuera de scope inmediato.

## Acceptance Criteria

- [ ] `pnpm test src/lib/secrets src/lib/auth` ≥ 30 tests verdes
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build` OK
- [ ] Migration aplicada en dev, types regenerados
- [ ] `/api/auth/providers` extendido con `_health` por provider
- [ ] `auth_attempts` recibe rows reales en preview deploy con login intentos
- [ ] CHECK constraint rechaza INSERT con `auth_mode='both'` y `password_hash=NULL`
- [ ] Magic-link end-to-end smoke OK (request → email → consume → session válida)
- [ ] Smoke lane runs en `greenhouse_sync.smoke_lane_runs` con `lane_key='identity.auth.providers'`
- [ ] `pnpm secrets:audit` retorna JSON con score por secret crítico
- [ ] Reliability dashboard expone subsystem `Identity Auth Providers`
- [ ] Daniela Ferreira normalizada (`auth_mode='microsoft_sso'`)
- [ ] Sentry recibe `domain=identity` events del wrapper auth callbacks

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm migrate:up` aplicado en dev + types regenerados
- Smoke en preview deploy (Vercel) usando el feature branch
- Validar que un MS SSO login intento (incluso fallido) emite registro en `auth_attempts` con `reason_code` específico
- Confirmar magic-link end-to-end con `agent@greenhouse.efeonce.org` (read-only test user)

## Closing Protocol

- [ ] `Lifecycle = complete`
- [ ] Archivo movido a `docs/tasks/complete/`
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` con resumen de las 7 capas
- [ ] `changelog.md` con sección "Auth Resilience 7-Layer Architecture"
- [ ] Cross-impact: TASK-727, ISSUE-XXX-sso-callback-rejection
- [ ] Doc funcional `docs/documentation/identity/sistema-auth-resiliente.md`
- [ ] Doc operacional `docs/manual-de-uso/identity/recuperar-acceso-magic-link.md`
- [ ] `CLAUDE.md` actualizado con sección "Auth resilience invariants"

## Follow-ups

- ISSUE-XXX (a crear): "Microsoft SSO callback rejection — Azure App redirect URI investigation"
- TASK derivada: Migrar `auth.ts` a NextAuth v5 (Auth.js) — habilitar edge runtime
- TASK derivada: WebAuthn / passkeys como segundo factor
- TASK derivada: Multi-region failover de auth (active-active)
- TASK derivada: Audit log surface UI `/admin/identity/auth-attempts`
