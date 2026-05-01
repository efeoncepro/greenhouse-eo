# TASK-759c — Payslip Cancellation & Revision Compensation

> **Status**: to-do
> **Lifecycle**: to-do
> **Owner**: TBD
> **Created**: 2026-05-01
> **Parent**: TASK-759
> **Dependencies**: TASK-759 V1 + TASK-759b (committed promise)

## Problema

Si una payment_order se cancela o se reemplaza (supersede) post-aprobación pero pre-pago, el colaborador puede haber recibido la notificación de "promesa" (TASK-759b) pero ahora la promesa está rota. Sin compensación, el colaborador no se entera y queda esperando un pago que nunca llega o que llega corregido sin explicación.

## Diseño

### Triggers
- `finance.payment_order.cancelled` → mensaje de cancelación
- `finance.payment_order.superseded` → mensaje de revisión

### Mensajes

**Cancelled** (sin alarma, sin PDF):
> Subject: "Actualización sobre tu pago de [mes]"
> Body: "Detectamos un problema con el pago programado de [monto]. Lo estamos resolviendo y te contactaremos antes de [fecha+2d]. Disculpa el inconveniente."

**Superseded** (sin alarma, sin PDF):
> Subject: "Tu pago de [mes] fue actualizado"
> Body: "El monto correcto es [Y currency] (antes [X]). Te enviaremos el recibo final apenas se ejecute el pago corregido."

### Schema delta

Extender CHECK constraint:
```sql
ALTER TABLE greenhouse_payroll.payslip_deliveries
  ADD CONSTRAINT payslip_deliveries_kind_check
    CHECK (delivery_kind IN ('payment_committed','payment_paid','payment_revised','payment_cancelled','manual_resend','period_exported'));
```

### Bloqueo crítico (anti-rotura financiera)

NO enviar `cancelled` ni `revised` si ya existe un delivery con `delivery_kind='payment_paid'` para esta entry+revision. El dinero ya salió — no se "des-paga" desde el lifecycle de mensajes. Eso requiere reliquidation_delta separada (TASK-755 V2).

### Projections nuevas

`src/lib/sync/projections/payslip-on-payment-cancelled.ts`
`src/lib/sync/projections/payslip-on-payment-superseded.ts`

Ambas:
- Iteran lines `employee_net_pay`
- Resuelven `payrollEntryId`
- Verifican guard "ya pagado" → si sí, skip silencioso (warn log)
- Llaman helpers nuevos `sendPayslipCancelled` / `sendPayslipRevised`
- Marcan delivery row con kind correspondiente

### UX consideration

NO escalar emocionalmente. La cancelación de una orden suele ser un error operativo del operator (monto mal, beneficiario mal, fecha mal) — no es una crisis del colaborador. Tono: calmado, profesional, brief.

## Estimación

~2-3h. Reusa la infra de envío. Solo agrega templates + projections + guard de "ya pagado".
