# Pagos de Nomina — Estado Downstream

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-01 por Julio Reyes
> **Ultima actualizacion:** 2026-05-01 por Julio Reyes
> **Documentacion tecnica:** [docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)

## Que es

Cuando un periodo de nomina se exporta, cada colaborador queda con
obligaciones de pago vivas. Esas obligaciones se agrupan en ordenes
de pago, se aprueban con maker-checker, se envian al banco, se
marcan como pagadas, y finalmente se concilian contra el extracto
bancario. La vista del periodo en `/hr/payroll` muestra ese estado
downstream en tiempo real, sin tocar el calculo.

## El flujo end-to-end

```
Payroll exportado
   ↓
Obligaciones generadas (TASK-748)
   ↓
Resolver elige rail por perfil de pago (TASK-749)
   ↓
Operator agrupa obligaciones en orden de pago (TASK-750)
   ↓
Order aprobada → programada → enviada → pagada (TASK-750)
   ↓
TASK-751: cuando order=paid, expense_payment se crea automaticamente
   ↓
Reconciliation cruza contra extracto bancario (TASK-722)
   ↓
Conciliado / Cerrado
```

## Que se muestra en Payroll

En la pestana de un periodo:

1. **Card "Estado de pago downstream"** con 4 KPIs:
   - Obligaciones (cuantas se generaron / cuantos entries hay)
   - Ordenes pagadas (cuantas pasaron a state=paid)
   - Conciliadas (cuantas tienen expense_payment.is_reconciled=TRUE)
   - Bloqueadas (cuantas no tienen perfil de pago activo y bloquean)
2. **Alert con drift** cuando hay bloqueadas: lista los miembros y CTA
   "Resolver en Perfiles de pago".
3. **Botones para navegar**: ver ordenes del periodo o calendario.
4. **Columna "Estado pago" en la tabla de entries**: chip por
   colaborador con su estado actual.

## Estados posibles por entry

- **Sin chip** → `no_obligation`: aun no se genero la obligation
  (period no exportado o member sin entry)
- **Por programar** → `awaiting_order`: hay obligation pero no order
- **Pendiente aprobacion** → `order_pending_approval`
- **En proceso** → `order_approved | order_scheduled | order_submitted`
- **Pagado · sin conciliar** → order paid, expense_payment creado,
  falta cruzarlo con el extracto
- **Conciliado** → ciclo completo cerrado
- **Bloqueado: sin perfil** → resolver retorna `profile_missing`

## Como conecta con Payroll

- **No cambia el calculo**. El reader es read-only sobre datos
  downstream.
- **No marca payroll como pagado por exportar**. El status de pago se
  deriva de obligations + orders + expense_payments + reconciliation.
- **No requiere backfill manual**. Cuando una order pasa a paid, el
  consumer reactive crea expense_payments automaticamente.

## Reglas duras

- Si `totalBlocked > 0` para un periodo, las obligations bloqueadas
  no se pueden agrupar en ordenes hasta que el operator cree los
  perfiles de pago faltantes.
- Re-export del mismo periodo NO duplica obligations (idempotency
  TASK-748).
- Re-pago accidental NO duplica expense_payments (idempotency TASK-751
  via partial unique index).

## Que NO hace V1

- No procesa `employer_social_security` consolidado (Previred)
  automaticamente — sigue como path legacy del operator.
- No procesa `processor_fee` ni `fx_component` automaticamente.
- No genera obligation delta cuando una entry se reliquida (eso es
  TASK-755 V2). Hoy `payrollReliquidationDeltaProjection` ya crea el
  expense delta — el path equivalente para obligations queda en V2.

> Detalle tecnico: helpers en
> [src/lib/finance/payment-orders/](../../../src/lib/finance/payment-orders/).
> Reader en
> [src/lib/finance/payment-orders/payroll-status-reader.ts](../../../src/lib/finance/payment-orders/payroll-status-reader.ts).
> Projection consumer en
> [src/lib/sync/projections/record-expense-payment-from-order.ts](../../../src/lib/sync/projections/record-expense-payment-from-order.ts).
> Migration en
> [migrations/20260501163149826_task-751-link-orders-to-expense-payments.sql](../../../migrations/20260501163149826_task-751-link-orders-to-expense-payments.sql).
