# TASK-515 — `jsonwebtoken` → `jose`

## Status

- Lifecycle: `complete`
- Completed: `2026-04-26`
- Priority: `P2`
- Impact: `Medio` (edge runtime readiness + security + pre-req de Auth.js v5)
- Effort: `Bajo-Medio`
- Type: `dependency` + `refactor`
- Status real: `Implementada — jose 6.2.2 instalado, jsonwebtoken removido`
- Rank: `Post-TASK-511 — pre-req de TASK-516`
- Domain: `auth` + `platform`
- Blocked by: `none`
- Branch: `develop`

## Summary

Reemplazar `jsonwebtoken 9.0.3` por [`jose`](https://github.com/panva/jose). `jose` es edge-runtime compatible (Web Crypto API), typed, y es la librería que Auth.js v5 usa internamente. Condición pre-requisito para TASK-516 (Auth.js v5 migration).

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 1.

## Why This Task Exists

`jsonwebtoken` usa Node crypto nativo (no Web Crypto) → incompatible con Vercel Edge Runtime (middleware, edge API routes). Al quedarnos en jsonwebtoken limitamos qué rutas pueden correr en edge.

`jose`:
- Edge-ready (Web Crypto API).
- TypeScript-first, tipos sólidos.
- JWE + JWS + JWT support.
- Usado por Auth.js, Clerk, Stack Auth, Vercel OIDC.

## Goal

1. Instalar `jose`.
2. Grep `from 'jsonwebtoken'` y migrar cada uso (sign, verify, decode) a `jose` equivalents.
3. Actualizar `@types/jsonwebtoken` (remove); tipos de jose ya vienen con el paquete.
4. Remover `jsonwebtoken` + `@types/jsonwebtoken` de `package.json`.
5. Verificar: tests verdes, auth flow intacto.

## Acceptance Criteria

- [x] `jose@^6.2.2` instalado; `jsonwebtoken` + `@types/jsonwebtoken` removidos de `package.json`.
- [x] Grep `jsonwebtoken` devuelve 0 hits en `src/`.
- [x] Tests pasan (`pnpm test --run` → 2165 passed, 2 skipped, 0 failed).
- [x] Agent-auth flow (`/api/auth/agent-session`) intacto — usa `next-auth/jwt`, no se ve afectado por el cambio en `auth-tokens.ts`.
- [x] Gates verdes: `npx tsc --noEmit` (0 errors), `pnpm lint` (0 errors), `pnpm test` (verde), `pnpm build` (✓ Compiled successfully).

## Resolution Notes

- `src/lib/auth-tokens.ts` migrado: `SignJWT` reemplaza `jwt.sign`, `jwtVerify` reemplaza `jwt.verify`, `decodeJwt` reemplaza `jwt.decode`. Algoritmo HS256 preservado. Secret encoded vía `TextEncoder` (Web Crypto API).
- `generateToken()` cambió de sync `string` a `async Promise<string>` (jose es async). 5 callers actualizados con `await`:
  - `src/app/api/auth/verify-email/route.ts`
  - `src/app/api/admin/invite/route.ts`
  - `src/app/api/admin/users/[id]/resend-onboarding/route.ts`
  - `src/app/api/account/forgot-password/route.ts`
  - `src/lib/email/unsubscribe.ts`
- Test mock en `verify-email/route.test.ts` cambiado de `mockReturnValue` a `mockResolvedValue`.
- Cleanup colateral (errores tsc preexistentes que aparecieron al limpiar lockfile):
  - `scripts/lib/load-greenhouse-tool-env.ts`: relax param type a `readonly string[]`.
  - `src/lib/finance/vat-ledger.test.ts`: typed `mockGetDb` para aceptar `unknown[]`.

## Scope

### Sign → jose
```ts
// Antes
const token = jwt.sign(payload, secret, { expiresIn: '7d' })

// Después
const secretKey = new TextEncoder().encode(secret)
const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('7d')
  .sign(secretKey)
```

### Verify → jose
```ts
// Antes
const payload = jwt.verify(token, secret)

// Después
const { payload } = await jwtVerify(token, secretKey)
```

## Out of Scope

- Migrar NextAuth v4 a v5 (eso es TASK-516; esta task prepara la fundación).
- Cambiar algoritmos de firma (preserve HS256 o el que se use).

## Follow-ups

- TASK-516 se apoyará en esta migración para adoptar Auth.js v5 con jose nativo.
