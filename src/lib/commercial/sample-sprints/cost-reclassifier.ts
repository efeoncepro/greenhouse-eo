import 'server-only'

import { query } from '@/lib/db'

export interface PeriodInput {
  year: number
  month: number
}

export interface GtmInvestmentPeriodInput extends PeriodInput {
  clientId?: string
}

export interface GtmInvestmentByClient {
  clientId: string
  gtmInvestmentClp: number
}

export interface GtmInvestmentForPeriod {
  year: number
  month: number
  totalGtmInvestmentClp: number
  byClient: GtmInvestmentByClient[]
}

interface GtmInvestmentRow extends Record<string, unknown> {
  client_id: string
  gtm_investment_clp: string | number | null
}

interface AmountRow extends Record<string, unknown> {
  amount_clp: string | number | null
}

interface RevenueRow extends Record<string, unknown> {
  revenue_clp: string | number | null
}

const assertPeriod = ({ year, month }: PeriodInput) => {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new RangeError('year must be an integer between 2000 and 2100.')
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError('month must be an integer between 1 and 12.')
  }
}

const normalizeClientId = (clientId: string | undefined): string | null => {
  const trimmed = clientId?.trim()

  return trimmed ? trimmed : null
}

const toFiniteNumber = (value: string | number | null | undefined): number => {
  if (value == null) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const roundClp = (value: number): number => Math.round(value)

export const getGtmInvestmentForPeriod = async (
  input: GtmInvestmentPeriodInput
): Promise<GtmInvestmentForPeriod> => {
  assertPeriod(input)

  const clientId = normalizeClientId(input.clientId)

  const rows = await query<GtmInvestmentRow>(
    `SELECT
       client_id,
       COALESCE(SUM(gtm_investment_clp), 0)::NUMERIC AS gtm_investment_clp
     FROM greenhouse_serving.gtm_investment_pnl
     WHERE period_year = $1
       AND period_month = $2
       AND ($3::TEXT IS NULL OR client_id = $3::TEXT)
     GROUP BY client_id
     ORDER BY COALESCE(SUM(gtm_investment_clp), 0) DESC, client_id ASC`,
    [input.year, input.month, clientId]
  )

  const byClient = rows.map(row => ({
    clientId: row.client_id,
    gtmInvestmentClp: roundClp(toFiniteNumber(row.gtm_investment_clp))
  }))

  const totalGtmInvestmentClp = byClient.reduce((total, client) => total + client.gtmInvestmentClp, 0)

  return {
    year: input.year,
    month: input.month,
    totalGtmInvestmentClp,
    byClient
  }
}

export const getGtmInvestmentRatio = async (input: PeriodInput): Promise<number> => {
  assertPeriod(input)

  const [investment, revenueRows] = await Promise.all([
    getGtmInvestmentForPeriod(input),
    query<RevenueRow>(
      `WITH latest_ops_revision AS (
         SELECT MAX(snapshot_revision) AS snapshot_revision
         FROM greenhouse_serving.operational_pl_snapshots
         WHERE period_year = $1
           AND period_month = $2
           AND scope_type = 'client'
       ),
       ops_revenue AS (
         SELECT COALESCE(SUM(revenue_clp), 0)::NUMERIC AS revenue_clp
         FROM greenhouse_serving.operational_pl_snapshots ops
         JOIN latest_ops_revision latest
           ON latest.snapshot_revision IS NOT NULL
          AND latest.snapshot_revision = ops.snapshot_revision
         WHERE ops.period_year = $1
           AND ops.period_month = $2
           AND ops.scope_type = 'client'
       ),
       client_economics_revenue AS (
         SELECT COALESCE(SUM(total_revenue_clp), 0)::NUMERIC AS revenue_clp
         FROM greenhouse_finance.client_economics
         WHERE period_year = $1
           AND period_month = $2
       )
       SELECT COALESCE(
         NULLIF((SELECT revenue_clp FROM ops_revenue), 0),
         (SELECT revenue_clp FROM client_economics_revenue),
         0
       )::NUMERIC AS revenue_clp`,
      [input.year, input.month]
    )
  ])

  const revenueClp = toFiniteNumber(revenueRows[0]?.revenue_clp)

  if (revenueClp <= 0) return 0

  return investment.totalGtmInvestmentClp / revenueClp
}

export const getClientNetMarginExcludingGtm = async (
  clientId: string,
  input: PeriodInput
): Promise<number> => {
  assertPeriod(input)

  const normalizedClientId = normalizeClientId(clientId)

  if (!normalizedClientId) {
    throw new RangeError('clientId is required.')
  }

  const rows = await query<AmountRow>(
    `WITH client_margin AS (
       SELECT COALESCE(net_margin_clp, 0)::NUMERIC AS amount_clp
       FROM greenhouse_finance.client_economics
       WHERE client_id = $1
         AND period_year = $2
         AND period_month = $3
       ORDER BY computed_at DESC NULLS LAST, updated_at DESC NULLS LAST
       LIMIT 1
     ),
     gtm_investment AS (
       SELECT COALESCE(SUM(gtm_investment_clp), 0)::NUMERIC AS amount_clp
       FROM greenhouse_serving.gtm_investment_pnl
       WHERE client_id = $1
         AND period_year = $2
         AND period_month = $3
     )
     SELECT (
       COALESCE((SELECT amount_clp FROM client_margin), 0)
       + COALESCE((SELECT amount_clp FROM gtm_investment), 0)
     )::NUMERIC AS amount_clp`,
    [normalizedClientId, input.year, input.month]
  )

  return roundClp(toFiniteNumber(rows[0]?.amount_clp))
}
