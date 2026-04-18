# ISSUE-053 — `client_users.password_hash` reescrito por batch sync, bloqueando login con credentials

## Ambiente

staging (develop / `dev-greenhouse.efeoncepro.com`)

## Detectado

2026-04-17 ~11:20 UTC, reportado por usuario después de intentar login con credentials en staging tras el merge de TASK-348 a develop. Síntoma inicial atribuido al merge; investigación descartó esa hipótesis.

## Síntoma

- Login con password+email que funcionaba hasta el día anterior deja de autenticar en staging, devolviendo `Email o contraseña incorrectos`.
- El mismo login funcionaba en Producción al momento del reporte.
- Afecta explícitamente a `jreyes@efeoncepro.com` (único caso reportado, porque es el único usuario con `auth_mode = 'both'` y @efeoncepro.com que entra recurrentemente con credentials en dev).

> **Aclaración post-incidente (2026-04-17):** mi hipótesis inicial fue "producción y staging usan DBs distintas, por eso prod tenía el hash viejo y staging el nuevo". Esa hipótesis es **incorrecta** — ambos entornos comparten el mismo Cloud SQL (`greenhouse-pg-dev`). Por qué producción aceptaba el login con el hash ya rotado queda como **observable sin explicar** en esta pasada. Hipótesis restantes a investigar si recurre: (a) sesión persistente en prod vía JWT emitido antes del batch (NextAuth no re-valida hash por request), (b) drift de otra variable de entorno (`NEXTAUTH_SECRET` o similar), (c) caché de sesión o de dominio custom. El fix estructural de esta task (trigger + helper) resuelve la causa raíz de la rotación sin depender de la explicación del observable.

## Causa raíz

El batch que corre a las **08:00 UTC** (cron `/api/cron/entra-profile-sync` + el run sibling `hubspot-products-sync`) toca filas en `greenhouse_core.client_users` con `updated_at = CURRENT_TIMESTAMP`. En el mismo lote:

- 6 usuarios `@efeonce.org` (SSO-only) quedan con `password_hash = NULL`.
- 1 usuario `@efeoncepro.com` (Julio) queda con un `password_hash` bcrypt NUEVO (`$2b$12$xehq7…`) que **nadie conoce**, porque su registro en BigQuery está bajo un email distinto (`julio.reyes@efeonce.org`) y el alias resolver lo liga al `user_id` correcto.

Evidencia:

- `source_sync_runs` muestra `source_system='azure-ad', triggered_by='cron:entra-profile-sync'` terminando a las `2026-04-17T08:00:51.177Z`, coincidente con los 7 `updated_at` entre `08:00:48.051Z` y `08:00:51.162Z`.
- El writer real de `password_hash` en el repo está en **un solo lugar de batch**: `scripts/backfill-postgres-identity-v2.ts` línea 68 (`password_hash = COALESCE($8, password_hash)`). No hay guard DB. Cualquier path `UPDATE greenhouse_core.client_users SET password_hash = ...` pasa silencioso.
- El `syncEntraProfiles` (src/lib/entra/profile-sync.ts) no toca `password_hash` directamente, pero el acoplamiento entre BQ↔PG deja el campo vulnerable a cualquier backfill futuro que corra (manual o cron nuevo).

**El fallo raíz:** `password_hash` no debería ser un campo sincronizable desde BigQuery ni desde ningún sistema externo. Es user-initiated (reset o accept-invite). Cualquier batch que lo escriba es por definición un bug. Hoy no hay protección a nivel DB ni convención documentada.

## Impacto

- Cualquier usuario con `auth_mode IN ('credentials', 'both')` en staging puede quedar bloqueado al día siguiente si el batch toca su fila.
- Riesgo silencioso: no hay alerta cuando `password_hash` muta fuera del flujo legítimo.
- Bloquea developers que dependen de credentials en staging mientras SSO dev no está disponible.

## Solución

Ver **TASK-451** "Blindar `password_hash` contra rotaciones automáticas de batch/sync".

Resumen:

