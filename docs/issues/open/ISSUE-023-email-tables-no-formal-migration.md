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

1. Crear una migracion formal con el schema completo (tablas, indexes, constraints, seeds)
2. Usar `CREATE TABLE IF NOT EXISTS` en la migracion para que sea idempotente
3. Eliminar `ensureEmailSchema()` de `schema.ts` (ver ISSUE-019)
4. Asegurar que la nueva migracion tiene timestamp anterior a la de ownership consolidation

## Verificacion

1. `pnpm migrate:status` muestra la migracion aplicada
2. Drop + recrear schema `greenhouse_notifications` → `pnpm migrate:up` recrea todo correctamente
3. `pnpm db:generate-types` produce los mismos tipos

## Estado

open

## Relacionado

- `src/lib/email/schema.ts`
- `migrations/20260402000000000_consolidate-ownership-to-greenhouse-ops.sql`
- ISSUE-019 (runtime DDL en cada envio)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
