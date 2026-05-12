# TASK-823 — Client Portal API Namespace: /api/client-portal/* Read Endpoints

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Bajo` (reducido a 1 endpoint atómico V1.0)
- Effort: `Muy Bajo` (sin helper + sin health endpoint)
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Implementacion v1.1 directo en develop (sin branch separada por instruccion operativa 2026-05-12)`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `none` (TASK-822 cerrada 2026-05-12)
- Branch: `develop` (direct work, no feature branch — user override)

## Delta 2026-05-12 — TASK-822 cerrada, desbloqueo aplicado

TASK-822 cerró el BFF foundation. Cuando arranque esta task:

- `src/lib/client-portal/` ya existe con DTO `ClientPortalReaderMeta`, Sentry domain `client_portal` registrado, ESLint rule `greenhouse/no-cross-domain-import-from-client-portal` activa, y 2 curated re-exports demostrativos (`account-summary`, `ico-overview`).
- Los endpoints `/api/client-portal/*` deben **consumir** `@/lib/client-portal/*` (allowed direction); jamás importarse desde producer domains.
- Cualquier reader nuevo que necesite el API: si vive en un producer domain, re-exportar via `src/lib/client-portal/readers/curated/<name>.ts` + `ClientPortalReaderMeta` tipado; si emerge nativo del BFF, va a `readers/native/` (primer candidato natural es el resolver de TASK-825).
- `captureWithDomain(err, 'client_portal', { extra })` es el wrapper canónico para errores; NO `Sentry.captureException()` directo.
- Spec actualizada V1.1 con §3.1 (Module classification) + §3.2 (Domain import direction).

## Delta 2026-05-12 (segunda revisión — arch-architect verdict v1.1 aplicado pre-Slice-1)

Cuatro correcciones estructurales al spec original (dos bloqueantes + dos polish):

1. **Bug de compilacion corregido (Issue 1)** — el snippet del Detailed Spec usaba `return redactErrorForResponse(err)` pero ese helper retorna `string`, NO `Response`. Pattern canónico repo-wide (verificado en `admin/releases/route.ts`, TASK-553, TASK-867): `return NextResponse.json({ error: redactErrorForResponse(err) }, { status: 500 })`. También `Response.json(summary)` → `NextResponse.json(summary)` (convention repo).
2. **Reader name canónico (Issue 2)** — el spec asumía `getClientAccountSummary` pero TASK-822 Slice 4 re-exportó `getOrganizationExecutiveSnapshot` (honrando "firma exacta" V1.1 §3.1, sin renombrar al cruzar el BFF). El endpoint URL `/api/client-portal/account-summary` se preserva (es el contrato público); solo cambia el call interno.
3. **Helper `requireClientSession` skipeado (Issue 3)** — la task original proponía crear `src/lib/client-portal/api/auth-guard.ts`. Pero el patrón canónico de TASK-553 (`/api/me/shortcuts`) muestra que el check de `tenantType` se hace inline en cada route handler con cero ceremonia. Crear un helper específico del BFF cuando el patrón es 3 líneas duplica ceremonia sin ganancia. **Si emerge 2do BFF (partner_portal, vendor_portal)**, extraer `requireSessionByTenantType(allowed: TenantType[])` genérico en `src/lib/auth/require-server-session.ts` (mismo módulo que `requireServerSession`). Pre-emptive abstraction = drift.
4. **`/health` endpoint eliminado V1.0 (Issue 4)** — `client_portal` es BFF puro sin infrastructure propia. Un endpoint health performativo que retorne `{status:'ok'}` sin chequear subsistemas reales (que ya tienen sus propios health endpoints: account-360, ico-engine, agency, etc.) es ruido. El contract canónico `/api/admin/platform-health` (TASK-672) compone health cross-domain; cuando emerja necesidad real, extender ese composer con un source `client_portal_bff` que chequee algo real (e.g. lag de `client.portal.*` outbox events una vez existan en TASK-826). Reduce surface, evita falsa confianza.

Resultado del reframe: **1 endpoint** (`/api/client-portal/account-summary`) + **0 helpers nuevos** + **3 tests** (401/403/200). Atómico, demostrable, sin ceremonia preventiva.

