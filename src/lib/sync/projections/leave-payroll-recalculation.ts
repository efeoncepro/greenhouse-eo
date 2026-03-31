import 'server-only'

import { calculatePayroll } from '@/lib/payroll/calculate-payroll'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

export const leavePayrollRecalculationProjection: ProjectionDefinition = {
  name: 'leave_payroll_recalculation',
  description: 'Recalculate official payroll when approved leave impacts a non-finalized payroll period',
  domain: 'people',
  triggerEvents: [EVENT_TYPES.leaveRequestPayrollImpactDetected],
  extractScope: (payload) => {
    const periodId = typeof payload.periodId === 'string' ? payload.periodId : null

    return periodId ? { entityType: 'finance_period', entityId: periodId } : null
  },
  refresh: async (scope, payload) => {
    const periodStatus = typeof payload.periodStatus === 'string' ? payload.periodStatus : null

    if (periodStatus === 'exported') {
      return `skipped payroll recalculation for ${scope.entityId} (exported)`
    }

    await calculatePayroll({
      periodId: scope.entityId,
      actorIdentifier: 'reactive:leave_request.payroll_impact_detected'
    })

    return `recalculated official payroll for ${scope.entityId} from leave_request.payroll_impact_detected`
  },
  maxRetries: 1
}
