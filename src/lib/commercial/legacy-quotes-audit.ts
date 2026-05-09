export type LegacyQuoteAuditCategory = 'active_canonical' | 'recoverable' | 'excludable' | 'historical'

export type LegacyQuoteAuditAction = 'none' | 'review_normalize' | 'mark_legacy_excluded'

export interface LegacyQuoteAuditInput {
  legacyStatus: string | null
  status: string | null
  financeQuoteId: string | null
  organizationId: string | null
  currentVersion: number | null
  hasCurrentVersionRow: boolean
  hasCurrentLineItems: boolean
  hasPipelineSnapshot: boolean
  legacyExcluded?: boolean | null
}

export interface LegacyQuoteAuditDecision {
  category: LegacyQuoteAuditCategory
  action: LegacyQuoteAuditAction
  reason: string
  shouldMarkLegacyExcluded: boolean
}

const TERMINAL_STATUSES = new Set(['issued', 'converted', 'expired', 'approval_rejected', 'rejected', 'sent', 'approved'])

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() || null

export const classifyLegacyQuoteAuditRow = (row: LegacyQuoteAuditInput): LegacyQuoteAuditDecision => {
  const legacyStatus = normalize(row.legacyStatus)
  const status = normalize(row.status)
  const hasLegacySignal = legacyStatus !== null
  const missingOrganization = !row.organizationId
  const missingCurrentVersionRow = !row.hasCurrentVersionRow
  const missingCurrentLineItems = !row.hasCurrentLineItems
  const terminal = Boolean((status && TERMINAL_STATUSES.has(status)) || (legacyStatus && TERMINAL_STATUSES.has(legacyStatus)))

  if (!hasLegacySignal && !missingOrganization && row.hasCurrentVersionRow) {
    return {
      category: 'active_canonical',
      action: 'none',
      reason: row.financeQuoteId ? 'canonical_with_finance_bridge' : 'canonical_without_legacy_finance_bridge',
      shouldMarkLegacyExcluded: false
    }
  }

  if (hasLegacySignal && !missingOrganization && !missingCurrentVersionRow && !missingCurrentLineItems) {
    return {
      category: 'recoverable',
      action: 'review_normalize',
      reason: `legacy_status_${legacyStatus}_with_current_version_and_lines`,
      shouldMarkLegacyExcluded: false
    }
  }

  if (hasLegacySignal && terminal) {
    return {
      category: 'historical',
      action: 'mark_legacy_excluded',
      reason: `finance_only_historical_${legacyStatus ?? status ?? 'unknown'}`,
      shouldMarkLegacyExcluded: true
    }
  }

  const reasons = [
    missingOrganization ? 'missing_organization' : null,
    missingCurrentVersionRow ? 'missing_current_version_row' : null,
    missingCurrentLineItems ? 'missing_current_line_items' : null,
    hasLegacySignal ? `legacy_status_${legacyStatus}` : null
  ].filter(Boolean)

  return {
    category: 'excludable',
    action: 'mark_legacy_excluded',
    reason: reasons.join('+') || 'legacy_limbo',
    shouldMarkLegacyExcluded: true
  }
}

export const csvEscape = (value: unknown): string => {
  if (value === null || value === undefined) return ''

  const text = String(value)

  if (!/[",\n\r]/.test(text)) return text

  return `"${text.replaceAll('"', '""')}"`
}
