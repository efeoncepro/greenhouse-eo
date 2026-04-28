# TASK-708c — Promote `payment_account_id` CHECK to `NOT NULL` puro

## Status

- Lifecycle: `to-do`
- Priority: `P3` (mantenimiento; ventana de gracia 30+ días)
- Impact: `Bajo` (limpieza de modelo; cero impacto operativo si se ejecuta correctamente)
- Effort: `Bajo`
- Type: `migration`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno — pendiente ventana de gracia 30+ dias post-cutover (2026-04-28 + 30 = ~2026-05-28)`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: ventana de gracia + verificación que `paymentsPendingAccountResolutionRuntime = 0` y `paymentsPendingAccountResolutionHistorical = 0` durante 30 dias consecutivos
- Coordinates with: `TASK-708`, `TASK-708b`
- Branch: `task/TASK-708c-promote-payment-account-id-not-null`

## Summary

Tras TASK-708 + TASK-708b, las invariantes `income_payments.payment_account_id IS NOT NULL` y `expense_payments.payment_account_id IS NOT NULL` están enforced para todo dml post-cutover via CHECK condicional con cláusula `created_at < TIMESTAMPTZ '2026-04-28 12:38:18.834+00'`. El CHECK actual exime filas pre-cutover legacy.

Esta task promueve el CHECK a `NOT NULL` puro tras una ventana de gracia (30+ dias) en la que la base se mantenga limpia (cero phantoms residuales). Es un cleanup de modelo: simplifica el constraint, elimina la cláusula condicional con timestamp hardcoded, y deja la invariante como regla universal.

## Why This Task Exists

- El CHECK condicional `OR created_at < '2026-04-28 12:38:18.834+00'` es código de transición. Sigue activo permitiendo que las filas dismissed pre-cutover sigan ahí. Tras la ventana de gracia, esa cláusula es deuda técnica.
- `NOT NULL` puro es semánticamente más claro y se valida más rápido que un `CHECK` con expresión.
- El timestamp en el CHECK queda hardcoded en migration history; promover a `NOT NULL` lo borra del modelo activo.

## Pre-requisitos

- 30+ dias consecutivos con `ledger-health.task708.paymentsPendingAccountResolutionRuntime = 0` (verificar dashboard Reliability Control Plane).
- 30+ dias con `paymentsPendingAccountResolutionHistorical = 0` (NO solo "no aumenta", sino exactamente 0).
- Cero filas con `payment_account_id IS NULL` en estado activo (no superseded). Query de verificación:

```sql
SELECT 'income' AS kind, COUNT(*)::int FROM greenhouse_finance.income_payments
WHERE payment_account_id IS NULL
  AND superseded_by_payment_id IS NULL
  AND superseded_by_otb_id IS NULL
  AND superseded_at IS NULL
UNION ALL
SELECT 'expense', COUNT(*)::int FROM greenhouse_finance.expense_payments
WHERE payment_account_id IS NULL
  AND superseded_by_payment_id IS NULL
  AND superseded_by_otb_id IS NULL
  AND superseded_at IS NULL;
-- Both should be 0
```

## Scope

### Slice 1 — Verificación pre-promoción

- Query de Acceptance arriba debe retornar 0/0 durante 30+ dias consecutivos.
- Confirmar con `ledger-health` que las metricas `paymentsPendingAccountResolutionRuntime` y `_Historical` son 0.

### Slice 2 — Migración

```sql
-- Promote income_payments
ALTER TABLE greenhouse_finance.income_payments
  DROP CONSTRAINT IF EXISTS income_payments_account_required_after_cutover;

-- Strategy: filas pre-cutover con NULL ya estan dismissed (superseded_at NOT NULL).
-- Las que sobreviven son TODAS post-cutover con account NOT NULL.
-- Sin embargo, las dismissed siguen teniendo payment_account_id NULL pero superseded_at NOT NULL.
-- Si se aplica NOT NULL puro, esas filas violarian.
--
-- Estrategia canonica: hacer NOT NULL solo a filas activas.
-- Pero PostgreSQL NOT NULL no acepta clausula condicional.
--
-- Alternativa: mantener CHECK pero simplificarlo a:
--   CHECK (payment_account_id IS NOT NULL OR superseded_at IS NOT NULL)
-- Esto es coherente con la convencion canonica de TASK-708b.

ALTER TABLE greenhouse_finance.income_payments
  ADD CONSTRAINT income_payments_account_required
  CHECK (
    payment_account_id IS NOT NULL
    OR superseded_at IS NOT NULL
    OR superseded_by_payment_id IS NOT NULL
    OR superseded_by_otb_id IS NOT NULL
  );

ALTER TABLE greenhouse_finance.expense_payments
  DROP CONSTRAINT IF EXISTS expense_payments_account_required_after_cutover;

ALTER TABLE greenhouse_finance.expense_payments
  ADD CONSTRAINT expense_payments_account_required
  CHECK (
    payment_account_id IS NOT NULL
    OR superseded_at IS NOT NULL
    OR superseded_by_payment_id IS NOT NULL
    OR superseded_by_otb_id IS NOT NULL
  );
```

Esta strategia es **mejor que `NOT NULL` puro**: preserva la convención canónica TASK-708b de que filas superseded son histórico audit-only. Si una fila futura es dismissed sin replacement, sigue siendo válida.

### Slice 3 — Verificación post-promoción

- Re-correr query Acceptance: debe retornar 0/0.
- Verificar que `ledger-health` sigue verde.
- Test de regresión: intentar INSERT de `income_payments` con `payment_account_id = NULL` y todas las supersede columns NULL → debe fallar con CHECK violation.

## Acceptance Criteria

- [ ] Migración aplicada en dev/staging/prod sin errores.
- [ ] CHECK constraints `income_payments_account_required` y `expense_payments_account_required` activos y validated (no `NOT VALID`).
- [ ] Test de regresión: `INSERT` con todas las supersede columns NULL y `payment_account_id NULL` falla.
- [ ] `ledger-health.task708.paymentsPendingAccountResolutionRuntime = 0` post-migración.

## Verification

- `pnpm migrate:up`
- Query Acceptance arriba == 0/0
- Test integración `pnpm test src/lib/finance/payment-ledger`
