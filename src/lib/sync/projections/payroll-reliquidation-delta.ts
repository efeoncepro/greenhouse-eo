import 'server-only'

import { applyPayrollReliquidationDelta } from '@/lib/finance/apply-payroll-reliquidation-delta'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import type { ProjectionDefinition } from '../projection-registry'

const PERIOD_REGEX = /^\d{4}-\d{2}$/

const toOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const toIntegerInRange = (value: unknown, min: number, max: number): number | null => {
  const parsed = toFiniteNumber(value)

  if (parsed === null || !Number.isInteger(parsed)) return null

  return parsed >= min && parsed <= max ? parsed : null
}

const toCurrency = (value: unknown): 'CLP' | 'USD' | null => {
  const str = toOptionalString(value)

  if (!str) return null

  const upper = str.toUpperCase()

  return upper === 'CLP' || upper === 'USD' ? upper : null
}

export const payrollReliquidationDeltaProjection: ProjectionDefinition = {
  name: 'payroll_reliquidation_delta',
  description: 'Apply payroll reliquidación delta to Finance expenses (TASK-411)',
  domain: 'finance',

  triggerEvents: ['payroll_entry.reliquidated'],

  extractScope: payload => {
    const entryId = toOptionalString(payload.entryId)

    if (!entryId) return null

    return { entityType: 'payroll_entry', entityId: entryId }
  },

  refresh: async (scope, payload) => {
    const periodId = toOptionalString(payload.periodId)

    if (!periodId || !PERIOD_REGEX.test(periodId)) {
      return null
    }

    const memberId = toOptionalString(payload.memberId)

    if (!memberId) return null

    const operationalYear = toIntegerInRange(payload.operationalYear, 1970, 9999)
    const operationalMonth = toIntegerInRange(payload.operationalMonth, 1, 12)

    if (operationalYear === null || operationalMonth === null) {
      return null
    }

    // TASK-411 hotfix 2026-04-15 — the base payroll expense tracks NET, so
    // the delta row must also be computed from NET. Reading gross values
    // from the payload stays for audit/forensics but they are not used for
    // the expense amount.
    const previousNet = toFiniteNumber(payload.previousNetTotal) ?? 0
    const newNet = toFiniteNumber(payload.newNetTotal) ?? 0
    const deltaNet = toFiniteNumber(payload.deltaNet) ?? newNet - previousNet

    const previousGross = toFiniteNumber(payload.previousGrossTotal) ?? 0
    const newGross = toFiniteNumber(payload.newGrossTotal) ?? 0
    const deltaGross = toFiniteNumber(payload.deltaGross) ?? newGross - previousGross

    const currency = toCurrency(payload.currency) ?? 'CLP'

    const reopenAuditId = toOptionalString(payload.reopenAuditId)

    if (!reopenAuditId) return null

    const reason = toOptionalString(payload.reason) ?? 'otro'

    const eventId =
      toOptionalString(payload._eventId) ??
      toOptionalString((payload as Record<string, unknown>)._event_id) ??
      scope.entityId

    const outcome = await withGreenhousePostgresTransaction(async client =>
      applyPayrollReliquidationDelta({
        client,
        periodId,
        memberId,
        operationalYear,
        operationalMonth,
        previousNet,
        newNet,
        deltaNet,
        previousGross,
        newGross,
        deltaGross,
        currency,
        reopenAuditId,
        reason,
        eventId
      })
    )

    return `payroll reliquidation delta ${outcome} for period=${periodId} member=${memberId} deltaNet=${deltaNet} ${currency}`
  },

  maxRetries: 3
}