## Summary

Crea el namespace canónico `/api/client-portal/*` con **1 endpoint atómico V1.0**: `GET /api/client-portal/account-summary`. Consume el BFF de TASK-822 (`@/lib/client-portal/readers/curated/account-summary` → `getOrganizationExecutiveSnapshot`). Usa `requireServerSession()` + check inline de `tenantType === 'client'` (patrón canónico TASK-553) + `redactErrorForResponse` envuelto en `NextResponse.json` + `captureWithDomain('client_portal', ...)`. Establece el patrón canónico que TASK-825 (`/modules`) y TASK-826 (admin endpoints) replicarán.

## Why This Task Exists

Hoy las APIs que sirven al portal cliente viven dispersas: `/api/agency/*`, `/api/me/*`, `/api/dashboard/*`. Sin namespace consolidado, el cliente debe componer múltiples llamadas y los guards son inconsistentes. Establecer `/api/client-portal/*` con un patrón uniforme es prerequisito para TASK-825 (resolver endpoint) y TASK-827 (UI consume single namespace).

## Goal

- `GET /api/client-portal/account-summary` — read del executive snapshot del cliente actual (re-uses TASK-822 BFF re-export)
- Patrón canónico de endpoint client_portal documentado (auth inline + redaction + captureWithDomain + NextResponse.json)
- Tests integration: 401 sin session, 403 con session no-cliente, 200 happy path, redaction passes

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §9 (API Surface)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `CLAUDE.md` sección "Auth en server components / layouts / pages — patrón canónico" + "Output redaction"
- Patrón fuente canónico: `/api/me/shortcuts/route.ts` (TASK-553) — endpoint client-self-scope con `getServerAuthSession` + tenant check inline + `redactErrorForResponse` envuelto en `NextResponse.json` + `captureWithDomain`. Clonar verbatim.

Reglas obligatorias:

- `requireServerSession()` (canonical, NO `getServerAuthSession()` directo — ver CLAUDE.md "Auth en server components")
- Cliente lee SU PROPIO data: `session.user.organizationId` resuelve scope
- Check inline `if (session.user.tenantType !== 'client') return NextResponse.json({error}, {status: 403})` — NO crear helper específico V1.0 (drift de pre-emptive abstraction; ver Delta 2026-05-12 segunda revisión Issue 3)
- `redactErrorForResponse(err)` retorna `string`; envolver en `NextResponse.json({ error: redactErrorForResponse(err) }, { status })` (NO retornar el string directo — no compila como Response)
- `NextResponse.json(...)` consistentemente (NO `Response.json(...)`)
- `captureWithDomain(err, 'client_portal', { tags: { source: 'api_endpoint', endpoint: 'account_summary' } })` en catch
- Errors NUNCA exponen `error.stack` ni env vars (helper canónico ya lo enforce)
- 401 si no session (return JSON, NO redirect — las APIs no redirigen); 403 si session no es de un cliente (`tenantType != 'client'`)

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §9

## Dependencies & Impact

### Depends on

- TASK-822 (`src/lib/client-portal/` existe + Sentry domain registrado)
- `requireServerSession`, `redactErrorForResponse`, `captureWithDomain` ✅ existe

### Blocks / Impacts

- TASK-825 (resolver endpoint `GET /api/client-portal/modules` se agrega aquí en su slice)
- TASK-827 (UI consume estos endpoints)

### Files owned

- `src/app/api/client-portal/account-summary/route.ts`
- `src/app/api/client-portal/__tests__/account-summary.test.ts`

NO se crean (eliminados por verdict v1.1):

- ~~`src/app/api/client-portal/health/route.ts`~~ — health performativo eliminado (Issue 4); extender `/api/admin/platform-health` (TASK-672) cuando emerja necesidad real.
- ~~`src/lib/client-portal/api/auth-guard.ts`~~ — pre-emptive abstraction eliminada (Issue 3); inline check estilo TASK-553. Promover a `requireSessionByTenantType` genérico en `src/lib/auth/` si emerge 2do BFF.

## Current Repo State

### Already exists

