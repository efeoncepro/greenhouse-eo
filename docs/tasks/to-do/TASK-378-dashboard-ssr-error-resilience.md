# TASK-378 — Dashboard SSR Error Resilience

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Pendiente`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-378-dashboard-ssr-error-resilience`
- Legacy ID: —
- GitHub Issue: —

## Summary

Todas las paginas bajo `(dashboard)/` devuelven HTTP 500 cuando se acceden via agent auth headless en staging. Las APIs funcionan (200) y la sesion es valida, pero el SSR de las paginas falla sin error visible. Esto bloquea la verificacion E2E automatizada del portal y es un problema de resiliencia: un error no manejado en el layout SSR derriba TODAS las paginas sin diagnostico.

## Why This Task Exists

Durante la verificacion E2E de TASK-373 (sidebar reorganization) se descubrio que el agente dedicado (`user-agent-e2e-001`, `efeonce_admin`) no puede acceder a ninguna pagina del portal via headless request. El issue es **pre-existente** — se reproduce con deployments anteriores a cualquier cambio de la sesion actual.

El patron de fallo es:

| Request | Status | Nota |
|---------|--------|------|
| `POST /api/auth/agent-session` | 200 | Sesion valida, 63 authorizedViews |
| `GET /api/auth/session` | 200 | JWT decodifica OK |
| `GET /api/people` | 200 | PostgreSQL accesible |
| `GET /api/agency/operations` | 200 | PostgreSQL accesible |
| `GET /api/hr/core/org-chart` | 200 | PostgreSQL accesible |
| `GET /login` | 200 | Pagina sin layout (dashboard) |
| `GET /home` | **500** | Pagina con layout (dashboard) — solo `<HomeView />`, sin data fetching |
| `GET /admin` | **500** | Pagina con layout (dashboard) |
| `GET /finance` | **500** | Pagina con layout (dashboard) |
| `GET /my/profile` | **500** | Pagina con layout (dashboard) |
| `GET /settings` | **500** | Pagina con layout (dashboard) |

El `/home` es la prueba mas clara: su page component es solo `<HomeView />` (client component sin SSR data fetching), asi que el error esta en el **layout compartido** (`src/app/(dashboard)/layout.tsx`) o en el componente `Providers` que este invoca.

## Goal

