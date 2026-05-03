# Recuperar una orden de pago zombie — Manual de uso

> **Tipo de documento:** Manual de uso paso a paso
> **Version:** 1.0
> **Creado:** 2026-05-02 por Julio Reyes (con asistencia Claude Opus 4.7)

## Para que sirve

Reparar ordenes de pago que quedaron en estado **Pagada** pero sin el chain
financiero downstream completo (sin `expense_payment` ni `settlement_leg`).
Estas ordenes se llaman **zombie**: el dinero ya salio del banco real, pero
el portal no lo refleja en saldos, conciliacion ni reporting de gasto.

El flujo de recovery:

- materializa los expenses faltantes si aplica,
- corrige la cuenta bancaria origen de la orden,
- crea el `expense_payment` y `settlement_leg` por cada line,
- republica el evento de outbox para que consumers downstream
  (notificaciones de payslip, etc.) reciban la senal,
- rematerializa los saldos diarios de la cuenta para que el banco refleje
  el outflow.

Es **idempotente**: re-llamar sobre una orden ya recuperada no la modifica.

## Antes de empezar

Necesitas:

- Rol **FINANCE_ADMIN** o **EFEONCE_ADMIN**.
- Capability `finance.payment_orders.recover`.
- Saber el **`orderId`** de la orden afectada (formato `por-...`).
- Saber la **cuenta bancaria origen real** desde donde se transfirio el
  dinero (e.g. `santander-clp`, `bci-clp`). Esta info viene del extracto
  bancario o del operador que ejecuto la transferencia. La cuenta debe
  estar activa en `Finanzas > Banco`.
- La orden debe estar en estado `paid` (Pagada). El recovery no aplica a
  ordenes en otros estados.

## Como identificar una orden zombie

Hay dos puntos de entrada:

1. **Banner rojo en el detail drawer**. Entra a
   `Finanzas > Tesoreria > Ordenes de pago`, abre la orden y veras un
   `Alert` rojo "Settlement bloqueado" con la razon especifica + CTA
   **Recuperar orden**. El banner solo aparece para ordenes con un evento
   `finance.payment_order.settlement_blocked` reciente sin resolver.
2. **Signal en operations dashboard**. En `/admin/operations` busca el
   subsystem **Finance Data Quality**. Si el signal
   `paid_orders_without_expense_payment` esta en `> 0`, hay ordenes zombie
   pendientes. Click en el signal te lleva a la lista filtrada.

## Paso a paso

1. Ubica la orden zombie via banner o dashboard. Anota el `orderId`.
2. Abre el **drawer detalle** de la orden afectada.
3. Verifica que el banner rojo "Settlement bloqueado" esta visible y lee
   la razon especifica (ver seccion siguiente).
4. Click en **Recuperar orden**.
5. En el dialog que aparece:
   - Confirma o ingresa la **cuenta bancaria origen** (debe coincidir con
     la moneda de la orden — no puedes recuperar una orden CLP con una
     cuenta USD).
   - Si quieres simular sin escribir, marca **dryRun**: el sistema te
     mostrara el plan (lines a wire, fecha de rematerializacion) sin
     ejecutar nada.
6. Click en **Confirmar recovery**.
7. El sistema ejecuta atomicamente:
   - materializa expenses faltantes para los `(period_id, member_id)` de
     las lines pendientes (si la nomina no estaba materializada),
   - hace `UPDATE source_account_id` en la orden,
   - inserta una fila de audit log con `reason='recovery_TASK-765'`,
   - crea el `expense_payment` + `settlement_leg` por cada line,
   - republica el evento outbox `finance.payment_order.paid` con
     `replay: true`,
   - rematerializa `account_balances` desde la fecha del `paid_at`
     original.
8. La respuesta del endpoint te confirma:
   - `recovered: true`,
   - cantidad de `expensePaymentIds` y `settlementGroupIds` creados,
   - `rematerializedDays` (cuantos dias de saldo se recalcularon).
9. **Verifica en pantalla**:
   - El banner rojo desaparece del drawer.
   - En `Finanzas > Banco`, abre la cuenta origen y confirma que el
     outflow del monto recuperado aparece en la fecha correspondiente.
   - En `Finanzas > Conciliacion`, la transaccion ya tiene
     `settlement_leg` y se puede emparejar contra extracto bancario.

## Que significan los estados o senales (5 razones del banner)

El banner rojo trae una razon estructurada. Cada una indica una causa raiz
distinta:

