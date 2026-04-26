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

## Goal

1. Upgrade `next-auth` 4 → 5.
2. Refactor `src/app/api/auth/[...nextauth]/route.ts` al pattern v5: exportar `{ GET, POST, auth, signIn, signOut }`.
3. Crear `src/auth.ts` con config central (providers, callbacks, session, pages).
4. Migrar callsites: `getServerSession()` → `auth()`, `getToken()` → `auth()`, `useSession()` → sigue existiendo pero revisado.
5. Actualizar middleware si lo hay.
6. Preservar providers actuales (credentials, magic link, etc.).
7. Preservar agent-auth endpoint (`/api/auth/agent-session`) — flow paralelo, no migrar.
8. Migrar types: `next-auth.d.ts` global augmentation → nuevo pattern v5.

## Acceptance Criteria

- [ ] `next-auth` 5.x instalado.
- [ ] `src/auth.ts` es el config canónico.
- [ ] `auth()` reemplaza todos los `getServerSession`/`getToken`.
- [ ] Session object tipado globalmente (augmented con roles, tenant, etc.).
- [ ] Login flow manual funciona (smoke test).
- [ ] Agent auth sigue funcional (sin cambios).
- [ ] Middleware edge-runtime funcional si aplica.
- [ ] Tests de auth pasan.
- [ ] Smoke staging: login → session valid → access `/finance/quotes`.

## Scope

- `src/app/api/auth/[...nextauth]/route.ts` — refactor a v5.
- `src/auth.ts` — nuevo archivo central.
- `src/lib/tenant/authorization.ts` — revisar, seguir usando `auth()` internamente.
- Grep + migrate: `getServerSession`, `getToken`, type imports.
- `next-auth.d.ts` → augment types v5.
- Providers: credentials (canonical), cualquier otro presente.

## Out of Scope

- Cambiar providers (solo migración).
- Introducir passkeys / webauthn (TASK futura).
- Rebrand de auth pages (preserva el actual).

## Follow-ups

- TASK futura: passkeys con Auth.js v5 + @simplewebauthn.
- TASK futura: migration del agent-auth flow a un pattern unificado.
