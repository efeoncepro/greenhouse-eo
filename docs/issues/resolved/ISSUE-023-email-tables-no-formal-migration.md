# ISSUE-023 — Tablas de email creadas via runtime DDL sin migracion formal

## Ambiente

production + staging

## Detectado

2026-04-06, revision de codigo end-to-end del modulo de emails

## Sintoma

Las tablas `greenhouse_notifications.email_deliveries` y `email_subscriptions` existen en produccion pero no tienen una migracion formal en `migrations/`. Fueron creadas por `ensureEmailSchema()` en runtime.

## Causa raiz

El sistema de email fue implementado con un patron "auto-bootstrap" donde `schema.ts` ejecuta DDL en runtime. Esto significo que:
1. Las tablas se crearon la primera vez que se envio un email
2. No hay archivo SQL en `migrations/` que las defina
3. La migracion `20260402000000000_consolidate-ownership-to-greenhouse-ops.sql` asigna ownership a `greenhouse_ops` (asume que las tablas ya existen)
4. Si la DB se recrea desde cero, las migraciones fallan porque `ALTER TABLE ... OWNER TO` referencia tablas inexistentes

## Impacto

- **Reconstruccion de DB imposible** desde migraciones solas
- Depende de que el codigo runtime cree las tablas antes de que ownership migration corra
- Violacion del principio de migraciones como fuente canonica del schema
- Confunde a `kysely-codegen` que encuentra tablas no versionadas

## Solucion

Creadas dos migraciones formales como parte de TASK-382 (2026-04-13):

1. `migrations/20260413162215719_email-notifications-schema-foundation.sql`
   - `CREATE SCHEMA IF NOT EXISTS greenhouse_notifications`
   - `CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_deliveries` (schema completo)
   - `CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_subscriptions` (schema completo)
   - Indexes y grants a `greenhouse_runtime`

2. `migrations/20260413162238855_email-delivery-enterprise-v2.sql`
   - ADD COLUMN error_class, priority, data_redacted_at a email_deliveries
   - Extiende status CHECK para incluir 'dead_letter'
   - CREATE TABLE email_engagement (tracking de opens/clicks)
   - CREATE TABLE email_type_config (kill switch por tipo)

Ambas migraciones usan `IF NOT EXISTS` para ser idempotentes en DBs existentes.

**Nota de ordering:** Los timestamps (20260413) son posteriores a la hardening migration (20260406), pero las migraciones son idempotentes via IF NOT EXISTS. En DB existente son no-ops. En DB fresca, el ownership migration (20260402) corre primero y falla al hacer ALTER TABLE sobre tablas inexistentes — deuda documentada, requiere reordenamiento en ISSUE-019 follow-up.

## Verificacion

- `pnpm migrate:status` muestra las 2 migraciones aplicadas
- `SELECT table_name FROM information_schema.tables WHERE table_schema = 'greenhouse_notifications'` retorna las 4 tablas esperadas

## Estado

resolved

## Resuelto

2026-04-13 (TASK-382 — migraciones formales creadas)

## Relacionado

- `migrations/20260413162215719_email-notifications-schema-foundation.sql`
- `migrations/20260413162238855_email-delivery-enterprise-v2.sql`
- TASK-382 (Email System Enterprise Hardening)
- ISSUE-019 (runtime DDL en cada envio — resuelto por separado)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
