import 'server-only'

import { getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import {
  buildPayslipDeliveryId,
  hasActivePayslipDelivery,
  recordPayslipDelivery,
  supersedePayslipDeliveries,
  type PayslipDeliveryKind
} from '@/lib/payroll/payslip-deliveries-store'
import { getPayrollReceiptByEntryId } from '@/lib/payroll/payroll-receipts-store'
import { sendEmail } from '@/lib/email/delivery'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-759 V2 — Lifecycle notifications (committed promise, cancelled).
 *
 * Estos envíos NO incluyen PDF (la promesa es informativa, la cancelación no
 * tiene recibo formal). El PDF sigue mandándose en `payment_paid` via el
 * helper canónico `sendPayslipForEntry`.
 *
 * Idempotency: chequea `hasActivePayslipDelivery(entryId, kind)`. Si ya hay
 * delivery activa (status sent/queued, no superseded), skip silencioso.
 *
 * Anti-rotura: NUNCA envía cancelled si ya hay delivery 'payment_paid' activa.
 * Eso requiere reliquidation_delta separada (TASK-755 V2).
 */

export interface SendPayslipCommittedInput {
  entryId: string
  paymentOrderId: string
  paymentOrderLineId: string
  scheduledFor: string | null
  processorSlug: string | null
  sourceEventId: string | null
  triggeredByUserId?: string | null
}

export interface SendPayslipCancelledInput {
  entryId: string
  paymentOrderId: string
  paymentOrderLineId: string | null
  cancellationReason: string | null
  sourceEventId: string | null
  triggeredByUserId?: string | null
}

export type LifecycleSendResult =
  | { status: 'sent'; deliveryId: string; resendId: string | null }
  | { status: 'skipped_already_sent'; deliveryId: string }
  | { status: 'skipped_blocked_by_paid'; reason: string }
  | { status: 'skipped_no_email' }
  | { status: 'failed'; error: string }

const PROCESSOR_LABELS: Record<string, string> = {
  deel: 'Deel (USD)',
  bank_internal: 'Banco interno',
  global66: 'Global66',
  wise: 'Wise',
  paypal: 'PayPal',
  manual_cash: 'Pago manual',
  sii_pec: 'SII PEC'
}

const labelForProcessor = (slug: string | null): string | null => {
  if (!slug) return null

  return PROCESSOR_LABELS[slug] ?? slug
}

export async function sendPayslipCommittedNotification(
  input: SendPayslipCommittedInput
): Promise<LifecycleSendResult> {
  const KIND: PayslipDeliveryKind = 'payment_committed'

  try {
    // Idempotency: ya enviado.
    const existing = await hasActivePayslipDelivery(input.entryId, KIND)

    if (existing) {
      return { status: 'skipped_already_sent', deliveryId: existing.deliveryId }
    }

    // Resolver entry + period.
    const entry = await getPayrollEntryById(input.entryId)

    if (!entry) return { status: 'failed', error: `entry ${input.entryId} not found` }

    const period = await getPayrollPeriod(entry.periodId)

    if (!period) return { status: 'failed', error: `period ${entry.periodId} not found` }

    if (!entry.memberEmail) return { status: 'skipped_no_email' }

    // El receipt PDF puede o no existir todavía. Para 'committed' no se requiere.
    // Pero queremos el receiptId para audit. Si no existe, esperamos a payment_paid.
    const receipt = await getPayrollReceiptByEntryId(input.entryId)

    if (!receipt) {
      // Sin receipt aún — significa que payroll_period.exported no corrió o falló.
      // No bloqueante para committed — pero no podemos linkar al receipt.
      // Saltamos por ahora; la projection puede reintentarlo en próximo refresh.
      return { status: 'failed', error: 'no payroll_receipt yet for entry; will retry' }
    }

    const deliveryId = buildPayslipDeliveryId(input.entryId, KIND, input.sourceEventId ?? undefined)

    const sendResult = await sendEmail({
      emailType: 'payroll_payment_committed',
      domain: 'payroll',
      recipients: [{
        userId: entry.memberId,
        email: entry.memberEmail,
        name: entry.memberName
      }],
      context: {
        fullName: entry.memberName,
        periodYear: period.year,
        periodMonth: period.month,
        entryCurrency: entry.currency === 'USD' ? 'USD' : 'CLP',
        netTotal: entry.netTotal,
        payRegime: entry.payRegime,
        scheduledFor: input.scheduledFor,
        processorLabel: labelForProcessor(input.processorSlug)
      },
      sourceEntity: input.paymentOrderId,
      actorEmail: input.triggeredByUserId ?? undefined
    })

    if (sendResult?.status === 'sent') {
      await recordPayslipDelivery({
        deliveryId,
        receiptId: receipt.receiptId,
        entryId: input.entryId,
        memberId: entry.memberId,
        periodId: entry.periodId,
        deliveryKind: KIND,
        paymentOrderId: input.paymentOrderId,
        paymentOrderLineId: input.paymentOrderLineId,
        sourceEventId: input.sourceEventId,
        triggeredByUserId: input.triggeredByUserId ?? null,
        status: 'sent',
        emailRecipient: entry.memberEmail,
        emailProviderId: sendResult.resendId,
        sentAt: new Date().toISOString(),
        metadata: {
          scheduledFor: input.scheduledFor,
          processorSlug: input.processorSlug,
          netTotal: entry.netTotal,
          currency: entry.currency
        }
      })

      return { status: 'sent', deliveryId, resendId: sendResult.resendId }
    }

    const errMsg = sendResult?.error || 'Email delivery skipped'

    await recordPayslipDelivery({
      deliveryId,
      receiptId: receipt.receiptId,
      entryId: input.entryId,
      memberId: entry.memberId,
      periodId: entry.periodId,
      deliveryKind: KIND,
      paymentOrderId: input.paymentOrderId,
      paymentOrderLineId: input.paymentOrderLineId,
      sourceEventId: input.sourceEventId,
      triggeredByUserId: input.triggeredByUserId ?? null,
      status: 'failed',
      emailRecipient: entry.memberEmail,
      errorMessage: errMsg,
      failedAt: new Date().toISOString()
    })

    return { status: 'failed', error: errMsg }
  } catch (error) {
    captureWithDomain(error, 'payroll', {
      tags: { feature: 'payslip_lifecycle', kind: KIND },
      extra: { entryId: input.entryId, paymentOrderId: input.paymentOrderId }
    })

    return { status: 'failed', error: error instanceof Error ? error.message : String(error) }
  }
}

export async function sendPayslipCancelledNotification(
  input: SendPayslipCancelledInput
): Promise<LifecycleSendResult> {
  const KIND: PayslipDeliveryKind = 'payment_cancelled'

  try {
    // Anti-rotura: NUNCA cancelar si el pago ya se ejecutó.
    const paid = await hasActivePayslipDelivery(input.entryId, 'payment_paid')

    if (paid) {
      return {
        status: 'skipped_blocked_by_paid',
        reason: `entry ${input.entryId} already has payment_paid delivery ${paid.deliveryId} — cannot send cancellation. Use reliquidation_delta if needed.`
      }
    }

    // Idempotency.
    const existing = await hasActivePayslipDelivery(input.entryId, KIND)

    if (existing) {
      return { status: 'skipped_already_sent', deliveryId: existing.deliveryId }
    }

    const entry = await getPayrollEntryById(input.entryId)

    if (!entry) return { status: 'failed', error: `entry ${input.entryId} not found` }

    const period = await getPayrollPeriod(entry.periodId)

    if (!period) return { status: 'failed', error: `period ${entry.periodId} not found` }

    if (!entry.memberEmail) return { status: 'skipped_no_email' }

    const receipt = await getPayrollReceiptByEntryId(input.entryId)

    if (!receipt) return { status: 'failed', error: 'no payroll_receipt for entry' }

    const deliveryId = buildPayslipDeliveryId(input.entryId, KIND, input.sourceEventId ?? undefined)

    const sendResult = await sendEmail({
      emailType: 'payroll_payment_cancelled',
      domain: 'payroll',
      recipients: [{
        userId: entry.memberId,
        email: entry.memberEmail,
        name: entry.memberName
      }],
      context: {
        fullName: entry.memberName,
        periodYear: period.year,
        periodMonth: period.month,
        entryCurrency: entry.currency === 'USD' ? 'USD' : 'CLP',
        netTotal: entry.netTotal,
        payRegime: entry.payRegime,
        cancellationReason: input.cancellationReason
      },
      sourceEntity: input.paymentOrderId,
      actorEmail: input.triggeredByUserId ?? undefined
    })

    if (sendResult?.status === 'sent') {
      // Supersede committed delivery anterior (si existe) — esa promesa ya no aplica.
      await supersedePayslipDeliveries({
        entryId: input.entryId,
        kindToSupersede: 'payment_committed',
        newDeliveryId: deliveryId
      })

      await recordPayslipDelivery({
        deliveryId,
        receiptId: receipt.receiptId,
        entryId: input.entryId,
        memberId: entry.memberId,
        periodId: entry.periodId,
        deliveryKind: KIND,
        paymentOrderId: input.paymentOrderId,
        paymentOrderLineId: input.paymentOrderLineId,
        sourceEventId: input.sourceEventId,
        triggeredByUserId: input.triggeredByUserId ?? null,
        status: 'sent',
        emailRecipient: entry.memberEmail,
        emailProviderId: sendResult.resendId,
        sentAt: new Date().toISOString(),
        metadata: {
          cancellationReason: input.cancellationReason,
          netTotal: entry.netTotal,
          currency: entry.currency
        }
      })

      return { status: 'sent', deliveryId, resendId: sendResult.resendId }
    }

    const errMsg = sendResult?.error || 'Email delivery skipped'

    await recordPayslipDelivery({
      deliveryId,
      receiptId: receipt.receiptId,
      entryId: input.entryId,
      memberId: entry.memberId,
      periodId: entry.periodId,
      deliveryKind: KIND,
      paymentOrderId: input.paymentOrderId,
      paymentOrderLineId: input.paymentOrderLineId,
      sourceEventId: input.sourceEventId,
      triggeredByUserId: input.triggeredByUserId ?? null,
      status: 'failed',
      emailRecipient: entry.memberEmail,
      errorMessage: errMsg,
      failedAt: new Date().toISOString()
    })

    return { status: 'failed', error: errMsg }
  } catch (error) {
    captureWithDomain(error, 'payroll', {
      tags: { feature: 'payslip_lifecycle', kind: KIND },
      extra: { entryId: input.entryId, paymentOrderId: input.paymentOrderId }
    })

    return { status: 'failed', error: error instanceof Error ? error.message : String(error) }
  }
}