- Las paginas del portal NO devuelven 500 por errores no manejados en el layout SSR
- El layout es resiliente a fallos parciales (DB no accesible, servicio degradado) — degrada gracefully en vez de derrumbar la pagina completa
- La verificacion E2E via agente funciona end-to-end para al menos las paginas que no requieren data fetching propio
- Los errores de SSR son diagnosticables (logged con contexto, no silenciosos)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_STAGING_ACCESS_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`

## Normative Docs

- `src/app/(dashboard)/layout.tsx` — layout compartido de todas las paginas del portal
- `src/components/Providers.tsx` — provider chain que el layout invoca (SSR, async)
- `src/lib/account-360/organization-identity.ts` — `getOperatingEntityIdentity()` (PG query sin try-catch)
- `src/lib/auth.ts` — `getServerAuthSession()` (tiene try-catch)
- `src/@core/utils/serverHelpers.ts` — `getMode()`, `getSystemMode()` (tienen try-catch)
- `scripts/staging-request.mjs` — script de requests headless a staging

## Dependencies & Impact

### Depends on

- Ninguna — es un fix de resiliencia independiente.

### Blocks / Impacts

- Verificacion E2E automatizada — hoy imposible para paginas SSR
- Confiabilidad del portal — un error en `getOperatingEntityIdentity()` o cualquier provider derriba TODAS las paginas
- Monitoring — errores silenciosos no son diagnosticables

### Files owned

- `src/app/(dashboard)/layout.tsx`
- `src/components/Providers.tsx`
- `src/lib/account-360/organization-identity.ts`
- `docs/tasks/to-do/TASK-378-dashboard-ssr-error-resilience.md`

## Current Repo State

### Already exists

- `getServerAuthSession()` en `auth.ts` tiene try-catch y degrada a `null` (resiliente)
- `getSettingsFromCookie()` en `serverHelpers.ts` tiene try-catch (resiliente)
- Agent auth endpoint funciona correctamente (`/api/auth/agent-session`)
- `staging-request.mjs` maneja auth + bypass correctamente

### Gap

- `getOperatingEntityIdentity()` en linea 78 hace `runGreenhousePostgresQuery` sin try-catch — si la DB no responde o la query falla, el error sube sin manejar hasta el layout SSR y causa 500
- `Providers.tsx` linea 36: `await getOperatingEntityIdentity()` sin try-catch — propaga el error al layout
- El layout no tiene `error.tsx` boundary para paginas del dashboard
- No hay logging estructurado del error SSR — el 500 es silencioso
- No existe un `src/app/(dashboard)/error.tsx` (Next.js Error Boundary)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Error resilience en Providers

Hacer que `Providers.tsx` sea resiliente a fallos parciales:

- Envolver `getOperatingEntityIdentity()` en try-catch con fallback a `null`
- Log el error con contexto (`[Providers] getOperatingEntityIdentity failed: ...`)
- El portal debe renderizar correctamente con `operatingEntity = null` (ya es nullable en el tipo)

### Slice 2 — Error boundary para dashboard pages

Crear `src/app/(dashboard)/error.tsx` como Error Boundary de Next.js:

- Mostrar una vista de error amigable con opcion de reintentar
- Log el error con contexto (para que aparezca en Vercel runtime logs)
- Usar patrones existentes de EmptyState o un componente de error simple

### Slice 3 — Hardening de data fetching en page server components

Revisar las paginas de mayor uso y agregar error handling a sus `force-dynamic` fetches:

- El patron debe ser: `try { data = await fetchX() } catch { data = null }` + render con empty state si data es null
- Priorizar: `/admin`, `/dashboard`, `/finance`, `/home`
- No convertir TODAS las paginas — solo las mas criticas

### Slice 4 — Verificacion E2E del fix

- Ejecutar `pnpm staging:request /home`, `/admin`, `/settings` via agente y confirmar HTTP 200
- Documentar que la verificacion E2E funciona en `GREENHOUSE_STAGING_ACCESS_V1.md`

## Out of Scope

- Resolver por que la DB falla para el agente especificamente (si es que falla — el error real aun no esta diagnosticado, solo se ve el 500)
- Migrar todas las paginas a error-resilient — solo las criticas
- Crear un sistema de health check automatizado (follow-up)
- Cambiar la arquitectura de SSR de Next.js

## Detailed Spec

### Principio rector

**Degrade gracefully, never crash silently.** El portal debe:
1. Renderizar con datos parciales cuando un servicio falla
2. Mostrar un error boundary amigable cuando el rendering falla completamente
3. Logear cada error con suficiente contexto para diagnosticarlo en Vercel logs

### Patron resiliente para Providers

```typescript
// Providers.tsx — before
const operatingEntity = session ? await getOperatingEntityIdentity() : null

// Providers.tsx — after
let operatingEntity: OperatingEntityIdentity | null = null
if (session) {
  try {
    operatingEntity = await getOperatingEntityIdentity()
  } catch (error) {
    console.error('[Providers] getOperatingEntityIdentity failed:', error)
  }
}
```

### Patron para Error Boundary

```typescript
// src/app/(dashboard)/error.tsx
'use client'
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[Dashboard Error Boundary]', error) }, [error])
  return (
    <Box sx={{ p: 6, textAlign: 'center' }}>
      <Typography variant='h5'>Algo salio mal</Typography>
      <Typography variant='body2' color='text.secondary'>...</Typography>
      <Button onClick={reset}>Reintentar</Button>
    </Box>
  )
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GET /home` via agente dedicado en staging devuelve HTTP 200 (no 500)
- [ ] `GET /admin` via agente dedicado devuelve HTTP 200
- [ ] `GET /settings` via agente dedicado devuelve HTTP 200
- [ ] Si `getOperatingEntityIdentity()` falla, el portal renderiza con `operatingEntity = null` en vez de 500
- [ ] Existe `src/app/(dashboard)/error.tsx` como Error Boundary
- [ ] Los errores de SSR aparecen en Vercel runtime logs con contexto
- [ ] `pnpm build`, `pnpm lint` pasan

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- `pnpm staging:request /home` — HTTP 200
- `pnpm staging:request /admin` — HTTP 200
- `pnpm staging:request /settings` — HTTP 200
- Verificar en Vercel runtime logs que los errores aparecen con contexto

## Closing Protocol

- [ ] Actualizar `Handoff.md`
- [ ] Actualizar `docs/architecture/GREENHOUSE_STAGING_ACCESS_V1.md` con nota de que la verificacion E2E de paginas ahora funciona

## Follow-ups

- Revisar todas las paginas `force-dynamic` para agregar error handling (no solo las criticas)
- Crear un script de health check automatizado que verifique N paginas via agente
- Evaluar si `getOperatingEntityIdentity()` deberia cachear mas agresivamente
- Considerar un `global-error.tsx` a nivel root para capturar errores fuera del dashboard group
