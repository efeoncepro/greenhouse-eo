# TASK-515 — `jsonwebtoken` → `jose`

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio` (edge runtime readiness + security + pre-req de Auth.js v5)
- Effort: `Bajo-Medio`
- Type: `dependency` + `refactor`
- Status real: `Backlog — Ola 1 stack modernization`
- Rank: `Post-TASK-511 — pre-req de TASK-516`
- Domain: `auth` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-515-jsonwebtoken-to-jose`

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

- [ ] `jose` instalado; `jsonwebtoken` + `@types/jsonwebtoken` removidos.
- [ ] Grep `jsonwebtoken` devuelve 0 hits en `src/`.
- [ ] Tests de auth pasan.
- [ ] Verificar: agent-auth flow (`/api/auth/agent-session`) sigue funcional.
- [ ] Gates tsc/lint/test/build verdes.

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
