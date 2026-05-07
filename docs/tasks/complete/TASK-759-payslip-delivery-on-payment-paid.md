# TASK-759 — Payslip Delivery On Payment Paid (split lifecycle)

> **Status**: complete (closed 2026-05-05)
> **Lifecycle**: complete (V1 ejecución path shipped — 4 delivery_kinds activos: period_exported, payment_paid, payment_cancelled, manual_resend. Mode 'both' en producción. Verificado hoy con Melkin payment paid + email template v4. Children 759b/c/d/f son V2 follow-ups separados)
> **Owner**: Julio Reyes
> **Created**: 2026-05-01
> **Dependencies**: TASK-748 (Payment Obligations), TASK-750 (Payment Orders), TASK-751 (Payroll Settlement Wiring)
> **Spec canónica**: este documento + `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

## Problema raíz

El recibo de nómina se envía hoy en `payroll_period.exported` (cierre interno de Payroll) — **antes** de que Tesorería pague la orden. El colaborador recibe un PDF que dice "te pagamos X" mientras el dinero todavía no salió. Si Tesorería se atrasa 2-3 días, la promesa queda rota.

## Decisión arquitectónica

**Separar 3 conceptos**:

1. **Cálculo** (`payroll_period.exported`): genera PDF en bucket. **No envía email**.
2. **Promesa** (`finance.payment_order.approved`): email "tu pago está programado para X". (V2)
3. **Ejecución** (`finance.payment_order.paid`): email final con PDF + comprobante de pago. (V1 alcance)

V1 implementa el path de ejecución. V2 agrega la promesa y la compensación (`payment_order.cancelled`).

## Invariantes duros (anti-rotura)

- **NO** romper el flujo legacy. Default flag = comportamiento de hoy.
- **NO** re-enviar recibos para periodos ya enviados (UNIQUE + check status='email_sent').
- **NO** enviar 2 veces si los 3 modos coexisten — la idempotency natural por `(entry_id, revision, delivery_kind)` es la verdad.
- **NO** depender de filesystem para PDFs — siempre lectura desde bucket.
- **NO** publicar mensajes vacíos al colaborador si Resend falla — degradar a `email_failed` y queue para retry vía reactive consumer.

## Diseño técnico V1

### Schema (migration nueva, additiva)

```sql
-- payroll_receipts: trazar qué evento disparó cada envío + link a payment line
ALTER TABLE greenhouse_payroll.payroll_receipts
  ADD COLUMN delivery_trigger TEXT,
  ADD COLUMN payment_order_line_id TEXT REFERENCES greenhouse_finance.payment_order_lines(line_id) ON DELETE SET NULL,
  ADD CONSTRAINT payroll_receipts_delivery_trigger_check
    CHECK (delivery_trigger IS NULL OR delivery_trigger IN ('period_exported','payment_paid','manual_resend'));

-- backfill rows ya enviadas
UPDATE greenhouse_payroll.payroll_receipts
   SET delivery_trigger = 'period_exported'
 WHERE email_sent_at IS NOT NULL AND delivery_trigger IS NULL;

CREATE INDEX payroll_receipts_payment_order_line_idx
  ON greenhouse_payroll.payroll_receipts (payment_order_line_id) WHERE payment_order_line_id IS NOT NULL;
