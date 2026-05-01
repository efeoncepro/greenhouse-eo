# GREENHOUSE_AUTH_RESILIENCE_V1

> **Tipo de documento:** Spec de arquitectura canónica
> **Versión:** 1.0
> **Creado:** 2026-05-01 por Claude (TASK-742, ISSUE-061)
> **Owner:** Identity domain
> **Status:** active
> **Subordinado a:** [GREENHOUSE_IDENTITY_ACCESS_V2.md](GREENHOUSE_IDENTITY_ACCESS_V2.md), [GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md](GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md), [GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md](GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md)

---

## Propósito

Define la arquitectura defensiva de **7 capas** que protegen el flujo de autenticación de Greenhouse. Su objetivo es eliminar el modo de falla "SSO se rompe silenciosamente y nadie se entera hasta que un humano lo reporta", que es exactamente lo que ocurrió en [ISSUE-061](../issues/resolved/ISSUE-061-microsoft-sso-callback-rejection-multitenant-drift.md) (2026-04-30 — Microsoft SSO rebotando con `?error=Callback` opaco para 100% de los users internal durante ~17 días).

Cada capa cubre un modo de falla distinto. Juntas garantizan: detección automática en <5min, observability estructurada, recuperación sin operador para usuarios atrapados, y rotación segura de secretos.

---

## Contexto: Greenhouse es multi-tenant por arquitectura

- Greenhouse atiende **Efeonce internal** + **clientes Globe** (Sky Airline, etc.) que entran desde sus propios tenants Microsoft Azure.
- La Azure AD App Registration canónica (`client_id=3626642f-0451-4eb2-8c29-d2211ab3176c`, displayName "Greenhouse") está en el tenant Microsoft de Efeonce (`a80bf6c1-7c45-4d70-b043-51389622a0e4`) pero debe aceptar work/school accounts de cualquier tenant.
- NextAuth dispatchea via `tenantId: 'common'` (multi-tenant endpoint).
- **El valor canónico de `signInAudience` es `AzureADMultipleOrgs`** — work/school accounts de cualquier tenant Azure; rechaza personal Microsoft Accounts (outlook.com, hotmail.com).
- La autorización fina (qué tenants/users entran, con qué roles) **NO** está en Azure: vive en Greenhouse, en el callback `signIn` de NextAuth, que hace lookup en `client_users` por `microsoft_oid` / `microsoft_email` / alias y rechaza tenants no provisionados. Azure es el límite de **autenticación**, no de **autorización**.

**Consecuencia operativa**: cualquier cambio que reduzca `signInAudience` a `AzureADMyOrg` (single-tenant) es una regresión arquitectónica. La Capa 6 lo detecta en <5min; el Capa 7 auditor lo bloquea en CI.

---

## Las 7 capas

### Capa 1 — Secret hygiene

**Objetivo**: rechazar payloads de secretos malformados antes de que lleguen al runtime.

**Implementación**:

