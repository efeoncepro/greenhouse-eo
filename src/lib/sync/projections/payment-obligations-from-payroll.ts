import 'server-only'

import { materializePayrollObligationsForExportedPeriod } from '@/lib/finance/payment-obligations/materialize-payroll'

import type { ProjectionDefinition } from '../projection-registry'

const toInt = (value: unknown) => {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isInteger(parsed) ? parsed : null
  }

  return null
}

/**
 * TASK-748 — Materializa payment_obligations cuando un periodo Payroll
 * se exporta. Coexiste con `finance_expense_reactive_intake` (TASK-411)
 * sin reemplazarlo: ambos consumen el mismo evento y operan en tablas
 * distintas. La idempotencia esta garantizada por el unique partial
 * index en `payment_obligations` — re-export del mismo periodo no
 * duplica obligations.
 */
export const paymentObligationsFromPayrollProjection: ProjectionDefinition = {
  name: 'payment_obligations_from_payroll',
  description:
    'Materialize payment_obligations from payroll_period.exported (TASK-748). Coexists with finance_expense_reactive_intake.',
  domain: 'finance',
  triggerEvents: ['payroll_period.exported'],
  extractScope: payload => {
    const periodId = typeof payload.periodId === 'string' ? payload.periodId : null

    if (!periodId) return null

    return {
      entityType: 'finance_period',
      entityId: periodId
    }
  },
  refresh: async (scope, payload) => {
    const periodId = scope.entityId
    const year = toInt(payload.year)
    const month = toInt(payload.month)

    if (!year || !month) return null

    const result = await materializePayrollObligationsForExportedPeriod({
      periodId,
      year,
      month
    })

    return (
      `payment_obligations for ${periodId}: ` +
      `netPay=${result.employeeNetPayCreated}/${result.employeeNetPaySkipped + result.employeeNetPayCreated}, ` +
      `withheld=${result.employeeWithheldCreated}, ` +
      `provider=${result.providerPayrollCreated}, ` +
      `employerSS=${result.employerSocialSecurityCreated ? 'created' : result.employerSocialSecuritySkipped ? 'skipped' : 'n/a'}`
    )
  },
  maxRetries: 2
}
