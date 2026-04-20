# TASK-523 — `bcryptjs` → `@node-rs/argon2`

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (security upgrade + mejor perf)
- Effort: `Medio` (requiere política de re-hash)
- Type: `security` + `dependency`
- Status real: `Backlog — Ola 5 stack modernization`
- Rank: `Post-TASK-511`
- Domain: `auth` + `security`
- Blocked by: `coordinar con TASK-516 (Auth.js v5) para no interferir`
- Branch: `task/TASK-523-bcryptjs-to-argon2`

## Summary

Migrar el hashing de passwords de `bcryptjs 3.0.3` (bcrypt pure-JS) a [`@node-rs/argon2`](https://github.com/napi-rs/node-rs/tree/main/packages/argon2) (Argon2id, Rust binding). Argon2 es el algoritmo ganador de Password Hashing Competition (2015) y el recommend actual OWASP / IETF RFC 9106.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 5 (opcional).

## Why This Task Exists

bcrypt (1999) sigue aceptable pero:
- Argon2id es resistant a GPU attacks y side-channel attacks.
- `@node-rs/argon2` es 10-100× más rápido que `bcryptjs` (nativo Rust vs JS puro).
- OWASP recomienda Argon2id como primer default.

Bcrypt no es "inseguro" — está OK. Pero si queremos estar en el 95th percentile de security, Argon2id es el upgrade.

## Goal

1. Instalar `@node-rs/argon2`.
2. Helper canónico `src/lib/auth/password.ts` con `hashPassword()` + `verifyPassword()`.
3. Política de **re-hash on login** (transición):
   - Al login, si el hash almacenado es bcrypt → verify con bcrypt → si OK → re-hash con Argon2 → store.
   - Nuevos users → hash directo Argon2.
4. Coexistencia de bcrypt + argon2 durante ventana de transición.
5. Métrica: % de passwords en argon2 vs bcrypt; cierre de migración cuando > 99%.
6. Remover `bcryptjs` del `package.json` cuando ≥99% migrated.

## Acceptance Criteria

- [ ] `@node-rs/argon2` instalado.
- [ ] `hashPassword()` y `verifyPassword()` en `src/lib/auth/password.ts`.
- [ ] Verifier detecta formato (bcrypt `$2a$`, `$2b$`, `$2y$` prefix vs argon2 `$argon2id$` prefix) y despacha al algoritmo correcto.
- [ ] Re-hash on login implementado (solo para bcrypt detectados).
- [ ] Métrica de migración expuesta.
- [ ] Tests unitarios cubren ambos paths (legacy + new).
- [ ] Smoke: crear user, login, re-login verificando el re-hash ocurrió.
- [ ] Gates tsc/lint/test/build verdes.

## Scope

- Helper `password.ts` central.
- Migración de callers: `auth config`, admin bootstrap scripts, user creation endpoints.
- Migration SQL opcional: agregar columna `password_hash_algorithm` para trackeo (o detectar por prefix in-app).

## Out of Scope

- Forzar re-hash masivo (sin ventana de login). Lazy migration es más seguro.
- Passkeys / webauthn (TASK futura).

## Follow-ups

- Deprecation de bcrypt: cuando % migrated ≥99%, remover bcryptjs y el code path legacy.
- Evaluar key stretching config (memory=64MB, iterations=3, parallelism=4) acorde a hardware de Vercel functions.