- TASK-822 produce `src/lib/client-portal/` consolidado con re-export `getOrganizationExecutiveSnapshot` en `readers/curated/account-summary.ts`.
- API patterns canónicos: `/api/me/shortcuts/route.ts` (TASK-553) — fuente reusable.
- `requireServerSession()` en `src/lib/auth/require-server-session.ts` + `redactErrorForResponse` en `src/lib/observability/redact.ts` + `captureWithDomain` en `src/lib/observability/capture.ts` (incluye domain `client_portal` desde TASK-822 Slice 2).

### Gap

- No existe `/api/client-portal/*` namespace en `src/app/api/`.

## Scope

### Slice 1 — `GET /api/client-portal/account-summary`

Endpoint canónico V1.0, único de la task. Estructura:

- Auth: `requireServerSession()` (canonical, prerender-safe).
- Tenant check inline: si `session.user.tenantType !== 'client'` → `NextResponse.json({error: 'Not a client session'}, {status: 403})`.
- Reads from `@/lib/client-portal/readers/curated/account-summary` (TASK-822 re-export → `getOrganizationExecutiveSnapshot`).
- Response: el `OrganizationExecutiveSnapshot` tal cual (firma exacta, no compose ni shape nueva). Si UI emerge necesitando shape distinta (TASK-827), reclasificar como `native` con `ownerDomain: null` per spec §3.1.
- Errors: `try/catch` envuelve la llamada; en catch `captureWithDomain(err, 'client_portal', { tags: { source: 'api_endpoint', endpoint: 'account_summary' } })` + `return NextResponse.json({ error: redactErrorForResponse(err) }, { status: 500 })`.
- `export const dynamic = 'force-dynamic'` (canonical).

### Slice 2 — Tests integration

- 401 sin session (`requireServerSession` redirect / null check).
- 403 con session no-cliente (`tenantType='efeonce_internal'`).
- 200 happy path con session cliente válida + organizationId resolved.
- Verify response payload NO contiene `error.stack`, env vars, GCP secret URIs (helper `redactErrorForResponse` ya scrubea; test re-verify).
- `pnpm test src/app/api/client-portal` verde.

## Out of Scope

- Resolver modules endpoint (`GET /api/client-portal/modules`) — TASK-825 lo agrega al namespace.
- Admin endpoints — TASK-826.
- Write endpoints — TASK-826.
- `GET /api/client-portal/health` — eliminado V1.0 por verdict v1.1. Cuando emerja necesidad real de health específico del BFF, extender el composer canónico `/api/admin/platform-health` (TASK-672) con un source nuevo `client_portal_bff` que chequee algo concreto (e.g. lag de `client.portal.*` outbox events una vez existan en TASK-826).
- `requireClientSession` / `requireSessionByTenantType` helper extraction — emerge cuando exista un 2do BFF (`partner_portal`, `vendor_portal`, etc.).

## Detailed Spec

Pattern canónico V1.0 — mirror exacto del shape de TASK-553 (`/api/me/shortcuts/route.ts`):

```ts
// src/app/api/client-portal/account-summary/route.ts
import { NextResponse } from 'next/server'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { getOrganizationExecutiveSnapshot } from '@/lib/client-portal/readers/curated/account-summary'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

export const dynamic = 'force-dynamic'

export const GET = async () => {
  try {
    const session = await requireServerSession()

    if (session.user.tenantType !== 'client') {
      return NextResponse.json(
        { error: 'Not a client session' },
        { status: 403 }
      )
    }

    const organizationId = session.user.organizationId

    if (!organizationId) {
      // Defensive: tenant_type='client' DEBE tener organizationId resuelto en el
      // session callback. Si emerge en producción, hay drift en auth.ts.
      captureWithDomain(
        new Error('client session missing organizationId'),
        'client_portal',
        { tags: { source: 'api_endpoint', endpoint: 'account_summary', stage: 'session_validation' } }
      )

      return NextResponse.json(
        { error: 'Session incomplete' },
        { status: 500 }
      )
    }

    const snapshot = await getOrganizationExecutiveSnapshot(organizationId)

    return NextResponse.json(snapshot)
  } catch (err) {
    captureWithDomain(err, 'client_portal', {
      tags: { source: 'api_endpoint', endpoint: 'account_summary' }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(err) },
      { status: 500 }
    )
  }
}
```

