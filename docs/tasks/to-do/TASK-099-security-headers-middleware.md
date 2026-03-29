# TASK-099 — Security Headers & Next.js Middleware

## Delta 2026-03-29

- La capa Cloud ya tiene `health`, `alerts`, postura GCP y postura Cloud SQL, pero `middleware.ts` sigue ausente.
- Esta task se mantiene plenamente vigente como la siguiente pieza cross-cutting de runtime protection.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Infrastructure / Security |
| Sequence | Cloud Posture Hardening **2 of 6** — after TASK-100, before TASK-098 |

## Summary

Crear `middleware.ts` con security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). Hoy no existe middleware y las 238 rutas API no tienen headers de seguridad.

## Why This Task Exists

La auditoría de marzo 2026 identificó que Greenhouse no tiene:
- **Content-Security-Policy** → vulnerable a XSS e inyección de scripts
- **X-Frame-Options** → vulnerable a clickjacking
- **HSTS** → posible downgrade de HTTPS a HTTP
- **X-Content-Type-Options** → MIME type sniffing
- **Referrer-Policy** → fuga de URLs internas en referers
- **Permissions-Policy** → acceso innecesario a cámara/micrófono/geolocation
- **CORS explícito** → APIs abiertas a cualquier origen por defecto

Además, no existe `middleware.ts` — toda la protección es layout-level, lo que significa que si una ruta API se crea sin guard manual, queda expuesta.

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
  - `src/middleware.ts` (nuevo)

## Current Repo State

- No existe `middleware.ts`
- Protección autenticación: layout-level via `getServerSession()` en `src/app/(dashboard)/layout.tsx`
- Guards de API: manuales por ruta (`requireTenantContext()`, `requireAdminTenantContext()`, etc.)
- `next.config.ts` no define headers de seguridad

## Scope

### Slice 1 — Security Headers (~2h)

1. Crear `src/middleware.ts`:
   ```typescript
   import { NextResponse } from 'next/server'
   import type { NextRequest } from 'next/server'

   export function middleware(request: NextRequest) {
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

2. **CSP como header separado** (requiere ajuste iterativo):
   ```typescript
   // CSP inicial — permisivo, luego endurecer
   const csp = [
     "default-src 'self'",
     "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // MUI/Emotion necesitan unsafe-inline
     "style-src 'self' 'unsafe-inline'",                  // MUI emotion styles
     "img-src 'self' data: blob: https://storage.googleapis.com",
     "font-src 'self' data:",
     "connect-src 'self' https://*.googleapis.com https://*.sentry.io",
     "frame-ancestors 'none'",
   ].join('; ')

   response.headers.set('Content-Security-Policy', csp)
   ```

   > Nota: CSP con `unsafe-inline` y `unsafe-eval` no es ideal, pero MUI v5/v7 con Emotion requiere inline styles. Endurecer con nonces es una mejora futura.

### Slice 2 — Verificación y ajuste (~1h)

1. Deploy en staging
2. Verificar que no se rompen:
   - Login (Azure AD, Google OAuth, Credentials)
   - Dashboard con MUI components
   - Uploads de media (avatars, logos)
   - Integrations API calls (HubSpot, Notion)
   - Cron routes (no deben ser afectados por CSP)
3. Ajustar CSP si hay violaciones (revisar Console de DevTools)
4. Verificar headers con `curl -I`:
   ```bash
   curl -I https://dev-greenhouse.efeoncepro.com/login
   # Confirmar presencia de todos los headers
   ```

## Out of Scope

- CORS explícito por ruta (requiere análisis de consumidores externos — mejora futura)
- CSP con nonces (requiere custom Document o Emotion cache config — mejora futura)
- Rate limiting en middleware (TASK-101 maneja crons; rate limiting general es mejora futura)
- Request correlation IDs (mejora futura post-TASK-098)
- IP allowlisting (el portal es multi-tenant público)

## Acceptance Criteria

- [ ] `src/middleware.ts` creado y funcional
- [ ] `X-Frame-Options: DENY` presente en todas las respuestas
- [ ] `X-Content-Type-Options: nosniff` presente
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` presente
- [ ] `Permissions-Policy` presente (camera, microphone, geolocation denegados)
- [ ] `Content-Security-Policy` presente (modo permisivo inicial)
- [ ] `Strict-Transport-Security` presente en production
- [ ] Login funciona correctamente (3 providers)
- [ ] Dashboard MUI renderiza sin errores de CSP
- [ ] Media uploads funcionan
- [ ] Cron routes no son afectados
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

```bash
# Verificar headers
curl -sI https://dev-greenhouse.efeoncepro.com/login | grep -E "x-frame|x-content|referrer|permissions|content-security|strict-transport"

# Verificar que CSP no rompe nada
# Abrir DevTools > Console en staging y buscar CSP violations

# Build validation
pnpm build
pnpm test
```
