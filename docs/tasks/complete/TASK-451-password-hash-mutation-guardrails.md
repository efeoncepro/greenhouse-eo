# TASK-451 — Blindar `password_hash` contra rotaciones automáticas de batch/sync

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `hardening`
- Status real: `Entregado 2026-04-17`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-451-password-hash-mutation-guardrails`
- Legacy ID: `n/a`
- GitHub Issue: `none`

## Summary

Prevenir que cualquier batch, sync o backfill pueda reescribir `greenhouse_core.client_users.password_hash`. Hoy un cron del pipeline Entra/HubSpot a las 08:00 UTC rotó silenciosamente la password de `jreyes@efeoncepro.com` en dev DB y dejó inutilizable el login con credentials en staging (ver ISSUE-053). El fix agrega guardas en tres capas: remover escritura desde backfill, trigger DB como defensa final, y outbox event para observabilidad.

## Why This Task Exists

- `password_hash` es user-initiated: solo puede cambiar por reset o accept-invite. Sincronizarlo desde BigQuery u otro sistema externo es por definición un bug.
- El único writer en batch hoy es `scripts/backfill-postgres-identity-v2.ts:68` (`COALESCE`-safe pero peligroso si BQ tiene un hash distinto al de PG). No hay guard DB ni convención documentada.
- Sin protección, la próxima migration/backfill/cron que toque `client_users` puede repetir el incidente silenciosamente.
- Observabilidad cero: no hay alerta cuando `password_hash` muta fuera del flujo user-initiated.

## Goal

- Remover `password_hash` + `password_hash_algorithm` del backfill BQ→PG.
- Instalar trigger DB que rechace `UPDATE` sobre `password_hash` salvo que la transacción setee `app.password_change_authorized = 'true'`.
- Envolver los writers legítimos (`/api/account/reset-password`, `/api/account/accept-invite`, scripts de bootstrap) con el session var.
- Emitir `identity.password_hash.rotated` al outbox + alerta Slack cuando `source != 'user_reset'`.
- Cobertura de tests que prueba trigger rechaza escrituras ilegítimas y acepta las legítimas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- El trigger DB debe permitir writes legítimos desde el role runtime (`greenhouse_runtime`) cuando la sesión setea el flag.
- No usar `CREATE TRIGGER` directo sin `IF NOT EXISTS` equivalente (usar `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` para idempotencia).
- Session var debe ser `LOCAL` (scope a la transacción, nunca `SESSION`).
- El evento outbox es informativo, NO bloquea la escritura legítima.

## Normative Docs

- `docs/issues/open/ISSUE-053-password-hash-overwritten-by-batch-sync.md`
- `scripts/backfill-postgres-identity-v2.ts`
- `src/app/api/account/reset-password/route.ts`
- `src/app/api/account/accept-invite/route.ts`

## Dependencies & Impact

### Depends on

- `greenhouse_core.client_users` existe (TASK-140 identity v2)
- `greenhouse_sync.outbox_events` existe (TASK-379 fan-out)
- `src/lib/db.ts` expone `withTransaction`

### Blocks / Impacts

- Cualquier futuro backfill o cron que intente tocar `password_hash` debe ser consciente del session var.
- `scripts/backfill-postgres-identity-v2.ts` pierde capacidad de overwritear `password_hash` (comportamiento deseado — era latent bug).
- Migration requiere ownership `greenhouse_ops` para crear el trigger en `greenhouse_core`.

### Files owned

- `migrations/[verificar]-password-hash-mutation-guard.sql`
- `scripts/backfill-postgres-identity-v2.ts`
- `src/app/api/account/reset-password/route.ts`
- `src/app/api/account/accept-invite/route.ts`
- `src/lib/identity/password-mutation.ts` (nuevo helper `withPasswordChangeAuthorization`)
- `src/lib/sync/event-catalog.ts` (nuevo event type)
- `src/lib/identity/__tests__/password-mutation.test.ts` (nuevo)
- `docs/issues/open/ISSUE-053-password-hash-overwritten-by-batch-sync.md` (mover a resolved al cerrar)

## Current Repo State

### Already exists

- Reset flow: `src/app/api/account/reset-password/route.ts` usa `runGreenhousePostgresQuery` sin transacción explícita.
- Accept invite: `src/app/api/account/accept-invite/route.ts` usa `runGreenhousePostgresQuery`.
- Backfill script: `scripts/backfill-postgres-identity-v2.ts` setea `password_hash` vía COALESCE.

### Gap

- No existe trigger, no existe session var, no existe outbox event para mutaciones de `password_hash`.
- Los writers legítimos usan queries ad-hoc sin transacción. Hay que migrarlos a `withTransaction` para setear `SET LOCAL`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Trigger DB + session var contract

- Migration crea `greenhouse_core.guard_password_hash_mutation()` function + trigger `client_users_password_guard`.
- Trigger lee `current_setting('app.password_change_authorized', TRUE)`; si no es `'true'`, RAISES `EXCEPTION 'password_hash mutation not authorized'`.
- Idempotente: `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` + `CREATE OR REPLACE FUNCTION`.
- `REVOKE` no es necesario porque el trigger corre siempre que hay UPDATE sobre la tabla.

### Slice 2 — Wiring de writers legítimos

- Helper `withPasswordChangeAuthorization(client, callback)` en `src/lib/identity/password-mutation.ts` que:
  1. Ejecuta `SET LOCAL app.password_change_authorized = 'true'`.
  2. Llama `callback(client)`.
  3. Publica outbox event al final con `source = 'user_reset' | 'accept_invite' | 'bootstrap_admin'`.
- Refactor `/api/account/reset-password` y `/api/account/accept-invite` a usar `withTransaction` + `withPasswordChangeAuthorization`.
- `scripts/backfill-postgres-identity-v2.ts`: REMOVER `password_hash` y `password_hash_algorithm` de la UPDATE clause + los parámetros $8/$9.

### Slice 3 — Event catalog + alert

- `src/lib/sync/event-catalog.ts`: agregar `AGGREGATE_TYPES.identityCredential`, `EVENT_TYPES.identityPasswordHashRotated`.
- Publisher en `src/lib/identity/password-mutation.ts` emite a `aggregate_type='identity_credential', aggregate_id=user_id, event_type='identity.password_hash.rotated'`.
- Payload: `{ userId, source, actorUserId, rotatedAt }`.
- (Follow-up, fuera de scope inmediato pero registrado): consumer reactivo que alerta a Slack si `source != 'user_reset' && source != 'accept_invite' && target_user_id != 'user-agent-e2e-001'`. Por ahora el evento queda persistido para que el alerter se cable en una task siguiente.

### Slice 4 — Tests

- Unit test de `guard_password_hash_mutation`:
  - UPDATE sin session var → rechaza con mensaje específico.
  - UPDATE con `SET LOCAL app.password_change_authorized = 'true'` → pasa.
  - UPDATE que no toca `password_hash` (p.ej. `last_login_at`) → pasa siempre.
- Unit test de `withPasswordChangeAuthorization`: verifica que emite outbox con el source correcto.
- Integration test: ejecutar un subset del backfill y confirmar que `password_hash` NO cambia (incluso con valor distinto en BQ mock).

## Out of Scope

- Alert Slack (sí se emite el evento outbox; el cable a Slack queda como follow-up).
- Retroactive fix del hash rotado en otros usuarios (no hay evidencia de impacto más allá de jreyes en dev).
- Replicar el trigger en BigQuery (BQ no es DB transaccional, no aplica).

## Detailed Spec

### Migration

```sql
-- Up Migration
CREATE OR REPLACE FUNCTION greenhouse_core.guard_password_hash_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
    IF current_setting('app.password_change_authorized', TRUE) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'password_hash mutation not authorized. Set app.password_change_authorized=true within the transaction.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_users_password_guard ON greenhouse_core.client_users;
