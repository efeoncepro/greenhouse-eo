import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { sendPayrollExportReadyNotification } from '@/lib/payroll/send-payroll-export-ready'

const parsePeriodId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  return /^\d{4}-\d{2}$/.test(value) ? value : null
}

export const payrollExportReadyProjection: ProjectionDefinition = {
  name: 'payroll_export_ready_notification',
  description: 'Send payroll export-ready finance/HR email after payroll export',
  domain: 'notifications',

  triggerEvents: ['payroll_period.exported'],

  extractScope: (payload) => {
    const periodId = parsePeriodId(payload.periodId) ?? parsePeriodId(payload.period_id)

    if (!periodId) return null

    return { entityType: 'payroll_period', entityId: periodId }
  },

  refresh: async (scope, payload) => {
    const actorEmail =
      typeof payload.generatedBy === 'string'
        ? payload.generatedBy
        : typeof payload.approvedBy === 'string'
          ? payload.approvedBy
          : null

    const resendId = await sendPayrollExportReadyNotification(scope.entityId, actorEmail)

    return resendId ? `sent payroll export ready email for ${scope.entityId}` : null
  },

  maxRetries: 2
}
