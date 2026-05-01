import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { generatePayrollReceiptsForPeriod } from '@/lib/payroll/generate-payroll-receipts'
import { shouldSendOnExport } from '@/lib/payroll/payslip-delivery-mode'

const parsePeriodId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  return /^\d{4}-\d{2}$/.test(value) ? value : null
}

/**
 * Generates payroll receipt PDFs after `payroll_period.exported`.
 *
 * TASK-759 — Email sending is gated by `GREENHOUSE_PAYSLIP_DELIVERY_MODE`:
 *   - 'legacy_export' (default): generates PDFs AND sends emails (current behavior)
 *   - 'on_payment_paid': generates PDFs only — emails dispatched by payslipOnPaymentPaidProjection
 *   - 'both': generates PDFs AND sends emails (idempotency prevents duplicate)
 *
 * The PDF is always generated and stored in the bucket here so that it's
 * available for the post-payment send (no race against `payment_order.paid`).
 */
export const payrollReceiptsProjection: ProjectionDefinition = {
  name: 'payroll_receipts_delivery',
  description: 'Generate, store and (optionally) email payroll receipts after payroll export',
  domain: 'notifications',

  triggerEvents: ['payroll_period.exported'],

  extractScope: (payload) => {
    const periodId = parsePeriodId(payload.periodId) ?? parsePeriodId(payload.period_id)

    if (!periodId) return null

    return { entityType: 'payroll_period', entityId: periodId }
  },

  refresh: async (scope, payload) => {
    const sourceEventId = typeof payload._eventId === 'string' ? payload._eventId : null

    if (!sourceEventId) {
      return null
    }

    const sendEmails = shouldSendOnExport()

    const result = await generatePayrollReceiptsForPeriod({
      periodId: scope.entityId,
      sourceEventId,
      sendEmails,
      actorEmail: typeof payload.generatedBy === 'string' ? payload.generatedBy : null
    })

    return `generated ${result.generated} receipts (reused ${result.reused}, emailed ${result.emailed}, mode=${sendEmails ? 'sent' : 'pdf_only'}) for ${scope.entityId}`
  },

  maxRetries: 2
}