Notas del pattern:

- **NO helper extraído** — el check de `tenantType` es 5 líneas inline. Si emerge un 2do BFF, extraer `requireSessionByTenantType(allowed: TenantType[])` genérico en `src/lib/auth/require-server-session.ts`.
- **Defense in depth para `organizationId` null** — el session callback de NextAuth DEBE poblar `organizationId` para clientes; si emerge en runtime, captura a Sentry con stage explícito + 500 honesto (no asume invariant en hot path).
- **`requireServerSession()` sin argumento** — si no hay session, hace redirect a `/login`; para APIs strict-401, usar `getOptionalServerSession()` + check explícito. V1.0 mantiene el redirect (consistente con TASK-553); operadores comerciales que invoquen el endpoint sin session quedan redirected al login form, NextAuth callback los devuelve. NO crear contract paralelo de "401 JSON sin redirect" hasta que emerja consumer concreto (e.g. mobile native que NO renderiza HTML — out of scope V1.0).

## Acceptance Criteria

- [ ] `GET /api/client-portal/account-summary` retorna `OrganizationExecutiveSnapshot` del cliente actual (firma exacta del re-export TASK-822, sin shape custom)
- [ ] 401 / redirect a `/login` cuando no hay session (comportamiento `requireServerSession` default)
- [ ] 403 con JSON `{error: 'Not a client session'}` cuando `tenantType !== 'client'`
- [ ] 500 con JSON `{error: '...'}` cuando reader falla; error sanitizado por `redactErrorForResponse` (sin `error.stack`, sin env vars, sin GCP secret URIs)
- [ ] Sentry event emitido con `tags.domain='client_portal'` + `tags.source='api_endpoint'` + `tags.endpoint='account_summary'` en path de catch
- [ ] Tests integration en `src/app/api/client-portal/__tests__/account-summary.test.ts` cubren los 3 estados (no-session, no-client, happy-path)
- [ ] `NextResponse.json` consistente (NO `Response.json`)
- [ ] `export const dynamic = 'force-dynamic'` presente
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/app/api/client-portal` verde
- [ ] Grep verifica que NO se creó `src/lib/client-portal/api/` (helper skipeado V1.0)
- [ ] Grep verifica que NO se creó `src/app/api/client-portal/health/` (health endpoint eliminado V1.0)

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/app/api/client-portal`
- Smoke manual: invocar `account-summary` desde browser sin session → redirect a `/login`; con session efeonce_internal → 403 JSON; con session client + organizationId válido → 200 con shape `OrganizationExecutiveSnapshot`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo cruzado: TASK-825 desbloqueada (puede agregar `/modules` endpoint al namespace canónico)

## Follow-ups

- TASK-825 agrega `GET /api/client-portal/modules` al namespace (resolver canónico, primer reader **nativo** del BFF)
- Considerar OpenAPI doc para namespace en V1.1 (cuando haya ≥3 endpoints)
- V1.1 candidate: extraer `requireSessionByTenantType(allowed: TenantType[])` genérico en `src/lib/auth/` cuando emerja 2do BFF
- V1.1 candidate: extender `/api/admin/platform-health` (TASK-672) con source `client_portal_bff` si emerge necesidad real de health del BFF

## Open Questions

- (Resuelta por verdict v1.1) ~~¿Health endpoint expone breakdown de subsistemas o solo agregado?~~ → eliminado del scope V1.0 por performativo (Issue 4 verdict v1.1).
- Cuando UI cliente (TASK-827) emerja y necesite shape distinta al `OrganizationExecutiveSnapshot` crudo (e.g. filtrar campos sensibles per-role), ¿se compose en el endpoint o en un reader nativo de `src/lib/client-portal/readers/native/`? Recomendación: nativo en `readers/native/account-summary-for-portal.ts` con `classification: 'native'` + `ownerDomain: null` + `dataSources: ['account_360.summary']` (el reader curated demuestra el shape underlying). Decisión final cuando TASK-827 land.