| reason | Que significa | Que hacer |
|---|---|---|
| `expense_unresolved` | El resolver no encontro el `expense` de payroll para `(period_id, member_id)`. La nomina del periodo no fue exportada o no esta materializada. | Antes de recuperar, ejecuta el rematerializador de payroll para ese periodo. Ver "Problemas comunes". |
| `account_missing` | La orden quedo en `paid` sin `source_account_id`. Falta declarar la cuenta bancaria origen. | Ingresa la cuenta correcta en el dialog de recovery. |
| `cutover_violation` | Una CHECK constraint financiera bloqueo el insert (e.g. cuenta sin OTB declarado, fecha pre-genesis). | Contacta a `efeonce_admin`. Probablemente requiere ajustar el OTB de la cuenta antes de reintentar. |
| `materializer_dead_letter` | El materializer reactivo de payroll esta en dead-letter para ese periodo. Hay un bug upstream. | Contacta a `efeonce_admin`. Hay que destrabar el dead-letter en `projection_refresh_queue` antes de recuperar. |
| `out_of_scope_v1` | La obligacion no es del tipo `payroll/employee_net_pay`. Recovery V1 solo cubre nomina de empleados. | No reintentar. Levantar TASK derivada para extender V2 al tipo de obligacion afectada (`employer_social_security`, `processor_fee`, etc.). |

## Que NO hacer

- **NO** elimines la orden directamente desde la base de datos. Rompe el
  audit log y el chain financiero.
- **NO** crees un `expense_payment` manual con SQL ni con un formulario
  paralelo. El endpoint canonico es la unica via que mantiene
  idempotencia, audit y outbox replay coherentes.
- **NO** ejecutes el script
  `scripts/finance/task-765-recover-incident-orders.ts` para ordenes
  nuevas. Ese script tiene los 2 `orderId` del incidente original
  hardcoded (`por-66563173-...` Luis Reyes + `por-596043bd-...` Humberly
  Henriquez) — para cualquier orden distinta, usa el endpoint via UI.
- **NO** hagas `UPDATE source_account_id` directo en SQL. El endpoint
  garantiza que se cree el `expense_payment` + `settlement_leg` en la
  misma transaccion. Saltar el endpoint vuelve a dejar la orden zombie.
- **NO** uses una cuenta de moneda distinta a la de la orden. El endpoint
  rechaza el request con `validation_error`.

## Problemas comunes

- **El banner sigue rojo despues del recovery.**
  Ejecuta `pnpm finance:rematerialize-balances --account <accountId>` y
  refresca la pagina. Si persiste, revisa que el evento outbox se publico
  consultando `greenhouse_sync.outbox_events` por `aggregate_id =
  <orderId>` con `event_type = 'finance.payment_order.paid'` y
  `replay: true`.
- **Recibo un 422 con `code: 'expense_unresolved'`.**
  La nomina del periodo no esta materializada en `expenses`. Primero
  llama al rematerializador de payroll:
  `POST /api/admin/finance/payroll-expense-rematerialize` con
  `{ "periodId": "..." }`. Una vez completo, reintenta el recovery.
- **Recibo un 422 con `code: 'invalid_state_transition'`.**
  La orden no esta en `state='paid'`. El recovery solo aplica a ordenes
  pagadas-zombie. Si la orden esta en `failed` o `cancelled`, este flujo
  no es la solucion.
- **El `dryRun` me muestra `linesToWire: 0`.**
  La orden ya fue recuperada antes (idempotencia). El endpoint devuelve
  `alreadyRecovered: true`. No hay que hacer nada.
- **403 al hacer click en "Recuperar orden".**
  Te falta la capability `finance.payment_orders.recover`. Pidele a un
  admin que la asigne a tu rol.
- **El saldo del banco no refleja el outflow tras el recovery.**
  El step de rematerializacion de `account_balances` corre off-tx y puede
  fallar silenciosamente (queda capturado en Sentry). Re-ejecuta
  `pnpm finance:rematerialize-balances --account <accountId>` apuntando
  a la cuenta origen.

## Referencias tecnicas

- Endpoint: `src/app/api/admin/finance/payment-orders/[orderId]/recover/route.ts`
- UI banner + CTA: `src/views/greenhouse/finance/payment-orders/OrderDetailDrawer.tsx`
- Errores tipados: `src/lib/finance/payment-orders/errors.ts`
- Audit log: `src/lib/finance/payment-orders/state-transitions-audit.ts`
- Materializer payroll: `src/lib/finance/payroll-expense-reactive.ts`
- Reliability signals (`paid_orders_without_expense_payment`,
  `payment_orders_dead_letter`, `payroll_expense_materialization_lag`):
  `src/lib/reliability/registry.ts`
- Spec canonica: `docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md`
  (Slice 7 banner + Slice 8 endpoint).
- Arquitectura financiera: `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`.
- Reliability Control Plane: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`.
- Manual relacionado: `docs/manual-de-uso/finance/ordenes-de-pago.md` (flujo
  normal de creacion / aprobacion / pago).
