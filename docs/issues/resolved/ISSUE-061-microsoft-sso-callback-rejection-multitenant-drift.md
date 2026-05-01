# ISSUE-061 — Microsoft SSO callback rejection (multi-tenant drift)

## Ambiente

production + staging

## Detectado

2026-04-30 (Daniela Ferreira reporta `?error=Callback` al intentar entrar con Microsoft).

## Resuelto

2026-05-01

## Síntoma

- Cualquier usuario internal de Efeonce (incluida Daniela Ferreira, Julio Reyes y otros) que clickeaba "Entrar con Microsoft" en `/login` era redirigido a `https://greenhouse.efeoncepro.com/login?callbackUrl=...&error=Callback`.
- El error era opaco: NextAuth no exponía el motivo real, sólo el código `Callback` en la URL.
- El último login exitoso registrado vía Microsoft SSO (Daniela) era del 2026-04-13. Algo cambió después de esa fecha que rompió el flujo para todos los users a la vez.
- Credentials login también fallaba para usuarios cuya única vía de auth era SSO (caso típico: `auth_mode='both'` con `password_hash=NULL` en la base, semánticamente inconsistente).

## Causa raíz

La Azure AD App Registration de Greenhouse (`client_id=3626642f-0451-4eb2-8c29-d2211ab3176c`, displayName "Greenhouse", tenant Microsoft de Efeonce `a80bf6c1-7c45-4d70-b043-51389622a0e4`) tenía `signInAudience` configurado como **`AzureADMyOrg`** (single-tenant, sólo tenant home).

Por arquitectura, **Greenhouse es multi-tenant**: clientes Globe (Sky Airline, etc.) entran desde sus propios tenants Azure. La App está consumida por NextAuth con `tenantId: 'common'` (`src/lib/auth.ts` línea 176), que dispatchea al endpoint multi-tenant `/common/oauth2/v2.0/authorize`. Cuando una App single-tenant es accedida vía `/common/`, Microsoft rechaza con códigos `AADSTS50194` / `AADSTS9002313`. NextAuth `swallow`-ea ese error en su callback handler y devuelve únicamente `?error=Callback`.

No fue una rotación de secret ni una expiración: la auditoría forense de los 3 secrets críticos (`NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET` en GCP Secret Manager) confirmó payloads sanos (ASCII printable, sin whitespace, sin comillas, longitud correcta, secret Azure válido hasta 2028-04-05). Tampoco fue cambio de redirect URI: ambas (`https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad` y `https://dev-greenhouse.efeoncepro.com/api/auth/callback/azure-ad`) seguían registradas.

El flag `signInAudience` fue cambiado del lado Azure (Portal o CLI) entre el 2026-04-13 y el 2026-04-30. Como no había observabilidad estructurada del callback ni smoke lane sobre Azure config, la falla silenciosamente afectó a 100% de los login attempts SSO durante ~17 días.

## Solución

### Fix runtime (Azure-side) — ejecutado vía Azure CLI

```bash
az ad app update \
  --id 3626642f-0451-4eb2-8c29-d2211ab3176c \
  --sign-in-audience AzureADMultipleOrgs
```

`AzureADMultipleOrgs` permite work/school accounts de cualquier tenant Microsoft, rechaza personal MSAs (outlook.com, hotmail.com). La autorización fina sigue en Greenhouse: el callback `signIn` en `auth.ts` rechaza tenants no provisionados via lookup en `client_users` por `microsoft_oid`/`microsoft_email`/alias.

### Verificación end-to-end

- **Probe Azure authorize endpoint** con el client_id real:
  ```
  GET https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=3626642f-...&redirect_uri=https%3A%2F%2Fgreenhouse.efeoncepro.com%2Fapi%2Fauth%2Fcallback%2Fazure-ad&...
  → HTTP 200 + "Sign in to your account" page (no AADSTS errors)
  ```
- **Mismo probe sobre staging** (`dev-greenhouse.efeoncepro.com`): HTTP 200 OK.
- **`pnpm auth:audit-azure-app`**: 7/7 checks pasan (tenant correcto, app reachable, signInAudience=AzureADMultipleOrgs, publisherDomain=efeonce.cl, ambas redirect URIs registradas, secret 704 días de TTL).

