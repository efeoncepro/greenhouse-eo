# TASK-759b — Payslip Payment Committed Promise

> **Status**: to-do
> **Lifecycle**: to-do
> **Owner**: TBD
> **Created**: 2026-05-01
> **Parent**: TASK-759 (V1 entregado en commit a1afdf22 + 5a6c501e)
> **Dependencies**: TASK-759 V1 base (helper, schema, feature flag, projection on_payment_paid)

## Problema

El colaborador hoy se entera de su pago en uno de dos momentos:
- **V1 mode `on_payment_paid`**: cuando recibe el recibo por email (al ejecutarse el pago). No tiene visibilidad antes.
- **V1 mode `legacy_export`**: cuando se exporta el periodo, mucho antes del pago real.

Falta el momento intermedio: **"tu pago está programado y aprobado"**. Ese mensaje reduce ansiedad del colaborador, da fecha esperada de llegada, y separa explícitamente la promesa (committed) de la ejecución (delivered).

## Diseño

**Trigger**: `finance.payment_order.approved` (publicado por `approveOrder` ya existente).
**Mensaje**: "Tu pago de [mes] está programado para [fecha]. Procesador: [Deel/Banco]. Monto neto: [X currency]. Te enviaremos el recibo apenas se ejecute."
**Sin PDF adjunto** — la promesa es informativa, no auditoría.

### Schema delta

```sql
-- Migración aditiva
ALTER TABLE greenhouse_payroll.payroll_receipts
  DROP CONSTRAINT IF EXISTS payroll_receipts_delivery_trigger_check;
ALTER TABLE greenhouse_payroll.payroll_receipts
  ADD CONSTRAINT payroll_receipts_delivery_trigger_check
    CHECK (delivery_trigger IS NULL OR delivery_trigger IN (
      'period_exported','payment_paid','manual_resend','payment_committed'
    ));
```

### Projection nueva

`src/lib/sync/projections/payslip-on-payment-approved.ts`:
- triggerEvents: `['finance.payment_order.approved']`
- Itera lines `employee_net_pay`, resuelve `payrollEntryId`
- Llama nuevo helper `sendPayslipCommittedNotification({entryId, paymentOrderLineId, scheduledFor, processorSlug})`
- NO usa `sendPayslipForEntry` (ese envía PDF + recibo). Usa template separado `payroll_payment_committed`.
- Idempotency: chequea `payroll_receipts.delivery_trigger = 'payment_committed'` para evitar doble envío en re-aprobación.

### Email template nuevo

`payroll_payment_committed`:
- Subject: "Tu pago de [mes] está programado"
- Body: tabla con monto neto, fecha programada, procesador esperado
- CTA: link a `/me/payments` (TASK-759e)
- Tono: cálido, informativo, no técnico

### Idempotency strategy

UNIQUE constraint o partial index nuevo:
```sql
CREATE UNIQUE INDEX payroll_receipts_committed_unique
  ON greenhouse_payroll.payroll_receipts (entry_id, revision)
  WHERE delivery_trigger = 'payment_committed';
```

Esto permite que cada `(entry, revision)` tenga máximo 1 envío de tipo `'committed'` + 1 de `'paid'` + N de `'manual_resend'`.

**Schema gap**: hoy la UNIQUE en `payroll_receipts` es `(entry_id, revision)` — no permite múltiples filas por entry. Para soportar 2 deliveries (committed + paid) por entry sin bloquear la idempotency original, hay 2 opciones:
- **Opción A** (recomendada): nueva tabla `payroll_payslip_deliveries` (FK a receipt) que registra cada envío como row independiente. Receipt sigue siendo "1 PDF por entry+revision" pero hay N deliveries.
- **Opción B**: relajar la UNIQUE actual y agregar (entry_id, revision, delivery_trigger) como compound. Más invasivo.

V2 implementa Opción A — separa el lifecycle del PDF (artefacto) del lifecycle del envío (mensaje).

## Files owned

- `migrations/20XX-task-759b-*.sql` (nueva tabla `payroll_payslip_deliveries` + extension del CHECK)
- `src/lib/payroll/send-payslip-committed.ts` (helper nuevo)
- `src/lib/sync/projections/payslip-on-payment-approved.ts` (nueva)
- `src/lib/email/templates/payroll-payment-committed.ts` (nuevo)
- `src/lib/sync/projections/index.ts` (registrar)

## Estimación

~3-4h. Migración + projection + template + tests.

## Out of scope V2

- Compensación (cancelled/revised) — TASK-759c
- UI per-collaborator view — TASK-759e
- Manual resend del committed message — usar el endpoint manual existente con `trigger='manual_resend'` (V2 puede agregar `?kind=committed` para no enviar el PDF)
