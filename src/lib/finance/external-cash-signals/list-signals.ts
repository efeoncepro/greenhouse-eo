import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type {
  ExternalCashSignal,
  ExternalCashSignalDocumentKind,
  ExternalCashSignalPromotedPaymentKind,
  ExternalCashSignalResolutionMethod,
  ExternalCashSignalResolutionStatus
} from './types'

export interface ListSignalsFilters {
  status?: ExternalCashSignalResolutionStatus | 'all'
  sourceSystem?: string | null
  spaceId?: string | null
  search?: string | null
  limit?: number
  offset?: number
}

export interface ListSignalsResult {
  items: Array<ExternalCashSignal & { matchedRuleId: string | null; resolutionOutcome: 'resolved' | 'ambiguous' | 'no_match' | null }>
  total: number
  counts: {
    unresolved: number
    inReview: number
    adoptedToday: number
    invariantViolations: number
  }
}

interface RawSignalRow {
  signal_id: string
  source_system: string
  source_event_id: string
  source_payload_json: Record<string, unknown>
  source_observed_at: Date
  document_kind: ExternalCashSignalDocumentKind
  document_id: string | null
  signal_date: string | Date
  amount: string
  currency: string
  account_resolution_status: ExternalCashSignalResolutionStatus
  resolved_account_id: string | null
  resolved_at: Date | null
  resolved_by_user_id: string | null
  resolution_method: ExternalCashSignalResolutionMethod | null
  promoted_payment_kind: ExternalCashSignalPromotedPaymentKind | null
  promoted_payment_id: string | null
  superseded_at: Date | null
  superseded_reason: string | null
  space_id: string
  observed_at: Date
  created_at: Date
  updated_at: Date
  matched_rule_id: string | null
  resolution_outcome: 'resolved' | 'ambiguous' | 'no_match' | null
}

const mapRow = (row: RawSignalRow & Record<string, unknown>) => ({
  signalId: row.signal_id,
  sourceSystem: row.source_system,
  sourceEventId: row.source_event_id,
  sourcePayload: row.source_payload_json,
  sourceObservedAt: new Date(row.source_observed_at),
  documentKind: row.document_kind,
  documentId: row.document_id,
  signalDate: typeof row.signal_date === 'string' ? row.signal_date : row.signal_date.toISOString().slice(0, 10),
  amount: Number(row.amount),
  currency: row.currency,
  accountResolutionStatus: row.account_resolution_status,
  resolvedAccountId: row.resolved_account_id as ExternalCashSignal['resolvedAccountId'],
  resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
  resolvedByUserId: row.resolved_by_user_id,
  resolutionMethod: row.resolution_method,
  promotedPaymentKind: row.promoted_payment_kind,
  promotedPaymentId: row.promoted_payment_id,
  supersededAt: row.superseded_at ? new Date(row.superseded_at) : null,
  supersededReason: row.superseded_reason,
  spaceId: row.space_id,
  observedAt: new Date(row.observed_at),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  matchedRuleId: row.matched_rule_id,
  resolutionOutcome: row.resolution_outcome
})

const escapeLikePattern = (raw: string) =>
  raw.replace(/[\\%_]/g, char => `\\${char}`).toLowerCase()

export const listSignals = async (filters: ListSignalsFilters = {}): Promise<ListSignalsResult> => {
  const limit = Math.min(200, Math.max(1, filters.limit ?? 50))
  const offset = Math.max(0, filters.offset ?? 0)

  const whereClauses: string[] = []
  const params: unknown[] = []

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status)
    whereClauses.push(`s.account_resolution_status = $${params.length}`)
  }

  if (filters.sourceSystem) {
    params.push(filters.sourceSystem)
    whereClauses.push(`s.source_system = $${params.length}`)
  }

  if (filters.spaceId) {
    params.push(filters.spaceId)
    whereClauses.push(`s.space_id = $${params.length}`)
  }

  if (filters.search && filters.search.trim() !== '') {
    const searchPattern = `%${escapeLikePattern(filters.search.trim())}%`

    params.push(searchPattern)
    whereClauses.push(
      `(LOWER(COALESCE(s.document_id, '')) LIKE $${params.length} OR LOWER(s.source_event_id) LIKE $${params.length} OR s.amount::text LIKE $${params.length})`
    )
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const itemsSqlParams = [...params, limit, offset]

  const itemsSql = `
    SELECT
      s.*,
      attempts.matched_rule_id,
      attempts.resolution_outcome
    FROM greenhouse_finance.external_cash_signals s
    LEFT JOIN LATERAL (
      SELECT matched_rule_id, resolution_outcome
      FROM greenhouse_finance.external_signal_resolution_attempts a
      WHERE a.signal_id = s.signal_id
      ORDER BY a.evaluated_at DESC
      LIMIT 1
    ) attempts ON TRUE
    ${whereSql}
    ORDER BY s.signal_date DESC, s.created_at DESC
    LIMIT $${itemsSqlParams.length - 1} OFFSET $${itemsSqlParams.length}
  `

  const totalSql = `
    SELECT COUNT(*)::int AS total
    FROM greenhouse_finance.external_cash_signals s
    ${whereSql}
  `

  const countsSql = `
    SELECT
      COUNT(*) FILTER (WHERE account_resolution_status = 'unresolved')::int AS unresolved,
      COUNT(*) FILTER (WHERE account_resolution_status IN ('resolved_high_confidence', 'resolved_low_confidence'))::int AS in_review,
      COUNT(*) FILTER (WHERE account_resolution_status = 'adopted' AND resolved_at >= CURRENT_DATE)::int AS adopted_today,
      (
        SELECT COUNT(*)::int FROM greenhouse_finance.external_cash_signals s2
        WHERE s2.promoted_payment_id IS NOT NULL
          AND (
            (s2.promoted_payment_kind = 'income_payment' AND NOT EXISTS (
              SELECT 1 FROM greenhouse_finance.income_payments ip
              WHERE ip.payment_id = s2.promoted_payment_id
                AND ip.payment_account_id IS NOT NULL
                AND ip.superseded_by_payment_id IS NULL
                AND ip.superseded_by_otb_id IS NULL
            ))
            OR
            (s2.promoted_payment_kind = 'expense_payment' AND NOT EXISTS (
              SELECT 1 FROM greenhouse_finance.expense_payments ep
              WHERE ep.payment_id = s2.promoted_payment_id
                AND ep.payment_account_id IS NOT NULL
                AND ep.superseded_by_payment_id IS NULL
                AND ep.superseded_by_otb_id IS NULL
            ))
          )
      ) AS invariant_violations
    FROM greenhouse_finance.external_cash_signals
  `

  const [itemsRows, totalRows, countsRows] = await Promise.all([
    runGreenhousePostgresQuery<RawSignalRow & Record<string, unknown>>(itemsSql, itemsSqlParams),
    runGreenhousePostgresQuery<{ total: number } & Record<string, unknown>>(totalSql, params),
    runGreenhousePostgresQuery<{ unresolved: number; in_review: number; adopted_today: number; invariant_violations: number } & Record<string, unknown>>(countsSql)
  ])

  return {
    items: itemsRows.map(mapRow),
    total: Number(totalRows[0]?.total ?? 0),
    counts: {
      unresolved: Number(countsRows[0]?.unresolved ?? 0),
      inReview: Number(countsRows[0]?.in_review ?? 0),
      adoptedToday: Number(countsRows[0]?.adopted_today ?? 0),
      invariantViolations: Number(countsRows[0]?.invariant_violations ?? 0)
    }
  }
}
