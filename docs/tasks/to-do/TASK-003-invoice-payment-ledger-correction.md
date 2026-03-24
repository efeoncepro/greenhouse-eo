# CODEX_TASK_Invoice_Payment_Ledger_Correction_v1

## Summary

Corregir el flujo de pagos del módulo Finance para que **todo pago registrado pase por `income_payments`** como fuente de verdad, y que `income.amount_paid` sea siempre un agregado derivado — no un campo escrito directamente. El problema hoy es que el sync de Nubox bank movements actualiza `income.amount_paid` directamente sin crear registros en `income_payments`, perdiendo trazabilidad de cuándo, cuánto y por qué medio se cobró cada pago.

## Why This Task Exists

### El modelo correcto ya existe

La tabla `income` modela **facturas** (invoice_number, invoice_date, due_date, total_amount) y la tabla `income_payments` modela **cobros individuales** contra esas facturas (payment_date, amount, payment_method, payment_source, reference). Esta separación es correcta contablemente: una factura puede tener múltiples cobros parciales, y cada cobro es un evento con su propia fecha y referencia bancaria.

El CRUD manual (vía `postgres-store-slice2.ts`) funciona bien:
- `registerIncomePayment()` (línea ~1058) inserta en `income_payments` y luego actualiza `income.amount_paid` y `income.payment_status` como derivados
- `getIncomeDetail()` (línea ~670) carga la factura + todos sus payments
- `postgres-reconciliation.ts` usa `income_payments` como fuente para candidatos de reconciliación bancaria

### El problema: Nubox bypasea el ledger

`reconcileIncomeFromBankMovement()` en `sync-nubox-to-postgres.ts` (líneas 387-432) hace esto cuando llega un movimiento bancario de Nubox vinculado a una venta:

```typescript
const newAmountPaid = Number(income.amount_paid) + paymentAmount
const newStatus = newAmountPaid >= Number(income.total_amount) ? 'paid' : 'partial'

await runGreenhousePostgresQuery(
  `UPDATE greenhouse_finance.income SET
    payment_status = $2, amount_paid = $3, updated_at = NOW()
  WHERE income_id = $1`,
  [income.income_id, newStatus, newAmountPaid]
)
```

Escribe directamente en `income.amount_paid` sin crear un registro en `income_payments`.

### Consecuencias operativas

1. **Sin trazabilidad de cobros vía Nubox:** Si una factura de $1M se cobra en 3 pagos parciales vía banco, solo ves el total acumulado. No sabes cuándo llegó cada pago ni por qué monto.

2. **Reconciliación bancaria incompleta:** `postgres-reconciliation.ts` busca candidatos en `income_payments` (línea 676). Los pagos de Nubox no aparecen ahí, así que no pueden reconciliarse contra bank_statement_rows.

3. **Divergencia de fuentes:** Un pago registrado manualmente pasa por `income_payments` → se reconcilia → aparece en reportes. Un pago idéntico que llega vía Nubox solo incrementa un número. Dos caminos para el mismo concepto.

4. **Imposibilidad de auditar:** Un contador necesita saber "¿cuándo se cobró la factura EF-2026-0042?" No hay registro.

5. **amount_paid puede divergir:** Si alguien registra un pago manual Y Nubox sincroniza el mismo movimiento bancario, `amount_paid` se duplica porque no hay deduplicación (no hay registro de payment con referencia de Nubox para comparar).

## Goal

1. **Que `reconcileIncomeFromBankMovement()` cree un registro en `income_payments`** con referencia al movimiento de Nubox
2. **Que `income.amount_paid` se derive de `SUM(income_payments.amount)`** en vez de ser campo escrito directamente
3. **Que el sync inicial de ventas (`syncSaleToIncome`) no escriba `payment_status`** basado en `balance` — ese estado debe derivarse de los pagos registrados
4. **Deduplicación:** Si un bank movement de Nubox ya tiene un payment registrado (por referencia), no duplicar

## Dependencies & Impact

### Depends on
- `scripts/setup-postgres-finance-slice2.sql` — DDL de income + income_payments
- `src/lib/nubox/sync-nubox-to-postgres.ts` — sync de ventas y bank movements
- `src/lib/finance/postgres-store-slice2.ts` — CRUD de income y registerIncomePayment()
- `src/lib/finance/postgres-reconciliation.ts` — reconciliación bancaria
- Task completada: `CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md`
- Task completada: `CODEX_TASK_Nubox_DTE_Integration.md`

### Impacts to
- `CODEX_TASK_Nubox_Finance_Reconciliation_Bridge_v1.md` — esta corrección es prerequisito; sin ledger completo, la reconciliación DTE no puede matchear pagos
- `CODEX_TASK_Organization_Economics_Dashboard_v1.md` — economics necesita revenue reconocido (cobrado) vs. facturado; solo posible con payments correctos
- `CODEX_TASK_Financial_Intelligence_Layer_v2.md` — aging reports, DSO, cash flow proyectado dependen de fechas de pago individuales

