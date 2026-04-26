# TASK-516 — NextAuth v4 → Auth.js v5 migration

## Delta 2026-04-26

- Pre-requisito **TASK-515 (`jose`) cerrado**. `jose@6.2.2` ya está en `package.json` como dep directa; `jsonwebtoken` removido. La fundación está lista — esta task ya no está bloqueada.

### Cross-impact con SCIM (Azure AD provisioning)

**El SCIM no se rompe por esta migración** — los endpoints `/api/scim/v2/*` (`Users`, `Groups`, `Schemas`, `ServiceProviderConfig`) usan exclusivamente `requireScimAuth()` de [src/lib/scim/auth.ts](../../../src/lib/scim/auth.ts) (bearer token + `timingSafeEqual` contra `SCIM_BEARER_TOKEN`). Cero imports de `next-auth`/`getServerSession`/`getToken` en `src/app/api/scim/**`. Azure AD habla SCIM por HTTP firmado, no por NextAuth.

**Superficie compartida real a vigilar durante la migración:**

1. **Azure AD provider de login** en [src/lib/auth.ts](../../../src/lib/auth.ts) cambia de `next-auth/providers/azure-ad` (v4) a `next-auth/providers/microsoft-entra-id` (v5). Verificar que los claims (`oid`, `tid`, `preferred_username`, `email`) sigan llegando con los mismos nombres que los callbacks `signIn`/`jwt` esperan.
2. **SSO identity linking**: el flujo lookup-by-`microsoft_oid` → fallback-by-email → fallback-by-internal-alias en `src/lib/tenant/access.ts` debe seguir matcheando con los registros que el SCIM ya provisionó (`microsoft_oid` se setea desde el `oid` del provider). Si v5 cambia el shape del claim, el linking falla en silencio y el usuario aparece como "nuevo" en cada login.
3. **`auth_mode` transitions** (credentials → both → sso) que dependen de `account.provider === 'azure-ad'`: en v5 el provider id es `microsoft-entra-id`, no `azure-ad`. Hay que actualizar las comparaciones de string en los callbacks.
4. **Azure Enterprise App config**: SCIM endpoint URL y bearer token en Azure Portal **no cambian** (siguen apuntando a `/api/scim/v2/*`). Solo cambian las `Redirect URIs` del SSO si el handler de v5 expone una ruta distinta (típicamente sigue siendo `/api/auth/callback/<provider-id>`, pero con nuevo provider-id).

**Plan de validación post-migración (orden estricto):**

1. SSO Azure AD login interactivo desde portal (verifica callbacks + claims).
2. SCIM smoke: `GET /api/scim/v2/Users` con bearer válido (verifica que la migración no tocó el endpoint).
3. Login de un usuario provisionado por SCIM pero que nunca había hecho SSO (verifica el linking `microsoft_oid` post-v5).
4. Re-login de un usuario con `auth_mode='both'` (verifica que las transiciones siguen funcionando).

### Azure por CLI — ajustes y verificaciones desde `az`

Toda la configuración del Enterprise App + App Registration se puede inspeccionar y ajustar con `az` (Azure CLI) sin entrar al portal. Útil para que un agente verifique en tiempo real durante la migración. Asume que ya hay sesión iniciada (`az login --tenant <tenant-id>`) y que conoces el `appId` (client_id) del App Registration; si no, listarlo con `az ad app list --display-name "Greenhouse EO" --query "[].{name:displayName, appId:appId, objectId:id}"`.

**Verificaciones que el agente debe hacer ANTES de cambiar provider id `azure-ad` → `microsoft-entra-id`:**

```bash
# 1. Listar redirect URIs actuales del App Registration (deben incluir /api/auth/callback/azure-ad mientras v4 esté vivo)
az ad app show --id <appId> --query "web.redirectUris" -o json

# 2. Listar claims que el token devuelve (validar que oid, preferred_username, email sigan ahí)
az ad app show --id <appId> --query "optionalClaims" -o json

# 3. Listar permisos API otorgados (User.Read mínimo para SSO; SCIM endpoint NO usa estos permisos)
az ad app permission list --id <appId> -o table

# 4. Service principal del Enterprise App — verificar que el SCIM provisioning sigue habilitado
az ad sp show --id <appId> --query "{name:displayName, accountEnabled:accountEnabled, appRoles:appRoles[].displayName}" -o json
```

