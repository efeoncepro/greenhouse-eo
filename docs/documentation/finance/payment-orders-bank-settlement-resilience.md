# Ordenes de Pago — Resiliencia hasta el Banco

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-02 por Julio Reyes (con asistencia Claude Opus 4.7)
> **Ultima actualizacion:** 2026-05-02 por Julio Reyes
> **Documentacion tecnica:** docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md

## Que problema resuelve

Antes, una orden de pago podia quedar marcada como "pagada" en el portal sin que el banco se afectara y sin que nadie se enterara. El operador veia "pagado" en pantalla, el saldo del banco no rebajaba, y la conciliacion quedaba desalineada por horas o dias hasta que alguien lo notaba a mano.

Con TASK-765 esto **dejo de ser posible**. El portal hoy garantiza que cuando una orden pasa a "pagada", el banco se rebaja en el mismo instante o la operacion se revierte completa. Si algo se atasca, hay alertas tempranas y un boton claro de "Recuperar orden".

> Detalle tecnico: [TASK-765](../../tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md), [ISSUE-063](../../issues/resolved/ISSUE-063-payment-orders-paid-without-bank-impact.md), [Spec Finance](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md).

## El flujo canonico de pago

Cuando marcas una orden como pagada, el sistema corre todos estos pasos como una sola unidad — todo termina bien o nada queda guardado.

| # | Paso | Que pasa |
|---|---|---|
| 1 | **Bloqueo de la orden** | El portal "toma" la orden para que nadie mas la pueda mover en paralelo. |
| 2 | **Validacion de cuenta origen** | Si no elegiste banco origen, la operacion se rechaza con un mensaje claro. |
| 3 | **Cambio de estado** | La orden pasa a `paid` y queda marcada con la fecha de pago. |
| 4 | **Registro de auditoria** | Se anota la transicion en una bitacora que nadie puede borrar. |
| 5 | **Pago de gastos** | Por cada linea de la orden se crea un `expense_payment` ligado al banco origen. |
| 6 | **Movimiento bancario** | Por cada pago se crea un `settlement_leg` que rebaja el saldo del banco. |
| 7 | **Eventos downstream** | El portal avisa a los consumidores (payslips, conciliacion, dashboards). |
| 8 | **Confirmacion final** | Si todo salio bien, se confirma la operacion. Si cualquier paso fallo, se revierte completa y la orden vuelve al estado anterior. |

> Detalle tecnico: `markPaymentOrderPaidAtomic` en [src/lib/finance/payment-orders/mark-paid-atomic.ts](../../../src/lib/finance/payment-orders/mark-paid-atomic.ts).

## Las 3 protecciones nuevas

| Proteccion | Que hace | Donde la ves |
|---|---|---|
| **Hard-gate cuenta origen** | No puedes aprobar ni marcar pagada una orden sin elegir el banco origen. Esta bloqueado en la UI, en la API y en la base de datos (constraint + trigger). | Formulario de aprobacion: el campo "Cuenta origen" es requerido. Mensaje en es-CL si lo omites. |
| **Atomicidad transaccional** | Estado de la orden, pago de gastos y movimiento bancario viven en una sola transaccion. Si cualquier paso falla, todo se revierte y la orden no queda zombie. | Invisible cuando todo va bien. Si algo falla, ves el error inmediato y la orden sigue en `submitted` (no en `paid` huerfano). |
| **Alertas tempranas** | El portal vigila tres senales y las muestra en `/admin/operations`. Cualquier valor mayor a 0 indica un problema activo que requiere atencion. | Banner rojo en el detalle de la orden + tres reliability signals en el dashboard de operaciones. |

> Detalle tecnico: CHECK constraint + trigger PG anti-zombie en migrations `task-765-*`. UI guard en [PaymentOrderApprovalForm.tsx](../../../src/views/greenhouse/finance/payment-orders/PaymentOrderApprovalForm.tsx) y [PaymentOrderDetailDrawer.tsx](../../../src/views/greenhouse/finance/payment-orders/PaymentOrderDetailDrawer.tsx).

## Si algo se rompe, que pasa

Cuando una orden no logra cerrar el ciclo completo, el portal emite un evento `finance.payment_order.settlement_blocked` con una **razon estructurada**, muestra un banner rojo en el detalle de la orden y habilita el CTA "Recuperar orden". El operador no tiene que adivinar — la razon le dice exactamente que falto.

| Razon | Que significa | Que hacer |
|---|---|---|
| `expense_unresolved` | El gasto al que apunta la orden no existe todavia (nomina no materializada, periodo no exportado). | Usar el endpoint de rematerializacion del periodo o esperar al cron. |
| `account_missing` | La orden quedo sin cuenta origen (caso legacy pre-TASK-765). | Usar "Recuperar orden" e indicar el banco real desde donde salio el dinero. |
| `cutover_violation` | El gasto existe pero no tiene cuenta de pago, lo cual viola el contrato vigente desde el 2026-04-28. | Revisar el `expense` upstream y completar el campo. |
| `materializer_dead_letter` | El proceso que materializa nominas a gastos quedo en dead-letter por error de schema o de datos. | Pedir a un admin que ejecute la rematerializacion del periodo. |
| `out_of_scope_v1` | La orden incluye un tipo de obligacion que la primera version del resolver todavia no cubre (p.ej. social security patronal, fees, FX). | Esperar a la version V2 del resolver o registrar el pago manualmente. |

