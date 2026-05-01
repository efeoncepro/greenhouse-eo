# ISSUE-062 — Payslip on `payment_paid` no envía mail si receipt ya tenía `status='email_sent'` del modo legacy

> **Status**: resolved
> **Severity**: medium (operational visibility — no data loss; el pago se ejecutó correctamente, solo faltó el email)
> **Detected**: 2026-05-01 (mismo día del rollout)
> **Resolved**: 2026-05-01
> **Environment**: staging (`dev-greenhouse.efeoncepro.com`) + production (mismo binary, comportamiento idéntico)
> **Domain**: `hr.payroll.payslip_delivery`
> **Related**: TASK-759 V1 + V2

## Síntoma

Tesorería marcó como pagada la orden de pago `por-596043bd-1e80-4d9f-a932-515d44750b2e` (Humberly Henriquez, $254,250 CLP, período 2026-04). El evento `finance.payment_order.paid` se publicó al outbox y la projection `payslip_on_payment_paid` se ejecutó "exitosamente" (status=success en `projection_refresh_queue`), pero **el colaborador no recibió el email del recibo de nómina**.

Otros colaboradores ya pagados ese día (e.g. Luis Reyes) habían recibido el mail correctamente porque el e2e test reseteó su `payroll_receipts.status` antes de marcar pagada. Humberly fue el primer caso "real" de la cadena legacy → switch flag → mark-paid sin reset previo.

## Impacto operativo

- **Cero data loss**: el pago se ejecutó correctamente, la orden y obligation pasaron a `paid`, el outbox event se publicó.
- **Pérdida de visibilidad para el colaborador**: el mail con el PDF del recibo no llegó. El operador no se dio cuenta porque la projection retornó `success` (skipped count++).
- **Audit chain intacto**: `payroll_receipts.status='email_sent'` (del legacy export del 17:36) seguía vigente, así que para fines fiscales el colaborador tenía registrado un envío. La pérdida fue del mail nuevo "tu pago se ejecutó".
- **Casos afectados**: 1 colaborador (Humberly) en producción. Recovery realizado vía `/resend-payslips` endpoint canónico.

## Causa raíz

**Desalineación arquitectónica entre el helper V1 y el schema V2**:

1. **Modo `legacy_export`** (default histórico) envía el mail al exportar el período (`payroll_period.exported`) y marca `payroll_receipts.status='email_sent'` como flag GLOBAL por receipt.
2. **Activación del flag `GREENHOUSE_PAYSLIP_DELIVERY_MODE='on_payment_paid'`** introdujo el path nuevo donde el mail se envía cuando se ejecuta el pago.
3. **TASK-759 V2** introdujo `payslip_deliveries` como tabla canónica con UNIQUE partial index granular por `(entry_id, delivery_kind) WHERE superseded_by IS NULL AND status IN ('sent','queued')`. Cada kind es lifecycle-independent.
4. **PERO** el helper `sendPayslipForEntry` seguía usando el chequeo viejo:

```ts
if (existing?.status === 'email_sent' && existing.emailSentAt) {
  return { status: 'skipped_already_sent', ... }
}
```

Este chequeo es **plano y global** — bloquea cualquier envío futuro si CUALQUIER kind previo ya envió un mail. No distingue entre kinds.

**Cadena del bug en Humberly**:
- 17:36 — Legacy export envió mail `period_exported`, set `receipt.status='email_sent'`
- 21:00 — Switch del flag `GREENHOUSE_PAYSLIP_DELIVERY_MODE` a `on_payment_paid` (staging + production + preview-develop en Vercel)
- 21:53 — Tesorería marca orden Humberly como pagada
- 21:55 — Cron Vercel `*/5` ejecuta projection `payslip_on_payment_paid`
- Helper invocado con `trigger='payment_paid'`
- Idempotency check ve `receipt.status='email_sent'` (del legacy) → retorna `skipped_already_sent`
- Projection registra `sent=0 skipped=1 failed=0` y considera success
- **Mail nunca se envía**

## Fix root cause (commit `1d8d4be4`)

Reemplazar el chequeo de idempotency global por el chequeo granular V2:

