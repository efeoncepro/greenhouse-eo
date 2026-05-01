# TASK-759f — Payslip Reliability Registry + Sentry Domain

> **Status**: to-do
> **Lifecycle**: to-do
> **Owner**: TBD
> **Created**: 2026-05-01
> **Parent**: TASK-759
> **Dependencies**: TASK-759 V1 + 759b + 759c (full lifecycle data para signals)

## Scope

### 1. Sentry domain `hr.payroll.payslip_delivery`

Reemplazar `Sentry.captureException(err)` por `captureWithDomain(err, 'hr.payroll.payslip_delivery', {...})` en:
- `src/lib/payroll/send-payslip-for-entry.ts`
- `src/lib/sync/projections/payslip-on-payment-paid.ts`
- (V2 expansion) `payslip-on-payment-approved.ts`, `payslip-on-payment-cancelled.ts`, `payslip-on-payment-superseded.ts`

Permite filtros por `domain=hr.payroll.payslip_delivery` en Sentry sin proyecto dedicado.

### 2. Reliability Registry entry

Nueva entry en `src/lib/reliability/registry.ts`:

```ts
{
  moduleId: 'hr.payroll.payslip_delivery',
  moduleLabel: 'Payslip Delivery',
  domain: 'hr',
  incidentDomainTag: 'hr.payroll.payslip_delivery',
  expectedSignalKinds: ['incident', 'last_send_at', 'failure_rate_24h', 'pending_payment_paid_events', 'dead_letter_count'],
  // ...
}
```

### 3. Signals computation

Nuevo helper `src/lib/reliability/payslip-delivery-signals.ts`:

| Signal | Computación |
|---|---|
| `last_send_at` | `MAX(email_sent_at) FROM payroll_receipts WHERE status='email_sent'` |
| `failure_rate_24h` | `COUNT(status='email_failed') / COUNT(*) WHERE created_at > NOW() - 24h` |
| `pending_payment_paid_events` | Eventos `finance.payment_order.paid` con status='pending' del outbox > 5min antiguos |
| `dead_letter_count` | Rows en `projection_refresh_queue` WHERE projection='payslip_on_payment_paid' AND status='dead' |
| `payslips_awaiting_delivery` | `COUNT(*) FROM payroll_receipts WHERE status='generated' AND created_at < NOW() - 1h` (PDF generado pero no enviado por más de 1h) |

### 4. Synthetic monitor diario

Cron `/api/cron/payslip-delivery-synthetic` (CRON_SECRET):
- Verifica que cada `payment_order` con `state='paid' AND paid_at > NOW() - 24h` tiene `payslip_deliveries` con `delivery_kind='payment_paid'` para sus lines `employee_net_pay`
- Si encuentra gap (orden paid pero recibo no enviado): publica evento `reliability.payslip.gap_detected` con detalles
- Si encuentra fail repeat (>3 retries): alerta vía Sentry `level=warning`

### 5. UI surface en Reliability Dashboard

Card "Payslip Delivery Health":
- Verde si `failure_rate_24h < 1%` y `pending_payment_paid_events = 0`
- Amarillo si hay pending events o failure rate 1-5%
- Rojo si `dead_letter_count > 0` o failure rate > 5%

## Estimación

~2h. Reusa la infra de reliability registry + Sentry wrapper canónico ya existente.