> Detalle tecnico: outbox event registrado en [GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md). Errores tipados en [src/lib/finance/payment-orders/errors.ts](../../../src/lib/finance/payment-orders/errors.ts).

## Como se ve en el dashboard de operaciones

En `/admin/operations` aparecen tres senales nuevas dentro del subsystem **Finance Data Quality**. Steady state = 0 — cualquier valor mayor indica un problema activo.

| Senal | Que mide | Severidad |
|---|---|---|
| **Paid orders sin expense_payment** | Ordenes en estado `paid` desde hace mas de 15 minutos que no tienen ningun pago de gasto asociado y no tienen un evento `settlement_blocked` reciente. | Critica |
| **Payment orders en dead-letter** | Corridas del proyector `record_expense_payment_from_order` o del materializador de nomina que quedaron en dead-letter sin acknowledge. | Critica |
| **Lag de materializacion de nomina** | Periodos de nomina exportados hace mas de 1 hora que aun no tienen filas en `greenhouse_finance.expenses`. | Warning |

Cualquier valor mayor a 0 dispara el alert visual en el dashboard y entra al rollup del Reliability Control Plane.

> Detalle tecnico: queries en [src/lib/reliability/queries/](../../../src/lib/reliability/) (`payment-orders-paid-without-expense-payment.ts`, `payment-orders-dead-letter.ts`, `payroll-expense-materialization-lag.ts`). Modulo registrado en [src/lib/reliability/registry.ts](../../../src/lib/reliability/registry.ts).

## Roles y permisos

| Accion | Quien puede |
|---|---|
| Crear y aprobar ordenes de pago | Roles existentes de Finance (sin cambio post TASK-765) |
| Marcar orden como pagada | Roles existentes de Finance (con guards nuevos: cuenta origen requerida) |
| **Rerun del materializador de nomina** | `FINANCE_ADMIN` y `EFEONCE_ADMIN` (capability `finance.payroll.rematerialize`) |
| **Recuperar orden zombie legacy** | `FINANCE_ADMIN` y `EFEONCE_ADMIN` (capability `finance.payment_orders.recover`) |

Las dos capabilities nuevas son granulares por diseno — quedan auditables fila por fila en `payment_order_state_transitions`.

> Detalle tecnico: endpoints `POST /api/admin/finance/payroll-expense-rematerialize` y `POST /api/admin/finance/payment-orders/[orderId]/recover`. Spec de autorizacion: [GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md).

## Como funciona el banco despues

El saldo del banco origen se rebaja **en el mismo instante** que confirmas el pago. No hay ventana de espera, no hay job nocturno, no hay reconciliacion manual posterior:

- El `settlement_leg` se crea con `direction='outgoing'` y `transaction_date` igual al `paid_at` de la orden.
- `account_balances` se rematerializa para esa cuenta y los siguientes dias.
- El modulo Banco (`/finance/bank`) refleja el outflow inmediatamente.
- El workbench de Conciliacion (`/finance/reconciliation`) puede emparejar el movimiento contra el extracto bancario sin pasos intermedios.

Si la orden NO logra cerrar el ciclo (cualquiera de las 5 razones documentadas arriba), el saldo del banco **no se toca** — y el operador ve el banner rojo. No hay falsos positivos en el saldo.

> Detalle tecnico: helpers `materializeAccountBalance` y `ensureSettlementForExpensePayment` en [src/lib/finance/account-balances.ts](../../../src/lib/finance/account-balances.ts) y [src/lib/finance/settlement-legs.ts](../../../src/lib/finance/settlement-legs.ts). Sinergia con conciliacion en [docs/documentation/finance/conciliacion-bancaria.md](./conciliacion-bancaria.md).

## El incidente que motivo el cambio

El **2026-05-01** dos ordenes de pago de nomina del periodo abril 2026 quedaron marcadas como `paid` sin afectar Santander CLP:

- Luis Reyes — $148,312.50 CLP
- Humberly Henriquez — $254,250.00 CLP
- **Total impactado: $402,562.50 CLP**

La cadena de fallas fue: el materializador de nomina cayo en dead-letter por un error de schema (`INSERT has more target columns than expressions`), el operador creo las ordenes sin cuenta origen porque la UI lo permitia, y el resolver downstream skipeaba silenciosamente con `recorded=0 skipped=1` sin emitir error_class. Resultado: tres horas de "pagado" en pantalla con el banco intacto, sin alerta automatica. Lo detecto el usuario al revisar el saldo a mano.

El recovery se ejecuto el 2026-05-02 con el endpoint nuevo de TASK-765: ambas ordenes quedaron con `expense_payment` + `settlement_leg` poblados, Santander CLP rematerializado por 63 dias, y los tres reliability signals volvieron a 0. El incidente cerro 24 horas despues del reporte y disparo la implementacion de las 8 slices que viven en este documento.

> Detalle tecnico: postmortem completo en [ISSUE-063](../../issues/resolved/ISSUE-063-payment-orders-paid-without-bank-impact.md). Recovery script: [scripts/finance/task-765-recover-incident-orders.ts](../../../scripts/finance/task-765-recover-incident-orders.ts). Manual de uso para futuros casos: [docs/manual-de-uso/finance/recuperar-orden-de-pago-zombie.md](../../manual-de-uso/finance/recuperar-orden-de-pago-zombie.md).