### Files owned
- Modificación: `src/lib/nubox/sync-nubox-to-postgres.ts` — `reconcileIncomeFromBankMovement()` y `syncSaleToIncome()`
- Modificación: `src/lib/finance/postgres-store-slice2.ts` — `registerIncomePayment()` y derivación de amount_paid
- Nuevo: `scripts/backfill-income-payments-from-nubox.ts` — backfill de pagos históricos
- Nuevo: `scripts/migrations/derive-amount-paid-from-payments.sql` — migrar a amount_paid derivado

## Current Repo State

### Ya existe y funciona bien
- **income_payments tabla** (setup-postgres-finance-slice2.sql, líneas 95-114): Schema completo con payment_id, income_id, payment_date, amount, currency, reference, payment_method, payment_source, is_reconciled, reconciliation_row_id
- **registerIncomePayment()** (postgres-store-slice2.ts, línea ~1058): Inserta en income_payments, actualiza income.amount_paid como derivado, valida que no exceda total
- **getIncomeDetail()** (postgres-store-slice2.ts, línea ~670): Carga factura + lista de payments
- **Reconciliación bancaria** (postgres-reconciliation.ts, línea ~676): Busca candidatos en income_payments WHERE is_reconciled = FALSE
- **Outbox event** ya publicado: `finance.income.payment_received_via_nubox` (sync-nubox-to-postgres.ts, línea 421)

### Lo que está roto
- **reconcileIncomeFromBankMovement()** (sync-nubox-to-postgres.ts, líneas 387-432): UPDATE directo a income.amount_paid sin INSERT en income_payments
- **syncSaleToIncome()** (sync-nubox-to-postgres.ts, línea 148): Asigna `payment_status` basado en `sale.balance === 0`, bypasseando el ledger de pagos
- **No hay deduplicación** de pagos Nubox vs. pagos manuales
- **income.amount_paid** es campo escrito directamente en vez de derivado de SUM(payments)

## Implementation Plan

### Slice 1 — Nubox Bank Movement → income_payments (Corrección core)

**Modificar `reconcileIncomeFromBankMovement()` en sync-nubox-to-postgres.ts:**

```typescript
const reconcileIncomeFromBankMovement = async (
  movement: NuboxConformedBankMovement
): Promise<boolean> => {
  if (!movement.linked_sale_id) return false

  const incomeRows = await runGreenhousePostgresQuery<{...}>(
    `SELECT income_id, total_amount, amount_paid
     FROM greenhouse_finance.income
     WHERE nubox_document_id = $1 AND payment_status != 'paid'
     LIMIT 1`,
    [Number(movement.linked_sale_id)]
  )
  if (incomeRows.length === 0) return false

  const income = incomeRows[0]
  const paymentAmount = Number(movement.total_amount ?? 0)

  // ── NUEVO: Deduplicación por referencia Nubox ──
  const existing = await runGreenhousePostgresQuery(
    `SELECT payment_id FROM greenhouse_finance.income_payments
     WHERE income_id = $1 AND reference = $2 LIMIT 1`,
    [income.income_id, `nubox-mvmt-${movement.nubox_movement_id}`]
  )
  if (existing.length > 0) return false // Ya registrado

  // ── NUEVO: Crear registro en income_payments ──
  const paymentId = `pay-nubox-${movement.nubox_movement_id}`
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_finance.income_payments (
      payment_id, income_id, payment_date, amount, currency,
      reference, payment_method, payment_source, notes, recorded_at
    ) VALUES ($1, $2, $3, $4, 'CLP', $5, 'bank_transfer', 'client_direct',
      'Auto-registrado desde movimiento bancario Nubox', NOW())`,
    [
      paymentId,
      income.income_id,
      movement.payment_date,
      paymentAmount,
      `nubox-mvmt-${movement.nubox_movement_id}`
    ]
  )

  // ── Derivar amount_paid desde payments ──
  const sumResult = await runGreenhousePostgresQuery<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM greenhouse_finance.income_payments WHERE income_id = $1`,
    [income.income_id]
  )
  const newAmountPaid = Number(sumResult[0].total)
  const newStatus = newAmountPaid >= Number(income.total_amount) ? 'paid' : 'partial'

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_finance.income SET
      payment_status = $2, amount_paid = $3, updated_at = NOW()
    WHERE income_id = $1`,
    [income.income_id, newStatus, newAmountPaid]
  )

  // Outbox event (ya existe, mantener)
  await publishOutboxEvent(...)

  return true
}
```

### Slice 2 — Ajustar sync de ventas inicial

**Modificar `syncSaleToIncome()` en sync-nubox-to-postgres.ts:**

- En el INSERT/ON CONFLICT, no escribir `payment_status` basado en `sale.balance`
- En cambio, dejar `payment_status = 'pending'` siempre para ventas nuevas
- Si Nubox reporta `balance = 0`, no confiar ciegamente — los bank movements posteriores son los que deben cambiar el status vía income_payments
- **Excepción:** Si es un sync retrospectivo (venta antigua que ya fue cobrada), el backfill de Slice 3 se encarga

### Slice 3 — Backfill de pagos históricos

**Crear `scripts/backfill-income-payments-from-nubox.ts`:**

1. Leer todas las facturas con `amount_paid > 0` que no tienen registros en `income_payments`
2. Para cada una, buscar bank movements de Nubox conformed que matcheen por `linked_sale_id`
3. Crear registros en `income_payments` con referencia `nubox-mvmt-{id}` y fecha del movimiento
4. Recalcular `income.amount_paid` = SUM(payments)
5. Log de discrepancias (facturas marcadas como pagadas sin movimiento bancario encontrado)

### Slice 4 — Validación y consistencia

1. **Crear constraint o trigger** que mantenga `income.amount_paid` sincronizado:
   ```sql
   -- Opción A: Trigger on income_payments INSERT/UPDATE/DELETE
   CREATE OR REPLACE FUNCTION greenhouse_finance.fn_sync_income_amount_paid()
   RETURNS TRIGGER AS $$
   BEGIN
     UPDATE greenhouse_finance.income SET
       amount_paid = COALESCE((
         SELECT SUM(amount) FROM greenhouse_finance.income_payments
         WHERE income_id = COALESCE(NEW.income_id, OLD.income_id)
       ), 0),
       payment_status = CASE
         WHEN ... THEN 'paid'
         WHEN ... THEN 'partial'
         ELSE 'pending'
       END,
       updated_at = NOW()
     WHERE income_id = COALESCE(NEW.income_id, OLD.income_id);
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

   Opción B (más conservadora): verificación periódica vía script, sin trigger.

