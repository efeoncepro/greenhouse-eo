# TASK-759e — Extender `/my/payroll` con estado de pago + delivery timeline

> **Status**: to-do
> **Lifecycle**: to-do
> **Owner**: TBD
> **Created**: 2026-05-01
> **Parent**: TASK-759
> **Dependencies**: TASK-759 V1 + 759b + 759c (delivery timeline data)
> **Related**: TASK-757 (processor sync) — comprobante real para attachments

## NO crear `/me/payments` — extender lo existente

Ya existe `/my/payroll` ([MyPayrollView.tsx](src/views/greenhouse/my/MyPayrollView.tsx)):
- ViewCode `mi_ficha.mi_nomina` registrado en `view-access-catalog.ts`
- Endpoint `/api/my/payroll` GET
- Endpoint `/api/my/payroll/entries/[entryId]/receipt` para descargar PDF
- Item de menú vertical "Mi Nómina" con icon `tabler-receipt`
- Links desde `PayrollReceiptEmail.tsx` y `PayrollLiquidacionV2Email.tsx` apuntan a `${APP_URL}/my/payroll`

**Sinergia**: extender esa surface con la info de payment lifecycle. NO crear ruta paralela.

## Gaps identificados en lo actual

La columna "Estado" hoy muestra `payroll_period.status` (`exported`/`approved`) — eso es estado del **cálculo interno**, no del **pago real al colaborador**. El colaborador necesita saber:

1. ¿Cuándo me pagan? (fecha programada)
2. ¿Por qué medio? (Deel / Banco / Global66)
3. ¿Ya me pagaron? (paid_at + monto recibido)
4. ¿Me llegó el recibo? (delivery timeline)
5. Si hubo problema, ¿qué pasó? (cancelled/revised explicado)

## Cambios

### Endpoint `/api/my/payroll` — extender DTO

Agregar al response per entry:
```ts
interface PayrollEntryWithPaymentStatus {
  // existente
  entryId, periodId, year, month, currency, grossTotal, netTotal,
  status,  // status del periodo (renombrar a periodStatus para claridad)

  // NUEVO TASK-759e
  paymentStatus: 'no_obligation' | 'awaiting_order' | 'order_pending' | 'order_scheduled' | 'order_paid' | 'reconciled' | 'cancelled'
  paymentOrder: {
    orderId: string
    title: string
    processorSlug: string | null  // 'deel', 'bank_internal', 'global66'
    scheduledFor: string | null
    paidAt: string | null
    externalReference: string | null  // wire confirmation, Deel payout id
  } | null
  payslipDelivery: {
    status: 'generated' | 'email_sent' | 'email_failed' | 'generation_failed'
    deliveryTrigger: 'period_exported' | 'payment_paid' | 'manual_resend' | 'payment_committed' | null
    emailSentAt: string | null
    timeline: Array<{ kind: string; sentAt: string; status: string }>  // de payslip_deliveries (V2 base)
  } | null
}
```

Reusar [`getPayrollPaymentStatusForPeriod`](src/lib/finance/payment-orders/payroll-status-reader.ts) — ya existe y compone el state machine.

### MyPayrollView UI — agregar 3 columnas en la tabla history

Hoy: `Período | Bruto | Neto | Estado | Recibo`
Después: `Período | Bruto | Neto | Estado pago | Procesador | Fecha pago | Recibo`

- **Estado pago** = chip con `paymentStatus` traducido a etiqueta humana ("Programado", "Pagado", "Cancelado")
- **Procesador** = chip con `processorSlug` ("Deel", "Banco", "—")
- **Fecha pago** = `paidAt` formateado, fallback `scheduledFor` con prefijo "Programado: "

### Latest period card — agregar mini-timeline

En el card "Último período" agregar una mini-timeline de delivery:
```
[✓] Cálculo aprobado · 1 may
[✓] Orden creada · 1 may  
[⏱] Pago programado · 5 may
[ ] Pago ejecutado · pendiente
[ ] Recibo enviado · pendiente
```

### Drawer detail per row

Click en row del history → drawer con timeline COMPLETO:
- Info del pago (monto, processor, fecha programada/recibida)
- External reference (wire ID, Deel payout ID) — copyable
- Comprobante de transferencia descargable (cuando exista — TASK-757)
- Lista cronológica de TODAS las comunicaciones recibidas (committed/paid/cancelled mails con timestamps + Resend message ids)
- Botón "Reenviar recibo a mi email" (rate-limited 1x por hora, audit-logged)

### Permisos y seguridad

- Sin cambios en viewCode `mi_ficha.mi_nomina` ya existente
- Endpoint `/api/my/payroll` continúa filtrando estricto por `member_id = session.member_id`
- "Reenviar recibo" usa el endpoint canónico `/api/admin/finance/payment-orders/[orderId]/resend-payslips` con un wrapper específico de self-service (no admin context — capability `personal_workspace.payslip.resend_self`).

### Email integration

Templates `PayrollReceiptEmail.tsx` ya apuntan a `/my/payroll`. Solo asegurarse que:
- El subject del committed mail (TASK-759b) tiene CTA "Ver mi nómina" → `/my/payroll`
- El subject del cancelled mail (TASK-759c) ídem

## Out of scope

- Edit/cancel del propio pago — operativo (Tesorería)
- Disputa formal del monto — V3 workflow
- Notificación push / SMS — TASK-023 (notification system)

## Estimación

~2h. Reusa:
- `MyPayrollView` existente (extender, no crear)
- `getPayrollPaymentStatusForPeriod` ya construido
- ViewCode + menu item ya registrados
- Endpoint base `/api/my/payroll` (extender DTO)

Solo agregar: 3 columnas + drawer detail + mini-timeline en latest card.