### Hardening anti-regresión (TASK-742, no parche)

7 capas defensivas implementadas en branch `feature/TASK-742-auth-resilience-7-layers` y mergeadas a `develop` (commit `919d90cf`). Las que cierran este modo de falla específico:

1. **Capa 6 enhanced** — `services/ops-worker/server.ts` agrega un 4to probe al smoke lane `identity.auth.providers`: hit real al endpoint `/common/oauth2/v2.0/authorize` con el client_id. Si `signInAudience` vuelve a flippearse, una redirect URI se remueve, o la App se elimina, el probe falla en <5min y emite Sentry `domain=identity` con el código AADSTS exacto. Cloud Scheduler corre cada `*/5 * * * *`.
2. **Auditor CLI** — `scripts/auth/audit-azure-app.ts` + `pnpm auth:audit-azure-app`. Verifica 7 invariantes de la App contra valores esperados (multi-tenant, redirect URIs canónicas, secret >30 días, etc.). Exit 1 en cualquier drift; corre standalone o en CI.
3. **Capa 3 — observability** — wrappers `recordAuthAttempt(...)` + `captureWithDomain(err, 'identity')` en `signIn`/`jwt`/`authorize` callbacks. Próxima vez que SSO falle, el reason_code real (`callback_exception`, `oid_mismatch`, etc.) queda en `greenhouse_serving.auth_attempts` y en Sentry, no swallow-eado.
4. **Capa 2 — readiness contract** — `/api/auth/health` expone status por provider; UI Login (`src/views/Login.tsx`) lee y oculta/deshabilita botón Microsoft con warning accionable cuando está degraded, en vez del opaco `?error=Callback`.
5. **Capa 5 — magic-link self-recovery** — `/auth/magic-link` permite a un usuario sin password y con SSO degraded recuperar acceso sin operador (token bcrypt-hashed, single-use, 15min TTL).
6. **CLAUDE.md auth invariants** — nueva regla dura: "NUNCA cambiar `signInAudience` a `AzureADMyOrg`". Greenhouse es multi-tenant; la autorización fina vive en `signIn` callback, no en Azure.
7. **CLAUDE.md + AGENTS.md** — nueva sección "Tooling disponible (CLIs autenticadas)". Documenta que Azure CLI está autenticado contra el tenant de Efeonce y que cuando una causa raíz vive fuera del código (Azure, GCP, Vercel), el agente debe ejecutar el fix con CLI, no documentar pasos manuales.

### Schema integrity (Capa 4)

Migration `20260501070728862_task-742-auth-mode-check-and-normalize.sql` agrega CHECK constraint `client_users_auth_mode_invariant` que prohíbe estados imposibles (`auth_mode='both'` con `password_hash=NULL`). Backfill normalizó 6 internal users a `microsoft_sso`, incluyendo a Daniela Ferreira (que tenía `auth_mode='both'` sin password — su única vía real era SSO).

## Verificación

- `az ad app show --id 3626642f-... --query signInAudience` → `AzureADMultipleOrgs` ✓
- `pnpm auth:audit-azure-app` → 7 pass / 0 warn / 0 fail ✓
- `curl -I 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=3626642f-...&...'` → HTTP 200 + página de login Microsoft ✓
- `pnpm migrate:status` → 3 migrations TASK-742 aplicadas en dev ✓
- Daniela Ferreira en PG: `auth_mode=microsoft_sso`, `microsoft_oid` linkeado ✓
- 43/43 tests TASK-742 verdes ✓

## Relacionado

- TASK-742 — Auth Resilience 7-Layer Architecture (`docs/tasks/complete/TASK-742-auth-resilience-7-layers.md`)
- Migrations: `migrations/20260501070728477_task-742-auth-attempts.sql`, `..862_task-742-auth-mode-check-and-normalize.sql`, `..29260_task-742-auth-magic-links.sql`
- Commit fix: `919d90cf` en `develop`
- CLAUDE.md sección "Auth resilience invariants (TASK-742)" y "Tooling disponible (CLIs autenticadas)"
- Branch: `feature/TASK-742-auth-resilience-7-layers` (mergeada a develop)