1. Remover escritura de `password_hash` + `password_hash_algorithm` de `scripts/backfill-postgres-identity-v2.ts`.
2. Migration con trigger DB `guard_password_hash_mutation` que rechaza `UPDATE` sobre `password_hash` salvo que la transacción setee `app.password_change_authorized = 'true'`.
3. Envolver los writers legítimos (`/api/account/reset-password`, `/api/account/accept-invite`, scripts de bootstrap admin) con `SET LOCAL app.password_change_authorized = 'true'` dentro de una transacción.
4. Emitir outbox event `identity.password_hash.rotated` con `actor_user_id + reason + source` para observabilidad + alerta Slack cuando `source != 'user_reset'` y `target_user_id != 'user-agent-e2e-001'`.
5. Unit tests para validar que: (a) el trigger bloquea UPDATE sin session var, (b) el flujo legítimo pasa, (c) el sync de Entra no falla tras la protección.

## Verificación

- Ejecutar el batch `pnpm exec tsx scripts/backfill-postgres-identity-v2.ts` tras el fix y confirmar que `password_hash` no cambia para ningún usuario.
- Ejecutar el cron `/api/cron/entra-profile-sync` y confirmar que no hay excepciones ni `updated_at` mutations involving `password_hash`.
- Intentar `UPDATE greenhouse_core.client_users SET password_hash = 'test' WHERE user_id = 'user-efeonce-admin-julio-reyes'` desde `psql` → debe fallar con excepción.
- Flujo user-initiated (`/auth/forgot-password` + `/auth/reset-password`) sigue funcionando end-to-end.
- Unit test de governance verde.

## Estado

resolved (2026-04-17) — vía TASK-451

## Resolución aplicada (2026-04-17)

- Migration `20260417165907294_task-451-password-hash-mutation-guard.sql` instaló `greenhouse_core.guard_password_hash_mutation()` + trigger `client_users_password_guard` que rechaza `UPDATE` sobre `password_hash` salvo que la transacción setee `app.password_change_authorized = 'true'`.
- Helper `withPasswordChangeAuthorization(params, callback)` en `src/lib/identity/password-mutation.ts` envuelve la escritura en `withTransaction`, setea `SET LOCAL`, ejecuta el writer y emite `identity.password_hash.rotated` al outbox.
- Writers legítimos (`/api/account/reset-password`, `/api/account/accept-invite`) migrados al helper.
- `scripts/backfill-postgres-identity-v2.ts` deja de escribir `password_hash` + `password_hash_algorithm` — campos removidos del SELECT BQ y del UPDATE SET.
- Event catalog: nuevo `AGGREGATE_TYPES.identityCredential` + `EVENT_TYPES.identityPasswordHashRotated`.
- 5 unit tests para el helper (`src/lib/identity/__tests__/password-mutation.test.ts`).
- Smoke end-to-end en dev DB: UPDATE sin session var bloqueado ✓, UPDATE legítimo vía helper persiste hash y publica outbox ✓, login con credentials sigue funcionando ✓.

## Verificación ejecutada

- `pnpm pg:connect:migrate` ✓ (trigger instalado)
- `pnpm exec tsc --noEmit --incremental false` ✓
- `pnpm test` ✓ 1337 passed
- `pnpm build` ✓
- Manual: `UPDATE greenhouse_core.client_users SET password_hash = 'x' WHERE user_id = 'user-efeonce-admin-julio-reyes'` falla con `password_hash mutation not authorized`.

## Relacionado

- `TASK-451` — Blindar `password_hash` contra rotaciones automáticas de batch/sync
- `scripts/backfill-postgres-identity-v2.ts` — writer activo
- `src/lib/entra/profile-sync.ts` — cron 08:00 UTC sospechoso (no escribe `password_hash` hoy, pero toca `client_users`)
- `src/app/api/account/reset-password/route.ts` — writer legítimo (user-initiated)
- `src/app/api/account/accept-invite/route.ts` — writer legítimo (invite flow)
- Desbloqueo puntual: password de `jreyes@efeoncepro.com` reseteado en dev DB a valor temporal (usuario la cambiará desde profile).
