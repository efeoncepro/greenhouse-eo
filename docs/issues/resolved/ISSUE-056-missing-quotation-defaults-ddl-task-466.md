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

TASK-466 incluyo `ALTER TABLE` statements sobre elementos de schema que nunca se crearon en este repo: `greenhouse_commercial.quotation_defaults` (tabla) y `greenhouse_commercial.approval_policies.default_currency` (columna). Eran coverage defensivo anticipando schema futuro que nunca llego.

**Auditoria 2026-04-21 (grep exhaustivo sobre `src/`):**

- `quotation_defaults` → **cero referencias** en runtime (0 SELECT / INSERT / UPDATE / DELETE en `src/**/*.ts`).
- `approval_policies.default_currency` → la tabla `approval_policies` SI se consume (en `src/lib/commercial/governance/policies-store.ts` y `approval-evaluator.ts`), pero **ningun archivo lee la columna `default_currency`** de esa tabla. Todas las apariciones de `default_currency` en `src/` apuntan a otras tablas (`quote_templates`, product catalog).

Conclusion: ambos son schema fantasma — aspirations de TASK-466 sin consumer real. Nunca hubo bug latente.

## Impacto

**En tiempo de deteccion (previo al fix):**

- Toda migracion posterior al 2026-04-20 bloqueada porque node-pg-migrate falla all-or-nothing.
- `quotations.currency` seguia con el CHECK viejo `{CLP, USD, CLF}`.
- `role_rate_cards.currency` idem.

**Runtime impact real de los elementos fantasma:** ninguno. No hay code path que intente insertar en `quotation_defaults` ni que lea `approval_policies.default_currency`, entonces la ausencia del CHECK no puede causar data corruption ni bypass de validacion.

## Solucion

Hotfix aplicado 2026-04-21 en la migracion de TASK-466 (commit `cb8461b3` junto con TASK-529):

- `ALTER TABLE IF EXISTS greenhouse_commercial.quotation_defaults ...` — no-op silencioso si la tabla no existe.
- Bloque `DO $$ ... information_schema.columns ... $$` envuelve el ALTER de `approval_policies.default_currency` — no-op si la columna no existe.

Post-fix el pipeline corrio limpio:

- Migracion 466 aplicada (constraint expandido a 6 monedas en las 2 tablas reales: `quotations.currency` y `role_rate_cards.currency`).
- Migracion 529 aplicada (Chile tax code foundation).
- Kysely types regenerados automaticamente.

**No se crea DDL para los elementos fantasma** porque:

1. Nadie los consume en runtime (verificado empiricamente por grep).
2. Crear tabla/columna especulativa introduce mas deuda, no menos.
3. Si en el futuro algun feature realmente necesita `quotation_defaults` o `approval_policies.default_currency`, esa task debera crear el DDL con el CHECK correcto incluido desde el dia 1.

TASK-466 acceptance criterion real (quotes persistibles en MXN/COP/PEN) queda cumplido — los unicos constraints que importan en runtime son los de las tablas que si se consumen.

## Verificacion

- `pnpm migrate:status` → `20260421011323497_task-466` y `20260421105127894_task-529` aparecen aplicadas.
- `pnpm migrate:up` idempotente — ejecutarlo de nuevo no muta nada.
- Confirmacion empirica: 5 seed rows en `greenhouse_finance.tax_codes` leibles con `pg` client.
- Grep sobre `src/` confirma cero consumers de los elementos fantasma.

## Estado

resolved

Resuelto 2026-04-21 con hotfix idempotente + auditoria empirica que confirma zero runtime impact de los elementos fantasma. No se crea DDL para `quotation_defaults` ni `approval_policies.default_currency` porque no hay feature que los consuma.

## Relacionado

- TASK-466 (multi-currency quote output) — migracion `20260421011323497_task-466-expand-quotation-currency-constraint.sql`
- TASK-529 (Chile Tax Code Foundation) — encontro el blocker y aplico el hotfix en el mismo commit `cb8461b3`
- Follow-up si eventualmente algun feature necesita `quotation_defaults`: crear migracion `CREATE TABLE IF NOT EXISTS ...` con el CHECK de 6 monedas incluido desde el dia 1 en lugar de dependerlo de 466.