```

### Feature flag

`GREENHOUSE_PAYSLIP_DELIVERY_MODE` env var con valores:

- `'legacy_export'` (default): comportamiento actual — email en `payroll_period.exported`.
- `'on_payment_paid'`: V1 nuevo — export solo genera PDFs, email al `finance.payment_order.paid`.
- `'both'` (transición): ambos triggers fire; idempotency previene duplicados.

### Helper canónico

`src/lib/payroll/send-payslip-for-entry.ts`:

```ts
export async function sendPayslipForEntry(input: {
  entryId: string
  trigger: 'period_exported' | 'payment_paid' | 'manual_resend'
  paymentOrderLineId?: string | null
  actorEmail?: string | null
}): Promise<{ status: 'sent' | 'skipped' | 'failed' | 'no_email'; receiptId: string | null }>
```

Refactor mínimo de `generate-payroll-receipts.ts`: extraer la lógica per-entry a este helper. Reusable desde:
- `payrollReceiptsProjection` (legacy, periodo completo)
- Nueva `payslipOnPaymentPaidProjection` (per-line)
- Endpoint manual resend (futuro)

Idempotency: chequea `payroll_receipts` por `(entry_id, revision)` y skip si `status='email_sent'`.

### Nueva projection

`src/lib/sync/projections/payslip-on-payment-paid.ts`:

```ts
export const payslipOnPaymentPaidProjection: ProjectionDefinition = {
  name: 'payslip_on_payment_paid',
  description: 'Envía recibo de nómina al colaborador cuando la orden de pago se marca pagada',
  domain: 'notifications',
  triggerEvents: ['finance.payment_order.paid'],

  extractScope: (payload) => {
    const orderId = typeof payload.orderId === 'string' ? payload.orderId : null
    if (!orderId) return null
    return { entityType: 'payment_order', entityId: orderId }
  },

  refresh: async (scope, payload) => {
    if (process.env.GREENHOUSE_PAYSLIP_DELIVERY_MODE === 'legacy_export') {
      return null  // skip — legacy mode does the sending on export
    }

    // 1) Resolver lines de la orden con obligation_kind='employee_net_pay' y source_kind='payroll'
    // 2) Para cada line: extraer payrollEntryId del obligation.metadata.payrollEntryId
    // 3) Llamar sendPayslipForEntry({entryId, trigger:'payment_paid', paymentOrderLineId})
    // 4) Reportar count
  },

  maxRetries: 2
}
```

### Modificación al projection actual

`payrollReceiptsProjection` (`src/lib/sync/projections/payroll-receipts.ts`):

- Si `GREENHOUSE_PAYSLIP_DELIVERY_MODE === 'on_payment_paid'`: llama `generatePayrollReceiptsForPeriod({sendEmails: false})` — solo genera PDFs.
- Si `'both'` o `'legacy_export'` (default): comportamiento actual con `sendEmails: true`.
- Marcar `delivery_trigger='period_exported'` en el upsert cuando email se envía desde este path.

## Plan de rollout

| Fase | Flag | Behavior |
|---|---|---|
| Pre-merge | n/a | Migration + helpers + projection registered, default `legacy_export` |
| Hoy → semanas | `legacy_export` | Comportamiento actual. Cero cambio de UX. |
| Test interno | `both` (Efeonce) | Verificar idempotency. Email solo se envía una vez por entry. |
| GA | `on_payment_paid` | Email al pagar. Export genera PDF. |
| Rollback | flip a `legacy_export` | 1min, sin redeploy de código |

## Tests

- Unit: `sendPayslipForEntry` — idempotency check (entry+revision → status='email_sent' → skip).
- Unit: projection `payslip_on_payment_paid` — extractScope + refresh.
- Integration: simular `finance.payment_order.paid` event con 2 lines (1 net_pay + 1 social_security) → solo 1 email enviado.
- Migration: aplica con cero downtime, backfill correcto.

## Out of scope V1

- Promesa pre-pago (`payment_order.approved` → "tu pago programado") — TASK-759b
- Compensación (`payment_order.cancelled` → "actualización") — TASK-759c
- UI drawer "Comunicaciones al colaborador" — TASK-759d
- Mi Greenhouse "Mis pagos" view — overlap con TASK-757

## Files owned

- `migrations/2026*-task-759-payslip-delivery-trigger.sql` (nueva)
- `src/lib/payroll/send-payslip-for-entry.ts` (nueva)
- `src/lib/payroll/generate-payroll-receipts.ts` (modificada: extract helper)
- `src/lib/payroll/payroll-receipts-store.ts` (modificada: campos nuevos)
- `src/lib/sync/projections/payroll-receipts.ts` (modificada: respect flag)
- `src/lib/sync/projections/payslip-on-payment-paid.ts` (nueva)
- `src/lib/sync/projection-registry-defaults.ts` (registrar)

## Dependencies & Impact

- **Depende de**: TASK-751 (payment_order_lines linked a obligations), TASK-748 (obligation.metadata.payrollEntryId)
- **Impacta a**: TASK-756 (auto-orders from payroll) — cuando se complete, dispara el flujo end-to-end. TASK-757 (processor sync) — el comprobante real del banco enriquece el email final.
- **No rompe**: flujo actual de envío al exportar (default flag preserva).