- `src/lib/secrets/format-validators.ts` — catálogo `FORMAT_RULES` con shape rules por secret crítico:
  - `NEXTAUTH_SECRET`: ≥32 bytes, ASCII printable, sin whitespace, charset `[A-Za-z0-9+/=_-]`
  - `AZURE_AD_CLIENT_SECRET`: 30–60 chars, charset `[A-Za-z0-9~_.\-]`
  - `AZURE_AD_CLIENT_ID`: GUID lowercase exacto
  - `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `NEXTAUTH_URL`, `CRON_SECRET`, `AGENT_AUTH_SECRET`
- `src/lib/secrets/secret-manager.ts:resolveSecret` valida el payload contra el rule cuando el secret es `isKnownSecretFormat()`. Si falla, retorna `value: null` + `formatViolations: [...]` y emite Sentry warning con `domain=identity`.
- Detection adicional: cuando un secret crítico cae a `source='env'` en producción (significa que `*_SECRET_REF` está roto), se emite Sentry warning automáticamente.

**Modo de falla cubierto**: secret rotado con comillas envolventes / `\n` literal / whitespace embebido / shape inválido pasa silenciosamente al runtime y rompe NextAuth o Azure token exchange.

### Capa 2 — Auth provider readiness contract

**Objetivo**: detectar ANTES del primer login que un provider está degraded, y reflejarlo en la UI.

**Implementación**:

- `src/lib/auth/readiness.ts` exporta `buildAuthReadinessSnapshot(input)` que prueba:
  1. OIDC discovery de Microsoft (`https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration`, timeout 5s)
  2. OIDC discovery de Google
  3. JWT sign+verify roundtrip con `NEXTAUTH_SECRET` (HS256, payload de prueba)
  4. Format validation de `AZURE_AD_CLIENT_ID` / `GOOGLE_CLIENT_ID` (delegado a Capa 1)
- Status por provider: `ready` / `degraded` / `unconfigured` + `failingStage` (`secret_format_invalid`, `oidc_discovery_failed`, `oidc_discovery_timeout`, `jwt_self_test_failed`, `unconfigured`) + `reason`.
- `getCurrentAuthReadiness()` desde `src/lib/auth-secrets.ts` cachea 30s.
- **Endpoint público read-only**: `GET /api/auth/health` retorna `AuthReadinessSnapshot` con contract version `auth-readiness.v1`. Cache 30s edge.
- **UI Login** (`src/views/Login.tsx`): consume `/api/auth/health` con `useEffect`, si `status='degraded'` oculta/deshabilita el botón del provider y muestra warning accionable: "Microsoft SSO temporalmente no disponible. Usa email y contraseña, o pide un link mágico". Reemplaza el opaco `?error=Callback`.

**Reglas duras**:

- NUNCA computar SSO health en el cliente. Single source of truth = `/api/auth/health`.
- NO llamar Azure `/token` con client_credentials reales (consume quota; OIDC discovery es suficiente).

### Capa 3 — SSO observability

**Objetivo**: capturar la causa real de cada login attempt (success/failure/rejected/degraded) con stage + reason_code estable, sin que NextAuth los swallow-ee.

**Implementación**:

- Tabla `greenhouse_serving.auth_attempts` (migration `20260501070728477`): append-only, retention 90 días.
  - Columnas: `attempt_id`, `attempted_at`, `provider`, `stage`, `outcome`, `reason_code`, `reason_redacted`, `user_id_resolved`, `email_redacted`, `microsoft_oid_redacted`, `microsoft_tenant_id`, `ip_hashed`, `user_agent_hash`, `request_id`.
  - PII redacted: sha256(IP)[:32], sha256(UA)[:32], email `<2chars>***@domain`, OID prefix+suffix.
  - CHECK constraints sobre enums `provider`, `stage`, `outcome`.
  - Indexes parciales para failures recientes y lookup por user.
- `src/lib/auth/attempt-tracker.ts:recordAuthAttempt(input)` — best-effort persistence + `captureWithDomain(err, 'identity', { extra })` en non-success.
- `src/lib/auth.ts` callbacks `signIn` / `jwt` / `authorize` envueltos en try/catch que registra:
  - `azure-ad`: `tenant_not_found`, `account_disabled`, `account_status_invalid`, `callback_exception`, `success`
  - `google`: idem
  - `credentials`: `invalid_password`, `tenant_not_found`, `account_disabled`, `account_status_invalid`, `callback_exception`, `success`
  - `magic-link`: `magic_link_invalid`, `magic_link_used`, `magic_link_expired`, `success`

**Modo de falla cubierto**: NextAuth devuelve `?error=Callback` opaco en cualquier exception del callback. Sin instrumentación, el operador no puede diferenciar `redirect_uri_mismatch` vs `invalid_client` vs `oid_mismatch` vs `pg_lookup_failed`.

### Capa 4 — Schema integrity (auth_mode invariant)

**Objetivo**: prohibir estados imposibles a nivel DB.

**Implementación**:

- Migration `20260501070728862` agrega CHECK constraint `client_users_auth_mode_invariant`:
  ```
  auth_mode='credentials' OR 'both'        ⇒ password_hash IS NOT NULL
  auth_mode='microsoft_sso'                 ⇒ microsoft_oid IS NOT NULL
  auth_mode='google_sso'                    ⇒ google_sub IS NOT NULL
  auth_mode='sso_pending'                   ⇒ todos NULL (transicional)
  auth_mode='password_reset_pending'        ⇒ password_hash IS NULL (transicional)
  auth_mode='invited'                       ⇒ password_hash IS NULL (transicional)
  auth_mode='agent'                         ⇒ libre
  ```
- Backfill incluido: usuarios inconsistentes (`auth_mode='both'` sin `password_hash` pero con `microsoft_oid`) normalizados a `microsoft_sso`. Daniela Ferreira fue corregida aquí.
- `NOT VALID` + `VALIDATE` para evitar long table locks online.

**Modo de falla cubierto**: usuario con `auth_mode='both'` pero `password_hash=NULL` veía "Email o contraseña incorrectos" para credentials AUNQUE su única vía real era SSO. UX engañosa + estado imposible silente.

### Capa 5 — Self-recovery (magic-link)

**Objetivo**: dar al usuario una salida cuando SSO está roto y no tiene password (caso ISSUE-061).

**Implementación**:

- Tabla `greenhouse_serving.auth_magic_links` (migration `20260501070729260`): `(token_id, user_id, token_hash_bcrypt, requested_ip_hashed, requested_at, expires_at, used_at, used_ip_hashed)`. FK a `client_users` con CASCADE.
- `src/lib/auth/magic-link.ts`:
  - `requestMagicLink({ email, ip })`: token 32 bytes urlsafe → `bcrypt(token, cost=10)` → INSERT. Cooldown 60s/user. Anti-enumeration (response shape idéntico para unknown user vs rate-limited).
  - `consumeMagicLink({ tokenId, rawToken, ip })`: `bcrypt.compare`, single-use enforcement, TTL 15min, mint NextAuth session via `signAgentSessionInProcess`.
- Endpoints:
  - `POST /api/auth/magic-link/request` — siempre HTTP 200 con respuesta genérica.
  - `GET /api/auth/magic-link/consume?tokenId=...&token=...` — sets cookie + redirect a portalHomePath; failure → `/login?error=magic_link_<reason>`.
- Email template `magic_link` (priority `critical`, es/en) en `src/emails/MagicLinkEmail.tsx`.
- Página `/auth/magic-link` (`src/app/(blank-layout-pages)/auth/magic-link/page.tsx`) con form + confirmación anti-enumeration.
- UI Login surface: link "¿No puedes entrar? Recibe un link mágico por correo" debajo del form credentials.

**Reglas duras**:

- NUNCA persistir el raw token. Solo `bcrypt(token)`.
- NUNCA aceptar email destino del cliente — se envía al `email` registrado del user.

### Capa 6 — Smoke lane sintética

**Objetivo**: detectar regresión del flujo SSO sin esperar a que un humano la reporte.

**Implementación**:

- Endpoint `POST /smoke/identity-auth-providers` en ops-worker (`services/ops-worker/server.ts`).
- 4 probes (cada uno con timeout 5s):
  1. **portal_auth_health**: `GET https://greenhouse.efeoncepro.com/api/auth/health` → expected `overallStatus='ready'`.
  2. **microsoft_oidc_discovery**: `GET https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration` → expected HTTP 200.
  3. **in_process_readiness**: ejecuta `getCurrentAuthReadiness()` dentro del worker (con su propio NEXTAUTH_SECRET).
  4. **azure_authorize_endpoint**: `GET https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=<real>&...` → expected HTTP 200 con título "Sign in to your account" y SIN `AADSTS\d+` en el body. **Esta es la probe que detecta exactamente el modo de falla de ISSUE-061** (signInAudience drift).
