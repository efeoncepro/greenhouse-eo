# ISSUE-058 — Proyección VAT (`vat_monthly_position`) falla con `could not determine data type of parameter $6`

## Ambiente

staging + production

## Detectado

2026-04-26 — Admin Center / Reliability Control Plane mostraba "Cloud Platform → Atención · 1 con falla" para subsystem `Proyecciones`. Investigación encontró `refresh_id='vat_monthly_position:finance_period:2026-04'` en `status='failed'` con `error_message='could not determine data type of parameter $6'`, `error_class='application'`, `is_infrastructure_fault=false`.

## Síntoma

- La proyección reactiva del VAT ledger fallaba en cada disparo desde `finance.income.nubox_synced` y eventos relacionados.
- `failedHandlers` mostraba 10+ registros consecutivos del handler `vat_monthly_position:finance.expense.nubox_synced` con `result='dead-letter'` y el mismo error.
- El dashboard escalaba "Proyecciones" a warning sin indicar la causa real.

## Causa raíz

`src/lib/finance/vat-ledger.ts` (`materializeVatLedgerForPeriod`) interpolaba parámetros con sintaxis mixta en los template literals de `kysely.sql`:

- `${year}` y `${month}` sin cast explícito (Postgres infiere a partir del contexto).
- `${periodId}` y `${reason}` envueltos en `CAST(${...} AS text)`.

Cuando los CTEs `scoped_income`/`scoped_expense` resolvían a 0 filas (período en curso sin data Nubox aún), Postgres no podía inferir tipo del parámetro `$6` (== `${reason}` en el bloque de income, `${periodId}` en el bloque de `vat_monthly_positions`) y abortaba el INSERT antes de proyectar tipos por el SELECT vacío.

## Impacto

- Bloqueaba toda materialización del VAT ledger para el período en curso (2026-04).
- Los reactive handlers se acumulaban en `outbox_reactive_log` con `result='dead-letter'`.
- El dashboard del Admin Center generaba ruido recurrente sobre este sistema crítico.

## Solución

Reescritura del bloque SQL para usar postfix casts canónicos en TODAS las interpolaciones (`${year}::int`, `${month}::int`, `${periodId}::text`, `${reason}::text`). Ya no se mezclan formas: todo parámetro lleva su tipo explícito.

Validación en vivo: script reproductor contra Cloud SQL ejecuta los 3 bloques INSERT (income con $6, expense con $6, vat_monthly_positions con $9) sin error.

Adicional: la proyección quedó stuck en `failed` aunque `is_infrastructure_fault=false` (application fault). Como parte de [ISSUE-061](ISSUE-061-projection-queue-no-dlq-semantics.md) ahora se rutea a `dead` para visibilidad operativa.

## Verificación

- ✅ Manual rerun de `materializeVatLedgerForPeriod(2026, 4, ...)` corre sin error.
- ✅ Re-queue del refresh_id afectado: status `pending` → `completed`, retry_count=1.
- ✅ Test `vat-ledger.test.ts` actualizado y validado: el SQL renderizado contiene `::int`/`::text` postfix casts.

## Estado

resolved

## Relacionado

- Commit `bd278687` — fix(reliability): DLQ + recovery classifier
- Archivo: `src/lib/finance/vat-ledger.ts`
- Test: `src/lib/finance/vat-ledger.test.ts`
- ISSUE relacionado: [ISSUE-061](ISSUE-061-projection-queue-no-dlq-semantics.md) (DLQ pattern para proyecciones)
