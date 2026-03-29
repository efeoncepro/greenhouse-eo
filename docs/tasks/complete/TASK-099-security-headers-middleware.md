# TASK-099 — Security Headers & Next.js Proxy

## Delta 2026-03-29 — Task cerrada con `CSP-Report-Only`

- `TASK-099` queda cerrada para el alcance seguro y verificable de esta lane.
- El runtime ya incorpora:
  - headers estáticos cross-cutting
  - `Strict-Transport-Security` en `production`
  - `Content-Security-Policy-Report-Only` con política amplia para no romper login, MUI, observabilidad ni assets
- La decisión explícita es no endurecer a `Content-Security-Policy` enforce dentro de esta task.
- Cualquier endurecimiento posterior (`Report-Only` tuning, nonces, eliminación de `unsafe-*`, allowlists más estrictas) queda como mejora futura en `TASK-126` y no bloquea el baseline de hardening.

## Delta 2026-03-29 — Alcance acotado al baseline real

- Se confirma que el repo ya cerró y validó solo el baseline seguro de `proxy.ts`.
- La task ya no debe leerse como si el slice actual incluyera `Content-Security-Policy` enforce.
- `CSP` queda explicitamente como follow-on posterior porque todavía requiere tuning sobre:
  - MUI/Emotion
  - OAuth (`Azure AD`, `Google`, credentials)
  - assets estáticos y uploads
- La task se re-acota para que el contrato documental no exija validaciones que hoy pertenecen al siguiente lote.

## Delta 2026-03-29 — Slice 1 seguro iniciado

- `TASK-099` pasa a `in-progress`.
- Se implementa primero el slice mínimo y reversible:
  - `src/proxy.ts` con headers estáticos
  - matcher conservador para no tocar `_next/*` ni assets
  - `Strict-Transport-Security` solo en `production`
- Se difiere intencionalmente el `Content-Security-Policy` real para una segunda iteración:
  - riesgo alto de romper MUI/Emotion, OAuth y assets si se aplica global sin tuning
  - mejor introducirlo luego como `Report-Only` o en un rollout validado

## Delta 2026-03-29