- Persiste fila en `greenhouse_sync.smoke_lane_runs` con `lane_key='identity.auth.providers'`.
- Cloud Scheduler job `ops-identity-auth-smoke` con cron `*/5 * * * *` (timezone `America/Santiago`).
- Falla → `captureMessageWithDomain('identity.auth.providers smoke failed: <probe names>', 'identity', { level: 'error', extra: { probes } })`.

**Cobertura de modos de falla**:

- `azure_authorize_endpoint` falla con `AADSTS50194` / `AADSTS9002313` → multi-tenant misconfig
- `azure_authorize_endpoint` falla con `AADSTS50011` → redirect_uri removed
- `azure_authorize_endpoint` falla con `AADSTS700016` → app deleted o client_id wrong
- `microsoft_oidc_discovery` falla → DNS / red / Microsoft incident
- `in_process_readiness` falla con `jwt_self_test_failed` → `NEXTAUTH_SECRET` corrupto
- `portal_auth_health` falla → la app misma está caída (no auth-related, pero detectado igual)

### Capa 7 — Rotation playbook + Azure App auditor

**Objetivo**: nunca dejar producción en estado unverified después de una rotación o cambio de config.

**Implementación**:

- **`pnpm secrets:audit`** (`scripts/secrets/audit.ts`): itera 8 secretos críticos, reporta source (`env` vs `secret_manager`), byteLen, hygiene violations, presencia de fallback legacy. Exit 1 si hay degraded. JSON output via `--json`.
- **`pnpm secrets:rotate <gcp-secret-id>`** (`scripts/secrets/rotate.ts`): verify-before-cutover atómico:
  1. Validate format con Capa 1 (fail-fast)
  2. `printf %s "$VALUE" | gcloud secrets versions add <id>` (canonical, no shell quoting)
  3. Trigger redeploy del consumer (Vercel project o Cloud Run service)
  4. Poll health URL hasta 200 + `overallStatus !== 'degraded'` (timeout 5min default)
  5. Si paso 4 falla → disable nueva versión, re-enable previa, abort
  6. Solo si paso 4 OK: la versión previa queda enabled (operador la disable manualmente tras soak)
- **`pnpm auth:audit-azure-app`** (`scripts/auth/audit-azure-app.ts`): usa Azure CLI (`az ad app show`) para verificar 7 invariantes contra la App Registration real:
  - Tenant Azure CLI matchea `a80bf6c1-...` esperado
  - App existe y es reachable
  - `signInAudience === 'AzureADMultipleOrgs'` (cierra ISSUE-061)
  - `publisherDomain === 'efeonce.cl'`
  - Ambas redirect URIs canónicas registradas (production + staging)
  - ≥1 client secret no expirado
  - Newest secret >30 días de TTL (warn si menos)
