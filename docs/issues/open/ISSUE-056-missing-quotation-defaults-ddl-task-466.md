# ISSUE-056 — Missing `greenhouse_commercial.quotation_defaults` DDL blocks TASK-466 migration

## Ambiente

dev (Cloud SQL `greenhouse-pg-dev`) — tambien staging y production porque comparten la instancia.

## Detectado

2026-04-21, durante implementacion de TASK-529 Chile Tax Code Foundation. `pnpm pg:connect:migrate` fallo al intentar aplicar `20260421011323497_task-466-expand-quotation-currency-constraint.sql` con `error: relation "greenhouse_commercial.quotation_defaults" does not exist` (`code: 42P01`).

## Sintoma

La migracion de TASK-466 (shipped 2026-04-20 en develop) nunca se aplico a la DB porque referencia una tabla que no existe. Como `node-pg-migrate` procesa migraciones en orden y falla all-or-nothing, toda migracion posterior queda bloqueada. Resultado: develop tiene 2 migraciones pendientes (466 + 529) que no pueden correr.

Confirmacion:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'quotation_defaults';
-- (0 rows)
```

`quotation_defaults` no aparece en:
- `migrations/**/*.sql` (grep limpio).
- `scripts/setup-postgres-*.ts` (grep limpio).
- `docs/architecture/schema-snapshot-baseline.sql` (grep limpio).

Pero sí aparece en `src/lib/**` y en documentacion de arquitectura como si existiera.

## Causa raiz

TASK-466 asume que `greenhouse_commercial.quotation_defaults` fue creada en algun lado — probablemente en una task previa cuya migracion se perdio o nunca se escribio. La tabla es referenciada por la capa commercial (`src/lib/finance/quotation-canonical-store.ts` y compañia) pero sin DDL canonico.

Impacto cruzado: las otras 3 tablas que TASK-466 altera (`quotations`, `role_rate_cards`, `approval_policies`) SI existen, asi que 466 hubiera aplicado parcialmente de no ser por el error.

## Impacto

- Toda migracion creada despues del 2026-04-20 queda bloqueada hasta que 466 pase.
- `quotations.currency` hoy sigue con el CHECK viejo `{CLP, USD, CLF}` — asi que ninguna quote en MXN/COP/PEN puede persistirse. El acceptance criterion de TASK-466 no se cumplio en runtime aunque el codigo/PR se haya mergeado.
- `role_rate_cards` y `approval_policies` tambien siguen con el CHECK antiguo.

## Solucion

Hotfix aplicado 2026-04-21 (commit de TASK-529): se cambio `ALTER TABLE greenhouse_commercial.quotation_defaults ...` a `ALTER TABLE IF EXISTS ...` en los dos statements que targetean esa tabla. Eso hace la migracion idempotente: si la tabla aparece luego, un migration separado agrega el CHECK; mientras tanto los ALTER silenciosamente no-op con NOTICE.

Pendiente para cerrar este issue:

1. Decidir si `greenhouse_commercial.quotation_defaults` es una tabla necesaria. Revisar `src/lib/finance/quotation-canonical-store.ts` + commercial store para saber si el runtime espera su existencia.
2. Si es necesaria, crear migracion `CREATE TABLE IF NOT EXISTS greenhouse_commercial.quotation_defaults (...)` con su CHECK de currency incluido desde el dia 1.
3. Si NO es necesaria (deprecada / nunca usada), documentar en la spec de TASK-466 que la tabla fue un leftover conceptual y cerrar.

## Verificacion

- `pnpm pg:connect:status` debe mostrar TASK-466 + TASK-529 aplicadas sin errores.
- `SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_name LIKE '%currency_check%';` debe mostrar las nuevas 6 monedas para `quotations`, `role_rate_cards`, `approval_policies`.

## Estado

open

## Relacionado

- TASK-466 (multi-currency quote output) — migracion `20260421011323497_task-466-expand-quotation-currency-constraint.sql`
- TASK-529 (Chile Tax Code Foundation) — encontro el blocker al intentar migrar
- Hotfix commit: `ALTER TABLE IF EXISTS` en la migracion 466 para desbloquear el pipeline