- La capa Cloud ya tiene `health`, `alerts`, postura GCP y postura Cloud SQL, pero `middleware.ts` sigue ausente.
- Esta task se mantiene plenamente vigente como la siguiente pieza cross-cutting de runtime protection.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Cerrada` |
| Rank | — |
| Domain | Infrastructure / Security |
| Sequence | Cloud Posture Hardening **2 of 6** — after TASK-100, before TASK-098 |

## Summary

Cerrar el baseline cross-cutting de seguridad vía `src/proxy.ts` para headers estáticos, `HSTS` en `production` y `Content-Security-Policy-Report-Only` como capa segura de observación. El endurecimiento estricto de `CSP` queda fuera de esta task.

## Why This Task Exists

La auditoría de marzo 2026 identificó que Greenhouse no tiene:
- **Content-Security-Policy** → vulnerable a XSS e inyección de scripts
- **X-Frame-Options** → vulnerable a clickjacking
- **HSTS** → posible downgrade de HTTPS a HTTP
- **X-Content-Type-Options** → MIME type sniffing
- **Referrer-Policy** → fuga de URLs internas en referers
- **Permissions-Policy** → acceso innecesario a cámara/micrófono/geolocation
- **CORS explícito** → APIs abiertas a cualquier origen por defecto

Además, no existe `proxy.ts`/`middleware.ts` — toda la protección es layout-level, lo que significa que si una ruta API se crea sin guard manual, queda expuesta.

## Goal

Agregar una capa de seguridad cross-cutting que proteja todas las rutas sin requerir cambios en cada endpoint individual.

## Dependencies & Impact

- **Depende de:**
  - Ninguna task previa (puede ejecutarse en paralelo con TASK-100)
- **Impacta a:**
  - TASK-098 (Observability) — middleware puede agregar request IDs para tracing futuro
  - TASK-101 (Cron Auth) — middleware podría centralizar validación de crons
  - Todas las rutas existentes — headers se aplican automáticamente
- **Archivos owned:**
  - `src/proxy.ts` (nuevo)

## Current Repo State

- `src/proxy.ts` existe y está activo como capa cross-cutting
- Protección autenticación: layout-level via `getServerSession()` en `src/app/(dashboard)/layout.tsx`
- Guards de API: manuales por ruta (`requireTenantContext()`, `requireAdminTenantContext()`, etc.)
- `next.config.ts` sigue sin definir headers; la capa canónica quedó en `proxy.ts`

## Scope

### Slice 1 — Security Headers baseline (~2h) — completado

1. Crear `src/proxy.ts`:
   ```typescript
   import { NextResponse } from 'next/server'
   import type { NextRequest } from 'next/server'

   export function proxy(request: NextRequest) {
     const response = NextResponse.next()

     // --- Security headers ---
     response.headers.set('X-Frame-Options', 'DENY')
     response.headers.set('X-Content-Type-Options', 'nosniff')
     response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
     response.headers.set('Permissions-Policy',
       'camera=(), microphone=(), geolocation=(), browsing-topics=()')
     response.headers.set('X-DNS-Prefetch-Control', 'on')

     // HSTS — solo en producción (Vercel ya lo fuerza, pero el header refuerza)
     if (process.env.VERCEL_ENV === 'production') {
       response.headers.set('Strict-Transport-Security',
         'max-age=63072000; includeSubDomains; preload')
     }

     return response
   }

   export const config = {
     matcher: [
       // Excluir assets estáticos y Next.js internals
       '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
     ],
   }
   ```

2. **CSP como header separado** (aterrizado finalmente en `Report-Only`):
   ```typescript
   // CSP inicial — observación segura, no enforcement
   const csp = [
     "default-src 'self'",
     "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
     "style-src 'self' 'unsafe-inline' https:",
     "img-src 'self' data: blob: https:",
     "font-src 'self' data: https:",
     "connect-src 'self' https: wss:",
     "form-action 'self' https://login.microsoftonline.com https://accounts.google.com",
     "frame-ancestors 'none'",
     "object-src 'none'",
   ].join('; ')

   response.headers.set('Content-Security-Policy-Report-Only', csp)
   ```

   > Nota: `Report-Only` permite capturar la forma de la política sin bloquear tráfico. Endurecer con nonces y eliminar `unsafe-*` queda como mejora futura.

### Slice 2 — Endurecimiento estricto de CSP (~1h) — fuera de alcance

1. Revisar señales reales del `Report-Only`
2. Introducir `Content-Security-Policy` enforce o una policy más estricta
3. Verificar que no se rompen:
   - Login (Azure AD, Google OAuth, Credentials)
   - Dashboard con MUI components
   - Uploads de media (avatars, logos)
   - Integrations API calls (HubSpot, Notion)
   - Cron routes (no deben ser afectados por CSP)
4. Ajustar CSP si hay violaciones
5. Decidir si esto merece una task separada

## Out of Scope

- CORS explícito por ruta (requiere análisis de consumidores externos — mejora futura)
- CSP enforce con nonces y eliminación de `unsafe-*` (requiere tuning extra — mejora futura)
- Rate limiting en middleware (TASK-101 maneja crons; rate limiting general es mejora futura)
- Request correlation IDs (mejora futura post-TASK-098)
- IP allowlisting (el portal es multi-tenant público)

## Acceptance Criteria

- [x] `src/proxy.ts` creado y funcional
- [x] `X-Frame-Options: DENY` presente
- [x] `X-Content-Type-Options: nosniff` presente
- [x] `Referrer-Policy: strict-origin-when-cross-origin` presente
- [x] `Permissions-Policy` presente (camera, microphone, geolocation denegados)
- [x] `Content-Security-Policy-Report-Only` presente con política amplia y segura
- [x] `Strict-Transport-Security` presente en `production`
- [x] matcher conservador evita `_next/*` y assets estáticos
- [x] `pnpm exec vitest run src/proxy.test.ts` pasa
- [x] `pnpm exec eslint src/proxy.ts src/proxy.test.ts` pasa
- [x] `pnpm exec tsc --noEmit --pretty false` pasa
- [x] `pnpm build` pasa para el baseline actual
- [x] `src/proxy.test.ts` valida headers y matcher

## Verification

```bash
# Baseline cerrado y validado
pnpm exec vitest run src/proxy.test.ts
pnpm exec eslint src/proxy.ts src/proxy.test.ts
pnpm exec tsc --noEmit --pretty false
pnpm build
```
