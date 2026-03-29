import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { generatePayrollReceiptsForPeriod } from '@/lib/payroll/generate-payroll-receipts'

const parsePeriodId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  return /^\d{4}-\d{2}$/.test(value) ? value : null
}

export const payrollReceiptsProjection: ProjectionDefinition = {
  name: 'payroll_receipts_delivery',
  description: 'Generate, store and email payroll receipts after payroll export',
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

    const result = await generatePayrollReceiptsForPeriod({
      periodId: scope.entityId,
      sourceEventId,
      sendEmails: true,
      actorEmail: typeof payload.generatedBy === 'string' ? payload.generatedBy : null
    })

    return `generated ${result.generated} receipts (reused ${result.reused}, emailed ${result.emailed}) for ${scope.entityId}`
  },

  maxRetries: 2
}
