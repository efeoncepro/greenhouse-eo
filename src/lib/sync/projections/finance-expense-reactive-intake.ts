import 'server-only'

import { materializePayrollExpensesForExportedPeriod } from '@/lib/finance/payroll-expense-reactive'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

const toInt = (value: unknown) => {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isInteger(parsed) ? parsed : null
  }

  return null
}

export const financeExpenseReactiveIntakeProjection: ProjectionDefinition = {
  name: 'finance_expense_reactive_intake',
  description: 'Materialize payroll-generated finance expenses when payroll periods are exported',
  domain: 'finance',
  triggerEvents: ['payroll_period.exported'],
  extractScope: payload => {
    const periodId = typeof payload.periodId === 'string' ? payload.periodId : null

    if (!periodId) {
      return null
    }

    return {
      entityType: 'finance_period',
      entityId: periodId
    }
  },
  refresh: async (scope, payload) => {
    const periodId = scope.entityId
    const year = toInt(payload.year)
    const month = toInt(payload.month)

    if (!year || !month) {
      return null
    }

    // TASK-765 Slice 4 — wrap con captureWithDomain antes de re-throw.
    // Antes, errores como "INSERT has more target columns than expressions"
    // (incidente 2026-05-01) llegaban al reactive worker como un error
    // generico sin domain tag, y el subsystem `Finance Data Quality` no
    // los veia. Ahora Sentry los recibe con `domain=finance` y
    // `source=payroll_expense_materialization`, y el refresh_queue marca
    // `error_class='application'` correctamente cuando rutea a dead-letter.
    try {
      const result = await materializePayrollExpensesForExportedPeriod({
        periodId,
        year,
        month
      })

      return `reactive payroll expenses for ${periodId}: payrollCreated=${result.payrollCreated}, payrollSkipped=${result.payrollSkipped}, socialSecurityCreated=${result.socialSecurityCreated}`
    } catch (err) {
      captureWithDomain(err, 'finance', {
        tags: { source: 'payroll_expense_materialization', periodId }
      })

      throw err
    }
  },
  maxRetries: 1
}
