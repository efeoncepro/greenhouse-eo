# Seguimiento de pagos de nomina — Manual de uso

> **Para que sirve**: ver el estado downstream del pago de cada
> colaborador en un periodo de nomina (obligacion → orden → pagado →
> conciliado) sin salir de Payroll.

## Antes de empezar

- Necesitas pertenecer al route group `hr` o tener rol
  `efeonce_admin`/`hr_payroll`/`finance_admin` para ver el card y la
  columna.
- Las obligations se generan automaticamente al exportar el periodo —
  si no las ves es porque el periodo no esta exportado todavia.

## Donde encontrarlo

`/hr/payroll/period/[periodId]` o `/hr/payroll?periodId=X` →
pestana del periodo. El card "Estado de pago downstream" aparece
despues de los KPIs principales del periodo y antes de la tabla de
entries.

## Que verifica el card

1. **Obligaciones generadas** vs total de entries activos. Si hay
   diferencia, algun entry no genero obligation (debug en
   `/finance/payment-profiles` queue).
2. **Ordenes pagadas** vs ordenes totales. Si hay ordenes en estado
   intermedio, el calendario te dice cuales esperar.
3. **Conciliadas**: cuantas pasaron por el ciclo completo hasta el
   match contra extracto.
4. **Bloqueadas**: colaboradores sin perfil de pago activo. Las
   ordenes para estos NO se pueden generar hasta crear el perfil.

## Que hacer cuando hay bloqueadas

1. Click en "Resolver en Perfiles de pago" → te lleva a
   `/finance/payment-profiles` con la cola de drift.
2. Para cada miembro bloqueado, abrir Person 360 → tab "Pago" →
   Crear perfil.
3. Otro usuario aprueba con maker-checker.
4. Volver al periodo de Payroll → el card se actualiza
   automaticamente cuando refrescas.

## Como interpretar la columna "Estado pago"

Cada entry muestra un chip por colaborador:

| Chip | Que significa | Que sigue |
|------|---------------|-----------|
| (sin chip) | Aun no hay obligation | Verificar que el periodo este exportado |
| Por programar | Obligation generada | Operator debe crear orden |
| Pendiente aprobacion | Orden esperando checker | Otro usuario aprueba en /finance/payment-orders |
| En proceso | Orden aprobada/programada/enviada | Esperar confirmacion del banco |
| Pagado · sin conciliar | Orden paid, expense_payment creado | Cruzar contra extracto en /finance/reconciliation |
| Conciliado | Ciclo completo | Cerrado |
| Bloqueado: sin perfil | Falta perfil de pago | Crear en Person 360 |

## Que NO hacer

- **NO** marcar manualmente expense_payments para ordenes que
  pasaron por TASK-751. El consumer reactive ya lo hizo
  automaticamente. Hacerlo manual genera duplicados.
- **NO** modificar el calculo de payroll esperando que cambie el
  estado downstream. El estado se actualiza cuando se mueve la
  order, no cuando se recalcula el entry.

## Problemas comunes

| Sintoma | Causa | Solucion |
|---------|-------|----------|
| El card no aparece | Tu rol no tiene permiso (no eres finance/hr/admin) | Pedir grant a un admin |
| Bloqueadas > 0 pero no se quien | Click "Resolver en Perfiles de pago" para ver lista detallada |
| Order pasa a paid pero el chip sigue en "Pagado · sin conciliar" | Esperado: la conciliacion contra extracto la hace finance en /finance/reconciliation |
| Re-pague una order y se duplico el expense_payment | NO debe pasar por idempotency. Si pasa, contactar a engineering — bug |

## Referencias tecnicas

- Spec: [docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)
- Doc funcional: [docs/documentation/hr/pagos-de-nomina.md](../../documentation/hr/pagos-de-nomina.md)
- Reader: [src/lib/finance/payment-orders/payroll-status-reader.ts](../../../src/lib/finance/payment-orders/payroll-status-reader.ts)
- Card UI: [src/views/greenhouse/payroll/PayrollPaymentStatusCard.tsx](../../../src/views/greenhouse/payroll/PayrollPaymentStatusCard.tsx)
- Migration: [migrations/20260501163149826_task-751-link-orders-to-expense-payments.sql](../../../migrations/20260501163149826_task-751-link-orders-to-expense-payments.sql)