- Exit 1 en cualquier `fail`; exit 2 en `warn` con flag `--strict`.

**Modo de falla cubierto**: rotación que rompe runtime sin verificación; drift de Azure App config (signInAudience flippeado, redirect URI removida, secret expirado) que se descubre cuando un user reporta.

---

## Reglas duras (CLAUDE.md / AGENTS.md)

- **NUNCA** cambiar `signInAudience` a `AzureADMyOrg`. Greenhouse es multi-tenant; el callback `signIn` rechaza tenants no provisionados via lookup en `client_users`. La autorización fina vive en Greenhouse, no en Azure.
- **NUNCA** remover redirect URIs canónicas de la Azure App. Las únicas válidas son `https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (prod) y `https://dev-greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (staging).
- **NO** llamar `Sentry.captureException(err)` directo en code paths de auth. Usar siempre `captureWithDomain(err, 'identity', { extra: { provider, stage } })`.
- **NO** publicar secretos críticos sin pasar por `validateSecretFormat`. Si emerge un secret crítico nuevo, agregar su rule a `FORMAT_RULES`.
- **NO** rotar un secret en producción manualmente. Usar `pnpm secrets:rotate` con `--validate-as`, `--vercel-redeploy`/`--cloud-run-service`, y `--health-url`.
- **NUNCA** mutar callbacks `jwt`/`signIn` de NextAuth sin `try/catch` + `recordAuthAttempt`.
- **NUNCA** computar SSO health en el cliente — leer `/api/auth/health`.
- **NUNCA** persistir el raw token de un magic-link.
- **NUNCA** crear un `client_users` row con `auth_mode='both'` sin `password_hash`. La CHECK constraint lo bloquea.
- **NO** depender de `process.env.NEXTAUTH_SECRET` plano en producción si existe `NEXTAUTH_SECRET_SECRET_REF`. El resolver prefiere Secret Manager.

---

## Observability surfaces

| Surface | Propósito |
|---|---|
| `/api/auth/health` | Public read-only readiness snapshot (contract `auth-readiness.v1`) |
| `greenhouse_serving.auth_attempts` | Append-only ledger de cada intento de login (90-day retention) |
| `greenhouse_sync.smoke_lane_runs` con `lane_key='identity.auth.providers'` | Synthetic monitor cada 5min via Cloud Scheduler |
| Sentry `domain=identity` | Errors estructurados de auth (signIn callback, jwt callback, magic-link, secret format) |
| `pnpm auth:audit-azure-app` | On-demand audit de la Azure App Registration |
| `pnpm secrets:audit` | On-demand audit de los 8 secretos críticos |

---

## Tooling necesario

Estos CLIs deben estar autenticados localmente para operar las capas:

- **Azure CLI (`az`)** — tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4` (Efeonce). Comandos canónicos: `az ad app show --id <client-id>`, `az ad app update`, `az ad app credential reset`, `az ad sp show`. Subscription: `e1cfff3e-8c21-4170-8b28-ad083b741266`.
- **gcloud** — project `efeonce-group`, account `julio.reyes@efeonce.org`. Para Secret Manager, Cloud Run, Cloud Scheduler.
- **Vercel CLI** — team `efeonce-7670142f`. Para env vars y triggers de redeploy.
- **psql** vía `pnpm pg:connect` — para auditar `auth_attempts` / `client_users`.

Cuando una causa raíz vive fuera del código (Azure config, GCP secrets, Vercel env), el agente DEBE ejecutar el fix con CLI con guardrails y verificación, NO documentar pasos manuales.

---

## Eventos en outbox

| Event | Cuándo se emite |
|---|---|
| `login.failed` | Credentials invalid_password (legacy, mantener compat) |
| `login.callback_failed` | Cualquier callback exception (futuro — TASK-742 follow-up) |
| `identity.user.auth_mode_normalized` | Backfill normalizó un row que tenía estado inconsistente |

---

## Referencias

- TASK-742 — `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md`
- ISSUE-061 — `docs/issues/resolved/ISSUE-061-microsoft-sso-callback-rejection-multitenant-drift.md`
- Migrations: `migrations/20260501070728477_task-742-auth-attempts.sql`, `..862_task-742-auth-mode-check-and-normalize.sql`, `..29260_task-742-auth-magic-links.sql`
- Spec parent: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- API Platform readiness contract: `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (sección Platform Health V1)
- Reliability Control Plane: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

---

## Changelog

- **1.0** — 2026-05-01 — Documento inicial post TASK-742 / ISSUE-061. Cierra el modo de falla "SSO se rompe silenciosamente" con 7 capas defensivas.
