# TASK-099 — Security Headers & Next.js Proxy

## Delta 2026-03-29 — Alcance acotado al baseline real

- Se confirma que el repo ya cerró y validó solo el baseline seguro de `proxy.ts`.
- La task sigue `in-progress`, pero ya no debe leerse como si el slice actual incluyera `Content-Security-Policy`.
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
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Slice 1 validado` |
| Rank | — |
| Domain | Infrastructure / Security |
| Sequence | Cloud Posture Hardening **2 of 6** — after TASK-100, before TASK-098 |

## Summary

Consolidar el baseline cross-cutting de seguridad vía `src/proxy.ts` para headers estáticos y `HSTS` en `production`, dejando `Content-Security-Policy` como follow-on separado dentro de la misma lane. Hoy el repo ya tiene esa capa mínima; lo pendiente es decidir si `CSP` entra como `Report-Only`, con allowlist explícita o se deriva a otra task para no romper login, MUI ni uploads.

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

- No existe `proxy.ts`
- Protección autenticación: layout-level via `getServerSession()` en `src/app/(dashboard)/layout.tsx`
- Guards de API: manuales por ruta (`requireTenantContext()`, `requireAdminTenantContext()`, etc.)
- `next.config.ts` no define headers de seguridad

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

2. **CSP como header separado** (diferido del primer lote por riesgo):
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
   > En este primer lote no se aplica todavía para no romper login, assets o render de dashboard.

### Slice 2 — CSP y verificación ampliada (~1h) — pendiente

1. Introducir `Content-Security-Policy` primero en modo `Report-Only` o con rollout controlado
2. Deploy en staging
3. Verificar que no se rompen:
   - Login (Azure AD, Google OAuth, Credentials)
   - Dashboard con MUI components
   - Uploads de media (avatars, logos)
   - Integrations API calls (HubSpot, Notion)
   - Cron routes (no deben ser afectados por CSP)
4. Ajustar CSP si hay violaciones (revisar Console de DevTools)
5. Verificar headers con `curl -I`:
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

- [x] `src/proxy.ts` creado y funcional
- [x] `X-Frame-Options: DENY` presente
- [x] `X-Content-Type-Options: nosniff` presente
- [x] `Referrer-Policy: strict-origin-when-cross-origin` presente
- [x] `Permissions-Policy` presente (camera, microphone, geolocation denegados)
- [x] `Strict-Transport-Security` presente en `production`
- [x] matcher conservador evita `_next/*` y assets estáticos
- [x] `pnpm build` pasa para el baseline actual
- [x] `src/proxy.test.ts` valida headers y matcher
- [ ] `Content-Security-Policy` introducida con rollout seguro (`Report-Only` o equivalente)
- [ ] Login funciona correctamente bajo la capa nueva de `CSP`
- [ ] Dashboard MUI renderiza sin errores de `CSP`
- [ ] Media uploads funcionan bajo la política nueva
- [ ] Cron routes no son afectados por `CSP`

## Verification

```bash
# Baseline actual validada
pnpm exec vitest run src/proxy.test.ts
pnpm exec eslint src/proxy.ts src/proxy.test.ts
pnpm exec tsc --noEmit --pretty false
pnpm build

# Follow-on para CSP
curl -sI https://dev-greenhouse.efeoncepro.com/login | grep -E "x-frame|x-content|referrer|permissions|content-security|strict-transport"
# Abrir DevTools > Console en staging y buscar CSP violations
```