2. **Test de consistencia:** Script que compare `income.amount_paid` vs `SUM(income_payments.amount)` y reporte discrepancias.

3. **Misma corrección para expenses:** Verificar si `reconcileExpenseFromBankMovement()` tiene el mismo problema (UPDATE directo sin registros de pago individual). Si expenses también necesita un ledger `expense_payments`, documentar pero no implementar en esta task.

### Slice 5 — Renaming semántico: income → invoices (capa visible)

La tabla se llama `income` pero modela facturas. Un rename completo de tabla/FK/tipos sería un refactor de alto riesgo (162 rutas API, reconciliación bancaria, sync Nubox, BigQuery, outbox events, tipos TypeScript). En cambio, alinear la semántica en la capa que el usuario y futuros developers ven:

1. **Comentarios en DDL:** Agregar al setup script:
   ```sql
   COMMENT ON TABLE greenhouse_finance.income IS
     'Facturas emitidas a clientes (invoices). El nombre "income" es legacy.
      Cada registro es una factura, NO un ingreso reconocido.
      Los cobros individuales viven en income_payments.';
   COMMENT ON TABLE greenhouse_finance.income_payments IS
     'Cobros individuales contra facturas. Cada fila es un pago recibido.
      income.amount_paid debe ser siempre = SUM(income_payments.amount).';
   ```

2. **Alias en tipos TypeScript:** En `postgres-store-slice2.ts`, agregar type aliases:
   ```typescript
   /** Factura emitida a un cliente. Legacy name: "income". */
   export type Invoice = FinanceIncomeRecord
   /** Cobro individual contra una factura. */
   export type InvoicePayment = FinanceIncomePaymentRecord
   ```

3. **Labels de UI:** Reemplazar "Ingreso" / "Income" por "Factura" / "Invoice" en todos los labels visibles al usuario en las vistas de Finance. Esto incluye:
   - Títulos de tablas y drawers en la vista de ingresos
   - Labels de columnas (invoice_number → "N° Factura", invoice_date → "Fecha emisión")
   - Status badges ("Pendiente de cobro" en vez de "Pending")
   - Breadcrumbs y navegación

4. **API docs / spec:** Actualizar `spec/04-api-reference.md` para que las rutas `/api/finance/income/*` documenten que operan sobre facturas, no ingresos reconocidos.

**Archivos afectados (UI labels):**
- `src/views/greenhouse/finance/` — vistas de ingresos/facturas
- `src/components/greenhouse/finance/` — componentes compartidos de finance
- `spec/04-api-reference.md`, `spec/05-modules.md` — documentación

## Acceptance Criteria

- [ ] Bank movements de Nubox crean registros en `income_payments` con referencia deduplicable
- [ ] `income.amount_paid` se deriva de `SUM(income_payments.amount)` (no se escribe directamente)
- [ ] Pagos duplicados (mismo nubox_movement_id) no se registran dos veces
- [ ] Backfill script puebla pagos históricos faltantes
- [ ] Reconciliación bancaria (`postgres-reconciliation.ts`) encuentra pagos de Nubox como candidatos
- [ ] Log de discrepancias para facturas con amount_paid pero sin payments
- [ ] No breaking changes en el CRUD manual de pagos (registerIncomePayment sigue funcionando)
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] Al menos 4 tests: (1) bank movement crea payment, (2) deduplicación, (3) amount_paid derivado, (4) backfill
- [ ] Labels de UI usan "Factura" / "Invoice" en vez de "Ingreso" / "Income"
- [ ] Comentarios SQL y type aliases TypeScript documentan la semántica correcta
- [ ] Specs actualizados reflejan que income = facturas emitidas
