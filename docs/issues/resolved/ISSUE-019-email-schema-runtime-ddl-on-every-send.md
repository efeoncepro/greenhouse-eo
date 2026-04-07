# ISSUE-019 — ensureEmailSchema() ejecuta DDL en cada envio de email

## Ambiente

production + staging

## Detectado

2026-04-06, revision de codigo end-to-end del modulo de emails

## Sintoma

Cada envio de email ejecuta `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, y seeds de suscriptores contra PostgreSQL, agregando latencia innecesaria.

## Causa raiz

`src/lib/email/schema.ts` define `ensureEmailSchema()` que ejecuta 8 statements DDL + seeds. Es llamada por:

- `createDeliveryRow()` — cada email enviado
- `getSubscribers()` — cada lookup de suscriptores
- `processFailedEmailDeliveries()` — cada ciclo del cron de retry

El patron singleton con `ensurePromise` tiene un bug: `.finally()` resetea a `null`, asi que el DDL se re-ejecuta cada vez que no hay un envio concurrente en curso.

Las tablas ya existen en produccion (estan en Kysely types `db.d.ts`, y tienen ownership asignado en migracion `20260402000000000_consolidate-ownership-to-greenhouse-ops.sql`).

## Impacto

- +50-100ms de latencia en cada envio de email (8 queries DDL innecesarios)
- Seeds re-ejecutan UPSERT de suscriptores en cada envio (3 rows)
- El usuario `greenhouse_runtime` puede no tener permisos DDL en produccion, causando warnings en logs (ISSUE-003 relacionado)

## Solucion

1. Crear una migracion formal con el schema de `greenhouse_notifications`
2. Eliminar `ensureEmailSchema()` y sus llamadas
3. Las tablas ya existen — la migracion solo formaliza lo que runtime creo

Si se quiere mantener un guard defensivo, usar un simple `SELECT 1 FROM greenhouse_notifications.email_deliveries LIMIT 0` que falle rapido sin DDL.

## Verificacion

1. `pnpm migrate:status` muestra la nueva migracion aplicada
2. Enviar un email — verificar en logs que no hay DDL statements
3. `pnpm build` y `pnpm lint` sin errores

## Estado

resolved — `ensureEmailSchema()` eliminada, DDL runtime removido. Fix en `develop` (TASK-269). Resolución: 2026-04-07.

## Relacionado

- `src/lib/email/schema.ts`
- `src/lib/email/delivery.ts`
- `src/lib/email/subscriptions.ts`
- ISSUE-003 (permission denied for greenhouse_notifications — relacionado)