**Ajustes que el agente debe hacer DURANTE la migración (Auth.js v5 cambia el provider id por default):**

```bash
# 5. Agregar la nueva redirect URI v5 SIN remover la v4 (rollback safety)
#    v4: https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad
#    v5: https://greenhouse.efeoncepro.com/api/auth/callback/microsoft-entra-id
az ad app update --id <appId> --web-redirect-uris \
  "https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad" \
  "https://greenhouse.efeoncepro.com/api/auth/callback/microsoft-entra-id" \
  "https://dev-greenhouse.efeoncepro.com/api/auth/callback/azure-ad" \
  "https://dev-greenhouse.efeoncepro.com/api/auth/callback/microsoft-entra-id"

# 6. Verificar tenant_id que la app espera (debe matchear AZURE_AD_TENANT_ID en Vercel/Secret Manager)
az ad app show --id <appId> --query "{signInAudience:signInAudience, tenantId:identifierUris}" -o json
```

**Verificaciones POST-migración (después de deploy a staging):**

```bash
# 7. Smoke del endpoint SSO con un usuario de prueba — captura el token devuelto
#    (esto requiere device code flow; ejecutar interactivo)
az login --tenant <tenant-id> --use-device-code --allow-no-subscriptions

# 8. Inspeccionar el ID token decodificado para verificar claims que Auth.js v5 espera
az account get-access-token --resource <appId-uri> --query accessToken -o tsv | \
  cut -d. -f2 | base64 -d 2>/dev/null | jq '{oid, preferred_username, email, tid}'

# 9. Confirmar que el SCIM provisioning del Enterprise App sigue activo y sincronizando
#    (no hay comando az nativo para SCIM sync status — requiere Microsoft Graph)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/<sp-objectId>/synchronization/jobs" \
  --query "value[].{id:id, status:status.code, lastSync:status.lastExecution.timeEnded}"
```

**Rollback path si algo se rompe:**

```bash
# 10. Remover SOLO la redirect URI nueva, dejando la v4 funcionando
az ad app update --id <appId> --web-redirect-uris \
  "https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad" \
  "https://dev-greenhouse.efeoncepro.com/api/auth/callback/azure-ad"
```

**Variables de entorno a confirmar en Vercel/Secret Manager (no cambian de nombre, solo el provider id en código):**

- `AZURE_AD_CLIENT_ID` — sigue igual (es el `appId`).
- `AZURE_AD_CLIENT_SECRET_REF` — sigue igual.
- `AZURE_AD_TENANT_ID` — sigue igual.
- `SCIM_BEARER_TOKEN_SECRET_REF` — **no se toca**, es independiente del SSO.

