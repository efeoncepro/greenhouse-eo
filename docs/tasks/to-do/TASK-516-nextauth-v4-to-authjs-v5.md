# TASK-516 — NextAuth v4 → Auth.js v5 migration

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto` (auth runtime + edge + typed sessions)
- Effort: `Alto`
- Type: `platform` + `breaking`
- Status real: `Backlog — Ola 2 stack modernization`
- Rank: `Post-TASK-515` (requires jose)
- Domain: `auth` + `platform`
- Blocked by: `TASK-515 (jose)`
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
