# TASK-750 — Payment Orders, Batches, Payment Calendar + Maker-Checker Runtime

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `V1 entregado 2026-05-01 (schema + helpers + API + UI + permisos + docs)`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-748`, `TASK-749`
- Branch: `task/TASK-750-payment-orders-calendar-maker-checker`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea el runtime operativo de órdenes de pago, batches aprobables y calendario de pagos. Convierte obligations en payment orders, permite agrupar líneas, calendarizar vencimientos/envíos, aprobarlas con maker-checker, generar archivos/evidencia y preparar el registro de pagos reales.

## Why This Task Exists

Finance necesita una capa entre obligación y pago real. Sin órdenes, el operador sigue registrando pagos sueltos y la nómina multi-instrumento no puede planificarse, aprobarse ni auditarse de forma robusta.

## Goal

- Crear `payment_orders` y `payment_order_lines`.
- Soportar batches por período, beneficiario, processor o instrumento.
- Exponer `Payment Calendar` para obligaciones, órdenes programadas, envíos pendientes y pagos por conciliar.
- Agregar maker-checker y audit trail.
- Generar artifacts de pago con hash y control de descarga.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- Quien crea una orden no puede aprobarla si maker-checker está activo.
- Orden aprobada no muta líneas; cambios crean nueva versión o cancelación + nueva orden.
- Cambiar fecha de ejecución desde calendario pasa por permisos de la orden.
- Descarga/envío de batch queda auditado.
- No se registra `expense_payment` como pagado sin evidencia de ejecución o acción explícita.

## Dependencies & Impact

### Depends on

- `TASK-748`
- `TASK-749`
- `greenhouse_finance.expense_payments`
- `greenhouse_finance.settlement_groups`
- `greenhouse_finance.settlement_legs`

### Blocks / Impacts

- Bloquea `TASK-751`.
- Impacta Finance Payments, Bank, Reconciliation y manuales de pagos.

### Files owned

- `migrations/<timestamp>_task-750-payment-orders.sql`
- `src/lib/finance/payment-orders/`
- `src/lib/finance/payment-calendar/`
- `src/app/api/finance/payment-orders/**`
- `src/app/api/finance/payment-calendar/**`
- `src/views/greenhouse/finance/payment-orders/**`
- `src/views/greenhouse/finance/payment-calendar/**`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/documentation/finance/calendario-de-pagos.md`
- `docs/manual-de-uso/finance/ordenes-de-pago.md`
- `docs/manual-de-uso/finance/calendario-de-pagos.md`

## Current Repo State

### Already exists

- `recordExpensePayment` registra pago real y settlement.
- Reconciliation opera contra payments y settlement legs.

### Gap

- No existe orden previa al payment.
- No hay batch ni archivo de pago.
- No hay maker-checker de pago.
- No hay UI de cola de pagos.

## Scope

### Slice 1 — Schema orders

- Crear `payment_orders`.
- Crear `payment_order_lines`.
- Crear `payment_order_artifacts` para archivos/hash/evidencia.
- Estados: `draft`, `pending_approval`, `approved`, `scheduled`, `submitted`, `settled`, `closed`, `failed`, `cancelled`.

### Slice 2 — Runtime

- `createPaymentOrderFromObligations`.
- `approvePaymentOrder`.
- `schedulePaymentOrder`.
- `cancelPaymentOrder`.
- `recordOrderSubmission`.
- Idempotency keys por order/submission/provider reference.

### Slice 3 — UI

- Vista Finance > Órdenes de Pago.
- Vista Finance > Calendario de Pagos.
- Detail con líneas, beneficiary snapshot, route, approvals, artifacts.
- Acciones: aprobar, cancelar, marcar enviado, registrar pago.
- Calendario/lista por due date, scheduled date, submission due, awaiting confirmation, awaiting reconciliation y overdue.

### Slice 4 — Payment calendar reader

- Reader `listPaymentCalendarItems`.
- Filtros por `space_id`, rango de fechas, moneda, instrumento, processor, source domain, beneficiary y status.
- Estados calendarizables: `due`, `ready_to_schedule`, `scheduled`, `submission_due`, `awaiting_confirmation`, `awaiting_reconciliation`, `overdue`, `closed`.
- El reader no recalcula montos; solo compone obligations, orders, payments y settlement states.

### Slice 5 — Events

- `finance.payment_order.created`
- `finance.payment_order.approved`
- `finance.payment_order.submitted`
- `finance.payment_order.failed`
- `finance.payment_order.settled`
- `finance.payment_order.cancelled`
- `finance.payment_order.closed`

## Out of Scope

- Integraciones API directas con bancos/proveedores.
- Automatizar payout externo.
- Payroll-specific orchestration completa; eso queda en `TASK-751`.

## Acceptance Criteria

- [ ] Payment orders y lines existen con constraints.
- [ ] Una obligation puede convertirse en order line sin duplicarse.
- [ ] Payment Calendar lista obligaciones y órdenes por fecha/estado sin mutar montos.
- [ ] Maker-checker bloquea self-approval cuando corresponde.
- [ ] Artifacts de batch tienen hash y audit de descarga.
- [ ] Registrar pago desde order usa `recordExpensePayment` y settlement actual.

## Verification

- `pnpm vitest run src/lib/finance/payment-orders src/lib/finance/payment-calendar`
- `pnpm exec eslint src/lib/finance/payment-orders src/lib/finance/payment-calendar src/app/api/finance/payment-orders src/app/api/finance/payment-calendar`
- `pnpm build`
- `pnpm pg:connect:migrate`
- Smoke manual o Playwright de crear/aprobar order.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [ ] el archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible.
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas.