**Importante:** el SCIM provisioning del Enterprise App **no se ve** desde `az ad app` — vive en el Service Principal y se administra vía Microsoft Graph (`/synchronization/jobs`). El bearer token y la URL configurados en Azure Portal → Enterprise App → Provisioning siguen apuntando a nuestro `/api/scim/v2/*` y NO requieren cambios en TASK-516.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto` (auth runtime + edge + typed sessions)
- Effort: `Alto`
- Type: `platform` + `breaking`
- Status real: `Backlog — Ola 2 stack modernization (unblocked 2026-04-26)`
- Rank: `Post-TASK-515` (jose ya disponible)
- Domain: `auth` + `platform`
- Blocked by: `none` (TASK-515 cerrada 2026-04-26)
- Branch: `task/TASK-516-authjs-v5-migration`

## Summary

Migrar `next-auth 4.24.13` a Auth.js v5 (`next-auth 5.x beta`). v4 es legacy; v5 trae edge-compatible handler, typed sessions universal, named `auth()` export, integración nativa con App Router, provider API rediseñado.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 2.

## Why This Task Exists

v4 fue diseñado para Pages Router. App Router support es parche. v5:
- Single `auth()` function replaces `getServerSession`/`getToken`/useSession etc.
- Native App Router (Server Components + Middleware + Route Handlers).
- Edge runtime compatible.
- Typed session object (`import { auth } from '@/auth'` → typed).
- Provider API más limpio (credenciales, OAuth, email, etc.).
- Usa `jose` internamente (de ahí la dependencia TASK-515).

Linear, Vercel, shadcn-admin-kit, t3-app todos en v5.

## Estrategia de cutover (Decisión 2026-04-26 — patrón A+)

Esta migración es **breaking** y toca runtime de auth (SSO Azure, credentials, agent-auth, SCIM linking, sesiones JWT, middleware potencial). El big-bang (reemplazar v4 por v5 en un commit y re-deploy) deja sin auth a todo el portal si algo falla — clientes Globe, payroll en cierre, finance en facturación. Por eso el patrón es **wrapper canónico + feature flag + dual runtime + cutover por anillos**, no swap directo.

### Principios

1. **Inversión de dependencia**: ningún callsite del portal importa `getServerSession`/`auth`/`getToken` directamente. Todos pasan por `src/lib/auth/get-session.ts` (wrapper canónico). Esto se introduce **antes** de instalar v5 — refactor compatible con v4 — y es el primer commit de la migración.
2. **Coexistencia, no reemplazo**: `src/lib/auth.ts` (v4) y `src/auth.ts` (v5) viven en paralelo durante la transición. El wrapper lee `process.env.AUTH_RUNTIME_VERSION` (`v4` default | `v5`) y delega. Borrado de v4 ocurre solo después de soak en producción.
3. **Cutover reversible en segundos**: flip del env var en Vercel + redeploy de runtime config (~30s) revierte el runtime sin re-deploy del bundle. Sin esto, rollback = revert del PR = downtime medido en minutos.
4. **Sesiones versionadas**: callback `jwt` agrega `sessionVersion: 'v4' | 'v5'`. Si el runtime activo no matchea la versión del token, esa sesión específica se invalida y el usuario re-loguea — **no** todos los usuarios a la vez.
5. **Anillos**: nadie llega a producción sin pasar por staging. Staging soak mínimo 48h.
6. **Audit trail explícito**: cada cutover emite `identity.auth_runtime.cutover` al outbox con `from`, `to`, `actor`, `ring`, `timestamp`. Sirve para postmortem si algo se rompe horas después del flip.

### Anillos de cutover

| Anillo | Ámbito | Criterio de promoción |
| --- | --- | --- |
| 0 | Local (dev server del implementador) | Login Azure + credentials + agent-auth + SCIM verdes |
| 1 | Staging — allowlist por `user_id` (solo el implementador) | 24h sin Sentry incidents en flow auth |
| 2 | Staging — todos los `efeonce_internal` | 24h sin Sentry; `audit_events` de login sin gaps |
| 3 | Staging — todos los users (incluye `client`) | 48h sin Sentry; SCIM smoke verde 3 veces; agent-auth E2E verde |
| 4 | Production — flip global | Aprobación explícita del usuario después de soak |
| 5 | Borrado de v4 (commit/PR separado) | 7 días post-anillo 4 sin incidentes |

### Branch + worktree

- **Branch**: `task/TASK-516-authjs-v5-migration` (no se mergea directo a `develop` sin PR + revisión).
- **Worktree**: `.claude/worktrees/task-516/` para no contaminar el primary worktree.
- **PR**: contra `develop` con checklist de validación manual (los 5 flows: Azure SSO, credentials, agent-auth, SCIM smoke, acceso a `/finance/quotes`).

### Rollback paths (en orden de preferencia)

1. **Flip del flag** (`AUTH_RUNTIME_VERSION=v4`) en Vercel — segundos, sin redeploy de bundle.
2. **Revert del PR de cutover** (separado del PR de implementación) — minutos.
3. **Revert del PR de implementación completo** — última opción, requiere remover también el wrapper canónico.

### Pre-requisitos operativos antes de Anillo 1 (Azure CLI)

Ejecutar el playbook `az` documentado más arriba en este mismo archivo (sección "Azure por CLI"):

- Comando 5: agregar redirect URI `/api/auth/callback/microsoft-entra-id` SIN remover `/api/auth/callback/azure-ad` (dual durante toda la transición).
- Comando 6: confirmar `AZURE_AD_TENANT_ID` matchea entre Azure y Vercel.
- Sin estos cambios en Azure, el SSO con runtime `v5` falla con "redirect_uri_mismatch" en el primer login.

## Goal

1. **Fase 1 (compatible con v4)** — refactor de inversión de dependencia:
   - Crear `src/lib/auth/get-session.ts` wrapper canónico.
   - Migrar el único callsite directo de `getServerSession` (`src/lib/auth.ts:82`) y los 12 archivos con `useSession` a través del wrapper (server) o un hook delgado (`useGreenhouseSession`, client).
   - Crear `src/lib/auth/agent-session-encoder.ts` que abstrae el `encode` de `next-auth/jwt` que hoy usa `src/app/api/auth/agent-session/route.ts`. Permite swap del backend JWT sin tocar el endpoint.
   - **Sin instalar v5 todavía**. Este refactor debe pasar build+lint+test en main con v4 intacto.
2. **Fase 2 (instalar v5 en paralelo)**:
   - `pnpm add next-auth@beta` (no remover v4 aún — alias temporal o copy de v4 a `src/lib/auth-legacy.ts`).
   - Crear `src/auth.ts` con config v5 (providers reescritos, callbacks idénticos en lógica, `sessionVersion: 'v5'` en JWT).
   - Crear `src/app/api/auth/[...nextauth]/route.ts` v5 condicional al flag.
   - Wrapper `get-session.ts` lee `AUTH_RUNTIME_VERSION` y delega.
3. **Fase 3 (cutover ringed)**:
   - Anillo 0 → 1 → 2 → 3 → 4 según tabla.
   - Cada flip emite outbox event `identity.auth_runtime.cutover`.
4. **Fase 4 (cleanup)** — solo después de Anillo 5:
   - Remover `src/lib/auth-legacy.ts`, `src/lib/auth.ts` v4.
   - Remover el switch del wrapper (`get-session.ts` apunta solo a v5).
   - Remover env var `AUTH_RUNTIME_VERSION`.
   - Commit/PR separado y pequeño.

## Acceptance Criteria

### Fase 1 — wrapper canónico (DONE-able antes de instalar v5)

- [ ] `src/lib/auth/get-session.ts` wrapper canónico creado.
- [ ] Único callsite directo de `getServerSession` (en `src/lib/auth.ts:82`) usa el wrapper.
- [ ] 12 archivos con `useSession` usan `useGreenhouseSession` (hook delgado).
- [ ] `src/lib/auth/agent-session-encoder.ts` abstrae `next-auth/jwt` `encode`.
- [ ] `pnpm build`, `pnpm lint`, `pnpm test` verdes con v4 intacto.

### Fase 2 — v5 instalado en paralelo

- [ ] `next-auth@beta` (5.x) instalado; v4 NO removido todavía.
- [ ] `src/auth.ts` v5 con los 3 providers (`AzureAD`/`microsoft-entra-id`, `Google`, `Credentials`).
- [ ] `src/types/next-auth.d.ts` augmentado para v5 (sin romper v4 — typed namespace por versión si es necesario).
- [ ] Callback `jwt` agrega `sessionVersion`. Wrapper invalida sesiones cross-version.
- [ ] `src/app/api/auth/[...nextauth]/route.ts` exporta handler condicional al flag.
- [ ] `AUTH_RUNTIME_VERSION` registrado en `.env.example` (default `v4`).
- [ ] Build + lint + test + tsc verdes con flag en `v4` y en `v5` (probar ambos en CI).

### Fase 3 — cutover (cada anillo es checkbox separado)

- [ ] Anillo 0: smoke local verde (Azure + credentials + agent-auth + SCIM + acceso a `/finance/quotes`).
- [ ] Anillo 1: staging allowlist + 24h sin incidents.
- [ ] Anillo 2: staging full internal + 24h sin incidents.
- [ ] Anillo 3: staging full + 48h sin incidents + SCIM smoke 3x verde.
- [ ] Anillo 4: production flip aprobado por el usuario.
- [ ] Outbox events `identity.auth_runtime.cutover` emitidos en cada flip.

### Fase 4 — cleanup (commit/PR separado)

- [ ] v4 removido de `package.json` + `src/lib/auth-legacy.ts` borrado.
- [ ] Wrapper `get-session.ts` simplificado (sin switch).
- [ ] `AUTH_RUNTIME_VERSION` removido de Vercel + `.env.example`.

## Scope

### Archivos nuevos (Fase 1 + 2)

- `src/lib/auth/get-session.ts` — wrapper canónico server-side.
- `src/lib/auth/use-greenhouse-session.ts` — hook canónico client-side.
- `src/lib/auth/agent-session-encoder.ts` — abstracción del JWT encoder para agent-auth.
- `src/lib/auth/runtime-flag.ts` — lee `AUTH_RUNTIME_VERSION` con fail-safe a `v4`.
- `src/auth.ts` — config v5 (Fase 2).
- `src/lib/auth-legacy.ts` — copia de `src/lib/auth.ts` v4 que el wrapper usa cuando flag = `v4`.

### Archivos modificados (Fase 1)

- `src/lib/auth.ts` — el callsite directo `getServerSession` se mueve al wrapper (line 82).
- 12 archivos con `useSession`:
  - `src/components/layout/vertical/VerticalMenu.tsx` (y la copia `VerticalMenu (1).tsx` — verificar si es activa).
  - `src/components/layout/shared/UserDropdown.tsx`
  - `src/views/greenhouse/GreenhouseSettings.tsx`
  - `src/views/greenhouse/organizations/OrganizationView.tsx`
  - `src/views/greenhouse/people/PersonView.tsx`
  - `src/views/greenhouse/people/PeopleList.tsx`
  - `src/views/greenhouse/payroll/PayrollPeriodTab.tsx` (+ test)
  - `src/views/greenhouse/finance/ClientDetailView.tsx` (+ test)
  - `src/views/greenhouse/finance/workspace/QuoteCreateDrawer.tsx`
- `src/app/api/auth/agent-session/route.ts` — usa el encoder abstraído.
- `src/types/next-auth.d.ts` — augment compatible con ambas versiones.

### Archivos modificados (Fase 2)

- `src/app/api/auth/[...nextauth]/route.ts` — handler condicional al flag.
- `package.json` — `next-auth@beta` añadido (sin remover v4).

### Archivos no tocados (out of scope durante implementación)

- `src/app/api/scim/**` — SCIM no usa NextAuth (verificado 2026-04-26).
- `src/lib/tenant/access.ts` — solo se valida que el linking siga matcheando con `microsoft_oid` post-v5; no se reescribe.
- `src/lib/tenant/authorization.ts` — internamente sigue usando el wrapper canónico.

## Out of Scope

- Cambiar providers (solo migración).
- Introducir passkeys / webauthn (TASK futura).
- Rebrand de auth pages (preserva el actual).
- Migrar agent-auth a un pattern unificado con el flow web (TASK futura — el encoder abstraído deja la puerta abierta sin forzar el cambio ahora).
- Auto-rollback por health check (Fase v2 si aparece necesidad post-soak).

## Riesgos identificados y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| `next-auth@5.0.0-beta.x` cambia API entre minor releases | Media | Medio | Pin exacto (no `^`); upgrade explícito en task futura |
| Provider id rename `azure-ad` → `microsoft-entra-id` rompe linking SSO existente | Alta | Alto | Redirect URI dual en Azure (playbook `az` arriba); compat layer en callback |
| JWT v4 ↔ v5 incompatibles → todos los usuarios deslogeados al cutover | Alta | Alto | `sessionVersion` en token + invalidación selectiva por sesión |
| Agent-auth (`/api/auth/agent-session`) emite cookies con formato v4 que v5 no acepta | Alta | Alto | `agent-session-encoder.ts` abstrae el formato; encoder lee el flag activo |
| SCIM linking se rompe porque `oid` claim cambia de shape | Baja | Alto | Anillo 3 incluye smoke "login de user provisionado por SCIM que nunca hizo SSO" |
| Vercel preview de PRs no respeta el flag (default a v4 indefinidamente) | Media | Bajo | Documentar en PR description: previews usan v4 hasta merge a `develop` |
| Edge runtime middleware (no existe hoy) introducido en v5 quiebra cold start | Baja | Medio | No introducir middleware nuevo en esta task; queda para follow-up |

## Follow-ups

- TASK futura: passkeys con Auth.js v5 + `@simplewebauthn`.
- TASK futura: migración del agent-auth flow a un pattern unificado con el flow web (el encoder abstraído lo facilita).
- TASK futura: middleware edge para early auth check (post-cutover, una vez v5 estable).
- TASK futura: auto-rollback por health check si hay incidentes en Anillo 4 que justifiquen automatización.
