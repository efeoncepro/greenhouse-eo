# TASK-823 — Client Portal API Namespace: /api/client-portal/* Read Endpoints

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseno (desbloqueada 2026-05-12 al cerrar TASK-822)`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `none` (TASK-822 cerrada 2026-05-12)
- Branch: `task/TASK-823-client-portal-api`

## Delta 2026-05-12 — TASK-822 cerrada, desbloqueo aplicado

TASK-822 cerró el BFF foundation. Cuando arranque esta task:

- `src/lib/client-portal/` ya existe con DTO `ClientPortalReaderMeta`, Sentry domain `client_portal` registrado, ESLint rule `greenhouse/no-cross-domain-import-from-client-portal` activa, y 2 curated re-exports demostrativos (`account-summary`, `ico-overview`).
- Los endpoints `/api/client-portal/*` deben **consumir** `@/lib/client-portal/*` (allowed direction); jamás importarse desde producer domains.
- Cualquier reader nuevo que necesite el API: si vive en un producer domain, re-exportar via `src/lib/client-portal/readers/curated/<name>.ts` + `ClientPortalReaderMeta` tipado; si emerge nativo del BFF, va a `readers/native/` (primer candidato natural es el resolver de TASK-825).
- `captureWithDomain(err, 'client_portal', { extra })` es el wrapper canónico para errores; NO `Sentry.captureException()` directo.
- Spec actualizada V1.1 con §3.1 (Module classification) + §3.2 (Domain import direction).

## Summary

Crea el namespace canónico `/api/client-portal/*` con los endpoints de lectura client-facing más críticos consolidados (módulos visibles, account summary, modules health). Usa `requireServerSession` + `redactErrorForResponse` + `captureWithDomain('client_portal', ...)`. Establece el patrón canónico que TASK-826 (admin endpoints) replicará.

## Why This Task Exists

Hoy las APIs que sirven al portal cliente viven dispersas: `/api/agency/*`, `/api/me/*`, `/api/dashboard/*`. Sin namespace consolidado, el cliente debe componer múltiples llamadas y los guards son inconsistentes. Establecer `/api/client-portal/*` con un patrón uniforme es prerequisito para TASK-825 (resolver endpoint) y TASK-827 (UI consume single namespace).

## Goal

- `GET /api/client-portal/health` — public read-only readiness del dominio
- `GET /api/client-portal/account-summary` — composición read del cliente actual (re-uses TASK-822 readers)
- Patrón canónico de endpoint client_portal documentado (auth + redaction + captureWithDomain)
- Tests integration: 401 sin session, 200 con session válida, redaction passes

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §9 (API Surface)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `CLAUDE.md` sección "Auth en server components" + "Output redaction"

Reglas obligatorias:

- `requireServerSession()` en todos los endpoints write; `getOptionalServerSession()` para health
- Cliente lee SU PROPIO data: `session.user.organizationId` resuelve scope
- `redactErrorForResponse` antes de cualquier 4xx/5xx
- `captureWithDomain(err, 'client_portal', { tags: { source, endpoint } })` en catch
- Errors NUNCA exponen `error.stack` ni env vars
- 401 si no session; 403 si session no es de un cliente (tenant_type != 'client')

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

- `src/app/api/client-portal/health/route.ts`
- `src/app/api/client-portal/account-summary/route.ts`
- `src/lib/client-portal/api/auth-guard.ts` (helper reusable: requireClientSession)
- `src/app/api/client-portal/__tests__/*.test.ts`

## Current Repo State

### Already exists

- TASK-822 produce `src/lib/client-portal/` consolidado
- API patterns en `/api/admin/*` consolidados (TASK-742+)
- `requireServerSession` + redaction helpers

### Gap

- No existe `/api/client-portal/*` namespace
- No hay helper `requireClientSession` (validar tenant_type='client')

## Scope

### Slice 1 — Helper auth guard

- `requireClientSession()` en `src/lib/client-portal/api/auth-guard.ts`:
  - Llama `requireServerSession()`
  - Valida `session.user.tenant_type === 'client'`
  - Si no, throw con redirect a `/login` o 403 según contexto
  - Devuelve `{ session, organizationId, clientId }`

### Slice 2 — `GET /api/client-portal/health`

- Public-ish (no requiere session)
- Devuelve `{ contractVersion: 'client-portal-health.v1', status: 'ok'|'degraded', timestamp }`
- Tests: 200 verde, response shape matches contract

### Slice 3 — `GET /api/client-portal/account-summary`

- Auth: `requireClientSession()`
- Reads from `@/lib/client-portal/readers/account-summary` (TASK-822 re-export)
- Response: composición de cliente activo + lifecycle stage + lista de servicios activos
- Errors via `redactErrorForResponse`

### Slice 4 — Tests integration

- 401 sin session
- 403 con session no-cliente (tenant_type='efeonce_internal')
- 200 happy path con cliente
- Verify response NO contiene env vars / stack traces
- `pnpm test src/app/api/client-portal` verde

## Out of Scope

- Resolver modules endpoint (`GET /api/client-portal/modules`) — TASK-825 lo agrega
- Admin endpoints — TASK-826
- Write endpoints — TASK-826

## Detailed Spec

```ts
// src/lib/client-portal/api/auth-guard.ts
export async function requireClientSession(): Promise<{
  session: Session
  organizationId: string
  clientId: string | null
}> {
  const session = await requireServerSession('/login')
  if (session.user.tenantType !== 'client') {
    throw new ClientPortalForbiddenError('Not a client session')
  }
  return {
    session,
    organizationId: session.user.organizationId!,
    clientId: session.user.clientId ?? null,
  }
}

// src/app/api/client-portal/account-summary/route.ts
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { organizationId } = await requireClientSession()
    const summary = await getClientAccountSummary(organizationId)
    return Response.json(summary)
  } catch (err) {
    captureWithDomain(err, 'client_portal', {
      tags: { source: 'api_endpoint', endpoint: 'account_summary' }
    })
    return redactErrorForResponse(err)
  }
}
```

## Acceptance Criteria

- [ ] `requireClientSession()` helper funciona y tests cubren happy/401/403
- [ ] `GET /api/client-portal/health` retorna contract `client-portal-health.v1`
- [ ] `GET /api/client-portal/account-summary` retorna data del cliente actual
- [ ] 401 sin session
- [ ] 403 con session efeonce_internal
- [ ] 200 happy path
- [ ] Errors sanitizados (sin stack, sin env)
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/app/api/client-portal` verde

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/app/api/client-portal src/lib/client-portal/api`
- Smoke manual: invocar health desde browser sin session → 200; account-summary sin session → 401

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo cruzado: TASK-825 desbloqueada (puede agregar `/modules` endpoint al namespace)

## Follow-ups

- TASK-825 agrega `GET /api/client-portal/modules` al namespace
- Considerar OpenAPI doc para namespace en V1.1

## Open Questions

- ¿Health endpoint expone breakdown de subsistemas o solo agregado? Recomendación: agregado en V1.0 (status); breakdown en V1.1 si reliability lo requiere.