```ts
const deliveryKindForCheck: PayslipDeliveryKind =
  input.trigger === 'period_exported' ? 'period_exported'
  : input.trigger === 'payment_paid' ? 'payment_paid'
  : 'manual_resend'

if (deliveryKindForCheck !== 'manual_resend') {
  const activeDelivery = await hasActivePayslipDelivery(input.entryId, deliveryKindForCheck)

  if (activeDelivery) {
    return { status: 'skipped_already_sent', ... }
  }
}
```

**Garantías post-fix**:
- Cada `delivery_kind` es lifecycle-independent. Un colaborador puede recibir 1 `period_exported` (legacy) + 1 `payment_paid` (V1) + 1 `payment_committed` (V2-759b) + 1 `payment_cancelled` (V2-759c) — no son duplicados, son comunicaciones distintas en el lifecycle del pago.
- Re-publish del mismo evento sigue siendo idempotent dentro de su kind (el mismo evento NO duplica un mail del mismo kind).
- `manual_resend` siempre envía (intencional — es operativo, no idempotent).
- Schema único como fuente de verdad: la idempotency check usa el mismo predicate que el partial UNIQUE index del schema V2 (`WHERE superseded_by IS NULL AND status IN ('sent','queued')`).

## Recovery operativo

Mediante endpoint canónico `/api/admin/finance/payment-orders/[orderId]/resend-payslips` (capability `finance.payslip.resend`):

```bash
pnpm staging:request POST "/api/admin/finance/payment-orders/por-596043bd-1e80-4d9f-a932-515d44750b2e/resend-payslips" '{}'
```

Retornó `sent=1`, nuevo Resend ID `6d116ed2-c73b-4255-ac0b-94aaa7908eb2`. Mail entregado a `hhumberly@efeoncepro.com` a las 22:07 — confirmado por la operadora.

`payslip_deliveries` audit chain post-recovery (verificado en DB):
```
pdv-backfill-receipt_2026-04_humberly-henriquez_r1-period_exported
  kind=period_exported status=sent sent=2026-05-01 17:36:04
  resend_id=5ef6e6cd-bf6e-4fa8-94ae-032ff1d26a8b

pdv-2026-04_humberly-henriquez-manual_resend-outbox-833a9
  kind=manual_resend status=sent sent=2026-05-01 22:07:36
  resend_id=6d116ed2-c73b-4255-ac0b-94aaa7908eb2
```

## Prevención de regresión

- 300/300 tests `src/lib/finance/payment-obligations` + `src/lib/payroll` pass post-fix.
- `payslip_deliveries` UNIQUE partial index al nivel DB previene duplicados aún si el helper se modifica.
- Sanity check defensivo `if (replacement.obligationId === input.originalObligationId) throw` en `supersedePaymentObligation` previene self-supersede regression (commit `9f945789`).
- Helper canónico `hasActivePayslipDelivery(entryId, kind)` reusado por todas las projections del lifecycle (V1 paid + V2 approved + V2 cancelled).

## Lecciones

- **Schema-helper alignment**: cuando se introduce una tabla canónica nueva (V2 `payslip_deliveries`) con semántica granular, los helpers V1 que mantienen estado paralelo (V1 `payroll_receipts.status`) DEBEN refactorizarse simultáneamente. La coexistencia desalineada introduce bugs sutiles que solo emergen al activar el flag de transición.
- **Feature flag rollout**: cambiar de `legacy_export` a `on_payment_paid` mid-período requiere considerar el state pre-existente de los receipts. Los colaboradores que ya recibieron el mail en modo legacy NO deben recibir un duplicado del MISMO kind, pero SÍ deben recibir el mail de su kind nuevo.
- **Projection success ≠ side-effect success**: la projection puede retornar `success` con `sent=0 skipped=N` y eso es semánticamente distinto a "el colaborador recibió el email". Los signals de reliability futuros (TASK-759f) deben distinguir `payslip_skipped_due_to_idempotency` vs `payslip_actually_sent` para detectar este tipo de issue automáticamente.

## Files touched

- `src/lib/payroll/send-payslip-for-entry.ts` (idempotency check refactor)
- `scripts/diag-humberly.mjs` (diagnostic script)
- `scripts/verify-humberly-fix.mjs` (post-recovery verification)

## Commits

- `1d8d4be4` — fix(finance): payslip idempotency granular por delivery_kind (root cause Humberly bug)
- `9f945789` — fix(finance): supersedePaymentObligation self-supersede bug (related defensive sanity check)