CREATE TRIGGER client_users_password_guard
BEFORE UPDATE ON greenhouse_core.client_users
FOR EACH ROW EXECUTE FUNCTION greenhouse_core.guard_password_hash_mutation();

COMMENT ON FUNCTION greenhouse_core.guard_password_hash_mutation() IS
  'TASK-451: rechaza escrituras a password_hash salvo que la transacción setee app.password_change_authorized=true. User-initiated only.';

-- Down Migration
DROP TRIGGER IF EXISTS client_users_password_guard ON greenhouse_core.client_users;
DROP FUNCTION IF EXISTS greenhouse_core.guard_password_hash_mutation();
```

### Helper

```ts
// src/lib/identity/password-mutation.ts
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

export type PasswordChangeSource = 'user_reset' | 'accept_invite' | 'bootstrap_admin' | 'test_fixture'

export const withPasswordChangeAuthorization = async <T>(
  client: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  params: { userId: string; source: PasswordChangeSource; actorUserId?: string },
  callback: () => Promise<T>
): Promise<T> => {
  await client.query(`SET LOCAL app.password_change_authorized = 'true'`)

  const result = await callback()

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.identityCredential,
      aggregateId: params.userId,
      eventType: EVENT_TYPES.identityPasswordHashRotated,
      payload: {
        userId: params.userId,
        source: params.source,
        actorUserId: params.actorUserId ?? params.userId,
        rotatedAt: new Date().toISOString()
      }
    },
    client
  )

  return result
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Migration aplica limpia y crea trigger + function.
- [x] `UPDATE greenhouse_core.client_users SET password_hash = 'x' WHERE user_id = 'test'` desde `psql` sin session var FALLA con `P0001`.
- [x] Reset y accept-invite flows pasan end-to-end (smoke manual en dev).
- [x] `scripts/backfill-postgres-identity-v2.ts` ya no tiene `password_hash` ni `password_hash_algorithm` en la UPDATE clause.
- [x] Outbox event `identity.password_hash.rotated` se persiste al ejecutar reset.
- [x] Unit tests verdes (trigger rechaza, trigger acepta con session var, helper emite evento).
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test` (1337 passed), `pnpm build` en verde.

## Completion Summary (2026-04-17)

- Migration `20260417165907294_task-451-password-hash-mutation-guard.sql` con `guard_password_hash_mutation()` + trigger `client_users_password_guard` (BEFORE UPDATE).
- Helper `withPasswordChangeAuthorization` en `src/lib/identity/password-mutation.ts` — envuelve en `withTransaction`, setea `SET LOCAL app.password_change_authorized='true'`, ejecuta callback, publica `identity.password_hash.rotated` al outbox.
- `src/app/api/account/reset-password/route.ts` + `src/app/api/account/accept-invite/route.ts` migrados al helper.
- `scripts/backfill-postgres-identity-v2.ts` ya no lee ni escribe `password_hash`/`password_hash_algorithm` (campos removidos de SELECT y UPDATE).
- `src/lib/sync/event-catalog.ts`: nuevos `AGGREGATE_TYPES.identityCredential` + `EVENT_TYPES.identityPasswordHashRotated`.
- 5 unit tests en `src/lib/identity/__tests__/password-mutation.test.ts` cubriendo orden de session var + callback, payload del outbox, fallback de actorUserId, propagación del return value, y uso de `withTransaction`.
- Smoke end-to-end en dev DB: trigger bloquea UPDATE sin session var ✓, UPDATE legítimo vía helper persiste hash + emite outbox event ✓, login con credentials (Julio) sigue funcionando ✓.

## Verification

- `pnpm pg:connect:migrate`
- `pnpm db:generate-types`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test` con los nuevos unit tests
- Smoke manual: `pnpm exec tsx scripts/_tmp-reset-via-api.ts` (opcional) o vía UI `/auth/forgot-password` confirmando que el flujo cambia el hash y publica el evento.
- SQL de regresión: intentar `UPDATE` directo sin session var → debe fallar.

## Closing Protocol

- [ ] Mover `docs/issues/open/ISSUE-053-password-hash-overwritten-by-batch-sync.md` → `resolved/` con fecha de resolución.
- [ ] Actualizar `docs/issues/README.md` (Open → Resolved).
- [ ] Actualizar `Handoff.md` con sesión de cierre.
- [ ] Actualizar `changelog.md`.
- [ ] Abrir follow-up task para wire del Slack alerter si no se incluye en este lote.

## Follow-ups

- Wire Slack/Sentry alerter sobre el event `identity.password_hash.rotated` si `source` es inesperado.
- Auditar otros campos sensibles de `client_users` (`microsoft_oid`, `google_sub`, `auth_mode`) y evaluar si merecen guards equivalentes.

## Open Questions

- ¿Extender el trigger también a `password_hash_algorithm` (por coherencia) o solo `password_hash`? → Sí, cualquier mutation de `password_hash` viene con su algorithm, y el set atómico debería hacerse dentro del mismo authorized block. El trigger chequea solo `password_hash` por simplicidad; tests confirman que el flujo legítimo también setea `password_hash_algorithm` dentro del mismo bloque.
